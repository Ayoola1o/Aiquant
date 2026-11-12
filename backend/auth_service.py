"""Aiquant account authentication and signed-cookie session service."""
from __future__ import annotations

import os
import re
import uuid
import hmac
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

SESSION_MAX_AGE = 60 * 60 * 12
COOKIE_NAME = "aiquant_session"
_password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)

_database_url = os.environ.get("DATABASE_URL", "").strip()
if _database_url.startswith("postgres://"):
    _database_url = "postgresql+psycopg://" + _database_url[len("postgres://"):]
elif _database_url.startswith("postgresql://"):
    _database_url = "postgresql+psycopg://" + _database_url[len("postgresql://"):]
if _database_url:
    _engine = create_engine(_database_url, pool_pre_ping=True, pool_recycle=300)
else:
    _db_path = Path(__file__).resolve().parent / "aiquant.db"
    _engine = create_engine(
        "sqlite:///" + str(_db_path),
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _serializer() -> URLSafeTimedSerializer:
    secret = os.environ.get("AIQUANT_AUTH_SECRET", "").strip()
    if len(secret) < 32:
        raise AuthError(
            "Authentication is not configured. Set AIQUANT_AUTH_SECRET to a stable random secret of at least 32 characters.",
            503,
        )
    return URLSafeTimedSerializer(secret_key=secret, salt="aiquant-auth-session-v1")


def init_auth_db() -> None:
    if os.environ.get("VERCEL") and not _database_url:
        raise RuntimeError("Set DATABASE_URL to managed PostgreSQL before deploying Aiquant authentication on Vercel.")
    with _engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(320) NOT NULL UNIQUE,
                username VARCHAR(80) NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_users_single_admin
            ON users(role) WHERE role = 'admin'
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                revoked_at TIMESTAMP NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_auth_sessions_user ON auth_sessions(user_id)"))


def _public_user(row) -> dict:
    created_at = row["created_at"]
    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "username": row["username"],
        "role": row["role"],
        "created_at": str(created_at),
    }


def create_user(email: str, username: str, password: str, bootstrap_key: str = "") -> dict:
    _serializer()  # Fail before creating an account if session signing is not configured.
    email = (email or "").strip().lower()
    username = (username or "").strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or len(email) > 320:
        raise AuthError("Enter a valid email address.")
    if not re.fullmatch(r"[A-Za-z0-9_. -]{2,80}", username):
        raise AuthError("Username must be 2–80 characters and use letters, numbers, spaces, dots, underscores or hyphens.")
    if len(password or "") < 12 or len(password) > 256:
        raise AuthError("Password must be between 12 and 256 characters.")
    password_hash = _password_hasher.hash(password)
    user_id = str(uuid.uuid4())
    try:
        with _engine.begin() as conn:
            admin_count = conn.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'")).scalar_one()
            if admin_count == 0:
                expected_key = os.environ.get("AIQUANT_BOOTSTRAP_ADMIN_KEY", "")
                if len(expected_key) < 24:
                    raise AuthError("Administrator setup is not configured. Set AIQUANT_BOOTSTRAP_ADMIN_KEY (at least 24 characters) before the first registration.", 503)
                if not hmac.compare_digest(bootstrap_key or "", expected_key):
                    raise AuthError("The administrator setup key is invalid.", 403)
                role = "admin"
            else:
                role = "trader"
            conn.execute(text("""
                INSERT INTO users (id, email, username, password_hash, role)
                VALUES (:id, :email, :username, :password_hash, :role)
            """), {
                "id": user_id, "email": email, "username": username,
                "password_hash": password_hash, "role": role,
            })
            row = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id}).mappings().one()
            return _public_user(row)
    except IntegrityError as exc:
        raise AuthError("An account with that email already exists, or the initial administrator has already been created.", 409) from exc


def authenticate_user(email: str, password: str) -> dict:
    _serializer()  # Fail closed when the deployment has no stable session secret.
    email = (email or "").strip().lower()
    with _engine.connect() as conn:
        row = conn.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email}).mappings().first()
    if not row:
        raise AuthError("Invalid email or password.", 401)
    try:
        valid = _password_hasher.verify(row["password_hash"], password or "")
    except (VerifyMismatchError, VerificationError, InvalidHashError, TypeError):
        valid = False
    if not valid:
        raise AuthError("Invalid email or password.", 401)
    if _password_hasher.check_needs_rehash(row["password_hash"]):
        new_hash = _password_hasher.hash(password)
        with _engine.begin() as conn:
            conn.execute(text("UPDATE users SET password_hash = :password_hash WHERE id = :id"), {
                "password_hash": new_hash, "id": row["id"],
            })
    return _public_user(row)


def create_session_token(user_id: str) -> str:
    session_id = str(uuid.uuid4())
    with _engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO auth_sessions (id, user_id, expires_at)
            VALUES (:id, :user_id, :expires_at)
        """), {
            "id": session_id, "user_id": str(user_id),
            "expires_at": datetime.now(timezone.utc).replace(tzinfo=None) + __import__("datetime").timedelta(seconds=SESSION_MAX_AGE),
        })
    return _serializer().dumps({"sub": str(user_id), "sid": session_id})


def verify_session_token(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    try:
        payload = _serializer().loads(token, max_age=SESSION_MAX_AGE)
        user_id = payload.get("sub")
        session_id = payload.get("sid")
        if not user_id or not session_id:
            return None
        with _engine.connect() as conn:
            active = conn.execute(text("""
                SELECT 1 FROM auth_sessions
                WHERE id = :sid AND user_id = :uid
                  AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
            """), {"sid": str(session_id), "uid": str(user_id)}).first()
        return str(user_id) if active else None
    except (BadSignature, SignatureExpired, AuthError, TypeError, ValueError):
        return None


def revoke_session(token: Optional[str]) -> None:
    if not token:
        return
    try:
        payload = _serializer().loads(token, max_age=SESSION_MAX_AGE)
        session_id = payload.get("sid")
    except (BadSignature, SignatureExpired, AuthError, TypeError, ValueError):
        return
    if session_id:
        with _engine.begin() as conn:
            conn.execute(text("""
                UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
                WHERE id = :sid AND revoked_at IS NULL
            """), {"sid": str(session_id)})


def get_user_by_id(user_id: Optional[str]) -> Optional[dict]:
    if not user_id:
        return None
    try:
        uuid.UUID(str(user_id))
    except (ValueError, TypeError, AttributeError):
        return None
    with _engine.connect() as conn:
        row = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": str(user_id)}).mappings().first()
    return _public_user(row) if row else None

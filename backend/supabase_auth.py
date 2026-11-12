"""Supabase access-token verification for Aiquant's FastAPI backend.

The browser authenticates directly with Supabase Auth. This module validates the
resulting access token and resolves the user's protected profile/role. It never
accepts a user ID or role from request data.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import jwt
import requests
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError
from jwt.exceptions import InvalidTokenError

class SupabaseAuthError(Exception):
    pass

def _config() -> tuple[str, str]:
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = (os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip()
    if not url or not key:
        raise SupabaseAuthError("Supabase authentication is not configured on the server.")
    return url, key

@lru_cache(maxsize=4)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=600)

def _verify_access_token(token: str, url: str, api_key: str) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
        algorithm = str(header.get("alg", ""))
        if algorithm == "HS256":
            # Legacy symmetric signing keys are verified by Supabase Auth itself.
            response = requests.get(
                f"{url}/auth/v1/user",
                headers={"apikey": api_key, "Authorization": f"Bearer {token}"},
                timeout=8,
            )
            if response.status_code != 200:
                raise SupabaseAuthError("Invalid or expired access token.")
            user = response.json()
            return {"sub": user.get("id"), "email": user.get("email"), "role": "authenticated"}
        if algorithm not in {"RS256", "ES256", "EdDSA"}:
            raise SupabaseAuthError("Unsupported Supabase JWT signing algorithm.")
        issuer = f"{url}/auth/v1"
        signing_key = _jwks_client(f"{issuer}/.well-known/jwks.json").get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[algorithm],
            audience="authenticated",
            issuer=issuer,
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
    except SupabaseAuthError:
        raise
    except (InvalidTokenError, PyJWKClientError, requests.RequestException, ValueError, KeyError) as exc:
        raise SupabaseAuthError("Invalid or expired access token.") from exc

def verify_supabase_token(token: str) -> dict[str, Any]:
    if not token or len(token) > 16384:
        raise SupabaseAuthError("Authentication required.")
    url, api_key = _config()
    claims = _verify_access_token(token, url, api_key)
    user_id = claims.get("sub")
    if not user_id or claims.get("role") != "authenticated":
        raise SupabaseAuthError("Invalid authenticated user token.")

    # The profile role is protected by column-level grants and RLS. Never use
    # user_metadata/app-provided request fields as an authorization source.
    response = requests.get(
        f"{url}/rest/v1/profiles",
        params={"id": f"eq.{user_id}", "select": "id,email,display_name,role"},
        headers={"apikey": api_key, "Authorization": f"Bearer {token}"},
        timeout=8,
    )
    if response.status_code != 200:
        raise SupabaseAuthError("Unable to resolve the authenticated user's profile.")
    rows = response.json()
    if not rows:
        raise SupabaseAuthError("User profile is not ready. Please try again.")
    profile = rows[0]
    if profile.get("id") != user_id or profile.get("role") not in {"trader", "admin"}:
        raise SupabaseAuthError("User profile is invalid.")
    return {
        "id": user_id,
        "email": profile.get("email") or claims.get("email"),
        "username": profile.get("display_name") or (profile.get("email") or "").split("@")[0],
        "role": profile["role"],
    }

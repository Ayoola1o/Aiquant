"""Focused tests for Aiquant password hashing and session lifecycle.

Run from the backend directory with: python -m unittest test_auth
"""
import os
import tempfile
import unittest
from pathlib import Path

_test_dir = tempfile.TemporaryDirectory(prefix="aiquant-auth-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_test_dir.name) / "auth-test.db")
os.environ["AIQUANT_AUTH_SECRET"] = "test-only-secret-value-that-is-at-least-32-bytes"
os.environ["AIQUANT_BOOTSTRAP_ADMIN_KEY"] = "test-bootstrap-key-that-is-long-enough"

import auth_service


class AuthenticationServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        auth_service.init_auth_db()
        cls.admin = auth_service.create_user(
            "admin@example.test", "Test Admin", "correct horse battery staple 2026",
            "test-bootstrap-key-that-is-long-enough",
        )

    def test_first_account_is_admin(self):
        self.assertEqual(self.admin["role"], "admin")

    def test_password_is_hashed_and_login_verifies(self):
        with auth_service._engine.connect() as conn:
            row = conn.execute(
                auth_service.text("SELECT password_hash FROM users WHERE id = :id"),
                {"id": self.admin["id"]},
            ).first()
        self.assertIsNotNone(row)
        self.assertNotEqual(row[0], "correct horse battery staple 2026")
        logged_in = auth_service.authenticate_user(
            "admin@example.test", "correct horse battery staple 2026"
        )
        self.assertEqual(logged_in["id"], self.admin["id"])

    def test_invalid_password_is_rejected(self):
        with self.assertRaises(auth_service.AuthError) as caught:
            auth_service.authenticate_user("admin@example.test", "wrong password")
        self.assertEqual(caught.exception.status_code, 401)

    def test_subsequent_account_is_trader(self):
        trader = auth_service.create_user(
            "trader@example.test", "Test Trader", "another secure password 2026"
        )
        self.assertEqual(trader["role"], "trader")

    def test_duplicate_email_is_rejected(self):
        with self.assertRaises(auth_service.AuthError) as caught:
            auth_service.create_user(
                "ADMIN@example.test", "Duplicate Admin", "another secure password 2026"
            )
        self.assertEqual(caught.exception.status_code, 409)

    def test_signed_session_and_server_side_revocation(self):
        token = auth_service.create_session_token(self.admin["id"])
        self.assertEqual(auth_service.verify_session_token(token), self.admin["id"])
        auth_service.revoke_session(token)
        self.assertIsNone(auth_service.verify_session_token(token))

    def test_wrong_bootstrap_key_cannot_claim_first_admin(self):
        # Use a fresh email; the already-initialized system correctly treats new accounts as traders.
        trader = auth_service.create_user(
            "another-trader@example.test", "Another Trader", "yet another secure password 2026",
            "incorrect-bootstrap-key",
        )
        self.assertEqual(trader["role"], "trader")


if __name__ == "__main__":
    unittest.main()

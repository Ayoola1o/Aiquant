import unittest
from unittest.mock import patch, Mock

import supabase_auth

class SupabaseAuthTests(unittest.TestCase):
    @patch("supabase_auth.requests.get")
    @patch("supabase_auth._verify_access_token")
    @patch("supabase_auth._config")
    def test_valid_user_resolves_database_role(self, config, verify, get):
        config.return_value = ("https://project.supabase.co", "publishable")
        verify.return_value = {"sub": "user-123", "role": "authenticated", "email": "trader@example.com"}
        response = Mock(status_code=200)
        response.json.return_value = [{
            "id": "user-123", "email": "trader@example.com",
            "display_name": "Trader One", "role": "trader"
        }]
        get.return_value = response
        user = supabase_auth.verify_supabase_token("signed-token")
        self.assertEqual(user["id"], "user-123")
        self.assertEqual(user["role"], "trader")
        self.assertEqual(user["username"], "Trader One")

    @patch("supabase_auth.requests.get")
    @patch("supabase_auth._verify_access_token")
    @patch("supabase_auth._config")
    def test_client_metadata_cannot_override_database_role(self, config, verify, get):
        config.return_value = ("https://project.supabase.co", "publishable")
        verify.return_value = {
            "sub": "user-123", "role": "authenticated",
            "user_metadata": {"role": "admin"}
        }
        response = Mock(status_code=200)
        response.json.return_value = [{
            "id": "user-123", "email": "trader@example.com",
            "display_name": "Trader", "role": "trader"
        }]
        get.return_value = response
        user = supabase_auth.verify_supabase_token("signed-token")
        self.assertEqual(user["role"], "trader")

    @patch("supabase_auth._config")
    @patch("supabase_auth._verify_access_token")
    def test_wrong_postgres_role_is_rejected(self, verify, config):
        config.return_value = ("https://project.supabase.co", "publishable")
        verify.return_value = {"sub": "user-123", "role": "anon"}
        with self.assertRaises(supabase_auth.SupabaseAuthError):
            supabase_auth.verify_supabase_token("signed-token")

    def test_empty_token_is_rejected(self):
        with self.assertRaises(supabase_auth.SupabaseAuthError):
            supabase_auth.verify_supabase_token("")

if __name__ == "__main__":
    unittest.main()

"""Unit tests for Fernet MultiFernet encryption helpers (app.core.crypto).

TDD: These tests are written before implementation is confirmed working.
They validate encrypt/decrypt round-trip, key rotation, and safe_decrypt.
"""

from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet, InvalidToken

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_TEST_KEY_1 = Fernet.generate_key().decode()
_TEST_KEY_2 = Fernet.generate_key().decode()


def _patch_settings(master_key: str):
    """Context manager: patch get_settings to return a fake Settings object."""
    from unittest.mock import MagicMock

    mock_settings = MagicMock()
    mock_settings.master_encryption_key = master_key
    return patch("app.core.crypto.get_settings", return_value=mock_settings)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestEncryptDecrypt:
    def test_encrypt_returns_string(self):
        with _patch_settings(_TEST_KEY_1):
            from app.core import crypto

            crypto._get_fernet.cache_clear()
            result = crypto.encrypt("hello world")
        assert isinstance(result, str)
        assert result != "hello world"

    def test_decrypt_round_trip(self):
        with _patch_settings(_TEST_KEY_1):
            from app.core import crypto

            crypto._get_fernet.cache_clear()
            ciphertext = crypto.encrypt("secret_api_key_123")
            plaintext = crypto.decrypt(ciphertext)
        assert plaintext == "secret_api_key_123"

    def test_encrypt_different_plaintexts(self):
        with _patch_settings(_TEST_KEY_1):
            from app.core import crypto

            crypto._get_fernet.cache_clear()
            ct1 = crypto.encrypt("value_A")
            ct2 = crypto.encrypt("value_B")
        assert ct1 != ct2

    def test_encrypt_same_plaintext_nondeterministic(self):
        """Fernet includes a random IV — same plaintext encrypts differently."""
        with _patch_settings(_TEST_KEY_1):
            from app.core import crypto

            crypto._get_fernet.cache_clear()
            ct1 = crypto.encrypt("same")
            ct2 = crypto.encrypt("same")
        assert ct1 != ct2

    def test_decrypt_wrong_key_raises(self):
        with _patch_settings(_TEST_KEY_1):
            from app.core import crypto

            crypto._get_fernet.cache_clear()
            ciphertext = crypto.encrypt("data")

        with _patch_settings(_TEST_KEY_2):
            crypto._get_fernet.cache_clear()
            with pytest.raises(InvalidToken):
                crypto.decrypt(ciphertext)

        # Restore key1 for subsequent tests
        with _patch_settings(_TEST_KEY_1):
            crypto._get_fernet.cache_clear()

    def test_decrypt_tampered_ciphertext_raises(self):
        with _patch_settings(_TEST_KEY_1):
            from app.core import crypto

            crypto._get_fernet.cache_clear()
            ciphertext = crypto.encrypt("data")
            tampered = ciphertext[:-5] + "XXXXX"
            with pytest.raises(Exception):
                crypto.decrypt(tampered)

    def test_decrypt_unicode_content(self):
        with _patch_settings(_TEST_KEY_1):
            from app.core import crypto

            crypto._get_fernet.cache_clear()
            value = "api_key_€£¥_日本語_🔑"
            assert crypto.decrypt(crypto.encrypt(value)) == value


class TestMultiKey:
    def test_multifernet_decrypts_with_old_key(self):
        """Old ciphertexts must be decryptable when a new key is prepended."""
        from app.core import crypto

        # Encrypt with key1
        with _patch_settings(_TEST_KEY_1):
            crypto._get_fernet.cache_clear()
            ciphertext = crypto.encrypt("old_secret")

        # Decrypt with [key2, key1] (key2 is new primary, key1 still accepted)
        with _patch_settings(f"{_TEST_KEY_2},{_TEST_KEY_1}"):
            crypto._get_fernet.cache_clear()
            plaintext = crypto.decrypt(ciphertext)
        assert plaintext == "old_secret"

    def test_multifernet_encrypts_with_first_key(self):
        """New encryptions must use the FIRST key in the list."""
        from app.core import crypto

        with _patch_settings(f"{_TEST_KEY_2},{_TEST_KEY_1}"):
            crypto._get_fernet.cache_clear()
            ciphertext = crypto.encrypt("new_secret")

        # Should be decryptable with only key2
        with _patch_settings(_TEST_KEY_2):
            crypto._get_fernet.cache_clear()
            assert crypto.decrypt(ciphertext) == "new_secret"

    def test_empty_key_raises_value_error(self):
        with _patch_settings(""):
            from app.core import crypto

            crypto._get_fernet.cache_clear()
            with pytest.raises(ValueError, match="MASTER_ENCRYPTION_KEY"):
                crypto._get_fernet()


class TestRotate:
    def test_rotate_produces_new_ciphertext(self):
        from app.core import crypto

        with _patch_settings(_TEST_KEY_1):
            crypto._get_fernet.cache_clear()
            ct1 = crypto.encrypt("rotate_me")
            ct2 = crypto.rotate(ct1)
        assert ct1 != ct2

    def test_rotate_preserves_plaintext(self):
        from app.core import crypto

        with _patch_settings(_TEST_KEY_1):
            crypto._get_fernet.cache_clear()
            ct = crypto.encrypt("rotate_me")
            rotated = crypto.rotate(ct)
            assert crypto.decrypt(rotated) == "rotate_me"


class TestSafeDecrypt:
    def test_safe_decrypt_valid(self):
        from app.core import crypto

        with _patch_settings(_TEST_KEY_1):
            crypto._get_fernet.cache_clear()
            ct = crypto.encrypt("safe")
            assert crypto.safe_decrypt(ct) == "safe"

    def test_safe_decrypt_invalid_returns_none(self):
        from app.core import crypto

        with _patch_settings(_TEST_KEY_1):
            crypto._get_fernet.cache_clear()
            result = crypto.safe_decrypt("not-valid-ciphertext")
        assert result is None

    def test_safe_decrypt_wrong_key_returns_none(self):
        from app.core import crypto

        with _patch_settings(_TEST_KEY_1):
            crypto._get_fernet.cache_clear()
            ct = crypto.encrypt("data")

        with _patch_settings(_TEST_KEY_2):
            crypto._get_fernet.cache_clear()
            assert crypto.safe_decrypt(ct) is None

        with _patch_settings(_TEST_KEY_1):
            crypto._get_fernet.cache_clear()

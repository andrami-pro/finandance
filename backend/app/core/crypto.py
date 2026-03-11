"""Fernet MultiFernet encryption helpers.

Used to encrypt/decrypt sensitive data before storing it in the database
(e.g., integration API keys). MultiFernet supports key rotation: prepend a
new key to MASTER_ENCRYPTION_KEY; old data can still be decrypted with the
previous key until migrated.

Key rotation workflow:
    1. Generate a new Fernet key:
       python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    2. Prepend the new key to MASTER_ENCRYPTION_KEY (comma-separated).
    3. Re-encrypt sensitive data during the next sync cycle.
    4. Remove the old key once all data has been re-encrypted.
"""

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

from app.core.config import get_settings


@lru_cache(maxsize=1)
def _get_fernet() -> MultiFernet:
    """Build and cache the MultiFernet instance from config."""
    settings = get_settings()
    raw_keys = [k.strip() for k in settings.master_encryption_key.split(",") if k.strip()]
    if not raw_keys:
        raise ValueError("MASTER_ENCRYPTION_KEY must contain at least one Fernet key.")
    keys = [Fernet(k.encode() if isinstance(k, str) else k) for k in raw_keys]
    return MultiFernet(keys)


def encrypt(plaintext: str) -> str:
    """Encrypt *plaintext* and return a URL-safe base64 ciphertext string."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a Fernet ciphertext. Raises ``InvalidToken`` if decryption fails."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()


def rotate(ciphertext: str) -> str:
    """Re-encrypt *ciphertext* with the current primary key (key rotation)."""
    return _get_fernet().rotate(ciphertext.encode()).decode()


def safe_decrypt(ciphertext: str) -> str | None:
    """Decrypt *ciphertext*, returning ``None`` on failure instead of raising."""
    try:
        return decrypt(ciphertext)
    except (InvalidToken, Exception):
        return None

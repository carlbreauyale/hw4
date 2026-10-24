"""Password hashing, login sessions and a simple login throttle.

Password format (matches the seeded users): pbkdf2_sha256$<salt>$<hex digest>
  - PBKDF2-HMAC-SHA256, 120,000 iterations, salt used as UTF-8 text.
  - Signup makes a fresh random salt; login reads the salt back out of the
    stored string and re-hashes the typed password with it. The stored hash is
    never "un-hashed" (that is not possible) and is compared in constant time.

Sessions are signed tokens kept in an HttpOnly cookie, so page JavaScript
cannot read them.
"""

import base64
import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict, deque
from pathlib import Path

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 120_000
SALT_BYTES = 8  # 16 hex characters, like the seeded users

SESSION_COOKIE = "cc_session"
SESSION_TTL_SECONDS = 7 * 24 * 3600

MAX_FAILED_LOGINS = 5
FAILED_LOGIN_WINDOW_SECONDS = 15 * 60


# ---------- Passwords ----------


def _pbkdf2(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS).hex()


def hash_password(password: str) -> str:
    """Hash a new password with a fresh random salt (used at signup)."""
    salt = secrets.token_hex(SALT_BYTES)
    return f"{ALGORITHM}${salt}${_pbkdf2(password, salt)}"


def verify_password(password: str, stored: str) -> bool:
    """Re-hash the typed password with the stored salt and compare in constant time."""
    try:
        algorithm, salt, expected = stored.split("$")
    except ValueError:
        return False
    if algorithm != ALGORITHM:
        return False
    return hmac.compare_digest(_pbkdf2(password, salt), expected)


# Used when the email doesn't exist, so a failed login takes the same time
# either way and doesn't reveal which emails have accounts.
_DUMMY_HASH = hash_password(secrets.token_hex(16))


def verify_password_or_dummy(password: str, stored: str | None) -> bool:
    if stored is None:
        verify_password(password, _DUMMY_HASH)
        return False
    return verify_password(password, stored)


# ---------- Sessions ----------


def _load_secret() -> bytes:
    """SESSION_SECRET from the environment, else a random key saved next to this file (git-ignored)."""
    if env := os.getenv("SESSION_SECRET"):
        return env.encode("utf-8")
    path = Path(__file__).with_name(".session_secret")
    if not path.exists():
        path.write_text(secrets.token_hex(32), encoding="utf-8")
    return path.read_text(encoding="utf-8").strip().encode("utf-8")


_SECRET = _load_secret()


def _sign(payload: str) -> str:
    return hmac.new(_SECRET, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def create_session_token(user_id: int) -> str:
    expires = int(time.time()) + SESSION_TTL_SECONDS
    payload = f"{user_id}.{expires}"
    encoded = base64.urlsafe_b64encode(payload.encode("utf-8")).decode("ascii")
    return f"{encoded}.{_sign(payload)}"


def read_session_token(token: str | None) -> int | None:
    """Return the user id if the token is genuine and unexpired, else None."""
    if not token or "." not in token:
        return None
    encoded, signature = token.rsplit(".", 1)
    try:
        payload = base64.urlsafe_b64decode(encoded.encode("ascii")).decode("utf-8")
        user_id, expires = (int(part) for part in payload.split("."))
    except ValueError:
        return None
    if not hmac.compare_digest(_sign(payload), signature) or expires < time.time():
        return None
    return user_id


# ---------- Login throttle ----------

_failed_logins: dict[str, deque[float]] = defaultdict(deque)


def _recent_failures(key: str) -> deque[float]:
    attempts = _failed_logins[key]
    cutoff = time.time() - FAILED_LOGIN_WINDOW_SECONDS
    while attempts and attempts[0] < cutoff:
        attempts.popleft()
    return attempts


def too_many_failures(key: str) -> bool:
    return len(_recent_failures(key)) >= MAX_FAILED_LOGINS


def record_failure(key: str) -> None:
    _recent_failures(key).append(time.time())


def clear_failures(key: str) -> None:
    _failed_logins.pop(key, None)

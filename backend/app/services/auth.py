"""Passwords, sessions and login throttling.

* Passwords: scrypt (memory-hard, from the standard library) with a per-password random salt.
* Sessions: a random 256-bit token is given to the browser; only its SHA-256 hash is stored,
  so a leaked database does not reveal usable tokens.
"""
import hashlib
import hmac
import secrets
import threading
import time
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import AuthSession, User, utcnow
from app.utils.errors import AppError

SESSION_DAYS = 30
_SCRYPT = {"n": 2**14, "r": 8, "p": 1}

# ---------------------------------------------------------------- passwords


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, dklen=32, **_SCRYPT)
    return f"scrypt${_SCRYPT['n']}${_SCRYPT['r']}${_SCRYPT['p']}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_hex, dk_hex = stored.split("$")
        if scheme != "scrypt":
            return False
        dk = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt_hex),
                            n=int(n), r=int(r), p=int(p), dklen=len(dk_hex) // 2)
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(dk.hex(), dk_hex)


# ----------------------------------------------------------------- sessions


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(user_id=user.id, token_hash=_hash_token(token),
                       expires_at=utcnow() + timedelta(days=SESSION_DAYS)))
    db.commit()
    return token


def user_for_token(db: Session, token: str) -> User | None:
    row = db.scalar(select(AuthSession).where(AuthSession.token_hash == _hash_token(token)))
    if row is None:
        return None
    if row.expires_at < utcnow():
        db.delete(row)
        db.commit()
        return None
    return db.get(User, row.user_id)


def revoke_token(db: Session, token: str) -> None:
    row = db.scalar(select(AuthSession).where(AuthSession.token_hash == _hash_token(token)))
    if row is not None:
        db.delete(row)
        db.commit()


def revoke_all_sessions(db: Session, user: User) -> None:
    for row in db.scalars(select(AuthSession).where(AuthSession.user_id == user.id)).all():
        db.delete(row)
    db.commit()


# ---------------------------------------------------- brute-force throttling
# In-memory and per process: enough for a single-server app. Five failures for one
# email within 15 minutes blocks further attempts for that email until the window passes.

_MAX_FAILURES, _WINDOW = 5, 15 * 60
_failures: dict[str, list[float]] = {}
_lock = threading.Lock()


def _recent(email: str) -> list[float]:
    now = time.monotonic()
    return [t for t in _failures.get(email, []) if now - t < _WINDOW]


def check_login_allowed(email: str) -> None:
    with _lock:
        if len(_recent(email)) >= _MAX_FAILURES:
            raise AppError("Too many failed sign-in attempts.", 429, "too_many_attempts",
                           "Wait a few minutes before trying again.")


def record_login_failure(email: str) -> None:
    with _lock:
        _failures[email] = _recent(email) + [time.monotonic()]


def clear_login_failures(email: str) -> None:
    with _lock:
        _failures.pop(email, None)

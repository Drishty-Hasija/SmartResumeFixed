"""SQLAlchemy engine, session factory and declarative base.

Production uses PostgreSQL (Supabase). The Supabase *transaction pooler* (port 6543) is used because
Vercel functions open short-lived connections. Two settings matter for that pooler:

* no server-side prepared statements (prepare_threshold=None), since the pooler reassigns connections
  between transactions;
* no client-side connection pool (NullPool), so each function instance does not hold idle connections
  open against the pooler's limit.

SQLite is used only for local development and tests.
"""
import os
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()


def normalise_database_url(url: str) -> str:
    """Accept the usual postgres:// / postgresql:// forms and select the psycopg (v3) driver."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


_raw_url = (settings.database_url or "").strip()

# On Vercel the bundle is read-only, so a SQLite file cannot be written there. Fail with a clear
# message instead of an obscure "unable to open database file" during start-up.
if os.environ.get("VERCEL") and not _raw_url.startswith("postgres"):
    raise RuntimeError(
        "DATABASE_URL is missing or is not a PostgreSQL URL. On Vercel set DATABASE_URL to the Supabase "
        "PostgreSQL connection string (Project Settings > Environment Variables)."
    )

DATABASE_URL = normalise_database_url(_raw_url or settings.database_url)
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, future=True)
else:
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
        connect_args={
            "prepare_threshold": None,
            "sslmode": settings.database_sslmode,
            "connect_timeout": 10,
        },
        future=True,
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def database_label() -> str:
    """Host and database name for logs and the health check (never the password)."""
    url = make_url(DATABASE_URL)
    return f"{url.get_backend_name()}://{url.host or 'local-file'}/{url.database or ''}".rstrip("/")


def init_db() -> None:
    from app.models import entities  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()


def _add_missing_columns() -> None:
    """Small in-place migration: create_all() does not add columns to existing tables.

    Idempotent: it only adds columns that are missing, so running it on every cold start is safe.
    """
    from sqlalchemy import inspect, text

    wanted = {
        "users": {"password_hash": "VARCHAR(255)", "preferences": "JSON"},
        "resumes": {"label": "VARCHAR(200)"},
        "job_matches": {"status": "VARCHAR(20) NOT NULL DEFAULT 'saved'", "notes": "TEXT NOT NULL DEFAULT ''"},
    }
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, columns in wanted.items():
            if not insp.has_table(table):
                continue
            existing = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        if insp.has_table("users"):
            conn.execute(text("UPDATE users SET preferences = '{}' WHERE preferences IS NULL"))

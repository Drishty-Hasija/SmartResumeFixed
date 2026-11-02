import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

# Isolated database + upload folder for the whole test run (set BEFORE importing the app).
_tmp = tempfile.mkdtemp(prefix="smartresume_test_")
# Default: a throwaway SQLite file. Set SMARTRESUME_TEST_DATABASE_URL to run the same suite on PostgreSQL.
os.environ["DATABASE_URL"] = os.environ.get("SMARTRESUME_TEST_DATABASE_URL") or f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

DATA = ROOT / "backend" / "data"


TEST_PASSWORD = "correct-horse-battery-1"


@pytest.fixture(scope="session")
def anon_client():
    """A client with no credentials, for testing sign-in and access control."""
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def client(anon_client):
    """Signed in as a test account; every existing API test runs as this user."""
    r = anon_client.post("/api/auth/register", json={
        "name": "Test Student", "email": "tester@example.com", "password": TEST_PASSWORD})
    assert r.status_code == 201, r.text
    anon_client.headers["Authorization"] = f"Bearer {r.json()['token']}"
    return anon_client


@pytest.fixture(scope="session")
def resume_txt() -> str:
    return (DATA / "sample_resume.txt").read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def job_txt() -> str:
    return (DATA / "sample_job_description.txt").read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def resume_pdf() -> bytes:
    return (DATA / "sample_resume.pdf").read_bytes()


@pytest.fixture(scope="session")
def resume_docx() -> bytes:
    return (DATA / "sample_resume.docx").read_bytes()

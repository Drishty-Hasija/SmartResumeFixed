"""Accounts, sessions, settings, and per-user data isolation (anonymous and cross-user access)."""
import uuid

import pytest

PASSWORD = "correct-horse-battery-1"


def _signup(anon, name="Someone"):
    email = f"{uuid.uuid4().hex[:10]}@example.com"
    r = anon.post("/api/auth/register", json={"name": name, "email": email, "password": PASSWORD})
    assert r.status_code == 201, r.text
    body = r.json()
    return {"Authorization": f"Bearer {body['token']}"}, body["user"], email


@pytest.fixture()
def fresh(anon_client):
    """Two independent signed-in users for isolation tests."""
    a_headers, a_user, a_email = _signup(anon_client, "Alice")
    b_headers, b_user, b_email = _signup(anon_client, "Bob")
    return {"a": a_headers, "b": b_headers, "a_email": a_email, "b_email": b_email, "a_user": a_user}


# ------------------------------------------------------------ sign up / in

def test_register_returns_token_and_profile(anon_client):
    headers, user, email = _signup(anon_client, "Ada")
    assert user["email"] == email and user["name"] == "Ada"
    assert "password" not in user and "password_hash" not in user
    assert user["preferences"]["theme"] == "system"
    assert anon_client.get("/api/auth/me", headers=headers).json()["email"] == email


def test_duplicate_email_is_rejected(anon_client):
    _, _, email = _signup(anon_client)
    r = anon_client.post("/api/auth/register", json={"name": "Again", "email": email, "password": PASSWORD})
    assert r.status_code == 409 and r.json()["error"]["code"] == "email_taken"


def test_weak_or_invalid_signup_is_rejected(anon_client):
    r = anon_client.post("/api/auth/register", json={"name": "X", "email": "not-an-email", "password": PASSWORD})
    assert r.status_code == 422
    r = anon_client.post("/api/auth/register", json={"name": "X", "email": "x@example.com", "password": "short"})
    assert r.status_code == 422


def test_login_with_correct_password(anon_client):
    _, _, email = _signup(anon_client)
    r = anon_client.post("/api/auth/login", json={"email": email.upper(), "password": PASSWORD})
    assert r.status_code == 200 and r.json()["token"]


def test_wrong_password_and_unknown_email_look_identical(anon_client):
    _, _, email = _signup(anon_client)
    wrong = anon_client.post("/api/auth/login", json={"email": email, "password": "not-the-password-1"})
    unknown = anon_client.post("/api/auth/login", json={"email": "nobody-here@example.com", "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["message"] == unknown.json()["error"]["message"]


def test_repeated_failures_are_throttled(anon_client):
    _, _, email = _signup(anon_client)
    for _ in range(5):
        anon_client.post("/api/auth/login", json={"email": email, "password": "wrong-password-xyz"})
    r = anon_client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 429 and r.json()["error"]["code"] == "too_many_attempts"


# ------------------------------------------------------ access and sessions

def test_protected_routes_need_a_token(anon_client):
    for path in ("/api/dashboard", "/api/resumes", "/api/jobs", "/api/match", "/api/user", "/api/auth/me"):
        r = anon_client.get(path, headers={"Authorization": ""})
        assert r.status_code == 401, path
        assert r.json()["error"]["code"] == "not_authenticated"


def test_invalid_token_is_rejected(anon_client):
    r = anon_client.get("/api/resumes", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "session_expired"


def test_logout_revokes_the_token(anon_client):
    headers, _, _ = _signup(anon_client)
    assert anon_client.post("/api/auth/logout", headers=headers).status_code == 204
    assert anon_client.get("/api/auth/me", headers=headers).status_code == 401


# --------------------------------------------------------- profile settings

def test_update_profile_name_and_email(anon_client, fresh):
    new_email = f"renamed-{uuid.uuid4().hex[:6]}@example.com"
    r = anon_client.put("/api/user", headers=fresh["a"], json={"name": "Alice Cooper", "email": new_email})
    assert r.status_code == 200 and r.json()["name"] == "Alice Cooper" and r.json()["email"] == new_email


def test_profile_email_cannot_take_another_accounts_email(anon_client, fresh):
    r = anon_client.put("/api/user", headers=fresh["a"], json={"name": "Alice", "email": fresh["b_email"]})
    assert r.status_code == 409 and r.json()["error"]["code"] == "email_taken"


def test_password_change_requires_current_password_and_signs_out_other_devices(anon_client, fresh):
    bad = anon_client.put("/api/user/password", headers=fresh["a"],
                          json={"current_password": "wrong-current-1", "new_password": "brand-new-password-2"})
    assert bad.status_code == 403
    ok = anon_client.put("/api/user/password", headers=fresh["a"],
                         json={"current_password": PASSWORD, "new_password": "brand-new-password-2"})
    assert ok.status_code == 200
    assert anon_client.get("/api/auth/me", headers=fresh["a"]).status_code == 401   # old token revoked
    new_headers = {"Authorization": f"Bearer {ok.json()['token']}"}
    assert anon_client.get("/api/auth/me", headers=new_headers).status_code == 200


def test_preferences_default_merge_and_validate(anon_client, fresh):
    prefs = anon_client.get("/api/user/preferences", headers=fresh["b"]).json()
    assert prefs == {"theme": "system", "font": "inter", "text_size": "md", "reduce_motion": False}
    r = anon_client.put("/api/user/preferences", headers=fresh["b"], json={"theme": "dark", "text_size": "xl"})
    assert r.json() == {"theme": "dark", "font": "inter", "text_size": "xl", "reduce_motion": False}
    assert anon_client.put("/api/user/preferences", headers=fresh["b"], json={"theme": "neon"}).status_code == 422
    # preferences are part of the profile too
    assert anon_client.get("/api/auth/me", headers=fresh["b"]).json()["preferences"]["theme"] == "dark"


def test_delete_account_needs_password_and_removes_access(anon_client):
    headers, _, email = _signup(anon_client)
    assert anon_client.request("DELETE", "/api/user", headers=headers, json={"password": "wrong-password-1"}).status_code == 403
    assert anon_client.request("DELETE", "/api/user", headers=headers, json={"password": PASSWORD}).status_code == 204
    assert anon_client.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 401


# ------------------------------------------------------ data isolation & features

@pytest.fixture()
def alice_resume(anon_client, fresh, resume_pdf):
    r = anon_client.post("/api/resumes/upload", headers=fresh["a"],
                         files={"file": ("cv.pdf", resume_pdf, "application/pdf")})
    assert r.status_code == 201, r.text
    return r.json()


def test_other_users_cannot_see_or_touch_a_resume(anon_client, fresh, alice_resume):
    rid = alice_resume["id"]
    assert anon_client.get(f"/api/resumes/{rid}", headers=fresh["b"]).status_code == 404
    assert anon_client.get(f"/api/resumes/{rid}/file", headers=fresh["b"]).status_code == 404
    assert anon_client.patch(f"/api/resumes/{rid}", headers=fresh["b"], json={"label": "hacked"}).status_code == 404
    assert anon_client.delete(f"/api/resumes/{rid}", headers=fresh["b"]).status_code == 404
    listed = anon_client.get("/api/resumes", headers=fresh["b"]).json()
    assert all(r["id"] != rid for r in listed)


def test_rename_resume_and_download_original(anon_client, fresh, alice_resume, resume_pdf):
    rid = alice_resume["id"]
    r = anon_client.patch(f"/api/resumes/{rid}", headers=fresh["a"], json={"label": "  Summer 2026 <b>CV</b>  "})
    assert r.status_code == 200 and r.json()["label"] == "Summer 2026 CV"
    f = anon_client.get(f"/api/resumes/{rid}/file", headers=fresh["a"])
    assert f.status_code == 200 and f.content == resume_pdf
    assert f.headers["content-type"] == "application/pdf"
    assert "cv.pdf" in f.headers["content-disposition"]


def test_match_tracking_status_and_notes(anon_client, fresh, alice_resume, job_txt):
    job = anon_client.post("/api/jobs", headers=fresh["a"], json={"title": "Dev role", "description": job_txt}).json()
    match = anon_client.post("/api/match", headers=fresh["a"],
                             json={"resume_id": alice_resume["id"], "job_id": job["id"]}).json()
    assert match["status"] == "saved" and match["notes"] == ""
    r = anon_client.patch(f"/api/match/{match['id']}", headers=fresh["a"],
                          json={"status": "interviewing", "notes": "  Recruiter call Friday  "})
    assert r.status_code == 200
    assert r.json()["status"] == "interviewing" and r.json()["notes"] == "Recruiter call Friday"
    assert anon_client.patch(f"/api/match/{match['id']}", headers=fresh["a"], json={"status": "hired"}).status_code == 422
    assert anon_client.patch(f"/api/match/{match['id']}", headers=fresh["b"], json={"status": "applied"}).status_code == 404


def test_rename_saved_job(anon_client, fresh, job_txt):
    job = anon_client.post("/api/jobs", headers=fresh["a"], json={"title": "Old", "description": job_txt}).json()
    r = anon_client.patch(f"/api/jobs/{job['id']}", headers=fresh["a"], json={"title": "Backend Intern"})
    assert r.status_code == 200 and r.json()["title"] == "Backend Intern"
    assert anon_client.patch(f"/api/jobs/{job['id']}", headers=fresh["b"], json={"title": "x"}).status_code == 404


def test_dashboard_is_scoped_to_the_signed_in_user(anon_client, fresh, alice_resume):
    assert anon_client.get("/api/dashboard", headers=fresh["b"]).json()["totals"]["resumes"] == 0
    assert anon_client.get("/api/dashboard", headers=fresh["a"]).json()["totals"]["resumes"] >= 1

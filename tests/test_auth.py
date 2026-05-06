"""Module 02 — Authentication tests."""


def test_login_success(client, admin):
    resp = client.post("/api/auth/login", json={"employee_id": "ADMIN001", "pin": "0000"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_pin(client, admin):
    resp = client.post("/api/auth/login", json={"employee_id": "ADMIN001", "pin": "9999"})
    assert resp.status_code == 401


def test_login_unknown_employee(client, admin):
    resp = client.post("/api/auth/login", json={"employee_id": "GHOST", "pin": "0000"})
    assert resp.status_code == 401


def test_me_returns_current_user(client, admin_token, admin):
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["employee_id"] == "ADMIN001"
    assert data["role"] == "admin"


def test_me_rejects_bad_token(client, admin):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401


def test_me_requires_token(client, admin):
    # HTTPBearer returns 403 when Authorization header is absent
    resp = client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


def test_worker_role_returned(client, worker, worker_token):
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "worker"

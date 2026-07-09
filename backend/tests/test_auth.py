def test_register_success(client, user_data):
    res = client.post("/api/auth/register", json=user_data)
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["name"] == "Test User"
    assert data["user"]["email"] == "test@example.com"


def test_register_duplicate_email(client, user_data):
    client.post("/api/auth/register", json=user_data)
    res = client.post("/api/auth/register", json=user_data)
    assert res.status_code == 400


def test_login_success(client, registered_user):
    res = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"],
    })
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["email"] == registered_user["email"]


def test_login_wrong_password(client, registered_user):
    res = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": "wrongpassword",
    })
    assert res.status_code == 401


def test_login_nonexistent_email(client):
    res = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "password123",
    })
    assert res.status_code == 401


def test_me_authenticated(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "test@example.com"


def test_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401
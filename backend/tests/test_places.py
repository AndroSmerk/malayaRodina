def test_create_place(client, auth_headers):
    data = {
        "name": "My Village",
        "type": "village",
        "lat": 55.5,
        "lng": 37.5,
        "visibility": "private",
    }
    res = client.post("/api/places", json=data, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "My Village"
    assert body["type"] == "village"
    assert body["lat"] == 55.5
    assert body["lng"] == 37.5
    assert body["visibility"] == "private"
    assert body["id"] > 0


def test_list_places_empty(client, auth_headers):
    res = client.get("/api/places", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 0
    assert body["items"] == []


def test_list_places_with_one(client, auth_headers, create_place):
    create_place()
    res = client.get("/api/places", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1


def test_get_place(client, auth_headers, place_id):
    res = client.get(f"/api/places/{place_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == place_id


def test_get_place_not_found(client, auth_headers):
    res = client.get("/api/places/99999", headers=auth_headers)
    assert res.status_code == 404


def test_get_place_other_user(client, auth_headers, second_user_headers, create_place, place_id):
    res = client.get(f"/api/places/{place_id}", headers=second_user_headers)
    assert res.status_code == 404


def test_delete_place(client, auth_headers, place_id):
    res = client.delete(f"/api/places/{place_id}", headers=auth_headers)
    assert res.status_code == 200
    res = client.get("/api/places", headers=auth_headers)
    assert res.json()["total"] == 0


def test_delete_place_not_found(client, auth_headers):
    res = client.delete("/api/places/99999", headers=auth_headers)
    assert res.status_code == 404


def test_cannot_access_without_auth(client, place_id):
    client.cookies.clear()
    res = client.get("/api/places")
    assert res.status_code == 401
    res = client.post("/api/places", json={"name": "x", "lat": 0, "lng": 0})
    assert res.status_code == 401
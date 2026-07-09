from schemas import MemoryCreate


def test_create_memory(client, auth_headers, place_id):
    data = {
        "placeId": place_id,
        "text": "<p>My first memory</p>",
        "date": "2024-01-15",
        "category": "Детство",
        "visibility": "private",
    }
    res = client.post("/api/memories", json=data, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["placeId"] == place_id
    assert "My first memory" in body["text"]
    assert body["visibility"] == "private"
    assert body["id"] > 0


def test_create_memory_sanitizes_html(client, auth_headers, place_id):
    data = {
        "placeId": place_id,
        "text": "<p>Hello</p><script>alert('xss')</script>",
        "visibility": "private",
    }
    res = client.post("/api/memories", json=data, headers=auth_headers)
    assert res.status_code == 200
    assert "<script>" not in res.json()["text"]


def test_create_memory_wrong_place(client, auth_headers):
    data = {"placeId": 99999, "text": "<p>test</p>", "visibility": "private"}
    res = client.post("/api/memories", json=data, headers=auth_headers)
    assert res.status_code == 404


def test_list_memories(client, auth_headers, place_id):
    client.post("/api/memories", json={
        "placeId": place_id, "text": "<p>one</p>", "visibility": "private",
    }, headers=auth_headers)
    client.post("/api/memories", json={
        "placeId": place_id, "text": "<p>two</p>", "visibility": "private",
    }, headers=auth_headers)
    res = client.get("/api/memories", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


def test_get_memory(client, auth_headers, place_id):
    create_res = client.post("/api/memories", json={
        "placeId": place_id, "text": "<p>find me</p>", "visibility": "private",
    }, headers=auth_headers)
    memory_id = create_res.json()["id"]
    res = client.get(f"/api/memories/{memory_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == memory_id
    assert res.json()["status"] == "approved"


def test_get_memory_other_user(client, auth_headers, second_user_headers, create_place, place_id):
    create_res = client.post("/api/memories", json={
        "placeId": place_id, "text": "<p>private</p>", "visibility": "private",
    }, headers=auth_headers)
    memory_id = create_res.json()["id"]
    res = client.get(f"/api/memories/{memory_id}", headers=second_user_headers)
    assert res.status_code == 404


def test_update_memory(client, auth_headers, place_id):
    create_res = client.post("/api/memories", json={
        "placeId": place_id, "text": "<p>original</p>", "visibility": "private",
    }, headers=auth_headers)
    mid = create_res.json()["id"]
    res = client.put(f"/api/memories/{mid}", json={
        "placeId": place_id, "text": "<p>updated</p>", "visibility": "public",
    }, headers=auth_headers)
    assert res.status_code == 200
    assert "updated" in res.json()["text"]
    assert res.json()["status"] == "pending"


def test_delete_memory(client, auth_headers, place_id):
    create_res = client.post("/api/memories", json={
        "placeId": place_id, "text": "<p>delete me</p>", "visibility": "private",
    }, headers=auth_headers)
    mid = create_res.json()["id"]
    res = client.delete(f"/api/memories/{mid}", headers=auth_headers)
    assert res.status_code == 200
    res = client.get(f"/api/memories/{mid}", headers=auth_headers)
    assert res.status_code == 404
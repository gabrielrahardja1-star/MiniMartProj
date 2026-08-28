"""Product category list + Indonesian/Chinese label handling."""


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_categories_endpoint_requires_auth(client):
    # HTTPBearer with no credentials -> 403 (app-wide convention)
    assert client.get("/api/products/categories").status_code == 403


def test_categories_endpoint_returns_fixed_list(client, worker_token):
    resp = client.get("/api/products/categories", headers=_auth(worker_token))
    assert resp.status_code == 200
    data = resp.json()
    assert any(c["key"] == "Minuman" and c["name_zh"] == "饮料" for c in data)
    assert all({"key", "name_id", "name_zh"} <= c.keys() for c in data)


def test_create_product_fills_category_zh(client, admin_token):
    resp = client.post(
        "/api/admin/products/",
        headers=_auth(admin_token),
        json={"name": "Test Cola", "price": 5000, "category": "Minuman"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["category"] == "Minuman"
    assert body["category_zh"] == "饮料"


def test_create_product_unknown_category_leaves_zh_null(client, admin_token):
    resp = client.post(
        "/api/admin/products/",
        headers=_auth(admin_token),
        json={"name": "Mystery Item", "price": 1000, "category": "Nonexistent"},
    )
    assert resp.status_code == 201
    assert resp.json()["category_zh"] is None


def test_update_product_category_resyncs_zh(client, admin_token, products):
    pid = products[0].id
    resp = client.put(
        f"/api/admin/products/{pid}",
        headers=_auth(admin_token),
        json={"category": "Snack & Biskuit"},
    )
    assert resp.status_code == 200
    assert resp.json()["category_zh"] == "零食与饼干"

    # switching category again re-syncs the label
    resp = client.put(
        f"/api/admin/products/{pid}",
        headers=_auth(admin_token),
        json={"category": "Susu"},
    )
    assert resp.json()["category_zh"] == "牛奶"


def test_blank_chinese_name_stored_as_null(client, admin_token):
    resp = client.post(
        "/api/admin/products/",
        headers=_auth(admin_token),
        json={"name": "Plain Item", "price": 2000, "name_zh": "   ", "category": ""},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name_zh"] is None
    assert body["category"] is None
    assert body["category_zh"] is None

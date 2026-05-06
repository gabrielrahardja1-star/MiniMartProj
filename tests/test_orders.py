"""Module 04 — Worker App API tests."""


def test_list_products_excludes_out_of_stock(client, worker_token, products):
    resp = client.get("/api/products/", headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert "Work Gloves" in names
    assert "Safety Helmet" in names
    assert "Energy Bar" not in names  # stock=0


def test_list_products_requires_auth(client, products):
    # HTTPBearer returns 403 when Authorization header is absent
    resp = client.get("/api/products/")
    assert resp.status_code in (401, 403)


def test_create_order_success(client, worker_token, products):
    gloves = products[0]
    resp = client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"items": [{"product_id": gloves.id, "quantity": 3}]},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert round(data["total"], 2) == round(5.50 * 3, 2)
    assert data["items"][0]["unit_price"] == 5.50


def test_order_decrements_stock(client, worker_token, products, db_session):
    gloves = products[0]
    initial_stock = gloves.stock
    client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"items": [{"product_id": gloves.id, "quantity": 2}]},
    )
    db_session.refresh(gloves)
    assert gloves.stock == initial_stock - 2


def test_order_rejects_out_of_stock(client, worker_token, products):
    energy_bar = products[2]  # stock=0
    resp = client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"items": [{"product_id": energy_bar.id, "quantity": 1}]},
    )
    assert resp.status_code == 409


def test_order_rejects_excess_quantity(client, worker_token, products):
    helmet = products[1]  # stock=5
    resp = client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"items": [{"product_id": helmet.id, "quantity": 999}]},
    )
    assert resp.status_code == 409


def test_my_orders_only_shows_own(client, worker_token, admin_token, products, admin, worker):
    # Worker places an order
    client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"items": [{"product_id": products[0].id, "quantity": 1}]},
    )
    resp = client.get("/api/orders/my", headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 200
    orders = resp.json()
    assert all(o["worker_id"] == worker.id for o in orders)


def test_spending_summary(client, worker_token, products):
    client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"items": [{"product_id": products[0].id, "quantity": 2}]},
    )
    resp = client.get("/api/orders/my/spending", headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_spend"] == round(5.50 * 2, 2)
    assert data["order_count"] == 1


def test_empty_order_rejected(client, worker_token):
    resp = client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"items": []},
    )
    assert resp.status_code == 400

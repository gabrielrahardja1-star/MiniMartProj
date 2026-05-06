"""Module 05 — Admin Dashboard API tests."""


def _place_order(client, worker_token, product_id, quantity):
    return client.post(
        "/api/orders/",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"items": [{"product_id": product_id, "quantity": quantity}]},
    ).json()


def test_admin_list_products_shows_low_stock(client, admin_token, products):
    resp = client.get("/api/admin/products/", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    by_sku = {p["sku"]: p for p in resp.json()}
    assert by_sku["SH-001"]["low_stock"] is True   # stock=5, threshold=5
    assert by_sku["WG-001"]["low_stock"] is False   # stock=10


def test_admin_create_product(client, admin_token):
    resp = client.post(
        "/api/admin/products/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Protein Bar", "sku": "PB-001", "price": 2.50, "stock": 3},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Protein Bar"
    assert data["low_stock"] is True  # stock=3 <= 5


def test_admin_create_product_duplicate_sku(client, admin_token, products):
    resp = client.post(
        "/api/admin/products/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Dupe", "sku": "WG-001", "price": 1.0, "stock": 1},
    )
    assert resp.status_code == 409


def test_admin_update_product(client, admin_token, products):
    product_id = products[0].id
    resp = client.put(
        f"/api/admin/products/{product_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"price": 9.99, "stock": 50},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["price"] == 9.99
    assert data["stock"] == 50


def test_admin_list_orders(client, admin_token, worker_token, products, worker):
    _place_order(client, worker_token, products[0].id, 1)
    resp = client.get("/api/admin/orders/", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    orders = resp.json()
    assert len(orders) >= 1
    assert orders[0]["worker_employee_id"] == "W001"


def test_admin_filter_orders_by_status(client, admin_token, worker_token, products):
    order = _place_order(client, worker_token, products[0].id, 1)
    # Fulfill it
    client.put(f"/api/admin/orders/{order['id']}/fulfill",
               headers={"Authorization": f"Bearer {admin_token}"})

    resp = client.get("/api/admin/orders/?status=fulfilled",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert all(o["status"] == "fulfilled" for o in resp.json())


def test_fulfill_order(client, admin_token, worker_token, products):
    order = _place_order(client, worker_token, products[0].id, 1)
    resp = client.put(
        f"/api/admin/orders/{order['id']}/fulfill",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "fulfilled"


def test_cancel_order_restores_stock(client, admin_token, worker_token, products, db_session):
    gloves = products[0]
    initial_stock = gloves.stock
    order = _place_order(client, worker_token, gloves.id, 3)

    resp = client.put(
        f"/api/admin/orders/{order['id']}/cancel",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
    db_session.refresh(gloves)
    assert gloves.stock == initial_stock  # stock fully restored


def test_cannot_cancel_fulfilled_order(client, admin_token, worker_token, products):
    order = _place_order(client, worker_token, products[0].id, 1)
    client.put(f"/api/admin/orders/{order['id']}/fulfill",
               headers={"Authorization": f"Bearer {admin_token}"})
    resp = client.put(
        f"/api/admin/orders/{order['id']}/cancel",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400


def test_spending_report(client, admin_token, worker_token, products):
    _place_order(client, worker_token, products[0].id, 2)
    resp = client.get("/api/admin/reports/spending",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    report = resp.json()
    assert len(report) >= 1
    w = next(r for r in report if r["employee_id"] == "W001")
    assert w["total_deduction"] == round(5.50 * 2, 2)


def test_spending_csv_export(client, admin_token, worker_token, products):
    _place_order(client, worker_token, products[0].id, 1)
    resp = client.get("/api/admin/reports/spending.csv",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    lines = resp.text.strip().splitlines()
    assert lines[0] == "worker_name,employee_id,total_deduction,month"
    assert "W001" in lines[1]


def test_admin_routes_reject_worker(client, worker_token):
    resp = client.get("/api/admin/products/",
                      headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 403

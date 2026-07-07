import bcrypt
import hashlib

from app.config import settings
from app.models.order import Order
from app.models.wallet import WalletTransaction
from app.models.worker import Worker


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _place_order(client, worker_token, product_id, quantity=1):
    resp = client.post(
        "/api/orders/",
        headers=_auth(worker_token),
        json={"items": [{"product_id": product_id, "quantity": quantity}]},
    )
    assert resp.status_code == 201
    return resp.json()


def test_admin_topup_credits_balance_and_creates_ledger(client, admin_token, worker, db_session):
    resp = client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 100000, "note": "cash at counter"},
    )

    assert resp.status_code == 200
    assert resp.json()["balance"] == 100000
    db_session.refresh(worker)
    assert float(worker.balance) == 100000

    tx = db_session.query(WalletTransaction).one()
    assert tx.type == "topup"
    assert float(tx.amount) == 100000
    assert float(tx.balance_after) == 100000
    assert tx.note == "cash at counter"


def test_admin_topup_requires_admin_and_positive_amount(client, worker_token, admin_token, worker):
    worker_resp = client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(worker_token),
        json={"amount": 1000},
    )
    assert worker_resp.status_code == 403

    invalid_resp = client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 0},
    )
    assert invalid_resp.status_code == 422


def test_wallet_payment_success_debits_balance_and_marks_order_paid(
    client, admin_token, worker_token, worker, products, db_session
):
    order = _place_order(client, worker_token, products[0].id, 2)
    client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 20},
    )

    resp = client.post(f"/api/wallet/pay/{order['id']}", headers=_auth(worker_token))

    assert resp.status_code == 200
    assert resp.json()["payment_status"] == "paid"
    db_session.refresh(worker)
    assert float(worker.balance) == 9.0

    payment = (
        db_session.query(WalletTransaction)
        .filter(WalletTransaction.type == "payment")
        .one()
    )
    assert payment.order_id == order["id"]
    assert float(payment.amount) == 11.0
    assert float(payment.balance_after) == 9.0


def test_wallet_payment_insufficient_balance_does_not_mutate(
    client, admin_token, worker_token, worker, products, db_session
):
    order = _place_order(client, worker_token, products[0].id, 2)
    client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 5},
    )

    resp = client.post(f"/api/wallet/pay/{order['id']}", headers=_auth(worker_token))

    assert resp.status_code == 409
    db_session.refresh(worker)
    assert float(worker.balance) == 5
    db_order = db_session.get(Order, order["id"])
    assert db_order.payment_status == "unpaid"
    assert db_session.query(WalletTransaction).filter(WalletTransaction.type == "payment").count() == 0


def test_wallet_payment_already_paid_second_call_rejected(
    client, admin_token, worker_token, worker, products, db_session
):
    order = _place_order(client, worker_token, products[0].id, 1)
    client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 20},
    )

    first = client.post(f"/api/wallet/pay/{order['id']}", headers=_auth(worker_token))
    second = client.post(f"/api/wallet/pay/{order['id']}", headers=_auth(worker_token))

    assert first.status_code == 200
    assert second.status_code == 400
    db_session.refresh(worker)
    assert float(worker.balance) == 14.5
    assert db_session.query(WalletTransaction).filter(WalletTransaction.type == "payment").count() == 1


def test_wallet_payment_ownership_check(client, admin_token, worker_token, worker, products, db_session):
    other = Worker(
        employee_id="W002",
        name="Other Worker",
        pin_hash=bcrypt.hashpw(b"2222", bcrypt.gensalt()).decode(),
        role="worker",
        is_active=True,
    )
    db_session.add(other)
    db_session.commit()
    db_session.refresh(other)

    login = client.post("/api/auth/login", json={"employee_id": "W002", "pin": "2222"})
    other_token = login.json()["access_token"]
    order = _place_order(client, other_token, products[0].id, 1)
    client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 20},
    )

    resp = client.post(f"/api/wallet/pay/{order['id']}", headers=_auth(worker_token))

    assert resp.status_code == 403


def test_admin_transactions_returns_newest_first(client, admin_token, worker_token, worker, products):
    order = _place_order(client, worker_token, products[0].id, 1)
    client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 20},
    )
    client.post(f"/api/wallet/pay/{order['id']}", headers=_auth(worker_token))

    resp = client.get(f"/api/admin/workers/{worker.id}/transactions", headers=_auth(admin_token))

    assert resp.status_code == 200
    rows = resp.json()
    assert [row["type"] for row in rows] == ["payment", "topup"]


def test_cancel_wallet_paid_order_refunds_balance(client, admin_token, worker_token, worker, products, db_session):
    order = _place_order(client, worker_token, products[0].id, 2)
    client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 20},
    )
    client.post(f"/api/wallet/pay/{order['id']}", headers=_auth(worker_token))

    resp = client.put(f"/api/admin/orders/{order['id']}/cancel", headers=_auth(admin_token))

    assert resp.status_code == 200
    db_session.refresh(worker)
    assert float(worker.balance) == 20
    refund = (
        db_session.query(WalletTransaction)
        .filter(WalletTransaction.type == "refund")
        .one()
    )
    assert refund.order_id == order["id"]
    assert float(refund.amount) == 11.0
    assert float(refund.balance_after) == 20


def test_cancel_qris_paid_order_does_not_touch_wallet(client, admin_token, worker, worker_token, products, db_session):
    order = _place_order(client, worker_token, products[0].id, 1)
    client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 20},
    )
    db_order = db_session.get(Order, order["id"])
    db_order.payment_status = "paid"
    db_session.commit()

    resp = client.put(f"/api/admin/orders/{order['id']}/cancel", headers=_auth(admin_token))

    assert resp.status_code == 200
    db_session.refresh(worker)
    assert float(worker.balance) == 20
    assert db_session.query(WalletTransaction).filter(WalletTransaction.type == "refund").count() == 0


def test_midtrans_webhook_does_not_downgrade_wallet_paid_order(
    client, admin_token, worker_token, worker, products, db_session
):
    order = _place_order(client, worker_token, products[0].id, 1)
    client.post(
        f"/api/admin/workers/{worker.id}/topup",
        headers=_auth(admin_token),
        json={"amount": 20},
    )
    client.post(f"/api/wallet/pay/{order['id']}", headers=_auth(worker_token))
    midtrans_order_id = f"MM-{order['id']}-123"
    status_code = "200"
    gross_amount = "5.50"
    signature = hashlib.sha512(
        f"{midtrans_order_id}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}".encode()
    ).hexdigest()

    resp = client.post(
        "/api/payments/webhook",
        json={
            "order_id": midtrans_order_id,
            "status_code": status_code,
            "gross_amount": gross_amount,
            "transaction_status": "failure",
            "signature_key": signature,
        },
    )

    assert resp.status_code == 200
    assert resp.json()["status"] == "already_paid"
    db_order = db_session.get(Order, order["id"])
    assert db_order.payment_status == "paid"

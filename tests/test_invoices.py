"""Module 03 — Invoice parser tests."""
import io
from fpdf import FPDF


def _make_invoice_pdf(rows: list[tuple]) -> bytes:
    """Generate a simple table-based invoice PDF."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 10, "Test Supplier Co.", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(100, 8, "Product", border=1)
    pdf.cell(30, 8, "Qty", border=1)
    pdf.cell(40, 8, "Unit Price", border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=11)
    for name, qty, price in rows:
        pdf.cell(100, 8, name, border=1)
        pdf.cell(30, 8, str(qty), border=1)
        pdf.cell(40, 8, str(price), border=1, new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())


def test_upload_invoice_parses_line_items(client, admin_token):
    pdf = _make_invoice_pdf([("Work Gloves", 10, "5.50"), ("Safety Helmet", 5, "22.00")])
    resp = client.post(
        "/api/invoices/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("invoice.pdf", io.BytesIO(pdf), "application/pdf")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending_review"
    assert data["supplier_name"] is not None  # best-effort heuristic, exact text varies
    assert len(data["items"]) == 2
    names = {i["raw_product_name"] for i in data["items"]}
    assert "Work Gloves" in names
    assert "Safety Helmet" in names
    assert all(i["product_id"] is None for i in data["items"])


def test_upload_rejects_non_pdf(client, admin_token):
    resp = client.post(
        "/api/invoices/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("data.csv", io.BytesIO(b"a,b,c"), "text/csv")},
    )
    assert resp.status_code == 400


def test_upload_requires_admin(client, worker_token, worker):
    pdf = _make_invoice_pdf([("Item", 1, "1.00")])
    resp = client.post(
        "/api/invoices/upload",
        headers={"Authorization": f"Bearer {worker_token}"},
        files={"file": ("invoice.pdf", io.BytesIO(pdf), "application/pdf")},
    )
    assert resp.status_code == 403


def test_list_invoices(client, admin_token):
    pdf = _make_invoice_pdf([("Item A", 2, "3.00")])
    client.post(
        "/api/invoices/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("inv.pdf", io.BytesIO(pdf), "application/pdf")},
    )
    resp = client.get("/api/invoices/", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_map_item_and_approve(client, admin_token, products):
    pdf = _make_invoice_pdf([("Work Gloves", 10, "5.50")])
    upload = client.post(
        "/api/invoices/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("inv.pdf", io.BytesIO(pdf), "application/pdf")},
    ).json()
    invoice_id = upload["id"]
    item_id = upload["items"][0]["id"]
    product_id = products[0].id

    # Map item
    resp = client.put(
        f"/api/invoices/{invoice_id}/items/{item_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": product_id},
    )
    assert resp.status_code == 200
    assert resp.json()["items"][0]["product_id"] == product_id

    # Approve
    resp = client.post(
        f"/api/invoices/{invoice_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


def test_approve_blocked_if_unmapped(client, admin_token, products):
    pdf = _make_invoice_pdf([("Work Gloves", 10, "5.50"), ("Safety Helmet", 2, "22.00")])
    upload = client.post(
        "/api/invoices/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("inv.pdf", io.BytesIO(pdf), "application/pdf")},
    ).json()
    invoice_id = upload["id"]

    # Map only first item
    client.put(
        f"/api/invoices/{invoice_id}/items/{upload['items'][0]['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": products[0].id},
    )

    resp = client.post(
        f"/api/invoices/{invoice_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
    assert "not yet mapped" in resp.json()["detail"]


def test_reject_invoice(client, admin_token):
    pdf = _make_invoice_pdf([("Item", 1, "1.00")])
    upload = client.post(
        "/api/invoices/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("inv.pdf", io.BytesIO(pdf), "application/pdf")},
    ).json()
    resp = client.post(
        f"/api/invoices/{upload['id']}/reject",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"

# Mobile Sync API

Endpoints added for the Android field app. All existing web routes
(`/api/auth`, `/api/orders`, `/api/products`, `/api/admin`, `/api/wallet`,
`/api/payments`, `/api/invoices`) are unchanged.

Auth: all mobile endpoints require the same JWT Bearer token issued by
`POST /api/auth/login` (see [app/routers/auth.py](../app/routers/auth.py)) —
there is no separate mobile login endpoint.

## `GET /api/mobile/v1/master-data`

Returns everything the app needs to build the order form while offline.

Response:
```json
{
  "products": [
    {"id": 1, "name": "Rice 5kg", "sku": "RC-5KG", "price": 250.0, "stock": 40, "unit": "bag", "category": "Staples", ...}
  ],
  "pickup_slot_options": ["12:00", "17:00"],
  "server_time": "2026-07-29T04:00:00+00:00"
}
```
The Android app caches `products` in Room and refreshes on login and after
each successful sync.

## `POST /api/mobile/v1/orders/sync`

Uploads a batch of locally-queued orders.

Request:
```json
{
  "orders": [
    {
      "client_record_id": "device-a1b2c3d4-9f2e...-uuid",
      "items": [{"product_id": 1, "quantity": 2}],
      "pickup_date": "2026-07-30",
      "pickup_slot": "12:00"
    }
  ]
}
```

Response:
```json
{
  "results": [
    {"client_record_id": "device-a1b2c3d4-...", "status": "synced", "server_order_id": 42, "error": null}
  ]
}
```

**Idempotency**: `client_record_id` is unique on the `orders` table
(migration `006_add_order_client_record_id.py`). Re-uploading the same id —
whether because the client retried after a dropped response, or the same
batch was sent twice — returns the existing order instead of creating a
new one. See `create_order_for_worker()` in
[app/services/order_service.py](../app/services/order_service.py), which is
shared with the existing web `POST /api/orders/` endpoint so stock/pricing
validation never diverges between the two clients.

Each item is validated and priced exactly as the web order flow: product
must be active, stock must cover the requested quantity (row-locked to
avoid race conditions with concurrent orders), pickup slot/date must be
valid per `app/core/pickup.py`. A validation failure for one order in the
batch does not fail the others — each gets its own `status`.

## `GET /api/mobile/v1/sync/status?client_record_ids=id1,id2`

Reconciliation helper: given a comma-separated list of ids, returns which
ones the server already has (with their server-side order id and status).
Used after an app reinstall or an extended offline period to confirm what
was previously synced without resubmitting.

## Database change

Migration `alembic/versions/006_add_order_client_record_id.py` adds
`orders.client_record_id VARCHAR(100) UNIQUE NULL`. Existing rows are
unaffected (nullable, no backfill needed) — the web order flow simply
never sets it.

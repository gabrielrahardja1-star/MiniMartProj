# Midtrans SNAP-based QRIS API

## Endpoint
| Path | Method | Version | SNAP Service Code |
|------|--------|---------|-------------------|
| `/{version}/qr/qr-mpm-generate` | POST | v1.0 | 47 |

Base URLs:
- Sandbox: `https://api.sandbox.midtrans.com`
- Production: `https://api.midtrans.com`

Full URL: `POST https://api.midtrans.com/v1.0/qr/qr-mpm-generate`

## Authentication
SNAP uses OAuth2 Bearer token + HMAC_SHA512 signature — different from Core API Basic Auth.

Required headers:
```
Content-type: application/json
X-TIMESTAMP: 2024-03-19T14:30:00+07:00   # ISO-8601
X-SIGNATURE: <HMAC_SHA512 signature>
Authorization: Bearer <access_token>       # from Access Token B2B endpoint
X-PARTNER-ID: <client_id>
X-EXTERNAL-ID: <unique UUID per request>
CHANNEL-ID: <5-digit numeric string>
```

## Request Body
```json
{
  "partnerReferenceNo": "2020102900000000000001",
  "amount": {
    "value": "12345678.00",
    "currency": "IDR"
  },
  "merchantId": "00007100010926",
  "validityPeriod": "2009-07-03T12:08:56-07:00",
  "additionalInfo": {
    "acquirer": "gopay"
  }
}
```

## Response Body
```json
{
  "responseCode": "2004700",
  "responseMessage": "Request has been processed successfully",
  "referenceNo": "2020102977770000000009",
  "partnerReferenceNo": "2020102900000000000001",
  "qrContent": "xxxxxxxxxxxxxxxx",
  "qrUrl": "https://qrurl?img=12345",
  "qrImage": "<base64 image>",
  "additionalInfo": {
    "acquirer": "gopay"
  }
}
```

Key response fields:
- `qrContent` — QR string to render as QR code
- `qrUrl` — URL to download QR image
- `qrImage` — base64 encoded QR image

## Response Codes
| Code | HTTP | Description |
|------|------|-------------|
| 2004700 | 200 | Successful |
| 4014700 | 401 | Unauthorized (invalid key, unknown client) |
| 4014701 | 401 | Token invalid or expired |
| 4044708 | 404 | Merchant does not exist or status abnormal |
| 4094700 | 409 | Duplicate X-EXTERNAL-ID |
| 5004701 | 500 | Internal server failure |

## Difference vs Core API (what we currently use)

| | Core API v2 (current) | SNAP API |
|---|---|---|
| Endpoint | `/v2/charge` | `/v1.0/qr/qr-mpm-generate` |
| Auth | Basic Auth (Base64 server_key) | OAuth2 Bearer + HMAC_SHA512 |
| QR field | `qr_string` | `qrContent` |
| Amount format | integer `gross_amount` | string `"12345.00"` |
| Complexity | Simple | Requires token exchange first |

## Current implementation (Core API)
Our `app/routers/payments.py` uses Core API:
- Auth: `Basic base64(server_key:)`
- Endpoint: `POST /v2/charge`
- Payload: `{"payment_type": "qris", "transaction_details": {"order_id": ..., "gross_amount": int}, "qris": {"acquirer": "gopay"}}`
- Response: reads `qr_string` and `actions[].url`

The Core API is simpler and sufficient for QRIS. The SNAP API is a newer standard but requires additional OAuth2 token exchange step.

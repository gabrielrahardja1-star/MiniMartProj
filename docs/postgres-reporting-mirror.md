# Postgres reporting mirror (for Looker Studio)

SQLite (`/app/data/minimart.db`) stays the **production database**. Looker Studio
has no SQLite connector, so a read-only Postgres copy is kept alongside it and
refreshed every 15 minutes. Nothing in the app reads from Postgres.

```
 SQLite (source of truth) ──scripts/sync_to_postgres.py (cron, */15)──▶ Postgres ──▶ Looker Studio
```

## What was added

| File | Purpose |
|---|---|
| `docker-compose.yml` → `postgres` service | `postgres:16-alpine`, volume `pg_data`, host port `5433` published (5432 is taken by a system Postgres) |
| `scripts/sync_to_postgres.py` | Full-refresh copy of all 7 tables, in one transaction |
| `scripts/pg/10-init-readonly.sh` | First-boot only: creates the `looker_ro` SELECT-only role |
| `scripts/pg/pg_hba.conf` | Client-auth allowlist — **you add Looker's IP ranges here** |
| `app/config.py` → `REPORTING_DATABASE_URL` | Blank = sync disabled (local dev default) |
| `.env.example` | `POSTGRES_*`, `REPORTING_DATABASE_URL`, `LOOKER_RO_PASSWORD` |

## One-time server setup

1. **Fill in `.env`** on the server (`/opt/minimart/.env`):

   ```
   POSTGRES_USER=minimart
   POSTGRES_PASSWORD=<strong random>
   POSTGRES_DB=minimart_reporting
   REPORTING_DATABASE_URL=postgresql+psycopg://minimart:<same password>@postgres:5432/minimart_reporting
   LOOKER_RO_PASSWORD=<different strong random>
   ```

2. **Deploy:**

   ```
   cd /opt/minimart
   git pull
   docker compose up -d --build      # builds backend with psycopg, starts postgres
   ```

3. **First sync** (creates the schema + grants, then loads data):

   ```
   docker compose exec -T backend python scripts/sync_to_postgres.py
   ```

   Expect: `Synced N rows to Postgres in 0.Xs — invoices=..., products=..., ...`

4. **Cron the sync** — `crontab -e` on the host:

   ```
   */15 * * * * cd /opt/minimart && docker compose exec -T backend python scripts/sync_to_postgres.py >> /var/log/minimart-sync.log 2>&1
   ```

5. **Backups** — add `minimart_reporting` is *not* worth backing up (it's derived).
   Keep backing up the SQLite file as before.

## Locking down port 5433

Docker publishes `5433` by editing iptables directly, which **bypasses ufw**. Two
layers protect it:

1. **`scripts/pg/pg_hba.conf`** (the real gate). Already contains Looker Studio's
   published range (`142.251.74.0/23`, checked 2026-09-07 from
   <https://docs.cloud.google.com/looker/docs/studio/connect-to-postgresql>).
   If Google changes it, edit the file, `git push`/`pull`, then
   `docker compose up -d --force-recreate postgres` — the file is bind-mounted and
   changes inode on `git pull`, so a plain restart or `pg_ctl reload` keeps serving
   the old copy. The trailing `reject` rules deny everything else.

2. **Hostinger cloud firewall** (belt-and-braces) — if available, restrict inbound
   `5433` to the same ranges there too.

The `looker_ro` role has `SELECT` only and can only reach `minimart_reporting`,
never the app.

## Connecting Looker Studio

Looker Studio → Add data → **PostgreSQL** connector:

| Field | Value |
|---|---|
| Host | `76.13.19.246` |
| Port | `5433` (the VPS already runs a system Postgres on 5432) |
| Database | `minimart_reporting` |
| Username | `looker_ro` |
| Password | `LOOKER_RO_PASSWORD` |
| Enable SSL | leave off unless you add server certs |

Then pick a table (or paste a custom query). `reporting_sync_status.synced_at`
holds the last refresh time (naive UTC) — put it on the report as a freshness
stamp.

## Notes

- **Full refresh, not incremental**: every run `TRUNCATE`s and reloads all tables
  in a single transaction. Correct through row edits and the hard-deletes the app
  does on sales; a Looker query always sees a complete snapshot. Fine at this data
  size for years.
- **Timestamps** stay naive UTC, unchanged — same convention as the rest of the app.
- **`REPORTING_DATABASE_URL` blank** (local dev) → the script prints a message and
  exits 0. No Postgres needed to run the app or the tests.
- Schema drift: `sync_to_postgres.py` calls `Base.metadata.create_all` each run,
  so **new columns/tables appear automatically**. It never drops columns — if you
  remove one from a model, drop it in Postgres by hand or recreate `pg_data`.

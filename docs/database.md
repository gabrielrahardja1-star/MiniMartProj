# Database

The app runs on **PostgreSQL 16** — the `postgres` service in `docker-compose.yml`,
database `minimart`. (It ran on a single SQLite file until the 2026-09 migration;
see git history for `scripts/migrate_sqlite_to_postgres.py`.)

## Connection

| Where | `DATABASE_URL` |
|---|---|
| Server (compose) | `postgresql+psycopg://minimart:${POSTGRES_PASSWORD}@postgres:5432/minimart` (set in `docker-compose.yml`) |
| Local dev | `postgresql+psycopg://minimart:...@localhost:5433/minimart` (in `.env`) |

`.env` on the server holds `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB=minimart`
/ `LOOKER_RO_PASSWORD`. Host port **5433** is published (the VPS already runs a
system Postgres on 5432); the container is 5432 internally.

The database timezone is pinned to UTC (`scripts/pg/10-init-readonly.sh`) — the app
stores naive-UTC timestamps and writes a mix of naive and tz-aware datetimes; a UTC
session keeps them consistent.

## Local development

```
docker compose up -d postgres          # just the DB
source .venv/bin/activate
alembic upgrade head                     # first time / after pulling migrations
uvicorn app.main:app --reload
```

## Schema changes

`alembic revision -m "..."` → edit → `alembic upgrade head`. `alembic/env.py` reads
`settings.DATABASE_URL`, so it always targets the DB the app uses. The Dockerfile
runs `alembic upgrade head && python -m app.db.init_db` on every boot (both
idempotent).

## Tests

`tests/conftest.py` runs against a real Postgres (`minimart_test`, auto-created).
Point it with `TEST_DATABASE_URL`; default is the compose Postgres on `localhost:5433`.
Schema is built once per session; each test runs in a transaction that is rolled back.

```
docker compose up -d postgres
pytest tests/ -q
```

## Backups

`scripts/pg_backup.sh` → `pg_dump -Fc` into `/opt/minimart/backups/`, 14-day retention.
Cron on the server:

```
0 3 * * * /opt/minimart/scripts/pg_backup.sh >> /var/log/minimart-backup.log 2>&1
```

Restore: `docker compose exec -T postgres pg_restore -U minimart -d minimart --clean < backups/minimart_<ts>.dump`.

## Looker Studio

Looker Studio connects **directly to production** as the read-only `looker_ro` role
(SELECT only, `minimart` DB only), created on first boot by
`scripts/pg/10-init-readonly.sh`. Access is gated by `scripts/pg/pg_hba.conf`, which
allowlists Google's published range (`142.251.74.0/23`) and rejects everything else.

- Connection: host `76.13.19.246`, port `5433`, db `minimart`, user `looker_ro`, SSL off.
- After editing `pg_hba.conf`: `docker compose up -d --force-recreate postgres` (the
  file is bind-mounted and changes inode on `git pull`, so `pg_ctl reload` serves the
  old copy).
- Set each data source's **Data freshness** to 15 min (or 1 h) in Looker.
- The dashboard queries live production, so it is current to Looker's own cache window.

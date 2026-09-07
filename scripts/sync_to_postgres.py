"""Full-refresh sync of the SQLite production DB into the Postgres reporting mirror.

The SQLite file at ``settings.DATABASE_URL`` stays the single source of truth for
the app. This script copies every row into Postgres
(``settings.REPORTING_DATABASE_URL``) so Looker Studio — which has no SQLite
connector — can dashboard off a supported database.

Runs every 15 minutes via cron on the server (see docs/postgres-reporting-mirror.md):

    */15 * * * * cd /opt/minimart && docker compose exec -T backend python scripts/sync_to_postgres.py >> /var/log/minimart-sync.log 2>&1

Each run truncates and reloads all tables inside a single transaction, so a
Looker query either sees the previous complete snapshot or the new one — never a
half-loaded database. Full refresh (rather than incremental append) keeps the
mirror correct through row edits and the hard-deletes the app now does on sales.
"""
import os
import sys
import time

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from sqlalchemy import create_engine, select, text  # noqa: E402

from app.config import settings  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import engine as source_engine  # noqa: E402
import app.models  # noqa: E402,F401  — importing registers every table on Base.metadata

# Rows per INSERT round-trip. The whole DB is small; this only matters for
# order_items once there are years of sales.
BATCH = 5000


def main() -> int:
    if not settings.REPORTING_DATABASE_URL:
        print("REPORTING_DATABASE_URL not set — reporting mirror disabled, nothing to do.")
        return 0

    target_engine = create_engine(settings.REPORTING_DATABASE_URL, pool_pre_ping=True)

    # Create the reporting schema if it isn't there yet. Idempotent — SQLAlchemy
    # only issues CREATE TABLE for tables that don't already exist.
    Base.metadata.create_all(target_engine)

    tables = Base.metadata.sorted_tables  # FK-safe order: parents before children
    started = time.time()
    counts: dict[str, int] = {}

    with source_engine.connect() as src, target_engine.begin() as dst:
        # Single statement, so the wipe doesn't care about FK order.
        dst.execute(text(
            "TRUNCATE TABLE {} RESTART IDENTITY CASCADE".format(
                ", ".join(f'"{t.name}"' for t in tables)
            )
        ))

        for table in tables:
            rows = [dict(m) for m in src.execute(select(table)).mappings()]
            counts[table.name] = len(rows)
            for i in range(0, len(rows), BATCH):
                dst.execute(table.insert(), rows[i:i + BATCH])

        # A row Looker can surface as a "data last refreshed" indicator.
        dst.execute(text("""
            CREATE TABLE IF NOT EXISTS reporting_sync_status (
                id           integer PRIMARY KEY,
                synced_at    timestamp NOT NULL,
                duration_ms  integer NOT NULL,
                total_rows   integer NOT NULL
            )
        """))
        dst.execute(
            text("""
                INSERT INTO reporting_sync_status (id, synced_at, duration_ms, total_rows)
                VALUES (1, :synced_at, :duration_ms, :total_rows)
                ON CONFLICT (id) DO UPDATE SET
                    synced_at   = EXCLUDED.synced_at,
                    duration_ms = EXCLUDED.duration_ms,
                    total_rows  = EXCLUDED.total_rows
            """),
            {
                "synced_at": _dt_now(),
                "duration_ms": int((time.time() - started) * 1000),
                "total_rows": sum(counts.values()),
            },
        )

        # Every (re)created table must be readable by the Looker role. No-op when
        # that role doesn't exist (e.g. a local Postgres without the init script).
        dst.execute(text(
            "DO $$ BEGIN "
            "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'looker_ro') THEN "
            "EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO looker_ro'; "
            "END IF; END $$;"
        ))

    elapsed = time.time() - started
    print(
        f"Synced {sum(counts.values())} rows to Postgres in {elapsed:.1f}s — "
        + ", ".join(f"{name}={n}" for name, n in counts.items())
    )
    return 0


def _dt_now():
    # Naive UTC, matching the rest of the app's timestamps.
    from datetime import datetime

    return datetime.utcnow()


if __name__ == "__main__":
    raise SystemExit(main())

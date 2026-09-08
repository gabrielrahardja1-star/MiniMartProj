"""One-shot copy of the legacy SQLite database into PostgreSQL, for the cutover.

Deleted once the migration is verified. Copies every ORM table from the SQLite
file into the target Postgres database, then fixes the identity sequences so the
first INSERT the app does after cutover doesn't collide on a primary key.

It does NOT create the alembic-only bits (`catalog_issues`, the orders CHECK
constraint) or stamp `alembic_version` — run `alembic upgrade head` against the
target afterwards for that (all 11 migrations are guarded no-ops except those).

Usage (from the repo root, or inside the backend container):

    SOURCE_SQLITE_URL=sqlite:////app/data/minimart.db \
    TARGET_DATABASE_URL=postgresql+psycopg://minimart:PASS@postgres:5432/minimart \
    python scripts/migrate_sqlite_to_postgres.py

Defaults: SOURCE_SQLITE_URL=sqlite:////app/data/minimart.db,
          TARGET_DATABASE_URL=settings.DATABASE_URL
"""
import os
import sys
import time

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from sqlalchemy import create_engine, select, text  # noqa: E402

from app.config import settings  # noqa: E402
from app.db.base import Base  # noqa: E402
import app.models  # noqa: E402,F401  — importing registers every table on Base.metadata

SOURCE_SQLITE_URL = os.environ.get("SOURCE_SQLITE_URL", "sqlite:////app/data/minimart.db")
TARGET_DATABASE_URL = os.environ.get("TARGET_DATABASE_URL", settings.DATABASE_URL)

BATCH = 5000


def main() -> int:
    if not TARGET_DATABASE_URL.startswith("postgresql"):
        sys.exit(f"TARGET_DATABASE_URL must be Postgres, got: {TARGET_DATABASE_URL!r}")

    source_engine = create_engine(
        SOURCE_SQLITE_URL, connect_args={"check_same_thread": False}
    )
    target_engine = create_engine(TARGET_DATABASE_URL, pool_pre_ping=True)

    Base.metadata.create_all(target_engine)

    tables = Base.metadata.sorted_tables  # FK-safe order: parents before children
    started = time.time()
    counts: dict[str, int] = {}

    with source_engine.connect() as src, target_engine.begin() as dst:
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

        # Advance each identity sequence past the copied rows' explicit ids.
        for table in tables:
            if "id" not in table.c:
                continue
            dst.execute(text(
                f"SELECT setval("
                f"  pg_get_serial_sequence('{table.name}', 'id'),"
                f"  (SELECT COALESCE(MAX(id), 1) FROM \"{table.name}\"),"
                f"  true)"
            ))

        # Make the copied tables readable by Looker's role, if it exists here.
        dst.execute(text(
            "DO $$ BEGIN "
            "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'looker_ro') THEN "
            "EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO looker_ro'; "
            "END IF; END $$;"
        ))

    elapsed = time.time() - started
    print(f"Copied {sum(counts.values())} rows in {elapsed:.1f}s:")
    for name, n in counts.items():
        print(f"  {name}: {n}")
    print("\nNext: run `alembic upgrade head` against the target, then reconcile "
          "these counts against the SQLite source.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

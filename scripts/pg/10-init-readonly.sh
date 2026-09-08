#!/bin/bash
# Runs once, the first time the pg_data volume is created.
#  - pins the database timezone to UTC (the app stores naive-UTC timestamps and
#    writes a mix of naive and tz-aware datetimes; a UTC session keeps them aligned)
#  - creates a read-only `looker_ro` role for Looker Studio
# The app itself owns the schema (alembic + Base.metadata.create_all on boot);
# ALTER DEFAULT PRIVILEGES below makes every table it creates readable by looker_ro.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER DATABASE "$POSTGRES_DB" SET timezone TO 'UTC';

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'looker_ro') THEN
            CREATE ROLE looker_ro LOGIN PASSWORD '${LOOKER_RO_PASSWORD}';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO looker_ro;
    GRANT USAGE ON SCHEMA public TO looker_ro;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO looker_ro;

    -- Every table the app creates from now on is readable by looker_ro too.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT ON TABLES TO looker_ro;

    -- Never let the reporting role write.
    REVOKE CREATE ON SCHEMA public FROM looker_ro;
EOSQL

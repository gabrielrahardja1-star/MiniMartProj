#!/bin/bash
# Runs once, the first time the pg_data volume is created. Creates a read-only
# role for Looker Studio. Later schema/grants are handled by
# scripts/sync_to_postgres.py on every sync.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
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

    -- Anything the sync job creates from now on is readable by looker_ro too.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT ON TABLES TO looker_ro;

    -- Never let the reporting role write.
    REVOKE CREATE ON SCHEMA public FROM looker_ro;
EOSQL

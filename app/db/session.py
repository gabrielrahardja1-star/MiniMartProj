from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine = create_engine(
    settings.DATABASE_URL,
    # pre_ping recycles connections dropped by a Postgres restart / idle timeout
    pool_pre_ping=True,
    # check_same_thread only matters for the historical sqlite3-based scripts that
    # still import this module; the app and tests run on Postgres.
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

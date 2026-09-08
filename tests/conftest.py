"""
Shared fixtures for all tests.

Runs against a real PostgreSQL database (parity with production). Point it with
TEST_DATABASE_URL; the default expects the `postgres` compose service published
on localhost:5433 (`docker compose up -d postgres`).

The schema is built once per session. Each test runs inside a transaction that is
rolled back on teardown (app-level `commit()` calls become savepoints), so tests
stay isolated without recreating tables every time.
"""
import os

import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.worker import Worker
from app.models.product import Product

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://minimart:minimart@localhost:5433/minimart_test",
)


def _ensure_database_exists(url: str) -> None:
    target = make_url(url)
    admin_engine = create_engine(
        target.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :n"),
            {"n": target.database},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def db_engine():
    _ensure_database_exists(TEST_DATABASE_URL)
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    trans = connection.begin()
    Session = sessionmaker(
        bind=connection,
        autoflush=True,
        join_transaction_mode="create_savepoint",
    )
    session = Session()
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin(db_session):
    worker = Worker(
        employee_id="ADMIN001",
        name="Administrator",
        pin_hash=bcrypt.hashpw(b"0000", bcrypt.gensalt()).decode(),
        role="admin",
        is_active=True,
    )
    db_session.add(worker)
    db_session.commit()
    db_session.refresh(worker)
    return worker


@pytest.fixture
def worker(db_session):
    w = Worker(
        employee_id="W001",
        name="John Miner",
        pin_hash=bcrypt.hashpw(b"1234", bcrypt.gensalt()).decode(),
        role="worker",
        is_active=True,
    )
    db_session.add(w)
    db_session.commit()
    db_session.refresh(w)
    return w


@pytest.fixture
def admin_token(client, admin):
    resp = client.post("/api/auth/login", json={"employee_id": "ADMIN001", "pin": "0000"})
    return resp.json()["access_token"]


@pytest.fixture
def worker_token(client, worker):
    resp = client.post("/api/auth/login", json={"employee_id": "W001", "pin": "1234"})
    return resp.json()["access_token"]


@pytest.fixture
def products(db_session):
    items = [
        Product(name="Work Gloves", sku="WG-001", price=5.50, stock=10, unit="pair"),
        Product(name="Safety Helmet", sku="SH-001", price=22.00, stock=5, unit="unit"),
        Product(name="Energy Bar", sku="EB-001", price=1.20, stock=0, unit="unit"),
    ]
    for p in items:
        db_session.add(p)
    db_session.commit()
    for p in items:
        db_session.refresh(p)
    return items

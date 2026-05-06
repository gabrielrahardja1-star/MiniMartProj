"""
Shared fixtures for all tests.
Uses an in-memory SQLite database so tests never touch minimart.db.
"""
import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.worker import Worker
from app.models.product import Product

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    # StaticPool forces all connections to share the same in-memory database
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.close()


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

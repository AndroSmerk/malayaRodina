import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app
from limiter import limiter

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
limiter.enabled = False


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def user_data():
    return {"name": "Test User", "email": "test@example.com", "password": "password123"}


@pytest.fixture
def registered_user(client, user_data):
    client.post("/api/auth/register", json=user_data)
    return user_data


@pytest.fixture
def auth_headers(client, registered_user):
    res = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"],
    })
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_user_data():
    return {"name": "Second User", "email": "second@example.com", "password": "password456"}


@pytest.fixture
def second_user_headers(client, second_user_data):
    client.post("/api/auth/register", json=second_user_data)
    res = client.post("/api/auth/login", json=second_user_data)
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def create_place(client, auth_headers):
    def _create(data=None):
        if data is None:
            data = {
                "name": "Test Village",
                "type": "village",
                "lat": 55.0,
                "lng": 37.0,
                "visibility": "private",
            }
        return client.post("/api/places", json=data, headers=auth_headers)
    return _create


@pytest.fixture
def place_id(create_place):
    res = create_place()
    return res.json()["id"]
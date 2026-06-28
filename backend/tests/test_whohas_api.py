"""WhoHas backend API tests - covers /api/ask, /api/trending-questions, MongoDB persistence."""
import os
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://whohas-app.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


# ---- Root ----
def test_root(session):
    r = session.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    j = r.json()
    assert "message" in j
    assert "live_mode" in j
    assert j["live_mode"] is False  # demo mode


# ---- Trending ----
def test_trending_questions(session):
    r = session.get(f"{BASE_URL}/api/trending-questions")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    for grp in data:
        for k in ("category", "icon", "accent", "questions"):
            assert k in grp
        assert isinstance(grp["questions"], list)
        assert len(grp["questions"]) > 0


# ---- /api/ask ----
@pytest.mark.parametrize("question", [
    "Who has the best wings?",
    "Who has discounts on pizza?",
    "Who has the world record for fastest mile?",
    "Who has the best lemonade in town?",  # generic / no keyword
])
def test_ask_returns_demo_answer(session, question):
    r = session.post(f"{BASE_URL}/api/ask", json={"question": question})
    assert r.status_code == 200, r.text
    j = r.json()
    for k in ("id", "question", "summary", "items", "demo", "sources_count", "created_at"):
        assert k in j, f"missing {k}"
    assert j["demo"] is True  # no keys -> demo
    assert j["sources_count"] == 0
    assert j["question"] == question
    assert isinstance(j["items"], list) and len(j["items"]) >= 1
    first = j["items"][0]
    for k in ("rank", "name", "reason", "url"):
        assert k in first
    assert first["url"].startswith("http")


def test_ask_persists_to_mongo(session, mongo):
    q = "Who has the best ramen TEST?"
    r = session.post(f"{BASE_URL}/api/ask", json={"question": q})
    assert r.status_code == 200
    qid = r.json()["id"]
    doc = mongo.queries.find_one({"id": qid})
    assert doc is not None
    assert doc["question"] == q
    assert doc["demo"] is True
    # cleanup
    mongo.queries.delete_one({"id": qid})


def test_ask_validation_too_short(session):
    r = session.post(f"{BASE_URL}/api/ask", json={"question": "a"})
    assert r.status_code == 422


def test_ask_validation_missing(session):
    r = session.post(f"{BASE_URL}/api/ask", json={})
    assert r.status_code == 422


def test_ask_wings_keyword_mapping(session):
    r = session.post(f"{BASE_URL}/api/ask", json={"question": "who has the best wings"})
    assert r.status_code == 200
    names = [it["name"] for it in r.json()["items"]]
    # demo mapping should include Wingstop
    assert any("Wingstop" in n for n in names)

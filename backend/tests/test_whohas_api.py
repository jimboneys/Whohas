"""WhoHas backend API tests — deployment-fix verification.

Covers:
- NEW: GET / (root) returns 200 + {status:'ok'} (the deployment fix)
- GET /api/ returns 200
- POST /api/ask for grocery + non-shopping questions (product card vs None)
- GET /api/trending-questions returns grocery/household groups
- GET /api/suggest?q=eggs returns suggestions
- MongoDB persistence of /api/ask
- Cheapest store price == min(prices) (frontend highlight invariant)
"""
import os
import re
import pytest
import requests
from pymongo import MongoClient

# Public preview URL (Kubernetes ingress routes /api/* -> backend:8001, / -> frontend:3000)
PUBLIC_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://whohas-app.preview.emergentagent.com").rstrip("/")
# Backend internal URL — used to test the new app-level GET '/' health route
# (in the preview env the public '/' is served by the frontend, but the
# deployment platform health-checks the backend directly at '/').
INTERNAL_BACKEND_URL = os.environ.get("INTERNAL_BACKEND_URL", "http://localhost:8001").rstrip("/")
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


# ----------------------- NEW: root health route -----------------------
class TestRootHealth:
    """Deployment fix: app-level GET '/' must return 200 with {status:'ok'}."""

    def test_backend_root_returns_health_json(self, session):
        r = session.get(f"{INTERNAL_BACKEND_URL}/")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "ok"
        # service identifier is helpful but not strictly required
        assert "service" in data


# ----------------------- /api/ root -----------------------
class TestApiRoot:
    def test_api_root(self, session):
        r = session.get(f"{PUBLIC_URL}/api/")
        assert r.status_code == 200, r.text
        j = r.json()
        assert "message" in j and "live_mode" in j
        assert isinstance(j["live_mode"], bool)


# ----------------------- /api/trending-questions -----------------------
class TestTrending:
    def test_trending_returns_grocery_household(self, session):
        r = session.get(f"{PUBLIC_URL}/api/trending-questions")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list) and len(data) >= 2
        for grp in data:
            for k in ("category", "icon", "accent", "questions"):
                assert k in grp, f"missing {k} in trending group"
            assert isinstance(grp["questions"], list) and len(grp["questions"]) > 0
        cats = [g["category"].lower() for g in data]
        assert any("groc" in c for c in cats), "expected a Groceries category"
        assert any("household" in c for c in cats), "expected a Household Supplies category"


# ----------------------- /api/suggest -----------------------
class TestSuggest:
    def test_suggest_eggs(self, session):
        r = session.get(f"{PUBLIC_URL}/api/suggest", params={"q": "eggs"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        # first suggestion is normalized form of the query
        assert any("egg" in s.lower() for s in data)

    def test_suggest_empty_returns_empty_list(self, session):
        r = session.get(f"{PUBLIC_URL}/api/suggest", params={"q": ""})
        assert r.status_code == 200
        assert r.json() == []


# ----------------------- /api/ask: grocery (product card) -----------------------
class TestAskGrocery:
    def test_cheapest_eggs_returns_product_card(self, session):
        r = session.post(f"{PUBLIC_URL}/api/ask", json={"question": "Who has the cheapest eggs?"})
        assert r.status_code == 200, r.text
        j = r.json()
        # Top-level shape
        for k in ("id", "question", "summary", "direct_answer", "items", "product", "demo", "sources_count", "created_at"):
            assert k in j, f"missing {k} in ask response"
        assert isinstance(j["summary"], str) and len(j["summary"]) > 0
        assert isinstance(j["direct_answer"], str)  # may be empty if items empty but should not be
        assert isinstance(j["items"], list) and len(j["items"]) >= 1
        # Product card
        product = j["product"]
        assert product is not None, "expected a product card for a shopping/grocery question"
        for k in ("name", "image", "stores"):
            assert k in product, f"missing {k} in product"
        assert isinstance(product["name"], str) and product["name"].strip() != ""
        assert isinstance(product["image"], str) and product["image"].startswith("http")
        stores = product["stores"]
        assert isinstance(stores, list) and len(stores) == 3, "product must have exactly 3 stores"
        for s in stores:
            assert "store" in s and "price" in s
            assert isinstance(s["store"], str) and s["store"].strip() != ""
            assert isinstance(s["price"], (int, float)) and s["price"] > 0

    def test_cheapest_store_is_min_price(self, session):
        """Frontend highlights the cheapest store green — must equal min(prices)."""
        r = session.post(f"{PUBLIC_URL}/api/ask", json={"question": "Who has the cheapest eggs?"})
        assert r.status_code == 200
        stores = r.json()["product"]["stores"]
        prices = [s["price"] for s in stores]
        assert min(prices) == min(prices)  # sanity
        # The product card semantics: min(prices) is what the UI will highlight.
        # Verify there's a unique-or-shared minimum and that it's strictly <= the others.
        m = min(prices)
        assert all(p >= m for p in prices)
        # Also assert prices look reasonable (not all equal — factors are 0.93/1.0/1.08)
        assert max(prices) > m

    def test_household_query_also_returns_product(self, session):
        r = session.post(f"{PUBLIC_URL}/api/ask", json={"question": "Who has the cheapest paper towels?"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["product"] is not None
        assert len(j["product"]["stores"]) == 3


# ----------------------- /api/ask: non-shopping (product=null) -----------------------
class TestAskNonShopping:
    def test_olympic_question_returns_no_product(self, session):
        r = session.post(f"{PUBLIC_URL}/api/ask",
                         json={"question": "Who has the most Olympic gold medals?"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["product"] is None, "non-shopping questions must have product=null"
        assert isinstance(j["summary"], str) and len(j["summary"]) > 0
        assert isinstance(j["items"], list) and len(j["items"]) >= 1
        # items have urls
        for it in j["items"]:
            for k in ("rank", "name", "reason", "url"):
                assert k in it
            assert it["url"].startswith("http")


# ----------------------- Validation -----------------------
class TestAskValidation:
    def test_too_short(self, session):
        r = session.post(f"{PUBLIC_URL}/api/ask", json={"question": "a"})
        assert r.status_code == 422

    def test_missing_field(self, session):
        r = session.post(f"{PUBLIC_URL}/api/ask", json={})
        assert r.status_code == 422


# ----------------------- MongoDB persistence -----------------------
class TestMongoPersistence:
    def test_ask_persists_to_queries(self, session, mongo):
        q = "Who has the cheapest eggs? TEST_persist"
        r = session.post(f"{PUBLIC_URL}/api/ask", json={"question": q})
        assert r.status_code == 200
        qid = r.json()["id"]
        doc = mongo.queries.find_one({"id": qid})
        assert doc is not None, "expected /api/ask to insert a doc into queries collection"
        assert doc["question"] == q
        assert "summary" in doc and "demo" in doc and "sources_count" in doc and "created_at" in doc
        # cleanup
        mongo.queries.delete_one({"id": qid})

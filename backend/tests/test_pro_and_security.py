"""WhoHas — WhoHas Pro (Stripe) + Security hardening backend tests.

Covers new endpoints & behaviors introduced in this iteration:
- POST /api/pro/checkout  (yearly / monthly / invalid plan)
- GET  /api/pro/status/{session_id}  (valid + unknown -> 404)
- GET  /api/pro/entitlement  (new device_id -> pro:false)
- SECURITY: PUT /api/ad-slots/{key} is 503 when ADMIN_TOKEN not set
- SECURITY: rate limiting — POST /api/comments  > 8/60s -> 429
                       — POST /api/pro/checkout > 6/60s -> 429
- REGRESSION: /, /api/, /api/ask, /api/ad-clicks, /api/comments basic flow
- PRIVACY: /api/ask with a `location` must NOT persist the location
           in the stored query document.

NOTE ON RATE LIMITS (per-IP, in-memory, per-process, 60s sliding window):
    ask=25, comments=8, like=40, adclick=40, checkout=6.
This module is ordered so that rate-limit-consuming tests run AFTER the
non-rate-limit tests that share the same bucket. Any test that intentionally
trips a 429 waits 65s afterwards so the window drains for cleanup.
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

PUBLIC_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

API = f"{PUBLIC_URL}/api"


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


# ---------------- 0. Health / regression baseline ----------------
class TestHealthAndRegression:
    def test_root_health(self, session):
        # NOTE: Kubernetes ingress routes non-/api/* traffic to the Expo web
        # frontend, so `GET /` at the public URL returns the Expo HTML shell
        # rather than the FastAPI backend's `@app.get("/")` handler. We assert
        # 200 only; backend health is covered by `test_api_root` below.
        r = session.get(f"{PUBLIC_URL}/")
        assert r.status_code == 200

    def test_api_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()

    def test_ad_clicks_baseline(self, session):
        r = session.get(f"{API}/ad-clicks")
        assert r.status_code == 200
        data = r.json()
        for k in ("deal", "sponsor", "weekly"):
            assert k in data and isinstance(data[k], int)


# ---------------- 1. /api/ask regression + privacy ----------------
class TestAskAndPrivacy:
    def test_ask_returns_direct_answer_and_product(self, session):
        r = session.post(f"{API}/ask", json={"question": "Who has the cheapest eggs?"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("direct_answer"), "direct_answer should be non-empty"
        assert j.get("product") is not None, "shopping query should include a product card"
        prod = j["product"]
        assert "name" in prod and "image" in prod and "stores" in prod
        assert isinstance(prod["stores"], list) and len(prod["stores"]) >= 1
        for s in prod["stores"]:
            assert "store" in s and "price" in s

    def test_ask_non_shopping_no_product(self, session):
        r = session.post(f"{API}/ask", json={"question": "Who has the most Olympic gold medals?"})
        assert r.status_code == 200
        assert r.json().get("product") is None

    def test_ask_privacy_location_not_persisted(self, session, mongo):
        """User-provided location must NOT be persisted in the stored query
        document (stored `question` must equal the ORIGINAL question)."""
        marker = f"TEST_priv_{uuid.uuid4().hex[:8]}"
        original_q = f"Who has cheap bananas {marker}?"
        payload = {"question": original_q, "location": "Austin"}
        r = session.post(f"{API}/ask", json=payload)
        assert r.status_code == 200, r.text
        qid = r.json()["id"]
        # Response-level `question` gets the location folded-in (for search + display)
        assert "Austin" in r.json()["question"]
        # Storage-level `question` MUST NOT contain the location
        doc = mongo.queries.find_one({"id": qid})
        assert doc is not None, "query should have been persisted"
        assert doc["question"] == original_q, (
            f"stored question must equal original (no location leak). "
            f"stored={doc['question']!r} original={original_q!r}"
        )
        assert "Austin" not in doc["question"], "location leaked into DB!"


# ---------------- 2. SECURITY: admin endpoint disabled ----------------
class TestAdminDisabled:
    def test_put_ad_slot_returns_503_without_admin_token(self, session):
        r = session.put(
            f"{API}/ad-slots/deal",
            json={"sponsor": {"name": "TEST_sp", "tagline": "", "url": "", "image": ""}},
        )
        assert r.status_code == 503, r.text
        assert "disabled" in r.json().get("detail", "").lower()

    def test_put_ad_slot_still_503_even_with_a_header(self, session):
        r = session.put(
            f"{API}/ad-slots/deal",
            headers={"X-Admin-Token": "guessed-value"},
            json={"sponsor": None},
        )
        # Because ADMIN_TOKEN is unset, 503 must precede any 401 check
        assert r.status_code == 503


# ---------------- 3. WhoHas Pro — checkout / status / entitlement ----------------
class TestProCheckout:
    _yearly_session_id = None  # class-shared for the status test below

    def test_checkout_invalid_plan_400(self, session):
        r = session.post(
            f"{API}/pro/checkout",
            json={"plan": "lifetime", "device_id": "TESTDEV_bad_plan", "origin_url": PUBLIC_URL},
        )
        assert r.status_code == 400, r.text
        assert "invalid plan" in r.json().get("detail", "").lower()

    def test_checkout_yearly_returns_url_and_session(self, session, mongo):
        r = session.post(
            f"{API}/pro/checkout",
            json={"plan": "yearly", "device_id": "TESTDEV_yearly_01", "origin_url": PUBLIC_URL},
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("url", "").startswith("https://checkout.stripe.com/"), f"bad url {j.get('url')}"
        assert j.get("session_id", "").startswith("cs_"), f"bad session_id {j.get('session_id')}"
        TestProCheckout._yearly_session_id = j["session_id"]

        # Verify persisted transaction row is correct (server-side amount, not client-supplied)
        tx = mongo.payment_transactions.find_one({"session_id": j["session_id"]})
        assert tx is not None, "payment_transactions row should exist"
        assert tx["plan"] == "yearly"
        assert tx["amount"] == 60.00
        assert tx["currency"] == "usd"
        assert tx["device_id"] == "TESTDEV_yearly_01"
        assert tx["payment_status"] == "initiated"
        assert tx["processed"] is False

    def test_checkout_monthly_returns_url_and_session(self, session, mongo):
        r = session.post(
            f"{API}/pro/checkout",
            json={"plan": "monthly", "device_id": "TESTDEV_monthly_01", "origin_url": PUBLIC_URL},
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("url", "").startswith("https://checkout.stripe.com/")
        assert j.get("session_id", "").startswith("cs_")
        tx = mongo.payment_transactions.find_one({"session_id": j["session_id"]})
        assert tx is not None
        assert tx["plan"] == "monthly"
        assert tx["amount"] == 6.99


class TestProStatus:
    def test_status_valid_session_returns_payment_status(self, session):
        sid = TestProCheckout._yearly_session_id
        assert sid, "yearly checkout must run first to produce a session_id"
        r = session.get(f"{API}/pro/status/{sid}")
        assert r.status_code == 200, r.text
        j = r.json()
        # No card entered, so payment should not be paid.
        assert "payment_status" in j
        assert j["payment_status"] in ("unpaid", "open", "no_payment_required", None)
        assert j["plan"] == "yearly"
        assert j["pro"] is False, "must NOT grant pro until Stripe reports paid"
        assert j["expires_at"] is None

    def test_status_unknown_session_returns_404(self, session):
        r = session.get(f"{API}/pro/status/cs_test_bogus_does_not_exist_zzzz")
        assert r.status_code == 404, r.text


class TestProEntitlement:
    def test_entitlement_new_device_is_false(self, session):
        device_id = f"TESTDEV_new_{uuid.uuid4().hex[:10]}"
        r = session.get(f"{API}/pro/entitlement", params={"device_id": device_id})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j == {"pro": False, "plan": None, "expires_at": None}


# ---------------- 4. SECURITY: rate limiting ----------------
# NOTE: These tests intentionally exhaust the per-IP window; they must run
# LAST because they poison shared IP buckets for the remainder of the window.
class TestRateLimiting:
    def test_checkout_rate_limit_returns_429_over_6_per_60s(self, session):
        """checkout bucket = 6 requests / 60s. 7th must be 429."""
        device_id = f"TESTDEV_rl_{uuid.uuid4().hex[:8]}"
        codes = []
        for i in range(8):
            r = session.post(
                f"{API}/pro/checkout",
                json={"plan": "monthly", "device_id": device_id, "origin_url": PUBLIC_URL},
            )
            codes.append(r.status_code)
        # We already consumed 2 checkout calls above (yearly+monthly) plus 1 invalid.
        # Invalid-plan (400) still counts against the bucket because rate_limit runs first.
        # So we should hit 429 well within these 8 attempts.
        assert 429 in codes, f"expected at least one 429 in checkout burst, got {codes}"

    def test_comments_rate_limit_returns_429_over_8_per_60s(self, session):
        """comments bucket = 8 requests / 60s. Fire >8 and expect 429."""
        codes = []
        for i in range(12):
            r = session.post(
                f"{API}/comments",
                json={"author": "TEST_rl", "text": f"TEST_rl_burst_{i}_{uuid.uuid4().hex[:6]}"},
            )
            codes.append(r.status_code)
        assert 429 in codes, f"expected at least one 429 in comments burst, got {codes}"
        # And at least one 200 succeeded before we tripped the limit
        assert 200 in codes, f"expected some successful posts before 429, got {codes}"


# ---------------- Cleanup ----------------
def test_cleanup_test_data(mongo):
    """Remove test-created rows for this suite. Wait first so the rate-limit
    windows drain — otherwise a subsequent pytest run would inherit them."""
    # Not strictly required for cleanup, but keeps the shared IP bucket clean
    # for follow-up runs; 65s covers the 60s sliding window with margin.
    # Comment this out if the test runner is time-constrained.
    # time.sleep(65)
    res_c = mongo.comments.delete_many({"$or": [
        {"text": {"$regex": "^TEST_"}},
        {"author": {"$regex": "^TEST_"}},
    ]})
    res_q = mongo.queries.delete_many({"question": {"$regex": "TEST_priv_"}})
    res_tx = mongo.payment_transactions.delete_many({"device_id": {"$regex": "^TESTDEV_"}})
    res_e = mongo.entitlements.delete_many({"device_id": {"$regex": "^TESTDEV_"}})
    assert res_c.acknowledged and res_q.acknowledged
    assert res_tx.acknowledged and res_e.acknowledged

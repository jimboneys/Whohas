"""WhoHas — Sponsors DB migration + Local ads + Advertiser lead + Affiliate + Local-offer checkout tests.

Covers newly-added endpoints and DB-migration expectations from iteration 8 request:
- GET /api/sponsors?placement=adslot  (must include Ton's Hauling featured + ALDI/Costco/Kroger)
- GET /api/sponsors?placement=strip   (ALDI/Costco/Kroger with accent+tint)
- POST /api/advertisers               (validation, rate-limit 5/60s)
- GET /api/local-ads?city=Omaha       (has_ads=true w/ tons-hauling); unknown city -> empty
- GET /api/affiliate?q=eggs           (amazon_search_url contains tag=Jimboneys-20)
- POST /api/basket                    (regression — totals sorted asc)
- POST /api/local-offer/checkout      (ok for tons-hauling, 400 for unknown ad_id)
- GET /api/local-offer/status/{sid}   (returns payment_status)
- Regression: POST /api/ask, POST /api/pro/checkout
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


# ------------------- Sponsors (DB-backed) -------------------
class TestSponsorsAdslot:
    def test_adslot_sponsors_seeded_and_include_tons_hauling(self, session):
        r = session.get(f"{API}/sponsors", params={"placement": "adslot"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list) and len(data) >= 4, f"expected >=4 adslot sponsors, got {data}"
        # Every entry must have core fields
        for d in data:
            for k in ("placement", "key", "name", "tagline", "url", "image", "active"):
                assert k in d, f"sponsor missing field {k}: {d}"
            assert d["placement"] == "adslot"
        names = [d["name"] for d in data]
        for expected in ("ALDI", "Costco", "Kroger", "Ton's Hauling"):
            assert expected in names, f"{expected} missing from adslot sponsors ({names})"

    def test_tons_hauling_is_featured_and_has_phone(self, session):
        data = session.get(f"{API}/sponsors", params={"placement": "adslot"}).json()
        ton = next((d for d in data if d["name"] == "Ton's Hauling"), None)
        assert ton is not None
        assert ton.get("key") == "local"
        assert ton.get("featured") is True, f"Ton's Hauling should be featured=true, got {ton}"
        assert ton.get("phone") == "402-810-6319"

    def test_adslot_sorted_by_order(self, session):
        data = session.get(f"{API}/sponsors", params={"placement": "adslot"}).json()
        orders = [d.get("order", 0) for d in data]
        assert orders == sorted(orders), f"adslot sponsors not sorted by order asc: {orders}"

    def test_no_mongo_objectid_in_response(self, session):
        data = session.get(f"{API}/sponsors", params={"placement": "adslot"}).json()
        for d in data:
            assert "_id" not in d, "MongoDB _id must be excluded from sponsor response"


class TestSponsorsStrip:
    def test_strip_sponsors_include_aldi_costco_kroger_with_accent_tint(self, session):
        r = session.get(f"{API}/sponsors", params={"placement": "strip"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 3
        names = [d["name"] for d in data]
        for expected in ("ALDI", "Costco", "Kroger"):
            assert expected in names, f"{expected} missing from strip sponsors ({names})"
        # accent + tint present on strip entries
        for d in data:
            assert d.get("accent"), f"strip entry missing accent: {d}"
            assert d.get("tint"), f"strip entry missing tint: {d}"
            assert d["placement"] == "strip"


class TestSponsorsSeededIdempotent:
    def test_seed_is_idempotent_no_duplicates(self, mongo):
        """Two records with same (placement, key) should never exist."""
        docs = list(mongo.sponsors.find({}, {"_id": 0, "placement": 1, "key": 1}))
        seen = set()
        for d in docs:
            k = (d["placement"], d["key"])
            assert k not in seen, f"duplicate sponsor for {k}"
            seen.add(k)


# ------------------- Local ads -------------------
class TestLocalAds:
    def test_omaha_returns_tons_hauling(self, session):
        r = session.get(f"{API}/local-ads", params={"city": "Omaha"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["has_ads"] is True
        assert data["city"] == "Omaha"
        assert any(a["id"] == "tons-hauling" for a in data["ads"])
        ton = next(a for a in data["ads"] if a["id"] == "tons-hauling")
        assert ton["phone"] == "402-810-6319"
        assert ton["offer"]["price"] == 49.00
        assert "advertise_email" in data

    def test_omaha_case_insensitive_and_state_suffix(self, session):
        # Normalizer strips ", NE" and lowercases -> should still match
        r = session.get(f"{API}/local-ads", params={"city": "omaha, NE"})
        assert r.status_code == 200
        assert r.json()["has_ads"] is True

    def test_unknown_city_has_no_ads(self, session):
        r = session.get(f"{API}/local-ads", params={"city": "Timbuktu"})
        assert r.status_code == 200
        data = r.json()
        assert data["has_ads"] is False
        assert data["ads"] == []

    def test_empty_city_has_no_ads(self, session):
        r = session.get(f"{API}/local-ads")
        assert r.status_code == 200
        assert r.json()["has_ads"] is False


# ------------------- Advertiser leads -------------------
class TestAdvertisers:
    def test_create_advertiser_lead_persists(self, session, mongo):
        payload = {
            "business": "TEST_Bakery Co",
            "contact": "TEST_555-1234 owner@example.com",
            "city": "Omaha",
            "message": "TEST_want to advertise",
        }
        r = session.post(f"{API}/advertisers", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["ok"] is True
        assert "id" in j and len(j["id"]) > 0
        # Verify persistence in Mongo
        doc = mongo.advertisers.find_one({"id": j["id"]})
        assert doc is not None
        assert doc["business"] == "TEST_Bakery Co"
        assert doc["contact"].startswith("TEST_")

    def test_empty_business_rejected(self, session):
        r = session.post(f"{API}/advertisers", json={"business": "", "contact": "555-1234"})
        assert r.status_code == 422, r.text

    def test_short_contact_rejected(self, session):
        r = session.post(f"{API}/advertisers", json={"business": "TEST_biz", "contact": "ab"})
        assert r.status_code == 422, r.text

    def test_rate_limit_5_per_60s(self, session):
        """The 6th request within 60s should return 429.
        Note: previous tests in this class already consumed some slots on same IP,
        so we send from a fresh header to try to isolate — but rate-limiter uses
        x-forwarded-for/client host, so we accept EITHER 200 or 429 for the first
        few and REQUIRE a 429 to appear within 10 attempts.
        """
        saw_429 = False
        for i in range(10):
            r = session.post(f"{API}/advertisers", json={
                "business": f"TEST_rl_{i}",
                "contact": "TEST_555-9999 rate@example.com",
            })
            if r.status_code == 429:
                saw_429 = True
                break
        assert saw_429, "Expected a 429 within 10 rapid requests (rate_limit 5/60s)"


# ------------------- Affiliate (Amazon) -------------------
class TestAffiliate:
    def test_affiliate_search_contains_amazon_tag(self, session):
        r = session.get(f"{API}/affiliate", params={"q": "eggs"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["amazon_tag"] == "Jimboneys-20"
        assert "tag=Jimboneys-20" in j["amazon_search_url"]
        assert "k=eggs" in j["amazon_search_url"]

    def test_affiliate_empty_q_falls_back_to_home(self, session):
        r = session.get(f"{API}/affiliate")
        assert r.status_code == 200
        j = r.json()
        assert "amazon.com" in j["amazon_url"]
        assert "tag=Jimboneys-20" in j["amazon_url"]


# ------------------- Basket regression -------------------
class TestBasketRegression:
    def test_basket_returns_sorted_totals_and_cheapest(self, session):
        r = session.post(f"{API}/basket", json={"items": ["eggs", "milk", "bread"]})
        assert r.status_code == 200, r.text
        j = r.json()
        totals = j["totals"]
        assert len(totals) == 4
        tt = [t["total"] for t in totals]
        assert tt == sorted(tt), f"totals not ascending: {tt}"
        assert j["cheapest"]["store"] == totals[0]["store"]
        assert j["cheapest"]["total"] == totals[0]["total"]
        assert j["best_mix_total"] <= j["cheapest"]["total"] + 0.01


# ------------------- Local offer checkout (Stripe) -------------------
class TestLocalOfferCheckout:
    def test_checkout_tons_hauling_returns_url_and_session(self, session):
        payload = {
            "ad_id": "tons-hauling",
            "device_id": f"TEST_dev_{uuid.uuid4()}",
            "origin_url": PUBLIC_URL,
        }
        r = session.post(f"{API}/local-offer/checkout", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "url" in j and j["url"].startswith("http")
        assert "session_id" in j and len(j["session_id"]) > 0
        # Follow-up status call must work with returned session_id
        sid = j["session_id"]
        s = session.get(f"{API}/local-offer/status/{sid}")
        assert s.status_code == 200, s.text
        sj = s.json()
        assert "payment_status" in sj
        assert sj["ad_id"] == "tons-hauling"

    def test_checkout_unknown_ad_id_returns_400(self, session):
        payload = {
            "ad_id": "does-not-exist",
            "device_id": f"TEST_dev_{uuid.uuid4()}",
            "origin_url": PUBLIC_URL,
        }
        r = session.post(f"{API}/local-offer/checkout", json=payload)
        assert r.status_code == 400, r.text

    def test_status_unknown_session_returns_404(self, session):
        r = session.get(f"{API}/local-offer/status/does-not-exist-sid")
        assert r.status_code == 404


# ------------------- Regression: /api/ask + /api/pro/checkout -------------------
class TestAskRegression:
    def test_ask_still_returns_answer(self, session):
        r = session.post(f"{API}/ask", json={"question": "Who has cheap eggs?"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "id" in j and "items" in j and "summary" in j
        assert isinstance(j["items"], list) and len(j["items"]) >= 1


class TestProCheckoutRegression:
    def test_pro_checkout_creates_session(self, session):
        payload = {
            "plan": "monthly",
            "device_id": f"TEST_dev_{uuid.uuid4()}",
            "origin_url": PUBLIC_URL,
        }
        r = session.post(f"{API}/pro/checkout", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["url"].startswith("http")
        assert j["session_id"]

    def test_pro_checkout_invalid_plan_rejected(self, session):
        payload = {
            "plan": "lifetime",  # not in PRO_PLANS
            "device_id": f"TEST_dev_{uuid.uuid4()}",
            "origin_url": PUBLIC_URL,
        }
        r = session.post(f"{API}/pro/checkout", json=payload)
        assert r.status_code == 400


# ------------------- Cleanup -------------------
def test_cleanup(mongo):
    r1 = mongo.advertisers.delete_many({"$or": [
        {"business": {"$regex": "^TEST_"}},
        {"contact": {"$regex": "^TEST_"}},
    ]})
    r2 = mongo.payment_transactions.delete_many({"device_id": {"$regex": "^TEST_"}})
    assert r1.acknowledged and r2.acknowledged

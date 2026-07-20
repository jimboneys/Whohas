"""Backend tests for the new /api/basket 'My List' endpoint.

Verifies:
- Basic shape (items, totals, cheapest, best_mix_total) for a real grocery list
- totals sorted ascending; cheapest.store == totals[0].store & total match
- cheapest.savings == priciest.total - cheapest.total
- best_mix_total <= cheapest.total (mixing stores is at worst equal)
- Empty items array returns the expected empty structure (no 4xx)
- Whitespace-only items are stripped
- Rate limiting does not break normal use (40/60s)
"""
import os
import pytest
import requests

PUBLIC_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://whohas-app.preview.emergentagent.com",
).rstrip("/")

BASKET = f"{PUBLIC_URL}/api/basket"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestBasketBasics:
    def test_grocery_basket_full_shape(self, session):
        payload = {"items": ["Eggs", "Milk", "Toilet paper", "Bananas"]}
        r = session.post(BASKET, json=payload)
        assert r.status_code == 200, r.text
        j = r.json()

        # Top-level shape
        for k in ("items", "totals", "cheapest", "best_mix_total"):
            assert k in j, f"missing {k}"

        # items[] shape
        assert isinstance(j["items"], list) and len(j["items"]) == 4
        seen_names = set()
        for it in j["items"]:
            for k in ("name", "image", "prices", "best_store", "best_price"):
                assert k in it, f"missing {k} in item"
            assert isinstance(it["prices"], dict) and len(it["prices"]) >= 3
            assert it["best_price"] == min(it["prices"].values())
            assert it["best_store"] == min(it["prices"], key=it["prices"].get)
            assert it["image"].startswith("http")
            seen_names.add(it["name"].lower())

        # totals[] sorted ascending across the fixed 4 stores
        totals = j["totals"]
        assert isinstance(totals, list) and len(totals) == 4
        stores = [t["store"] for t in totals]
        # Backend defines BASKET_STORES = ["Walmart","Target","Kroger","Amazon"]
        assert set(stores) == {"Walmart", "Target", "Kroger", "Amazon"}
        totals_vals = [t["total"] for t in totals]
        assert totals_vals == sorted(totals_vals), "totals must be sorted cheapest-first"

        # cheapest matches totals[0]
        cheapest = j["cheapest"]
        assert cheapest is not None
        assert cheapest["store"] == totals[0]["store"]
        assert cheapest["total"] == totals[0]["total"]

        # savings == priciest - cheapest
        expected_savings = round(totals[-1]["total"] - totals[0]["total"], 2)
        assert abs(cheapest["savings"] - expected_savings) < 0.011, (
            f"savings mismatch: got {cheapest['savings']} expected {expected_savings}"
        )

        # best_mix_total is sum of per-item best_prices AND <= cheapest.total
        expected_mix = round(sum(i["best_price"] for i in j["items"]), 2)
        assert abs(j["best_mix_total"] - expected_mix) < 0.011
        assert j["best_mix_total"] <= cheapest["total"] + 1e-6

    def test_empty_items_returns_empty_structure(self, session):
        r = session.post(BASKET, json={"items": []})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["items"] == []
        assert j["totals"] == []
        assert j["cheapest"] is None
        assert j["best_mix_total"] == 0.0 or j["best_mix_total"] == 0

    def test_whitespace_items_are_ignored(self, session):
        r = session.post(BASKET, json={"items": ["", "   ", "Eggs"]})
        assert r.status_code == 200, r.text
        j = r.json()
        # only "Eggs" survives
        assert len(j["items"]) == 1
        assert j["items"][0]["name"].lower().startswith("egg")

    def test_all_whitespace_returns_empty(self, session):
        r = session.post(BASKET, json={"items": ["", "   ", "\t"]})
        assert r.status_code == 200
        j = r.json()
        assert j["items"] == []
        assert j["cheapest"] is None

    def test_pricing_is_deterministic(self, session):
        """Same inputs -> same output (deterministic hash-based pricing)."""
        payload = {"items": ["Eggs", "Milk"]}
        r1 = session.post(BASKET, json=payload).json()
        r2 = session.post(BASKET, json=payload).json()
        assert r1["totals"] == r2["totals"]
        assert r1["cheapest"] == r2["cheapest"]
        assert r1["best_mix_total"] == r2["best_mix_total"]

    def test_unknown_item_still_priced(self, session):
        """Items not in the KB should still be priced (fallback base)."""
        r = session.post(BASKET, json={"items": ["Zorblax"]})
        assert r.status_code == 200
        j = r.json()
        assert len(j["items"]) == 1
        it = j["items"][0]
        assert it["best_price"] > 0
        assert len(it["prices"]) == 4  # all 4 stores


class TestBasketRateLimit:
    """Rate limit is 40/60s for basket. Normal use should not trip it."""

    def test_10_normal_calls_all_succeed(self, session):
        # Use small list so requests are fast
        codes = []
        for _ in range(10):
            r = session.post(BASKET, json={"items": ["Eggs", "Milk"]})
            codes.append(r.status_code)
        assert all(c == 200 for c in codes), f"rate-limited too aggressively: {codes}"

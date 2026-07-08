"""WhoHas — Community comments + Ad clicks backend tests.

Covers new endpoints:
- POST /api/comments (top-level + replies + validation + parent 404)
- GET /api/comments (newest-first threads, oldest-first replies, nesting)
- POST /api/comments/{id}/like (increments + 404)
- GET /api/ad-clicks (seeded counts)
- POST /api/ad-clicks/{key} (increments and returns new count)
"""
import os
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


# ------------------- Comments: create/list -------------------
class TestCommentCreateAndList:
    def test_create_top_level_comment(self, session):
        payload = {"author": "TEST_alice", "text": "TEST_top-level: Aldi eggs $2.25 this week"}
        r = session.post(f"{API}/comments", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("id", "author", "text", "parent_id", "likes", "created_at", "replies"):
            assert k in j, f"missing {k}"
        assert j["author"] == "TEST_alice"
        assert j["text"] == payload["text"]
        assert j["parent_id"] in (None, "")
        assert j["likes"] == 0
        assert j["replies"] == []
        # Verify persistence via GET
        r2 = session.get(f"{API}/comments")
        assert r2.status_code == 200
        ids = [c["id"] for c in r2.json()]
        assert j["id"] in ids

    def test_create_reply_and_nesting(self, session):
        # Create parent
        p = session.post(f"{API}/comments", json={"author": "TEST_bob", "text": "TEST_parent Costco milk?"})
        assert p.status_code == 200
        parent_id = p.json()["id"]
        # Create two replies (oldest-first ordering expected)
        r1 = session.post(f"{API}/comments", json={"author": "TEST_cara", "text": "TEST_reply1", "parent_id": parent_id})
        r2 = session.post(f"{API}/comments", json={"author": "TEST_dan", "text": "TEST_reply2", "parent_id": parent_id})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["parent_id"] == parent_id

        # GET should return threads newest-first with nested replies oldest-first
        listing = session.get(f"{API}/comments").json()
        thread = next((t for t in listing if t["id"] == parent_id), None)
        assert thread is not None, "parent thread must appear as a root"
        reply_ids = [rr["id"] for rr in thread["replies"]]
        assert r1.json()["id"] in reply_ids and r2.json()["id"] in reply_ids
        # Oldest reply first
        assert reply_ids.index(r1.json()["id"]) < reply_ids.index(r2.json()["id"])
        # Replies must NOT also appear as top-level roots
        top_ids = [t["id"] for t in listing]
        assert r1.json()["id"] not in top_ids
        assert r2.json()["id"] not in top_ids

    def test_threads_newest_first(self, session):
        a = session.post(f"{API}/comments", json={"author": "TEST_x", "text": "TEST_older_thread"}).json()
        b = session.post(f"{API}/comments", json={"author": "TEST_y", "text": "TEST_newer_thread"}).json()
        listing = session.get(f"{API}/comments").json()
        # Find their positions among roots
        roots = [t["id"] for t in listing]
        assert roots.index(b["id"]) < roots.index(a["id"]), "newer thread must come before older"

    def test_reply_to_unknown_parent_returns_404(self, session):
        r = session.post(f"{API}/comments", json={"author": "TEST_ghost", "text": "TEST_orphan", "parent_id": "does-not-exist-uuid"})
        assert r.status_code == 404

    def test_default_author_anonymous(self, session):
        r = session.post(f"{API}/comments", json={"text": "TEST_anon_default"})
        assert r.status_code == 200, r.text
        assert r.json()["author"] == "Anonymous"

    def test_blank_author_becomes_anonymous(self, session):
        r = session.post(f"{API}/comments", json={"author": "   ", "text": "TEST_blank_author"})
        assert r.status_code == 200
        assert r.json()["author"] == "Anonymous"


# ------------------- Comments: validation -------------------
class TestCommentValidation:
    def test_empty_text_rejected(self, session):
        r = session.post(f"{API}/comments", json={"author": "TEST_e", "text": ""})
        assert r.status_code in (400, 422), r.text

    def test_whitespace_only_rejected(self, session):
        # Passes Pydantic min_length=1 but server strips → should raise 400
        r = session.post(f"{API}/comments", json={"author": "TEST_w", "text": "     "})
        assert r.status_code in (400, 422), r.text

    def test_missing_text_rejected(self, session):
        r = session.post(f"{API}/comments", json={"author": "TEST_m"})
        assert r.status_code == 422

    def test_text_over_max_length_rejected(self, session):
        r = session.post(f"{API}/comments", json={"author": "TEST_l", "text": "a" * 601})
        assert r.status_code == 422


# ------------------- Comments: like -------------------
class TestCommentLike:
    def test_like_increments_and_persists(self, session):
        c = session.post(f"{API}/comments", json={"author": "TEST_liker", "text": "TEST_like_me"}).json()
        cid = c["id"]
        r1 = session.post(f"{API}/comments/{cid}/like")
        assert r1.status_code == 200, r1.text
        assert r1.json()["likes"] == 1
        r2 = session.post(f"{API}/comments/{cid}/like")
        assert r2.json()["likes"] == 2
        # Confirm via GET
        listing = session.get(f"{API}/comments").json()
        node = next((n for n in listing if n["id"] == cid), None)
        assert node is not None and node["likes"] == 2

    def test_like_unknown_id_returns_404(self, session):
        r = session.post(f"{API}/comments/does-not-exist-xyz/like")
        assert r.status_code == 404


# ------------------- Ad clicks -------------------
class TestAdClicks:
    def test_get_ad_clicks_contains_seeded_keys(self, session):
        r = session.get(f"{API}/ad-clicks")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        # Seeded keys — must be present after startup seeding.
        for key in ("deal", "sponsor", "weekly"):
            assert key in data, f"expected seeded key {key} in ad-clicks"
            assert isinstance(data[key], int) and data[key] >= 0

    def test_post_ad_click_increments_count(self, session):
        before = session.get(f"{API}/ad-clicks").json().get("deal", 0)
        r = session.post(f"{API}/ad-clicks/deal")
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["key"] == "deal"
        assert isinstance(j["clicks"], int)
        assert j["clicks"] == before + 1
        # Persists in GET
        after = session.get(f"{API}/ad-clicks").json().get("deal", 0)
        assert after == before + 1

    def test_post_ad_click_unknown_key_upserts(self, session):
        # The endpoint upserts unknown keys (documented behavior via find_one_and_update+upsert=True)
        r = session.post(f"{API}/ad-clicks/TEST_new_key")
        assert r.status_code == 200
        assert r.json()["clicks"] >= 1


# ------------------- Cleanup -------------------
def test_cleanup_test_data(mongo):
    """Remove test-created rows to keep DB tidy."""
    res_c = mongo.comments.delete_many({"$or": [
        {"text": {"$regex": "^TEST_"}},
        {"author": {"$regex": "^TEST_"}},
    ]})
    res_a = mongo.ad_clicks.delete_many({"key": {"$regex": "^TEST_"}})
    # Not strict — just ensures no exception
    assert res_c.acknowledged
    assert res_a.acknowledged

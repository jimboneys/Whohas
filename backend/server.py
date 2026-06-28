from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import requests
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SERPAPI_API_KEY = os.environ.get("SERPAPI_API_KEY", "").strip()
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6-20260218").strip()

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("whohas")

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------- Models ----------------
class AskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=300)


class AnswerItem(BaseModel):
    rank: int
    name: str
    reason: str
    url: str
    source_title: Optional[str] = None


class AskResponse(BaseModel):
    id: str
    question: str
    summary: str
    items: List[AnswerItem]
    demo: bool
    sources_count: int
    created_at: str


# ---------------- Web search (SerpApi) ----------------
def web_search(query: str, num: int = 8) -> List[Dict[str, Any]]:
    if not SERPAPI_API_KEY:
        return []
    try:
        resp = requests.get(
            "https://serpapi.com/search.json",
            params={"engine": "google", "q": query, "num": num, "api_key": SERPAPI_API_KEY},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"SerpApi search failed: {e}")
        return []
    results = []
    for item in data.get("organic_results", [])[:num]:
        url = item.get("link")
        if not url:
            continue
        results.append({
            "title": item.get("title", ""),
            "url": url,
            "snippet": item.get("snippet", ""),
        })
    return results


# ---------------- Claude synthesis ----------------
SYSTEM_PROMPT = (
    "You are WhoHas, a friendly answer engine that resolves natural questions like "
    "'who has the best wings' or 'who has discounts on pizza'. You receive the user's "
    "question and a list of web search results (title, url, snippet). Produce a concise, "
    "ranked answer using ONLY those results. Respond with STRICT JSON, no commentary:\n"
    '{"summary": "<one or two sentence overview>", "items": [{"rank": 1, "name": "<short name>", '
    '"reason": "<one sentence grounded in a snippet>", "url": "<source url from results>", '
    '"source_title": "<page title>"}]}\n'
    "Include at most 5 items, sorted best-first. Every url MUST come from the provided results."
)


def claude_synthesize(question: str, results: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not (EMERGENT_LLM_KEY or ANTHROPIC_API_KEY):
        return None
    if results:
        lines = [f"User question: {question}", "", "Search results:"]
        for i, r in enumerate(results, 1):
            lines.append(f"[{i}] {r['title']}\n    URL: {r['url']}\n    {r['snippet']}")
        lines.append("\nUse ONLY these results and cite their urls.")
    else:
        lines = [f"User question: {question}", "",
                 "No web results are available. Answer from your own knowledge.",
                 "Leave each url as an empty string \"\"."]
    user_prompt = "\n".join(lines)

    headers = {"content-type": "application/json", "anthropic-version": "2023-06-01"}
    base_url = "https://api.anthropic.com/v1/messages"

    # Prefer Emergent universal key via proxy when present, else direct Anthropic key.
    if EMERGENT_LLM_KEY:
        proxy = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com").rstrip("/")
        base_url = f"{proxy}/llm/anthropic/v1/messages"
        headers["authorization"] = f"Bearer {EMERGENT_LLM_KEY}"
        headers["x-api-key"] = EMERGENT_LLM_KEY
    elif ANTHROPIC_API_KEY:
        headers["x-api-key"] = ANTHROPIC_API_KEY
    else:
        return None

    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 900,
        "temperature": 0.2,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    try:
        resp = requests.post(base_url, headers=headers, json=payload, timeout=40)
        resp.raise_for_status()
        data = resp.json()
        text = "".join(b.get("text", "") for b in data.get("content", []))
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(json)?|```$", "", text).strip()
        return json.loads(text)
    except Exception as e:
        logger.warning(f"Claude synthesis failed: {e}")
        return None


# ---------------- Demo fallback ----------------
DEMO_MAP = {
    ("wing", "wings"): ["Wingstop", "Buffalo Wild Wings", "A local sports bar & grill", "Hooters"],
    ("pizza", "pizzas"): ["Domino's", "A local pizzeria", "Pizza Hut", "Papa John's"],
    ("burger", "burgers"): ["Five Guys", "In-N-Out Burger", "Shake Shack", "A local diner"],
    ("coffee", "espresso", "latte"): ["A local specialty roaster", "Starbucks", "Dunkin'", "Peet's Coffee"],
    ("taco", "tacos"): ["A local taqueria", "Torchy's Tacos", "Taco Bell", "Chipotle"],
    ("sushi",): ["A highly-rated local sushi bar", "A neighborhood omakase spot"],
    ("gas", "fuel"): ["Costco Gas", "GasBuddy listings", "A local Sam's Club"],
    ("record", "world record"): ["Guinness World Records", "The official sport's federation", "Wikipedia"],
    ("discount", "discounts", "deal", "deals", "sale", "coupon"): [
        "The retailer's official deals page", "RetailMeNot", "Slickdeals", "Honey browser extension"],
    ("phone", "iphone", "android"): ["Amazon", "Best Buy", "The carrier's online store", "Walmart"],
    ("flight", "flights"): ["Google Flights", "Skyscanner", "Kayak"],
    ("hotel", "hotels"): ["Booking.com", "Hotels.com", "Expedia"],
    ("ramen",): ["A top-rated local ramen-ya", "A nearby noodle bar"],
}


def strip_lead(q: str) -> str:
    s = q.strip().rstrip("?").strip()
    for pat in [r"^who('s| has| has got| got| sells| serves| makes)\b",
                r"^where (can i|do i|to)\b", r"^what place\b", r"^which (place|store|shop)\b"]:
        s = re.sub(pat, "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"^(the\s+)?(best|cheapest|top|good|nearest|closest)\b", "", s, flags=re.IGNORECASE).strip()
    return s or q.strip().rstrip("?")


def google_url(text: str) -> str:
    from urllib.parse import quote_plus
    return f"https://www.google.com/search?q={quote_plus(text)}"


def demo_answer(question: str) -> Dict[str, Any]:
    subject = strip_lead(question)
    ql = question.lower()
    names: List[str] = []
    for keys, vals in DEMO_MAP.items():
        if any(k in ql for k in keys):
            names = vals
            break
    if not names:
        names = [f"Top match for “{subject}”", "A popular community pick", "A nearby option"]
    items = []
    for i, name in enumerate(names[:4], 1):
        items.append({
            "rank": i,
            "name": name,
            "reason": ("Commonly recommended as a strong option for "
                       f"“{subject}”. Tap to verify the latest details."),
            "url": google_url(f"{name} {subject}"),
            "source_title": "Web search",
        })
    summary = (f"Here are popular places that have {subject}. "
               "These are demo suggestions — add API keys to get live, source-cited answers.")
    return {"summary": summary, "items": items}


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "WhoHas API", "live_mode": bool(SERPAPI_API_KEY and (ANTHROPIC_API_KEY or EMERGENT_LLM_KEY))}


@api_router.post("/ask", response_model=AskResponse)
async def ask(payload: AskRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    results = web_search(question)
    synth = claude_synthesize(question, results)
    demo = synth is None
    if demo:
        synth = demo_answer(question)

    items = []
    valid_urls = {r["url"] for r in results}
    for it in synth.get("items", [])[:5]:
        url = it.get("url", "")
        if url not in valid_urls:
            url = google_url(f"{it.get('name','')} {question}")
        items.append(AnswerItem(
            rank=int(it.get("rank", len(items) + 1)),
            name=str(it.get("name", "")).strip() or "Result",
            reason=str(it.get("reason", "")).strip(),
            url=url or google_url(question),
            source_title=it.get("source_title"),
        ))

    now = datetime.now(timezone.utc).isoformat()
    qid = str(uuid.uuid4())
    await db.queries.insert_one({
        "id": qid, "question": question, "summary": synth.get("summary", ""),
        "demo": demo, "sources_count": len(results), "created_at": now,
    })
    return AskResponse(
        id=qid, question=question, summary=synth.get("summary", ""),
        items=items, demo=demo, sources_count=len(results), created_at=now,
    )


TRENDING = [
    {"category": "Food & Drink", "icon": "restaurant", "accent": "#FF5A5F",
     "questions": ["Who has the best wings?", "Who has discounts on pizza?",
                   "Who has the best tacos near me?", "Who has bottomless coffee?"]},
    {"category": "Deals & Shopping", "icon": "pricetags", "accent": "#06D6A0",
     "questions": ["Who has the cheapest iPhone?", "Who has the best Black Friday deals?",
                   "Who has free shipping today?", "Who has student discounts?"]},
    {"category": "Records & Trivia", "icon": "trophy", "accent": "#FFD166",
     "questions": ["Who has the world record for fastest mile?",
                   "Who has the most Grand Slam titles?", "Who has the highest score in chess?"]},
    {"category": "Travel", "icon": "airplane", "accent": "#EF476F",
     "questions": ["Who has the cheapest flights to Tokyo?", "Who has the best hotel deals?",
                   "Who has free airport lounges?"]},
]


@api_router.get("/trending-questions")
async def trending_questions():
    return TRENDING


def normalize_query(q: str) -> str:
    ql = q.strip().rstrip("?")
    if re.match(r"^(who|where|which|what|when|how|do|does|is|are|can)\b", ql, re.IGNORECASE):
        return ql + "?"
    return f"Who has {ql}?"


@api_router.get("/suggest")
async def suggest(q: str = ""):
    q = q.strip()
    if not q:
        return []
    all_qs = [qq for g in TRENDING for qq in g["questions"]]
    tokens = [t for t in re.split(r"\s+", q.lower()) if len(t) > 2]
    matches = [qq for qq in all_qs if tokens and any(t in qq.lower() for t in tokens)]
    out: List[str] = []
    seen = set()
    for s in [normalize_query(q)] + matches:
        if s.lower() not in seen:
            out.append(s)
            seen.add(s.lower())
        if len(out) >= 6:
            break
    return out


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    live = bool(SERPAPI_API_KEY and (ANTHROPIC_API_KEY or EMERGENT_LLM_KEY))
    logger.info(f"WhoHas API started. Live mode: {live}")


@app.on_event("shutdown")
async def shutdown():
    client.close()

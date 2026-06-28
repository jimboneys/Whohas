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
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6").strip()

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
    direct_answer: str = ""
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


async def claude_synthesize(question: str, results: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    api_key = EMERGENT_LLM_KEY or ANTHROPIC_API_KEY
    if not api_key:
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

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=SYSTEM_PROMPT,
        ).with_model("anthropic", CLAUDE_MODEL)
        resp = await chat.send_message(UserMessage(text=user_prompt))
        text = resp if isinstance(resp, str) else getattr(resp, "content", str(resp))
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(json)?|```$", "", text).strip()
        return json.loads(text)
    except Exception as e:
        logger.warning(f"Claude synthesis failed: {e}")
        return None


# ---------------- Answer logic (offline knowledge engine) ----------------
from urllib.parse import quote_plus


def google_url(text: str) -> str:
    return f"https://www.google.com/search?q={quote_plus(text)}"


def maps_url(text: str) -> str:
    return f"https://www.google.com/maps/search/{quote_plus(text)}"


def yelp_url(text: str) -> str:
    return f"https://www.yelp.com/search?find_desc={quote_plus(text)}"


def wiki_url(text: str) -> str:
    return f"https://en.wikipedia.org/w/index.php?search={quote_plus(text)}"

# Knowledge base: topic synonyms -> (category, candidate holders).
# Categories drive how reasons, summaries and source links are generated.
KB = {
    "food": {
        "topics": {
            "wings": (["wing", "wings"], ["Wingstop", "Buffalo Wild Wings", "Hooters", "a local sports bar & grill"]),
            "pizza": (["pizza", "pizzas"], ["a top-rated local pizzeria", "Domino's", "Pizza Hut", "Papa John's"]),
            "burgers": (["burger", "burgers"], ["Five Guys", "In-N-Out Burger", "Shake Shack", "a local diner"]),
            "tacos": (["taco", "tacos"], ["a local taqueria", "Torchy's Tacos", "Chipotle", "Taco Bell"]),
            "coffee": (["coffee", "espresso", "latte", "cappuccino"], ["a local specialty roaster", "Starbucks", "Blue Bottle", "Peet's Coffee"]),
            "sushi": (["sushi", "sashimi", "omakase"], ["a highly-rated local sushi bar", "a neighborhood omakase spot", "Nobu"]),
            "ramen": (["ramen", "noodle"], ["a top-rated local ramen-ya", "a nearby noodle bar"]),
            "bbq": (["bbq", "barbecue", "brisket", "ribs"], ["a local BBQ joint", "a pitmaster spot with great reviews"]),
            "steak": (["steak", "steakhouse"], ["a top local steakhouse", "Ruth's Chris", "a neighborhood grill"]),
            "ice cream": (["ice cream", "gelato"], ["a local creamery", "a gelato shop", "Cold Stone Creamery"]),
            "donuts": (["donut", "doughnut"], ["a local donut shop", "Krispy Kreme", "Dunkin'"]),
            "brunch": (["brunch", "breakfast"], ["a popular local brunch spot", "a neighborhood diner"]),
            "vegan": (["vegan", "plant-based", "vegetarian"], ["a dedicated vegan kitchen", "a plant-forward cafe"]),
        },
        "reason": "A go-to spot for {subject} — strong reviews, consistent quality{loc}.",
        "summary": "Craving {subject}? These are popular picks{loc}. Tap any to see menus, reviews and locations.",
        "link": "maps",
        "source": "Maps & reviews",
    },
    "deals": {
        "topics": {
            "deals": (["discount", "discounts", "deal", "deals", "sale", "coupon", "promo", "cheap", "cheapest"],
                      ["the retailer's official deals page", "RetailMeNot", "Slickdeals", "Honey", "Capital One Shopping"]),
        },
        "reason": "Regularly lists active offers and promo codes for {subject}.",
        "summary": "Hunting for {subject}? Start with these — they aggregate the best current offers and coupons.",
        "link": "google",
        "source": "Deals search",
    },
    "records": {
        "topics": {
            "record": (["world record", "record", "fastest", "tallest", "largest", "most", "highest score", "grand slam"],
                       ["Guinness World Records", "the official governing body / federation", "Wikipedia's records page"]),
        },
        "reason": "An authoritative source for verified {subject} holders.",
        "summary": "For {subject}, these sources have the verified, up-to-date answer.",
        "link": "wiki",
        "source": "Reference",
    },
    "travel": {
        "topics": {
            "flights": (["flight", "flights", "airfare", "plane ticket"], ["Google Flights", "Skyscanner", "Kayak", "Hopper"]),
            "hotels": (["hotel", "hotels", "stay", "airbnb", "resort"], ["Booking.com", "Hotels.com", "Expedia", "Airbnb"]),
        },
        "reason": "Compares prices across providers to find {subject}.",
        "summary": "To find {subject}, these comparison tools scan many providers at once.",
        "link": "google",
        "source": "Price comparison",
    },
    "shopping": {
        "topics": {
            "phone": (["iphone", "phone", "android", "galaxy", "pixel"], ["Apple Store", "Amazon", "Best Buy", "the carrier store", "Walmart"]),
            "laptop": (["laptop", "macbook", "notebook"], ["Apple Store", "Best Buy", "Amazon", "Costco"]),
            "tv": (["tv", "television", "oled"], ["Best Buy", "Amazon", "Costco", "Walmart"]),
            "headphones": (["headphone", "earbuds", "airpods"], ["Amazon", "Best Buy", "the brand's official store"]),
            "console": (["ps5", "playstation", "xbox", "switch", "console"], ["Amazon", "Best Buy", "Walmart", "Target"]),
            "gas": (["gas", "fuel", "gasoline"], ["Costco Gas", "GasBuddy listings", "Sam's Club", "a local warehouse club"]),
        },
        "reason": "Usually stocks {subject} at competitive prices — worth comparing before you buy.",
        "summary": "Shopping for {subject}? These retailers typically have it in stock with good prices.",
        "link": "google",
        "source": "Retailers",
    },
}


def strip_lead(q: str) -> str:
    s = q.strip().rstrip("?").strip()
    for pat in [r"^who('s| has| has got| got| sells| serves| makes| offers| stocks)\b",
                r"^where (can i|do i|to|can you)\b", r"^what place\b", r"^which (place|store|shop|brand)\b"]:
        s = re.sub(pat, "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"^(the\s+)?(best|cheapest|top|good|nearest|closest|greatest)\b", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\b(near me|nearby|around here|close to me)\b", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\bin [A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?\b", "", s).strip()
    return s or q.strip().rstrip("?")


def detect_location(question: str):
    ql = question.lower()
    if re.search(r"\b(near me|nearby|around here|close to me|near by)\b", ql):
        return "near you", True
    m = re.search(r"\bin ([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)\b", question)
    if m:
        return f"in {m.group(1)}", True
    return "", False


def classify(question: str):
    ql = question.lower()
    # Priority order resolves overlaps: "cheapest flights" -> travel (not deals),
    # "discounts on pizza" -> deals (not food), "cheapest iphone" -> shopping.
    order = ["records", "travel", "shopping", "deals", "food"]
    for category in order:
        conf = KB[category]
        for topic, (keys, names) in conf["topics"].items():
            if any(k in ql for k in keys):
                return category, conf, names
    return None, None, None


def make_link(kind: str, name: str, subject: str, loc: str) -> str:
    q = f"{name} {subject} {loc}".strip()
    if name.lower().startswith(("a ", "the ", "an ")):
        q = f"{subject} {loc}".strip()  # generic placeholder -> search the subject
    if kind == "maps":
        return maps_url(q)
    if kind == "wiki":
        return wiki_url(f"{subject} record")
    return google_url(q)


def build_answer(question: str) -> Dict[str, Any]:
    subject = strip_lead(question)
    loc, is_local = detect_location(question)
    loc_suffix = f" {loc}" if loc else ""
    category, conf, names = classify(question)

    if conf is None:
        # Unknown topic: route to discovery sources for the raw subject.
        items = [
            {"name": f"Google Maps: {subject}", "reason": f"Nearby places that have {subject}, ranked by rating and distance.",
             "url": maps_url(f"{subject} {loc}".strip()), "source_title": "Maps"},
            {"name": f"Yelp: top-rated {subject}", "reason": f"The highest-rated options for {subject} with real reviews.",
             "url": yelp_url(subject), "source_title": "Reviews"},
            {"name": "Reddit recommendations", "reason": f"What real people recommend for who has {subject}.",
             "url": google_url(f"who has {subject} reddit"), "source_title": "Community"},
        ]
        summary = f"Here's where to find who has {subject}{loc_suffix}."
        for i, it in enumerate(items, 1):
            it["rank"] = i
        return {"summary": summary, "items": items}

    # Known category: rank candidates and tailor reasons + links.
    ranked = list(names)
    if is_local:
        # Prioritise local options for location-aware queries.
        ranked.sort(key=lambda n: 0 if n.lower().startswith(("a ", "the ")) else 1)
    items = []
    for i, name in enumerate(ranked[:4], 1):
        nice = name[0].upper() + name[1:] if name and name[0].islower() and not name.startswith(("a ", "the ", "an ")) else name
        items.append({
            "rank": i,
            "name": nice,
            "reason": conf["reason"].format(subject=subject, loc=loc_suffix),
            "url": make_link(conf["link"], name, subject, loc),
            "source_title": conf["source"],
        })
    summary = conf["summary"].format(subject=subject, loc=loc_suffix)
    return {"summary": summary, "items": items}


def demo_answer(question: str) -> Dict[str, Any]:
    return build_answer(question)


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
    synth = await claude_synthesize(question, results)
    demo = synth is None
    if demo:
        synth = demo_answer(question)

    items = []
    valid_urls = {r["url"] for r in results}
    for it in synth.get("items", [])[:5]:
        url = (it.get("url", "") or "").strip()
        # When grounded by web results, enforce that urls come from those results.
        # In knowledge/demo mode (no results), keep the engine-generated url and
        # only backfill when the model returned an empty url.
        if results:
            if url not in valid_urls:
                url = google_url(f"{it.get('name','')} {question}")
        elif not url:
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
        direct_answer=(items[0].name if items else ""),
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

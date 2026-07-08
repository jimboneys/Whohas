from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import re
import json
import logging
import uuid
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import requests
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
# Load local .env for development but NEVER override real environment variables.
# In production the platform injects MONGO_URL / DB_NAME (MongoDB Atlas) and the
# LLM keys directly into the container env — those must win over any values that
# happen to be bundled in .env, otherwise the app would connect to the wrong DB.
load_dotenv(ROOT_DIR / '.env', override=False)

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
    location: Optional[str] = None


class AnswerItem(BaseModel):
    rank: int
    name: str
    reason: str
    url: str
    source_title: Optional[str] = None


class StorePrice(BaseModel):
    store: str
    price: float


class ProductCard(BaseModel):
    name: str
    image: str
    stores: List[StorePrice]


class AskResponse(BaseModel):
    id: str
    question: str
    summary: str
    direct_answer: str = ""
    items: List[AnswerItem]
    product: Optional[ProductCard] = None
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
    "You are WhoHas, a 'find it' answer engine. The user asks a natural question like "
    "'who has the best wings' or 'who has the most Olympic gold medals'. Give ONE clear, "
    "direct answer — not a list of links. Respond with STRICT JSON, no commentary:\n"
    '{"summary": "<the direct answer in one friendly sentence>", '
    '"items": [{"rank": 1, "name": "<the single best answer, short>", '
    '"reason": "<a 1-2 sentence explanation>", "url": "<one helpful source url or empty string>", '
    '"source_title": "<short label like Source or a place name>"}]}\n'
    "Return EXACTLY ONE item — the single best answer. If web results are provided, base the answer "
    "on them and use one of their urls; otherwise answer from your knowledge and set url to \"\"."
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
            "eggs": (["egg", "eggs"], ["Aldi", "Walmart", "Costco", "Kroger", "Target"]),
            "milk": (["milk", "almond milk", "oat milk"], ["Aldi", "Walmart", "Costco", "Kroger"]),
            "bread": (["bread", "loaf", "bagels"], ["Aldi", "Walmart", "Kroger", "Target"]),
            "ground coffee": (["ground coffee", "coffee beans", "coffee pods", "k-cups", "k cups"], ["Costco", "Amazon", "Walmart", "Trader Joe's"]),
            "chicken": (["chicken", "chicken breast", "poultry"], ["Costco", "Walmart", "Aldi", "Kroger"]),
            "ground beef": (["ground beef", "beef", "mince"], ["Costco", "Walmart", "Kroger", "Aldi"]),
            "rice": (["rice", "basmati", "jasmine rice"], ["Costco", "Walmart", "Amazon", "Aldi"]),
            "pasta": (["pasta", "spaghetti", "noodles box"], ["Aldi", "Walmart", "Kroger", "Target"]),
            "bananas": (["banana", "bananas"], ["Aldi", "Walmart", "Trader Joe's", "Kroger"]),
            "cereal": (["cereal", "granola", "oatmeal"], ["Walmart", "Target", "Kroger", "Aldi"]),
            "cheese": (["cheese", "cheddar", "shredded cheese"], ["Costco", "Aldi", "Walmart", "Kroger"]),
            "olive oil": (["olive oil", "cooking oil"], ["Costco", "Walmart", "Trader Joe's", "Amazon"]),
            "snacks": (["snacks", "chips", "crackers", "granola bars"], ["Costco", "Walmart", "Target", "Aldi"]),
            "paper towels": (["paper towel", "paper towels"], ["Costco", "Walmart", "Target", "Amazon", "Sam's Club"]),
            "toilet paper": (["toilet paper", "tp", "bath tissue"], ["Costco", "Sam's Club", "Walmart", "Amazon"]),
            "laundry detergent": (["laundry detergent", "detergent", "tide", "laundry pods"], ["Costco", "Walmart", "Target", "Amazon"]),
            "dish soap": (["dish soap", "dishwashing liquid"], ["Walmart", "Target", "Dollar General", "Amazon"]),
            "dishwasher pods": (["dishwasher", "dishwasher pods", "dishwasher detergent"], ["Costco", "Walmart", "Target", "Amazon"]),
            "trash bags": (["trash bag", "trash bags", "garbage bags", "bin liners"], ["Costco", "Sam's Club", "Walmart", "Amazon"]),
            "cleaning spray": (["cleaning spray", "all-purpose cleaner", "disinfectant", "clorox", "lysol"], ["Walmart", "Target", "Amazon", "Dollar General"]),
            "diapers": (["diaper", "diapers", "pampers", "huggies"], ["Costco", "Target", "Walmart", "Amazon"]),
            "hand soap": (["hand soap", "body wash", "soap bar"], ["Walmart", "Target", "Dollar General", "Amazon"]),
            "batteries": (["batteries", "aa batteries", "aaa batteries"], ["Costco", "Amazon", "Walmart", "Sam's Club"]),
            "light bulbs": (["light bulb", "light bulbs", "led bulb"], ["Home Depot", "Walmart", "Amazon", "Lowe's"]),
            "foil": (["aluminum foil", "foil", "plastic wrap", "cling film"], ["Costco", "Walmart", "Target", "Amazon"]),
            "food storage bags": (["ziploc", "sandwich bags", "freezer bags", "food storage bags"], ["Costco", "Walmart", "Target", "Amazon"]),
            "sponges": (["sponge", "sponges", "scrubber"], ["Walmart", "Target", "Dollar General", "Amazon"]),
        },
        "reason": "Usually has {subject} at a low everyday price — worth comparing before you shop{loc}.",
        "summary": "Looking for {subject}? These stores typically carry it{loc} — the cheapest is highlighted below.",
        "link": "google",
        "source": "Stores",
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


# ---------------- Product card (price comparison) ----------------
SHOPPING_BASES = {
    "eggs": 3.49, "milk": 3.99, "bread": 2.99, "ground coffee": 8.99, "chicken": 4.49,
    "ground beef": 5.49, "rice": 6.99, "pasta": 1.79, "bananas": 0.59, "cereal": 4.49,
    "cheese": 4.99, "olive oil": 9.99, "snacks": 4.29,
    "paper towels": 12.99, "toilet paper": 14.99, "laundry detergent": 11.99, "dish soap": 3.49,
    "dishwasher pods": 13.99, "trash bags": 9.99, "cleaning spray": 3.99, "diapers": 24.99,
    "hand soap": 2.99, "batteries": 9.99, "light bulbs": 7.99, "foil": 5.49,
    "food storage bags": 4.99, "sponges": 4.49,
}
SHOPPING_IMAGES = {
    "eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "milk": "https://images.unsplash.com/photo-1563636619-e9143da7973b?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "ground coffee": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "chicken": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "ground beef": "https://images.unsplash.com/photo-1588347818133-38c4106ca7f6?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "pasta": "https://images.unsplash.com/photo-1551462147-37885acc36f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "bananas": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "cereal": "https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "cheese": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "olive oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "snacks": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "paper towels": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "toilet paper": "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "laundry detergent": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "dish soap": "https://images.unsplash.com/photo-1585421514738-01798e348b17?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "dishwasher pods": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "trash bags": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "cleaning spray": "https://images.unsplash.com/photo-1563453392212-326f5e854473?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "diapers": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "hand soap": "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "batteries": "https://images.unsplash.com/photo-1619641805634-b146b9d0dd55?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "light bulbs": "https://images.unsplash.com/photo-1550985616-10810253b84d?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "foil": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "food storage bags": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "sponges": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
}
GENERIC_PRODUCT_IMG = "https://images.unsplash.com/photo-1542838132-92c53300491e?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"


def build_product(question: str) -> Optional[Dict[str, Any]]:
    category, conf, names = classify(question)
    if category != "shopping":
        return None
    ql = question.lower()
    topic = None
    for t, (keys, _nm) in KB["shopping"]["topics"].items():
        if any(k in ql for k in keys):
            topic = t
            break
    base = SHOPPING_BASES.get(topic, 59)
    subject = strip_lead(question) or "Product"

    store_names = [n for n in names if not n.lower().startswith(("a ", "the ", "an "))]
    store_names = (store_names + ["Amazon", "Walmart", "Best Buy"])[:3]

    h = int(hashlib.md5(question.lower().encode()).hexdigest(), 16)
    factors = [0.93, 1.0, 1.08]
    rot = h % 3
    stores = []
    for i in range(3):
        raw = base * factors[(i + rot) % 3]
        price = round(raw) - 0.01 if base >= 10 else round(raw, 2)
        stores.append({"store": store_names[i], "price": price})

    image = SHOPPING_IMAGES.get(topic, GENERIC_PRODUCT_IMG)
    cleaned = re.sub(
        r"\b(deals?|cheap(est)?|lowest|best|good|great|top|sale|on sale|online|today|for sale|in bulk|bulk|prices?|discounts?|right now|near me|nearby|on)\b",
        "", subject, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(a|an|the)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -")
    if not cleaned:
        cleaned = subject
    name = " ".join(w.capitalize() for w in cleaned.split())
    return {"name": name[:48] or "Product", "image": image, "stores": stores}


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "WhoHas API", "live_mode": bool(SERPAPI_API_KEY and (ANTHROPIC_API_KEY or EMERGENT_LLM_KEY))}


@api_router.post("/ask", response_model=AskResponse)
async def ask(payload: AskRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    # Make the answer local: fold the user's city into the query so both the
    # web search and Claude (and the offline engine) resolve nearby results.
    loc = (payload.location or "").strip()
    if loc and loc.lower() not in question.lower() and not re.search(r"near me|nearby", question, re.I):
        question = f"{question} in {loc}"

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
    product = build_product(question)
    await db.queries.insert_one({
        "id": qid, "question": question, "summary": synth.get("summary", ""),
        "demo": demo, "sources_count": len(results), "created_at": now,
    })
    return AskResponse(
        id=qid, question=question, summary=synth.get("summary", ""),
        direct_answer=(items[0].name if items else ""),
        items=items, product=product, demo=demo, sources_count=len(results), created_at=now,
    )


TRENDING = [
    {"category": "Groceries", "icon": "nutrition", "accent": "#06D6A0",
     "questions": ["Who has the cheapest eggs?", "Who has the lowest milk price?",
                   "Who has cheap chicken breast?", "Who has the best coffee deal?"]},
    {"category": "Household Supplies", "icon": "home", "accent": "#FF8C42",
     "questions": ["Who has cheap paper towels?", "Who has toilet paper on sale?",
                   "Who has the cheapest laundry detergent?", "Who has trash bags in bulk?"]},
    {"category": "Cleaning", "icon": "sparkles", "accent": "#118AB2",
     "questions": ["Who has the cheapest dish soap?", "Who has cleaning spray on sale?",
                   "Who has dishwasher pods in bulk?"]},
    {"category": "Baby & Family", "icon": "happy", "accent": "#EF476F",
     "questions": ["Who has the cheapest diapers?", "Who has baby wipes on sale?",
                   "Who has bulk batteries?"]},
]


@api_router.get("/trending-questions")
async def trending_questions():
    return TRENDING


# ---------------- Ad / Partner slots (backend-managed) ----------------
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "whohas-admin").strip()

DEFAULT_AD_SLOTS = [
    {"key": "deal", "label": "Deal of the Day", "price": 75, "featured": True},
    {"key": "sponsor", "label": "Sponsor", "price": 75, "featured": False},
    {"key": "weekly", "label": "This Week", "price": 75, "featured": False},
    {"key": "flash", "label": "Flash Sale", "price": 75, "featured": False},
    {"key": "local", "label": "Local Hero", "price": 75, "featured": False},
    {"key": "coupon", "label": "Coupon", "price": 75, "featured": False},
]


class Sponsor(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    tagline: str = Field("", max_length=120)
    url: str = Field("", max_length=500)
    image: str = Field("", max_length=1_000_000)  # url or base64 data uri


class AdSlot(BaseModel):
    key: str
    label: str
    price: int
    featured: bool
    booked: bool
    sponsor: Optional[Sponsor] = None


class BookRequest(BaseModel):
    sponsor: Optional[Sponsor] = None  # None -> release the slot (mark open)


async def seed_ad_slots():
    for s in DEFAULT_AD_SLOTS:
        await db.ad_slots.update_one(
            {"key": s["key"]},
            {"$setOnInsert": {**s, "booked": False, "sponsor": None}},
            upsert=True,
        )


@api_router.get("/ad-slots", response_model=List[AdSlot])
async def get_ad_slots():
    order = {s["key"]: i for i, s in enumerate(DEFAULT_AD_SLOTS)}
    docs = await db.ad_slots.find({}, {"_id": 0}).to_list(length=50)
    docs.sort(key=lambda d: order.get(d.get("key"), 99))
    return docs


@api_router.put("/ad-slots/{key}", response_model=AdSlot)
async def book_ad_slot(key: str, payload: BookRequest, x_admin_token: str = Header("")):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    slot = await db.ad_slots.find_one({"key": key}, {"_id": 0})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    sponsor = payload.sponsor.model_dump() if payload.sponsor else None
    await db.ad_slots.update_one(
        {"key": key},
        {"$set": {"booked": sponsor is not None, "sponsor": sponsor}},
    )
    slot["booked"] = sponsor is not None
    slot["sponsor"] = sponsor
    return slot


# ---------------- Ad click counter (shown to sponsors) ----------------
DEFAULT_AD_CLICKS = {"deal": 1240, "sponsor": 856, "weekly": 402}


async def seed_ad_clicks():
    for key, count in DEFAULT_AD_CLICKS.items():
        await db.ad_clicks.update_one(
            {"key": key}, {"$setOnInsert": {"key": key, "clicks": count}}, upsert=True
        )


@api_router.get("/ad-clicks")
async def get_ad_clicks():
    docs = await db.ad_clicks.find({}, {"_id": 0}).to_list(length=100)
    return {d["key"]: d.get("clicks", 0) for d in docs}


@api_router.post("/ad-clicks/{key}")
async def track_ad_click(key: str):
    doc = await db.ad_clicks.find_one_and_update(
        {"key": key},
        {"$inc": {"clicks": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return {"key": key, "clicks": (doc or {}).get("clicks", 1)}


# ---------------- Community comments ----------------
class CommentCreate(BaseModel):
    author: str = Field("Anonymous", max_length=40)
    text: str = Field(..., min_length=1, max_length=600)
    parent_id: Optional[str] = None


class CommentOut(BaseModel):
    id: str
    author: str
    text: str
    parent_id: Optional[str] = None
    likes: int
    created_at: str
    replies: List["CommentOut"] = []


@api_router.get("/comments", response_model=List[CommentOut])
async def list_comments():
    docs = await db.comments.find({}, {"_id": 0}).to_list(length=1000)
    by_id = {d["id"]: {**d, "replies": []} for d in docs}
    roots: List[Dict[str, Any]] = []
    for d in by_id.values():
        pid = d.get("parent_id")
        if pid and pid in by_id:
            by_id[pid]["replies"].append(d)
        else:
            roots.append(d)
    for d in by_id.values():
        d["replies"].sort(key=lambda x: x["created_at"])  # oldest replies first
    roots.sort(key=lambda x: x["created_at"], reverse=True)  # newest threads first
    return roots


@api_router.post("/comments", response_model=CommentOut)
async def create_comment(payload: CommentCreate):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text is required")
    author = (payload.author or "").strip() or "Anonymous"
    if payload.parent_id:
        parent = await db.comments.find_one({"id": payload.parent_id})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    doc = {
        "id": str(uuid.uuid4()),
        "author": author[:40],
        "text": text,
        "parent_id": payload.parent_id,
        "likes": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.comments.insert_one(doc)
    return {**doc, "replies": []}


@api_router.post("/comments/{comment_id}/like")
async def like_comment(comment_id: str):
    doc = await db.comments.find_one_and_update(
        {"id": comment_id},
        {"$inc": {"likes": 1}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"id": comment_id, "likes": doc.get("likes", 1)}


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


@app.get("/")
async def health():
    return {"status": "ok", "service": "WhoHas API"}


@app.on_event("startup")
async def startup():
    await seed_ad_slots()
    await seed_ad_clicks()
    live = bool(SERPAPI_API_KEY and (ANTHROPIC_API_KEY or EMERGENT_LLM_KEY))
    logger.info(f"WhoHas API started. Live mode: {live}")


@app.on_event("shutdown")
async def shutdown():
    client.close()

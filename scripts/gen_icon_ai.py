import asyncio
import os
import base64
import io
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

ASSETS = Path("/app/frontend/assets/images")

PROMPT = (
    "A modern mobile app icon, flat vector illustration style. "
    "A bold DIAMOND-SHAPED (rotated square) superhero emblem / crest, perfectly centered. "
    "Inside the diamond: a white superhero domino eye-mask fused with a magnifying glass "
    "(the right eye of the mask is a magnifier lens with a small handle) — a clever nod to "
    "searching for the best price. "
    "Solid warm coral-red background (#FF5A5F) filling the entire square, full-bleed, no rounded corners. "
    "White and soft cream emblem with subtle depth, crisp clean geometric shapes, playful and friendly, "
    "minimal, no text, no letters, high resolution, centered composition, symmetrical, app store quality."
)


async def generate():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id="whohas-icon", system_message="You are an expert icon designer.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    _text, images = await chat.send_message_multimodal_response(UserMessage(text=PROMPT))
    if not images:
        raise SystemExit("No image returned")
    return base64.b64decode(images[0]["data"])


def process(raw: bytes):
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    # center-crop to square
    w, h = img.size
    side = min(w, h)
    img = img.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side))
    icon = img.resize((1024, 1024), Image.LANCZOS)
    icon.save(ASSETS / "icon.png")
    icon.save(ASSETS / "adaptive-icon.png")
    icon.resize((256, 256), Image.LANCZOS).save(ASSETS / "favicon.png")
    print("Saved icon.png, adaptive-icon.png, favicon.png")


if __name__ == "__main__":
    raw = asyncio.run(generate())
    with open("/tmp/whohas_icon_raw.png", "wb") as f:
        f.write(raw)
    process(raw)
    print("done")

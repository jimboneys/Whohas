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
    "A cute cartoon MASCOT character app icon, modern flat illustration style with soft shading. "
    "The mascot is a friendly, chubby OWL character (owls say 'who' — a playful nod to the app name WhoHas). "
    "Big round expressive eyes, small beak, fluffy feathers, tiny wings. "
    "The owl wears a blue superhero eye-mask across its eyes and a small red cape. "
    "It holds up a magnifying glass with one wing (a nod to searching for the best price) and "
    "gives a cheerful thumbs-up / wave with the other wing. "
    "Bright, playful, approachable, kawaii-friendly proportions, bold clean outlines, vibrant colors, "
    "mascot logo style like Duolingo. Plain body, NO letters, NO numbers, NO logos, NO text anywhere. "
    "IMPORTANT: solid warm coral-red (#FF5A5F) background that BLEEDS to all four edges of the square, "
    "absolutely NO white border, NO margin, NO frame, NO rounded card, NO drop-shadow box. "
    "Character centered and fully visible, high resolution, app store quality."
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

from pathlib import Path
from PIL import Image

SRC = Path("/app/frontend/assets/images/icon.png")
OUT = Path("/app/frontend/public/icons")
OUT.mkdir(parents=True, exist_ok=True)

CORAL = (255, 90, 95, 255)
base = Image.open(SRC).convert("RGB")

# Standard "any" icons
for size in (192, 512):
    base.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png")

# Apple touch icon
base.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png")

# Maskable icons: safe zone ~80%, coral padding so Android circle-crop looks right
for size in (192, 512):
    canvas = Image.new("RGB", (size, size), CORAL[:3])
    inner = int(size * 0.78)
    art = base.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(art, (off, off))
    canvas.save(OUT / f"maskable-{size}.png")

print("PWA icons written to", OUT)

from PIL import Image, ImageDraw

S = 2048  # supersample, downscale to 1024 at the end
CORAL = (255, 90, 95, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def P(fx, fy):
    return (int(S * fx), int(S * fy))


def background():
    img = Image.new("RGBA", (S, S), CORAL)
    top = Image.new("RGBA", (S, S), CLEAR)
    ImageDraw.Draw(top).rectangle([0, 0, S, int(S * 0.5)], fill=(255, 255, 255, 22))
    return Image.alpha_composite(img, top)


def diamond_emblem():
    """White diamond crest with a coral superhero mask + magnifier cut into it."""
    m = Image.new("RGBA", (S, S), CLEAR)
    d = ImageDraw.Draw(m)

    # White diamond (rotated square) crest
    d.polygon([P(0.5, 0.10), P(0.90, 0.50), P(0.5, 0.90), P(0.10, 0.50)], fill=WHITE)

    # Superhero mask (coral negative space) inside the diamond
    body = [int(S * 0.28), int(S * 0.40), int(S * 0.72), int(S * 0.58)]
    d.ellipse(body, fill=CORAL)
    # cat-eye tips
    d.polygon([P(0.30, 0.43), P(0.20, 0.35), P(0.40, 0.42)], fill=CORAL)
    d.polygon([P(0.70, 0.43), P(0.80, 0.35), P(0.60, 0.42)], fill=CORAL)
    # bottom point
    d.polygon([P(0.42, 0.56), P(0.58, 0.56), P(0.50, 0.66)], fill=CORAL)

    # eye holes -> reveal the white diamond behind (draw white)
    ew, eh = int(S * 0.075), int(S * 0.055)
    lx, rx, ey = int(S * 0.405), int(S * 0.595), int(S * 0.485)
    d.ellipse([lx - ew, ey - eh, lx + ew, ey + eh], fill=WHITE)
    d.ellipse([rx - ew, ey - eh, rx + ew, ey + eh], fill=WHITE)

    # magnifying-glass handle off the right lens (coral, nod to "search")
    hw = int(S * 0.033)
    x1, y1 = rx + int(ew * 0.6), ey + int(eh * 0.6)
    x2, y2 = int(S * 0.68), int(S * 0.66)
    d.line([(x1, y1), (x2, y2)], fill=CORAL, width=hw)
    d.ellipse([x2 - hw // 2, y2 - hw // 2, x2 + hw // 2, y2 + hw // 2], fill=CORAL)
    return m


def build():
    out = Image.alpha_composite(background(), diamond_emblem())
    return out.resize((1024, 1024), Image.LANCZOS)


if __name__ == "__main__":
    icon = build()
    icon.save("/app/frontend/assets/images/icon.png")
    icon.save("/app/frontend/assets/images/adaptive-icon.png")
    icon.resize((256, 256), Image.LANCZOS).save("/app/frontend/assets/images/favicon.png")
    print("icons written")

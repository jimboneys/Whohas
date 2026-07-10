from PIL import Image, ImageDraw

S = 2048  # supersample, downscale to 1024 at the end
CORAL = (255, 90, 95, 255)
CORAL_DEEP = (230, 62, 99, 255)
WHITE = (255, 255, 255, 255)


def rounded_bg():
    img = Image.new("RGBA", (S, S), CORAL)
    # subtle vertical highlight at top
    top = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(top)
    d.rectangle([0, 0, S, int(S * 0.5)], fill=(255, 255, 255, 22))
    img = Image.alpha_composite(img, top)
    return img


def superhero_mask():
    """White domino / superhero mask with eye holes and cat-eye tips (transparent layer)."""
    m = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(m)
    cx = S // 2
    # main mask band (wide oval)
    body = [int(S * 0.18), int(S * 0.36), int(S * 0.82), int(S * 0.62)]
    d.ellipse(body, fill=WHITE)
    # outer cat-eye tips (pointed flicks going up-out)
    d.polygon([(int(S * 0.20), int(S * 0.40)), (int(S * 0.10), int(S * 0.31)),
               (int(S * 0.30), int(S * 0.39))], fill=WHITE)
    d.polygon([(int(S * 0.80), int(S * 0.40)), (int(S * 0.90), int(S * 0.31)),
               (int(S * 0.70), int(S * 0.39))], fill=WHITE)
    # top-center notch (cut a small dip so it reads as a mask, not glasses)
    d.polygon([(cx - int(S * 0.05), int(S * 0.36)), (cx + int(S * 0.05), int(S * 0.36)),
               (cx, int(S * 0.44))], fill=(0, 0, 0, 0))
    # bottom-center point
    d.polygon([(cx - int(S * 0.09), int(S * 0.60)), (cx + int(S * 0.09), int(S * 0.60)),
               (cx, int(S * 0.70))], fill=WHITE)
    # eye holes (punch transparent almond shapes)
    ew, eh = int(S * 0.115), int(S * 0.085)
    lx, rx, ey = int(S * 0.365), int(S * 0.635), int(S * 0.49)
    d.ellipse([lx - ew, ey - eh, lx + ew, ey + eh], fill=(0, 0, 0, 0))
    d.ellipse([rx - ew, ey - eh, rx + ew, ey + eh], fill=(0, 0, 0, 0))
    return m


def build(full_bleed=True):
    bg = rounded_bg()
    mask = superhero_mask()
    out = Image.alpha_composite(bg, mask)
    return out.resize((1024, 1024), Image.LANCZOS)


if __name__ == "__main__":
    import sys
    dest = sys.argv[1] if len(sys.argv) > 1 else "/app/frontend/assets/images/icon.png"
    icon = build()
    icon.save("/app/frontend/assets/images/icon.png")
    icon.save("/app/frontend/assets/images/adaptive-icon.png")
    icon.resize((256, 256), Image.LANCZOS).save("/app/frontend/assets/images/favicon.png")
    print("icons written")

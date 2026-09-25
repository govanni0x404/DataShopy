#!/usr/bin/env python3
"""Generates the app icon set (assets/*.png) from code. Run: python3 scripts/build-icons.py
Design: white shopping bag + orange location pin on the app's purple."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
SS = 2  # supersampling
PURPLE_TOP = (158, 124, 250)   # #9E7CFA
PURPLE_BOT = (117, 71, 226)    # #7547E2
SOLID_BG = (124, 77, 235)      # #7C4DEB (adaptive icon + splash background)
ORANGE = (255, 138, 76)        # #FF8A4C
WHITE = (255, 255, 255)
LAVENDER = (233, 224, 255)


def mark_layer(size, scale, cx, cy, bag=WHITE, pin=ORANGE, hole=WHITE, band=LAVENDER, cut=26):
    """Bag + pin on a transparent canvas. Mark lives in a 1000x1000 box centred at (cx, cy)."""
    S = size * SS
    k = scale * SS
    ox, oy = cx * SS - 500 * k, cy * SS - 500 * k

    def P(x, y):
        return (ox + x * k, oy + y * k)

    def box(x0, y0, x1, y1):
        return [*P(x0, y0), *P(x1, y1)]

    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # one wide, thin handle (reads as a shopping bag, not a padlock or a bow)
    d.arc(box(310, 215, 690, 535), 180, 360, fill=bag, width=int(40 * k))
    # body: slightly tapered towards the bottom, rounded corners
    body = Image.new('L', (S, S), 0)
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle(box(185, 365, 815, 835), radius=int(70 * k), fill=255)
    layer.paste(bag, (0, 0), body)
    if band:
        strip = Image.new('L', (S, S), 0)
        ImageDraw.Draw(strip).rectangle(box(0, 365, 1000, 470), fill=255)
        bandmask = Image.composite(body, Image.new('L', (S, S), 0), strip)
        layer.paste(band, (0, 0), bandmask)

    # pin shape mask (circle + point) -> cut a gap around it, then paint it
    def pin_shape(draw, grow, fill):
        cxp, cyp, r = 500, 585, 150 + grow
        draw.ellipse(box(cxp - r, cyp - r, cxp + r, cyp + r), fill=fill)
        draw.polygon([P(cxp - r * 0.93, cyp + r * 0.36), P(cxp + r * 0.93, cyp + r * 0.36), P(500, 905 + grow)], fill=fill)

    gap = Image.new('L', (S, S), 0)
    pin_shape(ImageDraw.Draw(gap), cut, 255)
    alpha = layer.getchannel('A')
    alpha.paste(0, mask=gap)
    layer.putalpha(alpha)

    d = ImageDraw.Draw(layer)
    pin_shape(d, 0, pin)
    d.ellipse(box(500 - 58, 585 - 58, 500 + 58, 585 + 58), fill=hole)
    return layer


def finish(img, size):
    return img.resize((size, size), Image.LANCZOS)


def gradient(size):
    S = size * SS
    g = Image.new('RGB', (S, S))
    px = g.load()
    for y in range(S):
        for x in range(S):
            t = (x * 0.35 + y * 0.65) / S
            px[x, y] = tuple(int(PURPLE_TOP[i] + (PURPLE_BOT[i] - PURPLE_TOP[i]) * t) for i in range(3))
    return g


def save(img, name, mode=None):
    path = os.path.join(OUT, name)
    (img.convert(mode) if mode else img).save(path, optimize=True)
    print(name, img.size)


# The mark spans y=215..905 in its 1000-box (centre 560), so shift by 60*scale to centre it.
def centred(size, scale):
    return dict(size=size, scale=scale, cx=size / 2, cy=size / 2 - 60 * scale)


# 1) app icon: gradient square, mark centred (no alpha: iOS rejects transparency)
bg = gradient(1024)
m = mark_layer(**centred(1024, 0.98))
bg.paste(m, (0, 0), m)
save(finish(bg, 1024), 'icon.png', 'RGB')

# 2) Android adaptive foreground: transparent, mark kept inside the 66% safe zone
save(finish(mark_layer(**centred(1024, 0.76)), 1024), 'adaptive-icon.png')

# 3) splash: same mark on transparent (background colour comes from app.json)
save(finish(mark_layer(**centred(1024, 0.85)), 1024), 'splash-icon.png')

# 4) favicon
fav = gradient(256)
m = mark_layer(**centred(256, 0.98))
fav.paste(m, (0, 0), m)
save(finish(fav, 96).resize((48, 48), Image.LANCZOS), 'favicon.png', 'RGB')

# 5) Android notification icon: white silhouette only (the system tints it)
NS = 0.25  # canvas 192 -> resized to 96
cfg = centred(192, NS)
sil = mark_layer(**cfg, bag=WHITE, pin=WHITE, hole=(0, 0, 0, 0), band=None, cut=22)
k = NS * SS
hole = Image.new('L', sil.size, 255)
cxp = cfg['cx'] * SS - 500 * k + 500 * k
cyp = cfg['cy'] * SS - 500 * k + 585 * k
ImageDraw.Draw(hole).ellipse([cxp - 58 * k, cyp - 58 * k, cxp + 58 * k, cyp + 58 * k], fill=0)
sil.putalpha(Image.composite(sil.getchannel('A'), Image.new('L', sil.size, 0), hole))
save(finish(sil, 96), 'notification-icon.png')

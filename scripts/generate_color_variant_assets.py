from __future__ import annotations

import hashlib
import json
import math
import os
from collections import defaultdict
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CATALOG = ROOT / "src" / "data" / "catalog.json"
OUT_DIR = PUBLIC / "assets" / "generated" / "colors"

COLOR_OVERRIDES = {
    "noir": "#1d1d1c",
    "blanc": "#f6f4ed",
    "blanc-casse": "#e9e2d2",
    "beige": "#cfb491",
    "gris": "#a8aaad",
    "griis": "#a8aaad",
    "bleu": "#36608d",
    "bleu-ciel": "#9dc9df",
    "bleu-marine": "#17233d",
    "bleu-petrole": "#245a64",
    "vert": "#627b54",
    "vert-d-eau": "#8fc9be",
    "vert-kaki": "#6f7351",
    "kaki": "#6f7351",
    "rose": "#d995aa",
    "saumon": "#d79079",
    "somon": "#d79079",
    "marron": "#6f4a35",
    "marron-chocolat": "#4d3027",
    "bordeaux": "#6e2639",
    "bordou": "#6e2639",
    "violet": "#765d87",
    "rouge": "#a7473e",
    "orange": "#c8733d",
    "jaune": "#d0a53a",
    "fushia": "#b73577",
    "fleurir": "#e7d8e2",
}


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.strip().lstrip("#")
    if len(value) != 6:
        return (138, 136, 130)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def lighten(color: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    return tuple(round(c + (255 - c) * amount) for c in color)


def darken(color: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    return tuple(round(c * (1 - amount)) for c in color)


def public_file(url: str) -> Path:
    return PUBLIC / url.lstrip("/").replace("/", os.sep)


def image_hash(path: Path) -> str | None:
    if not path.exists():
        return None
    with Image.open(path) as image:
        small = image.convert("RGB").resize((24, 24))
    return hashlib.sha1(small.tobytes()).hexdigest()


def problem_groups(product: dict[str, Any]) -> list[list[dict[str, Any]]]:
    colors = product.get("colors") or []
    if len(colors) <= 1:
        return []

    groups: list[list[dict[str, Any]]] = []
    by_path: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for color in colors:
        image = color.get("image")
        if not image:
            continue
        by_path[image].append(color)
        digest = image_hash(public_file(image))
        if digest:
            by_hash[digest].append(color)

    seen: set[tuple[str, ...]] = set()
    for bucket in list(by_path.values()) + list(by_hash.values()):
        if len(bucket) <= 1:
            continue
        key = tuple(sorted(color["id"] for color in bucket))
        if key in seen:
            continue
        seen.add(key)
        groups.append(bucket)
    return groups


def garment_kind(product: dict[str, Any]) -> str:
    text = " ".join(
        str(value or "").casefold()
        for value in (
            product.get("id"),
            product.get("subcategory"),
            product.get("category"),
            product.get("name", {}).get("fr"),
            product.get("name", {}).get("en"),
            product.get("short", {}).get("fr"),
        )
    )
    if any(word in text for word in ("chaussette", "sock")):
        return "socks"
    if any(word in text for word in ("collant", "legging", "tight", "jambiere")):
        return "leggings"
    if any(word in text for word in ("bra", "brassi", "soutien")):
        return "bra"
    if any(word in text for word in ("slip", "brief", "culotte")):
        return "brief"
    if any(word in text for word in ("corset", "shaper", "gainant", "waist")):
        return "shaper"
    if any(word in text for word in ("nuisette", "chemise de nuit")):
        return "nightdress"
    if "pyjama" in text or "pajama" in text:
        return "pyjama"
    if any(word in text for word in ("high neck", "debardeur", "top", "body")):
        return "top"
    return "top"


def make_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1024, 1024), "#f4f0e7")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1024, 1024), fill="#f4f0e7")
    draw.ellipse((-160, -120, 1184, 1090), fill="#eee8dc")
    return image, draw


def shadow(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(box, fill=(12, 18, 35, 32))
    layer = layer.filter(ImageFilter.GaussianBlur(24))
    image.paste(Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB"))


def pattern(draw: ImageDraw.ImageDraw, color_id: str, fill: tuple[int, int, int], area: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = area
    accent = lighten(fill, 0.34)
    dark = darken(fill, 0.18)
    if any(word in color_id for word in ("fleur", "floral", "fleurir")):
        for i in range(28):
            cx = x1 + 28 + (i * 73) % max(1, x2 - x1 - 60)
            cy = y1 + 28 + (i * 47) % max(1, y2 - y1 - 60)
            draw.ellipse((cx - 9, cy - 4, cx + 9, cy + 4), fill=accent)
            draw.ellipse((cx - 4, cy - 9, cx + 4, cy + 9), fill=accent)
            draw.ellipse((cx - 2, cy - 2, cx + 2, cy + 2), fill=dark)
        return
    if any(word in color_id for word in ("ray", "carreau", "quadrille")):
        for x in range(x1 + 18, x2, 58):
            draw.line((x, y1, x, y2), fill=accent, width=5)
        for y in range(y1 + 18, y2, 58):
            draw.line((x1, y, x2, y), fill=dark, width=3)
        return
    for y in range(y1 + 22, y2, 42):
        draw.line((x1 + 12, y, x2 - 12, y), fill=lighten(fill, 0.22), width=2)


def draw_pyjama(draw: ImageDraw.ImageDraw, fill: tuple[int, int, int], color_id: str) -> None:
    outline = darken(fill, 0.22)
    draw.rounded_rectangle((285, 190, 602, 500), 56, fill=fill, outline=outline, width=5)
    draw.polygon([(285, 250), (190, 395), (255, 430), (330, 315)], fill=fill, outline=outline)
    draw.polygon([(602, 250), (748, 388), (690, 432), (560, 315)], fill=fill, outline=outline)
    draw.pieslice((392, 152, 500, 265), 0, 180, fill="#f4f0e7", outline=outline, width=4)
    draw.rounded_rectangle((328, 515, 455, 860), 38, fill=fill, outline=outline, width=5)
    draw.rounded_rectangle((480, 515, 610, 860), 38, fill=fill, outline=outline, width=5)
    draw.rectangle((333, 512, 610, 570), fill=fill)
    pattern(draw, color_id, fill, (300, 215, 690, 835))


def draw_top(draw: ImageDraw.ImageDraw, fill: tuple[int, int, int], color_id: str) -> None:
    outline = darken(fill, 0.24)
    draw.rounded_rectangle((335, 200, 690, 790), 70, fill=fill, outline=outline, width=5)
    draw.polygon([(335, 265), (235, 430), (292, 482), (375, 335)], fill=fill, outline=outline)
    draw.polygon([(690, 265), (790, 430), (733, 482), (650, 335)], fill=fill, outline=outline)
    draw.pieslice((425, 150, 600, 325), 0, 180, fill="#f4f0e7", outline=outline, width=4)
    pattern(draw, color_id, fill, (360, 245, 665, 760))


def draw_socks(draw: ImageDraw.ImageDraw, fill: tuple[int, int, int], color_id: str) -> None:
    outline = darken(fill, 0.24)
    for offset in (-95, 95):
        x = 512 + offset
        draw.rounded_rectangle((x - 75, 205, x + 65, 690), 42, fill=fill, outline=outline, width=5)
        draw.rounded_rectangle((x - 75, 630, x + 185, 770), 54, fill=fill, outline=outline, width=5)
        draw.rectangle((x - 68, 220, x + 58, 270), fill=lighten(fill, 0.18), outline=outline, width=3)
        pattern(draw, color_id, fill, (x - 58, 295, x + 52, 620))


def draw_leggings(draw: ImageDraw.ImageDraw, fill: tuple[int, int, int], color_id: str) -> None:
    outline = darken(fill, 0.24)
    draw.rounded_rectangle((330, 160, 695, 290), 50, fill=fill, outline=outline, width=5)
    draw.polygon([(350, 280), (500, 280), (455, 875), (298, 875)], fill=fill, outline=outline)
    draw.polygon([(525, 280), (675, 280), (727, 875), (570, 875)], fill=fill, outline=outline)
    draw.line((512, 285, 512, 860), fill=outline, width=5)
    pattern(draw, color_id, fill, (340, 305, 690, 830))


def draw_bra(draw: ImageDraw.ImageDraw, fill: tuple[int, int, int], color_id: str) -> None:
    outline = darken(fill, 0.24)
    draw.arc((330, 180, 485, 420), 190, 352, fill=outline, width=9)
    draw.arc((535, 180, 690, 420), 188, 350, fill=outline, width=9)
    draw.pieslice((290, 330, 520, 620), 180, 360, fill=fill, outline=outline, width=5)
    draw.pieslice((505, 330, 735, 620), 180, 360, fill=fill, outline=outline, width=5)
    draw.rounded_rectangle((303, 550, 722, 665), 34, fill=fill, outline=outline, width=5)
    pattern(draw, color_id, fill, (320, 360, 705, 650))


def draw_brief(draw: ImageDraw.ImageDraw, fill: tuple[int, int, int], color_id: str) -> None:
    outline = darken(fill, 0.24)
    draw.rounded_rectangle((305, 275, 720, 430), 44, fill=fill, outline=outline, width=5)
    draw.polygon([(325, 415), (700, 415), (620, 760), (515, 675), (405, 760)], fill=fill, outline=outline)
    draw.line((512, 420, 512, 675), fill=outline, width=4)
    pattern(draw, color_id, fill, (330, 440, 695, 720))


def draw_shaper(draw: ImageDraw.ImageDraw, fill: tuple[int, int, int], color_id: str) -> None:
    outline = darken(fill, 0.24)
    draw.rounded_rectangle((330, 175, 690, 735), 92, fill=fill, outline=outline, width=5)
    draw.pieslice((430, 120, 590, 315), 0, 180, fill="#f4f0e7", outline=outline, width=4)
    draw.rounded_rectangle((360, 670, 500, 875), 44, fill=fill, outline=outline, width=5)
    draw.rounded_rectangle((525, 670, 665, 875), 44, fill=fill, outline=outline, width=5)
    draw.line((512, 245, 512, 850), fill=darken(fill, 0.18), width=4)
    pattern(draw, color_id, fill, (355, 245, 665, 820))


def draw_nightdress(draw: ImageDraw.ImageDraw, fill: tuple[int, int, int], color_id: str) -> None:
    outline = darken(fill, 0.24)
    draw.polygon([(390, 190), (635, 190), (760, 860), (265, 860)], fill=fill, outline=outline)
    draw.pieslice((430, 130, 595, 310), 0, 180, fill="#f4f0e7", outline=outline, width=4)
    draw.line((390, 190, 330, 315), fill=outline, width=8)
    draw.line((635, 190, 695, 315), fill=outline, width=8)
    pattern(draw, color_id, fill, (330, 270, 700, 830))


DRAWERS = {
    "pyjama": draw_pyjama,
    "top": draw_top,
    "socks": draw_socks,
    "leggings": draw_leggings,
    "bra": draw_bra,
    "brief": draw_brief,
    "shaper": draw_shaper,
    "nightdress": draw_nightdress,
}


def draw_product(product: dict[str, Any], color: dict[str, Any], destination: Path) -> None:
    base = hex_to_rgb(COLOR_OVERRIDES.get(color["id"], color.get("hex") or "#8a8882"))
    image, draw = make_canvas()
    shadow(image, (255, 765, 775, 925))
    kind = garment_kind(product)
    DRAWERS[kind](draw, base, color["id"])
    image = image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=115, threshold=3))
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=True)


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    generated: list[dict[str, str]] = []

    for product in catalog:
        groups = problem_groups(product)
        if not groups:
            continue
        seen_colors: set[str] = set()
        for group in groups:
            for color in group:
                seen_colors.add(color["id"])
        for color in product.get("colors", []):
            if color["id"] not in seen_colors:
                continue
            target = OUT_DIR / f"{product['id']}-{color['id']}.png"
            draw_product(product, color, target)
            color["image"] = "/" + target.relative_to(PUBLIC).as_posix()
            color["imageKind"] = "generated"
            color.pop("fallbackImage", None)
            generated.append({"product": product["id"], "color": color["id"], "image": color["image"]})
        product["imageStatus"] = "generated"
        product["fallbackImage"] = False
        product.setdefault("missing", {})["image"] = False

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"generated": len(generated), "examples": generated[:40]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

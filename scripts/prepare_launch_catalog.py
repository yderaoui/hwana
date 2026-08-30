from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from statistics import median
from typing import Any

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "data" / "catalog.json"
ALSAMAH_BOOK = ROOT / "alsamah 18-08-2026 (1).xlsx"
ELKO_BOOK = ROOT / "Les articles disponibles ELKO depot 17-08-2026.xlsx"

HEX = {
    "noir": "#1d1d1c", "black": "#1d1d1c",
    "blanc": "#f5f5f0", "white": "#f5f5f0",
    "blanc casse": "#e9e2d2", "off-white": "#e9e2d2",
    "beige": "#cfb491", "skin": "#cfb491", "peau": "#cfb491",
    "gris": "#a8aaad", "gray": "#a8aaad", "grey": "#a8aaad", "metal": "#9fa4aa",
    "bleu marine": "#17233d", "navy": "#17233d",
    "bleu": "#36608d", "blue": "#36608d", "bleu ciel": "#91b9d0",
    "rose": "#c9828e", "pink": "#c9828e", "rose fushia": "#b73577",
    "rouge": "#a7473e", "jaune": "#d0a53a", "marron": "#6f4a35",
    "orange": "#c8733d", "violet": "#765d87", "vert": "#627b54",
    "kaki": "#6f7351", "bordeaux": "#6e2639", "saumon": "#d79079",
}

COLOR_EN = {
    "noir": "Black", "blanc": "White", "beige": "Beige", "gris": "Gray",
    "bleu marine": "Navy", "bleu": "Blue", "rose": "Pink", "rouge": "Red",
    "jaune": "Yellow", "marron": "Brown", "orange": "Orange", "violet": "Purple",
    "vert": "Green", "kaki": "Khaki", "bordeaux": "Burgundy", "saumon": "Salmon",
    "blanc casse": "Off-white", "metal": "Metal",
}

COLOR_AR = {
    "noir": "اسود", "blanc": "ابيض", "beige": "بيج", "gris": "رمادي",
    "bleu marine": "كحلي", "bleu": "ازرق", "rose": "وردي", "rouge": "احمر",
    "jaune": "اصفر", "marron": "بني", "orange": "برتقالي", "violet": "بنفسجي",
    "vert": "اخضر", "kaki": "كاكي", "bordeaux": "عنابي", "saumon": "سلموني",
    "blanc casse": "اوف وايت", "metal": "معدني",
}


def clean(value: Any) -> str:
    text = str(value or "").replace("\ufffd", "").strip()
    text = re.sub(r"\s+", " ", text)
    return text.strip(" -")


def fold(value: Any) -> str:
    text = unicodedata.normalize("NFKD", clean(value)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", text.casefold()).strip()


def slug(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "-", fold(value)).strip("-") or "produit"


def color_key(value: Any) -> str:
    value = clean(value).casefold()
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"\s+", " ", value).strip()
    aliases = {
        "blanche": "blanc", "white": "blanc", "noire": "noir", "black": "noir",
        "gray": "gris", "grey": "gris", "griis": "gris", "navy": "bleu marine",
        "blue": "bleu", "pink": "rose", "soman": "saumon", "somon": "saumon",
        "lanc": "blanc", "bordou": "bordeaux", "blanc cass": "blanc casse",
        "blanc cassee": "blanc casse", "none": "non renseignee",
    }
    return aliases.get(value, value or "non renseignee")


def color_entry(name: str, image: str | None = None) -> dict[str, Any]:
    color = color_key(name)
    label_fr = "Non renseignee" if color == "non renseignee" else color.capitalize()
    return {
        "id": slug(color),
        "label": {
            "fr": label_fr,
            "ar": COLOR_AR.get(color, label_fr),
            "en": COLOR_EN.get(color, label_fr),
        },
        "hex": HEX.get(color, "#8a8882"),
        "image": image,
        "imageKind": "source" if image else "missing",
    }


def category_from_name(name: str, default: str = "femme") -> str:
    n = fold(name)
    if any(word in n for word in ("garcon", "boy", "fille", "girl", "kids", "child")):
        return "enfants"
    if any(word in n for word in ("homme", "men", "mens")):
        return "homme"
    if any(word in n for word in ("chaussette", "socks", "collant", "tight", "jambiere")):
        return "autres"
    return default


def subcategory(category: str, name: str) -> str | None:
    n = fold(name)
    if category == "femme":
        if re.search(r"corset|gainant|shaper", n):
            return "corsets"
        if re.search(r"soutien|brassiere|bra", n):
            return "soutien-gorge"
        if re.search(r"body|bretelle|caraco", n):
            return "bodies"
        if "collant" in n or "tight" in n:
            return "collants"
        if "chaussette" in n or "sock" in n:
            return "chaussettes"
        if "nuisette" in n or "chemise de nuit" in n or "pyjama" in n:
            return "nuisettes"
        if re.search(r"boxer|culotte|slip", n):
            return "culottes"
        return "vetements"
    if category == "homme":
        if re.search(r"boxer|slip|brief", n):
            return "sous-vetements"
        if re.search(r"corset|gainant|shaper", n):
            return "corsets"
        return "hauts"
    if category == "enfants":
        if re.search(r"garcon|boy", n):
            return "garcon"
        if re.search(r"fille|girl", n):
            return "fille"
        if re.search(r"chaussette|sock", n):
            return "chaussettes"
        return "collants"
    return None


def sale_price(regular: float | None, stock: float) -> int | None:
    if regular is None:
        return None
    return int((Decimal(str(regular)) * Decimal("0.70")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        return None


def read_alsamah() -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if not ALSAMAH_BOOK.exists():
        return groups
    ws = load_workbook(ALSAMAH_BOOK, read_only=True, data_only=True).active
    rows = ws.iter_rows(values_only=True)
    headers = [clean(value) for value in next(rows)]
    for row in rows:
        item = dict(zip(headers, row))
        name = clean(item.get("DESCRIPTION"))
        if not name:
            continue
        groups[slug(name)].append(item)
    return groups


def elko_base_name(description: str) -> str:
    return re.sub(r"\s*-\s*(XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|6XL)\s*-\s*(White|Black)\s*$", "", clean(description), flags=re.I)


def read_elko() -> list[dict[str, Any]]:
    if not ELKO_BOOK.exists():
        return []
    workbook = load_workbook(ELKO_BOOK, read_only=True, data_only=True)
    products: list[dict[str, Any]] = []
    used: set[str] = set()
    for ws in workbook.worksheets:
        rows = ws.iter_rows(values_only=True)
        headers = [clean(value) for value in next(rows)]
        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            item = dict(zip(headers, row))
            name = elko_base_name(item.get("DESCRIPTION"))
            if name:
                groups[name].append(item)
        for name, variants in groups.items():
            category = "homme" if ws.title.upper() == "MEN" else "femme"
            product_id = f"elko-{slug(name)}"
            base = product_id
            suffix = 2
            while product_id in used:
                product_id = f"{base}-{suffix}"
                suffix += 1
            used.add(product_id)
            prices = [number(item.get("PRIX DE VENTE")) for item in variants]
            prices = [price for price in prices if price is not None]
            regular = float(median(prices)) if prices else None
            stock = sum(max(0, number(item.get("QUANTITE")) or 0) for item in variants)
            colors = []
            for color in dict.fromkeys(color_key(item.get("Color")) for item in variants):
                colors.append(color_entry(color))
            variant_rows = []
            for item in variants:
                qty = max(0, int(number(item.get("QUANTITE")) or 0))
                variant_rows.append({
                    "id": clean(item.get("Code Barre")) or f"{product_id}-{slug(item.get('Size'))}-{slug(item.get('Color'))}",
                    "colorId": slug(color_key(item.get("Color"))),
                    "size": clean(item.get("Size")) or "TU",
                    "stock": qty,
                    "barcode": clean(item.get("Code Barre")) or None,
                })
            products.append({
                "id": product_id,
                "brand": "ELKO",
                "category": category,
                "categoryName": "Homme" if category == "homme" else "Fashion Femme",
                "subcategory": subcategory(category, name),
                "name": {"fr": name, "ar": name, "en": name},
                "short": {
                    "fr": f"{name}, selection ELKO.",
                    "ar": name,
                    "en": f"{name}, an ELKO essential.",
                },
                "description": {
                    "fr": "Produit ELKO disponible dans les tailles et couleurs indiquees.",
                    "ar": name,
                    "en": "ELKO product available in the listed sizes and colors.",
                },
                "regularPrice": regular,
                "price": sale_price(regular, stock),
                "stock": stock,
                "sizes": sorted({variant["size"] for variant in variant_rows}),
                "colors": colors,
                "variants": variant_rows,
                "purchasable": bool(regular and stock > 0),
                "imageStatus": "missing",
                "fallbackImage": False,
                "sourcePage": None,
                "sourceWorkbook": ELKO_BOOK.name,
                "variantCount": len(variant_rows),
                "missing": {"price": regular is None, "category": False, "image": True},
            })
    return products


def enrich_existing(product: dict[str, Any], source_groups: dict[str, list[dict[str, Any]]]) -> None:
    group = source_groups.get(product["id"]) or source_groups.get(slug(product["name"]["fr"]))
    if group:
        prices = [number(item.get("PRIX DE VENTE")) for item in group]
        prices = [price for price in prices if price is not None]
        regular = float(median(prices)) if prices else product.get("regularPrice")
        variants = []
        for item in group:
            qty = max(0, int(number(item.get("QUANTITE")) or 0))
            variants.append({
                "id": clean(item.get("Code Barre")) or f"{product['id']}-{slug(item.get('Size'))}-{slug(item.get('Color'))}",
                "colorId": slug(color_key(item.get("Color"))),
                "size": clean(item.get("Size")) or "TU",
                "stock": qty,
                "barcode": clean(item.get("Code Barre")) or None,
            })
        product["variants"] = variants
        product["stock"] = sum(variant["stock"] for variant in variants)
        product["variantCount"] = len(variants)
        product["regularPrice"] = regular
        product["price"] = sale_price(regular, product["stock"])
        product["sizes"] = sorted({variant["size"] for variant in variants}) or product.get("sizes", [])
        existing_colors = {color["id"] for color in product.get("colors", [])}
        for item in group:
            color = color_key(item.get("Color"))
            color_id = slug(color)
            if color_id not in existing_colors:
                product.setdefault("colors", []).append(color_entry(color))
                existing_colors.add(color_id)

    if product.get("category") == "non-classe" or product.get("missing", {}).get("category"):
        category = category_from_name(product["name"]["fr"])
        product["category"] = category
        product["categoryName"] = {"femme": "Fashion Femme", "homme": "Homme", "enfants": "Enfants", "autres": "Hosiery & Accessories"}[category]
        product["subcategory"] = subcategory(category, product["name"]["fr"])
        product.setdefault("missing", {})["category"] = False

    has_real_image = False
    for color in product.get("colors", []):
        if color.get("image"):
            if color.get("imageKind") != "fallback":
                has_real_image = True
            continue
        color["image"] = None
        color["imageKind"] = "missing"
        color.pop("fallbackImage", None)
    if not product.get("colors"):
        product["colors"] = [color_entry("non renseignee")]

    has_any_image = any(color.get("image") for color in product["colors"])
    if product.get("imageStatus") == "missing" or not has_real_image:
        product["imageStatus"] = "source" if has_real_image else "missing"
    product["fallbackImage"] = False
    product.setdefault("missing", {})["image"] = not has_any_image
    product["purchasable"] = bool(product.get("price") is not None and product.get("stock", 0) > 0)


def normalize_prices(products: list[dict[str, Any]]) -> None:
    for product in products:
        regular = product.get("regularPrice")
        product["price"] = sale_price(float(regular), float(product.get("stock") or 0)) if regular is not None else None
        product.setdefault("missing", {})["price"] = regular is None
        product["purchasable"] = bool(product["price"] is not None and product.get("stock", 0) > 0)


def main() -> None:
    products = json.loads(CATALOG.read_text(encoding="utf-8"))
    source_groups = read_alsamah()
    for product in products:
        enrich_existing(product, source_groups)

    products_by_id = {product["id"]: product for product in products}
    for product in read_elko():
        existing = products_by_id.get(product["id"])
        if existing is None:
            products.append(product)
            products_by_id[product["id"]] = product
            continue

        images_by_color = {
            color.get("id"): {
                key: color.get(key)
                for key in ("image", "imageKind", "lifestyleImage", "fallbackImage")
                if color.get(key) is not None
            }
            for color in existing.get("colors", [])
        }
        existing.clear()
        existing.update(product)
        for color in existing.get("colors", []):
            preserved = images_by_color.get(color.get("id"))
            if preserved and preserved.get("image"):
                color.update(preserved)
        has_any_image = any(color.get("image") for color in existing.get("colors", []))
        existing["imageStatus"] = (
            "generated"
            if any(color.get("imageKind") == "generated" for color in existing.get("colors", []))
            else "source"
            if has_any_image
            else "missing"
        )
        existing["fallbackImage"] = False
        existing.setdefault("missing", {})["image"] = not has_any_image

    normalize_prices(products)

    products.sort(key=lambda product: (
        product.get("brand") != "ALSAMAH",
        not product.get("purchasable"),
        -float(product.get("stock") or 0),
        product["name"]["fr"].casefold(),
    ))
    CATALOG.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "products": len(products),
        "with_images": sum(bool(product.get("colors")) and any(color.get("image") for color in product["colors"]) for product in products),
        "purchasable": sum(bool(product.get("purchasable")) for product in products),
        "missing_images": sum(product.get("missing", {}).get("image") for product in products),
        "elko": sum(product.get("brand") == "ELKO" for product in products),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()

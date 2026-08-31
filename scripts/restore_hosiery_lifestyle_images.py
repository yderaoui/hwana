from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CATALOG = ROOT / "src" / "data" / "catalog.json"
EXCEL_REPORT = ROOT / "src" / "data" / "excel-product-image-report.json"
OFFICIAL_REPORT = ROOT / "src" / "data" / "official-image-report.json"

MANUAL_MATCHES = {
    "collants-push-up": "/assets/official/push-up-tight-ultra-sheer-15-den.jpg",
    "push-up-collants-l-10": "/assets/official/push-up-tight-ultra-sheer-15-den.jpg",
    "collants-fishnet": "/assets/official/fashion-large-fishnet-80-den-pantyhose.jpg",
    "collants-resille": "/assets/official/fashion-large-fishnet-80-den-pantyhose.jpg",
    "jambieres-leen": "/assets/official/leen-girls-legging.jpg",
    "collants-brillants-enfant": "/assets/official/silky-30-d.jpg",
}

HOSIERY_WORDS = ("collant", "tight", "pantyhose", "resille")


def exists(public_url: str | None) -> bool:
    return bool(public_url and public_url.startswith("/assets/") and (PUBLIC / public_url.lstrip("/")).exists())


def read_report(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    entries = json.loads(path.read_text(encoding="utf-8"))
    matches = {}
    for entry in entries:
        product_id = entry["catalogId" if "catalogId" in entry else "id"]
        text = " ".join(str(entry.get(key) or "") for key in ("catalogId", "id", "catalogName", "name", "officialTitle", "officialHandle"))
        if not any(word in text.casefold() for word in HOSIERY_WORDS):
            continue
        if entry.get("image") and exists(entry.get("image")):
            matches[product_id] = entry["image"]
    return matches


def main() -> int:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    image_by_id = {}
    image_by_id.update(read_report(EXCEL_REPORT))
    image_by_id.update(read_report(OFFICIAL_REPORT))
    image_by_id.update({key: value for key, value in MANUAL_MATCHES.items() if exists(value)})

    target_ids = set(image_by_id)
    restored = []
    cleaned = []
    for product in catalog:
        is_target = product.get("subcategory") == "collants" or product.get("id") in target_ids
        lifestyle_image = image_by_id.get(product["id"])
        for color in product.get("colors", []):
            current = color.get("lifestyleImage")
            if is_target and lifestyle_image:
                color["lifestyleImage"] = lifestyle_image
            elif current and not str(current).startswith("/assets/lifestyle/"):
                color.pop("lifestyleImage", None)
                cleaned.append(product["id"])
        if is_target and lifestyle_image:
            restored.append(product["id"])

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"restoredProducts": len(set(restored)), "cleanedProducts": len(set(cleaned)), "products": sorted(set(restored))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

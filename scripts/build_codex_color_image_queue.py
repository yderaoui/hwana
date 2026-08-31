from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CATALOG = ROOT / "src" / "data" / "catalog.json"
QUEUE = ROOT / "src" / "data" / "codex-color-image-queue.json"
EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".avif")


def public_path(asset: str | None) -> Path | None:
    if not asset or not asset.startswith("/assets/"):
        return None
    path = PUBLIC / asset.removeprefix("/")
    return path if path.exists() else None


def generic_reference(product_id: str) -> Path | None:
    directories = (
        PUBLIC / "assets" / "excel-products" / "alsamah-url",
        PUBLIC / "assets" / "official",
        PUBLIC / "assets" / "remote-products",
        PUBLIC / "assets" / "source",
        PUBLIC / "assets" / "products",
    )
    for directory in directories:
        for suffix in EXTENSIONS:
            candidate = directory / f"{product_id}{suffix}"
            if candidate.exists():
                return candidate
        candidates = sorted(
            path
            for path in directory.glob(f"{product_id}-*")
            if path.suffix.casefold() in EXTENSIONS
        )
        if candidates:
            return candidates[0]
    return None


def choose_reference(product: dict[str, Any], color: dict[str, Any], repeated: Counter[str]) -> Path | None:
    current = public_path(color.get("image"))
    if current and not str(color.get("image", "")).startswith("/assets/generated/colors/"):
        return current

    for sibling in product.get("colors", []):
        sibling_image = sibling.get("image")
        candidate = public_path(sibling_image)
        if (
            candidate
            and not str(sibling_image).startswith("/assets/generated/colors/")
            and repeated[str(sibling_image)] == 1
        ):
            return candidate

    return generic_reference(product["id"])


def main() -> None:
    products = json.loads(CATALOG.read_text(encoding="utf-8"))
    jobs: list[dict[str, Any]] = []

    for product in products:
        image_counts = Counter(
            color.get("image") for color in product.get("colors", []) if color.get("image")
        )
        for color in product.get("colors", []):
            image = color.get("image")
            reasons = []
            if not image:
                reasons.append("missing")
            if str(image or "").startswith("/assets/generated/colors/"):
                reasons.append("icon")
            if image and image_counts[image] > 1:
                reasons.append("reused")
            if not reasons:
                continue

            reference = choose_reference(product, color, image_counts)
            color_label = color.get("label", {}).get("fr") or color["id"]
            jobs.append({
                "productId": product["id"],
                "productName": product["name"]["fr"],
                "category": product.get("subcategory") or product.get("category"),
                "colorId": color["id"],
                "colorLabel": color_label,
                "reason": reasons,
                "currentImage": image,
                "referencePath": str(reference.resolve()) if reference else None,
                "outputPath": str((
                    PUBLIC
                    / "assets"
                    / "generated"
                    / "imagegen"
                    / f"{product['id']}-{color['id']}.png"
                ).resolve()),
            })

    QUEUE.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "jobs": len(jobs),
        "products": len({job["productId"] for job in jobs}),
        "withReference": sum(bool(job["referencePath"]) for job in jobs),
        "withoutReference": sum(not job["referencePath"] for job in jobs),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()

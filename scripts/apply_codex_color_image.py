from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "data" / "catalog.json"


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply one generated Codex product image to one catalog color.")
    parser.add_argument("product_id")
    parser.add_argument("color_id")
    parser.add_argument("image_path", help="Storefront image path, for example /assets/generated/products/item-noir.png")
    args = parser.parse_args()

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    product = next((item for item in catalog if item.get("id") == args.product_id), None)
    if not product:
        raise SystemExit(f"Unknown product id: {args.product_id}")

    color = next((item for item in product.get("colors", []) if item.get("id") == args.color_id), None)
    if not color:
        raise SystemExit(f"Unknown color id for {args.product_id}: {args.color_id}")

    asset = ROOT / "public" / args.image_path.lstrip("/")
    if not asset.exists():
        raise SystemExit(f"Image file does not exist: {asset}")

    color["image"] = args.image_path
    color["imageKind"] = "generated"
    product["imageStatus"] = "generated" if any(item.get("imageKind") == "generated" for item in product.get("colors", [])) else "source"
    product.setdefault("missing", {})["image"] = not any(item.get("image") for item in product.get("colors", []))

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"updated": args.product_id, "color": args.color_id, "image": args.image_path}, ensure_ascii=False))


if __name__ == "__main__":
    main()

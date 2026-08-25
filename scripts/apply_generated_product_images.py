import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
catalog_path = root / "src/data/catalog.json"
manifest_path = root / "src/data/pending-generated-images.json"
catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
products = {product["id"]: product for product in catalog}
applied = 0

for item in manifest:
    asset = root / "public" / item["path"].lstrip("/")
    product = products.get(item["productId"])
    if not asset.exists() or not product:
        continue
    variant = next((color for color in product["colors"] if color["id"] == item["colorId"]), None)
    if not variant:
        continue
    variant["image"] = item["path"]
    variant["imageKind"] = "generated"
    applied += 1

for product in catalog:
    has_image = any(color.get("image") for color in product["colors"])
    if has_image:
        product["imageStatus"] = "generated" if any(color.get("imageKind") == "generated" for color in product["colors"]) else "source"
        product["missing"]["image"] = False

catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"applied": applied, "requested": len(manifest)}))

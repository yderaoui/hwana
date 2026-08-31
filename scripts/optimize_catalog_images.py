from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CATALOG = ROOT / "src" / "data" / "catalog.json"
OUTPUT = PUBLIC / "assets" / "catalog"
MAX_EDGE = 1600
QUALITY = 90


def public_path(asset: str) -> Path:
    if not asset.startswith("/assets/"):
        raise ValueError(f"Unsupported catalog image path: {asset}")
    path = (PUBLIC / asset.removeprefix("/")).resolve()
    if PUBLIC.resolve() not in path.parents:
        raise ValueError(f"Catalog image escapes public directory: {asset}")
    return path


def webp_bytes(source: Path) -> bytes:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        has_alpha = image.mode in {"RGBA", "LA"} or "transparency" in image.info
        image = image.convert("RGBA" if has_alpha else "RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, "WEBP", quality=QUALITY, method=6, exact=has_alpha)
        return output.getvalue()


def main() -> None:
    products: list[dict[str, Any]] = json.loads(CATALOG.read_text(encoding="utf-8"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source_bytes = 0
    output_bytes = 0
    converted = 0

    for product in products:
        for color in product.get("colors", []):
            asset = color.get("image")
            if not asset:
                raise ValueError(f"Missing image for {product['id']}:{color['id']}")
            source = public_path(asset)
            if not source.exists():
                raise FileNotFoundError(source)

            destination = OUTPUT / f"{product['id']}-{color['id']}.webp"
            if source.resolve() != destination.resolve():
                data = webp_bytes(source)
                if not destination.exists() or destination.read_bytes() != data:
                    destination.write_bytes(data)
                source_bytes += source.stat().st_size
                converted += 1
            output_bytes += destination.stat().st_size
            color["image"] = "/assets/catalog/" + destination.name

    CATALOG.write_text(
        json.dumps(products, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "products": len(products),
        "images": sum(len(product.get("colors", [])) for product in products),
        "converted": converted,
        "sourceMB": round(source_bytes / 1024 / 1024, 2),
        "outputMB": round(output_bytes / 1024 / 1024, 2),
    }))


if __name__ == "__main__":
    main()

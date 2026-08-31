from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "data" / "catalog.json"
SCHEMA = ROOT / "database" / "schema.sql"
DEFAULT_DB = ROOT / "database" / "hawana-products.sqlite"


def localized(value: dict[str, Any] | None, locale: str) -> str:
    if not isinstance(value, dict):
        return ""
    return str(value.get(locale) or "").strip()


def as_int(value: Any) -> int:
    if value in (None, ""):
        return 0
    return int(value)


def as_float(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    return float(value)


def rebuild_database(db_path: Path) -> dict[str, int]:
    products = json.loads(CATALOG.read_text(encoding="utf-8"))
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript("DROP VIEW IF EXISTS ready_products;")
        connection.executescript("DROP VIEW IF EXISTS inventory_by_brand;")
        connection.executescript("DROP TABLE IF EXISTS build_metadata;")
        connection.executescript("DROP TABLE IF EXISTS variants;")
        connection.executescript("DROP TABLE IF EXISTS product_colors;")
        connection.executescript("DROP TABLE IF EXISTS products;")
        connection.executescript(SCHEMA.read_text(encoding="utf-8"))

        for product in products:
            connection.execute(
                """
                INSERT INTO products (
                  id, brand, category, category_name, subcategory,
                  name_fr, name_ar, name_en,
                  short_fr, short_ar, short_en,
                  description_fr, description_ar, description_en,
                  regular_price, sale_price, discount_percent,
                  total_stock, variant_count, purchasable, image_status,
                  source_page, source_workbook
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    product["id"],
                    product.get("brand", ""),
                    product.get("category", ""),
                    product.get("categoryName", ""),
                    product.get("subcategory"),
                    localized(product.get("name"), "fr"),
                    localized(product.get("name"), "ar"),
                    localized(product.get("name"), "en"),
                    localized(product.get("short"), "fr"),
                    localized(product.get("short"), "ar"),
                    localized(product.get("short"), "en"),
                    localized(product.get("description"), "fr"),
                    localized(product.get("description"), "ar"),
                    localized(product.get("description"), "en"),
                    as_float(product.get("regularPrice")),
                    as_int(product.get("price")),
                    30,
                    as_int(product.get("stock")),
                    as_int(product.get("variantCount") or len(product.get("variants", []))),
                    1 if product.get("purchasable") else 0,
                    product.get("imageStatus"),
                    product.get("sourcePage"),
                    product.get("sourceWorkbook"),
                ),
            )

            for color in product.get("colors", []):
                if not color.get("image"):
                    continue
                connection.execute(
                    """
                    INSERT INTO product_colors (
                      product_id, color_id, label_fr, label_ar, label_en, hex, image_path, image_kind
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        product["id"],
                        color.get("id", ""),
                        localized(color.get("label"), "fr"),
                        localized(color.get("label"), "ar"),
                        localized(color.get("label"), "en"),
                        color.get("hex"),
                        color.get("image"),
                        color.get("imageKind"),
                    ),
                )

            known_colors = {color.get("id") for color in product.get("colors", [])}
            for index, variant in enumerate(product.get("variants", []), start=1):
                color_id = variant.get("colorId")
                if color_id not in known_colors:
                    color_id = None
                connection.execute(
                    """
                    INSERT INTO variants (
                      id, product_id, barcode, color_id, size, stock, regular_price, sale_price
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(variant.get("id") or f"{product['id']}-{index}"),
                        product["id"],
                        variant.get("barcode"),
                        color_id,
                        variant.get("size"),
                        as_int(variant.get("stock")),
                        as_float(variant.get("regularPrice")),
                        as_int(variant.get("price")),
                    ),
                )

        metadata = {
            "source_catalog": str(CATALOG.relative_to(ROOT)).replace("\\", "/"),
            "built_at_utc": datetime.now(timezone.utc).isoformat(),
        }
        connection.executemany(
            "INSERT INTO build_metadata (key, value) VALUES (?, ?)",
            metadata.items(),
        )

        stats = {
            "products": connection.execute("SELECT COUNT(*) FROM products").fetchone()[0],
            "variants": connection.execute("SELECT COUNT(*) FROM variants").fetchone()[0],
            "colors": connection.execute("SELECT COUNT(*) FROM product_colors").fetchone()[0],
            "brands": connection.execute("SELECT COUNT(DISTINCT brand) FROM products").fetchone()[0],
            "missing_images": connection.execute(
                "SELECT COUNT(*) FROM product_colors WHERE image_path IS NULL OR image_path = ''"
            ).fetchone()[0],
            "not_purchasable": connection.execute(
                "SELECT COUNT(*) FROM products WHERE purchasable = 0"
            ).fetchone()[0],
        }

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the HAWANA SQLite product database.")
    parser.add_argument("--out", type=Path, default=DEFAULT_DB, help="SQLite database output path")
    args = parser.parse_args()

    stats = rebuild_database(args.out)
    print(f"Created {args.out}")
    for key, value in stats.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()


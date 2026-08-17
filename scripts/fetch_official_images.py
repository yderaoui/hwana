"""Fill missing storefront images from exact matches on alsamah.com only.

Matches use either the official product handle already present in the workbook
or an exact normalized English title. No fuzzy matches and no invented assets.
"""

from __future__ import annotations

import json
import mimetypes
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "src" / "data" / "catalog.json"
ASSET_DIR = ROOT / "public" / "assets" / "official"
REPORT_PATH = ROOT / "src" / "data" / "official-image-report.json"
FEED_URL = "https://www.alsamah.com/products.json?limit=250&page={}"
USER_AGENT = "Mozilla/5.0 (compatible; HawanaCatalog/1.0)"


def fetch_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text.casefold()).split())


def handle_from_url(value: str | None) -> str | None:
    if not value or "alsamah.com" not in value.casefold() or "/products/" not in value:
        return None
    return value.split("/products/", 1)[1].split("?", 1)[0].strip("/") or None


def extension_for(url: str, content_type: str | None) -> str:
    suffix = Path(urlparse(url).path).suffix.casefold()
    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".avif"}:
        return ".jpg" if suffix == ".jpeg" else suffix
    guessed = mimetypes.guess_extension((content_type or "").split(";", 1)[0])
    return ".jpg" if guessed in {None, ".jpe", ".jpeg"} else guessed


def download_image(url: str, handle: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
    with urlopen(request, timeout=90) as response:
        payload = response.read()
        suffix = extension_for(url, response.headers.get("Content-Type"))
    destination = ASSET_DIR / f"{handle}{suffix}"
    destination.write_bytes(payload)
    return f"/assets/official/{destination.name}"


def main() -> None:
    official_products: list[dict] = []
    for page in range(1, 11):
        batch = fetch_json(FEED_URL.format(page)).get("products", [])
        if not batch:
            break
        official_products.extend(batch)
        if len(batch) < 250:
            break

    by_handle = {product["handle"]: product for product in official_products if product.get("handle")}
    title_groups: dict[str, list[dict]] = defaultdict(list)
    for product in official_products:
        title_groups[normalize(product.get("title", ""))].append(product)

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    report: list[dict] = []
    for product in catalog:
        if product.get("imageStatus") != "missing":
            continue
        match = None
        method = None
        workbook_handle = handle_from_url(product.get("sourcePage"))
        if workbook_handle and workbook_handle in by_handle:
            match = by_handle[workbook_handle]
            method = "workbook_product_url"
        else:
            exact_titles = title_groups.get(normalize(product.get("name", {}).get("en", "")), [])
            if len(exact_titles) == 1:
                match = exact_titles[0]
                method = "exact_english_title"
        if not match or not match.get("images"):
            continue

        image_url = match["images"][0].get("src")
        if not image_url or "cdn.shopify.com" not in image_url.casefold():
            continue
        try:
            local_path = download_image(image_url, match["handle"])
        except Exception as error:
            report.append({"catalogId": product["id"], "status": "download_failed", "error": str(error)})
            continue

        for color in product.get("colors", []):
            if not color.get("image"):
                color["image"] = local_path
                color["imageKind"] = "source"
        product["imageStatus"] = "source"
        product["missing"]["image"] = False
        report.append({
            "catalogId": product["id"],
            "catalogName": product["name"]["en"],
            "officialTitle": match["title"],
            "officialHandle": match["handle"],
            "method": method,
            "image": local_path,
            "status": "matched",
        })

    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    status_counts = Counter(item["status"] for item in report)
    remaining = sum(product.get("imageStatus") == "missing" for product in catalog)
    print(json.dumps({
        "official_products_checked": len(official_products),
        "matched_and_downloaded": status_counts["matched"],
        "download_failed": status_counts["download_failed"],
        "remaining_without_image": remaining,
        "report": str(REPORT_PATH),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()

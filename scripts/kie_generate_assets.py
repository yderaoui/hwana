"""Generate verified HAWANA storefront assets through Kie.ai.

The script never invents products. It only schedules jobs when a catalog product
already has a local source image. It is resumable and downloads every successful
result immediately because Kie result URLs are temporary.

Examples:
  python scripts/kie_generate_assets.py --plan
  python scripts/kie_generate_assets.py --credits
  python scripts/kie_generate_assets.py --colors --max-jobs 10
  python scripts/kie_generate_assets.py --lifestyle --max-jobs 6
  python scripts/kie_generate_assets.py --video
  python scripts/kie_generate_assets.py --all
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "src" / "data" / "catalog.json"
CAMPAIGN_MEDIA_PATH = ROOT / "src" / "data" / "campaign-media.json"
STATE_PATH = ROOT / "tmp" / "kie-generation-state.json"
PUBLIC = ROOT / "public"
API_BASE = "https://api.kie.ai"
UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def slug(value: str) -> str:
    clean = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return clean or "item"


def local_asset(url: str | None) -> Path | None:
    if not url or not url.startswith("/assets/"):
        return None
    path = PUBLIC / url.lstrip("/")
    return path if path.exists() else None


def read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class KieClient:
    def __init__(self, api_key: str) -> None:
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {api_key}"})

    def credits(self) -> float:
        response = self.session.get(f"{API_BASE}/api/v1/chat/credit", timeout=30)
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != 200:
            raise RuntimeError(payload.get("msg", "Unable to read Kie credits"))
        return float(payload["data"])

    def upload(self, path: Path) -> str:
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        with path.open("rb") as handle:
            response = self.session.post(
                UPLOAD_URL,
                files={"file": (path.name, handle, mime)},
                data={"uploadPath": "images/hawana", "fileName": f"{int(time.time())}-{path.name}"},
                timeout=180,
            )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("success"):
            raise RuntimeError(payload.get("msg", "Kie upload failed"))
        data = payload.get("data", {})
        url = data.get("downloadUrl") or data.get("fileUrl")
        if not url:
            raise RuntimeError("Kie upload response did not include a URL")
        return str(url)

    def create_task(self, model: str, inputs: dict[str, Any]) -> str:
        response = self.session.post(
            f"{API_BASE}/api/v1/jobs/createTask",
            json={"model": model, "input": inputs},
            timeout=60,
        )
        if response.status_code == 402:
            raise RuntimeError("Kie credits exhausted")
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != 200:
            raise RuntimeError(payload.get("msg", "Kie task creation failed"))
        return str(payload["data"]["taskId"])

    def wait(self, task_id: str, timeout_seconds: int = 900) -> tuple[str, float]:
        started = time.time()
        delay = 3.0
        while time.time() - started < timeout_seconds:
            response = self.session.get(
                f"{API_BASE}/api/v1/jobs/recordInfo",
                params={"taskId": task_id},
                timeout=45,
            )
            response.raise_for_status()
            payload = response.json()
            data = payload.get("data") or {}
            state = data.get("state")
            if state == "success":
                raw_result = data.get("resultJson") or "{}"
                result = json.loads(raw_result) if isinstance(raw_result, str) else raw_result
                urls = result.get("resultUrls") or result.get("urls") or []
                if not urls:
                    raise RuntimeError(f"Kie task {task_id} succeeded without a result URL")
                return str(urls[0]), float(data.get("creditsConsumed") or 0)
            if state == "fail":
                raise RuntimeError(data.get("failMsg") or f"Kie task {task_id} failed")
            time.sleep(delay)
            delay = min(delay * 1.35, 20)
        raise TimeoutError(f"Timed out waiting for Kie task {task_id}")

    def download(self, url: str, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with requests.get(url, stream=True, timeout=180) as response:
            response.raise_for_status()
            with destination.open("wb") as handle:
                for chunk in response.iter_content(1024 * 256):
                    if chunk:
                        handle.write(chunk)


def source_for(product: dict[str, Any]) -> Path | str | None:
    for color in product.get("colors", []):
        image = color.get("image")
        candidate = local_asset(image)
        if candidate:
            return candidate
        if isinstance(image, str) and image.startswith(("https://", "http://")):
            return image
    return None


def color_jobs(catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    for product in catalog:
        reference = source_for(product)
        if not reference or len(product.get("colors", [])) < 2:
            continue
        for color in product["colors"]:
            destination = PUBLIC / "assets" / "generated" / "colors" / f"{slug(product['id'])}-{slug(color['id'])}.png"
            if destination.exists() or color.get("imageKind") == "generated":
                continue
            jobs.append({"kind": "color", "product": product, "color": color, "reference": reference, "destination": destination})
    return jobs


def lifestyle_jobs(catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    for product in catalog:
        reference = source_for(product)
        if not reference or not product.get("purchasable"):
            continue
        color = product.get("colors", [{}])[0]
        if color.get("lifestyleImage"):
            continue
        destination = PUBLIC / "assets" / "generated" / "lifestyle" / f"{slug(product['id'])}-{slug(color.get('id', 'default'))}-worn.png"
        if destination.exists():
            continue
        jobs.append({"kind": "lifestyle", "product": product, "color": color, "reference": reference, "destination": destination})
    return jobs


def prompt_for(job: dict[str, Any]) -> str:
    product = job["product"]
    color = job["color"]
    name = product["name"].get("en") or product["name"].get("fr")
    color_name = color["label"].get("en") or color["label"].get("fr")
    if job["kind"] == "lifestyle":
        return (
            f"Create a premium fashion editorial photograph of a person naturally wearing the exact {name} shown in the reference, in {color_name}. "
            "Preserve the garment's cut, seams, neckline, sleeve length, proportions, fabric texture, and every construction detail exactly. "
            "Neutral warm studio, confident natural posture, full garment visible, realistic skin and fabric, soft directional light. "
            "Do not add logos, text, patterns, accessories covering the garment, or any extra product."
        )
    return (
        f"Recolor the exact {name} in the reference to {color_name}. Preserve the product's cut, seams, neckline, sleeve length, proportions, "
        "fabric texture, folds, packaging, and every construction detail exactly. Clean premium e-commerce studio image on a warm off-white background, "
        "centered product, soft natural shadow. Do not redesign the garment. Do not add logos, text, patterns, people, props, or extra pieces."
    )


def update_catalog_for_job(catalog: list[dict[str, Any]], job: dict[str, Any]) -> None:
    public_url = "/" + job["destination"].relative_to(PUBLIC).as_posix()
    for product in catalog:
        if product["id"] != job["product"]["id"]:
            continue
        for color in product.get("colors", []):
            if color["id"] != job["color"]["id"]:
                continue
            if job["kind"] == "color":
                color["image"] = public_url
                color["imageKind"] = "generated"
            else:
                color["lifestyleImage"] = public_url
        if job["kind"] == "color":
            product["imageStatus"] = "generated"
            product["missing"]["image"] = False


def run_jobs(client: KieClient, catalog: list[dict[str, Any]], jobs: list[dict[str, Any]], maximum: int) -> int:
    image_model = os.getenv("KIE_IMAGE_MODEL", "grok-imagine/image-to-image")
    selected = jobs if maximum <= 0 else jobs[:maximum]
    state = read_json(STATE_PATH, {"completed": {}, "failed": {}})
    completed = 0
    for index, job in enumerate(selected, start=1):
        key = f"{job['kind']}:{job['product']['id']}:{job['color']['id']}"
        print(f"[{index}/{len(selected)}] {key}")
        try:
            remote_reference = client.upload(job["reference"]) if isinstance(job["reference"], Path) else job["reference"]
            task_id = client.create_task(image_model, {"prompt": prompt_for(job), "image_urls": [remote_reference]})
            result_url, consumed = client.wait(task_id)
            client.download(result_url, job["destination"])
            update_catalog_for_job(catalog, job)
            write_json(CATALOG_PATH, catalog)
            state["completed"][key] = {"taskId": task_id, "credits": consumed, "file": str(job["destination"].relative_to(ROOT))}
            state["failed"].pop(key, None)
            write_json(STATE_PATH, state)
            completed += 1
        except Exception as exc:  # Keep the resumable batch moving.
            state["failed"][key] = str(exc)
            write_json(STATE_PATH, state)
            print(f"  failed: {exc}", file=sys.stderr)
            if "credits exhausted" in str(exc).lower():
                break
    return completed


def generate_video(client: KieClient) -> None:
    reference = PUBLIC / "assets" / "lifestyle" / "round-neck-navy-worn.png"
    destination = PUBLIC / "assets" / "video" / "hawana-hero.mp4"
    remote_reference = client.upload(reference)
    task_id = client.create_task(
        os.getenv("KIE_VIDEO_MODEL", "grok-imagine-video-1-5-preview"),
        {
            "prompt": (
                "Cinematic fashion campaign motion from this exact ALSAMAH product photograph. Preserve the person, garment design, navy color, fit, neckline, "
                "seams and proportions exactly. Slow controlled camera push, subtle natural breathing and fabric movement, premium warm studio light, elegant franchise campaign. "
                "No morphing, no new clothing, no logos, no text, no props, no extra people, no product redesign. Seamless calm ending suitable for a website hero loop."
            ),
            "image_urls": [remote_reference],
            "aspect_ratio": "16:9",
            "resolution": os.getenv("KIE_VIDEO_RESOLUTION", "720p"),
            "duration": 8,
        },
    )
    result_url, consumed = client.wait(task_id)
    client.download(result_url, destination)
    media = read_json(CAMPAIGN_MEDIA_PATH, {"heroVideo": None})
    media["heroVideo"] = "/assets/video/hawana-hero.mp4"
    write_json(CAMPAIGN_MEDIA_PATH, media)
    print(f"Hero video saved ({consumed:g} credits): {destination.relative_to(ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", action="store_true", help="Show safe generation counts without calling Kie")
    parser.add_argument("--credits", action="store_true", help="Show remaining Kie credits")
    parser.add_argument("--colors", action="store_true", help="Generate source-locked color variants")
    parser.add_argument("--lifestyle", action="store_true", help="Generate source-locked worn views")
    parser.add_argument("--video", action="store_true", help="Generate the 720p hero film")
    parser.add_argument("--all", action="store_true", help="Run colors, lifestyle, and video until complete or credits run out")
    parser.add_argument("--max-jobs", type=int, default=0, help="Limit image jobs; 0 means all resumable jobs")
    args = parser.parse_args()

    catalog = read_json(CATALOG_PATH, [])
    colors = color_jobs(catalog)
    lifestyles = lifestyle_jobs(catalog)
    source_ready = sum(1 for product in catalog if source_for(product))
    missing_source = len(catalog) - source_ready

    if args.plan or not any((args.credits, args.colors, args.lifestyle, args.video, args.all)):
        print(f"Catalog products: {len(catalog)}")
        print(f"Products with a verified source reference: {source_ready}")
        print(f"Products blocked until a reference arrives: {missing_source}")
        print(f"Pending color jobs: {len(colors)}")
        print(f"Pending lifestyle jobs: {len(lifestyles)}")
        if args.plan:
            return 0

    load_env_file(ROOT / ".env")
    load_env_file(ROOT / ".env.local")
    api_key = os.getenv("KIE_API_KEY", "").strip()
    if not api_key:
        print("KIE_API_KEY is missing. Copy .env.example to .env and add the server-side key.", file=sys.stderr)
        return 2

    client = KieClient(api_key)
    print(f"Kie credits available: {client.credits():g}")
    if args.credits and not any((args.colors, args.lifestyle, args.video, args.all)):
        return 0
    if args.colors or args.all:
        print(f"Completed color jobs: {run_jobs(client, catalog, colors, args.max_jobs)}")
    if args.lifestyle or args.all:
        print(f"Completed lifestyle jobs: {run_jobs(client, catalog, lifestyles, args.max_jobs)}")
    if args.video or args.all:
        generate_video(client)
    print(f"Kie credits remaining: {client.credits():g}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

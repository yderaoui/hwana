"""Generate source-locked HAWANA campaign loops with Kie Grok Imagine Video.

Only existing, verified product photographs are accepted as references. Each
finished video is downloaded immediately and recorded in campaign-media.json.
"""

from __future__ import annotations

import argparse
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock

from kie_generate_assets import KieClient, PUBLIC, ROOT, load_env_file, read_json, write_json


VIDEO_JOBS = [
    {
        "key": "runwayHeroVideo",
        "source": "assets/storyboards/hero-runway-v2.png",
        "file": "hawana-runway-hero-v2.mp4",
        "model": "grok-imagine/image-to-video",
        "duration": "6",
        "prompt": "Animate this exact continuous 16:9 HAWANA fashion runway campaign. Preserve the adult man, adult woman and child identities, ages, faces, bodies, poses and every garment exactly. Preserve the navy round-neck shirt, off-white shirt, off-white child leggings, navy glossy hosiery display, fishnet display, orange circular aperture, stone floor and complete framing. Add a slow cinematic dolly, restrained natural breathing, slight fabric movement and a soft light sweep across the orange aperture. The child remains safely seated, age-appropriate and fully clothed. No product morphing, no wardrobe changes, no extra people, no boxers, no logos, no text, no props, no crop and no sexualized child styling. End calmly for a seamless website loop.",
    },
    {
        "key": "cinematicHeroVideo",
        "source": "assets/storyboards/hero-16x9.png",
        "file": "hawana-cinematic-hero-16x9.mp4",
        "prompt": "Animate this exact 16:9 HAWANA product triptych as a premium fashion house film. Preserve all three real products, people, faces, bodies, garment colors, garment cuts, panel boundaries, proportions and the complete widescreen composition. Create a slow controlled cinematic push with slight independent parallax inside each panel, subtle natural breathing and restrained studio light movement. No morphing between panels, no new products, no wardrobe changes, no logos, no text, no props, no extra people and no cropping. Keep the 16:9 frame and finish calmly for a seamless luxury website loop.",
    },
    {
        "key": "houseVideo",
        "source": "assets/storyboards/house-16x9.png",
        "file": "hawana-house-16x9.mp4",
        "prompt": "Animate this exact 16:9 ALSAMAH and ELKO brand-house composition with restrained premium motion. Preserve the authentic ALSAMAH and ELKO logos exactly without redrawing, spelling changes or deformation. Preserve the exact black bodysuit, its cut, proportions and color. Add only a very slow horizontal camera drift, subtle product shadow movement and soft light across the two fixed halves. No logo morphing, no changed text, no new branding, no new products, no people, no props and no crop. Finish smoothly for looping.",
    },
    {
        "key": "packVideo",
        "source": "assets/storyboards/pack-16x9.png",
        "file": "hawana-pack-16x9.mp4",
        "prompt": "Create a premium 16:9 pack-builder product film from this exact four-product HAWANA composition. Preserve the exact black tights, off-white bodysuit, navy round-neck shirt and striped ALSAMAH shorts, including every color, cut, seam, stripe, label, pack mark, proportion and the complete uncropped arrangement. Add a controlled slow camera arc with tiny depth-separated product movement and soft studio shadow motion. No morphing, no extra products, no removed products, no changed logos or labels, no text additions, no people and no redesign. Keep every product fully visible and end seamlessly.",
    },
    {
        "key": "heroVideo",
        "source": "assets/lifestyle/round-neck-navy-worn.png",
        "file": "hawana-hero.mp4",
        "prompt": "Premium fashion campaign motion from this exact ALSAMAH navy round-neck top photograph. Preserve the same person, garment design, navy color, fit, neckline, sleeves, seams, proportions and framing exactly. Slow controlled camera push, subtle natural breathing and minimal fabric movement, warm studio light. No morphing, no new clothing, no logos, no text, no props, no extra people, no product redesign. Calm seamless ending for a luxury website loop.",
    },
    {
        "key": "fitVideo",
        "source": "assets/lifestyle/v-neck-gray-worn.png",
        "file": "hawana-fit.mp4",
        "prompt": "Animate this exact gray V-neck ALSAMAH garment photograph as a restrained premium fashion film. Preserve the person, face, body, garment color, V neckline, sleeve length, seams, fabric, proportions and crop exactly. Add a gentle lateral camera drift and subtle realistic breathing only. No morphing, no wardrobe changes, no text, no logos, no accessories, no extra objects or people. End smoothly for looping.",
    },
    {
        "key": "bodyVideo",
        "source": "assets/lifestyle/body-offwhite-worn.png",
        "file": "hawana-body.mp4",
        "prompt": "Create elegant minimal motion from this exact off-white ALSAMAH bodysuit fashion photograph. Keep the exact person, garment construction, off-white color, neckline, straps, seams, fit, body proportions and composition unchanged. Very slow camera push with subtle natural posture movement and soft studio light shift. No redesign, morphing, new clothing, branding, text, props or extra people. Seamless quiet finish.",
    },
    {
        "key": "hosieryVideo",
        "source": "assets/generated/colors/collants-brillants-ete-dayana-bleu-marine.png",
        "file": "hawana-hosiery.mp4",
        "prompt": "Animate this exact navy glossy ALSAMAH hosiery product view. Preserve the tights' navy color, sheer density, shine, toe construction, silhouette, model legs, black skirt, pose, background and framing exactly. Add only a refined slow camera move and tiny natural balance shift. No morphing, no extra garments, no logos, no text, no props and no product redesign. Full product remains visible and the ending loops calmly.",
    },
    {
        "key": "kidsVideo",
        "source": "assets/official/striped-shorts.png",
        "file": "hawana-kids-shorts.mp4",
        "prompt": "Premium ecommerce product motion using these exact ALSAMAH striped shorts. Preserve every stripe, color, seam, waistband, cut, fabric texture, product count and construction detail exactly. Keep the full products visible. Add only a slow controlled studio camera orbit with restrained soft shadow movement on the existing neutral background. No people, no new products, no logos, no text, no props, no redesign or morphing. Seamless ending.",
    },
    {
        "key": "patternVideo",
        "source": "assets/official/girls-fishnet-tight.jpg",
        "file": "hawana-pattern.mp4",
        "prompt": "Create a restrained luxury product loop from this exact ALSAMAH patterned hosiery photograph. Preserve the exact knit pattern, color, product shape, package details, composition and full product visibility. Add only a subtle camera push and gentle studio light movement. No new products, no people, no changed pattern, no altered packaging, no added logos, no text, no props and no morphing. End seamlessly.",
    },
]

MEDIA_LOCK = Lock()


def generate(client: KieClient, job: dict[str, str], media: dict[str, str | None], force: bool) -> bool:
    source = PUBLIC / job["source"]
    destination = PUBLIC / "assets" / "video" / job["file"]
    if not source.exists():
        print(f"skip {job['key']}: missing verified source {source.relative_to(ROOT)}")
        return False
    if destination.exists() and not force:
        media[job["key"]] = "/" + destination.relative_to(PUBLIC).as_posix()
        print(f"keep {job['key']}: {destination.relative_to(ROOT)}")
        return True

    remote_reference = client.upload(source)
    task_input = {
            "prompt": job["prompt"],
            "image_urls": [remote_reference],
            "aspect_ratio": "16:9",
            "resolution": os.getenv("KIE_VIDEO_RESOLUTION", "720p"),
            "duration": job.get("duration", 8),
        }
    if job.get("model") == "grok-imagine/image-to-video":
        task_input["mode"] = "normal"
    task_id = client.create_task(
        job.get("model", os.getenv("KIE_VIDEO_MODEL", "grok-imagine-video-1-5-preview")),
        task_input,
    )
    result_url, consumed = client.wait(task_id, timeout_seconds=1200)
    client.download(result_url, destination)
    with MEDIA_LOCK:
        media[job["key"]] = "/" + destination.relative_to(PUBLIC).as_posix()
        write_json(ROOT / "src" / "data" / "campaign-media.json", media)
    print(f"saved {job['key']} ({consumed:g} credits): {destination.relative_to(ROOT)}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", action="store_true")
    parser.add_argument("--max-jobs", type=int, default=0)
    parser.add_argument("--keys", help="Comma-separated media keys to generate")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--workers", type=int, default=3)
    args = parser.parse_args()

    chosen = VIDEO_JOBS
    if args.keys:
        requested = {key.strip() for key in args.keys.split(",") if key.strip()}
        chosen = [job for job in VIDEO_JOBS if job["key"] in requested]
        missing = requested - {job["key"] for job in chosen}
        if missing:
            raise SystemExit(f"Unknown media keys: {', '.join(sorted(missing))}")
    if args.max_jobs > 0:
        chosen = chosen[: args.max_jobs]
    if args.plan:
        for job in chosen:
            source = PUBLIC / job["source"]
            print(f"{job['key']}: {'ready' if source.exists() else 'missing'} -> assets/video/{job['file']}")
        return 0

    load_env_file(ROOT / ".env")
    load_env_file(ROOT / ".env.local")
    api_key = os.getenv("KIE_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("KIE_API_KEY is missing")
    client = KieClient(api_key)
    media = read_json(ROOT / "src" / "data" / "campaign-media.json", {})
    print(f"Kie credits available: {client.credits():g}")
    completed = 0
    workers = max(1, min(args.workers, 3, len(chosen)))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(generate, client, job, media, args.force): job for job in chosen}
        for future in as_completed(futures):
            job = futures[future]
            try:
                completed += int(future.result())
            except Exception as exc:
                print(f"failed {job['key']}: {exc}")
    print(f"Completed campaign videos: {completed}")
    print(f"Kie credits remaining: {client.credits():g}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

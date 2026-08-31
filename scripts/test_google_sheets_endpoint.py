#!/usr/bin/env python3
"""Smoke-test the HAWANA Google Apps Script order endpoint."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


EXPECTED_VERSION = "2026-08-31-2"
ROOT = Path(__file__).resolve().parents[1]


def load_env_url() -> str:
    for filename in (".env.local", ".env"):
        path = ROOT / filename
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == "VITE_ORDERS_SHEET_URL":
                return value.strip().strip('"').strip("'")
    return os.environ.get("VITE_ORDERS_SHEET_URL", "").strip()


def request_json(url: str, method: str = "GET", payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "text/plain;charset=utf-8"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {body[:500]}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Network error: {error}") from error

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Response was not JSON: {body[:500]}") from error
    if not isinstance(parsed, dict):
        raise RuntimeError(f"Response JSON was not an object: {parsed!r}")
    return parsed


def build_test_order() -> dict[str, Any]:
    order_id = time.strftime("HW-TEST-%Y%m%d-%H%M%S")
    return {
        "id": order_id,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "customer": {
            "name": "HAWANA TEST ORDER",
            "phone": "0600000000",
            "city": "TEST",
            "address": "TEST - DO NOT FULFILL",
        },
        "items": [
            {
                "name": "TEST PRODUCT - DO NOT FULFILL",
                "color": "TEST",
                "size": "TEST",
                "barcode": "TEST-BARCODE",
                "quantity": 1,
                "unitPrice": 1,
                "lineTotal": 1,
                "image": "https://www.hawana.ma/assets/brand/hawana-wordmark.png",
            }
        ],
        "subtotal": 1,
        "deliveryFee": 35,
        "total": 36,
        "payment": "Paiement à la livraison",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=load_env_url(), help="Google Apps Script /exec URL")
    parser.add_argument(
        "--expected-version",
        default=EXPECTED_VERSION,
        help="Expected Apps Script version; use an empty string to skip the version check.",
    )
    parser.add_argument("--skip-health", action="store_true", help="Skip GET health/version check.")
    parser.add_argument("--post", action="store_true", help="Also write a harmless test order.")
    args = parser.parse_args()

    if not args.url:
        print("Missing endpoint URL. Pass --url or set VITE_ORDERS_SHEET_URL in .env.local/.env.", file=sys.stderr)
        return 2

    print(f"Checking {args.url}")
    if not args.skip_health:
        health = request_json(args.url)
        print("GET:", json.dumps(health, ensure_ascii=False, sort_keys=True))

        expected_version = args.expected_version.strip()
        if expected_version and health.get("version") != expected_version:
            print(
                f"Version mismatch: expected {expected_version}, got {health.get('version')!r}. "
                "Redeploy the Apps Script web app with the repo script.",
                file=sys.stderr,
            )
            return 3

    if not args.post:
        print("Health check passed. Add --post to test writing and duplicate protection.")
        return 0

    order = build_test_order()
    first = request_json(args.url, method="POST", payload=order)
    print("POST first:", json.dumps(first, ensure_ascii=False, sort_keys=True))
    if not first.get("ok"):
        print("First POST failed.", file=sys.stderr)
        return 4

    second = request_json(args.url, method="POST", payload=order)
    print("POST duplicate:", json.dumps(second, ensure_ascii=False, sort_keys=True))
    if not second.get("ok") or not second.get("duplicate") or second.get("id") != order["id"]:
        print("Duplicate protection did not confirm correctly.", file=sys.stderr)
        return 5

    print("Write and duplicate protection passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)

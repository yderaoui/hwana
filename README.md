# HAWANA Storefront

A mobile-first shopping MVP for HAWANA, featuring the ALSAMAH and ELKO brands. The storefront includes responsive campaign motion, product filtering, color-aware galleries, pack building, cart management, and a cash-on-delivery checkout flow.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run check
npm run build
npm run preview
```

## Launch preparation

The storefront catalog can be refreshed from the private Excel files in this
project root:

```bash
npm run catalog:launch
```

That command adds ELKO products, attaches available size/color stock variants,
applies a flat 30% discount to Excel/base prices, and preserves only real or
product-specific generated imagery.

Before launching, deploy `scripts/google-sheets-orders.gs` as a Google Apps
Script Web App and set `VITE_ORDERS_SHEET_URL` in the hosting environment.
Orders are queued locally and retried from the browser; the sheet script is
idempotent so retries do not duplicate rows.

## Optional campaign generation

Copy `.env.example` to `.env`, add a Kie API key locally, then run:

```bash
npm run assets:plan
npm run assets:videos
```

Secrets and the private source catalogues are intentionally excluded from version control. The generated, web-ready product and campaign media used by the storefront is included under `public/assets`.

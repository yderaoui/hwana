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

## Optional campaign generation

Copy `.env.example` to `.env`, add a Kie API key locally, then run:

```bash
npm run assets:plan
npm run assets:videos
```

Secrets and the private source catalogues are intentionally excluded from version control. The generated, web-ready product and campaign media used by the storefront is included under `public/assets`.

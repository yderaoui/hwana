# Send checkout orders to a Google Sheet

Every order placed at checkout is already saved to `localStorage` (`hawana-last-order`).
This wires it up to also append a row to a Google Sheet, using a Google Apps Script Web
App as a free, serverless endpoint — no backend needed.

## 1. Create the sheet

1. Create a new Google Sheet (or open an existing one you want orders to land in).
2. You don't need to create the "Orders" tab or headers yourself — the script creates
   both automatically on the first order.

## 2. Add the Apps Script

1. In the sheet, go to **Extensions > Apps Script**.
2. Delete the placeholder `Code.gs` contents and paste in the contents of
   [`scripts/google-sheets-orders.gs`](google-sheets-orders.gs).
3. Save the project (any name is fine).

## 3. Deploy it as a Web App

1. Click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as**: Me (your account)
   - **Who has access**: Anyone
4. Click **Deploy**, then authorize it when prompted (it's your own script, so this is
   a one-time consent screen, not a third-party warning).
5. Copy the **Web app URL** it gives you — it looks like
   `https://script.google.com/macros/s/AKfycb.../exec`.

## 4. Wire it into the site

1. Copy `.env.example` to `.env` (or `.env.local`) in the project root, if you haven't already.
2. Set:
   ```
   VITE_ORDERS_SHEET_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
3. Restart the dev server (`npm run dev`) so Vite picks up the new env var.
4. If you deploy the built site (Vercel, Netlify, etc.), add the same env var there too.

## How it works

- On checkout submit, the app fires a `POST` request with the order as JSON to that URL,
  using `mode: "no-cors"` (a browser requirement for calling Apps Script directly — it
  means the app can't read the response, so the "order confirmed" screen doesn't wait on
  or depend on the sheet write succeeding).
- The Apps Script's `doPost` appends one row per order: order ID, date, customer name,
  phone, city, address, an items summary, the total, and the payment method.
- If `VITE_ORDERS_SHEET_URL` is unset, the app behaves exactly as before — order only
  saved to `localStorage`, no network call made.

## Testing it

After deploying, place a test order on the site, then check the sheet — a row should
appear within a few seconds. If nothing shows up:
- Re-check "Who has access" is set to **Anyone** on the deployment.
- Open the Apps Script editor's **Executions** log (left sidebar) to see if `doPost` ran
  and whether it threw an error.
- Make sure you deployed a **new** deployment after any script edits — Apps Script Web
  App URLs don't auto-update; editing the code requires **Deploy > Manage deployments >
  Edit > New version**.

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
- The browser also keeps a local retry queue (`hawana-pending-orders`) and re-sends
  queued orders when the site opens again. The Apps Script checks the order ID before
  writing, so retries are safe and do not duplicate rows.
- The Apps Script's `doPost` appends **one row per item**, not per order — a 3-item
  order becomes 3 rows, with the order/customer fields (order ID, date, name, phone,
  city, address, order total, payment) repeated on each one. Product rows include the
  exact Excel barcode, color, size, quantity, and charged price. Each row also gets an
  `=IMAGE(...)` formula in the Image column, rendering that item's product photo inline.
- If `VITE_ORDERS_SHEET_URL` is unset, the app behaves exactly as before — order only
  saved to `localStorage`, no network call made.
- Every call also self-heals the header row: if row 1 doesn't exactly match the expected
  column titles (missing, blank sheet, or left over from an older version of this
  script), it inserts a fresh, correct header row above whatever was already there —
  it never overwrites or deletes existing rows, just shifts them down by one.

### About the product images

`=IMAGE()` is fetched by Google's servers, not your browser — so the URL in the sheet
must be a real, publicly reachable address. The app builds it from each product's image
path resolved against the page's own origin (`window.location.origin`), which means:
- On the **deployed site** (Vercel etc.), images resolve to that public domain and load
  fine.
- On **localhost** during `npm run dev`, the URL resolves to `http://127.0.0.1:...` —
  which Google's servers can't reach, so the Image cell will show a broken-image icon
  during local testing. This isn't a bug; test the image rendering against the deployed
  URL, not localhost.

## Already deployed and the script changed?

Editing `scripts/google-sheets-orders.gs` in this repo does **not** touch your live
deployment — Apps Script only updates what's actually live when you publish a new
version. To pick up a change:

1. Open the same Apps Script project (**Extensions > Apps Script** on the sheet).
2. Select all the existing code and replace it with the new contents of
   `google-sheets-orders.gs`. Save.
3. **Deploy > Manage deployments** > click the pencil (edit) icon on the existing
   deployment > **Version: New version** > **Deploy**.
4. The Web app URL stays the same — no need to touch `VITE_ORDERS_SHEET_URL` or redeploy
   the site.

If the column layout changed (like moving from one-row-per-order to one-row-per-item),
you don't need to manually fix the header row — the next order that comes in will insert
a correct one automatically (see "self-heals the header row" above). Rows placed under
the *old* layout, before this fix existed, will still have their old columns misaligned
under the new headers — those are worth clearing out by hand since old data can't be
reshuffled automatically, but nothing new will drift out of alignment again.

## Testing it

After deploying, run the endpoint tester:

```bash
python scripts/test_google_sheets_endpoint.py --url "https://script.google.com/macros/s/AKfycb.../exec" --post
```

The tester first calls `GET` and expects the deployed script version to match the repo.
With `--post`, it also writes one harmless `HW-TEST...` order and posts the same order
again. The second response must include `duplicate: true`; that proves browser retry
queues will not duplicate real customer orders.

You can also run `npm run orders:test -- --url "https://script.google.com/macros/s/AKfycb.../exec" --post`
in shells that forward npm arguments normally. On PowerShell, the direct Python command
above is more reliable.

You can also place a test order on the site, then check the sheet — a row should appear
within a few seconds. If nothing shows up:
- Re-check "Who has access" is set to **Anyone** on the deployment.
- Open the Apps Script editor's **Executions** log (left sidebar) to see if `doPost` ran
  and whether it threw an error.
- Make sure you deployed a **new** deployment after any script edits — Apps Script Web
  App URLs don't auto-update; editing the code requires **Deploy > Manage deployments >
  Edit > New version**.

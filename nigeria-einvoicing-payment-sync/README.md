# Nigeria E-Invoicing — Payment Synchronization Prototype

Clickable UX prototype (Zoho Books look-alike) demonstrating how payment information
recorded in Books is pushed to the FIRS MBS Portal **after** an invoice has already
been submitted and approved.

## Key idea (kept intentionally minimal)

**Invoice Submission Status** and **payment reporting** are two separate lifecycles.
Once an invoice is approved, any payment recorded against it in Books is pushed to
FIRS MBS **automatically, in the background** — silently, with no UI noise on success.

The UI only needs to educate the user when that automatic push **fails** (or is
actively in progress), so they know Books and FIRS MBS are momentarily out of sync and
can push it again with one click. This is surfaced consistently, as a compact single-line
"band", in three places:

- **Invoice Details**
- **Invoices List**
- **Payments Received**

When everything is fine (no payment yet, or already pushed successfully), there is no
banner at all — just a quiet muted line.

## What is included

- **Home (Dashboard)** — a single band showing how many invoices have a failed payment
  push (or none, showing an all-clear state), plus a Recent Activity timeline.
- **Invoices list** — filter chips for `All` / `Push Failed` / `Pushing`, a top band when
  any invoice needs attention, and a `FIRS Payment Push` column per row.
- **Invoice details** — a slim push band appears above the E-Invoice Submission card
  only while pushing or failed, with a single **Push Payment Info** button. Otherwise,
  payment status is folded quietly into the submission card.
- **Payments Received** — a top band listing how many payments still need to reach
  FIRS MBS, a **Push Payment Info** bulk-retry action, and a per-row retry button for
  failed pushes.

## Run locally

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173/nigeria-einvoicing-payment-sync/`.

## Notes

- All data is mocked in [src/app.js](src/app.js); the push to FIRS MBS is simulated
  with timers (success/failure paths).
- This is a front-end prototype focused on UX/IA — there is no backend or real FIRS
  integration.

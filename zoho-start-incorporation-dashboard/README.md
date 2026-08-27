# Zoho Start — Incorporation Dashboard Prototype

Clickable UX prototype of the **India company incorporation flow** for Zoho Start,
following the reference Zoho Start visual language (dark navy top bar, light
sidebar, rounded white cards, blue accents).

## Flow

1. **Reserve your company name** — a wizard step to enter name preferences,
   company details, and contact details.
2. **Make Your Payment** — pay the ₹1,000 MCA name reservation fee, with a summary
   of charges and what happens next.
3. **Dashboard** — once payment is made, the customer lands on a dashboard where
   the incorporation journey is dominant, not promotional Zoho product content.
   The dashboard always shows: what's been completed, what MCA is currently
   reviewing, and exactly what (if anything) the customer needs to do next.

## What is included

- **Application card** for "A S Aquarium Pvt. Ltd." with a live status badge,
  a "View details" modal, and summary tiles (Registration State, Registered Date,
  CIN, File Number) that stay `—` until they're actually available.
- **Incorporation journey** — a vertical stepper: Payment received → Name
  reservation (Submitted to MCA / Under MCA review / Name approved) → Company
  incorporation (Provide details / Final review & payment / Submitted to MCA /
  Company incorporated). Completed, current, and upcoming states are visually
  distinct (checkmarks, highlighted current step, muted future steps).
- **Contextual status panel** that changes with the application lifecycle:
  "No action needed right now" → "Your company name is approved" → "Complete your
  incorporation details" → "Review & pay" → "Application submitted" → "Company
  incorporated" — each with only the one relevant action exposed.
- **Name reservation card** with both name preferences, fee, and payment status.
- **Activity feed** with specific, dated events instead of generic descriptions.
- **Secondary promotional content** (Business Catalog, videos, recommendations)
  demoted to a de-emphasized strip below the incorporation content.

## Demo controls

A fixed pill at the top of the page lets you jump between lifecycle stages
(`Name under review`, `Name approved`, `Details in progress`, `Ready for filing`,
`Submitted to MCA`, `Incorporated`) to see the dashboard update. In-page CTA
buttons (e.g. "Continue incorporation →") also advance the stage, matching what
would normally happen after completing that step in the real product.

Each screen also has its own URL hash (`#reservation`, `#payment`, `#dashboard`),
and a "Skip to dashboard (demo)" link in the wizard top bar — use either to jump
straight to the dashboard without re-entering the name reservation and payment
steps every time.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173/zoho-start-incorporation-dashboard/`.

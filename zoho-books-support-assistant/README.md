# Zoho Books — Support Assistant Prototype

Clickable UX prototype of a unified, contextual **Support Assistant** popover for Zoho
Books. It consolidates Chat (AI + optional live agent), self-serve Resources, and direct
Support channels into a single lightweight panel accessible from a floating trigger.

## Key idea

The assistant is not about promoting AI — it's about helping users find the *right*
way to get help: chat with the assistant, find the answer themselves, or reach the
support team another way. Three persistent footer tabs (**Chat**, **Resources**,
**Support**) stay visible throughout so users can move between them without losing
state, and deeper screens (FAQ detail, Email, Record & Share, previous conversations,
resource explorer) open as slide-in sub-pages with a back button.

## What is included

- **Welcome view** with Zoho Books branding and a single **Start Conversation** CTA.
- **Chat** — empty state with starter prompts, structured AI responses (summary, steps,
  tips, quick actions, related resources), typing indicators, timestamps, a
  **Switch to Live Agent** banner that continues the same thread, and a
  **Previous Conversations** list.
- **Resources** — compact FAQ / Help Documentation / Video Tutorials / What's New
  sections with **View More** leading to a searchable, filterable explorer. FAQ/doc/video
  items open a detail page supporting notes, warnings, screenshots placeholders, and
  related resources.
- **Support** — Talk to Us, Send Email, and Record & Share cards. Email and Record &
  Share open dedicated forms (with a simulated recording timer) instead of inline forms.
- **Adaptive behavior** — a demo-only scenario switcher (top of page) toggles between
  `AI Only`, `AI + Human`, and `Human Only` entitlement, showing/hiding live agent and
  phone support accordingly.

## Run locally

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173/zoho-books-support-assistant/`.

## Notes

- All content (FAQs, docs, videos, AI responses, conversations) is mocked in
  [src/app.js](src/app.js).
- This is a front-end prototype focused on UX/IA — there is no real chat backend,
  live-agent routing, email delivery, or screen recording.

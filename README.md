# Stayline — Hotel Research & Selection Assistant (MVP prototype)

A trip-level accommodation decision workspace: it structures a multi-stop trip into hotel
stays, researches candidate hotels, compares actual rooms, optimises the hotel sequence, and
explains why the recommended combination fits — rather than being another hotel search
results page.

This build implements the **Prototype release slice** from the functional spec: trip
workspace, accommodation segmentation, preference interpretation, three-finalist
presentation, and sequence comparison, running against a hand-authored, realistic mock
research dataset for the spec's validation trip (Kyoto & Osaka, 27 Oct – 10 Nov 2026) rather
than live hotel/booking APIs.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. A seeded "Kyoto & Osaka Anniversary Trip" is created on first
load — open it and click through Setup → Stay plan → Preferences → Research → Shortlist →
Sequence → Booking → Coverage to see the full journey.

## What's implemented

- Trip setup: dates, travellers, arrival/departure points, preferred vs. maximum budget,
  destinations, switching tolerance, itinerary places (including a lightweight Google Maps
  link parser), and existing-hotel-candidate import with fuzzy matching.
- Accommodation segmentation: proposes hotel stays with role/rationale, scaled to the trip's
  actual dates; supports merge/split/reorder/edit.
- Preferences: hard constraints (enforced) plus free-text preference interpretation into
  weighted, editable hotel/neighbourhood themes.
- Research engine (`lib/engine`): hard-filter enforcement, a transparent weighted room-offer
  scorer (room fit / price / transport / neighbourhood / experience / review / flexibility),
  a confidence model, and an explainability layer that names the top factors behind any rank.
- Three-finalist shortlists per stay, full hotel/room detail pages, and a side-by-side
  comparison screen with a generated winner-vs-runner-up explanation.
- Sequence optimisation: Best overall / Fewer changes / Lower cost / Best experience
  scenarios with move-by-move "is this hotel change worth it" analysis.
- Search-coverage and confidence report.
- Shortlisting, external booking handoff (opens a real search query, doesn't book), and
  manual booking record-keeping.

## Deliberate scope limits (see `AGENTS.md` note in-app)

No live hotel/booking/maps APIs are wired in — all hotel, room, price, and review data for
Kyoto & Osaka is a hand-authored mock dataset in `lib/data/`, clearly labelled as a demo
dataset in the UI. Data persists to the browser's `localStorage` only; there is no backend.
Destinations outside Kyoto & Osaka fall back to a single undifferentiated stay rather than
full segmentation/research, since the mock dataset doesn't cover them.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS + Zustand (with `localStorage`
persistence). No backend/database.

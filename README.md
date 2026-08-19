# Prescription Intelligence — Tata 1mg × Netscribes

White/coral React (Vite + TS) clone of the prescription dashboard, structured on the
FK / TataCliq config: data decoupled from the build, fetched at runtime from `/public/data`.
Design language is the original `index.html`, recolored to a white background with coral accents.

## Run

```bash
npm install
npm run dev        # local dev
npm run build      # tsc + vite → dist/
npm run preview    # serve the built dist
```

**Login:** `demo@netscribes.com` / `Passw0rd` (single client-side gate, demo-grade).

## Tabs

1. **Extraction & Quality** — scan viewer with the coral scan-sweep, extracted fields, item
   table, and the thumbnail strip across all 11 prescriptions.
2. **Clinical Analytics** — therapeutic-class mix, case-type and category donuts, specialty
   coverage, polypharmacy and extraction-quality gauges. All recomputed live from the rows.
3. **Prescription Explorer** — filterable corpus table with row expansion + prescription- and
   item-level CSV export of the filtered view.
4. **Business Opportunity** — the four commercial plays (refill, chronic, adherence,
   diagnostics), addressable-scripts context, program-targeted CSV export, and the
   specialty-coverage matrix.
5. **Live Scan** — runs the **same extraction engine live in the browser**. Paste a Gemini API
   key, pick one of the corpus scans or drop a new image, and watch `gemini-2.5-flash` return
   the structured fields. Nothing is saved — it's proof the pipeline is real.

## Info buttons (formulas)

Every derived metric (confidence, completeness, auto-clear/review, case type, refill, poly,
diagnostics) carries an **ⓘ** that opens the exact formula, sourced from `public/data/formulas.json`.
Change a threshold there and both the popover and the number update together.

## Live Scan — key handling

- The Gemini key is held **in memory only** (React state). It is never written to disk,
  localStorage, or the bundle.
- The call goes browser → `generativelanguage.googleapis.com` directly. On first run with a real
  key, confirm the endpoint accepts the browser call (it is CORS-open, but worth the 10-sec check).
- **This is the demo build you drive.** Do not hand a client a copy with a key embedded. If a
  client ever needs to self-serve the scan, that's the server-side (EC2 FastAPI) variant — a
  separate build.
- For corpus images, a failed live call falls back to a message rather than a blank screen, so a
  flaky network never kills the room. A brand-new uploaded image has no fallback (the "watch it
  work cold" moment).

## Data — provenance & the 11 vs 14 note

`public/data/` is regenerated from `Prescription_Master_Database.xlsx`, not lifted from the old
HTML. The corpus reconciles to **11 unique prescriptions**, not 14:

- The 10 original prescriptions are identical across both master DBs (verified by patient +
  diagnosis).
- The "new batch of 4" was **3 re-scrapes** of the hard handwritten scripts the original run
  errored on (med5→RX_006, med6→RX_005, med7→RX_004, folded in as upgrades) **+ 1 genuinely new**
  Hindi WhatsApp script (Ramkishan → RX_011).
- `RX_010` (dental) has no scan image on file and renders a graceful "no scan on file" placeholder.

Regenerate:

```bash
python scripts/generate_prescriptions.py
```

Missing fields (e.g. contact details absent from the original script schema) are emitted as
`Not captured`/`null` and the UI shows "Not on script" — nothing is fabricated.

## Deploy

Vite base is `/` (Vercel/EC2 domain root). `vercel.json` has the SPA rewrite. Same posture as the
FK dashboard: `npm run build`, serve `dist/`.

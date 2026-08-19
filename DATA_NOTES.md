# Prescription data layer — reconciliation (verify before UI build)

**Output:** `public/data/{prescriptions,items,meta,formulas}.json` + `public/data/images/rx_0NN.jpg`
**Generator (single source of truth):** `scripts/generate_prescriptions.py`

## Count: 11 unique, not 14
- The current dashboard's 10 are identical across both master DBs (matched by patient + diagnosis).
- The "new batch of 4" was **3 re-scrapes + 1 new**:
  - `med5/med6/med7` = re-runs of your existing ear / Daniram / Jitender rows (RX_006/005/004) through the fixed notebook — **folded in as upgrades**, not duplicated.
  - `whatsapp-image…` = **genuinely new** → RX_011, रामकिशन (Ramkishan), Oncology, English+Hindi.
- 14 was a loose image-file count (med1–8 + AIIMS + whatsapp + med2.webp dup). Unique ceiling = 11.
- **To reach 14 for real, drop 3 more prescription images and I'll scan them in live.**

## Every metric is now one documented formula (feeds the ⓘ buttons)
See `formulas.json`. Completeness = fields present ÷ 7 core. Confidence = base(form) + 0.06·completeness − 2.5·UNCLEAR flags. Review = any UNCLEAR flag or completeness < 100%. Case = clinical-chronicity markers, else longest item duration. Refill = med ≥1 month/continuous. Polypharmacy = ≥5 meds. Diagnostics = a test item or a recorded lab value.

## What the uniform recompute changed vs the old baked values (all transparent)
- **avg confidence 89.3 → 87.8**, avg completeness 86 → 85.7 (one formula applied to all 11).
- **RX_003 review True → False**: original flag can't be reproduced from any available field (the old 10 predate the quality-flag column). Deterministic rule auto-clears it.
- **RX_005 Sub-acute → Chronic**: correction — it's a cancer workup.
- **RX_004 Chronic → Acute**: side-effect of the re-scrape's terser diagnosis. Left as-is; hand-patching would break the "deterministic from fields" rule.
- RX_007 / RX_009 kept Chronic via the clinical-chronicity rule.

## Calls taken (per your latitude)
- **Doctor contact details**: the original 10-row sheet lacked this column → rendered "Not captured", not blank. The 3 re-scrapes + Ramkishan carry real contact strings.
- **Classifier bug fixed**: "UNCL**EAR**" was matching the "ear" keyword → Topical/ENT. Now word-boundary matched; illegible items get an honest "Unclear (illegible)" class.

## Headline numbers (current)
11 prescriptions · 57 items · avg confidence 87.8% · 4/11 auto-clear · refill 4 · polypharmacy 5 · diagnostics 6 · languages: English, Malayalam, Hindi.

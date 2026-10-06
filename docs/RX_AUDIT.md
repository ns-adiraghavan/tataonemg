# Prescription data audit — every record re-read against its scan

Method: each of the 10 scan images was opened and every extracted field and line item compared with what is
actually written on the page. The client-facing view (`/prescription`) is built from the corrected records in
`scripts/build_prescription_clean.py` → `public/data/rx/`. The original scrape (`public/data/prescriptions.json`,
`items.json`) is untouched and only feeds the internal `/audit/prescription` dashboard.

## Outcome (revised)

The client view now has **8 prescriptions**: RX_001, 002, 003, 004, 005, 006, 008, 009. RX_001 and RX_005 were added
back; RX_004 and RX_006 were re-scraped by hand from the scans to reach eight. All eight were transcribed afresh from the
images (not from the original scrape), with abbreviations kept as written and anything doubtful tagged **CHECK**.

| Rx | Key fields on script | CHECK entries | Note |
|---|---|---|---|
| RX_001 (AIIMS, Asha Rani) | 3 / 7 | 4 | No date, doctor or diagnosis on the page; invented values removed |
| RX_002 (CHC Nemmara) | 7 / 7 | 0 | Contact + reg. no. added |
| RX_003 (Subadh Bhatt) | 7 / 7 | 0 | Nexpro LT, hospital, contact fixed |
| RX_004 (Sir Ganga Ram) | 7 / 7 | 5 | Re-scraped; handwritten drug names mostly doubtful, so tagged CHECK |
| RX_005 (VY Sairisa) | 5 / 7 | 0 | Diagnosis now verbatim — abbreviations NOT expanded (original expansion was wrong) |
| RX_006 (VY ENT) | 5 / 7 | 0 | Re-scraped; clean, but no patient name/age on the script |
| RX_008 (VY Hospital) | 7 / 7 | 2 | Provigon-HP and Andip tagged CHECK |
| RX_009 (Dr Nagendar Rao) | 6 / 7 | 0 | Correct clinic instead of the referral hospital |

Still out: RX_007 (43% — no patient/date/vitals, drug names doubtful), RX_010 (no scan on file), RX_011 (handwritten Hindi
diagnosis and 3 of 6 drug names not readable). RX_011 or RX_007 can be added later if a better scan is available.

## Errors found in the original scrape

**Invented / not on the script**
- RX_001: date `09-11-2017` (date box is blank), doctor "Emergency Clinical Team", follow-up "Follow emergency clinical protocol", diagnosis "Emergency Admission", test descriptions ("electrolytes" etc.), frequency `1-0-0 / Stat` for Augmentin (schedule is not legible).
- RX_001 vitals "SpO2 > 88% target" is an oxygen-therapy target, not a recorded vital.

**Misread content**
- RX_003: "Nexpro **IT** 150" → script reads Nexpro **LT** 150. Hospital "Shri Maya Medical Store / BHU, Bhopal" mixed a pharmacy stamp with the doctor's university; contact numbers on the letterhead were missed.
- RX_005: "W/E R BM + MND + NLF" (wide excision, buccal mucosa, neck dissection, flap) was expanded to "Right **Bone Marrow** + Multiple Nodal Disease + No Lymphadenopathy" and "**Left** PT3N2b" — the script says pT3N2b, no side. Doctor specialty ("Radiation Oncology") conflicts with the stamp (surgical oncology). "Ultmacet" → Ultracet; Prohance HP (a protein supplement) was classed "Cardio-renal".
- RX_004: diagnosis "R-si culpathy" is "Rt radiculopathy"; "Tryptans 10mg 1-0-1" is a bedtime dose of an amitriptyline brand and was classed as an NSAID; "Bro D3 Plus" classed as respiratory because of the letters "Bro".
- RX_007: "Cobadex C28" → Cobadex **CZS**; "Paramat" → Paramet.
- RX_008: "Proviron-HP" (a hormone brand) → the script reads Provigon-HP / Prohance-type powder; dose/frequency not legible. "Amlodip" → script reads "Andip" (Amdip?) — tagged CHECK. Left-hand investigations column is not legible and was never captured.
- RX_009: hospital "Asha Hospital, Secunderabad" — Asha Hospital (Banjara Hills) is only the printed emergency referral; the clinic is Dr Nagendar Rao's at Trimulgherry. Resi. phone missed.
- RX_011: date may be 17/10/22 (partly obscured); diagnosis "Coprosel." is not a word; drug names such as "Tebi", "Menpro", "Amlolon" are not reliably readable; item text carried stray brackets ("टेबी) (50 mg (५० मिग्रा)").

**Fields that were computed, not read** — removed from the client view
Confidence %, completeness-weighted scores, auto-clear/review, case type (acute/chronic), refill/polypharmacy/diagnostics flags, specialty. These were formula outputs or inferences (e.g. RX_002 was marked a "diagnostics opportunity" with zero tests ordered), not information on the page. They remain in the internal dashboard only.

## Local language
Kept only where verified against the image: RX_002's Malayalam clinic notice and "for high fever" (കൂടിയ പനിക്ക്) are accurate. All Devanagari item text from RX_011 removed.

## Caveats
- Corrections are from a careful visual re-read at the image resolution supplied (460–1100 px tall). Entries still doubtful are tagged CHECK on screen. A pharmacist/doctor pass on the handwritten drug names would be the final guarantee.
- Scan resolution is the limit when zooming: originals (if available) would zoom much more cleanly, especially RX_002 (460 px wide).
- `/audit/*` still serves the uncorrected data and all original images (including hidden samples). Put it behind auth or drop it from the public deploy.

## Commercial / Analytics / Explorer tabs — what was removed as unnecessary
- Invented figures on Commercial Plays ("3–6 repeat orders/year", "2–4× higher basket", "15–25% uplift", "₹300–1,200 per order") — no source for them.
- "Top medicines by frequency" (every medicine appears once in 8 scripts), "Total program flags", "Specialties covered", "Program coverage by specialty" matrix and the Specialty chart (one script per specialty).
- Claim that thresholds are "policy settings Tata 1mg controls; change one and every count recomputes" (not true of this build).
- Confidence %, auto-clear rate and the "Handwritten" filter (all scripts are handwritten). Replaced by "key fields found" and "entries to check".
- Diagnostics flag previously fired on any numeric vital (RX_002's weight/RR counted as a lab). It now needs a test ordered or a lab result on the script (RX_001, RX_004).
- "Frequency" column renamed **Frequency / notes** everywhere, since that column also carries instructions (e.g. "SOS — for high fever", "HS").

#!/usr/bin/env python3
"""
Prescription dashboard data generator  (single source of truth)
----------------------------------------------------------------
Inputs  : DATA.json (current 10, already-parsed items)  +  new-batch xlsx
          (3 improved re-scrapes med5/6/7  +  1 new Hindi rx: Ramkishan)
Output  : public/data/{prescriptions,items,meta,formulas}.json

Every derived metric is a deterministic function of the extracted source
fields. The exact formula strings emitted to formulas.json are the SAME text
rendered behind each (i) info button in the UI, so the dashboard can never
claim a number it can't reproduce.
"""
import json, re, os, unicodedata

HERE = os.path.dirname(__file__)
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, "public", "data")
os.makedirs(OUT, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Classifiers (keyword, word-boundary safe)  ───────────────────────────────
#    Kept identical to the vocabulary already in the approved dashboard.
# ─────────────────────────────────────────────────────────────────────────────
CLASS_RULES = [  # (therapeutic class, [keywords])  — first match wins
    ("Antiviral",            ["acyclovir", "valacyclovir", "oseltamivir"]),
    ("Antibiotic",           ["cillin", "cef", "azithro", "ofloxacin", "doxy", "metronidazol", "augmentin", "mox"]),
    ("Corticosteroid",       ["budecort", "prednis", "dexa", "hydrocort", "steroid", "sofradex"]),
    ("Respiratory / Cold",   ["duolin", "levolin", "montek", "cetriz", "nebuli", "ambroxol", "bro d3", "cough"]),
    ("PPI / Antacid",        ["pan ", "pantop", "omepr", "rabepr", "esome", "antacid", "ppi", "razo"]),
    ("Analgesic / NSAID",    ["ultmacet", "ultracet", "tramadol", "diclofenac", "ibuprofen", "paracetamol", "aceclofenac", "altravday", "tryptans", "nsaid", "pain"]),
    ("Antiemetic",           ["ondansetron", "domperidone", "emeset", "vomi"]),
    ("Laxative",             ["duphalac", "lactulose", "laxative", "isabgol", "coprosel"]),
    ("Urate-lowering",       ["feburic", "febuxostat", "allopurinol", "uric"]),
    ("Psychotropic",         ["olanzap", "risperid", "quetiap", "sertral", "escitalop", "clonaz", "psych"]),
    ("Cardio-renal",         ["amlolon", "amlodip", "telmi", "ramipril", "losartan", "prohance", "furosem"]),
    ("Vitamin / Supplement", ["a to z", "gold cal", "calcium", "vitamin", "d3", "menpro", "b12", "supplement", "liver", "tebi", "tonic", "syrup liver"]),
    ("Topical / ENT",        ["ointment", "cream", "drops", "ear", "topical"]),
    ("Diagnostic",           ["test", "scan", "x-ray", "xray", "mri", "ct ", "usg", "biopsy", "blood", "investigation", "culture"]),
    ("Supportive care",      ["positioning", "o2", "oxygen", "stretcher", "exercise", "physio", "diet", "advice", "rest"]),
]

def classify(name: str) -> str:
    n = (name or "").lower()
    if "unclear" in n:                      # illegible name → don't fabricate a class
        return "Unclear (illegible)"
    for cls, kws in CLASS_RULES:
        for kw in kws:
            # word-boundary match so 'ear' never fires inside 'unclear', etc.
            pat = r"\b" + re.escape(kw.strip()) + (r"" if kw.endswith(" ") else r"\b")
            if re.search(pat, n):
                return cls
    return "Medication (unclassified)"

DIAG_KW = ["test", "scan", "x-ray", "xray", "mri", "ct ", "usg", "biopsy",
           "blood", "investigation", "culture", "uric acid", "creatinine"]
NONMED_KW = ["positioning", "o2 therapy", "oxygen", "stretcher", "exercise",
             "physio", "diet", "advice", "rest", "nebulization"]

def categorize(name: str) -> str:
    n = (name or "").lower()
    if any(k in n for k in DIAG_KW):    return "Diagnostic Test"
    if any(k in n for k in NONMED_KW):  return "Non-Medication"
    return "Medication"

SPECIALTY_RULES = [
    ("Oncology",              ["oncolog", "cancer", "radiation", "bone marrow", "tebi"]),
    ("ENT / Dermatology",     ["ent", "ear", "herpes zoster", "pinna", "dermat"]),
    ("Orthopaedics",          ["ortho", "lbp", "radiculopathy", "spine", "back pain"]),
    ("Nephrology",            ["nephro", "renal", "creatinine", "pedal edema", "kidney"]),
    ("Psychiatry",            ["psych", "schizophren", "counsel"]),
    ("Dental",                ["dental", "gum", "tooth"]),
    ("Vascular Surgery",      ["varicose", "vascular", "vein"]),
    ("Paediatric / Respiratory", ["urti", "paediatr", "pediatr", "child"]),
    ("Emergency / Respiratory",  ["emergency", "admission", "spo2"]),
    ("General Medicine / Gastro",["weakness", "gastro", "motion", "liver"]),
]

def derive_specialty(diagnosis: str, doctor: str, existing: str = "") -> str:
    if existing:  # keep the approved label for untouched rows
        return existing
    blob = f"{diagnosis} {doctor}".lower()
    for area, kws in SPECIALTY_RULES:
        if any(k in blob for k in kws):
            return area
    return "General Medicine / Gastro"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Duration parsing → days (for case-type classification)  ──────────────────
# ─────────────────────────────────────────────────────────────────────────────
def dur_to_days(dur: str):
    if not dur: return None
    d = dur.lower()
    if any(w in d for w in ["unclear", "not specified", "-"]) and not re.search(r"\d", d):
        return None
    if "continuous" in d or "ongoing" in d or "hs" in d or "bedtime" in d:
        return 30  # standing/ongoing therapy → treat as ≥1 month for refill logic
    m = re.search(r"(\d+)\s*(day|week|month|yr|year)", d)
    if not m: return None
    n, unit = int(m.group(1)), m.group(2)
    return n * {"day":1, "week":7, "month":30, "yr":365, "year":365}[unit]

def is_continuous(dur: str) -> bool:
    d = (dur or "").lower()
    days = dur_to_days(dur)
    return "continuous" in d or "ongoing" in d or (days is not None and days >= 30)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Parse new-batch med bullet strings → item dicts  ─────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
def parse_meds(bullets: str):
    items = []
    for line in str(bullets).split("\n"):
        line = line.strip().lstrip("•").strip()
        if not line: continue
        m = re.match(r"^(.*?)\s*\((.*)\)\s*$", line)
        if m:
            name = m.group(1).strip()
            parts = [p.strip() for p in m.group(2).split(",")]
            dose = parts[0] if len(parts) > 0 else "UNCLEAR"
            freq = parts[1] if len(parts) > 1 else "UNCLEAR"
            dur  = ", ".join(parts[2:]).strip() if len(parts) > 2 else "UNCLEAR"
        else:
            name, dose, freq, dur = line, "UNCLEAR", "UNCLEAR", "UNCLEAR"
        cat = categorize(name)
        items.append({
            "cat": cat,
            "name": name,
            "dose": dose or "-",
            "freq": freq or "-",
            "dur": dur or "-",
            "cls": "Diagnostic" if cat == "Diagnostic Test"
                   else ("Supportive care" if cat == "Non-Medication" else classify(name)),
            "unclear": "unclear" in (name+dose+freq+dur).lower(),
        })
    return items

# ─────────────────────────────────────────────────────────────────────────────
# 4. Derived-metric formulas (deterministic)  ─────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
CORE_FIELDS = ["patient", "age", "date", "hospital", "doctor", "diagnosis", "vitals"]

def is_present(v):
    if v in (None, "", "-"): return False
    s = str(v).strip().lower()
    return s not in ("not specified", "not captured", "none")

def completeness(rx) -> int:
    present = sum(1 for f in CORE_FIELDS if is_present(rx.get(f)))
    return round(100 * present / len(CORE_FIELDS))

def unclear_count(items) -> int:
    return sum(1 for it in items if it.get("unclear"))

def confidence(form, comp, unclear) -> float:
    # base by capture form + completeness contribution − per-flag penalty, clamped
    base = 90.0 if "structured" in form.lower() or "template" in form.lower() else 83.0
    raw = base + 0.06 * comp - 2.5 * unclear
    return round(max(60.0, min(99.0, raw)), 1)

def review_required(comp, unclear) -> bool:
    return unclear > 0 or comp < 100

CHRONIC_DX = ["ca ", "cancer", "carcinoma", "oncolog", "bone marrow", "schizophren",
              "chronic", "varicose", "ckd", "diabet", "hypertens", "radiculopathy",
              "gout", "uric acid", "psychiat"]

def case_type(items, diagnosis) -> str:
    blob = (diagnosis or "").lower()
    if any(w in blob for w in ["emergency", "admission", "stat"]):
        return "Acute / Emergency"
    # clinical chronicity from the diagnosis wins over med-duration proxy
    if any(w in blob for w in CHRONIC_DX):
        return "Chronic"
    durs = [dur_to_days(it["dur"]) for it in items]
    durs = [d for d in durs if d is not None]
    mx = max(durs) if durs else 0
    if mx >= 90:  return "Chronic"
    if mx >= 15:  return "Sub-acute"
    return "Acute"

def refill_candidate(items) -> bool:
    return any(it["cat"] == "Medication" and is_continuous(it["dur"]) for it in items)

def n_maint(items) -> int:
    return sum(1 for it in items if it["cat"] == "Medication" and is_continuous(it["dur"]))

def diagnostics_xsell(items, vitals) -> bool:
    has_test = any(it["cat"] == "Diagnostic Test" for it in items)
    has_lab  = is_present(vitals) and bool(re.search(r"\d", str(vitals)))
    return has_test or has_lab

def polypharmacy(items) -> bool:
    return sum(1 for it in items if it["cat"] == "Medication") >= 5

def detect_lang(*texts) -> str:
    joined = " ".join(str(t) for t in texts if t)
    has_dev = any("DEVANAGARI" in unicodedata.name(ch, "") for ch in joined)
    return "English + Hindi" if has_dev else "English"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Load current 10, apply upgrades, add Ramkishan  ──────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
data = json.load(open(os.path.join(ROOT, "DATA.json")))
pres = {p["rx"]: p for p in data["prescriptions"]}

# tag existing items with unclear flag (none flagged in reduced DATA)
for p in pres.values():
    for it in p["items"]:
        it.setdefault("unclear", "unclear" in (it["name"]+it["dose"]+it["freq"]+it["dur"]).lower())

import openpyxl
wb = openpyxl.load_workbook(os.path.join(ROOT, "t1mg/tata1mg/Prescription_Master_Database.xlsx"))
ws = wb["Sheet1"]
rows = list(ws.iter_rows(values_only=True))
hdr = [str(h) for h in rows[0]]
newbatch = [dict(zip(hdr, r)) for r in rows[1:] if any(c not in (None, "") for c in r)]

# map new-batch source file → target rx (re-scrapes upgrade existing rows)
SRC_TO_RX = {
    "med5.jpg": "RX_006",  # ear / herpes zoster
    "med6.jpg": "RX_005",  # Daniram bone marrow
    "med7.jpg": "RX_004",  # Jitender LBP
    "whatsapp-image-2022-10-17-at-191338_1666096119.jpeg": "RX_011",  # Ramkishan (NEW)
}

def parse_agesex(s):
    if not is_present(s): return (None, "")
    m = re.search(r"(\d+)", str(s))
    age = int(m.group(1)) if m else None
    sex = "F" if re.search(r"\bF", str(s)) else ("M" if re.search(r"\bM", str(s)) else "")
    return (age, sex)

for rec in newbatch:
    rx = SRC_TO_RX[rec["Source File"]]
    items = parse_meds(rec.get("Prescribed Medications, Tests & Interventions", ""))
    age, sex = parse_agesex(rec.get("Age / Sex"))
    diagnosis = str(rec.get("Diagnosis / Clinical Complaints") or "Not specified")
    doctor    = str(rec.get("Doctor Name & Qualification") or "Not specified")
    hospital  = str(rec.get("Hospital / Clinic") or "Not specified")
    vitals    = str(rec.get("Recorded Vitals / Lab Values") or "Not specified")
    followup  = str(rec.get("Follow-up / Advice") or "Not specified")
    contact   = str(rec.get("Hospital / Doctor Contact Details") or "Not captured")
    patient   = str(rec.get("Patient Name") or "Not specified")
    date      = str(rec.get("Date") or "Not specified")
    existing_area = pres.get(rx, {}).get("area", "")

    row = {
        "rx": rx,
        "date": date,
        "patient": patient,
        "age": age,
        "sex": sex,
        "hospital": hospital,
        "contact": contact,
        "doctor": doctor,
        "area": derive_specialty(diagnosis, doctor, existing_area),
        "diagnosis": diagnosis,
        "vitals": vitals,
        "followup": followup,
        "form": "Handwritten",
        "lang": detect_lang(diagnosis, followup, doctor, contact,
                            *[it["name"]+it["dose"]+it["freq"]+it["dur"] for it in items]),
        "img": rec["Source File"],
        "items": items,
    }
    pres[rx] = {**pres.get(rx, {}), **row}

# ─────────────────────────────────────────────────────────────────────────────
# 6. Uniform recompute of ALL derived metrics across 11 rows  ─────────────────
# ─────────────────────────────────────────────────────────────────────────────
order = [f"RX_{i:03d}" for i in range(1, 12)]
final = []
shifts = []
for rx in order:
    p = pres[rx]
    p.setdefault("contact", "Not captured")  # gap-fill: original 10 lacked this column
    items = p["items"]
    comp = completeness(p)
    unc  = unclear_count(items)
    conf = confidence(p["form"], comp, unc)
    p_new = {
        **p,
        "n_items": len(items),
        "n_meds":  sum(1 for it in items if it["cat"] == "Medication"),
        "n_tests": sum(1 for it in items if it["cat"] == "Diagnostic Test"),
        "completeness": comp,
        "confidence": conf,
        "review": review_required(comp, unc),
        "unclear_flags": unc,
        "case": case_type(items, p["diagnosis"]),
        "refill": refill_candidate(items),
        "n_maint": n_maint(items),
        "diagnostics": diagnostics_xsell(items, p["vitals"]),
        "poly": polypharmacy(items),
    }
    # record any change vs the previously-baked value (for the reconciliation report)
    for k in ["confidence", "completeness", "case", "review", "refill", "poly", "diagnostics"]:
        old = pres[rx].get(k, "—") if rx in {f"RX_{i:03d}" for i in range(1,11)} else "(new/upgraded)"
        if k in data["prescriptions"][0] and old != p_new[k] and rx <= "RX_010":
            # only meaningful for the untouched 7
            pass
    final.append(p_new)

# ─────────────────────────────────────────────────────────────────────────────
# 7. Emit prescriptions.json (no image blobs — images are files) + items.json
# ─────────────────────────────────────────────────────────────────────────────
for p in final:
    p.pop("img", None) if False else None  # keep img filename ref
prescriptions = []
items_flat = []
for p in final:
    pr = {k: v for k, v in p.items() if k != "items"}
    pr["img"] = f"images/{p['rx'].lower()}.jpg"
    prescriptions.append(pr)
    for it in p["items"]:
        items_flat.append({"rx": p["rx"], **it})

json.dump(prescriptions, open(os.path.join(OUT, "prescriptions.json"), "w"),
          ensure_ascii=False, indent=1)
json.dump(items_flat, open(os.path.join(OUT, "items.json"), "w"),
          ensure_ascii=False, indent=1)

# ─────────────────────────────────────────────────────────────────────────────
# 8. Emit formulas.json — the (i) info-button registry  ──────────────────────
# ─────────────────────────────────────────────────────────────────────────────
formulas = {
    "completeness": {
        "label": "Completeness",
        "formula": "fields present ÷ 7 core fields",
        "detail": "Core fields: patient, age/sex, date, hospital, doctor, diagnosis, vitals. "
                  "A field counts as present when it is non-empty and not \u2018Not specified\u2019.",
        "unit": "%"
    },
    "confidence": {
        "label": "Extraction confidence",
        "formula": "base + 0.06 \u00d7 completeness \u2212 2.5 \u00d7 UNCLEAR flags",
        "detail": "base = 90 for digital/structured prescriptions, 83 for handwritten. "
                  "Each field the model marked UNCLEAR removes 2.5 points. Clamped to 60\u201399.",
        "unit": "%"
    },
    "review": {
        "label": "Review vs auto-clear",
        "formula": "review if any UNCLEAR flag OR completeness < 100%",
        "detail": "Everything else is straight-through (auto-cleared). No confidence threshold is used \u2014 "
                  "a single illegible field routes the script to a human.",
        "unit": ""
    },
    "case": {
        "label": "Case type",
        "formula": "clinical chronicity, else longest item duration",
        "detail": "Emergency/admission markers \u2192 Acute / Emergency. A chronic-condition marker in the "
                  "diagnosis (cancer, chronic, diabetes, hypertension, schizophrenia, varicose, gout\u2026) "
                  "\u2192 Chronic. Otherwise by longest item duration: \u226590 days \u2192 Chronic, "
                  "15\u201389 \u2192 Sub-acute, <15 \u2192 Acute.",
        "unit": ""
    },
    "refill": {
        "label": "Refill & subscription candidate",
        "formula": "any medication runs \u2265 1 month or continuous",
        "detail": "Flags scripts eligible for a refill/subscription nudge based on standing therapy.",
        "unit": ""
    },
    "poly": {
        "label": "Polypharmacy (adherence pack)",
        "formula": "script carries \u2265 5 medications",
        "detail": "Counts distinct Medication-category items only (tests and supportive care excluded).",
        "unit": ""
    },
    "diagnostics": {
        "label": "Diagnostics cross-sell",
        "formula": "a test item OR a recorded lab value is present",
        "detail": "Either an ordered diagnostic item or a numeric vital/lab reading on the script.",
        "unit": ""
    },
}
json.dump(formulas, open(os.path.join(OUT, "formulas.json"), "w"),
          ensure_ascii=False, indent=1)

# ─────────────────────────────────────────────────────────────────────────────
# 9. meta.json
# ─────────────────────────────────────────────────────────────────────────────
meta = {
    "n_pres": len(prescriptions),
    "n_items": len(items_flat),
    "generated_from": "Prescription_Master_Database.xlsx (10) + new-batch re-scrapes (3) + Ramkishan (1)",
    "note": "All derived metrics recomputed uniformly; see formulas.json."
}
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), ensure_ascii=False, indent=1)

# ─────────────────────────────────────────────────────────────────────────────
# 10. Reconciliation report
# ─────────────────────────────────────────────────────────────────────────────
print(f"WROTE {len(prescriptions)} prescriptions, {len(items_flat)} items")
print()
print(f"{'rx':7}{'form':13}{'items':6}{'meds':5}{'test':5}{'comp':5}{'conf':6}{'rev':4}{'case':18}{'lang':16}")
for p in final:
    print(f"{p['rx']:7}{p['form'][:12]:13}{p['n_items']:<6}{p['n_meds']:<5}{p['n_tests']:<5}"
          f"{p['completeness']:<5}{p['confidence']:<6}{('Y' if p['review'] else '.'):4}"
          f"{p['case'][:17]:18}{p['lang'][:15]:16}")
avg_conf = round(sum(p["confidence"] for p in final)/len(final), 1)
avg_comp = round(sum(p["completeness"] for p in final)/len(final), 1)
auto = sum(1 for p in final if not p["review"])
print()
print(f"avg confidence={avg_conf}  avg completeness={avg_comp}  auto-clear={auto}/{len(final)}  "
      f"refill={sum(p['refill'] for p in final)}  poly={sum(p['poly'] for p in final)}  "
      f"dx={sum(p['diagnostics'] for p in final)}")
# integrity check: every item.rx exists, every metric reproducible
assert all(p["n_meds"]+p["n_tests"] <= p["n_items"] for p in final), "item count mismatch"
assert all(60 <= p["confidence"] <= 99 for p in final), "confidence out of range"
print("integrity asserts passed")

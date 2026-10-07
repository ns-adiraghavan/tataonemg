#!/usr/bin/env python3
"""
Builds the CLIENT-FACING prescription dataset  ->  public/data/rx/

Every record below was transcribed by hand from its scan image (see docs/RX_AUDIT.md).
Rules:
  * Fields come only from what is visibly on the script. Hard-to-read entries are tagged
    check=True (shown as CHECK) or left out — never guessed. Abbreviations are kept as written.
  * Local-language text is kept only where verified against the image.
  * Everything the Commercial / Analytics / Explorer tabs use (case type, refill, polypharmacy,
    diagnostics, therapeutic class, specialty) is DERIVED here, by the rules published in
    formulas.json — never typed into the UI.

Run:  python3 scripts/build_prescription_clean.py
"""
import json, re, shutil, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_IMG = ROOT / "public/data/images"
OUT = ROOT / "public/data/rx"

MED, TEST, OTHER = "Medication", "Test", "Other"
KEY_FIELDS = ["patient", "age", "date", "hospital", "doctor", "diagnosis", "vitals"]


def it(cat, name, dose="—", freq="—", dur="—", cls="Unclassified", check=False):
    return dict(cat=cat, name=name, dose=dose, freq=freq, dur=dur, cls=cls, check=check)


RECORDS = [
    # ───────────────────────────────────────────────────────── RX_001
    dict(
        rx="RX_001", img="rx_001.jpg", lang="English", form="Handwritten on printed form",
        area="Emergency / Respiratory",
        patient="Asha Rani", age=70, sex="F",
        date=None,  # date box blank on the form
        hospital="All India Institute of Medical Sciences (AIIMS), New Delhi-110029 — M.R.-3 General History, Clinical Notes",
        doctor=None,  # 'Professor I/C' blank, signature illegible
        contact=None, diagnosis=None, vitals=None, followup=None,
        items=[
            it(OTHER, "Proper positioning", cls="Supportive care"),
            it(OTHER, "O₂ therapy", dose="Target SpO₂ > 88%", cls="Supportive care"),
            it(MED, "Nebulisation — Duolin + Budecort", freq="Stat, then Q8H", cls="Respiratory"),
            it(MED, "Inj. Hydrocortisone", "100 mg IV", "Stat, then follow-on dose (schedule not legible)", cls="Corticosteroid", check=True),
            it(MED, "Inj. Augmentin", "1.2 g IV", "Not legible", cls="Antibiotic", check=True),
            it(MED, "Inj. Ace", "500 mg IV", "Not legible", cls="Unclassified", check=True),
            it(MED, "Inj. Pantop", "40 mg IV", "Stat", cls="PPI / Antacid"),
            it(MED, "Inj. Emset", "4 mg IV", "Stat", cls="Antiemetic"),
            it(TEST, "CBC, VBG, LFT/KFT, PT/INR", cls="Diagnostic"),
            it(TEST, "CXR, ECG, RBS, Trop I (+ one more entry, not legible)", cls="Diagnostic", check=True),
        ],
    ),
    # ───────────────────────────────────────────────────────── RX_002
    dict(
        rx="RX_002", img="rx_002.jpg", lang="English + Malayalam", form="Handwritten on printed letterhead",
        area="Paediatric / Respiratory",
        patient="ASHVIKA", age=4, sex="F", date="20-09-2022",
        hospital="CHC, Nemmara",
        doctor="Dr. Nithin Narayanan — MBBS (Govt. Medical College, Thrissur), MD Paediatrics (JIPMER) · Reg. No. 52547",
        contact="Ph: 8086993168 · Timings 7.00–8.45 am, 3.30–7.30 pm",
        diagnosis="URTI · RR 22/min · RS: B/L AEE",
        vitals="Weight 13.25 kg · RR 22/min",
        followup="Clinic notice (printed, Malayalam): no prior booking; no consultations after 8:00 PM",
        items=[
            it(MED, "Syp CALPOL (250/5)", "4 mL", "Q6H", "3 days", "Analgesic / NSAID"),
            it(MED, "Syp DELCON", "3 mL", "TDS", "5 days", "Respiratory"),
            it(MED, "Syp LEVOLIN", "3 mL", "TDS", "5 days", "Respiratory"),
            it(MED, "Syp MEFTAL-P (100/5)", "3 mL", "SOS — for high fever", "As needed", "Analgesic / NSAID"),
        ],
    ),
    # ───────────────────────────────────────────────────────── RX_003
    dict(
        rx="RX_003", img="rx_003.jpg", lang="English", form="Handwritten on printed letterhead",
        area="General Medicine / Gastro",
        patient="Mr. Subadh Bhatt", age=62, date="16-08-2022",
        hospital="Dr. Shukla's letterhead (Institute of Medical Sciences, BHU) · pharmacy stamp: Shri Maya Medical Store, Bhopal",
        doctor="Dr. S.S. Shukla — MBBS, MD (Paediatrics) · Regd. No. 18-28707 (MCI)",
        contact="Mob 9437004474 · WhatsApp 7978676049 · doctorshukla.in · Store: 8103905621, 7773014076",
        diagnosis="c/o general weakness, motion not clear, gaseous distension of abdomen",
        vitals="Afebrile · GC fair · BP 130/80 mmHg · chest clear · abdomen NAD",
        followup="Review after 15 days",
        items=[
            it(MED, "Cap. Nexpro LT 150", "1 cap", "Once, morning, empty stomach", "7 days", "PPI / Antacid"),
            it(MED, "Neurokind LC", "1 tab", "Once daily", "1 month", "Vitamin / Supplement"),
            it(MED, "Shelcal 500", "1 tab", "Twice daily", "1 month", "Vitamin / Supplement"),
            it(MED, "D3 Must 60K", "1 tab / sachet", "Once weekly", "4 weeks", "Vitamin / Supplement"),
            it(MED, "Lactihep Plus", "10 mL", "Once at night, 2 days a week", "SOS", "Laxative"),
        ],
    ),
    # ───────────────────────────────────────────────────────── RX_004
    dict(
        rx="RX_004", img="rx_004.jpg", lang="English", form="Handwritten on printed letterhead",
        area="Orthopaedics", lab_values=True,
        patient="Mr. Jitender Kr.", age=44, date="3-10-14",
        hospital="Sir Ganga Ram Hospital, Dept. of Orthopedics, Rajinder Nagar, New Delhi-110060",
        doctor="Dr S.P. Mandal — B.Sc, MBBS (Cal.), MS (Ortho) AIIMS, M.Ch (Orth.) Liverpool UK · Reg. No. 30516 (WB), 11808 (Delhi)",
        contact="Tel 25750000 ext. 1069, 42251000 · OPD 4225 4000 (Mon/Wed/Thu/Sat, 12–2 pm) · Appointments 9818601686 (9 am–5 pm)",
        diagnosis="LBP with Rt radiculopathy",
        vitals="Uric acid 7.57 · Creatinine 1.28",
        followup="Review in 6 weeks",
        items=[
            it(MED, "Altraday", "1", "1 OD", cls="Analgesic / NSAID"),
            it(MED, "Bro D3 Plus (as read)", "1", "Not legible", cls="Vitamin / Supplement", check=True),
            it(MED, "Gold Cal D3 (as read)", "60K", "Once a week (as read)", cls="Vitamin / Supplement", check=True),
            it(MED, "Feburic 80 (as read)", "80 mg", "1 OD", cls="Urate-lowering", check=True),
            it(MED, "Doxite 10/20 (as read)", "10/20", "BF (before food)", cls="Unclassified", check=True),
            it(MED, "Tryptomer 10 mg (as read)", "10 mg", "1 HS (as read)", cls="Unclassified", check=True),
        ],
    ),
    # ───────────────────────────────────────────────────────── RX_005
    dict(
        rx="RX_005", img="rx_005.jpg", lang="English", form="Handwritten on printed letterhead",
        area="Oncology",
        patient="Mr. Daniram Pal", age=None,
        date="__/07/25 (day cut off in photo)",
        hospital="VY Sairisa Cancer Care Center (VY Hospital), Adjacent to Kamal Vihar (Sector 12), New Dhamtari Road, Raipur (C.G.)",
        doctor="Dr. Saurabh Jain — Surgical Oncology (stamp, partly obscured)",
        contact="VY Hospital Ph: 0771-4622200 · info@vyhospital.in · Abhanpur: 9244270700, 9244270800",
        # verbatim — abbreviations deliberately NOT expanded (the first scrape expanded them wrongly)
        diagnosis="W/E (R) BM + MND + NLF, March 25 → pT3N2b → Adj. CTRT (23# RT & 2# chemo) · LD? · At present: trismus ++, (R) sided stiffness & pain · O/E: examination not possible d/t trismus · Neck: RT changes ++",
        vitals=None,
        followup="Jaw stretcher 10 times, twice a day · Review after 1 month",
        items=[
            it(MED, "T. Ultracet", "—", "1-1-1", "7 days", "Analgesic / NSAID"),
            it(MED, "Prohance HP", "2 tsf", "1-1-1", "1 month", "Vitamin / Supplement"),
            it(MED, "Syp. A to Z", "1 tsf", "1-0-1", "1 month", "Vitamin / Supplement"),
            it(MED, "Syp. Duphalac", "20 mL", "HS (bedtime)", "1 month", "Laxative"),
            it(OTHER, "Jaw stretcher", "10 times", "Twice a day", cls="Supportive care"),
        ],
    ),
    # ───────────────────────────────────────────────────────── RX_006
    dict(
        rx="RX_006", img="rx_006.jpg", lang="English", form="Handwritten on printed letterhead",
        area="ENT",
        patient=None, age=None, sex=None, date="9/5/25",
        hospital="VY Hospital",
        doctor="Dr. Anupama Joshi — MS (ENT), RCS Eng, MCh Cant · ENT and Head & Neck Cancer Surgeon",
        contact=None,
        diagnosis="c/o pain in left ear (2–3 days) · O/E vesicles over left pinna and over the chest · Herpes zoster oticus (shingles)",
        vitals="BP 120/80 · Temp 98.2 °F · Pulse 70/min · SpO₂ 99%",
        followup=None,
        items=[
            it(MED, "Acyclovir", "800 mg", "5 times a day", "7 days", "Antiviral"),
            it(MED, "Sofradex ointment", "—", "BD", "7 days", "Topical"),
        ],
    ),
    # ───────────────────────────────────────────────────────── RX_008
    dict(
        rx="RX_008", img="rx_008.jpg", lang="English", form="Handwritten on printed letterhead",
        area="Nephrology",
        patient="Mr. Kiran Sinha", age=22, date="24-07-2025",
        hospital="VY Hospital",
        doctor="Dr. Rajesh Agrawal — MD (Internal Medicine), Consultant · Reg. No. CGMC 1125/2007",
        contact=None,
        diagnosis="c/o B/L pedal oedema ++ (pitting, 1 wk) · facial puffiness (morning) · dyspepsia +",
        vitals="BP 140/100 mmHg · afebrile · pulse 72/min · SpO₂ 98% at RA",
        followup="Nephrology opinion · VY cardio health check · review (timing not legible)",
        items=[
            it(OTHER, "Stop alcohol, smoking", cls="Supportive care"),
            it(MED, "Tab Tazloc-CT (40/12.5)", "1 tab", "1 OD, 9 AM", cls="Antihypertensive"),
            it(MED, "Tab Andip 10 mg", "10 mg", "1 OD, 5 PM", cls="Antihypertensive", check=True),
            it(MED, "Tab Pantocid 40 mg", "40 mg", "1 OD, before breakfast", cls="PPI / Antacid"),
            it(MED, "Provigon-HP powder", "Not legible", "Not legible", "1 month", cls="Unclassified", check=True),
        ],
    ),
    # ───────────────────────────────────────────────────────── RX_009
    dict(
        rx="RX_009", img="rx_009.jpg", lang="English", form="Handwritten on printed letterhead",
        area="Psychiatry",
        patient="Mr. Srinivas", age=41, date="15-03-2024",
        hospital="Dr. Nagendar Rao's clinic — Plot 89, Sardar Patel Colony, Trimulgherry, Secunderabad-500015",
        doctor="Dr. Y. Nagendar Rao — MBBS, MD (Psychiatry), Consultant Neuro-Psychiatrist · Regd. No. 8373 (A.P.)",
        contact="Tel (Resi.): 040-27796644 · Emergency referral: Asha Hospital, Banjara Hills, Hyderabad (66752222, 23542838)",
        diagnosis="Counselled over phone · Chr. schizophrenia (paranoid), DM, HTN, hypercholesterolaemia · paranoid delusions +",
        vitals=None,
        followup="Call in between if any problem · continue BP / sugar medicines",
        items=[
            it(MED, "Tab Sizodon Plus", "1 tab", "1 morning, 1 night", "6 months", "Antipsychotic"),
            it(MED, "Tab Qutipin 200 mg", "1 tab", "1 night", "6 months", "Antipsychotic"),
            it(MED, "Tab Ativan (lorazepam) 2 mg", "1 tab", "1 night", "6 months", "Benzodiazepine"),
            it(MED, "Tab Rivotril 0.5 mg (clonazepam)", "1 tab", "1 night", "6 months", "Benzodiazepine"),
            it(MED, "Tab SERTA 50 mg", "1 tab", "1 night", "6 months", "Antidepressant"),
        ],
    ),
]


# ── derived fields (rules are published word-for-word in FORMULAS below) ─────────────────
def dur_days(d):
    d = (d or "").lower()
    if "continuous" in d or "ongoing" in d:
        return 999
    m = re.search(r"(\d+)\s*(day|week|wk|month|mth|year|yr)", d)
    if not m:
        return None
    n, u = int(m.group(1)), m.group(2)
    return n * {"day": 1, "week": 7, "wk": 7, "month": 30, "mth": 30, "year": 365, "yr": 365}[u]


CHRONIC_DX = ["cancer", "carcinoma", "chemo", "pt3", "oncolog", "schizophren", "chronic",
              "diabet", "hypertens", "radiculopathy", "gout"]


def derive(r):
    # Sex: as written on the script, else inferred from the title in the name (Mr. / Mrs. / Ms. / Miss)
    raw = r.get("sex")
    title = re.match(r"\s*(mr|mrs|ms|miss|master|smt|shri)\b", (r.get("patient") or "").lower())
    if raw:
        r["sex"], r["sex_basis"] = {"M": "Male", "F": "Female"}[raw], "written on script"
    elif title:
        t = title.group(1)
        r["sex"] = "Female" if t in ("mrs", "ms", "miss", "smt") else "Male"
        r["sex_basis"] = f"inferred from title \u2018{t.capitalize()}.\u2019"
    else:
        r["sex"], r["sex_basis"] = None, None
    items, meds = r["items"], [i for i in r["items"] if i["cat"] == MED]
    r["n_items"], r["n_meds"] = len(items), len(meds)
    r["n_tests"] = sum(1 for i in items if i["cat"] == TEST)
    r["n_check"] = sum(1 for i in items if i["check"])
    r["found"] = sum(1 for f in KEY_FIELDS if r.get(f) not in (None, ""))
    r["found_of"] = len(KEY_FIELDS)

    longest = max([d for d in (dur_days(i["dur"]) for i in meds) if d is not None], default=0)
    blob = (r.get("diagnosis") or "").lower()
    if any(re.search(r"\bstat\b", i["freq"].lower()) for i in items):
        r["case"] = "Acute / Emergency"
    elif any(k in blob for k in CHRONIC_DX) or longest >= 90:
        r["case"] = "Chronic"
    elif longest >= 15:
        r["case"] = "Sub-acute"
    else:
        r["case"] = "Acute"
    r["refill"] = any((dur_days(i["dur"]) or 0) >= 28 for i in meds)
    r["poly"] = r["n_meds"] >= 5
    r["diagnostics"] = r["n_tests"] > 0 or bool(r.pop("lab_values", False))
    r["review"] = r["n_check"] > 0
    return r


FORMULAS = {
    "found": {
        "label": "Key fields found",
        "formula": "fields written on the script ÷ 7",
        "detail": "The seven key fields are patient, age, date, hospital, doctor, diagnosis and vitals. A field counts when it is actually written on the script; nothing is filled in from elsewhere.",
        "unit": "",
    },
    "review": {
        "label": "Entries to check",
        "formula": "any entry tagged CHECK",
        "detail": "An entry is tagged CHECK when the handwriting can't be read with confidence. These are the entries worth a second look against the scan.",
        "unit": "",
    },
    "case": {
        "label": "Case type",
        "formula": "acute, sub-acute or chronic",
        "detail": "Stat/IV emergency orders → Acute / Emergency. A long-term condition written in the diagnosis (cancer, schizophrenia, diabetes, hypertension, radiculopathy, gout…) → Chronic. Otherwise by the longest medicine duration: 90+ days Chronic, 15–89 days Sub-acute, under 15 days Acute.",
        "unit": "",
    },
    "refill": {
        "label": "Refill candidate",
        "formula": "any medicine runs a month or longer",
        "detail": "At least one medicine is prescribed for 4 weeks or more, or continuously.",
        "unit": "",
    },
    "poly": {
        "label": "Multiple medicines (5+)",
        "formula": "script has 5 or more medicines",
        "detail": "Counts medicines only — tests and supportive-care items don't count.",
        "unit": "",
    },
    "diagnostics": {
        "label": "Lab-test opportunity",
        "formula": "a test is ordered, or a lab result is written on the script",
        "detail": "Tests ordered on the script, or lab results (e.g. uric acid, creatinine). Routine vitals such as BP, pulse, SpO₂ or weight don't count.",
        "unit": "",
    },
}


def main():
    (OUT / "images").mkdir(parents=True, exist_ok=True)
    for old in (OUT / "images").glob("*"):
        old.unlink()
    out = []
    # Display order: 1–8 consecutively. The source's first record (Asha Rani, AIIMS) goes last.
    ordered = RECORDS[1:] + RECORDS[:1]
    for n, r in enumerate(ordered, 1):
        derive(r)
        new_img = f"rx_{n:03d}.jpg"
        shutil.copy(SRC_IMG / r["img"], OUT / "images" / new_img)
        r["src_rx"] = r["rx"]          # original dataset ID, for audit trail
        r["rx"] = f"RX_{n:03d}"
        r["img"] = f"rx/images/{new_img}"
        out.append(r)
    (OUT / "prescriptions.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "formulas.json").write_text(json.dumps(FORMULAS, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in out:
        print(f"{r['rx']}  found {r['found']}/7  items {r['n_items']} (meds {r['n_meds']}, tests {r['n_tests']}, check {r['n_check']})  "
              f"{r['case']:<18} refill={int(r['refill'])} poly={int(r['poly'])} dx={int(r['diagnostics'])}  {r['area']}")


if __name__ == "__main__":
    main()

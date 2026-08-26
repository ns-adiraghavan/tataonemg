#!/usr/bin/env python3
"""
generate_audit.py  —  Tata 1mg · AI Conversation Audit & Quality Analytics

Reads the raw call transcripts (.docx) and emits the demo data the audit
dashboard fetches at runtime:

    public/data/audit/conversations.json   # per-message transcript + per-conversation audit
    public/data/audit/formulas.json        # definition of every score/metric (Info buttons)
    public/data/audit/meta.json            # corpus metadata

ONE audit contract (AUDIT_PROMPT + SCHEMA) is the single source of truth. It is
used here to score the six sample transcripts AND, verbatim, by the browser
"Live Audit" module — so any new transcript is scored on exactly the same fields
and renders in the same detail view. That is what makes the metrics adapt to a
new transcript instead of being hand-wired to these six.

Two modes:
    python generate_audit.py                     # offline: writes the curated reference audit
    python generate_audit.py --live --key <KEY>  # re-audits each transcript via Gemini (same prompt)

Aggregate KPIs are NOT written to disk. They are recomputed in TypeScript from
the conversation rows at load time (see src/apps/audit/summary.ts), so adding a
7th conversation flows through every headline number with no hand-editing.

No third-party deps — stdlib only (docx is just a zip of XML).
"""

import argparse
import json
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

# ──────────────────────────────────────────────────────────────────────────────
# Input transcripts.  (customer first-name → CONV id is fixed by the Approach sheet.)
# ──────────────────────────────────────────────────────────────────────────────
INPUT_DIR = os.environ.get("AUDIT_INPUT_DIR", "input")
OUT_DIR = os.environ.get("AUDIT_OUT_DIR", "public/data/audit")

# filename fragment → (conv_id, sample_tier).  Tier is ground-truth from the file
# names; kept as metadata so we can show the engine's CSAT tracks the human label.
FILES = {
    "subscription (medicine reminder)": ("CONV_001", "Average"),
    "Refund_Return Case":               ("CONV_002", "Average"),
    "Delayed_incorrect lab report":     ("CONV_003", "Bad"),
    "Lab testing":                      ("CONV_004", "Bad"),
    "Good Conversation _ Sample 1":     ("CONV_005", "Good"),
    "Good Conversation _ Sample 2":     ("CONV_006", "Good"),
}

# ──────────────────────────────────────────────────────────────────────────────
# THE AUDIT CONTRACT — shared verbatim with the browser Live Audit engine.
# Returns ONLY this JSON object for any transcript.
# ──────────────────────────────────────────────────────────────────────────────
SCHEMA_KEYS = [
    "sentiment_start", "sentiment_end", "sentiment_trend", "predicted_csat",
    "scores", "resolution_status", "escalated", "root_cause_category",
    "root_cause_group", "root_cause_summary", "repeat_contact_signal",
    "journey_gaps", "evidence",
]

AUDIT_PROMPT = r"""
You are a customer-experience QA auditor for Tata 1mg. You are given the full
transcript of a single customer-support conversation (a voice call, transcribed
to text) between a customer and a Tata 1mg care agent.

Audit the conversation and return ONLY a valid JSON object (no markdown, no
fences, no commentary). Use exactly these keys:

{
  "sentiment_start": "customer's emotional tone in their FIRST message — one of [Positive, Neutral, Frustrated, Angry]",
  "sentiment_end":   "customer's emotional tone in their LAST message — same scale",
  "sentiment_trend": "one of [Improved, Stable, Worsened]",
  "predicted_csat":  "integer 1-5 (1=very dissatisfied, 5=very satisfied), inferred from tone, whether the issue was resolved, and how much effort the customer had to exert",
  "scores": {
    "accuracy_completeness": "0-100. Did the agent give correct info and actually use order/booking lookups?",
    "empathy_tone":          "0-100. Acknowledged frustration, courteous, human",
    "resolution_ownership":  "0-100. Drove to a concrete next step vs. deflected to another team",
    "proactivity":           "0-100. Anticipated follow-up needs, added notes, offered extra help"
  },
  "resolution_status": "one of [Resolved, Escalated - Pending, Cancelled/Refunded, Unresolved]",
  "escalated": "true if the agent had to hand the issue to another team/back-office to progress it, else false",
  "root_cause_category": "single best fit: one of [Logistics/Delivery, Product Damage/Quality, Lab Operations, Report/Diagnostics Delay, Billing/Refund, Subscription/App Feature, Informational Query, Prescription/Clinical Query, Other]",
  "root_cause_group": "coarse grouping of the category: one of [Lab & Diagnostics, Fulfilment & Delivery, Product & Returns, Billing, Digital/App, Clinical, Other]",
  "root_cause_summary": "one plain-language sentence",
  "repeat_contact_signal": "true ONLY if the customer explicitly references a prior unresolved interaction/incident about the same issue, else false",
  "journey_gaps": "array of up to 4 short strings naming process/data/visibility gaps evident in THIS conversation; [] if none",
  "evidence": {
    "csat":      "<=20-word verbatim customer quote that most explains the CSAT score",
    "ownership": "<=20-word verbatim agent quote showing ownership or deflection",
    "gap":       "<=20-word verbatim quote evidencing the top journey gap, or empty string"
  }
}

Rules:
- Judge ONLY from the transcript. Do not invent facts, orders, or outcomes.
- Quotes in "evidence" must be copied verbatim from the transcript.
- Return ONLY the JSON object.
"""

# root_cause_category → root_cause_group (used to normalise --live output too)
GROUP = {
    "Lab Operations": "Lab & Diagnostics",
    "Report/Diagnostics Delay": "Lab & Diagnostics",
    "Logistics/Delivery": "Fulfilment & Delivery",
    "Product Damage/Quality": "Product & Returns",
    "Billing/Refund": "Billing",
    "Subscription/App Feature": "Digital/App",
    "Informational Query": "Digital/App",
    "Prescription/Clinical Query": "Clinical",
    "Other": "Other",
}

# ──────────────────────────────────────────────────────────────────────────────
# CURATED reference audit for the six samples.
# Anchored on the client's indicative Output.xlsx scores, then corrected against
# the transcripts:
#   • channel relabelled Voice Call (transcribed) for all six
#   • CONV_004 repeat_contact_signal false -> true  (Rahul cites prior reschedules)
#   • order/booking IDs populated from the transcripts (blank in the sample)
#   • lab issues split per the HTML storyline: CONV_003 Report/Diagnostics Delay,
#     CONV_004 Lab Operations (both group to Lab & Diagnostics for the headline)
#   • CONV_005 recategorised Other -> Logistics/Delivery (opens on a delivery-status check)
#   • short verbatim evidence quotes attached
# Subjective scores are illustrative on n=6 and fully configurable to Tata 1mg's KPI set.
# ──────────────────────────────────────────────────────────────────────────────
CURATED = {
    "CONV_001": dict(
        sentiment_start="Neutral", sentiment_end="Positive", sentiment_trend="Improved",
        predicted_csat=5,
        scores=dict(accuracy_completeness=95, empathy_tone=92, resolution_ownership=100, proactivity=85),
        resolution_status="Resolved", escalated=False,
        root_cause_category="Subscription/App Feature",
        root_cause_summary="Customer needed help activating a medicine subscription / auto-reminder.",
        repeat_contact_signal=False, journey_gaps=[],
        evidence=dict(csat="Perfect, that's exactly what I needed.",
                      ownership="I've set up a subscription with a 30-day cycle for both",
                      gap=""),
    ),
    "CONV_002": dict(
        sentiment_start="Neutral", sentiment_end="Positive", sentiment_trend="Improved",
        predicted_csat=5,
        scores=dict(accuracy_completeness=95, empathy_tone=85, resolution_ownership=90, proactivity=88),
        resolution_status="Resolved", escalated=False,
        root_cause_category="Product Damage/Quality",
        root_cause_summary="BP monitor arrived with a cracked display; customer wanted refund or replacement.",
        repeat_contact_signal=False, journey_gaps=[],
        evidence=dict(csat="Appreciate the smooth process.",
                      ownership="I've raised a return request for the BP monitor",
                      gap=""),
    ),
    "CONV_003": dict(
        sentiment_start="Angry", sentiment_end="Frustrated", sentiment_trend="Stable",
        predicted_csat=2,
        scores=dict(accuracy_completeness=95, empathy_tone=90, resolution_ownership=75, proactivity=80),
        resolution_status="Escalated - Pending", escalated=True,
        root_cause_category="Report/Diagnostics Delay",
        root_cause_summary="Lab did not notify the customer of a sample issue, delaying the report before an appointment.",
        repeat_contact_signal=False,
        journey_gaps=[
            "No proactive notification when the lab flagged a sample issue",
            "No after-hours operations support for urgent rescheduling",
        ],
        evidence=dict(csat="This has completely messed up my appointment.",
                      ownership="I can raise an urgent escalation",
                      gap="Nobody informed me about that. What does that even mean?"),
    ),
    "CONV_004": dict(
        sentiment_start="Frustrated", sentiment_end="Frustrated", sentiment_trend="Stable",
        predicted_csat=1,
        scores=dict(accuracy_completeness=95, empathy_tone=85, resolution_ownership=70, proactivity=60),
        resolution_status="Cancelled/Refunded", escalated=True,
        root_cause_category="Lab Operations",
        root_cause_summary="Phlebotomist never arrived for a booked home collection; customer cancelled and churned.",
        repeat_contact_signal=True,  # corrected: cites prior reschedules
        journey_gaps=[
            "No real-time visibility into lab technician status",
            "Service-delivery failure leading to customer churn",
        ],
        evidence=dict(csat="Forget it, I'll just go to a local lab instead.",
                      ownership="I don't have a way to guarantee a same-day slot from my end",
                      gap="This isn't the first time either. Last month my sample collection got rescheduled twice."),
    ),
    "CONV_005": dict(
        sentiment_start="Positive", sentiment_end="Positive", sentiment_trend="Stable",
        predicted_csat=5,
        scores=dict(accuracy_completeness=100, empathy_tone=95, resolution_ownership=100, proactivity=80),
        resolution_status="Resolved", escalated=False,
        root_cause_category="Logistics/Delivery",  # recategorised from Other
        root_cause_summary="Customer checked delivery status and confirmed the prescribed brand was not substituted.",
        repeat_contact_signal=False, journey_gaps=[],
        evidence=dict(csat="5 stars for you",
                      ownership="I've also added a note on the order requesting delivery after 7 PM",
                      gap=""),
    ),
    "CONV_006": dict(
        sentiment_start="Neutral", sentiment_end="Positive", sentiment_trend="Improved",
        predicted_csat=5,
        scores=dict(accuracy_completeness=95, empathy_tone=98, resolution_ownership=100, proactivity=100),
        resolution_status="Resolved", escalated=False,
        root_cause_category="Prescription/Clinical Query",
        root_cause_summary="Customer needed insulin storage guidance and to order a newly prescribed insulin.",
        repeat_contact_signal=False, journey_gaps=[],
        evidence=dict(csat="This has been incredibly helpful, Neha.",
                      ownership="I've placed the order; it should arrive by 6 PM today",
                      gap=""),
    ),
}

# ──────────────────────────────────────────────────────────────────────────────
# .docx reader (stdlib) → ordered list of paragraph strings
# ──────────────────────────────────────────────────────────────────────────────
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def docx_paragraphs(path):
    """Return a flat list of non-empty lines. Soft line-breaks (<w:br/>, <w:cr/>)
    inside a paragraph are treated as line separators, so a header block written
    as one paragraph with breaks still splits into Channel / Customer / Agent."""
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    lines = []
    for p in root.iter(f"{W}p"):
        buf = []
        for node in p.iter():
            tag = node.tag
            if tag == f"{W}t":
                buf.append(node.text or "")
            elif tag in (f"{W}br", f"{W}cr"):
                buf.append("\n")
        for ln in "".join(buf).split("\n"):
            if ln.strip():
                lines.append(ln.strip())
    return lines


ORDER_RE = re.compile(r"#?\b((?:1MG|LAB)\d{4,})\b")


def parse_transcript(paras):
    """Return (header, messages). header has channel/customer/agent; messages
    is a list of {speaker, role, text}."""
    header = {"channel": None, "customer": None, "agent": None}
    body = []
    for line in paras:
        low = line.lower()
        if low.startswith("channel"):
            header["channel"] = line.split(":", 1)[1].strip()
            continue
        if low.startswith("customer"):
            header["customer"] = line.split(":", 1)[1].strip()
            continue
        if low.startswith("agent"):
            header["agent"] = line.split(":", 1)[1].strip()
            continue
        body.append(line)

    cust_first = (header["customer"] or "").split()[0] if header["customer"] else ""
    agent_first = (header["agent"] or "").split()[0] if header["agent"] else ""

    messages = []
    for line in body:
        m = re.match(r"^([A-Za-z][\w' .()-]*?):\s*(.*)$", line)
        if m and m.group(1).split()[0] in (cust_first, agent_first):
            name = m.group(1).strip()
            role = "customer" if name.split()[0] == cust_first else "agent"
            messages.append({"speaker": name, "role": role, "text": m.group(2).strip()})
        else:
            # attachment / continuation line ("[image attached]") → attach to prev speaker
            if messages:
                prev = messages[-1]
                messages.append({"speaker": prev["speaker"], "role": prev["role"],
                                 "text": line.strip(), "system": True})
    return header, messages


def extract_order_id(messages):
    for msg in messages:
        m = ORDER_RE.search(msg["text"])
        if m:
            return m.group(1)
    return "Not captured"


# ──────────────────────────────────────────────────────────────────────────────
# --live path (optional): re-audit a transcript through Gemini with AUDIT_PROMPT
# ──────────────────────────────────────────────────────────────────────────────
def audit_via_gemini(transcript_text, api_key, model="gemini-2.5-flash"):
    import urllib.request
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{model}:generateContent?key={api_key}")
    payload = {
        "contents": [{"parts": [{"text": AUDIT_PROMPT + "\n\nTRANSCRIPT:\n" + transcript_text}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json",
                             "maxOutputTokens": 4096},
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
    obj = json.loads(text[text.index("{"): text.rindex("}") + 1])
    obj["root_cause_group"] = GROUP.get(obj.get("root_cause_category", "Other"), "Other")
    return obj


# ──────────────────────────────────────────────────────────────────────────────
# formulas.json — every derived metric's definition (drives the Info buttons)
# ──────────────────────────────────────────────────────────────────────────────
FORMULAS = {
    "predicted_csat": {"label": "Predicted CSAT", "unit": "/5",
        "formula": "engine-inferred, 1–5",
        "detail": "Inferred from opening/closing sentiment, whether the issue was resolved, and the effort the customer had to exert. Not a surveyed score."},
    "handoff_rate": {"label": "Handoff / escalation rate", "unit": "%",
        "formula": "escalated conversations ÷ total",
        "detail": "Share of conversations the agent could not close at first contact and had to hand to a back-office/ops team."},
    "avg_csat": {"label": "Average CSAT", "unit": "/5",
        "formula": "mean(predicted_csat)",
        "detail": "Mean predicted CSAT across all audited conversations."},
    "accuracy_completeness": {"label": "Accuracy & completeness", "unit": "%",
        "formula": "score 0–100",
        "detail": "Correct information given and order/booking lookups actually used."},
    "empathy_tone": {"label": "Empathy & tone", "unit": "%",
        "formula": "score 0–100",
        "detail": "Acknowledgement of frustration and courteous, human language."},
    "resolution_ownership": {"label": "Resolution ownership", "unit": "%",
        "formula": "score 0–100",
        "detail": "Whether the agent drove to a concrete next step versus deflecting to another team. In this sample it is the cleanest separator of CSAT."},
    "proactivity": {"label": "Proactivity", "unit": "%",
        "formula": "score 0–100",
        "detail": "Anticipated follow-up needs, added notes, offered extra help."},
    "repeat_contact_signal": {"label": "Repeat-contact signal", "unit": "",
        "formula": "boolean",
        "detail": "True when the customer explicitly references a prior unresolved incident about the same issue."},
    "churn_risk": {"label": "Churn risk", "unit": "",
        "formula": "High if Cancelled/Refunded OR (CSAT ≤ 2 AND ends Frustrated/Angry); Medium if escalated & pending; else Low",
        "detail": "Derived from resolution outcome, closing sentiment and predicted CSAT — recomputed in the frontend from the conversation row."},
    "journey_gaps": {"label": "Journey gaps", "unit": "",
        "formula": "engine-extracted list",
        "detail": "Process, data or visibility gaps evident in the conversation — the operational-improvement backlog."},
}


def build():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true", help="re-audit transcripts via Gemini")
    ap.add_argument("--key", default=os.environ.get("GEMINI_API_KEY", ""))
    args = ap.parse_args()

    # locate files
    found = {}
    for fn in os.listdir(INPUT_DIR):
        for frag, (cid, tier) in FILES.items():
            if frag.lower() in fn.lower():
                found[cid] = (os.path.join(INPUT_DIR, fn), tier)
    missing = set(c for c, _ in FILES.values()) - set(found)
    if missing:
        sys.exit(f"Missing transcripts for: {sorted(missing)}  (looked in {INPUT_DIR})")

    conversations = []
    for cid in sorted(found):
        path, tier = found[cid]
        header, messages = parse_transcript(docx_paragraphs(path))
        order_id = extract_order_id(messages)

        if args.live:
            if not args.key:
                sys.exit("--live needs --key or GEMINI_API_KEY")
            plain = "\n".join(f'{m["speaker"]}: {m["text"]}' for m in messages)
            audit = audit_via_gemini(plain, args.key)
        else:
            audit = dict(CURATED[cid])
            audit["root_cause_group"] = GROUP.get(audit["root_cause_category"], "Other")

        conversations.append({
            "id": cid,
            "customer": header["customer"],
            "agent": header["agent"],
            "channel": "Voice Call (transcribed)",
            "tier": tier,
            "order_or_booking_id": order_id,
            "message_count": len(messages),
            "messages": messages,
            "audit": audit,
        })

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "conversations.json"), "w", encoding="utf-8") as f:
        json.dump(conversations, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT_DIR, "formulas.json"), "w", encoding="utf-8") as f:
        json.dump(FORMULAS, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT_DIR, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({
            "n_conversations": len(conversations),
            "channel": "Voice Call (transcribed)",
            "source": "6 raw call transcripts",
            "mode": "live" if args.live else "curated",
            "note": "Aggregate KPIs are recomputed in the frontend from these rows.",
        }, f, ensure_ascii=False, indent=2)

    verify(conversations)


# ──────────────────────────────────────────────────────────────────────────────
# verification print — the same aggregates the frontend will recompute
# ──────────────────────────────────────────────────────────────────────────────
def churn_risk(a):
    if a["resolution_status"] == "Cancelled/Refunded" or \
       (a["predicted_csat"] <= 2 and a["sentiment_end"] in ("Frustrated", "Angry")):
        return "High"
    if a["escalated"]:
        return "Medium"
    return "Low"


def verify(conversations):
    n = len(conversations)
    A = [c["audit"] for c in conversations]
    csat = [a["predicted_csat"] for a in A]
    esc = [a for a in A if a["escalated"]]
    print(f"\n{'='*66}\nVERIFY · {n} conversations\n{'='*66}")
    print(f"Avg CSAT           : {sum(csat)/n:.2f}   values {csat}")
    print(f"Handoff/esc. rate  : {len(esc)}/{n} = {len(esc)/n*100:.0f}%")
    from collections import Counter
    print(f"Resolution mix     : {dict(Counter(a['resolution_status'] for a in A))}")
    print(f"Root-cause category: {dict(Counter(a['root_cause_category'] for a in A))}")
    print(f"Root-cause group   : {dict(Counter(a['root_cause_group'] for a in A))}")
    print(f"Churn risk          : {dict(Counter(churn_risk(a) for a in A))}")
    for k in ("accuracy_completeness", "empathy_tone", "resolution_ownership", "proactivity"):
        vals = [a["scores"][k] for a in A]
        print(f"Avg {k:22}: {sum(vals)/n:.1f}")
    print("\nEscalations → 100% Lab & Diagnostics:")
    for c in conversations:
        a = c["audit"]
        if a["escalated"]:
            print(f"  {c['id']} {c['customer']:14} {a['root_cause_category']:24} "
                  f"CSAT {a['predicted_csat']} · churn {churn_risk(a)}")
    print("\nResolution-ownership vs CSAT (cleanest separator):")
    for c in sorted(conversations, key=lambda x: -x['audit']['scores']['resolution_ownership']):
        a = c["audit"]
        print(f"  {c['id']} ownership {a['scores']['resolution_ownership']:>3}  →  CSAT {a['predicted_csat']}")


if __name__ == "__main__":
    build()

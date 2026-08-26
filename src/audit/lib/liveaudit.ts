import { config } from "../config";
import type { Audit } from "../types";

// ── AUDIT CONTRACT — kept verbatim in sync with scripts/generate_audit.py.
//    Any transcript pasted here is scored on the same fields as the stored six,
//    so the live result renders in the same audit panel. ──
const AUDIT_PROMPT = `
You are a customer-experience QA auditor for Tata 1mg. You are given the full
transcript of a single customer-support conversation (a voice call, transcribed
to text) between a customer and a Tata 1mg care agent.

Audit the conversation and return ONLY a valid JSON object (no markdown, no
fences, no commentary). Use exactly these keys:

{
  "sentiment_start": "customer's tone in their FIRST message — one of [Positive, Neutral, Frustrated, Angry]",
  "sentiment_end":   "customer's tone in their LAST message — same scale",
  "sentiment_trend": "one of [Improved, Stable, Worsened]",
  "predicted_csat":  "integer 1-5 (1=very dissatisfied, 5=very satisfied), inferred from tone, resolution and customer effort",
  "scores": {
    "accuracy_completeness": "0-100. Correct info and order/booking lookups actually used",
    "empathy_tone":          "0-100. Acknowledged frustration, courteous, human",
    "resolution_ownership":  "0-100. Drove to a concrete next step vs. deflected",
    "proactivity":           "0-100. Anticipated follow-up needs, added notes, offered extra help"
  },
  "resolution_status": "one of [Resolved, Escalated - Pending, Cancelled/Refunded, Unresolved]",
  "escalated": "true if the agent had to hand the issue to another team to progress it, else false",
  "root_cause_category": "single best fit: one of [Logistics/Delivery, Product Damage/Quality, Lab Operations, Report/Diagnostics Delay, Billing/Refund, Subscription/App Feature, Informational Query, Prescription/Clinical Query, Other]",
  "root_cause_group": "coarse grouping: one of [Lab & Diagnostics, Fulfilment & Delivery, Product & Returns, Billing, Digital/App, Clinical, Other]",
  "root_cause_summary": "one plain-language sentence",
  "repeat_contact_signal": "true ONLY if the customer explicitly references a prior unresolved incident about the same issue, else false",
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
`;

const GROUP: Record<string, string> = {
  "Lab Operations": "Lab & Diagnostics",
  "Report/Diagnostics Delay": "Lab & Diagnostics",
  "Logistics/Delivery": "Fulfilment & Delivery",
  "Product Damage/Quality": "Product & Returns",
  "Billing/Refund": "Billing",
  "Subscription/App Feature": "Digital/App",
  "Informational Query": "Digital/App",
  "Prescription/Clinical Query": "Clinical",
  Other: "Other",
};

function firstJson(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("No JSON object in response");
  let depth = 0,
    inStr = false,
    esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Response truncated before JSON closed (raise maxOutputTokens)");
}

export async function auditTranscript(
  transcript: string,
  apiKey: string
): Promise<Audit> {
  const url = `${config.gemini.endpoint}/${config.gemini.model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: AUDIT_PROMPT + "\n\nTRANSCRIPT:\n" + transcript }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 400 && /API_KEY/i.test(t)) throw new Error("Invalid password");
    throw new Error(`Engine call failed (${res.status}). ${t.slice(0, 160)}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") ?? "";
  if (!text) throw new Error("Empty response from the engine");

  const a = JSON.parse(firstJson(text)) as Audit;
  a.root_cause_group = GROUP[a.root_cause_category] ?? a.root_cause_group ?? "Other";
  if (!Array.isArray(a.journey_gaps)) a.journey_gaps = [];
  if (!a.evidence) a.evidence = { csat: "", ownership: "", gap: "" };
  return a;
}

// Split a pasted "Name: text" transcript into rendered messages. Agent lines are
// detected by a light heuristic (matches Tata 1mg care-agent naming); everything
// else is the customer. Good enough for the demo's live-paste path.
export function splitTranscript(
  raw: string
): { speaker: string; role: "customer" | "agent"; text: string }[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const speakers = new Set<string>();
  const parsed = lines
    .map((l) => {
      const m = l.match(/^([A-Za-z][\w' .()-]{0,40}?):\s*(.*)$/);
      if (!m) return null;
      speakers.add(m[1].trim());
      return { name: m[1].trim(), text: m[2].trim() };
    })
    .filter(Boolean) as { name: string; text: string }[];
  // Heuristic: the speaker whose lines mention care/agent cues, else 2nd speaker.
  const names = Array.from(speakers);
  const agentName =
    names.find((n) => /care|agent|support|tata|1mg/i.test(n)) ?? names[1] ?? "";
  return parsed.map((p) => ({
    speaker: p.name,
    role: p.name === agentName ? "agent" : "customer",
    text: p.text,
  }));
}

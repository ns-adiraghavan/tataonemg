import type { Audit, ChurnRisk, Conversation } from "../types";

// Every number the dashboard shows is derived here from the raw rows, so a 7th
// conversation (or a re-audit) flows through with no hand-editing.

const round = (n: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export function churnRisk(a: Audit): ChurnRisk {
  if (
    a.resolution_status === "Cancelled/Refunded" ||
    (a.predicted_csat <= 2 &&
      (a.sentiment_end === "Frustrated" || a.sentiment_end === "Angry"))
  )
    return "High";
  if (a.escalated) return "Medium";
  return "Low";
}

export const SCORE_KEYS = [
  "accuracy_completeness",
  "empathy_tone",
  "resolution_ownership",
  "proactivity",
] as const;

export const SCORE_LABEL: Record<string, string> = {
  accuracy_completeness: "Accuracy & completeness",
  empathy_tone: "Empathy & tone",
  resolution_ownership: "Resolution ownership",
  proactivity: "Proactivity",
};

export interface Summary {
  n: number;
  avg_csat: number;
  handoff_rate: number; // %
  escalations: number;
  resolved: number;
  by_resolution: Record<string, number>;
  by_category: Record<string, number>;
  by_group: Record<string, number>;
  by_trend: Record<string, number>;
  by_churn: Record<ChurnRisk, number>;
  avg_scores: Record<string, number>;
  repeat_contacts: number;
  total_gaps: number;
}

function tally<T extends string>(xs: T[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const x of xs) o[x] = (o[x] ?? 0) + 1;
  return o;
}

export function summarize(C: Conversation[]): Summary {
  const n = C.length || 1;
  const A = C.map((c) => c.audit);
  const esc = A.filter((a) => a.escalated).length;
  const avg_scores: Record<string, number> = {};
  for (const k of SCORE_KEYS)
    avg_scores[k] = round(A.reduce((s, a) => s + a.scores[k], 0) / n, 1);
  const churn = A.map(churnRisk);
  return {
    n: C.length,
    avg_csat: round(A.reduce((s, a) => s + a.predicted_csat, 0) / n, 2),
    handoff_rate: Math.round((esc / n) * 100),
    escalations: esc,
    resolved: A.filter((a) => a.resolution_status === "Resolved").length,
    by_resolution: tally(A.map((a) => a.resolution_status)),
    by_category: tally(A.map((a) => a.root_cause_category)),
    by_group: tally(A.map((a) => a.root_cause_group)),
    by_trend: tally(A.map((a) => a.sentiment_trend)),
    by_churn: {
      Low: churn.filter((x) => x === "Low").length,
      Medium: churn.filter((x) => x === "Medium").length,
      High: churn.filter((x) => x === "High").length,
    },
    avg_scores,
    repeat_contacts: A.filter((a) => a.repeat_contact_signal).length,
    total_gaps: A.reduce((s, a) => s + a.journey_gaps.length, 0),
  };
}

export interface GroupRow {
  group: string;
  conversations: number;
  escalations: number;
  escalation_rate: number; // %
  avg_csat: number;
  priority: "High" | "Medium" | "Low";
}

// Escalation concentration + CSAT cost by root-cause group — the direct answer
// to "where do handoffs come from and what do they cost".
export function byGroup(C: Conversation[]): GroupRow[] {
  const groups = Array.from(new Set(C.map((c) => c.audit.root_cause_group)));
  const rows = groups.map((g) => {
    const inG = C.filter((c) => c.audit.root_cause_group === g);
    const esc = inG.filter((c) => c.audit.escalated).length;
    const rate = Math.round((esc / inG.length) * 100);
    const avg = round(
      inG.reduce((s, c) => s + c.audit.predicted_csat, 0) / inG.length,
      1
    );
    const priority: GroupRow["priority"] =
      esc > 0 && avg <= 2 ? "High" : esc > 0 || avg < 4 ? "Medium" : "Low";
    return {
      group: g,
      conversations: inG.length,
      escalations: esc,
      escalation_rate: rate,
      avg_csat: avg,
      priority,
    };
  });
  // escalation-heavy, low-CSAT groups first
  return rows.sort(
    (a, b) => b.escalation_rate - a.escalation_rate || a.avg_csat - b.avg_csat
  );
}

export interface AgentRow {
  agent: string;
  agentShort: string;
  csat: number;
  scores: Audit["scores"];
  resolution: string;
  churn: ChurnRisk;
}

export function byAgent(C: Conversation[]): AgentRow[] {
  return C.map((c) => ({
    agent: c.agent,
    agentShort: c.agent.split(" (")[0],
    csat: c.audit.predicted_csat,
    scores: c.audit.scores,
    resolution: c.audit.resolution_status,
    churn: churnRisk(c.audit),
  })).sort((a, b) => b.csat - a.csat || b.scores.resolution_ownership - a.scores.resolution_ownership);
}

// Journey gaps aggregated across the corpus (the operational-improvement backlog)
export function gaps(C: Conversation[]): { text: string; conv: string; group: string }[] {
  const out: { text: string; conv: string; group: string }[] = [];
  for (const c of C)
    for (const g of c.audit.journey_gaps)
      out.push({ text: g, conv: c.id, group: c.audit.root_cause_group });
  return out;
}

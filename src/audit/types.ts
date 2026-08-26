export type Sentiment = "Positive" | "Neutral" | "Frustrated" | "Angry";
export type Trend = "Improved" | "Stable" | "Worsened";
export type Resolution =
  | "Resolved"
  | "Escalated - Pending"
  | "Cancelled/Refunded"
  | "Unresolved";
export type ChurnRisk = "Low" | "Medium" | "High";

export interface Scores {
  accuracy_completeness: number;
  empathy_tone: number;
  resolution_ownership: number;
  proactivity: number;
}

export interface Audit {
  sentiment_start: Sentiment;
  sentiment_end: Sentiment;
  sentiment_trend: Trend;
  predicted_csat: number;
  scores: Scores;
  resolution_status: Resolution;
  escalated: boolean;
  root_cause_category: string;
  root_cause_group: string;
  root_cause_summary: string;
  repeat_contact_signal: boolean;
  journey_gaps: string[];
  evidence: { csat: string; ownership: string; gap: string };
}

export interface Message {
  speaker: string;
  role: "customer" | "agent";
  text: string;
  system?: boolean;
}

export interface Conversation {
  id: string;
  customer: string;
  agent: string;
  channel: string;
  tier: "Good" | "Average" | "Bad";
  order_or_booking_id: string;
  message_count: number;
  messages: Message[];
  audit: Audit;
}

export interface Meta {
  n_conversations: number;
  channel: string;
  source: string;
  mode: string;
  note?: string;
}

export interface FormulaDef {
  label: string;
  formula: string;
  detail: string;
  unit: string;
}
export type Formulas = Record<string, FormulaDef>;

export type TabKey =
  | "overview"
  | "conversation"
  | "handoff"
  | "quality"
  | "actions"
  | "live";

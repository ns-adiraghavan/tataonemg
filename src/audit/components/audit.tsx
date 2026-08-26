import type { Audit, ChurnRisk, Formulas, Sentiment } from "../types";
import { churnRisk, SCORE_KEYS, SCORE_LABEL } from "../lib/audit";
import { Info } from "../../components/ui";

export function csatColor(v: number) {
  return v >= 4 ? "var(--green)" : v >= 3 ? "var(--amber)" : "var(--coral-dp)";
}
export function scoreColor(v: number) {
  return v >= 90 ? "var(--green)" : v >= 80 ? "var(--amber)" : "var(--coral-dp)";
}
const SENT_COLOR: Record<Sentiment, string> = {
  Positive: "var(--green)",
  Neutral: "var(--slate)",
  Frustrated: "var(--amber)",
  Angry: "var(--coral-dp)",
};
const CHURN_CLASS: Record<ChurnRisk, string> = {
  Low: "lo",
  Medium: "md",
  High: "hi",
};

export function ResolutionPill({ status }: { status: string }) {
  const cls =
    status === "Resolved"
      ? "ok"
      : status === "Cancelled/Refunded"
        ? "bad"
        : "warn";
  return <span className={`rpill ${cls}`}>{status}</span>;
}

export function ChurnBadge({ audit }: { audit: Audit }) {
  const r = churnRisk(audit);
  return <span className={`crisk ${CHURN_CLASS[r]}`}>Churn risk · {r}</span>;
}

function SentimentArc({ a }: { a: Audit }) {
  return (
    <div className="arc">
      <span className="dot" style={{ background: SENT_COLOR[a.sentiment_start] }} />
      <b>{a.sentiment_start}</b>
      <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden>
        <path d="M1 5h20m0 0l-4-3m4 3l-4 3" stroke="var(--faint)" strokeWidth="1.3" fill="none" />
      </svg>
      <span className="dot" style={{ background: SENT_COLOR[a.sentiment_end] }} />
      <b>{a.sentiment_end}</b>
      <span className="tr-tag">{a.sentiment_trend}</span>
    </div>
  );
}

function ScoreBars({ a, formulas }: { a: Audit; formulas: Formulas }) {
  return (
    <div className="scorebars">
      {SCORE_KEYS.map((k) => {
        const v = a.scores[k];
        return (
          <div className="sb-row" key={k}>
            <div className="sb-lbl">
              {SCORE_LABEL[k]}
              <Info def={formulas[k]} />
            </div>
            <div className="sb-track">
              <div className="sb-fill" style={{ width: `${v}%`, background: scoreColor(v) }} />
            </div>
            <div className="sb-num">{v}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Full audit read-out. Used for a stored conversation and for a live result. */
export function AuditPanel({
  audit,
  formulas,
  header,
}: {
  audit: Audit;
  formulas: Formulas;
  header?: React.ReactNode;
}) {
  const a = audit;
  return (
    <div className="audp">
      {header}

      <div className="audp-top">
        <div className="csat-big" style={{ color: csatColor(a.predicted_csat) }}>
          {a.predicted_csat}
          <small>/5</small>
        </div>
        <div className="csat-side">
          <div className="csat-lab">
            Predicted CSAT <Info def={formulas.predicted_csat} />
          </div>
          <ChurnBadge audit={a} />
          <div style={{ marginTop: 8 }}>
            <ResolutionPill status={a.resolution_status} />
            {a.escalated && <span className="esc-flag">↗ Escalated</span>}
          </div>
        </div>
      </div>

      <SentimentArc a={a} />

      <div className="audp-sec">
        <div className="audp-h">Agent quality</div>
        <ScoreBars a={a} formulas={formulas} />
      </div>

      <div className="audp-sec">
        <div className="audp-h">Root cause</div>
        <div className="rc-line">
          <span className="rc-cat">{a.root_cause_category}</span>
          <span className="rc-grp">{a.root_cause_group}</span>
        </div>
        <p className="rc-sum">{a.root_cause_summary}</p>
      </div>

      <div className="audp-sec">
        <div className="audp-h">
          Journey gaps <Info def={formulas.journey_gaps} />
          {a.repeat_contact_signal && (
            <span className="repeat-flag">↻ Repeat contact</span>
          )}
        </div>
        {a.journey_gaps.length ? (
          <ul className="gaps">
            {a.journey_gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        ) : (
          <p className="gaps-none">None identified — clean interaction.</p>
        )}
      </div>

      {(a.evidence?.csat || a.evidence?.ownership || a.evidence?.gap) && (
        <div className="audp-sec">
          <div className="audp-h">Evidence from transcript</div>
          <div className="evi">
            {a.evidence.csat && (
              <div className="evi-row">
                <span className="evi-k">CSAT</span>
                <span className="evi-q">“{a.evidence.csat}”</span>
              </div>
            )}
            {a.evidence.ownership && (
              <div className="evi-row">
                <span className="evi-k">Ownership</span>
                <span className="evi-q">“{a.evidence.ownership}”</span>
              </div>
            )}
            {a.evidence.gap && (
              <div className="evi-row">
                <span className="evi-k">Gap</span>
                <span className="evi-q">“{a.evidence.gap}”</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

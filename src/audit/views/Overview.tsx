import type { AllData } from "../data/store";
import { Card, Donut, HBar, Info, RAMP } from "../../components/ui";
import { csatColor } from "../components/audit";
import { summarize } from "../lib/audit";

const TREND_COLOR: Record<string, string> = {
  Improved: "var(--green)",
  Stable: "var(--slate)",
  Worsened: "var(--coral-dp)",
};
const RES_COLOR: Record<string, string> = {
  Resolved: "var(--green)",
  "Escalated - Pending": "var(--amber)",
  "Cancelled/Refunded": "var(--coral-dp)",
  Unresolved: "var(--faint)",
};

export function Overview({ d }: { d: AllData }) {
  const C = d.conversations;
  const S = summarize(C);

  const trend = Object.entries(S.by_trend).map(([name, value]) => ({
    name,
    value,
    color: TREND_COLOR[name] ?? "var(--slate)",
  }));
  const res = Object.entries(S.by_resolution).map(([name, value]) => ({
    name,
    value,
    color: RES_COLOR[name] ?? "var(--slate)",
  }));
  const groups = Object.entries(S.by_group)
    .sort((a, b) => b[1] - a[1])
    .map(([lbl, val], i) => ({ lbl, val, color: RAMP[i % RAMP.length] }));

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">01</span>
          <h2>Overview</h2>
        </div>
        <p className="sec-sub">
          The situational read across all {S.n} audited conversations — sentiment direction,
          how contacts resolve, and where they concentrate. Every metric recomputes from the
          conversation rows, so the picture holds as the corpus grows.
        </p>

        <div className="grid">
          <Card
            title="CSAT by conversation"
            q="Predicted CSAT (1–5), coloured by outcome"
            info={<Info def={d.formulas.predicted_csat} />}
          >
            <div className="csat-bars">
              {C.map((c) => (
                <div className="csat-col" key={c.id} title={`${c.customer} · ${c.audit.resolution_status}`}>
                  <div className="csat-colbar">
                    <div
                      className="csat-colfill"
                      style={{
                        height: `${(c.audit.predicted_csat / 5) * 100}%`,
                        background: csatColor(c.audit.predicted_csat),
                      }}
                    />
                  </div>
                  <div className="csat-collab">{c.id.replace("CONV_", "")}</div>
                </div>
              ))}
            </div>
            <p className="mini-note">
              Average {S.avg_csat}/5 — pulled down entirely by the two lab conversations
              (CSAT 2 and 1).
            </p>
          </Card>

          <Card title="Resolution mix" q="How the contacts closed">
            <Donut data={res} centerTop={S.n} centerSub="CONTACTS" />
          </Card>

          <Card title="Sentiment trend" q="Direction from opening to closing message">
            <Donut
              data={trend}
              centerTop={`${Math.round((S.by_trend.Improved ?? 0) / S.n * 100)}%`}
              centerSub="IMPROVED"
            />
          </Card>

          <Card
            title="Root-cause groups"
            q="Where contacts concentrate"
          >
            <HBar rows={groups} />
          </Card>
        </div>
      </div>
    </div>
  );
}

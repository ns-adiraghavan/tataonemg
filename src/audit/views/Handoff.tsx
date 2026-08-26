import type { AllData } from "../data/store";
import { Card, HBar, Info } from "../../components/ui";
import { byGroup, summarize, churnRisk } from "../lib/audit";
import { ResolutionPill } from "../components/audit";

export function Handoff({ d }: { d: AllData }) {
  const C = d.conversations;
  const S = summarize(C);
  const rows = byGroup(C);
  const escConvs = C.filter((c) => c.audit.escalated);

  // share of escalations that fall in the top group
  const escByGroup: Record<string, number> = {};
  for (const c of escConvs)
    escByGroup[c.audit.root_cause_group] = (escByGroup[c.audit.root_cause_group] ?? 0) + 1;
  const topGroup = Object.entries(escByGroup).sort((a, b) => b[1] - a[1])[0];
  const topShare = topGroup ? Math.round((topGroup[1] / escConvs.length) * 100) : 0;

  const rateRows = rows.map((r) => ({
    lbl: r.group,
    val: r.escalation_rate,
    color: r.escalation_rate > 0 ? "var(--coral)" : "var(--slate)",
  }));

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">02</span>
          <h2>Handoff &amp; Escalation</h2>
        </div>
        <p className="sec-sub">
          A direct read on Tata 1mg's stated problem. In this sample the handoff rate is{" "}
          {S.handoff_rate}% ({S.escalations} of {S.n}) — and the escalations are not spread evenly.
        </p>

        <div className="callout">
          <div className="callout-big">{topShare}%</div>
          <div className="callout-txt">
            of escalations trace to <b>{topGroup?.[0]}</b> — a delayed report and a technician
            no-show, not generic chatbot-to-agent handoff. Handoff reduction should prioritise{" "}
            <b>lab-operations system integration</b> over broad contact-flow retuning.
          </div>
        </div>

        <div className="grid">
          <Card
            title="Escalation rate by root-cause group"
            q="Where handoffs originate"
            info={<Info def={d.formulas.handoff_rate} />}
            span2
          >
            <HBar rows={rateRows} max={100} />
          </Card>
        </div>

        <div className="tbl-wrap" style={{ marginTop: 16 }}>
          <table className="atab">
            <thead>
              <tr>
                <th>Root-cause group</th>
                <th className="num">Conversations</th>
                <th className="num">Escalation rate</th>
                <th className="num">Avg CSAT</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.group}>
                  <td className="nm">{r.group}</td>
                  <td className="num">{r.conversations}</td>
                  <td className="num">{r.escalation_rate}%</td>
                  <td className="num" style={{ color: r.avg_csat <= 2 ? "var(--coral-dp)" : undefined }}>
                    {r.avg_csat}
                  </td>
                  <td>
                    <span className={`prio ${r.priority.toLowerCase()}`}>{r.priority}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sec-h" style={{ marginTop: 26 }}>
          <span className="n">·</span>
          <h2 style={{ fontSize: 15 }}>Escalated conversations</h2>
        </div>
        <div className="esc-grid">
          {escConvs.map((c) => (
            <div className="esc-card" key={c.id}>
              <div className="esc-top">
                <span className="chip coral">{c.id}</span>
                <ResolutionPill status={c.audit.resolution_status} />
              </div>
              <div className="esc-name">
                {c.customer} · CSAT {c.audit.predicted_csat}/5 · churn {churnRisk(c.audit)}
              </div>
              <div className="esc-cat">{c.audit.root_cause_category}</div>
              <ul className="gaps">
                {c.audit.journey_gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

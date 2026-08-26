import type { AllData } from "../data/store";
import { Card, HBar, Info } from "../../components/ui";
import { byAgent, summarize, SCORE_LABEL } from "../lib/audit";
import { csatColor, scoreColor } from "../components/audit";

export function AgentQuality({ d }: { d: AllData }) {
  const C = d.conversations;
  const S = summarize(C);
  const agents = byAgent(C);

  const scoreRows = Object.entries(S.avg_scores).map(([k, v]) => ({
    lbl: SCORE_LABEL[k],
    val: v,
    color: scoreColor(v),
  }));

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">03</span>
          <h2>Agent Quality</h2>
        </div>
        <p className="sec-sub">
          Four scored dimensions per interaction. Across this sample, resolution ownership is the
          cleanest separator of CSAT — the lever worth coaching to.
        </p>

        <div className="grid">
          <Card title="Average agent scorecard" q="Mean score across all audited conversations">
            <HBar rows={scoreRows} max={100} />
          </Card>

          <Card
            title="Resolution ownership vs CSAT"
            q="The clean separator: ownership ≥90 → CSAT 5, ≤75 → CSAT ≤2"
            info={<Info def={d.formulas.resolution_ownership} />}
          >
            <div className="sep">
              {C.slice()
                .sort((a, b) => b.audit.scores.resolution_ownership - a.audit.scores.resolution_ownership)
                .map((c) => (
                  <div className="sep-row" key={c.id}>
                    <span className="sep-agent">{c.agent.split(" (")[0]}</span>
                    <div className="sep-track">
                      <div
                        className="sep-fill"
                        style={{
                          width: `${c.audit.scores.resolution_ownership}%`,
                          background: scoreColor(c.audit.scores.resolution_ownership),
                        }}
                      />
                    </div>
                    <span className="sep-own">{c.audit.scores.resolution_ownership}</span>
                    <span className="sep-csat" style={{ color: csatColor(c.audit.predicted_csat) }}>
                      CSAT {c.audit.predicted_csat}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <div className="tbl-wrap" style={{ marginTop: 16 }}>
          <table className="atab">
            <thead>
              <tr>
                <th>Agent</th>
                <th className="num">Accuracy</th>
                <th className="num">Empathy</th>
                <th className="num">Ownership</th>
                <th className="num">Proactivity</th>
                <th className="num">CSAT</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agent}>
                  <td className="nm">{a.agentShort}</td>
                  <td className="num">{a.scores.accuracy_completeness}</td>
                  <td className="num">{a.scores.empathy_tone}</td>
                  <td className="num">{a.scores.resolution_ownership}</td>
                  <td className="num">{a.scores.proactivity}</td>
                  <td className="num" style={{ color: csatColor(a.csat), fontWeight: 600 }}>
                    {a.csat}
                  </td>
                  <td className="sm">{a.resolution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

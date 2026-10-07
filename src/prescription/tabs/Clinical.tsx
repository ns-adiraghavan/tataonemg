import type { Data } from "../types";
import { Card, HBar, Donut, Info, RAMP } from "../../components/ui";
import { summarize, CASE_COLORS, CAT_COLORS } from "../lib/summary";

export function Clinical({ d }: { d: Data }) {
  const P = d.P;
  const S = summarize(P);

  const classRows = Object.entries(S.by_class)
    .sort((a, b) => b[1] - a[1])
    .map(([lbl, val], i) => ({ lbl, val, color: RAMP[i % RAMP.length] }));
  const caseData = Object.entries(S.by_case).map(([name, value]) => ({
    name, value, color: CASE_COLORS[name] || "#8aa0b0",
  }));
  const catData = [
    { name: "Medication", value: S.n_meds, color: CAT_COLORS.Medication },
    { name: "Test", value: S.n_tests, color: CAT_COLORS.Test },
    { name: "Other", value: S.n_other, color: CAT_COLORS.Other },
  ];

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">03</span>
          <h2>Clinical Analytics</h2>
        </div>
        <p className="sec-sub">
          What do these {S.n_pres} prescriptions and {S.n_items} line items look like in aggregate?
          Every count rolls up from the extracted data.
        </p>

        <div className="bento" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 14 }}>
          <div className="kpi">
            <div className="lab">Prescriptions</div>
            <div className="val">{S.n_pres}</div>
            <div className="foot">{S.n_items} line items read</div>
          </div>
          <div className="kpi">
            <div className="lab">Medicines</div>
            <div className="val">{S.n_meds}</div>
            <div className="foot">{S.n_tests} tests · {S.n_other} other instructions</div>
          </div>
          <div className="kpi">
            <div className="lab">Key fields found</div>
            <div className="val">{S.avg_found}<small>%</small></div>
            <div className="foot">average, of 7 key fields per script</div>
          </div>
        </div>

        <div className="grid">
          <Card title="Therapeutic class mix" q="What kinds of medicine are prescribed? (mapped from the medicine name)" span2>
            <HBar rows={classRows} two />
          </Card>

          <Card title="Case type" q="Acute, sub-acute or chronic?" info={<Info def={d.formulas.case} />}>
            <Donut data={caseData} centerTop={S.n_pres} centerSub="SCRIPTS" />
          </Card>

          <Card title="Line-item split" q="Medicines vs tests vs other instructions">
            <Donut data={catData} centerTop={S.n_items} centerSub="ITEMS" />
          </Card>

          <Card title="Multiple medicines" q="Scripts carrying 5 or more medicines" info={<Info def={d.formulas.poly} />}>
            <Donut
              data={[
                { name: "5+ medicines", value: S.poly, color: "#ff6f61" },
                { name: "Fewer", value: S.n_pres - S.poly, color: "#e2e0dc" },
              ]}
              centerTop={`${Math.round((S.poly / (S.n_pres || 1)) * 100)}%`}
              centerSub="5+ MEDS"
            />
          </Card>

        </div>
      </div>
    </div>
  );
}

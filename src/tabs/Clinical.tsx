import type { AllData } from "../data/store";
import { computeSummary } from "../lib/summary";
import { Card, HBar, Donut, Info, CASE_COLORS, CAT_COLORS, RAMP } from "../components/ui";

export function Clinical({ d }: { d: AllData }) {
  const P = d.prescriptions;
  const S = computeSummary(P);

  const classRows = Object.entries(S.by_class)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([lbl, val], i) => ({ lbl, val, color: RAMP[i % RAMP.length] }));

  const areaRows = Object.entries(S.by_area)
    .sort((a, b) => b[1] - a[1])
    .map(([lbl, val], i) => ({ lbl, val, color: RAMP[i % RAMP.length] }));

  const caseData = Object.entries(S.by_case).map(([name, value]) => ({
    name,
    value,
    color: CASE_COLORS[name] || "#8aa0b0",
  }));

  const catData = [
    { name: "Medication", value: S.n_meds, color: CAT_COLORS.Medication },
    { name: "Diagnostic Test", value: S.n_tests, color: CAT_COLORS["Diagnostic Test"] },
    { name: "Non-Medication", value: S.n_non, color: CAT_COLORS["Non-Medication"] },
  ];

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">02</span>
          <h2>Clinical Analytics</h2>
        </div>
        <p className="sec-sub">
          Aggregated across all {S.n_pres} prescriptions and {S.n_items} extracted line-items. Every
          count rolls up from the structured extraction — recomputed live, so a re-scan or a new
          script updates every chart here automatically.
        </p>

        <div className="grid">
          <Card
            title="Therapeutic class mix"
            q="What kinds of therapy dominate the corpus?"
            span2
          >
            <HBar rows={classRows} two />
          </Card>

          <Card title="Case-type distribution" q="Acute, sub-acute or chronic care?">
            <Donut
              data={caseData}
              centerTop={S.n_pres}
              centerSub="SCRIPTS"
            />
          </Card>

          <Card title="Line-item category split" q="Meds vs diagnostics vs supportive care">
            <Donut data={catData} centerTop={S.n_items} centerSub="ITEMS" />
          </Card>

          <Card
            title="Specialty coverage"
            q="Which clinical areas are represented?"
            span2
          >
            <HBar rows={areaRows} two />
          </Card>

          <Card
            title="Polypharmacy load"
            q="Scripts carrying 5+ medications"
            info={<Info def={d.formulas.poly} />}
          >
            <div className="donut-wrap">
              <Donut
                data={[
                  { name: "Polypharmacy", value: S.poly, color: "#ff6f61" },
                  { name: "Standard", value: S.n_pres - S.poly, color: "#e2e0dc" },
                ]}
                centerTop={`${Math.round((S.poly / (S.n_pres || 1)) * 100)}%`}
                centerSub="POLY"
              />
            </div>
          </Card>

          <Card
            title="Extraction quality"
            q="Auto-cleared vs flagged for human review"
            info={<Info def={d.formulas.review} />}
          >
            <Donut
              data={[
                { name: "Auto-cleared", value: S.auto, color: "#1a8a5a" },
                { name: "Review required", value: S.review, color: "#c8862f" },
              ]}
              centerTop={`${S.auto_rate}%`}
              centerSub="AUTO"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

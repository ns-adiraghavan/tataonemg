import type { AllData } from "../data/store";
import { summarize } from "../lib/audit";

interface Rec {
  finding: string;
  evidence: string[]; // conversation ids
  action: string;
  owner: "Lab Ops" | "Product" | "CX / Training" | "Ops";
}

export function Recommendations({ d }: { d: AllData }) {
  const C = d.conversations;
  const S = summarize(C);
  const labConvs = C.filter((c) => c.audit.root_cause_group === "Lab & Diagnostics").map((c) => c.id);
  const repeatConvs = C.filter((c) => c.audit.repeat_contact_signal).map((c) => c.id);

  const recs: Rec[] = [
    {
      finding: `Every escalation in the sample (${S.escalations} of ${S.n}) traces to Lab & Diagnostics — a delayed report and a technician no-show — and both scored the lowest CSAT.`,
      evidence: labConvs,
      action:
        "Integrate lab-partner status (report TAT, sample-quality flags, technician assignment) into the agent console so first-contact resolution is possible without a back-office handoff.",
      owner: "Lab Ops",
    },
    {
      finding:
        "Both lab escalations hit closed operations windows — the agent could only promise a next-morning callback, which is when the customer already needed the outcome.",
      evidence: labConvs,
      action:
        "Stand up an after-hours ops escalation path (or SLA) for time-critical diagnostics so urgent cases don't stall overnight.",
      owner: "Ops",
    },
    {
      finding:
        "Agents had no real-time visibility into technician status or lab processing, so they could give no reliable ETA — the primary driver of the frustration in these calls.",
      evidence: labConvs,
      action:
        "Surface live technician/lab-processing status and proactive customer notifications when a sample is flagged, closing the visibility gap before it becomes a contact.",
      owner: "Product",
    },
    {
      finding:
        "Resolution ownership is the cleanest separator of CSAT (≥90 → CSAT 5; ≤75 → CSAT ≤2). Here the low-ownership scores reflect missing tools, not attitude — agents deflected because they had nowhere else to go.",
      evidence: C.map((c) => c.id),
      action:
        "Track resolution ownership as a coached KPI, but pair coaching with the tooling above so ownership is actually actionable.",
      owner: "CX / Training",
    },
    ...(repeatConvs.length
      ? [
          {
            finding:
              "A customer referenced a prior unresolved incident (repeat contact) that the agent had no visibility into on the current chat.",
            evidence: repeatConvs,
            action:
              "Surface prior-incident history for the same customer/booking in the agent view to prevent repeat effort and detect systemic failures earlier.",
            owner: "Product" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">05</span>
          <h2>Recommendations</h2>
        </div>
        <p className="sec-sub">
          Each recommendation is traced to a specific pattern across the audited conversations —
          ready to socialise with Tata 1mg's ops and product teams. The engine produces the
          journey gaps; the actions below prioritise them.
        </p>

        <div className="rec-list">
          {recs.map((r, i) => (
            <div className="rec" key={i}>
              <div className="rec-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="rec-body">
                <div className="rec-finding">{r.finding}</div>
                <div className="rec-action">
                  <span className="rec-arrow">→</span>
                  {r.action}
                </div>
                <div className="rec-foot">
                  <span className={`owner ${r.owner.split(" ")[0].toLowerCase()}`}>{r.owner}</span>
                  <span className="rec-evi">
                    {r.evidence.slice(0, 6).map((e) => (
                      <span className="evi-tag" key={e}>
                        {e}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

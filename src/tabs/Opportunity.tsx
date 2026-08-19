import type { AllData } from "../data/store";
import { computeSummary } from "../lib/summary";
import { Info } from "../components/ui";
import type { Rx } from "../types";

interface Play {
  k: string;
  t: string;
  f: (p: Rx) => boolean;
  desc: string;
  rule: string;
  formulaKey: string;
  icon: string;
  est: string; // estimated revenue/opportunity label
}

const PLAYS: Play[] = [
  {
    k: "refill", t: "Refill & Subscription", f: (p) => p.refill, icon: "↻",
    desc: "Standing-therapy scripts eligible for an auto-refill or subscription nudge — highest lifetime value per patient.",
    rule: "any medication runs ≥ 1 month or continuous", formulaKey: "refill",
    est: "Avg 3–6 repeat orders / patient / year",
  },
  {
    k: "chronic", t: "Chronic Care", f: (p) => p.case === "Chronic", icon: "♥",
    desc: "Long-term conditions suited to a managed chronic-care enrolment with adherence tracking and refill reminders.",
    rule: "case type resolves to Chronic", formulaKey: "case",
    est: "2–4× higher basket vs acute scripts",
  },
  {
    k: "adherence", t: "Adherence / Pill-pack", f: (p) => p.poly, icon: "⬡",
    desc: "High medication counts where an adherence pack reduces missed doses and boosts fulfillment rate.",
    rule: "script carries ≥ 5 medications", formulaKey: "poly",
    est: "15–25% uplift in fill-through rate",
  },
  {
    k: "diagnostics", t: "Diagnostics Cross-sell", f: (p) => p.diagnostics, icon: "⊕",
    desc: "Ordered tests or recorded labs that open a same-session diagnostics booking — closes the prescription-to-lab loop.",
    rule: "a test item OR a lab value is present", formulaKey: "diagnostics",
    est: "₹300–1,200 incremental per order",
  },
];

const flagsOf = (p: Rx) => PLAYS.reduce((n, pl) => n + (pl.f(p) ? 1 : 0), 0);

// Top medicines by frequency across all prescriptions
function topMeds(P: Rx[], n = 8) {
  const counts: Record<string, number> = {};
  P.forEach((p) =>
    (p.items ?? []).filter((it) => it.cat === "Medication").forEach((it) => {
      const k = it.name.replace(/^(tab\.|cap\.|inj\.|syp\.|syr\.|oint\.)\s*/i, "").trim();
      counts[k] = (counts[k] || 0) + 1;
    })
  );
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function Opportunity({ d }: { d: AllData }) {
  const P = d.prescriptions;
  const S = computeSummary(P);

  const addr = P.filter((p) => flagsOf(p) >= 1).length;
  const multi = P.filter((p) => flagsOf(p) >= 2).length;
  const fired = PLAYS.reduce((s, pl) => s + P.filter(pl.f).length, 0);
  const pct = Math.round((addr / (S.n_pres || 1)) * 100);

  const areas = Object.keys(S.by_area);
  const meds = topMeds(P);
  const maxMed = meds[0]?.[1] ?? 1;

  // Patient segments: chronic + multi-flag = "priority"
  const priority = P.filter((p) => flagsOf(p) >= 2);
  const chronicOnly = P.filter((p) => p.case === "Chronic" && flagsOf(p) < 2);
  const acuteAction = P.filter((p) => p.case !== "Chronic" && flagsOf(p) >= 1);

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">02</span>
          <h2>Commercial Plays</h2>
        </div>
        <p className="sec-sub">
          Four revenue programs matched automatically against the structured extraction — no script is
          tagged by hand. Thresholds are policy settings Tata 1mg controls; change one and every count
          and the matrix below recompute instantly.
        </p>

        {/* ── Program cards ── */}
        <div className="opp-grid">
          {PLAYS.map((pl) => {
            const hits = P.filter(pl.f);
            return (
              <div className="opp" key={pl.k}>
                <div className="opp-icon">{pl.icon}</div>
                <div className="big">
                  {hits.length}
                  <small>/{S.n_pres}</small>
                </div>
                <h3>{pl.t}</h3>
                <p>{pl.desc}</p>
                <div className="opp-est">{pl.est}</div>
                <div className="rxlist">
                  {hits.map((p) => (
                    <span key={p.rx}>{p.rx}</span>
                  ))}
                </div>
                <div className="rule">
                  Rule: {pl.rule} <Info def={d.formulas[pl.formulaKey]} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Summary band ── */}
        <div className="oppctx">
          <div className="octx">
            <div className="k">Addressable scripts</div>
            <div className="v">
              {addr}<small>/{S.n_pres}</small>
            </div>
            <div className="cap">
              <b>{pct}%</b> of the corpus is commercially actionable from the extraction alone.
            </div>
          </div>
          <div className="octx">
            <div className="k">Total program flags</div>
            <div className="v">{fired}</div>
            <div className="cap">
              Across four plays — a single script can qualify for several simultaneously.
            </div>
          </div>
          <div className="octx">
            <div className="k">Multi-program scripts</div>
            <div className="v">{multi}</div>
            <div className="cap">
              Qualify for two or more plays — highest-value patients; sequence these first.
            </div>
          </div>
          <div className="octx">
            <div className="k">Specialties covered</div>
            <div className="v">{S.n_specialties}</div>
            <div className="cap">
              Programs fire across all specialties — not limited to a single therapeutic area.
            </div>
          </div>
        </div>

        {/* ── Top medicines ── */}
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="sec-h">
            <span className="n">▦</span>
            <h2 style={{ fontSize: 15 }}>Top medicines by frequency</h2>
          </div>
          <p className="sec-sub" style={{ marginBottom: 14 }}>
            Most-prescribed molecules across the corpus — refill and subscription candidates in rank order.
          </p>
          <div className="med-bars">
            {meds.map(([name, count]) => (
              <div className="med-row" key={name}>
                <div className="med-name">{name}</div>
                <div className="med-track">
                  <div className="med-fill" style={{ width: `${(count / maxMed) * 100}%` }} />
                </div>
                <div className="med-count">{count}×</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Patient segmentation ── */}
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="sec-h">
            <span className="n">▦</span>
            <h2 style={{ fontSize: 15 }}>Patient segmentation</h2>
          </div>
          <p className="sec-sub" style={{ marginBottom: 14 }}>
            Three tiers of commercial priority — derived purely from the extraction, no manual review.
          </p>
          <div className="seg-grid">
            <div className="seg hi">
              <div className="seg-label">Priority</div>
              <div className="seg-n">{priority.length}</div>
              <div className="seg-desc">Multi-program match — chronic or poly-med + at least one additional flag. Highest CLV; sequence for outreach first.</div>
              <div className="seg-list">{priority.map(p => <span key={p.rx}>{p.rx}</span>)}</div>
            </div>
            <div className="seg md">
              <div className="seg-label">Chronic — single flag</div>
              <div className="seg-n">{chronicOnly.length}</div>
              <div className="seg-desc">Long-term condition, one qualifying program. Enrol in chronic-care; layer refill nudge at next dispense.</div>
              <div className="seg-list">{chronicOnly.map(p => <span key={p.rx}>{p.rx}</span>)}</div>
            </div>
            <div className="seg lo">
              <div className="seg-label">Acute — actionable</div>
              <div className="seg-n">{acuteAction.length}</div>
              <div className="seg-desc">Acute case with at least one program match (diagnostics or adherence). Single-touch opportunity — diagnostics booking or pill-pack offer.</div>
              <div className="seg-list">{acuteAction.map(p => <span key={p.rx}>{p.rx}</span>)}</div>
            </div>
          </div>
        </div>

        {/* ── Specialty matrix ── */}
        <div className="panel matrix" style={{ marginTop: 16 }}>
          <div className="sec-h">
            <span className="n">▦</span>
            <h2 style={{ fontSize: 15 }}>Program coverage by specialty</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Specialty</th>
                {PLAYS.map((pl) => (
                  <th key={pl.k}>{pl.t.split(" ")[0]}</th>
                ))}
                <th>Rx</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => {
                const grp = P.filter((p) => p.area === a);
                return (
                  <tr key={a}>
                    <td>{a}</td>
                    {PLAYS.map((pl) => {
                      const any = grp.some(pl.f);
                      return (
                        <td key={pl.k} className={any ? "yes" : ""}>
                          {any ? "●" : "○"}
                        </td>
                      );
                    })}
                    <td>{grp.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="note">
            Every flag is computed directly from the structured extraction — no prescription is
            tagged by hand. Thresholds are policy settings the Tata 1mg team controls.
          </p>
        </div>
      </div>
    </div>
  );
}

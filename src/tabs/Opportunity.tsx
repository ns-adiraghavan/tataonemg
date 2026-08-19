import { useState } from "react";
import type { AllData } from "../data/store";
import { computeSummary } from "../lib/summary";
import { Info } from "../components/ui";
import { ageSex, csvCell, medLine, download } from "../lib/csv";
import type { Rx } from "../types";

interface Play {
  k: string;
  t: string;
  f: (p: Rx) => boolean;
  desc: string;
  rule: string;
  formulaKey: string;
}

const PLAYS: Play[] = [
  {
    k: "refill", t: "Refill & subscription", f: (p) => p.refill,
    desc: "Standing-therapy scripts eligible for an auto-refill / subscription nudge.",
    rule: "any medication runs ≥ 1 month or continuous", formulaKey: "refill",
  },
  {
    k: "chronic", t: "Chronic-care program", f: (p) => p.case === "Chronic",
    desc: "Long-term conditions suited to a managed chronic-care enrolment.",
    rule: "case type resolves to Chronic", formulaKey: "case",
  },
  {
    k: "adherence", t: "Adherence / pill-pack", f: (p) => p.poly,
    desc: "High medication counts where an adherence pack reduces missed doses.",
    rule: "script carries ≥ 5 medications", formulaKey: "poly",
  },
  {
    k: "diagnostics", t: "Diagnostics cross-sell", f: (p) => p.diagnostics,
    desc: "Ordered tests or recorded labs that open a diagnostics booking.",
    rule: "a test item OR a lab value is present", formulaKey: "diagnostics",
  },
];

const flagsOf = (p: Rx) => PLAYS.reduce((n, pl) => n + (pl.f(p) ? 1 : 0), 0);

export function Opportunity({ d }: { d: AllData }) {
  const P = d.prescriptions;
  const S = computeSummary(P);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(PLAYS.map((p) => p.k))
  );

  const addr = P.filter((p) => flagsOf(p) >= 1).length;
  const multi = P.filter((p) => flagsOf(p) >= 2).length;
  const fired = PLAYS.reduce((s, pl) => s + P.filter(pl.f).length, 0);
  const pct = Math.round((addr / (S.n_pres || 1)) * 100);

  const matched = P.filter((p) =>
    PLAYS.some((pl) => selected.has(pl.k) && pl.f(p))
  );
  const matchedItems = matched.reduce((s, p) => s + (p.items?.length ?? 0), 0);

  const toggle = (k: string) => {
    const next = new Set(selected);
    next.has(k) ? next.delete(k) : next.add(k);
    setSelected(next);
  };

  const tagsFor = (p: Rx) =>
    PLAYS.filter((pl) => pl.f(p)).map((pl) => pl.t).join("; ");

  const exportRx = () => {
    const cols = [
      "Rx ID", "Date", "Patient Name", "Age / Sex", "Hospital / Clinic",
      "Doctor", "Qualifying Programs", "Diagnosis", "Vitals / Labs",
      "Prescribed Items", "Follow-up / Advice",
    ];
    const lines = [cols.map(csvCell).join(",")];
    matched.forEach((p) =>
      lines.push(
        [
          p.rx, p.date, p.patient, ageSex(p), p.hospital, p.doctor, tagsFor(p),
          p.diagnosis, p.vitals, (p.items ?? []).map(medLine).join("\n"), p.followup,
        ].map(csvCell).join(",")
      )
    );
    download(lines, "tata1mg-opportunity-prescriptions");
  };

  const exportItems = () => {
    const cols = [
      "Rx ID", "Patient Name", "Qualifying Programs", "Category",
      "Item", "Dose", "Frequency", "Duration", "Class",
    ];
    const lines = [cols.map(csvCell).join(",")];
    matched.forEach((p) =>
      (p.items ?? []).forEach((it) =>
        lines.push(
          [p.rx, p.patient, tagsFor(p), it.cat, it.name, it.dose, it.freq, it.dur, it.cls]
            .map(csvCell).join(",")
        )
      )
    );
    download(lines, "tata1mg-opportunity-items");
  };

  const areas = Object.keys(S.by_area);

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">04</span>
          <h2>Business Opportunity</h2>
        </div>
        <p className="sec-sub">
          Four commercial programs, each matched automatically against the structured extraction —
          no script is tagged by hand. Thresholds are policy settings Tata 1mg controls; change one
          and every count and the matrix below recompute.
        </p>

        <div className="opp-grid">
          {PLAYS.map((pl) => {
            const hits = P.filter(pl.f);
            return (
              <div className="opp" key={pl.k}>
                <div className="big">
                  {hits.length}
                  <small>/{S.n_pres}</small>
                </div>
                <h3>{pl.t}</h3>
                <p>{pl.desc}</p>
                <div className="rxlist">
                  {hits.map((p) => (
                    <span key={p.rx}>{p.rx}</span>
                  ))}
                </div>
                <div className="rule">
                  RULE: {pl.rule} <Info def={d.formulas[pl.formulaKey]} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="oppctx">
          <div className="octx">
            <div className="k">Addressable scripts</div>
            <div className="v">
              {addr}
              <small>/{S.n_pres}</small>
            </div>
            <div className="cap">
              At least one program fits — <b>{pct}%</b> of the corpus is commercially actionable from
              the extraction alone.
            </div>
          </div>
          <div className="octx">
            <div className="k">Program flags fired</div>
            <div className="v">{fired}</div>
            <div className="cap">
              Total play matches across the four programs; a single script can qualify for several.
            </div>
          </div>
          <div className="octx">
            <div className="k">Multi-program scripts</div>
            <div className="v">{multi}</div>
            <div className="cap">
              Qualify for two or more plays — the highest-value patients, and the ones to sequence
              first.
            </div>
          </div>
        </div>

        <div className="oppdl">
          <div className="dh">
            <span className="n">EXPORT</span>
            <h3>Program-targeted lists</h3>
          </div>
          <p className="dsub">
            Select the programs you want, then export the matching patients as a prescription-level
            or item-level CSV — ready to hand to the outreach team.
          </p>
          <div className="row">
            {PLAYS.map((pl) => (
              <button
                key={pl.k}
                className={`fchip${selected.has(pl.k) ? " on" : ""}`}
                onClick={() => toggle(pl.k)}
              >
                {pl.t} · {P.filter(pl.f).length}
              </button>
            ))}
            <div className="dlgroup">
              <button className="dlbtn" onClick={exportRx} disabled={!matched.length}>
                ↓ Prescriptions
              </button>
              <button className="dlbtn" onClick={exportItems} disabled={!matched.length}>
                ↓ Items
              </button>
            </div>
          </div>
          <div className="selcnt">
            {selected.size ? (
              <>
                Current selection · <b>{matched.length}</b> script{matched.length === 1 ? "" : "s"} ·{" "}
                <b>{matchedItems}</b> line-item{matchedItems === 1 ? "" : "s"}
              </>
            ) : (
              "Select at least one program to export."
            )}
          </div>
        </div>

        <div className="panel matrix" style={{ marginTop: 20 }}>
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
            tagged by hand — so each play runs automatically across the full volume. The thresholds
            (duration bands, medication count) are policy settings the Tata 1mg team controls; change
            one and every count, badge, and this matrix recompute.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, Fragment } from "react";
import type { Data, Rx } from "../types";
import { ageSex, CASE_COLORS, csvCell, medLine, download } from "../lib/summary";

type FilterKey = "all" | "chronic" | "review" | "refill" | "regional";

const FILTERS: { k: FilterKey; label: string; f: (p: Rx) => boolean; def: string }[] = [
  { k: "all", label: "All", f: () => true, def: "Every prescription." },
  { k: "chronic", label: "Chronic", f: (p) => p.case === "Chronic", def: "Case type resolves to Chronic — a long-term condition on the script, or long-running medicines." },
  { k: "review", label: "Has entries to check", f: (p) => p.review, def: "At least one entry is tagged CHECK because the handwriting could not be read reliably." },
  { k: "refill", label: "Refill candidate", f: (p) => p.refill, def: "At least one medicine is prescribed for a month or longer." },
  { k: "regional", label: "Regional language", f: (p) => p.lang !== "English", def: "The script includes text in a language other than English." },
];

interface ProgDef {
  k: string;
  label: string;
  color: string;
  f: (p: Rx) => boolean;
  def: string;
}

const PROGRAMS: ProgDef[] = [
  { k: "refill", label: "Refill & subscription", color: "#2563eb", f: (p) => p.refill, def: "A medicine prescribed for a month or longer." },
  { k: "chronic", label: "Chronic-care programme", color: "#16a34a", f: (p) => p.case === "Chronic", def: "Long-term conditions suited to managed chronic-care enrolment." },
  { k: "poly", label: "Adherence / pill-pack", color: "#9333ea", f: (p) => p.poly, def: "Five or more medicines on one script." },
  { k: "diagnostics", label: "Diagnostics cross-sell", color: "#ea580c", f: (p) => p.diagnostics, def: "Tests ordered, or lab results written on the script." },
];

export function Explorer({ d }: { d: Data }) {
  const P = d.P;
  const [filter, setFilter] = useState<FilterKey>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [showProgDefs, setShowProgDefs] = useState(false);
  const [progSel, setProgSel] = useState<Set<string>>(new Set());

  const rows = useMemo(() => P.filter(FILTERS.find((f) => f.k === filter)!.f), [P, filter]);
  const progRows = useMemo(() => {
    if (progSel.size === 0) return rows;
    return rows.filter((p) => PROGRAMS.filter((pr) => progSel.has(pr.k)).some((pr) => pr.f(p)));
  }, [rows, progSel]);

  const toggleProg = (k: string) =>
    setProgSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const exportRx = () => {
    const cols = [
      "Rx ID", "Date", "Patient Name", "Age / Sex", "Hospital / Clinic", "Doctor", "Contact",
      "Diagnosis / Complaints", "Vitals / Lab Values", "Medicines, Tests & Orders",
      "Entries To Check", "Follow-up / Advice",
    ];
    const lines = [cols.map(csvCell).join(",")];
    progRows.forEach((p) =>
      lines.push(
        [
          p.rx, p.date, p.patient, ageSex(p), p.hospital, p.doctor, p.contact, p.diagnosis, p.vitals,
          p.items.map(medLine).join("\n"), p.n_check, p.followup,
        ].map(csvCell).join(",")
      )
    );
    download(lines, "tata1mg-prescriptions");
  };

  const exportItems = () => {
    const cols = ["Rx ID", "Patient Name", "Category", "Item", "Dose", "Frequency / Notes", "Duration", "Therapeutic Class", "Check"];
    const lines = [cols.map(csvCell).join(",")];
    progRows.forEach((p) =>
      p.items.forEach((it) =>
        lines.push(
          [p.rx, p.patient, it.cat, it.name, it.dose, it.freq, it.dur, it.cls, it.check ? "CHECK" : ""]
            .map(csvCell).join(",")
        )
      )
    );
    download(lines, "tata1mg-items");
  };

  const totalItems = progRows.reduce((s, p) => s + p.items.length, 0);
  const active = FILTERS.find((f) => f.k === filter)!;

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">04</span>
          <h2>Prescription Explorer</h2>
        </div>
        <p className="sec-sub">
          Which prescriptions match a given criterion, and what is in each? Filter the list, open any
          row for the full record, and export the current view as a prescription-level or item-level CSV.
        </p>

        <div className="filters">
          <span className="flabel">FILTER</span>
          {FILTERS.map((f) => (
            <button key={f.k} className={`fchip${filter === f.k ? " on" : ""}`} onClick={() => setFilter(f.k)}>
              {f.label} · {P.filter(f.f).length}
            </button>
          ))}
        </div>
        {filter !== "all" && (
          <div className="filter-hint">
            <b>{active.label}:</b> {active.def}
          </div>
        )}

        <div className="prog-block">
          <div className="prog-header-row">
            <div>
              <span className="prog-title">Programme-targeted lists</span>
              <span className="prog-sub">Select one or more programmes to narrow the table and the export</span>
            </div>
            <button className="def-toggle" onClick={() => setShowProgDefs((s) => !s)}>
              {showProgDefs ? "▲ Hide definitions" : "▼ Definitions"}
            </button>
          </div>
          <div className="prog-chips">
            {PROGRAMS.map((pr) => (
              <button
                key={pr.k}
                className={`prog-chip${progSel.has(pr.k) ? " on" : ""}`}
                style={{ "--prog-color": pr.color } as React.CSSProperties}
                onClick={() => toggleProg(pr.k)}
              >
                {pr.label} · {rows.filter(pr.f).length}
              </button>
            ))}
          </div>
          {showProgDefs && (
            <div className="prog-defs">
              {PROGRAMS.map((pr) => (
                <div key={pr.k} className={`prog-def-item${progSel.has(pr.k) ? " active" : ""}`}>
                  <span className="prog-def-dot" style={{ background: pr.color }} />
                  <span className="prog-def-label">{pr.label}:</span>
                  <span className="prog-def-text">{pr.def}</span>
                </div>
              ))}
            </div>
          )}
          <div className="prog-export-bar">
            <span className="prog-sel-count">
              Current selection · <b>{progRows.length} scripts</b> · <b>{totalItems} line items</b>
            </span>
            <div className="dlgroup">
              <button className="dlbtn" onClick={exportRx} disabled={!progRows.length}>↓ Prescriptions CSV</button>
              <button className="dlbtn" onClick={exportItems} disabled={!progRows.length}>↓ Items CSV</button>
            </div>
          </div>
        </div>

        <table className="xtab">
          <thead>
            <tr>
              <th>Rx</th>
              <th>Patient</th>
              <th>Specialty</th>
              <th>Case</th>
              <th>Items</th>
              <th>Key fields</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {progRows.map((p) => (
              <Fragment key={p.rx}>
                <tr className="main" onClick={() => setOpen(open === p.rx ? null : p.rx)}>
                  <td className="rxid">{p.rx}</td>
                  <td>
                    <div className="nm">{p.patient ?? "Not on script"}</div>
                    <div className="sm">{ageSex(p) ?? "—"}</div>
                  </td>
                  <td>{p.area}</td>
                  <td>
                    <span className="badge" style={{ color: CASE_COLORS[p.case] || "#8aa0b0", background: "rgba(0,0,0,.04)" }}>
                      {p.case}
                    </span>
                  </td>
                  <td>{p.n_items}</td>
                  <td>{p.found} / {p.found_of}</td>
                  <td>
                    <div className="flagrow">
                      {p.refill && <span className="frag">Refill</span>}
                      {p.poly && <span className="frag">Poly</span>}
                      {p.diagnostics && <span className="frag">Dx</span>}
                      {p.review && <span className="frag rv">Check</span>}
                    </div>
                  </td>
                </tr>
                {open === p.rx && (
                  <tr className="xdetail">
                    <td colSpan={7}>
                      <div className="inner">
                        <div className="det-grid">
                          <div>
                            <div className="dk">Hospital / Clinic</div>
                            <div className="dv">{p.hospital ?? "Not on script"}</div>
                            <div className="dk">Doctor</div>
                            <div className="dv">{p.doctor ?? "Not on script"}</div>
                            <div className="dk">Contact</div>
                            <div className="dv">{p.contact ?? "Not on script"}</div>
                          </div>
                          <div>
                            <div className="dk">Diagnosis / complaints</div>
                            <div className="dv">{p.diagnosis ?? "Not on script"}</div>
                            <div className="dk">Vitals / lab values</div>
                            <div className="dv">{p.vitals ?? "Not on script"}</div>
                            <div className="dk">Follow-up / advice</div>
                            <div className="dv">{p.followup ?? "Not on script"}</div>
                          </div>
                        </div>
                        <div className="dk" style={{ marginTop: 8 }}>Medicines &amp; orders (item · dose, frequency / notes, duration)</div>
                        <div className="dv">{p.items.map(medLine).join("\n")}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

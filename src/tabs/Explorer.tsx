import { useState, useMemo, Fragment } from "react";
import type { AllData } from "../data/store";
import { CASE_COLORS } from "../components/ui";
import { ageSex, csvCell, medLine, download } from "../lib/csv";
import type { Rx } from "../types";

type FilterKey = "all" | "chronic" | "review" | "refill" | "handwritten" | "multilingual";

const FILTERS: { k: FilterKey; label: string; f: (p: Rx) => boolean; def: string }[] = [
  { k: "all", label: "All", f: () => true, def: "Every prescription in the corpus, unfiltered." },
  { k: "chronic", label: "Chronic", f: (p) => p.case === "Chronic", def: "Case type resolved to Chronic by the extraction engine — long-duration conditions requiring repeat therapy." },
  { k: "review", label: "Needs review", f: (p) => p.review, def: "At least one UNCLEAR field or medicine flagged — extraction engine confidence below threshold." },
  { k: "refill", label: "Refill candidate", f: (p) => p.refill, def: "One or more medications with a duration of ≥ 1 month or marked 'continuous' — eligible for auto-refill or subscription." },
  { k: "handwritten", label: "Handwritten", f: (p) => /handwritten/i.test(p.form), def: "Form type = handwritten — tests OCR engine robustness on unstructured doctor scripts." },
  { k: "multilingual", label: "Hindi / mixed", f: (p) => /hindi/i.test(p.lang), def: "Language detected as Hindi or Hinglish (mixed script) — validates transliteration and translation pipeline." },
];

const PLAYS_DEF = [
  { k: "Refill", def: "Any medication with duration ≥ 1 month or marked continuous." },
  { k: "Poly", def: "Script carries 5 or more distinct medications." },
  { k: "Dx", def: "A diagnostic test item OR a recorded lab value is present." },
  { k: "Review", def: "At least one field or medicine returned UNCLEAR by the engine." },
];

interface ProgDef {
  k: string;
  label: string;
  color: string;
  f: (p: Rx) => boolean;
  def: string;
}

const PROGRAMS: ProgDef[] = [
  {
    k: "refill",
    label: "Refill & subscription",
    color: "#2563eb",
    f: (p) => p.refill,
    def: "Standing-therapy scripts with ≥ 1 month duration — highest lifetime value per patient. Eligible for auto-refill or subscription nudge.",
  },
  {
    k: "chronic",
    label: "Chronic-care program",
    color: "#16a34a",
    f: (p) => p.case === "Chronic",
    def: "Long-term conditions suited to a managed chronic-care enrolment with adherence tracking and refill reminders.",
  },
  {
    k: "poly",
    label: "Adherence / pill-pack",
    color: "#9333ea",
    f: (p) => p.poly,
    def: "High medication counts (≥ 5 meds) where an adherence pack reduces missed doses and boosts fill-through rate.",
  },
  {
    k: "diagnostics",
    label: "Diagnostics cross-sell",
    color: "#ea580c",
    f: (p) => p.diagnostics,
    def: "Ordered tests or recorded labs — opens a same-session diagnostics booking and closes the prescription-to-lab loop.",
  },
];

export function Explorer({ d }: { d: AllData }) {
  const P = d.prescriptions;
  const [filter, setFilter] = useState<FilterKey>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [showDefs, setShowDefs] = useState(false);
  const [showProgDefs, setShowProgDefs] = useState(false);
  const [progSel, setProgSel] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () => P.filter(FILTERS.find((f) => f.k === filter)!.f),
    [P, filter]
  );

  // Apply program filters on top of slicer filter
  const progRows = useMemo(() => {
    if (progSel.size === 0) return rows;
    return rows.filter((p) =>
      PROGRAMS.filter((pr) => progSel.has(pr.k)).some((pr) => pr.f(p))
    );
  }, [rows, progSel]);

  const activeDef = FILTERS.find((f) => f.k === filter)!.def;

  const toggleProg = (k: string) => {
    setProgSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const exportRx = () => {
    const cols = [
      "Rx ID", "Date", "Patient Name", "Age / Sex", "Hospital / Clinic",
      "Doctor Name & Qualification", "Diagnosis / Clinical Complaints",
      "Recorded Vitals / Lab Values", "Prescribed Medications, Tests & Interventions",
      "Extraction Quality", "Follow-up / Advice",
    ];
    const lines = [cols.map(csvCell).join(",")];
    progRows.forEach((p) => {
      lines.push(
        [
          p.rx, p.date, p.patient, ageSex(p), p.hospital, p.doctor, p.diagnosis, p.vitals,
          (p.items ?? []).map(medLine).join("\n"),
          p.review ? "Review required" : "Auto-cleared", p.followup,
        ].map(csvCell).join(",")
      );
    });
    download(lines, "tata1mg-prescriptions");
  };

  const exportItems = () => {
    const cols = [
      "Rx ID", "Patient Name", "Category", "Item / Medication / Test",
      "Dose / Form", "Frequency / Timing", "Duration / Instructions", "Therapeutic Class",
    ];
    const lines = [cols.map(csvCell).join(",")];
    progRows.forEach((p) =>
      (p.items ?? []).forEach((it) =>
        lines.push(
          [p.rx, p.patient, it.cat, it.name, it.dose, it.freq, it.dur, it.cls]
            .map(csvCell)
            .join(",")
        )
      )
    );
    download(lines, "tata1mg-items-breakdown");
  };

  const totalItems = progRows.reduce((s, p) => s + (p.items?.length ?? 0), 0);

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">04</span>
          <h2>Prescription Explorer</h2>
        </div>
        <p className="sec-sub">
          The full extracted corpus, filterable and exportable. Click any row to expand the complete
          record; export the current filtered view as prescription-level or item-level CSV.
        </p>

        {/* ── Filters + export ── */}
        <div className="filters">
          <span className="flabel">FILTER</span>
          {FILTERS.map((f) => (
            <button
              key={f.k}
              className={`fchip${filter === f.k ? " on" : ""}`}
              onClick={() => setFilter(f.k)}
            >
              {f.label} · {P.filter(f.f).length}
            </button>
          ))}
          <button
            className="def-toggle"
            onClick={() => setShowDefs((s) => !s)}
            title="Show slicer definitions"
          >
            {showDefs ? "▲ Hide definitions" : "▼ Slicer definitions"}
          </button>
        </div>

        {/* ── Active filter definition ── */}
        {showDefs && (
          <div className="slicer-defs">
            <div className="slicer-title">Filter definitions</div>
            <div className="slicer-grid">
              {FILTERS.filter(f => f.k !== "all").map((f) => (
                <div key={f.k} className={`slicer-item${filter === f.k ? " active" : ""}`}>
                  <div className="slicer-k">{f.label}</div>
                  <div className="slicer-v">{f.def}</div>
                </div>
              ))}
            </div>
            <div className="slicer-title" style={{ marginTop: 12 }}>Row flag definitions</div>
            <div className="slicer-grid">
              {PLAYS_DEF.map((p) => (
                <div key={p.k} className="slicer-item">
                  <div className="slicer-k">{p.k}</div>
                  <div className="slicer-v">{p.def}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active filter hint ── */}
        {filter !== "all" && (
          <div className="filter-hint">
            <b>{FILTERS.find(f => f.k === filter)!.label}:</b> {activeDef}
          </div>
        )}

        {/* ── Program-targeted lists ── */}
        <div className="prog-block">
          <div className="prog-header-row">
            <div>
              <span className="prog-title">Program-targeted lists</span>
              <span className="prog-sub">Select one or more programs to narrow the table and export</span>
            </div>
            <button
              className="def-toggle"
              onClick={() => setShowProgDefs((s) => !s)}
              title="Show program definitions"
            >
              {showProgDefs ? "▲ Hide definitions" : "▼ Program definitions"}
            </button>
          </div>
          <div className="prog-chips">
            {PROGRAMS.map((pr) => {
              const count = rows.filter(pr.f).length;
              const on = progSel.has(pr.k);
              return (
                <button
                  key={pr.k}
                  className={`prog-chip${on ? " on" : ""}`}
                  style={{
                    "--prog-color": pr.color,
                  } as React.CSSProperties}
                  onClick={() => toggleProg(pr.k)}
                >
                  {pr.label} · {count}
                </button>
              );
            })}
          </div>
          {/* Program definitions — collapsed by default */}
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
              Current selection · <b>{progRows.length} scripts</b> · <b>{totalItems} line-items</b>
            </span>
            <div className="dlgroup">
              <button className="dlbtn" onClick={exportRx} disabled={!progRows.length}>
                ↓ Prescriptions CSV
              </button>
              <button className="dlbtn" onClick={exportItems} disabled={!progRows.length}>
                ↓ Items CSV
              </button>
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
              <th>Confidence</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {progRows.map((p) => (
              <Fragment key={p.rx}>
                <tr
                  className="main"
                  onClick={() => setOpen(open === p.rx ? null : p.rx)}
                >
                  <td className="rxid">{p.rx}</td>
                  <td>
                    <div className="nm">{p.patient}</div>
                    <div className="sm">{ageSex(p)}</div>
                  </td>
                  <td>{p.area}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: CASE_COLORS[p.case] || "#8aa0b0",
                        background: "rgba(0,0,0,.04)",
                      }}
                    >
                      {p.case}
                    </span>
                  </td>
                  <td>{p.n_items}</td>
                  <td>
                    <span className="mini">
                      <i style={{ width: `${p.confidence}%` }} />
                    </span>{" "}
                    {p.confidence}%
                  </td>
                  <td>
                    <div className="flagrow">
                      {p.refill && <span className="frag">Refill</span>}
                      {p.poly && <span className="frag">Poly</span>}
                      {p.diagnostics && <span className="frag">Dx</span>}
                      {p.review && <span className="frag rv">Review</span>}
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
                            <div className="dv">{p.hospital}</div>
                            <div className="dk">Doctor</div>
                            <div className="dv">{p.doctor}</div>
                            <div className="dk">Contact</div>
                            <div className="dv">{p.contact}</div>
                          </div>
                          <div>
                            <div className="dk">Diagnosis / complaints</div>
                            <div className="dv">{p.diagnosis}</div>
                            <div className="dk">Vitals / labs</div>
                            <div className="dv">{p.vitals}</div>
                            <div className="dk">Follow-up / advice</div>
                            <div className="dv">{p.followup}</div>
                          </div>
                        </div>
                        <div className="dk" style={{ marginTop: 8 }}>
                          Prescribed items
                        </div>
                        <div className="dv">
                          {(p.items ?? []).map(medLine).join("\n")}
                        </div>
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

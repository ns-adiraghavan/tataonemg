import { useState, useMemo, Fragment } from "react";
import type { AllData } from "../data/store";
import { CASE_COLORS } from "../components/ui";
import { ageSex, csvCell, medLine, download } from "../lib/csv";
import type { Rx } from "../types";

type FilterKey = "all" | "chronic" | "review" | "refill" | "handwritten" | "multilingual";

const FILTERS: { k: FilterKey; label: string; f: (p: Rx) => boolean }[] = [
  { k: "all", label: "All", f: () => true },
  { k: "chronic", label: "Chronic", f: (p) => p.case === "Chronic" },
  { k: "review", label: "Needs review", f: (p) => p.review },
  { k: "refill", label: "Refill candidate", f: (p) => p.refill },
  { k: "handwritten", label: "Handwritten", f: (p) => /handwritten/i.test(p.form) },
  { k: "multilingual", label: "Hindi / mixed", f: (p) => /hindi/i.test(p.lang) },
];

export function Explorer({ d }: { d: AllData }) {
  const P = d.prescriptions;
  const [filter, setFilter] = useState<FilterKey>("all");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(
    () => P.filter(FILTERS.find((f) => f.k === filter)!.f),
    [P, filter]
  );

  const exportRx = () => {
    const cols = [
      "Rx ID", "Date", "Patient Name", "Age / Sex", "Hospital / Clinic",
      "Doctor Name & Qualification", "Diagnosis / Clinical Complaints",
      "Recorded Vitals / Lab Values", "Prescribed Medications, Tests & Interventions",
      "Extraction Quality", "Follow-up / Advice",
    ];
    const lines = [cols.map(csvCell).join(",")];
    rows.forEach((p) => {
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
    rows.forEach((p) =>
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

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">03</span>
          <h2>Prescription Explorer</h2>
        </div>
        <p className="sec-sub">
          The full extracted corpus, filterable and exportable. Click any row to expand the complete
          record; export the current filtered view as prescription-level or item-level CSV.
        </p>

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
          <div className="dlgroup">
            <button className="dlbtn" onClick={exportRx} disabled={!rows.length}>
              ↓ Prescriptions CSV
            </button>
            <button className="dlbtn" onClick={exportItems} disabled={!rows.length}>
              ↓ Items CSV
            </button>
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
            {rows.map((p) => (
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

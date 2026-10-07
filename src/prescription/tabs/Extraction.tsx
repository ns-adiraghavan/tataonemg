import { useEffect, useState } from "react";
import type { Data, Rx } from "../types";
import { ImageViewer } from "../ImageViewer";
import { Info } from "../../components/ui";
import { CAT_COLORS } from "../lib/summary";

const base = import.meta.env.BASE_URL;

function Field({ k, v, full, third }: { k: string; v: string | null; full?: boolean; third?: boolean }) {
  return (
    <div className={`f${full ? " full" : ""}${third ? " third" : ""}`}>
      <div className="k">{k}</div>
      <div className={`v${v ? "" : " miss"}`}>{v || "Not on script"}</div>
    </div>
  );
}

export function Extraction({ d }: { d: Data }) {
  const P = d.P;
  const [sel, setSel] = useState(0);
  const p: Rx = P[sel];

  // ← / → step through the prescriptions
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") setSel((i) => Math.min(P.length - 1, i + 1));
      if (e.key === "ArrowLeft") setSel((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [P.length]);

  return (
    <div className="view on">
      <div className="sec-h" style={{ marginTop: 18 }}>
        <span className="n">01</span>
        <h2>Extraction &amp; Quality</h2>
      </div>
      <p className="sec-sub" style={{ marginBottom: 0 }}>
        What does the engine read from each scan — and does it match the page? Pick a prescription,
        zoom into the scan, and compare it with the information found.
      </p>

      <div className="rx-pick" role="tablist" aria-label="Prescriptions">
        {P.map((q, i) => (
          <button
            key={q.rx}
            role="tab"
            aria-selected={i === sel}
            className={`rx-card${i === sel ? " on" : ""}`}
            onClick={() => setSel(i)}
          >
            <img src={`${base}data/${q.img}`} alt="" />
            <span>
              <b>{q.rx}</b>
              <small>{q.patient ?? "Patient not named"}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="rx-grid">
        <section className="rx-scan" aria-label="Scan">
          <ImageViewer key={p.img} src={`${base}data/${p.img}`} alt={`Scan of prescription ${p.rx}`} />
        </section>

        <section className="rx-info" aria-label="Information found">
          <div className="rx-info-head">
            <h2>
              {p.rx} <small>{sel + 1} of {P.length}</small>
            </h2>
            <div className="rx-step">
              <button onClick={() => setSel(sel - 1)} disabled={sel === 0} aria-label="Previous prescription">←</button>
              <button onClick={() => setSel(sel + 1)} disabled={sel === P.length - 1} aria-label="Next prescription">→</button>
            </div>
          </div>
          <div className="rx-chips">
            <span className="chip coral">{p.lang}</span>
            <span className="chip">{p.form}</span>
            <span className="chip">
              {p.found} of {p.found_of} key fields on script <Info def={d.formulas.found} />
            </span>
            {p.n_check > 0 && (
              <span className="chip amber">
                {p.n_check} {p.n_check === 1 ? "entry" : "entries"} to check <Info def={d.formulas.review} />
              </span>
            )}
          </div>

          <div className="fields">
            <Field k="Patient" v={p.patient} third />
            <Field k="Age" v={p.age ? `${p.age} yr` : null} third />
            <Field k="Sex" v={p.sex ? `${p.sex} · ${p.sex_basis}` : null} third />
            <Field k="Date" v={p.date} full />
            <Field k="Hospital / Clinic" v={p.hospital} full />
            <Field k="Doctor" v={p.doctor} full />
            <Field k="Contact" v={p.contact} full />
            <Field k="Diagnosis / complaints" v={p.diagnosis} full />
            <Field k="Vitals / lab values" v={p.vitals} full />
            <Field k="Follow-up / advice" v={p.followup} full />
          </div>

          <div className="rx-items-h">
            <h3>
              Medicines &amp; orders <small>{p.n_items} items</small>
            </h3>
            <div className="rx-legend">
              {(["Medication", "Test", "Other"] as const).map((c) => (
                <span key={c}>
                  <i style={{ background: CAT_COLORS[c] }} />
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="rx-tbl">
            <table className="itab">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Dose</th>
                  <th>Frequency / notes</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {p.items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      <span className="catdot" style={{ background: CAT_COLORS[it.cat] }} />
                      {it.name}
                      {it.check && (
                        <span className="frag rv" style={{ marginLeft: 6 }} title="Hard to read on the scan — check against the image">
                          CHECK
                        </span>
                      )}
                    </td>
                    <td>{it.dose}</td>
                    <td>{it.freq}</td>
                    <td>{it.dur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

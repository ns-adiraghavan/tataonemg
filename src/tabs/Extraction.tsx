import { useState } from "react";
import type { AllData } from "../data/store";
import { CAT_COLORS, Info } from "../components/ui";
import { ageSex } from "../lib/csv";

const base = import.meta.env.BASE_URL;

function confClass(c: number) {
  return c >= 90 ? "hi" : c >= 80 ? "md" : "lo";
}

export function Extraction({ d }: { d: AllData }) {
  const P = d.prescriptions;
  const [sel, setSel] = useState(0);
  const [reading, setReading] = useState(false);
  const p = P[sel];

  const pick = (i: number) => {
    setSel(i);
    setReading(true);
    setTimeout(() => setReading(false), 1200);
  };

  const F = ({
    k,
    v,
    full,
  }: {
    k: string;
    v: string | number | null;
    full?: boolean;
  }) => {
    const miss = v == null || v === "" || v === "Not specified" || v === "Not captured";
    return (
      <div className={`f${full ? " full" : ""}`}>
        <div className="k">
          <span>{k}</span>
        </div>
        <div className={`v${miss ? " miss" : ""}`}>{miss ? "Not on script" : v}</div>
      </div>
    );
  };

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">01</span>
          <h2>Extraction &amp; Quality</h2>
        </div>
        <p className="sec-sub">
          Every field below is pulled straight from the scan by the extraction engine — nothing is
          typed by hand. The confidence and review flags are computed, not asserted; open the
          <span style={{ color: "var(--coral-dp)" }}> i </span> on any derived metric to see the exact rule.
        </p>

        <div className="extract">
          <div className={`scan${reading ? " reading" : ""}`}>
            <div className="sweep" />
            {p.img ? (
              <img src={`${base}data/${p.img}`} alt={`Prescription ${p.rx}`} />
            ) : (
              <div className="noimg">No scan image on file<br />(structured record only)</div>
            )}
            <div className="tag">◉ {p.rx} · {p.form}</div>
          </div>

          <div className="ext-r">
            <div className="ext-head">
              <span className="chip coral">{p.lang}</span>
              <span className="chip">{p.form}</span>
              <span className="chip">{p.case}</span>
              <span className={`chip ${p.review ? "amber" : "coral"} ghost`}>
                {p.review ? "⚠ Review" : "✓ Auto-clear"}
              </span>
            </div>

            <div className="fields">
              <F k="Patient" v={p.patient} />
              <F k="Age / Sex" v={ageSex(p)} />
              <F k="Date" v={p.date} />
              <F k="Specialty area" v={p.area} />
              <F k="Hospital / Clinic" v={p.hospital} full />
              <F k="Doctor" v={p.doctor} full />
              <F k="Contact details" v={p.contact} full />
              <F k="Diagnosis / complaints" v={p.diagnosis} full />
              <F k="Recorded vitals / labs" v={p.vitals} full />
              <F k="Follow-up / advice" v={p.followup} full />
            </div>

            <div className="ext-head" style={{ marginTop: 4 }}>
              <span className={`cf ${confClass(p.confidence)}`}>
                confidence {p.confidence}%
              </span>
              <Info def={d.formulas.confidence} />
              <span className={`cf ${p.completeness === 100 ? "hi" : "md"}`}>
                completeness {p.completeness}%
              </span>
              <Info def={d.formulas.completeness} />
              <span className="chip" style={{ marginLeft: "auto" }}>
                {p.n_items} items · {p.n_meds} meds · {p.n_tests} tests
              </span>
            </div>

            <table className="itab">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Dose</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {(p.items ?? []).map((it, i) => (
                  <tr key={i}>
                    <td>
                      <span className="catdot" style={{ background: CAT_COLORS[it.cat] }} />
                      {it.name}
                      {it.unclear && (
                        <span className="frag rv" style={{ marginLeft: 6 }}>UNCLEAR</span>
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
        </div>

        <div className="thumbs">
          {P.map((q, i) => (
            <div
              key={q.rx}
              className={`thumb${i === sel ? " on" : ""}`}
              onClick={() => pick(i)}
              title={`${q.rx} · ${q.patient}`}
            >
              {q.img ? (
                <img src={`${base}data/${q.img}`} alt={q.rx} />
              ) : (
                <div className="noimg-mini">no<br />image</div>
              )}
              <b>{q.rx}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

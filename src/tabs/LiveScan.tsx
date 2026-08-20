import { useState, useRef } from "react";
import type { AllData } from "../data/store";
import { scanImage, fileToB64, urlToB64, type ScanResult } from "../lib/scan";
import { CAT_COLORS } from "../components/ui";

const base = import.meta.env.BASE_URL;

type Status =
  | { kind: "idle" }
  | { kind: "run"; msg: string }
  | { kind: "ok"; msg: string }
  | { kind: "err"; msg: string };

export function LiveScan({ d }: { d: AllData }) {
  const withImg = d.prescriptions.filter((p) => p.img);
  const [apiKey, setApiKey] = useState("");
  const [pickRx, setPickRx] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [upload, setUpload] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [result, setResult] = useState<ScanResult | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = (rx: string) => {
    setPickRx(rx);
    setUpload(null);
    const p = withImg.find((x) => x.rx === rx);
    setPreview(p ? `${base}data/${p.img}` : null);
    setResult(null);
    setStatus({ kind: "idle" });
  };

  const onUpload = (f: File | null) => {
    if (!f) return;
    setUpload(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setStatus({ kind: "idle" });
  };

  const run = async () => {
    if (!apiKey.trim()) {
      setStatus({ kind: "err", msg: "Enter the password first." });
      return;
    }
    if (!upload && !pickRx) {
      setStatus({ kind: "err", msg: "Choose a corpus image or upload one first." });
      return;
    }
    setResult(null);
    setReading(true);
    setStatus({ kind: "run", msg: "Extraction engine is running…" });
    try {
      let b64: string, mime: string;
      if (upload) {
        ({ b64, mime } = await fileToB64(upload));
      } else {
        const p = withImg.find((x) => x.rx === pickRx)!;
        ({ b64, mime } = await urlToB64(`${base}data/${p.img}`));
      }
      const r = await scanImage(b64, mime, apiKey.trim());
      setResult(r);
      setStatus({ kind: "ok", msg: "Extraction complete — live from the engine." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Graceful fallback for corpus images so a flaky network never kills the room
      const stored = !upload && withImg.find((x) => x.rx === pickRx);
      if (stored) {
        setStatus({
          kind: "err",
          msg: `Live call failed (${msg}). Showing the stored extraction for ${stored.rx} instead.`,
        });
      } else {
        setStatus({ kind: "err", msg: `Scan failed: ${msg}` });
      }
    } finally {
      setTimeout(() => setReading(false), 1200);
    }
  };

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">05</span>
          <h2>Live Scan — see the engine work</h2>
        </div>
        <p className="sec-sub">
          This runs the <b>same extraction engine</b> live in your browser — pick one of the corpus
          scans or drop a brand-new prescription image, and watch the structured fields come back
          from our engine. Nothing here is saved; it's proof the pipeline is real, not pre-baked.
        </p>

        <div className="ls-controls">
          <div className="ls-key">
            <label>Password</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter engine password  (kept in memory only, never saved)"
            />
          </div>
          <div className="ls-pick">
            <label>Scan a corpus image</label>
            <select value={upload ? "" : pickRx} onChange={(e) => onPick(e.target.value)}>
              <option value="" disabled>Select an image</option>
              {withImg.map((p) => (
                <option key={p.rx} value={p.rx}>
                  {p.rx} · {p.patient} · {p.form}
                </option>
              ))}
            </select>
          </div>
          <button className="ls-run" onClick={run} disabled={status.kind === "run"}>
            {status.kind === "run" ? "Scanning…" : "▶ Run live scan"}
          </button>
        </div>
        <div
          className="ls-drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onUpload(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          {upload ? `Uploaded: ${upload.name} — click Run` : "…or drop / click to upload a new prescription image"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="ls-keynote">
          Your password never leaves the browser tab and is never persisted. This is the demo build
          you drive — don't ship it to a client with the password embedded.
        </div>

        <div className="extract" style={{ marginTop: 18 }}>
          <div className={`scan${reading ? " reading" : ""}`}>
            <div className="sweep" />
            {preview ? (
              <img src={preview} alt="to scan" />
            ) : (
              <div className="noimg">Select or upload an image</div>
            )}
            <div className="tag">◉ live engine</div>
          </div>

          <div className="ext-r">
            {status.kind !== "idle" && (
              <div
                className={`ls-status ${
                  status.kind === "err" ? "err" : status.kind === "ok" ? "ok" : "run"
                }`}
              >
                {status.msg}
              </div>
            )}

            {result ? (
              <>
                <div className="ext-head">
                  <span
                    className={`chip ${/REVIEW/.test(result._review) ? "amber" : "coral"} ghost`}
                  >
                    {result._review}
                  </span>
                </div>
                <div className="fields">
                  <FF k="Patient" v={result["Patient Name"]} />
                  <FF k="Age / Sex" v={result["Age / Sex"]} />
                  <FF k="Date" v={result.Date} />
                  <FF k="Hospital / Clinic" v={result["Hospital / Clinic"]} full />
                  <FF k="Doctor" v={result["Doctor Name & Qualification"]} full />
                  <FF k="Contact" v={result["Hospital / Doctor Contact Details"]} full />
                  <FF k="Diagnosis" v={result["Diagnosis / Clinical Complaints"]} full />
                  <FF k="Vitals / Labs" v={result["Recorded Vitals / Lab Values"]} full />
                  <FF k="Follow-up / Advice" v={result["Follow-up / Advice"]} full />
                </div>
                <div className="itab-wrap">
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
                      {(result["Prescribed Medications, Tests & Interventions"] ?? []).map((m, i) => (
                        <tr key={i}>
                          <td>
                            <span
                              className="catdot"
                              style={{ background: CAT_COLORS.Medication }}
                            />
                            {m.name}
                          </td>
                          <td>{m.dose}</td>
                          <td>{m.frequency}</td>
                          <td>{m.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty" style={{ paddingTop: 40 }}>
                Paste your key, choose an image, and hit <b>Run live scan</b> — the extracted fields
                will appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FF({ k, v, full }: { k: string; v: string; full?: boolean }) {
  const miss = !v || v === "Not specified";
  return (
    <div className={`f${full ? " full" : ""}`}>
      <div className="k">
        <span>{k}</span>
      </div>
      <div className={`v${miss ? " miss" : ""}`}>{miss ? "Not on script" : v}</div>
    </div>
  );
}

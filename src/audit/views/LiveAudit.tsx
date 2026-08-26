import { useState } from "react";
import type { AllData } from "../data/store";
import type { Audit } from "../types";
import { auditTranscript, splitTranscript } from "../lib/liveaudit";
import { AuditPanel } from "../components/audit";

export function LiveAudit({ d }: { d: AllData }) {
  const [key, setKey] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ k: "ok" | "err" | "run"; m: string } | null>(null);
  const [result, setResult] = useState<Audit | null>(null);

  const rendered = text.trim() ? splitTranscript(text) : [];

  const run = async () => {
    if (!key.trim()) return setStatus({ k: "err", m: "Enter the engine password to run." });
    if (text.trim().length < 40)
      return setStatus({ k: "err", m: "Paste a fuller transcript to audit." });
    setStatus({ k: "run", m: "Auditing transcript…" });
    setResult(null);
    try {
      const a = await auditTranscript(text.trim(), key.trim());
      setResult(a);
      setStatus({ k: "ok", m: "Audit complete." });
    } catch (e) {
      setStatus({ k: "err", m: e instanceof Error ? e.message : "Audit failed." });
    }
  };

  const loadSample = () => {
    const c = d.conversations[2]; // a lab escalation — the interesting one
    setText(c.messages.filter((m) => !m.system).map((m) => `${m.speaker}: ${m.text}`).join("\n"));
    setResult(null);
    setStatus(null);
  };

  const onFile = (f?: File) => {
    if (!f) return;
    f.text().then((t) => {
      setText(t);
      setResult(null);
      setStatus(null);
    });
  };

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">06</span>
          <h2>Live Audit</h2>
        </div>
        <p className="sec-sub">
          Paste or upload a call transcript and the engine scores it on the same fields as the
          stored conversations. The result renders in the identical audit panel — the metrics
          adapt to any transcript, not just this sample. Processing runs in your browser; the key
          is held in memory and never stored.
        </p>

        <div className="ls-controls">
          <div className="ls-key">
            <label>Engine password</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="paste to enable live audit"
            />
          </div>
          <button className="ls-run" onClick={run} disabled={status?.k === "run"}>
            {status?.k === "run" ? "Auditing…" : "Run audit"}
          </button>
          <button className="def-toggle" onClick={loadSample} style={{ padding: "11px 14px" }}>
            Load a sample transcript
          </button>
        </div>
        <div className="ls-keynote">
          Input is a text transcript (transcribed voice call) — no audio is uploaded.
        </div>

        {status && <div className={`ls-status ${status.k}`}>{status.m}</div>}

        <div className="aud">
          <div className="tr">
            <div className="tr-head">
              <div className="tr-title">Transcript</div>
              <label className="tr-upload">
                Upload .txt
                <input
                  type="file"
                  accept=".txt,text/plain"
                  style={{ display: "none" }}
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
            </div>
            {rendered.length ? (
              <div className="tr-scroll">
                {rendered.map((m, i) => {
                  const first = i === 0 || rendered[i - 1].speaker !== m.speaker;
                  return (
                    <div className={`turn ${m.role}`} key={i}>
                      {first && <div className="spk">{m.speaker.split(" (")[0]}</div>}
                      <div className="bub">{m.text}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="ls-ta"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Paste transcript as\n\nCustomer: ...\nAgent: ...\n"}
              />
            )}
            {rendered.length > 0 && (
              <button className="def-toggle" style={{ marginTop: 10 }} onClick={() => setText("")}>
                Edit / clear transcript
              </button>
            )}
          </div>

          <div className="aud-side">
            {result ? (
              <AuditPanel
                audit={result}
                formulas={d.formulas}
                header={<div className="audp-tags"><span className="chip coral">Live result</span></div>}
              />
            ) : (
              <div className="live-empty">
                <div className="le-mark">◐</div>
                <p>Run an audit to see the scored read-out here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

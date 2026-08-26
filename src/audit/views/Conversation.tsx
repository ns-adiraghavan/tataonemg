import { useState } from "react";
import type { AllData } from "../data/store";
import { AuditPanel, csatColor } from "../components/audit";

const TIER_COLOR: Record<string, string> = {
  Good: "var(--green)",
  Average: "var(--amber)",
  Bad: "var(--coral-dp)",
};

export function Conversation({ d }: { d: AllData }) {
  const C = d.conversations;
  const [sel, setSel] = useState(0);
  const c = C[sel];

  return (
    <div className="view on">
      <div className="panel">
        <div className="sec-h">
          <span className="n">04</span>
          <h2>Conversation Audit</h2>
        </div>
        <p className="sec-sub">
          Open any conversation to read the transcript alongside its audit. Every score, root
          cause and gap is produced by the same engine that scores a live transcript — open the
          <span style={{ color: "var(--coral-dp)" }}> i </span> on any metric for its exact rule.
        </p>

        {/* conversation switcher */}
        <div className="conv-strip">
          {C.map((cv, i) => (
            <button
              key={cv.id}
              className={`conv-card${i === sel ? " on" : ""}`}
              onClick={() => setSel(i)}
            >
              <div className="cc-top">
                <span className="cc-id">{cv.id}</span>
                <span
                  className="cc-csat"
                  style={{ color: csatColor(cv.audit.predicted_csat) }}
                >
                  {cv.audit.predicted_csat}/5
                </span>
              </div>
              <div className="cc-name">{cv.customer}</div>
              <div className="cc-foot">
                <span className="cc-tier" style={{ color: TIER_COLOR[cv.tier] }}>
                  ● {cv.tier}
                </span>
                <span className="cc-grp">{cv.audit.root_cause_group}</span>
              </div>
            </button>
          ))}
        </div>

        {/* reader: transcript | audit */}
        <div className="aud">
          <div className="tr">
            <div className="tr-head">
              <div>
                <div className="tr-title">{c.customer}</div>
                <div className="tr-meta">
                  with {c.agent.split(" (")[0]} · {c.channel} · {c.message_count} turns
                </div>
              </div>
              <span className="tr-order">{c.order_or_booking_id}</span>
            </div>
            <div className="tr-scroll">
              {c.messages.map((m, i) => {
                if (m.system)
                  return (
                    <div className="sysline" key={i}>
                      {m.text}
                    </div>
                  );
                const first =
                  i === 0 || c.messages[i - 1].speaker !== m.speaker || c.messages[i - 1].system;
                return (
                  <div className={`turn ${m.role}`} key={i}>
                    {first && (
                      <div className="spk">{m.speaker.split(" (")[0]}</div>
                    )}
                    <div className="bub">{m.text}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="aud-side">
            <AuditPanel
              audit={c.audit}
              formulas={d.formulas}
              header={
                <div className="audp-tags">
                  <span className="chip coral">{c.id}</span>
                  <span className="chip">{c.channel}</span>
                  <span className="chip" style={{ color: TIER_COLOR[c.tier] }}>
                    {c.tier} sample
                  </span>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

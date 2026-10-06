import type { Data, Rx } from "../types";
import { Info } from "../../components/ui";
import { summarize } from "../lib/summary";

interface Play {
  k: string;
  t: string;
  q: string;
  f: (p: Rx) => boolean;
  desc: string;
  rule: string;
  formulaKey: string;
  icon: string;
}

const PLAYS: Play[] = [
  {
    k: "refill", t: "Refill & Subscription", icon: "↻", f: (p) => p.refill, formulaKey: "refill",
    q: "Who is on standing therapy?",
    desc: "Scripts with a medicine prescribed for a month or longer — candidates for an auto-refill or subscription reminder.",
    rule: "any medicine runs a month or longer",
  },
  {
    k: "chronic", t: "Chronic Care", icon: "♥", f: (p) => p.case === "Chronic", formulaKey: "case",
    q: "Who has a long-term condition?",
    desc: "Long-term conditions suited to a managed chronic-care enrolment with adherence tracking and refill reminders.",
    rule: "case type resolves to Chronic",
  },
  {
    k: "adherence", t: "Adherence / Pill-pack", icon: "⬡", f: (p) => p.poly, formulaKey: "poly",
    q: "Who is juggling many medicines?",
    desc: "Scripts with five or more medicines, where an adherence pack can help with missed doses.",
    rule: "script carries 5 or more medicines",
  },
  {
    k: "diagnostics", t: "Diagnostics Cross-sell", icon: "⊕", f: (p) => p.diagnostics, formulaKey: "diagnostics",
    q: "Who has tests ordered or lab results on the script?",
    desc: "Scripts that order tests or carry lab results — a natural point to offer a diagnostics booking.",
    rule: "a test is ordered or a lab result is written on the script",
  },
];

const flagsOf = (p: Rx) => PLAYS.reduce((n, pl) => n + (pl.f(p) ? 1 : 0), 0);

export function Opportunity({ d }: { d: Data }) {
  const P = d.P;
  const S = summarize(P);

  const addr = P.filter((p) => flagsOf(p) >= 1).length;
  const multi = P.filter((p) => flagsOf(p) >= 2).length;
  const pct = Math.round((addr / (S.n_pres || 1)) * 100);

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
          Which prescriptions fit which programme? Four programmes are matched automatically against
          the extracted data — no script is tagged by hand. The ⓘ on each card shows the exact rule.
        </p>

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
                <p className="opp-q">{pl.q}</p>
                <p>{pl.desc}</p>
                <div className="rxlist">
                  {hits.map((p) => (
                    <span key={p.rx}>{p.rx}</span>
                  ))}
                  {!hits.length && <span>none</span>}
                </div>
                <div className="rule">
                  Rule: {pl.rule} <Info def={d.formulas[pl.formulaKey]} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="oppctx two">
          <div className="octx">
            <div className="k">Addressable scripts</div>
            <div className="v">
              {addr}<small>/{S.n_pres}</small>
            </div>
            <div className="cap">
              <b>{pct}%</b> of the prescriptions match at least one programme.
            </div>
          </div>
          <div className="octx">
            <div className="k">Multi-programme scripts</div>
            <div className="v">{multi}</div>
            <div className="cap">Match two or more programmes — the natural place to start.</div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="sec-h">
            <span className="n">▦</span>
            <h2 style={{ fontSize: 15 }}>Patient segmentation</h2>
          </div>
          <p className="sec-sub" style={{ marginBottom: 14 }}>
            How should these prescriptions be prioritised? Three tiers, derived from the same rules.
          </p>
          <div className="seg-grid">
            <div className="seg hi">
              <div className="seg-label">Priority</div>
              <div className="seg-n">{priority.length}</div>
              <div className="seg-desc">Match two or more programmes. Start outreach here.</div>
              <div className="seg-list">{priority.map((p) => <span key={p.rx}>{p.rx}</span>)}</div>
            </div>
            <div className="seg md">
              <div className="seg-label">Chronic — single programme</div>
              <div className="seg-n">{chronicOnly.length}</div>
              <div className="seg-desc">Long-term condition with at most one other match. Enrol in chronic care; add a refill reminder.</div>
              <div className="seg-list">{chronicOnly.map((p) => <span key={p.rx}>{p.rx}</span>)}</div>
            </div>
            <div className="seg lo">
              <div className="seg-label">Acute — actionable</div>
              <div className="seg-n">{acuteAction.length}</div>
              <div className="seg-desc">Not chronic, but matches a programme (tests or pill-pack). A single-touch offer.</div>
              <div className="seg-list">{acuteAction.map((p) => <span key={p.rx}>{p.rx}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

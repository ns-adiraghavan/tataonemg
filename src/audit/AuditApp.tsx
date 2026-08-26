import { useEffect, useState } from "react";
import "../theme.css";
import { config } from "./config";
import { login, isSignedIn, logout } from "./auth";
import { loadAll, type AllData } from "./data/store";
import { summarize } from "./lib/audit";
import { Info } from "../components/ui";
import type { TabKey } from "./types";
import { Overview } from "./views/Overview";
import { Conversation } from "./views/Conversation";
import { Handoff } from "./views/Handoff";
import { AgentQuality } from "./views/AgentQuality";
import { Recommendations } from "./views/Recommendations";
import { LiveAudit } from "./views/LiveAudit";

const base = import.meta.env.BASE_URL;

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "conversation", label: "Conversation Audit" },
  { key: "handoff", label: "Handoff & Escalation" },
  { key: "quality", label: "Agent Quality" },
  { key: "actions", label: "Recommendations" },
  { key: "live", label: "Live Audit" },
];

function Login({ onLogin }: { onLogin: (e: string, p: string) => boolean }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    if (!onLogin(email, pass)) setErr("Incorrect email or password.");
  };
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-logos">
          <img className="tata" src={`${base}tata1mg-logo.png`} alt="Tata 1mg" />
          <span className="lsep" />
          <img className="ns" src={`${base}netscribes-color.png`} alt="Netscribes" />
        </div>
        <h2>Conversation Audit</h2>
        <p className="login-sub">Quality &amp; CX analytics demo</p>
        <div className="lfield">
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="demo@netscribes.com"
          />
        </div>
        <div className="lfield">
          <label>Password</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <button className="lbtn" onClick={submit}>
          Enter dashboard
        </button>
        <div className="lerr">{err}</div>
        <div className="login-foot">
          <span>Powered by</span>
          <img src={`${base}netscribes-color.png`} alt="Netscribes" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [signed, setSigned] = useState(isSignedIn());
  const [data, setData] = useState<AllData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!signed) return;
    loadAll().then(setData).catch((e) => setErr(e.message));
  }, [signed]);

  useEffect(() => {
    setCollapsed(tab !== "overview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab]);

  if (!signed)
    return (
      <Login
        onLogin={(e, p) => {
          const ok = login(e, p);
          if (ok) setSigned(true);
          return ok;
        }}
      />
    );

  if (err)
    return <div style={{ padding: 40, color: "var(--coral-dp)" }}>Failed to load data: {err}</div>;
  if (!data) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading dashboard…</div>;

  const S = summarize(data.conversations);

  const renderTab = () => {
    switch (tab) {
      case "overview": return <Overview d={data} />;
      case "conversation": return <Conversation d={data} />;
      case "handoff": return <Handoff d={data} />;
      case "quality": return <AgentQuality d={data} />;
      case "actions": return <Recommendations d={data} />;
      case "live": return <LiveAudit d={data} />;
    }
  };

  return (
    <>
      <div className="bgwash" />
      <nav>
        <div className="nav-in">
          <a className="brand brand-link" href="/">
            <img className="logo" src={`${base}tata1mg-logo.png`} alt="Tata 1mg" />
            <div>
              <b>{config.brand.title}</b>
              <small>{config.brand.subtitle}</small>
            </div>
          </a>
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`tab${t.key === tab ? " on" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="byline">
            <span>by</span>
            <img src={`${base}netscribes-color.png`} alt="Netscribes" />
            <button
              className="signout-btn"
              onClick={() => {
                logout();
                setSigned(false);
                setData(null);
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="wrap">
        <div className={`topblock${collapsed ? " collapsed" : ""}`}>
          <div className="hero">
            <div className="hero-top">
              <p className="eyebrow">Tata 1mg · conversation audit</p>
              <button className="collapse-btn" onClick={() => setCollapsed((c) => !c)}>
                <span className="cb-txt">{collapsed ? "Show overview" : "Hide overview"}</span>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" />
                </svg>
              </button>
            </div>
            <h1>
              From raw call transcripts to <span>audited, actionable quality intelligence</span>.
            </h1>
            <p className="subtitle">
              <b>{S.n} customer conversations</b> audited end to end — sentiment, predicted CSAT,
              agent quality, root cause and journey gaps, every score traced back to the transcript.
              The same engine scores a new transcript live.
            </p>

            <div className="bento">
              <div className="kpi">
                <div className="lab">Conversations</div>
                <div className="val">{S.n}</div>
                <div className="foot">{data.meta.source}</div>
              </div>
              <div className="kpi">
                <div className="lab">
                  Avg predicted CSAT <Info def={data.formulas.avg_csat} />
                </div>
                <div className="val">
                  {S.avg_csat}
                  <small>/5</small>
                </div>
                <div className="foot">{S.resolved} of {S.n} resolved first-contact</div>
              </div>
              <div className="kpi">
                <div className="lab">
                  Handoff rate <Info def={data.formulas.handoff_rate} />
                </div>
                <div className="val">
                  {S.handoff_rate}
                  <small>%</small>
                </div>
                <div className="foot">{S.escalations} escalated to back-office</div>
              </div>
              <div className="kpi">
                <div className="lab">
                  High churn risk <Info def={data.formulas.churn_risk} />
                </div>
                <div className="val">{S.by_churn.High}</div>
                <div className="foot">both trace to lab &amp; diagnostics</div>
              </div>
            </div>
          </div>
        </div>

        {renderTab()}

        <footer>
          <div className="foot-in">
            <div>
              {config.brand.org} · {S.n} conversations · {data.meta.channel} ·{" "}
              {data.meta.mode} audit
            </div>
            <div className="r">
              <img src={`${base}netscribes-color.png`} alt="Netscribes" />
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

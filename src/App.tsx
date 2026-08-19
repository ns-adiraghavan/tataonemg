import { useEffect, useState } from "react";
import "./theme.css";
import { config } from "./config";
import { login, isSignedIn, logout } from "./auth";
import { loadAll, type AllData } from "./data/store";
import { computeSummary } from "./lib/summary";
import { Info } from "./components/ui";
import type { TabKey } from "./types";
import { Extraction } from "./tabs/Extraction";
import { Clinical } from "./tabs/Clinical";
import { Explorer } from "./tabs/Explorer";
import { Opportunity } from "./tabs/Opportunity";
import { LiveScan } from "./tabs/LiveScan";

const base = import.meta.env.BASE_URL;

const TABS: { key: TabKey; label: string }[] = [
  { key: "extract", label: "Extraction & Quality" },
  { key: "analytics", label: "Clinical Analytics" },
  { key: "explorer", label: "Prescription Explorer" },
  { key: "opportunity", label: "Business Opportunity" },
  { key: "livescan", label: "Live Scan" },
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
        <h2>Prescription Intelligence</h2>
        <p className="login-sub">Extraction &amp; clinical analytics demo</p>
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
  const [tab, setTab] = useState<TabKey>("extract");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!signed) return;
    loadAll()
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [signed]);

  useEffect(() => {
    // KPI band open only on the extraction tab by default
    setCollapsed(tab !== "extract");
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

  const S = computeSummary(data.prescriptions);

  const renderTab = () => {
    switch (tab) {
      case "extract": return <Extraction d={data} />;
      case "analytics": return <Clinical d={data} />;
      case "explorer": return <Explorer d={data} />;
      case "opportunity": return <Opportunity d={data} />;
      case "livescan": return <LiveScan d={data} />;
    }
  };

  return (
    <>
      <div className="bgwash" />
      <nav>
        <div className="nav-in">
          <div className="brand">
            <img className="logo" src={`${base}tata1mg-logo.png`} alt="Tata 1mg" />
            <div>
              <b>{config.brand.title}</b>
              <small>{config.brand.subtitle}</small>
            </div>
          </div>
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
              className="collapse-btn"
              style={{ marginLeft: 8 }}
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
              <p className="eyebrow">Tata 1mg · prescription intelligence</p>
              <button className="collapse-btn" onClick={() => setCollapsed((c) => !c)}>
                <span className="cb-txt">{collapsed ? "Show overview" : "Hide overview"}</span>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" />
                </svg>
              </button>
            </div>
            <h1>
              From a photo of a prescription to <span>structured, billable intelligence</span>.
            </h1>
            <p className="subtitle">
              <b>{S.n_pres} prescriptions</b> across {S.n_specialties} specialties and{" "}
              {S.n_hospitals} facilities — every field, medicine and dose extracted by the engine,
              with <b>{S.handwritten} handwritten</b> and <b>{S.multilingual} Hindi/mixed</b> scripts
              to prove it holds up on the hard ones.
            </p>

            <div className="bento">
              <div className="kpi">
                <div className="lab">Prescriptions</div>
                <div className="val">{S.n_pres}</div>
                <div className="foot">{S.n_items} line-items extracted</div>
              </div>
              <div className="kpi">
                <div className="lab">
                  Avg confidence <Info def={data.formulas.confidence} />
                </div>
                <div className="val">
                  {S.avg_confidence}
                  <small>%</small>
                </div>
                <div className="foot">{S.avg_completeness}% avg completeness</div>
              </div>
              <div className="kpi">
                <div className="lab">
                  Auto-clear rate <Info def={data.formulas.review} />
                </div>
                <div className="val">
                  {S.auto_rate}
                  <small>%</small>
                </div>
                <div className="foot">
                  {S.auto} auto · {S.review} to review
                </div>
              </div>
              <div className="kpi">
                <div className="lab">Addressable programs</div>
                <div className="val">4</div>
                <div className="foot">
                  refill · chronic · adherence · diagnostics
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderTab()}

        <footer>
          <div className="foot-in">
            <div>
              {config.brand.org} · {S.n_pres} prescriptions · {S.n_items} items ·{" "}
              {data.meta.generated_from ?? "extraction engine"}
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

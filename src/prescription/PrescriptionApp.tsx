import { useEffect, useState } from "react";
import "../theme.css";
import "./rx.css";
import type { Data, TabKey } from "./types";
import { loadData } from "./lib/data";
import { summarize } from "./lib/summary";
import { Extraction } from "./tabs/Extraction";
import { Opportunity } from "./tabs/Opportunity";
import { Clinical } from "./tabs/Clinical";
import { Explorer } from "./tabs/Explorer";

const base = import.meta.env.BASE_URL;

/* Demo-grade, client-side gate (same single credential as the other Tata 1mg demos). */
const CREDS = { email: "demo@netscribes.com", pass: "Passw0rd" };
let signedIn = false;

// Same tab names and order the client has already seen.
const TABS: { key: TabKey; label: string }[] = [
  { key: "extract", label: "Extraction & Quality" },
  { key: "opportunity", label: "Commercial Plays" },
  { key: "analytics", label: "Clinical Analytics" },
  { key: "explorer", label: "Prescription Explorer" },
];

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    if (email.trim().toLowerCase() === CREDS.email && pass === CREDS.pass) {
      signedIn = true;
      onDone();
    } else setErr("Incorrect email or password.");
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
        <button className="lbtn" onClick={submit}>Enter dashboard</button>
        <div className="lerr">{err}</div>
        <div className="login-foot">
          <span>Powered by</span>
          <img src={`${base}netscribes-color.png`} alt="Netscribes" />
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionApp() {
  const [ok, setOk] = useState(signedIn);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("extract");
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    document.title = "Prescription Intelligence — Tata 1mg × Netscribes";
    if (!ok) return;
    loadData().then(setD).catch((e) => setErr(e.message));
  }, [ok]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  if (!ok) return <Login onDone={() => setOk(true)} />;
  if (err) return <div className="rx-msg err">Could not load the data: {err}</div>;
  if (!d) return <div className="rx-msg">Loading…</div>;

  const S = summarize(d.P);

  return (
    <>
      <div className="bgwash" />
      <nav>
        <div className="nav-in">
          <div className="brand">
            <img className="logo" src={`${base}tata1mg-logo.png`} alt="Tata 1mg" />
            <div>
              <b>Prescription Intelligence</b>
              <small>Tata 1mg · extraction &amp; clinical analytics</small>
            </div>
          </div>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={`tab${t.key === tab ? " on" : ""}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="byline">
            <span>by</span>
            <img src={`${base}netscribes-color.png`} alt="Netscribes" />
          </div>
        </div>
      </nav>

      <div className="rx-wrap">
        <div className={`topblock${collapsed ? " collapsed" : ""}`}>
          <div className="hero">
            <div className="hero-top">
              <h1>
                From a photo of a prescription to <span>structured intelligence</span>.
              </h1>
              <button className="collapse-btn" onClick={() => setCollapsed((c) => !c)}>
                <span className="cb-txt">{collapsed ? "Show overview" : "Hide overview"}</span>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" />
                </svg>
              </button>
            </div>
            <p className="subtitle">
              <b>{S.n_pres} prescriptions</b>, {S.n_items} line items — every field, medicine and dose read
              from the scan, with anything hard to read tagged for a second look.
            </p>
            <div className="bento">
              <div className="kpi">
                <div className="lab">Prescriptions</div>
                <div className="val">{S.n_pres}</div>
                <div className="foot">{S.n_items} line items read</div>
              </div>
              <div className="kpi">
                <div className="lab">Medicines</div>
                <div className="val">{S.n_meds}</div>
                <div className="foot">{S.n_tests} tests · {S.n_other} other instructions</div>
              </div>
              <div className="kpi">
                <div className="lab">Key fields found</div>
                <div className="val">
                  {S.avg_found}
                  <small>%</small>
                </div>
                <div className="foot">average, of 7 key fields per script</div>
              </div>
              <div className="kpi">
                <div className="lab">Entries to check</div>
                <div className="val">{S.n_check}</div>
                <div className="foot">across {S.n_review} prescriptions</div>
              </div>
            </div>
          </div>
        </div>

        {tab === "extract" && <Extraction d={d} />}
        {tab === "opportunity" && <Opportunity d={d} />}
        {tab === "analytics" && <Clinical d={d} />}
        {tab === "explorer" && <Explorer d={d} />}

        <footer>
          <div className="foot-in">
            <div>Netscribes for Tata 1mg · {S.n_pres} prescriptions · {S.n_items} items</div>
            <div className="r">
              <img src={`${base}netscribes-color.png`} alt="Netscribes" />
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

import "./theme.css";

const base = import.meta.env.BASE_URL;

const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden>
    <path d="M3 7.5h8m0 0L7.5 4m3.5 3.5L7.5 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

export default function Landing() {
  return (
    <div className="hub">
      <div className="hub-head">
        <div className="hub-logos">
          <img className="tata" src={`${base}tata1mg-logo.png`} alt="Tata 1mg" />
          <span className="lsep" />
          <img className="ns" src={`${base}netscribes-color.png`} alt="Netscribes" />
        </div>
        <h1 className="hub-title">
          Tata 1mg <span>intelligence demos</span>
        </h1>
        <p className="hub-sub">
          Two capability demonstrations built by Netscribes. Each opens with its own sign-in.
        </p>
      </div>

      <div className="hub-cards">
        <a className="hub-card" href="/prescription">
          <div className="hc-eyebrow">Prescription processing</div>
          <div className="hc-title">Prescription Intelligence</div>
          <p className="hc-desc">
            From a photo of a prescription to structured, billable intelligence — extraction,
            clinical analytics, and a live scan.
          </p>
          <div className="hc-go">
            Open dashboard <Arrow />
          </div>
        </a>

        <a className="hub-card" href="/audit">
          <div className="hc-eyebrow">Audit &amp; quality analytics</div>
          <div className="hc-title">Conversation Audit</div>
          <p className="hc-desc">
            From raw call transcripts to audited quality intelligence — CSAT, handoff drivers,
            agent scorecards, and a live audit.
          </p>
          <div className="hc-go">
            Open dashboard <Arrow />
          </div>
        </a>
      </div>

      <div className="hub-foot">
        <span>Powered by</span>
        <img src={`${base}netscribes-color.png`} alt="Netscribes" />
      </div>
    </div>
  );
}

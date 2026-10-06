import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PrescriptionApp from "./prescription/PrescriptionApp.tsx"; // client-facing prescription viewer
import AuditApp from "./audit/AuditApp.tsx"; // internal: conversation audit tool
import RxFullApp from "./audit/rx-full/App.tsx"; // internal: original full prescription dashboard

// Path-based routing — no router dependency. The host rewrites every path to '/'
// (SPA), so a full load of any path boots this entry and mounts the right app.
//
//   /                      → redirected to /prescription  (the only page we share)
//   /prescription          → client-facing prescription viewer
//   /audit                 → internal: conversation audit tool
//   /audit/prescription    → internal: original full dashboard (commercial plays, analytics,
//                            explorer, live scan) — kept for reference, NOT shared
//   anything else          → redirected to /prescription
const path = window.location.pathname.replace(/\/+$/, "") || "/";

let Root;
if (path === "/audit/prescription" || path.startsWith("/audit/prescription/")) Root = RxFullApp;
else if (path === "/audit" || path.startsWith("/audit/")) Root = AuditApp;
else if (path === "/prescription") Root = PrescriptionApp;
else {
  // '/' and unknown paths: the prescription viewer is always the front door.
  // (vercel.json also does this server-side; this is the fallback for any other host.)
  window.history.replaceState(null, "", "/prescription");
  Root = PrescriptionApp;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);

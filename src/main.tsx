import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";                 // prescription tool (unchanged)
import AuditApp from "./audit/AuditApp.tsx"; // conversation audit tool
import Landing from "./Landing.tsx";

// Path-based routing — no router dependency. Vercel rewrites every path to '/'
// (SPA), and Vite's dev server does the same, so a full load of /audit or
// /prescription boots this entry and mounts the right app. Each app keeps its
// own in-memory login gate, so the two dashboards sign in independently.
const path = window.location.pathname;
const Root = path.startsWith("/audit")
  ? AuditApp
  : path.startsWith("/prescription")
    ? App
    : Landing;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);

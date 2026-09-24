export const config = {
  brand: {
    title: "Conversation Audit",
    subtitle: "Tata 1mg · quality & CX analytics",
    org: "Netscribes for Tata 1mg",
  },
  // Live-audit engine (browser-resident; password pasted at runtime, never stored).
  // model/endpoint are the raw upstream identifiers required to make the call —
  // never surface these in the UI.
  engine: {
    model: "gemini-2.5-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  },
} as const;

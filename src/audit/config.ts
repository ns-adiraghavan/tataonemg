export const config = {
  brand: {
    title: "Conversation Audit",
    subtitle: "Tata 1mg · quality & CX analytics",
    org: "Netscribes for Tata 1mg",
  },
  // Live-audit engine (browser-resident; key pasted at runtime, never stored)
  gemini: {
    model: "gemini-2.5-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  },
} as const;

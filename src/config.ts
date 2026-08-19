export const config = {
  brand: {
    title: "Prescription Intelligence",
    subtitle: "Tata 1mg · extraction & clinical analytics",
    org: "Netscribes for Tata 1mg",
  },
  // Live-scan engine (browser-resident; key pasted at runtime, never stored)
  gemini: {
    model: "gemini-2.5-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  },
} as const;

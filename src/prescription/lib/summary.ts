import type { Rx, RxItem } from "../types";

export const ageSex = (p: Rx) => {
  const parts = [p.age ? `${p.age} yr` : null, p.sex ? p.sex[0] : null].filter(Boolean);
  return parts.length ? parts.join(" / ") : null;
};

export const CAT_COLORS: Record<RxItem["cat"], string> = {
  Medication: "#ff6f61",
  Test: "#5b7285",
  Other: "#c8862f",
};

export const CASE_COLORS: Record<string, string> = {
  Chronic: "#ff6f61",
  "Sub-acute": "#c8862f",
  Acute: "#5b7285",
  "Acute / Emergency": "#8aa0b0",
};

export function summarize(P: Rx[]) {
  const items = P.flatMap((p) => p.items);
  const count = (fn: (p: Rx) => string) =>
    P.reduce<Record<string, number>>((m, p) => ((m[fn(p)] = (m[fn(p)] ?? 0) + 1), m), {});
  const by_class: Record<string, number> = {};
  for (const it of items) {
    if (it.cat !== "Medication") continue;
    by_class[it.cls] = (by_class[it.cls] ?? 0) + 1;
  }
  return {
    n_pres: P.length,
    n_items: items.length,
    n_meds: items.filter((i) => i.cat === "Medication").length,
    n_tests: items.filter((i) => i.cat === "Test").length,
    n_other: items.filter((i) => i.cat === "Other").length,
    n_check: items.filter((i) => i.check).length,
    n_review: P.filter((p) => p.review).length,
    refill: P.filter((p) => p.refill).length,
    poly: P.filter((p) => p.poly).length,
    diagnostics: P.filter((p) => p.diagnostics).length,
    chronic: P.filter((p) => p.case === "Chronic").length,
    avg_found: Math.round((P.reduce((s, p) => s + p.found / p.found_of, 0) / (P.length || 1)) * 100),
    by_area: count((p) => p.area),
    by_case: count((p) => p.case),
    by_class,
  };
}

/* CSV */
export const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const medLine = (it: RxItem) => `• ${it.name} (${it.dose}, ${it.freq}, ${it.dur})`;
export function download(lines: string[], name: string) {
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

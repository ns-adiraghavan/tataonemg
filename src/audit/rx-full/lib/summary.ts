import type { Rx } from "../types";

// All headline numbers are recomputed from the prescription rows at load time,
// so a re-scrape or an added row flows through every KPI with no hand-editing.
export interface Summary {
  n_pres: number;
  n_items: number;
  n_meds: number;
  n_tests: number;
  n_non: number;
  avg_items: number;
  avg_completeness: number;
  avg_confidence: number;
  auto: number;
  review: number;
  auto_rate: number;
  chronic: number;
  refill: number;
  diagnostics: number;
  poly: number;
  n_hospitals: number;
  n_specialties: number;
  handwritten: number;
  multilingual: number;
  by_area: Record<string, number>;
  by_case: Record<string, number>;
  by_class: Record<string, number>;
}

const round = (n: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export function computeSummary(P: Rx[]): Summary {
  const n = P.length || 1;
  const items = P.flatMap((p) => p.items ?? []);
  const by_area: Record<string, number> = {};
  const by_case: Record<string, number> = {};
  const by_class: Record<string, number> = {};
  for (const p of P) {
    by_area[p.area] = (by_area[p.area] ?? 0) + 1;
    by_case[p.case] = (by_case[p.case] ?? 0) + 1;
  }
  for (const it of items) {
    const k = it.cls || "Other";
    by_class[k] = (by_class[k] ?? 0) + 1;
  }
  const auto = P.filter((p) => !p.review).length;
  return {
    n_pres: P.length,
    n_items: items.length,
    n_meds: items.filter((i) => i.cat === "Medication").length,
    n_tests: items.filter((i) => i.cat === "Diagnostic Test").length,
    n_non: items.filter((i) => i.cat === "Non-Medication").length,
    avg_items: round(items.length / n, 1),
    avg_completeness: Math.round(P.reduce((s, p) => s + p.completeness, 0) / n),
    avg_confidence: round(P.reduce((s, p) => s + p.confidence, 0) / n, 1),
    auto,
    review: P.filter((p) => p.review).length,
    auto_rate: Math.round((auto / n) * 100),
    chronic: P.filter((p) => p.case === "Chronic").length,
    refill: P.filter((p) => p.refill).length,
    diagnostics: P.filter((p) => p.diagnostics).length,
    poly: P.filter((p) => p.poly).length,
    n_hospitals: new Set(P.map((p) => p.hospital)).size,
    n_specialties: Object.keys(by_area).length,
    handwritten: P.filter((p) => /handwritten/i.test(p.form)).length,
    multilingual: P.filter((p) => /hindi/i.test(p.lang)).length,
    by_area,
    by_case,
    by_class,
  };
}

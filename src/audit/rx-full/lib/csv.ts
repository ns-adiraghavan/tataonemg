import type { Rx, Item } from "../types";

export const ageSex = (p: Rx) =>
  `${p.age ?? "—"}${p.age ? " yr" : ""} / ${p.sex || "—"}`;

export const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const medLine = (it: Item) =>
  `• ${it.name} (${it.dose}, ${it.freq}, ${it.dur})`;

export function download(lines: string[], name: string) {
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

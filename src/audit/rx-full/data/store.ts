import type { Rx, Item, Meta, Formulas } from "../types";

const base = import.meta.env.BASE_URL + "data";

export interface AllData {
  prescriptions: Rx[];
  items: Item[];
  meta: Meta;
  formulas: Formulas;
}

async function j<T>(f: string): Promise<T> {
  const r = await fetch(`${base}/${f}`);
  if (!r.ok) throw new Error(`Failed to load ${f} (${r.status})`);
  return r.json();
}

export async function loadAll(): Promise<AllData> {
  const [prescriptions, items, meta, formulas] = await Promise.all([
    j<Rx[]>("prescriptions.json"),
    j<Item[]>("items.json"),
    j<Meta>("meta.json"),
    j<Formulas>("formulas.json"),
  ]);
  // attach line-items to each prescription
  const byRx = new Map<string, Item[]>();
  for (const it of items) {
    if (!byRx.has(it.rx)) byRx.set(it.rx, []);
    byRx.get(it.rx)!.push(it);
  }
  for (const p of prescriptions) p.items = byRx.get(p.rx) ?? [];
  return { prescriptions, items, meta, formulas };
}

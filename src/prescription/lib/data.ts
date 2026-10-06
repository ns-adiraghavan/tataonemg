import type { Data, Rx, Formulas } from "../types";

const base = import.meta.env.BASE_URL + "data/rx";

async function j<T>(f: string): Promise<T> {
  const r = await fetch(`${base}/${f}`);
  if (!r.ok) throw new Error(`Failed to load ${f} (${r.status})`);
  return r.json();
}

export async function loadData(): Promise<Data> {
  const [P, formulas] = await Promise.all([
    j<Rx[]>("prescriptions.json"),
    j<Formulas>("formulas.json"),
  ]);
  return { P, formulas };
}

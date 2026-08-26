import type { Conversation, Meta, Formulas } from "../types";

const base = import.meta.env.BASE_URL + "data/audit";

export interface AllData {
  conversations: Conversation[];
  meta: Meta;
  formulas: Formulas;
}

async function j<T>(f: string): Promise<T> {
  const r = await fetch(`${base}/${f}`);
  if (!r.ok) throw new Error(`Failed to load ${f} (${r.status})`);
  return r.json();
}

export async function loadAll(): Promise<AllData> {
  const [conversations, meta, formulas] = await Promise.all([
    j<Conversation[]>("conversations.json"),
    j<Meta>("meta.json"),
    j<Formulas>("formulas.json"),
  ]);
  return { conversations, meta, formulas };
}

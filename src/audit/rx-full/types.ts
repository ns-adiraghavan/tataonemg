export interface Item {
  rx: string;
  cat: "Medication" | "Diagnostic Test" | "Non-Medication";
  name: string;
  dose: string;
  freq: string;
  dur: string;
  cls: string;
  unclear: boolean;
}

export interface Rx {
  rx: string;
  date: string;
  patient: string;
  age: number | null;
  sex: string;
  hospital: string;
  doctor: string;
  contact: string;
  area: string;
  diagnosis: string;
  vitals: string;
  followup: string;
  form: string;
  lang: string;
  img: string | null;
  n_items: number;
  n_meds: number;
  n_tests: number;
  case: string;
  refill: boolean;
  n_maint: number;
  diagnostics: boolean;
  poly: boolean;
  completeness: number;
  confidence: number;
  review: boolean;
  unclear_flags: number;
  items?: Item[];
}

export interface Meta {
  n_pres: number;
  n_items: number;
  generated_from?: string;
  note?: string;
}

export interface FormulaDef {
  label: string;
  formula: string;
  detail: string;
  unit: string;
}
export type Formulas = Record<string, FormulaDef>;

export type TabKey = "extract" | "analytics" | "explorer" | "opportunity" | "livescan";

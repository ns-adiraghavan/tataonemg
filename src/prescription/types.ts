export type Cat = "Medication" | "Test" | "Other";

export interface RxItem {
  cat: Cat;
  name: string;
  dose: string;
  freq: string; // frequency — or an instruction / note when the script gives one instead
  dur: string;
  cls: string; // therapeutic class, mapped from the medicine name
  /** hard to read on the scan — flagged to the viewer, never guessed */
  check: boolean;
}

export interface Rx {
  rx: string;
  img: string;
  lang: string;
  form: string;
  area: string;
  patient: string | null;
  age: number | null;
  sex: string | null;
  date: string | null;
  hospital: string | null;
  doctor: string | null;
  contact: string | null;
  diagnosis: string | null;
  vitals: string | null;
  followup: string | null;
  items: RxItem[];
  // derived (rules in formulas.json)
  n_items: number;
  n_meds: number;
  n_tests: number;
  n_check: number;
  found: number;
  found_of: number;
  case: string;
  refill: boolean;
  poly: boolean;
  diagnostics: boolean;
  review: boolean;
}

export interface FormulaDef {
  label: string;
  formula: string;
  detail: string;
  unit: string;
}
export type Formulas = Record<string, FormulaDef>;

export interface Data {
  P: Rx[];
  formulas: Formulas;
}

export type TabKey = "extract" | "opportunity" | "analytics" | "explorer";

import { config } from "../config";

// ── Prompt lifted verbatim from med.ipynb so live output matches the stored
//    14-field schema exactly. Do not "improve" — parity with the corpus matters.
const PROMPT = `
You are a medical-grade OCR + information extractor for handwritten and printed doctor prescriptions.
The prescription may be in English, Hindi, or a mix (Hinglish).

VERY IMPORTANT SAFETY RULES:
1. DO NOT guess, complete, correct, expand, or "clean up" any medicine name, dose, or instruction.
2. If a word/number is unclear, illegible, cut off, or you are NOT 100% sure, write exactly: "UNCLEAR"
3. Keep the exact spelling of medicine/drug names as written by the doctor, even if misspelled.
4. DO NOT translate or alter drug/medicine names. Keep them exact.
5. TRANSLATE & TRANSLITERATE ALL NON-MEDICINE TEXT: For Hindi or regional script text in instructions, timing, complaints, advice, diet, and contact details, translate the meaning into English and include the original text in parentheses. Example: "2 teaspoons morning and evening (दो चम्मच, सुबह - शाम)".
6. Do NOT add medicines, doses, tests, or advice that are not visibly written.
7. Preserve units exactly (mg, ml, IU, mcg, etc.) as written.
8. If a field is not present on the prescription at all, write exactly: "Not specified".

Extract the following fields and return ONLY a valid JSON object (no markdown, no fences).
Use exactly these keys:

{
  "Date": "date on the prescription, keep format as written",
  "Patient Name": "full name as written, including titles (Mr./Mrs./Ms./Master)",
  "Age / Sex": "e.g. '62 yr / M', '65 / M', '4 yr / F' — copy exactly as written",
  "Hospital / Clinic": "hospital / clinic name and address from letterhead",
  "Hospital / Doctor Contact Details": "phone numbers, mobile numbers, email, or consultation timings printed/written on the paper",
  "Doctor Name & Qualification": "doctor name with degrees, e.g. 'Dr. Akshay Nigam (M.D., PGDHHM - Radiation Oncology)'",
  "Diagnosis / Clinical Complaints": "chief complaints + diagnosis in English (translate Hindi terms). Comma separated.",
  "Recorded Vitals / Lab Values": "BP, pulse, weight, SpO2, lab values etc. 'Not specified' if none",
  "Prescribed Medications, Tests & Interventions": [
      {
        "name": "medicine/test name exactly as written (e.g. 'Tab. Tebi')",
        "dose": "e.g. '50 mg', '1 tab', '2 tsp (दो चम्मच)', or 'UNCLEAR'",
        "frequency": "English translated frequency with original in parentheses, e.g. '1 time daily (दिन में एक बार)' or '1-0-1'",
        "duration": "e.g. '7 days', '1 month', or 'UNCLEAR'"
      }
  ],
  "Unclear Medicine / Quality Flags": "Specifically list any medicine, dosage, or frequency that was uncertain or illegible. If all items are 100% clear, write 'None'.",
  "Follow-up / Advice": "review date + non-medicine advice (diet, mouth exercises, lifestyle) fully translated into English with Hindi in parentheses"
}

Return ONLY the JSON. Nothing else.
`;

export interface ScanMed {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}
export interface ScanResult {
  Date: string;
  "Patient Name": string;
  "Age / Sex": string;
  "Hospital / Clinic": string;
  "Hospital / Doctor Contact Details": string;
  "Doctor Name & Qualification": string;
  "Diagnosis / Clinical Complaints": string;
  "Recorded Vitals / Lab Values": string;
  "Prescribed Medications, Tests & Interventions": ScanMed[];
  "Unclear Medicine / Quality Flags": string;
  "Follow-up / Advice": string;
  _review: string; // computed, mirrors notebook get_review_status
}

// Grab the first balanced {...} — fixes the notebook's "Extra data" errors
// where the model appended text after the JSON object.
function firstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("No JSON object in response");
  let depth = 0,
    inStr = false,
    esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Response truncated before JSON closed (raise maxOutputTokens)");
}

// Mirrors get_review_status() from the notebook.
function reviewStatus(d: ScanResult): string {
  const flagged: string[] = [];
  const meds = d["Prescribed Medications, Tests & Interventions"] ?? [];
  meds.forEach((m, i) => {
    const parts: string[] = [];
    if (/UNCLEAR/i.test(m.name || "")) parts.push("Name");
    if (/UNCLEAR/i.test(m.dose || "")) parts.push("Dose");
    if (/UNCLEAR/i.test(m.frequency || "")) parts.push("Frequency");
    if (/UNCLEAR/i.test(m.duration || "")) parts.push("Duration");
    if (parts.length) {
      const label =
        m.name && !/UNCLEAR/i.test(m.name) ? m.name : `Medicine #${i + 1}`;
      flagged.push(`Unclear ${parts.join(", ")} for '${label}'`);
    }
  });
  const mf = d["Unclear Medicine / Quality Flags"];
  if (mf && !["none", "not specified"].includes(String(mf).trim().toLowerCase())) {
    if (!flagged.includes(String(mf))) flagged.push(String(mf));
  }
  return flagged.length
    ? "⚠️ REVIEW REQUIRED: " + flagged.join("; ")
    : "✅ CLEAR (High Confidence)";
}

export async function scanImage(
  imageB64: string,
  mime: string,
  apiKey: string
): Promise<ScanResult> {
  const url = `${config.gemini.endpoint}/${config.gemini.model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mime, data: imageB64 } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 4096, // notebook hit the cap on dense scripts → raised
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 400 && /API_KEY/i.test(t))
      throw new Error("Invalid API key");
    throw new Error(`Gemini call failed (${res.status}). ${t.slice(0, 160)}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ??
    "";
  if (!text) throw new Error("Empty response from model");

  const parsed = JSON.parse(firstJsonObject(text)) as ScanResult;
  parsed._review = reviewStatus(parsed);
  return parsed;
}

export function fileToB64(file: File): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve({
        b64: (r.result as string).split(",")[1],
        mime: file.type || "image/jpeg",
      });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Fetch a bundled corpus image and turn it into base64 (for the "scan one of
// the 14" path — same engine call, no upload needed).
export async function urlToB64(url: string): Promise<{ b64: string; mime: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  const file = new File([blob], "scan", { type: blob.type || "image/jpeg" });
  return fileToB64(file);
}

**Subject:** Prescription intelligence — proposed scope and commercial structure

Hi [Name],

Thanks for the feedback on the prescription demo. The link we've shared is deliberately narrow: it shows, sample by sample, what we can read from a prescription image. The commercial plays and dashboards in the earlier version were indicative; given your interest, here is how we'd scope the real engagement.

**What the engagement covers**

1. **Scrape** — structured extraction from every prescription image: patient, age/sex, date, doctor and registration number, hospital/clinic, diagnosis, vitals, each medicine with dose, frequency and duration, and tests ordered. Handwritten and regional-language scripts are included; anything unreadable is flagged, not guessed.
2. **Categorise** — medicines normalised to generic name, therapeutic class and likely indication; doctors and hospitals identified from letterheads, stamps, logos, registration numbers and other symbols on the page.
3. **LLM insight layer** — on top of the structured data, flags for a human reviewer: for example, a medicine commonly associated with cancer therapy, two medicines from the same class that are rarely prescribed together (which may warrant a second look), or an unusual dose for a paediatric patient. Each flag carries its reason and points back to the exact place on the image. These are guard-rails for human decisions, not clinical decisions.
4. **Profiles and review view** — patient-wise profiles (all scripts for one patient and what was flagged) and doctor/hospital-wise profiles (specialty mix, prescribing patterns, share of flagged scripts), plus a queue for flagged scripts.

**Proposed commercial structure** (numbers to follow once volumes are confirmed)

- **Per-image extraction fee** (scrape + categorisation), volume-tiered; handwritten and multilingual scripts priced a step above printed.
- **LLM insight layer**, charged per image to cover model usage (tokens) for flags and insights.
- **One-time setup:** flag taxonomy and rules with your clinical team, medicine master mapping, and the dashboard build.
- **Recurring:** hosting and dashboard maintenance, plus analyst time for periodic analysis and reporting.
- **Optional:** human QA on a sample of images, priced per reviewed image.
- We'd suggest a **fixed-fee pilot on a few hundred images** from your real mix. That gives measured accuracy and unit costs before anyone commits to volume pricing.

**What we need to size it:** expected monthly volume, the printed vs handwritten mix, languages, turnaround expectations, where the data can be processed and stored (consent and DPDP requirements), and who on your side owns the flag definitions.

Happy to walk through this on a call.

Best,
Adi

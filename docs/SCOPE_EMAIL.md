# Scope email to Tata 1mg (v2 — client-facing)

**Subject:** Prescription Intelligence — how we'd approach it, and a few questions to size it properly

Hi [Name],

Thank you for the time earlier this week. The link below is the prescription piece of the demo, so your team can go through it at their own pace and zoom into each scan to see exactly what we read from it: [link] (login: demo@netscribes.com / Passw0rd).

**What you're looking at**
The sample is 8 prescriptions, hand-checked against the images. Each one is turned into structured data: patient, doctor, hospital, date, diagnosis, and every medicine, dose, test and instruction. Medicines are mapped to a therapeutic class so they can be analysed together. The other three tabs show what becomes possible once prescriptions are structured:

- **Commercial Plays** – what the prescription base says about demand: which medicines and classes recur, which patients look like repeat or chronic buyers, and where a refill, a substitute or a diagnostics offer is relevant.
- **Clinical Analytics** – patterns across prescriptions: medicines that commonly go together, combinations typical of a condition (for example, two medicines that are both usually cancer therapies), and prescriptions with several medicines at once.
- **Prescription Explorer** – every prescription and line item in one searchable view, to trace any insight back to the source scan.

These were built as indicative views. The slicing is flexible. Once we know how your team would like to look at the data, we can organise it around that: patient-wise profiles, doctor + hospital combinations, medicines and how many patients take them, or a mix.

**How we'd build it**
1. **Scrape** each image into structured fields.
2. **Categorise** – standardise medicine names, map them to generics and classes, and tag tests, specialties and document types.
3. **Link** images to the right patient, doctor and hospital so profiles can be built.
4. **LLM layer** – generate the diagnostic associations and flags that matter, as guard-rails for human review: unusual combinations, unclear entries, patterns worth a clinician's eye.
5. **Dashboard** – patient and doctor/hospital profiles, the commercial views above, and a review queue.

We'd suggest starting with a fixed batch (say, 1 lakh prescription images) to calibrate the taxonomy and flags with your team, then codifying the approach and running it on the remaining volume.

Commercially, we've traditionally priced this per image (per SKU), as we have on similar extraction work. The other components — setup, dashboards, the analytical layer — depend on how your data is organised today and how much additional research is needed. That is what the questions below are for.

**To give you a proper number, it would help to know:**
1. How are prescriptions organised today? Is the data already segmented (by patient, doctor, hospital, date, specialty), or would we start with classification from scratch?
2. Is there a digital repository where they are stored? In what format, and can we access it directly?
3. Are the images already tied to individual people (patient IDs, order IDs), or do we also need to work out which images belong to the same patient or doctor?
4. Roughly what volume are we talking about overall, and would you like to begin with a fixed batch (for example 1L images) before extending to the full set?
5. For the diagnostic patterns, commonalities and correlations you'd like to see, can your clinical or medical team define them, or should we develop them independently from the data and bring them to you to validate?
6. Which cuts matter most: patient-wise, doctor + hospital, medicine-wise with patient counts, or something else?
7. What would the output be used for (commercial planning, clinical flagging, compliance), and who will use it day to day?
8. Anything else we should know: languages or handwriting mix, privacy and access constraints, timelines, or existing systems it needs to connect to?

**A related tool**
We have also built a similar tool for customer satisfaction and audit. It takes unstructured customer interactions and audit records, extracts structured signals, scores them against defined criteria, and surfaces what needs attention in a dashboard, with each insight traceable to its source. It runs on the same extract, categorise, flag and review approach, so the way we'd handle prescriptions follows a pattern we have used before. We'd be glad to schedule another demo to walk you through it, whenever works for your team.

Warm regards,
Adi

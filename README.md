# Prescription Extraction — Tata 1mg × Netscribes

Vite + React + TS single-page app. Data is static JSON under `public/data`.

## Routes

| Path | What | Shared? |
|---|---|---|
| `/` | redirects to `/prescription` | — |
| `/prescription` | Client-facing tool: Extraction & Quality (zoomable scan + information read), Commercial Plays, Clinical Analytics, Prescription Explorer — 8 verified prescriptions | **Yes** |
| `/audit` | Internal: conversation audit tool | No |
| `/audit/prescription` | Internal: original dashboard incl. Live Scan — uncorrected data | No |

Unknown paths also land on `/prescription`. Target domain: `tataonemg.netscribes.com`.

## Run

```bash
npm install
npm run dev       # local
npm run build     # tsc + vite -> dist/
npm run preview
```

Login (client-side demo gate): `demo@netscribes.com` / `Passw0rd`.

## Client-facing data

`python3 scripts/build_prescription_clean.py` regenerates `public/data/rx/` (JSON + only the visible scans)
from hand-verified records and derives every flag (case type, refill, poly, diagnostics, class) by the rules in
`formulas.json`. To add a sample: add its record to the script and re-run. See `docs/RX_AUDIT.md` for what was
checked and changed, and `docs/SCOPE_EMAIL.md` for the scope note.

## Hosting

SPA: every path must serve `index.html`; `/` must redirect to `/prescription`.

- **Vercel:** `vercel.json` already does both (redirect + rewrite) and sends `noindex` for `/audit*`.
- **nginx / EC2 (when moving off Vercel):**
  ```nginx
  server_name tataonemg.netscribes.com;
  root /var/www/tataonemg/dist;
  location = / { return 302 /prescription; }
  location / { try_files $uri /index.html; }
  location /audit { add_header X-Robots-Tag "noindex, nofollow"; try_files $uri /index.html; }  # or gate / remove
  ```
- Vite base is `/`; the app must be served from the domain root.
- `/audit*` still serves uncorrected data and all original scans — gate or remove it for the public deploy.

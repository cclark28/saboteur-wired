# saboteur-wired

This repo is the live saboteur.one SPA (`index.html` → Vercel → saboteur.one).

**Before any work, read:**  
`/Users/charlieclark/Documents/Brain/Saboteur.one/How Saboteur.one works.md`

- `main` is production. Put website changes on `staging` first.
- Backup `index.html` before editing it.
- Photos and product copy are not in this repo. They live in Sanity `6td8xalf` / `production`.
- Checkout is `https://saboteur-api.vercel.app`, not this repo.
- Older folders named saboteur / saboteur-one are not live.
- Every page route except `/` is served by `api/page.js`: it reads `index.html` and fills in per-page title, description, canonical, share tags, JSON-LD and crawlable text from Sanity. `/sitemap.xml` comes from `api/sitemap.js`. Shared code: `api/_seo.js`. No build step.
- `.vercelignore` keeps repo-only files (this file, `scripts/`, backups) off the public site. Don't commit backups or scratch files to the repo root; they get served.
- `/og/saboteur-logo.png` (fallback share image) is served by `api/og-logo.js`. `/comics` and `/comics.html` 301 to `/store/comics` (vercel.json); old `/store?tab=` links 301 from `api/page.js`.
- No em dashes in generated titles, descriptions or alt text.

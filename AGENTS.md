# saboteur-wired

This repo is the live saboteur.one SPA (`index.html` → Vercel → saboteur.one).

**Before any work, read:**  
`/Users/charlieclark/Documents/Brain/Saboteur.one/How Saboteur.one works.md`

- `main` is production. Put website changes on `staging` first.
- Backup `index.html` before editing it.
- Photos and product copy are not in this repo. They live in Sanity `6td8xalf` / `production`.
- Checkout is `https://saboteur-api.vercel.app`, not this repo.
- Older folders named saboteur / saboteur-one are not live.
- `policies.html` is generated from `index.html` (own title/canonical/share tags for /policies). After any `index.html` edit run `python3 scripts/build-policies.py` and commit both.

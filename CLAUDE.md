# Spend, sorted: spending tracker

Personal spending tracker for one user in Israel (Hebrew + English). Each card has its own counting rule (full, half, a custom percentage, or not counted); a joint card with their partner is just a card set to half.

## How to work with me
- Keep answers short and clear. Keep the app uncluttered.
- Make targeted edits, not full rewrites.
- I have not tested everything in a browser. When I report a problem, reproduce and verify the fix before saying it works.
- Agency (granted 2026-11-14): decide and build on your own, including new files, new dependencies and data-format changes (just tell me what you chose and why). The current data is test data, so no migration is needed. Still stop and ask for: creating accounts or sign-ups (I do those; you give click-by-click steps), secrets/API keys (never in the public repo), anything that could cost money, and anything that exposes personal data publicly.

## Workflow (always)
- At the start of every session, run `git pull` first (the user works from two computers, a PC and a laptop, so GitHub is the shared source of truth). Never start editing before pulling.
- All work happens in `C:\Claude\Spending Project`. This folder is the git repo; remote is https://github.com/jacomo57/Spending-Management (public, GitHub Pages from `main`, site https://jacomo57.github.io/Spending-Management/).
- After every change: test it in a browser, then commit and push to `main`, so GitHub is always the backup. Then confirm the live site works.
- Test by actually running the app (local server + browser pane), not by reading code. Only say something works if it was checked; otherwise say exactly what was not checked.
- The repo is public: never commit personal data (real amounts, backups, statements). `.gitignore` covers backup/statement files.

## The app
- Single file: `index.html`. The spec comment at the top lists features, untested parts and ideas. Keep it updated with every change.
- Data currently lives in the browser's localStorage key `spend-v1` (test data only; a backend with accounts is planned, so this will change).
- No bank connection. Today the page contacts no other sites; that changes when the backend is added.
- The "Sort N unrecognized with Claude" button was removed (it needed the artifact environment's Claude API). Unrecognized merchants stay in Other for manual sorting.

## Backend plan (decided 2026-11-14)
Goal: two users only (me and my partner), each with a private, independent account; the same data on phone, laptop and PC, saved automatically. Not a public service: no legal or scaling work.
- Service: Firebase on the free Spark plan (no payment card): Auth with email + password, and Firestore. Chosen over Supabase (free projects pause after a week unused and need a manual restart) and a self-built Cloudflare Worker backend (own password handling, more code to maintain).
- Hosting stays on GitHub Pages. No custom domain (it costs money).
- Accounts: exactly two, created by the user in the Firebase console. The app has sign-in and password reset only, no sign-up form. Firestore rules allow a user only `users/{own uid}/...`, and only for the two allowed UIDs, so a stranger who registers through the public key gets nothing.
- Data layout: `users/{uid}/data/settings` (categories, card rules, learned merchants, recurring) and `users/{uid}/months/{YYYY-MM}` (that month's purchases). localStorage `spend-v1` stays as the offline cache; changes sync when back online; last write wins per document.
- The Firebase web config (apiKey etc.) is public by design and lives in `index.html`; the rules are the protection. Never commit passwords or service-account keys.
- Claude cannot type passwords into a hosted sign-in: the user signs in themselves in the browser pane, then Claude tests.
- Build order: 1) per-card counting rules, 2) sign-in screen, 3) load/save sync, 4) two-account and two-device test, 5) installable PWA.

## Local testing
- No node or python on this PC. Start the local server with the launch config `spend` (`.claude/launch.json` runs `.claude/serve.ps1`, a PowerShell static server on http://localhost:8765).

## Next steps
0. BIG TASK in progress: follow "Backend plan" above. Stop only at the gates in "How to work with me".
1. Installable PWA (GitHub Pages is already live).
2. Phone-friendly expenses table.
3. Monthly budgets per category, search, month-over-month comparison.
4. Later: Caspion automatic bank downloads, partner sync (builds on the backend).

# Spend, sorted: spending tracker

Personal spending tracker for one user in Israel (Hebrew + English). A joint card with their partner counts at half.

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

## Next steps
0. BIG TASK: turn the app into a multi-user service: anyone can sign up with their own account, each user's data is private and independent, and the same data shows on phone, laptop and PC (saved in the cloud, no manual export). Also: per-card counting rule (replace the single "joint card at half" toggle). No partner/shared access. Hosting is open: GitHub Pages is not required if something better fits (stop and ask before anything that costs money). Plan first, then build; stop only at the gates above.
1. Installable PWA (GitHub Pages is already live).
2. Phone-friendly expenses table.
3. Monthly budgets per category, search, month-over-month comparison.
4. Later: Caspion automatic bank downloads, partner sync (builds on the backend).

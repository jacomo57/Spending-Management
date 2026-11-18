# Spend, sorted: spending tracker

Personal spending tracker for one user in Israel (Hebrew + English). Each card has its own counting rule (full, half, a custom percentage, or not counted); a joint card with their partner is just a card set to half.

## How to work with me
- Keep answers short and clear. Keep the app uncluttered. Make targeted edits, not full rewrites.
- End every piece of work with a short summary I can read instead of the process: what changed, what was checked, what was not, and what I need to do (asked 2026-11-15).
- I have not tested everything in a browser. When I report a problem, reproduce and verify the fix before saying it works. Test by actually running the app (tests + local server + browser pane), not by reading code; say exactly what was not checked.
- Agency (granted 2026-11-14): decide and build on your own, including new files, new dependencies and data-format changes (just tell me what you chose and why). The current data is test data, so no migration is needed. Still stop and ask for: creating accounts or sign-ups (I do those; you give click-by-click steps), secrets/API keys (never in the public repo), anything that could cost money, and anything that exposes personal data publicly.

## Workflow (always)
- I work from two computers, so GitHub is the shared source of truth. At the start of every session: `git checkout dev`, `git pull`, and `npm install` if `node_modules` is missing. Never edit before pulling.
- All work happens in `C:\Claude\Spending Project` (remote https://github.com/jacomo57/Spending-Management, public). Branches (set up 2026-11-18): work and push on `dev`; `main` is what the live site shows (https://jacomo57.github.io/Spending-Management/), updated only after the checks below pass.
- After every change: `npm test` (must end `failures: 0`), check it in a browser, run `/code-review` and fix what it finds (skip only if very expensive, and say so), commit and push `dev`. Then release: `git checkout main`, `git merge --ff-only dev`, `git push`, `git checkout dev`; confirm the live site works.
- Bugs and ideas live in GitHub Issues (https://github.com/jacomo57/Spending-Management/issues); `docs/handoff.md` is the living plan and status; `docs/archive.md` is the full history.
- The repo is public: never commit personal data (real amounts, backups, statements). `.gitignore` covers backup/statement files. Real statement files stay outside the repo; test fixtures use made-up merchants.

## Handoff rules (set 2026-11-18)
- A session starts by reading only `CLAUDE.md` and `docs/handoff.md`. Read `docs/archive.md` only when a question needs the history.
- At every handoff (end of a session or part, or when the user says to hand off): (1) append what was finished to `docs/archive.md` under a dated heading (what changed, what was checked, what was not, decisions and why); (2) rewrite `docs/handoff.md` so it holds only the current status, the next parts, open items and reminders, with nothing finished left in it; (3) commit both. A handoff is not done until the archive is updated.

## The app (details in `docs/app.md`, backend in `docs/backend.md`, phone setup in `docs/phone.md`)
- Files: `index.html` (the spec comment at its top lists features, untested parts and ideas: keep it updated with every change), `style.css`, `app.js` (data, import, rendering), `cloud.js` (accounts and sync), `vendor/`, `sw.js` + `manifest.webmanifest` + `icons/` (installable app).
- `tools/stamp.mjs` runs before every `npm test` and stamps the version into `sw.js` and `index.html`: never commit an app change without running `npm test`, or installed phones keep the old files.
- Two modes: local-only (`?local=1` on localhost, data in localStorage) and cloud (Firebase accounts, Firestore). No bank connection. A Content Security Policy in `index.html` lists every address the page may contact: add new ones there.
- Numbers: `calc(rows)` and `v(t)` in `app.js` are the only definition of spent, income and paybacks; every total on screen or in a report must come from them.
- Read `docs/backend.md` before touching `cloud.js` or `firestore.rules`; after any change to the rules run `.claude/rules-test.ps1` then `npm run deploy:rules`.
- Real payslips are personal: never commit one (`*.pdf` is ignored).

## Local testing
- `npm test` (port 8770, installed Edge, starts the emulators). `ONLY=local|smoke|pwa` runs one group. Browser pane: launch config `spend` (http://localhost:8765).
- New shells may need `$env:Path` refreshed for node, java and `firebase`. No python on this PC.

## Next steps
- See `docs/handoff.md` (current plan) and the GitHub Issues.

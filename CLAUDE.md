# Spend, sorted: spending tracker

Personal spending tracker for one user in Israel (Hebrew + English). Each card has its own counting rule (full, half, a custom percentage, or not counted); a joint card with their partner is just a card set to half.

## How to work with me
- Keep answers short and clear. Keep the app uncluttered.
- Make targeted edits, not full rewrites.
- End every piece of work with a short summary I can read instead of the process: what changed, what was checked, what was not, and what I need to do (asked 2026-11-15).
- I have not tested everything in a browser. When I report a problem, reproduce and verify the fix before saying it works.
- Agency (granted 2026-11-14): decide and build on your own, including new files, new dependencies and data-format changes (just tell me what you chose and why). The current data is test data, so no migration is needed. Still stop and ask for: creating accounts or sign-ups (I do those; you give click-by-click steps), secrets/API keys (never in the public repo), anything that could cost money, and anything that exposes personal data publicly.

## Workflow (always)
- At the start of every session, run `git pull` first (the user works from two computers, a PC and a laptop, so GitHub is the shared source of truth). Never start editing before pulling. Run `npm install` if `node_modules` is missing.
- All work happens in `C:\Claude\Spending Project`. This folder is the git repo; remote is https://github.com/jacomo57/Spending-Management (public, GitHub Pages from `main`, site https://jacomo57.github.io/Spending-Management/).
- After every change: run `npm test`, check it in a browser, then commit and push to `main`, so GitHub is always the backup. Then confirm the live site works.
- Test by actually running the app (tests + local server + browser pane), not by reading code. Only say something works if it was checked; otherwise say exactly what was not checked.
- The repo is public: never commit personal data (real amounts, backups, statements). `.gitignore` covers backup/statement files. Real statement files stay outside the repo; test fixtures use made-up merchants.

## The app
- Files: `index.html` (markup; the spec comment at the top lists features, untested parts and ideas, keep it updated with every change), `style.css`, `app.js` (data, import, rendering), `cloud.js` (accounts and sync), `vendor/xlsx.full.min.js` (SheetJS 0.20.3, loaded only when an Excel file is picked). `app.js` and `cloud.js` are plain scripts sharing globals, loaded in that order.
- Installable app: `sw.js`, `manifest.webmanifest`, `icons/` (redraw with `node tools/icons.mjs`). `tools/stamp.mjs` runs before every `npm test` and writes the version into `sw.js` and the `?v=` in `index.html`; never commit an app change without running `npm test`, or installed phones keep the old files. On localhost the service worker is off unless the address has `?sw=1`. Caching rules are at the top of `sw.js`.
- Two modes, chosen in `app.js` by `FB_REAL`/`EMU`:
  - Local-only (`?local=1` on localhost (never touches Firebase), or if `FB_REAL` is set back to `null`): data in localStorage key `spend-v1`, Backup panel shown, no sign-in.
  - Cloud (localhost against the emulators; the live site against the real project): sign-in required, data in Firestore, Account panel shown (with Download my data / Restore from file), Backup hidden, localStorage unused.
- No bank connection. In local-only mode the page contacts no other sites except fonts; in cloud mode it also loads the Firebase SDK from gstatic and talks to Firebase.
- Import (tested on real Isracard and Max files, totals matched the statements): uses the charged amount column, keeps identical rows, skips only already-saved copies on re-import, refunds are negative amounts, an installment payment is dated in its own month and labelled like `3/5`.
- Backend, accounts, data layout, sync rules, emulator: see `docs/backend.md`. Read it before touching `cloud.js` or `firestore.rules`.

## Local testing
- New shells may need `$env:Path` refreshed for node, java and `firebase` (node 24, npm 11, java 21, firebase 15). No python on this PC.
- `npm test` runs `tests/run.mjs`: Playwright with the installed Edge (no browser download), its own server on port 8770 (`PORT` to change), starts the emulators if needed. Must end with `failures: 0`. `ONLY=local`, `ONLY=smoke` or `ONLY=pwa` runs one group.
- Browser pane: launch config `spend` (`.claude/serve.ps1`, http://localhost:8765 and http://127.0.0.1:8765; `PORT` env changes it). The two addresses have separate browser storage, so one acts as a "second device".
- Cloud mode in the browser pane needs the emulators (`npm run emulators`) and a seeded invite code (see `docs/backend.md`).
- After any change to `firestore.rules`: run `.claude/rules-test.ps1` (32 checks, `failures: 0`), then `npm run deploy:rules`.

## Next steps
- The plan lives in `ROADMAP.md`: review findings, then Steps 0 to 5, each with the model to use, what to do, how to test, and the user's part. One step per session. Tick steps off there as they finish.
- Order: Steps 0 and 1 (PWA) are done; next 2 (phone layout), then 3 (income, budgets, search, comparisons), then 4 (reports).

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
- After every change: run `npm test`, check it in a browser, run `/code-review` on the change and fix what it finds (asked 2026-11-16; skip it only if it would be very expensive, and say so), then commit and push to `main`, so GitHub is always the backup. Then confirm the live site works.
- Test by actually running the app (tests + local server + browser pane), not by reading code. Only say something works if it was checked; otherwise say exactly what was not checked.
- The repo is public: never commit personal data (real amounts, backups, statements). `.gitignore` covers backup/statement files. Real statement files stay outside the repo; test fixtures use made-up merchants.

## The app
- Files: `index.html` (markup; the spec comment at the top lists features, untested parts and ideas, keep it updated with every change), `style.css`, `app.js` (data, import, rendering), `cloud.js` (accounts and sync), `vendor/xlsx.full.min.js` (SheetJS 0.20.3, loaded only when an Excel file is picked), `vendor/pdf.min.mjs` and `pdf.worker.min.mjs` (pdf.js legacy build, loaded only when a PDF is picked), tesseract.js files in `vendor/` (text recognition, loaded only when a picture is picked), `vendor/firebase/` (Firebase SDK 13.3.0: app, auth, firestore; copied from `node_modules/firebase` by `node tools/firebase.mjs`, loaded in cloud mode). `app.js` and `cloud.js` are plain scripts sharing globals, loaded in that order.
- Installable app: `sw.js`, `manifest.webmanifest`, `icons/` (redraw with `node tools/icons.mjs`). `tools/stamp.mjs` runs before every `npm test` and writes the version into `sw.js` and the `?v=` in `index.html`; never commit an app change without running `npm test`, or installed phones keep the old files. On localhost the service worker is off unless the address has `?sw=1`. Caching rules are at the top of `sw.js`.
- Two modes, chosen in `app.js` by `FB_REAL`/`EMU`:
  - Local-only (`?local=1` on localhost (never touches Firebase), or if `FB_REAL` is set back to `null`): data in localStorage key `spend-v1`, Backup panel shown, no sign-in.
  - Cloud (localhost against the emulators; the live site against the real project): sign-in required, data in Firestore, Account panel shown (with Download my data / Restore from file), Backup hidden, localStorage unused.
- No bank connection. In local-only mode the page contacts no other sites except fonts; in cloud mode it also talks to Firebase (the Firebase SDK itself is served from `vendor/firebase/`). A Content Security Policy in `index.html` lists everything the page may load or contact: a new outside address must be added there or the browser blocks it (the tests fail on any blocked request).
- Import (tested on real Isracard and Max files, totals matched the statements): uses the charged amount column, keeps identical rows, skips only already-saved copies on re-import, refunds are negative amounts, a bank-style file's positive rows become income, an edited purchase is not added again on re-import (`src`), an installment payment is dated in its own month and labelled like `3/5`.
- Payslip: a PDF, a picture (text recognition in the browser, `imgItems()`) or pasted text is read only for the net pay (`נטו לתשלום`), month and issue date (`slip()` in `app.js`) and becomes one income row. Real payslips are personal: never commit one (`*.pdf` is ignored).
- Numbers: `calc(rows)` and `v(t)` in `app.js` are the only definition of spent, income and paybacks (rows with `inc:1`); budgets are `S.budget`. Every total on screen or in a report must come from them.
- Backend, accounts, data layout, sync rules, emulator: see `docs/backend.md`. Read it before touching `cloud.js` or `firestore.rules`.

## Local testing
- New shells may need `$env:Path` refreshed for node, java and `firebase` (node 24, npm 11, java 21, firebase 15). No python on this PC.
- `npm test` runs `tests/run.mjs`: Playwright with the installed Edge (no browser download), its own server on port 8770 (`PORT` to change), starts the emulators if needed. Must end with `failures: 0`. `ONLY=local`, `ONLY=smoke` or `ONLY=pwa` runs one group.
- Browser pane: launch config `spend` (`.claude/serve.ps1`, http://localhost:8765 and http://127.0.0.1:8765; `PORT` env changes it). The two addresses have separate browser storage, so one acts as a "second device".
- Cloud mode in the browser pane needs the emulators (`npm run emulators`) and a seeded invite code (see `docs/backend.md`).
- After any change to `firestore.rules`: run `.claude/rules-test.ps1` (71 checks, `failures: 0`), then `npm run deploy:rules`.

## Next steps
- The plan lives in `ROADMAP.md`. Everything in Steps 0 to 4 is done, plus split purchases, tags, category icons, the keyword merge and the security audit follow-ups. Google sign-in and Caspion were dropped by the user.
- Also done (2026-11-16): publish only the app files (Pages from GitHub Actions), month start day, pace and forecast, fixed charges, Quick add, bar view choice, the phone inbox and statement matching (`docs/backend.md`, Phone inbox).
- In progress: phone entry with MacroDroid. Next: a macro file and click-by-click guide for the quick-entry popup, then the Google Wallet notification macro (needs the exact text of one real notification from the user).
- Optional ideas left in Step 5: Partner owes, Hebrew interface, `dev` branch, GitHub Issues.

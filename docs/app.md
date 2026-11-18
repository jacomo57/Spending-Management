# The app: details

Moved out of `CLAUDE.md` on 2026-11-18 so that file stays short. Read this before changing files, modes, import or caching.

## Files
- `index.html` (markup; the spec comment at the top lists features, untested parts and ideas, keep it updated with every change), `style.css`, `app.js` (data, import, rendering), `cloud.js` (accounts and sync), `vendor/xlsx.full.min.js` (SheetJS 0.20.3, loaded only when an Excel file is picked), `vendor/pdf.min.mjs` and `pdf.worker.min.mjs` (pdf.js legacy build, loaded only when a PDF is picked), tesseract.js files in `vendor/` (text recognition, loaded only when a picture is picked), `vendor/firebase/` (Firebase SDK 13.3.0: app, auth, firestore; copied from `node_modules/firebase` by `node tools/firebase.mjs`, loaded in cloud mode). `app.js` and `cloud.js` are plain scripts sharing globals, loaded in that order.
- Installable app: `sw.js`, `manifest.webmanifest`, `icons/` (redraw with `node tools/icons.mjs`). `tools/stamp.mjs` runs before every `npm test` and writes the version into `sw.js` and the `?v=` in `index.html`; never commit an app change without running `npm test`, or installed phones keep the old files. On localhost the service worker is off unless the address has `?sw=1`. Caching rules are at the top of `sw.js`: the page itself is shown from the saved copy at once (a new version arrives as the "Update available, Reload" notice), so opening is fast on a bad line.
- Speed: `index.html` preloads the Firebase files (`modulepreload`) and preconnects to sign-in and the database. Measured 2026-11-18 with a script (4x slower CPU, 150ms delay): about 1s to the data, mostly Firebase starting. Do not draw a saved copy of the data before Firebase answers: tried, it made the total longer.
- Publishing: `.github/workflows/pages.yml` copies only the app files (not tests, docs, tools, roadmap) to GitHub Pages on every push to `main`.

## Two modes (chosen in `app.js` by `FB_REAL`/`EMU`)
- Local-only (`?local=1` on localhost, never touches Firebase, or if `FB_REAL` is set back to `null`): data in localStorage key `spend-v1`, Backup panel shown, no sign-in.
- Cloud (localhost against the emulators; the live site against the real project): sign-in required, data in Firestore, Account panel shown (with Download my data / Restore from file), Backup hidden, localStorage unused.
- No bank connection. In local-only mode the page contacts no other sites except fonts (and a preconnect hint to Google's sign-in and database hosts that opens a connection but sends nothing); in cloud mode it also talks to Firebase (the SDK is served from `vendor/firebase/`). A Content Security Policy in `index.html` lists everything the page may load or contact: a new outside address must be added there or the browser blocks it (the tests fail on any blocked request).

## Main screen and look (redesign, 2026-11-18)
- Copilot-blue theme (variables in `style.css`), Auto/Light/Dark in the More menu (`spend-theme` in localStorage, per device). The main screen: **+ Add purchase** and **More** (Import, Cards, Recurring, Budget, Report, Merchants, Account/Backup, Theme, Delete all data); a hero card with Spent, the budget bar and line, budget alerts; Categories; Expenses (latest 5, Show all). Income, left over, per-day, pace and fixed-charge lines are not on the main screen (income and left over are in the Report; the removed code is in git commit `edc2d55`).
- Categories: only the picked ones (`S.catPick`, saved and synced, Undo) or the 4 biggest of the period, in By size / My order. **All categories · Edit** opens every row (rename, round icon, drag, delete, ☆ to pick, + Add category). Round icons take the category colour.
- The currency symbol (`S.cur`) is a box at the top of the Account (Backup in local mode) panel.

## Import
Tested on real Isracard and Max files (totals matched the statements). Uses the charged amount column, keeps identical rows, skips only already-saved copies on re-import, refunds are negative amounts, a bank-style file's positive rows become income, an edited purchase is not added again on re-import (`src`), an installment payment is dated in its own month and labelled like `3/5`. Pasted prose (email text) is read by `loose()`; a line with "refund", "reversal" or "זיכוי" is a refund.

## Payslip
A PDF, a picture (text recognition in the browser, `imgItems()`) or pasted text is read only for the net pay (`נטו לתשלום`), month and issue date (`slip()` in `app.js`) and becomes one income row. Real payslips are personal: never commit one (`*.pdf` is ignored).

## Numbers
`calc(rows)` and `v(t)` in `app.js` are the only definition of spent, income and paybacks (rows with `inc:1`); budgets are `S.budget`. Every total on screen or in a report must come from them. The budget alert line (`#budalert`) lists categories at 80%+ and over 100% of their budget, from `calc().by`.

## Local testing
- New shells may need `$env:Path` refreshed for node, java and `firebase` (node 24, npm 11, java 21, firebase 15). No python on this PC.
- `npm test` runs `tests/run.mjs`: Playwright with the installed Edge (no browser download), its own server on port 8770 (`PORT` to change), starts the emulators if needed. Must end with `failures: 0`. `ONLY=local`, `ONLY=smoke` or `ONLY=pwa` runs one group.
- Browser pane: launch config `spend` (`.claude/serve.ps1`, http://localhost:8765 and http://127.0.0.1:8765; `PORT` env changes it). The two addresses have separate browser storage, so one acts as a "second device".
- Cloud mode in the browser pane needs the emulators (`npm run emulators`) and a seeded invite code (see `docs/backend.md`).
- After any change to `firestore.rules`: run `.claude/rules-test.ps1` (71 checks, `failures: 0`), then `npm run deploy:rules`.
- Checking by script: a Playwright script run from the scratchpad can fake the date (`page.clock.install`), print a report to PDF (`page.pdf`) and read the PDF's text with `vendor/pdf.min.mjs`; this is how printing and the 160-row month were checked.

# Archive

History of what was built, decided and checked (moved here from ROADMAP.md on 2026-11-18). **Not read at session start.** Every handoff appends to it, so it stays complete: see "Handoff rules" in CLAUDE.md. The living plan is `docs/handoff.md`.

(The old text below says "read CLAUDE.md and ROADMAP.md" and "one step = one session": that was the workflow until 2026-11-18. Now a session reads CLAUDE.md and `docs/handoff.md` only.)

Written 2026-11-15 after a review of everything built so far. One step = one new Claude session.
To start a step, open a fresh session and say: **"Pull, read CLAUDE.md and ROADMAP.md, then do Step N."**
When a step is finished, tick it here and note anything left untested.

## How to run the work

- **One step per session.** This file and CLAUDE.md carry the context, so a new session costs far less than one very long chat.
- **Which model.** Use the strongest model (Fable) where a mistake is costly and hard to see: saved data, sync, security rules, caching. Use Sonnet where the result is visible on screen and easy to check: layout, styling, simple features. Haiku only for one-line edits.
- **Several agents at once.** Only Steps 1 and 2 can run side by side, and only after Step 0 has split the code into files. Each needs its own worktree and its own local port. Everything else touches the same code and data format, so it runs in order.
- **Second opinion.** After each step, run `/code-review` on the change before pushing. It is cheap and catches what the builder missed.
- **Order.** 0, then 1 and 2 (together or either order), then 3, then 4. Step 4 uses the budgets and comparisons from Step 3.

## Review findings (2026-11-15)

Working well: per-card rules, accounts, per-account privacy (32 rule checks), live two-device sync, local emulator for testing, sign-ups gated by invite code.

Problems found, most important first. All are fixed in Step 0 unless marked otherwise.

1. **Identical purchases are dropped on import.** `add()` treats same date + description + amount + card as a duplicate, even inside one file. Two identical coffees on the same day count once, so totals come out too low.
2. **The importer has never been tried on a real statement file.** Header detection is guesswork for Israeli issuers: the description pattern has `בית עסק` but files say `בית העסק`, and when a file has both "transaction amount" and "charged amount" columns the first one wins, which may be the foreign-currency figure. Needs real files from the user's cards (kept out of the repo).
3. **There is no backup of account data.** The Backup button is hidden when signed in, and the free Firebase plan keeps no history. A sync bug or an accidental "Delete all data" after the 8-second undo is permanent. Bring back a "Download my data" file and a restore.
4. **No automated tests of the app itself.** Every change is re-checked by hand in the browser, which is slow and misses regressions. Node is installed now, so a small Playwright suite against the emulator can cover sign-up, import, totals, sync and delete.
5. **Refunds and credits are ignored on import** (negative rows are thrown away), so a returned purchase still counts in full. (Refunds fixed in Step 0; income is Step 3.)
6. **Security rules are published by pasting into the console.** The repo and the live rules can drift apart. Use `firebase deploy --only firestore:rules` (the user runs `firebase login` once).
7. **The web API key is unrestricted.** Not a secret, but it should be limited to the site's addresses in Google Cloud console (user step, 2 minutes).
8. **Excel library is an old version** (SheetJS 0.18.5 from cdnjs, with known security advisories for malicious files). Low risk since only the user's own bank files are opened, but the maintained build should be used.
9. **Hebrew text sits in left-to-right fields.** Description inputs need `dir="auto"`. (Step 2.)
10. **Phone layout:** the expenses table is fixed at 860px wide and there are no small-screen styles at all. (Step 2.)
11. **One 541-line file with very long lines.** It still works, but every session must load all of it, and two agents cannot edit it at once. Split into `style.css`, `app.js`, `cloud.js` before adding more.
12. **Same month edited on two devices while one is offline:** the later save replaces the earlier one for that whole month. Acceptable for one person per account; documented, not fixed.
13. Small: "+ Add purchase" leaves a 0-amount row if abandoned; unused `recSeeded` field; no `.gitattributes` (line-ending warnings on every commit); CLAUDE.md is long, move backend detail to `docs/backend.md`.

Still untested from earlier work: offline use, password-reset email, category drag, undo, delete-then-recreate an account, deleting an account while another device is signed in.

---

## Step 0: Safety net and fixes

- [x] Done 2026-11-15. The user restricted the API key the same day.
- **Result:** `npm test` runs 14 browser tests (import cases in local mode; sign-up, sync, privacy, delete, download/restore on the emulator). Code split into `index.html`, `style.css`, `app.js`, `cloud.js`. Both real statements (Isracard, Max with two sheets) import with totals equal to the statement. Also done beyond the list: installments dated in their own month and labelled `3/5`, Max's category column used for unknown merchants, card name suggested from the file, picking the same file twice now works.
- **Not checked:** a real statement that contains a refund (none in the two files; negative charged amount is assumed), old `.xls` files, the Account panel's new buttons by eye (covered by a test only).
- **Model:** Fable. It changes how purchases are stored and moves all the code.
- **Why first:** every later step is safer and cheaper once tests exist and the files are split.
- **Do, in this order:**
  1. Playwright smoke tests against the emulator (`tests/`, run with one command): sign up with invite, import sample, totals match, second browser context sees the same data, second account sees none, delete all + reload, delete account. Keep the 32 rule checks.
  2. Split `index.html` into `index.html` + `style.css` + `app.js` + `cloud.js` with no behaviour change. Tests must pass before and after.
  3. Fix import duplicates: keep repeats inside one file; when re-importing, skip only as many copies as are already saved.
  4. Import refunds as negative amounts that reduce totals (ask the user first if their statements show refunds differently).
  5. "Download my data" (one JSON file) and "Restore from file" in the Account panel.
  6. Switch to the maintained SheetJS build; add `.gitattributes`; remove dead fields; move backend detail from CLAUDE.md to `docs/backend.md`.
  7. Make the local server port configurable so two sessions can test at once.
- **User's part (all done):** restricted the API key (Google Cloud console, Credentials, the browser key, HTTP referrers). Also done: `firebase login` and `npm run deploy:rules` (worked 2026-11-15 on the PC; in PowerShell use `npm.cmd` if scripts are blocked); send 1 to 3 real statement files (they stay local, never committed) so the importer can be tested and fixed on them; run `firebase login` once; restrict the API key (Google Cloud console, Credentials, the browser key, HTTP referrers: `jacomo57.github.io/*` and `localhost`).
- **Done when:** tests pass with one command, real statements import with correct totals, the live site works, and rules deploy from the command line.

## Step 1: Installable app (PWA)

- [x] Done 2026-11-15. The user installed it and reported that it looks good.
- **Result:** `manifest.webmanifest`, icons, `sw.js`, an "Update available, Reload" notice, 4 new tests (18 in all). Chosen beyond the list, and why: a version stamp (`tools/stamp.mjs`, runs by itself before `npm test`) names the CSS and JS files per version, so a new page never runs with old code; the saved files are also refreshed in the background, so a forgotten stamp fixes itself on the second load; the page falls back to the saved copy after 4 seconds on a bad connection; on localhost the service worker is off unless the address has `?sw=1`, so edits always show while developing.
- **Not checked:** installing on a real phone or from Chrome's install button (the tests check the files a browser needs for it), the 4-second fallback, iPhone behaviour.
- **Model:** Fable for the service worker (a caching mistake leaves phones stuck on an old version); the manifest and icons are simple.
- **Can run alongside Step 2** in a separate worktree.
- **Do:** `manifest.webmanifest`, icons (192, 512, maskable, Apple touch), theme colours for light and dark, `sw.js`.
- **Rules for the service worker:** `index.html` is shown from the saved copy at once (changed 2026-11-18 for speed; a new deploy shows as the Reload notice); cache-first with a version name for CSS, JS, fonts and the Firebase SDK; never cache Firebase API calls; a small "Update available, reload" notice when a new version is waiting; all paths relative to `/Spending-Management/`.
- **Test:** install from Chrome on the PC; open with the network off and see cached data; edit offline, reconnect, confirm it syncs; deploy a change and confirm the installed app picks it up. This also closes the old "offline use untested" gap.
- **User's part:** install on their phone (Android: Chrome menu, Add to Home screen. iPhone: Safari, Share, Add to Home Screen) and report how it looks.
- **Done when:** installed on PC and phone, opens offline, updates itself after a deploy.

## Step 2: Phone-friendly layout

- [x] Done 2026-11-16. Checked in the browser pane at 375px and 768px, light and dark, Hebrew and long text; not yet on a real phone.
- **Model:** Sonnet. Visible work, easy to verify in the browser at phone width.
- **Can run alongside Step 1** in a separate worktree.
- **Do:** under about 640px turn each expense row into a compact card (description and amount on top, date, category and card below, tap to edit); tools row that wraps or scrolls; category rows that fit; touch targets at least 44px; inputs at 16px so iPhones do not zoom; `dir="auto"` on description and merchant fields; safe-area padding; sign-in and Account panels at full width.
- **Test:** browser pane at 375px and 768px, light and dark, with Hebrew and long descriptions; no sideways scrolling anywhere.
- **Done when:** every screen is usable one-handed at 375px and the desktop layout is unchanged.

## Who does what in Steps 3 to 5 (decided 2026-11-16)

The rule: Fable for anything that changes what is saved, how it syncs, how the numbers are defined, sign-in or caching. Sonnet for anything whose result is visible on screen and reads the data without changing its shape.

| Part | Model | State |
|---|---|---|
| 3.0 Income and paybacks | Fable | Done 2026-11-16 |
| 3.2 Budgets | Fable | Done 2026-11-16 |
| 5: re-import after editing a purchase | Fable | Done 2026-11-16 |
| 3.1 Search | Sonnet | Done 2026-11-16 |
| 3.3 Month over month | Sonnet | Done 2026-11-16 |
| 3 extras: learned merchants list, yearly view, notes | Sonnet | Done 2026-11-16 |
| 3 extra: note per purchase | Sonnet, with the recipe below | Done (the note box; `#tags` build on it) |
| 4 Reports (all three) and Export to Excel | Sonnet | Done (Report panel, Export to Excel) |
| 5: budget alerts, "Partner owes" view, Hebrew interface | Sonnet | Later |
| 5: split a purchase across categories, tags | Fable (changes `calc()` and the saved rows) | Done 2026-11-16 (`t.split`, `parts()`; tags are #words in the note) |
| 5: sign in with Google or a passkey | Fable, plus console steps by the user | Dropped by the user 2026-11-16 |
| 5: Caspion bank downloads | Fable, needs an always-on machine | Dropped by the user 2026-11-16 |
| 5: month start day, pace and forecast, fixed charges and what is still to come | Fable (new `S.mstart`, `fixedSet()`) | Done 2026-11-16 (price-change flags left out on purpose) |
| 5: Quick add (removed 2026-11-18, the MacroDroid macros replace it); bars by amount or budget; phone inbox (add without opening the app) and matching with the statement | Fable (rules, `cloud.js`, import) | Done 2026-11-16; MacroDroid macros still to do |
| 5: icons for the categories, with a picker | Fable (new saved map `S.icon`) | Done 2026-11-16 |
| 5: `dev` branch, GitHub Issues, short CLAUDE.md | Any model; the user decides | Later |

## Step 3: Income, budgets, search, comparisons

- [x] 3.0 Income and paybacks (Fable, 2026-11-16)
- [x] 3.2 Budgets (Fable, 2026-11-16)
- [x] 3.1 Search (Sonnet, 2026-11-16): box in the filter row, every word must match description, category, card or amount; "N found, ₪X" line; 1 new test (28 in all). Checked at desktop and 375px; not checked in dark mode or on a real phone.
- [x] Step 4 Reports, part (Sonnet, 2026-11-16): Report button with a monthly/yearly/all-time report (totals, vs budget and last month, income, categories, cards, top 10 merchants, 5 largest, recurring bills, full list; options list on/off and ignored on/off), Print / Save as PDF through the browser, Export to Excel (counted amount is 0 for ignored rows); 1 new test (31 in all). Also built (2026-11-16): Selected expenses (what the filters and search show) and Trend (last 6 or 12 months) report types; 2 tests more (32 in all). Code review fixed dark-mode printing; two small edge cases left (export after the chosen month vanishes; entry count includes income). Checked on screen at desktop and 375px; NOT checked: the real print preview or Save as PDF (A4 page breaks, repeated header), a 150+ row month, dark mode.
- [x] Extras (Sonnet, 2026-11-16): Merchants panel, "All of YEAR" in the month picker (budgets hidden), a note per purchase (`t.note`, searchable); 1 new test (30 in all). Checked at desktop and 375px in light mode; not checked in dark mode, with a long note, or on a real phone.
- [x] 3.3 Month over month (Sonnet, 2026-11-16): Compare button in the Categories header, two month pickers, per-category change (neutral arrows), total and In rows, 12-month trend strip (tap picks the month); 1 new test (29 in all). Checked at desktop and 375px in dark mode; not checked in light mode at 375px or on a real phone.

**What was built (3.0, 3.2 and the re-import fix):**
- An income row is a normal row with `inc:1` and a positive amount, in the same month documents. No category = plain income (counts toward "In"). With a category = a payback: it lowers that category and "Spent" in full and is not part of "In". Card rules never apply to income.
- "+ Add income" next to "+ Add purchase"; Recurring has a Bill / Income choice; a bank-style file now keeps its positive rows as income.
- The summary shows Spent, and In and Left over when the view has income.
- Budget panel: one budget for all spending and one per category (`S.budget = {total, cats}`), saved with the settings. With one month picked and no card filter: "X left of Y" under Spent, a pace note in the current month, and each budgeted category's bar fills against its budget (amber from 80%, red when over). Budgets follow a renamed category and come back with Undo after deleting one.
- An edited purchase remembers how it looked when imported (`src`), so importing the same file again no longer adds it back.
- `calc(rows)` in `app.js` is the single definition of the numbers.
- Payslip (asked 2026-11-16): a payslip PDF or its pasted text is read for the net pay ("נטו לתשלום") only, and added as one income row "Salary MM/YYYY" after the user checks the date. A picture of the slip (JPEG, PNG, screenshot) is read by text recognition inside the browser; the user's real payslip screenshot was read correctly. Not checked: a real payslip PDF (only one the test makes), a phone photo of a paper slip. A password-locked PDF only gets a message.
- **Tests:** 9 new ones (27 in all), including income and a budget reaching a second device and surviving sign-out.
- **Not checked:** a real bank export (only a made-up one; note that a bank file also lists the monthly card bill, which would count twice next to the card's own statement, so tick Ignore on those rows), a real phone, the pace note on other days of the month (checked on one day only).
- **Known rough edge:** a category whose own colour is red or amber can look like a budget warning. The red amount text is the real over-budget sign.

## Gameplan for Sonnet (Steps 3.1, 3.3, extras, Step 4)

Start each session with: **"Pull, read CLAUDE.md and ROADMAP.md, then do part N of the Sonnet gameplan."** One part per session, one commit per part.

**Rules for every part**
1. All numbers come from `calc(rows)` (returns `{spent, inc, back, by, per}`, skips ignored rows) and `v(t)` (what one row adds to Spent). Never add amounts up any other way, and never use `t.amt` directly for a total: income rows and card rules would be wrong.
2. Do not change: `cloud.js`, `firestore.rules`, `sw.js`, `tools/stamp.mjs`, and in `app.js` the functions `v`, `calc`, `bud`, `rid`, `add`, `parse`, `table`, `clean`, `recGen`, `save`, `slip`, `pdfItems`, `imgItems`. If a part seems to need that, stop and leave it for a Fable session.
3. Do not save anything new in `S` except where a part below says so. What the user is looking at (search text, chosen months, report options) lives in plain variables like `cardF` and `cat`, and is forgotten on reload.
4. Everything that reaches the page as HTML goes through `esc()`. Text fields get `dir="auto"`.
5. Each part adds at least one test to `tests/run.mjs` (the `local()` group, opened with `?local=1`; helpers `paste`, `total`, `text`, `setField`, `rows`, `eq`). Use dates built from `today` when the test picks a month.
6. Finish as CLAUDE.md says: `npm test` with `failures: 0`, `/code-review` on the change, browser pane at desktop width and at 375px in light and dark, update the spec comment in `index.html`, tick the part here, commit, push, check the live site.
7. Keep it uncluttered: nothing new on screen until the user asks for it (a button or a panel), and no new text longer than one line.

**Part 1: Search (3.1)**
- One box in the filter row (`.flt` in `index.html`), after the card filter: `<input id="q" type="search" dir="auto" placeholder="Search">`.
- A variable `q`. In `render()` the list is built from `base` (month and card filters) and then the category filter; add the search there: every word typed must appear in the row's description, category, card or amount (lower-cased; amount as typed, so "45" finds 45 and 450.9).
- Listen on `input` (not `change`) and re-render. `render()` already puts the focus back for known fields: add `q` to `fsel()` so typing is not interrupted, and keep the cursor at the end.
- When `q` is not empty show one line above the table: "N found, ₪X" where X is `calc(found).spent`. The summary and category bars keep showing the month, not the search.
- Test: import four rows, type a word, check the row count and the found line; clear it and all rows return.

**Part 2: Month over month (3.3)**
- A "Compare" button in the Categories header opens a section under the bars (a variable, not saved). Two month pickers: default the month picked above (or the newest) against the one before it.
- For each category: both amounts from `calc(rows of month).by`, and the change in money and in percent. Sort by biggest change. A last row for the total (`.spent`), and one for In when either month has income.
- Trend strip: total `spent` for the last 12 months that have data, as simple bars made the same way as the category bars (no chart library). Tapping a bar picks that month.
- A rise in spending is not an error: use the neutral text colour with an arrow, not red.
- Test: rows in two months, open Compare, check one category's two amounts and its change.

**Part 3: Extras**
- Learned merchants: a panel listing `S.rules` (merchant key and its category) with a category picker and a delete button per line. Changing one updates `S.rules[key]` and every purchase where `key(t.desc)` matches and `!t.inc`, exactly as the category picker in the table does today. This writes only fields that already exist, so it is allowed.
- Yearly view: an "All of 2026" entry per year in the month picker (value like `2026`); the existing `t.date.startsWith(m)` filter then works as it is. Budgets stay hidden for a year (they are monthly): check that `bOn` is false for it.
- Note per purchase (the one new saved field, already agreed): `t.note`, a string. Add `if(t.note!=null)t.note=String(t.note).slice(0,500)` to `clean()` next to the `src` line (the single allowed edit there), an input in the row with `data-tid` and `data-f="note"`, and let the existing change handler save it. In that handler the line that sets `x.src` must not run for notes: change its test to `f!="card"&&f!="note"`. Include notes in search.

**Part 4: Reports (Step 4)**
- Follow the spec in Step 4 below. A "Report" button opens a report view built from the current data; printing uses `@media print` in `style.css` (hide the nav, panels, filters and buttons; A4 margins; `thead{display:table-header-group}` so the header repeats; `tr{break-inside:avoid}`). No PDF library.
- The report is plain text and tables (no inputs), so Hebrew prints correctly: give description cells `dir="auto"`.
- Monthly report numbers: `calc()` for the month and for the month before; budget from `S.budget`; top merchants grouped by `key(t.desc)` and summed with `v(t)`; largest purchases sorted by `v(t)`, income rows left out; income listed in its own short table.
- Export to Excel: load the library with the existing `loadXlsx()`, then `XLSX.utils.json_to_sheet` and `XLSX.writeFile`. Columns: date, description, category, card, amount, counted amount (`v(t)`), type (purchase, refund, income, payback), ignored.
- The service worker saves the files listed in `sw.js`; a new file (for example a separate report script) would have to be added there, which rule 2 forbids. Keep the report code inside `app.js` and `style.css`.
- Test: open the report for a month and check the total, one category line and the row count; check the Excel export produces a download.

**When to stop and hand back to Fable:** a saved field other than `t.note` is needed; totals in a test disagree with `calc()`; anything about sign-in, sync, offline or "Update available" misbehaves; a change is needed in a file or function from rule 2.

## Step 4: Reports

- [ ] Done
- **Model:** Sonnet with this spec and Part 4 of the gameplan above; Fable if the look of the report matters a lot.
- **Approach:** a print-ready report page inside the app plus the browser's own "Save as PDF" (and Share on phones). No PDF library: they handle Hebrew and right-to-left text badly, and print styles do it correctly for free. Add "Export to Excel" for the raw rows using the Excel library already loaded.
- **Report types:**
  1. **Monthly report:** total, against budget, against last month; income and left over; spending by category (bars and table); by card with its counting rule; top 10 merchants; 5 largest purchases; recurring bills; then the full list of expenses.
  2. **Selected expenses:** whatever the current filters and search show, with totals. Good for one card, one category or a date range.
  3. **Trend report:** last 6 or 12 months, total per month and per category, biggest changes.
- **Options on the report screen:** month or range, include or hide the full expense list, include ignored purchases or not.
- **Test:** print preview at A4, Hebrew descriptions, a month with 150+ rows (page breaks, repeated table header), phone share sheet.
- **Done when:** a monthly report saves as a clean PDF on PC and phone.

## Step 5: Ideas for later

App (model for each is in the table above):
- [x] Re-importing after editing a purchase's description or amount added it again. Fixed 2026-11-16.
- [x] Budget alerts (2026-11-18): a line under the budget line lists categories at 80%+ and over 100%.
- "Partner owes" view for a joint card: what each side paid against their share.
- Hebrew interface option.

Workload:
- [x] CLAUDE.md shortened 2026-11-18; details live in `docs/app.md`, `docs/backend.md`, `docs/phone.md`.
- [x] Bugs and ideas are GitHub Issues (set up 2026-11-18).
- [x] `dev` branch (2026-11-18): work and push on `dev`, fast-forward `main` after tests and review pass.
- Ask for a short status once per step rather than checking in mid-task.

## Next: cosmetic and flow redesign (agreed 2026-11-18, nothing built yet)

Goal: no new features. The app is opened rarely, mostly on the phone, for a quick look; the PC is for development and a monthly look on a big screen. Hebrew interface and "Partner owes" stay parked (Hebrew: keep it possible, so use start/end instead of left/right in new CSS). Baseline checked 2026-11-18: 49 tests pass, dark mode at 375px and a 165-row report fine; real print preview and real phone not checked.

- **Wait for inspiration first.** Claude collects example screenshots (web, Reddit); the user picks a look before any design change. Every change stays revertable: small commits on `dev`, one screen per step, each with `npm test`, `/code-review` and a live-site check.
- **Main screen at a glance:** spent this month, budget left and pace, then the top 4 categories. The user can choose which categories show or their order, because rent is always the biggest and not interesting (a new saved setting: ask Fable-level care, it changes saved data).
- **One "More" menu** replaces the button row, ordered by use: Import, Cards, Recurring, Budget, Report, Merchants, Account. Only "+ Add purchase" stays visible.
- **Expenses list** shows the latest 5 with "Show all".
- **Look decided 2026-11-18: "Copilot blue"** (palette in `docs/redesign-handoff.md`).
- **Light/dark switch: Auto (follows the phone or PC setting, default) / Light / Dark**, saved per device (localStorage, not in `S`), applied before first paint.
- **Three sessions, in order** (full detail in `docs/redesign-handoff.md`):
  - [x] 1. Sonnet: theme, Auto/Light/Dark switch, hero card, "More" menu, latest-5 list. Visual only. Done 2026-11-18, 50 tests. Checked in the browser pane at 375px (light, dark) and desktop. Not checked: a real phone, the real live site (see commit), Light/Dark chosen against the device setting may flash for a moment on load (theme is set from app.js, not the head, to keep sw.js untouched), the manifest colour stays fixed. Categories were left as they are (part 2).
  - [ ] 2. Opus: choose which categories show and their order (new saved setting, so sync, Undo, tests, rules check).
  - [ ] 3. Sonnet: phone and dark-mode polish of every panel, report in the new look, docs and spec comment.

## Audit follow-ups (done 2026-11-16, Fable)

Done, one commit each: recurring bills use the local date (test at 00:30 Israel time); old `kind`/`S.half`/`recSeeded` migrations removed; one `uid()` helper; prototype-safe maps (`bare()`, `fixMaps()`, `own()` in `app.js`; a merchant, card or category may be called `constructor`); Firestore rules allow only `data/settings` and `months/{YYYY-MM or none}` as `{v:1,json}` under 900,000 characters (45 rule checks, deployed); Firebase SDK served from `vendor/firebase/` and a Content Security Policy in `index.html`.

Still open, needs the user (this one step):

1. **Publish only the app.** Workflow written 2026-11-16 (`.github/workflows/pages.yml`: copies `index.html`, `style.css`, `app.js`, `cloud.js`, `sw.js`, `manifest.webmanifest`, `icons/`, `vendor/` to the Pages artifact, so `tests/`, `.claude/`, `docs/`, `ROADMAP.md` and `CLAUDE.md` are no longer served). It only takes effect once the user switches Settings, Pages, Source to "GitHub Actions"; after that confirm the live site and that `/ROADMAP.md` is gone (404).
2. Done 2026-11-16: the keyword lists of "Bills & home" and "House stuff" are now extra keyword groups of "Rent & payments" and "Shopping" in `CATS` (kept in their old place in the order, so `guess()` gives the same answers: 97,360 old-against-new checks, no differences); `NODEF` and `FB` are gone.

The user confirmed on 2026-11-16 that the live site signs in and saves under the policy.

## 2026-11-18: redesign part 1 (Sonnet), recurring button, handoff files

- Redesign part 1 done: Copilot-blue palette (light and dark), Auto/Light/Dark switch in the More menu (localStorage `spend-theme`, per device), summary card with a progress bar toward the budget (green, amber from 80%, red when over), one More menu (Import, Cards, Recurring, Budget, Report, Merchants, Account, Theme, Delete all data) with only + Add purchase visible, expenses list shows the latest 5 with Show all. 50 tests. Checked at 375px light and dark and at desktop. Not checked: a real phone; a brief flash on load if Light/Dark is chosen against the device setting (theme is applied from app.js, not the head, to keep sw.js untouched); an edited row can drop out of the latest 5 if its date or amount moves it.
- Review found 5 points: fixed the list staying expanded after adding a purchase, a redundant CSS rule and the manifest colours; skipped the other two (above).
- ROADMAP.md was split: history is this file, the plan is `docs/handoff.md` (renamed from redesign-handoff.md). Session start now reads CLAUDE.md and the handoff only.
- Recurring (same day): the add form is now behind a "+ Add recurring" button (Cancel and Add close it). Looked into "no recurring bills in November with day 1": adding a bill in November creates its 1 November row at once (checked in the browser), so the gap is not creation. The only hole found: bills were generated only when the app loads, so an app left open across the 1st missed the new month. Fixed: bills are also generated when the app returns to the front on a later day. Could not see the user's real data, so the exact cause there is unconfirmed (other possibilities: a month start day other than 1 in the Budget panel, or a generated row that was deleted, which is never re-added). 51 tests (1 new).

## 2026-11-18: redesign part 2 (Opus), main-screen categories

- The main screen now lists only a few categories: the 4 biggest of the period by default, or the ones the user picked (`S.catPick`, an array of names in the settings document, so it syncs to other devices with no rules change; `clean()` drops a bad value from a restore file). They follow the existing order buttons (By size / My order, drag in the edit view). "Other" can be picked too.
- "All categories (N) · Edit" opens every row with the old editing controls (rename, icon, drag, delete) plus a ☆ per row to show or hide it on the main screen; "+ Add category" and "Back to the 4 biggest" show only there. The first ☆ tap starts the pick from the current top 4. Every ☆ tap and the reset can be undone. A rename keeps the pick; a deleted category simply stops showing (its name stays in the pick, so Undo restores everything).
- Decisions: a pick is explicit (hiding rent leaves 3 until another is starred, so the list never changes by itself); editing moved out of the main screen to keep the quick look clean; `calc()`/`v()` untouched.
- Checked: 52 tests (1 new; 4 older tests now open the edit view first), browser at desktop and 375px. Not checked: sync of the pick between two real devices (it rides in the settings JSON like `catSort`), dark mode of the new rows (they use the theme variables), a real phone.
- Code review (low): no findings.

## 2026-11-18: main screen trimmed (user request, before part 3)

- Removed from the main screen: "X a day left", "by the end of the month at this pace", "Ahead of pace", "Fixed X · everything else Y", "fixed charges still to come", In and Left over, the currency box, and the help paragraph under Expenses. Dead code removed with them (`fixedSet`, `toCome`, `fkey`, `mnum`, `.soon`, `.set`); it stays in git history at commit edc2d55.
- Moved: the currency symbol box is now at the top of the Account (Backup in local mode) panel. Income and left over stay in the Report (already there).
- Tests: 52, `failures: 0`; the old fixed/pace test now checks those lines are gone, and income checks read the Report. Open design questions (main screen content, multi-currency, How-to page, report with income) are written in `docs/handoff.md`.

## 2026-11-18: redesign part 3 (Sonnet), polish

- Hero card: the budget bar now fills the card width. Categories: the header buttons are compact and stay on one line on a phone; category icons are round and tinted in the category colour (main list and Edit view). Expenses: the filter row and the sort chips wrap instead of scrolling sideways. Report: text cells keep the page direction (Hebrew wrapped in `<bdi>`), so they line up with their headers.
- Checked in the browser at 375px and desktop, light and dark: main screen, Budget and Recurring panels, Edit view, report. 52 tests, `failures: 0`; code review (low) no findings. Not checked: a real phone, real print/PDF, the other panels at phone size (listed in the handoff).
- `docs/app.md` and the spec comment in `index.html` updated for the new main screen.

## 2026-11-19: Budget panel text removed

- The two help texts in the Budget panel were removed at the user's request (less writing); their wording is kept in `docs/handoff.md` for the planned How-to page. 52 tests, `failures: 0`.

## 2026-11-19: multi-currency (the user travels soon)

- Account has a Home currency (everything is shown in it) and "Buying in" (the currency new purchases are entered in). Every stored amount `t.amt` stays in the home currency, so `calc()`/`v()` and every total are unchanged; a foreign row also carries `t.fx={c,a,r,m?}` (currency, original amount, rate; `m` = rate typed by hand or home amount edited, so a date change does not replace it).
- Rates come from frankfurter.dev (European Central Bank, free, no key), looked up for the purchase date and cached per device (`localStorage` `spend-fx`, not synced). Rows saved without a rate (offline, a changed date, a statement in another currency) are filled when the app opens or comes back to the front (`fillRates`).
- Statements can be imported in another currency (box in the Import panel). Changing the home currency offers to convert everything at today's rate (undoable). Phone quick-add uses Buying in; notifications naming euro etc. are saved in that currency.
- The foreign row shows on one line: "Paid [amount] [currency] rate [x]", rate to 2 decimals, full width on phones; the "Counted as" line was dropped.
- Why: one shekel total is what matters to the user; keeping `amt` in the home currency avoided touching every calculation.
- Not checked: a real phone, real euro statements and notifications.

## 2026-11-19: income in the report, Add expense button, How to page, budget sum

- "+ Add expense" sits above the list. Income is a choice in the category box ("Income"). The monthly report always shows Spent, Income and Left over.
- How to: a page in More with topic buttons (Expenses, Income, Categories, Cards, Budget, Recurring, Import, Currencies, Report, Merchants, Account and phone), one topic at a time, each explanation a bold title and a short line (text in `index.html`, `#p-how`). Keep it updated when a feature changes. Work and the new phone controls are not in it yet.
- Budget panel: a line adds up the category budgets and says what is left of the total budget (or how much they go over it).

## 2026-11-19: main screen (brainstorm, ideas 1 and 5 chosen)

- The user picked two of eight ideas: what is left of the budget (always, when a budget is set) and a trip strip. The others (vs last month, money in and out, biggest this month, waiting to confirm, recurring coming up, streak/alert) were declined for now.
- First build made "left of budget" the headline; after seeing it on the phone the user asked to swap. Final: spent is the big number, then the bar, then one small line "₪ X left of ₪ Y" (red "₪ X over the ₪ Y budget" when past it, `#budline`).
- Trip strip (`#trip`): shows only when Buying in is not the home currency: "✈ Buying in EUR · € 50 spent · ₪ 200". It counts only rows whose `fx.c` is the buying currency, so purchases entered before switching are in the total but not the strip.
- 56 tests, `failures: 0`; checked at 375px.

## 2026-11-19: Work page (brainstormed with /grilling, then built)

- Decisions with the user: one hourly rate; a separate work log; nothing goes into income on its own; its own button next to More; the timer keeps running when the app is closed (it stores the start time); edit, add and delete sessions; sync like the rest.
- Pay follows the usual Israeli rules (the user first guessed 120%, then asked for the legal rates): first 8 hours 100%, next 2 hours 125%, then 150%; hours inside the Shabbat window (Friday 18:00 to Saturday 19:00, editable) or in a session ticked Holiday 150%, their overtime 175% then 200%. A work day is all sessions that START on one date, counted together from clock-in, with no midnight split (the user: "it was still a 10-hour work day"). The clock only decides each hour's rate. All numbers are editable under "Rate and rules"; each session keeps the settings it started with (`c`), so later changes never alter old sessions.
- Holidays are a per-session checkbox (no built-in list: dates move every year). Weekly 42-hour limit and unpaid breaks are left out on purpose.
- Data: `S.work = {rate,lim,o1,o2,r,ro1,ro2,sf,st, log:[{id,s,e,hol,c,inc}]}` inside the settings document, so it syncs with no new Firestore collection and no rules change (decided instead of the planned new collection). Pay is `workDay()` / `workCalc()` in `app.js`.
- "Add to income" per session or "Add all to income" makes one income row with id `work-<session id>` (so two devices never add it twice) and marks the session.
- Page: big HH:MM:SS timer (first drawn inside a ring with a stopwatch button on top; the user asked to remove both), Start/Stop, earned so far, Holiday tick while running, this month's hours and amount and what is not in income yet, the session list. A strip on the main screen shows the running time and amount and opens the page.
- Test: pay for a 10h and 12h weekday, Friday 16:00 to Saturday 02:00 (1450 at rate 100), a holiday session, two sessions on one day, an ordinary day; the timer ticks; the saved rate stays; add to income only once. 57 tests, `failures: 0`.
- Not handled: editing a session after it was added to income leaves the income row as it was; the rate is not converted if the home currency changes. Not checked on a real phone.
- One publish run failed on GitHub's side ("No artifacts named github-pages"); a re-run of the same run succeeded. Nothing in the code was wrong.

## 2026-11-19: motion and polish (11 ideas shown as live mockups, all chosen)

- The ideas were shown as a page of live demos in the app's own colours (a private claude.ai artifact); the user approved all of them and asked that tapping never shows the blue outline.
- No blue tap flash (`-webkit-tap-highlight-color`) and no focus ring on tap; a keyboard still gets the ring on buttons, a box being typed in gets a grey border.
- Animations: the big number counts to its new value and bars grow from where they were (from zero the first time) (`motion()` in `app.js`, run at the end of `render()`); a new purchase glows in (only when 1 to 3 rows are new, so a month change does not flash everything); a deleted one slides away (`delTx()`, used by ✕ and swipe); panels, the More menu and the Undo message ease in, the message slides away (`slideAway()`); buttons press in; "Saved" gets a tick (`#sync.ok`); the timer's colons blink and the strip has a breathing dot; loading shows shimmering shapes (`BOOT`, `bootLoading()` used by `cloud.js`); category icons are rounded colour tiles.
- Phone (640px and under): a bottom bar with Home, Report, Work and More (`#tabbar`; More opens the same menu as a sheet above it; the top Work and More buttons hide); a round + button on Home (`#fab`, calls `addPurchase()`); swipe a purchase left past 90px to delete it, with Undo (touch handlers on `#rows`). The report keeps the bottom bar.
- All motion is off when the device asks for reduced motion, and under test automation (`navigator.webdriver`), so tests read final values.
- 57 tests, `failures: 0` (one flaky failure in an unrelated import test passed on two reruns). Checked at 375px: the bottom bar and each tab, the More sheet, the + button, swipe to delete and swipe back, row glow and slide-out, the blinking timer. Not seen: the smoothness itself (the browser pane draws about 2 frames a second), a real phone, the dark theme.

## 2026-11-19 (later) and 2026-11-20: phone pages, navigation, work totals, links
- **2026-11-19, second motion pass:** one entrance motion for everything that appears; exits for the More menu and closing panels; report and list transitions; add expense glides to the new row; theme cross-fade. All off under reduced motion and under test automation.
- **Phone:** add sheet that slides up (expense or income, rides above the on-screen keyboard through `visualViewport`); every panel opens as a full page under a "‹ Back" bar; bottom bar Home / Work / More / Account (Report moved into More); round + button on Home.
- **One mode at a time:** Compare and Edit show only their own controls; Compare hides with fewer than two months; Bars hides unless a category has a budget. Desktop panels over the main screen left as they were (user accepted).
- **Navigation:** More opens from every page and the report; the phone back gesture closes what is open (History API, `navSync()`); one Back bar for pages and the report; no frame around phone pages.
- **Manifest colours:** dark base colours with light overrides so the Android navigation strip is not white. It cannot follow the in-app theme (Android reads it at install); the user accepted.
- **2026-11-20, Work log totals:** This week / This month / not in income yet; one line per month with "Add month to income" (income rows keep id `work-<session id>`, so never twice).
- **2026-11-20, links for automation/NFC:** `#add`, `#add-income`, `#work`, `#work-toggle` handled by `deepLink()` at start and on `hashchange`; the hash is removed after use. The MacroDroid inbox already existed (no rules change needed), so `docs/phone.md` got an NFC-tag trigger section instead.
- **Checked:** 61 tests, failures 0 (new: month totals and add-month, the four links). Low-effort code review: no findings. **Not checked:** a real phone (NFC, link opening in the installed app, back gesture), the Work page look after the new lines in the browser pane.
- **2026-11-20, work timer button in the background:** the phone inbox accepts `work`:"toggle" with `date` and `time`; `workInbox()` toggles the timer at the press time (oldest first, `S.work.done` prevents double toggles). Rules changed (`work`, `time`) and published with `npm run deploy:rules`; `rules-test.ps1` 73 checks, failures 0; 61 tests, failures 0 (new checks inside the phone inbox test). **Not checked:** a real MacroDroid macro / NFC button; the timer only updates when the app is next opened (the app does the work, the phone only posts).
- **2026-11-20 (fix):** a timer press whose `time` had a one-digit minute or second (MacroDroid sends "9:5:3") was not read, so both presses got the moment the app opened (start = end). `workInbox()` now reads one- or two-digit parts and 12-hour times with am/pm. Test added; 61 tests, failures 0. Not checked with the user's real macro.
- **2026-11-20 (diagnostic):** the user still got the open time for presses made while closed, so the macro sends a time the app cannot read. When a press time is unreadable the app now shows "Timer press: couldn’t read the time <what was received>, used now". Waiting for what the user sees to fix the macro body or the parser.
- **2026-11-20 (fix):** the user's macro sent the time as "{16}:{17}:{52}" (braces around each value); `workInbox()` now ignores braces. Test added; 61 tests, failures 0.
- **2026-11-20 (confirmed):** the timer button works on the user's phone with the app closed. Kept: lenient time reading (braces, unpadded, am/pm) and the "couldn’t read the time" message. Nothing else was left over from the fix attempts.
- **2026-11-20, voice button (parser + MacroDroid steps):** the phone inbox accepts `say` (a spoken sentence, up to 200 chars). `parseSay()` in `app.js` reads English and Hebrew: a sentence with "shift"/"timer" is a work command (start only starts when idle, end/stop only stops a running shift, neither word toggles; `work:"start"|"stop"` also works), anything else is an expense (first number = amount, the rest minus filler words = place, first letter capitalised; no number gives a 0 row with the words). Rules got the `say` field, rules test 75 checks failures 0, rules published. 61 tests, failures 0 (new checks inside the phone-inbox test). `docs/phone.md` has the macro steps. Decision: the popup shows "Sent: <what was heard>" on HTTP 200, because only the app can parse and apply the sentence. Not checked: a real phone, MacroDroid's Speech To Text and hardware-button menus, whether "contains" checks exist for the Started/Ended popups. Hey Google support deliberately left for a later talk.
- **2026-11-20, voice button hardened (before the first commit):** the amount is the largest number said, English number words are read when there are no digits, "18,50" is 18.50, "with <card>" picks the card and leaves the place clean, more shift words (ending, over, clock out, סיימתי, עצרתי, גמרתי; Hebrew final letters), braced dates from MacroDroid work for expenses too. The MacroDroid steps use the real action names: **Voice Input** (wiki.macrodroid.com) and If "contains". The popups say "Started shift" / "Ended shift" / "Added: <words>" only when the server answered 200. Checked: 61 tests, failures 0; the sentences run in the browser pane. Not checked: a real phone.
- **2026-11-20, voice button on the phone:** sending works on the user's phone. Fixes from that try: the popups never showed because MacroDroid saved the server's reply (not a number) into `code`, so the guide now checks `code` contains `createTime`; the user's `{month}` sent "2026-November-20", so phone dates now also accept month names (`phoneDate()`). At the user's request the voice parser is English only and shift commands are just "start shift" / "end shift" (Hebrew words, toggle-by-voice, other verbs and `work:"start"|"stop"` removed). Cards: any word of a card's name in the sentence picks it ("pizza 40 with Max"). 61 tests, failures 0. Not checked on the phone: the new popup check and card picking.

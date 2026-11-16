# Roadmap

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
- **Rules for the service worker:** network-first for `index.html` so a new deploy shows up at once; cache-first with a version name for CSS, JS, fonts and the Firebase SDK; never cache Firebase API calls; a small "Update available, reload" notice when a new version is waiting; all paths relative to `/Spending-Management/`.
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
| 3 extra: note per purchase | Sonnet, with the recipe below | To do |
| 4 Reports (all three) and Export to Excel | Sonnet | To do |
| 5: budget alerts, "Partner owes" view, Hebrew interface | Sonnet | Later |
| 5: split a purchase across categories, tags | Fable (changes `calc()` and the saved rows) | Later |
| 5: sign in with Google or a passkey | Fable, plus console steps by the user | Later |
| 5: Caspion bank downloads | Fable, needs an always-on machine | Later |
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
- Split one purchase across categories; tags.
- Budget alerts when a category passes 80% and 100% (the bars already change colour; this would be a notice).
- "Partner owes" view for a joint card: what each side paid against their share.
- Hebrew interface option.
- Sign in with Google or a passkey instead of a password.
- Caspion for automatic bank downloads (needs a small always-on machine; biggest job on this list).

Workload:
- Keep CLAUDE.md under one screen; details live in `docs/`.
- Track bugs and ideas as GitHub Issues instead of chat.
- Test on a `dev` branch and merge to `main` when green, now that real data depends on the live site.
- Ask for a short status once per step rather than checking in mid-task.

## Audit follow-ups (done 2026-11-16, Fable)

Done, one commit each: recurring bills use the local date (test at 00:30 Israel time); old `kind`/`S.half`/`recSeeded` migrations removed; one `uid()` helper; prototype-safe maps (`bare()`, `fixMaps()`, `own()` in `app.js`; a merchant, card or category may be called `constructor`); Firestore rules allow only `data/settings` and `months/{YYYY-MM or none}` as `{v:1,json}` under 900,000 characters (45 rule checks, deployed); Firebase SDK served from `vendor/firebase/` and a Content Security Policy in `index.html`.

Still open, both need the user:

1. **Publish only the app (optional).** A GitHub Actions workflow that uploads `index.html`, `style.css`, `app.js`, `cloud.js`, `sw.js`, `manifest.webmanifest`, `icons/`, `vendor/` as the Pages artifact, so `tests/`, `.claude/`, `docs/`, `ROADMAP.md` and `CLAUDE.md` are no longer served. The user must switch Settings, Pages, Source to "GitHub Actions" (give click-by-click steps). Confirm the live site and the installed app still update.
2. **Optional, medium risk:** merge the keyword lists of "Bills & home" and "House stuff" into "Rent & payments" and "Shopping" and delete `NODEF`, `FB`, the two `HINT` targets. Only if the user wants it; keep keyword order so `guess()` results do not change.

The user confirmed on 2026-11-16 that the live site signs in and saves under the policy.

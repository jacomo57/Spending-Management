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

- [ ] Done
- **Model:** Sonnet. Visible work, easy to verify in the browser at phone width.
- **Can run alongside Step 1** in a separate worktree.
- **Do:** under about 640px turn each expense row into a compact card (description and amount on top, date, category and card below, tap to edit); tools row that wraps or scrolls; category rows that fit; touch targets at least 44px; inputs at 16px so iPhones do not zoom; `dir="auto"` on description and merchant fields; safe-area padding; sign-in and Account panels at full width.
- **Test:** browser pane at 375px and 768px, light and dark, with Hebrew and long descriptions; no sideways scrolling anywhere.
- **Done when:** every screen is usable one-handed at 375px and the desktop layout is unchanged.

## Step 3: Income, budgets, search, comparisons

- [ ] Done
- **Model:** Fable to design and build income and budgets (new saved data, must sync and stay compatible); Sonnet is fine for search and the comparison view once budgets are in.
- **Do, as four separate commits:**
  0. **Income and money back** (asked for 2026-11-15; refunds on a card statement already work since Step 0 as minus amounts). Add money that comes in outside the cards: salary, a transfer from the partner, Bit/PayBox paybacks, a tax refund. Design to settle first: an income entry is a row with `inc:1` and a positive amount, kept in the same month documents, never counted as spending. "+ Add income" next to "+ Add purchase"; recurring income (salary) in the Recurring panel; bank-style imports keep their positive rows as income instead of dropping them. The summary shows In, Spent and Left for the month. A payback can be tied to a category so it lowers that category (the partner returns half of a purchase) or left as plain income. Budgets, comparisons and reports below must all use the same definition of "spent".
  1. **Search:** one box above the expenses table; matches description, category, card and amount; works with the month and card filters; shows the total of what is found.
  2. **Budgets:** an overall monthly budget plus an optional one per category, saved in settings (`S.budget = {total, cats:{name:amount}}`). Category bars show spent against budget and change colour near and over the limit; the summary shows "left this month" and, during the current month, a simple pace line ("on track" or "X over pace"). Budgets follow a category when it is renamed.
  3. **Month over month:** pick two months (default: this month against last); per category show both amounts and the change; a 6 to 12 month trend strip for total spending.
- **Worth adding here if time allows:** a "Learned merchants" list to see and fix remembered categories; a note field per purchase; a yearly view.
- **Test:** extend the Playwright suite; budgets must survive sign-out and appear on a second device.
- **Done when:** all four work on desktop and phone, sync across devices, and old accounts open without errors.

## Step 4: Reports

- [ ] Done
- **Model:** Sonnet with this spec; Fable if the look of the report matters a lot.
- **Approach:** a print-ready report page inside the app plus the browser's own "Save as PDF" (and Share on phones). No PDF library: they handle Hebrew and right-to-left text badly, and print styles do it correctly for free. Add "Export to Excel" for the raw rows using the Excel library already loaded.
- **Report types:**
  1. **Monthly report:** total, against budget, against last month; spending by category (bars and table); by card with its counting rule; top 10 merchants; 5 largest purchases; recurring bills; then the full list of expenses.
  2. **Selected expenses:** whatever the current filters and search show, with totals. Good for one card, one category or a date range.
  3. **Trend report:** last 6 or 12 months, total per month and per category, biggest changes.
- **Options on the report screen:** month or range, include or hide the full expense list, include ignored purchases or not.
- **Test:** print preview at A4, Hebrew descriptions, a month with 150+ rows (page breaks, repeated table header), phone share sheet.
- **Done when:** a monthly report saves as a clean PDF on PC and phone.

## Step 5: Ideas for later

App:
- Re-importing after editing a purchase's description or amount adds it again (the duplicate check compares the current values). Remember the imported values per purchase if this gets annoying.
- Split one purchase across categories; tags.
- Budget alerts when a category passes 80% and 100%.
- "Partner owes" view for a joint card: what each side paid against their share.
- Hebrew interface option.
- Sign in with Google or a passkey instead of a password.
- Caspion for automatic bank downloads (needs a small always-on machine; biggest job on this list).

Workload:
- Keep CLAUDE.md under one screen; details live in `docs/`.
- Track bugs and ideas as GitHub Issues instead of chat.
- Test on a `dev` branch and merge to `main` when green, now that real data depends on the live site.
- Ask for a short status once per step rather than checking in mid-task.

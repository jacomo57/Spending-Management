# Handoff (living: rewritten at every handoff, history goes to `docs/archive.md`)

Last updated 2026-11-18. Project `C:\Claude\Spending Project`, branch `dev`, remote jacomo57/Spending-Management. A session reads `CLAUDE.md` and this file only.

## Where things stand
- Cosmetic and flow redesign, no new features. Parts 1, 2 and 3 are done and live; what is left are the design questions below (all need a brainstorm with the user first).
- Main screen categories: the 4 biggest, or the ones picked with ☆ (`S.catPick`, synced); "All categories · Edit" holds all editing (rename, icon, drag, delete, ☆, add, back to the 4 biggest).
- Look is "Copilot blue" (palette in `style.css`, `:root` light and dark variables). Theme switch Auto/Light/Dark lives in the More menu (`localStorage` `spend-theme`, per device).
- Recurring panel: "+ Add recurring" button opens the add form (done 2026-11-18, with the fix below). Main screen trimmed 2026-11-18 at the user's request: no per-day/pace/fixed lines, no fixed-charges-to-come, no In/Left over, no currency box (now in Account), no help text under Expenses.
- 52 tests pass (`npm test`, `failures: 0`). Not checked: real phone, real print preview/PDF.
- User opens the app rarely, mostly on the phone, for a quick look; the PC is for development and a monthly look. Everything stays revertable (small commits on `dev`).
- Hebrew interface is parked, but keep it possible (use start/end, not left/right, in new CSS). "Partner owes" is dropped.

## Design questions to brainstorm with the user (written down 2026-11-18, not decided; none is part 3)
- **What the main screen shows.** Today: spent + budget bar and line + budget alerts + per-card amounts + the picked categories + the latest-5 expenses. The user finds the old "X left per day" not relevant and wants a different approach (brainstorm; the removed per-day, end-of-month pace and fixed-charges code is in git commit `edc2d55`, `fixedSet()`, `toCome()` and the `live` block in `render()`).
- **Multi-currency.** The user travels soon: a main currency to translate everything into, purchases in other currencies. Needs: where the rate comes from (typed by hand vs. a rates service: a service may need a CSP entry and must not cost money), a currency per purchase, how `calc()`/`v()` convert, Excel/report/phone input impact, saved shape (sync, `.claude/rules-test.ps1` then `npm run deploy:rules` if the shape changes). The currency symbol is for now one box in Account (Backup in local mode).
- **"How to" page.** All explanations and capabilities in one tab, so the screens carry no help text. Text removed from under Expenses, to move there: Changing a category teaches the app that merchant. A refund is a minus amount. Income with a category is a payback and lowers that category. Choose Split… in a category box to put part of a purchase in another category. A #word in a note is a tag. Text removed from the Budget panel 2026-11-19, to move there: "Monthly budgets. Leave a box empty for no budget. On the main screen the total shows under the big number and each category's bar fills toward its budget (amber from 80%, red when over). Pick one month, not All time, and All cards." and, next to Month starts on day: "1 = the calendar month. Use your payday or card billing day." (Also collect the other panel intro lines: Import, Cards, Recurring, Merchants.)
- **Report with income and left over.** Report already shows In and Left over (only when income exists) next to Spent; the user wants it clearly there: income, expenses, left over, since income is gone from the main screen. Income is still entered with "+ Add income", recurring income and payslip import; decide whether that button stays on the main screen.

## Next
The user wants to brainstorm the design questions above before anything is built. Suggested order: what the main screen shows, report with income/left over, How-to page, then multi-currency (biggest; the user travels soon). Start with: "Read CLAUDE.md and the handoff, then let us brainstorm <topic>."

## Open items
- Part 3 phone pass was done on the main screen, Budget and Recurring panels, the Edit view and the report (dark and light, 375px). Not individually looked at on a phone-size screen: Import, Cards, Merchants, Account panels, Compare, the Trend and Selected-expenses reports.
- Known rough edges from part 1: an edited row can drop out of the "latest 5" list if its date or amount moves it; Light/Dark chosen against the device setting may flash for a moment on load (theme is applied from `app.js`, not the head, to keep `sw.js` untouched); the manifest colours were changed but the installed app only picks them up after an update.
- Recurring bills missing for a month: the code only adds a month's bills when the app loads (a bill starts in the month it was added, and only once its day has passed). An app left open across the 1st (an installed phone app often is) missed them; fixed 2026-11-18 by also adding them when the app returns to the front on a later day. If a month is still missing bills, ask the user: when was the bill added, which month start day is set (Budget panel; with a start day other than 1 a bill on the 1st belongs to the month before), and was the generated row deleted (a deleted generated row is never re-added).
- Real print preview / Save as PDF and a real phone have never been checked. The category pick syncing between two real devices was not checked (it rides in the settings JSON).
- GitHub Issues hold bugs and ideas.

## Reminders
- Browser pane launch config `spend` (http://localhost:8766 if 8765 is busy; use `?local=1`). Palette: light bg `#EEF3FC`, card `#FFFFFF`, ink `#14253F`, muted `#6B7A92`, accent `#3B6FF0`; dark bg `#0E1626`, card `#172238`, ink `#EAF0FB`, accent `#5B8BFF`.
- Every piece of work ends with a short summary (what changed, what was checked, what was not, what the user must do). Never commit personal data. Verify by actually running the app.
- At every handoff: append to `docs/archive.md`, rewrite this file (see CLAUDE.md "Handoff rules").

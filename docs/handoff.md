# Handoff (living: rewritten at every handoff, history goes to `docs/archive.md`)

Last updated 2026-11-20. Project `C:\Claude\Spending Project`, branch `dev`, remote jacomo57/Spending-Management. A session reads `CLAUDE.md` and this file only.

## Where things stand
- Everything planned on 2026-11-18 is done and live: multi-currency, report with income, How to page, main screen (spent, left of budget, trip strip), Work page with Israeli overtime pay, and the motion and polish pass with the phone bottom bar. Details in `docs/archive.md` (2026-11-19 entries).
- 61 tests pass (`npm test`, `failures: 0`). The import test "re-importing after editing a purchase" failed once with a timeout and passed on reruns: watch for it.
- User opens the app rarely, mostly on the phone, for a quick look; the PC is for development and a monthly look. Everything stays revertable (small commits on `dev`).
- Hebrew interface is parked, but keep it possible (use start/end, not left/right, in new CSS). "Partner owes" is dropped.

## Next
Nothing is asked for yet. The user sets up MacroDroid with an NFC tag (see `docs/phone.md`, NFC section); wait for feedback from the phone (animations, bottom bar, back gesture, Work page totals, `#add` / `#work-toggle` links).
## Open items
- Never checked on a real phone: the motion pass (its smoothness was never seen: the browser pane draws about 2 frames a second), the bottom bar, swipe to delete, the Work page and timer, multi-currency with real euro statements and notifications. The dark theme of the new screens was not checked.
- Not confirmed on a phone: the back gesture staying in the app; the `#...` links opening the installed app (not the browser).
- How to page: no topic yet for Work, the links, the phone bottom bar, the + button or swipe to delete.
- Work page, not handled: editing a session after it was added to income leaves the income row as it was; the hourly rate is not converted when the home currency changes; no weekly 42-hour limit, unpaid breaks or built-in holiday list (left out on purpose).
- Main-screen ideas the user declined for now: vs last month, money in and out, biggest this month, waiting to confirm, recurring coming up, streak/alert.
- Not individually looked at on a phone-size screen: Import, Cards, Merchants, Account panels, Compare, the Trend and Selected-expenses reports.
- Known rough edges: an edited row can drop out of the "latest 5" list if its date or amount moves it; Light/Dark chosen against the device setting may flash for a moment on load; the installed app picks up manifest colours only after an update.
- Recurring bills missing for a month: bills are added when the app loads and when it returns to the front on a later day. If a month is still missing bills, ask the user: when was the bill added, which month start day is set (with a start day other than 1 a bill on the 1st belongs to the month before), and was the generated row deleted (a deleted generated row is never re-added).
- Real print preview / Save as PDF never checked. Category pick and work log syncing between two real devices not checked (both ride in the settings JSON).
- GitHub Issues hold bugs and ideas.

## Reminders
- Browser pane launch config `spend` (http://localhost:8765, use `?local=1`). The pane renders slowly, so judge animations by their end state, not by watching. Palette: light bg `#EEF3FC`, card `#FFFFFF`, ink `#14253F`, muted `#6B7A92`, accent `#3B6FF0`; dark bg `#0E1626`, card `#172238`, ink `#EAF0FB`, accent `#5B8BFF`.
- A failed "Publish the app" run with "No artifacts named github-pages" is GitHub's side: re-run it (`gh run rerun <id>`).
- Every piece of work ends with a short summary (what changed, what was checked, what was not, what the user must do). Never commit personal data. Verify by actually running the app.
- At every handoff: append to `docs/archive.md`, rewrite this file (see CLAUDE.md "Handoff rules").

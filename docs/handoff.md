# Handoff (living: rewritten at every handoff, history goes to `docs/archive.md`)

Last updated 2026-11-25. Project `C:\Claude\Spending Project`, branch `dev`, remote jacomo57/Spending-Management. A session reads `CLAUDE.md` and this file only.

## Where things stand
- All work is done and live. Latest (2026-11-25): How to topics, a full audit and its fixes (phone amount with a comma, import dates, 100-row list, small currency box, one default card, month after first import, file and Stop buttons). Details in docs/archive.md and docs/spec.md.
- 65 tests pass (`npm test`, `failures: 0`). An import test once timed out and passed on rerun: watch for it.
- User opens the app rarely, mostly on the phone; the PC is for development. Small, revertable commits on `dev`.
- Hebrew interface is parked, but keep it possible (start/end, not left/right, in new CSS). "Partner owes" is dropped. Dropped 2026-11-21: "Hey Google" / Gemini triggers and anything needing a paid server function.
- Firebase sign-up stays ON on purpose (user decided 2026-11-23).

## Next (waiting on the user)
- Optional, from the audit: Firebase console: password policy 10+ characters, a long random invite code, email enumeration protection on (Claude gives click-by-click steps on request).
- Check on the phone: the new purchase layout (₪ mark inside the amount box, note beside "+ note", date with Ignore and ✕), the Choose a file button (Import), the red Stop button.
- Statement import: the next Max file arrives in December 2026; the user imports it on the live site to confirm the multi-card split.

## Open items
- Checked on the phone by the user (2026-11-25): swipe to delete, the Work timer, the bottom bar, notifications, the dark theme. Still not checked on a real phone: motion smoothness, multi-currency with real euro statements, the back gesture staying in the app, the `#...` links opening the installed app.
- Voice button: confirmed on Android 2026-11-21, English only by choice; it already sends the time. The popup can show only what was heard.
- Work timer: the timer only updates when the app is next opened (a server function would need the paid Firebase plan, declined).
- Work page, not handled: editing a session after it went into income leaves the income row as it was; the hourly rate is not converted when the home currency changes; no weekly 42-hour limit, unpaid breaks or holiday list (on purpose).
- Main-screen ideas the user declined for now: vs last month, money in and out, biggest this month, waiting to confirm, recurring coming up, streak/alert.
- Known rough edges: an edited row can drop out of the "latest 5"; Light/Dark against the device setting may flash on load; the installed app picks up manifest colours only after an update.
- Recurring bills missing for a month: ask when the bill was added, which month start day is set, and whether the generated row was deleted (a deleted one is never re-added).
- Print preview / Save as PDF never checked. Syncing the category choice and the work log between two real devices not checked.
- GitHub Issues hold bugs and ideas.

## Reminders
- Browser pane launch config `spend` (http://localhost:8765, use `?local=1`). The pane draws slowly: judge animations by their end state. Palette: light bg `#EEF3FC`, card `#FFFFFF`, ink `#14253F`, muted `#6B7A92`, accent `#3B6FF0`; dark bg `#0E1626`, card `#172238`, ink `#EAF0FB`, accent `#5B8BFF`.
- Pickers: native fields stay in the page and are intercepted (`pk*` block at the end of `app.js`); setting a value fires input and change. In tests, `setField` writes hidden `.vh` fields directly. `FULL=1 npm test` shows full Playwright errors.
- Shell: the Bash tool's heredocs and `node -e` strip backslashes; write scripts with the Write tool. The project path has spaces.
- A failed "Publish the app" run with "No artifacts named github-pages" is GitHub's side: `gh run rerun <id>`.
- Every piece of work ends with a short summary (changed, checked, not checked, user to do). Never commit personal data. Verify by running the app.
- At every handoff: append to `docs/archive.md`, rewrite this file (see CLAUDE.md "Handoff rules").

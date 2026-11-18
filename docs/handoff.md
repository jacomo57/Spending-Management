# Handoff (living: rewritten at every handoff, history goes to `docs/archive.md`)

Last updated 2026-11-18. Project `C:\Claude\Spending Project`, branch `dev`, remote jacomo57/Spending-Management. A session reads `CLAUDE.md` and this file only.

## Where things stand
- Cosmetic and flow redesign, no new features. Part 1 (Sonnet) is done and live; parts 2 and 3 are left.
- Look is "Copilot blue" (palette in `style.css`, `:root` light and dark variables). Theme switch Auto/Light/Dark lives in the More menu (`localStorage` `spend-theme`, per device).
- Recurring panel: "+ Add recurring" button opens the add form (done 2026-11-18, with the fix below).
- 51 tests pass (`npm test`, `failures: 0`). Not checked: real phone, real print preview/PDF.
- User opens the app rarely, mostly on the phone, for a quick look; the PC is for development and a monthly look. Everything stays revertable (small commits on `dev`).
- Hebrew interface is parked, but keep it possible (use start/end, not left/right, in new CSS). "Partner owes" is dropped.

## Next parts (one after another, they all edit `app.js` and `style.css`)
Start each with: "Read CLAUDE.md and the handoff, then do part N."
2. **Opus: category visibility and order on the main screen.** The user wants the main screen to show spent, budget left and pace, then only a few categories (top 4 by default), and to choose which categories show and their order (rent is always biggest and not interesting). New saved setting, so: sync to a second device, Undo, tests, and if the saved shape changes run `.claude/rules-test.ps1` then `npm run deploy:rules`. Do not change `calc()`/`v()` meaning.
3. **Sonnet: polish.** Phone pass on every screen and panel in the new look, dark mode in each panel, Hebrew text alignment in tables (one report cell looked slightly misaligned), the report in the new look, round category icons, update the spec comment in `index.html` and `docs/app.md`.

## Open items
- Known rough edges from part 1: an edited row can drop out of the "latest 5" list if its date or amount moves it; Light/Dark chosen against the device setting may flash for a moment on load (theme is applied from `app.js`, not the head, to keep `sw.js` untouched); the manifest colours were changed but the installed app only picks them up after an update.
- Recurring bills missing for a month: the code only adds a month's bills when the app loads (a bill starts in the month it was added, and only once its day has passed). An app left open across the 1st (an installed phone app often is) missed them; fixed 2026-11-18 by also adding them when the app returns to the front on a later day. If a month is still missing bills, ask the user: when was the bill added, which month start day is set (Budget panel; with a start day other than 1 a bill on the 1st belongs to the month before), and was the generated row deleted (a deleted generated row is never re-added).
- Real print preview / Save as PDF and a real phone have never been checked.
- GitHub Issues hold bugs and ideas.

## Reminders
- Browser pane launch config `spend` (http://localhost:8766 if 8765 is busy; use `?local=1`). Palette: light bg `#EEF3FC`, card `#FFFFFF`, ink `#14253F`, muted `#6B7A92`, accent `#3B6FF0`; dark bg `#0E1626`, card `#172238`, ink `#EAF0FB`, accent `#5B8BFF`.
- Every piece of work ends with a short summary (what changed, what was checked, what was not, what the user must do). Never commit personal data. Verify by actually running the app.
- At every handoff: append to `docs/archive.md`, rewrite this file (see CLAUDE.md "Handoff rules").

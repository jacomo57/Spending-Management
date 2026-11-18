# Handoff: Spend, sorted — cosmetic and flow redesign

Written 2026-11-18. Project: `C:\Claude\Spending Project` (branch `dev`, remote jacomo57/Spending-Management). Read `CLAUDE.md` and `ROADMAP.md` first; they hold the rules and history. Section "Next: cosmetic and flow redesign" in `ROADMAP.md` (commit 0d18e5a) has the goals agreed so far. Nothing of the redesign is built; no app code was changed in the previous chat.

## Where things stand
- Baseline checked: `npm test` = 49 tests, `failures: 0`; dark mode at 375px and a 165-row report looked fine. Not checked: real print preview/PDF, a real phone.
- Live site already serves only the app (ROADMAP.md, docs, tests return 404).
- The user is switching to purely cosmetic and flow work. No new features. Hebrew interface is parked but keep it possible (use start/end instead of left/right in new CSS). "Partner owes" is dropped.
- The user opens the app rarely, mostly on the phone, for a quick look; PC only for development and a monthly look. Everything must be revertable (small commits on `dev`).

## Decisions made in this chat (not yet all in ROADMAP.md)
- **Look: scheme 1, "Copilot blue"** (inspired by copilot.money: a hero card "X left of Y" with a pace line, round category icons).
  - Light: background `#EEF3FC`, card `#FFFFFF`, ink `#14253F`, muted `#6B7A92`, accent `#3B6FF0`, under budget `#2FA866`, near budget `#E8A33D`, track `#DDE6F6`.
  - Dark: background `#0E1626`, card `#172238`, ink `#EAF0FB`, muted `#8E9BB5`, accent `#5B8BFF`, under budget `#41C27F`, near budget `#F0B050`, track `#25324D`.
  - Category colours stay as they are.
- **Theme toggle (requested):** Auto (follows the phone or PC setting, default), Light, Dark. Store the choice per device in localStorage, not in `S` (no sync, no data change); apply it before first paint to avoid a flash; keep `theme-color` in the page head and manifest in step; the report print rules already force light. The code already uses `:root[data-theme="light"|"dark"]` selectors, so look for that mechanism before adding a new one.
- **Main screen at a glance:** spent this month, budget left and pace, then the top 4 categories. The user must be able to choose which categories show or their order (rent is always the biggest and uninteresting).
- **One "More" menu** replaces the button row, in this order: Import, Cards, Recurring, Budget, Report, Merchants, Account. Only "+ Add purchase" stays visible.
- **Expenses list** shows the latest 5 with "Show all".

## The three sessions (user's request: write this in the summary)
Run one after another (all edit `app.js` and `style.css`). Each: `npm test` ends `failures: 0`, browser check at 375px in light and dark, `/code-review`, small commits on `dev`, then release per CLAUDE.md. Start each with: "Pull, read CLAUDE.md and ROADMAP.md, then read docs/redesign-handoff.md and do part N of it."
1. **Sonnet: look and menu.** Copilot-blue theme, Auto/Light/Dark toggle, hero card (spent, budget left, pace), the "More" menu, latest-5 list with "Show all". Visual only: do not change `calc()`, `v()`, `cloud.js`, `firestore.rules`, `sw.js` or what is saved.
2. **Opus: category visibility and order.** Choose which categories show on the main screen and their order. Adds a saved setting, so: sync to a second device, Undo, tests, and if the saved shape changes run `.claude/rules-test.ps1` then `npm run deploy:rules`. The user has no Fable, so Opus replaces it.
3. **Sonnet: polish.** Phone pass on every screen and panel in the new look, dark mode in each panel, Hebrew text alignment in tables (one report cell looked slightly misaligned), the report in the new look, update the spec comment in `index.html` and `docs/app.md`.

## Open items
- Tick each part in `ROADMAP.md` (section "Next: cosmetic and flow redesign") when it is done, and note what was not checked.
- The user said they might still look for more inspiration; the Copilot look is confirmed, so proceed unless they say otherwise.
- Browser pane launch config: `spend` (http://localhost:8765, use `?local=1`).

## Suggested skills
- `run`: to launch and check the app in the browser pane.
- `code-review`: after each part, before pushing.
- `anthropic-skills:built-in-browser`: before using the browser pane.
- `domain-modeling`: only if terms or a decision need recording.

## Reminders from CLAUDE.md
End every piece of work with a short summary (what changed, what was checked, what was not, what the user must do). Never commit personal data. Verify fixes by actually running the app.

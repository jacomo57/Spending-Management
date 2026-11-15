# Spend, sorted: spending tracker

Personal spending tracker for one user in Israel (Hebrew + English). Each card has its own counting rule (full, half, a custom percentage, or not counted); a joint card with their partner is just a card set to half.

## How to work with me
- Keep answers short and clear. Keep the app uncluttered.
- Make targeted edits, not full rewrites.
- I have not tested everything in a browser. When I report a problem, reproduce and verify the fix before saying it works.
- Agency (granted 2026-11-14): decide and build on your own, including new files, new dependencies and data-format changes (just tell me what you chose and why). The current data is test data, so no migration is needed. Still stop and ask for: creating accounts or sign-ups (I do those; you give click-by-click steps), secrets/API keys (never in the public repo), anything that could cost money, and anything that exposes personal data publicly.

## Workflow (always)
- At the start of every session, run `git pull` first (the user works from two computers, a PC and a laptop, so GitHub is the shared source of truth). Never start editing before pulling.
- All work happens in `C:\Claude\Spending Project`. This folder is the git repo; remote is https://github.com/jacomo57/Spending-Management (public, GitHub Pages from `main`, site https://jacomo57.github.io/Spending-Management/).
- After every change: test it in a browser, then commit and push to `main`, so GitHub is always the backup. Then confirm the live site works.
- Test by actually running the app (local server + browser pane), not by reading code. Only say something works if it was checked; otherwise say exactly what was not checked.
- The repo is public: never commit personal data (real amounts, backups, statements). `.gitignore` covers backup/statement files.

## The app
- Single file: `index.html`. The spec comment at the top lists features, untested parts and ideas. Keep it updated with every change.
- Two modes, chosen in `index.html` by `FB_REAL`/`EMU`:
  - Local-only (`?local=1` on localhost, or if `FB_REAL` is set back to `null`): data in localStorage key `spend-v1`, Backup panel shown, no sign-in.
  - Cloud (localhost against the emulators; the live site against the real project, since `FB_REAL` is set): sign-in required, data in Firestore, Account panel shown, Backup hidden, localStorage unused.
- No bank connection. In local-only mode the page contacts no other sites except fonts and the Excel library; in cloud mode it also loads the Firebase SDK from gstatic and talks to Firebase.
- The "Sort N unrecognized with Claude" button was removed (it needed the artifact environment's Claude API). Unrecognized merchants stay in Other for manual sorting.

## Backend plan (decided 2026-11-14)
Goal: two users only (me and my partner), each with a private, independent account; the same data on phone, laptop and PC, saved automatically. Not a public service: no legal or scaling work.
- Service: Firebase on the free Spark plan (no payment card): Auth with email + password, and Firestore. Chosen over Supabase (free projects pause after a week unused and need a manual restart) and a self-built Cloudflare Worker backend (own password handling, more code to maintain).
- Hosting stays on GitHub Pages. No custom domain (it costs money).
- Accounts: created inside the app (Create account, Sign in, Reset password, Delete my account; deleting removes the login and all its data). Sign-up needs an invite code: the user adds code documents in the Firebase console, and Firestore rules allow a user to create their data only if the code exists (checked with `exists()`; clients cannot read the codes). A stranger can make a login but can never store or read data.
- Data layout: `users/{uid}` (profile: invite code used, proves the account is allowed), `users/{uid}/data/settings` (everything in `S` except purchases) and `users/{uid}/months/{YYYY-MM}` (that month's purchases). Each document is `{v:1, json:"..."}`. Emptied months are written as `[]`, never deleted. Last write wins per document. Offline uses Firestore's own cache (IndexedDB), cleared on sign-out; the app waits for server-confirmed data on a device that never synced, so it cannot overwrite real data with an empty state.
- Sync rules in the code (keep them): `save()` writes only documents whose content changed (`C.syn`); incoming snapshots are ignored while this device has unconfirmed writes to that document (`C.un`), and re-checked once they confirm; a remote change never redraws the table while the user is typing in a field.
- The Firebase web config (apiKey etc.) is public by design and lives in `index.html`; the rules are the protection. Never commit passwords or service-account keys.
- Testing: the Firebase Emulator Suite (Auth on 127.0.0.1:9099, Firestore on 127.0.0.1:8080, project id `demo-spend`, config in `firebase.json`) runs fully local on this PC. When the page is opened on localhost it connects to the emulators, never the real project. Claude may create and delete demo accounts there freely (throwaway emails like demo1@example.invalid, throwaway passwords, never the user's real account); the emulator forgets everything when stopped. The real project is only used by the live site and by the user signing in themselves.
- Build order: 1) per-card counting rules (done), 2) emulator installed (done: Node 24, Java 21 Temurin, firebase-tools 15; start with `firebase emulators:start --only auth,firestore --project demo-spend`), 3) in-app sign-up/sign-in + invite code + delete account (done), 4) load/save sync (done), 5) two-account and two-device test on the emulator (done 2026-11-14), 6) real Firebase project `spending-management-608d5` created by the user, web config is in `FB_REAL` in `index.html` (done 2026-11-15); the user created the first real account on 2026-11-15 and sign-in/out works; sign-ups are deliberately left open (the `invites` document stays, so anyone with the invite code can still register; delete or rename that document to close or rotate it); the invite code is never written down in the repo or chat, and Claude does not need it (all Claude testing uses the emulator and its fake code); whenever `firestore.rules` changes, it must be re-pasted into the Firebase console (Firestore, Rules, Publish), 7) installable PWA (needed for the app to open with no connection; password reset emails and offline use are untested until then).

## Local testing
- New shells need `$env:Path` refreshed (Node, Java and `firebase` were installed with winget/npm after the session started); tools: node 24, npm 11, java 21, firebase 15.
- No python on this PC. Start the local server with the launch config `spend` (`.claude/launch.json` runs `.claude/serve.ps1`, a PowerShell static server on http://localhost:8765 and http://127.0.0.1:8765). The two addresses have separate browser storage, so one acts as a "second device" in sync tests.
- Cloud-mode testing needs the emulators running first (command in the build order above), then one invite code seeded: `PATCH http://127.0.0.1:8080/v1/projects/demo-spend/databases/(default)/documents/invites/DEMO-INVITE-1` with header `Authorization: Bearer owner` and body `{"fields":{}}`.
- `.claude/rules-test.ps1` runs 32 allow/deny checks of `firestore.rules` against the emulator (other user's data, no invite, signed out, invite codes unreadable). Run it after any rules change; it must report `failures: 0`.

## Next steps
0. BIG TASK in progress: follow "Backend plan" above. Stop only at the gates in "How to work with me".
1. Installable PWA (GitHub Pages is already live).
2. Phone-friendly expenses table.
3. Monthly budgets per category, search, month-over-month comparison.
4. Later: Caspion automatic bank downloads, partner sync (builds on the backend).

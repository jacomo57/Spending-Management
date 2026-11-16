# Backend (decided 2026-11-14)

Goal: two users only (the owner and their partner), each with a private, independent account; the same data on phone, laptop and PC, saved automatically. Not a public service: no legal or scaling work.

## Choices
- Service: Firebase on the free Spark plan (no payment card): Auth with email + password, and Firestore. Chosen over Supabase (free projects pause after a week unused and need a manual restart) and a self-built Cloudflare Worker backend (own password handling, more code to maintain).
- Hosting stays on GitHub Pages. No custom domain (it costs money).
- Real project: `spending-management-608d5`, created by the user. Its web config is `FB_REAL` in `app.js`. That config (apiKey etc.) is public by design; the rules are the protection. Never commit passwords or service-account keys.

## Accounts
- Created inside the app: Create account, Sign in, Reset password, Delete my account (removes the login and all its data).
- Sign-up needs an invite code: the user adds code documents in the Firebase console (`invites` collection), and the Firestore rules allow a user to create their data only if the code exists (checked with `exists()`; clients cannot read the codes). A stranger can make a login but can never store or read data.
- The user created the first real account on 2026-11-15. Sign-ups are deliberately left open: the `invites` document stays, so anyone with the code can still register. Delete or rename that document to close or rotate it.
- The invite code is never written down in the repo or chat, and Claude does not need it (all Claude testing uses the emulator and its fake code).

## Data layout
- `users/{uid}`: profile (invite code used; proves the account is allowed).
- `users/{uid}/data/settings`: everything in `S` except purchases (cards, categories, recurring items, budgets `S.budget`).
- `users/{uid}/months/{YYYY-MM}`: that month's rows: purchases, and income rows (`inc:1`, positive amount; with a category it is a payback). Optional fields per row: `skip`, `src` (the imported values of an edited row).
- Each document is `{v:1, json:"..."}`; the rules refuse any other shape, any other document name, and a `json` of 900,000 characters or more (the app then shows "Couldn't save"). Emptied months are written as `[]`, never deleted. Last write wins per document.
- Offline uses Firestore's own cache (IndexedDB), cleared on sign-out. The app waits for server-confirmed data on a device that never synced, so it cannot overwrite real data with an empty state.
- Known limit: the same month edited on two devices while one is offline. The later save replaces the earlier one for that whole month. Accepted for one person per account.

## Sync rules in `cloud.js` (keep them)
- `save()` writes only documents whose content changed (`C.syn`).
- Incoming snapshots are ignored while this device has unconfirmed writes to that document (`C.un`), and re-checked once they confirm.
- A remote change never redraws the table while the user is typing in a field.

## Backup
- The free plan keeps no history. The Account panel has "Download my data" (one JSON file with everything in `S`) and "Restore from file" (replaces everything, second press to confirm, Undo for 8 seconds).

## Security rules
- `firestore.rules` in the repo is the source. Publish with `npm run deploy:rules` (needs `firebase login` once on that computer). Until then: paste the file into the Firebase console (Firestore, Rules, Publish).
- `.claude/rules-test.ps1` runs 45 allow/deny checks against the emulator (other user's data, no invite, signed out, invite codes unreadable, document names, shape and size). Run it after any rules change; it must report `failures: 0`.

## Emulator
- Firebase Emulator Suite: Auth on 127.0.0.1:9099, Firestore on 127.0.0.1:8080, project id `demo-spend`, config in `firebase.json`. Fully local.
- Start by hand: `npm run emulators`. `npm test` starts and stops them itself if they are not running.
- A page opened on localhost connects to the emulators, never the real project. Claude may create and delete demo accounts there freely (throwaway emails like demo1@example.invalid, throwaway passwords, never the user's real account). The emulator forgets everything when stopped.
- Seed an invite code: `PATCH http://127.0.0.1:8080/v1/projects/demo-spend/databases/(default)/documents/invites/DEMO-INVITE-1` with header `Authorization: Bearer owner` and body `{"fields":{}}`.

## History
1. Per-card counting rules. 2. Emulator installed (Node 24, Java 21 Temurin, firebase-tools 15). 3. In-app sign-up, sign-in, invite code, delete account. 4. Load/save sync. 5. Two-account and two-device test on the emulator (2026-11-14). 6. Real project connected (2026-11-15). 7. Installable PWA built (2026-11-15): offline open and syncing an offline edit are tested on the emulator; password reset emails are still untested.

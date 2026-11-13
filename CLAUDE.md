# Spend, sorted: spending tracker

Personal spending tracker for one user in Israel (Hebrew + English). A joint card with their partner counts at half.

## How to work with me
- Keep answers short and clear. Keep the app uncluttered.
- Make targeted edits, not full rewrites.
- I have not tested everything in a browser. When I report a problem, reproduce and verify the fix before saying it works.
- Ask before big changes (new files, new dependencies, changing the data format).

## The app
- Single file: `index.html`. The spec comment at the top lists features, untested parts and ideas. Keep it updated with every change.
- Data lives only in the browser's localStorage key `spend-v1`. Never rename the key or break the saved format without a migration, or the user loses their data.
- No bank connection; the page contacts no other sites.
- The "Sort N unrecognized with Claude" button was removed (it needed the artifact environment's Claude API). Unrecognized merchants stay in Other for manual sorting.

## Next steps (ask which first)
1. Put it on GitHub Pages and make it an installable PWA.
2. Phone-friendly expenses table.
3. Monthly budgets per category, search, month-over-month comparison.
4. Later: Caspion automatic bank downloads, partner sync (needs a small backend).

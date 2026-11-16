# Add a purchase from the phone without opening the app (MacroDroid)

Written 2026-11-16 from memory of MacroDroid's menus, NOT tried on a real phone. Menu names can differ a little between versions; the idea is the same. The app side (the inbox) is described in `backend.md`, Phone inbox.

The key is a secret. It goes into MacroDroid on the phone only: never into this repo, a chat, or a screenshot.

## Before you start
1. In the app: Account, "Add from your phone", Turn on. Keep that screen open on the phone (or send yourself the two values privately).
2. Install MacroDroid from Google Play. The free version is enough (5 macros; this uses 1, the Wallet one later uses 1 more).
3. When MacroDroid asks for permissions during this guide, it needs none of the sensitive ones (no notification access, no accessibility, no location).
4. Phone Settings, Apps, MacroDroid, Battery: set to Unrestricted (or "Don't optimise"), so Android does not stop it.

## The macro: "Quick expense"
Open MacroDroid, Add Macro, name it `Quick expense`.

### Trigger (how you start it)
Add one or more of these; all are under Triggers, "MacroDroid Specific":
- **Shortcut Launched**: then long-press the home screen, Widgets, MacroDroid, "Macro shortcut", pick this macro. One tap on that icon opens the popup.
- **Quick Settings Tile**: a button in the pull-down panel at the top of the phone (MacroDroid settings, Quick Settings Tiles, name one "Expense", then add the tile to the panel with the pencil/edit button).
- **Notification Bar Button**: a button in MacroDroid's always-on notification (MacroDroid settings, Notification Bar Options, add a button).

### Actions (in this order)
1. **Set Variable** (under Variables): create a new local variable `amount`, type String, value "User Prompt", title `Amount`. Tick "numeric keyboard" if offered.
2. **Set Variable**: new local variable `what`, type String, value "User Prompt", title `What? (can be empty)`.
3. **HTTP Request** (under Web Interactions):
   - Method: `POST`
   - URL: paste the **Address** from the app.
   - Content type: `application/json`
   - Content body (text). Paste this, replace `PASTE-KEY-HERE` with the **Key** from the app, and put the variables and date parts in with the magic-text button ("..." or "{ }") rather than typing them, so the names match your version:

     ```
     {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"amt":{"stringValue":"{lv=amount}"},"desc":{"stringValue":"{lv=what}"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"}}}
     ```

     The three date pieces are Year, Month (as a number) and Day of month from the Date/Time magic-text list.
   - Tick "Block next actions until complete" and save the HTTP response **code** into a new local variable `code`.
4. **If** `code` = 200 (Conditions/Loops, IF clause, MacroDroid variable): **Popup Message** `Added {lv=amount}`.
   **Else**: **Popup Message** `NOT added (code {lv=code})`.

Save the macro and make sure it is switched on.

## Try it
1. Start it (shortcut, tile or notification button). Type `1`, then `test`, OK.
2. You should see "Added 1". Open the app: a purchase "test", ₪1, today, marked "not on a statement yet". Delete it.

## If it says NOT added
- **403**: the key is wrong (a space at the start or end, or "New key"/"Turn off" was pressed since), or the body's shape was changed. Paste the body again.
- **400**: the body is not valid JSON, usually a missing quote or bracket.
- **No code / 0**: no internet at that moment. The macro does not retry; start it again.

## Good to know
- Do not type a double quote (") in the "What?" box: it breaks the message.
- The purchase appears the next time the app is open and online. Until then it waits safely in the inbox.
- The card is the one you used last in the app. To send another, add `,"card":{"stringValue":"Visa 1234"}` inside the body's `fields`.
- When the card statement is imported later, the row with the same amount within 2 days merges with this one instead of doubling.
- Lost phone, or the key was seen by someone: Account, "New key" (the old one stops working at once), then paste the new key into the macro.

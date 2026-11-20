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

## Choosing the card
- In the app, Cards panel: press **☆ Default** on the card you use most (press again to clear). The phone uses it when nothing else names a card. Without one they use the card of your latest purchase.
- To send a card from the macro, add `,"card":{"stringValue":"Max 5315"}` inside the body's `fields` (name or last 4 digits).

## The macro: "Wallet payment" (added 2026-11-17, from a real notification: title `SLOMI`, text `₪60.00 with max Total ••5315`)
The app reads the amount (₪60.00), uses the title as the purchase name, and picks the card whose name contains the word after "with" (here `max`) or the last 4 digits; otherwise your default card. Nothing is lost: if the amount cannot be read the purchase is added at 0 with the notification text in its note.

Add Macro, name `Wallet payment`.
- **Trigger**: Device Events, **Notification Received**. Application: Google Wallet only. Text content: leave empty or choose "Contains" `with` (so only payment notifications match). MacroDroid asks for Notification Access: allow it (this is the sensitive permission; it lets MacroDroid read notifications).
- **Action**: **HTTP Request**, the same as the Quick expense macro, with this body. **Do not type TITLE-HERE and TEXT-HERE: delete each one and put the real value in with the magic-text button** ("..." or "{ }" next to the field), choosing the notification's title for the first and the notification's text for the second (the list shows what this trigger offers; the names are MacroDroid's own, so they cannot be copied from here). The date part works the same way (year, month, day of month):
  ```
  {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"title":{"stringValue":"TITLE-HERE"},"text":{"stringValue":"TEXT-HERE"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"}}}
  ```
- **If a row shows the name `{...}` in curly braces and 0**: the value was typed instead of inserted with the button, so MacroDroid sent the words as they are. Delete that row in the app, fix the body, and test again (an earlier version of this guide had made-up names, which caused this on 2026-11-18).
- Test: pay with the phone, or press "Test macro" with a sample. A row appears (marked "not on a statement yet"), and the statement import later merges with it.
- If the card is wrong: the digits in Wallet (••5315) can differ from the physical card's. Rename the app card to include the issuer word (for example `Max 1234`), or set it as the Default.

## Start the quick-expense popup with an NFC tag (added 2026-11-20, not tried on a real phone)
The macro above already shows the popup and sends the purchase. An NFC tag only needs to be a new **trigger** for the same macro.
1. Buy an NFC sticker (NTAG213 or similar, any cheap one). Stick it where you want (phone stand, wallet, door).
2. MacroDroid, open the `Quick expense` macro, Triggers, add **Device Events, NFC Tag** (name may be "NFC Tag Scanned"). MacroDroid shows "Scan a tag": hold the phone to the sticker. It reads the tag's ID, so the sticker needs no writing. Save.
3. Keep the existing triggers (shortcut, tile) next to it: a macro can have several.
4. Test: lock-screen on is fine, but the screen must be on and unlocked for most phones to read a tag. Touch the sticker: the popup appears, type amount and what, OK, "Added …".
- Optional second tag for the work timer: a new macro `Work timer`, trigger NFC Tag (another sticker), action **Open Website / Launch URL** with `https://jacomo57.github.io/Spending-Management/#work-toggle`. Each touch starts or stops the timer and shows the Work page. If the link opens in the browser instead of the installed app, in Android Settings, Apps, Spend (or Chrome), "Open by default" / "Open supported links" must be on.
- Links the app understands (open the app address followed by): `#add` (add-expense sheet), `#add-income`, `#work` (Work page), `#work-toggle` (start/stop timer). A tag or macro can open any of these instead of the popup if you prefer the full sheet (category, card, date) over the two-question popup.

## The work-timer button, in the background (added 2026-11-20, confirmed on a real phone 2026-11-20)
One NFC button (or any trigger) toggles the timer without opening the app: the first press starts it, the next stops it. The press time is sent with it, so the hours are right even if the app is opened hours later. Do the "Before you start" steps above first (phone key on, MacroDroid installed).
1. MacroDroid, Add Macro, name `Work timer`.
2. Trigger: Device Events, **NFC Tag** (scan your button), or any other trigger you like.
3. Action: **HTTP Request**, exactly like the Quick expense macro (POST, the **Address** from the app, content type `application/json`, block next actions, response code into `code`), with this body. Replace `PASTE-KEY-HERE`, and put the time in with the magic-text button: Hour (24-hour), Minute, Second from the Date/Time list:
   ```
   {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"work":{"stringValue":"toggle"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"},"time":{"stringValue":"{hour}:{minute}:{second}"}}}
   ```
4. Then **If** `code` = 200: **Popup Message** `Timer toggled`; else `NOT sent (code {lv=code})`. (The popup cannot say whether it started or stopped: the app decides that when it receives it.)
- The app applies the press the next time it is open and online (like the expenses), oldest first. Open it to see the timer; the Work page and strip then show the right time. Presses made while the app was closed all replay in order.
- The time pieces must be inserted with the magic-text button: a field showing empty braces `{}:{}:{}` sends nothing readable. Values arriving in braces (`{16}:{17}:{52}`), without leading zeros, or as 12-hour am/pm are all read by the app. If a time still cannot be read, the app shows "Timer press: couldn’t read the time …, used now" with what it received.
- If you press twice by accident, open Work and fix the session's start/end there.
- Two presses within a few seconds can arrive in the wrong order only if the app is open while you press from another phone: not expected.

## One voice button: say an expense or a shift command (added 2026-11-20, sending confirmed on a real phone 2026-11-20)
One free hardware button (or NFC tag, widget, any trigger) opens MacroDroid's voice prompt. What you say is sent to the app in the background, and a popup confirms it only if the server accepted it. The app reads the sentence the next time it is open and online. English only (Voice Input listens in one language).
- **Shift:** say exactly "start shift" or "end shift". "Start" does nothing if a shift is already running and "end" does nothing if none is, so a repeat never flips it the wrong way. The time is when you spoke.
- **Expense:** "coffee 39", "I just spent 39 bucks on coffee", "thirty nine on lunch". The largest number is the amount, and the other words, minus fillers like spent, on, for, bucks, are the place. The amount counts in your "Buying in" currency, also when the phone writes "$39". A sentence with no number still becomes a row (amount 0, your words kept) so you can fix it.
- **Card:** say any word of the card's name as it is in the app: "pizza 40 with Max", "visa 30 for lunch". Only cards whose name has an English word of 3+ letters can be picked this way. Without a card word, the usual card is used.

Do the "Before you start" steps above first (phone key on, MacroDroid installed).
1. MacroDroid, Add Macro, name `Voice add`. Local variables (text): `say`, `code`.
2. Trigger: **Hardware Button / Key** (or Device Events, **NFC Tag**, or a widget). Long press is safest if that button also does something else.
3. Action: **Set Variable** `say` to empty text. Then action: **Voice Input**, output variable `say`, language English.
4. Action: **If** `say` is empty: **Popup Message** `Didn't hear anything`, then **Cancel Macro Actions**, End If.
5. Action: **HTTP Request**: POST, the **Address** from the app, content type `application/json`, "block next actions" on, and in the Settings tab save the **response** into `code`. Body (replace `PASTE-KEY-HERE`; insert `{lv=say}`, `{month_digit}` and the time pieces with the magic-text button):
   ```
   {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"say":{"stringValue":"{lv=say}"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"},"time":{"stringValue":"{hour}:{minute}:{second}"}}}
   ```
6. Popups, only on success. When the server accepts, its reply contains `createTime`; a refusal or no internet does not. Turn off "case sensitive" in each "contains" check.
   - **If** `code` contains `createTime`
     - **If** `say` contains `start shift`: **Popup Message** `Started shift`
     - **Else If** `say` contains `end shift`: **Popup Message** `Ended shift`
     - **Else:** **Popup Message** `Added: {lv=say}`
   - **Else:** **Popup Message** `NOT sent. Say it again.`

**Good to know**
- The popup shows what the server stored, not the app's parsed result (the app reads it when next open). If the words look wrong, open the app and fix the row.
- A double quote (") in what you say would break the message (the popup then says NOT sent). Say it again.

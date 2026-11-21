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
- **Shift:** say "start shift" or "end shift" (other words around it are fine: "ok start shift now"). "Start" does nothing if a shift is already running and "end" does nothing if none is, so a repeat never flips it the wrong way. The time is when you spoke.
- **Expense:** "coffee 39", "I just spent 39 bucks on coffee", "thirty nine on lunch". The largest number is the amount, and the other words, minus fillers like spent, on, for, bucks, are the place. The amount counts in your "Buying in" currency, also when the phone writes "$39". A sentence with no number still becomes a row (amount 0, your words kept) so you can fix it.
- **Card:** say any word of the card's name as it is in the app: "pizza 40 with Max", "visa 30 for lunch". Only cards whose name has an English word of 3+ letters can be picked this way. Without a card word, the usual card is used. Cards from the Cards list count too, even before their first purchase.

Do the "Before you start" steps above first (phone key on, MacroDroid installed).
1. MacroDroid, Add Macro, name `Voice add`. Local variables (text): `say`, `code`.
2. Trigger: **Hardware Button / Key** (or Device Events, **NFC Tag**, or a widget). Long press is safest if that button also does something else.
3. Action: **Set Variable** `say` to empty text. Then action: **Voice Input**, output variable `say`, language English.
4. Action: **If** `say` is empty: **Popup Message** `Didn't hear anything`, then **Cancel Macro Actions**, End If.
5. Action: **HTTP Request**: POST, the **Address** from the app, content type `application/json`, "block next actions" on, and in the Settings tab save the **response** into `code`. Body (replace `PASTE-KEY-HERE`; insert `{lv=say}`, `{month_digit}` and the time pieces with the magic-text button):
   ```
   {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"say":{"stringValue":"{lv=say}"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"},"time":{"stringValue":"{hour}:{minute}:{second}"}}}
   ```
6. Popup, only on success (when the server accepts, its reply contains `createTime`; a refusal or no internet does not):
   - **If** `code` contains `createTime` (case sensitive off): **Popup Message** `✓ {lv=say}`
   - **Else:** **Popup Message** `NOT sent. Say it again.`
   - End If

**Good to know**
- The popup shows what the server stored, not the app's parsed result (the app reads it when next open). If the words look wrong, open the app and fix the row.
- A double quote (") in what you say would break the message (the popup then says NOT sent). Say it again.

# iPhone: the same buttons with the Shortcuts app (added 2026-11-21, NOT tried on a real iPhone)
Shortcuts is built into the iPhone (free). It sends the same message as the MacroDroid macros, so the app needs no change: it reads "Coffee 39.", "Start shift.", "$39" and "Thirty nine shekels on lunch" the same way (checked in the app 2026-11-21). Menu names are from memory and can differ a little between iOS versions.

**Before you start:** in the app, Account, "Add from your phone", Turn on. You need its **Address** and **Key**.
**The key is in the shortcut:** never use Share on these shortcuts (a shared shortcut carries the key). If it was shared by mistake: Account, "New key", and paste the new key into each shortcut.

## Common part: the send block (used by every shortcut below)
These five steps end every shortcut. Add actions with the search bar at the bottom ("Search for actions"). Insert a variable by tapping the spot in the text, then the variable in the bar above the keyboard (or "Select Variable").
1. **Format Date**: tap "Date", choose **Current Date**; tap the format, **Custom**, type `yyyy-MM-dd`. Then **Set Variable**, name `day`.
2. **Format Date** again: Current Date, Custom `HH:mm:ss`. **Set Variable** `clock`.
3. **Text**: the body for that shortcut (given below). Replace `PASTE-KEY-HERE` with the Key; put each `VARIABLE` in with the variable bar, not by typing.
4. **Get Contents of URL**: URL = the **Address**. Tap the arrow / "Show More": Method **POST**; Headers, Add new header: `Content-Type` = `application/json`; Request Body **File**, and choose the **Text** from step 3.
5. **Text** with only the variable **Contents of URL** in it. Then **If** that Text **contains** `createTime`: **Show Notification** `Added` (or `✓` plus the variable). **Otherwise**: Show Notification `NOT sent. Try again.` **End If**.

## Shortcut 1: "Quick expense" (two questions)
New shortcut (+), rename it `Quick expense`.
1. **Ask for Input**: type **Number**, prompt `Amount`. **Set Variable** `amount`.
2. **Ask for Input**: type Text, prompt `What?`. **Set Variable** `what`.
3. The send block, with this body in step 3 (`amount`, `what`, `day` are the variables):
   ```
   {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"amt":{"stringValue":"amount"},"desc":{"stringValue":"what"},"date":{"stringValue":"day"}}}
   ```
Try it: run it, type `1`, `test`. "Added" appears; open the app, see "test" ₪1, delete it.

## Shortcut 2: "Voice add" (expense or start/end shift)
New shortcut, rename `Voice add`. What to say is the same as on Android (see "One voice button" above).
1. **Dictate Text**: Language **English (US)**, Stop Listening **After Pause**. **Set Variable** `say`.
2. **If** `say` **does not have any value**: Show Notification `Didn't hear anything`, then **Stop This Shortcut**. End If.
3. The send block, with this body:
   ```
   {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"say":{"stringValue":"say"},"date":{"stringValue":"day"},"time":{"stringValue":"clock"}}}
   ```
   In step 5 the success notification can show the `say` variable, like the Android popup.

## Optional: "Work timer" (one press toggles)
New shortcut `Work timer`: only the send block, with this body:
```
{"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"work":{"stringValue":"toggle"},"date":{"stringValue":"day"},"time":{"stringValue":"clock"}}}
```

## How to start them (pick any; a shortcut can have several)
- **Home screen icon**: open the shortcut, the ⓘ / share-sheet menu, **Add to Home Screen**.
- **Action Button** (iPhone 15 Pro and newer): Settings, Action Button, swipe to **Shortcut**, choose `Voice add`.
- **Back Tap** (any recent iPhone): Settings, Accessibility, Touch, **Back Tap**, Double Tap (or Triple), choose the shortcut. Tapping the back of the phone runs it.
- **Siri**: say the shortcut's name ("Hey Siri, voice add"). Works with no setup.
- **Control Center / Lock Screen** (iOS 18): edit Control Center, Add a Control, Shortcuts, pick it.
- **NFC sticker**: Shortcuts, **Automation** tab, +, **NFC**, Scan, hold the sticker, name it; choose the shortcut and set **Run Immediately** (otherwise iOS asks first).

## Optional: Apple Pay payments, like the Wallet macro (iOS 17+)
Shortcuts, Automation, +, **Transaction** (name may be "Wallet"). Choose your cards, **Run Immediately**. Action: a new shortcut with the send block and this body, where MERCHANT, AMOUNT and CARD are the shortcut input's Merchant, Amount and Card (tap Shortcut Input, then pick the detail):
```
{"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"title":{"stringValue":"MERCHANT"},"text":{"stringValue":"AMOUNT with CARD"},"date":{"stringValue":"day"}}}
```
The app uses the merchant as the name, reads the amount (₪60.00 or 60.00), and picks the card by a word of its name; if it cannot read the amount the row is added at 0 with the text in its note.

## If it says NOT sent
- Wrong key or body: the reply text in step 5 shows the reason. Add a **Quick Look** on `Contents of URL` to see it.
- A variable shows as its name in the app (a row called "what"): it was typed instead of inserted. Insert it from the variable bar.
- No internet: run it again (it does not retry).

# Phone buttons: add a purchase or run the work timer without opening the app

Rewritten 2026-11-21. Android uses MacroDroid, iPhone uses the built-in Shortcuts app. Every button sends one small message to the app's phone inbox (described in `backend.md`, Phone inbox); the app reads it the next time it is open and online. Nothing is lost while it waits.

**The key is a secret.** It goes into the phone only: never into this repo, a chat or a screenshot.

| Button | What it does | Status |
|---|---|---|
| Quick expense | two questions: amount, what | written from memory, not tried |
| Wallet payment (Android) | a Google Wallet payment becomes a purchase | built from a real notification, 2026-11-17 |
| Work timer | one press starts, the next stops | confirmed on Android 2026-11-20 |
| Voice add | say an expense or "start/end shift" | confirmed on Android 2026-11-20 |
| Everything on iPhone | same four, with Shortcuts | not tried on an iPhone |

**Purchase time (2026-11-23):** every button now sends the time it was pressed, and the purchase shows it under its date. Voice add and the work timer already did. A Quick expense or Wallet / Apple Pay button made before this date sends no time (its purchases show "No time"); to fix one, see "Add the time to an older button" below.

Dropped by choice: "Hey Google" / Gemini / default-assistant triggers (unreliable, and no way to pass the words on).

---

# Android (MacroDroid)

## 1. Set up once
1. In the app: Account, "Add from your phone", Turn on. It shows an **Address** and a **Key**. Keep that screen open (or send yourself the two values privately).
2. Install MacroDroid from Google Play. Free is enough (5 macros). It needs no sensitive permission, except Notification Access for the Wallet macro.
3. Phone Settings, Apps, MacroDroid, Battery: Unrestricted, so Android does not stop it.

## 2. The send step (every macro ends with it)
Add an **HTTP Request** action (Web Interactions) with:
- Method `POST`, URL = the **Address**, content type `application/json`.
- Body: the one given for that macro below, with `PASTE-KEY-HERE` replaced by the **Key**.
- Tick "Block next actions until complete" and save the response into a local variable `code`.

**Insert every `{...}` value with the magic-text button** ("..." or "{ }" next to the field), never by typing. A typed value is sent as the literal words and the row shows `{...}` in curly braces. Date pieces: Year, Month (as a number), Day of month; time pieces: Hour (24-hour), Minute, Second.

Then check the result: **If** `code` contains `createTime` (case sensitive off) → **Popup Message** `Added …`; **Else** → **Popup Message** `NOT sent`. (The server's reply contains `createTime` only when it accepted the message.)

## 3. The macros
Each is: Add Macro, name it, add a trigger (section 4), add the actions listed, save, switch it on.

### Quick expense
Actions:
1. **Set Variable** (local, String) `amount` = "User Prompt", title `Amount`, numeric keyboard if offered.
2. **Set Variable** `what` = "User Prompt", title `What? (can be empty)`.
3. The send step with:
   ```
   {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"amt":{"stringValue":"{lv=amount}"},"desc":{"stringValue":"{lv=what}"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"},"time":{"stringValue":"{hour}:{minute}:{second}"}}}
   ```
Try it: start it, type `1`, `test`. Open the app: a purchase "test", ₪1, today, marked "not on a statement yet". Delete it.

### Wallet payment
The app reads the amount (₪60.00), uses the notification title as the name, and picks the card whose name contains the word after "with" (`with max Total ••5315` → `max`) or the last 4 digits, else your default card. If the amount cannot be read, the purchase is added at 0 with the notification text in its note.
- **Trigger**: Device Events, **Notification Received**, application Google Wallet only, text contains `with` (so only payments match). Allow Notification Access when asked.
- **Action**: the send step with the body below. Insert the notification's title and text with the magic-text button (the list shows what this trigger offers).
  ```
  {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"title":{"stringValue":"TITLE-HERE"},"text":{"stringValue":"TEXT-HERE"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"},"time":{"stringValue":"{hour}:{minute}:{second}"}}}
  ```
- Wrong card: the digits in Wallet (••5315) can differ from the physical card's. Rename the app card to include the issuer word (`Max 1234`), or make it the default.

### Work timer
One press starts the timer, the next stops it. The press time is sent, so the hours are right even if the app is opened hours later; presses made while the app was closed replay in order.
- **Action**: the send step with:
  ```
  {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"work":{"stringValue":"toggle"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"},"time":{"stringValue":"{hour}:{minute}:{second}"}}}
  ```
- The popup cannot say whether it started or stopped (the app decides). Open the app to see the timer.
- The app reads times in braces (`{16}:{17}:{52}`), without leading zeros, or 12-hour with am/pm. If it still cannot, it shows "Timer press: couldn't read the time …, used now" with what it received.
- Pressed twice by mistake: fix the session's start/end on the Work page.

### Voice add
Say an expense or a shift command. English only (Voice Input listens in one language).
- **Shift:** "start shift" or "end shift", other words around it are fine. "Start" does nothing if a shift is running and "end" does nothing if none is, so a repeat never flips it the wrong way. The time is when you spoke.
- **Expense:** "coffee 39", "I just spent 39 bucks on coffee", "thirty nine on lunch". The largest number is the amount; the other words, minus fillers (spent, on, for, bucks…), are the place. The amount counts in your "Buying in" currency, also when the phone writes "$39". No number still makes a row (amount 0, your words kept) so you can fix it.
- **Card:** say any word of the card's name as in the app: "pizza 40 with Max", "visa 30 for lunch". Only card names with an English word of 3+ letters work this way. Otherwise the usual card is used. Cards from the Cards list count even before their first purchase.

Actions (local text variables `say`, `code`):
1. **Set Variable** `say` to empty, then **Voice Input** into `say`, language English.
2. **If** `say` is empty: **Popup Message** `Didn't hear anything`, **Cancel Macro Actions**, End If.
3. The send step with the body below, and the success popup `✓ {lv=say}`.
   ```
   {"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"say":{"stringValue":"{lv=say}"},"date":{"stringValue":"{year}-{month_digit}-{dayofmonth}"},"time":{"stringValue":"{hour}:{minute}:{second}"}}}
   ```
- The popup shows what the server stored, not the app's parsed result. If the words look wrong, fix the row in the app.
- A double quote (") in what you say breaks the message: the popup says NOT sent, say it again.

### Add the time to an older button
For a Quick expense or Wallet payment macro made before 2026-11-23:
1. MacroDroid, open the macro, tap its **HTTP Request** action.
2. In the Body, put the cursor just before the last three characters `}}}`.
3. Type `,"time":{"stringValue":"` (comma first).
4. With the magic-text button insert **Hour (24-hour)**, type `:`, insert **Minute**, type `:`, insert **Second**.
5. Type `"}`. The end of the body now reads `...{dayofmonth}"},"time":{"stringValue":"{hour}:{minute}:{second}"}}}`.
6. Save, run it once (amount `1`, `test`), and check the app shows the time under the date. Delete the test row.

## 4. Triggers (a macro can have several)
- **Hardware Button / Key** (long press is safest if the button does something else): good for Voice add.
- **NFC Tag**: stick a cheap NTAG213 sticker anywhere, add Device Events, NFC Tag, hold the phone to it (the sticker needs no writing). The screen must be on and unlocked. Use a different sticker for each macro.
- **Shortcut Launched**: long-press the home screen, Widgets, MacroDroid, "Macro shortcut".
- **Quick Settings Tile**: MacroDroid settings, Quick Settings Tiles, then add the tile with the pencil button in the pull-down panel.
- **Notification Bar Button**: MacroDroid settings, Notification Bar Options.

## 5. Choosing the card
In the app's Cards panel press **☆ Default** on your main card (press again to clear). The phone uses it when nothing names a card; with no default, the card of your latest purchase. To send a card from a macro, add `,"card":{"stringValue":"Max 5315"}` (name or last 4 digits) inside the body's `fields`.

---

# iPhone (Shortcuts app)

Built in and free; it sends the same messages, so the app needs no change (dictation like "Coffee 39.", "Start shift.", "$39" was checked in the app 2026-11-21). Menu names are from memory and can differ between iOS versions.

**Never use Share on these shortcuts:** a shared shortcut carries your key. If you did: Account, "New key", then paste the new key into each shortcut.

## The send block (every shortcut ends with it)
Add actions with the search bar at the bottom. Insert a variable by tapping the spot in the text, then the variable in the bar above the keyboard.
1. **Format Date**: Current Date, Custom `yyyy-MM-dd`. **Set Variable** `day`.
2. **Format Date**: Current Date, Custom `HH:mm:ss`. **Set Variable** `clock`.
3. **Text**: the shortcut's body (below), with `PASTE-KEY-HERE` replaced by the Key, and each variable name inserted from the variable bar, not typed.
4. **Get Contents of URL**: URL = the **Address**; Show More: Method **POST**, header `Content-Type` = `application/json`, Request Body **File** = the Text from step 3.
5. **Text** containing only **Contents of URL**, then **If** it **contains** `createTime`: **Show Notification** `Added`; **Otherwise**: `NOT sent. Try again.`

## The shortcuts
**Quick expense**: **Ask for Input** (Number, `Amount`) → variable `amount`; **Ask for Input** (Text, `What?`) → `what`; then the send block with
```
{"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"amt":{"stringValue":"amount"},"desc":{"stringValue":"what"},"date":{"stringValue":"day"},"time":{"stringValue":"clock"}}}
```
**Voice add**: **Dictate Text** (English (US), stop after pause) → `say`; **If** `say` does not have any value: notify `Didn't hear anything`, **Stop This Shortcut**; then the send block with
```
{"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"say":{"stringValue":"say"},"date":{"stringValue":"day"},"time":{"stringValue":"clock"}}}
```
What to say is the same as on Android (section "Voice add" above).

**Work timer**: only the send block, with
```
{"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"work":{"stringValue":"toggle"},"date":{"stringValue":"day"},"time":{"stringValue":"clock"}}}
```
**Apple Pay payments (iOS 17+)**: Shortcuts, Automation, +, **Transaction**, pick your cards, **Run Immediately**; action: a shortcut with the send block and the body below, where MERCHANT, AMOUNT and CARD are the Shortcut Input's Merchant, Amount and Card details:
```
{"fields":{"key":{"stringValue":"PASTE-KEY-HERE"},"title":{"stringValue":"MERCHANT"},"text":{"stringValue":"AMOUNT with CARD"},"date":{"stringValue":"day"},"time":{"stringValue":"clock"}}}
```

An older Quick expense or Apple Pay shortcut: open it, tap the **Text** in the send block, put the cursor before the last `}}}`, type `,"time":{"stringValue":"`, insert the variable **clock**, type `"}`. Its send block already makes `clock` (step 2).

## Starting a shortcut
- **Home screen icon**: open the shortcut, its ⓘ menu, Add to Home Screen.
- **Action Button** (iPhone 15 Pro and newer): Settings, Action Button, Shortcut.
- **Back Tap**: Settings, Accessibility, Touch, Back Tap, double or triple tap.
- **Siri**: "Hey Siri, voice add" (works with no setup).
- **Control Center** (iOS 18): add a Control, Shortcuts.
- **NFC sticker**: Shortcuts, Automation, +, NFC, scan the sticker, choose the shortcut, **Run Immediately**.

---

# Links the app understands
Open the app address followed by `#add` (add-expense sheet), `#add-income`, `#work` (Work page) or `#work-toggle` (start/stop the timer and show the Work page). An NFC tag or button can open one of these (Android: **Launch URL** / Open Website; iPhone: **Open URLs**) instead of the popup, if you prefer the full sheet (category, card, date). If the link opens in the browser instead of the installed app, turn on "Open supported links" for the app in the phone's app settings. Not yet confirmed on a phone.

# If it says NOT sent / something looks wrong
- **403**: wrong key (a space at either end, or "New key" / "Turn off" was pressed since) or the body's shape changed. Paste the body again.
- **400**: the body is not valid JSON (a missing quote or bracket, or a double quote in the typed text).
- **No reply / 0**: no internet at that moment. It does not retry; run it again. On iPhone, a Quick Look on `Contents of URL` shows the server's reason.
- **A row named `{...}` in braces, or named after a variable (`what`)**: the value was typed instead of inserted. Delete the row, fix the body, test again.

# Good to know
- Do not type a double quote (") in the "What?" box.
- The statement import later merges with a phone purchase of the same amount within 2 days instead of doubling it.
- Lost phone, or someone saw the key: Account, "New key" (the old one stops at once), then paste the new key into every macro and shortcut.

// Smoke tests for Spend, sorted. Run with: npm test
// Starts its own static server (PORT, default 8770) and, if they are not already running, the Firebase emulators.
// Uses the Edge or Chrome already installed on the PC (no browser download). All accounts are throwaway emulator accounts.
// ONLY=smoke or ONLY=local runs one group. HEADED=1 shows the browser.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = +process.env.PORT || 8770;
const URL = `http://localhost:${PORT}/`;
const ONLY = process.env.ONLY || "";
const XLSX = createRequire(import.meta.url)("xlsx");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "spend-test-"));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" };

const server = http.createServer((q, r) => {
  let rel = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const p = path.resolve(ROOT, rel);
  if (!p.startsWith(ROOT + path.sep) || /(^|[\\/])\./.test(rel) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(p).pipe(r);
});

const up = async u => { try { await fetch(u); return true } catch (e) { return false } };
const emuUp = async () => (await up("http://127.0.0.1:8080/")) && (await up("http://127.0.0.1:9099/"));
let emu = null;
async function startEmu() {
  if (await emuUp()) return;
  console.log("Starting the Firebase emulators…");
  emu = spawn("firebase emulators:start --only auth,firestore --project demo-spend", { cwd: ROOT, shell: true, stdio: "ignore" });
  for (let i = 0; i < 120; i++) { if (await emuUp()) return; await new Promise(r => setTimeout(r, 1000)) }
  throw new Error("The emulators did not start. Try: firebase emulators:start --only auth,firestore --project demo-spend");
}
function stopEmu() {
  if (!emu) return;
  try { if (process.platform == "win32") execSync(`taskkill /pid ${emu.pid} /T /F`, { stdio: "ignore" }); else emu.kill() } catch (e) {}
}

const CODE = "DEMO-INVITE-1", PASS = "test-pass-1";
const run = Date.now().toString(36);
const mail = n => `t${run}${n}@example.invalid`;
let browser, fails = 0, count = 0;
const ctxs = [];
async function open(q = "") {
  const c = await browser.newContext({ locale: "en-US", acceptDownloads: true });
  ctxs.push(c);
  const p = await c.newPage();
  p.on("pageerror", e => { console.log("   page error: " + e.message); fails++ });
  await p.goto(URL + q);
  return p;
}
async function test(name, fn) {
  count++;
  try { await fn(); console.log("ok   " + name) }
  catch (e) { fails++; console.log("FAIL " + name + "\n     " + String(e.message || e).split("\n")[0]) }
}
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`) };
async function total(p, want) {
  try { await p.waitForFunction(w => { const e = document.querySelector("#big .n"); return e && e.textContent == w }, want, { timeout: 15000 }) }
  catch (e) { throw new Error(`total: expected ${want}, got ${await p.locator("#big .n").first().textContent().catch(() => "nothing")}`) }
}
const saved = p => p.waitForFunction(() => document.getElementById("sync").textContent == "Saved", null, { timeout: 15000 });
const rows = p => p.locator("#rows tr:has([data-del])").count();
async function signUp(p, email) {
  await p.locator("#auth").waitFor();
  await p.click("#aswap");
  await p.fill("#aemail", email); await p.fill("#apass", PASS); await p.fill("#acode", CODE);
  await p.click("#ago");
  await p.locator("#app").waitFor();
}
async function signIn(p, email) {
  await p.locator("#auth").waitFor();
  await p.fill("#aemail", email); await p.fill("#apass", PASS);
  await p.click("#ago");
}
async function delAccount(p) {
  if (!(await p.locator("#p-acc").isVisible())) await p.click("#accbtn");
  await p.fill("#delpass", PASS);
  await p.click("#delacc"); await p.click("#delacc");
  await p.locator("#auth").waitFor({ timeout: 20000 });
}
async function paste(p, card, text) {
  if (!(await p.locator("#p-imp").isVisible())) await p.click('[data-p="imp"]');
  if (card != null) await p.fill("#card", card);
  await p.fill("#paste", text);
  await p.click("#go");
  return p.locator("#msg").textContent();
}
async function upload(p, file) {
  if (!(await p.locator("#p-imp").isVisible())) await p.click('[data-p="imp"]');
  await p.setInputFiles("#file", file);
  try { await p.waitForFunction(() => /File read/.test(document.getElementById("msg").textContent), null, { timeout: 15000 }) }
  catch (e) { throw new Error("file not read, message: " + await p.locator("#msg").textContent()) }
}
function xlsx(name, sheets) {
  const wb = XLSX.utils.book_new();
  for (const [n, aoa] of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
  const f = path.join(TMP, name);
  XLSX.writeFile(wb, f);
  return f;
}

async function smoke() {
  const A = mail("a"), B = mail("b");
  let d1, d2, d3;
  await test("sign up with invite, load sample, totals match", async () => {
    d1 = await open(); await signUp(d1, A);
    await d1.click("#sample");
    await total(d1, "₪ 3,325"); eq(await rows(d1), 17, "purchases"); await saved(d1);
  });
  await test("wrong invite code is refused", async () => {
    const p = await open();
    await p.locator("#auth").waitFor(); await p.click("#aswap");
    await p.fill("#aemail", mail("x")); await p.fill("#apass", PASS); await p.fill("#acode", "NOT-A-CODE");
    await p.click("#ago");
    await p.waitForFunction(() => /invite code/.test(document.getElementById("amsg").textContent), null, { timeout: 15000 });
  });
  await test("second device sees the same data and live changes", async () => {
    d2 = await open(); await signIn(d2, A);
    await total(d2, "₪ 3,325");
    await d1.click('tr:has(input[value="Booking.com Hotel"]) [data-del]');
    await total(d1, "₪ 2,635"); await total(d2, "₪ 2,635");
  });
  await test("second account sees none of it", async () => {
    d3 = await open(); await signUp(d3, B);
    await total(d3, "₪ 0"); eq(await rows(d3), 0, "purchases");
  });
  await test("delete all data survives a reload and reaches the other device", async () => {
    await d1.click("#wipe"); await d1.click("#wipe");
    await total(d1, "₪ 0"); await saved(d1);
    await d1.reload(); await d1.locator("#app").waitFor();
    await total(d1, "₪ 0"); eq(await rows(d1), 0, "purchases");
    await total(d2, "₪ 0");
  });
  await test("download my data, then restore it from the file", async () => {
    await d3.click("#sample"); await total(d3, "₪ 3,325"); await saved(d3);
    await d3.click("#accbtn");
    const [dl] = await Promise.all([d3.waitForEvent("download"), d3.click("#dl")]);
    const f = path.join(TMP, "spend-backup-test.json"); await dl.saveAs(f);
    const o = JSON.parse(fs.readFileSync(f, "utf8")); eq(o.data.tx.length, 17, "purchases in the file");
    await d3.click("#wipe"); await d3.click("#wipe"); await total(d3, "₪ 0");
    await d3.setInputFiles("#rsfile", f);
    await d3.waitForFunction(() => /17 purchases/.test(document.getElementById("rsbtn").textContent));
    await d3.click("#rsbtn");
    await total(d3, "₪ 3,325"); await saved(d3);
    await d3.reload(); await d3.locator("#app").waitFor(); await total(d3, "₪ 3,325"); eq(await rows(d3), 17, "purchases");
  });
  await test("delete account removes the login", async () => {
    await delAccount(d1);
    await signIn(d1, A);
    await d1.waitForFunction(() => /Wrong email or password/.test(document.getElementById("amsg").textContent), null, { timeout: 15000 });
    await delAccount(d3);
  });
}

async function local() {
  await test("identical purchases in one file are kept; re-import skips only saved copies", async () => {
    const p = await open("?local=1"), two = "date,description,amount\n2026-11-03,Aroma Cafe,18\n2026-11-03,Aroma Cafe,18";
    eq(await paste(p, "Visa", two), "Added 2 purchases.", "first import");
    await total(p, "₪ 36");
    eq(await paste(p, "Visa", two + "\n2026-11-03,Aroma Cafe,18"), "Added 1 purchase, skipped 2 already saved.", "second import");
    await total(p, "₪ 54"); eq(await rows(p), 3, "purchases");
  });
  await test("refunds import as negative amounts and reduce the total", async () => {
    const p = await open("?local=1");
    eq(await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300\n2026-11-04,Castro,80\n2026-11-05,Zara,-120\n2026-11-06,Wolt,(30)"), "Added 4 purchases.", "import");
    await total(p, "₪ 230");
    await p.locator('tr:has(input[value="Wolt"]) [data-f="amt"]').fill("-50");
    await p.locator('tr:has(input[value="Wolt"]) [data-f="amt"]').press("Tab");
    await total(p, "₪ 210");
  });
  await test("a card statement that is mostly refunds keeps them as refunds", async () => {
    const p = await open("?local=1");
    eq(await paste(p, "Visa", "תאריך רכישה,שם בית עסק,סכום חיוב\n03.11.26,זיכוי א,-120\n04.11.26,זיכוי ב,-30\n05.11.26,חנות,400"), "Added 3 purchases.", "import");
    await total(p, "₪ 250");
    const q = await open("?local=1");
    eq(await paste(q, "Visa", "date,description,amount\n2026-11-05,Zara,-120"), "Added 1 purchase.", "single refund");
    await total(q, "₪ -120");
  });
  await test("bank-style file (spending shown as negative) still imports as spending", async () => {
    const p = await open("?local=1");
    eq(await paste(p, "Bank", "date,description,amount\n2026-11-03,Rent,-4000\n2026-11-05,Shufersal,-200\n2026-11-10,Salary,9000"), "Added 2 purchases.", "import");
    await total(p, "₪ 4,200");
  });
  await test("Isracard-style Excel: charged amount, installments, title and total rows", async () => {
    const f = xlsx("1234_11_2026.xlsx", [["פירוט עסקאות", [
      [], ["פירוט עסקאות", "", "נובמבר 2026"], [],
      ["גולד מסטרקארד - 1234", "", "", "", "", "", "", "₪ 1,000.00"], ["על שם ישראל ישראלי", "", "", "", "", "", "", "לחיוב ב-02.11"], [],
      ["עסקאות למועד חיוב"],
      ["תאריך רכישה", "שם בית עסק", "סכום עסקה", "מטבע עסקה", "סכום חיוב", "מטבע חיוב", "מס' שובר", "פירוט נוסף"],
      ["30.10.26", "שופרסל דיל", 100.5, "₪", 100.5, "₪", "1"],
      ["29.10.26", "AMAZON US", 10, "$", 37, "₪", "2"],
      ["04.10.26", "פלאפל הכיכר", 17, "₪", 17, "₪", "3"],
      ["04.10.26", "פלאפל הכיכר", 17, "₪", 17, "₪", "4"],
      ["15.08.26", "חנות רהיטים", 900, "₪", 300, "₪", "5", "תשלום 3 מתוך 3"],
      ["20.10.26", "זיכוי חנות", -28.5, "₪", -28.5, "₪", "6"],
      ["", "סה\"כ לחיוב החודש בכרטיס בש\"ח", "", "", 443, "₪"], [],
      ["תנאים משפטיים\nהנתונים במסך זה אינם סופיים ונכונים לתאריך 11/11/2026\nהמידע, המוצג, בדף, זה, לא, כולל"],
    ]]]);
    const p = await open("?local=1"); await upload(p, f);
    eq(await p.inputValue("#card"), "Card 1234", "card name found in the file");
    await p.click("#go");
    eq(await p.locator("#msg").textContent(), "Added 6 purchases.", "import");
    await total(p, "₪ 443");
    eq(await p.locator('input[value="חנות רהיטים 3/3"]').count(), 1, "installment label");
    eq(await p.locator('tr:has(input[value="חנות רהיטים 3/3"]) [data-f="date"]').inputValue(), "2026-10-15", "installment date moved to its own month");
    eq(await p.locator('tr:has(input[value="שופרסל דיל"]) select').inputValue(), "Groceries", "category");
  });
  await test("Max-style Excel: two sheets, issuer category, real date cells", async () => {
    const H = ["תאריך עסקה", "שם בית העסק", "קטגוריה", "4 ספרות אחרונות של כרטיס האשראי", "סוג עסקה", "סכום חיוב", "מטבע חיוב", "סכום עסקה מקורי", "מטבע עסקה מקורי", "תאריך חיוב", "הערות"];
    const top = [["כל המשתמשים (1)"], ["5678-MAX Back Total"], ["11/2026"], H];
    const f = xlsx("transaction-details_export_1.xlsx", [
      ["עסקאות במועד החיוב", [...top,
        ["05-08-2026", "ביטוח רכב ישיר", "ביטוח", "5678", "תשלומים", 650.4, "₪", 3252, "₪", "02-11-2026", "תשלום 3 מתוך 5"],
        ["13-10-2026", "המספרה של דני", "קוסמטיקה וטיפוח", "5678", "רגילה", 60, "₪", 60, "₪", "02-11-2026", ""],
        ["23-10-2026", "קיוסק הפינה", "מסעדות, קפה וברים", "5678", "רגילה", 24, "₪", 24, "₪", "02-11-2026", ""],
        ["23-10-2026", "קיוסק הפינה", "מסעדות, קפה וברים", "5678", "רגילה", 24, "₪", 24, "₪", "02-11-2026", ""],
        [new Date(Date.UTC(2026, 9, 27)), "חנות כלשהי", "שונות", "5678", "רגילה", 135.4, "₪", 135.4, "₪", new Date(Date.UTC(2026, 10, 2)), ""],
        [], ["סך הכל"], ["893.80₪"]]],
      ["עסקאות חו\"ל ומט\"ח", [...top,
        ["28-10-2026", "WIZZ AIRDN7SJZ         LONDON        ESP", "טיסות ותיירות", "5678", "חיוב עסקות מיידי", 2249.81, "₪", 629.15, "€", "30-10-2026", ""],
        [], ["סך הכל"], ["2249.81₪"]]]]);
    const p = await open("?local=1"); await upload(p, f);
    eq(await p.inputValue("#card"), "Card 5678", "card name found in the file");
    await p.click("#go");
    eq(await p.locator("#msg").textContent(), "Added 6 purchases.", "import");
    await total(p, "₪ 3,144");
    eq(await p.locator('tr:has(input[value="ביטוח רכב ישיר 3/5"]) [data-f="date"]').inputValue(), "2026-10-05", "installment date");
    eq(await p.locator('tr:has(input[value="חנות כלשהי"]) [data-f="date"]').inputValue(), "2026-10-27", "real date cell");
    eq(await p.locator('tr:has(input[value="המספרה של דני"]) select').inputValue(), "Shopping", "issuer category used");
    eq(await p.locator('tr:has(input[value="קיוסק הפינה"]) select').first().inputValue(), "Eating out", "issuer category used");
    await upload(p, f); await p.click("#go");
    eq(await p.locator("#msg").textContent(), "Added 0 purchases, skipped 6 already saved.", "re-import");
  });
  await test("an empty purchase abandoned on an earlier day is dropped on the next start", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300");
    await p.click("#addp"); eq(await rows(p), 2, "rows after Add");
    await p.reload(); eq(await rows(p), 2, "today's empty row is kept");
    await p.locator('tr:has([data-f="desc"][value=""]) [data-f="date"]').fill("2026-01-01");
    await p.locator('tr:has([data-f="desc"][value=""]) [data-f="date"]').press("Tab");
    await p.reload(); await total(p, "₪ 300"); eq(await rows(p), 1, "rows after reload");
  });
}

let code = 1;
try {
  await new Promise(r => server.listen(PORT, r));
  browser = await chromium.launch({ channel: process.env.BROWSER || "msedge", headless: !process.env.HEADED })
    .catch(() => chromium.launch({ channel: "chrome", headless: !process.env.HEADED }));
  if (!ONLY || ONLY == "local") await local();
  if (!ONLY || ONLY == "smoke") {
    await startEmu();
    await fetch(`http://127.0.0.1:8080/v1/projects/demo-spend/databases/(default)/documents/invites/${CODE}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: '{"fields":{}}' });
    await smoke();
  }
  console.log(`\n${count - fails < 0 ? 0 : count} tests, failures: ${fails}`);
  code = fails ? 1 : 0;
} catch (e) { console.log("Could not run the tests: " + (e.stack || e)) }
finally {
  for (const c of ctxs) await c.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  server.close(); stopEmu();
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(code);
}

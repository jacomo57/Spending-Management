// Smoke tests for Spend, sorted. Run with: npm test
// Starts its own static server (PORT, default 8770) and, if they are not already running, the Firebase emulators.
// Uses the Edge or Chrome already installed on the PC (no browser download). All accounts are throwaway emulator accounts.
// ONLY=smoke, ONLY=local or ONLY=pwa runs one group. HEADED=1 shows the browser.
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
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };

// site.down: the server drops every connection (the site is unreachable). site.over: files served with other content (a "deploy").
const site = { down: false, over: {} };
const server = http.createServer((q, r) => {
  if (site.down) return q.socket.destroy();
  let rel = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const p = path.resolve(ROOT, rel);
  if (!p.startsWith(ROOT + path.sep) || /(^|[\\/])\./.test(rel) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-store" });
  if (rel in site.over) return r.end(site.over[rel]);
  fs.createReadStream(p).pipe(r);
});
// Pretend a new version was published: sw.js and index.html carry a new version name, and the page a mark we can read.
function deploy(tag) {
  const f = n => fs.readFileSync(path.join(ROOT, n), "utf8");
  site.over["sw.js"] = f("sw.js").replace(/const VERSION="[^"]*"/, `const VERSION="${tag}"`);
  site.over["index.html"] = f("index.html").replace(/\?v=[\w-]*/g, "?v=" + tag).replace("<title>", `<meta name="deploy" content="${tag}"><title>`);
}
const mark = p => p.evaluate(() => (document.querySelector('meta[name="deploy"]') || {}).content || "");
const controlled = p => p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 });
const cached = (p, name) => p.evaluate(async n => (await (await caches.open(n)).keys()).map(r => r.url), name);

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
// A script error on the page, or anything the Content Security Policy in index.html blocks, fails the run.
function watch(p) {
  p.on("pageerror", e => { console.log("   page error: " + e.message); fails++ });
  p.on("console", m => { if (/Content Security Policy/.test(m.text())) { console.log("   blocked by the page's policy: " + m.text().slice(0, 300)); fails++ } });
}
// The tool buttons live in the More menu: a click on one of them opens the menu first when it is closed.
const MENU = /data-p|#repb|#wipe|#accbtn|#themeb/;
function menuClicks(p) {
  const click = p.click.bind(p);
  p.click = async (sel, ...a) => { if (typeof sel == "string" && MENU.test(sel) && !(await p.locator("#menu").isVisible())) await click("#more"); return click(sel, ...a) };
}
async function open(q = "") {
  const c = await browser.newContext({ locale: "en-US", acceptDownloads: true });
  ctxs.push(c);
  const p = await c.newPage();
  watch(p); menuClicks(p);
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
// The list shows the latest 5 until Show all is pressed; this counts every row.
// The Recurring form is hidden until + Add recurring is pressed.
const recOpen = async p => { if (!(await p.locator("#rdesc").isVisible())) await p.click("#recnew") };
const rows = async p => { const b = p.locator("#showall"); if (await b.isVisible() && /Show all/.test(await b.textContent())) await b.click(); return p.locator("#rows tr:has([data-del])").count() };
// Income and left over are not on the main screen any more: they are the 2nd and 3rd big numbers of the report.
const repIn = async (p, inc, left) => { await p.click("#repb"); await text(p, "#report .rbig div:nth-child(2) b", inc); if (left != null) await text(p, "#report .rbig div:nth-child(3) b", left); await p.click("#pgback") };
const repBigCount = async p => { await p.click("#repb"); await text(p, "#report .rbig b", "₪"); const n = await p.locator("#report .rbig div").count(); await p.click("#pgback"); return n };
const today = (d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"))(new Date());
const text = async (p, sel, want) => {
  try { await p.waitForFunction(([s, w]) => { const e = document.querySelector(s); return e && e.textContent.includes(w) }, [sel, want], { timeout: 15000 }) }
  catch (e) { throw new Error(`${sel}: expected to contain ${want}, got ${await p.locator(sel).first().textContent({ timeout: 1000 }).catch(() => "nothing")}`) }
};
async function setField(loc, val) { await loc.fill(val); await loc.press("Tab") }
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
  await test("Show button reveals and hides the password", async () => {
    const p = await open(); await p.locator("#auth").waitFor();
    await p.fill("#apass", "abc123");
    await p.click("#ashow"); eq(await p.getAttribute("#apass", "type"), "text", "after Show"); eq(await p.textContent("#ashow"), "Hide", "button");
    eq(await p.inputValue("#apass"), "abc123", "typed text kept");
    await p.click("#ashow"); eq(await p.getAttribute("#apass", "type"), "password", "after Hide");
  });
  await test("wrong invite code is refused", async () => {
    const p = await open();
    await p.locator("#auth").waitFor(); await p.click("#aswap");
    await p.fill("#aemail", mail("x")); await p.fill("#apass", PASS); await p.fill("#acode", "NOT-A-CODE");
    await p.click("#ago");
    await p.waitForFunction(() => /invite code/.test(document.getElementById("amsg").textContent), null, { timeout: 15000 });
  });
  await test("second device sees the same data and live changes", async () => {
    d2 = await open(); await signIn(d2, A); await d2.selectOption("#month", "all");
    await total(d2, "₪ 3,325");
    await d1.click('tr:has(input[value="Booking.com Hotel"]) [data-del]');
    await total(d1, "₪ 2,635"); await total(d2, "₪ 2,635");
  });
  await test("second account sees none of it", async () => {
    d3 = await open(); await signUp(d3, B);
    await total(d3, "₪ 0"); eq(await rows(d3), 0, "purchases");
  });
  await test("income and budgets reach the second device and survive signing out", async () => {
    await d1.click('[data-p="bud"]');
    await setField(d1.locator("#btotal"), "5000");
    await addInc(d1);
    await setField(d1.locator('tr.inc [data-f="desc"]'), "Salary");
    await setField(d1.locator('tr.inc [data-f="amt"]'), "9000");
    await saved(d1);
    await repIn(d2, "₪ 9,000"); await total(d2, "₪ 2,635");
    await d2.selectOption("#month", "2026-11"); await text(d2, "#budline", "₪ 5,000");
    await d2.click("#accbtn"); await d2.click("#signout");
    await signIn(d2, A); await d2.locator("#app").waitFor();
    await repIn(d2, "₪ 9,000");
    await d2.selectOption("#month", "2026-11"); await text(d2, "#budline", "₪ 5,000");
    await d2.selectOption("#month", "all");
  });
  await test("a split reaches the second device; removing a part and Undo reach it too", async () => {
    await d1.selectOption("#month", "all"); await d2.selectOption("#month", "all");
    const desc = await d1.locator('#rows tr:not(.inc):has([data-del]) [data-f="desc"]').first().inputValue();
    const row = p => p.locator(`#rows tr:has([data-f="desc"][value="${desc}"])`).first();
    await row(d1).locator("select[data-id]").selectOption({ label: "Split…" });
    await row(d1).locator('[data-sp][data-f="cat"]').selectOption("Health");
    await setField(row(d1).locator('[data-sp][data-f="amt"]'), "1");
    await saved(d1);
    await d2.waitForFunction(d => [...document.querySelectorAll("#rows tr")].some(r => r.querySelector(`[data-f="desc"][value="${d}"]`) && r.querySelector(".sp")), desc, { timeout: 15000 });
    await row(d1).locator("[data-spdel]").click(); await saved(d1);
    await d2.waitForFunction(d => [...document.querySelectorAll("#rows tr")].some(r => r.querySelector(`[data-f="desc"][value="${d}"]`) && !r.querySelector(".sp")), desc, { timeout: 15000 });
    await d1.click("#undo"); await saved(d1);
    await d2.waitForFunction(d => [...document.querySelectorAll("#rows tr")].some(r => r.querySelector(`[data-f="desc"][value="${d}"]`) && r.querySelector(".sp")), desc, { timeout: 15000 });
    await row(d1).locator("[data-spdel]").click(); await saved(d1);
    await d2.waitForFunction(d => [...document.querySelectorAll("#rows tr")].some(r => r.querySelector(`[data-f="desc"][value="${d}"]`) && !r.querySelector(".sp")), desc, { timeout: 15000 });
  });
  await test("delete all data survives a reload and reaches the other device", async () => {
    await d1.click("#wipe"); await d1.click("#wipe");
    await total(d1, "₪ 0"); await saved(d1);
    await d1.reload(); await d1.locator("#app").waitFor();
    await total(d1, "₪ 0"); eq(await rows(d1), 0, "purchases");
    await total(d2, "₪ 0");
  });
  await test("download my data, then restore it from the file", async () => {
    await d3.click("#sample"); await d3.selectOption("#month", "all"); await total(d3, "₪ 3,325"); await saved(d3);
    await d3.click("#accbtn");
    const [dl] = await Promise.all([d3.waitForEvent("download"), d3.click("#dl")]);
    const f = path.join(TMP, "spend-backup-test.json"); await dl.saveAs(f);
    const o = JSON.parse(fs.readFileSync(f, "utf8")); eq(o.data.tx.length, 17, "purchases in the file");
    await d3.click("#wipe"); await d3.click("#wipe"); await total(d3, "₪ 0");
    await d3.setInputFiles("#rsfile", f);
    await d3.waitForFunction(() => /17 purchases/.test(document.getElementById("rsbtn").textContent));
    await d3.click("#rsbtn");
    await total(d3, "₪ 3,325"); await saved(d3);
    await d3.reload(); await d3.locator("#app").waitFor(); await d3.selectOption("#month", "all"); await total(d3, "₪ 3,325"); eq(await rows(d3), 17, "purchases");
  });
  await test("a month too big for the server shows Couldn't save, after a normal save worked", async () => {
    const p = await open(); await signUp(p, mail("r"));
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300"); await total(p, "₪ 300"); await saved(p);
    // A row whose date is not a proper one (a 3-digit year from a badly typed statement) is saved in the "none" document.
    await p.evaluate(() => { S.tx.push({ id: "odd", date: "202-02-01", desc: "Odd", amt: 5, card: "Visa", cat: "Other" }); save() });
    await p.waitForFunction(() => !C.pend, null, { timeout: 15000 }); eq(await p.textContent("#sync"), "Saved", "odd date saved");
    eq(await p.evaluate(() => Object.keys(C.syn.months).sort().join()), "2026-11,none", "month documents");
    await p.evaluate(() => { S.tx.push({ id: "big", date: "2026-10-01", desc: "x".repeat(900001), amt: 1, card: "Visa", cat: "Other" }); save() });
    await text(p, "#sync", "Couldn’t save");
    await p.evaluate(() => { S.tx = S.tx.filter(t => t.id != "big") });
    await delAccount(p);
  });
  await test("phone inbox: the key lets a signed-out sender add a purchase; a wrong key is refused; a statement row merges with it", async () => {
    const p = await open(); await signUp(p, mail("ph"));
    await paste(p, "Visa 1234", "date,description,amount\n" + today + ",Zara,300"); await total(p, "₪ 300"); await saved(p);
    await p.click("#accbtn"); await p.click("#pon"); await p.locator("#pkeyv").waitFor();
    const url = await p.inputValue("#purl"), key = await p.inputValue("#pkeyv");
    eq(key.length >= 20, true, "key length");
    const send = (k, f) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries({ key: k, ...f }).map(([a, b]) => [a, { stringValue: b }])) }) }).then(r => r.status);
    eq(await send("wrong-key-0123456789-0123456789", { amt: "45", desc: "Kiosk" }), 403, "wrong key");
    eq(await send(key, { amt: "45.50", desc: "Shufersal", date: today }), 200, "typed item");
    await total(p, "₪ 346");
    // A raw payment notification: the amount, merchant and card are read from its words.
    eq(await send(key, { title: "Aroma Cafe", text: "₪18.00 with Visa ••••1234" }), 200, "notification item");
    await total(p, "₪ 364");
    eq(await p.evaluate(() => S.tx.filter(t => t.auto).map(t => [t.desc, t.amt, t.card, t.cat, t.date == ymd()].join("|")).sort().join(" ; ")), "Aroma Cafe|18|Visa 1234|Eating out|true ; Shufersal|45.5|Visa 1234|Groceries|true", "rows from the phone");
    await text(p, 'tr:has([data-f="desc"][value="Shufersal"]) small.amt', "not on a statement yet");
    await saved(p);
    eq(await p.evaluate(async () => (await C.F.getDocsFromServer(C.F.collection(C.db, "users", C.user.uid, "inbox"))).size), 0, "inbox emptied");
    await p.reload(); await p.locator("#app").waitFor(); await total(p, "₪ 364"); eq(await rows(p), 3, "rows after reload");
    // The statement arrives: same amounts, its own wording. The phone rows become the statement rows instead of doubling.
    const msg = await paste(p, "Visa 1234", "date,description,amount\n" + today + ",SHUFERSAL DEAL 42,45.50\n" + today + ",AROMA TLV,18\n" + today + ",Zara,300");
    eq(/matched 2 you had already added/.test(msg) && /Added 0 purchases/.test(msg), true, "import message: " + msg);
    await total(p, "₪ 364"); eq(await rows(p), 3, "rows after the statement");
    eq(await p.evaluate(() => S.tx.filter(t => t.auto).length + "|" + S.tx.map(t => t.desc).sort().join()), "0|AROMA TLV,SHUFERSAL DEAL 42,Zara", "merged rows");
    // New key: the old one stops working. Turned off: nothing is accepted.
    await p.click("#accbtn"); await p.click("#pnew"); await p.waitForFunction(k => { const e = document.getElementById("pkeyv"); return e && e.value != k }, key);
    eq(await send(key, { amt: "5" }), 403, "old key after New key");
    const key2 = await p.inputValue("#pkeyv"); eq(await send(key2, { amt: "5", desc: "x" }), 200, "new key works"); await total(p, "₪ 369");
    await p.click("#poff"); await p.locator("#pon").waitFor();
    eq(await send(key2, { amt: "5" }), 403, "after Turn off");
    await delAccount(p);
  });
  await test("delete account removes the login", async () => {
    await delAccount(d1);
    await signIn(d1, A);
    await d1.waitForFunction(() => /Wrong email or password/.test(document.getElementById("amsg").textContent), null, { timeout: 15000 });
    await delAccount(d3);
  });
}

async function addInc(p) { await p.click("#addp"); await p.selectOption('tr:has([data-f="desc"][value=""]) select[data-id]', "__inc"); await p.waitForSelector("tr.inc") }
async function local() {
  await test("identical purchases in one file are kept; re-import skips only saved copies", async () => {
    const p = await open("?local=1"), two = "date,description,amount\n2026-11-03,Aroma Cafe,18\n2026-11-03,Aroma Cafe,18";
    eq(await paste(p, "Visa", two), "Added 2 purchases.", "first import");
    await total(p, "₪ 36");
    eq(await paste(p, "Visa", two + "\n2026-11-03,Aroma Cafe,18"), "Added 1 purchase, skipped 2 already saved.", "second import");
    await total(p, "₪ 54"); eq(await rows(p), 3, "purchases");
  });
  await test("search filters the list by every word and shows a found line", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Aroma Cafe,18\n2026-11-04,Aroma Bakery,45\n2026-11-05,Zara,450.9\n2026-11-06,קפה גן,20");
    await total(p, "₪ 534");
    await p.fill("#q", "aroma"); eq(await rows(p), 2, "aroma rows"); await text(p, "#found", "2 found, ₪ 63");
    await p.fill("#q", "aroma 45"); eq(await rows(p), 1, "two words"); await text(p, "#found", "1 found, ₪ 45");
    await p.fill("#q", "450"); eq(await rows(p), 1, "amount"); await total(p, "₪ 534");
    await p.fill("#q", "קפה"); eq(await rows(p), 1, "hebrew");
    await p.fill("#q", ""); eq(await rows(p), 4, "cleared"); eq(await p.locator("#found").isHidden(), true, "found hidden");
    await p.fill("#q", "zara"); await p.click("#addp"); eq(await p.inputValue("#q"), "", "search cleared by add"); eq(await rows(p), 5, "new row visible");
  });
  await test("More menu holds the tools; theme switch Auto/Light/Dark is kept; the list shows the latest 5 until Show all", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-01,A one,1\n2026-11-02,B two,2\n2026-11-03,C three,3\n2026-11-04,D four,4\n2026-11-05,E five,5\n2026-11-06,F six,6\n2026-11-07,G seven,7");
    await total(p, "₪ 28");
    eq(await p.locator("#menu").isHidden(), true, "menu closed");
    await p.locator("#more").click(); eq(await p.locator("#menu").isVisible(), true, "menu open");
    eq((await p.locator("#menu button").allTextContents()).slice(0, 7).join("|"), "Import|Cards|Recurring|Budget|Report|Merchants|Backup", "menu order (Account is called Backup in local mode)");
    await p.keyboard.press("Escape"); eq(await p.locator("#menu").isHidden(), true, "Escape closes");
    await p.locator("#more").click(); await p.locator("#more").click(); eq(await p.locator("#menu").isHidden(), true, "button closes");
    await p.locator("#more").click(); await p.locator("main h1").click(); eq(await p.locator("#menu").isHidden(), true, "outside click closes");
    await p.locator("#more").click(); await p.locator("#menu [data-p=bud]").click(); eq(await p.locator("#p-bud").isVisible(), true, "panel opens"); eq(await p.locator("#menu").isHidden(), true, "menu closes after a choice");
    await p.locator("#more").click(); await p.locator("#themeb").click(); eq(await p.locator("#themeb").textContent(), "Theme: Light", "light"); eq(await p.evaluate(() => document.documentElement.dataset.theme), "light", "light set");
    await p.locator("#themeb").click(); eq(await p.evaluate(() => document.documentElement.dataset.theme), "dark", "dark set");
    eq(await p.evaluate(() => [...document.querySelectorAll("meta[name=theme-color]")].map(m => m.content).join()), "#0E1626,#0E1626", "browser bar follows");
    await p.reload(); eq(await p.evaluate(() => document.documentElement.dataset.theme), "dark", "kept after reload");
    await p.locator("#more").click(); await p.locator("#themeb").click(); eq(await p.evaluate(() => document.documentElement.dataset.theme || "none"), "none", "auto follows the device");
    eq(await p.locator("#rows tr:has([data-del])").count(), 5, "latest 5"); await text(p, "#showall", "latest 5 of 7");
    eq(await p.locator("#rows tr:has([data-del]) [data-f=desc]").first().inputValue(), "G seven", "newest first");
    await p.click("#showall"); eq(await p.locator("#rows tr:has([data-del])").count(), 7, "all 7");
    await p.click("#showall"); eq(await p.locator("#rows tr:has([data-del])").count(), 5, "back to 5");
    await p.fill("#q", "a"); await total(p, "₪ 28"); eq(await p.locator("#allrow").isHidden(), true, "no limit while searching");
  });
  await test("main screen shows the 4 biggest categories; ☆ picks which show (saved, Undo); order follows My order", async () => {
    const p = await open("?local=1"), names = () => p.locator("#cats .cat.short .cn").allTextContents().then(a => a.join("|"));
    await paste(p, "Visa", `date,description,amount\n${today},Rent payment,4000\n${today},Shufersal,500\n${today},Zara,300\n${today},Wolt,200\n${today},Gett,100\n${today},Netflix,50`);
    eq(await names(), "Rent & payments|Groceries|Shopping|Eating out", "top 4 by size");
    eq(await p.locator("#cats [data-ren]").count(), 0, "no editing controls on the short list");
    await p.click("#catall"); eq(await p.locator("#cats [data-ren]").count(), 9, "all categories with editing"); eq(await p.locator("#addcat").isVisible(), true, "add category shown");
    await p.locator('#cats .cat:has([value="Rent & payments"]) .pin').click();
    await p.locator('#cats .cat:has([value="Transport"]) .pin').click();
    await p.click("#catall"); eq(await names(), "Groceries|Shopping|Eating out|Transport", "rent hidden, transport added");
    await p.reload(); eq(await names(), "Groceries|Shopping|Eating out|Transport", "kept after reload");
    await p.click("#catall"); await p.locator('#cats .cat:has([value="Shopping"]) .pin').click();
    await p.click("#undo"); await p.click("#catall"); eq(await names(), "Groceries|Shopping|Eating out|Transport", "undo");
    await p.click('[data-cs="manual"]'); eq(await names(), "Groceries|Eating out|Transport|Shopping", "My order");
    await p.locator('#cats .cat.short[data-c="Transport"]').click(); await text(p, "#chip", "Transport");
    await p.click("#catall"); await setField(p.locator('#cats [value="Transport"]'), "Travel"); await p.click("#catall");
    eq(await names(), "Groceries|Eating out|Travel|Shopping", "rename keeps the pick");
    await p.click("#catall"); await p.click("#catreset"); await p.click("#catall"); eq(await names(), "Groceries|Eating out|Rent & payments|Shopping", "back to the 4 biggest (My order)");
  });
  await test("Recurring: the add form opens from a button; an app left open adds the new month's bill when it returns to the front", async () => {
    const c = await browser.newContext({ locale: "en-US", timezoneId: "Asia/Jerusalem" }); ctxs.push(c);
    const p = await c.newPage(); watch(p); menuClicks(p);
    await p.clock.install({ time: new Date("2026-10-31T10:00:00Z") });
    await p.goto(URL + "?local=1");
    await p.click('[data-p="rec"]');
    eq(await p.locator("#rdesc").isHidden(), true, "form hidden"); eq(await p.locator("#recnew").isVisible(), true, "button shown");
    await p.click("#recnew"); eq(await p.locator("#rdesc").isVisible(), true, "form open"); eq(await p.locator("#recnew").isHidden(), true, "button hidden while open");
    await p.click("#rcancel"); eq(await p.locator("#rdesc").isHidden(), true, "cancel closes");
    await p.click("#recnew"); await p.fill("#rdesc", "Rent"); await p.fill("#ramt", "3000"); await p.fill("#rday", "1"); await p.click("#radd");
    eq(await p.locator("#rdesc").isHidden(), true, "closed after add"); eq(await p.locator("#recnew").isVisible(), true, "button back");
    eq(await p.evaluate(() => S.tx.filter(t => String(t.id).startsWith("rec-")).map(t => t.date).join()), "2026-10-01", "October bill");
    await p.clock.setSystemTime(new Date("2026-11-01T10:00:00Z"));
    await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    eq(await p.evaluate(() => S.tx.filter(t => String(t.id).startsWith("rec-")).map(t => t.date).join()), "2026-10-01,2026-11-01", "November bill added without reload");
  });
  await test("compare shows two months per category with the change, and the trend strip picks a month", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300\n2026-10-04,Zara,100\n2026-10-05,Wolt,50");
    eq(await p.locator("#cmp").isHidden(), true, "hidden at first");
    eq(await p.locator("#bmb").isHidden(), true, "no Bars button without a category budget");
    await p.locator(".cat.short").first().click(); eq(await p.locator("#clearcat").count(), 1, "category filter on");
    await p.click("#cmpb");
    eq(await p.locator("#cats").isHidden(), true, "compare replaces the category list"); eq(await p.locator("#catall").isHidden(), true, "no Edit while comparing");
    eq(await p.locator('[data-cs="size"]').isHidden(), true, "no sort buttons while comparing"); eq(await p.textContent("#cmpb"), "Done", "Compare becomes Done");
    eq(await p.locator("#clearcat").count(), 0, "opening compare clears the category filter");
    const first = await p.locator(".cmpt .cr").nth(1).innerText();
    eq(/₪ 300/.test(first) && /₪ 100/.test(first) && /↑ ₪ 200 \(200%\)/.test(first), true, "first row: " + first);
    const tot = await p.locator(".cmpt .cr.tot").innerText();
    eq(/Total spent/.test(tot) && /₪ 300/.test(tot) && /₪ 150/.test(tot) && /↑ ₪ 150 \(100%\)/.test(tot), true, "total row: " + tot);
    eq(await p.locator(".trend button").count(), 2, "trend months");
    await p.locator('.trend button[data-tm="2026-10"]').click();
    eq(await p.inputValue("#month"), "2026-10", "tap picks month");
    await total(p, "₪ 150");
    await p.click("#cmpb"); eq(await p.locator("#cmp").isHidden(), true, "hidden again"); eq(await p.locator("#cats").isVisible(), true, "list back");
    await p.click("#catall"); eq(await p.locator("#cmpb").isHidden(), true, "no Compare while editing"); await p.click("#catall");
    await p.evaluate(() => { S.tx = S.tx.filter(t => t.date >= "2026-11-01"); save(); render() });
    eq(await p.locator("#cmpb").isHidden(), true, "no Compare with only one month");
  });
  await test("merchants panel re-sorts a merchant, the year entry sums a year, a note is searchable", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300\n2025-12-04,Zara,100");
    await p.selectOption("#month", "2026"); await total(p, "₪ 300");
    await p.selectOption("#month", "all"); await total(p, "₪ 400");
    await p.locator("tr select[data-id]").first().selectOption("Health");
    await p.click('[data-p="mer"]');
    await p.selectOption('[data-mk="zara"]', "Groceries");
    eq(await p.locator("tr select[data-id]").nth(1).inputValue(), "Groceries", "other row follows");
    await p.fill('[data-f="note"] >> nth=0', "birthday gift"); await p.press('[data-f="note"] >> nth=0', "Tab");
    await p.fill("#q", "birthday"); eq(await rows(p), 1, "note found");
    await p.fill("#q", "");
    await p.click('[data-delmk="zara"]'); eq(await p.locator("[data-mk]").count(), 0, "forgotten");
  });
  await test("report shows totals, categories and entries for a month, and exports to Excel", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300\n2026-11-05,קפה גן,20\n2026-10-04,Zara,100");
    await p.selectOption("#month", "2026-11");
    await p.click("#repb");
    eq(await p.locator("#report").isVisible(), true, "report open");
    eq(await p.locator("#report .rbig b").first().innerText(), "₪ 320", "spent");
    eq(/↑ ₪ 220 against/.test(await p.locator("#report .sub").nth(1).innerText()), true, "against last month");
    eq(await p.locator("#report table").first().locator("tbody tr").count() >= 1, true, "category rows");
    eq(await p.locator("#report h3", { hasText: "All entries (2)" }).count(), 1, "two entries");
    eq(await p.locator("#report td", { hasText: "קפה גן" }).count() >= 1, true, "hebrew present");
    await p.uncheck("[data-rl]"); eq(await p.locator("#report h3", { hasText: "All entries" }).count(), 0, "list hidden");
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("[data-rx]")]);
    eq(/^spending-2026-11\.xlsx$/.test(dl.suggestedFilename()), true, "excel file " + dl.suggestedFilename());
    await p.click("#pgback"); eq(await p.locator("#report").isHidden(), true, "closed");
  });
  await test("selected-expenses and trend reports follow the filters and the months", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300\n2026-11-05,Aroma Cafe,20\n2026-10-04,Zara,100");
    await p.fill("#q", "zara"); await p.selectOption("#month", "2026-11");
    await p.click("#repb"); await p.selectOption("[data-rt]", "sel");
    eq(await p.locator("#report .rbig b").first().innerText(), "₪ 300", "selected total");
    eq(await p.locator("#report h3", { hasText: "All entries (1)" }).count(), 1, "one entry");
    eq(/Search: zara/.test(await p.locator("#report .sub").first().innerText()), true, "filters described");
    await p.selectOption("[data-rt]", "trend");
    eq(await p.locator("#report h2").innerText(), "Trend: last 2 months", "two months");
    eq(await p.locator("#report table").first().locator("tbody tr").count(), 2, "month rows");
    eq(/↑ ₪ 220/.test(await p.locator("#report table").first().innerText()), true, "change 100 to 320");
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("[data-rx]")]);
    eq(dl.suggestedFilename(), "spending-trend.xlsx", "trend excel");
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
  await test("bank-style file: negatives import as spending, positives as income; re-import skips both", async () => {
    const p = await open("?local=1"), f = "date,description,amount\n2026-11-03,Rent,-4000\n2026-11-05,Shufersal,-200\n2026-11-10,Salary,9000";
    eq(await paste(p, "Bank", f), "Added 2 purchases and 1 income.", "import");
    await total(p, "₪ 4,200"); await repIn(p, "₪ 9,000", "₪ 4,800");
    eq(await p.locator('tr.inc:has(input[value="Salary"]) select[data-id]').inputValue(), "", "income has no category");
    eq(await paste(p, "Bank", f), "Added 0 purchases, skipped 3 already saved.", "re-import");
  });
  await test("add income by hand; giving it a category turns it into a payback that lowers spending", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", `date,description,amount\n${today},Shufersal,400\n${today},Zara,100`);
    await addInc(p);
    await setField(p.locator('tr.inc [data-f="desc"]'), "Partner");
    await setField(p.locator('tr.inc [data-f="amt"]'), "-150");
    await total(p, "₪ 500"); await repIn(p, "₪ 150", "₪ -350");
    eq(await p.locator('tr.inc [data-f="amt"]').inputValue(), "150", "income amount is kept positive");
    await p.locator("tr.inc select[data-id]").selectOption("Groceries");
    await total(p, "₪ 350"); await repIn(p, "₪ 0", "₪ -350"); /* a payback is not income */
    await text(p, '.bw[data-c="Groceries"] .amt', "₪ 250");
    eq(await p.locator('tr:has(input[value="Zara"]) select[data-id]').inputValue(), "Shopping", "payback did not re-sort purchases");
    await p.reload(); await total(p, "₪ 350");
    eq(await p.evaluate(() => CL.join()), "Visa", "income adds no card");
  });
  await test("recurring income is added as income, not spending", async () => {
    const p = await open("?local=1");
    await p.click('[data-p="rec"]');
    await recOpen(p); await p.fill("#rdesc", "Salary"); await p.fill("#ramt", "9000"); await p.selectOption("#rkind", "inc");
    eq(await p.locator("#rcard").isVisible(), false, "card choice hidden for income");
    await p.click("#radd");
    await total(p, "₪ 0"); await repIn(p, "₪ 9,000"); eq(await p.locator("tr.inc").count(), 1, "income rows");
    await p.reload(); await repIn(p, "₪ 9,000"); eq(await p.locator("tr.inc").count(), 1, "income rows after reload");
  });
  await test("budgets: left this month, bar against the budget, follows a renamed category", async () => {
    const p = await open("?local=1"), mo = today.slice(0, 7);
    await paste(p, "Visa", `date,description,amount\n${today},Shufersal,450\n${today},Zara,100`);
    await p.click('[data-p="bud"]');
    await setField(p.locator("#btotal"), "1000");
    await setField(p.locator('[data-bi="0"]'), "500");
    eq(await p.locator("#budline").count(), 0, "no budget line for All time");
    await p.selectOption("#month", mo);
    await text(p, "#budline", "₪ 450 left of ₪ 1,000");
    await text(p, '.bw[data-c="Groceries"] small', "of ₪ 500");
    eq(await p.locator('.bw[data-c="Groceries"] .bar i').getAttribute("style").then(s => /--warn/.test(s)), true, "amber at 90%");
    await p.click("#catall"); await setField(p.locator('[data-ren="0"]'), "Food");
    await text(p, '.bw[data-c="Food"] small', "of ₪ 500");
    await paste(p, "Visa", `date,description,amount\n${today},Shufersal Deal,600`);
    await p.selectOption("#month", mo);
    eq(await p.locator('.bw.over[data-c="Food"]').count(), 1, "over budget");
    await text(p, "#budline", "₪ 150 over the ₪ 1,000 budget");
    await p.reload(); await p.selectOption("#month", mo); await text(p, "#budline", "over the ₪ 1,000 budget");
  });
  await test("main screen: spent is the headline, left of budget a small line; trip strip shows when Buying in is not the home currency", async () => {
    const p = await open("?local=1"), mo = today.slice(0, 7);
    await p.evaluate(([d]) => { S.tx = [{ id: "t1", date: d, desc: "Bar", amt: 200, card: "My card", cat: "Other", fx: { c: "EUR", a: 50, r: 4 } }, { id: "t2", date: d, desc: "Rent", amt: 300, card: "My card", cat: "Other" }]; S.budget = { total: 1000, cats: {} }; save(); render() }, [today]);
    await p.selectOption("#month", mo);
    await text(p, "#budline", "₪ 500 left of ₪ 1,000");
    await total(p, "₪ 500");
    eq(await p.locator("#trip").isVisible(), false, "no strip at home");
    await p.evaluate(() => { S.buy = "EUR"; save(); render() });
    await text(p, "#trip", "€ 50 spent"); await text(p, "#trip", "₪ 200");
    await p.evaluate(() => { S.budget.total = 0; save(); render() });
    eq(await p.locator("#budline").count(), 0, "no budget line without a budget");
  });
  await test("work log: Israeli overtime and Shabbat pay, saved rate per session, timer, add to income once", async () => {
    const p = await open("?local=1");
    // pay for sessions given as [startY,M,D,h, endY,M,D,h(, hol)] at rate 100 (Nov 16 2026 is a Monday, Nov 20 a Friday)
    const pay = (...ss) => p.evaluate(a => { const L = a.map((s, i) => ({ id: "s" + i, s: new Date(2026, 10, s[0], s[1]).getTime(), e: new Date(2026, 10, s[2], s[3]).getTime(), hol: s[4] || 0, c: Object.assign(wdef(), { rate: 100 }) })); const o = workDay(L, 0); return Math.round(L.reduce((t, x) => t + o[x.id].pay, 0)) }, ss);
    eq(await pay([16, 9, 16, 19]), 1050, "10h weekday: 8 x 100% + 2 x 125%");
    eq(await pay([16, 9, 16, 21]), 1350, "12h weekday: then 150%");
    eq(await pay([20, 16, 21, 2]), 1450, "Fri 16:00 to Sat 02:00, no midnight split: 2h 100% + 6h 150% + 2h overtime at 175%");
    eq(await pay([16, 9, 16, 17, 1]), 1200, "holiday session: 150%");
    eq(await pay([16, 8, 16, 12], [16, 14, 16, 20]), 1050, "two sessions on one day count together");
    eq(await pay([22, 9, 22, 17]), 800, "ordinary Sunday-to-Thursday day is 100%");
    await p.evaluate(() => { S.work = { rate: 50 }; save(); render() });
    await p.click("#workb");
    await p.click("#wgo");
    eq(await p.locator("#wstrip").isVisible(), true, "strip while running");
    await p.waitForFunction(() => /^00:00:0[1-9]$/.test(document.getElementById("wtime").textContent), null, { timeout: 8000 }).catch(async () => { throw new Error("timer should be running, shows " + await p.locator("#wtime").textContent()) });
    await p.evaluate(() => { S.work.rate = 999; save() });
    await p.click("#wgo");
    eq(await p.locator("#wstrip").isVisible(), false, "no strip when stopped");
    eq(await p.evaluate(() => wlog()[0].c.rate), 50, "session keeps the rate it started with");
    await p.click("#wadd");
    await text(p, "#wlist", "8h 00m");
    await p.click(".wrow:has-text('8h 00m') [data-winc]");
    eq(await p.evaluate(() => S.tx.filter(t => t.inc && t.id.startsWith("work-")).map(t => t.amt).join()), "7992", "income row made from the 8h session added after the rate became 999");
    await p.evaluate(() => { wInc(null); wInc(null) });
    eq(await p.evaluate(() => S.tx.filter(t => t.id.startsWith("work-")).length), 2, "the 8h session is not added twice (only the short timer one is new)");
  });
  await test("Back (phone gesture or browser) closes a page, the report or the add sheet instead of leaving the app", async () => {
    const p = await open("?local=1"), u = p.url();
    await p.click('[data-p="bud"]'); eq(await p.locator("#p-bud").isVisible(), true, "budget open");
    await p.goBack(); eq(await p.locator("#p-bud").isHidden(), true, "Back closed it"); eq(p.url(), u, "still in the app");
    await p.click("#repb"); await p.goBack(); eq(await p.locator("#report").isHidden(), true, "Back closed the report");
    await p.evaluate(() => sheetOpen()); await p.goBack(); eq(await p.locator("#addsheet").isHidden(), true, "Back closed the sheet");
    await p.click('[data-p="bud"]'); await p.click("#repb"); await p.click("#pgback");
    eq(await p.locator("#report").isHidden(), true, "Back on the report"); eq(await p.locator("#p-bud").isVisible(), true, "returns to the page it came from");
    await p.click('[data-p="bud"]'); eq(await p.evaluate(() => !!(history.state && history.state.spendInner)), false, "closing in the app removes the extra Back step");
  });
  await test("add sheet: an expense with category from the description, an income, an empty amount refused", async () => {
    const p = await open("?local=1");
    await p.evaluate(() => sheetOpen());
    await p.fill("#shamt", ""); await p.click("#shsave");
    await text(p, "#shmsg", "Enter an amount");
    await p.fill("#shamt", "42.5"); await p.fill("#shdesc", "Shufersal"); await p.click("#shsave");
    eq(await p.locator("#addsheet").isVisible(), false, "sheet closes");
    eq(await p.evaluate(() => { const t = S.tx.find(x => x.desc == "Shufersal"); return [t.amt, !!t.inc, t.cat != "", t.date == ymd()].join() }), "42.5,false,true,true", "expense saved");
    await p.evaluate(() => sheetOpen()); await p.click('[data-kind="inc"]');
    eq(await p.locator("#shcat").isVisible(), false, "no category for income");
    await p.fill("#shamt", "1000"); await p.fill("#shdesc", "Gift"); await p.press("#shdesc", "Enter");
    eq(await p.evaluate(() => { const t = S.tx.find(x => x.desc == "Gift"); return [t.amt, t.inc, t.cat].join() }), "1000,1,", "income saved");
  });
  await test("payslip PDF: only the net pay (נטו לתשלום) is added, as income; a second upload is not added again", async () => {
    // A made-up slip laid out like a real one: boxes with the number left of its label, other amounts above and beside it.
    const box = (top, left, t) => `<div style="position:absolute;top:${top}px;left:${left}px">${t}</div>`;
    const html = `<html dir="rtl"><body style="font:14px Arial">` + [
      [40, 300, "תלוש משכורת לחודש 10/2026"], [70, 300, "ת.ז. 000000018"], [120, 500, "שכר יסוד"], [120, 300, "7,836.00"],
      [500, 60, "9,147.00"], [500, 160, "סה\"כ תשלומים"], [560, 60, "507.00"], [560, 160, "סה\"כ ניכויים"],
      [620, 60, "8,700.00"], [620, 160, "שכר נטו"], [680, 60, "8,640.00"], [680, 160, "נטו לתשלום"], [680, 520, "1,111.00"], [684, 620, "הערות"],
      [760, 300, "בתאריך 03/11/2026"]].map(b => box(...b)).join("") + "</body></html>";
    const f = path.join(TMP, "payslip.pdf"), g = await browser.newPage();
    await g.setContent(html); await g.pdf({ path: f, format: "A4" }); await g.close();
    const p = await open("?local=1");
    await p.locator("#p-imp").waitFor(); await p.setInputFiles("#file", f);
    try { await p.locator("#slip").waitFor({ timeout: 20000 }) } catch (e) { throw new Error("payslip not recognised, message: " + await p.locator("#msg").textContent()) }
    await text(p, "#sliptxt", "10/2026"); await text(p, "#sliptxt", "₪ 8,640");
    eq(await p.inputValue("#slipdate"), "2026-11-03", "issue date");
    await p.click("#slipgo");
    await repIn(p, "₪ 8,640"); await total(p, "₪ 0");
    eq(await p.locator('tr.inc input[value="Salary 10/2026"]').count(), 1, "income row");
    eq(await p.locator('tr.inc [data-f="date"]').inputValue(), "2026-11-03", "income date");
    eq(await p.evaluate(() => JSON.stringify(S).includes("000000018")), false, "nothing else from the slip is saved");
    await p.setInputFiles("#file", f); await p.locator("#slip").waitFor({ timeout: 20000 }); await p.click("#slipgo");
    eq(await p.locator("#msg").textContent(), "That payslip is already added.", "second upload"); eq(await rows(p), 1, "rows");
  });
  await test("payslip picture: the net pay is read from a JPEG; a picture without one is refused", async () => {
    const box = (top, left, t) => `<div style="position:absolute;top:${top}px;left:${left}px">${t}</div>`;
    const shot = async (name, body) => { const f = path.join(TMP, name), g = await browser.newPage({ viewport: { width: 900, height: 900 } }); await g.setContent(`<html dir="rtl"><body style="font:20px Arial;background:#fff">${body}</body></html>`); await g.screenshot({ path: f, type: "jpeg", quality: 85 }); await g.close(); return f };
    const f = await shot("payslip.jpg", [[40, 300, "<b>תלוש משכורת לחודש 08/2026</b>"], [120, 600, "שכר יסוד"], [120, 400, "7,836.00"],
      [500, 60, "9,147.00"], [500, 220, "סה\"כ תשלומים"], [580, 60, "8,700.00"], [580, 220, "שכר נטו"],
      [660, 60, "7,912.35"], [660, 220, "<b>נטו לתשלום</b>"], [660, 700, "הערות"], [800, 300, "בתאריך 02/09/2026"]].map(b => box(...b)).join(""));
    const p = await open("?local=1");
    await p.locator("#p-imp").waitFor(); await p.setInputFiles("#file", f);
    try { await p.locator("#slip").waitFor({ timeout: 120000 }) } catch (e) { throw new Error("payslip picture not recognised, message: " + await p.locator("#msg").textContent()) }
    await text(p, "#sliptxt", "08/2026"); await text(p, "#sliptxt", "₪ 7,912");
    eq(await p.inputValue("#slipdate"), "2026-09-02", "issue date");
    await p.click("#slipgo"); await repIn(p, "₪ 7,912");
    eq(await p.locator('tr.inc input[value="Salary 08/2026"]').count(), 1, "income row");
    await p.setInputFiles("#file", await shot("other.jpg", box(100, 300, "סתם מכתב 120.00")));
    await p.waitForFunction(() => /Couldn’t find the net pay/.test(document.getElementById("msg").textContent), null, { timeout: 120000 });
    eq(await p.locator("#slip").isVisible(), false, "no payslip row"); eq(await rows(p), 1, "rows");
  });
  await test("payslip as pasted text, and a PDF that is not a payslip", async () => {
    const p = await open("?local=1");
    await p.locator("#p-imp").waitFor();
    await p.fill("#paste", "תלוש משכורת לחודש 09/2026\nשכר נטו 8,100.00\nנטו לתשלום 8,050.50 ₪");
    await p.click("#go"); await p.locator("#slip").waitFor();
    await text(p, "#sliptxt", "09/2026"); await p.fill("#slipdate", "2026-10-05"); await p.click("#slipgo");
    await repIn(p, "₪ 8,051"); eq(await p.inputValue("#paste"), "", "pasted slip cleared");
    const f = path.join(TMP, "other.pdf"), g = await browser.newPage();
    await g.setContent("<p>Just a letter, total 120.00</p>"); await g.pdf({ path: f }); await g.close();
    await p.setInputFiles("#file", f);
    await p.waitForFunction(() => /Couldn’t find the net pay/.test(document.getElementById("msg").textContent), null, { timeout: 20000 });
    eq(await p.locator("#slip").isVisible(), false, "no payslip row"); eq(await rows(p), 1, "rows");
    // PDFs that store Hebrew back to front, or one letter per piece: the label is still found and the nearest amount taken.
    const it = (s, x) => ({ s, x, y: 100, h: 10, p: 1 });
    eq(await p.evaluate(a => slip(a).net, [it("8,640.00", 20), it("נטו לתשלום", 150), { s: "9,999.00", x: 150, y: 112, h: 10, p: 1 }]), 8640, "an amount on the label's row beats a nearer one on the next row");
    eq(await p.evaluate(a => slip(a).net, [it("8,640.00", 40), it("םולשתל", 100), it("וטנ", 150), it("8,700.00", 300)]), 8640, "back-to-front Hebrew");
    eq(await p.evaluate(a => slip(a).net, [it("7,000.00", 20), ..."נטולתשלום"].map((c, i) => it(c, 200 - i * 8)).concat([it("8,640.00", 60), it("9,999.00", 400)])), 8640, "one letter per piece");
  });
  await test("re-importing after editing a purchase does not add it again", async () => {
    const p = await open("?local=1"), f = "date,description,amount\n2026-11-03,Aroma Cafe,18\n2026-11-04,Zara,300";
    await paste(p, "Visa", f);
    await setField(p.locator('tr:has(input[value="Zara"]) [data-f="amt"]'), "280");
    await setField(p.locator('tr:has(input[value="Aroma Cafe"]) [data-f="desc"]'), "Coffee with Dana");
    await total(p, "₪ 298");
    eq(await paste(p, "Visa", f), "Added 0 purchases, skipped 2 already saved.", "re-import");
    await total(p, "₪ 298"); eq(await rows(p), 2, "purchases");
    eq(await paste(p, "Visa", "date,description,amount\n2026-11-04,Zara,280"), "Added 0 purchases, skipped 1 already saved.", "a file with the corrected values");
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
    eq(await p.locator('tr:has(input[value="שופרסל דיל"]) select[data-id]').inputValue(), "Groceries", "category");
  });
  await test("Max-style Excel: two sheets, issuer category, real date cells", async () => {
    const H = ["תאריך עסקה", "שם בית העסק", "קטגוריה", "4 ספרות אחרונות של כרטיס האשראי", "סוג עסקה", "סכום חיוב", "מטבע חיוב", "סכום עסקה מקורי", "מטבע עסקה מקורי", "תאריך חיוב", "הערות"];
    const top = [["כל המשתמשים (1)"], ["5678-MAX Back Total"], ["11/2026"], H];
    const f = xlsx("transaction-details_export_1.xlsx", [
      ["עסקאות במועד החיוב", [...top,
        ["05-08-2026", "ביטוח רכב ישיר", "ביטוח", "5678", "תשלומים", 650.4, "₪", 3252, "₪", "02-11-2026", "תשלום 3 מתוך 5"],
        ["13-10-2026", "חנות של דני", "קוסמטיקה וטיפוח", "5678", "רגילה", 60, "₪", 60, "₪", "02-11-2026", ""],
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
    await rows(p); // show all rows (the list starts with the latest 5)
    eq(await p.locator('tr:has(input[value="ביטוח רכב ישיר 3/5"]) [data-f="date"]').inputValue(), "2026-10-05", "installment date");
    eq(await p.locator('tr:has(input[value="חנות כלשהי"]) [data-f="date"]').inputValue(), "2026-10-27", "real date cell");
    eq(await p.locator('tr:has(input[value="חנות של דני"]) select[data-id]').inputValue(), "Shopping", "issuer category used");
    eq(await p.locator('tr:has(input[value="קיוסק הפינה"]) select[data-id]').first().inputValue(), "Eating out", "issuer category used");
    await upload(p, f); await p.click("#go");
    eq(await p.locator("#msg").textContent(), "Added 0 purchases, skipped 6 already saved.", "re-import");
  });
  await test("an empty purchase abandoned on an earlier day is dropped on the next start", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300");
    await p.click("#addp"); eq(await rows(p), 2, "rows after Add");
    await p.reload(); await p.selectOption("#month", "all"); eq(await rows(p), 2, "today's empty row is kept");
    await p.locator('tr:has([data-f="desc"][value=""]) [data-f="date"]').fill("2026-01-01");
    await p.locator('tr:has([data-f="desc"][value=""]) [data-f="date"]').press("Tab");
    await p.reload(); await total(p, "₪ 300"); eq(await rows(p), 1, "rows after reload");
  });
  await test("a merchant, card or category called constructor or __proto__ is an ordinary name", async () => {
    const p = await open("?local=1");
    await paste(p, "constructor", "date,description,amount\n2026-11-03,constructor,100\n2026-11-04,Kiosk,50");
    await total(p, "₪ 150");
    const catOf = d => p.locator(`tr:has([data-f="desc"][value="${d}"]) select[data-id]`);
    eq(await catOf("constructor").inputValue(), "Other", "category before it is learned");
    await catOf("constructor").selectOption("Transport");
    if (!(await p.locator("#p-imp").isVisible())) await p.click('[data-p="imp"]');
    await p.fill("#card", "__proto__"); await p.selectOption("#irule", "50");
    await p.fill("#paste", "date,description,amount\n2026-11-05,constructor,30\n2026-11-05,Kiosk,20"); await p.click("#go");
    await total(p, "₪ 175");
    eq(await catOf("constructor").first().inputValue(), "Transport", "learned category");
    await p.click("#catall"); await setField(p.locator('.cn[value="Transport"]'), "constructor");
    await text(p, '.cat:has(.cn[value="constructor"]) .amt', "₪ 115");
    await p.click('[data-p="bud"]'); await setField(p.locator('#budlist label:has-text("constructor") input'), "200");
    await p.reload(); await total(p, "₪ 175");
    eq(await catOf("constructor").first().inputValue(), "constructor", "category after reload");
    eq(await p.evaluate(() => [S.cards.__proto__, S.rules.constructor, S.budget.cats.constructor, typeof COL.constructor].join()), "50,constructor,200,string", "saved maps");
    // A restore file with a __proto__ key must not change what S inherits from.
    const f = path.join(TMP, "proto.json");
    fs.writeFileSync(f, '{"app":"spend-sorted","v":1,"data":{"tx":[{"id":"a","date":"2026-11-03","desc":"Zara","amt":80,"card":"__proto__","cat":"Shopping"}],"cards":{"__proto__":25},"__proto__":{"cur":"X","polluted":1}}}');
    await p.click("#accbtn"); await p.setInputFiles("#rsfile", f);
    await p.locator("#rsbtn", { hasText: "Replace everything" }).click();
    await total(p, "₪ 20");
    eq(await p.evaluate(() => [Object.getPrototypeOf(S) === Object.prototype, S.polluted, S.cards.__proto__].join()), "true,,25", "after restore");
  });
  await test("category icons: starting icons, pick one, type one, none; kept after reload and rename", async () => {
    const p = await open("?local=1");
    const ci = c => p.locator('.cat:has(.cn[value="' + c + '"]) .ci');
    await p.click("#catall"); eq((await ci("Groceries").innerText()).trim(), "🛒", "starting icon");
    await ci("Groceries").click(); await p.locator('[data-pick="🍔"]').click();
    eq((await ci("Groceries").innerText()).trim(), "🍔", "picked icon");
    await ci("Health").click(); await setField(p.locator("[data-icin]"), "🌟");
    eq((await ci("Health").innerText()).trim(), "🌟", "typed icon");
    await ci("Transport").click(); await p.locator('[data-pick=""]').click();
    eq((await ci("Transport").innerText()).trim(), "＋", "no icon");
    await p.reload(); await p.click("#catall");
    eq((await ci("Groceries").innerText()).trim(), "🍔", "picked icon after reload");
    eq((await ci("Transport").innerText()).trim(), "＋", "no icon after reload");
    await setField(p.locator('.cn[value="Groceries"]'), "Food");
    eq((await ci("Food").innerText()).trim(), "🍔", "icon follows a rename");
  });
  await test("month start day (pure helpers and the Budget panel); no pace, fixed or income lines on the main screen", async () => {
    const p = await open("?local=1");
    // Pure helpers: a month that starts on the 15th.
    eq(await p.evaluate(() => { S.mstart = 15; return [pk("2026-11-10"), pk("2026-11-15"), pk("2026-01-02"), mrange("2026-10").join(">")].join(" ") }), "2026-10 2026-11 2025-12 2026-10-15>2026-11-14", "mk and mrange with start day 15");
    await p.evaluate(() => { delete S.mstart });
    // The main screen carries no per-day, pace, fixed-charge or income/left-over lines (removed 2026-11-18, brainstorm pending).
    await p.evaluate(() => { S.tx.push({ id: "x1", date: ymd(), desc: "Shufersal", amt: 100, card: "My card", cat: "Other" }, { id: "x2", date: ymd(), desc: "Salary", amt: 5000, inc: 1, card: "", cat: "" }); S.budget = { total: 3000, cats: {} }; save(); render() });
    await p.selectOption("#month", await p.evaluate(() => pk(ymd())));
    await text(p, "#budline", "₪ 2,900 left of ₪ 3,000");
    for (const id of ["pace", "fixedline", "sin", "sleft"]) eq(await p.locator("#" + id).count(), 0, id + " is not on the main screen");
    eq(await p.locator(".soon").count(), 0, "no fixed charges still to come");
    eq(await p.locator("#cur").isVisible(), false, "currency is out of the way (Account panel)");
    // Month start day from the Budgets panel: saved, and months are named by their dates.
    await p.click('[data-p="bud"]'); await setField(p.locator("#mstart"), "15");
    eq(await p.evaluate(() => S.mstart), 15, "saved start day");
    await p.waitForFunction(() => [...document.querySelectorAll("#month option")].slice(-1)[0].textContent.includes("–"), null, { timeout: 15000 });
    await p.reload(); eq(await p.evaluate(() => S.mstart), 15, "start day after reload");
  });
  await test("multi-currency: buying in euro, shown in shekels with the original, switchable, rate editable", async () => {
    const p = await open("?local=1");
    await p.route("https://api.frankfurter.dev/**", r => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ rates: { ILS: 4 } }) }));
    await p.evaluate(() => { S.tx = S.tx.filter(t => !t.id.startsWith("fx")); delete S.budget; S.buy = "EUR"; save(); render() });
    eq(await p.evaluate(() => [homeC(), buyC()].join()), "ILS,EUR", "home and buying currency");
    await p.click("#addp");
    await p.waitForFunction(() => S.tx.some(t => t.fx && t.fx.r == 4), null, { timeout: 5000 });
    const id = await p.evaluate(() => S.tx.find(t => t.fx && t.fx.r == 4).id);
    await setField(p.locator(`[data-tid="${id}"][data-f="fxa"]`), "50");
    eq(await p.evaluate(i => { const t = S.tx.find(x => x.id == i); return [t.amt, t.fx.a, t.fx.c].join() }, id), "200,50,EUR", "50 EUR at 4 = 200 shekels");
    // wrong currency: switch to USD keeps the typed number, new rate
    await p.selectOption(`[data-tid="${id}"][data-f="ccy"]`, "USD");
    await p.waitForFunction(i => S.tx.find(x => x.id == i).fx.c == "USD", id, { timeout: 5000 });
    // back to the home currency: plain purchase, amount stays
    await p.selectOption(`[data-tid="${id}"][data-f="ccy"]`, "ILS");
    await p.waitForFunction(i => !S.tx.find(x => x.id == i).fx, id, { timeout: 5000 });
    eq(await p.evaluate(i => S.tx.find(x => x.id == i).amt, id), 200, "amount kept in shekels");
    await p.selectOption(`[data-tid="${id}"][data-f="ccy"]`, "EUR");
    await p.waitForFunction(i => S.tx.find(x => x.id == i).fx, id, { timeout: 5000 });
    await setField(p.locator(`[data-tid="${id}"][data-f="amt"]`), "210");
    eq(await p.evaluate(i => S.tx.find(x => x.id == i).fx.r, id), 210 / 200, "editing the shekel amount changes the rate");
    await p.evaluate(() => { S.buy = "ILS"; S.tx = S.tx.filter(t => !t.fx); save(); render() });
  });
  await test("how-to page shows one topic at a time; multi-currency: date refetches the rate, a statement in euro, changing home converts", async () => {
    const p = await open("?local=1");
    await p.click("#more"); await p.click('[data-p="how"]');
    eq(await p.locator(".how:visible").count(), 1, "one topic visible");
    await p.click('[data-how="cur"]');
    eq((await p.locator(".how:visible h4").first().textContent()), "Home currency", "picked topic");
    await p.click('[data-how="exp"]'); eq((await p.locator(".how:visible h4").first().textContent()), "Add an expense", "another topic");
    await p.route("https://api.frankfurter.dev/**", r => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ rates: { ILS: /2026-10-01/.test(r.request().url()) ? 5 : 4, EUR: 0.25 } }) }));
    // a row's date changes: the rate is fetched again (unless the rate was typed or the shekel amount edited)
    await p.evaluate(() => { S.tx = [{ id: "f1", date: "2026-11-03", desc: "Bar", amt: 200, card: "My card", cat: "Other", fx: { c: "EUR", a: 50, r: 4 } }, { id: "f2", date: "2026-11-03", desc: "Pub", amt: 190, card: "My card", cat: "Other", fx: { c: "EUR", a: 50, r: 3.8, m: 1 } }]; save(); render() });
    await setField(p.locator('[data-tid="f1"][data-f="date"]'), "2026-10-01");
    await p.waitForFunction(() => S.tx[0].fx.r == 5 && S.tx[0].amt == 250, null, { timeout: 5000 });
    await setField(p.locator('[data-tid="f2"][data-f="date"]'), "2026-10-01");
    await p.waitForTimeout(400);
    eq(await p.evaluate(() => [S.tx[1].fx.r, S.tx[1].amt].join()), "3.8,190", "a hand-set rate is kept");
    // a statement in euro: rows are converted at their date
    await p.evaluate(() => { S.tx = []; save(); render() });
    await p.click("#more"); await p.click('[data-p="imp"]');
    await p.fill("#card", "Euro card"); await p.selectOption("#icur", "EUR");
    await p.fill("#paste", "date,description,amount\n2026-10-01,Cafe Roma,10"); await p.click("#go");
    await p.waitForFunction(() => S.tx[0] && S.tx[0].fx && S.tx[0].amt == 50, null, { timeout: 5000 });
    // importing it again adds nothing
    await p.selectOption("#icur", "EUR"); await p.fill("#paste", "date,description,amount\n2026-10-01,Cafe Roma,10"); await p.click("#go");
    await p.waitForTimeout(400); eq(await p.evaluate(() => S.tx.length), 1, "same euro statement is skipped");
    // changing the home currency converts the saved amounts (the app asks first)
    p.on("dialog", d => d.accept());
    await p.evaluate(() => { S.tx = [{ id: "h1", date: "2026-11-03", desc: "Rent", amt: 400, card: "My card", cat: "Other" }, { id: "h2", date: "2026-11-03", desc: "Bar", amt: 200, card: "My card", cat: "Other", fx: { c: "EUR", a: 50, r: 4 } }]; S.budget = { total: 1000, cats: {} }; save(); render() });
    await p.click("#more"); await p.click('[data-p="acc"]'); await p.selectOption("#cur", "EUR");
    await p.waitForFunction(() => S.home == "EUR" && S.tx[0].amt == 100, null, { timeout: 5000 });
    eq(await p.evaluate(() => [S.tx[1].amt, !!S.tx[1].fx, S.budget.total].join()), "50,false,250", "euro rows become plain, budget converted");
  });
  await test("Budget panel adds up the category budgets against the total", async () => {
    const p = await open("?local=1");
    await p.click("#more"); await p.click('[data-p="bud"]');
    await setField(p.locator("#btotal"), "5000");
    await setField(p.locator('[data-bi="0"]'), "1000"); await setField(p.locator('[data-bi="1"]'), "1500");
    await text(p, "#budsum", "₪ 2,500 · ₪ 2,500 left of the ₪ 5,000 total");
    await setField(p.locator('[data-bi="2"]'), "3000");
    await text(p, "#budsum", "₪ 500 more than the ₪ 5,000 total");
  });
  await test("the page opens on this month with its budget", async () => {
    const p = await open("?local=1");
    await p.evaluate(() => { S.budget = { total: 1000, cats: {} }; S.tx.push({ id: "n1", date: ymd(), desc: "Shufersal", amt: 45, card: "My card", cat: "Groceries" }); save(); });
    await p.reload();
    await total(p, "₪ 45"); await text(p, "#budline", "₪ 955 left of ₪ 1,000");
  });
  await test("card names ignore upper and lower case: import, Cards panel, rename, phone item", async () => {
    const p = await open("?local=1");
    await paste(p, "MAX", "date,description,amount\n2026-11-02,Zara,100");
    await p.click('[data-p="crd"]'); await p.selectOption('#cardrules select[data-f="rule"]', "50"); await total(p, "₪ 50");
    await p.click('[data-p="imp"]').catch(() => { });
    const m = await paste(p, "max", "date,description,amount\n2026-11-03,Rami,200");
    await total(p, "₪ 150");
    eq(await p.evaluate(() => [...new Set(S.tx.map(t => t.card))].join()), "MAX", "one card name");
    eq(await p.evaluate(() => Object.keys(S.cards).join()), "MAX", "one rule");
    await p.click('[data-p="crd"]'); await p.fill("#cname", "mAx"); await p.click("#cadd");
    await text(p, "#crdmsg", "already exists");
    await p.evaluate(() => { S.cards.Visa = 100; render() });
    await p.fill('#cardrules input[data-f="name"][value="Visa"]', "max"); await p.press('#cardrules input[data-f="name"][value="Visa"]', "Tab");
    await text(p, "#crdmsg", "already used");
    await p.fill('#cardrules input[data-f="name"][value="MAX"]', "Max"); await p.press('#cardrules input[data-f="name"][value="MAX"]', "Tab");
    await p.waitForFunction(() => S.tx.every(t => t.card == "Max"), null, { timeout: 10000 }).catch(() => { });
    eq(await p.evaluate(() => [...new Set(S.tx.map(t => t.card))].join() + "|" + Object.keys(S.cards).sort().join()), "Max|Max,Visa", "case-only rename is allowed and moves the rule");
    eq(await p.evaluate(() => inboxRow("z", { amt: "5", desc: "Cafe", card: "MAX" }).card), "Max", "phone item card");
  });
  await test("bars: by amount or by budget; the 'of' note stays; kept after reload", async () => {
    const p = await open("?local=1");
    await p.evaluate(() => { S.tx = [{ id: "a", date: ymd(), desc: "x", amt: 500, card: "My card", cat: "Groceries" }, { id: "b", date: ymd(), desc: "y", amt: 90, card: "My card", cat: "Health" }]; S.budget = { total: 0, cats: { Groceries: 1000 } }; save(); render(); document.getElementById("month").value = pk(ymd()); render(); });
    const w = c => p.evaluate(c => document.querySelector('.bw[data-c="' + c + '"] i').style.width, c);
    eq(await w("Health") != "0%", true, "no-budget bar in amount mode");
    await text(p, '.bw[data-c="Groceries"] .c', "of ₪ 1,000");
    await p.click("#bmb");
    eq(await w("Health"), "0%", "no-budget bar in budget mode"); eq(await w("Groceries"), "50%", "budget bar");
    await text(p, '.bw[data-c="Groceries"] .c', "of ₪ 1,000");
    await p.reload(); eq(await p.evaluate(() => S.barMode), "budget", "kept after reload");
  });
  await test("budget alert line: near the limit at 80%, over budget past 100%, none under 80%", async () => {
    const p = await open("?local=1");
    await p.evaluate(() => { S.tx = [{ id: "a", date: ymd(), desc: "x", amt: 500, card: "My card", cat: "Groceries" }, { id: "b", date: ymd(), desc: "y", amt: 90, card: "My card", cat: "Health" }]; S.budget = { total: 0, cats: { Groceries: 1000, Health: 100 } }; save(); render(); document.getElementById("month").value = pk(ymd()); render(); });
    await text(p, "#budalert", "Near the limit (80%+): Health");
    eq(((await p.locator("#budalert").textContent()) || "").includes("Groceries"), false, "Groceries at 50% is not listed");
    await p.evaluate(() => { S.tx[0].amt = 1200; save(); render(); });
    await text(p, "#budalert", "Over budget: Groceries");
    await p.evaluate(() => { S.tx[0].amt = 100; S.tx[1].amt = 10; save(); render(); });
    eq(await p.locator("#budalert").count(), 0, "no line under 80%");
  });
  await test("budget notice at the top when a category or the whole budget rises past 80% or 100%; total-only warning; a minus in pasted text is a refund", async () => {
    const p = await open("?local=1");
    await p.evaluate(() => { S.tx = [{ id: "a", date: ymd(), desc: "x", amt: 50, card: "My card", cat: "Groceries" }]; S.budget = { total: 1000, cats: { Groceries: 100 } }; save(); render(); document.getElementById("month").value = pk(ymd()); render() });
    eq(await p.locator("#bnote").isHidden(), true, "no notice on first draw");
    await p.evaluate(() => { S.tx[0].amt = 85; save(); render() });
    await text(p, "#bnote", "Groceries passed 80% of its budget");
    await p.evaluate(() => { document.getElementById("bnote").hidden = true; render() });
    eq(await p.locator("#bnote").isHidden(), true, "no repeat when nothing changed");
    await p.evaluate(() => { S.tx[0].amt = 120; save(); render() });
    await text(p, "#bnote", "Groceries is over budget");
    await p.evaluate(() => { S.tx[0].amt = 850; save(); render() });
    await text(p, "#totalalert", "the whole budget"); await text(p, "#bnote", "The whole budget passed 80%");
    await p.evaluate(() => { S.tx[0].amt = 1100; save(); render() });
    await text(p, "#bnote", "Over the whole budget");
    // Another month and back, and a category named "total": no false notice.
    await p.evaluate(() => { document.getElementById("bnote").hidden = true; document.getElementById("month").value = "all"; render(); document.getElementById("month").value = pk(ymd()); render() });
    eq(await p.locator("#bnote").isHidden(), true, "no notice after switching months");
    await p.evaluate(() => { S.cats.push("total"); S.budget.cats.total = 100; S.tx.push({ id: "t1", date: ymd(), desc: "y", amt: 90, card: "My card", cat: "total" }); save(); render() });
    await text(p, "#bnote", "total passed 80% of its budget");
    await paste(p, "Visa", "Zara 05/11/2026 -80.00\nGift 06/11/2026 (15.00)\nShop 3-5 07/11/2026 20.00\nCafe 08/11/2026 30.00\nBar 09/11/2026 40.00");
    await text(p, "#msg", "Added 5");
    eq(await p.evaluate(() => S.tx.filter(t => t.card == "Visa").map(t => t.amt).join()), "-80,-15,20,30,40", "a minus or brackets is a refund, a hyphen inside the text is not");
  });
  await test("a password-locked PDF gets a clear message and adds nothing", async () => {
    const hex = n => Array.from({ length: n }, (_, i) => ((i * 37 + 11) & 255).toString(16).padStart(2, "0")).join("");
    const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>", "<< /Length 0 >>\nstream\n\nendstream",
      `<< /Filter /Standard /V 1 /R 2 /O <${hex(32)}> /U <${hex(32).split("").reverse().join("")}> /P -4 >>`];
    let pdf = "%PDF-1.4\n"; const offs = [];
    objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n` });
    const x = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Encrypt 5 0 R /ID [<${hex(16)}> <${hex(16)}>] >>\nstartxref\n${x}\n%%EOF\n`;
    const f = path.join(TMP, "locked.pdf"); fs.writeFileSync(f, pdf, "latin1");
    const p = await open("?local=1"); await p.click('[data-p="imp"]').catch(() => { });
    if (!(await p.locator("#p-imp").isVisible())) await p.click('[data-p="imp"]');
    await p.setInputFiles("#file", f);
    await text(p, "#msg", "locked with a password");
    eq(await p.evaluate(() => S.tx.length), 0, "rows added");
  });
  await test("edge cases: refund in pasted text, old .xls file, split parts follow a renamed or deleted category and come back with Undo", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "Purchase at Zara for ₪250.00 on 03/11/2026\nRefund from Zara of ₪80.00 on 05/11/2026");
    await total(p, "₪ 170");
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["תאריך עסקה", "שם בית העסק", "סכום חיוב"], ["02/11/2026", "שופרסל", 120.5], ["03/11/2026", "קפה גן", 30]]), "S");
    const f = path.join(TMP, "old.xls"); XLSX.writeFile(wb, f, { bookType: "biff8" });
    await p.setInputFiles("#file", f); await text(p, "#msg", "File read"); await p.fill("#card", "Old card"); await p.click("#go"); await text(p, "#msg", "Added 2");
    await total(p, "₪ 321");
    await p.evaluate(() => { S.tx = [{ id: "s1", date: ymd(), desc: "Mixed", amt: 400, card: "My card", cat: "Groceries", split: [{ cat: "Health", amt: 100 }] }]; save(); render() });
    const parts = () => p.evaluate(() => S.tx[0].split[0].cat);
    await p.evaluate(() => renameCat(S.cats.indexOf("Health"), "Wellness")); eq(await parts(), "Wellness", "renamed");
    await p.evaluate(() => delCat(S.cats.indexOf("Wellness"))); eq(await parts(), "Other", "deleted");
    await p.evaluate(() => document.getElementById("undo").click()); eq(await parts(), "Wellness", "undo");
  });
  await test("a phone-added purchase merges with its statement row; phone items are read (amount, date, card, odd input)", async () => {
    const p = await open("?local=1");
    await paste(p, "Max 5678", "date,description,amount\n2026-11-02,Zara,300");
    await p.evaluate(() => { S.tx.push({ id: "pa1", date: ymd(), desc: "lunch with dan", amt: 62, card: "Max 5678", cat: "Other", auto: 1 }); save(); });
    eq(await p.evaluate(() => S.tx.filter(t => t.auto).length), 1, "phone item is marked");
    // Same amount, the day before, on another card: still the same purchase. A different amount is a new row.
    const y = await p.evaluate(() => dstr(new Date(Date.now() - 864e5)));
    const msg = await paste(p, "Visa", "date,description,amount\n" + y + ",CAFE NOIR TLV,62\n" + y + ",Kiosk,62.5");
    eq(/Added 1 purchase, matched 1/.test(msg), true, "import message: " + msg);
    eq(await p.evaluate(() => { const t = S.tx.find(t => t.desc == "CAFE NOIR TLV"); return [t.card, t.note, t.auto, S.tx.length].join("|") }), "Visa|lunch with dan||3", "merged row");
    eq(/skipped 2 already saved/.test(await paste(p, "Visa", "date,description,amount\n" + y + ",CAFE NOIR TLV,62\n" + y + ",Kiosk,62.5")), true, "second import skips both");
    // An old phone-added row (more than 2 days from the statement's date) is left alone.
    await p.evaluate(() => { S.tx.push({ id: "old", date: "2026-01-01", desc: "x", amt: 77, card: "Visa", cat: "Other", auto: 1 }); save() });
    await paste(p, "Visa", "date,description,amount\n2026-01-09,Far away,77");
    eq(await p.evaluate(() => S.tx.filter(t => t.amt == 77).length), 2, "no merge across 8 days");
    eq(await p.evaluate(() => [
      inboxRow("a", { text: "‏45.00 ₪ ב-Shufersal באמצעות Max ‎••5678" }),
      inboxRow("b", { amt: "1,234.5", desc: "Rent", date: "5/11/2026", card: "max 5678" }),
      inboxRow("c", { title: "Amazon", text: "$12.00 with Visa" }),
      inboxRow("d", { text: "hello" }),
      inboxRow("e", { amt: 5, desc: { x: 1 }, date: "9999-99-99x", card: "Brand new" }),
    ].map(t => [t.amt, t.date == ymd() ? "today" : t.date, t.card, t.note ? "note" : "", t.auto].join("|")).join(" ; ")),
      "45|today|Max 5678||1 ; 1234.5|2026-11-05|Max 5678||1 ; 0|today|Visa||1 ; 0|today|Visa|note|1 ; 0|today|Brand new||1", "phone items");
    // Currency of phone items: a notification naming euro is saved as euro; the quick-add amount uses "Buying in"; a shekel amount stays shekels.
    eq(await p.evaluate(() => { S.buy = "EUR"; const r = [inboxRow("c1", { title: "Bar", text: "€50.00 with Visa" }), inboxRow("c2", { title: "Taxi", text: "EUR 12,5 with Visa" }), inboxRow("c3", { amt: "30", desc: "Gelato" }), inboxRow("c4", { title: "Shop", text: "₪60.00 with Visa" }), inboxRow("c5", { amt: "7", cur: "USD", desc: "x" })].map(t => t.fx ? t.fx.c + t.fx.a : "ILS" + t.amt).join(" "); S.buy = "ILS"; return r }), "EUR50 EUR12.5 EUR30 ILS60 USD7", "phone items in euro");
    eq(await p.evaluate(() => [inboxAdd([["x1", { amt: "9" }], ["x1", { amt: "9" }]]).join(), inboxAdd([["x1", { amt: "9" }]]).length].join("|")), "in-x1|0", "an item is added once");
    // Google Wallet notification (title = merchant, text = "₪60.00 with max Total ••5315"): the amount, the merchant, the card by its name.
    eq(await p.evaluate(() => { S.tx.push({ id: "mx", date: "2026-01-01", desc: "q", amt: 1, card: "Max 9999", cat: "Other" }); const t = inboxRow("w", { title: "SLOMI", text: "₪60.00 with max Total ••5315" }); return [t.amt, t.desc, t.card, t.cat].join("|") }), "60|SLOMI|Max 5678|Other", "wallet notification");
    // The default card is used when nothing in the item names a card; the star button sets and clears it.
    eq(await p.evaluate(() => { S.defCard = "Visa"; const a = inboxRow("d1", { amt: 3, desc: "x" }).card; delete S.defCard; return a }), "Visa", "default card for the phone");
    await p.click("[data-p=crd]"); await p.locator("[data-def]").first().click();
    eq(await p.evaluate(() => S.defCard === CL[0]), true, "star sets the default card"); await p.locator("[data-def]").first().click();
    eq(await p.evaluate(() => S.defCard), undefined, "star again clears it");
    eq(await p.evaluate(() => [guess("שלומי שיער"), guess("Moshe Barber Shop"), guess("מספרה דנה"), guess("Chairs Ltd")].join("|")), "Health|Health|Health|Other", "care words go to Health");
  });
  await test("the card of a purchase is a dropdown of saved cards, with + New card", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Shufersal,400");
    await paste(p, "Max", "date,description,amount\n2026-11-04,Zara,100");
    const sel = 'tr:has([data-f="desc"][value="Shufersal"]) select[data-f="card"]';
    eq((await p.locator(sel + " option").allTextContents()).join("|"), "Max|Visa|＋ New card…", "options");
    await p.selectOption(sel, "Max");
    eq(await p.evaluate(() => S.tx.find(t => t.desc == "Shufersal").card), "Max", "picked a saved card");
    p.once("dialog", d => d.accept("Cash"));
    await p.selectOption(sel, "__new");
    eq(await p.evaluate(() => S.tx.find(t => t.desc == "Shufersal").card), "Cash", "new card typed");
    await p.click("[data-p=crd]"); await p.fill("#cname", "Diners"); await p.click("#cadd");
    eq((await p.locator(sel + " option").allTextContents()).includes("Diners"), true, "card added from the Cards panel shows in the dropdown");
  });
  await test("split a purchase across categories; #tags in notes filter and total", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Shufersal,400\n2026-11-04,Zara,100");
    await total(p, "₪ 500");
    const row = 'tr:has([data-f="desc"][value="Shufersal"])', bar = c => `.bw[data-c="${c}"] .amt`;
    await p.locator(row + " select[data-id]").selectOption({ label: "Split…" });
    await p.locator(row + ' [data-sp][data-f="cat"]').selectOption("Health");
    await setField(p.locator(row + ' [data-sp][data-f="amt"]'), "150");
    await total(p, "₪ 500");
    await text(p, bar("Groceries"), "₪ 250"); await text(p, bar("Health"), "₪ 150");
    await text(p, row + " small.sr", "₪ 250 stays in Groceries");
    await setField(p.locator(row + ' [data-sp][data-f="amt"]'), "900");
    await text(p, bar("Health"), "₪ 400");
    await setField(p.locator(row + ' [data-sp][data-f="amt"]'), "150");
    await text(p, bar("Health"), "₪ 150");
    await p.click('.bw[data-c="Health"]'); eq(await rows(p), 1, "rows under Health"); await p.click("#clearcat");
    await p.reload(); await text(p, bar("Health"), "₪ 150"); await text(p, bar("Groceries"), "₪ 250"); await total(p, "₪ 500");
    // Half of the card counts: every part is halved, the total is the same as without a split.
    await p.click('[data-p="crd"]'); await p.selectOption('#cardrules select[data-f="rule"]', "50");
    await total(p, "₪ 250"); await text(p, bar("Health"), "₪ 75"); await text(p, bar("Groceries"), "₪ 125");
    await p.selectOption('#cardrules select[data-f="rule"]', "100"); await total(p, "₪ 500");
    // An amount edited to less than the split drops the split.
    await setField(p.locator(row + ' [data-tid][data-f="amt"]'), "100");
    await text(p, bar("Groceries"), "₪ 100"); eq(await p.locator(row + " .sp").count(), 0, "split parts after lowering the amount");
    await setField(p.locator(row + ' [data-f="note"]'), "#Trip food");
    await setField(p.locator('tr:has([data-f="desc"][value="Zara"]) [data-f="note"]'), "gift #trip #work");
    await text(p, '#tags [data-tag="trip"]', "₪ 200"); await text(p, '#tags [data-tag="work"]', "₪ 100");
    await p.click('#tags [data-tag="work"]'); eq(await rows(p), 1, "rows tagged work"); await text(p, "#found", "1 found, ₪ 100");
    await p.click('#tags [data-tag="work"]'); eq(await rows(p), 2, "rows with the tag filter off");
    await p.click("#repb"); await text(p, "#report", "By tag"); await text(p, "#report", "#trip");
  });
  await test("just after midnight in Israel a new purchase and a recurring bill get that day's date", async () => {
    // 00:30 on 11 July in Israel is still 10 July in UTC.
    const c = await browser.newContext({ locale: "en-US", timezoneId: "Asia/Jerusalem" }); ctxs.push(c);
    const p = await c.newPage(); watch(p); menuClicks(p);
    await p.clock.install({ time: new Date("2026-07-10T21:30:00Z") });
    await p.goto(URL + "?local=1");
    await p.click("#addp");
    eq(await p.locator('#rows [data-f="date"]').inputValue(), "2026-07-11", "new purchase date");
    await setField(p.locator('#rows [data-f="desc"]'), "Kiosk"); await setField(p.locator('#rows [data-f="amt"]'), "10");
    await p.click('[data-p="rec"]');
    await recOpen(p); await p.fill("#rdesc", "Gym"); await p.fill("#ramt", "200"); await p.fill("#rday", "11"); await p.click("#radd");
    eq(await p.locator('tr:has([data-f="desc"][value="Gym"]) [data-f="date"]').inputValue({ timeout: 5000 }), "2026-07-11", "recurring bill date");
    await total(p, "₪ 210");
  });
}

// Installable app. The service worker is off on localhost unless the address has ?sw=1.
async function pwa() {
  const A = mail("p");
  await test("installable: manifest, icons, and the app's files are saved by the service worker", async () => {
    const p = await open("?local=1&sw=1"); await controlled(p);
    const m = await p.evaluate(async () => { const h = document.querySelector('link[rel="manifest"]').href, j = await (await fetch(h)).json(); return { j, icons: await Promise.all(j.icons.map(async i => { const r = await fetch(new URL(i.src, h)); return r.status + " " + r.headers.get("content-type") })) } });
    eq(m.j.display, "standalone", "display"); eq(m.j.start_url, "./", "start_url");
    eq(m.icons.join(), "200 image/png,200 image/png,200 image/png", "icons");
    eq(m.j.icons.some(i => i.purpose == "maskable"), true, "maskable icon");
    const v = await p.evaluate(() => APPV), urls = await cached(p, "spend-" + v);
    for (const f of ["", "app.js?v=" + v, "cloud.js?v=" + v, "style.css?v=" + v, "vendor/xlsx.full.min.js", "vendor/firebase/firebase-app.js", "vendor/firebase/firebase-auth.js", "vendor/firebase/firebase-firestore.js", "icons/icon-192.png"]) eq(urls.includes(URL + f), true, "saved " + (f || "page"));
  });
  await test("the saved page opens at once; a new deploy arrives as the Reload notice (also for an app left open)", async () => {
    const p = await open("?local=1&sw=1"); await controlled(p);
    try {
      deploy("t2"); await p.reload();
      eq(await mark(p), "", "the saved page is shown first, not waiting for the network");
      await p.locator("#upd").waitFor({ timeout: 20000 });
      await Promise.all([p.waitForEvent("load"), p.click("#updgo")]);
      await p.waitForFunction(() => (document.querySelector('meta[name="deploy"]') || {}).content == "t2", null, { timeout: 20000 });
      eq(await p.evaluate(() => APPV), "t2", "page version");
      await p.waitForFunction(async () => { const k = await caches.keys(); return k.includes("spend-t2") && k.filter(x => x != "spend-rt-1").length == 1 }, null, { timeout: 20000 });
      eq(await p.locator("#upd").isVisible(), false, "no notice when the page is already new");
      deploy("t3"); await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
      await p.locator("#upd").waitFor({ timeout: 20000 });
      eq(await mark(p), "t2", "page before pressing Reload");
      await Promise.all([p.waitForEvent("load"), p.click("#updgo")]);
      await p.waitForFunction(() => (document.querySelector('meta[name="deploy"]') || {}).content == "t3", null, { timeout: 20000 });
      eq(await p.locator("#upd").isVisible(), false, "notice gone after reload");
    } finally { site.over = {} }
  });
  await test("opens offline with the saved data; an offline edit syncs after reconnecting", async () => {
    const p = await open("?sw=1"); await signUp(p, A);
    await p.click("#sample"); await p.selectOption("#month", "all"); await total(p, "₪ 3,325"); await saved(p); await controlled(p);
    const c = p.context();
    try {
      site.down = true; await c.setOffline(true);
      await p.reload(); await p.locator("#app").waitFor({ timeout: 20000 }); await p.selectOption("#month", "all");
      await total(p, "₪ 3,325"); eq(await rows(p), 17, "purchases offline");
      await p.click('tr:has(input[value="Booking.com Hotel"]) [data-del]');
      await total(p, "₪ 2,635");
      await p.waitForFunction(() => /^Offline/.test(document.getElementById("sync").textContent), null, { timeout: 10000 });
    } finally { site.down = false; await c.setOffline(false) }
    await saved(p);
    const d2 = await open(); await signIn(d2, A); await d2.selectOption("#month", "all"); await total(d2, "₪ 2,635");
    await delAccount(d2);
  });
  await test("without ?sw=1 localhost removes the service worker (so edits always show while developing)", async () => {
    const p = await open("?local=1&sw=1"); await controlled(p);
    await p.goto(URL + "?local=1");
    await p.waitForFunction(async () => !(await navigator.serviceWorker.getRegistrations()).length, null, { timeout: 10000 });
  });
}

let code = 1;
try {
  await new Promise(r => server.listen(PORT, r));
  browser = await chromium.launch({ channel: process.env.BROWSER || "msedge", headless: !process.env.HEADED })
    .catch(() => chromium.launch({ channel: "chrome", headless: !process.env.HEADED }));
  if (!ONLY || ONLY == "local") await local();
  if (ONLY != "local") {
    await startEmu();
    await fetch(`http://127.0.0.1:8080/v1/projects/demo-spend/databases/(default)/documents/invites/${CODE}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: '{"fields":{}}' });
    if (ONLY != "pwa") await smoke();
    if (ONLY != "smoke") await pwa();
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

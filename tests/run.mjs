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
async function open(q = "") {
  const c = await browser.newContext({ locale: "en-US", acceptDownloads: true });
  ctxs.push(c);
  const p = await c.newPage();
  watch(p);
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
    await d1.click("#addi");
    await setField(d1.locator('tr.inc [data-f="desc"]'), "Salary");
    await setField(d1.locator('tr.inc [data-f="amt"]'), "9000");
    await saved(d1);
    await text(d2, "#sin", "₪ 9,000"); await total(d2, "₪ 2,635");
    await d2.selectOption("#month", "2026-11"); await text(d2, "#budline", "₪ 5,000");
    await d2.click("#accbtn"); await d2.click("#signout");
    await signIn(d2, A); await d2.locator("#app").waitFor();
    await text(d2, "#sin", "₪ 9,000");
    await d2.selectOption("#month", "2026-11"); await text(d2, "#budline", "₪ 5,000");
    await d2.selectOption("#month", "all");
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
  await test("compare shows two months per category with the change, and the trend strip picks a month", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Zara,300\n2026-10-04,Zara,100\n2026-10-05,Wolt,50");
    eq(await p.locator("#cmp").isHidden(), true, "hidden at first");
    await p.click("#cmpb");
    const first = await p.locator(".cmpt .cr").nth(1).innerText();
    eq(/₪ 300/.test(first) && /₪ 100/.test(first) && /↑ ₪ 200 \(200%\)/.test(first), true, "first row: " + first);
    const tot = await p.locator(".cmpt .cr.tot").innerText();
    eq(/Total spent/.test(tot) && /₪ 300/.test(tot) && /₪ 150/.test(tot) && /↑ ₪ 150 \(100%\)/.test(tot), true, "total row: " + tot);
    eq(await p.locator(".trend button").count(), 2, "trend months");
    await p.locator('.trend button[data-tm="2026-10"]').click();
    eq(await p.inputValue("#month"), "2026-10", "tap picks month");
    await total(p, "₪ 150");
    await p.click("#cmpb"); eq(await p.locator("#cmp").isHidden(), true, "hidden again");
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
    await p.click("[data-rclose]"); eq(await p.locator("#report").isHidden(), true, "closed");
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
    await total(p, "₪ 4,200"); await text(p, "#sin", "₪ 9,000"); await text(p, "#sleft", "₪ 4,800");
    eq(await p.locator('tr.inc:has(input[value="Salary"]) select').inputValue(), "", "income has no category");
    eq(await paste(p, "Bank", f), "Added 0 purchases, skipped 3 already saved.", "re-import");
  });
  await test("add income by hand; giving it a category turns it into a payback that lowers spending", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", `date,description,amount\n${today},Shufersal,400\n${today},Zara,100`);
    await p.click("#addi");
    await setField(p.locator('tr.inc [data-f="desc"]'), "Partner");
    await setField(p.locator('tr.inc [data-f="amt"]'), "-150");
    await total(p, "₪ 500"); await text(p, "#sin", "₪ 150"); await text(p, "#sleft", "₪ -350");
    eq(await p.locator('tr.inc [data-f="amt"]').inputValue(), "150", "income amount is kept positive");
    await p.locator("tr.inc select").selectOption("Groceries");
    await total(p, "₪ 350"); eq(await p.locator("#sin").count(), 0, "a payback is not income");
    await text(p, '.bw[data-c="Groceries"] .amt', "₪ 250");
    eq(await p.locator('tr:has(input[value="Zara"]) select').inputValue(), "Shopping", "payback did not re-sort purchases");
    await p.reload(); await total(p, "₪ 350");
    eq(await p.evaluate(() => CL.join()), "Visa", "income adds no card");
  });
  await test("recurring income is added as income, not spending", async () => {
    const p = await open("?local=1");
    await p.click('[data-p="rec"]');
    await p.fill("#rdesc", "Salary"); await p.fill("#ramt", "9000"); await p.selectOption("#rkind", "inc");
    eq(await p.locator("#rcard").isVisible(), false, "card choice hidden for income");
    await p.click("#radd");
    await total(p, "₪ 0"); await text(p, "#sin", "₪ 9,000"); eq(await p.locator("tr.inc").count(), 1, "income rows");
    await p.reload(); await text(p, "#sin", "₪ 9,000"); eq(await p.locator("tr.inc").count(), 1, "income rows after reload");
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
    await setField(p.locator('[data-ren="0"]'), "Food");
    await text(p, '.bw[data-c="Food"] small', "of ₪ 500");
    await paste(p, "Visa", `date,description,amount\n${today},Shufersal Deal,600`);
    await p.selectOption("#month", mo);
    eq(await p.locator('.bw.over[data-c="Food"]').count(), 1, "over budget");
    await text(p, "#budline", "₪ 150 over the ₪ 1,000 budget");
    await p.reload(); await p.selectOption("#month", mo); await text(p, "#budline", "over the ₪ 1,000 budget");
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
    await text(p, "#sin", "₪ 8,640"); await total(p, "₪ 0");
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
    await p.click("#slipgo"); await text(p, "#sin", "₪ 7,912");
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
    await text(p, "#sin", "₪ 8,051"); eq(await p.inputValue("#paste"), "", "pasted slip cleared");
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
    await setField(p.locator('.cn[value="Transport"]'), "constructor");
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
    eq((await ci("Groceries").innerText()).trim(), "🛒", "starting icon");
    await ci("Groceries").click(); await p.locator('[data-pick="🍔"]').click();
    eq((await ci("Groceries").innerText()).trim(), "🍔", "picked icon");
    await ci("Health").click(); await setField(p.locator("[data-icin]"), "🌟");
    eq((await ci("Health").innerText()).trim(), "🌟", "typed icon");
    await ci("Transport").click(); await p.locator('[data-pick=""]').click();
    eq((await ci("Transport").innerText()).trim(), "＋", "no icon");
    await p.reload();
    eq((await ci("Groceries").innerText()).trim(), "🍔", "picked icon after reload");
    eq((await ci("Transport").innerText()).trim(), "＋", "no icon after reload");
    await setField(p.locator('.cn[value="Groceries"]'), "Food");
    eq((await ci("Food").innerText()).trim(), "🍔", "icon follows a rename");
  });
  await test("month start day; fixed charges; what is still to come; pace line", async () => {
    const p = await open("?local=1");
    // Pure helpers: a month that starts on the 15th.
    eq(await p.evaluate(() => { S.mstart = 15; return [pk("2026-11-10"), pk("2026-11-15"), pk("2026-01-02"), mrange("2026-10").join(">")].join(" ") }), "2026-10 2026-11 2025-12 2026-10-15>2026-11-14", "mk and mrange with start day 15");
    await p.evaluate(() => { delete S.mstart });
    // Netflix every month (fixed), Gym on the 28th of the last 3 months (fixed, due later), Shufersal many times a month (not fixed).
    await p.evaluate(() => {
      const d = new Date(), at = (back, day) => dstr(new Date(d.getFullYear(), d.getMonth() - back, day)); let n = 0;
      const add = (date, desc, amt) => S.tx.push({ id: "t" + (n++), date, desc, amt, card: "My card", cat: "Other" });
      for (let b = 1; b <= 3; b++) { add(at(b, 3), "Netflix", 50); add(at(b, 28), "Gym", 200); add(at(b, 5), "Shufersal", 300); add(at(b, 9), "Shufersal", 280) }
      add(at(0, 1), "Netflix", 50); add(ymd(), "Shufersal", 100); S.budget = { total: 3000, cats: {} }; save(); render();
    });
    await p.selectOption("#month", await p.evaluate(() => pk(ymd())));
    await text(p, "#fixedline", "Fixed ₪ 50 · everything else ₪ 100");
    await text(p, "#pace", "by the end of the month at this pace");
    if (await p.evaluate(() => +ymd().slice(8, 10)) <= 27) await text(p, ".soon summary", "₪ 200 of fixed charges still to come");
    eq(await p.evaluate(() => Object.keys(fixedSet()).sort().join()), "gym,netflix", "which charges count as fixed");
    eq(await p.evaluate(() => fkey({ desc: "Disney+ 3/12 *77 Studios" })), "disney studios", "digits and signs dropped, letters kept");
    // Month start day from the Budgets panel: saved, and months are named by their dates.
    await p.click('[data-p="bud"]'); await setField(p.locator("#mstart"), "15");
    eq(await p.evaluate(() => S.mstart), 15, "saved start day");
    eq(await p.evaluate(() => [...document.querySelectorAll("#month option")].slice(-1)[0].textContent.includes("–")), true, "month names show the dates");
    await p.reload(); eq(await p.evaluate(() => S.mstart), 15, "start day after reload");
  });
  await test("quick add: button and ?add=1; today's date, guessed category, undo; opens on this month with its budget", async () => {
    const p = await open("?local=1&add=1");
    await p.locator("#qa").waitFor({ state: "visible" });
    eq(await p.evaluate(() => location.search), "?local=1", "add=1 removed from the address");
    await p.evaluate(() => { S.budget = { total: 1000, cats: {} }; });
    await setField(p.locator("#qamt"), "45"); await p.fill("#qdesc", "Shufersal"); await p.click("#qsave");
    await total(p, "₪ 45"); eq(await p.locator("#qa").isHidden(), true, "sheet closed");
    await text(p, "#budline", "₪ 955 left of ₪ 1,000");
    eq(await p.evaluate(() => { const x = S.tx[S.tx.length - 1]; return [x.date == ymd(), x.cat, x.amt].join() }), "true,Groceries,45", "saved row");
    await p.click("#undo"); await total(p, "₪ 0");
    await p.click("#qab"); await p.click("#qx"); eq(await p.locator("#qa").isHidden(), true, "cancel");
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
  await test("split a purchase across categories; #tags in notes filter and total", async () => {
    const p = await open("?local=1");
    await paste(p, "Visa", "date,description,amount\n2026-11-03,Shufersal,400\n2026-11-04,Zara,100");
    await total(p, "₪ 500");
    const row = 'tr:has([data-f="desc"][value="Shufersal"])', bar = c => `.cat:has(.cn[value="${c}"]) .amt`;
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
    await p.click('.cat:has(.cn[value="Health"]) .bw'); eq(await rows(p), 1, "rows under Health"); await p.click("#clearcat");
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
    const p = await c.newPage(); watch(p);
    await p.clock.install({ time: new Date("2026-07-10T21:30:00Z") });
    await p.goto(URL + "?local=1");
    await p.click("#addp");
    eq(await p.locator('#rows [data-f="date"]').inputValue(), "2026-07-11", "new purchase date");
    await setField(p.locator('#rows [data-f="desc"]'), "Kiosk"); await setField(p.locator('#rows [data-f="amt"]'), "10");
    await p.click('[data-p="rec"]');
    await p.fill("#rdesc", "Gym"); await p.fill("#ramt", "200"); await p.fill("#rday", "11"); await p.click("#radd");
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
  await test("a new deploy shows on the next load; an app left open gets the Reload notice", async () => {
    const p = await open("?local=1&sw=1"); await controlled(p);
    try {
      deploy("t2"); await p.reload();
      eq(await mark(p), "t2", "page after first deploy"); eq(await p.evaluate(() => APPV), "t2", "page version");
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

// Writes the app version into sw.js (VERSION) and index.html (file?v=VERSION). Runs before every `npm test`.
// The version is a hash of the app's files, so it changes exactly when one of them changes.
// Without a new version, installed phones would keep showing the old files.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(ROOT, f));
const text = f => read(f).toString("utf8");
const VER = /const VERSION="[^"]*"/, Q = /(?<="(?:style\.css|app\.js|cloud\.js))\?v=[\w-]*/g;

const sw = text("sw.js"), html = text("index.html");
const list = JSON.parse(sw.match(/const FILES=(\[[^\]]*\])/)[1].replace(/\+VERSION/g, ""));
const files = list.filter(f => f != "./").map(f => f.replace(/\?v=$/, ""));
const h = crypto.createHash("sha256");
// Line endings are ignored so the PC and the laptop always agree on the version.
const lf = s => s.replace(/\r\n/g, "\n");
h.update(lf(sw.replace(VER, "")));
h.update(lf(html.replace(Q, "")));
for (const f of files) { if (!fs.existsSync(path.join(ROOT, f))) throw new Error("sw.js lists a missing file: " + f); h.update(/\.(png|ico)$/.test(f) || f.startsWith("vendor/") ? read(f) : lf(text(f))) }
const v = h.digest("hex").slice(0, 10);

for (const f of ["style.css", "app.js", "cloud.js"]) if (!new RegExp(`"${f.replace(".", "\\.")}\\?v=`).test(html)) throw new Error(`index.html must load ${f} as ${f}?v=...`);
const sw2 = sw.replace(VER, `const VERSION="${v}"`), html2 = html.replace(Q, "?v=" + v);
if (sw2 != sw) fs.writeFileSync(path.join(ROOT, "sw.js"), sw2);
if (html2 != html) fs.writeFileSync(path.join(ROOT, "index.html"), html2);
console.log(sw2 != sw || html2 != html ? "App version stamped: " + v : "App version unchanged: " + v);

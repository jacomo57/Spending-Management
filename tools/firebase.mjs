// Copies the Firebase SDK's browser files (app, auth, firestore) from node_modules/firebase into vendor/firebase/,
// so the site loads them from itself and not from gstatic.com. Run after changing the firebase version in package.json:
//   node tools/firebase.mjs      (then set FB_VER in app.js to the same version and run npm test)
// The auth and firestore files import the app file by its gstatic address; that is rewritten to the local copy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(ROOT, "node_modules", "firebase"), out = path.join(ROOT, "vendor", "firebase");
const ver = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8")).version;
fs.mkdirSync(out, { recursive: true });
for (const n of ["app", "auth", "firestore"]) {
  let s = fs.readFileSync(path.join(src, `firebase-${n}.js`), "utf8").replace(/\r\n/g, "\n");
  s = s.replace(/(from\s*["'])https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[\w-]+\.js)(["'])/g, "$1./$2$3").replace(/\n\/\/# sourceMappingURL=.*\n?$/, "\n");
  const left = s.match(/(?:from|import)\s*\(?\s*["']https?:[^"']*["']/);
  if (left) throw new Error(`firebase-${n}.js still imports from another site: ${left[0]}`);
  fs.writeFileSync(path.join(out, `firebase-${n}.js`), s);
}
console.log("Copied Firebase " + ver + " to vendor/firebase/");

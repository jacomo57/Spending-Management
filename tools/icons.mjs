// Draws the app icons (PNG) from one design, using the installed Edge. Run again only if the design changes: node tools/icons.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "icons");
// round: rounded corners on a see-through background. Otherwise the green fills the whole square
// (phones cut their own shape), and "scale" keeps the bars inside the safe middle area.
const base = fs.readFileSync(path.join(OUT, "icon.svg"), "utf8");
const svg = (round, scale) => base.replace("<svg ", '<svg width="100%" height="100%" ').replace('rx="112"', `rx="${round ? 112 : 0}"`).replace('<g fill="#fff">', `<g fill="#fff" transform="translate(256 256) scale(${scale}) translate(-256 -256)">`);
const jobs = [["icon-192.png", 192, true, 1], ["icon-512.png", 512, true, 1], ["maskable-512.png", 512, false, 0.8], ["apple-touch-icon.png", 180, false, 0.9]];

const browser = await chromium.launch({ channel: "msedge" }).catch(() => chromium.launch({ channel: "chrome" }));
for (const [name, size, round, scale] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:transparent">${svg(round, scale)}</body>`);
  await page.screenshot({ path: path.join(OUT, name), omitBackground: true });
  await page.close();
  console.log("wrote icons/" + name);
}
await browser.close();

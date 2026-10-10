// Test de bout en bout : ouvre la vraie page dans Chromium, charge la photo de test
// par le champ "Galerie" et compare le résultat au résultat de référence natif.
// Usage : node tests/e2e_browser.mjs build/amphi.png tests/expected/amphi.json
// Variable CHROMIUM : chemin du binaire (défaut : celui de Playwright dans /opt/pw-browsers).
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const [, , photoPath, expectedPath] = process.argv;
const root = resolve("docs");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm",
  ".png": "image/png", ".webmanifest": "application/manifest+json" };

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = join(root, p);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  await page.setInputFiles("#inputGallery", photoPath);
  await page.waitForFunction(() => window.__votarResult || document.querySelector("#status.error"), null, { timeout: 60000 });
  assert.equal(await page.locator("#status.error").count(), 0, "message d'erreur affiché : " + await page.textContent("#status"));

  const got = await page.evaluate(() => window.__votarResult);
  const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
  assert.deepStrictEqual(got, expected);
  assert.equal(await page.textContent("#label1"), `b: ${expected.prcount[1]}`);
  assert.equal(await page.textContent("#label2"), `c: ${expected.prcount[2]}`);
  assert.deepEqual(errors, [], "erreurs dans la console : " + errors.join(" | "));

  mkdirSync("build", { recursive: true });
  await page.screenshot({ path: "build/e2e.png" });
  console.log(`OK : la page dans Chromium donne le résultat natif (${got.markcount} marques, prcount ${got.prcount}). Capture : build/e2e.png`);
} finally {
  await browser.close();
  server.close();
}

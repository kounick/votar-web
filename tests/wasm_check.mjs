// Compare le résultat du module WebAssembly au résultat de référence natif.
// Usage : node tests/wasm_check.mjs build/votar.js build/amphi.rgba LARGEUR HAUTEUR tests/expected/amphi.json
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import path from "node:path";

const [, , modulePath, rgbaPath, w, h, expectedPath] = process.argv;
const width = Number(w), height = Number(h);

const { default: createVotar } = await import(pathToFileURL(path.resolve(modulePath)).href);
const m = await createVotar();

const rgba = readFileSync(rgbaPath);
assert.equal(rgba.length, width * height * 4, "taille du fichier RGBA inattendue");

const ptr = m._malloc(rgba.length);
m.HEAPU8.set(rgba, ptr);
const markcount = m._votar_analyze(ptr, width, height);
assert.ok(markcount >= 0, "votar_analyze a échoué");

const prPtr = m._votar_prcount() >> 2;
const marksPtr = m._votar_marks() >> 2;
const marks = [];
for (let i = 0; i < markcount; i++)
  marks.push([m.HEAP32[marksPtr + 3 * i], m.HEAP32[marksPtr + 3 * i + 1], m.HEAP32[marksPtr + 3 * i + 2]]);
const got = {
  width, height,
  prcount: [0, 1, 2, 3].map((i) => m.HEAP32[prPtr + i]),
  markcount, marks,
};
m._free(ptr);

const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
assert.deepStrictEqual(got, expected);
console.log(`OK : WebAssembly identique au natif (${markcount} marques, prcount ${got.prcount})`);

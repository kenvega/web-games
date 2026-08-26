import { SYMBOL_MATCH_SYMBOL_IDS } from "@multiplayer-blueprint/shared";
import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const assetDirectory = fileURLToPath(
  new URL("../src/game/symbol-match/symbols/", import.meta.url)
);
const catalogPath = fileURLToPath(
  new URL("../src/game/symbol-match/symbolCatalog.ts", import.meta.url)
);
const allowedColors = new Set([
  "#171717",
  "#36A7E8",
  "#49D6D0",
  "#F15B5A",
  "#E43D49",
  "#FF9F43",
  "#FFC94A",
  "#76C84A",
  "#3D9D59",
  "#9B6BD3",
  "#E77EB3",
  "#A96A48",
  "#83909E",
  "#66717E",
  "#F7F3E8"
]);
const forbiddenMarkup =
  /<(?:text|title|desc|linearGradient|radialGradient|filter|mask|pattern|image|foreignObject|style)\b/i;
const forbiddenEffects = /(?:opacity|filter|mask|clip-path)\s*=/i;

function fail(message) {
  throw new Error(`Symbol Match asset validation failed: ${message}`);
}

const expectedFiles = SYMBOL_MATCH_SYMBOL_IDS.map(
  (symbolId) => `${symbolId}.svg`
);
const actualFiles = (await readdir(assetDirectory))
  .filter((fileName) => fileName.endsWith(".svg"))
  .sort();

if (actualFiles.length !== SYMBOL_MATCH_SYMBOL_IDS.length) {
  fail(
    `expected ${SYMBOL_MATCH_SYMBOL_IDS.length} SVG files, found ${actualFiles.length}`
  );
}
if (actualFiles.join("\n") !== [...expectedFiles].sort().join("\n")) {
  fail("SVG filenames do not exactly match the canonical symbol roster");
}

for (const fileName of actualFiles) {
  const source = await readFile(`${assetDirectory}/${fileName}`, "utf8");
  if (!source.startsWith("<svg ")) {
    fail(`${fileName} must begin with an SVG root element`);
  }
  if (!source.includes('viewBox="0 0 128 128"')) {
    fail(`${fileName} must use viewBox="0 0 128 128"`);
  }
  if (!source.includes('stroke-linecap="round"')) {
    fail(`${fileName} must use rounded stroke caps`);
  }
  if (!source.includes('stroke-linejoin="round"')) {
    fail(`${fileName} must use rounded stroke joins`);
  }
  if (!source.includes("#171717")) {
    fail(`${fileName} must use the canonical near-black outline color`);
  }
  if (forbiddenMarkup.test(source) || forbiddenEffects.test(source)) {
    fail(`${fileName} contains forbidden text, media, or visual effects`);
  }
  if (/\b(?:width|height)="128"/.test(source)) {
    fail(`${fileName} appears to contain an opaque full-canvas background`);
  }
  const colors = source.match(/#[0-9A-Fa-f]{6}/g) ?? [];
  for (const color of colors) {
    if (!allowedColors.has(color.toUpperCase())) {
      fail(`${fileName} uses unsupported color ${color}`);
    }
  }
}

const catalogSource = await readFile(catalogPath, "utf8");
const catalogIds = [
  ...catalogSource.matchAll(/defineSymbol\(\s*"([^"]+)"/g)
].map((match) => match[1]);
if (new Set(catalogIds).size !== catalogIds.length) {
  fail("the typed catalog contains a duplicate or aliased symbol ID");
}
if (catalogIds.join("\n") !== SYMBOL_MATCH_SYMBOL_IDS.join("\n")) {
  fail("the typed catalog does not exactly follow the canonical symbol roster");
}

process.stdout.write(
  `Validated ${actualFiles.length} original Symbol Match SVG assets and catalog entries.\n`
);

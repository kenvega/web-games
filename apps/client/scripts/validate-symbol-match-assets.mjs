import { SYMBOL_MATCH_SYMBOL_IDS } from "@multiplayer-blueprint/shared";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const assetDirectory = fileURLToPath(
  new URL("../src/game/symbol-match/symbols/", import.meta.url)
);
const catalogPath = fileURLToPath(
  new URL("../src/game/symbol-match/symbolCatalog.ts", import.meta.url)
);
const manifestPath = fileURLToPath(
  new URL(
    "../src/game/symbol-match/notoEmojiAssetManifest.json",
    import.meta.url
  )
);
const licensePath = fileURLToPath(
  new URL("../public/licenses/noto-emoji-apache-2.0.txt", import.meta.url)
);
const forbiddenElements =
  /<(?:script|foreignObject|image|iframe|object|embed|audio|video|text)\b/i;
const externalHref = /\b(?:href|xlink:href)\s*=\s*["'](?!#)[^"']+/i;
const externalUrl = /url\(\s*["']?(?!#)[^)"']+/i;

function fail(message) {
  throw new Error(`Symbol Match asset validation failed: ${message}`);
}

function gitBlobSha(bytes) {
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (
  manifest.assetSet !== "Noto Emoji" ||
  manifest.upstreamRepository !== "https://github.com/googlefonts/noto-emoji" ||
  manifest.license !== "Apache-2.0" ||
  manifest.deployedLicensePath !== "/licenses/noto-emoji-apache-2.0.txt" ||
  !/^[0-9a-f]{40}$/.test(manifest.revision)
) {
  fail("the Noto provenance manifest contains invalid snapshot metadata");
}

const manifestIds = Object.keys(manifest.symbols);
if (manifestIds.join("\n") !== SYMBOL_MATCH_SYMBOL_IDS.join("\n")) {
  fail(
    "the Noto provenance manifest does not exactly follow the canonical symbol roster"
  );
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

for (const symbolId of SYMBOL_MATCH_SYMBOL_IDS) {
  const fileName = `${symbolId}.svg`;
  const bytes = await readFile(`${assetDirectory}/${fileName}`);
  const source = bytes.toString("utf8");
  const provenance = manifest.symbols[symbolId];

  if (!/<svg\b/i.test(source)) {
    fail(`${fileName} does not contain an SVG root element`);
  }
  if (!/<svg\b[^>]*\bviewBox=["']0 0 128 128["']/i.test(source)) {
    fail(`${fileName} must use viewBox="0 0 128 128"`);
  }
  if (forbiddenElements.test(source)) {
    fail(`${fileName} contains executable, external-media, or text markup`);
  }
  if (
    externalHref.test(source) ||
    externalUrl.test(source) ||
    /\bdata:/i.test(source)
  ) {
    fail(`${fileName} references an external or embedded resource`);
  }
  if (!/^svg\/emoji_u[0-9a-f_]+\.svg$/.test(provenance.sourcePath)) {
    fail(`${fileName} has an invalid upstream source path`);
  }
  if (gitBlobSha(bytes) !== provenance.gitBlobSha) {
    fail(`${fileName} no longer matches its pinned upstream Noto Emoji blob`);
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

const licenseText = await readFile(licensePath, "utf8");
if (
  !licenseText.includes("Apache License") ||
  !licenseText.includes("Version 2.0")
) {
  fail(
    "the deployed Noto Emoji Apache 2.0 license text is missing or incomplete"
  );
}

process.stdout.write(
  `Validated ${actualFiles.length} pinned Noto Emoji SVG assets, provenance hashes, license, and catalog entries.\n`
);

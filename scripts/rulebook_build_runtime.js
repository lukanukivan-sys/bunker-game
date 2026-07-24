"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { parseChapter } = require("./rulebook_validate");

const ROOT = path.resolve(__dirname, "..");
const RULEBOOK_ROOT = path.join(ROOT, "docs", "rulebook");
const OUTPUT_PATH = path.join(ROOT, "public", "rulebook", "data", "rulebook-data.json");
const FALLBACK_PATH = path.join(ROOT, "public", "rulebook", "data", "rulebook-fallback.js");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(RULEBOOK_ROOT, relativePath), "utf8"));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function buildRuntimeBundle(options = {}) {
  const rulebookRoot = options.rulebookRoot || RULEBOOK_ROOT;
  const manifest = JSON.parse(fs.readFileSync(path.join(rulebookRoot, "manifest.json"), "utf8"));
  const readLocalJson = (name) => JSON.parse(fs.readFileSync(path.join(rulebookRoot, name), "utf8"));
  const bookMap = readLocalJson(manifest.dataFiles.bookMap);
  const terminology = readLocalJson(manifest.dataFiles.terminology);
  const unstableRules = readLocalJson(manifest.dataFiles.unstableRules);
  const ux = readLocalJson("ux-config.json");
  const designTokens = readLocalJson("design-tokens.json");
  const versionHistory = readLocalJson(manifest.dataFiles.versionHistory);
  const ruleChanges = readLocalJson(manifest.dataFiles.ruleChanges);

  const chapters = manifest.chapters
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const parsed = parseChapter(path.join(rulebookRoot, entry.file));
      return {
        id: entry.id,
        file: entry.file,
        part: entry.part,
        order: entry.order,
        status: entry.status,
        metadata: parsed.metadata,
        anchors: parsed.anchors,
        markdown: parsed.body.trim()
      };
    });

  const payload = {
    schema: "rulebook-runtime-v1",
    productVersion: manifest.productVersion,
    rulebookVersion: manifest.rulebookVersion,
    locale: manifest.locale,
    manifest,
    bookMap,
    ux,
    designTokens,
    terminology,
    unstableRules,
    versionHistory,
    ruleChanges,
    chapters
  };
  const contentDigest = crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
  return { ...payload, contentDigest };
}

function writeRuntimeBundle(bundle, outputPath = OUTPUT_PATH) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  return outputPath;
}

function writeFallbackBundle(bundle, outputPath = FALLBACK_PATH) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const payload = JSON.stringify(bundle);
  const source = `(function(root){"use strict";root.SkhovyshcheRulebookFallback=Object.freeze(${payload});})(typeof globalThis!=="undefined"?globalThis:this);\n`;
  fs.writeFileSync(outputPath, source, "utf8");
  return outputPath;
}

function main() {
  const bundle = buildRuntimeBundle();
  const outputPath = writeRuntimeBundle(bundle);
  const fallbackPath = writeFallbackBundle(bundle);
  console.log(`✅ Runtime bundle довідника: ${path.relative(ROOT, outputPath)}`);
  console.log(`✅ Offline fallback довідника: ${path.relative(ROOT, fallbackPath)}`);
  console.log(`   ${bundle.bookMap.pages.length} сторінки, ${bundle.chapters.length} розділів, digest ${bundle.contentDigest.slice(0, 12)}…`);
}

if (require.main === module) main();

module.exports = { buildRuntimeBundle, stableStringify, writeFallbackBundle, writeRuntimeBundle };

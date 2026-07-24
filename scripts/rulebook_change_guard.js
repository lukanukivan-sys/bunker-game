"use strict";

const childProcess = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function normalizeFiles(files) {
  return [...new Set((files || [])
    .map((file) => String(file || "").trim().replaceAll("\\", "/"))
    .filter(Boolean))]
    .sort();
}

function anyMatch(files, patterns) {
  return files.some((file) => patterns.some((pattern) => pattern.test(file)));
}

function classifyChangedFiles(input) {
  const files = normalizeFiles(input);
  return {
    files,
    mechanical: files.filter((file) => [
      /^server\.js$/u,
      /^platform\.js$/u,
      /^final_(?:balance|simulation)\.js$/u,
      /^lib\/(?!room_store|platform_store_loader)/u,
      /^config\/(?!version\.js$)/u,
      /^public\/app\.js$/u,
      /^public\/(?:content|data)\//u
    ].some((pattern) => pattern.test(file))),
    rulebookSource: files.filter((file) => /^docs\/rulebook\/(?:content\/|manifest\.json$|book-map\.json$|terminology\.json$|unstable-rules\.json$|editorial-policy\.json$|rule-changes\.json$|version-history\.json$)/u.test(file)),
    rulebookRuntime: files.filter((file) => /^public\/rulebook\/data\/(?:rulebook-data\.json|rulebook-fallback\.js)$/u.test(file)),
    rulebookUi: files.filter((file) => /^public\/rulebook\/(?!data\/)/u.test(file) || file === "public/index.html"),
    tests: files.filter((file) => /^test_.*\.js$/u.test(file)),
    rulebookTests: files.filter((file) => /^test_rulebook_.*\.js$/u.test(file)),
    contentDocs: files.filter((file) => /^docs\/rulebook\/(?:content\/|unstable-rules\.json$)/u.test(file)),
    ruleChanges: files.filter((file) => file === "docs/rulebook/rule-changes.json"),
    versionHistory: files.filter((file) => file === "docs/rulebook/version-history.json"),
    manifest: files.filter((file) => file === "docs/rulebook/manifest.json")
  };
}

function validateRulebookChangeSet(input, options = {}) {
  const groups = classifyChangedFiles(input);
  const errors = [];
  const warnings = [];
  const strict = options.strict !== false;

  if (!groups.files.length) {
    warnings.push("Не вдалося визначити змінені файли; guard пропущено.");
    return { errors, warnings, groups };
  }

  if (groups.mechanical.length) {
    if (!groups.contentDocs.length) errors.push("Зміни механіки потребують оновлення відповідного правила або unstable-реєстру.");
    if (!groups.ruleChanges.length) errors.push("Зміни механіки потребують запису в docs/rulebook/rule-changes.json.");
    if (!groups.tests.length) errors.push("Зміни механіки потребують регресійного тесту.");
  }

  if (groups.rulebookSource.length) {
    const runtimeNames = new Set(groups.rulebookRuntime.map((file) => file.split("/").at(-1)));
    if (!runtimeNames.has("rulebook-data.json") || !runtimeNames.has("rulebook-fallback.js")) {
      errors.push("Зміни канонічного джерела довідника потребують перебудови runtime JSON і offline fallback.");
    }
  }

  if (groups.rulebookUi.length && !groups.rulebookTests.length) {
    errors.push("Зміни UI довідника потребують test_rulebook_*.js.");
  }

  if (groups.manifest.length) {
    if (!groups.versionHistory.length) errors.push("Зміна manifest.json потребує оновлення version-history.json.");
    if (!groups.ruleChanges.length) errors.push("Зміна manifest.json потребує оновлення rule-changes.json.");
  }

  if (!strict && errors.length) {
    warnings.push(...errors.map((error) => `Нестрогий режим: ${error}`));
    errors.length = 0;
  }
  return { errors, warnings, groups };
}

function changedFilesFromEnvironment(env = process.env) {
  if (env.RULEBOOK_CHANGED_FILES) {
    return normalizeFiles(env.RULEBOOK_CHANGED_FILES.split(/[\n,]/u));
  }
  const base = env.RULEBOOK_BASE_SHA;
  const head = env.RULEBOOK_HEAD_SHA || "HEAD";
  if (!base || /^0+$/u.test(base)) return [];
  try {
    const output = childProcess.execFileSync("git", ["diff", "--name-only", `${base}...${head}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return normalizeFiles(output.split(/\r?\n/u));
  } catch (error) {
    return [];
  }
}

function main() {
  const files = changedFilesFromEnvironment();
  const strict = process.env.RULEBOOK_SYNC_STRICT !== "0";
  const result = validateRulebookChangeSet(files, { strict });
  console.log(`Rulebook sync guard: ${result.groups.files.length} змінених файлів.`);
  for (const warning of result.warnings) console.warn(`⚠️ ${warning}`);
  for (const error of result.errors) console.error(`❌ ${error}`);
  if (result.errors.length) process.exitCode = 1;
  else console.log("✅ Зміни коду, тестів і довідника синхронізовані.");
}

if (require.main === module) main();
module.exports = { changedFilesFromEnvironment, classifyChangedFiles, normalizeFiles, validateRulebookChangeSet };

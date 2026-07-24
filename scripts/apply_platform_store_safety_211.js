"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const platformFile = path.join(root, "platform.js");
const packageFile = path.join(root, "package.json");

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Не знайдено фрагмент: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Фрагмент повторюється: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let source = fs.readFileSync(platformFile, "utf8");

source = replaceOnce(
  source,
  'const { PLATFORM_SCHEMA } = require("./config/version");',
  'const { PLATFORM_SCHEMA } = require("./config/version");\nconst { cloneReport, loadPlatformStores } = require("./lib/platform_store_loader");',
  "імпорт loader"
);

source = replaceOnce(
  source,
  'function readJson(file, fallback) {\n  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; }\n  catch { return fallback; }\n}\n',
  "",
  "тихе readJson"
);

source = replaceOnce(
  source,
  '  const accounts = new Map((readJson(files.accounts, []) || []).map((item) => {',
  '  const loadedStores = loadPlatformStores(dataDir);\n  const loadReport = loadedStores.report;\n  const accounts = new Map(loadedStores.accounts.map((item) => {',
  "accounts loader"
);

source = replaceOnce(
  source,
  '  const campaigns = new Map((readJson(files.campaigns, []) || []).map((item) => {\n    item.chapters = Array.isArray(item.chapters) ? item.chapters : [];\n    item.carryover ||= { version: 2, sourceChapter: null, resources: {}, allies: 0, legacy: [] };\n    item.carryover.version ||= 1;\n    item.carryover.resources ||= {};\n    item.carryover.legacy = Array.isArray(item.carryover.legacy) ? item.carryover.legacy : [];',
  '  const campaigns = new Map(loadedStores.campaigns.map((item) => {\n    item.chapters = Array.isArray(item.chapters) ? item.chapters : [];\n    item.carryover = item.carryover && typeof item.carryover === "object" && !Array.isArray(item.carryover)\n      ? item.carryover\n      : { version: 2, sourceChapter: null, resources: {}, allies: 0, legacy: [] };\n    item.carryover.version ||= 1;\n    item.carryover.resources = item.carryover.resources && typeof item.carryover.resources === "object" && !Array.isArray(item.carryover.resources)\n      ? item.carryover.resources\n      : {};\n    item.carryover.legacy = Array.isArray(item.carryover.legacy) ? item.carryover.legacy : [];',
  "campaign loader"
);

source = replaceOnce(
  source,
  '  const packs = new Map((readJson(files.packs, []) || []).map((item) => [item.id, item]));\n  const globalStats = readJson(files.stats, {\n    games: 0, totalScore: 0, bestScore: 0, settings: {}, modes: {},\n    players: 0, births: 0, deaths: 0, startedAt: Date.now(), recentGames: []\n  });',
  '  const packs = new Map(loadedStores.packs.map((item) => [item.id, item]));\n  const globalStats = loadedStores.stats;',
  "packs and stats loader"
);

source = replaceOnce(
  source,
  '  function publicGlobalStats() {',
  '  function getLoadReport() {\n    return cloneReport(loadReport);\n  }\n  function publicGlobalStats() {',
  "diagnostic report getter"
);

source = replaceOnce(
  source,
  '    recordGame, publicGlobalStats, validatePack',
  '    recordGame, publicGlobalStats, getLoadReport, validatePack',
  "public API report"
);

fs.writeFileSync(platformFile, source, "utf8");

const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
pkg.scripts["check:syntax"] = "node --check server.js && node --check platform.js && node --check lib/room_store.js && node --check lib/platform_store_loader.js";
fs.writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

console.log("Platform store safety patch applied.");

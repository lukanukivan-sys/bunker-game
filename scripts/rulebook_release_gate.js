"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { validateRulebookRelease } = require("./rulebook_release_validate");
const { validateRulebookDelivery } = require("./rulebook_delivery_validate");

const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs", "rulebook");
const REPORT_MD = path.join(ROOT, "reports", "rulebook_release_gate.md");
const REPORT_JSON = path.join(ROOT, "reports", "rulebook_release_candidate.json");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DOCS, name), "utf8"));
}

function releaseModeFromArgs(argv = process.argv.slice(2)) {
  const item = argv.find((arg) => arg.startsWith("--mode="));
  return item ? item.split("=")[1] : "rc";
}

function validateRulebookGate(mode = "rc") {
  if (!new Set(["rc", "final"]).has(mode)) throw new Error(`Невідомий режим release gate: ${mode}`);
  const release = validateRulebookRelease();
  const delivery = validateRulebookDelivery();
  const manifest = readJson("manifest.json");
  const unstable = readJson("unstable-rules.json");
  const acceptance = readJson("human-acceptance.json");
  const scenarios = readJson("usability-scenarios.json");
  const runtime = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "rulebook", "data", "rulebook-data.json"), "utf8"));

  const errors = [...release.errors, ...delivery.errors];
  const warnings = [...release.warnings, ...delivery.warnings];
  const openBlockers = (unstable.items || []).filter((item) => item.status !== "resolved");
  const sessions = Array.isArray(acceptance.sessions) ? acceptance.sessions : [];
  const blockingFindings = Array.isArray(acceptance.blockingFindings) ? acceptance.blockingFindings : [];

  if (mode === "rc" && !/^[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$/u.test(manifest.rulebookVersion)) {
    errors.push("RC-версія довідника має формат X.Y.Z-rc.N.");
  }
  if (mode === "final" && !/^[0-9]+\.[0-9]+\.[0-9]+$/u.test(manifest.rulebookVersion)) {
    errors.push("Фінальна версія довідника має формат X.Y.Z без суфікса rc.");
  }
  if (scenarios.schema !== "rulebook-usability-scenarios-v1" || (scenarios.scenarios || []).length < 8) {
    errors.push("Набір приймальних сценаріїв неповний.");
  }
  if (acceptance.schema !== "rulebook-human-acceptance-v1") errors.push("Несумісна схема human acceptance.");
  if (!new Set(["pending", "failed", "passed"]).has(acceptance.status)) errors.push("Human acceptance має невідомий статус.");

  if (mode === "rc") {
    if (openBlockers.length) warnings.push(`RC містить ${openBlockers.length} provisional P0-тем; фінальний випуск заблокований.`);
    if (acceptance.status !== "passed") warnings.push("Реальне приймальне тестування ще не завершено.");
  } else {
    if (openBlockers.length) errors.push(`Фінальний реліз неможливий: відкрито ${openBlockers.length} provisional P0-тем.`);
    if (acceptance.status !== "passed") errors.push("Фінальний реліз неможливий: human-acceptance.json не має статусу passed.");
    if (sessions.length < Number(acceptance.minimumParticipants || 3)) errors.push("Недостатньо реальних приймальних сеансів.");
    if (blockingFindings.length) errors.push("У human acceptance лишилися блокувальні findings.");
  }

  return {
    mode,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    stats: {
      productVersion: manifest.productVersion,
      rulebookVersion: manifest.rulebookVersion,
      contentDigest: runtime.contentDigest,
      pages: runtime.bookMap.pages.length,
      scenarios: scenarios.scenarios.length,
      openBlockers: openBlockers.length,
      acceptanceStatus: acceptance.status,
      acceptanceSessions: sessions.length,
      blockingFindings: blockingFindings.length
    }
  };
}

function renderMarkdown(result) {
  const lines = [
    "# Release gate інтерактивного довідника",
    "",
    `- Режим: **${result.mode}**`,
    `- Гра: **${result.stats.productVersion}**`,
    `- Довідник: **${result.stats.rulebookVersion}**`,
    `- Сторінок: **${result.stats.pages}**`,
    `- Приймальних сценаріїв: **${result.stats.scenarios}**`,
    `- Відкритих P0-тем: **${result.stats.openBlockers}**`,
    `- Human acceptance: **${result.stats.acceptanceStatus}** (${result.stats.acceptanceSessions} сеансів)`,
    `- Digest: \`${result.stats.contentDigest}\``,
    ""
  ];
  if (result.errors.length) lines.push("## Блокери", "", ...result.errors.map((item) => `- ❌ ${item}`));
  else lines.push("## Автоматичний висновок", "", result.mode === "rc" ? "✅ Довідник готовий як release candidate." : "✅ Довідник готовий до фінального випуску.");
  if (result.warnings.length) lines.push("", "## Попередження", "", ...result.warnings.map((item) => `- ⚠️ ${item}`));
  return `${lines.join("\n")}\n`;
}

function writeReports(result) {
  fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
  fs.writeFileSync(REPORT_MD, renderMarkdown(result), "utf8");
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify({ schema: "rulebook-release-candidate-v1", generatedAt: "2026-07-24", ...result.stats, mode: result.mode, status: result.errors.length ? "blocked" : "ready", warnings: result.warnings }, null, 2)}\n`, "utf8");
}

function main() {
  const result = validateRulebookGate(releaseModeFromArgs());
  writeReports(result);
  for (const warning of result.warnings) console.warn(`⚠️ ${warning}`);
  for (const error of result.errors) console.error(`❌ ${error}`);
  if (result.errors.length) process.exitCode = 1;
  else console.log(`✅ Release gate (${result.mode}) пройдено: ${result.stats.rulebookVersion}, digest ${result.stats.contentDigest.slice(0, 12)}…`);
}

if (require.main === module) main();
module.exports = { releaseModeFromArgs, renderMarkdown, validateRulebookGate, writeReports };

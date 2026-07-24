"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const loader = require("../public/rulebook/rulebook-loader");
const renderer = require("../public/rulebook/rulebook-renderer");

const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs", "rulebook");
const PUBLIC = path.join(ROOT, "public", "rulebook");
const REPORT_PATH = path.join(ROOT, "reports", "rulebook_delivery_audit.md");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readFallback(file) {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { filename: file, timeout: 2_000 });
  return context.globalThis.SkhovyshcheRulebookFallback;
}

function walkStrings(value, visit, pathName = "bundle") {
  if (typeof value === "string") visit(value, pathName);
  else if (Array.isArray(value)) value.forEach((item, index) => walkStrings(item, visit, `${pathName}[${index}]`));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => walkStrings(item, visit, `${pathName}.${key}`));
}

function validateRulebookDelivery() {
  const errors = [];
  const warnings = [];
  const runtime = readJson(path.join(PUBLIC, "data", "rulebook-data.json"));
  const fallback = readFallback(path.join(PUBLIC, "data", "rulebook-fallback.js"));
  const manifest = readJson(path.join(DOCS, "manifest.json"));
  const history = readJson(path.join(DOCS, manifest.dataFiles.versionHistory));
  const changes = readJson(path.join(DOCS, manifest.dataFiles.ruleChanges));
  const index = fs.readFileSync(path.join(ROOT, "public", "index.html"), "utf8");
  const shell = fs.readFileSync(path.join(PUBLIC, "rulebook-shell.js"), "utf8");
  const audio = fs.readFileSync(path.join(PUBLIC, "rulebook-audio.js"), "utf8");
  const css = fs.readFileSync(path.join(PUBLIC, "rulebook.css"), "utf8");

  try { loader.validateRulebookBundle(runtime); } catch (error) { errors.push(`Runtime bundle: ${error.message}`); }
  try { loader.validateRulebookBundle(fallback); } catch (error) { errors.push(`Fallback bundle: ${error.message}`); }
  if (runtime.contentDigest !== fallback?.contentDigest) errors.push("Offline fallback не збігається з runtime JSON за contentDigest.");
  if (runtime.rulebookVersion !== history.current?.rulebookVersion) errors.push("Version history не відповідає runtime bundle.");
  if (changes.rulebookVersion !== runtime.rulebookVersion) errors.push("Журнал змін має іншу версію довідника.");

  const pageIds = new Set((runtime.bookMap?.pages || []).map((page) => page.id));
  for (const entry of changes.entries || []) {
    if (!entry.id || !entry.title || !entry.summary) errors.push("Журнал змін містить неповний запис.");
    for (const pageId of entry.pages || []) if (!pageIds.has(pageId)) errors.push(`Зміна ${entry.id} посилається на невідому сторінку ${pageId}.`);
  }

  if (!index.includes("rulebook/data/rulebook-fallback.js?stage=36-40")) errors.push("Offline fallback не підключено до index.html.");
  if (index.indexOf("rulebook-fallback.js") > index.indexOf("rulebook-loader.js")) errors.push("Offline fallback має завантажуватися до loader.");
  if (!shell.includes("Stable pages are updated only after the moving sheet has completed")) errors.push("Перегортання не заморожує стабільний розворот до завершення анімації.");
  for (const marker of ["rulebook-turn-reveal", "measurePagePresentation", "copyPagePresentation"]) {
    if (!shell.includes(marker)) errors.push(`Оболонка не містить захисту форматування: ${marker}.`);
  }
  if (/page-turn-(?:forward|backward)\.wav/u.test(audio)) errors.push("Модуль звуку все ще посилається на звук перегортання.");
  for (const filename of ["page-turn-forward.wav", "page-turn-backward.wav"]) {
    if (fs.existsSync(path.join(PUBLIC, "assets", filename))) errors.push(`Файл ${filename} не вилучено.`);
  }
  if (!css.includes("organic diagrams") || !css.includes(".rulebook-turn-reveal")) errors.push("CSS не містить нової інтеграції діаграм або reveal-шару.");

  const externalRefs = [];
  walkStrings(runtime, (value, itemPath) => {
    if (/https?:\/\//iu.test(value)) externalRefs.push(`${itemPath}: ${value.slice(0, 100)}`);
    if (/javascript\s*:/iu.test(value)) errors.push(`Небезпечна javascript-схема у ${itemPath}.`);
  });
  if (externalRefs.length) warnings.push(`Runtime містить ${externalRefs.length} зовнішніх текстових URL; вони не виконуються renderer-ом.`);

  const hostile = '<script>alert(1)</script><img src=x onerror=alert(2)> javascript:alert(3)';
  const rendered = renderer.renderMarkdown(hostile);
  if (rendered.includes("<script") || rendered.includes("<img") || /<[^>]+\sonerror\s*=/iu.test(rendered)) errors.push("Markdown renderer пропускає сирий HTML.");
  if (!rendered.includes("&lt;script&gt;")) errors.push("Markdown renderer не екранує HTML-теги.");
  if (renderer.safeVisualFilename("../escape.svg") !== null) errors.push("Renderer дозволяє path traversal у назві ілюстрації.");
  if (renderer.safeVisualFilename("safe-diagram.svg") !== "safe-diagram.svg") errors.push("Renderer відхиляє безпечну локальну SVG-назву.");
  if (loader.isAllowedRulebookUrl("https://example.com/rulebook/data.json")) errors.push("Loader дозволяє зовнішній origin.");
  if (loader.isAllowedRulebookUrl("/rulebook/../secret.json")) errors.push("Loader дозволяє path traversal.");
  if (!loader.isAllowedRulebookUrl("/rulebook/data/rulebook-data.json")) errors.push("Loader відхиляє канонічний локальний шлях.");

  return {
    errors,
    warnings,
    stats: {
      pages: runtime.bookMap.pages.length,
      changes: changes.entries.length,
      historyEntries: history.entries.length,
      digest: runtime.contentDigest,
      rulebookVersion: runtime.rulebookVersion,
      fallbackBytes: fs.statSync(path.join(PUBLIC, "data", "rulebook-fallback.js")).size
    }
  };
}

function renderReport(result) {
  const lines = [
    "# Аудит доставки, offline-поведінки та безпеки довідника",
    "",
    `- Версія довідника: **${result.stats.rulebookVersion}**`,
    `- Сторінок: **${result.stats.pages}**`,
    `- Записів журналу змін: **${result.stats.changes}**`,
    `- Редакцій у version history: **${result.stats.historyEntries}**`,
    `- Offline fallback: **${result.stats.fallbackBytes} байт**`,
    `- Digest: \`${result.stats.digest}\``,
    ""
  ];
  if (result.errors.length) lines.push("## Помилки", "", ...result.errors.map((item) => `- ❌ ${item}`));
  else lines.push("## Результат", "", "✅ Runtime, offline fallback, журнал змін, локальні ресурси та renderer пройшли автоматичну перевірку.");
  if (result.warnings.length) lines.push("", "## Попередження", "", ...result.warnings.map((item) => `- ⚠️ ${item}`));
  return `${lines.join("\n")}\n`;
}

function main() {
  const result = validateRulebookDelivery();
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, renderReport(result), "utf8");
  for (const warning of result.warnings) console.warn(`⚠️ ${warning}`);
  for (const error of result.errors) console.error(`❌ ${error}`);
  if (result.errors.length) process.exitCode = 1;
  else console.log(`✅ Доставка довідника ${result.stats.rulebookVersion}: ${result.stats.pages} сторінок, ${result.stats.changes} змін.`);
}

if (require.main === module) main();
module.exports = { readFallback, renderReport, validateRulebookDelivery };

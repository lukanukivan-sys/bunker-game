"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildRuntimeBundle, stableStringify } = require("./rulebook_build_runtime");
const config = require("../public/rulebook/rulebook-config");
const { createBookModel } = require("../public/rulebook/rulebook-model");
const layout = require("../public/rulebook/page-layout");

const ROOT = path.resolve(__dirname, "..");
const RULEBOOK_ROOT = path.join(ROOT, "docs", "rulebook");
const RUNTIME_PATH = path.join(ROOT, "public", "rulebook", "data", "rulebook-data.json");
const REPORT_PATH = path.join(ROOT, "reports", "rulebook_architecture_audit.md");

function addError(errors, condition, message) {
  if (!condition) errors.push(message);
}

function validateArchitecture() {
  const errors = [];
  const warnings = [];
  const ux = JSON.parse(fs.readFileSync(path.join(RULEBOOK_ROOT, "ux-config.json"), "utf8"));
  const tokens = JSON.parse(fs.readFileSync(path.join(RULEBOOK_ROOT, "design-tokens.json"), "utf8"));
  const runtime = JSON.parse(fs.readFileSync(RUNTIME_PATH, "utf8"));
  const rebuilt = buildRuntimeBundle();

  addError(errors, ux.schema === config.SCHEMAS.ux, `Некоректна UX-схема: ${ux.schema}`);
  addError(errors, tokens.schema === config.SCHEMAS.designTokens, `Некоректна схема design tokens: ${tokens.schema}`);
  addError(errors, runtime.schema === config.SCHEMAS.runtime, `Некоректна runtime-схема: ${runtime.schema}`);
  addError(errors, runtime.contentDigest === rebuilt.contentDigest, "Runtime bundle не синхронізований із docs/rulebook");
  addError(errors, stableStringify(runtime) === stableStringify(rebuilt), "Runtime bundle не є детермінованою збіркою поточних джерел");

  const desktop = ux.layouts?.desktop;
  const tablet = ux.layouts?.tablet;
  const mobile = ux.layouts?.mobile;
  addError(errors, desktop?.visiblePages === 2 && desktop?.turnStep === 2, "Desktop має використовувати розворот і крок у дві сторінки");
  addError(errors, tablet?.visiblePages === 1 && mobile?.visiblePages === 1, "Tablet і mobile мають використовувати одну сторінку");
  addError(errors, Number(desktop?.minWidth) > Number(tablet?.minWidth), "Desktop breakpoint має бути більшим за tablet breakpoint");
  addError(errors, ux.motion?.respectReducedMotion === true, "UX повинен поважати prefers-reduced-motion");
  addError(errors, Number(ux.motion?.durationMs) >= 600, "Повне перегортання має тривати щонайменше 600 мс");
  addError(errors, ux.focus?.trapInsideBook === true && ux.focus?.restoreOpener === true, "Не зафіксовано focus trap/restore");
  addError(errors, typeof ux.audio?.enabledByDefault === "boolean" && Number(ux.audio?.defaultVolume) >= 0 && ux.audio?.pageTurnSound === false && Array.isArray(ux.audio?.cues) && ux.audio.cues.every((cue) => ["open", "close"].includes(cue)), "Не зафіксовано беззвучне перегортання та безпечні параметри звуку книги");
  addError(errors, ux.search?.includeTerminologyAliases === true && Number(ux.search?.minimumQueryLength) === 2, "Пошук не налаштований на синоніми та мінімум два символи");
  addError(errors, Number(ux.library?.historyDepth) >= 20, "Історія читання має зберігати щонайменше 20 переходів");

  const requiredColors = ["void", "surface", "paper", "paperInk", "amber", "danger", "success", "focus"];
  for (const key of requiredColors) addError(errors, Boolean(tokens.color?.[key]), `Відсутній колірний токен ${key}`);
  const registeredTemplates = new Set(tokens.templates || []);
  for (const page of runtime.bookMap.pages) addError(errors, registeredTemplates.has(page.template), `Шаблон ${page.template} сторінки ${page.id} не зареєстрований`);

  let model = null;
  try {
    model = createBookModel(runtime);
  } catch (error) {
    errors.push(`Модель книги не створюється: ${error.message}`);
  }

  if (model) {
    addError(errors, model.pageCount === runtime.bookMap.physicalPageCount, "Модель має неправильну кількість сторінок");
    addError(errors, model.getPage("front-cover")?.number === 0, "Не знаходиться front-cover");
    addError(errors, model.resolveAnchor("host-guide", "session-recovery")?.id === "session-recovery", "Не працює anchor-перехід recovery");

    const desktopLayout = layout.selectLayout(1280, ux, 1);
    const mobileLayout = layout.selectLayout(390, ux, 1);
    const scaledLayout = layout.selectLayout(1280, ux, 1.5);
    addError(errors, desktopLayout.visiblePages === 2, "1280 px не дає desktop-розворот");
    addError(errors, mobileLayout.visiblePages === 1, "390 px не дає mobile-сторінку");
    addError(errors, scaledLayout.id === "single-page-scroll", "Великий текст не переводить книгу в scroll fallback");
    addError(errors, layout.visiblePageNumbers(model, 13, desktopLayout).length === 2, "Desktop не повертає дві видимі сторінки");
    addError(errors, layout.resolveMotionMode(ux, { prefersReducedMotion: true }) === "none", "Reduced motion не вимикає анімацію");
  }

  const css = fs.readFileSync(path.join(ROOT, "public", "rulebook", "rulebook-tokens.css"), "utf8");
  for (const token of ["--rulebook-paper", "--rulebook-amber", "--rulebook-motion-page-turn", "prefers-reduced-motion"]) {
    addError(errors, css.includes(token), `CSS не містить ${token}`);
  }
  for (const file of ["rulebook-search.js", "rulebook-library.js", "rulebook-audio.js"]) {
    addError(errors, fs.existsSync(path.join(ROOT, "public", "rulebook", file)), `Відсутній runtime-модуль ${file}`);
  }

  return {
    errors,
    warnings,
    stats: {
      pages: runtime.bookMap.pages.length,
      spreads: runtime.bookMap.spreads.length,
      chapters: runtime.chapters.length,
      templates: registeredTemplates.size,
      colors: Object.keys(tokens.color || {}).length,
      layouts: Object.keys(ux.layouts || {}).length,
      digest: runtime.contentDigest
    }
  };
}

function renderReport(result) {
  const lines = [
    "# Аудит UX, дизайн-системи й архітектури довідника",
    "",
    `- Сторінок: **${result.stats.pages}**`,
    `- Розворотів: **${result.stats.spreads}**`,
    `- Розділів runtime bundle: **${result.stats.chapters}**`,
    `- Шаблонів сторінок: **${result.stats.templates}**`,
    `- Колірних токенів: **${result.stats.colors}**`,
    `- Responsive-режимів: **${result.stats.layouts}**`,
    `- Digest: \`${result.stats.digest}\``,
    "",
    result.errors.length ? "## Помилки" : "## Результат",
    ""
  ];
  if (result.errors.length) lines.push(...result.errors.map((item) => `- ❌ ${item}`));
  else lines.push("✅ Архітектура довідника узгоджена: responsive UX, плавне перегортання, звук, пошук, закладки та історія синхронізовані з runtime bundle.");
  if (result.warnings.length) lines.push("", "## Попередження", "", ...result.warnings.map((item) => `- ⚠️ ${item}`));
  return `${lines.join("\n")}\n`;
}

function main() {
  const result = validateArchitecture();
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, renderReport(result), "utf8");
  console.log(`Архітектура довідника: ${result.stats.layouts} layout-режими, ${result.stats.templates} шаблони, ${result.stats.colors} кольорів.`);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`❌ ${error}`);
    process.exitCode = 1;
  } else {
    console.log("✅ UX, дизайн-токени й runtime-архітектуру перевірено.");
  }
}

if (require.main === module) main();

module.exports = { renderReport, validateArchitecture };

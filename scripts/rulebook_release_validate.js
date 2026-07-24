"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PRODUCT_VERSION } = require("../config/version");

const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs", "rulebook");
const PUBLIC = path.join(ROOT, "public", "rulebook");
const REPORT_PATH = path.join(ROOT, "reports", "rulebook_release_validation.md");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function normalize(value) {
  return String(value || "").replace(/\r\n/g, "\n");
}

function validateRulebookRelease() {
  const errors = [];
  const warnings = [];
  const manifest = readJson(path.join(DOCS, "manifest.json"));
  const map = readJson(path.join(DOCS, "book-map.json"));
  const unstable = readJson(path.join(DOCS, "unstable-rules.json"));
  const editorial = readJson(path.join(DOCS, "editorial-policy.json"));
  const runtime = readJson(path.join(PUBLIC, "data", "rulebook-data.json"));
  const versionHistory = readJson(path.join(DOCS, manifest.dataFiles.versionHistory));
  const ruleChanges = readJson(path.join(DOCS, manifest.dataFiles.ruleChanges));
  const css = readText(path.join(PUBLIC, "rulebook.css"));
  const shell = readText(path.join(PUBLIC, "rulebook-shell.js"));
  const renderer = readText(path.join(PUBLIC, "rulebook-renderer.js"));
  const audio = readText(path.join(PUBLIC, "rulebook-audio.js"));
  const index = readText(path.join(ROOT, "public", "index.html"));

  if (manifest.productVersion !== PRODUCT_VERSION) errors.push(`Версія продукту у довіднику ${manifest.productVersion} не дорівнює ${PRODUCT_VERSION}.`);
  if (runtime.productVersion !== PRODUCT_VERSION) errors.push(`Runtime довідника має версію продукту ${runtime.productVersion}.`);
  if (runtime.rulebookVersion !== manifest.rulebookVersion) errors.push("Runtime bundle не синхронізований із manifest.json.");
  if (runtime.bookMap?.pages?.length !== map.pages?.length) errors.push("Runtime bundle і book-map.json мають різну кількість сторінок.");
  if (versionHistory.current?.rulebookVersion !== manifest.rulebookVersion) errors.push("Version history не відповідає manifest.json.");
  if (ruleChanges.rulebookVersion !== manifest.rulebookVersion) errors.push("Журнал змін не відповідає manifest.json.");
  if (runtime.versionHistory?.current?.rulebookVersion !== manifest.rulebookVersion) errors.push("Runtime bundle не містить актуальної історії версій.");
  if (runtime.ruleChanges?.rulebookVersion !== manifest.rulebookVersion) errors.push("Runtime bundle не містить актуального журналу змін.");

  const registered = new Set((unstable.items || []).flatMap((item) => (item.anchors || []).map((anchor) => `${item.chapterId}#${anchor}`)));
  const provisionalPages = (map.pages || []).filter((page) => page.status === "provisional");
  for (const page of provisionalPages) {
    if (!registered.has(`${page.chapterId}#${page.anchor}`)) errors.push(`Provisional-сторінка ${page.id} не має запису в unstable-rules.json.`);
  }
  const openBlockers = (unstable.items || []).filter((item) => item.status !== "resolved");
  if (openBlockers.length) warnings.push(`Фінальне канонічне затвердження заблоковано: відкрито ${openBlockers.length} механічних тем.`);

  const chapterText = (runtime.chapters || []).map((chapter) => normalize(chapter.markdown)).join("\n");
  for (const item of editorial.forbiddenTerms || []) {
    if (chapterText.toLocaleLowerCase("uk-UA").includes(String(item.value).toLocaleLowerCase("uk-UA"))) {
      errors.push(`У тексті лишилося заборонене формулювання «${item.value}».`);
    }
  }
  for (const marker of ["TODO", "FIXME", "Вміст сторінки", "готується."]) {
    if (chapterText.includes(marker)) errors.push(`У тексті довідника лишився службовий маркер: ${marker}`);
  }
  if (/[“”]/u.test(chapterText)) warnings.push("Знайдено англійські типографічні лапки; перевірте контекст.");
  if (/ {2,}/u.test(chapterText)) warnings.push("Знайдено подвійні пробіли в тексті довідника.");

  const requiredCss = [
    'Stages 25–30: page fitting without visible inner scrollbars.',
    '.rulebook-page::-webkit-scrollbar',
    '[data-layout="single-page-scroll"] .rulebook-page',
    '[data-fit="compact"]',
    '[data-fit="dense"]',
    '[data-fit="tight"]'
  ];
  for (const marker of requiredCss) if (!css.includes(marker)) errors.push(`CSS не містить маркер адаптивного вміщення: ${marker}`);

  for (const marker of ["PAGE_FIT_LEVELS", "fitPageToFrame", "fitVisiblePages", "data-fit-overflow"]) {
    if (!shell.includes(marker)) errors.push(`Оболонка не містить механізм вміщення сторінки: ${marker}`);
  }
  if (!renderer.includes('loading="lazy"')) errors.push("Ілюстрації не мають lazy-loading.");
  if (!renderer.includes("safeVisualFilename")) errors.push("Renderer не перевіряє локальні назви ілюстрацій.");
  if (!audio.includes("setEnabled") || !audio.includes("setVolume")) errors.push("Модуль звуку не має повного керування.");
  if (/page-turn-(?:forward|backward)\.wav/u.test(audio)) errors.push("Модуль звуку все ще містить звуки перегортання.");

  const accessibilityMarkers = [
    'aria-modal="true"',
    'id="rulebookSkipToPage"',
    'aria-live="polite"',
    'aria-label="Закрити довідник"'
  ];
  for (const marker of accessibilityMarkers) if (!index.includes(marker)) errors.push(`В index.html відсутній accessibility-маркер: ${marker}`);
  if (!css.includes("prefers-reduced-motion")) errors.push("CSS не підтримує prefers-reduced-motion.");

  return {
    errors,
    warnings,
    stats: {
      pages: map.pages.length,
      chapters: runtime.chapters.length,
      provisionalPages: provisionalPages.length,
      openBlockers: openBlockers.length,
      rulebookVersion: manifest.rulebookVersion,
      productVersion: manifest.productVersion,
      ruleChanges: (ruleChanges.entries || []).length,
      versionEntries: (versionHistory.entries || []).length
    }
  };
}

function renderReport(result) {
  const lines = [
    "# Перевірка релізної готовності довідника",
    "",
    `- Версія гри: **${result.stats.productVersion}**`,
    `- Версія довідника: **${result.stats.rulebookVersion}**`,
    `- Розділів: **${result.stats.chapters}**`,
    `- Сторінок: **${result.stats.pages}**`,
    `- Provisional-сторінок: **${result.stats.provisionalPages}**`,
    `- Відкритих механічних блокерів: **${result.stats.openBlockers}**`,
    `- Записів журналу змін: **${result.stats.ruleChanges}**`,
    `- Версій у історії: **${result.stats.versionEntries}**`,
    "",
    result.errors.length ? "## Помилки" : "## Автоматичний результат",
    ""
  ];
  if (result.errors.length) lines.push(...result.errors.map((item) => `- ❌ ${item}`));
  else lines.push("✅ Структура, runtime-дані, редакційні правила, книжкова верстка, беззвучне перегортання й базова доступність узгоджені.");
  if (result.warnings.length) lines.push("", "## Попередження", "", ...result.warnings.map((item) => `- ⚠️ ${item}`));
  lines.push("", "## Релізний висновок", "");
  lines.push(result.stats.openBlockers
    ? "Довідник функціонально готовий до тестового використання, але механічні provisional-сторінки не можна називати остаточно канонічними до закриття відповідних P0-тем."
    : "Довідник готовий до остаточного релізного кандидата.");
  return `${lines.join("\n")}\n`;
}

function main() {
  const result = validateRulebookRelease();
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, renderReport(result), "utf8");
  console.log(`Довідник ${result.stats.rulebookVersion}: ${result.stats.pages} сторінок, ${result.stats.openBlockers} відкритих механічних блокерів.`);
  for (const warning of result.warnings) console.warn(`⚠️ ${warning}`);
  for (const error of result.errors) console.error(`❌ ${error}`);
  if (result.errors.length) process.exitCode = 1;
  else console.log("✅ Релізний аудит довідника пройдено.");
}

if (require.main === module) main();
module.exports = { renderReport, validateRulebookRelease };

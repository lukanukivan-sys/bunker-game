"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PRODUCT_VERSION } = require("../config/version");

const ROOT = path.resolve(__dirname, "..");
const RULEBOOK_ROOT = path.join(ROOT, "docs", "rulebook");
const REPORT_PATH = path.join(ROOT, "reports", "rulebook_foundation_audit.md");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseChapter(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u);
  if (!match) throw new Error(`Немає JSON front matter: ${path.relative(ROOT, filePath)}`);
  const metadata = JSON.parse(match[1]);
  const body = match[2];
  const anchors = [...body.matchAll(/<a\s+id="([a-z0-9-]+)"\s*><\/a>/gu)].map((item) => item[1]);
  return { metadata, body, anchors, filePath };
}

function addUniqueError(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

function validateRulebook(options = {}) {
  const rulebookRoot = options.rulebookRoot || RULEBOOK_ROOT;
  const errors = [];
  const warnings = [];

  const manifestPath = path.join(rulebookRoot, "manifest.json");
  const manifest = readJson(manifestPath);
  const bookMap = readJson(path.join(rulebookRoot, manifest.dataFiles.bookMap));
  const terminology = readJson(path.join(rulebookRoot, manifest.dataFiles.terminology));
  const unstable = readJson(path.join(rulebookRoot, manifest.dataFiles.unstableRules));
  const editorial = readJson(path.join(rulebookRoot, manifest.dataFiles.editorialPolicy));
  const sourceInventory = readJson(path.join(rulebookRoot, manifest.dataFiles.sourceInventory));
  const versionHistory = readJson(path.join(rulebookRoot, manifest.dataFiles.versionHistory));
  const ruleChanges = readJson(path.join(rulebookRoot, manifest.dataFiles.ruleChanges));

  if (manifest.schema !== "rulebook-manifest-v1") errors.push(`Невідома схема manifest: ${manifest.schema}`);
  if (manifest.productVersion !== PRODUCT_VERSION) errors.push(`Версія довідника ${manifest.productVersion} не відповідає продукту ${PRODUCT_VERSION}`);
  if (bookMap.schema !== "rulebook-book-map-v1") errors.push(`Невідома схема карти: ${bookMap.schema}`);
  if (terminology.schema !== "rulebook-terminology-v1") errors.push(`Невідома схема термінології: ${terminology.schema}`);
  if (unstable.schema !== "rulebook-unstable-rules-v1") errors.push(`Невідома схема нестабільних правил: ${unstable.schema}`);
  if (editorial.schema !== "rulebook-editorial-policy-v1") errors.push(`Невідома схема редакційної політики: ${editorial.schema}`);
  if (sourceInventory.schema !== "rulebook-source-inventory-v1") errors.push(`Невідома схема джерел: ${sourceInventory.schema}`);
  if (versionHistory.schema !== "rulebook-version-history-v1") errors.push(`Невідома схема історії версій: ${versionHistory.schema}`);
  if (ruleChanges.schema !== "rulebook-changelog-v1") errors.push(`Невідома схема журналу змін: ${ruleChanges.schema}`);
  if (versionHistory.current?.rulebookVersion !== manifest.rulebookVersion) errors.push("Поточна версія у version-history.json не відповідає manifest.");
  if (ruleChanges.rulebookVersion !== manifest.rulebookVersion) errors.push("Версія rule-changes.json не відповідає manifest.");

  const allowedStatuses = new Set(manifest.statuses || []);
  const allowedAudiences = new Set(Object.keys(manifest.audiences || {}));
  const allowedModes = new Set(Object.keys(manifest.modes || {}));
  const partIds = new Set();
  for (const part of manifest.parts || []) {
    if (!part.id || partIds.has(part.id)) errors.push(`Дубль або порожній part id: ${part.id || "—"}`);
    partIds.add(part.id);
  }

  const chapterIds = new Set();
  const chapters = new Map();
  for (const entry of manifest.chapters || []) {
    if (!entry.id || chapterIds.has(entry.id)) errors.push(`Дубль або порожній chapter id: ${entry.id || "—"}`);
    chapterIds.add(entry.id);
    if (!partIds.has(entry.part)) errors.push(`Розділ ${entry.id} посилається на невідому частину ${entry.part}`);
    if (!allowedStatuses.has(entry.status)) errors.push(`Розділ ${entry.id} має невідомий статус ${entry.status}`);

    const filePath = path.join(rulebookRoot, entry.file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Відсутній файл розділу ${entry.file}`);
      continue;
    }

    try {
      const parsed = parseChapter(filePath);
      chapters.set(entry.id, parsed);
      const metadata = parsed.metadata;
      if (metadata.id !== entry.id) errors.push(`ID у ${entry.file} (${metadata.id}) не відповідає manifest (${entry.id})`);
      if (metadata.status !== entry.status) errors.push(`Статус у ${entry.file} (${metadata.status}) не відповідає manifest (${entry.status})`);
      if (!metadata.title || !metadata.summary) errors.push(`Розділ ${entry.id} не має title або summary`);
      if (!Array.isArray(metadata.audience) || !metadata.audience.length) errors.push(`Розділ ${entry.id} не має audience`);
      if (!Array.isArray(metadata.modes) || !metadata.modes.length) errors.push(`Розділ ${entry.id} не має modes`);
      for (const audience of metadata.audience || []) if (!allowedAudiences.has(audience)) errors.push(`Розділ ${entry.id}: невідома аудиторія ${audience}`);
      for (const mode of metadata.modes || []) if (!allowedModes.has(mode)) errors.push(`Розділ ${entry.id}: невідомий режим ${mode}`);
      if (!allowedStatuses.has(metadata.status)) errors.push(`Розділ ${entry.id}: невідомий статус ${metadata.status}`);
      if (new Set(parsed.anchors).size !== parsed.anchors.length) errors.push(`Розділ ${entry.id} має дублікати anchor`);
      if (parsed.body.trim().length < 200) warnings.push(`Розділ ${entry.id} дуже короткий`);
      for (const rule of editorial.forbiddenTerms || []) {
        if (parsed.body.toLocaleLowerCase("uk-UA").includes(String(rule.value).toLocaleLowerCase("uk-UA"))) {
          errors.push(`Розділ ${entry.id} містить заборонене формулювання «${rule.value}»; використайте «${rule.replacement}»`);
        }
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  const pageIds = new Set();
  const pageNumbers = new Set();
  const provisionalKeys = new Set();
  for (const item of unstable.items || []) {
    if (!item.id || provisionalKeys.has(item.id)) errors.push(`Дубль нестабільного правила: ${item.id || "—"}`);
    provisionalKeys.add(item.id);
    if (!chapterIds.has(item.chapterId)) errors.push(`${item.id} посилається на невідомий розділ ${item.chapterId}`);
    const chapter = chapters.get(item.chapterId);
    for (const anchor of item.anchors || []) {
      if (chapter && !chapter.anchors.includes(anchor)) errors.push(`${item.id} посилається на відсутній anchor ${item.chapterId}#${anchor}`);
    }
  }

  const registeredProvisionalAnchors = new Set(
    (unstable.items || []).flatMap((item) => (item.anchors || []).map((anchor) => `${item.chapterId}#${anchor}`))
  );

  for (const page of bookMap.pages || []) {
    if (!Number.isInteger(page.number) || page.number < 0) errors.push(`Сторінка ${page.id || "—"} має некоректний номер`);
    if (pageNumbers.has(page.number)) errors.push(`Дубль номера сторінки ${page.number}`);
    pageNumbers.add(page.number);
    if (!page.id || pageIds.has(page.id)) errors.push(`Дубль або порожній page id: ${page.id || "—"}`);
    pageIds.add(page.id);
    if (!allowedStatuses.has(page.status)) errors.push(`Сторінка ${page.id} має невідомий статус ${page.status}`);
    if (!allowedAudiences.has(page.audience)) errors.push(`Сторінка ${page.id} має невідому аудиторію ${page.audience}`);
    for (const mode of page.modes || []) if (!allowedModes.has(mode)) errors.push(`Сторінка ${page.id} має невідомий режим ${mode}`);

    if (page.chapterId === null) {
      if (page.anchor !== null) errors.push(`Обкладинка ${page.id} не повинна мати anchor`);
      continue;
    }
    if (!chapterIds.has(page.chapterId)) errors.push(`Сторінка ${page.id} посилається на невідомий розділ ${page.chapterId}`);
    const chapter = chapters.get(page.chapterId);
    if (!page.anchor || (chapter && !chapter.anchors.includes(page.anchor))) errors.push(`Сторінка ${page.id} посилається на відсутній anchor ${page.chapterId}#${page.anchor}`);
    if (page.status === "provisional" && !registeredProvisionalAnchors.has(`${page.chapterId}#${page.anchor}`)) {
      errors.push(`Provisional-сторінка ${page.id} не зареєстрована в unstable-rules.json`);
    }
  }

  const expectedCount = bookMap.physicalPageCount;
  if ((bookMap.pages || []).length !== expectedCount) errors.push(`Карта містить ${(bookMap.pages || []).length} сторінок замість ${expectedCount}`);
  for (let number = 0; number < expectedCount; number += 1) if (!pageNumbers.has(number)) errors.push(`Пропущено сторінку ${number}`);
  if ((bookMap.spreads || []).length * 2 !== expectedCount) errors.push(`Кількість розворотів не відповідає ${expectedCount} сторінкам`);
  for (const spread of bookMap.spreads || []) {
    if (!pageNumbers.has(spread.left) || !pageNumbers.has(spread.right)) errors.push(`Розворот ${spread.id} містить невідому сторінку`);
  }

  const termIds = new Set();
  const normalizedTerms = new Set();
  for (const term of terminology.terms || []) {
    if (!term.id || termIds.has(term.id)) errors.push(`Дубль або порожній term id: ${term.id || "—"}`);
    termIds.add(term.id);
    const normalized = String(term.term || "").trim().toLocaleLowerCase("uk-UA");
    if (!normalized || normalizedTerms.has(normalized)) errors.push(`Дубль або порожній термін: ${term.term || "—"}`);
    normalizedTerms.add(normalized);
    if (!term.definition) errors.push(`Термін ${term.id} не має визначення`);
  }

  const mappedChapterIds = new Set((bookMap.pages || []).map((page) => page.chapterId).filter(Boolean));
  for (const chapterId of chapterIds) if (!mappedChapterIds.has(chapterId)) errors.push(`Розділ ${chapterId} не представлено в карті книги`);

  const changeIds = new Set();
  for (const change of ruleChanges.entries || []) {
    if (!change.id || changeIds.has(change.id)) errors.push(`Дубль або порожній ID зміни: ${change.id || "—"}`);
    changeIds.add(change.id);
    if (!change.title || !change.summary || !change.date) errors.push(`Запис зміни ${change.id || "—"} неповний`);
    for (const pageId of change.pages || []) if (!pageIds.has(pageId)) errors.push(`Зміна ${change.id} посилається на невідому сторінку ${pageId}`);
  }

  const historyVersions = new Set();
  for (const entry of versionHistory.entries || []) {
    if (!entry.rulebookVersion || historyVersions.has(entry.rulebookVersion)) errors.push(`Дубль або порожня версія у version history: ${entry.rulebookVersion || "—"}`);
    historyVersions.add(entry.rulebookVersion);
  }
  if (!historyVersions.has(manifest.rulebookVersion)) errors.push("Поточна версія довідника відсутня в історії версій.");

  const stats = {
    chapters: chapterIds.size,
    pages: (bookMap.pages || []).length,
    spreads: (bookMap.spreads || []).length,
    anchors: [...chapters.values()].reduce((sum, chapter) => sum + chapter.anchors.length, 0),
    terms: termIds.size,
    provisionalRules: (unstable.items || []).length,
    provisionalPages: (bookMap.pages || []).filter((page) => page.status === "provisional").length,
    sourceRecords: (sourceInventory.sources || []).length,
    ruleChanges: changeIds.size,
    versionEntries: historyVersions.size
  };

  return { errors, warnings, stats, manifest, bookMap };
}

function renderReport(result) {
  const lines = [
    "# Аудит фундаменту довідника",
    "",
    `- Розділів: **${result.stats.chapters}**`,
    `- Фізичних сторінок: **${result.stats.pages}**`,
    `- Розворотів: **${result.stats.spreads}**`,
    `- Anchor-посилань: **${result.stats.anchors}**`,
    `- Канонічних термінів: **${result.stats.terms}**`,
    `- Нестабільних P0-тем: **${result.stats.provisionalRules}**`,
    `- Provisional-сторінок: **${result.stats.provisionalPages}**`,
    `- Джерел у реєстрі: **${result.stats.sourceRecords}**`,
    `- Записів журналу змін: **${result.stats.ruleChanges}**`,
    `- Версій у історії: **${result.stats.versionEntries}**`,
    "",
    result.errors.length ? "## Помилки" : "## Результат",
    ""
  ];
  if (result.errors.length) lines.push(...result.errors.map((item) => `- ❌ ${item}`));
  else lines.push("✅ Структура довідника цілісна й готова до етапів UX та книжкового рушія.");
  if (result.warnings.length) {
    lines.push("", "## Попередження", "", ...result.warnings.map((item) => `- ⚠️ ${item}`));
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const result = validateRulebook();
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, renderReport(result), "utf8");
  console.log(`Довідник: ${result.stats.chapters} розділів, ${result.stats.pages} сторінок, ${result.stats.spreads} розворотів, ${result.stats.terms} термінів.`);
  for (const warning of result.warnings) console.warn(`⚠️ ${warning}`);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`❌ ${error}`);
    process.exitCode = 1;
  } else {
    console.log("✅ Структурний аудит довідника пройдено.");
  }
}

if (require.main === module) main();

module.exports = { parseChapter, renderReport, validateRulebook };

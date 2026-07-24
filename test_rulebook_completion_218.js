"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createBookModel } = require("./public/rulebook/rulebook-model");
const renderer = require("./public/rulebook/rulebook-renderer");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook-shell.js"), "utf8");
const bundle = JSON.parse(fs.readFileSync(path.join(root, "public", "rulebook", "data", "rulebook-data.json"), "utf8"));
const model = createBookModel(bundle);

assert(html.includes('id="rulebookSettingsButton"'), "Відсутня кнопка налаштувань читання");
assert(html.includes('id="rulebookSkipToPage"'), "Відсутній skip-link до поточної сторінки");
assert(html.includes('data-rulebook-chrome="footer"'), "Нижня панель не відділена як стабільний chrome-шар");

for (const marker of [
  ".rulebook-page-footer {\n  margin-top: auto",
  '.rulebook-turn-hold[data-template="cover"]',
  "contain: layout paint",
  '--rulebook-user-text-scale',
  '[data-contrast="high"]',
  ".rulebook-page-visual",
  ".rulebook-skip-link"
]) assert(css.includes(marker), `У CSS відсутній маркер завершення: ${marker}`);

for (const marker of [
  "copyPagePresentation",
  "measurePagePresentation",
  "normalizeReadingSettings",
  "renderReadingSettingsDrawer",
  "ensureSearchIndex",
  "state.renderCache",
  "skhovyshche.rulebook.reading.v1"
]) assert(shell.includes(marker), `В оболонці відсутній маркер: ${marker}`);

assert.equal(bundle.rulebookVersion, "0.8.0-rc.1");
assert(bundle.chapters.reduce((sum, chapter) => sum + chapter.markdown.length, 0) > 24000, "Повний текст довідника надто короткий");

for (const page of model.pages) {
  const rendered = renderer.renderPage(model, page);
  assert(rendered.title, `Сторінка ${page.id} не має заголовка`);
  assert(!rendered.html.includes("готується"), `Сторінка ${page.id} залишилася заглушкою`);
}

for (const file of ["bunker-overview.svg", "round-cycle.svg", "voting.svg", "recovery.svg", "resources.svg"]) {
  const fullPath = path.join(root, "public", "rulebook", "assets", "visuals", file);
  assert(fs.existsSync(fullPath), `Відсутня графіка ${file}`);
  const svg = fs.readFileSync(fullPath, "utf8");
  assert(svg.includes("<title"), `SVG ${file} не має доступної назви`);
  assert(svg.includes("<desc"), `SVG ${file} не має доступного опису`);
}

const titlePage = renderer.renderPage(model, model.getPage("title-page")).html;
const voting = renderer.renderPage(model, model.getPage("voting")).html;
assert(titlePage.includes("bunker-overview.svg"));
assert(voting.includes("voting.svg"));
assert(voting.includes('loading="lazy"'));

console.log("1.2.11: повний вміст, стабільна нижня панель, незмінна обкладинка, графіка, налаштування читання, доступність і оптимізація довідника перевірені.");

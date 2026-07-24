"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createBookModel } = require("./public/rulebook/rulebook-model");
const { selectLayout } = require("./public/rulebook/page-layout");
const { createTurnPlan, animationDuration } = require("./public/rulebook/page-turn");
const { extractSection, renderMarkdown, renderPage } = require("./public/rulebook/rulebook-renderer");
const shellApi = require("./public/rulebook/rulebook-shell");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook.css"), "utf8");
const bundle = JSON.parse(fs.readFileSync(path.join(root, "public", "rulebook", "data", "rulebook-data.json"), "utf8"));
const model = createBookModel(bundle);

assert(html.includes('id="homeRulebookButton"'), "На стартовому екрані немає кнопки довідника");
assert(
  html.indexOf('id="homeRulebookButton"') < html.indexOf('id="createForm"'),
  "Кнопка довідника має бути розташована перед формою створення кімнати"
);
for (const id of [
  "rulebookBackdrop",
  "rulebookDialog",
  "rulebookClose",
  "rulebookViewport",
  "rulebookLeftPage",
  "rulebookRightPage",
  "rulebookSpine",
  "rulebookTurnLayer",
  "rulebookPrevious",
  "rulebookNext",
  "rulebookPageCounter",
  "rulebookLiveRegion"
]) {
  assert(html.includes(`id="${id}"`), `Відсутній елемент оболонки ${id}`);
}

const scriptOrder = [
  "rulebook-config.js",
  "rulebook-loader.js",
  "rulebook-model.js",
  "page-layout.js",
  "rulebook-renderer.js",
  "page-turn.js",
  "rulebook-shell.js",
  "app.js"
].map((name) => html.indexOf(name));
assert(scriptOrder.every((position) => position >= 0), "Не всі runtime-скрипти довідника підключено");
assert(scriptOrder.every((position, index) => index === 0 || position > scriptOrder[index - 1]), "Скрипти довідника підключено в неправильному порядку");

for (const marker of [
  ".rulebook-dialog",
  ".rulebook-page",
  ".rulebook-turn-sheet",
  ".rulebook-turn-forward.is-active",
  "@media (max-width: 639px)",
  "@media (prefers-reduced-motion: reduce)"
]) {
  assert(css.includes(marker), `У книжкових стилях відсутній маркер ${marker}`);
}

const intro = model.chapterById.get("introduction");
const section = extractSection(intro.markdown, "how-to-use");
assert.match(section, /Як користуватися книгою/u);
assert(!section.includes("Структура"), "Renderer захопив сусідній anchor-розділ");
assert.match(renderMarkdown("**Важливо.**\n\n- Перше\n- Друге"), /<strong>Важливо\.<\/strong>/u);
assert.match(renderMarkdown("<script>alert(1)</script>"), /&lt;script&gt;/u, "Markdown renderer не екранує HTML");
const voting = renderPage(model, model.getPage("voting"));
assert.equal(voting.title, "Голосування і трибунал");
assert.match(voting.html, /Уточнюється/u);

const desktop = selectLayout(1440, bundle.ux, 1);
const mobile = selectLayout(390, bundle.ux, 1);
const forward = createTurnPlan(model, "voting", "forward", desktop);
const backward = createTurnPlan(model, "voting", "backward", desktop);
assert.deepEqual(forward.before, [12, 13]);
assert.deepEqual(forward.after, [14, 15]);
assert.equal(forward.sheetSide, "right");
assert.equal(backward.target.number, 10);
assert.equal(backward.sheetSide, "left");
assert.equal(createTurnPlan(model, "voting", "forward", mobile).target.number, 14);
assert.equal(animationDuration(bundle.ux, "none"), 0);
assert(animationDuration(bundle.ux, "full") >= 300);
assert.equal(typeof shellApi.createRulebookShell, "function");
assert.equal(typeof shellApi.initializeRulebookShell, "function");

console.log("1.2.11: довідник інтегровано на стартовий екран; оболонка, renderer і перегортання перевірені для desktop, mobile та reduced motion.");

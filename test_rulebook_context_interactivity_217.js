"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createBookModel } = require("./public/rulebook/rulebook-model");
const renderer = require("./public/rulebook/rulebook-renderer");
const { createSearchIndex } = require("./public/rulebook/rulebook-search");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook-shell.js"), "utf8");
const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
const bundle = JSON.parse(fs.readFileSync(path.join(root, "public", "rulebook", "data", "rulebook-data.json"), "utf8"));
const model = createBookModel(bundle);

assert(html.includes('id="rulebookFilterButton"'), "Відсутня кнопка фільтрів");
for (const pageId of ["voting", "session-recovery", "lobby-ready", "victory-layers", "round-cycle", "dossier"]) {
  assert(html.includes(`data-rulebook-open="${pageId}"`), `Відсутній контекстний перехід до ${pageId}`);
}

for (const marker of [
  "-webkit-backface-visibility: hidden",
  "@keyframes rulebook-hide-front-face",
  "@keyframes rulebook-show-back-face",
  ".rulebook-interactive-example",
  ".rulebook-filter-form",
  ".rulebook-template-accent",
  ".context-rulebook-link"
]) assert(css.includes(marker), `У CSS відсутній маркер ${marker}`);

assert(shell.includes('data-rulebook-example-action'), "Оболонка не обробляє інтерактивні приклади");
assert(shell.includes('skhovyshche.rulebook.filters.v1'), "Фільтри не зберігаються локально");
assert(shell.includes('documentRef.addEventListener("click"'), "Контекстні кнопки не використовують делегування подій");
assert(app.includes('currentActionRulebookButton'), "Поточна фаза не прив’язана до контекстної сторінки");

const round = renderer.renderPage(model, model.getPage("round-cycle")).html;
const voting = renderer.renderPage(model, model.getPage("voting")).html;
const recovery = renderer.renderPage(model, model.getPage("session-recovery")).html;
assert(round.includes('data-rulebook-example="phase-cycle"'));
assert(voting.includes('data-rulebook-example="voting"'));
assert(recovery.includes('data-rulebook-example="recovery"'));
assert(voting.includes("rulebook-template-accent"), "Спеціальний шаблон не має візуального маркера");

const search = createSearchIndex(model);
const playerResults = search.search("ведучий", {
  limit: 50,
  pageFilter: (page) => ["all", "player"].includes(page.audience)
});
assert(playerResults.every((result) => ["all", "player"].includes(model.getPage(result.pageId).audience)), "Пошук ігнорує фільтр аудиторії");
const detectiveResults = search.search("режим", {
  limit: 50,
  pageFilter: (page) => (page.modes || []).includes("all") || (page.modes || []).includes("detective")
});
assert(detectiveResults.every((result) => {
  const modes = model.getPage(result.pageId).modes || [];
  return modes.includes("all") || modes.includes("detective");
}), "Пошук ігнорує фільтр режиму");

console.log("1.2.11: баг дзеркальної сторони перегортання, контекстні переходи, фільтри, інтерактивні приклади й спеціальні шаблони перевірено.");

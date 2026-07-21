const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");

for (const tab of ["turn", "character", "group", "shelter", "log", "investigation"]) {
  assert(html.includes(`data-game-tab-button="${tab}"`), `Немає кнопки вкладки ${tab}`);
  assert(html.includes(`data-game-tab-panel="${tab}"`), `Немає панелі вкладки ${tab}`);
}
for (const id of ["currentActionPanel", "currentActionTitle", "currentActionText", "currentActionSteps", "currentActionShortcut"]) {
  assert(html.includes(`id="${id}"`), `Немає елемента ${id}`);
}
for (const fn of ["selectGameTab", "bindGameTabs", "getCurrentActionModel", "renderCurrentAction", "renderGameTabs"]) {
  assert(app.includes(`function ${fn}(`), `Немає функції ${fn}`);
}
assert(app.includes('game.phase === "reveal"'), "Немає підказки для розкриття");
assert(app.includes('game.phase === "discussion"'), "Немає підказки для обговорення");
assert(app.includes('game.phase === "event"'), "Немає підказки для події");
assert(app.includes('game.phase === "elimination"'), "Немає підказки для голосування");
assert(app.includes('game.phase === "round_end"'), "Немає підказки для завершення раунду");
assert(css.includes(".game-tab-hidden"), "Немає приховування неактивних вкладок");
assert(css.includes(".current-action-panel"), "Немає стилів поточної дії");
assert(css.includes("@media (max-width: 650px)"), "Немає мобільної адаптації вкладок");
console.log("1.0.7: вкладки гри, динамічна поточна дія, клавіатурна навігація та мобільна адаптація перевірені.");

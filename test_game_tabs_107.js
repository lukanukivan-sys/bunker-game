const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");

for (const tab of ["turn", "character", "group", "catastrophe", "shelter", "log", "system", "investigation"]) {
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
assert(css.includes("body.ui5-command"), "Немає нового командного макета");
assert(css.includes("grid-template-columns:220px minmax(0,1fr)"), "Немає бічної навігації");
assert(css.includes(".game-tab-hidden"), "Немає приховування неактивних вкладок");
assert(css.includes("@media(max-width:700px)"), "Немає мобільної адаптації нового макета");
console.log("1.2.10 UI5: окремі робочі екрани, бічна навігація, поточна дія та мобільний режим перевірені.");

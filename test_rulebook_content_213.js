"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { validateRulebook } = require("./scripts/rulebook_validate");

const root = __dirname;
const result = validateRulebook();

assert.deepEqual(result.errors, [], `Помилки фундаменту довідника:\n${result.errors.join("\n")}`);
assert.equal(result.stats.chapters, 9, "Очікується дев’ять канонічних розділів");
assert.equal(result.stats.pages, 44, "Карта повинна містити 44 фізичні сторінки");
assert.equal(result.stats.spreads, 22, "Карта повинна містити 22 розвороти");
assert(result.stats.anchors >= 35, "У розділах недостатньо стабільних anchor-посилань");
assert(result.stats.terms >= 25, "Термінологічний покажчик надто малий");
assert(result.stats.provisionalRules >= 8, "P0-теми не винесено до окремого реєстру");
assert(result.stats.provisionalPages >= 10, "Карта не позначає нестабільні механічні сторінки");

const map = JSON.parse(fs.readFileSync(path.join(root, "docs", "rulebook", "book-map.json"), "utf8"));
assert.equal(map.pages[0].template, "cover");
assert.equal(map.pages.at(-1).template, "back-cover");
assert(map.pages.some((page) => page.id === "session-recovery" && page.status === "canonical"));
assert(map.pages.some((page) => page.id === "detective-mode" && page.status === "provisional"));
assert(map.pages.some((page) => page.id === "accessibility"));

console.log("1.2.11: фундамент довідника перевірено — 9 розділів, 44 сторінки, 22 розвороти та реєстр P0-правил.");

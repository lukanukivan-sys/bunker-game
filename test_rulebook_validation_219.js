"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { validateRulebookRelease } = require("./scripts/rulebook_release_validate");

const root = __dirname;
const css = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook-shell.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "docs", "rulebook", "manifest.json"), "utf8"));

const result = validateRulebookRelease();
assert.deepEqual(result.errors, [], result.errors.join("\n"));
assert.equal(result.stats.rulebookVersion, "0.8.0-rc.1");
assert.equal(result.stats.openBlockers, 8, "До механічних P0-виправлень має лишатися 8 відкритих тем");

assert(css.includes("overflow: hidden;\n  padding: var(--rulebook-page-padding)"), "Базова сторінка повинна бути без внутрішнього скролу");
assert(css.includes('.rulebook-dialog[data-layout="single-page-scroll"] .rulebook-page'), "Відсутній accessibility fallback для великого тексту");
assert(css.includes('[data-fit="tight"]'), "Відсутній останній рівень автоматичного вміщення");
assert(shell.includes('const PAGE_FIT_LEVELS = Object.freeze(["normal", "compact", "dense", "tight"])'));
assert(shell.includes("fitVisiblePages(layout)"));
assert(shell.includes('pageFit: elements.viewport.dataset.pageFit || "normal"'));
assert.equal(manifest.rulebookVersion, "0.8.0-rc.1");

console.log("1.2.11: безповзункова книжкова верстка, автоматичне вміщення та релізна валідація довідника перевірені.");

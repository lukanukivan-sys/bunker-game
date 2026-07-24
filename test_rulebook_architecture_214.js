"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { validateArchitecture } = require("./scripts/rulebook_architecture_validate");
const { createBookModel, normalizePageNumber } = require("./public/rulebook/rulebook-model");
const { selectLayout, visiblePageNumbers, turnTarget, resolveMotionMode } = require("./public/rulebook/page-layout");
const { loadRulebookData } = require("./public/rulebook/rulebook-loader");

const root = __dirname;
const result = validateArchitecture();
assert.deepEqual(result.errors, [], `Помилки архітектури довідника:\n${result.errors.join("\n")}`);
assert.equal(result.stats.layouts, 3);
assert(result.stats.templates >= 20);
assert(result.stats.colors >= 15);
assert.match(result.stats.digest, /^[a-f0-9]{64}$/u);

const bundle = JSON.parse(fs.readFileSync(path.join(root, "public", "rulebook", "data", "rulebook-data.json"), "utf8"));
const model = createBookModel(bundle);
assert.equal(model.pageCount, 44);
assert.equal(model.getPage("voting").number, 13);
assert.equal(model.getSpread("voting").id, "spread-06");
assert.equal(model.resolveAnchor("host-guide", "session-recovery").id, "session-recovery");
assert.equal(normalizePageNumber(-20, model.pageCount), 0);
assert.equal(normalizePageNumber(999, model.pageCount), 43);

const desktop = selectLayout(1440, bundle.ux, 1);
const mobile = selectLayout(390, bundle.ux, 1);
assert.equal(desktop.id, "two-page-spread");
assert.equal(mobile.id, "single-page");
assert.deepEqual(visiblePageNumbers(model, "voting", desktop), [12, 13]);
assert.deepEqual(visiblePageNumbers(model, "voting", mobile), [13]);
assert.equal(turnTarget(model, "voting", "forward", desktop).number, 14);
assert.equal(turnTarget(model, "voting", "backward", desktop).number, 10);
assert.equal(resolveMotionMode(bundle.ux, { prefersReducedMotion: true, userSetting: "full" }), "none");

(async () => {
  const loaded = await loadRulebookData({
    url: "/rulebook/data/rulebook-data.json",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => bundle })
  });
  assert.equal(loaded.contentDigest, bundle.contentDigest);
  await assert.rejects(
    () => loadRulebookData({ url: "https://example.com/rulebook.json", fetchImpl: async () => ({ ok: true, json: async () => bundle }) }),
    /локального шляху/u
  );
  console.log("1.2.11: UX, дизайн-система й runtime-архітектура довідника перевірені для desktop, mobile та reduced motion.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

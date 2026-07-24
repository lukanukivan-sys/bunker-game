"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createBookModel } = require("./public/rulebook/rulebook-model");
const loader = require("./public/rulebook/rulebook-loader");
const renderer = require("./public/rulebook/rulebook-renderer");
const audioApi = require("./public/rulebook/rulebook-audio");
const { validateRulebookDelivery } = require("./scripts/rulebook_delivery_validate");

const root = __dirname;
const runtime = JSON.parse(fs.readFileSync(path.join(root, "public", "rulebook", "data", "rulebook-data.json"), "utf8"));
const model = createBookModel(runtime);
const shell = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook-shell.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook.css"), "utf8");
const index = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");

const delivery = validateRulebookDelivery();
assert.deepEqual(delivery.errors, [], delivery.errors.join("\n"));
assert.equal(runtime.rulebookVersion, "0.8.0-rc.1");
assert.equal(model.versionHistory.current.rulebookVersion, runtime.rulebookVersion);
assert.equal(model.ruleChanges.entries.length, 5);

const changesHtml = renderer.renderPage(model, model.getPage("rule-changes")).html;
assert(changesHtml.includes("rulebook-changelog-list"));
assert(changesHtml.includes("Перегортання сторінок стало беззвучним"));
assert(changesHtml.includes('data-rulebook-go="session-recovery"'));

const editionHtml = renderer.renderPage(model, model.getPage("edition-version")).html;
assert(editionHtml.includes("rulebook-edition-grid"));
assert(editionHtml.includes("0.8.0-rc.1"));
assert(editionHtml.includes(runtime.contentDigest.slice(0, 12)));

assert(index.includes("rulebook/data/rulebook-fallback.js?stage=36-40"));
assert(shell.includes("measurePagePresentation"));
assert(shell.includes("rulebook-turn-reveal"));
assert(shell.includes("Stable pages are updated only after the moving sheet has completed"));
assert(!shell.includes("state.audio.play(turnCue(plan))"));
assert(css.includes("organic diagrams"));
assert(css.includes(".rulebook-turn-reveal-right"));
assert(css.includes(".rulebook-page-visual::before"));

assert.deepEqual(Object.keys(audioApi.DEFAULT_CUES).sort(), ["close", "open"]);
assert.equal(audioApi.DEFAULT_SETTINGS.enabled, false);
assert.equal(fs.existsSync(path.join(root, "public", "rulebook", "assets", "page-turn-forward.wav")), false);
assert.equal(fs.existsSync(path.join(root, "public", "rulebook", "assets", "page-turn-backward.wav")), false);

assert.equal(loader.isAllowedRulebookUrl("/rulebook/data/rulebook-data.json"), true);
assert.equal(loader.isAllowedRulebookUrl("https://example.com/rulebook/data.json"), false);
assert.equal(loader.isAllowedRulebookUrl("/rulebook/../secret.json"), false);
assert.equal(renderer.safeVisualFilename("round-cycle.svg"), "round-cycle.svg");
assert.equal(renderer.safeVisualFilename("../round-cycle.svg"), null);
const hostile = renderer.renderMarkdown("<img src=x onerror=alert(1)><script>alert(2)</script>");
assert(!hostile.includes("<img"));
assert(!hostile.includes("<script"));
assert(hostile.includes("&lt;img"));

(async () => {
  const offline = await loader.loadRulebookData({
    url: "/rulebook/data/rulebook-data.json",
    fetchImpl: async () => { throw new Error("offline"); },
    fallbackBundle: runtime
  });
  assert.equal(offline.contentDigest, runtime.contentDigest);
  console.log("1.2.11: версіонування, журнал змін, offline fallback, безпечний renderer, стабільне беззвучне перегортання та органічні схеми перевірено.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

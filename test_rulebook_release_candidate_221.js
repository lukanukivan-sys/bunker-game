"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const feedbackApi = require("./public/rulebook/rulebook-feedback");
const { validateRulebookChangeSet } = require("./scripts/rulebook_change_guard");
const { validateRulebookGate } = require("./scripts/rulebook_release_gate");

const root = __dirname;

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

const storage = memoryStorage();
let now = 1_000;
const feedback = feedbackApi.createRulebookFeedback({ storage, version: "0.8.0-rc.1", now: () => ++now });
assert.equal(feedback.isEnabled(), false);
assert.equal(feedback.recordOpen(), false);
feedback.setEnabled(true);
feedback.recordOpen();
feedback.recordPageVisit("quick-overview");
feedback.recordPageTurn();
feedback.recordDirectJump();
feedback.recordSearch("нічия", 3);
feedback.recordSearch("https://example.com secret ABCDEFGHIJKLMNOPQRSTUV", 0);
feedback.recordError("layout:overflow");
feedback.recordClose();
const report = feedback.getReport();
assert.equal(report.schema, "rulebook-local-review-v1");
assert.equal(report.counters.opens, 1);
assert.equal(report.counters.pageTurns, 1);
assert.equal(report.counters.directJumps, 1);
assert.equal(report.counters.searches, 2);
assert.equal(report.counters.searchesWithoutResults, 1);
assert.equal(report.pageVisits["quick-overview"], 1);
assert(report.failedQueries[0].includes("[посилання]"));
assert(!feedback.serialize().includes("https://example.com"));
feedback.clear();
assert.equal(feedback.getReport().counters.opens, 0);
assert.equal(feedback.isEnabled(), true);

const validChangeSet = validateRulebookChangeSet([
  "server.js",
  "test_mode_rule.js",
  "docs/rulebook/content/04-modes.md",
  "docs/rulebook/rule-changes.json",
  "public/rulebook/data/rulebook-data.json",
  "public/rulebook/data/rulebook-fallback.js"
]);
assert.deepEqual(validChangeSet.errors, []);

const missingRulebook = validateRulebookChangeSet(["server.js", "test_mode_rule.js"]);
assert(missingRulebook.errors.some((item) => item.includes("правила")));
assert(missingRulebook.errors.some((item) => item.includes("rule-changes")));

const missingRuntime = validateRulebookChangeSet([
  "docs/rulebook/content/04-modes.md",
  "docs/rulebook/rule-changes.json",
  "test_rulebook_release_candidate_221.js"
]);
assert(missingRuntime.errors.some((item) => item.includes("runtime JSON")));

const rc = validateRulebookGate("rc");
assert.deepEqual(rc.errors, [], rc.errors.join("\n"));
assert.equal(rc.stats.rulebookVersion, "0.8.0-rc.1");
assert.equal(rc.stats.scenarios, 10);
assert.equal(rc.stats.openBlockers, 8);
assert.equal(rc.stats.acceptanceStatus, "pending");
assert(rc.warnings.some((item) => item.includes("фінальний випуск заблокований")));

const finalGate = validateRulebookGate("final");
assert(finalGate.errors.some((item) => item.includes("provisional P0")));
assert(finalGate.errors.some((item) => item.includes("human-acceptance")));

const index = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const shell = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook-shell.js"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "verify.yml"), "utf8");
assert(index.includes("rulebook-feedback.js?stage=36-40"));
assert(shell.includes("Діагностика вимкнена за замовчуванням"));
assert(shell.includes("data-rulebook-review-export"));
assert(workflow.includes("npm run audit:rulebook:sync"));
assert(fs.existsSync(path.join(root, ".github", "pull_request_template.md")));

console.log("1.2.11: release candidate, реальні приймальні сценарії, локальний тестовий звіт і CI guard синхронізації правил перевірено.");

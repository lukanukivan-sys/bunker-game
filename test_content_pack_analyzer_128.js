"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const { analyzeContentPack } = require("./platform");

const brokenPack = {
  name: "Тестовий аналізатор",
  setting: "modern",
  entries: {
    professions: [
      { name: "Лікар", level: "normal" },
      { name: "Лікар!", level: "normal" },
      { name: "Невідомий", level: "super_absurd" }
    ],
    events: [{
      id: "dominant_event",
      title: "Однозначна подія",
      description: "Один варіант явно кращий.",
      choices: [
        { id: "best", label: "Отримати все безкоштовно", success: 0.95, good: { food: 50, water: 40 }, bad: {}, goodText: "Все добре", badText: "Нічого не сталося" },
        { id: "bad", label: "Втратити припаси", success: 0.2, good: { morale: 1 }, bad: { food: -20, morale: -10 }, goodText: "Майже нічого", badText: "Великі втрати" }
      ]
    }],
    expeditions: [{
      id: "untagged",
      name: "Маршрут без тегів",
      description: "Перевірка відсутніх тегів.",
      tags: [],
      difficulty: 3,
      success: { food: 60 },
      failure: { morale: -40 }
    }]
  }
};
const direct = analyzeContentPack(brokenPack, { sampleSize: 10 });
assert(direct.summary.errors >= 1, "invalid level must be an error");
assert(direct.summary.warnings >= 4, "balance warnings expected");
assert(direct.duplicates.some((item) => item.one === "Лікар" && item.two === "Лікар!"), "semantic duplicate not found");
assert(direct.issues.some((item) => item.code === "dominant_event_choice"), "dominant event choice not detected");
assert(direct.issues.some((item) => item.code === "missing_expedition_tags"), "missing expedition tags not detected");
assert(direct.issues.some((item) => item.code === "expedition_reward"), "strong expedition reward not detected");
assert.equal(direct.simulation.generated, 10);
assert(direct.preview.length > 0);
assert(direct.knownExpeditionTags.includes("technical"));

const validPack = {
  name: "Збалансований набір",
  description: "Тест працездатного набору.",
  setting: "postapocalypse",
  entries: {
    professions: [{ name: "Механік каравану", level: "normal" }],
    skills: [{ name: "Польовий ремонт насосів", level: "normal" }],
    events: [{
      id: "water_choice",
      title: "Останній фільтр",
      description: "Громада має вирішити, як використати останній справний фільтр.",
      choices: [
        { id: "safe", label: "Встановити у спільний резервуар", success: 0.75, good: { water: 8, morale: 2 }, bad: { water: -4 }, goodText: "Вода стала чистішою.", badText: "Монтаж пошкодив частину запасу." },
        { id: "risky", label: "Розібрати й зробити два менші", success: 0.52, good: { water: 14 }, bad: { water: -8, morale: -3 }, goodText: "Два контури запрацювали.", badText: "Фільтр остаточно зіпсовано." }
      ]
    }],
    expeditions: [{
      id: "pump_station",
      name: "Затоплена насосна станція",
      description: "У підвалі можуть зберегтися насоси й фільтри.",
      tags: ["water", "technical", "survival"],
      difficulty: 4,
      success: { water: 15, integrity: 2 },
      failure: { medicine: -4, morale: -3 }
    }]
  }
};
const good = analyzeContentPack(validPack, { sampleSize: 25 });
assert.equal(good.summary.errors, 0);
assert.equal(good.simulation.generated, 25);

const root = __dirname;
const html = fs.readFileSync(path.join(root, "public", "manage.html"), "utf8");
const client = fs.readFileSync(path.join(root, "public", "manage.js"), "utf8");
assert.match(html, /id="analyzePackButton"/);
assert.match(html, /id="analysisPanel"/);
assert.match(html, /data-pack-template="event"/);
assert.match(html, /AUTHOR_CONTENT_GUIDE_UA\.md/);
assert.match(client, /\/api\/content-packs\/analyze/);
assert.match(client, /renderAnalysis\(report\)/);

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-pack-analyzer-"));
const port = 34128;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root,
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir },
  stdio: ["ignore", "pipe", "pipe"]
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(route, options = {}) {
  const response = await fetch(`${base}${route}`, {
    method: options.method || "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return { response, payload: await response.json().catch(() => ({})) };
}
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try { if ((await request("/api/ready")).response.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error(`Server did not start: ${output}`);
}

(async () => {
  try {
    await waitForServer();
    const unauthorized = await request("/api/content-packs/analyze", { method: "POST", body: { pack: validPack } });
    assert.equal(unauthorized.response.status, 401);

    const registered = await request("/api/accounts/register", { method: "POST", body: { username: "content_author", displayName: "Автор", password: "Secure-Test-129!" } });
    assert.equal(registered.response.status, 201, JSON.stringify(registered.payload));
    const auth = { accountId: registered.payload.accountId, accountToken: registered.payload.token };

    const analyzed = await request("/api/content-packs/analyze", { method: "POST", body: { ...auth, pack: brokenPack, sampleSize: 50 } });
    assert.equal(analyzed.response.status, 200, JSON.stringify(analyzed.payload));
    assert.equal(analyzed.payload.report.simulation.generated, 50);
    assert(analyzed.payload.report.summary.errors >= 1);

    const saved = await request("/api/content-packs/create", { method: "POST", body: { ...auth, pack: validPack } });
    assert.equal(saved.response.status, 201, JSON.stringify(saved.payload));
    assert.equal(saved.payload.pack.entries.events.length, 1);
    assert.equal(saved.payload.pack.entries.expeditions.length, 1);

    console.log("✅ Stage 22 author-content analyzer tests passed");
  } finally {
    await stopChildProcess(child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
});

"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const { createPlatform } = require("./platform");
const { buildCampaignLegacy, balancedStartingEffects } = require("./content/campaign_legacy");

const baseDir = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-campaign-legacy-"));
const platform = createPlatform(baseDir, dataDir);
const registered = platform.register({ username: "legacy_host", displayName: "Хост спадщини", password: "Secure-Test-129!" });
const account = platform.authenticate(registered.accountId, registered.token);
const campaign = platform.createCampaign(account, { name: "Жива спадщина", setting: "modern" });
platform.recordGame({
  code: "OLD126",
  hostAccountId: account.id,
  campaignId: campaign.id,
  settings: { setting: "modern", mode: "survival" },
  players: [{ id: "old_player", name: "Хост спадщини", accountId: account.id, character: {} }],
  game: {
    shelter: { allies: 2, resources: { food: 82, water: 78, energy: 70, integrity: 76, medicine: 66, morale: 74 } },
    final: {
      score: 79,
      verdict: "Сильне поселення",
      survivors: [{ id: "old_player", name: "Хост спадщини" }],
      longTermSimulation: {
        finalResources: { food: 82, water: 78, energy: 70, integrity: 76, medicine: 66, morale: 74 },
        demography: { births: 0, deaths: 0, endPopulation: 7 },
        settlement: { stage: "Поселення", buildings: ["Майстерня спадщини"] },
        personalFates: [{ playerId: "old_player", alive: true }],
        chronicle: []
      }
    }
  }
});
platform.saveAllNow();

const negativeBlueprint = buildCampaignLegacy({
  id: "negative", name: "Складна кампанія", chapters: [{ number: 1, verdict: "Дефіцит", score: 28 }],
  carryover: { version: 2, resources: { food: -4, water: -3, morale: -4 }, allies: 0, legacy: [] }
}, 4);
assert.equal(negativeBlueprint.dilemma.kind, "recovery_plan");
assert.equal(balancedStartingEffects({ resources: { food: -4 } }).food, -2, "Негативна спадщина має бути пом'якшена");
assert.equal(balancedStartingEffects({ resources: { food: 8 } }).food, 5, "Позитивна спадщина має мати верхню межу");

const port = 32700 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
let server;
function launch() {
  server = spawn(process.execPath, ["server.js"], { cwd: baseDir, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
}
async function api(route, options = {}) {
  const headers = { ...(options.headers || {}), ...(options.body ? { "Content-Type": "application/json" } : {}) };
  const response = await fetch(base + route, { method: options.method || "GET", headers: Object.keys(headers).length ? headers : undefined, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function waitReady() {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await api("/api/health")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Сервер не запустився");
}
async function stop() {
  await stopChildProcess(server);
}
(async () => {
  launch();
  await waitReady();
  const login = await api("/api/accounts/login", { method: "POST", body: { username: "legacy_host", password: "Secure-Test-129!" } });
  const bootstrap = await api("/api/platform/bootstrap", { headers: { Authorization: `Bearer ${login.token}`, "X-Account-Id": login.accountId } });
  const activeCampaign = bootstrap.campaigns.find((item) => item.id === campaign.id);
  assert(activeCampaign.carryoverSummary.includes("союзники"));

  const host = await api("/api/rooms/create", { method: "POST", body: {
    accountId: login.accountId, accountToken: login.token, name: "Хост спадщини", mode: "survival", setting: "modern",
    scenarioMode: "catalog", capacity: 4, rounds: 2, revealsPerRound: 1, absurdity: 1, campaignId: campaign.id,
    generationSeed: "LEGACY-126"
  } });
  const sessions = [host];
  for (let i = 2; i <= 4; i += 1) {
    const joined = await api("/api/rooms/join", { method: "POST", body: { code: host.code, name: `Учасник ${i}` } });
    sessions.push(joined);
    await action(joined, "ready", { value: true });
  }
  async function action(session, actionName, extra = {}) {
    return api(`/api/rooms/${host.code}/action`, { method: "POST", body: { playerId: session.playerId, token: session.token, action: actionName, ...extra } });
  }
  async function state(session = host) {
    return api(`/api/rooms/${host.code}/state?playerId=${session.playerId}&token=${session.token}`);
  }
  await action(host, "start");
  let current = await state();
  assert(current.game.campaignLegacy?.enabled, "Друга партія кампанії повинна отримати спадщину");
  assert.equal(current.game.campaignLegacy.dilemma.kind, "ally_request");
  assert.equal(current.game.campaignLegacy.dilemma.status, "open");
  assert(current.game.shelter.allies >= 1 && current.game.shelter.allies <= 2, "Союзний бонус має бути обмежений");
  const foodBefore = current.game.shelter.resources.food;
  const waterBefore = current.game.shelter.resources.water;
  const fullAid = current.game.campaignLegacy.dilemma.options.find((item) => item.id === "full_aid");
  assert(fullAid && fullAid.affordable);

  for (const session of sessions) await action(session, "campaign_legacy_vote", { optionId: "full_aid" });
  current = await state();
  assert.equal(current.game.campaignLegacy.votesCast, 4);
  assert.equal(current.game.campaignLegacy.myVote, "full_aid");
  await action(host, "resolve_campaign_legacy");
  current = await state();
  assert.equal(current.game.campaignLegacy.dilemma.status, "resolved");
  assert.equal(current.game.campaignLegacy.dilemma.resolvedOptionId, "full_aid");
  assert.equal(current.game.shelter.resources.food, foodBefore - 4);
  assert.equal(current.game.shelter.resources.water, waterBefore - 4);
  assert(current.game.campaignLegacy.dilemma.resultText.includes("Виконати прохання"));

  let rejected = false;
  try { await action(sessions[1], "campaign_legacy_vote", { optionId: "refuse_aid" }); }
  catch (error) { rejected = /Активної кампанійної дилеми/.test(error.message); }
  assert(rejected, "Після розв'язання голосування має бути закрите");

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("Кампанійна спадщина 1.2.10 перевірена: обмежені бонуси, шлях відновлення, голосування, ціна переваги й закриття дилеми.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

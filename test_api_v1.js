"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const baseDir = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-api-"));
const port = 32100 + Math.floor(Math.random() * 500);
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
  for (let i = 0; i < 50; i += 1) {
    try { const health = await api("/api/health"); if (health.version === "1.2.10") return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Сервер не запустився.");
}
async function stop() {
  await stopChildProcess(server);
}
(async () => {
  launch(); await waitReady();
  const reg = await api("/api/accounts/register", { method: "POST", body: { username: "api_tester", displayName: "API Тестер", password: "Secure-Test-129!" } });
  const credentials = { accountId: reg.accountId, accountToken: reg.token };
  const campaign = (await api("/api/campaigns/create", { method: "POST", body: { ...credentials, name: "API кампанія", setting: "modern" } })).campaign;
  const pack = (await api("/api/content-packs/create", { method: "POST", body: { ...credentials, pack: { name: "API набір", setting: "modern", entries: { professions: [{ name: "Оператор тестового стенда" }] } } } })).pack;
  const room = await api("/api/rooms/create", { method: "POST", body: { ...credentials, name: "API Тестер", mode: "survival", setting: "modern", scenarioMode: "catalog", capacity: 4, rounds: 2, revealsPerRound: 1, absurdity: 1, campaignId: campaign.id, contentPackId: pack.id } });
  const sessions = [room];
  for (let index = 2; index <= 4; index += 1) {
    const joined = await api("/api/rooms/join", { method: "POST", body: { code: room.code, name: `Гравець ${index}` } });
    sessions.push(joined);
    await action(joined, "ready", { value: true });
  }
  async function action(session, actionName, extra = {}) {
    return api(`/api/rooms/${room.code}/action`, { method: "POST", body: { playerId: session.playerId, token: session.token, action: actionName, ...extra } });
  }
  async function state(session = room) { return api(`/api/rooms/${room.code}/state?playerId=${session.playerId}&token=${session.token}`); }
  await action(room, "start");
  let initial = await state();
  assert.equal(initial.settings.campaignName, "API кампанія");
  assert.equal(initial.settings.contentPackName, "API набір");
  for (let round = 0; round < 2; round += 1) {
    let current = await state();
    while (current.game.phase !== "event") {
      await action(room, "next_phase");
      current = await state();
    }
    const choiceId = current.game.event.choices[0].id;
    for (const session of sessions) await action(session, "event_vote", { choiceId });
    await action(room, "resolve_event");
    await action(room, "next_phase");
    await action(room, "next_phase");
  }
  const finalState = await state();
  assert.equal(finalState.game.phase, "final");
  assert(Number.isFinite(finalState.game.final.score));
  let bootstrap = await api("/api/platform/bootstrap", { headers: { Authorization: `Bearer ${reg.token}`, "X-Account-Id": reg.accountId } });
  assert.equal(bootstrap.account.stats.games, 1);
  assert.equal(bootstrap.campaigns[0].chapters.length, 1);
  await stop();
  launch(); await waitReady();
  const login = await api("/api/accounts/login", { method: "POST", body: { username: "api_tester", password: "Secure-Test-129!" } });
  bootstrap = await api("/api/platform/bootstrap", { headers: { Authorization: `Bearer ${login.token}`, "X-Account-Id": login.accountId } });
  assert.equal(bootstrap.account.stats.games, 1);
  assert.equal(bootstrap.campaigns[0].chapters.length, 1);
  assert.equal(bootstrap.packs.length, 1);
  const health = await api("/api/health");
  assert.equal(health.rooms, 1);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("Повний локальний HTTP-цикл 1.2.10 перевірено: профіль, кампанія, набір, партія, фінал і відновлення після перезапуску.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

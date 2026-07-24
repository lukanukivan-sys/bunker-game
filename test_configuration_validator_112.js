"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-validator-"));
const port = 34700 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null, allowError = false) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!allowError && (!response.ok || !payload.ok)) throw new Error(payload.error || `HTTP ${response.status}`);
  return { response, payload };
}
async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await api("/api/ready")).payload.ready) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
async function create(settings = {}) {
  return (await api("/api/rooms/create", "POST", { name: "Host", mode: "classic", setting: "modern", capacity: 3, rounds: 4, revealsPerRound: 2, characterSetMode: "compact", ...settings })).payload;
}
async function join(code, index) {
  const session = (await api("/api/rooms/join", "POST", { code, name: `P${index}` })).payload;
  await action(code, session, "ready", { value: true });
  return session;
}
async function action(code, session, actionName, extra = {}, allowError = false) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra }, allowError);
}
async function state(code, session) {
  return (await api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`)).payload;
}
(async () => {
  child = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  const balanced = await create({ capacity: 3, rounds: 4, revealsPerRound: 2, characterSetMode: "compact" });
  await join(balanced.code, 2); await join(balanced.code, 3); await join(balanced.code, 4);
  let balancedState = await state(balanced.code, balanced);
  assert.equal(balancedState.configurationAnalysis.playerCount, 4);
  assert.equal(balancedState.configurationAnalysis.characterCount, 8);
  assert.equal(balancedState.configurationAnalysis.revealCoverage, 100);
  assert.ok(balancedState.configurationAnalysis.duration.min >= 5);
  assert.ok(balancedState.configurationAnalysis.duration.max > balancedState.configurationAnalysis.duration.min);
  assert.equal(balancedState.configurationAnalysis.blocking, 0);

  const impossible = await create({ capacity: 2, rounds: 2, revealsPerRound: 1, characterSetMode: "extended" });
  for (let i = 2; i <= 5; i += 1) await join(impossible.code, i);
  const impossibleState = await state(impossible.code, impossible);
  assert.ok(impossibleState.configurationAnalysis.issues.some((item) => item.code === "selection_pressure" && item.severity === "warning"));
  assert.ok(impossibleState.configurationAnalysis.issues.some((item) => item.code === "reveal_low"));
  const allowedStart = await action(impossible.code, impossible, "start", {}, true);
  assert.equal(allowedStart.response.status, 200);

  const invalidCapacity = await create({ capacity: 4, rounds: 4 });
  await join(invalidCapacity.code, 2); await join(invalidCapacity.code, 3); await join(invalidCapacity.code, 4);
  const invalidState = await state(invalidCapacity.code, invalidCapacity);
  assert.ok(invalidState.configurationAnalysis.issues.some((item) => item.code === "capacity" && item.severity === "error"));
  const blockedStart = await action(invalidCapacity.code, invalidCapacity, "start", {}, true);
  assert.equal(blockedStart.response.status, 400);
  assert.match(blockedStart.payload.error, /Місць/);

  const detective = await create({ setting: "detective", rounds: 2, capacity: 3, characterSetMode: "compact" });
  await join(detective.code, 2); await join(detective.code, 3); await join(detective.code, 4);
  const detectiveState = await state(detective.code, detective);
  assert.ok(detectiveState.configurationAnalysis.issues.some((item) => item.code === "detective_rounds"));

  const factions = await create({ mode: "factions", voteVisibility: "open", tieRule: "random", rounds: 4 }); // legacy value migrates to runoff
  await join(factions.code, 2); await join(factions.code, 3); await join(factions.code, 4);
  const factionsState = await state(factions.code, factions);
  assert.equal(factionsState.settings.voteVisibility, "secret");
  assert.ok(!factionsState.configurationAnalysis.issues.some((item) => item.code === "open_hidden_roles"));
  assert.equal(factionsState.settings.tieRule, "runoff");
  assert.ok(!factionsState.configurationAnalysis.issues.some((item) => item.code === "random_tie"));

  const longGame = await create({ mode: "advanced", advancedModules: ["operations", "roles"], rounds: 7, capacity: 5, characterSetMode: "extended" });
  for (let i = 2; i <= 12; i += 1) await join(longGame.code, i);
  const longState = await state(longGame.code, longGame);
  assert.ok(longState.configurationAnalysis.duration.max >= 90);
  assert.ok(longState.configurationAnalysis.issues.some((item) => item.code === "duration_long"));
  assert.ok(longState.configurationAnalysis.issues.some((item) => item.code === "memory_load"));

  const html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8");
  for (const id of ["expectedPlayers", "createConfigurationAnalysis", "lobbyConfigurationAnalysis", "lobbyConfigurationStatus"]) assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  assert.ok(app.includes("function analyzeClientConfiguration"));
  assert.ok(app.includes("function renderConfigurationAnalysis"));
  assert.ok(app.includes("function renderCharacterSetPicker"));

  await stopChildProcess(child);
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("Валідатор конфігурації, прогноз тривалості та серверне блокування перевірено.");
})().catch(async (error) => {
  console.error(error);
  if (child && !child.killed) await stopChildProcess(child);
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

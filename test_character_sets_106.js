"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-character-sets-"));
const port = 33900 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function ready() { for (let i = 0; i < 60; i += 1) { try { if ((await api("/api/health")).ok) return; } catch {} await new Promise(r => setTimeout(r, 100)); } throw new Error("server timeout"); }
async function action(code, session, actionName, extra = {}) { return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra }); }
async function state(code, session) { return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`); }
async function makeGame(characterSetMode, customCharacterKeys = [], setting = "modern") {
  const host = await api("/api/rooms/create", "POST", { name: "Host", mode: "classic", setting, capacity: 3, rounds: 4, revealsPerRound: 2, characterSetMode, customCharacterKeys });
  for (let i = 2; i <= 4; i++) { const joined = await api("/api/rooms/join", "POST", { code: host.code, name: `P${i}` }); await action(host.code, joined, "ready", { value: true }); }
  await action(host.code, host, "start");
  return state(host.code, host);
}
(async () => {
  child = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", c => process.stderr.write(c)); await ready();
  const compact = await makeGame("compact");
  assert.deepEqual(Object.keys(compact.self.privateCharacter.values), ["profession", "health", "skill", "trait", "item", "phobia", "secret", "relationship"]);
  const extended = await makeGame("extended");
  assert.equal(Object.keys(extended.self.privateCharacter.values).length, 13);
  const customKeys = ["origin", "profession", "health", "item", "secret"];
  const custom = await makeGame("custom", customKeys);
  assert.deepEqual(Object.keys(custom.self.privateCharacter.values), customKeys);
  const detective = await makeGame("compact", [], "detective");
  assert.deepEqual(Object.keys(detective.self.privateCharacter.values), ["profession", "health", "skill", "trait", "item", "alibi", "testimony", "secret"]);
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(resolve, 1500);
  });
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("Набори характеристик перевірено: стислий, розширений, власний і детективний.");
})().catch(async (e) => {
  console.error(e);
  if (child && !child.killed) {
    await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); setTimeout(resolve, 1500); });
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

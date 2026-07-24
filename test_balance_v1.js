"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const { PRODUCT_VERSION } = require("./config/version");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-balance-"));
const port = 32700 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
let child;
function start() { child = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] }); child.stderr.on("data", (chunk) => process.stderr.write(chunk)); }
async function api(route, method = "GET", body = null) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function ready() { for (let i = 0; i < 50; i += 1) { try { if ((await api("/api/ready")).ready) return; } catch {} await new Promise((r) => setTimeout(r, 100)); } throw new Error("Сервер не запустився."); }
async function stop() {
  await stopChildProcess(child);
}
async function action(code, session, actionName, extra = {}) { return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra }); }
async function state(code, session) { return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`); }

(async () => {
  start(); await ready();
  const settings = ["modern", "fantasy", "space", "postapocalypse", "cyberpunk", "horror", "detective"];
  for (const setting of settings) {
    const host = await api("/api/rooms/create", "POST", { name: `${setting}-1`, mode: "advanced", advancedModules: ["roles"], setting, scenarioMode: "procedural", capacity: 6, rounds: 2, revealsPerRound: 2, absurdity: 2 });
    const sessions = [host];
    for (let index = 2; index <= 12; index += 1) {
      const joined = await api("/api/rooms/join", "POST", { code: host.code, name: `${setting}-${index}` });
      sessions.push(joined); await action(host.code, joined, "ready", { value: true });
    }
    await action(host.code, host, "start");
    const states = [];
    for (const session of sessions) states.push(await state(host.code, session));
    const healthy = states.filter((item) => Number(item.self.privateCharacter.medicalCondition.severity || 0) === 0).length;
    assert(healthy >= 5 && healthy <= 7, `${setting}: очікувалося 5–7 персонажів без активної хвороби, отримано ${healthy}`);
    const roles = states.map((item) => item.self.privateCharacter.role.id);
    const abilities = states.map((item) => item.self.privateCharacter.ability.id);
    assert.equal(new Set(roles).size, 12, `${setting}: ролі повторилися у партії на 12 гравців`);
    assert.equal(new Set(abilities).size, 12, `${setting}: здібності повторилися у партії на 12 гравців`);
    const hostState = states[0];
    assert(hostState.game.operations.expeditions.length <= 6, `${setting}: забагато експедицій за раунд`);
    for (const value of Object.values(hostState.game.shelter.resources)) assert(value >= 0 && value <= 100, `${setting}: ресурс поза межами`);
  }
  await stop(); fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`Баланс ${PRODUCT_VERSION} перевірено для 7 сетингів: щонайменше 40% без активної хвороби, унікальні ролі й здібності, до 6 експедицій, ресурси 0–100.`);
})().catch(async (error) => { console.error(error); await stop(); fs.rmSync(dataDir, { recursive: true, force: true }); process.exit(1); });

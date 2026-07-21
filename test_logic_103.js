"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const MEDICAL = require("./content/medical");
const { describeCharacteristic } = require("./content/character_descriptions");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-103-"));
const port = 33400 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
let child;
const forbiddenClassicAbilities = new Set([
  "scout", "pathfinder", "navigation", "radar", "survival", "tracking", "stealth", "shadow", "clone",
  "teleport", "portal", "invisibility", "scrying", "hyperspace", "warp_drive", "scanner", "android"
]);
function start() {
  child = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
}
async function api(route, method = "GET", body = null) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function ready() {
  for (let i = 0; i < 50; i += 1) {
    try { if ((await api("/api/health")).version === "1.0.5") return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Сервер 1.0.5 не запустився.");
}
async function stop() {
  if (!child) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => { child.once("exit", resolve); setTimeout(resolve, 1500); });
}
async function action(code, session, name, extra = {}) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: name, ...extra });
}
async function state(code, session) {
  return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`);
}

(async () => {
  assert.equal(MEDICAL.buildMedicalCondition("Безпліддя").type, "Репродуктивний стан");
  assert.equal(MEDICAL.buildMedicalCondition("Безпліддя").severity, 0);
  assert(describeCharacteristic("profession", "Спелеолог").includes("підзем"));
  assert(describeCharacteristic("demographicContext", "Ідентичність: Жіноча • Жінка · Ставлення до батьківства: Чайлдфрі").includes("не дає бонусу або штрафу"));

  start(); await ready();
  const host = await api("/api/rooms/create", "POST", { name: "Іван", mode: "classic", setting: "modern", scenarioMode: "procedural", capacity: 4, rounds: 2, revealsPerRound: 2, absurdity: 2 });
  const sessions = [host];
  for (let i = 2; i <= 8; i += 1) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name: String(i) });
    sessions.push(joined);
    await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");
  const states = [];
  for (const session of sessions) states.push(await state(host.code, session));
  const allowedFamily = ["Чайлдфрі", "Не заперечує проти дітей", "Хоче мати дітей", "Не застосовується"];
  for (const snapshot of states) {
    const card = snapshot.self.privateCharacter;
    assert(!forbiddenClassicAbilities.has(card.ability.id), `У класичному режимі випала експедиційна здібність ${card.ability.id}`);
    assert(allowedFamily.some((value) => String(card.values.demographicContext || "").includes(value)), `Надто складний демографічний блок: ${card.values.demographicContext}`);
    assert(!card.goal.includes("експедиці") && !card.goal.includes("відремонтувати"), `Несумісна ціль: ${card.goal}`);
  }
  const byName = new Map(states.map((snapshot) => [snapshot.self.name, snapshot]));
  for (const snapshot of states) {
    const name = snapshot.self.name;
    const relation = snapshot.self.privateCharacter.values.relationship;
    const mentioned = states.filter((other) => other.self.name !== name && relation.includes(`«${other.self.name}»`));
    if (mentioned.length === 1) {
      const mirror = mentioned[0].self.privateCharacter.values.relationship;
      assert(mirror.includes(`«${name}»`), `${name} і ${mentioned[0].self.name} мають неузгоджені взаємини`);
    }
  }
  const shelter = states[0].game.shelter;
  assert(shelter.roomCount <= 7, `Забагато приміщень: ${shelter.roomCount}`);
  assert(shelter.rooms.length <= 6, `Забагато типів приміщень: ${shelter.rooms.length}`);
  assert(shelter.provisions.length <= 4, `Забагато позицій провіанту: ${shelter.provisions.length}`);
  assert.equal(states[0].game.features.operations, false);
  assert.equal(states[0].game.operations.expeditions.length, 0);

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.0.5: сумісність здібностей із режимом, прості сімейні статуси, двосторонні взаємини, компактне сховище й безпліддя перевірено.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

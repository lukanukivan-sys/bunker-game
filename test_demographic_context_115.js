"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const { simulateLongTerm } = require("./final_simulation");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-demographics-"));
const port = 34600 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await api("/api/ready")).ready) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
async function action(code, session, actionName, extra = {}) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra });
}
async function state(code, session) { return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`); }
async function makeGame(demographicsEnabled, characterSetMode = "extended", customCharacterKeys = []) {
  const host = await api("/api/rooms/create", "POST", {
    name: `Host-${demographicsEnabled}`, mode: "classic", setting: "modern", capacity: 3,
    rounds: 4, revealsPerRound: 2, demographicsEnabled, characterSetMode, customCharacterKeys
  });
  for (let i = 2; i <= 4; i += 1) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name: `P${i}-${demographicsEnabled}` });
    await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");
  return state(host.code, host);
}
function fakePlayer(id, sex, attitude) {
  return {
    id, name: id, active: true, eliminatedRound: null, outsideRole: null,
    character: {
      age: "29 років", sex, canBecomePregnant: /Жіноча|Інтерсекс/.test(sex),
      reproductiveStatus: "Фертильний", attitudeToChildren: attitude, parentalStatus: "Не має дітей",
      profession: id === "a" ? "Парамедик" : "Інженер", skill: id === "a" ? "Домедична допомога" : "Ремонт механізмів",
      hobby: "Читання", trait: "Відповідальний", relationship: "Довіряє іншому мешканцю", relationshipTargetId: null,
      role: { id: "survivor", faction: "Громада" }, health: "Цілком здоровий",
      medicalCondition: { name: "Немає активної хвороби", severity: 0, treatable: false, progressive: false, contagious: false },
      injury: 0, stress: 0, successfulExpeditions: 0, successfulRepairs: 0, successfulTreatments: 0
    }
  };
}
function fakeRoom(demographicsEnabled, isolation) {
  return {
    code: `DEMO-${demographicsEnabled}-${isolation}`,
    settings: { setting: "modern", capacity: 2, demographicsEnabled },
    players: [fakePlayer("a", "Жіноча", "Хоче мати дітей"), fakePlayer("b", "Чоловіча", "Хоче мати дітей")],
    game: {
      round: 4,
      scenario: { title: "Тест", pressure: 0.9, modules: { isolation }, lore: {} },
      shelter: {
        title: "Тестове сховище", residentCapacity: 12, roomCount: 8, allies: 0,
        resources: { food: 78, water: 80, energy: 70, integrity: 76, medicine: 72, morale: 75 },
        modules: ["Вентиляція", "Генератор", "Вода", "Медицина", "Зв’язок", "Житло"].map((name) => ({ name, condition: 78 }))
      },
      expeditionHistory: [], repairHistory: [], log: ["Тестова партія"]
    }
  };
}

(async () => {
  child = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  const enabled = await makeGame(true);
  const enabledValues = enabled.self.privateCharacter.values;
  assert.equal(enabled.settings.demographicsEnabled, true);
  assert(Object.prototype.hasOwnProperty.call(enabledValues, "demographicContext"));
  assert(!Object.prototype.hasOwnProperty.call(enabledValues, "identity"));
  assert(!Object.prototype.hasOwnProperty.call(enabledValues, "familyStatus"));
  assert(Object.prototype.hasOwnProperty.call(enabledValues, "attitudeToChildren"));
  assert.equal(Object.keys(enabledValues).length, 14);
  assert(enabled.self.privateCharacter.descriptions.demographicContext.includes("не дає автоматичного бонусу"));
  assert(enabled.self.privateCharacter.descriptions.attitudeToChildren.includes("демографічні рішення громади"));

  const disabled = await makeGame(false);
  const disabledValues = disabled.self.privateCharacter.values;
  assert.equal(disabled.settings.demographicsEnabled, false);
  assert(!Object.prototype.hasOwnProperty.call(disabledValues, "demographicContext"));
  assert(!Object.prototype.hasOwnProperty.call(disabledValues, "attitudeToChildren"));
  assert(!Object.prototype.hasOwnProperty.call(disabled.self.privateCharacter.descriptions, "demographicContext"));
  assert(!Object.prototype.hasOwnProperty.call(disabled.self.privateCharacter.descriptions, "attitudeToChildren"));
  assert(!Object.prototype.hasOwnProperty.call(disabled.game.characterLabels, "demographicContext"));
  assert(!Object.prototype.hasOwnProperty.call(disabled.game.characterLabels, "attitudeToChildren"));
  assert.equal(Object.keys(disabledValues).length, 12);
  assert(!disabled.self.privateCharacter.revealStrategy.sensitiveKeys.includes("demographicContext"));
  assert(!disabled.self.privateCharacter.revealStrategy.sensitiveKeys.includes("attitudeToChildren"));

  const filteredCustom = await makeGame(false, "custom", ["demographicContext", "attitudeToChildren", "origin", "profession", "health"]);
  assert.equal(filteredCustom.settings.characterSetMode, "compact");
  assert(!Object.prototype.hasOwnProperty.call(filteredCustom.self.privateCharacter.values, "demographicContext"));

  const noDemography = simulateLongTerm(fakeRoom(false, "20 років"), 70);
  assert.equal(noDemography.demography.enabled, false);
  assert.equal(noDemography.demography.modeled, false);
  assert.equal(noDemography.demography.births, 0);
  assert.equal(noDemography.demography.directScoreImpact, 0);
  assert(/вимкнено/i.test(noDemography.demography.explanation));

  const shortHorizon = simulateLongTerm(fakeRoom(true, "3 тижні"), 70);
  assert.equal(shortHorizon.demography.enabled, true);
  assert.equal(shortHorizon.demography.modeled, false);
  assert.equal(shortHorizon.demography.births, 0);
  assert(/закороткий/i.test(shortHorizon.demography.explanation));

  const longHorizon = simulateLongTerm(fakeRoom(true, "20 років"), 70);
  assert.equal(longHorizon.demography.enabled, true);
  assert.equal(longHorizon.demography.modeled, true);
  assert.equal(longHorizon.demography.directScoreImpact, 0);

  await stopChildProcess(child);
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("Демографічний блок, повне вимкнення та довгострокове моделювання перевірено.");
})().catch(async (error) => {
  console.error(error);
  if (child && !child.killed) await stopChildProcess(child);
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

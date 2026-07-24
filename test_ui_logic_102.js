"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const { describeCharacteristic } = require("./content/character_descriptions");
const { PRODUCT_VERSION } = require("./config/version");

assert(describeCharacteristic("demographicContext", "Інтерсекс • Небінарна особа").includes("Стать та ідентичність"));
assert(describeCharacteristic("demographicContext", "Інтерсекс • Небінарна особа").includes("не дає автоматичного бонусу"));
assert(describeCharacteristic("attitudeToChildren", "Хоче мати дітей").includes("демографічні рішення громади"));
assert(describeCharacteristic("familyStatus", "Хоче мати дітей • не має дітей • фертильний").includes("сумісного партнера"));
assert(describeCharacteristic("skill", "Стенографія").includes("протоколи голосувань"));
assert(describeCharacteristic("skill", "Вміння надавати домедичну допомогу").includes("відкриває доступ до лікування"));

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-101-"));
const port = 33400 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
let child;
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
  for (let i = 0; i < 60; i += 1) {
    try { if ((await api("/api/health")).version === PRODUCT_VERSION) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Сервер ${PRODUCT_VERSION} не запустився.`);
}
async function action(code, session, actionName, extra = {}) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra });
}
async function state(code, session) { return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`); }
async function stop() {
  await stopChildProcess(child);
}

(async () => {
  start(); await ready();
  const host = await api("/api/rooms/create", "POST", { name: "Хост", mode: "classic", setting: "modern", scenarioMode: "procedural", capacity: 3, rounds: 2, revealsPerRound: 1, absurdity: 2 });
  const sessions = [host];
  for (let i = 2; i <= 4; i += 1) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name: `Гравець ${i}` });
    sessions.push(joined); await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");
  let current = await state(host.code, host);
  const ownValues = current.self.privateCharacter.values;
  assert(Object.prototype.hasOwnProperty.call(ownValues, "demographicContext"), "немає нейтрального демографічного блоку");
  assert(!Object.prototype.hasOwnProperty.call(ownValues, "identity"), "ідентичність досі показується окремою карткою");
  assert(Object.prototype.hasOwnProperty.call(ownValues, "attitudeToChildren"), "немає окремої картки ставлення до дітей");
  assert(!Object.prototype.hasOwnProperty.call(ownValues, "familyStatus"), "старе поле familyStatus не повинно показуватися");
  assert(!Object.prototype.hasOwnProperty.call(ownValues, "sex"), "стать досі показується окремою карткою");
  assert(!Object.prototype.hasOwnProperty.call(ownValues, "reproductiveStatus"), "репродуктивний стан досі показується окремою карткою");
  assert.equal(Object.keys(ownValues).length, 14, "неправильна кількість видимих характеристик");
  assert(current.game.shelter.residentCapacity >= 4, "проєктна місткість відсутня");
  assert.equal(current.game.shelter.selectionCapacity, 3, "місця фінальної групи повинні бути окремими");
  assert(current.game.shelter.residentCapacity > current.game.shelter.selectionCapacity, "у просторому сховищі проєктна місткість має відрізнятися від кількості фіналістів");
  const resourceValues = Object.values(current.game.shelter.resources);
  assert(resourceValues.every((value) => value >= 0 && value <= 100));
  assert(Math.max(...resourceValues) <= 88, "ресурси не пройшли компресію балансу");
  for (const session of sessions) {
    const own = await state(host.code, session);
    const key = Object.keys(own.self.privateCharacter.values)[0];
    await action(host.code, session, "reveal", { key });
  }
  await action(host.code, host, "next_phase");
  current = await state(host.code, host);
  assert.equal(current.game.phase, "discussion");
  assert.equal(current.game.discussionTimer.durationSeconds, 300);
  await action(host.code, host, "discussion_timer_set", { minutes: 0.5 });
  await action(host.code, host, "discussion_timer_start");
  current = await state(host.code, host);
  assert(current.game.discussionTimer.running);
  assert(current.game.discussionTimer.remainingSeconds <= 30 && current.game.discussionTimer.remainingSeconds > 0);
  await action(host.code, host, "discussion_timer_pause");
  current = await state(host.code, host);
  assert(!current.game.discussionTimer.running);
  await action(host.code, host, "discussion_timer_reset");
  current = await state(host.code, host);
  assert.equal(current.game.discussionTimer.remainingSeconds, 30);
  await action(host.code, host, "next_phase");
  current = await state(host.code, host);
  assert.equal(current.game.phase, "event");
  assert(current.game.event.choices.every((choice) => choice.chanceLabel && Array.isArray(choice.impact)));
  const uiSource = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8");
  assert(uiSource.includes("eliminated-collapsible"), "немає згортання повністю розкритих вибулих гравців");
  assert(uiSource.includes("demography.explanation"), "у фіналі немає пояснення народжуваності");
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`${PRODUCT_VERSION}: місткість, баланс ресурсів, конкретні описи, таймер і метадані подій перевірено.`);
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

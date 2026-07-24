"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const { PRODUCT_VERSION } = require("./config/version");

const baseDir = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-detective-105-"));
const port = 33200 + Math.floor(Math.random() * 250);
const base = `http://127.0.0.1:${port}`;
let server;
function launch() {
  server = spawn(process.execPath, ["server.js"], { cwd: baseDir, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
}
async function api(route, options = {}) {
  const response = await fetch(base + route, { method: options.method || "GET", headers: options.body ? { "Content-Type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function waitReady() {
  for (let index = 0; index < 60; index += 1) {
    try { if ((await api("/api/health")).version === PRODUCT_VERSION) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Сервер ${PRODUCT_VERSION} не запустився.`);
}
async function stop() {
  await stopChildProcess(server);
}
(async () => {
  launch(); await waitReady();
  const host = await api("/api/rooms/create", { method: "POST", body: { name: "Слідчий", mode: "classic", setting: "detective", scenarioMode: "catalog", capacity: 6, rounds: 2, revealsPerRound: 1, absurdity: 0 } });
  const sessions = [host];
  async function action(session, actionName, extra = {}) {
    return api(`/api/rooms/${host.code}/action`, { method: "POST", body: { playerId: session.playerId, token: session.token, action: actionName, ...extra } });
  }
  async function state(session = host) { return api(`/api/rooms/${host.code}/state?playerId=${session.playerId}&token=${session.token}`); }
  for (let number = 2; number <= 7; number += 1) {
    const joined = await api("/api/rooms/join", { method: "POST", body: { code: host.code, name: `Гравець ${number}` } });
    sessions.push(joined); await action(joined, "ready", { value: true });
  }
  await action(host, "start");
  const states = await Promise.all(sessions.map((session) => state(session)));
  const culpritIndex = states.findIndex((item) => item.self.privateCharacter.caseRole.id === "culprit");
  assert(culpritIndex >= 0, "Винуватець має бути гарантований.");
  assert.equal(states.filter((item) => item.self.privateCharacter.caseRole.id === "culprit").length, 1);
  const culpritSession = sessions[culpritIndex];
  const culpritId = culpritSession.playerId;
  for (const current of states) {
    assert(current.game.mystery.caseBrief.incident.length > 30, "Справа повинна мати конкретний опис інциденту.");
    assert(current.game.mystery.evidence[0].candidateNames.length >= 2, "Перший доказ не повинен указувати на одну людину.");
    assert(!Object.prototype.hasOwnProperty.call(current.game.mystery, "culpritId"), "Публічний стан не повинен містити culpritId.");
    assert(current.game.mystery.publicTheory.every((item) => item.value === 0), "Початкова публічна версія має бути нейтральною.");
    const alibi = current.self.privateCharacter.values.alibi;
    assert(!/прямо пов’язує|вирішального доказу|повний доступ.*приховати/i.test(alibi), "Алібі не повинно автоматично видавати роль.");
    assert(String(current.self.privateCharacter.ability.id).startsWith("case_"), "У детективному сетингу потрібна слідча здібність.");
  }
  for (const session of sessions) {
    const own = await state(session);
    await action(session, "reveal", { key: Object.keys(own.self.privateCharacter.values)[0] });
  }
  await action(host, "next_phase");
  const investigatorSession = sessions.find((item) => item.playerId !== culpritId);
  let discussion = await state(investigatorSession);
  const logBefore = discussion.game.log.length;
  await action(investigatorSession, "investigate_case", { targetId: culpritId, aspect: "alibi" });
  discussion = await state(investigatorSession);
  assert.equal(discussion.game.log.length, logBefore, "Приватна перевірка не повинна потрапляти до загального журналу.");
  assert(discussion.self.privateCharacter.caseNotebook.findings.length === 1, "Результат перевірки має бути в приватному блокноті.");
  const culpritState = await state(culpritSession);
  const ability = culpritState.self.privateCharacter.ability;
  const innocentTarget = sessions.find((item) => item.playerId !== culpritId);
  const logBeforeAbility = (await state(culpritSession)).game.log.length;
  if (["case_redirect", "case_plant"].includes(ability.id)) await action(culpritSession, "use_ability", { targetId: innocentTarget.playerId });
  else if (ability.id === "case_discredit") await action(culpritSession, "use_ability");
  else if (ability.id === "case_cover") await action(culpritSession, "use_ability", { aspect: "alibi" });
  const afterAbility = await state(culpritSession);
  assert.equal(afterAbility.game.log.length, logBeforeAbility, "Прихована слідча здібність не повинна потрапляти до журналу.");
  assert(afterAbility.self.privateCharacter.abilityUsed, "Слідча здібність має витрачатися.");
  const accusationLog = afterAbility.game.log.length;
  for (const session of sessions) {
    const targetId = session.playerId === culpritId ? innocentTarget.playerId : culpritId;
    await action(session, "case_accusation", { targetId });
  }
  assert.equal((await state()).game.log.length, accusationLog, "Таємні фінальні звинувачення не повинні потрапляти до журналу.");
  await stop(); fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`${PRODUCT_VERSION}: конкретна справа, нейтральні досьє, приватні перевірки, приховані здібності та відсутність витоку в журнал перевірені.`);
})().catch(async (error) => {
  console.error(error); await stop(); fs.rmSync(dataDir, { recursive: true, force: true }); process.exit(1);
});

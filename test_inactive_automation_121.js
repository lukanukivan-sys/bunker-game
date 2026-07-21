"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-automation-"));
const port = 36600 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function api(route, method = "GET", body = null, expectError = false) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (expectError) return { response, payload };
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function ready() {
  for (let i = 0; i < 80; i += 1) {
    try { if ((await api("/api/health")).ok) return; } catch {}
    await sleep(100);
  }
  throw new Error("server timeout");
}
async function action(code, session, name, extra = {}, expectError = false) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: name, ...extra }, expectError);
}
async function state(code, session) {
  return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`);
}
async function createRoom(automationMode, inactivityTimeoutSeconds = 5, phaseTimeoutSeconds = 5) {
  const host = await api("/api/rooms/create", "POST", {
    name: `Host-${automationMode}`,
    mode: "classic",
    setting: "modern",
    capacity: 3,
    rounds: 2,
    revealsPerRound: 1,
    characterSetMode: "compact",
    automationMode,
    inactivityTimeoutSeconds,
    phaseTimeoutSeconds
  });
  const sessions = [host];
  for (const name of ["A", "B", "C"]) {
    const guest = await api("/api/rooms/join", "POST", { code: host.code, name: `${automationMode}-${name}` });
    sessions.push(guest);
    await action(host.code, guest, "ready", { value: true });
  }
  await action(host.code, host, "start");
  return { host, sessions };
}
async function waitFor(code, session, predicate, timeoutMs = 12000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    last = await state(code, session);
    if (predicate(last)) return last;
    await sleep(350);
  }
  throw new Error(`waitFor timeout; last phase=${last?.game?.phase}`);
}
async function stop() {
  if (!child || child.killed) return;
  await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); setTimeout(resolve, 1500); });
}

(async () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  assert(server.includes("processRoomAutomation"));
  assert(server.includes('case "resolve_inactive"'));
  assert(server.includes("neutralizePlayerForPhase"));
  assert(app.includes("hostAutomationStatus"));
  assert(html.includes('id="hostAutomationPanel"'));

  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  // Допоміжний режим: відсутні нейтралізуються, але фаза не переходить автоматично.
  const assist = await createRoom("assist", 5, 5);
  let assistHostState = await state(assist.host.code, assist.host);
  const hostKey = Object.keys(assistHostState.self.privateCharacter.values).find((key) => !assistHostState.self.privateCharacter.revealed[key]);
  await action(assist.host.code, assist.host, "reveal", { key: hostKey });
  await sleep(6200);
  assistHostState = await state(assist.host.code, assist.host);
  assert.equal(assistHostState.game.phase, "reveal", "Допоміжний режим не повинен сам переходити між фазами");
  assert.equal(assistHostState.game.automation.mode, "assist");
  assert.equal(assistHostState.game.automation.pending.length, 0);
  assert(assistHostState.game.automation.history.filter((item) => /пропуск розкриття/.test(item.action)).length >= 3);
  const absentState = await state(assist.host.code, assist.sessions[1]);
  assert.equal(absentState.self.privateCharacter.automationControlled, true);
  assert.equal(Object.values(absentState.self.privateCharacter.revealed).filter(Boolean).length, 0, "Автобот не повинен розкривати приватну характеристику");
  await action(assist.host.code, assist.host, "next_phase");
  const resumed = await state(assist.host.code, assist.sessions[1]);
  assert.equal(resumed.game.phase, "discussion");
  assert.equal(resumed.self.privateCharacter.automationControlled, false, "У новій фазі ручний контроль має відновитися");

  // Хост може вручну нейтралізувати всі невиконані обов'язкові дії навіть у ручному режимі.
  const manual = await createRoom("off", 5, 5);
  await action(manual.host.code, manual.host, "resolve_inactive", { allPending: true });
  let manualState = await state(manual.host.code, manual.host);
  assert.equal(manualState.game.hostDashboard.pending, 0);
  assert(manualState.game.automation.history.length >= 4);
  await action(manual.host.code, manual.host, "next_phase");
  assert.equal((await state(manual.host.code, manual.host)).game.phase, "discussion");

  // Повний автоматичний режим: прострочена фаза нейтралізується і переходить далі.
  const automatic = await createRoom("auto", 5, 5);
  const afterReveal = await waitFor(automatic.host.code, automatic.host, (s) => s.game.phase === "discussion", 10000);
  assert.equal(afterReveal.game.automation.mode, "auto");
  assert(afterReveal.game.automation.history.some((item) => /пропуск розкриття/.test(item.action)));
  const afterDiscussion = await waitFor(automatic.host.code, automatic.host, (s) => s.game.phase === "event", 10000);
  assert(afterDiscussion.game.event && !afterDiscussion.game.event.resolved);
  const afterEvent = await waitFor(automatic.host.code, automatic.host, (s) => s.game.phase === "elimination", 12000);
  assert(afterEvent.game.reasonLog.some((entry) => entry.type === "event"));
  assert(afterEvent.game.automation.history.some((item) => /утримання під час кризи/.test(item.action)));

  // Після автоматичних утримань рішення громади теж не зависає.
  const afterJudgement = await waitFor(automatic.host.code, automatic.host, (s) => s.game.phase === "round_end", 12000);
  assert(afterJudgement.game.judgement.report || afterJudgement.game.judgementReport || afterJudgement.game.log.some((line) => /санкц/i.test(line)));

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.1: допоміжний режим, нейтральний бот і автоматичне просування фаз перевірені.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-priorities-"));
const port = 34900 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;

async function api(route, method = "GET", body = null, allowError = false) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!allowError && (!response.ok || !payload.ok)) throw new Error(payload.error || `HTTP ${response.status}`);
  return { response, payload };
}
async function ready() {
  for (let index = 0; index < 60; index += 1) {
    try { if ((await api("/api/ready")).payload.ready) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
async function action(room, session, actionName, extra = {}) {
  return (await api(`/api/rooms/${room.code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra })).payload;
}
async function state(room, session = room) {
  return (await api(`/api/rooms/${room.code}/state?playerId=${session.playerId}&token=${session.token}`)).payload;
}
async function create(settings = {}) {
  const room = (await api("/api/rooms/create", "POST", { name: "Host", mode: "classic", setting: "modern", scenarioMode: "procedural", capacity: 3, rounds: 2, revealsPerRound: 1, ...settings })).payload;
  room.sessions = [room];
  for (let index = 2; index <= 4; index += 1) {
    const joined = (await api("/api/rooms/join", "POST", { code: room.code, name: `P${index}` })).payload;
    room.sessions.push(joined);
    await action(room, joined, "ready", { value: true });
  }
  await action(room, room, "start");
  return room;
}
function validateShape(priorities) {
  assert.ok(priorities);
  assert.equal(priorities.threats.length, 3);
  assert.equal(priorities.needs.length, 3);
  assert.equal(priorities.conditions.length, 2);
  assert.ok(priorities.longTermRisk.title);
  assert.ok(priorities.longTermRisk.detail);
  for (const group of [priorities.threats, priorities.needs, priorities.conditions]) {
    for (const item of group) {
      assert.ok(item.title);
      assert.ok(item.detail);
    }
  }
}
async function advanceProceduralToRoundTwo(room) {
  await action(room, room, "next_phase"); // reveal -> discussion
  await action(room, room, "next_phase"); // discussion -> event
  let current = await state(room);
  assert.equal(current.game.phase, "event");
  const choiceId = current.game.event.choices[0].id;
  await action(room, room, "event_vote", { choiceId });
  await action(room, room, "resolve_event");
  await action(room, room, "next_phase"); // event -> elimination
  await action(room, room, "next_phase"); // elimination -> round_end
  await action(room, room, "next_phase"); // round_end -> round 2
}

(async () => {
  child = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  const procedural = await create();
  let proceduralState = await state(procedural);
  validateShape(proceduralState.game.scenarioPriorities);
  assert.equal(proceduralState.game.scenarioPriorities.conditions[1].title, "Невідома обставина");
  assert.equal(new Set(proceduralState.game.scenarioPriorities.threats.map((item) => item.id)).size, 3);
  assert.equal(new Set(proceduralState.game.scenarioPriorities.needs.map((item) => item.id)).size, 3);
  await advanceProceduralToRoundTwo(procedural);
  proceduralState = await state(procedural);
  validateShape(proceduralState.game.scenarioPriorities);
  assert.notEqual(proceduralState.game.scenarioPriorities.conditions[1].title, "Невідома обставина");
  assert.equal(proceduralState.game.scenarioPriorities.conditions[1].revealed, true);

  const catalog = await create({ scenarioMode: "catalog", rounds: 3 });
  const catalogState = await state(catalog);
  validateShape(catalogState.game.scenarioPriorities);
  assert.ok(catalogState.game.scenarioPriorities.conditions.some((item) => item.id === "shelter_limit" || item.id === "setting_rule"));

  for (const setting of ["fantasy", "space", "postapocalypse", "cyberpunk", "horror"]) {
    const themed = await create({ setting, scenarioMode: "procedural", rounds: 3 });
    const themedState = await state(themed);
    validateShape(themedState.game.scenarioPriorities);
    assert.equal(themedState.game.scenarioPriorities.setting, setting);
  }

  const detective = await create({ setting: "detective", scenarioMode: "catalog", rounds: 4 });
  const detectiveState = await state(detective);
  validateShape(detectiveState.game.scenarioPriorities);
  assert.deepEqual(detectiveState.game.scenarioPriorities.needs.map((item) => item.id), ["evidence", "access", "trust"]);
  assert.equal(detectiveState.game.scenarioPriorities.longTermRisk.id, "trust_collapse");

  const html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "public", "styles.css"), "utf8");
  for (const id of ["scenarioPriorities", "scenarioPriorityThreats", "scenarioPriorityNeeds", "scenarioPriorityConditions", "scenarioPriorityLongTerm"]) assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  assert.ok(app.includes("function renderScenarioPriorities"));
  assert.ok(css.includes(".scenario-priority-grid"));

  await stopChildProcess(child);
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("Пріоритети сценарію 3/3/2/1, детективний брифінг і безпечне розкриття обставини перевірено.");
})().catch(async (error) => {
  console.error(error);
  if (child && !child.killed) await stopChildProcess(child);
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

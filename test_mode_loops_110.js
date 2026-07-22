"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-mode-loops-"));
const port = 34600 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null, expectError = false) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (expectError) return { response, payload };
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function waitReady() {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await api("/api/health")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
async function create(mode, setting = "modern") {
  const host = await api("/api/rooms/create", "POST", { name: `Host-${mode}-${setting}`, mode, setting, rounds: 2, capacity: 2, revealsPerRound: 1 });
  const sessions = [host];
  for (const name of ["A", "B", "C"]) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name: `${name}-${mode}` });
    sessions.push(joined);
    await action(host, joined, "ready", { value: true });
  }
  await action(host, host, "start");
  return { ...host, sessions };
}
async function state(room, who = room) { return api(`/api/rooms/${room.code}/state?playerId=${who.playerId}&token=${who.token}`); }
async function action(room, who, actionName, extra = {}, expectError = false) {
  return api(`/api/rooms/${room.code}/action`, "POST", { playerId: who.playerId, token: who.token, action: actionName, ...extra }, expectError);
}
async function stop() {
  await stopChildProcess(child);
}

(async () => {
  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitReady();
  try {
    const survival = await create("survival");
    let s = await state(survival);
    assert.equal(s.game.phase, "planning");
    assert.deepEqual(s.game.phaseLoop.map((item) => item.code), ["planning", "operations", "event", "round_end"]);
    for (const player of s.players) assert(player.revealed.profession && player.revealed.health && player.revealed.skill && player.revealed.trait && player.revealed.item, "survival shared profile missing");
    const earlyRoute = s.game.operations.expeditions[0];
    const earlyAttempt = await action(survival, survival, "launch_expedition", { locationId: earlyRoute.id, playerIds: [survival.sessions[0].playerId] }, true);
    assert(earlyAttempt.response.status >= 400);
    assert(/операц/i.test(earlyAttempt.payload.error));
    await action(survival, survival, "next_phase");
    s = await state(survival);
    assert.equal(s.game.phase, "operations");
    const route = s.game.operations.expeditions[0];
    await action(survival, survival, "launch_expedition", { locationId: route.id, playerIds: [survival.sessions[0].playerId] });
    s = await state(survival);
    assert.equal(s.game.operations.expeditionUsed, true);
    await action(survival, survival, "next_phase");
    s = await state(survival);
    assert.equal(s.game.phase, "event");

    const factions = await create("factions");
    let f = await state(factions);
    assert.deepEqual(f.game.phaseLoop.map((item) => item.code), ["reveal", "negotiation", "intrigue", "elimination", "round_end"]);
    assert.equal(f.game.operations.enabled, false);
    await action(factions, factions, "next_phase");
    f = await state(factions);
    assert.equal(f.game.phase, "negotiation");
    await action(factions, factions, "next_phase");
    f = await state(factions);
    assert.equal(f.game.phase, "intrigue");
    await action(factions, factions, "next_phase");
    f = await state(factions);
    assert.equal(f.game.phase, "elimination");
    assert.equal(f.game.event, null, "factions loop should not create a resource crisis event");

    const advanced = await create("advanced");
    let a = await state(advanced);
    assert.deepEqual(a.game.phaseLoop.map((item) => item.code), ["reveal", "discussion", "operations", "event", "elimination", "round_end"]);
    await action(advanced, advanced, "next_phase");
    a = await state(advanced);
    assert.equal(a.game.phase, "discussion");
    const advancedRoute = a.game.operations.expeditions[0];
    const advancedEarly = await action(advanced, advanced, "launch_expedition", { locationId: advancedRoute.id, playerIds: [advanced.playerId] }, true);
    assert(advancedEarly.response.status >= 400);
    await action(advanced, advanced, "next_phase");
    a = await state(advanced);
    assert.equal(a.game.phase, "operations");

    const detective = await create("classic", "detective");
    let d = await state(detective);
    assert.deepEqual(d.game.phaseLoop.map((item) => item.code), ["reveal", "investigation", "event", "elimination", "round_end"]);
    const target = detective.sessions[1];
    const tooEarly = await action(detective, detective, "investigate_case", { targetId: target.playerId, aspect: "alibi" }, true);
    assert(tooEarly.response.status >= 400);
    await action(detective, detective, "next_phase");
    d = await state(detective);
    assert.equal(d.game.phase, "investigation");
    assert.equal(d.game.mystery.canInvestigate, true);
    await action(detective, detective, "investigate_case", { targetId: target.playerId, aspect: "alibi" });
    d = await state(detective);
    assert.equal(d.game.mystery.canInvestigate, false);

    const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
    const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
    const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
    assert(html.includes('id="phaseLoopTrack"'));
    assert(app.includes("MODE_PHASE_LOOPS") || app.includes("mode-loop-preview"));
    assert(css.includes(".phase-loop-track"));
    console.log("1.2.10: окремі цикли режимів, доступність дій і детективне розслідування перевірені.");
  } finally {
    await stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

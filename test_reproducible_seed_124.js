"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-stage19-"));
const port = 34124;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root,
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir },
  stdio: ["ignore", "pipe", "pipe"]
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(route, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["content-type"] = "application/json";
  if (options.playerId) headers["x-player-id"] = options.playerId;
  const response = await fetch(`${base}${route}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}
async function ok(route, options = {}) {
  const result = await request(route, options);
  assert.equal(result.response.ok, true, `${route}: ${result.response.status} ${JSON.stringify(result.payload)}`);
  return result.payload;
}
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try { if ((await request("/api/health")).response.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error(`Server did not start: ${output}`);
}
async function state(session) {
  return ok(`/api/rooms/${session.code}/state?playerId=${session.playerId}&token=${session.token}`, { playerId: session.playerId });
}
async function action(session, actionName, extra = {}) {
  return ok(`/api/rooms/${session.code}/action`, {
    method: "POST",
    playerId: session.playerId,
    body: { playerId: session.playerId, token: session.token, action: actionName, ...extra }
  });
}
const baseSettings = {
  mode: "advanced",
  advancedModules: ["operations", "medicine"],
  setting: "modern",
  scenarioMode: "procedural",
  capacity: 2,
  rounds: 4,
  revealsPerRound: 2,
  characterSetMode: "extended",
  demographicsEnabled: true,
  absurdity: 2,
  voteSystem: "tribunal",
  voteVisibility: "secret",
  tieRule: "runoff",
  automationMode: "off",
  generationSeed: "balance-test-2026"
};
async function createStartedRoom(names, extra = {}) {
  const created = await ok("/api/rooms/create", { method: "POST", body: { name: names[0], ...baseSettings, ...extra } });
  const sessions = [{ code: created.code, playerId: created.playerId, token: created.token }];
  for (const name of names.slice(1)) {
    const joined = await ok("/api/rooms/join", { method: "POST", body: { name, code: created.code } });
    sessions.push({ code: created.code, playerId: joined.playerId, token: joined.token });
    await action(sessions.at(-1), "ready", { value: true });
  }
  const lobby = await state(sessions[0]);
  await action(sessions[0], "start");
  const states = await Promise.all(sessions.map(state));
  return { sessions, lobby, states };
}
function comparablePrivate(character) {
  if (!character) return null;
  const values = { ...(character.values || {}) };
  delete values.relationship;
  return {
    values,
    role: character.role?.id,
    ability: character.ability?.id,
    goalId: character.goalId,
    medical: character.medicalCondition ? {
      name: character.medicalCondition.name,
      type: character.medicalCondition.type,
      severity: character.medicalCondition.severity
    } : null,
    inventory: (character.inventory || []).map((item) => item.name)
  };
}

(async () => {
  try {
    await waitForServer();

    const invalid = await request("/api/rooms/create", { method: "POST", body: { name: "Bad", ...baseSettings, generationSeed: "x" } });
    assert.equal(invalid.response.status, 400, "too-short seed must be rejected");

    const auto = await ok("/api/rooms/create", { method: "POST", body: { name: "Auto", ...baseSettings, generationSeed: "" } });
    const autoState = await state({ code: auto.code, playerId: auto.playerId, token: auto.token });
    assert.match(autoState.generation.seed, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.match(autoState.generation.configCode, /^CFG-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    assert.equal(autoState.generation.fingerprint, null);

    const roomA = await createStartedRoom(["Аліса", "Богдан", "Віра", "Гнат"]);
    const roomB = await createStartedRoom(["Олена", "Петро", "Софія", "Тарас"]);

    assert.equal(roomA.lobby.generation.seed, "BALANCE-TEST-2026");
    assert.equal(roomA.lobby.generation.configCode, roomB.lobby.generation.configCode, "same lobby configuration must have same config code");
    assert.equal(roomA.states[0].generation.fingerprint, roomB.states[0].generation.fingerprint, "same seed/config/player count must have same fingerprint despite different names");
    assert.match(roomA.states[0].generation.fingerprint, /^GEN-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    assert.equal(roomA.states[0].generation.reproducible, true);
    assert.deepEqual(roomA.states[0].game.catastrophe, roomB.states[0].game.catastrophe);
    assert.deepEqual(roomA.states[0].game.shelter.resources, roomB.states[0].game.shelter.resources);
    assert.deepEqual(roomA.states[0].game.shelter.modules.map((item) => ({ name: item.name, condition: item.condition })), roomB.states[0].game.shelter.modules.map((item) => ({ name: item.name, condition: item.condition })));
    for (let index = 0; index < 4; index += 1) {
      assert.deepEqual(comparablePrivate(roomA.states[index].self.privateCharacter), comparablePrivate(roomB.states[index].self.privateCharacter), `seat ${index + 1} character differs`);
    }

    const roomC = await createStartedRoom(["А", "Б", "В", "Г"], { generationSeed: "OTHER-SEED-2026" });
    assert.notEqual(roomA.states[0].generation.configCode, roomC.states[0].generation.configCode);
    assert.notEqual(roomA.states[0].generation.fingerprint, roomC.states[0].generation.fingerprint);

    const roomD = await createStartedRoom(["А", "Б", "В", "Г"], { setting: "horror" });
    assert.notEqual(roomA.states[0].generation.configCode, roomD.states[0].generation.configCode, "different setting must change config code");
    assert.notEqual(roomA.states[0].generation.fingerprint, roomD.states[0].generation.fingerprint, "different setting must change fingerprint");

    console.log("✅ Stage 19 reproducible seed tests passed");
  } finally {
    await stopChildProcess(child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
});

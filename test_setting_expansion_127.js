"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const content = require("./content");
const STAGE23 = content.STAGE23;

const weakSettings = ["postapocalypse", "cyberpunk", "horror", "detective"];
for (const setting of ["fantasy", "space", ...weakSettings]) {
  assert(content.SETTINGS[setting].catastrophes.length >= 20, `${setting}: catastrophes < 20`);
}
for (const setting of weakSettings) {
  assert(content.EVENTS[setting].length >= 25, `${setting}: events < 25`);
  assert(content.EXPEDITIONS[setting].length >= 30, `${setting}: expeditions < 30`);
  assert(content.EVENTS[setting].filter((item) => item.level === "absurd").length >= 4, `${setting}: not enough absurd events`);
  assert(content.EXPEDITIONS[setting].filter((item) => item.level === "absurd").length >= 4, `${setting}: not enough absurd expeditions`);
  for (const key of ["origins", "professions", "health", "skills", "items", "secrets"]) {
    assert(content.SETTINGS[setting][key].filter((item) => item.level === "absurd").length >= 4, `${setting}.${key}: not enough absurd entries`);
  }
}
assert.equal(content.EVENTS.modern.length, 28, "modern events must not be reduced");
assert.equal(content.EXPEDITIONS.modern.length, 83, "modern expeditions must not be reduced");
assert.equal(content.EVENTS.fantasy.length, 28, "fantasy events must not be reduced");
assert.equal(content.EXPEDITIONS.fantasy.length, 64, "fantasy expeditions must not be reduced");
assert.equal(content.EVENTS.space.length, 28, "space events must not be reduced");
assert.equal(content.EXPEDITIONS.space.length, 73, "space expeditions must not be reduced");

const originalRandom = Math.random;
try {
  Math.random = () => 0.99;
  for (const setting of ["fantasy", "space", ...weakSettings]) {
    const generated = content.SCENARIOS.generate(setting, 4);
    const absurdTitles = new Set((STAGE23.scenarioCauses[setting] || []).filter((item) => item.level === "absurd").map((item) => item.title));
    assert(absurdTitles.has(generated.title), `${setting}: full chaos procedural scenario did not select absurd cause (${generated.title})`);
  }
  Math.random = () => 0.01;
  for (const setting of ["fantasy", "space", ...weakSettings]) {
    const generated = content.SCENARIOS.generate(setting, 0);
    const absurdTitles = new Set((STAGE23.scenarioCauses[setting] || []).filter((item) => item.level === "absurd").map((item) => item.title));
    assert(!absurdTitles.has(generated.title), `${setting}: normal absurdity selected absurd cause`);
  }
} finally {
  Math.random = originalRandom;
}

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-stage23-"));
const port = 34127;
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
  const response = await fetch(`${base}${route}`, { method: options.method || "GET", headers, body: options.body ? JSON.stringify(options.body) : undefined });
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
    try { if ((await request("/api/ready")).response.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error(`Server did not start: ${output}`);
}
async function state(session) {
  return ok(`/api/rooms/${session.code}/state?playerId=${session.playerId}&token=${session.token}`, { playerId: session.playerId });
}
async function action(session, actionName, extra = {}) {
  return ok(`/api/rooms/${session.code}/action`, { method: "POST", playerId: session.playerId, body: { playerId: session.playerId, token: session.token, action: actionName, ...extra } });
}

(async () => {
  try {
    await waitForServer();
    const created = await ok("/api/rooms/create", { method: "POST", body: {
      name: "Хост", mode: "advanced", advancedModules: ["operations"], setting: "postapocalypse",
      scenarioMode: "catalog", capacity: 4, rounds: 3, revealsPerRound: 1, characterSetMode: "extended",
      demographicsEnabled: false, absurdity: 4, voteSystem: "tribunal", voteVisibility: "open", tieRule: "runoff",
      generationSeed: "FULL-CHAOS-STAGE23"
    }});
    const sessions = [{ code: created.code, playerId: created.playerId, token: created.token }];
    for (let i = 2; i <= 8; i += 1) {
      const joined = await ok("/api/rooms/join", { method: "POST", body: { code: created.code, name: `Гравець ${i}` } });
      const session = { code: created.code, playerId: joined.playerId, token: joined.token };
      sessions.push(session);
      await action(session, "ready", { value: true });
    }
    await action(sessions[0], "start");
    const states = await Promise.all(sessions.map(state));
    assert.equal(states[0].settings.absurdity, 4);
    assert(["odd", "absurd"].includes(states[0].game.catastrophe.level), `catalog full chaos picked only normal catastrophe: ${states[0].game.catastrophe.title}`);
    assert(states[0].game.operations.expeditions.some((item) => item.level === "absurd"), "full chaos expedition offers contain no absurd route");
    const absurdNames = new Set();
    for (const additions of Object.values(STAGE23.settings.postapocalypse || {})) {
      if (!Array.isArray(additions)) continue;
      for (const item of additions) if (item.level === "absurd" && item.name) absurdNames.add(item.name);
    }
    let absurdCharacterValues = 0;
    for (const roomState of states) {
      for (const value of Object.values(roomState.self.privateCharacter?.values || {})) if (absurdNames.has(value)) absurdCharacterValues += 1;
    }
    assert(absurdCharacterValues >= 5, `full chaos generated too few new absurd character values: ${absurdCharacterValues}`);
    console.log("✅ Stage 23 setting expansion and full-chaos tests passed");
  } finally {
    await stopChildProcess(child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
});

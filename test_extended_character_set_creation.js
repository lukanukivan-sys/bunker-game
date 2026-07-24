"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess, sleep } = require("./test_support");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-extended-set-"));
const port = 33800 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
let server;
async function api(route, options = {}) {
  const response = await fetch(base + route, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
(async () => {
  server = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir }, stdio: "ignore" });
  for (let i = 0; i < 50; i += 1) { try { if ((await api("/api/ready")).ready) break; } catch {} await sleep(100); }
  const room = await api("/api/rooms/create", { method: "POST", body: {
    name: "Розширений тест", mode: "classic", setting: "modern", scenarioMode: "procedural",
    capacity: 3, rounds: 4, revealsPerRound: 2, characterSetMode: "extended",
    customCharacterKeys: [], demographicsEnabled: true
  }});
  const state = await api(`/api/rooms/${room.code}/state?playerId=${room.playerId}&token=${room.token}`);
  assert.equal(state.settings.characterSetMode, "extended");
  assert.equal(state.settings.customCharacterKeys.length, 0);
  await stopChildProcess(server);
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.10 UI4: створення кімнати з розширеним набором зберігає режим extended.");
})().catch(async (error) => {
  console.error(error);
  await stopChildProcess(server);
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

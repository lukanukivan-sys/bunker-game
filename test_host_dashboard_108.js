"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-host-dashboard-"));
const port = 34300 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function ready() {
  for (let index = 0; index < 60; index += 1) {
    try { if ((await api("/api/ready")).ready) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
async function action(code, session, name, extra = {}) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: name, ...extra });
}
async function getState(code, session) {
  return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`);
}
async function stop() {
  await stopChildProcess(child);
}

(async () => {
  const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
  assert(html.includes('id="hostDashboardPanel"'));
  assert(html.includes('id="hostDashboardPlayers"'));
  assert(css.includes(".host-dashboard-panel"));
  assert(app.includes("function renderHostDashboard()"));
  assert(app.includes("function confirmHostAdvance()"));

  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  const host = await api("/api/rooms/create", "POST", { name: "Host", mode: "classic", setting: "modern", capacity: 3, rounds: 3, revealsPerRound: 2, characterSetMode: "compact" });
  const sessions = [host];
  for (let index = 2; index <= 4; index += 1) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name: `P${index}` });
    sessions.push(joined);
    await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");

  let hostState = await getState(host.code, host);
  let guestState = await getState(host.code, sessions[1]);
  assert(hostState.game.hostDashboard, "Хост не отримав панель");
  assert.equal(guestState.game.hostDashboard, null, "Гість отримав службову панель хоста");
  assert.equal(hostState.game.hostDashboard.phase, "reveal");
  assert.equal(hostState.game.hostDashboard.required, 4);
  assert.equal(hostState.game.hostDashboard.pending, 4);
  assert.equal(hostState.game.hostDashboard.canAdvance, false);

  for (const session of sessions) {
    for (let count = 0; count < 2; count += 1) {
      const own = await getState(host.code, session);
      const key = Object.keys(own.self.privateCharacter.values).find((item) => !own.self.privateCharacter.revealed[item]);
      await action(host.code, session, "reveal", { key });
    }
  }
  hostState = await getState(host.code, host);
  assert.equal(hostState.game.hostDashboard.pending, 0);
  assert.equal(hostState.game.hostDashboard.completed, 4);
  assert.equal(hostState.game.hostDashboard.canAdvance, true);

  await action(host.code, host, "next_phase");
  hostState = await getState(host.code, host);
  assert.equal(hostState.game.phase, "discussion");
  assert.equal(hostState.game.hostDashboard.canAdvance, true);

  await action(host.code, host, "next_phase");
  hostState = await getState(host.code, host);
  assert.equal(hostState.game.phase, "event");
  assert.equal(hostState.game.hostDashboard.pending, 1);
  assert.equal(hostState.game.hostDashboard.canAdvance, false);
  const choiceId = hostState.game.event.choices[0].id;
  await action(host.code, host, "event_vote", { choiceId });
  hostState = await getState(host.code, host);
  assert.equal(hostState.game.hostDashboard.pending, 0);
  assert.equal(hostState.game.hostDashboard.canAdvance, false, "До підрахунку події перехід має залишатися небезпечним");
  await action(host.code, host, "resolve_event");
  hostState = await getState(host.code, host);
  assert.equal(hostState.game.hostDashboard.canAdvance, true);

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.10: панель хоста, приватність, готовність фаз і попередження переходу перевірені.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

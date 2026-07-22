"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-victory-"));
const port = 34700 + Math.floor(Math.random() * 150);
const base = `http://127.0.0.1:${port}`;
let child;

async function api(route, method = "GET", body = null) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function waitReady() {
  for (let index = 0; index < 80; index += 1) {
    try { if ((await api("/api/health")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("server timeout");
}
async function action(code, session, actionName, extra = {}) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra });
}
async function state(code, session) {
  return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`);
}
async function createStartedRoom(mode, setting = "modern") {
  const host = await api("/api/rooms/create", "POST", { name: `Host-${mode}-${setting}`, mode, setting, capacity: 3, rounds: 2, revealsPerRound: 1, characterSetMode: "compact", voteSystem: "exile", tieRule: "no_action" });
  const sessions = [host];
  const lobby = await state(host.code, host);
  assert(lobby.victoryRules?.group?.objective);
  assert(lobby.victoryRules?.personal?.objective);
  assert(lobby.victoryRules?.special);
  assert(lobby.victoryRules?.end?.objective);
  for (let index = 2; index <= 4; index += 1) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name: `P${index}-${mode}-${setting}` });
    sessions.push(joined);
    await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");
  return { code: host.code, host, sessions };
}
async function autoplay(room) {
  const byId = new Map(room.sessions.map((session) => [session.playerId, session]));
  for (let guard = 0; guard < 80; guard += 1) {
    let hostState = await state(room.code, room.host);
    if (hostState.game.phase === "final") return hostState;
    const phase = hostState.game.phase;
    if (phase === "reveal") {
      const pending = hostState.game.hostDashboard.players.filter((row) => row.phaseState.code === "pending");
      for (const row of pending) {
        const session = byId.get(row.id);
        const own = await state(room.code, session);
        const key = Object.keys(own.self.privateCharacter.values).find((item) => !own.self.privateCharacter.revealed[item]);
        if (key) await action(room.code, session, "reveal", { key });
      }
      await action(room.code, room.host, "next_phase");
    } else if (["discussion", "planning", "negotiation", "intrigue", "investigation", "operations"].includes(phase)) {
      await action(room.code, room.host, "next_phase");
    } else if (phase === "event") {
      if (!hostState.game.event.resolved) {
        const choiceId = hostState.game.event.choices[0].id;
        const pending = hostState.game.hostDashboard.players.filter((row) => row.phaseState.code === "pending");
        for (const row of pending) await action(room.code, byId.get(row.id), "event_vote", { choiceId });
        await action(room.code, room.host, "resolve_event");
      }
      await action(room.code, room.host, "next_phase");
    } else if (phase === "elimination") {
      const pending = hostState.game.hostDashboard.players.filter((row) => row.phaseState.code === "pending");
      for (const row of pending) await action(room.code, byId.get(row.id), "elimination_vote", { targetId: "__skip__", sanction: "exile" });
      await action(room.code, room.host, "next_phase");
    } else if (phase === "round_end") {
      await action(room.code, room.host, "next_phase");
    } else throw new Error(`unknown phase ${phase}`);
  }
  throw new Error("autoplay guard exceeded");
}
async function stop() {
  await stopChildProcess(child);
}

(async () => {
  const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
  for (const id of ["createVictoryRules", "lobbyVictoryRules", "victoryRulesPanel", "victoryRulesCards", "finalVictorySummary"]) assert(html.includes(`id="${id}"`), `missing ${id}`);
  assert(css.includes(".victory-rule-grid"));
  assert(css.includes(".final-victory-grid"));
  assert(app.includes("function renderVictoryRules()"));
  assert(app.includes("function renderFinalVictorySummary()"));

  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitReady();

  const cases = [
    ["classic", "modern"],
    ["survival", "modern"],
    ["factions", "modern"],
    ["advanced", "modern"],
    ["classic", "detective"]
  ];
  for (const [mode, setting] of cases) {
    const room = await createStartedRoom(mode, setting);
    const activeHost = await state(room.code, room.host);
    assert(activeHost.game.victoryRules?.group?.objective);
    assert(activeHost.game.victoryRules?.personal?.objective);
    assert(activeHost.game.victoryRules?.special?.objective);
    if (mode === "classic" && setting !== "detective") assert.equal(activeHost.game.victoryRules.special.enabled, false);
    if (setting === "detective") assert(activeHost.game.victoryRules.special.title !== "Додаткова умова");
    const finalState = await autoplay(room);
    assert(finalState.game.final.groupResult);
    assert.equal(finalState.game.final.personalResults.length, 4);
    assert.equal(finalState.game.final.personalGoals.length, 4);
    assert.equal(finalState.game.final.roleResults.length, 4);
    assert(finalState.game.victorySummary?.group);
    assert(finalState.game.victorySummary?.personal);
    assert(finalState.game.victorySummary?.special);
    if (setting === "detective") {
      assert(finalState.game.final.roleResults.every((result) => ["Організатор злочину", "Співучасник", "Учасник розслідування"].includes(result.role)));
    }
  }

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.10: групові, особисті та спеціальні умови перемоги перевірено для всіх режимів і детективу.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

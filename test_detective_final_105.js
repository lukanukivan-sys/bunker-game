"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const baseDir = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-detective-final-105-"));
const port = 33500 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let server;
async function api(route, options = {}) { const response = await fetch(base + route, { method: options.method || "GET", headers: options.body ? { "Content-Type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined }); const payload = await response.json(); if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`); return payload; }
async function ready() { for (let i = 0; i < 60; i += 1) { try { if ((await api("/api/health")).version === "1.2.10") return; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Сервер не запустився"); }
async function stop() {
  await stopChildProcess(server);
}
(async () => {
  server = spawn(process.execPath, ["server.js"], { cwd: baseDir, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk)); await ready();
  const host = await api("/api/rooms/create", { method: "POST", body: { name: "Хост", mode: "classic", setting: "detective", scenarioMode: "catalog", capacity: 4, rounds: 2, revealsPerRound: 1, absurdity: 0 } });
  const sessions = [host];
  const action = (session, actionName, extra = {}) => api(`/api/rooms/${host.code}/action`, { method: "POST", body: { playerId: session.playerId, token: session.token, action: actionName, ...extra } });
  const state = (session = host) => api(`/api/rooms/${host.code}/state?playerId=${session.playerId}&token=${session.token}`);
  for (let i = 2; i <= 5; i += 1) { const joined = await api("/api/rooms/join", { method: "POST", body: { code: host.code, name: `Гравець ${i}` } }); sessions.push(joined); await action(joined, "ready", { value: true }); }
  await action(host, "start");
  const states = await Promise.all(sessions.map(state));
  const culpritIndex = states.findIndex((item) => item.self.privateCharacter.caseRole.id === "culprit");
  const culpritId = sessions[culpritIndex].playerId;
  for (const session of sessions) { const own = await state(session); await action(session, "reveal", { key: Object.keys(own.self.privateCharacter.values)[0] }); }
  await action(host, "next_phase");
  const aspects = ["alibi", "motive", "access", "testimony", "evidenceLink"];
  let index = 0;
  for (const session of sessions) {
    if (session.playerId === culpritId) continue;
    await action(session, "investigate_case", { targetId: culpritId, aspect: aspects[index++ % aspects.length] });
    await action(session, "case_accusation", { targetId: culpritId });
  }
  const culpritSession = sessions[culpritIndex];
  const innocent = sessions.find((item) => item.playerId !== culpritId);
  await action(culpritSession, "case_accusation", { targetId: innocent.playerId });
  await action(host, "next_phase");
  let current = await state();
  const choiceId = current.game.event.choices[0].id;
  await action(host, "event_vote", { choiceId });
  await action(host, "resolve_event");
  await action(host, "next_phase");
  for (const session of sessions) await action(session, "elimination_vote", { targetId: session.playerId === culpritId ? "__skip__" : culpritId, sanction: "exile" });
  await action(host, "next_phase");
  current = await state();
  if (current.game.phase === "round_end") await action(host, "next_phase");
  current = await state();
  if (current.game.phase === "reveal") {
    for (const session of sessions) {
      const own = await state(session);
      if (!own.self.active) continue;
      const hiddenKey = Object.keys(own.self.privateCharacter.values).find((key) => !own.self.privateCharacter.revealed[key]);
      if (hiddenKey) await action(session, "reveal", { key: hiddenKey });
    }
    await action(host, "next_phase");
    current = await state();
    await action(host, "next_phase");
    current = await state();
    const secondChoice = current.game.event.choices[0].id;
    await action(host, "event_vote", { choiceId: secondChoice });
    await action(host, "resolve_event");
    await action(host, "next_phase");
    current = await state();
    if (current.game.phase === "round_end") await action(host, "next_phase");
  }
  current = await state();
  assert.equal(current.game.phase, "final");
  const result = current.game.final.mysteryResult;
  assert(result);
  assert.equal(result.culpritName, states[culpritIndex].self.name);
  assert.equal(result.accusedName, states[culpritIndex].self.name);
  assert.equal(result.correctAccusation, true);
  assert(result.requiredEvidence >= 2);
  assert(result.evidenceStrength >= 1);
  assert(result.caseBrief.incident.length > 30);
  assert(Array.isArray(result.publicClaims));
  assert(Array.isArray(result.investigationLog));
  await stop(); fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`1.2.10: повний детективний фінал перевірено; доказова сила ${result.evidenceStrength}/${result.requiredEvidence}, solved=${result.solved}.`);
})().catch(async (error) => { console.error(error); await stop(); fs.rmSync(dataDir, { recursive: true, force: true }); process.exit(1); });

"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-strategic-reveal-"));
const port = 35150 + Math.floor(Math.random() * 200);
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
    try { if ((await api("/api/health")).payload.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
async function action(room, session, actionName, extra = {}, allowError = false) {
  return api(`/api/rooms/${room.code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra }, allowError);
}
async function state(room, session = room) {
  return (await api(`/api/rooms/${room.code}/state?playerId=${session.playerId}&token=${session.token}`)).payload;
}
async function create() {
  const room = (await api("/api/rooms/create", "POST", { name: "Host", mode: "classic", setting: "modern", scenarioMode: "procedural", capacity: 3, rounds: 3, revealsPerRound: 2, characterSetMode: "extended" })).payload;
  room.sessions = [room];
  for (let index = 2; index <= 4; index += 1) {
    const joined = (await api("/api/rooms/join", "POST", { code: room.code, name: `P${index}` })).payload;
    room.sessions.push(joined);
    await action(room, joined, "ready", { value: true });
  }
  await action(room, room, "start");
  return room;
}
async function finishCurrentRound(room) {
  let current = await state(room);
  if (current.game.phase === "reveal") await action(room, room, "next_phase");
  current = await state(room);
  if (current.game.phase === "discussion") await action(room, room, "next_phase");
  current = await state(room);
  if (current.game.phase === "event") {
    const choiceId = current.game.event.choices[0].id;
    await action(room, room, "event_vote", { choiceId });
    await action(room, room, "resolve_event");
    await action(room, room, "next_phase");
  }
  current = await state(room);
  if (current.game.phase === "elimination") await action(room, room, "next_phase");
  current = await state(room);
  if (current.game.phase === "round_end") await action(room, room, "next_phase");
}

(async () => {
  child = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();
  const room = await create();

  let hostState = await state(room);
  assert.equal(hostState.game.revealStrategy.enabled, true);
  assert.equal(hostState.game.revealStrategy.focusKeys.length, 2);
  assert.equal(hostState.self.privateCharacter.revealStrategy.choiceKeys.length, 2);
  assert.equal(hostState.self.privateCharacter.revealStrategy.choiceRequired, true);
  assert.ok(hostState.self.privateCharacter.revealStrategy.pressure);

  const privateData = hostState.self.privateCharacter;
  const choices = privateData.revealStrategy.choiceKeys;
  const sensitive = privateData.revealStrategy.sensitiveKeys.find((key) => !privateData.revealed[key]);
  const validKeys = [choices[0]];
  if (sensitive && sensitive !== choices[0]) validKeys.push(sensitive);
  await action(room, room, "reveal_many", { keys: validKeys, strategicChoice: true });
  hostState = await state(room);
  assert.ok(hostState.self.privateCharacter.revealStrategy.influence >= 1, "early sensitive reveal must grant influence");
  assert.ok(hostState.self.privateCharacter.revealStrategy.credibility >= 1);

  const p2 = room.sessions[1];
  const p2StateBefore = await state(room, p2);
  const invalidKey = Object.keys(p2StateBefore.self.privateCharacter.values).find((key) => !p2StateBefore.self.privateCharacter.revealStrategy.choiceKeys.includes(key));
  if (invalidKey) {
    const invalid = await action(room, p2, "reveal_many", { keys: [invalidKey], strategicChoice: true }, true);
    assert.equal(invalid.response.status, 400);
    assert.match(invalid.payload.error, /Перше відкриття/);
  }

  await action(room, room, "next_phase");
  hostState = await state(room);
  assert.equal(hostState.game.phase, "discussion");
  assert.equal(hostState.game.revealStrategy.canRequest, true);
  const targetState = await state(room, p2);
  const requestKey = Object.keys(targetState.self.privateCharacter.values).find((key) => !targetState.self.privateCharacter.revealed[key]);
  const influenceBefore = hostState.self.privateCharacter.revealStrategy.influence;
  await action(room, room, "request_reveal_category", { targetId: p2.playerId, key: requestKey });
  hostState = await state(room);
  assert.equal(hostState.self.privateCharacter.revealStrategy.influence, influenceBefore - 1);
  assert.ok(hostState.game.revealStrategy.requests.some((item) => item.targetPlayerId === p2.playerId && item.key === requestKey && item.status === "pending"));

  await finishCurrentRound(room);
  let p2Round2 = await state(room, p2);
  assert.equal(p2Round2.game.round, 2);
  assert.ok(p2Round2.self.privateCharacter.revealStrategy.incomingRequests.some((item) => item.key === requestKey));
  assert.ok(p2Round2.self.privateCharacter.revealStrategy.choiceKeys.includes(requestKey));
  await action(room, p2, "reveal_many", { keys: [requestKey], strategicChoice: true });
  p2Round2 = await state(room, p2);
  assert.ok(p2Round2.self.privateCharacter.revealStrategy.credibility >= 1);
  assert.ok(p2Round2.game.revealStrategy.requests.some((item) => item.targetPlayerId === p2.playerId && item.key === requestKey && item.status === "fulfilled"));

  const p3 = room.sessions[2];
  const p3Round2 = await state(room, p3);
  const strainBefore = p3Round2.self.privateCharacter.revealStrategy.concealmentStrain;
  assert.ok(p3Round2.self.privateCharacter.revealStrategy.pressure);
  await finishCurrentRound(room);
  const p3Round3 = await state(room, p3);
  assert.ok(p3Round3.self.privateCharacter.revealStrategy.concealmentStrain > strainBefore, "ignored pressure must create a consequence");

  const html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "public", "styles.css"), "utf8");
  for (const id of ["revealStrategyPanel", "revealFocusChips", "revealPersonalDirective", "revealRequestPanel", "revealRequestTarget", "revealRequestKey", "revealRequestButton"]) assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  assert.ok(app.includes("function renderRevealStrategy"));
  assert.ok(app.includes('sendAction("request_reveal_category"'));
  assert.ok(css.includes(".reveal-strategy-panel"));

  await stopChildProcess(child);
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("Стратегічне розкриття, вплив, запити громади та наслідки приховування перевірено.");
})().catch(async (error) => {
  console.error(error);
  if (child && !child.killed) await stopChildProcess(child);
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

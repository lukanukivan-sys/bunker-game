"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-tribunal-"));
const port = 35400 + Math.floor(Math.random() * 250);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function ready() {
  for (let i = 0; i < 70; i += 1) {
    try { if ((await api("/api/health")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
async function action(code, session, actionName, extra = {}) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra });
}
async function state(code, session) {
  return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`);
}
async function stop() {
  await stopChildProcess(child);
}
async function revealRequired(code, session) {
  for (;;) {
    const own = await state(code, session);
    const used = Number(own.self.privateCharacter.revealsUsedRound || 0);
    const limit = Number(own.self.privateCharacter.revealLimit || 0);
    if (used >= limit) return;
    const strategy = own.self.privateCharacter.revealStrategy;
    const allowed = strategy?.options || [];
    const key = allowed.find((item) => !own.self.privateCharacter.revealed[item]) || Object.keys(own.self.privateCharacter.values).find((item) => !own.self.privateCharacter.revealed[item]);
    if (!key) return;
    await action(code, session, "reveal", { key });
  }
}

(async () => {
  const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
  assert(html.includes('id="judgementProtocolPanel"'));
  assert(html.includes('id="voteRunoffBanner"'));
  assert(app.includes("function renderJudgementProtocol()"));
  assert(!html.includes('value="random"'));

  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  const host = await api("/api/rooms/create", "POST", { name: "Host", mode: "classic", setting: "modern", capacity: 3, rounds: 3, revealsPerRound: 1, characterSetMode: "compact", voteSystem: "tribunal", voteVisibility: "secret", tieRule: "runoff" });
  const players = [host];
  for (const name of ["P2", "P3", "P4"]) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name });
    players.push(joined);
    await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");
  for (const session of players) await revealRequired(host.code, session);
  await action(host.code, host, "next_phase"); // discussion
  await action(host.code, host, "next_phase"); // event
  let current = await state(host.code, host);
  const choiceId = current.game.event.choices[0].id;
  await action(host.code, host, "event_vote", { choiceId });
  await action(host.code, host, "resolve_event");
  await action(host.code, host, "next_phase"); // elimination
  current = await state(host.code, host);
  assert.equal(current.game.phase, "elimination");

  const [h, p2, p3, p4] = players;
  await action(host.code, h, "elimination_vote", { targetId: p2.playerId, sanction: "exile" });
  await action(host.code, p2, "elimination_vote", { targetId: p3.playerId, sanction: "exile" });
  await action(host.code, p3, "elimination_vote", { targetId: p2.playerId, sanction: "exile" });
  await action(host.code, p4, "elimination_vote", { targetId: p3.playerId, sanction: "exile" });
  await action(host.code, host, "next_phase");

  current = await state(host.code, host);
  assert.equal(current.game.phase, "elimination", "Після першої нічиєї фаза не повинна завершуватися");
  assert(current.game.judgement.runoff?.active, "Переголосування не запущено");
  assert.equal(current.game.judgement.runoff.options.length, 2);
  assert.equal(current.game.eliminationVoteCount, 0, "Старі голоси не очищено");
  assert.equal(current.game.judgement.report.status, "runoff");
  assert.equal(current.game.judgement.report.individualVotes.length, 0, "Таємний протокол розкрив поіменні голоси");
  assert(current.game.hostDashboard.warnings.some((item) => item.includes("повторне голосування")));

  let invalidBlocked = false;
  try { await action(host.code, h, "elimination_vote", { targetId: p4.playerId, sanction: "exile" }); }
  catch (error) { invalidBlocked = /повторному голосуванні/.test(error.message); }
  assert(invalidBlocked, "Сервер дозволив голос за варіант поза лідерами");

  await action(host.code, h, "elimination_vote", { targetId: p2.playerId, sanction: "exile" });
  await action(host.code, p2, "elimination_vote", { targetId: p3.playerId, sanction: "exile" });
  await action(host.code, p3, "elimination_vote", { targetId: p2.playerId, sanction: "exile" });
  await action(host.code, p4, "elimination_vote", { targetId: p2.playerId, sanction: "exile" });
  await action(host.code, host, "next_phase");

  current = await state(host.code, host);
  assert.equal(current.game.phase, "round_end");
  const report = current.game.judgement.report;
  assert.equal(report.attempt, 2);
  assert(report.previousAttempt, "У фінальному протоколі немає першого підрахунку");
  assert.equal(report.outcome.type, "sanction");
  assert.equal(report.outcome.targetName, "P2");
  assert.equal(report.individualVotes.length, 0);
  assert.equal(current.players.find((item) => item.name === "P2").active, false);
  assert(report.totals[0].baseVotes >= 3);

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.10: протокол трибуналу, таємність і переголосування між лідерами перевірені.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

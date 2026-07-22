"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-outside-camp-"));
const port = 36200 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null, expectError = false) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (expectError) return { response, payload };
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
async function action(code, session, name, extra = {}, expectError = false) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: name, ...extra }, expectError);
}
async function state(code, session) {
  return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`);
}
async function stop() {
  await stopChildProcess(child);
}
async function resolveEvent(code, host, sessions) {
  let s = await state(code, host);
  assert.equal(s.game.phase, "event");
  const choice = s.game.event.choices[0].id;
  for (const session of sessions) {
    const ps = await state(code, session);
    if (ps.game.event.canVote) await action(code, session, "event_vote", { choiceId: choice });
  }
  await action(code, host, "resolve_event");
}
async function voteJudgement(code, host, sessions, targetId = "__skip__") {
  let s = await state(code, host);
  assert.equal(s.game.phase, "elimination");
  for (const session of sessions) {
    const ps = await state(code, session);
    if (ps.self.active) {
      const ownTarget = targetId !== "__skip__" && session.playerId === targetId ? "__skip__" : targetId;
      await action(code, session, "elimination_vote", { targetId: ownTarget, sanction: "exile" });
    }
  }
  await action(code, host, "next_phase");
}

(async () => {
  const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert(server.includes("OUTSIDE_CAMP_ACTIONS"));
  assert(server.includes("outsideCampFinalResult"));
  assert(server.includes('case "outside_deal_vote"'));
  assert(app.includes("renderOutsideCampBoard"));
  assert(html.includes('id="outsideCampBoard"'));
  assert(html.includes('id="finalOutsideCamp"'));
  assert(css.includes(".outside-camp-stats"));

  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  const host = await api("/api/rooms/create", "POST", { name: "Host", mode: "advanced", advancedModules: ["outside"], setting: "modern", capacity: 3, rounds: 3, revealsPerRound: 1, characterSetMode: "compact" });
  const sessions = [host];
  for (const name of ["Outside", "Inside A", "Inside B"]) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name });
    sessions.push(joined);
    await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");
  await action(host.code, host, "next_phase"); // discussion
  await action(host.code, host, "next_phase"); // event
  await resolveEvent(host.code, host, sessions);
  await action(host.code, host, "next_phase"); // elimination
  await voteJudgement(host.code, host, sessions, sessions[1].playerId); // resolves to round_end

  let outsideState = await state(host.code, sessions[1]);
  assert.equal(outsideState.self.active, false);
  assert(outsideState.game.outsideCamp.active);
  assert.equal(outsideState.game.outsideCamp.members.length, 1);
  assert(outsideState.self.privateCharacter.outsideRole);

  await action(host.code, host, "next_phase"); // new round reveal
  await action(host.code, host, "next_phase"); // discussion
  outsideState = await state(host.code, sessions[1]);
  assert(outsideState.game.outsideCamp.canAct);

  await action(host.code, sessions[1], "outside_action", {
    campAction: "negotiate",
    offerResource: "food",
    offerAmount: 1,
    requestResource: "energy",
    requestAmount: 1,
    message: "Пропонуємо чесний обмін і безпечний маршрут."
  });
  outsideState = await state(host.code, sessions[1]);
  assert.equal(outsideState.self.privateCharacter.outsideActionUsedRound, 2);
  assert.equal(outsideState.game.outsideCamp.proposal.status, "pending");

  const nonHostDecision = await action(host.code, sessions[2], "outside_deal_vote", { choice: "accept" }, true);
  assert(!nonHostDecision.response.ok && /хост/i.test(nonHostDecision.payload.error || ""));
  await action(host.code, host, "outside_deal_vote", { choice: "accept" });
  outsideState = await state(host.code, sessions[1]);
  assert.equal(outsideState.game.outsideCamp.proposal.status, "accepted");
  assert(outsideState.game.outsideCamp.trust >= 10);

  const duplicate = await action(host.code, sessions[1], "outside_action", { campAction: "rest" }, true);
  assert(!duplicate.response.ok && /вже використано/i.test(duplicate.payload.error || ""));

  // Finish round 2 with no further exile.
  await action(host.code, host, "next_phase"); // event
  await resolveEvent(host.code, host, sessions);
  await action(host.code, host, "next_phase"); // elimination
  await voteJudgement(host.code, host, sessions, "__skip__");
  await action(host.code, host, "next_phase"); // round 3 reveal
  await action(host.code, host, "next_phase"); // discussion
  await action(host.code, sessions[1], "outside_action", { campAction: "fortify" });
  outsideState = await state(host.code, sessions[1]);
  assert(outsideState.game.outsideCamp.shelter > 18);
  assert(outsideState.game.outsideCamp.history.some((item) => /укріпив/.test(item.text)));

  await action(host.code, host, "next_phase"); // event
  await resolveEvent(host.code, host, sessions);
  await action(host.code, host, "next_phase"); // elimination
  await voteJudgement(host.code, host, sessions, "__skip__");
  await action(host.code, host, "next_phase"); // finish final

  const finalState = await state(host.code, sessions[1]);
  assert.equal(finalState.game.phase, "final");
  assert(finalState.game.final.outsideCampResult);
  assert.equal(finalState.game.final.outsideCampResult.exists, true);
  assert(finalState.game.final.outsideCampResult.members.some((item) => item.id === sessions[1].playerId));
  const personal = finalState.game.final.personalResults.find((item) => item.playerId === sessions[1].playerId);
  assert(personal && /Зовніш|Особист/.test(personal.status));

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.10: зовнішній табір, ресурси, угоди, дії та окремий фінал перевірені.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

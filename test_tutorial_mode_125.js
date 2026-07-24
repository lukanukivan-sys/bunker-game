"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-stage20-"));
const port = 34125;
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
    try { if ((await request("/api/ready")).response.ok) return; } catch {}
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
async function revealForAll(sessions) {
  for (const session of sessions) {
    const current = await state(session);
    const key = current.self.privateCharacter.revealStrategy.choiceKeys.find((item) => !current.self.privateCharacter.revealed[item]);
    assert(key, "tutorial player must have a strategic reveal choice");
    await action(session, "reveal", { key, strategicChoice: true });
  }
}
async function voteEventForAll(sessions) {
  const current = await state(sessions[0]);
  const choiceId = current.game.event.choices[0].id;
  await action(sessions[0], "event_vote", { choiceId });
  await action(sessions[0], "resolve_event");
}

(async () => {
  try {
    await waitForServer();
    const created = await ok("/api/rooms/create", { method: "POST", body: {
      name: "Ведучий",
      tutorialEnabled: true,
      mode: "advanced",
      setting: "horror",
      scenarioMode: "procedural",
      capacity: 10,
      rounds: 7,
      revealsPerRound: 4,
      characterSetMode: "extended",
      demographicsEnabled: true,
      absurdity: 4,
      voteSystem: "exile",
      voteVisibility: "secret",
      automationMode: "auto",
      campaignId: "ignored",
      contentPackId: "ignored",
      generationSeed: "TUTORIAL-TEST-2026"
    }});
    const sessions = [{ code: created.code, playerId: created.playerId, token: created.token }];
    for (const name of ["Олена", "Тарас"]) {
      const joined = await ok("/api/rooms/join", { method: "POST", body: { code: created.code, name } });
      const session = { code: created.code, playerId: joined.playerId, token: joined.token };
      sessions.push(session);
      await action(session, "ready", { value: true });
    }

    let lobby = await state(sessions[0]);
    assert.equal(lobby.settings.tutorialEnabled, true);
    assert.equal(lobby.configurationAnalysis.blocking, 0);
    assert.equal(lobby.settings.mode, "classic");
    assert.equal(lobby.settings.setting, "modern");
    assert.equal(lobby.settings.rounds, 2);
    assert.equal(lobby.settings.revealsPerRound, 1);
    assert.equal(lobby.settings.characterSetMode, "compact");
    assert.equal(lobby.settings.demographicsEnabled, false);
    assert.equal(lobby.settings.voteSystem, "tribunal");
    assert.equal(lobby.settings.voteVisibility, "open");
    assert.equal(lobby.settings.automationMode, "off");

    await action(sessions[0], "start");
    let current = await state(sessions[0]);
    assert.equal(current.game.phase, "reveal");
    assert.equal(current.game.tutorial.enabled, true);
    assert.equal(current.game.tutorial.step, 1);
    assert.deepEqual(current.game.phaseLoop.map((item) => item.code), ["reveal", "discussion", "event", "round_end"]);
    assert.equal(current.game.catastrophe.id, "tutorial_infrastructure_collapse");
    assert.equal(current.game.shelter.title, "Навчальне сховище №7");
    assert.equal(current.settings.capacity, 2);

    await revealForAll(sessions);
    current = await state(sessions[0]);
    assert.equal(current.game.tutorial.required, false);
    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.phase, "discussion");
    assert.equal(current.game.tutorial.step, 2);

    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.phase, "event");
    assert.equal(current.game.event.id, "tutorial_filters");
    assert.equal(current.game.tutorial.step, 3);
    await voteEventForAll(sessions);
    current = await state(sessions[0]);
    assert.equal(current.game.event.resolved, true);
    assert(current.game.event.reasonReport, "tutorial crisis must provide a reason report");

    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.phase, "round_end");
    assert.equal(current.game.tutorial.step, 4);
    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.round, 2);
    assert.equal(current.game.phase, "reveal");
    assert.equal(current.game.tutorial.step, 5);
    assert.deepEqual(current.game.phaseLoop.map((item) => item.code), ["reveal", "discussion", "event", "elimination", "round_end"]);

    await revealForAll(sessions);
    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.phase, "discussion");
    assert.equal(current.game.tutorial.step, 6);
    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.event.id, "tutorial_water");
    assert.equal(current.game.tutorial.step, 7);
    await voteEventForAll(sessions);
    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.phase, "elimination");
    assert.equal(current.game.tutorial.step, 8);
    for (const session of sessions) await action(session, "elimination_vote", { targetId: "__skip__", sanction: "exile" });
    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.phase, "round_end");
    assert.equal(current.game.tutorial.step, 9);
    assert(current.game.judgement.report, "tutorial judgement protocol must be available");

    await action(sessions[0], "next_phase");
    current = await state(sessions[0]);
    assert.equal(current.game.phase, "final");
    assert.equal(current.game.tutorial.completed, true);
    assert.equal(current.game.tutorial.step, 10);
    assert(current.game.final, "tutorial must create a normal final simulation");

    const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
    const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
    const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
    assert(html.includes('id="tutorialEnabled"'));
    assert(html.includes('id="tutorialGuidePanel"'));
    assert(html.includes('id="finalTutorialPanel"'));
    assert(app.includes("renderTutorialGuide"));
    assert(css.includes(".tutorial-guide-panel"));
    console.log("✅ Stage 20 tutorial mode tests passed");
  } finally {
    await stopChildProcess(child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
});

"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const { PRODUCT_VERSION } = require("./config/version");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-solo-"));
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
async function waitReady() {
  for (let i = 0; i < 50; i += 1) {
    try { if ((await api("/api/ready")).ready) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Сервер ${PRODUCT_VERSION} не запустився.`);
}
(async () => {
  server = spawn(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitReady();
  const room = await api("/api/rooms/create", { method: "POST", body: { name: "Соло тест", mode: "classic", setting: "modern", soloTestMode: true, capacity: 1, rounds: 2, revealsPerRound: 1, characterSetMode: "extended", voteSystem: "tribunal" } });
  const action = (name, extra = {}) => api(`/api/rooms/${room.code}/action`, { method: "POST", body: { playerId: room.playerId, token: room.token, action: name, ...extra } });
  const state = () => api(`/api/rooms/${room.code}/state?playerId=${room.playerId}&token=${room.token}`);
  let current = await state();
  assert.equal(current.settings.soloTestMode, true);
  assert.equal(current.settings.capacity, 1);
  assert.equal(current.settings.characterSetMode, "extended");
  assert.equal(current.configurationAnalysis.blocking, 0);
  await action("start");
  current = await state();
  assert(current.game, "Соло-партія повинна стартувати");
  assert.equal(current.players.length, 1);
  assert.equal(current.game.phase, "reveal");
  assert.equal(Object.keys(current.self.privateCharacter.values || {}).length, 14);

  let selfVoteObserved = false;
  for (let guard = 0; guard < 30; guard += 1) {
    current = await state();
    if (current.game.phase === "final") break;
    if (current.game.phase === "reveal") {
      const key = Object.keys(current.self.privateCharacter.values || {}).find((item) => !current.self.privateCharacter.revealed?.[item]);
      if (key && !current.self.privateCharacter.detained) await action("reveal", { key });
      await action("next_phase");
    } else if (["discussion", "planning", "negotiation", "intrigue", "investigation", "operations"].includes(current.game.phase)) {
      await action("next_phase");
    } else if (current.game.phase === "event") {
      if (!current.game.event.resolved) {
        const choiceId = current.game.event.choices[0].id;
        if (current.game.event.canVote) await action("event_vote", { choiceId });
        await action("resolve_event");
      }
      await action("next_phase");
    } else if (current.game.phase === "elimination") {
      if (!selfVoteObserved) {
        await action("elimination_vote", { targetId: room.playerId, sanction: "detention" });
        current = await state();
        assert.equal(current.game.eliminationVote?.targetId, room.playerId, "У DEV-соло режимі самоголосування має зберігатися");
        assert.equal(current.game.eliminationVote?.sanction, "detention");
        selfVoteObserved = true;
      } else if (!current.self.privateCharacter.detained && !current.self.privateCharacter.silenced) {
        await action("elimination_vote", { targetId: "__skip__", sanction: "exile" });
      }
      await action("next_phase");
    } else if (current.game.phase === "round_end") {
      await action("next_phase");
    } else {
      throw new Error(`Невідома фаза соло-тесту: ${current.game.phase}`);
    }
  }
  current = await state();
  assert(selfVoteObserved, "Соло-партія повинна пройти фазу самоголосування");
  assert.equal(current.game.phase, "final", "Соло-партія повинна доходити до фіналу");
  assert(current.game.final, "Фінальний результат повинен бути сформований");
  await stopChildProcess(server);
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`${PRODUCT_VERSION}: соло-тестування дозволяє самоголосування й повне проходження до фіналу.`);
})().catch(async (error) => {
  console.error(error);
  await stopChildProcess(server);
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-stage18-"));
const port = 34123;
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
  return result;
}
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try { if ((await request("/api/health")).response.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error(`Server did not start: ${output}`);
}
function stateRoute(session, waitMs = 0, revision = -1) {
  const query = new URLSearchParams({ playerId: session.playerId, token: session.token, sinceRevision: String(revision), waitMs: String(waitMs) });
  return `/api/rooms/${session.code}/state?${query}`;
}
async function getState(session, waitMs = 0, revision = -1) {
  return ok(stateRoute(session, waitMs, revision), { playerId: session.playerId });
}
async function action(session, actionName, extra = {}) {
  return ok(`/api/rooms/${session.code}/action`, { method: "POST", playerId: session.playerId, body: { playerId: session.playerId, token: session.token, action: actionName, ...extra } });
}

(async () => {
  try {
    await waitForServer();
    const created = (await ok("/api/rooms/create", { method: "POST", body: { name: "Player 1", mode: "classic", setting: "modern", capacity: 6, rounds: 4 } })).payload;
    const sessions = [{ code: created.code, playerId: created.playerId, token: created.token }];
    for (let i = 2; i <= 12; i += 1) {
      const joined = (await ok("/api/rooms/join", { method: "POST", body: { name: `Player ${i}`, code: created.code } })).payload;
      sessions.push({ code: created.code, playerId: joined.playerId, token: joined.token });
    }

    const initial = await Promise.all(sessions.map((session) => getState(session)));
    const revision = initial[0].payload.revision;

    const startedAt = Date.now();
    const longPolls = sessions.map((session) => getState(session, 5000, revision));
    await sleep(250);
    await action(sessions[1], "ready", { value: true });
    const awakened = await Promise.all(longPolls);
    const elapsed = Date.now() - startedAt;
    assert.ok(elapsed < 4000, `long polls were not awakened quickly (${elapsed} ms)`);
    awakened.forEach((result) => assert.ok(result.payload.revision > revision));

    // An open long poll remains a heartbeat, so a player is not marked offline after 12 seconds.
    const heldRevision = awakened[0].payload.revision;
    const heldPoll = getState(sessions[0], 13000, heldRevision);
    await sleep(12200);
    const observerState = (await getState(sessions[11])).payload;
    const heldPlayerRow = observerState.players.find((player) => player.id === sessions[0].playerId);
    assert.equal(heldPlayerRow.connected, true, "long-poll heartbeat did not preserve online status");
    await heldPoll;

    for (let round = 0; round < 40; round += 1) {
      const batch = await Promise.all(sessions.map((session) => request(stateRoute(session), { playerId: session.playerId })));
      for (const result of batch) assert.notEqual(result.response.status, 429, `shared-IP state limit failed in round ${round}`);
    }

    for (let round = 0; round < 8; round += 1) {
      const batch = await Promise.all(sessions.map((session, index) => request(`/api/rooms/${session.code}/action`, {
        method: "POST",
        playerId: session.playerId,
        body: { playerId: session.playerId, token: session.token, action: "ready", value: Boolean((round + index) % 2) }
      })));
      for (const result of batch) assert.notEqual(result.response.status, 429, `write budget collided with reads in round ${round}`);
    }

    let limited = false;
    for (let i = 0; i < 190; i += 1) {
      const result = await request(stateRoute(sessions[0]), { playerId: sessions[0].playerId });
      if (result.response.status === 429) { limited = true; break; }
    }
    assert.equal(limited, true, "per-player state limiter did not activate");
    const neighbour = await request(stateRoute(sessions[11]), { playerId: sessions[11].playerId });
    assert.equal(neighbour.response.status, 200, "one player exhausted the whole shared IP budget");

    const firstAsset = await fetch(`${base}/app.js`);
    assert.equal(firstAsset.status, 200);
    const etag = firstAsset.headers.get("etag");
    assert.ok(etag);
    const secondAsset = await fetch(`${base}/app.js`, { headers: { "if-none-match": etag } });
    assert.equal(secondAsset.status, 304);

    const health = (await ok("/api/health")).payload;
    assert.ok(health.network.longPolls >= 12);
    assert.ok(health.network.longPollWakeups >= 12);
    assert.ok(health.network.stateRequests >= 500);

    console.log(`✅ Stage 18 network/load tests passed (${sessions.length} clients, ${elapsed} ms wake-up)`);
  } finally {
    child.kill("SIGTERM");
    await sleep(250);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
});

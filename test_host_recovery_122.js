"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess, testServerEnv } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-stage17-"));
const port = 37000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root,
  env: testServerEnv({ PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir }),
  stdio: ["ignore", "pipe", "pipe"]
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(route, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${route}`, {
    method: options.method || "GET",
    headers: Object.keys(headers).length ? headers : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(5000)
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}
async function ok(route, options = {}) {
  const result = await request(route, options);
  assert.equal(result.response.ok, true, `${route}: ${result.response.status} ${JSON.stringify(result.payload)}`);
  return result.payload;
}
async function state(session) {
  return ok(`/api/rooms/${session.code}/state?playerId=${session.playerId}&token=${session.token}`);
}
async function action(session, actionName, extra = {}) {
  return ok(`/api/rooms/${session.code}/action`, { method: "POST", body: { playerId: session.playerId, token: session.token, action: actionName, ...extra } });
}
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const result = await request("/api/health");
      if (result.response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Server did not start: ${output}`);
}

(async () => {
  try {
    await waitForServer();
    const created = await ok("/api/rooms/create", { method: "POST", body: { name: "Host", mode: "classic", setting: "modern", capacity: 2, rounds: 3, hostFailoverEnabled: true, hostFailoverSeconds: 1 } });
    assert.match(created.recoveryCode, /^[A-Z0-9]{10}$/);
    const host = { code: created.code, playerId: created.playerId, token: created.token, recoveryCode: created.recoveryCode };
    const joined = await ok("/api/rooms/join", { method: "POST", body: { name: "Guest", code: host.code } });
    assert.match(joined.recoveryCode, /^[A-Z0-9]{10}$/);
    const guestOld = { code: host.code, playerId: joined.playerId, token: joined.token, recoveryCode: joined.recoveryCode };

    const hostState = await state(host);
    assert.equal(hostState.self.recoveryCode, host.recoveryCode);
    assert.equal(hostState.players.some((player) => Object.prototype.hasOwnProperty.call(player, "recoveryCode")), false, "public player leaked recovery code");
    assert.equal(hostState.sessionManagement.transferCandidates.length, 1);

    const rejoined = await ok("/api/rooms/rejoin", { method: "POST", body: { code: host.code, recoveryCode: guestOld.recoveryCode } });
    assert.equal(rejoined.playerId, guestOld.playerId);
    assert.notEqual(rejoined.token, guestOld.token);
    const guest = { code: host.code, playerId: rejoined.playerId, token: rejoined.token, recoveryCode: rejoined.recoveryCode };
    const oldAccess = await request(`/api/rooms/${host.code}/state?playerId=${guestOld.playerId}&token=${guestOld.token}`);
    assert.equal(oldAccess.response.status, 401, "old token should be invalid after rejoin");
    await state(guest);

    await action(host, "transfer_host", { targetId: guest.playerId });
    const transferredGuestState = await state(guest);
    const transferredHostState = await state(host);
    assert.equal(transferredGuestState.self.isHost, true);
    assert.equal(transferredHostState.self.isHost, false);

    const recoveryRequest = await ok("/api/rooms/recovery-request", { method: "POST", body: { code: host.code, name: "Host" } });
    assert.equal(recoveryRequest.status, "pending");
    const guestWithRequest = await state(guest);
    assert.equal(guestWithRequest.sessionManagement.recoveryRequests.length, 1);
    await action(guest, "resolve_recovery_request", { requestId: recoveryRequest.requestId, approve: true });
    const recoveryStatus = await ok(`/api/rooms/recovery-status?code=${host.code}&requestId=${encodeURIComponent(recoveryRequest.requestId)}`, {
      headers: { "x-recovery-request-token": recoveryRequest.requestToken }
    });
    assert.equal(recoveryStatus.status, "approved");
    assert.equal(recoveryStatus.claimRequired, true);
    assert.equal(Object.prototype.hasOwnProperty.call(recoveryStatus, "token"), false, "status endpoint must not expose the room token");

    const recoveryClaim = await ok("/api/rooms/recovery-claim", {
      method: "POST",
      headers: { "x-recovery-request-token": recoveryRequest.requestToken },
      body: { code: host.code, requestId: recoveryRequest.requestId }
    });
    assert.equal(recoveryClaim.status, "approved");
    assert.equal(recoveryClaim.playerId, host.playerId);
    assert.notEqual(recoveryClaim.token, host.token);

    const repeatedClaim = await request("/api/rooms/recovery-claim", {
      method: "POST",
      headers: { "x-recovery-request-token": recoveryRequest.requestToken },
      body: { code: host.code, requestId: recoveryRequest.requestId }
    });
    assert.equal(repeatedClaim.response.status, 410, "approved recovery token must be claimable only once");
    assert.equal(Object.prototype.hasOwnProperty.call(repeatedClaim.payload, "token"), false);

    await sleep(350);
    const roomSnapshot = JSON.parse(fs.readFileSync(path.join(dataDir, "rooms-v6", `${host.code}.json`), "utf8"));
    const savedRequest = roomSnapshot.room.recoveryRequests.find((item) => item.id === recoveryRequest.requestId);
    assert(savedRequest, "recovery request must be persisted");
    assert.equal(savedRequest.status, "consumed");
    assert.equal(savedRequest.requestToken, undefined, "raw recovery request secret must not be persisted");
    assert.match(savedRequest.requestTokenHash, /^[a-f0-9]{64}$/);
    assert.equal(savedRequest.grantedToken, null, "claimed room token must be erased from the recovery request");

    const restoredHost = { code: host.code, playerId: host.playerId, token: recoveryClaim.token, recoveryCode: recoveryClaim.recoveryCode };
    const invalidatedHost = await request(`/api/rooms/${host.code}/state?playerId=${host.playerId}&token=${host.token}`);
    assert.equal(invalidatedHost.response.status, 401);
    await state(restoredHost);

    const nativeFetch = globalThis.__shelterNativeFetch;
    assert.equal(typeof nativeFetch, "function");
    const leakedRoomTokenResponse = await nativeFetch(`${base}/api/rooms/${host.code}/state?playerId=${encodeURIComponent(host.playerId)}&token=${encodeURIComponent(host.token)}`, {
      headers: { connection: "close" },
      signal: AbortSignal.timeout(5000)
    });
    const leakedRoomTokenPayload = await leakedRoomTokenResponse.json();
    assert.equal(leakedRoomTokenResponse.status, 400);
    assert.match(leakedRoomTokenPayload.error, /заголовку X-Player-Token/);

    const leakedRecoveryTokenResponse = await nativeFetch(`${base}/api/rooms/recovery-status?code=${host.code}&requestId=${encodeURIComponent(recoveryRequest.requestId)}&requestToken=${encodeURIComponent(recoveryRequest.requestToken)}`, {
      headers: { connection: "close" },
      signal: AbortSignal.timeout(5000)
    });
    const leakedRecoveryTokenPayload = await leakedRecoveryTokenResponse.json();
    assert.equal(leakedRecoveryTokenResponse.status, 400);
    assert.match(leakedRecoveryTokenPayload.error, /X-Recovery-Request-Token/);

    const beforeRegenerate = (await state(restoredHost)).self.recoveryCode;
    const regeneratedState = await action(restoredHost, "regenerate_recovery_code");
    assert.notEqual(regeneratedState.self.recoveryCode, beforeRegenerate);
    const oldCodeAttempt = await request("/api/rooms/rejoin", { method: "POST", body: { code: host.code, recoveryCode: beforeRegenerate } });
    assert.equal(oldCodeAttempt.response.status, 401);


    // Automatic failover in a fresh room. Keep candidate online, let host disappear.
    const autoCreated = await ok("/api/rooms/create", { method: "POST", body: { name: "AutoHost", mode: "classic", setting: "modern", capacity: 2, rounds: 3, hostFailoverEnabled: true, hostFailoverSeconds: 1 } });
    const autoHost = { code: autoCreated.code, playerId: autoCreated.playerId, token: autoCreated.token };
    const autoJoin = await ok("/api/rooms/join", { method: "POST", body: { name: "Backup", code: autoHost.code } });
    const backup = { code: autoHost.code, playerId: autoJoin.playerId, token: autoJoin.token };
    const started = Date.now();
    let backupState = await state(backup);
    while (!backupState.self.isHost && Date.now() - started < 5000) {
      await sleep(250);
      backupState = await state(backup);
    }
    assert.equal(backupState.self.isHost, true, "automatic host failover did not occur");
    assert.equal(backupState.sessionManagement.lastHostChange?.newHostId, backup.playerId);

    console.log("✅ Stage 17 host transfer and recovery tests passed");
  } finally {
    await stopChildProcess(child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
});

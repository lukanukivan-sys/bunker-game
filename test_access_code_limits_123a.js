"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
assert.match(html, /id="joinCode"[^>]*maxlength="10"/);
assert.match(html, /<input[^>]*id="rejoinRoomCode"[^>]*>/);
assert.match(html.match(/<input[^>]*id="rejoinRoomCode"[^>]*>/)[0], /minlength="6"/);
assert.match(html.match(/<input[^>]*id="rejoinRoomCode"[^>]*>/)[0], /maxlength="6"/);
assert.match(html, /<input[^>]*id="rejoinRecoveryCode"[^>]*>/);
assert.match(html.match(/<input[^>]*id="rejoinRecoveryCode"[^>]*>/)[0], /minlength="10"/);
assert.match(html.match(/<input[^>]*id="rejoinRecoveryCode"[^>]*>/)[0], /maxlength="10"/);
assert.match(html, /Код кімнати <small>\(6 символів\)<\/small>/);
assert.match(html, /Персональний код <small>\(10 символів\)<\/small>/);
assert.match(client, /if \(enteredCode\.length === 10\)/);
assert.match(client, /rejoinRecoveryCode"\)\.value = enteredCode/);
assert.match(client, /Код кімнати має містити рівно 6 символів/);
assert.match(client, /Персональний код має містити рівно 10 символів/);

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-access-code-"));
const port = 34124;
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
async function request(route, body) {
  const response = await fetch(`${base}${route}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  return { response, payload: await response.json().catch(() => ({})) };
}
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try { if ((await request("/api/health")).response.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error(`Server did not start: ${output}`);
}

(async () => {
  try {
    await waitForServer();
    const badJoin = await request("/api/rooms/join", { name: "Guest", code: "ABCDEFGHIJ" });
    assert.equal(badJoin.response.status, 400);
    assert.equal(badJoin.payload.error, "Код кімнати має містити рівно 6 символів.");

    const created = await request("/api/rooms/create", { name: "Host", mode: "classic", setting: "modern", capacity: 2, rounds: 3 });
    assert.equal(created.response.status, 201);
    assert.equal(created.payload.code.length, 6);
    assert.equal(created.payload.recoveryCode.length, 10);

    const shortRecovery = await request("/api/rooms/rejoin", { code: created.payload.code, recoveryCode: "ABC123" });
    assert.equal(shortRecovery.response.status, 400);
    assert.equal(shortRecovery.payload.error, "Персональний код має містити рівно 10 символів.");

    const restored = await request("/api/rooms/rejoin", { code: created.payload.code, recoveryCode: created.payload.recoveryCode });
    assert.equal(restored.response.status, 200);
    assert.equal(restored.payload.playerId, created.payload.playerId);
    console.log("✅ Access code length and recovery-form hotfix tests passed");
  } finally {
    await stopChildProcess(child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
});

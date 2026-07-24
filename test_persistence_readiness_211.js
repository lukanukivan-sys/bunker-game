"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const {
  getFreePort,
  sleep,
  stopChildProcess,
  testServerEnv
} = require("./test_support");

const ROOT = __dirname;
const tempRoots = [];
let child = null;
let baseUrl = null;
let serverOutput = "";

function tempDir(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), `bunker-readiness-${label}-`)
  );
  tempRoots.push(dir);
  return dir;
}

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { response, payload };
}

async function stopServer() {
  const processToStop = child;
  child = null;
  await stopChildProcess(processToStop);
}

async function waitFor(route, expectedStatus, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (
      child &&
      (child.exitCode !== null || child.signalCode !== null)
    ) {
      throw new Error(
        `Server exited before ${route} became available:\n${serverOutput}`
      );
    }
    try {
      const result = await request(route);
      if (result.response.status === expectedStatus) return result;
    } catch {
      // The listener may not be bound yet.
    }
    await sleep(80);
  }
  throw new Error(
    `Timed out waiting for ${route} -> ${expectedStatus}:\n${serverOutput}`
  );
}

async function startServer(env, readyStatus = 200) {
  await stopServer();
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverOutput = "";
  child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: testServerEnv({
      HOST: "127.0.0.1",
      PORT: String(port),
      ...env
    }),
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout?.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  await waitFor("/api/health", 200);
  return waitFor("/api/ready", readyStatus);
}

function assertNoInternalDetails(payload, internalPath) {
  const source = JSON.stringify(payload);
  assert.equal(source.includes(internalPath), false);
  assert.equal(source.includes("node:fs"), false);
  assert.equal(source.includes("EACCES"), false);
  assert.equal(source.includes("ENOENT"), false);
  assert.equal(source.includes("stack"), false);
}

async function testEphemeralHealthAndReadiness() {
  const dataDir = tempDir("ephemeral");
  await startServer({
    NODE_ENV: "production",
    PERSISTENCE_MODE: "ephemeral-allowed",
    DATA_DIR: dataDir
  });

  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.response.headers.get("cache-control"), "no-store");
  assert.equal(health.response.headers.get("x-ratelimit-policy"), null);
  assert.equal(health.payload.ok, true);
  assert.equal(health.payload.status, "live");
  assert.equal(typeof health.payload.version, "string");
  assert.equal(typeof health.payload.uptimeSeconds, "number");
  assert.equal(typeof health.payload.schemas, "object");
  assert.equal(typeof health.payload.network, "object");
  assert.equal(
    Object.prototype.hasOwnProperty.call(health.payload, "persistent"),
    false
  );
  assert.deepStrictEqual(health.payload.persistence, {
    policy: "ephemeral-allowed",
    mode: "ephemeral",
    durable: false
  });

  const ready = await request("/api/ready");
  assert.equal(ready.response.status, 200);
  assert.equal(ready.response.headers.get("cache-control"), "no-store");
  assert.equal(ready.response.headers.get("x-ratelimit-policy"), null);
  assert.equal(ready.payload.ready, true);
  assert.equal(ready.payload.persistence.writable, true);
  assert.equal(ready.payload.persistence.durabilityConfigured, false);
  assert.equal(ready.payload.persistence.continuity, "not-applicable");
  assert.equal(
    ready.payload.persistence.stores.rooms.startupBackup.status,
    "skipped-empty"
  );
  assert.equal(
    ready.payload.persistence.stores.platform.startupBackup.status,
    "completed"
  );
  assertNoInternalDetails(ready.payload, dataDir);

  const bypassResults = await Promise.all(
    Array.from({ length: 300 }, (_, index) =>
      request(index % 2 ? "/api/health" : "/api/ready"))
  );
  assert(
    bypassResults.every((result) => result.response.status === 200)
  );
  assert(
    bypassResults.every((result) =>
      result.response.headers.get("x-ratelimit-policy") === null)
  );
  const healthAfter = await request("/api/health");
  assert.equal(healthAfter.payload.network.rateBuckets, 0);
}

async function testProductionPolicyIsFailClosed() {
  const dataDir = tempDir("missing-policy");
  const ready = await startServer({
    NODE_ENV: "production",
    PERSISTENCE_MODE: "",
    DATA_DIR: dataDir
  }, 503);
  assert.equal(ready.response.headers.get("cache-control"), "no-store");
  assert(
    ready.payload.errors.some((item) =>
      item.code === "PERSISTENCE_MODE_REQUIRED")
  );
  assertNoInternalDetails(ready.payload, dataDir);

  const functional = await request("/api/platform/bootstrap");
  assert.equal(functional.response.status, 503);
  assert.equal(functional.payload.code, "STARTUP_NOT_READY");

  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.payload.ok, true);
}

async function testPersistentMountValidation() {
  const dataDir = tempDir("mount-actual");
  const expectedDir = tempDir("mount-expected");
  const ready = await startServer({
    NODE_ENV: "production",
    PERSISTENCE_MODE: "persistent-required",
    DATA_DIR: dataDir,
    EXPECTED_DATA_DIR: expectedDir
  }, 503);
  assert(
    ready.payload.errors.some((item) =>
      item.code === "MOUNT_PATH_MISMATCH")
  );
  assert.equal(ready.payload.persistence.mountPathValid, false);
  assert.equal(ready.payload.persistence.durabilityConfigured, false);
  assert.equal(ready.payload.persistence.durable, false);
  assertNoInternalDetails(ready.payload, dataDir);
  assertNoInternalDetails(ready.payload, expectedDir);
}

async function testPersistentContinuityAcrossProcesses() {
  const dataDir = tempDir("continuity");
  const env = {
    NODE_ENV: "production",
    PERSISTENCE_MODE: "persistent-required",
    DATA_DIR: dataDir,
    EXPECTED_DATA_DIR: dataDir
  };

  let ready = await startServer(env);
  assert.equal(ready.payload.persistence.mode, "persistent");
  assert.equal(ready.payload.persistence.durabilityConfigured, true);
  assert.equal(ready.payload.persistence.mountPathValid, true);
  assert.equal(ready.payload.persistence.durable, true);
  assert.equal(ready.payload.persistence.writable, true);
  assert.equal(ready.payload.persistence.continuity, "unverified");
  assert.equal(ready.payload.persistence.continuityVerified, false);

  await stopServer();
  ready = await startServer(env);
  assert.equal(ready.payload.persistence.continuity, "verified");
  assert.equal(ready.payload.persistence.continuityVerified, true);
}

async function main() {
  try {
    await testEphemeralHealthAndReadiness();
    await testProductionPolicyIsFailClosed();
    await testPersistentMountValidation();
    await testPersistentContinuityAcrossProcesses();
    console.log(
      "✅ Health, readiness, rate-limit bypass and continuity verified."
    );
  } finally {
    await stopServer();
    for (const root of tempRoots) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

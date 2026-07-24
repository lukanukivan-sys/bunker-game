"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  SENTINEL_FILE,
  createPersistenceStatus
} = require("./lib/persistence_status");

const roots = [];
const logger = {
  error() {},
  warn() {},
  log() {}
};

function tempDir(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), `bunker-persistence-${label}-`)
  );
  roots.push(dir);
  return dir;
}

function manager({
  dir,
  nodeEnv = "test",
  policy,
  expectedDataDir,
  processInstanceId = "test-process"
}) {
  return createPersistenceStatus({
    env: {
      NODE_ENV: nodeEnv,
      ...(policy === undefined
        ? {}
        : { PERSISTENCE_MODE: policy })
    },
    dataDir: dir,
    rawDataDir: dir,
    expectedDataDir,
    logger,
    processInstanceId
  });
}

async function markStartupBackups(status) {
  status.createStoreReporter("rooms").backupSucceeded({
    label: "startup",
    status: "skipped-empty"
  });
  status.createStoreReporter("platform").backupSucceeded({
    label: "startup",
    status: "completed"
  });
}

async function testPolicyDefaultsAndValidation() {
  const local = manager({ dir: tempDir("local") });
  assert.equal(await local.initializeStorage(), true);
  const localState = local.publicReadiness().persistence;
  assert.equal(localState.policy, "ephemeral-allowed");
  assert.equal(localState.mode, "ephemeral");
  assert.equal(localState.writable, true);
  assert.equal(localState.durable, false);
  assert.equal(localState.durabilityConfigured, false);

  const production = manager({
    dir: tempDir("production"),
    nodeEnv: "production"
  });
  assert.equal(await production.initializeStorage(), false);
  assert.equal(
    production.publicReadiness().errors[0].code,
    "PERSISTENCE_MODE_REQUIRED"
  );

  const invalid = manager({
    dir: tempDir("invalid-policy"),
    policy: "sometimes-persistent"
  });
  assert.equal(await invalid.initializeStorage(), false);
  assert.equal(
    invalid.publicReadiness().errors[0].code,
    "PERSISTENCE_MODE_INVALID"
  );
}

async function testProbeIsAuthoritativeOnlyForWritable() {
  const dir = tempDir("probe");
  const status = manager({
    dir,
    policy: "ephemeral-allowed"
  });
  assert.equal(await status.initializeStorage(), true);
  const persistence = status.publicReadiness().persistence;
  assert.equal(persistence.writable, true);
  assert.equal(persistence.durable, false);
  assert.equal(
    fs.readdirSync(dir).some((name) =>
      name.startsWith(".persistence-probe-")),
    false
  );

  const invalidDataDir = path.join(tempDir("probe-failure"), "file");
  fs.writeFileSync(invalidDataDir, "not a directory", "utf8");
  const failed = manager({
    dir: invalidDataDir,
    policy: "ephemeral-allowed"
  });
  assert.equal(await failed.initializeStorage(), false);
  const failedState = failed.publicReadiness();
  assert.equal(failedState.persistence.writable, false);
  assert.equal(failedState.persistence.startupProbe.status, "failed");
  assert(
    failedState.errors.some((item) =>
      item.code === "STORAGE_PROBE_FAILED")
  );
}

async function testPersistentMountAndContinuity() {
  const dir = tempDir("persistent");
  const first = manager({
    dir,
    policy: "persistent-required",
    expectedDataDir: dir,
    processInstanceId: "process-a"
  });
  assert.equal(await first.initializeStorage(), true);
  const firstState = first.publicReadiness().persistence;
  assert.equal(firstState.mode, "persistent");
  assert.equal(firstState.mountPathValid, true);
  assert.equal(firstState.durabilityConfigured, true);
  assert.equal(firstState.durable, true);
  assert.equal(firstState.writable, true);
  assert.equal(firstState.continuity, "unverified");
  assert.equal(firstState.continuityVerified, false);

  const sameProcessRetry = manager({
    dir,
    policy: "persistent-required",
    expectedDataDir: dir,
    processInstanceId: "process-a"
  });
  assert.equal(await sameProcessRetry.initializeStorage(), true);
  assert.equal(
    sameProcessRetry.publicReadiness().persistence.continuityVerified,
    false
  );

  const nextProcess = manager({
    dir,
    policy: "persistent-required",
    expectedDataDir: dir,
    processInstanceId: "process-b"
  });
  assert.equal(await nextProcess.initializeStorage(), true);
  assert.equal(
    nextProcess.publicReadiness().persistence.continuity,
    "verified"
  );
  assert.equal(
    nextProcess.publicReadiness().persistence.continuityVerified,
    true
  );

  const otherDir = tempDir("other-mount");
  const mismatch = manager({
    dir,
    policy: "persistent-required",
    expectedDataDir: otherDir
  });
  assert.equal(await mismatch.initializeStorage(), false);
  assert.equal(
    mismatch.publicReadiness().errors[0].code,
    "MOUNT_PATH_MISMATCH"
  );
  assert.equal(
    mismatch.publicReadiness().persistence.durabilityConfigured,
    false
  );
}

async function testCorruptSentinelFailsSafely() {
  const dir = tempDir("sentinel-corrupt");
  fs.writeFileSync(
    path.join(dir, SENTINEL_FILE),
    "{not valid json",
    "utf8"
  );
  const status = manager({
    dir,
    policy: "persistent-required",
    expectedDataDir: dir
  });
  assert.equal(await status.initializeStorage(), false);
  const payload = status.publicReadiness();
  assert(payload.errors.some((item) => item.code === "SENTINEL_INVALID"));
  assert.equal(JSON.stringify(payload).includes(dir), false);
  assert.equal(JSON.stringify(payload).includes("not valid json"), false);
}

async function testStoreFailuresAndRecovery() {
  const status = manager({
    dir: tempDir("store-state"),
    policy: "ephemeral-allowed"
  });
  assert.equal(await status.initializeStorage(), true);
  await markStartupBackups(status);
  status.completeStartup();
  assert.equal(status.publicReadiness().ready, true);

  const rooms = status.createStoreReporter("rooms");
  const platform = status.createStoreReporter("platform");
  rooms.saveSucceeded({ at: Date.parse("2026-07-24T10:00:00.000Z") });
  platform.saveSucceeded({
    at: Date.parse("2026-07-24T11:00:00.000Z")
  });
  assert.equal(
    status.publicReadiness().persistence.lastSave,
    "2026-07-24T11:00:00.000Z"
  );

  rooms.saveFailed(new Error("/internal/private/path: EACCES"));
  rooms.saveFailed(new Error("second failure"));
  let payload = status.publicReadiness();
  assert.equal(payload.ready, false);
  assert.equal(
    payload.persistence.stores.rooms.lastSave,
    "2026-07-24T10:00:00.000Z"
  );
  assert.equal(
    payload.persistence.stores.rooms.consecutiveSaveErrors,
    2
  );
  assert.equal(
    JSON.stringify(payload).includes("/internal/private/path"),
    false
  );
  assert.equal(payload.persistence.stores.platform.healthy, true);

  rooms.saveSucceeded({ at: Date.parse("2026-07-24T12:00:00.000Z") });
  payload = status.publicReadiness();
  assert.equal(payload.ready, true);
  assert.equal(payload.persistence.stores.rooms.lastSaveError, null);
  assert.equal(
    payload.persistence.stores.rooms.consecutiveSaveErrors,
    0
  );
}

async function testDemoBackupFailureIsDegraded() {
  const status = manager({
    dir: tempDir("degraded"),
    policy: "ephemeral-allowed"
  });
  assert.equal(await status.initializeStorage(), true);
  status.createStoreReporter("rooms").backupFailed({
    label: "startup",
    error: new Error("internal backup failure")
  });
  status.createStoreReporter("platform").backupSucceeded({
    label: "startup",
    status: "completed"
  });
  status.failStartup(
    "STARTUP_BACKUP_FAILED",
    new Error("internal backup failure")
  );
  const payload = status.publicReadiness();
  assert.equal(payload.ready, false);
  assert.equal(payload.status, "degraded");
  assert(
    payload.errors.some((item) => item.code === "ROOM_BACKUP_FAILED")
  );
}

async function main() {
  try {
    await testPolicyDefaultsAndValidation();
    await testProbeIsAuthoritativeOnlyForWritable();
    await testPersistentMountAndContinuity();
    await testCorruptSentinelFailsSafely();
    await testStoreFailuresAndRecovery();
    await testDemoBackupFailureIsDegraded();
    console.log(
      "✅ Persistence policy, probe, continuity and store state verified."
    );
  } finally {
    for (const root of roots) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  awaitAllStartupBackups,
  createPersistenceStatus
} = require("./lib/persistence_status");

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "bunker-startup-backups-")
);
const logger = {
  error() {},
  warn() {},
  log() {}
};

async function main() {
  const status = createPersistenceStatus({
    env: {
      NODE_ENV: "test",
      PERSISTENCE_MODE: "ephemeral-allowed"
    },
    dataDir: root,
    rawDataDir: root,
    logger,
    processInstanceId: "startup-backup-test"
  });
  assert.equal(await status.initializeStorage(), true);

  const rooms = status.createStoreReporter("rooms");
  const platform = status.createStoreReporter("platform");
  let releasePlatform;
  const platformGate = new Promise((resolve) => {
    releasePlatform = resolve;
  });
  let platformFinished = false;
  let aggregateFinished = false;

  const aggregate = awaitAllStartupBackups([
    async () => {
      const error = new Error("rooms startup backup failed");
      rooms.backupFailed({ label: "startup", error });
      throw error;
    },
    async () => {
      await platformGate;
      platform.backupSucceeded({
        label: "startup",
        status: "completed"
      });
      platformFinished = true;
      return "completed";
    }
  ]);
  aggregate.then(
    () => {
      aggregateFinished = true;
    },
    () => {
      aggregateFinished = true;
    }
  );

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    aggregateFinished,
    false,
    "aggregate must wait for the second store after the first rejection"
  );

  releasePlatform();
  await assert.rejects(
    aggregate,
    (error) =>
      error.code === "STARTUP_BACKUP_FAILED" &&
      error instanceof AggregateError &&
      error.errors.length === 1
  );
  assert.equal(platformFinished, true);

  status.failStartup(
    "STARTUP_BACKUP_FAILED",
    new Error("startup backup aggregate failed")
  );
  const payload = status.publicReadiness();
  assert.equal(payload.ready, false);
  assert.equal(payload.status, "degraded");
  assert.equal(
    payload.persistence.stores.rooms.startupBackup.status,
    "failed"
  );
  assert.equal(
    payload.persistence.stores.platform.startupBackup.status,
    "completed"
  );
  assert.equal(payload.persistence.stores.rooms.healthy, false);
  assert.equal(payload.persistence.stores.platform.healthy, true);
  assert(payload.errors.some((item) =>
    item.code === "STARTUP_BACKUP_FAILED"));
  assert(payload.errors.some((item) =>
    item.code === "ROOM_BACKUP_FAILED"));
  assert.equal(
    payload.errors.some((item) =>
      item.code === "PLATFORM_BACKUP_FAILED"),
    false
  );

  console.log(
    "✅ Both startup backups settle before aggregate failure is reported."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

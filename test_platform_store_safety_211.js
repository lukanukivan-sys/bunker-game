"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createPlatform } = require("./platform");
const {
  PlatformStoreLoadError,
  loadPlatformStores
} = require("./lib/platform_store_loader");

const STORE_FILES = {
  accounts: "accounts_v1.json",
  campaigns: "campaigns_v1.json",
  packs: "content_packs_v1.json",
  stats: "statistics_v1.json"
};

function createTempDataDir(label) {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), `bunker-platform-${label}-`)
  );
}

function validStores() {
  return {
    accounts: [
      {
        id: "account_1",
        username: "tester",
        displayName: "Тестер",
        salt: "00",
        passwordHash: "00",
        sessions: []
      }
    ],
    campaigns: [
      {
        id: "campaign_1",
        ownerAccountId: "account_1",
        name: "Тестова кампанія",
        chapters: []
      }
    ],
    packs: [
      {
        id: "pack_1",
        ownerAccountId: "account_1",
        name: "Тестовий набір",
        entries: {}
      }
    ],
    stats: {
      games: 3,
      totalScore: 180,
      bestScore: 80,
      settings: { modern: 3 },
      modes: { classic: 3 },
      players: 12,
      births: 1,
      deaths: 2,
      startedAt: 1,
      recentGames: []
    }
  };
}

function writeStores(dataDir, stores = validStores()) {
  fs.mkdirSync(dataDir, { recursive: true });

  for (const [key, fileName] of Object.entries(STORE_FILES)) {
    fs.writeFileSync(
      path.join(dataDir, fileName),
      JSON.stringify(stores[key], null, 2),
      "utf8"
    );
  }
}

function corruptStore(dataDir, key, source = "{ broken json") {
  const file = path.join(dataDir, STORE_FILES[key]);
  fs.writeFileSync(file, source, "utf8");
  return file;
}

function expectStrictFailure(dataDir, key, expectedCode = "INVALID_JSON") {
  let caught = null;

  try {
    createPlatform(__dirname, dataDir);
  } catch (error) {
    caught = error;
  }

  assert(caught instanceof PlatformStoreLoadError);
  assert.equal(caught.code, "PLATFORM_STORE_LOAD_FAILED");
  assert.equal(caught.report.ok, false);
  assert.equal(caught.report.stores[key].status, "error");
  assert.equal(caught.report.stores[key].errorCode, expectedCode);
  assert(caught.report.stores[key].backupPath);

  return caught;
}

function testMissingStoresUseExplicitDefaults() {
  const dataDir = createTempDataDir("missing");
  const platform = createPlatform(__dirname, dataDir);
  const report = platform.getLoadReport();

  assert.equal(report.ok, true);

  for (const key of Object.keys(STORE_FILES)) {
    assert.equal(report.stores[key].status, "missing");
    assert.equal(report.stores[key].usedDefault, true);
  }

  assert.equal(platform.publicGlobalStats().games, 0);
}

function testValidStoresProduceDiagnosticReport() {
  const dataDir = createTempDataDir("valid");
  writeStores(dataDir);

  const platform = createPlatform(__dirname, dataDir);
  const firstReport = platform.getLoadReport();
  const secondReport = platform.getLoadReport();

  assert.equal(firstReport.ok, true);
  assert.equal(firstReport.stores.accounts.recordCount, 1);
  assert.equal(firstReport.stores.campaigns.recordCount, 1);
  assert.equal(firstReport.stores.packs.recordCount, 1);
  assert.equal(firstReport.stores.stats.status, "loaded");
  assert.equal(platform.publicGlobalStats().games, 3);

  firstReport.stores.accounts.status = "changed-by-test";
  assert.equal(secondReport.stores.accounts.status, "loaded");
  assert.equal(platform.getLoadReport().stores.accounts.status, "loaded");
}

function testEveryBrokenJsonFileIsReservedAndBlocksStartup() {
  for (const key of Object.keys(STORE_FILES)) {
    const dataDir = createTempDataDir(`broken-${key}`);
    writeStores(dataDir);

    const file = corruptStore(
      dataDir,
      key,
      `{"store":"${key}", broken`
    );
    const original = fs.readFileSync(file);
    const error = expectStrictFailure(dataDir, key);
    const backupPath = error.report.stores[key].backupPath;

    assert.equal(fs.existsSync(file), true);
    assert.deepEqual(fs.readFileSync(file), original);
    assert.equal(fs.existsSync(backupPath), true);
    assert.deepEqual(fs.readFileSync(backupPath), original);
  }
}

function testInvalidRootShapeIsAlsoReserved() {
  const dataDir = createTempDataDir("shape");
  writeStores(dataDir);

  const file = corruptStore(
    dataDir,
    "accounts",
    JSON.stringify({ account_1: {} })
  );
  const original = fs.readFileSync(file);
  const error = expectStrictFailure(
    dataDir,
    "accounts",
    "INVALID_ROOT_TYPE"
  );
  const backupPath = error.report.stores.accounts.backupPath;

  assert.deepEqual(fs.readFileSync(file), original);
  assert.deepEqual(fs.readFileSync(backupPath), original);
}

function testMultipleFailuresAreReportedAndReservedTogether() {
  const dataDir = createTempDataDir("multiple");
  writeStores(dataDir);
  corruptStore(dataDir, "campaigns");
  corruptStore(dataDir, "stats", "[1, 2, 3]");

  let caught = null;

  try {
    loadPlatformStores(dataDir, {
      now: Date.parse("2026-07-24T10:00:00.000Z")
    });
  } catch (error) {
    caught = error;
  }

  assert(caught instanceof PlatformStoreLoadError);
  assert.equal(caught.report.stores.campaigns.errorCode, "INVALID_JSON");
  assert.equal(caught.report.stores.stats.errorCode, "INVALID_ROOT_TYPE");
  assert.equal(
    fs.existsSync(caught.report.stores.campaigns.backupPath),
    true
  );
  assert.equal(
    fs.existsSync(caught.report.stores.stats.backupPath),
    true
  );
}

function testDuplicateIdsCannotBeSilentlyCollapsedByMap() {
  const dataDir = createTempDataDir("duplicates");
  const stores = validStores();
  stores.campaigns.push({
    ...stores.campaigns[0],
    name: "Дублікат"
  });
  writeStores(dataDir, stores);

  const error = expectStrictFailure(
    dataDir,
    "campaigns",
    "DUPLICATE_RECORD_ID"
  );

  assert.match(
    error.report.stores.campaigns.error,
    /повторюється/u
  );
}

function testSaveFailureRecoveryAndBackupPropagation() {
  const dataDir = createTempDataDir("write-recovery");
  writeStores(dataDir);
  const events = [];
  const platform = createPlatform(__dirname, dataDir, {
    reporter: {
      saveSucceeded: () => events.push("save-ok"),
      saveFailed: () => events.push("save-failed"),
      backupSucceeded: ({ status }) =>
        events.push(`backup-${status}`),
      backupFailed: () => events.push("backup-failed")
    }
  });

  try {
    platform.saveAllNow();
    assert.equal(events.at(-1), "save-ok");

    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.writeFileSync(dataDir, "blocks data directory", "utf8");
    assert.throws(() => platform.saveAllNow());
    assert.equal(events.at(-1), "save-failed");

    fs.unlinkSync(dataDir);
    fs.mkdirSync(dataDir, { recursive: true });
    platform.saveAllNow();
    assert.equal(events.at(-1), "save-ok");

    const backupDir = path.join(dataDir, "backups");
    fs.writeFileSync(backupDir, "blocks backup directory", "utf8");
    assert.throws(() => platform.backup("startup"));
    assert.equal(events.at(-1), "backup-failed");

    fs.unlinkSync(backupDir);
    assert.equal(platform.backup("startup"), "completed");
    assert.equal(events.at(-1), "backup-completed");
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

function main() {
  testMissingStoresUseExplicitDefaults();
  testValidStoresProduceDiagnosticReport();
  testEveryBrokenJsonFileIsReservedAndBlocksStartup();
  testInvalidRootShapeIsAlsoReserved();
  testMultipleFailuresAreReportedAndReservedTogether();
  testDuplicateIdsCannotBeSilentlyCollapsedByMap();
  testSaveFailureRecoveryAndBackupPropagation();
  console.log(
    "✅ Platform store safety, write recovery and backup status verified."
  );
}

main();

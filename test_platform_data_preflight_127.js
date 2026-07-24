"use strict";

const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  MIGRATION_MANIFEST_FILE,
  runPlatformDataPreflight
} = require("./scripts/platform_data_preflight");

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `bunker-${label}-`));
}

function writeJson(dir, name, value) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2), "utf8");
}

function readJson(dir, name) {
  return JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
}

function silentLogger() {
  return {
    log() {},
    warn() {},
    error() {}
  };
}

(function emptyInstallIsValid() {
  const dataDir = tempDir("platform-empty");
  const report = runPlatformDataPreflight({ dataDir, logger: silentLogger() });

  assert.equal(report.datasets.length, 4);
  assert.equal(report.datasets.some((item) => item.changed), false);
  assert(fs.existsSync(path.join(dataDir, MIGRATION_MANIFEST_FILE)));
})();

(function legacyAccountIsMigratedOnce() {
  const dataDir = tempDir("platform-account");
  const authToken = "legacy-secret-token";

  writeJson(dataDir, "accounts_v1.json", [
    {
      id: "account_1",
      username: "tester",
      authToken,
      createdAt: 100,
      lastSeenAt: 200
    }
  ]);
  writeJson(dataDir, "campaigns_v1.json", []);
  writeJson(dataDir, "content_packs_v1.json", []);
  writeJson(dataDir, "statistics_v1.json", {});

  const first = runPlatformDataPreflight({ dataDir, logger: silentLogger() });
  const accounts = readJson(dataDir, "accounts_v1.json");
  const expectedHash = crypto.createHash("sha256").update(authToken).digest("hex");

  assert.equal(first.datasets.find((item) => item.id === "accounts").changed, true);
  assert.equal(accounts[0].authToken, undefined);
  assert.equal(accounts[0].authTokenHash, undefined);
  assert.equal(accounts[0].sessions.length, 1);
  assert.equal(accounts[0].sessions[0].tokenHash, expectedHash);
  assert.equal(accounts[0].recoveryCodeHash, null);
  assert.equal(first.backups.length >= 1, true);
  assert(fs.existsSync(first.backups[0].file));

  const second = runPlatformDataPreflight({ dataDir, logger: silentLogger() });
  const accountsAfterSecondRun = readJson(dataDir, "accounts_v1.json");

  assert.equal(second.datasets.find((item) => item.id === "accounts").changed, false);
  assert.equal(accountsAfterSecondRun[0].sessions.length, 1);
})();

(function campaignPackAndStatsShapesAreNormalized() {
  const dataDir = tempDir("platform-shapes");

  writeJson(dataDir, "accounts_v1.json", []);
  writeJson(dataDir, "campaigns_v1.json", [
    {
      id: "campaign_1",
      chapters: null,
      carryover: {
        resources: null,
        legacy: null
      }
    }
  ]);
  writeJson(dataDir, "content_packs_v1.json", [
    {
      id: "pack_1",
      entries: null
    }
  ]);
  writeJson(dataDir, "statistics_v1.json", {
    games: "4",
    settings: null,
    modes: null,
    recentGames: null
  });

  const report = runPlatformDataPreflight({ dataDir, logger: silentLogger() });
  const campaign = readJson(dataDir, "campaigns_v1.json")[0];
  const pack = readJson(dataDir, "content_packs_v1.json")[0];
  const stats = readJson(dataDir, "statistics_v1.json");

  assert.equal(report.datasets.filter((item) => item.changed).length, 3);
  assert.deepEqual(campaign.chapters, []);
  assert.deepEqual(campaign.carryover.resources, {});
  assert.deepEqual(campaign.carryover.legacy, []);
  assert.equal(campaign.carryover.version, 1);
  assert.equal(pack.schemaVersion, 1);
  assert.deepEqual(pack.entries, {});
  assert.equal(stats.games, 4);
  assert.deepEqual(stats.settings, {});
  assert.deepEqual(stats.modes, {});
  assert.deepEqual(stats.recentGames, []);
})();

(function malformedJsonBlocksAllWrites() {
  const dataDir = tempDir("platform-invalid-json");

  writeJson(dataDir, "accounts_v1.json", [
    {
      id: "account_1",
      authToken: "must-stay-untouched"
    }
  ]);
  fs.writeFileSync(path.join(dataDir, "campaigns_v1.json"), "{broken", "utf8");
  writeJson(dataDir, "content_packs_v1.json", []);
  writeJson(dataDir, "statistics_v1.json", {});

  const before = fs.readFileSync(path.join(dataDir, "accounts_v1.json"), "utf8");

  assert.throws(
    () => runPlatformDataPreflight({ dataDir, logger: silentLogger() }),
    (error) => error.code === "PLATFORM_JSON_INVALID"
  );

  const after = fs.readFileSync(path.join(dataDir, "accounts_v1.json"), "utf8");
  assert.equal(after, before);
  assert.equal(fs.existsSync(path.join(dataDir, MIGRATION_MANIFEST_FILE)), false);
})();

(function wrongRootAndMissingIdsAreRejected() {
  const rootDir = tempDir("platform-root");
  writeJson(rootDir, "accounts_v1.json", {});

  assert.throws(
    () => runPlatformDataPreflight({ dataDir: rootDir, logger: silentLogger() }),
    (error) => error.code === "PLATFORM_ROOT_INVALID"
  );

  const idDir = tempDir("platform-id");
  writeJson(idDir, "accounts_v1.json", [{}]);

  assert.throws(
    () => runPlatformDataPreflight({ dataDir: idDir, logger: silentLogger() }),
    (error) => error.code === "PLATFORM_RECORD_ID_MISSING"
  );
})();

console.log("✅ platform data preflight: strict validation, backups and idempotent migrations");

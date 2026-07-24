"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const {
  PLATFORM_SCHEMA,
  PRODUCT_VERSION
} = require("../config/version");

const MIGRATION_MANIFEST_SCHEMA = `${PLATFORM_SCHEMA}-migrations-v1`;
const MIGRATION_MANIFEST_FILE = "platform_migrations_v1.json";

const DATASETS = Object.freeze([
  {
    id: "accounts",
    fileName: "accounts_v1.json",
    rootType: "array",
    migrations: [
      {
        id: "accounts.sessions-v1",
        apply: migrateAccounts
      }
    ]
  },
  {
    id: "campaigns",
    fileName: "campaigns_v1.json",
    rootType: "array",
    migrations: [
      {
        id: "campaigns.carryover-v2",
        apply: migrateCampaigns
      }
    ]
  },
  {
    id: "packs",
    fileName: "content_packs_v1.json",
    rootType: "array",
    migrations: [
      {
        id: "packs.schema-v1",
        apply: migratePacks
      }
    ]
  },
  {
    id: "statistics",
    fileName: "statistics_v1.json",
    rootType: "object",
    migrations: [
      {
        id: "statistics.shape-v1",
        apply: migrateStatistics
      }
    ]
  }
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createDataError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function hashToken(value) {
  return crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest("hex");
}

function migrationSessionId(account, tokenHash) {
  return `legacy_session_${hashToken(`${account.id}:${tokenHash}`).slice(0, 16)}`;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function ensureArrayRecords(datasetId, records) {
  return records.map((record, index) => {
    if (!isPlainObject(record)) {
      throw createDataError(
        "PLATFORM_RECORD_INVALID",
        `Набір «${datasetId}»: запис ${index + 1} не є об’єктом.`,
        { dataset: datasetId, recordIndex: index }
      );
    }

    if (!String(record.id || "").trim()) {
      throw createDataError(
        "PLATFORM_RECORD_ID_MISSING",
        `Набір «${datasetId}»: запис ${index + 1} не містить id.`,
        { dataset: datasetId, recordIndex: index }
      );
    }

    return record;
  });
}

function migrateAccounts(input) {
  const accounts = ensureArrayRecords("accounts", cloneJson(input));

  for (const account of accounts) {
    const sessions = Array.isArray(account.sessions)
      ? account.sessions.filter(isPlainObject)
      : [];

    let legacyTokenHash = String(account.authTokenHash || "").trim();

    if (!legacyTokenHash && account.authToken) {
      legacyTokenHash = hashToken(account.authToken);
    }

    if (
      legacyTokenHash &&
      !sessions.some((session) => session.tokenHash === legacyTokenHash)
    ) {
      sessions.push({
        id: migrationSessionId(account, legacyTokenHash),
        tokenHash: legacyTokenHash,
        createdAt: Number(account.lastSeenAt || account.createdAt || Date.now()),
        lastSeenAt: Number(account.lastSeenAt || Date.now()),
        label: "Старий сеанс",
        ipHint: null
      });
    }

    account.sessions = sessions
      .filter((session) => String(session.tokenHash || "").trim())
      .slice(-8);
    account.recoveryCodeHash ||= null;

    delete account.authToken;
    delete account.authTokenHash;
  }

  return accounts;
}

function migrateCampaigns(input) {
  const campaigns = ensureArrayRecords("campaigns", cloneJson(input));

  for (const campaign of campaigns) {
    campaign.chapters = Array.isArray(campaign.chapters)
      ? campaign.chapters
      : [];

    if (!isPlainObject(campaign.carryover)) {
      campaign.carryover = {
        version: 2,
        sourceChapter: null,
        resources: {},
        allies: 0,
        legacy: []
      };
    }

    campaign.carryover.version ||= 1;
    campaign.carryover.resources = isPlainObject(campaign.carryover.resources)
      ? campaign.carryover.resources
      : {};
    campaign.carryover.legacy = Array.isArray(campaign.carryover.legacy)
      ? campaign.carryover.legacy
      : [];
  }

  return campaigns;
}

function migratePacks(input) {
  const packs = ensureArrayRecords("packs", cloneJson(input));

  for (const pack of packs) {
    pack.schemaVersion = Number(pack.schemaVersion || 1);
    pack.entries = isPlainObject(pack.entries) ? pack.entries : {};
  }

  return packs;
}

function migrateStatistics(input) {
  if (!isPlainObject(input)) {
    throw createDataError(
      "PLATFORM_ROOT_INVALID",
      "Набір «statistics» має бути JSON-об’єктом.",
      { dataset: "statistics", expectedRoot: "object" }
    );
  }

  const stats = cloneJson(input);
  const numericFields = [
    "games",
    "totalScore",
    "bestScore",
    "players",
    "births",
    "deaths"
  ];

  for (const field of numericFields) {
    stats[field] = Number(stats[field] || 0);
  }

  stats.startedAt = Number(stats.startedAt || Date.now());
  stats.settings = isPlainObject(stats.settings) ? stats.settings : {};
  stats.modes = isPlainObject(stats.modes) ? stats.modes : {};
  stats.recentGames = Array.isArray(stats.recentGames)
    ? stats.recentGames
    : [];

  return stats;
}

function expectedEmptyValue(dataset) {
  return dataset.rootType === "array" ? [] : {};
}

function readDataset(dataDir, dataset) {
  const file = path.join(dataDir, dataset.fileName);

  if (!fs.existsSync(file)) {
    return {
      dataset,
      file,
      exists: false,
      source: expectedEmptyValue(dataset)
    };
  }

  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw createDataError(
      "PLATFORM_JSON_INVALID",
      `Файл ${dataset.fileName} містить пошкоджений JSON: ${error.message}`,
      { dataset: dataset.id, file }
    );
  }

  const validRoot = dataset.rootType === "array"
    ? Array.isArray(parsed)
    : isPlainObject(parsed);

  if (!validRoot) {
    throw createDataError(
      "PLATFORM_ROOT_INVALID",
      `Файл ${dataset.fileName} має неправильний кореневий тип; очікується ${dataset.rootType}.`,
      {
        dataset: dataset.id,
        file,
        expectedRoot: dataset.rootType
      }
    );
  }

  return {
    dataset,
    file,
    exists: true,
    source: parsed
  };
}

function planDatasetMigration(entry) {
  let current = entry.source;
  const applied = [];

  for (const migration of entry.dataset.migrations) {
    const next = migration.apply(current);

    if (!sameJson(current, next)) {
      applied.push(migration.id);
    }

    current = next;
  }

  return {
    ...entry,
    output: current,
    changed: entry.exists && !sameJson(entry.source, current),
    applied
  };
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
    fs.renameSync(temp, file);
  } catch (error) {
    try {
      fs.unlinkSync(temp);
    } catch {
      // Тимчасовий файл міг не бути створений або вже бути видалений.
    }

    throw error;
  }
}

function backupSource(file, dataDir, datasetId) {
  const backupDir = path.join(dataDir, "backups", "pre-migration");
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const target = path.join(
    backupDir,
    `${stamp}_platform-${datasetId}_${path.basename(file)}`
  );

  fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
  return target;
}

function loadManifest(file) {
  if (!fs.existsSync(file)) {
    return {
      schema: MIGRATION_MANIFEST_SCHEMA,
      productVersion: PRODUCT_VERSION,
      runs: []
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

    if (!isPlainObject(parsed) || !Array.isArray(parsed.runs)) {
      throw new Error("неправильна структура manifest");
    }

    return parsed;
  } catch (error) {
    throw createDataError(
      "PLATFORM_MANIFEST_INVALID",
      `Файл ${MIGRATION_MANIFEST_FILE} пошкоджено: ${error.message}`,
      { file }
    );
  }
}

function runPlatformDataPreflight(options = {}) {
  const dataDir = path.resolve(
    options.dataDir ||
    process.env.DATA_DIR ||
    path.join(__dirname, "..", "data")
  );
  const logger = options.logger || console;
  const manifestFile = path.join(dataDir, MIGRATION_MANIFEST_FILE);

  // Спочатку читаємо і перевіряємо всі набори. Жоден файл не змінюється,
  // якщо хоча б один набір пошкоджено або має неправильну структуру.
  const plan = DATASETS
    .map((dataset) => readDataset(dataDir, dataset))
    .map(planDatasetMigration);
  const manifest = loadManifest(manifestFile);
  const backups = [];

  for (const item of plan.filter((entry) => entry.changed)) {
    backups.push({
      dataset: item.dataset.id,
      file: backupSource(item.file, dataDir, item.dataset.id)
    });
    atomicWriteJson(item.file, item.output);
  }

  const report = {
    schema: MIGRATION_MANIFEST_SCHEMA,
    productVersion: PRODUCT_VERSION,
    platformSchema: PLATFORM_SCHEMA,
    completedAt: Date.now(),
    dataDir,
    datasets: plan.map((item) => ({
      id: item.dataset.id,
      file: item.dataset.fileName,
      existed: item.exists,
      changed: item.changed,
      migrations: item.applied
    })),
    backups
  };

  manifest.schema = MIGRATION_MANIFEST_SCHEMA;
  manifest.productVersion = PRODUCT_VERSION;
  manifest.platformSchema = PLATFORM_SCHEMA;
  manifest.runs = [...manifest.runs, report].slice(-40);
  atomicWriteJson(manifestFile, manifest);

  const changedCount = report.datasets.filter((item) => item.changed).length;
  logger.log(
    changedCount
      ? `Платформні дані перевірено; оновлено наборів: ${changedCount}.`
      : "Платформні дані перевірено; міграції не потрібні."
  );

  return report;
}

function main() {
  try {
    runPlatformDataPreflight();
  } catch (error) {
    console.error(
      `Критична помилка платформних даних [${error.code || "PLATFORM_PREFLIGHT_FAILED"}]: ${error.message}`
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  DATASETS,
  MIGRATION_MANIFEST_FILE,
  MIGRATION_MANIFEST_SCHEMA,
  createDataError,
  migrateAccounts,
  migrateCampaigns,
  migratePacks,
  migrateStatistics,
  runPlatformDataPreflight
};

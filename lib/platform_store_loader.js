"use strict";

const fs = require("node:fs");
const path = require("node:path");

const LOAD_REPORT_SCHEMA = 1;
const CORRUPT_BACKUP_DIRECTORY = path.join("backups", "corrupt-platform");

function createDefaultStats(now = Date.now()) {
  return {
    games: 0,
    totalScore: 0,
    bestScore: 0,
    settings: {},
    modes: {},
    players: 0,
    births: 0,
    deaths: 0,
    startedAt: now,
    recentGames: []
  };
}

function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function validateIdArray(value, label) {
  if (!Array.isArray(value)) {
    throw Object.assign(
      new Error(`${label}: кореневе значення має бути масивом.`),
      { code: "INVALID_ROOT_TYPE" }
    );
  }

  const ids = new Set();

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];

    if (!isPlainObject(item)) {
      throw Object.assign(
        new Error(`${label}: запис ${index + 1} має бути об’єктом.`),
        { code: "INVALID_RECORD" }
      );
    }

    const id = typeof item.id === "string"
      ? item.id.trim()
      : "";

    if (!id) {
      throw Object.assign(
        new Error(`${label}: запис ${index + 1} не має id.`),
        { code: "MISSING_RECORD_ID" }
      );
    }

    if (ids.has(id)) {
      throw Object.assign(
        new Error(`${label}: id «${id}» повторюється.`),
        { code: "DUPLICATE_RECORD_ID" }
      );
    }

    ids.add(id);
  }

  return value;
}

function validateStats(value, now = Date.now()) {
  if (!isPlainObject(value)) {
    throw Object.assign(
      new Error("Глобальна статистика: кореневе значення має бути об’єктом."),
      { code: "INVALID_ROOT_TYPE" }
    );
  }

  const defaults = createDefaultStats(now);
  const numericFields = [
    "games",
    "totalScore",
    "bestScore",
    "players",
    "births",
    "deaths",
    "startedAt"
  ];
  const normalized = {
    ...defaults,
    ...value
  };

  for (const field of numericFields) {
    if (value[field] === undefined) {
      continue;
    }

    const number = Number(value[field]);

    if (!Number.isFinite(number)) {
      throw Object.assign(
        new Error(`Глобальна статистика: поле «${field}» має бути числом.`),
        { code: "INVALID_STATS_FIELD" }
      );
    }

    normalized[field] = number;
  }

  for (const field of ["settings", "modes"]) {
    if (value[field] !== undefined && !isPlainObject(value[field])) {
      throw Object.assign(
        new Error(`Глобальна статистика: поле «${field}» має бути об’єктом.`),
        { code: "INVALID_STATS_FIELD" }
      );
    }

    normalized[field] = value[field] || {};
  }

  if (
    value.recentGames !== undefined &&
    !Array.isArray(value.recentGames)
  ) {
    throw Object.assign(
      new Error("Глобальна статистика: поле «recentGames» має бути масивом."),
      { code: "INVALID_STATS_FIELD" }
    );
  }

  normalized.recentGames = value.recentGames || [];
  return normalized;
}

function timestampForFile(now) {
  return new Date(now)
    .toISOString()
    .replace(/[:.]/gu, "-");
}

function reserveCorruptFile(file, backupDirectory, now) {
  fs.mkdirSync(backupDirectory, { recursive: true });

  const extension = path.extname(file);
  const baseName = path.basename(file, extension);
  const stamp = timestampForFile(now);
  let destination = path.join(
    backupDirectory,
    `${stamp}_${baseName}.corrupt${extension || ".json"}`
  );
  let suffix = 1;

  while (fs.existsSync(destination)) {
    destination = path.join(
      backupDirectory,
      `${stamp}_${baseName}.corrupt-${suffix}${extension || ".json"}`
    );
    suffix += 1;
  }

  fs.copyFileSync(file, destination);
  return destination;
}

function loadStore(definition, context) {
  const {
    dataDir,
    backupDirectory,
    now
  } = context;
  const file = path.join(dataDir, definition.fileName);
  const report = {
    key: definition.key,
    file,
    fileName: definition.fileName,
    status: "pending",
    usedDefault: false,
    recordCount: null,
    backupPath: null,
    errorCode: null,
    error: null
  };

  if (!fs.existsSync(file)) {
    const value = definition.defaultValue(now);

    report.status = "missing";
    report.usedDefault = true;
    report.recordCount = Array.isArray(value) ? value.length : null;

    return { value, report, error: null };
  }

  let parsed;

  try {
    const source = fs.readFileSync(file, "utf8");
    parsed = JSON.parse(source);
  } catch (error) {
    report.status = "error";
    report.errorCode = error instanceof SyntaxError
      ? "INVALID_JSON"
      : "READ_ERROR";
    report.error = error.message;

    try {
      report.backupPath = reserveCorruptFile(
        file,
        backupDirectory,
        now
      );
    } catch (backupError) {
      report.backupError = backupError.message;
    }

    return { value: null, report, error };
  }

  try {
    const value = definition.validate(parsed);

    report.status = "loaded";
    report.recordCount = Array.isArray(value) ? value.length : null;

    return { value, report, error: null };
  } catch (error) {
    report.status = "error";
    report.errorCode = error.code || "INVALID_DATA";
    report.error = error.message;

    try {
      report.backupPath = reserveCorruptFile(
        file,
        backupDirectory,
        now
      );
    } catch (backupError) {
      report.backupError = backupError.message;
    }

    return { value: null, report, error };
  }
}

class PlatformStoreLoadError extends Error {
  constructor(report) {
    const failedFiles = Object.values(report.stores)
      .filter((store) => store.status === "error")
      .map((store) => store.fileName)
      .join(", ");

    super(
      `Не вдалося безпечно завантажити дані платформи: ${failedFiles}. ` +
      "Пошкоджені файли не були обнулені або перезаписані."
    );

    this.name = "PlatformStoreLoadError";
    this.code = "PLATFORM_STORE_LOAD_FAILED";
    this.report = report;
  }
}

function cloneReport(report) {
  return JSON.parse(JSON.stringify(report));
}

function loadPlatformStores(dataDir, options = {}) {
  const resolvedDataDir = path.resolve(dataDir);
  const now = Number(
    typeof options.now === "function"
      ? options.now()
      : options.now ?? Date.now()
  );
  const backupDirectory = path.resolve(
    options.backupDirectory ||
    path.join(resolvedDataDir, CORRUPT_BACKUP_DIRECTORY)
  );
  const definitions = [
    {
      key: "accounts",
      fileName: "accounts_v1.json",
      defaultValue: () => [],
      validate: (value) => validateIdArray(value, "Облікові записи")
    },
    {
      key: "campaigns",
      fileName: "campaigns_v1.json",
      defaultValue: () => [],
      validate: (value) => validateIdArray(value, "Кампанії")
    },
    {
      key: "packs",
      fileName: "content_packs_v1.json",
      defaultValue: () => [],
      validate: (value) => validateIdArray(value, "Набори контенту")
    },
    {
      key: "stats",
      fileName: "statistics_v1.json",
      defaultValue: () => createDefaultStats(now),
      validate: (value) => validateStats(value, now)
    }
  ];
  const report = {
    schemaVersion: LOAD_REPORT_SCHEMA,
    ok: true,
    dataDir: resolvedDataDir,
    backupDirectory,
    startedAt: now,
    completedAt: null,
    stores: {}
  };
  const values = {};

  for (const definition of definitions) {
    const result = loadStore(definition, {
      dataDir: resolvedDataDir,
      backupDirectory,
      now
    });

    report.stores[definition.key] = result.report;

    if (result.error) {
      report.ok = false;
    } else {
      values[definition.key] = result.value;
    }
  }

  report.completedAt = Date.now();

  if (!report.ok) {
    throw new PlatformStoreLoadError(cloneReport(report));
  }

  return {
    ...values,
    report: cloneReport(report)
  };
}

module.exports = {
  CORRUPT_BACKUP_DIRECTORY,
  LOAD_REPORT_SCHEMA,
  PlatformStoreLoadError,
  cloneReport,
  createDefaultStats,
  loadPlatformStores,
  reserveCorruptFile,
  validateIdArray,
  validateStats
};

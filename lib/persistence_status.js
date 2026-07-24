"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PROCESS_INSTANCE_ID = crypto.randomUUID();
const SENTINEL_FILE = ".persistence-sentinel.json";
const SENTINEL_SCHEMA = "skhovyshche-persistence-sentinel-v1";
const POLICIES = new Set(["ephemeral-allowed", "persistent-required"]);

const SAFE_MESSAGES = Object.freeze({
  PERSISTENCE_MODE_REQUIRED: "Persistence policy is required in production.",
  PERSISTENCE_MODE_INVALID: "Persistence policy is invalid.",
  DATA_DIR_REQUIRED: "Persistent storage configuration is incomplete.",
  EXPECTED_DATA_DIR_REQUIRED: "Persistent storage configuration is incomplete.",
  DATA_DIR_NOT_ABSOLUTE: "Persistent storage configuration is invalid.",
  EXPECTED_DATA_DIR_NOT_ABSOLUTE: "Persistent storage configuration is invalid.",
  MOUNT_PATH_INVALID: "Persistent storage mount path is unavailable.",
  MOUNT_PATH_MISMATCH: "Persistent storage configuration is invalid.",
  STORAGE_PROBE_FAILED: "Storage write verification failed.",
  SENTINEL_INVALID: "Persistent storage continuity marker is invalid.",
  SENTINEL_WRITE_FAILED: "Persistent storage continuity marker could not be created.",
  PLATFORM_PREFLIGHT_FAILED: "Platform data preflight failed.",
  PLATFORM_LOAD_FAILED: "Platform data could not be loaded.",
  ROOM_LOAD_FAILED: "Room data could not be loaded.",
  STARTUP_BACKUP_FAILED: "Startup backup failed.",
  ROOM_SAVE_FAILED: "Room storage write failed.",
  PLATFORM_SAVE_FAILED: "Platform storage write failed.",
  ROOM_BACKUP_FAILED: "Room backup failed.",
  PLATFORM_BACKUP_FAILED: "Platform backup failed."
});

function iso(value = Date.now()) {
  return new Date(value).toISOString();
}

function safeError(code, at = Date.now()) {
  const safeCode = SAFE_MESSAGES[code] ? code : "STORAGE_PROBE_FAILED";
  return {
    code: safeCode,
    message: SAFE_MESSAGES[safeCode],
    at: iso(at)
  };
}

function createStoreState() {
  return {
    healthy: true,
    saveHealthy: true,
    backupHealthy: true,
    lastSave: null,
    lastSaveError: null,
    consecutiveSaveErrors: 0,
    lastBackup: null,
    lastBackupError: null,
    startupBackup: {
      status: "pending",
      completedAt: null,
      error: null
    },
    changedAt: iso()
  };
}

function cloneStoreState(state) {
  return {
    healthy: state.healthy,
    lastSave: state.lastSave,
    lastSaveError: state.lastSaveError ? { ...state.lastSaveError } : null,
    consecutiveSaveErrors: state.consecutiveSaveErrors,
    lastBackup: state.lastBackup,
    lastBackupError: state.lastBackupError
      ? { ...state.lastBackupError }
      : null,
    startupBackup: {
      ...state.startupBackup,
      error: state.startupBackup.error
        ? { ...state.startupBackup.error }
        : null
    },
    changedAt: state.changedAt
  };
}

function createPersistenceStatus({
  env = process.env,
  dataDir,
  rawDataDir = env.DATA_DIR,
  expectedDataDir = env.EXPECTED_DATA_DIR,
  logger = console,
  processInstanceId = PROCESS_INSTANCE_ID
} = {}) {
  const nodeEnv = String(env.NODE_ENV || "development").trim().toLowerCase();
  const requestedPolicy = String(env.PERSISTENCE_MODE || "").trim();
  const resolvedDataDir = path.resolve(
    dataDir || rawDataDir || path.join(process.cwd(), "data")
  );
  const stores = {
    rooms: createStoreState(),
    platform: createStoreState()
  };
  const state = {
    phase: "starting",
    policy: "unknown",
    mode: "unknown",
    durable: false,
    durabilityConfigured: false,
    mountPathValid: false,
    writable: false,
    continuity: "not-applicable",
    continuityVerified: false,
    startupProbe: {
      status: "pending",
      completedAt: null,
      error: null
    },
    startupError: null,
    changedAt: iso()
  };

  function touch() {
    state.changedAt = iso();
  }

  function setStartupError(code, internalError = null) {
    state.startupError = safeError(code);
    state.phase = "error";
    touch();
    if (internalError) {
      logger.error(
        `Persistence startup failure [${code}]:`,
        internalError
      );
    }
  }

  async function validateConfiguration() {
    let policy = requestedPolicy;

    if (!policy) {
      if (nodeEnv === "production") {
        setStartupError("PERSISTENCE_MODE_REQUIRED");
        return false;
      }
      policy = "ephemeral-allowed";
    }

    if (!POLICIES.has(policy)) {
      setStartupError("PERSISTENCE_MODE_INVALID");
      return false;
    }

    state.policy = policy;

    if (policy === "ephemeral-allowed") {
      state.mode = "ephemeral";
      state.durable = false;
      state.durabilityConfigured = false;
      state.mountPathValid = false;
      state.continuity = "not-applicable";
      state.continuityVerified = false;
      touch();
      return true;
    }

    state.mode = "unknown";
    state.durable = false;

    if (!rawDataDir) {
      setStartupError("DATA_DIR_REQUIRED");
      return false;
    }
    if (!expectedDataDir) {
      setStartupError("EXPECTED_DATA_DIR_REQUIRED");
      return false;
    }
    if (!path.isAbsolute(rawDataDir)) {
      setStartupError("DATA_DIR_NOT_ABSOLUTE");
      return false;
    }
    if (!path.isAbsolute(expectedDataDir)) {
      setStartupError("EXPECTED_DATA_DIR_NOT_ABSOLUTE");
      return false;
    }

    let actualPath;
    let expectedPath;
    try {
      actualPath = await fs.promises.realpath(path.normalize(rawDataDir));
      expectedPath = await fs.promises.realpath(
        path.normalize(expectedDataDir)
      );
    } catch (error) {
      setStartupError("MOUNT_PATH_INVALID", error);
      return false;
    }

    if (actualPath !== expectedPath) {
      setStartupError("MOUNT_PATH_MISMATCH");
      return false;
    }

    state.mountPathValid = true;
    state.durabilityConfigured = true;
    state.mode = "persistent";
    // Durability is a deployment-policy/configuration claim. It is never
    // inferred from the write/read/delete probe below.
    state.durable = true;
    state.continuity = "unverified";
    state.continuityVerified = false;
    touch();
    return true;
  }

  async function runWriteReadDeleteProbe() {
    const probeFile = path.join(
      resolvedDataDir,
      `.persistence-probe-${process.pid}-${crypto.randomUUID()}.tmp`
    );
    const expected = crypto.randomBytes(24).toString("hex");

    try {
      await fs.promises.mkdir(resolvedDataDir, { recursive: true });
      await fs.promises.writeFile(probeFile, expected, {
        encoding: "utf8",
        flag: "wx"
      });
      const actual = await fs.promises.readFile(probeFile, "utf8");
      if (actual !== expected) {
        const error = new Error("Persistence probe content mismatch.");
        error.code = "PROBE_CONTENT_MISMATCH";
        throw error;
      }
      await fs.promises.unlink(probeFile);
      try {
        await fs.promises.access(probeFile);
        const error = new Error("Persistence probe file still exists.");
        error.code = "PROBE_DELETE_FAILED";
        throw error;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      state.writable = true;
      state.startupProbe = {
        status: "passed",
        completedAt: iso(),
        error: null
      };
      touch();
      return true;
    } catch (error) {
      state.writable = false;
      state.startupProbe = {
        status: "failed",
        completedAt: iso(),
        error: safeError("STORAGE_PROBE_FAILED")
      };
      setStartupError("STORAGE_PROBE_FAILED", error);
      return false;
    } finally {
      await fs.promises.unlink(probeFile).catch(() => {});
    }
  }

  async function verifyContinuity() {
    if (state.policy !== "persistent-required") return true;

    const sentinelFile = path.join(resolvedDataDir, SENTINEL_FILE);
    let source;
    try {
      source = await fs.promises.readFile(sentinelFile, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") {
        setStartupError("SENTINEL_INVALID", error);
        return false;
      }

      const sentinel = {
        schema: SENTINEL_SCHEMA,
        id: crypto.randomUUID(),
        createdAt: iso(),
        createdByProcessInstanceId: processInstanceId
      };
      try {
        await fs.promises.writeFile(
          sentinelFile,
          JSON.stringify(sentinel, null, 2),
          { encoding: "utf8", flag: "wx" }
        );
      } catch (writeError) {
        setStartupError("SENTINEL_WRITE_FAILED", writeError);
        return false;
      }
      state.continuity = "unverified";
      state.continuityVerified = false;
      touch();
      return true;
    }

    let sentinel;
    try {
      sentinel = JSON.parse(source);
    } catch (error) {
      setStartupError("SENTINEL_INVALID", error);
      return false;
    }

    if (
      sentinel?.schema !== SENTINEL_SCHEMA ||
      typeof sentinel?.id !== "string" ||
      !sentinel.id ||
      typeof sentinel?.createdByProcessInstanceId !== "string" ||
      !sentinel.createdByProcessInstanceId
    ) {
      setStartupError("SENTINEL_INVALID");
      return false;
    }

    // A retry in the same Node.js process must not turn a sentinel created
    // moments ago into proof of continuity across process starts.
    const verified =
      sentinel.createdByProcessInstanceId !== processInstanceId;
    state.continuity = verified ? "verified" : "unverified";
    state.continuityVerified = verified;
    touch();
    return true;
  }

  async function initializeStorage() {
    state.phase = "starting";
    state.startupError = null;
    touch();
    if (!(await validateConfiguration())) return false;
    if (!(await runWriteReadDeleteProbe())) return false;
    if (!(await verifyContinuity())) return false;
    return true;
  }

  function storeSaveSucceeded(storeName, at = Date.now()) {
    const store = stores[storeName];
    if (!store) throw new Error(`Unknown persistence store: ${storeName}`);
    store.saveHealthy = true;
    store.healthy = store.saveHealthy && store.backupHealthy;
    store.lastSave = iso(at);
    store.lastSaveError = null;
    store.consecutiveSaveErrors = 0;
    store.changedAt = iso(at);
    touch();
  }

  function storeSaveFailed(storeName, internalError = null) {
    const store = stores[storeName];
    if (!store) throw new Error(`Unknown persistence store: ${storeName}`);
    const code =
      storeName === "rooms" ? "ROOM_SAVE_FAILED" : "PLATFORM_SAVE_FAILED";
    store.saveHealthy = false;
    store.healthy = false;
    store.lastSaveError = safeError(code);
    store.consecutiveSaveErrors += 1;
    store.changedAt = iso();
    touch();
    if (internalError) {
      logger.error(`Persistence write failure [${code}]:`, internalError);
    }
  }

  function storeBackupSucceeded(
    storeName,
    label,
    backupStatus = "completed",
    at = Date.now()
  ) {
    const store = stores[storeName];
    if (!store) throw new Error(`Unknown persistence store: ${storeName}`);
    store.backupHealthy = true;
    store.healthy = store.saveHealthy && store.backupHealthy;
    store.lastBackup = iso(at);
    store.lastBackupError = null;
    if (label === "startup") {
      store.startupBackup = {
        status: backupStatus,
        completedAt: iso(at),
        error: null
      };
      store.changedAt = iso(at);
      touch();
    }
  }

  function storeBackupFailed(storeName, label, internalError = null) {
    const store = stores[storeName];
    if (!store) throw new Error(`Unknown persistence store: ${storeName}`);
    const code =
      storeName === "rooms"
        ? "ROOM_BACKUP_FAILED"
        : "PLATFORM_BACKUP_FAILED";
    store.backupHealthy = false;
    store.healthy = false;
    store.lastBackupError = safeError(code);
    if (label === "startup") {
      store.startupBackup = {
        status: "failed",
        completedAt: iso(),
        error: safeError(code)
      };
    }
    store.changedAt = iso();
    touch();
    if (internalError) {
      logger.error(`Persistence backup failure [${code}]:`, internalError);
    }
  }

  function createStoreReporter(storeName) {
    if (!stores[storeName]) {
      throw new Error(`Unknown persistence store: ${storeName}`);
    }
    return Object.freeze({
      saveSucceeded: ({ at } = {}) =>
        storeSaveSucceeded(storeName, at || Date.now()),
      saveFailed: (error) => storeSaveFailed(storeName, error),
      backupSucceeded: ({ label, status, at } = {}) =>
        storeBackupSucceeded(
          storeName,
          label,
          status || "completed",
          at || Date.now()
        ),
      backupFailed: ({ label, error } = {}) =>
        storeBackupFailed(storeName, label, error)
    });
  }

  function completeStartup() {
    state.phase = "ready";
    state.startupError = null;
    touch();
  }

  function failStartup(code, internalError = null) {
    setStartupError(code, internalError);
  }

  function readinessReasons() {
    const reasons = [];
    if (state.startupError) reasons.push({ ...state.startupError });
    if (!state.writable && state.startupProbe.error) {
      reasons.push({ ...state.startupProbe.error });
    }
    for (const store of Object.values(stores)) {
      if (store.startupBackup.error) {
        reasons.push({ ...store.startupBackup.error });
      }
      if (store.lastSaveError) {
        reasons.push({ ...store.lastSaveError });
      }
      if (store.lastBackupError) {
        reasons.push({ ...store.lastBackupError });
      }
    }
    const unique = new Map();
    for (const reason of reasons) unique.set(reason.code, reason);
    return [...unique.values()];
  }

  function isReady() {
    if (state.phase !== "ready" || state.startupError || !state.writable) {
      return false;
    }
    if (
      state.policy === "persistent-required" &&
      (!state.mountPathValid || !state.durabilityConfigured || !state.durable)
    ) {
      return false;
    }
    return Object.values(stores).every(
      (store) =>
        store.healthy &&
        ["completed", "skipped-empty"].includes(store.startupBackup.status)
    );
  }

  function aggregateLastSave() {
    return Object.values(stores)
      .map((store) => store.lastSave)
      .filter(Boolean)
      .sort()
      .at(-1) || null;
  }

  function publicPersistence() {
    return {
      policy: state.policy,
      mode: state.mode,
      durable: state.durable,
      durabilityConfigured: state.durabilityConfigured,
      mountPathValid: state.mountPathValid,
      writable: state.writable,
      continuity: state.continuity,
      continuityVerified: state.continuityVerified,
      lastSave: aggregateLastSave(),
      startupProbe: {
        ...state.startupProbe,
        error: state.startupProbe.error
          ? { ...state.startupProbe.error }
          : null
      },
      stores: {
        rooms: cloneStoreState(stores.rooms),
        platform: cloneStoreState(stores.platform)
      },
      changedAt: state.changedAt
    };
  }

  function publicReadiness() {
    const ready = isReady();
    let status = ready ? "ready" : "error";
    if (!ready && state.phase === "starting") status = "starting";
    if (
      !ready &&
      state.policy === "ephemeral-allowed" &&
      Object.values(stores).some(
        (store) => store.startupBackup.status === "failed"
      )
    ) {
      status = "degraded";
    }
    return {
      ok: ready,
      ready,
      status,
      persistence: publicPersistence(),
      ...(ready ? {} : { errors: readinessReasons() })
    };
  }

  function publicLivenessPersistence() {
    return {
      policy: state.policy,
      mode: state.mode,
      durable: state.durable
    };
  }

  return Object.freeze({
    completeStartup,
    createStoreReporter,
    failStartup,
    initializeStorage,
    isReady,
    publicLivenessPersistence,
    publicReadiness,
    runWriteReadDeleteProbe,
    validateConfiguration,
    verifyContinuity
  });
}

module.exports = {
  PROCESS_INSTANCE_ID,
  SAFE_MESSAGES,
  SENTINEL_FILE,
  SENTINEL_SCHEMA,
  createPersistenceStatus,
  safeError
};

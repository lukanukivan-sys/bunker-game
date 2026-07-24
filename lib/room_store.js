"use strict";

const fs = require("fs");
const path = require("path");

async function atomicWriteJson(file, payload) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.promises.writeFile(temp, JSON.stringify(payload, null, 2), "utf8");
    await fs.promises.rename(temp, file);
  } catch (error) {
    await fs.promises.unlink(temp).catch(() => {});
    throw error;
  }
}

function createDataError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateRoomShape(room, expectedCode = null) {
  if (!isPlainObject(room)) throw createDataError("ROOM_INVALID", "Збережена кімната не є об’єктом.");
  const code = String(room.code || "").toUpperCase();
  if (!/^[A-Z0-9]{6}$/u.test(code)) throw createDataError("ROOM_INVALID_CODE", "Збережена кімната має некоректний код.", { roomCode: room.code || null });
  if (expectedCode && code !== String(expectedCode).toUpperCase()) {
    throw createDataError("ROOM_FILENAME_MISMATCH", `Код кімнати ${code} не відповідає назві файла ${expectedCode}.`, { roomCode: code, expectedCode });
  }
  if (!Array.isArray(room.players)) throw createDataError("ROOM_INVALID_PLAYERS", `Кімната ${code} не містить масиву гравців.`, { roomCode: code });
  room.code = code;
  return room;
}

function createRoomStore({
  dataDir,
  schema,
  productVersion,
  ttlMs,
  getRooms,
  legacyFiles = [],
  backupLimit = 12,
  debounceMs = 180,
  logger = console,
  reporter = null
}) {
  const manifestFile = path.join(dataDir, `${schema}.json`);
  const roomsDir = path.join(dataDir, schema);
  const preMigrationDir = path.join(dataDir, "backups", "pre-migration");
  let saveTimer = null;
  let savePromise = Promise.resolve();
  let backupPromise = Promise.resolve();
  let lastReadReport = { loaded: 0, skipped: 0, legacy: 0, errors: [], preMigrationBackups: [] };
  const backedUpSources = new Set();

  const persistentRooms = (now = Date.now()) => [...getRooms()].filter((room) => now - Number(room.updatedAt || room.createdAt || now) < ttlMs);
  const envelope = (room) => ({ schema, productVersion, savedAt: Date.now(), room });

  function backupSourceBeforeMigration(file, label = "legacy") {
    const resolved = path.resolve(file);
    if (backedUpSources.has(resolved) || !fs.existsSync(resolved)) return null;
    fs.mkdirSync(preMigrationDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = path.join(preMigrationDir, `${stamp}_${label}_${path.basename(resolved)}`);
    fs.copyFileSync(resolved, target, fs.constants.COPYFILE_EXCL);
    backedUpSources.add(resolved);
    lastReadReport.preMigrationBackups.push(target);
    return target;
  }

  function parseCurrentRoomFile(file, expectedCode) {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (isPlainObject(parsed) && Object.prototype.hasOwnProperty.call(parsed, "room")) {
      if (parsed.schema !== schema) {
        throw createDataError(
          "ROOM_SCHEMA_MISMATCH",
          `Файл ${path.basename(file)} має схему «${parsed.schema || "невідома"}», очікується «${schema}».`,
          { foundSchema: parsed.schema || null, expectedSchema: schema }
        );
      }
      return validateRoomShape(parsed.room, expectedCode);
    }

    // Старі файли могли містити кімнату без envelope. Перед автоматичною
    // нормалізацією зберігаємо незмінну копію вихідного файла.
    backupSourceBeforeMigration(file, "legacy-room");
    lastReadReport.legacy += 1;
    return validateRoomShape(parsed, expectedCode);
  }

  function parseLegacyCollection(file) {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const candidates = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rooms) ? parsed.rooms : [];
    if (!candidates.length) return [];
    backupSourceBeforeMigration(file, "legacy-collection");
    lastReadReport.legacy += candidates.length;
    return candidates.map((room) => validateRoomShape(room));
  }

  async function saveSnapshot() {
    const current = persistentRooms();
    const validCodes = new Set(current.map((room) => room.code));
    await fs.promises.mkdir(roomsDir, { recursive: true });
    await Promise.all(current.map((room) => atomicWriteJson(path.join(roomsDir, `${room.code}.json`), envelope(room))));
    let names = [];
    try { names = await fs.promises.readdir(roomsDir); } catch {}
    await Promise.all(names
      .filter((name) => name.endsWith(".json") && !validCodes.has(name.slice(0, -5)))
      .map((name) => fs.promises.unlink(path.join(roomsDir, name)).catch(() => {})));
    await atomicWriteJson(manifestFile, { schema, productVersion, savedAt: Date.now(), roomCodes: [...validCodes] });
  }

  function queueSave() {
    // A failed write must not permanently poison the queue for every later save.
    savePromise = savePromise.catch(() => {}).then(async () => {
      try {
        await saveSnapshot();
        reporter?.saveSucceeded?.({ at: Date.now() });
      } catch (error) {
        reporter?.saveFailed?.(error);
        throw error;
      }
    });
    return savePromise;
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      queueSave().catch((error) => logger.error("Помилка збереження кімнат:", error.message));
    }, debounceMs);
    saveTimer.unref?.();
  }

  async function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    return queueSave();
  }

  async function backupSnapshot(label = "manual") {
    const current = persistentRooms();
    if (!current.length) return "skipped-empty";
    const dir = path.join(dataDir, "backups");
    await fs.promises.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await atomicWriteJson(path.join(dir, `${stamp}_rooms_${label}.json`), { schema, productVersion, savedAt: Date.now(), rooms: current });
    const files = (await fs.promises.readdir(dir)).filter((name) => name.includes("_rooms_") && name.endsWith(".json")).sort().reverse();
    await Promise.all(files.slice(backupLimit).map((name) => fs.promises.unlink(path.join(dir, name)).catch(() => {})));
    return "completed";
  }

  function backup(label = "manual") {
    backupPromise = backupPromise
      .catch(() => {})
      .then(async () => {
        try {
          const status = await backupSnapshot(label);
          reporter?.backupSucceeded?.({
            label,
            status,
            at: Date.now()
          });
          return status;
        } catch (error) {
          reporter?.backupFailed?.({ label, error });
          throw error;
        }
      });
    return backupPromise;
  }

  async function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    await saveNow();
    await backupPromise;
  }

  function recordReadError(file, error) {
    const item = {
      file: path.basename(file),
      code: error.code || "ROOM_READ_ERROR",
      message: error.message,
      foundSchema: error.foundSchema || null,
      expectedSchema: error.expectedSchema || null
    };
    lastReadReport.skipped += 1;
    lastReadReport.errors.push(item);
    logger.warn(`Кімнату ${path.basename(file)} пропущено [${item.code}]:`, error.message);
  }

  function read() {
    const loaded = [];
    lastReadReport = { loaded: 0, skipped: 0, legacy: 0, errors: [], preMigrationBackups: [] };

    if (fs.existsSync(roomsDir)) {
      for (const name of fs.readdirSync(roomsDir).filter((item) => item.endsWith(".json"))) {
        const file = path.join(roomsDir, name);
        try {
          loaded.push(parseCurrentRoomFile(file, name.slice(0, -5)));
        } catch (error) {
          recordReadError(file, error);
        }
      }
    }

    if (!loaded.length) {
      // Поточний manifest містить лише roomCodes, тому як legacy-джерела
      // розглядаємо лише файли, в яких справді є масив кімнат.
      for (const file of [manifestFile, ...legacyFiles]) {
        if (!fs.existsSync(file)) continue;
        try {
          const candidates = parseLegacyCollection(file);
          if (candidates.length) {
            loaded.push(...candidates);
            break;
          }
        } catch (error) {
          recordReadError(file, error);
        }
      }
    }

    lastReadReport.loaded = loaded.length;
    return loaded;
  }

  function getReadReport() {
    return {
      ...lastReadReport,
      errors: lastReadReport.errors.map((item) => ({ ...item })),
      preMigrationBackups: [...lastReadReport.preMigrationBackups]
    };
  }

  return { manifestFile, roomsDir, persistentRooms, saveNow, saveAsync: saveNow, saveSoon, backup, flush, read, getReadReport };
}

module.exports = { createRoomStore, createDataError, validateRoomShape };

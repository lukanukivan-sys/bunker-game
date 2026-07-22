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

function createRoomStore({ dataDir, schema, productVersion, ttlMs, getRooms, legacyFiles = [], backupLimit = 12, debounceMs = 180, logger = console }) {
  const manifestFile = path.join(dataDir, `${schema}.json`);
  const roomsDir = path.join(dataDir, schema);
  let saveTimer = null;
  let savePromise = Promise.resolve();
  let backupPromise = Promise.resolve();

  const persistentRooms = (now = Date.now()) => [...getRooms()].filter((room) => now - Number(room.updatedAt || room.createdAt || now) < ttlMs);
  const envelope = (room) => ({ schema, productVersion, savedAt: Date.now(), room });

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
    savePromise = savePromise.catch(() => {}).then(saveSnapshot);
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
    if (!current.length) return;
    const dir = path.join(dataDir, "backups");
    await fs.promises.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await atomicWriteJson(path.join(dir, `${stamp}_rooms_${label}.json`), { schema, productVersion, savedAt: Date.now(), rooms: current });
    const files = (await fs.promises.readdir(dir)).filter((name) => name.includes("_rooms_") && name.endsWith(".json")).sort().reverse();
    await Promise.all(files.slice(backupLimit).map((name) => fs.promises.unlink(path.join(dir, name)).catch(() => {})));
  }

  function backup(label = "manual") {
    backupPromise = backupPromise
      .then(() => backupSnapshot(label))
      .catch((error) => logger.warn("Резервну копію кімнат не створено:", error.message));
    return backupPromise;
  }

  async function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    await saveNow();
    await backupPromise;
  }

  function read() {
    const loaded = [];
    if (fs.existsSync(roomsDir)) {
      for (const name of fs.readdirSync(roomsDir).filter((item) => item.endsWith(".json"))) {
        try {
          const parsed = JSON.parse(fs.readFileSync(path.join(roomsDir, name), "utf8"));
          const room = parsed?.room || parsed;
          if (room?.code) loaded.push(room);
        } catch (error) { logger.warn(`Кімнату ${name} пропущено:`, error.message); }
      }
    }
    if (loaded.length) return loaded;
    for (const file of [manifestFile, ...legacyFiles]) {
      if (!fs.existsSync(file)) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        const candidates = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rooms) ? parsed.rooms : [];
        if (candidates.length) return candidates;
      } catch (error) { logger.warn(`Старе збереження ${path.basename(file)} не прочитано:`, error.message); }
    }
    return [];
  }

  return { manifestFile, roomsDir, persistentRooms, saveNow, saveAsync: saveNow, saveSoon, backup, flush, read };
}

module.exports = { createRoomStore };

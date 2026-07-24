"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRoomStore } = require("./lib/room_store");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "skhovyshche-room-store-"));
const schema = "rooms-v6";
const roomsDir = path.join(root, schema);
fs.mkdirSync(roomsDir, { recursive: true });

function write(name, value) {
  fs.writeFileSync(path.join(roomsDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2), "utf8");
}

write("ABC123.json", {
  schema,
  productVersion: "1.2.11",
  savedAt: Date.now(),
  room: { code: "ABC123", players: [], createdAt: Date.now(), updatedAt: Date.now() }
});
write("DEF456.json", {
  schema: "rooms-v7",
  productVersion: "2.0.0",
  room: { code: "DEF456", players: [] }
});
write("GHI789.json", { code: "GHI789", players: [], createdAt: Date.now(), updatedAt: Date.now() });
write("BAD000.json", "{ this is not json");
write("WRONG1.json", {
  schema,
  productVersion: "1.2.11",
  room: { code: "OTHER1", players: [] }
});

const warnings = [];
const store = createRoomStore({
  dataDir: root,
  schema,
  productVersion: "1.2.11",
  ttlMs: 30 * 24 * 60 * 60 * 1000,
  getRooms: () => [],
  logger: {
    warn: (...args) => warnings.push(args.join(" ")),
    error: (...args) => warnings.push(args.join(" "))
  }
});

try {
  const rooms = store.read();
  assert.deepStrictEqual(rooms.map((room) => room.code).sort(), ["ABC123", "GHI789"]);

  const report = store.getReadReport();
  assert.strictEqual(report.loaded, 2);
  assert.strictEqual(report.legacy, 1);
  assert.strictEqual(report.skipped, 3);
  assert(report.errors.some((item) => item.code === "ROOM_SCHEMA_MISMATCH"));
  assert(report.errors.some((item) => item.code === "ROOM_READ_ERROR"));
  assert(report.errors.some((item) => item.code === "ROOM_FILENAME_MISMATCH"));
  assert.strictEqual(report.preMigrationBackups.length, 1);
  assert(fs.existsSync(report.preMigrationBackups[0]));
  assert(warnings.length >= 3);

  const backupPayload = JSON.parse(fs.readFileSync(report.preMigrationBackups[0], "utf8"));
  assert.strictEqual(backupPayload.code, "GHI789");

  console.log("✅ Room store: schema mismatch ізольовано, legacy-джерело збережено до міграції.");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-reasons-"));
const port = 35650 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function ready() {
  for (let i = 0; i < 70; i += 1) {
    try { if ((await api("/api/ready")).ready) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
async function action(code, session, name, extra = {}) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: name, ...extra });
}
async function state(code, session) {
  return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`);
}
async function stop() {
  await stopChildProcess(child);
}

(async () => {
  const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  for (const id of ["reasonJournal", "roundEventReasonReport", "gameLog"]) assert(html.includes(`id="${id}"`), `missing ${id}`);
  assert(app.includes("function reasonReportHtml"));
  assert(app.includes("function updateRepairPreview"));
  assert(app.includes("function updateTreatmentPreview"));
  assert(css.includes(".reason-report"));
  assert(server.includes('type: "treatment"'));
  assert(server.includes('visibility: "participants"'));

  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  const host = await api("/api/rooms/create", "POST", { name: "Host", mode: "advanced", advancedModules: ["operations", "medicine"], setting: "modern", capacity: 3, rounds: 3, revealsPerRound: 1, characterSetMode: "compact" });
  const sessions = [host];
  for (const name of ["P2", "P3", "P4"]) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name });
    sessions.push(joined);
    await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");
  await action(host.code, host, "next_phase"); // discussion
  await action(host.code, host, "next_phase"); // operations

  let current = await state(host.code, host);
  assert.equal(current.game.phase, "operations");
  assert(current.game.operations.expeditions.length > 0);
  assert(current.game.operations.expeditions[0].preview?.label);
  assert.equal(Object.prototype.hasOwnProperty.call(current.game.operations.expeditions[0], "requiredSkills"), false);
  assert(/прихованими/i.test(current.game.operations.expeditions[0].preview.explanation));
  assert(current.game.operations.repairPreviews.length > 0);

  const route = current.game.operations.expeditions[0];
  await action(host.code, host, "launch_expedition", { locationId: route.id, playerIds: [host.playerId] });
  current = await state(host.code, host);
  const expedition = current.game.operations.history.find((item) => item.type === "expedition");
  assert(expedition?.reasonReport, "expedition report missing");
  assert.equal(expedition.reasonReport.type, "expedition");
  assert(Number.isFinite(expedition.reasonReport.chance.finalPercent));
  assert(expedition.reasonReport.factors.length >= 4);
  assert(current.game.reasonLog.some((item) => item.type === "expedition"));

  const module = current.game.shelter.modules[0];
  await action(host.code, host, "repair_module", { moduleId: module.id, workerId: host.playerId });
  current = await state(host.code, host);
  const repair = current.game.operations.history.find((item) => item.type === "repair");
  assert(repair?.reasonReport, "repair report missing");
  assert.equal(repair.reasonReport.costs[0].value, "−3%");
  assert(Number.isFinite(repair.reasonReport.chance.rollPercent));

  await action(host.code, host, "next_phase"); // event
  current = await state(host.code, host);
  assert.equal(current.game.phase, "event");
  assert(current.game.event.choices.every((choice) => choice.preview?.explanation && choice.chanceTone));
  const choiceId = current.game.event.choices[0].id;
  await action(host.code, host, "event_vote", { choiceId });
  await action(host.code, host, "resolve_event");
  current = await state(host.code, host);
  assert(current.game.event.reasonReport, "event reason report missing");
  assert.equal(current.game.event.reasonReport.type, "event");
  assert(Number.isFinite(current.game.event.reasonReport.chance.finalPercent));
  assert(Number.isFinite(current.game.event.reasonReport.chance.rollPercent));
  assert(current.game.reasonLog.some((item) => item.type === "event"));
  assert(current.game.log.some((line) => /Шанс \d+%/.test(line)));

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.10: якісні прев’ю, точні післядійні звіти та журнал причин перевірені.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

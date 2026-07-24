"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-team-ops-"));
const port = 35900 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null, expectError = false) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (expectError) return { response, payload };
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
async function action(code, session, name, extra = {}, expectError = false) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: name, ...extra }, expectError);
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
  assert(app.includes("operationSupportBoardHtml"));
  assert(app.includes('sendAction("set_operation_support"'));
  assert(app.includes("не більше трьох гравців"));
  assert(css.includes(".operation-support-board"));
  assert(server.includes("OPERATION_SUPPORT_ROLES"));
  assert(server.includes('case "set_operation_support"'));

  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await ready();

  const host = await api("/api/rooms/create", "POST", { name: "Host", mode: "advanced", advancedModules: ["operations"], setting: "modern", capacity: 3, rounds: 3, revealsPerRound: 1, characterSetMode: "compact" });
  const sessions = [host];
  for (const name of ["Gear", "Comms", "Guard", "Repair", "Field"]) {
    const joined = await api("/api/rooms/join", "POST", { code: host.code, name });
    sessions.push(joined);
    await action(host.code, joined, "ready", { value: true });
  }
  await action(host.code, host, "start");
  await action(host.code, host, "next_phase"); // discussion
  await action(host.code, host, "next_phase"); // operations

  await action(host.code, sessions[1], "set_operation_support", { roleId: "equipment" });
  await action(host.code, sessions[2], "set_operation_support", { roleId: "communications" });
  await action(host.code, sessions[3], "set_operation_support", { roleId: "guard" });
  await action(host.code, sessions[4], "set_operation_support", { roleId: "repair_assist" });

  let current = await state(host.code, host);
  assert.equal(current.game.phase, "operations");
  assert.equal(current.game.operations.supportContributions.length, 4);
  assert.equal(current.game.hostDashboard.operations.supportSubmitted, 4);
  assert(current.players.find((p) => p.id === sessions[1].playerId).operationSupport?.roleId === "equipment");
  assert(current.game.operations.repairPreviews.some((item) => item.supportCount >= 1));

  const route = current.game.operations.expeditions[0];
  await action(host.code, host, "launch_expedition", { locationId: route.id, playerIds: [host.playerId, sessions[4].playerId, sessions[5].playerId] });
  current = await state(host.code, host);
  const expedition = current.game.operations.history.find((item) => item.type === "expedition");
  assert(expedition, "expedition missing");
  assert.equal(expedition.playerIds.length, 3, "three field participants should be allowed");
  assert.deepEqual(new Set(expedition.supportPlayerIds), new Set([sessions[1].playerId, sessions[2].playerId, sessions[3].playerId]));
  assert(expedition.reasonReport.factors.some((item) => item.label === "Підготовка спорядження" && item.value > 0));
  assert(expedition.reasonReport.factors.some((item) => item.label === "Зв’язок і координація" && item.value > 0));
  assert(expedition.reasonReport.factors.some((item) => item.label === "Охорона сховища"));
  assert.equal(current.game.operations.supportContributions.find((item) => item.playerId === sessions[1].playerId).usedFor, "expedition");
  assert.equal(current.game.operations.supportContributions.find((item) => item.playerId === sessions[4].playerId).usedFor, null, "repair support must remain available");

  const locked = await action(host.code, sessions[1], "set_operation_support", { roleId: "repair_assist" }, true);
  assert(!locked.response.ok && /уже використано/i.test(locked.payload.error || ""));

  const module = current.game.shelter.modules[0];
  await action(host.code, host, "repair_module", { moduleId: module.id, workerId: host.playerId });
  current = await state(host.code, host);
  const repair = current.game.operations.history.find((item) => item.type === "repair");
  assert(repair, "repair missing");
  assert(repair.supportPlayerIds.includes(sessions[4].playerId));
  assert(repair.reasonReport.factors.some((item) => item.label === "Допомога ремонтної бригади" && item.value > 0));
  assert.equal(current.game.operations.supportContributions.find((item) => item.playerId === sessions[4].playerId).usedFor, "repair");
  assert(current.game.log.some((line) => /бере на себе внесок/.test(line)));

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.10: командні ролі, експедиція на трьох і ремонтна бригада перевірені.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

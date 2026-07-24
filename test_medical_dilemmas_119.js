"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-medical-dilemmas-"));
const port = 36150 + Math.floor(Math.random() * 150);
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
  for (let i = 0; i < 80; i += 1) {
    try { if ((await api("/api/ready")).ready) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server timeout");
}
function start() {
  child = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return ready();
}
async function stop() {
  await stopChildProcess(child);
}
async function action(code, session, actionName, extra = {}, expectError = false) {
  return api(`/api/rooms/${code}/action`, "POST", { playerId: session.playerId, token: session.token, action: actionName, ...extra }, expectError);
}
async function state(code, session) {
  return api(`/api/rooms/${code}/state?playerId=${session.playerId}&token=${session.token}`);
}

(async () => {
  const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert(server.includes("CARE_APPROACHES"));
  for (const id of ["urgent", "conserve", "observe", "quarantine", "risky"]) assert(server.includes(`${id}: {`), `missing ${id}`);
  assert(server.includes("Неізольований заразний стан створив додатковий тиск"));
  assert(app.includes('id="careApproach"'));
  assert(app.includes('approach: $("careApproach").value'));
  assert(css.includes(".care-dilemma-grid"));

  await start();
  const host = await api("/api/rooms/create", "POST", { name: "Host", mode: "advanced", advancedModules: ["medicine"], setting: "modern", capacity: 2, rounds: 3, revealsPerRound: 1, characterSetMode: "compact" });
  const p2 = await api("/api/rooms/join", "POST", { code: host.code, name: "Patient" });
  const p3 = await api("/api/rooms/join", "POST", { code: host.code, name: "QuarantineDoctor" });
  const p4 = await api("/api/rooms/join", "POST", { code: host.code, name: "RiskDoctor" });
  for (const session of [p2, p3, p4]) await action(host.code, session, "ready", { value: true });
  await action(host.code, host, "start");
  await stop();

  const saveFile = path.join(dataDir, "rooms-v6", `${host.code}.json`);
  const savedEnvelope = JSON.parse(fs.readFileSync(saveFile, "utf8"));
  const room = savedEnvelope.room;
  assert(room?.game, "saved room missing");
  room.game.phase = "operations";
  room.game.shelter.resources.medicine = 70;
  room.game.shelter.resources.morale = 70;
  const byId = Object.fromEntries(room.players.map((item) => [item.id, item]));
  for (const session of [host, p3, p4]) {
    const healer = byId[session.playerId];
    healer.character.profession = "Лікар невідкладної допомоги";
    healer.character.skill = "Польова медицина";
    healer.character.role = { id: "survivor", name: "Мешканець", faction: "Громада", objective: "Вижити" };
    healer.character.careUsedRound = null;
  }
  const patient = byId[p2.playerId];
  patient.character.health = "Грип";
  patient.character.medicalCondition = {
    id: "condition_test_flu", name: "Грип", type: "Інфекційний", severity: 3, initialSeverity: 3,
    treatedRound: null, treatmentsReceived: 0, failedTreatments: 0, stableRounds: 0, worsenedRounds: 0,
    contagious: true, treatable: true, progressive: true, mortality: 0.1,
    symptoms: "Гарячка й слабкість.", recoveryTime: 7, treatmentCost: 4,
    description: "Тяжкий заразний стан."
  };
  patient.character.injury = 1;
  patient.character.stress = 1;
  patient.character.medicalIsolationUntilRound = null;
  fs.writeFileSync(saveFile, JSON.stringify({ ...savedEnvelope, savedAt: Date.now(), room }, null, 2));

  await start();
  let hostState = await state(host.code, host);
  const privateHost = hostState.self.privateCharacter;
  assert.deepEqual(new Set(privateHost.careApproaches.map((item) => item.id)), new Set(["standard", "urgent", "conserve", "observe", "quarantine", "risky"]));
  const method = privateHost.treatmentOptions.find((item) => item.id === "competence");
  assert(method, "medical competence method missing");
  const previews = privateHost.treatmentPreviews.filter((item) => item.methodId === method.id && item.targetId === p2.playerId);
  const byApproach = Object.fromEntries(previews.map((item) => [item.approachId, item]));
  assert(byApproach.observe.available && byApproach.observe.special === "observe");
  assert(byApproach.quarantine.available && byApproach.quarantine.special === "quarantine");
  assert(byApproach.risky.available, "risky care should be available for severity 3");
  assert(byApproach.urgent.cost > byApproach.standard.cost, "urgent care must cost more");
  assert(byApproach.conserve.cost < byApproach.standard.cost, "conservative care must save shared medicine");

  const medicineBefore = hostState.game.shelter.resources.medicine;
  await action(host.code, host, "provide_care", { targetId: p2.playerId, method: method.id, approach: "observe" });
  hostState = await state(host.code, host);
  let patientState = await state(host.code, p2);
  assert.equal(hostState.game.shelter.resources.medicine, medicineBefore, "observation must not spend medicine");
  assert.equal(patientState.self.privateCharacter.medicalCondition.observedRound, hostState.game.round);
  assert.equal(patientState.self.privateCharacter.medicalCondition.observationBonusUntilRound, hostState.game.round + 1);
  assert(hostState.self.privateCharacter.treatmentPreviews.find((item) => item.methodId === method.id && item.targetId === p2.playerId && item.approachId === "standard").observationBonusPercent === 10);
  assert(hostState.game.operations.history.some((item) => item.type === "treatment" && item.approachId === "observe"));
  const repeated = await action(host.code, host, "provide_care", { targetId: p2.playerId, method: method.id, approach: "standard" }, true);
  assert(!repeated.response.ok && /вже проводили лікування/i.test(repeated.payload.error || ""));

  let p3State = await state(host.code, p3);
  const p3Method = p3State.self.privateCharacter.treatmentOptions.find((item) => item.id === "competence");
  const moraleBefore = p3State.game.shelter.resources.morale;
  await action(host.code, p3, "provide_care", { targetId: p2.playerId, method: p3Method.id, approach: "quarantine" });
  p3State = await state(host.code, p3);
  patientState = await state(host.code, p2);
  assert.equal(p3State.game.shelter.resources.morale, moraleBefore - 2);
  assert(patientState.self.privateCharacter.medicalIsolation, "patient private isolation flag missing");
  assert(p3State.players.find((item) => item.id === p2.playerId).status.medicalIsolation, "public isolation flag missing");
  assert(p3State.game.operations.history.some((item) => item.type === "treatment" && item.approachId === "quarantine"));

  let p4State = await state(host.code, p4);
  const p4Method = p4State.self.privateCharacter.treatmentOptions.find((item) => item.id === "competence");
  const severityBefore = (await state(host.code, p2)).self.privateCharacter.medicalCondition.severity;
  await action(host.code, p4, "provide_care", { targetId: p2.playerId, method: p4Method.id, approach: "risky" });
  p4State = await state(host.code, p4);
  patientState = await state(host.code, p2);
  const riskyHistory = p4State.game.operations.history.find((item) => item.type === "treatment" && item.approachId === "risky");
  assert(riskyHistory?.reasonReport, "risky treatment report missing");
  assert(riskyHistory.reasonReport.factors.some((item) => item.label === "Тактика допомоги" && item.value < 0));
  if (riskyHistory.success) assert(patientState.self.privateCharacter.medicalCondition.severity <= Math.max(0, severityBefore - 2));
  else assert(patientState.self.privateCharacter.medicalCondition.severity >= severityBefore);

  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("1.2.10: медичні тактики, нагляд, карантин, дефіцитні витрати й ризиковане втручання перевірені.");
})().catch(async (error) => {
  console.error(error);
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(1);
});

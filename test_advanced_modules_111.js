"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { stopChildProcess } = require("./test_support");
const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-modules-"));
const port = 35000 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
let child;
async function api(route, method = "GET", body = null, expectError = false) {
  const response = await fetch(base + route, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (expectError) return { response, payload };
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function waitReady() { for (let i=0;i<60;i++){ try { if ((await api("/api/ready")).ready) return; } catch {} await new Promise(r=>setTimeout(r,100)); } throw new Error("server timeout"); }
async function action(room, who, actionName, extra = {}, expectError = false) { return api(`/api/rooms/${room.code}/action`, "POST", { playerId: who.playerId, token: who.token, action: actionName, ...extra }, expectError); }
async function state(room, who = room) { return api(`/api/rooms/${room.code}/state?playerId=${who.playerId}&token=${who.token}`); }
async function create(modules, suffix) {
  const host = await api("/api/rooms/create", "POST", { name:`Host-${suffix}`, mode:"advanced", setting:"modern", advancedModules:modules, rounds:2, capacity:2, revealsPerRound:1 });
  host.sessions=[host];
  for (const name of ["A","B","C"]) { const joined=await api("/api/rooms/join","POST",{code:host.code,name:`${name}-${suffix}`}); host.sessions.push(joined); await action(host,joined,"ready",{value:true}); }
  await action(host,host,"start");
  return host;
}
async function stop() {
  await stopChildProcess(child);
}
(async()=>{
  child=spawn(process.execPath,["server.js"],{cwd:root,env:{...process.env,PORT:String(port),HOST:"127.0.0.1",DATA_DIR:dataDir},stdio:["ignore","ignore","ignore"]});
  await waitReady();
  try {
    const none=await create([],"none"); let s=await state(none);
    assert.deepEqual(s.settings.advancedModules,[]);
    assert.deepEqual(s.game.phaseLoop.map(x=>x.code),["reveal","discussion","event","elimination","round_end"]);
    assert.equal(s.game.features.operations,false); assert.equal(s.game.features.treatment,false); assert.equal(s.game.features.hiddenRoles,false); assert.equal(s.game.features.itemTrade,false); assert.equal(s.game.features.outsidePlay,false);
    assert(s.self.privateCharacter.goal);
    assert.equal(s.game.features.personalGoals,false);

    const ops=await create(["operations"],"ops"); s=await state(ops);
    assert.deepEqual(s.game.phaseLoop.map(x=>x.code),["reveal","discussion","operations","event","elimination","round_end"]);
    assert.equal(s.game.features.operations,true); assert.equal(s.game.features.treatment,false); assert.equal(s.game.operations.enabled,true);
    assert.equal(s.game.social.hiddenRolesEnabled,false);

    const medicine=await create(["medicine"],"med"); s=await state(medicine);
    assert.deepEqual(s.game.phaseLoop.map(x=>x.code),["reveal","discussion","operations","event","elimination","round_end"]);
    assert.equal(s.game.features.operations,false); assert.equal(s.game.features.treatment,true); assert.equal(s.game.operations.enabled,false); assert.equal(s.game.operations.treatmentEnabled,true);
    await action(medicine,medicine,"next_phase"); await action(medicine,medicine,"next_phase"); s=await state(medicine); assert.equal(s.game.phase,"operations");
    const expeditionAttempt=await action(medicine,medicine,"launch_expedition",{locationId:"none",playerIds:[medicine.playerId]},true); assert(expeditionAttempt.response.status>=400); assert(/вимкнено/i.test(expeditionAttempt.payload.error));

    const roles=await create(["roles"],"roles"); s=await state(roles);
    assert.deepEqual(s.game.phaseLoop.map(x=>x.code),["reveal","discussion","intrigue","event","elimination","round_end"]);
    assert.equal(s.game.features.hiddenRoles,true); assert.equal(s.game.features.personalGoals,true); assert.equal(s.game.features.operations,false);
    assert(s.self.privateCharacter.goal);
    const roleIds=s.players.map(p=>p.id); assert.equal(roleIds.length,4);

    const social=await create(["trade","outside"],"social"); s=await state(social);
    assert.deepEqual(s.settings.advancedModules,["trade","outside"]);
    assert.equal(s.game.features.itemTrade,true); assert.equal(s.game.features.outsidePlay,true); assert.equal(s.game.features.hiddenRoles,false);
    assert.deepEqual(s.game.phaseLoop.map(x=>x.code),["reveal","discussion","event","elimination","round_end"]);

    const limited=await create(["operations","medicine","roles","trade"],"limited"); s=await state(limited);
    assert.deepEqual(s.settings.advancedModules,["operations","medicine"]);
    assert.equal(s.game.features.hiddenRoles,false); assert.equal(s.game.features.operations,true); assert.equal(s.game.features.treatment,true);

    const defaults=await create(undefined,"default"); s=await state(defaults);
    assert.deepEqual(s.settings.advancedModules,["operations"]);
    assert.deepEqual(s.game.phaseLoop.map(x=>x.code),["reveal","discussion","operations","event","elimination","round_end"]);

    const html=fs.readFileSync(path.join(root,"public","index.html"),"utf8");
    const app=fs.readFileSync(path.join(root,"public","app.js"),"utf8");
    assert(html.includes('id="advancedModulesPicker"')); assert(html.includes('id="lobbyAdvancedModulesPicker"'));
    assert(app.includes("ADVANCED_MODULE_INFO")); assert(app.includes("selectedAdvancedModules"));
    console.log("1.2.10: модульний розширений режим перевірено.");
  } finally { await stop(); fs.rmSync(dataDir,{recursive:true,force:true}); }
})().catch(async e=>{console.error(e);await stop();fs.rmSync(dataDir,{recursive:true,force:true});process.exit(1);});

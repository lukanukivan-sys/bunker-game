"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { getFreePort, sleep, stopChildProcess, testServerEnv } = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bunker-state-privacy-"));
const seed = "PRIVACY-SEED-212";
let child = null;
let base = null;
let stderr = "";

async function request(route, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set("content-type", "application/json");
  const response = await fetch(`${base}${route}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function ok(route, options = {}) {
  const result = await request(route, options);
  assert.equal(result.response.ok, true, `${route}: ${result.response.status} ${JSON.stringify(result.payload)}`);
  return result.payload;
}

async function state(session) {
  return ok(`/api/rooms/${session.code}/state`, {
    headers: {
      "x-player-id": session.playerId,
      "x-player-token": session.token
    }
  });
}

async function action(session, actionName, extra = {}) {
  return ok(`/api/rooms/${session.code}/action`, {
    method: "POST",
    body: {
      playerId: session.playerId,
      token: session.token,
      action: actionName,
      ...extra
    }
  });
}

async function waitReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const health = await request("/api/health");
      if (health.response.ok) return;
    } catch {}
    await sleep(75);
  }
  throw new Error(`Сервер не запустився: ${stderr}`);
}

(async () => {
  try {
    const port = await getFreePort();
    base = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ["server.js"], {
      cwd: root,
      env: testServerEnv({
        DATA_DIR: dataDir,
        HOST: "127.0.0.1",
        PORT: String(port)
      }),
      stdio: ["ignore", "ignore", "pipe"]
    });
    child.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
    await waitReady();

    const created = await ok("/api/rooms/create", {
      method: "POST",
      body: {
        name: "Хост",
        mode: "classic",
        setting: "modern",
        capacity: 2,
        rounds: 2,
        revealsPerRound: 1,
        characterSetMode: "compact",
        generationSeed: seed
      }
    });
    const host = { code: created.code, playerId: created.playerId, token: created.token };

    const sessions = [host];
    for (const name of ["Гравець 2", "Гравець 3", "Гравець 4"]) {
      const joined = await ok("/api/rooms/join", {
        method: "POST",
        body: { code: created.code, name }
      });
      const session = { code: created.code, playerId: joined.playerId, token: joined.token };
      sessions.push(session);
      await action(session, "ready", { value: true });
    }

    const hostLobby = await state(host);
    const guestLobby = await state(sessions[1]);

    assert.equal(hostLobby.generation.seed, seed, "Хост повинен бачити seed у лобі");
    assert.equal(hostLobby.generation.seedVisible, true);
    assert.equal(hostLobby.settings.generationSeed, seed);

    assert.equal(guestLobby.generation.seed, null, "Гість не повинен бачити seed у лобі");
    assert.equal(guestLobby.generation.seedVisible, false);
    assert.equal(guestLobby.generation.seedVisibility, "host-only");
    assert.equal(guestLobby.settings.generationSeed, null);
    assert.equal(JSON.stringify(guestLobby).includes(seed), false, "Seed не повинен траплятися в гостьовому JSON");

    const revisionBeforeReads = hostLobby.revision;
    const repeatedReadA = await state(host);
    const repeatedReadB = await state(host);
    assert.equal(repeatedReadA.revision, revisionBeforeReads, "GET стану не повинен змінювати ревізію кімнати");
    assert.equal(repeatedReadB.revision, revisionBeforeReads, "Повторний GET не повинен змінювати ревізію кімнати");

    await action(host, "start");
    const activeHost = await state(host);
    const activeGuest = await state(sessions[1]);

    for (const payload of [activeHost, activeGuest]) {
      assert.equal(payload.generation.seed, null, "Seed активної партії має бути прихований");
      assert.equal(payload.generation.seedVisible, false);
      assert.equal(payload.generation.seedVisibility, "hidden-active-game");
      assert.equal(payload.settings.generationSeed, null);
      assert.equal(JSON.stringify(payload).includes(seed), false, "Seed не повинен витікати через активний стан або журнал");
      assert.match(payload.generation.configCode, /^CFG-/);
      assert.match(payload.generation.fingerprint, /^GEN-/);
    }

    const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
    const stateStart = source.indexOf('const stateMatch = pathname.match(/^\\/api\\/rooms\\/([A-Z0-9]{6})\\/state$/)');
    const actionStart = source.indexOf('const actionMatch = pathname.match(/^\\/api\\/rooms\\/([A-Z0-9]{6})\\/action$/)', stateStart);
    assert(stateStart >= 0 && actionStart > stateStart, "Не вдалося знайти блок маршруту стану");
    const stateRouteSource = source.slice(stateStart, actionStart);
    assert.equal(/player\.lastSeen\s*=/.test(stateRouteSource), false, "GET маршруту заборонено змінювати lastSeen у збереженому гравцеві");
    assert.equal(/player\.connected\s*=\s*true/.test(stateRouteSource), false, "GET маршруту заборонено змінювати connected у збереженому гравцеві");
    assert(stateRouteSource.includes("markPlayerPresence(room, player)"), "GET має оновлювати лише runtime-присутність");

    console.log("✅ Public state privacy: seed приховано під час партії, а GET оновлює лише runtime-присутність.");
  } finally {
    await stopChildProcess(child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  console.error(stderr);
  process.exitCode = 1;
});

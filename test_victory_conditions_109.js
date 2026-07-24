"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { PRODUCT_VERSION } = require("./config/version");
const {
  getFreePort,
  sleep,
  stopChildProcess,
  testServerEnv
} = require("./test_support");

const root = __dirname;
const dataDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "bunker-victory-")
);

const SERVER_START_ATTEMPTS = 5;
const SERVER_READY_ATTEMPTS = 80;
const SERVER_READY_INTERVAL_MS = 80;

let child = null;
let childStderr = "";
let port = null;
let base = null;

/**
 * Виконує запит до тестового сервера.
 *
 * @param {string} route
 * @param {string} method
 * @param {object | null} body
 * @returns {Promise<any>}
 */
async function api(route, method = "GET", body = null) {
  if (!base) {
    throw new Error("Адресу тестового сервера ще не визначено.");
  }

  const response = await fetch(base + route, {
    method,
    headers: body
      ? {
          "Content-Type": "application/json"
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.error || `HTTP ${response.status}`
    );
  }

  return payload;
}

/**
 * Очікує готовності тестового сервера.
 *
 * @returns {Promise<void>}
 */
async function waitReady() {
  for (
    let index = 0;
    index < SERVER_READY_ATTEMPTS;
    index += 1
  ) {
    if (
      child &&
      (
        child.exitCode !== null ||
        child.signalCode !== null
      )
    ) {
      const details = childStderr.trim();

      throw new Error(
        details
          ? `Сервер завершився до готовності:\n${details}`
          : "Сервер завершився до готовності."
      );
    }

    try {
      const health = await api("/api/health");

      if (health.ok) {
        return;
      }
    } catch {
      // Сервер іще може запускатися.
    }

    await sleep(SERVER_READY_INTERVAL_MS);
  }

  const details = childStderr.trim();

  throw new Error(
    details
      ? `Сервер не запустився вчасно:\n${details}`
      : "Сервер не запустився вчасно."
  );
}

/**
 * Зупиняє поточний дочірній сервер.
 *
 * @returns {Promise<void>}
 */
async function stop() {
  const processToStop = child;
  child = null;

  await stopChildProcess(processToStop);
}

/**
 * Запускає тестовий сервер на вільному порту.
 *
 * Якщо між перевіркою порту та запуском його встигає зайняти
 * інший процес, виконується повторна спроба.
 *
 * @returns {Promise<void>}
 */
async function startServer() {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= SERVER_START_ATTEMPTS;
    attempt += 1
  ) {
    await stop();

    port = await getFreePort();
    base = `http://127.0.0.1:${port}`;
    childStderr = "";

    child = spawn(
      process.execPath,
      ["server.js"],
      {
        cwd: root,
        env: testServerEnv({
          DATA_DIR: dataDir,
          PORT: String(port),
          HOST: "127.0.0.1"
        }),
        stdio: [
          "ignore",
          "ignore",
          "pipe"
        ]
      }
    );

    child.stderr?.on("data", (chunk) => {
      childStderr += chunk.toString();
    });

    try {
      await waitReady();
      return;
    } catch (error) {
      lastError = error;

      const portCollision =
        childStderr.includes("EADDRINUSE") ||
        String(error?.message || "").includes("EADDRINUSE");

      await stop();

      if (
        portCollision &&
        attempt < SERVER_START_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error(
    "Не вдалося запустити тестовий сервер."
  );
}

/**
 * Виконує дію гравця.
 *
 * @param {string} code
 * @param {{ playerId: string, token: string }} session
 * @param {string} actionName
 * @param {object} extra
 * @returns {Promise<any>}
 */
async function action(
  code,
  session,
  actionName,
  extra = {}
) {
  return api(
    `/api/rooms/${code}/action`,
    "POST",
    {
      playerId: session.playerId,
      token: session.token,
      action: actionName,
      ...extra
    }
  );
}

/**
 * Отримує персоналізований стан кімнати.
 *
 * @param {string} code
 * @param {{ playerId: string, token: string }} session
 * @returns {Promise<any>}
 */
async function state(code, session) {
  return api(
    `/api/rooms/${code}/state` +
      `?playerId=${encodeURIComponent(session.playerId)}` +
      `&token=${encodeURIComponent(session.token)}`
  );
}

/**
 * Створює та запускає кімнату.
 *
 * @param {string} mode
 * @param {string} setting
 * @returns {Promise<{
 *   code: string,
 *   host: any,
 *   sessions: any[]
 * }>}
 */
async function createStartedRoom(
  mode,
  setting = "modern"
) {
  const host = await api(
    "/api/rooms/create",
    "POST",
    {
      name: `Host-${mode}-${setting}`,
      mode,
      setting,
      capacity: 3,
      rounds: 2,
      revealsPerRound: 1,
      characterSetMode: "compact",
      voteSystem: "exile",
      tieRule: "no_action"
    }
  );

  const sessions = [host];

  const lobby = await state(host.code, host);

  assert(lobby.victoryRules?.group?.objective);
  assert(lobby.victoryRules?.personal?.objective);
  assert(lobby.victoryRules?.special);
  assert(lobby.victoryRules?.end?.objective);

  for (let index = 2; index <= 4; index += 1) {
    const joined = await api(
      "/api/rooms/join",
      "POST",
      {
        code: host.code,
        name: `P${index}-${mode}-${setting}`
      }
    );

    sessions.push(joined);

    await action(
      host.code,
      joined,
      "ready",
      {
        value: true
      }
    );
  }

  await action(
    host.code,
    host,
    "start"
  );

  return {
    code: host.code,
    host,
    sessions
  };
}

/**
 * Автоматично проводить кімнату до фіналу.
 *
 * @param {{
 *   code: string,
 *   host: any,
 *   sessions: any[]
 * }} room
 * @returns {Promise<any>}
 */
async function autoplay(room) {
  const byId = new Map(
    room.sessions.map((session) => [
      session.playerId,
      session
    ])
  );

  for (let guard = 0; guard < 80; guard += 1) {
    const hostState = await state(
      room.code,
      room.host
    );

    if (hostState.game.phase === "final") {
      return hostState;
    }

    const phase = hostState.game.phase;

    if (phase === "reveal") {
      const pending =
        hostState.game.hostDashboard.players.filter(
          (row) => row.phaseState.code === "pending"
        );

      for (const row of pending) {
        const session = byId.get(row.id);

        assert(
          session,
          `Не знайдено сеанс гравця ${row.id}.`
        );

        const own = await state(
          room.code,
          session
        );

        const key = Object.keys(
          own.self.privateCharacter.values
        ).find(
          (item) =>
            !own.self.privateCharacter.revealed[item]
        );

        if (key) {
          await action(
            room.code,
            session,
            "reveal",
            {
              key
            }
          );
        }
      }

      await action(
        room.code,
        room.host,
        "next_phase"
      );

      continue;
    }

    if (
      [
        "discussion",
        "planning",
        "negotiation",
        "intrigue",
        "investigation",
        "operations"
      ].includes(phase)
    ) {
      await action(
        room.code,
        room.host,
        "next_phase"
      );

      continue;
    }

    if (phase === "event") {
      if (!hostState.game.event.resolved) {
        const choiceId =
          hostState.game.event.choices[0].id;

        const pending =
          hostState.game.hostDashboard.players.filter(
            (row) => row.phaseState.code === "pending"
          );

        for (const row of pending) {
          const session = byId.get(row.id);

          assert(
            session,
            `Не знайдено сеанс гравця ${row.id}.`
          );

          await action(
            room.code,
            session,
            "event_vote",
            {
              choiceId
            }
          );
        }

        await action(
          room.code,
          room.host,
          "resolve_event"
        );
      }

      await action(
        room.code,
        room.host,
        "next_phase"
      );

      continue;
    }

    if (phase === "elimination") {
      const pending =
        hostState.game.hostDashboard.players.filter(
          (row) => row.phaseState.code === "pending"
        );

      for (const row of pending) {
        const session = byId.get(row.id);

        assert(
          session,
          `Не знайдено сеанс гравця ${row.id}.`
        );

        await action(
          room.code,
          session,
          "elimination_vote",
          {
            targetId: "__skip__",
            sanction: "exile"
          }
        );
      }

      await action(
        room.code,
        room.host,
        "next_phase"
      );

      continue;
    }

    if (phase === "round_end") {
      await action(
        room.code,
        room.host,
        "next_phase"
      );

      continue;
    }

    throw new Error(
      `Невідома фаза: ${phase}`
    );
  }

  throw new Error(
    "Перевищено ліміт кроків autoplay."
  );
}

(async () => {
  try {
    const html = fs.readFileSync(
      path.join(root, "public", "index.html"),
      "utf8"
    );

    const css = fs.readFileSync(
      path.join(root, "public", "styles.css"),
      "utf8"
    );

    const app = fs.readFileSync(
      path.join(root, "public", "app.js"),
      "utf8"
    );

    for (
      const id of [
        "createVictoryRules",
        "lobbyVictoryRules",
        "victoryRulesPanel",
        "victoryRulesCards",
        "finalVictorySummary"
      ]
    ) {
      assert(
        html.includes(`id="${id}"`),
        `Відсутній елемент ${id}.`
      );
    }

    assert(
      css.includes(".victory-rule-grid"),
      "Відсутній стиль .victory-rule-grid."
    );

    assert(
      css.includes(".final-victory-grid"),
      "Відсутній стиль .final-victory-grid."
    );

    assert(
      app.includes("function renderVictoryRules()"),
      "Відсутня функція renderVictoryRules()."
    );

    assert(
      app.includes(
        "function renderFinalVictorySummary()"
      ),
      "Відсутня функція renderFinalVictorySummary()."
    );

    await startServer();

    const cases = [
      ["classic", "modern"],
      ["survival", "modern"],
      ["factions", "modern"],
      ["advanced", "modern"],
      ["classic", "detective"]
    ];

    for (const [mode, setting] of cases) {
      const room = await createStartedRoom(
        mode,
        setting
      );

      const activeHost = await state(
        room.code,
        room.host
      );

      assert(
        activeHost.game.victoryRules?.group?.objective
      );

      assert(
        activeHost.game.victoryRules?.personal?.objective
      );

      assert(
        activeHost.game.victoryRules?.special?.objective
      );

      if (
        mode === "classic" &&
        setting !== "detective"
      ) {
        assert.equal(
          activeHost.game.victoryRules.special.enabled,
          false
        );
      }

      if (setting === "detective") {
        assert.notEqual(
          activeHost.game.victoryRules.special.title,
          "Додаткова умова"
        );
      }

      const finalState = await autoplay(room);

      assert(finalState.game.final.groupResult);

      assert.equal(
        finalState.game.final.personalResults.length,
        4
      );

      assert.equal(
        finalState.game.final.personalGoals.length,
        4
      );

      assert.equal(
        finalState.game.final.roleResults.length,
        4
      );

      assert(finalState.game.victorySummary?.group);
      assert(finalState.game.victorySummary?.personal);
      assert(finalState.game.victorySummary?.special);

      if (setting === "detective") {
        assert(
          finalState.game.final.roleResults.every(
            (result) =>
              [
                "Організатор злочину",
                "Співучасник",
                "Учасник розслідування"
              ].includes(result.role)
          )
        );
      }
    }

    console.log(
      `${PRODUCT_VERSION}: групові, особисті та спеціальні ` +
      "умови перемоги перевірено для всіх режимів і детективу."
    );
  } finally {
    await stop();

    fs.rmSync(
      dataDir,
      {
        recursive: true,
        force: true
      }
    );
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

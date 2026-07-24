"use strict";

const net = require("node:net");

const DEFAULT_GRACE_MS = 1_200;
const DEFAULT_FORCE_MS = 2_500;

/**
 * Затримка на вказану кількість мілісекунд.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Закриває стандартні потоки дочірнього процесу.
 *
 * @param {import("node:child_process").ChildProcess | null | undefined} child
 */
function destroyChildStreams(child) {
  for (const stream of [child?.stdin, child?.stdout, child?.stderr]) {
    try {
      stream?.destroy?.();
    } catch {
      // Потік уже міг бути закритий.
    }
  }
}

/**
 * Коректно завершує дочірній процес.
 *
 * Спочатку надсилає SIGTERM. Якщо процес не завершився за graceMs,
 * надсилає SIGKILL. Після forceMs припиняє очікування в будь-якому разі.
 *
 * @param {import("node:child_process").ChildProcess | null | undefined} child
 * @param {{ graceMs?: number, forceMs?: number }} options
 * @returns {Promise<void>}
 */
async function stopChildProcess(
  child,
  {
    graceMs = DEFAULT_GRACE_MS,
    forceMs = DEFAULT_FORCE_MS
  } = {}
) {
  if (!child) return;

  if (child.exitCode !== null || child.signalCode !== null) {
    destroyChildStreams(child);
    return;
  }

  await new Promise((resolve) => {
    let settled = false;
    let forceTimer = null;
    let finalTimer = null;

    const finish = () => {
      if (settled) return;
      settled = true;

      if (forceTimer) {
        clearTimeout(forceTimer);
        forceTimer = null;
      }

      if (finalTimer) {
        clearTimeout(finalTimer);
        finalTimer = null;
      }

      child.removeListener("exit", finish);
      child.removeListener("close", finish);

      resolve();
    };

    child.once("exit", finish);
    child.once("close", finish);

    forceTimer = setTimeout(() => {
      if (
        child.exitCode === null &&
        child.signalCode === null
      ) {
        try {
          child.kill("SIGKILL");
        } catch {
          // Процес уже міг завершитися.
        }
      }
    }, Math.max(0, Number(graceMs) || DEFAULT_GRACE_MS));

    forceTimer.unref?.();

    finalTimer = setTimeout(
      finish,
      Math.max(
        Number(forceMs) || DEFAULT_FORCE_MS,
        Number(graceMs) || DEFAULT_GRACE_MS
      )
    );

    finalTimer.unref?.();

    try {
      child.kill("SIGTERM");
    } catch {
      finish();
    }
  });

  destroyChildStreams(child);
}

/**
 * Знаходить тимчасово вільний TCP-порт.
 *
 * Операційна система сама вибирає порт через listen(0).
 * Після визначення порт одразу звільняється, щоб його міг використати тестовий сервер.
 *
 * @param {string} host
 * @returns {Promise<number>}
 */
function getFreePort(host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();

    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;

      try {
        probe.close();
      } catch {
        // Сервер міг ще не почати слухати.
      }

      reject(error);
    };

    probe.unref();

    probe.once("error", fail);

    probe.listen(
      {
        host,
        port: 0,
        exclusive: true
      },
      () => {
        const address = probe.address();

        const port =
          address &&
          typeof address === "object" &&
          Number.isInteger(address.port)
            ? address.port
            : null;

        if (!port) {
          fail(new Error("Не вдалося визначити вільний тестовий порт."));
          return;
        }

        probe.close((error) => {
          if (settled) return;

          if (error) {
            fail(error);
            return;
          }

          settled = true;
          probe.removeListener("error", fail);
          resolve(port);
        });
      }
    );
  });
}

/**
 * Формує середовище для запуску тестового сервера.
 *
 * @param {NodeJS.ProcessEnv} extra
 * @returns {NodeJS.ProcessEnv}
 */
function testServerEnv(extra = {}) {
  return {
    ...process.env,
    NODE_ENV: "test",
    ...extra
  };
}

module.exports = {
  destroyChildStreams,
  getFreePort,
  sleep,
  stopChildProcess,
  testServerEnv
};

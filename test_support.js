"use strict";

const DEFAULT_GRACE_MS = 1_200;
const DEFAULT_FORCE_MS = 2_500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function destroyChildStreams(child) {
  for (const stream of [child?.stdin, child?.stdout, child?.stderr]) {
    try { stream?.destroy?.(); } catch {}
  }
}

async function stopChildProcess(child, { graceMs = DEFAULT_GRACE_MS, forceMs = DEFAULT_FORCE_MS } = {}) {
  if (!child) return;
  if (child.exitCode !== null || child.signalCode) {
    destroyChildStreams(child);
    return;
  }

  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(forceTimer);
      clearTimeout(finalTimer);
      resolve();
    };
    child.once("exit", finish);
    child.once("close", finish);

    try { child.kill("SIGTERM"); } catch { finish(); return; }

    const forceTimer = setTimeout(() => {
      if (child.exitCode === null && !child.signalCode) {
        try { child.kill("SIGKILL"); } catch {}
      }
    }, graceMs);
    forceTimer.unref?.();

    const finalTimer = setTimeout(finish, forceMs);
    finalTimer.unref?.();
  });

  destroyChildStreams(child);
}

function testServerEnv(extra = {}) {
  return { ...process.env, NODE_ENV: "test", ...extra };
}

module.exports = { destroyChildStreams, sleep, stopChildProcess, testServerEnv };

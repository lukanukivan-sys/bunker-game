"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DEFAULT_TIMEOUT_MS = Math.max(5_000, Number(process.env.TEST_TIMEOUT_MS || 45_000));
const TEST_RUNTIME_SETUP = path.join(ROOT, "test_runtime_setup.js");
const NETWORK_TESTS = new Set(["test_network_load_123.js"]);
const EXCLUDED = new Set(["run_all_tests.js", "test_support.js", "test_runtime_setup.js"]);

function discoverTests() {
  return fs.readdirSync(ROOT)
    .filter((name) => /^test_.*\.js$/u.test(name) && !EXCLUDED.has(name))
    .sort((a, b) => a.localeCompare(b, "uk"));
}

function runTest(file, index, total) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, ["--require", TEST_RUNTIME_SETUP, path.join(ROOT, file)], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: "test", TEST_RUNNER: "1" },
      stdio: ["ignore", "inherit", "inherit"],
      detached: process.platform !== "win32"
    });
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const completed = { file, durationMs: Date.now() - startedAt, ...result };
      console.log(`${completed.ok ? "✅" : "❌"} ${file} завершено за ${(completed.durationMs / 1000).toFixed(1)} с${completed.timedOut ? " — тайм-аут" : ""}`);
      resolve(completed);
    };
    child.on("error", (error) => finish({ ok: false, code: null, error: error.message }));
    child.on("close", (code, signal) => finish({ ok: code === 0, code, signal }));
    const terminateTree = (signal) => {
      try {
        if (process.platform === "win32") child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch {}
    };
    const timer = setTimeout(() => {
      terminateTree("SIGTERM");
      setTimeout(() => terminateTree("SIGKILL"), 1_000).unref();
      finish({ ok: false, code: null, timedOut: true, error: `Перевищено тайм-аут ${DEFAULT_TIMEOUT_MS} мс` });
    }, DEFAULT_TIMEOUT_MS);
    console.log(`\n[${index + 1}/${total}] ${file}`);
  });
}

async function main() {
  const unitOnly = process.argv.includes("--unit");
  const tests = discoverTests().filter((file) => !unitOnly || !NETWORK_TESTS.has(file));
  const results = [];
  for (let index = 0; index < tests.length; index += 1) results.push(await runTest(tests[index], index, tests.length));
  const failed = results.filter((item) => !item.ok);
  console.log("\n=== ПІДСУМОК ТЕСТІВ ===");
  for (const result of results) console.log(`${result.ok ? "✅" : "❌"} ${result.file} (${(result.durationMs / 1000).toFixed(1)} с)${result.timedOut ? " — тайм-аут" : ""}`);
  console.log(`\nПройдено: ${results.length - failed.length}/${results.length}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

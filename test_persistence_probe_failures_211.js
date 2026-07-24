"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createPersistenceStatus
} = require("./lib/persistence_status");

const roots = [];
const logger = {
  error() {},
  warn() {},
  log() {}
};

function tempDir(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), `bunker-probe-${label}-`)
  );
  roots.push(dir);
  return dir;
}

function probeFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.startsWith(".persistence-probe-"));
}

function probeFs(overrides = {}) {
  return new Proxy(fs.promises, {
    get(target, property) {
      if (Object.prototype.hasOwnProperty.call(overrides, property)) {
        return overrides[property];
      }
      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}

function manager(dir, injectedProbeFs = fs.promises) {
  return createPersistenceStatus({
    env: {
      NODE_ENV: "test",
      PERSISTENCE_MODE: "ephemeral-allowed"
    },
    dataDir: dir,
    rawDataDir: dir,
    logger,
    probeFs: injectedProbeFs,
    processInstanceId: `probe-test-${path.basename(dir)}`
  });
}

function assertProbeFailure(status, code) {
  const payload = status.publicReadiness();
  assert.equal(payload.ready, false);
  assert.equal(payload.persistence.writable, false);
  assert.equal(payload.persistence.startupProbe.status, "failed");
  assert.equal(payload.persistence.startupProbe.error.code, code);
  assert(
    payload.errors.some((item) => item.code === code),
    `Expected readiness error ${code}`
  );
}

async function testWriteFailure() {
  const dir = tempDir("write");
  const injected = probeFs({
    async writeFile() {
      const error = new Error("simulated write failure");
      error.code = "EACCES";
      throw error;
    }
  });
  const status = manager(dir, injected);

  assert.equal(await status.initializeStorage(), false);
  assertProbeFailure(status, "PROBE_WRITE_FAILED");
  assert.deepStrictEqual(probeFiles(dir), []);
}

async function testReadFailure() {
  const dir = tempDir("read");
  const injected = probeFs({
    async readFile() {
      const error = new Error("simulated read failure");
      error.code = "EIO";
      throw error;
    }
  });
  const status = manager(dir, injected);

  assert.equal(await status.initializeStorage(), false);
  assertProbeFailure(status, "PROBE_READ_FAILED");
  assert.deepStrictEqual(probeFiles(dir), []);
}

async function testContentMismatch() {
  const dir = tempDir("mismatch");
  const status = manager(dir, probeFs({
    async readFile() {
      return "not-the-written-control-content";
    }
  }));

  assert.equal(await status.initializeStorage(), false);
  assertProbeFailure(status, "PROBE_CONTENT_MISMATCH");
  assert.deepStrictEqual(probeFiles(dir), []);
}

async function testDeleteFailure() {
  const dir = tempDir("delete");
  let failOnce = true;
  const status = manager(dir, probeFs({
    async unlink(file) {
      if (failOnce) {
        failOnce = false;
        const error = new Error("simulated delete failure");
        error.code = "EACCES";
        throw error;
      }
      return fs.promises.unlink(file);
    }
  }));

  assert.equal(await status.initializeStorage(), false);
  assertProbeFailure(status, "PROBE_DELETE_FAILED");
  assert.deepStrictEqual(probeFiles(dir), []);
}

async function testFileStillExistsAfterCleanup() {
  const dir = tempDir("cleanup-remains");
  const status = manager(dir, probeFs({
    async unlink() {
      const error = new Error("probe file remains");
      error.code = "EACCES";
      throw error;
    }
  }));

  assert.equal(await status.initializeStorage(), false);
  assertProbeFailure(status, "PROBE_DELETE_FAILED");
  assert.equal(probeFiles(dir).length, 1);
}

async function testSuccessfulProbeRemovesFile() {
  const dir = tempDir("success");
  const status = manager(dir);

  assert.equal(await status.initializeStorage(), true);
  assert.equal(
    status.publicReadiness().persistence.startupProbe.status,
    "passed"
  );
  assert.deepStrictEqual(probeFiles(dir), []);
}

async function main() {
  try {
    await testWriteFailure();
    await testReadFailure();
    await testContentMismatch();
    await testDeleteFailure();
    await testFileStillExistsAfterCleanup();
    await testSuccessfulProbeRemovesFile();
    console.log(
      "✅ Probe write/read/content/delete/cleanup regressions verified."
    );
  } finally {
    for (const root of roots) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

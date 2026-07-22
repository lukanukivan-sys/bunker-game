"use strict";

const crypto = require("crypto");
const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

function normalizeSeed(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 64);
}

function createSeededRandom(seed, schema = "default") {
  const digest = crypto.createHash("sha256").update(`${schema}|${normalizeSeed(seed)}`).digest();
  let state = digest.readUInt32LE(0) || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function random() {
  const scoped = storage.getStore();
  return scoped?.rng ? scoped.rng() : Math.random();
}

function runWithRandom(rng, callback) {
  if (typeof rng !== "function") throw new TypeError("rng має бути функцією.");
  return storage.run({ rng }, callback);
}

function runWithSeed(seed, schema, callback) {
  return runWithRandom(createSeededRandom(seed, schema), callback);
}

function randomInt(min, max, rng = random) {
  const low = Math.ceil(Number(min));
  const high = Math.floor(Number(max));
  if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) throw new RangeError("Некоректний діапазон випадкового числа.");
  return low + Math.floor(rng() * (high - low + 1));
}

function sample(array, rng = random) {
  return Array.isArray(array) && array.length ? array[Math.floor(rng() * array.length)] : undefined;
}

function shuffle(array, rng = random) {
  const result = [...(array || [])];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

module.exports = { normalizeSeed, createSeededRandom, random, runWithRandom, runWithSeed, randomInt, sample, shuffle };

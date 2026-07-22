"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { summarizeCarryover } = require("./content/campaign_legacy");
const { analyzePack: analyzeContentPack } = require("./content/pack_analyzer");
const { PLATFORM_SCHEMA } = require("./config/version");

function uid(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}
function token() { return crypto.randomBytes(24).toString("hex"); }
function recoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(15);
  const raw = [...bytes].map((value) => alphabet[value % alphabet.length]).join("");
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}`;
}
function normalizeRecoveryCode(value) { return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function assertStrongPassword(password) {
  const value = String(password || "");
  const classes = [/[a-zа-яіїєґ]/u, /[A-ZА-ЯІЇЄҐ]/u, /\d/u, /[^\p{L}\p{N}]/u].filter((pattern) => pattern.test(value)).length;
  if (value.length < 10) throw new Error("Пароль має містити щонайменше 10 символів.");
  if (value.length < 14 && classes < 3) throw new Error("Пароль до 14 символів має містити щонайменше три типи знаків: великі й малі літери, цифри або спецсимволи.");
  return value;
}
function newSession(rawToken, meta = {}) {
  return { id: uid("session"), tokenHash: authTokenHash(rawToken), createdAt: Date.now(), lastSeenAt: Date.now(), label: safeName(meta.label, 80) || "Пристрій", ipHint: safeName(meta.ipHint, 80) || null };
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function safeName(value, max = 64) { return String(value || "").trim().slice(0, max); }
function normalizeUsername(value) { return safeName(value, 32).toLocaleLowerCase("uk").replace(/\s+/g, "_"); }
function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temp, file);
}
function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; }
  catch { return fallback; }
}
function passwordHash(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}
function authTokenHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
function compareHex(a, b) {
  try {
    const one = Buffer.from(String(a), "hex");
    const two = Buffer.from(String(b), "hex");
    return one.length === two.length && crypto.timingSafeEqual(one, two);
  } catch { return false; }
}
function publicStats(stats = {}) {
  const games = Number(stats.games || 0);
  return {
    games,
    survived: Number(stats.survived || 0),
    successfulSettlements: Number(stats.successfulSettlements || 0),
    averageScore: games ? Math.round(Number(stats.totalScore || 0) / games) : 0,
    bestScore: Number(stats.bestScore || 0),
    treatments: Number(stats.treatments || 0),
    expeditions: Number(stats.expeditions || 0),
    repairs: Number(stats.repairs || 0),
    favoriteSetting: Object.entries(stats.settings || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    favoriteMode: Object.entries(stats.modes || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  };
}

const ENTRY_CATEGORIES = new Set([
  "origins", "professions", "health", "skills", "items", "secrets",
  "traits", "hobbies", "phobias", "anomalies", "relationships"
]);
const ADVANCED_CATEGORIES = new Set(["catastrophes", "shelters", "events", "expeditions"]);
const LEVELS = new Set(["normal", "odd", "absurd"]);
const SETTING_IDS = new Set(["all", "modern", "fantasy", "space", "postapocalypse", "cyberpunk", "horror", "detective"]);
function uniqueId(value, prefix, index) {
  const raw = safeName(value, 80).replace(/[^A-Za-z0-9_-]/g, "_");
  return raw || `${prefix}_${index + 1}`;
}
function normalizeAdvanced(key, items) {
  const ids = new Set();
  return (Array.isArray(items) ? items : []).slice(0, 250).map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Категорія ${key}: запис ${index + 1} має бути об’єктом.`);
    if (key === "catastrophes") {
      const title = safeName(item.title, 120); if (!title) throw new Error(`Катастрофа ${index + 1}: немає назви.`);
      return { ...item, title, description: safeName(item.description, 600), threat: safeName(item.threat, 80) || "Невідома загроза" };
    }
    if (key === "shelters") {
      const title = safeName(item.title, 120); if (!title) throw new Error(`Сховище ${index + 1}: немає назви.`);
      const modules = (item.modules || []).map((value) => safeName(value, 80)).filter(Boolean).slice(0, 20);
      if (!modules.length) throw new Error(`Сховище «${title}»: додайте хоча б один модуль.`);
      return { ...item, title, description: safeName(item.description, 600), modules, areaM2: clamp(Number(item.areaM2) || 500, 50, 200000), roomCount: clamp(Number(item.roomCount) || modules.length + 4, 1, 1000), rooms: Array.isArray(item.rooms) ? item.rooms.slice(0, 100) : [], provisions: Array.isArray(item.provisions) ? item.provisions.slice(0, 100) : [] };
    }
    const id = uniqueId(item.id, key === "events" ? "event" : "expedition", index);
    if (ids.has(id)) throw new Error(`Категорія ${key}: повторюється id «${id}».`); ids.add(id);
    if (key === "events") {
      const title = safeName(item.title, 120); const choices = Array.isArray(item.choices) ? item.choices : [];
      if (!title || choices.length < 2) throw new Error(`Подія ${index + 1}: потрібна назва і щонайменше два рішення.`);
      const choiceIds = new Set();
      return { ...item, id, title, description: safeName(item.description, 600), choices: choices.slice(0, 8).map((choice, cIndex) => {
        const choiceId = uniqueId(choice?.id, "choice", cIndex); if (choiceIds.has(choiceId)) throw new Error(`Подія «${title}»: повторюється id рішення «${choiceId}».`); choiceIds.add(choiceId);
        return { ...choice, id: choiceId, label: safeName(choice?.label, 160) || `Рішення ${cIndex + 1}`, success: clamp(Number(choice?.success) || 0.5, 0.05, 0.98), good: choice?.good && typeof choice.good === "object" ? choice.good : {}, bad: choice?.bad && typeof choice.bad === "object" ? choice.bad : {}, goodText: safeName(choice?.goodText, 500), badText: safeName(choice?.badText, 500) };
      }) };
    }
    const name = safeName(item.name, 120); if (!name) throw new Error(`Експедиція ${index + 1}: немає назви.`);
    return { ...item, id, name, description: safeName(item.description, 600), difficulty: clamp(Number(item.difficulty) || 3, 1, 6), tags: Array.isArray(item.tags) ? item.tags.map((tag) => safeName(tag, 40)).filter(Boolean).slice(0, 12) : [], success: item.success && typeof item.success === "object" ? item.success : {}, failure: item.failure && typeof item.failure === "object" ? item.failure : {} };
  });
}

function normalizeEntry(item) {
  if (typeof item === "string") return { name: safeName(item, 160), level: "normal" };
  const name = safeName(item?.name, 160);
  if (!name) return null;
  return { ...item, name, level: LEVELS.has(item?.level) ? item.level : "normal" };
}
function dedupeEntries(items) {
  const seen = new Set();
  return (items || []).map(normalizeEntry).filter(Boolean).filter((item) => {
    const key = item.name.toLocaleLowerCase("uk");
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function validatePack(input, ownerAccountId = null, existingId = null) {
  const name = safeName(input?.name, 80);
  const requestedSetting = safeName(input?.setting, 32) || "modern";
  const setting = SETTING_IDS.has(requestedSetting) ? requestedSetting : "modern";
  if (!name) throw new Error("Вкажіть назву набору.");
  const entries = {};
  for (const key of ENTRY_CATEGORIES) entries[key] = dedupeEntries(input?.entries?.[key]);
  for (const key of ADVANCED_CATEGORIES) entries[key] = normalizeAdvanced(key, input?.entries?.[key]);
  const total = Object.values(entries).reduce((sum, list) => sum + list.length, 0);
  if (total > 3000) throw new Error("У наборі забагато записів. Максимум — 3000.");
  return {
    id: existingId || uid("pack"),
    ownerAccountId,
    name,
    description: safeName(input?.description, 300),
    compatibility: ["compatible", "experimental", "cosmetic"].includes(input?.compatibility) ? input.compatibility : null,
    setting,
    public: Boolean(input?.public),
    entries,
    createdAt: Number(input?.createdAt || Date.now()),
    updatedAt: Date.now(),
    schemaVersion: 1
  };
}

function createPlatform(baseDir, dataDirOverride = null) {
  const dataDir = dataDirOverride ? path.resolve(dataDirOverride) : path.join(baseDir, "data");
  const files = {
    accounts: path.join(dataDir, "accounts_v1.json"),
    campaigns: path.join(dataDir, "campaigns_v1.json"),
    packs: path.join(dataDir, "content_packs_v1.json"),
    stats: path.join(dataDir, "statistics_v1.json")
  };
  const accounts = new Map((readJson(files.accounts, []) || []).map((item) => {
    if (!item.authTokenHash && item.authToken) item.authTokenHash = authTokenHash(item.authToken);
    item.sessions = Array.isArray(item.sessions) ? item.sessions : [];
    if (item.authTokenHash) item.sessions.push({ id: uid("legacy_session"), tokenHash: item.authTokenHash, createdAt: item.lastSeenAt || item.createdAt || Date.now(), lastSeenAt: item.lastSeenAt || Date.now(), label: "Старий сеанс" });
    item.sessions = item.sessions.filter((session) => session?.tokenHash).slice(-8);
    item.recoveryCodeHash ||= null;
    delete item.authToken;
    delete item.authTokenHash;
    return [item.id, item];
  }));
  const campaigns = new Map((readJson(files.campaigns, []) || []).map((item) => {
    item.chapters = Array.isArray(item.chapters) ? item.chapters : [];
    item.carryover ||= { version: 2, sourceChapter: null, resources: {}, allies: 0, legacy: [] };
    item.carryover.version ||= 1;
    item.carryover.resources ||= {};
    item.carryover.legacy = Array.isArray(item.carryover.legacy) ? item.carryover.legacy : [];
    return [item.id, item];
  }));
  const packs = new Map((readJson(files.packs, []) || []).map((item) => [item.id, item]));
  const globalStats = readJson(files.stats, {
    games: 0, totalScore: 0, bestScore: 0, settings: {}, modes: {},
    players: 0, births: 0, deaths: 0, startedAt: Date.now(), recentGames: []
  });
  const failedLogins = new Map();
  const MAX_SESSIONS = 8;

  let saveTimer = null;
  function saveAllNow() {
    atomicWrite(files.accounts, [...accounts.values()]);
    atomicWrite(files.campaigns, [...campaigns.values()]);
    atomicWrite(files.packs, [...packs.values()]);
    atomicWrite(files.stats, globalStats);
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { saveAllNow(); } catch (error) { console.error("Помилка збереження платформи:", error.message); }
    }, 180);
  }
  function backup(label = "startup") {
    try {
      const backupDir = path.join(dataDir, "backups");
      fs.mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const snapshot = {
        createdAt: Date.now(), label,
        accounts: [...accounts.values()], campaigns: [...campaigns.values()], packs: [...packs.values()], globalStats
      };
      atomicWrite(path.join(backupDir, `${stamp}_${label}.json`), snapshot);
      const old = fs.readdirSync(backupDir).filter((name) => name.endsWith(".json")).sort().reverse().slice(12);
      for (const name of old) fs.unlinkSync(path.join(backupDir, name));
    } catch (error) { console.warn("Резервну копію платформи не створено:", error.message); }
  }
  function authenticate(accountId, authToken) {
    const account = accounts.get(String(accountId || ""));
    if (!account || !authToken) return null;
    const hash = authTokenHash(authToken);
    const session = (account.sessions || []).find((item) => compareHex(item.tokenHash, hash));
    if (!session) return null;
    session.lastSeenAt = Date.now();
    account.lastSeenAt = session.lastSeenAt;
    return account;
  }
  function publicAccount(account) {
    if (!account) return null;
    return {
      id: account.id, username: account.username, displayName: account.displayName,
      createdAt: account.createdAt, stats: publicStats(account.stats),
      sessionCount: (account.sessions || []).length, platformSchema: PLATFORM_SCHEMA,
      campaignCount: [...campaigns.values()].filter((item) => item.ownerAccountId === account.id).length,
      packCount: [...packs.values()].filter((item) => item.ownerAccountId === account.id).length
    };
  }
  function register(body) {
    const username = normalizeUsername(body?.username);
    const displayName = safeName(body?.displayName || body?.username, 32);
    const password = assertStrongPassword(body?.password);
    if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username)) throw new Error("Логін має містити 3–32 літери, цифри або символи _ . -");
    if (accountsHasUsername(username)) throw new Error("Такий логін уже існує.");
    const salt = crypto.randomBytes(16).toString("hex");
    const rawToken = token();
    const rawRecoveryCode = recoveryCode();
    const account = {
      id: uid("account"), username, displayName, salt, passwordHash: passwordHash(password, salt),
      sessions: [newSession(rawToken, body?.session || {})], recoveryCodeHash: authTokenHash(normalizeRecoveryCode(rawRecoveryCode)),
      createdAt: Date.now(), lastSeenAt: Date.now(),
      stats: { games: 0, survived: 0, successfulSettlements: 0, totalScore: 0, bestScore: 0, treatments: 0, expeditions: 0, repairs: 0, settings: {}, modes: {} }
    };
    accounts.set(account.id, account); saveSoon();
    return { account: publicAccount(account), accountId: account.id, token: rawToken, recoveryCode: rawRecoveryCode };
  }
  function accountsHasUsername(username) {
    return [...accounts.values()].some((item) => item.username === username);
  }
  function login(body) {
    const username = normalizeUsername(body?.username);
    const password = String(body?.password || "");
    const now = Date.now();
    const attempt = failedLogins.get(username) || { count: 0, blockedUntil: 0 };
    if (attempt.blockedUntil > now) {
      const seconds = Math.ceil((attempt.blockedUntil - now) / 1000);
      const error = new Error(`Забагато невдалих входів. Повторіть через ${seconds} с.`);
      error.status = 429;
      throw error;
    }
    const account = [...accounts.values()].find((item) => item.username === username);
    if (!account || !compareHex(account.passwordHash, passwordHash(password, account.salt))) {
      attempt.count += 1;
      attempt.blockedUntil = attempt.count >= 5 ? now + Math.min(15 * 60_000, 30_000 * 2 ** Math.min(4, attempt.count - 5)) : 0;
      failedLogins.set(username, attempt);
      throw new Error("Неправильний логін або пароль.");
    }
    failedLogins.delete(username);
    const rawToken = token();
    account.sessions ||= [];
    account.sessions.push(newSession(rawToken, body?.session || {}));
    account.sessions = account.sessions.sort((a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0)).slice(0, MAX_SESSIONS);
    account.lastSeenAt = now; saveSoon();
    return { account: publicAccount(account), accountId: account.id, token: rawToken };
  }
  function resetPassword(body) {
    const username = normalizeUsername(body?.username);
    const suppliedRecovery = normalizeRecoveryCode(body?.recoveryCode);
    const password = assertStrongPassword(body?.newPassword);
    const account = [...accounts.values()].find((item) => item.username === username);
    if (!account || !suppliedRecovery || !account.recoveryCodeHash || !compareHex(account.recoveryCodeHash, authTokenHash(suppliedRecovery))) throw new Error("Неправильний логін або резервний код.");
    const salt = crypto.randomBytes(16).toString("hex");
    const rawToken = token();
    const rawRecoveryCode = recoveryCode();
    account.salt = salt;
    account.passwordHash = passwordHash(password, salt);
    account.sessions = [newSession(rawToken, body?.session || {})];
    account.recoveryCodeHash = authTokenHash(normalizeRecoveryCode(rawRecoveryCode));
    account.lastSeenAt = Date.now();
    saveSoon();
    return { account: publicAccount(account), accountId: account.id, token: rawToken, recoveryCode: rawRecoveryCode };
  }
  function listSessions(account, currentToken) {
    const currentHash = authTokenHash(currentToken);
    return (account.sessions || []).map((session) => ({ id: session.id, createdAt: session.createdAt, lastSeenAt: session.lastSeenAt, label: session.label || "Пристрій", ipHint: session.ipHint || null, current: compareHex(session.tokenHash, currentHash) })).sort((a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0));
  }
  function revokeSession(account, sessionId, currentToken) {
    const before = (account.sessions || []).length;
    account.sessions = (account.sessions || []).filter((session) => session.id !== String(sessionId || ""));
    if (account.sessions.length === before) throw new Error("Сеанс не знайдено.");
    saveSoon();
    return { sessions: listSessions(account, currentToken) };
  }
  function createCampaign(account, body) {
    const campaign = {
      id: uid("campaign"), ownerAccountId: account.id, name: safeName(body?.name, 80) || "Нова кампанія",
      description: safeName(body?.description, 300), setting: safeName(body?.setting, 32) || "modern",
      createdAt: Date.now(), updatedAt: Date.now(), archived: false, chapters: [],
      carryover: { version: 2, sourceChapter: null, resources: {}, allies: 0, legacy: [] }
    };
    campaigns.set(campaign.id, campaign); saveSoon(); return campaign;
  }
  function listCampaigns(account) {
    return [...campaigns.values()]
      .filter((item) => item.ownerAccountId === account.id)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((item) => ({ ...item, carryoverSummary: summarizeCarryover(item.carryover || {}) }));
  }
  function getCampaign(id) { return campaigns.get(String(id || "")) || null; }
  function campaignForRoom(account, id) {
    const campaign = getCampaign(id);
    return campaign && account && campaign.ownerAccountId === account.id && !campaign.archived ? campaign : null;
  }
  function analyzePack(body, options = {}) {
    return analyzeContentPack(body?.pack || body || {}, options);
  }
  function createPack(account, body) {
    const pack = validatePack(body, account.id);
    packs.set(pack.id, pack); saveSoon(); return pack;
  }
  function updatePack(account, id, body) {
    const old = packs.get(String(id));
    if (!old || old.ownerAccountId !== account.id) throw new Error("Набір не знайдено або немає доступу.");
    const next = validatePack({ ...old, ...body, entries: body?.entries || old.entries }, account.id, old.id);
    next.createdAt = old.createdAt; packs.set(old.id, next); saveSoon(); return next;
  }
  function deletePack(account, id) {
    const old = packs.get(String(id));
    if (!old || old.ownerAccountId !== account.id) throw new Error("Набір не знайдено або немає доступу.");
    packs.delete(old.id); saveSoon(); return true;
  }
  function importPack(account, body) {
    const source = body?.pack || body;
    const pack = validatePack({ ...source, name: safeName(source?.name, 80) || "Імпортований набір" }, account.id);
    packs.set(pack.id, pack); saveSoon(); return pack;
  }
  function listPacks(account = null) {
    return [...packs.values()].filter((item) => item.public || (account && item.ownerAccountId === account.id)).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  function getPack(id) { return packs.get(String(id || "")) || null; }
  function packForRoom(account, id) {
    const pack = getPack(id);
    return pack && (pack.public || (account && pack.ownerAccountId === account.id)) ? pack : null;
  }
  function recordGame(room) {
    if (!room?.game?.final || room.game.platformRecorded) return;
    room.game.platformRecorded = true;
    const final = room.game.final;
    const score = Number(final.score || 0);
    globalStats.games += 1;
    globalStats.totalScore += score;
    globalStats.bestScore = Math.max(globalStats.bestScore || 0, score);
    globalStats.settings[room.settings.setting] = (globalStats.settings[room.settings.setting] || 0) + 1;
    globalStats.modes[room.settings.mode] = (globalStats.modes[room.settings.mode] || 0) + 1;
    globalStats.players += room.players.length;
    globalStats.births += Number(final.longTermSimulation?.demography?.births || 0);
    globalStats.deaths += Number(final.longTermSimulation?.demography?.deaths || 0);
    globalStats.recentGames.unshift({ at: Date.now(), setting: room.settings.setting, mode: room.settings.mode, score, verdict: final.verdict, players: room.players.length });
    globalStats.recentGames = globalStats.recentGames.slice(0, 30);

    for (const player of room.players) {
      if (!player.accountId) continue;
      const account = accounts.get(player.accountId);
      if (!account) continue;
      const stats = account.stats ||= {};
      stats.games = Number(stats.games || 0) + 1;
      stats.totalScore = Number(stats.totalScore || 0) + score;
      stats.bestScore = Math.max(Number(stats.bestScore || 0), score);
      stats.settings ||= {}; stats.settings[room.settings.setting] = (stats.settings[room.settings.setting] || 0) + 1;
      stats.modes ||= {}; stats.modes[room.settings.mode] = (stats.modes[room.settings.mode] || 0) + 1;
      const fate = final.longTermSimulation?.personalFates?.find((item) => item.playerId === player.id);
      if (fate?.alive || final.survivors?.some((item) => item.id === player.id)) stats.survived = Number(stats.survived || 0) + 1;
      if (score >= 60) stats.successfulSettlements = Number(stats.successfulSettlements || 0) + 1;
      stats.treatments = Number(stats.treatments || 0) + Number(player.character?.successfulTreatments || 0);
      stats.expeditions = Number(stats.expeditions || 0) + Number(player.character?.successfulExpeditions || 0);
      stats.repairs = Number(stats.repairs || 0) + Number(player.character?.successfulRepairs || 0);
    }

    const campaign = getCampaign(room.campaignId || room.settings.campaignId);
    if (campaign && campaign.ownerAccountId === room.hostAccountId) {
      const simulation = final.longTermSimulation || {};
      campaign.chapters.push({
        number: campaign.chapters.length + 1, completedAt: Date.now(), roomCode: room.code,
        setting: room.settings.setting, mode: room.settings.mode, score, verdict: final.verdict,
        survivors: (final.survivors || []).map((item) => item.name),
        population: simulation.demography?.endPopulation || final.survivors?.length || 0,
        settlement: simulation.settlement?.stage || "Сховище",
        chronicle: (simulation.chronicle || []).slice(-8),
        legacyOutcome: room.game.campaignLegacy?.dilemma ? {
          title: room.game.campaignLegacy.dilemma.title,
          optionId: room.game.campaignLegacy.dilemma.resolvedOptionId || null,
          resultText: room.game.campaignLegacy.dilemma.resultText || "Дилему не було завершено.",
          automatic: Boolean(room.game.campaignLegacy.dilemma.automatic)
        } : null
      });
      const resources = simulation.finalResources || final.catastrophe?.resources || room.game.shelter?.resources || {};
      campaign.carryover = {
        version: 2,
        sourceChapter: campaign.chapters.length,
        resources: Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, clamp(Math.round((Number(value) - 50) / 15), -4, 6)])),
        allies: clamp(Number(room.game.shelter?.allies || 0), 0, 3),
        legacy: (simulation.settlement?.buildings || []).slice(-2).map((item) => typeof item === "string" ? item : item.name)
      };
      campaign.updatedAt = Date.now();
    }
    saveSoon();
  }
  function publicGlobalStats() {
    const games = Number(globalStats.games || 0);
    return {
      games, players: Number(globalStats.players || 0), averageScore: games ? Math.round(globalStats.totalScore / games) : 0,
      bestScore: Number(globalStats.bestScore || 0), births: Number(globalStats.births || 0), deaths: Number(globalStats.deaths || 0),
      settings: globalStats.settings || {}, modes: globalStats.modes || {}, recentGames: globalStats.recentGames || []
    };
  }

  backup("startup");
  return {
    authenticate, publicAccount, register, login, resetPassword, listSessions, revokeSession, saveSoon, saveAllNow, backup,
    createCampaign, listCampaigns, getCampaign, campaignForRoom,
    createPack, updatePack, deletePack, importPack, listPacks, getPack, packForRoom, analyzePack,
    recordGame, publicGlobalStats, validatePack
  };
}

module.exports = { createPlatform, validatePack, ENTRY_CATEGORIES, ADVANCED_CATEGORIES, analyzeContentPack };

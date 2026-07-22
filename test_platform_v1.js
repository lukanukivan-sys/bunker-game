"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createPlatform, validatePack } = require("./platform");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "shelter-platform-"));
const dataDir = path.join(root, "data");
const platform = createPlatform(root, dataDir);
const registered = platform.register({ username: "tester_one", displayName: "Тестер", password: "Secure-Test-129!" });
assert(registered.accountId && registered.token);
assert.throws(() => platform.register({ username: "tester_one", displayName: "Дубль", password: "Secure-Test-129!" }), /існує/);
const logged = platform.login({ username: "tester_one", password: "Secure-Test-129!" });
const account = platform.authenticate(logged.accountId, logged.token);
assert(account);
const campaign = platform.createCampaign(account, { name: "Тестова кампанія", setting: "modern" });
const pack = platform.createPack(account, {
  name: "Тестовий набір", setting: "modern",
  entries: {
    professions: [{ name: "Тестувальник сховищ", level: "normal" }],
    events: [{ id: "test_event", title: "Тестова подія", description: "Перевірка.", choices: [
      { id: "a", label: "А", success: 1, good: { morale: 1 }, bad: {}, goodText: "Успіх", badText: "Невдача" },
      { id: "b", label: "Б", success: 0.5, good: {}, bad: { morale: -1 }, goodText: "Успіх", badText: "Невдача" }
    ] }]
  }
});
assert(pack.entries.professions.length === 1);
assert.throws(() => validatePack({ name: "Зламаний", entries: { events: [{ id: "x", title: "Без вибору", choices: [] }] } }, account.id), /щонайменше два/);

const mockRoom = {
  code: "ABC123", hostAccountId: account.id, campaignId: campaign.id,
  settings: { setting: "modern", mode: "survival" },
  players: [{ id: "p1", name: "Тестер", accountId: account.id, character: { successfulTreatments: 1, successfulExpeditions: 2, successfulRepairs: 1 } }],
  game: {
    shelter: { allies: 2, resources: { food: 70, water: 60, energy: 55, integrity: 80, medicine: 65, morale: 75 } },
    final: {
      score: 72, verdict: "Стабільне виживання", survivors: [{ id: "p1", name: "Тестер" }],
      longTermSimulation: {
        finalResources: { food: 70, water: 60, energy: 55, integrity: 80, medicine: 65, morale: 75 },
        demography: { births: 2, deaths: 1, endPopulation: 8 },
        settlement: { stage: "Поселення", buildings: ["Майстерня"] },
        personalFates: [{ playerId: "p1", alive: true }], chronicle: []
      }
    }
  }
};
platform.recordGame(mockRoom);
platform.saveAllNow();
assert(platform.publicAccount(account).stats.games === 1);
assert(platform.listCampaigns(account)[0].chapters.length === 1);
assert(platform.publicGlobalStats().games === 1);

const reloaded = createPlatform(root, dataDir);
const relogged = reloaded.login({ username: "tester_one", password: "Secure-Test-129!" });
const reloadedAccount = reloaded.authenticate(relogged.accountId, relogged.token);
assert(reloaded.publicAccount(reloadedAccount).stats.games === 1);
assert(reloaded.listCampaigns(reloadedAccount)[0].chapters.length === 1);
assert(reloaded.listPacks(reloadedAccount).some((item) => item.id === pack.id));
fs.rmSync(root, { recursive: true, force: true });
console.log("Платформні системи 1.2.10 перевірено: профілі, кампанії, набори, статистика й повторне завантаження.");

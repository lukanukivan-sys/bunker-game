"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { COMMON, ABILITY_BALANCE_PROFILES } = require("./content");

assert.equal(COMMON.abilities.length, 105, "Очікується повний набір із 105 здібностей");
assert.equal(Object.keys(ABILITY_BALANCE_PROFILES).length, COMMON.abilities.length, "Кожна здібність повинна мати профіль балансу");
for (const ability of COMMON.abilities) {
  const profile = ABILITY_BALANCE_PROFILES[ability.id];
  assert(profile, `Немає профілю для ${ability.id}`);
  assert.equal(profile.guaranteedSuccess, false, `${ability.id}: гарантований успіх заборонено`);
  assert(["низький", "середній", "високий"].includes(profile.powerTier), `${ability.id}: невідомий рівень сили`);
  for (const key of ["resourceImpact", "survivalImpact", "votingImpact", "informationValue", "costRisk"]) assert(Number.isFinite(profile[key]), `${ability.id}: немає метрики ${key}`);
}
const server = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
assert(!server.includes("game.expeditionAutoSuccess = true"), "Здібності не повинні гарантувати успіх експедиції");
for (const id of ["double_vote", "protect", "persuasion", "intimidation", "loyalty", "charm"]) {
  assert(ABILITY_BALANCE_PROFILES[id].costRisk >= 2, `${id}: сильне втручання в голосування потребує ціни або ризику`);
}
console.log("1.2.10: 105 здібностей мають профілі за 7 параметрами; гарантовані успіхи прибрано, голосувальні здібності мають ціну.");

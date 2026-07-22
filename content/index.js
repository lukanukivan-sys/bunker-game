"use strict";

const COMMON = require("./common");
const RELATIONSHIPS = require("./relationships");
const EVENTS = require("./events");
const EXPEDITIONS = require("./expeditions");
const MEDICAL = require("./medical");
const LORE = require("./lore");
const SHELTER_DETAILS = require("./shelter_details");
const SCENARIOS = require("./scenarios");
const SETTING_RULES = require("./setting_rules");
const ABILITY_BALANCE = require("./ability_balance");

const EXTRA_EVENTS = require("./extra_events");
const EXTRA_EXPEDITIONS = require("./extra_expeditions");
const EXTRA_LORE = require("./extra_lore");
const EXTRA_SHELTER_DETAILS = require("./extra_shelter_details");
const EXTRA_SCENARIOS = require("./extra_scenarios");
const EXTRA_SCENARIO_AXES = require("./extra_scenario_axes");
const STAGE23 = require("./stage23_expansion");

Object.assign(EVENTS, EXTRA_EVENTS);
Object.assign(EXPEDITIONS, EXTRA_EXPEDITIONS);
Object.assign(LORE.CATASTROPHE_LORE, EXTRA_LORE, STAGE23.lore);
Object.assign(SHELTER_DETAILS, EXTRA_SHELTER_DETAILS);
Object.assign(SCENARIOS.DATA, EXTRA_SCENARIOS);
for (const [settingId, axes] of Object.entries(EXTRA_SCENARIO_AXES)) Object.assign(SCENARIOS.DATA[settingId], axes);
for (const [settingId, causes] of Object.entries(STAGE23.scenarioCauses || {})) {
  if (SCENARIOS.DATA[settingId]) SCENARIOS.DATA[settingId].causes.push(...causes);
}
SCENARIOS.validate();

const SETTINGS = {
  modern: require("./modern"),
  fantasy: require("./fantasy"),
  space: require("./space"),
  postapocalypse: require("./postapocalypse"),
  cyberpunk: require("./cyberpunk"),
  horror: require("./horror"),
  detective: require("./detective")
};

// Етап 23 лише додає нові записи. Жоден старий запис не видаляється й не замінюється.
for (const [settingId, additions] of Object.entries(STAGE23.settings || {})) {
  const setting = SETTINGS[settingId];
  if (!setting) continue;
  for (const [key, entries] of Object.entries(additions || {})) {
    if (!Array.isArray(entries)) continue;
    setting[key] ||= [];
    setting[key].push(...entries);
  }
}
for (const [settingId, entries] of Object.entries(STAGE23.events || {})) {
  EVENTS[settingId] ||= [];
  EVENTS[settingId].push(...entries);
}
for (const [settingId, entries] of Object.entries(STAGE23.expeditions || {})) {
  EXPEDITIONS[settingId] ||= [];
  EXPEDITIONS[settingId].push(...entries);
}

ABILITY_BALANCE.applyAbilityDescriptionOverrides(COMMON.abilities);
const ABILITY_BALANCE_PROFILES = ABILITY_BALANCE.buildAbilityBalanceProfiles(COMMON.abilities);

for (const [settingId, setting] of Object.entries(SETTINGS)) {
  const details = SHELTER_DETAILS[settingId] || {};
  setting.shelters = setting.shelters.map((shelter) => ({
    ...shelter,
    ...(details[shelter.title] || {})
  }));
}

const content = { COMMON, SETTINGS, RELATIONSHIPS, EVENTS, EXPEDITIONS, MEDICAL, LORE, SHELTER_DETAILS, SCENARIOS, SETTING_RULES, STAGE23, ABILITY_BALANCE_PROFILES };
require("./validate")(content);

module.exports = content;

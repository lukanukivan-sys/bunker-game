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

const EXTRA_EVENTS = require("./extra_events");
const EXTRA_EXPEDITIONS = require("./extra_expeditions");
const EXTRA_LORE = require("./extra_lore");
const EXTRA_SHELTER_DETAILS = require("./extra_shelter_details");
const EXTRA_SCENARIOS = require("./extra_scenarios");
const EXTRA_SCENARIO_AXES = require("./extra_scenario_axes");

Object.assign(EVENTS, EXTRA_EVENTS);
Object.assign(EXPEDITIONS, EXTRA_EXPEDITIONS);
Object.assign(LORE.CATASTROPHE_LORE, EXTRA_LORE);
Object.assign(SHELTER_DETAILS, EXTRA_SHELTER_DETAILS);
Object.assign(SCENARIOS.DATA, EXTRA_SCENARIOS);
for (const [settingId, axes] of Object.entries(EXTRA_SCENARIO_AXES)) Object.assign(SCENARIOS.DATA[settingId], axes);
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

for (const [settingId, setting] of Object.entries(SETTINGS)) {
  const details = SHELTER_DETAILS[settingId] || {};
  setting.shelters = setting.shelters.map((shelter) => ({
    ...shelter,
    ...(details[shelter.title] || {})
  }));
}

const content = { COMMON, SETTINGS, RELATIONSHIPS, EVENTS, EXPEDITIONS, MEDICAL, LORE, SHELTER_DETAILS, SCENARIOS, SETTING_RULES };
require("./validate")(content);

module.exports = content;

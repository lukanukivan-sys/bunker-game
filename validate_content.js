"use strict";

try {
  const content = require("./content");
  const counts = {
    abilities: content.COMMON.abilities.length,
    relationships: content.RELATIONSHIPS.length,
    events: Object.fromEntries(Object.entries(content.EVENTS).map(([key, value]) => [key, value.length])),
    expeditions: Object.fromEntries(Object.entries(content.EXPEDITIONS).map(([key, value]) => [key, value.length])),
    catastrophes: Object.fromEntries(Object.entries(content.SETTINGS).map(([key, value]) => [key, value.catastrophes.length])),
    shelters: Object.fromEntries(Object.entries(content.SETTINGS).map(([key, value]) => [key, value.shelters.length])),
    shelterRooms: Object.fromEntries(Object.entries(content.SETTINGS).map(([key, value]) => [key, value.shelters.reduce((sum, shelter) => sum + shelter.roomCount, 0)]))
  };
  console.log("Контент перевірено успішно.");
  console.log(JSON.stringify(counts, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}

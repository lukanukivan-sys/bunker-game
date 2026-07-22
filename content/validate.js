"use strict";

const VALID_LEVELS = new Set(["normal", "odd", "absurd"]);
const SETTINGS = ["modern", "fantasy", "space", "postapocalypse", "cyberpunk", "horror", "detective"];
const RESOURCE_KEYS = new Set(["food", "water", "energy", "integrity", "medicine", "morale", "allies", "assets"]);
const TARGETS = new Set(["none", "player", "module"]);

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("uk")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
function entryName(entry) {
  if (typeof entry === "string") return entry;
  return entry?.name || entry?.title || entry?.text || "";
}
function assert(condition, message) {
  if (!condition) throw new Error(`Помилка контенту: ${message}`);
}
function assertUnique(entries, label, getter = entryName) {
  const seen = new Map();
  for (let index = 0; index < entries.length; index += 1) {
    const value = getter(entries[index]);
    const key = normalize(value);
    assert(key, `${label}[${index}] не має назви.`);
    assert(!seen.has(key), `${label}: дубль «${value}» у позиціях ${seen.get(key)} і ${index}.`);
    seen.set(key, index);
  }
}
function validateEntryArray(entries, label) {
  assert(Array.isArray(entries) && entries.length, `${label} має бути непорожнім масивом.`);
  assertUnique(entries, label);
  for (const [index, entry] of entries.entries()) {
    if (typeof entry === "string") {
      assert(entry.trim(), `${label}[${index}] порожній рядок.`);
      continue;
    }
    assert(entry && typeof entry === "object", `${label}[${index}] має некоректний тип.`);
    if (entry.level != null) assert(VALID_LEVELS.has(entry.level), `${label}[${index}] має невідомий level «${entry.level}».`);
  }
}
function validateEffects(effects, label) {
  assert(effects && typeof effects === "object" && !Array.isArray(effects), `${label} має бути об'єктом.`);
  for (const [key, value] of Object.entries(effects)) {
    assert(RESOURCE_KEYS.has(key), `${label} використовує непідтримуваний ефект «${key}».`);
    if (key !== "assets") assert(Number.isFinite(value), `${label}.${key} має бути числом.`);
  }
}
function validateContent(content) {
  const { COMMON, SETTINGS: SETTING_DATA, RELATIONSHIPS, EVENTS, EXPEDITIONS, MEDICAL, LORE, SCENARIOS } = content;

  for (const key of ["sexes", "genderIdentities", "attitudesToChildren", "parentalStatuses", "reproductiveStatuses", "anomalies", "traits", "hobbies", "phobias"]) {
    validateEntryArray(COMMON[key], `COMMON.${key}`);
  }
  assert(Array.isArray(COMMON.abilities) && COMMON.abilities.length, "COMMON.abilities має бути непорожнім масивом.");
  assertUnique(COMMON.abilities, "COMMON.abilities", (ability) => ability.id);
  assertUnique(COMMON.abilities, "COMMON.abilities names", (ability) => ability.name);
  for (const ability of COMMON.abilities) {
    assert(ability.id && ability.name && ability.description, `Здібність ${ability.id || "без id"} неповна.`);
    assert(TARGETS.has(ability.target), `Здібність ${ability.id} має непідтримувану ціль «${ability.target}».`);
  }

  validateEntryArray(RELATIONSHIPS, "RELATIONSHIPS");
  for (const relation of RELATIONSHIPS) assert(String(relation.text || "").includes("{name}"), `Стосунок «${relation.text || "?"}» не містить {name}.`);

  for (const setting of SETTINGS) {
    const data = SETTING_DATA[setting];
    assert(data && typeof data === "object", `Відсутній сетинг ${setting}.`);
    for (const key of ["origins", "professions", "health", "skills", "items", "secrets"]) validateEntryArray(data[key], `${setting}.${key}`);
    if (setting === "detective") {
      for (const key of ["alibis", "motives", "access", "testimonies", "evidenceLinks"]) validateEntryArray(data[key], `${setting}.${key}`);
    }
    validateEntryArray(data.catastrophes, `${setting}.catastrophes`);
    validateEntryArray(data.shelters, `${setting}.shelters`);
    for (const catastrophe of data.catastrophes) {
      assert(catastrophe.title && catastrophe.description && catastrophe.threat, `${setting}: неповна катастрофа.`);
      assert(LORE.CATASTROPHE_LORE[catastrophe.title], `${setting}: немає лору для катастрофи «${catastrophe.title}».`);
    }
    for (const shelter of data.shelters) {
      assert(Array.isArray(shelter.modules) && shelter.modules.length, `${setting}: сховище «${shelter.title}» не має модулів.`);
      assertUnique(shelter.modules, `${setting}.${shelter.title}.modules`, (module) => module);
      assert(Number.isFinite(shelter.areaM2) && shelter.areaM2 > 0, `${setting}: сховище «${shelter.title}» не має коректної площі.`);
      assert(Array.isArray(shelter.rooms) && shelter.rooms.length, `${setting}: сховище «${shelter.title}» не має переліку приміщень.`);
      assertUnique(shelter.rooms, `${setting}.${shelter.title}.rooms`, (room) => room.name);
      const countedRooms = shelter.rooms.reduce((sum, room) => {
        assert(room && room.name && Number.isInteger(room.count) && room.count > 0, `${setting}: некоректне приміщення у сховищі «${shelter.title}».`);
        return sum + room.count;
      }, 0);
      assert(shelter.roomCount === countedRooms, `${setting}: кількість кімнат у сховищі «${shelter.title}» не збігається з переліком (${shelter.roomCount} ≠ ${countedRooms}).`);
      assert(Array.isArray(shelter.provisions) && shelter.provisions.length >= 4, `${setting}: сховище «${shelter.title}» має замало конкретного провіанту.`);
      assertUnique(shelter.provisions, `${setting}.${shelter.title}.provisions`, (item) => item.name);
      for (const item of shelter.provisions) {
        assert(item && item.name && Number.isFinite(item.amount) && item.amount > 0 && item.unit, `${setting}: некоректна позиція провіанту у сховищі «${shelter.title}».`);
        assert(["food", "water", "medicine", "energy", "utility"].includes(item.category), `${setting}: невідома категорія провіанту «${item.category}» у сховищі «${shelter.title}».`);
      }
      assert(shelter.initialResources && typeof shelter.initialResources === "object", `${setting}: сховище «${shelter.title}» не має стартових ресурсів.`);
      for (const key of ["food", "water", "energy", "integrity", "medicine", "morale"]) {
        assert(Number.isFinite(shelter.initialResources[key]) && shelter.initialResources[key] >= 0 && shelter.initialResources[key] <= 100, `${setting}: ресурс ${key} сховища «${shelter.title}» має бути в межах 0–100.`);
      }
    }

    const events = EVENTS[setting];
    assert(Array.isArray(events) && events.length, `EVENTS.${setting} порожній.`);
    assertUnique(events, `EVENTS.${setting}`, (event) => event.id);
    for (const event of events) {
      assert(event.id && event.title && event.description, `EVENTS.${setting}: неповна подія.`);
      if (event.level != null) assert(VALID_LEVELS.has(event.level), `EVENTS.${setting}.${event.id}: невідомий level «${event.level}».`);
      assert(Array.isArray(event.choices) && event.choices.length >= 2, `Подія ${event.id} має замало варіантів.`);
      assertUnique(event.choices, `EVENTS.${setting}.${event.id}.choices`, (choice) => choice.id);
      for (const choice of event.choices) {
        assert(choice.label && Number.isFinite(choice.success) && choice.success >= 0 && choice.success <= 1, `Подія ${event.id}: некоректний варіант ${choice.id}.`);
        validateEffects(choice.good, `EVENTS.${setting}.${event.id}.${choice.id}.good`);
        validateEffects(choice.bad, `EVENTS.${setting}.${event.id}.${choice.id}.bad`);
        assert(choice.goodText && choice.badText, `Подія ${event.id}: немає тексту наслідків.`);
      }
    }

    const expeditions = EXPEDITIONS[setting];
    assert(Array.isArray(expeditions) && expeditions.length, `EXPEDITIONS.${setting} порожній.`);
    assertUnique(expeditions, `EXPEDITIONS.${setting}`, (expedition) => expedition.id);
    for (const expedition of expeditions) {
      assert(expedition.id && expedition.name && expedition.description, `EXPEDITIONS.${setting}: неповна експедиція.`);
      if (expedition.level != null) assert(VALID_LEVELS.has(expedition.level), `EXPEDITIONS.${setting}.${expedition.id}: невідомий level «${expedition.level}».`);
      assert(Array.isArray(expedition.tags), `Експедиція ${expedition.id} не має тегів.`);
      assert(Number.isFinite(expedition.difficulty) && expedition.difficulty >= 1 && expedition.difficulty <= 6, `Експедиція ${expedition.id} має складність поза межами 1–6.`);
      validateEffects(expedition.success, `EXPEDITIONS.${setting}.${expedition.id}.success`);
      validateEffects(expedition.failure, `EXPEDITIONS.${setting}.${expedition.id}.failure`);
    }
    if (setting !== "modern") assert(data.catastrophes.length >= 20, `${setting}: після етапу 23 потрібно щонайменше 20 катастроф.`);
    if (["postapocalypse", "cyberpunk", "horror", "detective"].includes(setting)) {
      assert(events.length >= 25, `${setting}: після етапу 23 потрібно щонайменше 25 подій.`);
      assert(expeditions.length >= 30, `${setting}: після етапу 23 потрібно щонайменше 30 експедицій.`);
      const chaosCount = events.filter((item) => item.level === "absurd").length + expeditions.filter((item) => item.level === "absurd").length;
      assert(chaosCount >= 8, `${setting}: замало контенту для рівня «Повний хаос».`);
    }
  }

  for (const fn of ["severityMeta", "buildMedicalCondition", "treatmentItemMeta", "hasMedicalCompetence"]) {
    assert(typeof MEDICAL[fn] === "function", `MEDICAL не експортує ${fn}().`);
  }
  assert(Array.isArray(MEDICAL.SEVERITY_LEVELS) && MEDICAL.SEVERITY_LEVELS.length === 6, "MEDICAL.SEVERITY_LEVELS має містити рівні 0–5.");
  assert(typeof LORE.enrichCatastrophe === "function", "LORE не експортує enrichCatastrophe().");
  assert(SCENARIOS && typeof SCENARIOS.generate === "function" && typeof SCENARIOS.validate === "function", "SCENARIOS не експортує generate()/validate().");
  SCENARIOS.validate();
  return true;
}

module.exports = validateContent;

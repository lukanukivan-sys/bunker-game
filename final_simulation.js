"use strict";

const crypto = require("crypto");

const RESOURCE_KEYS = ["food", "water", "energy", "integrity", "medicine", "morale"];
const RESOURCE_LABELS = {
  food: "їжа", water: "вода", energy: "енергія", integrity: "цілісність", medicine: "медицина", morale: "мораль"
};

const SETTING_LEXICON = {
  modern: {
    settlement: "нова громада",
    stages: ["аварійне укриття", "організований притулок", "постійне підземне поселення", "самодостатня громада", "регіональний центр відновлення"],
    buildings: ["майстерня запасних частин", "гідропонна теплиця", "розширений медпункт", "навчальна кімната", "радіовежа", "водоочисна лінія", "насіннєвий банк", "карантинний блок"],
    governance: ["рада мешканців", "чергова адміністрація", "технічний комітет", "загальні збори"]
  },
  fantasy: {
    settlement: "захищена громада",
    stages: ["аварійний прихисток", "укріплений притулок", "підземна фортеця", "самодостатній анклав", "нове князівство під захисною печаттю"],
    buildings: ["рунна кузня", "сад цілющих трав", "зал захисних печатей", "школа писарів", "сторожова вежа", "сховище зерна", "ритуальна лікарня", "архів старих чарів"],
    governance: ["рада кланів", "коло хранителів", "магістрат фортеці", "збори вільних мешканців"]
  },
  space: {
    settlement: "автономна колонія",
    stages: ["аварійний житловий модуль", "стабілізована станція", "постійна колонія", "самодостатній орбітальний вузол", "міжколоніальний центр"],
    buildings: ["гідропонний ярус", "фабрикаційний відсік", "розширений медлаб", "навчальний симулятор", "далекий ретранслятор", "резервний кисневий контур", "банк ембріонів", "радіаційний екран"],
    governance: ["рада екіпажу", "оперативне командування", "науково-технічний комітет", "асамблея колоністів"]
  },
  postapocalypse: {
    settlement: "поселення пустки",
    stages: ["тимчасовий табір", "укріплений притулок", "постійне поселення", "самодостатня фортеця пустки", "центр союзу поселень"],
    buildings: ["ремонтний двір", "закрита ферма", "польовий шпиталь", "школа виживання", "радіомаяк", "колодязь із фільтрацією", "склад насіння", "укріплений периметр"],
    governance: ["рада старших", "комітет караванів", "оборонна рада", "загальні збори поселенців"]
  },
  cyberpunk: {
    settlement: "автономний міський вузол",
    stages: ["ізольований безпечний поверх", "контрольований житловий кластер", "автономний квартал", "самодостатня мережева комуна", "незалежний міський сектор"],
    buildings: ["майстерня імплантів", "вертикальна ферма", "кіберклініка", "офлайн-архів", "зашифрований ретранслятор", "контур очищення", "фабрикатор деталей", "екранована серверна"],
    governance: ["рада резидентів", "протокол розподіленого управління", "технократичний комітет", "мережева асамблея"]
  },
  horror: {
    settlement: "осередок тих, хто витримав",
    stages: ["забарикадований прихисток", "контрольована безпечна зона", "укріплена обитель", "самодостатня громада свідків", "мережа захищених осередків"],
    buildings: ["кімната спостереження", "сад заспокійливих трав", "ізольований лазарет", "архів свідчень", "сигнальна вежа", "ритуальний контур", "тиха кімната", "подвійний периметр"],
    governance: ["коло свідків", "рада чергових", "комітет перевірки реальності", "збори громади"]
  },
  detective: {
    settlement: "закрита громада",
    stages: ["тимчасовий штаб", "організований безпечний будинок", "постійний захищений квартал", "самодостатня громада", "центр відновленого правопорядку"],
    buildings: ["кімната доказів", "ремонтна майстерня", "медичний кабінет", "архів свідчень", "радіопункт", "очисна станція", "навчальний клас", "контрольний пост"],
    governance: ["тимчасова слідча рада", "рада мешканців", "комітет довіри", "відновлений магістрат"]
  }
};

const NEGATIVE_RELATIONSHIP_RE = /конфлікт|не довір|зрад|винен|борг|підозр|небезпеч|ворог|відповідальн.*загиб|протилежн|помст|ненавид|компромат/i;
const POSITIVE_RELATIONSHIP_RE = /урят|захищ|довір|друг|борг честі|спільн.*таємниц|працював.*разом|єдиною людиною|клявся/i;
const DIFFICULT_TRAIT_RE = /авторитар|маніпуля|параної|егоїст|ревнив|жадіб|імпульсив|бунтів|нетерпим|брехлив|нарцист|підозрі/i;
const SOCIAL_TRAIT_RE = /співчут|харизмат|великодуш|самовіддан|відповідаль|доброзич|дипломат|мудр|толерант/i;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function round(value) { return Math.round(value); }
function lower(value) { return String(value || "").toLocaleLowerCase("uk"); }
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

function createRng(seedInput) {
  const digest = crypto.createHash("sha256").update(String(seedInput)).digest();
  let state = digest.readUInt32LE(0) ^ digest.readUInt32LE(8) ^ digest.readUInt32LE(16) ^ digest.readUInt32LE(24);
  return function rng() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function choose(rng, items) { return items.length ? items[Math.floor(rng() * items.length)] : null; }
function chance(rng, probability) { return rng() < clamp(probability, 0, 1); }

function isolationHorizonYears(room) {
  const isolation = lower(room.game?.scenario?.modules?.isolation || room.game?.scenario?.isolation || "");
  if (/тиж/.test(isolation)) return 3;
  if (/місяц/.test(isolation)) return 5;
  if (/20|35|поколін/.test(isolation)) return 25;
  if (/невідом|невизнач/.test(isolation)) return 20;
  if (/3|9|рок/.test(isolation)) return 10;
  const lore = lower(room.game?.scenario?.lore?.horizon || "");
  if (/поколін|десятиліт/.test(lore)) return 20;
  return 10;
}

function milestonesFor(horizonYears) {
  const base = [
    { day: 7, label: "День 7", short: "7 днів" },
    { day: 30, label: "День 30", short: "1 місяць" },
    { day: 90, label: "Місяць 3", short: "3 місяці" },
    { day: 180, label: "Місяць 6", short: "6 місяців" },
    { day: 365, label: "Рік 1", short: "1 рік" },
    { day: 1095, label: "Рік 3", short: "3 роки" }
  ];
  if (horizonYears >= 5) base.push({ day: 1825, label: "Рік 5", short: "5 років" });
  if (horizonYears >= 10) base.push({ day: 3650, label: "Рік 10", short: "10 років" });
  if (horizonYears >= 20) base.push({ day: 7300, label: "Рік 20", short: "20 років" });
  if (horizonYears >= 25) base.push({ day: 9125, label: "Рік 25", short: "25 років" });
  const finalDay = horizonYears * 365;
  if (!base.some((item) => item.day === finalDay)) base.push({ day: finalDay, label: `Рік ${horizonYears}`, short: `${horizonYears} років` });
  return base.filter((item) => item.day <= finalDay).sort((a, b) => a.day - b.day);
}

function competenceProfile(players) {
  const profile = { medicine: 0, technical: 0, food: 0, defense: 0, social: 0, science: 0, exploration: 0, education: 0 };
  for (const player of players) {
    const text = lower([player.profession, player.skill, player.hobby, player.trait].join(" "));
    if (/лікар|медик|хірур|парамед|фарма|цілител|знахар|домедич|перша допом|лікув|біолог|ветеринар/.test(text)) profile.medicine += 1.2;
    if (/інженер|механік|електрик|ремонт|звар|слюсар|коваль|технік|програміст|системн|хакер|рунн|корабельн/.test(text)) profile.technical += 1.2;
    if (/агроном|фермер|садів|гідропон|кухар|консерв|рибал|мислив|травник|ботан|харч/.test(text)) profile.food += 1.2;
    if (/військ|охорон|стріль|обор|поліц|мисливець на|тактик|бойов|фехт|збро/.test(text)) profile.defense += 1.1;
    if (/психолог|дипломат|переговор|соціолог|харизмат|співчут|медіатор|учитель|жрець|бард/.test(text)) profile.social += 1.1;
    if (/науков|хімік|фізик|астроном|дослід|лаборатор|археолог|аналітик|детектив|слідч|магістр/.test(text)) profile.science += 1.1;
    if (/орієнтув|навіг|слідопит|розвід|виживан|альпін|пілот|картограф|мандрів|скаут/.test(text)) profile.exploration += 1.1;
    if (/учитель|викладач|бібліотек|архів|письмен|редактор|перекладач|наставник|каліграф/.test(text)) profile.education += 1.1;
    if (SOCIAL_TRAIT_RE.test(text)) profile.social += 0.35;
  }
  return profile;
}

function contributionLabel(person) {
  const text = lower([person.profession, person.skill].join(" "));
  if (/лікар|медик|хірур|парамед|цілител|домедич|лікув/.test(text)) return "організував / організувала медичну службу";
  if (/інженер|механік|електрик|ремонт|звар|технік|програміст|хакер|коваль/.test(text)) return "підтримував / підтримувала критичні системи";
  if (/фермер|агроном|гідропон|садів|кухар|рибал|травник/.test(text)) return "створив / створила стабільне виробництво їжі";
  if (/військ|охорон|поліц|обор|стріль|слідопит/.test(text)) return "відповідав / відповідала за безпеку та розвідку";
  if (/психолог|дипломат|учитель|соціолог|переговор|бард|жрець/.test(text)) return "утримував / утримувала громаду від розколу";
  if (/науков|дослід|хімік|біолог|архів|бібліотек|детектив|слідч/.test(text)) return "зберігав / зберігала знання й аналізував / аналізувала загрози";
  return "працював / працювала там, де громада потребувала найбільше";
}

function medicalSupport(profile, resources, population) {
  return clamp((profile.medicine / Math.max(1, population)) * 0.45 + resources.medicine / 180, 0, 1.1);
}
function technicalSupport(profile, modules, population) {
  const avg = modules.reduce((sum, item) => sum + item.condition, 0) / Math.max(1, modules.length);
  return clamp((profile.technical / Math.max(1, population)) * 0.45 + avg / 180, 0, 1.1);
}

function personFromPlayer(player, demographicsEnabled = true) {
  const c = player.character;
  return {
    id: player.id,
    name: player.name,
    originalPlayer: true,
    alive: Boolean(player.active),
    inside: Boolean(player.active),
    departed: !player.active,
    deathTime: null,
    deathCause: null,
    departureTime: player.active ? null : `Раунд ${player.eliminatedRound || "?"}`,
    age: Number.parseInt(c.age, 10) || 35,
    sex: demographicsEnabled ? (c.sex || c.demographics?.sex || "") : "Не застосовується",
    canBecomePregnant: demographicsEnabled ? (c.canBecomePregnant ?? c.demographics?.canBecomePregnant ?? (/жіноч|інтерсекс/i.test(c.sex || "") ? "possible" : false)) : false,
    reproductiveStatus: demographicsEnabled ? (c.reproductiveStatus || c.demographics?.reproductiveStatus || "") : "Не застосовується",
    attitudeToChildren: demographicsEnabled ? (c.attitudeToChildren || c.demographics?.attitudeToChildren || "") : "Не застосовується",
    parentalStatus: demographicsEnabled ? (c.parentalStatus || c.demographics?.parentalStatus || "") : "Не застосовується",
    pregnancyAtStart: demographicsEnabled && /вагітн|очікує.*дитин|двійн|трій/i.test(c.reproductiveStatus || c.demographics?.reproductiveStatus || ""),
    pregnancyResolved: false,
    profession: c.profession || "",
    skill: c.skill || "",
    trait: c.trait || "",
    relationship: c.relationship || "",
    relationshipTargetId: c.relationshipTargetId || null,
    roleId: c.role?.id || "survivor",
    roleFaction: c.role?.faction || "Громада",
    healthName: c.medicalCondition?.name || c.health || "Без активної хвороби",
    severity: Number(c.medicalCondition?.severity || 0),
    treatable: c.medicalCondition?.treatable !== false,
    progressive: Boolean(c.medicalCondition?.progressive),
    contagious: Boolean(c.medicalCondition?.contagious),
    injury: Number(c.injury || 0),
    stress: Number(c.stress || 0),
    contribution: contributionLabel(c),
    children: 0,
    conflicts: 0,
    reconciliations: 0,
    status: player.active ? "resident" : "outside",
    outsideRole: player.outsideRole?.name || null,
    successfulExpeditions: Number(c.successfulExpeditions || 0),
    successfulRepairs: Number(c.successfulRepairs || 0),
    successfulTreatments: Number(c.successfulTreatments || 0)
  };
}

function canCarryPregnancy(person) {
  if (!person.alive || !person.inside || person.age < 18 || person.age > 44) return false;
  const capability = person.canBecomePregnant;
  if (!(capability === true || capability === "possible" || /жіноч|інтерсекс/i.test(person.sex))) return false;
  if (/не може|безплід|стерил|не застосовується/i.test(person.reproductiveStatus) || /безплід|стерильн/i.test(person.health || "")) return false;
  if (/чайлдфрі/i.test(person.attitudeToChildren)) return false;
  return true;
}
function hasPotentialPartner(person, people, settingId) {
  const candidates = people.filter((other) => other.id !== person.id && other.alive && other.inside && other.age >= 18 && other.age <= 65);
  if (!candidates.length) return false;
  if (["space", "cyberpunk", "fantasy"].includes(settingId)) return true;
  return candidates.some((other) => !/жіноч/i.test(other.sex) || /інтерсекс/i.test(other.sex));
}

function addChronicle(chronicle, time, category, title, text, tone = "neutral", people = []) {
  chronicle.push({ id: `sim_${chronicle.length + 1}`, time, category, title, text, tone, people: [...people] });
}

function strongestResource(resources) {
  return RESOURCE_KEYS.reduce((best, key) => resources[key] > resources[best] ? key : best, RESOURCE_KEYS[0]);
}
function weakestResource(resources) {
  return RESOURCE_KEYS.reduce((best, key) => resources[key] < resources[best] ? key : best, RESOURCE_KEYS[0]);
}
function resourceSnapshot(resources) {
  return Object.fromEntries(RESOURCE_KEYS.map((key) => [key, round(resources[key])]));
}
function moduleAverage(modules) {
  return modules.reduce((sum, module) => sum + module.condition, 0) / Math.max(1, modules.length);
}

function updateResources(state, months, profile, room, rng) {
  const population = Math.max(1, state.population);
  const capacity = Math.max(1, room.game?.shelter?.residentCapacity || room.settings.capacity || population);
  const pressure = Number(room.game.scenario?.pressure || 1);
  const popPressure = population / capacity;
  const level = state.settlementLevel;
  const expSuccess = Number(room.game.expeditionHistory?.filter((item) => item.success).length || 0);
  const repairSuccess = Number(room.game.repairHistory?.filter((item) => item.success).length || 0);
  const competence = (key) => profile[key] / population;
  const rates = {
    food: -0.56 * popPressure * pressure + 0.72 * competence("food") + 0.18 * level + 0.025 * expSuccess,
    water: -0.60 * popPressure * pressure + 0.44 * competence("technical") + 0.14 * competence("science") + 0.16 * level,
    energy: -0.40 * pressure + 0.55 * competence("technical") + 0.11 * level + 0.018 * repairSuccess,
    integrity: -0.15 * pressure + 0.48 * competence("technical") + 0.10 * competence("defense") + 0.015 * repairSuccess,
    medicine: -0.18 * pressure + 0.48 * competence("medicine") + 0.12 * competence("science") + 0.07 * level,
    morale: -0.18 * pressure - 0.10 * state.unresolvedConflicts + 0.54 * competence("social") + 0.08 * competence("education") + 0.08 * level
  };
  if (room.settings.setting === "horror") rates.morale -= 0.16;
  if (room.settings.setting === "cyberpunk") rates.energy -= 0.12;
  if (room.settings.setting === "postapocalypse") rates.integrity -= 0.08;
  for (const key of RESOURCE_KEYS) {
    const noise = (rng() - 0.5) * Math.min(4, months * 0.08);
    state.resources[key] = clamp(state.resources[key] + rates[key] * months + noise, 0, 100);
  }
  for (const module of state.modules) {
    const repairRate = (profile.technical / population) * 0.18 + repairSuccess * 0.004 + level * 0.025;
    const wearRate = 0.09 * pressure + (state.resources.energy < 20 ? 0.09 : 0);
    module.condition = clamp(module.condition + (repairRate - wearRate) * months + (rng() - 0.5) * 1.2, 0, 100);
  }
}

function updateMedical(state, years, profile, milestone, chronicle, rng) {
  const support = medicalSupport(profile, state.resources, state.population);
  for (const person of state.people.filter((item) => item.alive && item.inside && item.originalPlayer)) {
    if (person.severity <= 0) {
      const illnessChance = clamp((0.018 + (state.resources.medicine < 30 ? 0.05 : 0) + (state.resources.water < 20 ? 0.04 : 0)) * years, 0, 0.35);
      if (chance(rng, illnessChance)) {
        person.severity = 1;
        person.healthName = "Гостре захворювання після тривалої ізоляції";
        person.treatable = true;
        addChronicle(chronicle, milestone.label, "Медицина", `Захворів / захворіла ${person.name}`, `${person.name} потребує постійного нагляду після появи симптомів.`, "warn", [person.name]);
      }
      continue;
    }
    const recoveryChance = clamp((0.16 + support * 0.45 + (person.treatable ? 0.12 : -0.08)) * years, 0, 0.85);
    const worsenChance = clamp((0.08 + person.severity * 0.055 + (person.progressive ? 0.08 : 0) + (state.resources.medicine < 25 ? 0.15 : 0) - support * 0.20) * years, 0, 0.70);
    if (chance(rng, recoveryChance)) {
      const before = person.severity;
      person.severity = Math.max(0, person.severity - 1);
      if (person.severity === 0) {
        addChronicle(chronicle, milestone.label, "Медицина", `${person.name} одужав / одужала`, `Після тривалого лікування стан «${person.healthName}» більше не загрожує життю.`, "good", [person.name]);
      } else if (before >= 3) {
        addChronicle(chronicle, milestone.label, "Медицина", `Стан ${person.name} стабілізовано`, `Тяжкість хвороби знижено до рівня ${person.severity}/5.`, "good", [person.name]);
      }
    } else if (chance(rng, worsenChance)) {
      person.severity = Math.min(5, person.severity + 1);
      person.stress = Math.min(5, person.stress + 1);
      addChronicle(chronicle, milestone.label, "Медицина", `Стан ${person.name} погіршився`, `Хвороба «${person.healthName}» досягла рівня ${person.severity}/5 і почала вимагати більше медикаментів.`, person.severity >= 4 ? "bad" : "warn", [person.name]);
    }
  }
}

function deathRisk(person, state, years, profile) {
  const support = medicalSupport(profile, state.resources, state.population);
  const severityRisk = [0.002, 0.008, 0.025, 0.075, 0.20, 0.52][person.severity] || 0.002;
  const ageRisk = person.age < 55 ? 0.003 : person.age < 70 ? 0.012 : 0.038;
  const injuryRisk = person.injury * 0.012;
  const scarcity = (state.resources.food < 18 ? 0.05 : 0) + (state.resources.water < 18 ? 0.08 : 0) + (state.resources.medicine < 15 ? 0.05 : 0);
  return clamp((severityRisk * (1.15 - support * 0.7) + ageRisk + injuryRisk + scarcity) * years, 0, 0.92);
}

function processDeaths(state, years, profile, milestone, chronicle, rng) {
  for (const person of state.people.filter((item) => item.alive && item.inside && item.originalPlayer)) {
    if (!chance(rng, deathRisk(person, state, years, profile))) continue;
    person.alive = false;
    person.status = "dead";
    person.deathTime = milestone.label;
    if (person.severity >= 3) person.deathCause = `ускладнення стану «${person.healthName}»`;
    else if (state.resources.water < 15) person.deathCause = "наслідки дефіциту води";
    else if (state.resources.food < 15) person.deathCause = "виснаження через нестачу їжі";
    else if (person.injury >= 4) person.deathCause = "наслідки старої травми";
    else person.deathCause = "раптова медична криза";
    state.deaths += 1;
    state.population = Math.max(0, state.population - 1);
    state.resources.morale = clamp(state.resources.morale - 7, 0, 100);
    addChronicle(chronicle, milestone.label, "Втрата", `Помер / померла ${person.name}`, `${person.name} не пережив / не пережила ${person.deathCause}. Громада втратила людину, яка ${person.contribution}.`, "bad", [person.name]);
  }
}

function birthCountFromStatus(status) {
  if (/трій/i.test(status)) return 3;
  if (/двійн|близнюк/i.test(status)) return 2;
  return 1;
}
function birthDesireFactor(person) {
  const text = lower(person.attitudeToChildren);
  if (/чайлдфрі/.test(text)) return 0;
  if (/хоче|пріоритет.*батьків/.test(text)) return 1.45;
  if (/усинов/.test(text)) return 0.65;
  if (/не заперечує/.test(text)) return 1.0;
  if (/не визначив/.test(text)) return 0.45;
  return 0.8;
}
function demographicCapacity(room, state) {
  const base = Number(room.game?.shelter?.residentCapacity || room.settings.capacity || state.population);
  return Math.max(base, state.population + state.settlementLevel * 3);
}
function applyBirths(state, room, milestone, chronicle, births, parents, reason) {
  const roomLeft = Math.max(0, Math.floor(demographicCapacity(room, state) * 1.15 - state.population));
  births = Math.min(Math.max(0, births), roomLeft);
  if (!births) return 0;
  state.births += births;
  state.children += births;
  state.population += births;
  state.resources.morale = clamp(state.resources.morale + Math.min(9, births * 3), 0, 100);
  state.resources.food = clamp(state.resources.food - births * 1.4, 0, 100);
  state.resources.water = clamp(state.resources.water - births * 0.9, 0, 100);
  const names = parents.map((item) => item.name).slice(0, 4);
  addChronicle(chronicle, milestone.label, "Демографія", births === 1 ? "Народилася дитина" : `Народилося дітей: ${births}`,
    `${reason} ${births === 1 ? "Громада облаштувала місце для немовляти й переглянула чергування." : "Поселення розширило дитячу кімнату, запаси й систему опіки."}`,
    "good", names);
  return births;
}
function processBirths(state, intervalYears, profile, room, milestone, chronicle, rng) {
  if (state.population < 2) return;
  const people = state.people.filter((item) => item.alive && item.inside && item.originalPlayer);
  const stability = clamp((state.resources.food + state.resources.water + state.resources.morale + state.resources.medicine + moduleAverage(state.modules)) / 500, 0, 1);

  // Вагітність, яка існувала до входу в сховище, не чекає випадкового кидка після першого року.
  if (milestone.day >= 90) {
    for (const parent of people.filter((item) => item.pregnancyAtStart && !item.pregnancyResolved)) {
      parent.pregnancyResolved = true;
      const critical = stability < 0.22 || state.resources.medicine < 8 || parent.severity >= 5;
      if (critical && chance(rng, 0.55)) {
        state.demographyNotes.push(`${parent.name}: початкова вагітність не завершилася народженням через критичний стан медицини або ресурсів.`);
        addChronicle(chronicle, milestone.label, "Медицина", `Вагітність ${parent.name} завершилася втратою`, `Критичні умови ізоляції не дали безпечно завершити вагітність. Громада втратила мораль і переглянула медичні пріоритети.`, "bad", [parent.name]);
        state.resources.morale = clamp(state.resources.morale - 6, 0, 100);
      } else {
        const count = birthCountFromStatus(parent.reproductiveStatus);
        const delivered = applyBirths(state, room, milestone, chronicle, count, [parent], `Вагітність ${parent.name}, що почалася ще до партії, завершилася пологами.`);
        parent.children += delivered;
      }
    }
  }

  if (milestone.day < 365 || intervalYears <= 0 || stability < 0.34) return;
  const carriers = people.filter((person) => canCarryPregnancy(person) && hasPotentialPartner(person, people, room.settings.setting));
  if (!carriers.length) return;
  let expected = 0;
  for (const parent of carriers) {
    const fertility = /фертиль|може мати/i.test(lower(parent.reproductiveStatus)) ? 1.2 : 0.85;
    const settlement = state.settlementLevel >= 2 ? 1.25 : state.settlementLevel === 1 ? 1.05 : 0.82;
    expected += 0.30 * birthDesireFactor(parent) * fertility * stability * settlement * intervalYears;
  }
  state.birthCredit += expected;
  let births = Math.floor(state.birthCredit);
  const fraction = state.birthCredit - births;
  if (chance(rng, fraction)) births += 1;
  if (!births) return;
  state.birthCredit = Math.max(0, state.birthCredit - births);
  const parents = [...carriers].sort((a, b) => birthDesireFactor(b) - birthDesireFactor(a)).slice(0, births);
  const delivered = applyBirths(state, room, milestone, chronicle, births, parents, `Стабільність громади, наявність сумісних дорослих і бажання мати дітей дали демографічний результат.`);
  parents.forEach((parent, index) => { if (index < delivered) parent.children += 1; });
}

function processOutsiders(state, intervalYears, profile, room, milestone, chronicle, rng) {
  if (milestone.day < 180) return;
  const capacitySoft = Math.max(room.game?.shelter?.residentCapacity || room.settings.capacity, Math.floor((room.game.shelter.roomCount || room.settings.capacity * 3) / 2));
  const space = capacitySoft + state.settlementLevel * 3 - state.population;
  if (space <= 0 || state.resources.food < 38 || state.resources.water < 38) return;
  const expSuccess = room.game.expeditionHistory?.filter((item) => item.success).length || 0;
  const probability = clamp((0.06 + expSuccess * 0.025 + room.game.shelter.allies * 0.02 + profile.social * 0.008) * intervalYears, 0, 0.55);
  if (!chance(rng, probability)) return;
  const joined = Math.min(space, 1 + Math.floor(rng() * Math.min(3, Math.max(1, room.game.shelter.allies + 1))));
  state.outsidersJoined += joined;
  state.population += joined;
  state.resources.food = clamp(state.resources.food - joined * 1.5, 0, 100);
  state.resources.morale = clamp(state.resources.morale + 2, 0, 100);
  addChronicle(chronicle, milestone.label, "Поселення", `До громади приєдналося людей: ${joined}`, `Розвідники привели тих, хто вижив за межами сховища. Після карантину й перевірки їм надали місце та обов’язки.`, "good");
}

function conflictCandidates(state) {
  const people = state.people.filter((item) => item.alive && item.inside && item.originalPlayer);
  const weighted = [];
  for (const person of people) {
    const target = people.find((item) => item.id === person.relationshipTargetId);
    if (target && NEGATIVE_RELATIONSHIP_RE.test(person.relationship)) weighted.push({ a: person, b: target, cause: person.relationship, weight: 5 });
  }
  for (let i = 0; i < people.length; i += 1) {
    for (let j = i + 1; j < people.length; j += 1) {
      const a = people[i], b = people[j];
      let weight = 1;
      if (DIFFICULT_TRAIT_RE.test(a.trait)) weight += 1;
      if (DIFFICULT_TRAIT_RE.test(b.trait)) weight += 1;
      if (a.roleFaction !== b.roleFaction) weight += 1.5;
      weighted.push({ a, b, cause: "суперечка щодо розподілу ресурсів і влади", weight });
    }
  }
  return weighted;
}
function weightedChoose(rng, entries) {
  if (!entries.length) return null;
  const total = entries.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of entries) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return entries[entries.length - 1];
}

function processConflict(state, intervalYears, profile, milestone, chronicle, conflicts, rng) {
  if (milestone.day < 90 || state.population < 2) return;
  const difficult = state.people.filter((person) => person.alive && person.inside && DIFFICULT_TRAIT_RE.test(person.trait)).length;
  const chanceValue = clamp((0.08 + (100 - state.resources.morale) / 350 + difficult * 0.025 + state.unresolvedConflicts * 0.04) * Math.min(2, intervalYears), 0, 0.62);
  if (!chance(rng, chanceValue)) return;
  const candidate = weightedChoose(rng, conflictCandidates(state));
  if (!candidate) return;
  const { a, b, cause } = candidate;
  const social = profile.social / Math.max(1, state.population);
  const mediationChance = clamp(0.28 + social * 0.6 + state.resources.morale / 250, 0.18, 0.88);
  const resolved = chance(rng, mediationChance);
  a.conflicts += 1;
  b.conflicts += 1;
  if (resolved) {
    a.reconciliations += 1;
    b.reconciliations += 1;
    state.resources.morale = clamp(state.resources.morale - 2, 0, 100);
    conflicts.push({ time: milestone.label, participants: [a.name, b.name], cause, resolution: "Посередництво й розподіл відповідальності", resolved: true, impact: "Суперечку зупинено до того, як вона переросла у насильство." });
    addChronicle(chronicle, milestone.label, "Конфлікт", `Суперечку між ${a.name} та ${b.name} вдалося владнати`, `Причиною стала ${lower(cause)}. Після відкритого розбору сторони погодили правила, яких надалі дотримувалася вся громада.`, "warn", [a.name, b.name]);
  } else {
    state.unresolvedConflicts += 1;
    state.resources.morale = clamp(state.resources.morale - 8, 0, 100);
    const violent = chance(rng, 0.28 + (state.resources.morale < 25 ? 0.15 : 0));
    if (violent) {
      const injured = chance(rng, 0.5) ? a : b;
      injured.injury = Math.min(5, injured.injury + 1);
      conflicts.push({ time: milestone.label, participants: [a.name, b.name], cause, resolution: "Відкрите протистояння", resolved: false, impact: `${injured.name} отримав / отримала травму; мораль громади впала.` });
      addChronicle(chronicle, milestone.label, "Конфлікт", `Суперечка завершилася бійкою`, `${a.name} і ${b.name} не змогли домовитися. ${injured.name} отримав / отримала травму, а громада запровадила нічні чергування.`, "bad", [a.name, b.name]);
    } else {
      conflicts.push({ time: milestone.label, participants: [a.name, b.name], cause, resolution: "Холодне протистояння", resolved: false, impact: "У громаді сформувалися два табори." });
      addChronicle(chronicle, milestone.label, "Конфлікт", `Громада розкололася навколо ${a.name} та ${b.name}`, `Суперечка через ${lower(cause)} залишилася невирішеною й почала впливати на щоденні рішення.`, "bad", [a.name, b.name]);
    }
  }
}

function processHiddenThreats(state, profile, room, milestone, chronicle, rng) {
  if (milestone.day < 180 || state.hiddenThreatResolved) return;
  const threats = state.people.filter((person) => person.alive && person.inside && person.roleFaction === "Загроза");
  if (!threats.length) { state.hiddenThreatResolved = true; return; }
  const detection = clamp(0.22 + profile.science / Math.max(1, state.population) * 0.35 + profile.social / Math.max(1, state.population) * 0.18 + milestone.day / 10000, 0.18, 0.82);
  const threat = threats[0];
  if (chance(rng, detection)) {
    state.hiddenThreatResolved = true;
    threat.status = "detained";
    threat.inside = false;
    state.population = Math.max(0, state.population - 1);
    state.resources.morale = clamp(state.resources.morale + 4, 0, 100);
    addChronicle(chronicle, milestone.label, "Безпека", `Викрито приховану загрозу: ${threat.name}`, `Після серії перевірок громада довела, що ${threat.name} діяв / діяла проти сховища. Персонажа ізолювали від критичних систем.`, "good", [threat.name]);
  } else if (chance(rng, 0.35)) {
    const module = choose(rng, state.modules);
    module.condition = clamp(module.condition - 12, 0, 100);
    state.resources.integrity = clamp(state.resources.integrity - 8, 0, 100);
    addChronicle(chronicle, milestone.label, "Саботаж", `Пошкоджено модуль «${module.name}»`, `Причину аварії одразу встановити не вдалося. Сліди вказували на навмисне втручання зсередини.`, "bad");
  }
}

function settlementProgress(state, months, profile, room, milestone, chronicle, rng) {
  if (state.population <= 0) return;
  const avgResources = RESOURCE_KEYS.reduce((sum, key) => sum + state.resources[key], 0) / RESOURCE_KEYS.length;
  const avgModules = moduleAverage(state.modules);
  const population = Math.max(1, state.population);
  const competence = (profile.technical + profile.food + profile.science + profile.education) / population;
  const gain = Math.max(-2, (avgResources - 35) / 45 + (avgModules - 40) / 55 + competence * 1.4 - state.unresolvedConflicts * 0.25) * Math.min(6, months / 4);
  state.developmentPoints = clamp(state.developmentPoints + gain, 0, 100);
  const thresholds = [0, 12, 30, 55, 82];
  let newLevel = 0;
  thresholds.forEach((threshold, index) => { if (state.developmentPoints >= threshold) newLevel = index; });
  if (newLevel > state.settlementLevel) {
    while (state.settlementLevel < newLevel) {
      state.settlementLevel += 1;
      const available = state.lexicon.buildings.filter((item) => !state.buildings.includes(item));
      const building = choose(rng, available);
      if (building) state.buildings.push(building);
      addChronicle(chronicle, milestone.label, "Розвиток", `Поселення перейшло до етапу «${state.lexicon.stages[state.settlementLevel]}»`, building
        ? `Мешканці завершили об’єкт «${building}». Це зменшило залежність громади від початкових запасів.`
        : "Система чергувань і виробництва стала стабільнішою.", "good");
    }
  }
}

function milestoneSummary(state, milestone) {
  if (state.population <= 0) return { headline: "Поселення припинило існування", summary: "Після загибелі або втрати всіх мешканців сховище залишилося порожнім.", status: "collapse" };
  const weakest = weakestResource(state.resources);
  const avgResources = RESOURCE_KEYS.reduce((sum, key) => sum + state.resources[key], 0) / RESOURCE_KEYS.length;
  const avgModules = moduleAverage(state.modules);
  let status = "critical";
  let headline = "Громада живе від аварії до аварії";
  if (avgResources >= 65 && avgModules >= 65 && state.resources.morale >= 55) { status = "stable"; headline = "Громада зміцнює автономність"; }
  else if (avgResources >= 42 && avgModules >= 45) { status = "fragile"; headline = "Крихкий баланс поки зберігається"; }
  return {
    headline,
    status,
    summary: `${state.population} мешканців; етап — ${state.lexicon.stages[state.settlementLevel]}. Найслабший ресурс: ${RESOURCE_LABELS[weakest]} (${round(state.resources[weakest])}%). Середній стан систем: ${round(avgModules)}%.`
  };
}

function personalFates(room, state, horizonYears) {
  return state.people.filter((person) => person.originalPlayer).map((person) => {
    const player = room.players.find((item) => item.id === person.id);
    if (!player?.active) {
      const outsideSurvival = person.outsideRole || person.successfulExpeditions > 0 || /виживан|орієнтув|розвід|військ/i.test(lower([person.profession, person.skill].join(" ")));
      return {
        playerId: person.id,
        name: person.name,
        alive: outsideSurvival,
        status: outsideSurvival ? "outside" : "lost",
        time: person.departureTime,
        title: outsideSurvival ? "Вижив / вижила за межами сховища" : "Зник / зникла за межами сховища",
        text: outsideSurvival
          ? `${person.name} використав / використала досвід і роль «${person.outsideRole || "самостійний мандрівник"}», підтримуючи нерегулярний зв’язок із громадою. До року ${horizonYears} став / стала частиною зовнішньої мережі постачання.`
          : `${person.name} залишив / залишила сховище у ${person.departureTime || "невідомий момент"}. Після кількох сигналів зв’язок урвався, а підтверджених відомостей про подальшу долю немає.`
      };
    }
    if (!person.alive) {
      return { playerId: person.id, name: person.name, alive: false, status: "dead", time: person.deathTime, title: `Помер / померла — ${person.deathTime}`, text: `${person.name} помер / померла через ${person.deathCause}. До цього ${person.contribution}.` };
    }
    if (!person.inside && person.status === "detained") {
      return { playerId: person.id, name: person.name, alive: true, status: "detained", time: null, title: "Викрито й ізольовано", text: `${person.name} дожив / дожила до завершення симуляції під наглядом громади після викриття прихованої ролі.` };
    }
    const parentText = person.children ? ` Став / стала батьком або матір’ю для ${person.children} дітей.` : "";
    const conflictText = person.conflicts ? ` Брав / брала участь у конфліктах: ${person.conflicts}; примирень: ${person.reconciliations}.` : "";
    const healthText = person.severity > 0 ? ` Хронічний стан «${person.healthName}» залишився на рівні ${person.severity}/5.` : " Активних хвороб наприкінці немає.";
    return {
      playerId: person.id,
      name: person.name,
      alive: true,
      status: "resident",
      time: `Рік ${horizonYears}`,
      title: `Дожив / дожила до року ${horizonYears}`,
      text: `${person.name} ${person.contribution}.${parentText}${conflictText}${healthText}`
    };
  });
}

function demographicAssessment(state, room) {
  const residents = state.people.filter((item) => item.originalPlayer && item.alive && item.inside);
  const childfree = residents.filter((item) => /чайлдфрі/i.test(item.attitudeToChildren)).length;
  const willing = residents.filter((item) => birthDesireFactor(item) >= 1).length;
  const carriers = residents.filter(canCarryPregnancy);
  const compatible = carriers.filter((item) => hasPotentialPartner(item, residents, room.settings.setting));
  const notes = [...state.demographyNotes];
  if (state.births > 0) {
    notes.unshift(`Народжень відбулося: ${state.births}. Система врахувала початкові вагітності, фертильність, партнерську сумісність, бажання мати дітей, ресурси й місткість.`);
  } else {
    if (!carriers.length) notes.push("Не було живих мешканців репродуктивного віку, здатних виношувати вагітність.");
    else if (!compatible.length) notes.push("Не сформувалося репродуктивно сумісної пари або доступної технологічної альтернативи.");
    if (willing === 0) notes.push("Ніхто з мешканців не мав достатньо вираженого наміру мати дітей.");
    if (childfree === residents.length && residents.length) notes.push("Усі мешканці репродуктивного віку були чайлдфрі.");
    if (state.resources.food < 35 || state.resources.water < 35 || state.resources.medicine < 25 || state.resources.morale < 35) notes.push("Ресурси, медицина або мораль залишалися занадто нестабільними для планованого народження.");
    if (!notes.length) notes.push("Демографічний потенціал існував, але за обраний часовий горизонт не сформувався достатній сукупний шанс народження.");
  }
  return { residents: residents.length, childfree, willing, carriers: carriers.length, compatiblePairs: compatible.length, explanation: notes.join(" ") };
}

function verdictFor(finalScore, population, stage, horizonYears, demographyModeled = true) {
  if (population <= 0) return { verdict: "Загибель громади", description: `До завершення ${horizonYears}-річної симуляції у сховищі не залишилося живих мешканців. Побудовані системи не змогли компенсувати медичні, ресурсні та соціальні втрати.` };
  if (finalScore >= 82 && stage >= 3) return { verdict: "Нова цивілізація", description: demographyModeled
    ? `Через ${horizonYears} років колишнє сховище стало самодостатнім поселенням із власним виробництвом, правилами й наступним поколінням. Рішення гравців створили не лише шанс вижити, а й основу нового суспільства.`
    : `Через ${horizonYears} років колишнє сховище стало самодостатнім поселенням із власним виробництвом, правилами та стійкими інституціями. Рішення гравців створили не лише шанс вижити, а й основу нового суспільства.` };
  if (finalScore >= 68) return { verdict: "Стійка громада", description: `Через ${horizonYears} років громада зберегла населення, працездатні системи й кероване виробництво. Вона ще залежить від обережного планування, але вже не живе лише стартовими запасами.` };
  if (finalScore >= 50) return { verdict: "Крихке довгострокове виживання", description: demographyModeled
    ? `Громада дожила до року ${horizonYears}, однак періоди дефіциту, хвороби та конфлікти не дали їй стати повністю автономною. Наступне покоління успадкує і працюючий притулок, і невирішені ризики.`
    : `Громада дожила до року ${horizonYears}, однак періоди дефіциту, хвороби та конфлікти не дали їй стати повністю автономною. Працюючий притулок і невирішені ризики лишилися головною спадщиною її рішень.` };
  if (finalScore >= 30) return { verdict: "Повільний занепад", description: `До року ${horizonYears} поселення все ще існує, але його населення й технічний запас скоротилися. Виживання тримається на окремих компетентних людях і кількох системах, що ще не відмовили.` };
  return { verdict: "Останні мешканці", description: `Через ${horizonYears} років у сховищі залишилася мала група людей. Вони пережили катастрофу, але не змогли створити стабільне поселення й щодня ризикують втратити останню автономність.` };
}

function simulateLongTerm(room, initialScore = 50) {
  const game = room.game;
  const horizonYears = isolationHorizonYears(room);
  const demographicsEnabled = room.settings?.setting !== "detective" && room.settings?.demographicsEnabled !== false;
  const demographyModeled = demographicsEnabled && horizonYears >= 10;
  const milestones = milestonesFor(horizonYears);
  const lexicon = SETTING_LEXICON[room.settings.setting] || SETTING_LEXICON.modern;
  const seed = [room.code, room.settings.setting, game.scenario?.title, game.round, room.players.map((item) => `${item.id}:${item.active}`).join("|"), game.log?.join("|")].join("::");
  const rng = createRng(seed);
  const people = room.players.map((player) => personFromPlayer(player, demographicsEnabled));
  const active = people.filter((item) => item.alive && item.inside);
  const initialSeverityById = new Map(active.map((item) => [item.id, item.severity]));
  const state = {
    lexicon,
    people,
    population: active.length + Number(game.shelter.allies || 0),
    children: 0,
    births: 0,
    birthCredit: 0,
    deaths: 0,
    demographyNotes: [],
    outsidersJoined: Number(game.shelter.allies || 0),
    resources: deepClone(game.shelter.resources),
    modules: deepClone(game.shelter.modules),
    settlementLevel: 0,
    developmentPoints: clamp((initialScore - 30) * 0.35, 0, 20),
    buildings: [],
    unresolvedConflicts: 0,
    hiddenThreatResolved: false
  };
  const chronicle = [];
  const conflicts = [];
  const timeSlices = [];
  const governance = choose(rng, lexicon.governance);
  addChronicle(chronicle, "День 0", "Початок", `Сформовано фінальну групу`, `${state.population} мешканців зайняли «${game.shelter.title}». Першим органом управління стала ${governance}.${!demographicsEnabled ? " Демографічне моделювання вимкнено правилами кімнати." : !demographyModeled ? " Через короткий часовий горизонт народжуваність окремо не моделюється." : ""}`, "neutral", active.map((item) => item.name));
  let previousDay = 0;
  for (const milestone of milestones) {
    if (state.population <= 0) {
      const summary = milestoneSummary(state, milestone);
      timeSlices.push({ ...milestone, ...summary, population: 0, children: state.children, resources: resourceSnapshot(state.resources), moduleAverage: round(moduleAverage(state.modules)), settlementLevel: state.settlementLevel, settlementStage: lexicon.stages[state.settlementLevel], buildings: [...state.buildings] });
      continue;
    }
    const deltaDays = milestone.day - previousDay;
    const months = deltaDays / 30.4375;
    const years = deltaDays / 365;
    for (const person of state.people.filter((item) => item.alive)) person.age += years;
    let currentProfile = competenceProfile(state.people.filter((item) => item.alive && item.inside && item.originalPlayer));
    updateResources(state, months, currentProfile, room, rng);
    updateMedical(state, years, currentProfile, milestone, chronicle, rng);
    processHiddenThreats(state, currentProfile, room, milestone, chronicle, rng);
    processConflict(state, years, currentProfile, milestone, chronicle, conflicts, rng);
    processDeaths(state, years, currentProfile, milestone, chronicle, rng);
    if (demographyModeled) processBirths(state, years, currentProfile, room, milestone, chronicle, rng);
    processOutsiders(state, years, currentProfile, room, milestone, chronicle, rng);
    currentProfile = competenceProfile(state.people.filter((item) => item.alive && item.inside && item.originalPlayer));
    settlementProgress(state, months, currentProfile, room, milestone, chronicle, rng);

    const weak = weakestResource(state.resources);
    if (state.resources[weak] < 18) {
      addChronicle(chronicle, milestone.label, "Ресурси", `Критичний дефіцит: ${RESOURCE_LABELS[weak]}`, `Запас опустився до ${round(state.resources[weak])}%. Громада ввела жорсткі норми й перерозподілила робочі зміни.`, "bad");
    } else if (milestone.day >= 365 && state.resources[strongestResource(state.resources)] > 78 && chance(rng, 0.35)) {
      const strong = strongestResource(state.resources);
      addChronicle(chronicle, milestone.label, "Виробництво", `Створено резерв: ${RESOURCE_LABELS[strong]}`, `Завдяки новим виробничим циклам запас вдалося підняти до ${round(state.resources[strong])}%.`, "good");
    }

    const summary = milestoneSummary(state, milestone);
    timeSlices.push({
      ...milestone,
      ...summary,
      population: state.population,
      originalResidentsAlive: state.people.filter((item) => item.originalPlayer && item.alive && item.inside).length,
      children: state.children,
      births: state.births,
      deaths: state.deaths,
      outsidersJoined: state.outsidersJoined,
      resources: resourceSnapshot(state.resources),
      moduleAverage: round(moduleAverage(state.modules)),
      settlementLevel: state.settlementLevel,
      settlementStage: lexicon.stages[state.settlementLevel],
      buildings: [...state.buildings]
    });
    previousDay = milestone.day;
  }

  const avgResources = RESOURCE_KEYS.reduce((sum, key) => sum + state.resources[key], 0) / RESOURCE_KEYS.length;
  const avgModules = moduleAverage(state.modules);
  const startResourceAverage = RESOURCE_KEYS.reduce((sum, key) => sum + Number(game.shelter.resources?.[key] || 0), 0) / RESOURCE_KEYS.length;
  const startModuleAverage = moduleAverage(game.shelter.modules || []);
  const startPopulation = active.length + Number(game.shelter.allies || 0);
  const retainedAdultsAndAllies = state.people.filter((item) => item.alive && item.inside && (item.originalPlayer || item.status === "outsider")).length + Number(game.shelter.allies || 0);
  const retention = startPopulation ? clamp(retainedAdultsAndAllies / startPopulation, 0, 1.8) : 0;

  // Етап 24: майбутнє більше не переоцінює всю партію заново. Воно лише
  // помірно коригує режимозалежну оцінку рішень у межах ±12 балів.
  const assumptionComponents = [
    { id: "resources", label: "Довгострокова динаміка запасів", value: clamp((avgResources - startResourceAverage) * 0.06, -4, 4) },
    { id: "modules", label: "Зношення та розвиток систем", value: clamp((avgModules - startModuleAverage) * 0.05, -3, 3) },
    { id: "settlement", label: "Розвиток поселення", value: clamp(state.settlementLevel * 1.15 - 0.6, -1, 4) },
    { id: "population", label: "Зміна населення", value: clamp((retention - 0.9) * 5, -3, 3) },
    { id: "conflicts", label: "Майбутні конфлікти", value: -Math.min(3, state.unresolvedConflicts * 1.5) },
    { id: "mortality", label: "Випадкові смерті та хвороби", value: -Math.min(4, state.deaths * 0.8) }
  ];
  const rawAssumptionImpact = assumptionComponents.reduce((sum, item) => sum + item.value, 0);
  const assumptionImpact = clamp(round(rawAssumptionImpact), -12, 12);
  const finalScore = clamp(round(initialScore + assumptionImpact), 0, 100);
  const finalVerdict = verdictFor(finalScore, state.population, state.settlementLevel, horizonYears, demographyModeled);
  const personalFateList = personalFates(room, state, horizonYears);
  const medicalSummary = {
    initialPatients: [...initialSeverityById.values()].filter((severity) => Number(severity) > 0).length,
    finalPatients: state.people.filter((item) => item.originalPlayer && item.alive && item.inside && item.severity > 0).length,
    recovered: state.people.filter((item) => item.originalPlayer && item.alive && item.inside && item.severity === 0 && Number(initialSeverityById.get(item.id) || 0) > 0).length,
    deaths: state.deaths,
    medicineEnd: round(state.resources.medicine)
  };
  const demographicDetails = demographyModeled
    ? demographicAssessment(state, room)
    : { residents: 0, childfree: 0, willing: 0, carriers: 0, compatiblePairs: 0, explanation: demographicsEnabled ? `Часовий горизонт ${horizonYears} років закороткий для окремого моделювання народжуваності. Демографічні обставини не впливали на оцінку громади.` : "Демографічні обставини вимкнено в налаштуваннях кімнати. Вони не генерувалися, не розкривалися й не впливали на оцінку громади." };
  const demography = {
    enabled: demographicsEnabled,
    modeled: demographyModeled,
    directScoreImpact: 0,
    startPopulation,
    endPopulation: state.population,
    births: state.births,
    deaths: state.deaths,
    outsidersJoined: state.outsidersJoined,
    children: state.children,
    residentsOfReproductiveAge: demographicDetails.residents,
    childfree: demographicDetails.childfree,
    willingToHaveChildren: demographicDetails.willing,
    potentialCarriers: demographicDetails.carriers,
    compatiblePairs: demographicDetails.compatiblePairs,
    explanation: demographicDetails.explanation
  };
  const settlement = {
    name: `${game.shelter.title}: ${lexicon.settlement}`,
    governance,
    level: state.settlementLevel,
    stage: lexicon.stages[state.settlementLevel],
    buildings: [...state.buildings],
    resources: resourceSnapshot(state.resources),
    moduleAverage: round(avgModules),
    developmentPoints: round(state.developmentPoints)
  };
  const simulationAssumptions = [
    {
      category: "Ресурси",
      title: avgResources >= startResourceAverage ? "Модель припускає стабілізацію запасів" : "Модель припускає поступове виснаження запасів",
      text: `Середній рівень змінився з ${round(startResourceAverage)}% до ${round(avgResources)}%. Це прогноз моделі, а не подія, що вже сталася.`,
      impact: avgResources >= startResourceAverage ? "positive" : "negative",
      scoreImpact: round(assumptionComponents.find((item) => item.id === "resources").value)
    },
    {
      category: "Системи",
      title: avgModules >= startModuleAverage ? "Системи можуть витримати довгий горизонт" : "Зношення може випередити ремонт",
      text: `Прогнозований середній стан модулів: ${round(startModuleAverage)}% → ${round(avgModules)}%.`,
      impact: avgModules >= startModuleAverage ? "positive" : "negative",
      scoreImpact: round(assumptionComponents.find((item) => item.id === "modules").value)
    },
    {
      category: "Демографія",
      title: demographyModeled ? "Змодельовано народження, приєднання та смерті" : "Демографічний прогноз обмежено",
      text: demographyModeled
        ? `Модель припустила ${state.births} народжень, ${state.outsidersJoined} приєднань і ${state.deaths} смертей.`
        : `Часовий горизонт або правила кімнати не дають підстав моделювати нове покоління; враховано лише можливі втрати й приєднання.`,
      impact: state.population >= startPopulation ? "positive" : "negative",
      scoreImpact: round(assumptionComponents.find((item) => item.id === "population").value + assumptionComponents.find((item) => item.id === "mortality").value)
    },
    {
      category: "Суспільство",
      title: state.unresolvedConflicts ? "Частина майбутніх конфліктів могла залишитися невирішеною" : "Модель не прогнозує тривалого внутрішнього розколу",
      text: `За ${horizonYears} років змодельовано ${conflicts.length} помітних конфліктів; невирішених — ${state.unresolvedConflicts}.`,
      impact: state.unresolvedConflicts ? "negative" : "positive",
      scoreImpact: round(assumptionComponents.find((item) => item.id === "conflicts").value)
    },
    {
      category: "Розвиток",
      title: `Можливий етап: ${settlement.stage}`,
      text: `Це один детермінований прогноз із наявних умов, а не гарантоване майбутнє. Збудованих об’єктів у сценарії: ${settlement.buildings.length}.`,
      impact: settlement.level >= 2 ? "positive" : "neutral",
      scoreImpact: round(assumptionComponents.find((item) => item.id === "settlement").value)
    }
  ];
  addChronicle(chronicle, `Рік ${horizonYears}`, "Підсумок", finalVerdict.verdict, `${finalVerdict.description} Населення: ${state.population};${demographyModeled ? ` народжень: ${state.births};` : ""} смертей: ${state.deaths}; етап поселення — ${settlement.stage}.`, finalScore >= 65 ? "good" : finalScore >= 40 ? "warn" : "bad");

  return {
    horizonYears,
    initialScore,
    finalScore,
    scoreAdjustment: assumptionImpact,
    assumptionImpact,
    assumptionCap: 12,
    assumptionComponents: assumptionComponents.map((item) => ({ ...item, value: round(item.value) })),
    simulationAssumptions,
    verdict: finalVerdict.verdict,
    description: finalVerdict.description,
    timeSlices,
    chronicle,
    conflicts,
    medical: medicalSummary,
    demography,
    settlement,
    personalFates: personalFateList,
    finalResources: resourceSnapshot(state.resources),
    finalModuleAverage: round(avgModules)
  };
}

module.exports = { simulateLongTerm, isolationHorizonYears, milestonesFor };

"use strict";

const assert = require("assert");
const { simulateLongTerm } = require("./final_simulation");

function makePlayer(index, setting, severe = false) {
  const female = index % 2 === 0;
  const professions = ["Парамедик", "Інженер", "Агроном", "Психолог", "Учитель", "Військовий"];
  const skills = ["Домедична допомога", "Ремонт механізмів", "Гідропонне вирощування", "Переговори", "Навчання дітей", "Оборона периметра"];
  return {
    id: `p${index}`,
    name: `Гравець ${index + 1}`,
    active: true,
    eliminatedRound: null,
    outsideRole: null,
    character: {
      age: `${24 + index * 3} років`,
      sex: female ? "Жіноча" : "Чоловіча",
      reproductiveStatus: "Може мати біологічних дітей",
      attitudeToChildren: index < 4 ? "Хоче мати дітей" : "Не заперечує проти дітей",
      parentalStatus: "Не має дітей",
      profession: professions[index % professions.length],
      skill: skills[index % skills.length],
      hobby: "Читання",
      trait: index === 5 ? "Авторитарний" : index === 3 ? "Співчутливий" : "Відповідальний",
      relationship: index === 5 ? "Має давній конфлікт із гравцем «Гравець 1»." : "Колись працював / працювала разом із гравцем «Гравець 2».",
      relationshipTargetId: index === 5 ? "p0" : "p1",
      role: index === 5 ? { id: "saboteur", faction: "Загроза" } : { id: "survivor", faction: "Громада" },
      health: severe ? "Пневмонія" : "Цілком здоровий",
      medicalCondition: severe
        ? { name: "Пневмонія", severity: 4, treatable: true, progressive: true, contagious: true }
        : { name: "Немає активної хвороби", severity: 0, treatable: false, progressive: false, contagious: false },
      injury: severe ? 2 : 0,
      stress: index === 5 ? 3 : 1,
      successfulExpeditions: index === 1 ? 1 : 0,
      successfulRepairs: index === 1 ? 2 : 0,
      successfulTreatments: index === 0 ? 2 : 0
    }
  };
}

function makeRoom(setting, code, severe = false) {
  const isolation = setting === "fantasy" ? "20–35 років" : setting === "space" ? "невідомо" : "3–9 років";
  return {
    code,
    settings: { setting, capacity: 7 },
    players: Array.from({ length: 6 }, (_, index) => makePlayer(index, setting, severe && index === 4)),
    game: {
      round: 4,
      scenario: { title: `Тестова катастрофа ${setting}`, pressure: setting === "horror" ? 1.25 : 1.05, modules: { isolation }, lore: {} },
      shelter: {
        title: `Тестове сховище ${setting}`,
        roomCount: 28,
        allies: 1,
        resources: { food: 82, water: 84, energy: 78, integrity: 80, medicine: 76, morale: 72 },
        modules: ["Вентиляція", "Генератор", "Вода", "Медицина", "Зв’язок", "Житло"].map((name, index) => ({ name, condition: 72 + index * 3 }))
      },
      expeditionHistory: [{ success: true }, { success: true }],
      repairHistory: [{ success: true }, { success: true }],
      log: ["Партію розпочато", "Експедиція завершилася успішно", "Ремонт завершено"]
    }
  };
}

const settings = ["modern", "fantasy", "space", "postapocalypse", "cyberpunk", "horror", "detective"];
for (const setting of settings) {
  const result = simulateLongTerm(makeRoom(setting, `ROOM_${setting}`), 68);
  assert(result.timeSlices.length >= 6, `${setting}: замало часових зрізів`);
  assert(result.chronicle.length >= 2, `${setting}: порожня хроніка`);
  assert(result.personalFates.length === 6, `${setting}: неправильна кількість персональних доль`);
  assert(Number.isFinite(result.finalScore), `${setting}: score NaN`);
  assert(result.settlement.stage, `${setting}: немає етапу поселення`);
  assert(Object.values(result.finalResources).every(Number.isFinite), `${setting}: некоректні ресурси`);
}

let sawBirth = false;
let sawDeath = false;
let sawConflict = false;
for (let index = 0; index < 80; index += 1) {
  const room = makeRoom("fantasy", `BIRTH_${index}`, true);
  const result = simulateLongTerm(room, 70);
  sawBirth ||= result.demography.births > 0;
  sawDeath ||= result.demography.deaths > 0;
  sawConflict ||= result.conflicts.length > 0;
  if (sawBirth && sawDeath && sawConflict) break;
}
assert(sawBirth, "У серії довгих стабільних симуляцій не спрацювала механіка народжень.");
assert(sawDeath, "У серії симуляцій із критичним пацієнтом не спрацювала механіка смертей.");
assert(sawConflict, "У серії симуляцій не спрацювала механіка персональних конфліктів.");

console.log("Фінальну симуляцію 1.2.10 перевірено успішно для 7 сетингів.");

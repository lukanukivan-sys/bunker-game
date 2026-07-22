"use strict";
const assert = require("assert");
const { simulateLongTerm } = require("./final_simulation");

function player(id, name, sex, reproductiveStatus, attitude, age = 29) {
  return {
    id, name, active: true, eliminatedRound: null, outsideRole: null,
    character: {
      age: `${age} років`, sex,
      canBecomePregnant: /Жіноча|Інтерсекс/.test(sex) ? true : false,
      reproductiveStatus, attitudeToChildren: attitude, parentalStatus: "Не має дітей",
      profession: id === "a" ? "Парамедик" : id === "b" ? "Інженер" : "Агроном",
      skill: id === "a" ? "Домедична допомога" : id === "b" ? "Ремонт механізмів" : "Гідропонне вирощування",
      hobby: "Читання", trait: "Відповідальний", relationship: "Довіряє іншому мешканцю", relationshipTargetId: null,
      role: { id: "survivor", faction: "Громада" }, health: "Цілком здоровий",
      medicalCondition: { name: "Немає активної хвороби", severity: 0, treatable: false, progressive: false, contagious: false },
      injury: 0, stress: 0, successfulExpeditions: 0, successfulRepairs: 0, successfulTreatments: 0
    }
  };
}
function room(code, pregnancy = false) {
  return {
    code,
    settings: { setting: "modern", capacity: 3 },
    players: [
      player("a", "Марія", "Жіноча", pregnancy ? "Мікроплацентна вагітність" : "Фертильний", "Хоче мати дітей"),
      player("b", "Іван", "Чоловіча", "Фертильний", "Хоче мати дітей", 31),
      player("c", "Олег", "Чоловіча", "Фертильний", "Не заперечує проти дітей", 34)
    ],
    game: {
      round: 4,
      scenario: { title: "Тест", pressure: 0.9, modules: { isolation: "3–9 років" }, lore: {} },
      shelter: {
        title: "Аграрне сховище", residentCapacity: 18, roomCount: 28, allies: 0,
        resources: { food: 78, water: 80, energy: 70, integrity: 76, medicine: 72, morale: 75 },
        modules: ["Вентиляція", "Генератор", "Вода", "Медицина", "Зв’язок", "Житло"].map((name) => ({ name, condition: 78 }))
      },
      expeditionHistory: [], repairHistory: [], log: ["Тестова партія"]
    }
  };
}
const pregnant = simulateLongTerm(room("PREGNANT", true), 72);
assert(pregnant.demography.births >= 1, "Початкова вагітність не завершилася народженням у стабільній громаді.");
assert(/вагітн|народж/i.test(pregnant.demography.explanation), "Немає пояснення демографічного результату.");
let plannedBirth = false;
for (let i = 0; i < 20; i += 1) {
  const result = simulateLongTerm(room(`PLANNED_${i}`, false), 74);
  if (result.demography.births > 0) { plannedBirth = true; break; }
}
assert(plannedBirth, "У серії стабільних сумісних громад без чайлдфрі жодного разу не відбулося народження.");
console.log("1.2.10: початкова вагітність, планована народжуваність і пояснення демографії працюють.");

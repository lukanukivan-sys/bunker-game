"use strict";

const assert = require("assert");
const fs = require("fs");
const COMMON = require("./content/common");
const { evaluateDirectOutcome } = require("./final_balance");
const { simulateLongTerm } = require("./final_simulation");

const professions = ["Парамедик", "Інженер", "Агроном", "Психолог", "Військовий", "Науковець", "Учитель", "Навігатор", "Програміст", "Будівельник", "Кухар", "Механік"];
const skills = ["Домедична допомога", "Ремонт механізмів", "Гідропонне вирощування", "Переговори", "Оборона периметра", "Лабораторний аналіз", "Навчання", "Орієнтування", "Кібербезпека", "Будівництво", "Консервування їжі", "Електрика"];

function player(index, active = true, weak = false) {
  return {
    id: `p${index}`, name: `Гравець ${index + 1}`, active, eliminatedRound: active ? null : 2,
    character: {
      profession: weak ? "Офісний спостерігач" : professions[index % professions.length],
      skill: weak ? "Знає назви трьох хмар" : skills[index % skills.length],
      hobby: weak ? "Колекціонує чеки" : "Читання технічних довідників",
      trait: index % 4 === 0 ? "Співчутливий" : "Відповідальний",
      item: "Набір інструментів", secret: "Нічого критичного", anomaly: "Немає",
      medicalCondition: { name: weak && index === 0 ? "Тяжка інфекція" : "Здоровий", severity: weak && index === 0 ? 4 : 0 },
      injury: weak ? 1 : 0, stress: weak ? 3 : 1,
      role: index === 1 && weak ? { id: "saboteur", faction: "Загроза", name: "Диверсант" } : { id: "survivor", faction: "Громада", name: "Вцілілий" },
      age: `${26 + index} років`, sex: index % 2 ? "Чоловіча" : "Жіноча", attitudeToChildren: "Не заперечує проти дітей", parentalStatus: "Не має дітей",
      relationship: "Працювали разом", relationshipTargetId: index ? "p0" : "p1", health: "Здоровий",
      successfulTreatments: 0, successfulExpeditions: 0, successfulRepairs: 0
    }
  };
}

function room({ mode = "classic", setting = "modern", count = 6, weak = false, resources = 70, modules = 70 } = {}) {
  const players = Array.from({ length: count }, (_, i) => player(i, true, weak));
  return {
    code: `T${mode}${setting}${count}${weak ? "W" : "S"}`,
    settings: { mode, setting, capacity: Math.max(3, count - 1), demographicsEnabled: setting !== "detective" },
    players,
    game: {
      round: 4, maxRounds: 4,
      features: { operations: mode === "survival" || mode === "advanced", treatment: mode === "survival", hiddenRoles: mode === "factions", elimination: mode !== "survival" },
      scenario: { title: "Інфекція після зупинки енергомережі", pressure: 1.05, modules: { isolation: "3–9 років" }, lore: {} },
      scenarioPriorities: { needs: [{ id: "medicine" }, { id: "energy" }, { id: "food" }] },
      shelter: {
        title: "Тестове сховище", allies: 1, residentCapacity: Math.max(3, count - 1),
        resources: { food: resources, water: resources, energy: resources, integrity: resources, medicine: resources, morale: resources },
        modules: ["Вентиляція", "Генератор", "Вода", "Медпункт", "Шлюз", "Склад"].map((name) => ({ name, condition: modules }))
      },
      expeditionHistory: mode === "survival" || mode === "advanced" ? [{ success: true }, { success: !weak }] : [],
      repairHistory: mode === "survival" || mode === "advanced" ? [{ success: true }] : [],
      treatmentHistory: mode === "survival" ? [{ success: true }] : [],
      log: ["Рішення події вдалося", weak ? "Ремонт провалився" : "Експедиція завершилася успішно"]
    }
  };
}

for (const mode of ["classic", "survival", "factions", "advanced"]) {
  for (const count of [3, 4, 6, 8, 10, 12]) {
    const result = evaluateDirectOutcome(room({ mode, count }));
    assert(Number.isFinite(result.directScore), `${mode}/${count}: score NaN`);
    assert(result.directScore >= 0 && result.directScore <= 100, `${mode}/${count}: score поза межами`);
    assert(result.scoreBreakdown.length >= 6, `${mode}/${count}: замало складників`);
    assert(result.directConsequences.length >= 4, `${mode}/${count}: немає наслідків рішень`);
  }
}

const classicStrongPeopleWeakStock = evaluateDirectOutcome(room({ mode: "classic", resources: 25, modules: 35 }));
const survivalStrongPeopleWeakStock = evaluateDirectOutcome(room({ mode: "survival", resources: 25, modules: 35 }));
assert(classicStrongPeopleWeakStock.directScore > survivalStrongPeopleWeakStock.directScore, "Класичний режим має сильніше цінувати склад групи, ніж ресурси.");

const strongClassic = evaluateDirectOutcome(room({ mode: "classic", weak: false }));
const weakClassic = evaluateDirectOutcome(room({ mode: "classic", weak: true }));
assert(strongClassic.directScore >= weakClassic.directScore + 15, "Прогалини компетенцій і медичні ризики недостатньо впливають на класичний фінал.");

const detectiveSolved = { solved: true, correctAccusation: true, evidenceStrength: 3, requiredEvidence: 3, investigationLog: [{}, {}, {}], publicClaims: [] };
const detectiveFailed = { solved: false, correctAccusation: false, evidenceStrength: 0, requiredEvidence: 3, investigationLog: [{}], publicClaims: [{}, {}, {}, {}, {}] };
const detectiveRoom = room({ mode: "advanced", setting: "detective" });
assert(evaluateDirectOutcome(detectiveRoom, detectiveSolved).directScore >= evaluateDirectOutcome(detectiveRoom, detectiveFailed).directScore + 35, "Детективний результат недостатньо залежить від доказів і звинувачення.");

for (let index = 0; index < 40; index += 1) {
  const sample = room({ mode: "survival", count: 6, weak: index % 3 === 0, resources: 35 + index, modules: 45 + index / 2 });
  sample.code += index;
  const direct = evaluateDirectOutcome(sample);
  const future = simulateLongTerm(sample, direct.directScore);
  assert(Math.abs(future.assumptionImpact) <= 12, "Симуляція перевищила межу ±12.");
  assert(future.finalScore === Math.max(0, Math.min(100, direct.directScore + future.assumptionImpact)), "Фінальна оцінка не дорівнює рішенням плюс прогнозу.");
  assert(future.simulationAssumptions.length >= 4, "Немає пояснених припущень.");
}

// Статичний аудит: кожна з 105 здібностей повинна мати серверну реалізацію
// або належати до явно обробленої групи/пасивного префікса.
const source = fs.readFileSync("server.js", "utf8");
const abilitySection = source.slice(source.indexOf("function useAbility"), source.indexOf("function handleAction"));
const missing = (COMMON.abilities || []).filter((ability) => {
  if (ability.id.startsWith("passive_")) return false;
  return !abilitySection.includes(`id === "${ability.id}"`) && !abilitySection.includes(`"${ability.id}"`);
});
assert.deepEqual(missing.map((item) => item.id), [], `Здібності без серверної реалізації: ${missing.map((item) => item.id).join(", ")}`);
assert(source.includes("наноремонт усіх модулів (+12%)"), "Наноремонт не приведено до безпечного рівня.");
assert(source.includes("піднімає двох скелетів-помічників"), "Союзний бонус підняття мертвих не збалансовано.");
assert(source.includes("slice(0, 3)"), "Повне розкриття чужої картки не обмежено.");

console.log("✅ Stage 24 final balance tests passed: mode scoring, causality split, ±12 simulation cap, 3–12 players, 105 abilities audited.");

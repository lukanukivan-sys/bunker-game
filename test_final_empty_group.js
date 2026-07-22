"use strict";

const assert = require("assert");
const { evaluateDirectOutcome } = require("./final_balance");

const room = {
  settings: {
    mode: "classic",
    setting: "modern",
    capacity: 1
  },
  players: [
    {
      id: "solo",
      name: "Іван",
      active: false,
      character: {
        profession: "Інженер",
        skill: "Ремонт систем",
        hobby: "Радіо",
        trait: "Спокійний",
        item: "Набір інструментів",
        secret: "",
        anomaly: "",
        role: { faction: "Громада" },
        medicalCondition: { severity: 0 },
        injury: 0,
        stress: 0
      }
    }
  ],
  game: {
    shelter: {
      residentCapacity: 1,
      resources: {
        food: 100,
        water: 100,
        energy: 100,
        integrity: 100,
        medicine: 100,
        morale: 100
      },
      modules: [
        { name: "Вентиляція", condition: 100 },
        { name: "Водопостачання", condition: 100 }
      ]
    },
    features: {},
    expeditionHistory: [],
    repairHistory: [],
    treatmentHistory: [],
    scenarioPriorities: { needs: [] },
    log: []
  }
};

const result = evaluateDirectOutcome(room);

assert.strictEqual(result.hasFinalGroup, false, "Порожня фінальна група має бути явно позначена");
assert.strictEqual(result.directScore, 0, "Порожня група не повинна отримувати бали за ресурси та модулі");
assert.strictEqual(result.metrics.competence, 0);
assert.strictEqual(result.metrics.fit, 0);
assert.strictEqual(result.metrics.medical, 0);
assert.strictEqual(result.metrics.social, 0);
assert.strictEqual(result.metrics.selection, 0);
assert.match(result.directConsequences[0].title, /не залишилося активних учасників/i);

console.log("✅ Порожня фінальна група завжди отримує 0 балів і не може вважатися життєздатною.");

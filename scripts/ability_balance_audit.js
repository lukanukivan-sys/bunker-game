"use strict";

const fs = require("fs");
const path = require("path");
const { COMMON, ABILITY_BALANCE_PROFILES } = require("../content");

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "reports", "ability_balance_audit.md");
const abilities = COMMON.abilities || [];
const profiles = ABILITY_BALANCE_PROFILES || {};
const missing = abilities.filter((ability) => !profiles[ability.id]);
const guaranteed = abilities.filter((ability) => profiles[ability.id]?.guaranteedSuccess);
const invalid = abilities.filter((ability) => {
  const profile = profiles[ability.id];
  return !profile || !["низький", "середній", "високий"].includes(profile.powerTier)
    || !Number.isFinite(profile.survivalImpact) || !Number.isFinite(profile.votingImpact)
    || !Number.isFinite(profile.informationValue) || !Number.isFinite(profile.costRisk);
});
const byTier = abilities.reduce((map, ability) => {
  const tier = profiles[ability.id]?.powerTier || "невідомий";
  map[tier] = (map[tier] || 0) + 1;
  return map;
}, {});
const highWithoutCost = abilities.filter((ability) => profiles[ability.id]?.powerTier === "високий" && profiles[ability.id]?.costRisk === 0);

const rows = abilities.map((ability) => {
  const profile = profiles[ability.id];
  return `| \`${ability.id}\` | ${ability.name} | ${profile.powerTier} | ${profile.activationFrequency} | ${profile.resourceImpact} | ${profile.survivalImpact} | ${profile.votingImpact} | ${profile.informationValue} | ${profile.costRisk} | ${profile.modeDependency} |`;
});
const report = `# Аудит балансу здібностей 1.2.10

Згенеровано: ${new Date().toISOString()}

## Підсумок

- Здібностей: **${abilities.length}**.
- Профілів балансу: **${Object.keys(profiles).length}**.
- Низький вплив: **${byTier["низький"] || 0}**.
- Середній вплив: **${byTier["середній"] || 0}**.
- Високий вплив: **${byTier["високий"] || 0}**.
- Здібностей із гарантованим успіхом: **${guaranteed.length}**.
- Високовпливових здібностей без явно врахованої ціни/ризику: **${highWithoutCost.length}**.

Оцінка охоплює частоту активації, вплив на ресурси, виживання, голосування, інформацію, ціну/ризик і залежність від режиму. Профіль не замінює живого плейтесту, але робить різницю між «цікаво» і «сильно» видимою та машинно перевірюваною.

## Повна таблиця

| ID | Назва | Рівень | Частота | Ресурси | Виживання | Голоси | Інформація | Ціна/ризик | Залежність |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
${rows.join("\n")}

## Автоматичні застереження

${missing.length ? `Відсутні профілі: ${missing.map((item) => item.id).join(", ")}.` : "Усі здібності мають профіль."}

${guaranteed.length ? `Залишилися гарантовані успіхи: ${guaranteed.map((item) => item.id).join(", ")}.` : "Гарантовані успіхи прибрано; сильні експедиційні здібності дають великий бонус і захист від травм, але лишають шанс невдачі."}

${highWithoutCost.length ? `Потребують ручного плейтесту через високий вплив без прямої ціни: ${highWithoutCost.map((item) => item.id).join(", ")}.` : "Усі високовпливові здібності мають враховану ціну, ризик або обмежену сферу застосування."}
`;
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, report, "utf8");
console.log(`Аудит здібностей: ${abilities.length}/${Object.keys(profiles).length}; звіт ${path.relative(ROOT, OUTPUT)}.`);
if (missing.length || invalid.length || guaranteed.length) process.exitCode = 1;

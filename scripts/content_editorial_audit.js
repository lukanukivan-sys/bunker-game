"use strict";

const fs = require("fs");
const path = require("path");
const content = require("../content");

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "reports", "content_editorial_audit.md");
const TEXT_KEYS = new Set(["name", "title", "description", "text", "goodText", "badText", "objective", "note", "collapse", "surface", "horizon"]);
const entries = [];
function walk(value, currentPath = "content") {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${currentPath}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    const next = `${currentPath}.${key}`;
    if (typeof item === "string" && TEXT_KEYS.has(key) && item.trim()) entries.push({ path: next, key, text: item.trim() });
    else if (typeof item === "object") walk(item, next);
  }
}
for (const key of ["COMMON", "SETTINGS", "RELATIONSHIPS", "EVENTS", "EXPEDITIONS", "LORE", "SCENARIOS", "STAGE23"]) walk(content[key], key);

const normalize = (text) => text.toLocaleLowerCase("uk").replace(/[«»“”"'’.,!?;:()\[\]{}—–-]/gu, " ").replace(/\s+/gu, " ").trim();
const duplicateMap = new Map();
for (const entry of entries) {
  const key = normalize(entry.text);
  if (key.length < 18) continue;
  const list = duplicateMap.get(key) || [];
  list.push(entry);
  duplicateMap.set(key, list);
}
const duplicates = [...duplicateMap.values()].filter((list) => list.length > 1).sort((a, b) => b.length - a.length || a[0].text.localeCompare(b[0].text, "uk"));
const russianMarkers = /\b(является|имеется|данный|согласно|находится|требуется|следующий|должен быть|позволяет)\b/iu;
const suspiciousLanguage = entries.filter((entry) => russianMarkers.test(entry.text));
const latinHeavy = entries.filter((entry) => {
  const letters = entry.text.match(/[A-Za-zА-Яа-яІіЇїЄєҐґ]/gu) || [];
  const latin = entry.text.match(/[A-Za-z]/gu) || [];
  return letters.length >= 24 && latin.length / letters.length > 0.65 && !/^[A-Z0-9 _./:+-]+$/u.test(entry.text);
});
const emptyMechanics = [];
for (const [setting, events] of Object.entries(content.EVENTS || {})) {
  for (const event of events || []) {
    for (const choice of event.choices || []) {
      const good = Object.keys(choice.good || {}).length;
      const bad = Object.keys(choice.bad || {}).length;
      if (!good && !bad) emptyMechanics.push(`${setting}: ${event.title} → ${choice.label}`);
    }
  }
}
const repeatedOpenings = new Map();
for (const entry of entries) {
  const opening = normalize(entry.text).split(" ").slice(0, 4).join(" ");
  if (opening.split(" ").length < 4) continue;
  const list = repeatedOpenings.get(opening) || [];
  list.push(entry);
  repeatedOpenings.set(opening, list);
}
const commonOpenings = [...repeatedOpenings.entries()].filter(([, list]) => list.length >= 6).sort((a, b) => b[1].length - a[1].length).slice(0, 20);

const settingSamples = [];
for (const [setting, data] of Object.entries(content.SETTINGS || {})) {
  for (const category of ["professions", "skills", "traits", "items", "secrets", "shelters"]) {
    const values = data[category] || [];
    if (!values.length) continue;
    const indices = [...new Set([0, Math.floor(values.length / 2), values.length - 1])];
    for (const index of indices) {
      const item = values[index];
      settingSamples.push({ setting, category, text: typeof item === "string" ? item : item.name || item.title || JSON.stringify(item) });
    }
  }
}

const duplicateLines = duplicates.slice(0, 30).map((list) => `- **×${list.length}** ${list[0].text}\n  - ${list.slice(0, 4).map((item) => `\`${item.path}\``).join("; ")}${list.length > 4 ? "; …" : ""}`);
const openingLines = commonOpenings.map(([opening, list]) => `- **×${list.length}** «${opening}…»`);
const sampleLines = settingSamples.map((item) => `- **${item.setting} / ${item.category}:** ${item.text}`);
const report = `# Редакторський аудит контенту 1.2.10

Згенеровано: ${new Date().toISOString()}

## Покриття

- Проаналізовано текстових полів: **${entries.length}**.
- Сетингів: **${Object.keys(content.SETTINGS || {}).length}**.
- Подій: **${Object.values(content.EVENTS || {}).reduce((sum, list) => sum + list.length, 0)}**.
- Експедицій: **${Object.values(content.EXPEDITIONS || {}).reduce((sum, list) => sum + list.length, 0)}**.

## Автоматичні сигнали

- Точні або нормалізовані дублікати довгих фраз: **${duplicates.length}**.
- Підозрілі російські конструкції: **${suspiciousLanguage.length}**.
- Непояснено англомовні довгі фрагменти: **${latinHeavy.length}**.
- Варіанти подій без механічного наслідку: **${emptyMechanics.length}**.

### Найчастіші дублікати

${duplicateLines.length ? duplicateLines.join("\n") : "Довгих дублікатів не знайдено."}

### Повторювані початки конструкцій

${openingLines.length ? openingLines.join("\n") : "Надмірно повторюваних початків не знайдено."}

### Мовні сигнали

${suspiciousLanguage.length ? suspiciousLanguage.slice(0, 30).map((item) => `- \`${item.path}\`: ${item.text}`).join("\n") : "Російських канцелярських маркерів не знайдено."}

${latinHeavy.length ? latinHeavy.slice(0, 20).map((item) => `- \`${item.path}\`: ${item.text}`).join("\n") : "Непояснено англомовних довгих фрагментів не знайдено."}

### Події без ефекту

${emptyMechanics.length ? emptyMechanics.map((item) => `- ${item}`).join("\n") : "Усі перевірені варіанти подій мають механічні наслідки."}

## Стратифікована редакторська вибірка

Нижче автоматично сформовано по три записи з початку, середини й кінця ключових категорій кожного сетингу. Це дає відтворювану вибірку для живої редакторської перевірки гумору, природності української та відповідності опису механіці.

${sampleLines.join("\n")}

## Правило випуску

Автоматичний аудит блокує реліз лише за структурної помилки: відсутнього механічного наслідку події або явного неукраїнського службового тексту. Дублікати та повторювані конструкції залишаються редакторськими попередженнями, бо частина повторів може бути навмисною.
`;
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, report, "utf8");
console.log(`Редакторський аудит: ${entries.length} полів; звіт ${path.relative(ROOT, OUTPUT)}.`);
if (emptyMechanics.length || suspiciousLanguage.length) process.exitCode = 1;

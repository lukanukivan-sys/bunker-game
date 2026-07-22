"use strict";

const crypto = require("crypto");
const CONTENT = require("./index");

const BASIC_CATEGORIES = [
  "origins", "professions", "health", "skills", "items", "secrets",
  "traits", "hobbies", "phobias", "anomalies", "relationships"
];
const ADVANCED_CATEGORIES = ["catastrophes", "shelters", "events", "expeditions"];
const LEVELS = new Set(["normal", "odd", "absurd"]);
const KNOWN_EXPEDITION_TAGS = new Set(
  Object.values(CONTENT.EXPEDITIONS || {}).flat().flatMap((item) => item.tags || []).map(String)
);
const CATEGORY_LABELS = {
  origins: "Походження", professions: "Професії", health: "Здоров’я", skills: "Навички",
  items: "Предмети", secrets: "Таємниці", traits: "Риси", hobbies: "Хобі",
  phobias: "Фобії", anomalies: "Аномалії", relationships: "Взаємини",
  catastrophes: "Катастрофи", shelters: "Сховища", events: "Події", expeditions: "Експедиції"
};
const SETTING_SIGNALS = {
  modern: ["міст", "банк", "лікар", "завод", "офіс", "метро", "уряд", "інтернет", "авто", "електр"],
  fantasy: ["магі", "чакл", "дракон", "корол", "лицар", "ельф", "гном", "прокля", "руна", "гобл"],
  space: ["косм", "орбіт", "станці", "зор", "планет", "кисень", "шлюз", "реактор", "астеро", "кораб"],
  postapocalypse: ["радіац", "мутант", "пустк", "рейдер", "брухт", "руїн", "дозиметр", "караван", "бомб", "схрон"],
  cyberpunk: ["кібер", "нейро", "дрон", "мереж", "корпорац", "імплант", "штучн", "хак", "цифров", "сервер"],
  horror: ["привид", "демон", "жах", "кров", "тін", "ритуал", "маренн", "монстр", "прокля", "потойб"],
  detective: ["алібі", "доказ", "свід", "підозр", "слід", "мотив", "злоч", "час", "камер", "протокол"]
};
const SUPPORTED_EFFECT_KEYS = new Set(["food", "water", "energy", "integrity", "medicine", "morale", "allies", "assets"]);
const NUMERIC_EFFECT_KEYS = new Set(["food", "water", "energy", "integrity", "medicine", "morale", "allies"]);
const EFFECT_WEIGHTS = {
  allies: 8, population: 5, morale: 1, food: 1, water: 1, energy: 1,
  medicine: 1.15, integrity: 1.05, shelter: 1, trust: 0.7, threat: -0.7,
  stress: -3, injury: -6, radiation: -1.2, oxygen: 1.2, network: 1,
  fear: -1, contamination: -1.2
};

function clean(value) {
  return String(value ?? "").trim();
}
function itemName(item) {
  if (typeof item === "string") return clean(item);
  return clean(item?.name || item?.title || item?.text || item?.label || item?.id);
}
function normalizeText(value) {
  return clean(value)
    .toLocaleLowerCase("uk")
    .normalize("NFKD")
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function trigrams(value) {
  const text = `  ${normalizeText(value)}  `;
  const result = [];
  for (let i = 0; i < text.length - 2; i += 1) result.push(text.slice(i, i + 3));
  return result;
}
function diceSimilarity(a, b) {
  const one = trigrams(a); const two = trigrams(b);
  if (!one.length || !two.length) return 0;
  const counts = new Map();
  for (const gram of one) counts.set(gram, (counts.get(gram) || 0) + 1);
  let matches = 0;
  for (const gram of two) {
    const count = counts.get(gram) || 0;
    if (count > 0) { matches += 1; counts.set(gram, count - 1); }
  }
  return (2 * matches) / (one.length + two.length);
}
function tokenSimilarity(a, b) {
  const one = new Set(normalizeText(a).split(" ").filter((x) => x.length > 2));
  const two = new Set(normalizeText(b).split(" ").filter((x) => x.length > 2));
  if (!one.size || !two.size) return 0;
  const shared = [...one].filter((x) => two.has(x)).length;
  return shared / (one.size + two.size - shared);
}
function similarity(a, b) {
  const na = normalizeText(a); const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  return Math.max(diceSimilarity(na, nb), tokenSimilarity(na, nb));
}
function issue(severity, code, category, title, message, suggestion = "", index = null) {
  return { severity, code, category, categoryLabel: CATEGORY_LABELS[category] || category, index, title, message, suggestion };
}
function list(input, key) {
  return Array.isArray(input?.entries?.[key]) ? input.entries[key] : [];
}
function baseList(setting, key) {
  const settingId = setting === "all" ? "modern" : setting;
  if (BASIC_CATEGORIES.includes(key)) {
    if (["traits", "hobbies", "phobias", "anomalies"].includes(key)) return CONTENT.COMMON?.[key] || [];
    if (key === "relationships") return CONTENT.RELATIONSHIPS || [];
    return CONTENT.SETTINGS?.[settingId]?.[key] || [];
  }
  if (key === "events") return CONTENT.EVENTS?.[settingId] || [];
  if (key === "expeditions") return CONTENT.EXPEDITIONS?.[settingId] || [];
  if (key === "catastrophes") return CONTENT.SETTINGS?.[settingId]?.catastrophes || [];
  if (key === "shelters") return CONTENT.SETTINGS?.[settingId]?.shelters || [];
  return [];
}
function effectScore(effects) {
  if (!effects || typeof effects !== "object") return 0;
  let score = 0;
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === "number" && Number.isFinite(value)) score += value * (EFFECT_WEIGHTS[key] ?? 1);
    else if (value && typeof value === "string" && ["assets", "asset", "building", "module"].includes(key)) score += 7;
    else if (Array.isArray(value)) score += Math.min(value.length * 5, 15);
  }
  return Math.round(score * 10) / 10;
}
function eventChoiceAnalysis(choice) {
  const success = Number(choice?.success);
  const chance = Number.isFinite(success) ? Math.max(0.05, Math.min(0.98, success)) : 0.5;
  const good = effectScore(choice?.good);
  const bad = effectScore(choice?.bad);
  return {
    id: clean(choice?.id), label: clean(choice?.label) || "Без назви", chance,
    good, bad, expected: Math.round((chance * good + (1 - chance) * bad) * 10) / 10,
    spread: Math.round(Math.abs(good - bad) * 10) / 10
  };
}
function seededRandom(seed) {
  let state = Number.parseInt(crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sample(items, random) {
  if (!items.length) return null;
  return items[Math.floor(random() * items.length)];
}
function buildSimulation(input, sampleSize) {
  const size = Math.max(10, Math.min(100, Number(sampleSize) || 25));
  const categories = ["origins", "professions", "health", "skills", "items", "secrets", "traits", "hobbies", "phobias", "anomalies"];
  const seed = JSON.stringify(input || {});
  const random = seededRandom(seed);
  const cards = [];
  const customHits = Object.fromEntries(categories.map((key) => [key, 0]));
  const seen = Object.fromEntries(categories.map((key) => [key, new Set()]));
  for (let i = 0; i < size; i += 1) {
    const card = { number: i + 1, fields: {} };
    for (const key of categories) {
      const custom = list(input, key);
      const base = baseList(input?.setting || "modern", key);
      const combined = [...base, ...custom];
      const picked = sample(combined, random);
      const name = itemName(picked) || "—";
      card.fields[key] = name;
      seen[key].add(normalizeText(name));
      if (custom.includes(picked)) customHits[key] += 1;
    }
    cards.push(card);
  }
  const coverage = categories.map((key) => {
    const customCount = list(input, key).length;
    return {
      category: key,
      label: CATEGORY_LABELS[key],
      customCount,
      appearances: customHits[key],
      uniqueInSimulation: seen[key].size,
      repeatRisk: customCount > 0 && customCount < Math.ceil(size / 3) ? "high" : customCount > 0 && customCount < size ? "medium" : "low"
    };
  });
  return { requested: size, generated: size, cards: cards.slice(0, 8), coverage };
}
function collectTexts(input) {
  const texts = [];
  for (const key of [...BASIC_CATEGORIES, ...ADVANCED_CATEGORIES]) {
    for (const item of list(input, key)) {
      texts.push(itemName(item), clean(item?.description));
      if (key === "events") for (const choice of item?.choices || []) texts.push(clean(choice?.label), clean(choice?.goodText), clean(choice?.badText));
    }
  }
  return texts.filter(Boolean).join(" ");
}
function analyzePack(input, options = {}) {
  const source = input && typeof input === "object" ? input : {};
  const issues = [];
  const duplicates = [];
  const eventReports = [];
  const expeditionReports = [];
  const counts = {};
  const levels = { normal: 0, odd: 0, absurd: 0, invalid: 0 };
  const setting = clean(source.setting) || "modern";
  const allowedCategories = new Set([...BASIC_CATEGORIES, ...ADVANCED_CATEGORIES]);
  for (const key of Object.keys(source.entries || {})) {
    if (!allowedCategories.has(key)) issues.push(issue("warning", "unknown_category", key, `Невідома категорія «${key}»`, "Гра не використовує цю категорію авторського набору.", "Перенесіть записи до підтримуваної категорії або видаліть поле."));
  }

  if (!clean(source.name)) issues.push(issue("error", "missing_pack_name", "pack", "Немає назви набору", "Без назви набір неможливо зберегти.", "Вкажіть коротку назву до 80 символів."));
  else if (clean(source.name).length > 60) issues.push(issue("warning", "long_pack_name", "pack", "Довга назва набору", `Назва має ${clean(source.name).length} символів.`, "Скоротіть її приблизно до 30–60 символів."));

  for (const key of [...BASIC_CATEGORIES, ...ADVANCED_CATEGORIES]) {
    const items = list(source, key);
    counts[key] = items.length;
    const names = [];
    items.forEach((entry, index) => {
      const name = itemName(entry);
      const level = typeof entry === "object" ? clean(entry.level || "normal") : "normal";
      if (!name) issues.push(issue("error", "empty_entry", key, `Порожній запис №${index + 1}`, "Запис не має назви або тексту.", "Видаліть рядок або додайте назву.", index));
      if (!LEVELS.has(level)) {
        levels.invalid += 1;
        issues.push(issue("error", "invalid_level", key, name || `Запис №${index + 1}`, `Невідомий рівень абсурдності «${level}».`, "Використовуйте normal, odd або absurd.", index));
      } else levels[level] += 1;
      if (name.length > 115) issues.push(issue("warning", "long_entry_name", key, name.slice(0, 80), `Назва має ${name.length} символів і може погано виглядати на телефоні.`, "Скоротіть назву до 60–100 символів, а пояснення перенесіть в опис.", index));
      names.push({ name, index });
    });

    for (let i = 0; i < Math.min(names.length, 250); i += 1) {
      for (let j = i + 1; j < Math.min(names.length, 250); j += 1) {
        const score = similarity(names[i].name, names[j].name);
        if (score >= 0.84) duplicates.push({ category: key, categoryLabel: CATEGORY_LABELS[key], source: "pack", one: names[i].name, two: names[j].name, similarity: Math.round(score * 100) });
        if (duplicates.length >= 60) break;
      }
      if (duplicates.length >= 60) break;
    }
    if (duplicates.length < 60) {
      const base = baseList(setting, key).slice(0, 300).map(itemName).filter(Boolean);
      for (const current of names.slice(0, 150)) {
        let best = null;
        for (const original of base) {
          const score = similarity(current.name, original);
          if (score >= 0.9 && (!best || score > best.score)) best = { original, score };
        }
        if (best) duplicates.push({ category: key, categoryLabel: CATEGORY_LABELS[key], source: "base", one: current.name, two: best.original, similarity: Math.round(best.score * 100) });
        if (duplicates.length >= 60) break;
      }
    }
  }

  for (const duplicate of duplicates) {
    issues.push(issue(
      duplicate.similarity >= 97 ? "warning" : "suggestion",
      duplicate.source === "base" ? "similar_to_base" : "similar_inside_pack",
      duplicate.category,
      `Схожі записи: «${duplicate.one}»`,
      `${duplicate.similarity}% схожості з «${duplicate.two}»${duplicate.source === "base" ? " з базового контенту" : " у цьому наборі"}.`,
      "Переконайтеся, що ці записи створюють справді різні ситуації."
    ));
  }

  list(source, "catastrophes").forEach((item, index) => {
    const title = clean(item?.title);
    const description = clean(item?.description);
    if (!title) issues.push(issue("error", "catastrophe_title", "catastrophes", `Катастрофа №${index + 1}`, "Немає назви.", "Додайте поле title.", index));
    if (!description) issues.push(issue("warning", "catastrophe_description", "catastrophes", title || `Катастрофа №${index + 1}`, "Немає опису передумов і стану світу.", "Додайте description хоча б на 1–3 речення.", index));
    if (!clean(item?.threat)) issues.push(issue("warning", "catastrophe_threat", "catastrophes", title || `Катастрофа №${index + 1}`, "Не вказано головну загрозу.", "Додайте коротке поле threat.", index));
    if (description.length > 420) issues.push(issue("warning", "long_catastrophe", "catastrophes", title, `Опис має ${description.length} символів.`, "Скоротіть його до 150–400 символів.", index));
  });

  list(source, "shelters").forEach((item, index) => {
    const title = clean(item?.title);
    const modules = Array.isArray(item?.modules) ? item.modules.filter(Boolean) : [];
    if (!title) issues.push(issue("error", "shelter_title", "shelters", `Сховище №${index + 1}`, "Немає назви.", "Додайте поле title.", index));
    if (!modules.length) issues.push(issue("error", "shelter_modules", "shelters", title || `Сховище №${index + 1}`, "Сховище не має модулів.", "Додайте 4–10 тематичних модулів.", index));
    if (modules.length > 12) issues.push(issue("warning", "too_many_modules", "shelters", title, `Вказано ${modules.length} модулів.`, "Надлишок модулів перевантажує картку; залиште найважливіші.", index));
  });

  const eventIds = new Set();
  list(source, "events").forEach((event, index) => {
    const rawTitle = clean(event?.title);
    const title = rawTitle || `Подія №${index + 1}`;
    const description = clean(event?.description);
    const choices = Array.isArray(event?.choices) ? event.choices : [];
    const eventId = clean(event?.id);
    if (!rawTitle) issues.push(issue("error", "event_title", "events", title, "Подія не має назви.", "Додайте поле title.", index));
    if (!eventId) issues.push(issue("warning", "event_id", "events", title, "Не вказано стабільний id.", "Додайте короткий латинський id, наприклад broken_filter.", index));
    else if (eventIds.has(eventId)) issues.push(issue("error", "duplicate_event_id", "events", title, `ID «${eventId}» повторюється.`, "Кожна подія повинна мати унікальний id.", index));
    eventIds.add(eventId);
    if (!description) issues.push(issue("warning", "event_description", "events", title, "Немає опису ситуації.", "Додайте 1–3 речення, які створюють дилему.", index));
    if (description.length > 480) issues.push(issue("warning", "long_event_description", "events", title, `Опис має ${description.length} символів.`, "Скоротіть його, щоб подія читалася за 15–25 секунд.", index));
    if (choices.length < 2) issues.push(issue("error", "event_choices", "events", title, "Подія має менше двох рішень.", "Додайте щонайменше два тактично різні варіанти.", index));
    const choiceReports = choices.map(eventChoiceAnalysis);
    const ids = new Set();
    choices.forEach((choice, cIndex) => {
      const id = clean(choice?.id);
      if (!id) issues.push(issue("warning", "choice_id", "events", `${title}: рішення ${cIndex + 1}`, "Рішення не має id.", "Додайте короткий латинський id.", index));
      else if (ids.has(id)) issues.push(issue("error", "duplicate_choice_id", "events", `${title}: ${id}`, "ID рішення повторюється.", "Кожне рішення події повинно мати унікальний id.", index));
      ids.add(id);
      const label = clean(choice?.label);
      const chanceValue = Number(choice?.success);
      if (!Number.isFinite(chanceValue) || chanceValue < 0.05 || chanceValue > 0.98) issues.push(issue("error", "choice_success", "events", `${title}: ${label || `рішення ${cIndex + 1}`}`, `Шанс «${choice?.success}» має бути числом від 0.05 до 0.98.`, "Наприклад, 0.65 означає базові 65%.", index));
      for (const [outcomeKey, effects] of [["good", choice?.good], ["bad", choice?.bad]]) {
        for (const [effectKey, effectValue] of Object.entries(effects || {})) {
          if (!SUPPORTED_EFFECT_KEYS.has(effectKey)) issues.push(issue("warning", "unsupported_effect", "events", `${title}: ${label || `рішення ${cIndex + 1}`}`, `Поле ${outcomeKey}.${effectKey} не підтримується й буде проігнороване грою.`, `Використовуйте: ${[...SUPPORTED_EFFECT_KEYS].join(", ")}.`, index));
          else if (NUMERIC_EFFECT_KEYS.has(effectKey) && !Number.isFinite(Number(effectValue))) issues.push(issue("error", "non_numeric_effect", "events", `${title}: ${label || `рішення ${cIndex + 1}`}`, `Значення ${outcomeKey}.${effectKey} має бути числом.`, "Вкажіть додатне число для нагороди або від’ємне для втрати.", index));
        }
      }
      if (label.length > 120) issues.push(issue("warning", "long_choice_label", "events", title, `Рішення «${label.slice(0, 70)}…» занадто довге.`, "Залиште дію в label, а пояснення перенесіть у наслідки.", index));
      if (!Object.keys(choice?.good || {}).length && !Object.keys(choice?.bad || {}).length) issues.push(issue("warning", "empty_choice_effects", "events", `${title}: ${label || `рішення ${cIndex + 1}`}`, "Рішення не змінює жодного показника.", "Додайте реальну ціну, ризик або нагороду.", index));
      if (!clean(choice?.goodText) || !clean(choice?.badText)) issues.push(issue("suggestion", "missing_outcome_text", "events", `${title}: ${label || `рішення ${cIndex + 1}`}`, "Для одного з результатів немає текстового пояснення.", "Додайте goodText і badText, щоб журнал пояснював наслідок.", index));
    });
    let dominant = null;
    for (const candidate of choiceReports) {
      const others = choiceReports.filter((item) => item !== candidate);
      if (others.length && others.every((other) => candidate.expected >= other.expected + 8 && candidate.chance >= other.chance - 0.01 && candidate.bad >= other.bad - 2)) dominant = candidate;
    }
    if (dominant) issues.push(issue("warning", "dominant_event_choice", "events", title, `Рішення «${dominant.label}» виглядає однозначно найкращим: очікувана цінність ${dominant.expected}.`, "Зменште шанс або нагороду, додайте ціну чи посильте альтернативи.", index));
    for (const report of choiceReports) {
      if (report.expected > 38) issues.push(issue("warning", "choice_too_strong", "events", `${title}: ${report.label}`, `Очікувана цінність ${report.expected} значно вища за типові рішення.`, "Зменште нагороду або шанс успіху.", index));
      if (report.expected < -24) issues.push(issue("warning", "choice_too_punishing", "events", `${title}: ${report.label}`, `Очікувана цінність ${report.expected} може бути надмірно каральною.`, "Додайте компенсацію або зменште штраф.", index));
    }
    eventReports.push({ id: clean(event?.id), title, choices: choiceReports, dominantChoice: dominant?.id || null });
  });

  const expeditionIds = new Set();
  list(source, "expeditions").forEach((expedition, index) => {
    const rawName = clean(expedition?.name);
    const name = rawName || `Експедиція №${index + 1}`;
    const tags = Array.isArray(expedition?.tags) ? expedition.tags.map(clean).filter(Boolean) : [];
    const difficulty = Number(expedition?.difficulty);
    const reward = effectScore(expedition?.success);
    const loss = effectScore(expedition?.failure);
    const expeditionId = clean(expedition?.id);
    if (!rawName) issues.push(issue("error", "expedition_name", "expeditions", name, "Експедиція не має назви.", "Додайте поле name.", index));
    if (!expeditionId) issues.push(issue("warning", "expedition_id", "expeditions", name, "Не вказано стабільний id.", "Додайте латинський id.", index));
    else if (expeditionIds.has(expeditionId)) issues.push(issue("error", "duplicate_expedition_id", "expeditions", name, `ID «${expeditionId}» повторюється.`, "Кожна експедиція повинна мати унікальний id.", index));
    expeditionIds.add(expeditionId);
    for (const [outcomeKey, effects] of [["success", expedition?.success], ["failure", expedition?.failure]]) {
      for (const [effectKey, effectValue] of Object.entries(effects || {})) {
        if (!SUPPORTED_EFFECT_KEYS.has(effectKey)) issues.push(issue("warning", "unsupported_effect", "expeditions", name, `Поле ${outcomeKey}.${effectKey} не підтримується й буде проігнороване грою.`, `Використовуйте: ${[...SUPPORTED_EFFECT_KEYS].join(", ")}.`, index));
        else if (NUMERIC_EFFECT_KEYS.has(effectKey) && !Number.isFinite(Number(effectValue))) issues.push(issue("error", "non_numeric_effect", "expeditions", name, `Значення ${outcomeKey}.${effectKey} має бути числом.`, "Вкажіть додатне або від’ємне число.", index));
      }
    }
    if (!tags.length) issues.push(issue("warning", "missing_expedition_tags", "expeditions", name, "Немає тегів компетенцій.", "Додайте 2–4 теги, наприклад medicine, technical, survival.", index));
    const unknown = tags.filter((tag) => !KNOWN_EXPEDITION_TAGS.has(tag));
    if (unknown.length) issues.push(issue("suggestion", "unknown_expedition_tags", "expeditions", name, `Нові теги: ${unknown.join(", ")}.`, "Нові теги дозволені, але базові професії можуть їх не підтримувати.", index));
    if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 6) issues.push(issue("error", "expedition_difficulty", "expeditions", name, `Складність «${expedition?.difficulty}» поза межами 1–6.`, "Вкажіть ціле число від 1 до 6.", index));
    if (reward > 35) issues.push(issue("warning", "expedition_reward", "expeditions", name, `Нагорода має силу ${reward}, що вище типової.`, "Зменште сумарні ресурси або підвищте складність.", index));
    if (loss < -32) issues.push(issue("warning", "expedition_failure", "expeditions", name, `Штраф невдачі має силу ${loss}.`, "Послабте втрати або додайте компенсацію.", index));
    if (reward <= 4) issues.push(issue("suggestion", "weak_expedition_reward", "expeditions", name, `Нагорода має силу лише ${reward}.`, "Перевірте, чи маршрут вартий ризику й окремої фази.", index));
    expeditionReports.push({ id: clean(expedition?.id), name, difficulty: Number.isFinite(difficulty) ? difficulty : null, tags, reward, failure: loss });
  });

  const allText = normalizeText(collectTexts(source));
  const signals = SETTING_SIGNALS[setting] || [];
  const totalEntries = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const signalHits = signals.filter((word) => allText.includes(word)).length;
  if (setting !== "all" && totalEntries >= 10 && signals.length && signalHits < 2) {
    issues.push(issue("suggestion", "weak_setting_identity", "pack", "Слабка впізнаваність сетингу", `Знайдено лише ${signalHits} із ${signals.length} тематичних сигналів для сетингу «${setting}».`, "Додайте більше характерних технологій, загроз, професій або назв світу; це лише евристична підказка."));
  }

  const total = totalEntries;
  if (!total) issues.push(issue("warning", "empty_pack", "pack", "Набір порожній", "У ньому ще немає жодного запису.", "Додайте хоча б одну категорію або застосуйте JSON-шаблон."));
  if (total > 2500) issues.push(issue("warning", "near_pack_limit", "pack", "Набір наближається до ліміту", `${total} із 3000 дозволених записів.`, "Розділіть великий набір на тематичні пакети."));

  const errors = issues.filter((item) => item.severity === "error").length;
  const warnings = issues.filter((item) => item.severity === "warning").length;
  const suggestions = issues.filter((item) => item.severity === "suggestion").length;
  const score = Math.max(0, Math.min(100, 100 - errors * 18 - warnings * 4 - Math.min(suggestions, 20)));
  const experimentalCodes = new Set(["unknown_category", "unsupported_effect", "unknown_expedition_tags", "weak_setting_identity"]);
  const explicitlyCosmetic = source.compatibility === "cosmetic" || source.balanceMode === "cosmetic";
  const experimental = issues.some((item) => experimentalCodes.has(item.code));
  const compatibility = explicitlyCosmetic
    ? { tier: "cosmetic", label: "Косметичний", description: "Набір заявлено як текстовий і не повинен впливати на фінальну формулу." }
    : errors || experimental
      ? { tier: "experimental", label: "Експериментальний", description: "Набір працює, але коректність механічної оцінки не гарантується до виправлення помилок і невідомих ефектів." }
      : { tier: "compatible", label: "Сумісний", description: "Структура, ефекти й теги підтримуються поточним балансним аналізатором." };
  const simulation = buildSimulation(source, options.sampleSize);
  const preview = [];
  for (const key of BASIC_CATEGORIES) for (const entry of list(source, key).slice(0, 3)) preview.push({ type: "card", category: key, categoryLabel: CATEGORY_LABELS[key], name: itemName(entry), level: clean(entry?.level || "normal") });
  for (const event of eventReports.slice(0, 3)) preview.push({ type: "event", category: "events", categoryLabel: "Подія", name: event.title, choices: event.choices.map((choice) => choice.label) });
  for (const expedition of expeditionReports.slice(0, 3)) preview.push({ type: "expedition", category: "expeditions", categoryLabel: "Експедиція", name: expedition.name, difficulty: expedition.difficulty, tags: expedition.tags });

  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    summary: { score, errors, warnings, suggestions, totalEntries: total, duplicatePairs: duplicates.length, setting, levels, compatibility },
    compatibility,
    counts,
    issues: issues.slice(0, 250),
    duplicates: duplicates.slice(0, 60),
    balance: { events: eventReports, expeditions: expeditionReports },
    simulation,
    preview: preview.slice(0, 18),
    knownExpeditionTags: [...KNOWN_EXPEDITION_TAGS].sort()
  };
}

module.exports = { analyzePack, similarity, effectScore, BASIC_CATEGORIES, ADVANCED_CATEGORIES, CATEGORY_LABELS };

"use strict";

const RESOURCE_KEYS = ["food", "water", "energy", "integrity", "medicine"];
const RESOURCE_LABELS = {
  food: "їжа",
  water: "вода",
  energy: "енергія",
  integrity: "цілісність",
  medicine: "медицина",
  morale: "мораль"
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function normalizeCarryover(raw = {}) {
  const resources = {};
  for (const key of [...RESOURCE_KEYS, "morale"]) {
    const value = Math.round(Number(raw?.resources?.[key] ?? (key === "morale" ? raw?.morale : 0)) || 0);
    if (value) resources[key] = clamp(value, -6, 8);
  }
  return {
    version: Number(raw?.version || 1),
    sourceChapter: Number(raw?.sourceChapter || 0) || null,
    resources,
    allies: clamp(Math.round(raw?.allies || 0), 0, 4),
    legacy: asArray(raw?.legacy).map((item) => String(typeof item === "string" ? item : item?.name || "").trim()).filter(Boolean).slice(0, 3)
  };
}
function balancedStartingEffects(carryover) {
  const normalized = normalizeCarryover(carryover);
  const effects = {};
  for (const [key, value] of Object.entries(normalized.resources)) {
    // Успішна кампанія не має розкручувати нескінченний бонус, а слабка — спіраль поразок.
    effects[key] = value > 0 ? clamp(Math.ceil(value * 0.7), 1, 5) : clamp(Math.ceil(value * 0.5), -3, -1);
  }
  if (normalized.allies) effects.allies = Math.min(2, normalized.allies);
  return effects;
}
function strongestEntry(resources, predicate) {
  return Object.entries(resources || {})
    .filter(([key, value]) => key !== "morale" && predicate(Number(value || 0)))
    .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])) || a[0].localeCompare(b[0]))[0] || null;
}
function option(id, label, description, effects = {}, extra = {}) {
  return { id, label, description, effects, ...extra };
}
function buildCampaignLegacy(campaign, maxRounds = 4) {
  if (!campaign || !asArray(campaign.chapters).length) return null;
  const carryover = normalizeCarryover(campaign.carryover || {});
  const lastChapter = asArray(campaign.chapters).at(-1) || null;
  const dueRound = Math.max(1, Math.min(Number(maxRounds) || 4, 2));
  const startingEffects = balancedStartingEffects(carryover);
  const legacyAssets = carryover.legacy.slice(0, 2);
  const strongestPositive = strongestEntry(carryover.resources, (value) => value > 0);
  const strongestNegative = strongestEntry(carryover.resources, (value) => value < 0);
  const moraleValue = Number(carryover.resources.morale || 0);
  let dilemma;

  if (carryover.allies > 0) {
    dilemma = {
      kind: "ally_request",
      title: "Союзники просять взаємної допомоги",
      context: `Контакти з попереднього розділу дали сховищу підтримку, але тепер союзна громада очікує відповідного внеску до завершення ${dueRound}-го раунду.`,
      benefit: `Стартова перевага: союзники +${Math.min(2, carryover.allies)}.`,
      fallbackOptionId: "limited_aid",
      options: [
        option("full_aid", "Виконати прохання повністю", "Передати значну частину припасів, зберегти союз і зміцнити довіру.", { food: -4, water: -4, morale: 3 }, { requires: { food: 4, water: 4 } }),
        option("limited_aid", "Надати обмежену допомогу", "Віддати менше запасів без додаткової нагороди або втрати союзників.", { food: -2, water: -2 }, { requires: { food: 2, water: 2 } }),
        option("refuse_aid", "Відмовити й берегти запаси", "Не витрачати припаси, але втратити частину довіри та моральної стійкості.", { allies: -1, morale: -3 })
      ]
    };
  } else if (legacyAssets.length) {
    const assetName = legacyAssets[0];
    dilemma = {
      kind: "infrastructure_upkeep",
      title: `Спадковий об’єкт потребує рішення: ${assetName}`,
      context: `Об’єкт із попереднього розділу працює, але без обслуговування стане тягарем уже до завершення ${dueRound}-го раунду.`,
      benefit: `Стартова перевага: доступний об’єкт «${assetName}».`,
      fallbackOptionId: "repurpose",
      legacyAsset: assetName,
      options: [
        option("maintain", "Обслуговувати й залишити", "Витратити енергію, зате підсилити найслабший модуль і зберегти об’єкт.", { energy: -4, morale: 1 }, { requires: { energy: 4 }, moduleDelta: 10 }),
        option("repurpose", "Розібрати на корисні вузли", "Відмовитися від спадкового об’єкта й перетворити його на запас енергії та матеріалів.", { energy: 5, integrity: 3 }, { removeLegacyAsset: true }),
        option("postpone", "Відкласти ремонт", "Не витрачати ресурси зараз, але прийняти пошкодження найслабшої системи та втрату моралі.", { morale: -2 }, { moduleDelta: -10 })
      ]
    };
  } else if (strongestPositive) {
    const [resourceKey, rawValue] = strongestPositive;
    const label = RESOURCE_LABELS[resourceKey] || resourceKey;
    const boon = Math.max(1, Number(startingEffects[resourceKey] || 1));
    const alternativeKey = RESOURCE_KEYS.find((key) => key !== resourceKey) || "integrity";
    dilemma = {
      kind: "stockpile_policy",
      title: `Що робити зі спадковим запасом: ${label}`,
      context: `Попередня громада залишила запас, але його потрібно охороняти, розподілити або перетворити на іншу користь до завершення ${dueRound}-го раунду.`,
      benefit: `Стартова перевага: ${label} +${boon}.`,
      fallbackOptionId: "share",
      resourceKey,
      options: [
        option("secure", "Законсервувати резерв", "Витратити енергію на зберігання та не втрачати стартову перевагу.", { energy: -3, integrity: 2 }, { requires: { energy: 3 } }),
        option("share", "Розподілити між людьми", "Зменшити запас, але помітно підтримати мораль громади.", { [resourceKey]: -Math.min(4, boon), morale: 5 }),
        option("convert", "Переробити на інший ресурс", `Перетворити частину запасу на ${RESOURCE_LABELS[alternativeKey] || alternativeKey}.`, { [resourceKey]: -Math.min(4, boon), [alternativeKey]: 4 })
      ]
    };
  } else if (strongestNegative || moraleValue < 0) {
    const targetKey = strongestNegative?.[0] || "morale";
    const label = RESOURCE_LABELS[targetKey] || targetKey;
    const supportKey = strongestEntry(carryover.resources, (value) => value > 0 && value !== targetKey)?.[0] || (targetKey === "energy" ? "food" : "energy");
    dilemma = {
      kind: "recovery_plan",
      title: `План відновлення після дефіциту: ${label}`,
      context: `Наслідки попереднього розділу відчутні, але цього разу дефіцит зменшено й перетворено на шанс обрати шлях відновлення до завершення ${dueRound}-го раунду.`,
      benefit: `Захист від спіралі поразок: стартовий штраф обмежено до ${Math.abs(Number(startingEffects[targetKey] || -1))} пунктів.`,
      fallbackOptionId: "austerity",
      resourceKey: targetKey,
      options: [
        option("rebuild", "Інвестувати в відновлення", `Витратити запас «${RESOURCE_LABELS[supportKey] || supportKey}» і швидко підняти «${label}».`, { [supportKey]: -3, [targetKey]: 7, morale: 1 }, { requires: { [supportKey]: 3 } }),
        option("outside_credit", "Прийняти зовнішню допомогу", "Швидко поповнити дефіцит, але взяти політичне зобов’язання й втратити частину моралі.", { [targetKey]: 5, allies: 1, morale: -2 }),
        option("austerity", "Запровадити жорстку економію", "Відновити частину запасу без зовнішньої залежності, але погіршити мораль.", { [targetKey]: 3, morale: -4 })
      ]
    };
  } else {
    dilemma = {
      kind: "institutional_memory",
      title: "Що зберегти з досвіду попереднього розділу",
      context: `Кампанія не дає чистого числового бонусу: громада має вирішити, як перетворити досвід розділу ${lastChapter?.number || "?"} на нову практику.`,
      benefit: "Стартова перевага: знання попередньої громади.",
      fallbackOptionId: "document",
      options: [
        option("train", "Провести практичне навчання", "Витратити енергію на тренування й зміцнити цілісність систем.", { energy: -2, integrity: 4 }, { requires: { energy: 2 } }),
        option("document", "Зберегти протоколи", "Невеликий, але безпечний внесок у мораль та організацію.", { morale: 2, integrity: 1 }),
        option("memorial", "Створити спільний меморіал", "Витратити частину їжі на церемонію й сильніше підтримати мораль.", { food: -2, morale: 5 }, { requires: { food: 2 } })
      ]
    };
  }

  return {
    enabled: true,
    schemaVersion: 2,
    campaignId: campaign.id,
    campaignName: campaign.name || "Кампанія",
    chapterNumber: asArray(campaign.chapters).length + 1,
    sourceChapter: lastChapter ? {
      number: lastChapter.number,
      verdict: lastChapter.verdict,
      score: lastChapter.score,
      settlement: lastChapter.settlement,
      population: lastChapter.population
    } : null,
    startingEffects,
    legacyAssets,
    dilemma: {
      id: `legacy_${asArray(campaign.chapters).length + 1}`,
      dueRound,
      status: "open",
      votes: {},
      resolvedOptionId: null,
      resolvedAt: null,
      automatic: false,
      ...dilemma
    },
    history: []
  };
}
function summarizeCarryover(carryover = {}) {
  const normalized = normalizeCarryover(carryover);
  const parts = [];
  for (const [key, value] of Object.entries(balancedStartingEffects(normalized))) {
    if (key === "allies") parts.push(`союзники ${value >= 0 ? "+" : ""}${value}`);
    else parts.push(`${RESOURCE_LABELS[key] || key} ${value >= 0 ? "+" : ""}${value}`);
  }
  if (normalized.legacy.length) parts.push(`об’єкти: ${normalized.legacy.join(", ")}`);
  return parts.length ? parts.join(" · ") : "Без числової переваги; наступний розділ отримає лише сюжетний вибір.";
}

module.exports = {
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  normalizeCarryover,
  balancedStartingEffects,
  buildCampaignLegacy,
  summarizeCarryover
};

"use strict";

const RESOURCE_KEYS = ["food", "water", "energy", "integrity", "medicine", "morale"];

function clamp(value, min = 0, max = 100) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function average(values) { return values.length ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : 0; }
function lower(value) { return String(value || "").toLocaleLowerCase("uk"); }
function tone(value) { return value >= 70 ? "good" : value >= 45 ? "warn" : "bad"; }

const COMPETENCE_RULES = {
  medical: /лікар|медик|хірур|парамед|фарма|цілител|знахар|домедич|перша допом|лікув|ветеринар|санітар/i,
  technical: /інженер|механік|електрик|ремонт|звар|слюсар|коваль|технік|програміст|системн|автоматик|будівель|сантех/i,
  food: /агроном|фермер|садів|гідропон|кухар|консерв|рибал|мислив|травник|ботан|харч|город/i,
  defense: /військ|охорон|стріль|обор|поліц|тактик|бойов|фехт|збро|розвід/i,
  social: /психолог|дипломат|переговор|соціолог|харизмат|медіатор|учитель|жрець|бард|керівник/i,
  science: /науков|хімік|фізик|астроном|дослід|лаборатор|археолог|аналітик|детектив|слідч|біолог/i,
  exploration: /орієнтув|навіг|слідопит|виживан|альпін|пілот|картограф|мандрів|скаут|експедиц/i,
  education: /учитель|викладач|бібліотек|архів|письмен|редактор|перекладач|наставник/i,
  digital: /хакер|кібер|програміст|мереж|штучн.*інтелект|системн.*адмін/i,
  magic: /маг|чакл|рун|алхім|жрець|відьм|ритуал|чарів/i
};

const CATEGORY_LABELS = {
  medical: "медицина", technical: "техніка", food: "харчування", defense: "захист",
  social: "психологія й переговори", science: "наука й аналіз", exploration: "розвідка й навігація",
  education: "передавання знань", digital: "цифрові системи", magic: "магія й ритуали"
};

function activePlayers(room) { return (room.players || []).filter((player) => player.active); }
function characterText(player) {
  const c = player.character || {};
  return lower([c.profession, c.skill, c.hobby, c.trait, c.item, c.secret, c.anomaly].join(" "));
}
function competenceCounts(players) {
  const counts = Object.fromEntries(Object.keys(COMPETENCE_RULES).map((key) => [key, 0]));
  for (const player of players) {
    const text = characterText(player);
    for (const [key, regex] of Object.entries(COMPETENCE_RULES)) if (regex.test(text)) counts[key] += 1;
  }
  return counts;
}
function requiredCompetences(room) {
  const required = new Set(["medical", "technical", "food", "social"]);
  const setting = room.settings?.setting || "modern";
  if (["postapocalypse", "horror"].includes(setting)) required.add("defense");
  if (setting === "space") { required.add("science"); required.add("exploration"); }
  if (setting === "cyberpunk") { required.add("digital"); required.add("science"); }
  if (setting === "fantasy") { required.add("magic"); required.add("defense"); }
  if (setting === "detective") { required.clear(); ["science", "social", "technical", "medical"].forEach((key) => required.add(key)); }
  for (const need of room.game?.scenarioPriorities?.needs || []) {
    if (need.id === "food") required.add("food");
    else if (["water", "energy", "integrity", "repair", "access"].includes(need.id)) required.add("technical");
    else if (["medicine", "health"].includes(need.id)) required.add("medical");
    else if (["morale", "trust"].includes(need.id)) required.add("social");
    else if (["evidence", "analysis"].includes(need.id)) required.add("science");
  }
  return [...required];
}
function competenceMetrics(room, players) {
  const counts = competenceCounts(players);
  const required = requiredCompetences(room);
  const covered = required.filter((key) => counts[key] > 0);
  const missing = required.filter((key) => counts[key] === 0);
  const duplicateDepth = required.reduce((sum, key) => sum + Math.min(2, counts[key]), 0);
  const coverage = required.length ? covered.length / required.length : 1;
  const resilience = required.length ? duplicateDepth / (required.length * 2) : 1;
  return {
    counts, required, covered, missing,
    competenceScore: clamp(coverage * 82 + resilience * 18),
    fitScore: clamp(coverage * 70 + Math.min(1, players.length / Math.max(3, required.length)) * 10 + resilience * 20)
  };
}

function medicalScore(players, resources) {
  const severe = players.filter((p) => Number(p.character?.medicalCondition?.severity || 0) >= 3).length;
  const critical = players.filter((p) => Number(p.character?.medicalCondition?.severity || 0) >= 4).length;
  const injury = players.reduce((sum, p) => sum + Number(p.character?.injury || 0), 0);
  const medicine = Number(resources.medicine || 0);
  return clamp(100 - severe * 11 - critical * 9 - injury * 2 + (medicine - 50) * 0.22);
}
function socialScore(room, players, resources) {
  const hiddenThreats = players.filter((p) => p.character?.role?.faction === "Загроза").length;
  const capacity = Number(room.game?.shelter?.residentCapacity || room.settings?.capacity || players.length);
  const overcrowding = Math.max(0, players.length - capacity);
  const avgStress = average(players.map((p) => Number(p.character?.stress || 0)));
  return clamp(Number(resources.morale || 0) * 0.72 + 28 - hiddenThreats * 13 - overcrowding * 12 - avgStress * 3);
}
function threatControlScore(players) {
  const threats = players.filter((p) => p.character?.role?.faction === "Загроза").length;
  const community = players.filter((p) => p.character?.role?.faction === "Громада").length;
  return clamp(100 - threats * 24 + Math.min(15, community * 2));
}
function operationScore(game) {
  const expeditions = game.expeditionHistory || [];
  const repairs = game.repairHistory || [];
  const treatments = game.treatmentHistory || [];
  const total = expeditions.length + repairs.length + treatments.length;
  if (!total) return 50;
  const successes = expeditions.filter((x) => x.success).length + repairs.filter((x) => x.success).length + treatments.filter((x) => x.success).length;
  const participation = Math.min(20, total * 4);
  return clamp(successes / total * 80 + participation);
}
function detectiveMetrics(room, mystery) {
  if (!mystery) return { accusation: 0, evidence: 0, discipline: 30 };
  const required = Math.max(1, Number(mystery.requiredEvidence || 2));
  const evidence = clamp(Number(mystery.evidenceStrength || 0) / required * 100);
  const accusation = mystery.solved ? 100 : mystery.correctAccusation ? 68 : 0;
  const investigations = Number(mystery.investigationLog?.length || 0);
  const noisyClaims = Number(mystery.publicClaims?.length || 0);
  const discipline = clamp(45 + Math.min(35, investigations * 5) - Math.max(0, noisyClaims - investigations - 2) * 5);
  return { accusation, evidence, discipline };
}

function normalizedWeights(entries) {
  const total = entries.reduce((sum, item) => sum + item.weight, 0) || 1;
  return entries.map((item) => ({ ...item, weight: item.weight * 100 / total }));
}
function profileFor(room, metrics) {
  const mode = room.settings?.mode || "classic";
  const setting = room.settings?.setting || "modern";
  if (setting === "detective") return [
    ["Правильність звинувачення", "accusation", 30], ["Незалежні докази", "evidence", 27],
    ["Якість розслідування", "discipline", 13], ["Стан учасників", "medical", 10],
    ["Довіра громади", "social", 8], ["Запаси", "resources", 6], ["Системи", "modules", 6]
  ];
  if (mode === "survival") return [
    ["Запаси", "resources", 24], ["Системи", "modules", 22], ["Операції", "operations", 18],
    ["Медицина", "medical", 14], ["Компетенції", "competence", 10], ["Відповідність катастрофі", "fit", 6], ["Згуртованість", "social", 6]
  ];
  if (mode === "factions") return [
    ["Згуртованість", "social", 22], ["Контроль прихованих загроз", "threatControl", 20],
    ["Компетенції", "competence", 13], ["Відповідність катастрофі", "fit", 10],
    ["Запаси", "resources", 12], ["Системи", "modules", 8], ["Медицина", "medical", 8], ["Завершеність відбору", "selection", 7]
  ];
  if (mode === "advanced") {
    const features = room.game?.features || {};
    const rows = [
      ["Компетенції", "competence", 20], ["Відповідність катастрофі", "fit", 13], ["Запаси", "resources", 14],
      ["Системи", "modules", 14], ["Згуртованість", "social", 10], ["Завершеність відбору", "selection", 11]
    ];
    if (features.operations) rows.push(["Операції", "operations", 12]); else rows.push(["Медицина", "medical", 8]);
    if (features.treatment) rows.push(["Медицина", "medical", 12]);
    if (features.hiddenRoles) rows.push(["Контроль прихованих загроз", "threatControl", 10]);
    return normalizedWeights(rows.map(([label, key, weight]) => ({ label, key, weight }))).map((x) => [x.label, x.key, x.weight]);
  }
  return [
    ["Склад фінальної групи", "competence", 28], ["Відповідність катастрофі", "fit", 16],
    ["Медична життєздатність", "medical", 14], ["Згуртованість", "social", 11],
    ["Запаси", "resources", 9], ["Системи", "modules", 8], ["Завершеність відбору", "selection", 14]
  ];
}

function buildDirectConsequences(room, metrics, competence, mystery) {
  const game = room.game;
  const list = [];
  const add = (category, title, detail, impact, value) => list.push({ category, title, detail, impact, value: Math.round(value) });
  add("Склад групи", competence.missing.length ? "Залишилися прогалини в компетенціях" : "Критичні компетенції покрито",
    competence.missing.length ? `Бракує напрямів: ${competence.missing.map((key) => CATEGORY_LABELS[key]).join(", ")}.` : `Група покриває всі ${competence.required.length} критичних напрямів цього сценарію.`, competence.missing.length ? "negative" : "positive", metrics.competence);
  add("Запаси", metrics.resources >= 55 ? "Запаси збережено" : "Запаси виснажено", `Середній рівень контрольованих ресурсів наприкінці партії — ${Math.round(metrics.resources)}%.`, metrics.resources >= 55 ? "positive" : "negative", metrics.resources);
  add("Системи", metrics.modules >= 55 ? "Системи залишилися працездатними" : "Системи потребують аварійного ремонту", `Середній стан модулів — ${Math.round(metrics.modules)}%.`, metrics.modules >= 55 ? "positive" : "negative", metrics.modules);
  add("Медицина", metrics.medical >= 60 ? "Медичні ризики контрольовано" : "У фінальній групі залишилися медичні ризики", `Оцінка стану людей і запасу ліків — ${Math.round(metrics.medical)}/100.`, metrics.medical >= 60 ? "positive" : "negative", metrics.medical);
  if (game.features?.operations) add("Операції", metrics.operations >= 60 ? "Операції дали практичний результат" : "Операції не створили достатнього запасу міцності", `Ефективність експедицій, ремонтів і лікування — ${Math.round(metrics.operations)}/100.`, metrics.operations >= 60 ? "positive" : "negative", metrics.operations);
  if (mystery) add("Розслідування", mystery.solved ? "Справу доведено" : mystery.correctAccusation ? "Підозра правильна, але доказів недостатньо" : "Фінальне звинувачення хибне", `Доказова сила: ${Number(mystery.evidenceStrength || 0)}/${Number(mystery.requiredEvidence || 2)}.`, mystery.solved ? "positive" : "negative", metrics.evidence);
  const successfulEvents = (game.log || []).filter((line) => /Рішення події|успішн|вдалося/i.test(line)).length;
  const failedEvents = (game.log || []).filter((line) => /провал|невдал|не вдалося/i.test(line)).length;
  if (successfulEvents || failedEvents) add("Рішення раундів", successfulEvents >= failedEvents ? "Успішних наслідків було більше" : "Невдачі переважили", `За журналом: позитивних рішень — ${successfulEvents}, невдалих — ${failedEvents}.`, successfulEvents >= failedEvents ? "positive" : "negative", clamp(50 + (successfulEvents - failedEvents) * 8));
  return list.slice(0, 8);
}

function evaluateDirectOutcome(room, mysteryOutcome = null) {
  const game = room.game || {};
  const players = activePlayers(room);
  const resourcesObject = game.shelter?.resources || {};
  const resources = average(RESOURCE_KEYS.map((key) => resourcesObject[key]));
  const modules = average((game.shelter?.modules || []).map((module) => module.condition));
  const competence = competenceMetrics(room, players);
  const capacity = Number(game.shelter?.residentCapacity || room.settings?.capacity || players.length);
  const selection = clamp(100 - Math.max(0, players.length - capacity) * 28);
  const detective = detectiveMetrics(room, mysteryOutcome);
  const metrics = {
    resources: clamp(resources), modules: clamp(modules), medical: medicalScore(players, resourcesObject),
    social: socialScore(room, players, resourcesObject), threatControl: threatControlScore(players),
    operations: operationScore(game), competence: competence.competenceScore, fit: competence.fitScore, selection,
    accusation: detective.accusation, evidence: detective.evidence, discipline: detective.discipline
  };
  const profile = profileFor(room, metrics);
  const scoreBreakdown = profile.map(([label, key, weight]) => {
    const raw = clamp(metrics[key]);
    const max = Number(weight);
    const value = raw * max / 100;
    return { label, key, raw: Math.round(raw), value, max, tone: tone(raw), kind: "decision" };
  });
  const hasFinalGroup = players.length > 0;
  const directScore = hasFinalGroup
    ? clamp(Math.round(scoreBreakdown.reduce((sum, item) => sum + item.value, 0)))
    : 0;
  if (!hasFinalGroup) {
    metrics.medical = 0;
    metrics.social = 0;
    metrics.threatControl = 0;
    metrics.competence = 0;
    metrics.fit = 0;
    metrics.selection = 0;
    for (const item of scoreBreakdown) {
      if (["medical", "social", "threatControl", "competence", "fit", "selection"].includes(item.key)) {
        item.raw = 0;
        item.value = 0;
        item.tone = "bad";
      }
    }
  }
  return {
    hasFinalGroup,
    mode: room.settings?.setting === "detective" ? "detective" : room.settings?.mode || "classic",
    directScore,
    metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, Math.round(value)])),
    competence: { ...competence, labelsMissing: competence.missing.map((key) => CATEGORY_LABELS[key]) },
    scoreBreakdown: scoreBreakdown.map((item) => ({ ...item, value: Math.round(item.value), max: Math.round(item.max) })),
    directConsequences: hasFinalGroup
      ? buildDirectConsequences(room, metrics, competence, mysteryOutcome)
      : [{
          category: "Склад групи",
          title: "У сховищі не залишилося активних учасників",
          detail: "Порожня фінальна група не може отримати групову перемогу або започаткувати поселення.",
          impact: "negative",
          value: 0
        }]
  };
}

module.exports = { evaluateDirectOutcome, competenceMetrics, requiredCompetences, CATEGORY_LABELS };

"use strict";

const ABSURDITY = ["0 — серйозно", "1 — трохи дивного", "2 — збалансовано", "3 — багато гумору", "4 — повний хаос"];
const AUTOMATION_LABELS = { off: "Ручне ведення", assist: "Допоміжний режим", auto: "Автоматичний ведучий" };
const MODE_INFO = {
  classic: { name: "Класичний відбір", description: "Соціальний відбір без ресурсних операцій: відкриття → обговорення → криза → рішення громади.", elimination: true, loop: ["Розкриття", "Обговорення", "Криза", "Рішення", "Наслідки"] },
  survival: { name: "Спільне виживання", description: "Кооператив без вигнання: команда одразу бачить практичний профіль одне одного й проходить планування, операції та кризу.", elimination: false, loop: ["Планування", "Операції", "Криза", "Наслідки"] },
  factions: { name: "Фракції та зрадники", description: "Соціальна дедукція без експедицій: відкриття → переговори → інтриги → рішення громади.", elimination: true, loop: ["Розкриття", "Переговори", "Інтриги", "Рішення", "Наслідки"] },
  advanced: { name: "Розширена гра", description: "Модульний режим: базовий відбір доповнюється максимум двома системами, які змінюють цикл і доступні дії.", elimination: true, loop: ["Розкриття", "Обговорення", "Криза", "Рішення", "Наслідки"] }
};
const ADVANCED_MODULE_LIMIT = 2;
const DEFAULT_ADVANCED_MODULES = ["operations"];
const ADVANCED_MODULE_INFO = {
  operations: { name: "Експедиції та ремонт", description: "Окрема фаза операцій, експедиції та плановий ремонт." },
  medicine: { name: "Медицина", description: "Лікування, медичні витрати та догляд під час операцій." },
  roles: { name: "Приховані ролі й цілі", description: "Таємні фракції, особисті цілі та фаза інтриг." },
  trade: { name: "Обмін предметами", description: "Передавання речей між учасниками під час обговорення." },
  outside: { name: "Гра після вигнання", description: "Зовнішні ролі, одна дія за раунд та апеляція." }
};
function normalizeClientAdvancedModules(value, mode = "advanced", setting = "modern") {
  if (mode !== "advanced" || setting === "detective") return [];
  const source = Array.isArray(value) ? value : DEFAULT_ADVANCED_MODULES;
  return [...new Set(source.filter((id) => ADVANCED_MODULE_INFO[id]))].slice(0, ADVANCED_MODULE_LIMIT);
}
function modeLoopPreview(modeId, advancedModules = null, settingId = "modern") {
  if (settingId === "detective") return ["Розкриття", "Розслідування", "Криза", "Звинувачення", "Наслідки"];
  if (modeId !== "advanced") return (MODE_INFO[modeId] || MODE_INFO.classic).loop || [];
  const modules = normalizeClientAdvancedModules(advancedModules, modeId, settingId);
  const loop = ["Розкриття", "Обговорення"];
  if (modules.includes("operations") || modules.includes("medicine")) loop.push("Операції");
  if (modules.includes("roles")) loop.push("Інтриги");
  loop.push("Криза", "Рішення", "Наслідки");
  return loop;
}
const GROUP_VICTORY_SCORE = 43;
function previewVictoryRules(modeId, settingId, rounds = 4, capacity = 3, advancedModulesInput = null) {
  const mode = MODE_INFO[modeId] || MODE_INFO.classic;
  if (settingId === "detective") return {
    modeName: mode.name,
    group: { title: "Перемога розслідування", objective: "Правильно назвати організатора злочину та зібрати потрібну кількість незалежних ланок доказів." },
    personal: { title: "Особистий результат", objective: "Дожити до завершення справи та виконати власну слідчу або приховану мету." },
    special: { title: "Роль у справі", enabled: true, objective: "Виконати приватну умову своєї ролі: довести справу або зірвати розслідування." },
    end: { objective: `Після ${Number(rounds || 4)} раундів; фінальні версії та доказова сила підраховуються один раз.` }
  };
  if (modeId === "classic") return {
    modeName: mode.name,
    group: { title: "Перемога групи", objective: `Завершити відбір у межах ${Number(capacity || 3)} місць і отримати щонайменше ${GROUP_VICTORY_SCORE}/100 у фіналі.` },
    personal: { title: "Особистий результат", objective: "Залишитися у фінальній групі сховища." },
    special: { title: "Додаткова умова", enabled: false, objective: "Прихованих ролей і обов’язкової додаткової мети немає." },
    end: { objective: `Коли активних гравців залишиться не більше ${Number(capacity || 3)} або завершиться ${Number(rounds || 4)}-й раунд.` }
  };
  if (modeId === "survival") return {
    modeName: mode.name,
    group: { title: "Перемога групи", objective: `Завершити кризу з оцінкою громади щонайменше ${GROUP_VICTORY_SCORE}/100.` },
    personal: { title: "Особистий результат", objective: "Дожити до завершення довгострокової симуляції громади." },
    special: { title: "Особиста мета", enabled: true, objective: "Виконати видану особисту мету; вона оцінюється окремо." },
    end: { objective: `Після завершення ${Number(rounds || 4)} раундів.` }
  };
  const advancedModules = modeId === "advanced" ? normalizeClientAdvancedModules(advancedModulesInput ?? selectedAdvancedModules(""), modeId, settingId) : [];
  const rolesEnabled = modeId === "factions" || advancedModules.includes("roles");
  return {
    modeName: mode.name,
    group: { title: modeId === "factions" ? "Результат громади" : "Перемога громади", objective: `Завершити кризу з оцінкою громади щонайменше ${GROUP_VICTORY_SCORE}/100.` },
    personal: { title: "Особистий результат", objective: "Залишитися у фінальній групі сховища." },
    special: rolesEnabled
      ? { title: "Прихована роль", enabled: true, objective: "Виконати приватну умову ролі або фракції; вона може суперечити інтересам громади." }
      : { title: "Додаткова умова", enabled: false, objective: "Модуль прихованих ролей і цілей не ввімкнено." },
    end: { objective: `Після завершення ${Number(rounds || 4)} раундів.` }
  };
}
function victoryRuleCard(rule, kind) {
  if (!rule) return "";
  const disabled = rule.enabled === false;
  const faction = rule.faction ? `<span class="badge">${escapeHtml(rule.faction)}</span>` : "";
  return `<article class="victory-rule-card ${escapeHtml(kind)} ${disabled ? "disabled" : ""}"><div><small>${kind === "group" ? "01 · Спільний рівень" : kind === "personal" ? "02 · Особистий рівень" : "03 · Спеціальний рівень"}</small>${faction}</div><h4>${escapeHtml(rule.title || "Умова")}</h4><p>${escapeHtml(rule.objective || "—")}</p>${rule.success ? `<em>${escapeHtml(rule.success)}</em>` : ""}</article>`;
}
function renderVictoryRuleCards(targetId, rules) {
  const target = $(targetId);
  if (!target || !rules) return;
  target.innerHTML = victoryRuleCard(rules.group, "group") + victoryRuleCard(rules.personal, "personal") + victoryRuleCard(rules.special, "special");
}
function renderVictoryPreview(scope = "create") {
  const prefix = scope === "lobby" ? "lobby" : "";
  const mode = $(prefix ? "lobbyGameMode" : "gameMode")?.value || "classic";
  const setting = $(prefix ? "lobbySetting" : "setting")?.value || "modern";
  const rounds = Number($(prefix ? "lobbyRounds" : "rounds")?.value || 4);
  const capacity = Number($(prefix ? "lobbyCapacity" : "capacity")?.value || 3);
  const rules = previewVictoryRules(mode, setting, rounds, capacity, selectedAdvancedModules(prefix));
  const targetId = scope === "lobby" ? "lobbyVictoryPreview" : "createVictoryRules";
  const target = $(targetId);
  if (!target) return;
  target.innerHTML = `<div class="victory-preview-head"><strong>Як визначається результат</strong><span>${escapeHtml(rules.end.objective)}</span></div><div class="victory-preview-list"><span><b>Група:</b> ${escapeHtml(rules.group.objective)}</span><span><b>Персонаж:</b> ${escapeHtml(rules.personal.objective)}</span><span><b>${escapeHtml(rules.special.title)}:</b> ${escapeHtml(rules.special.objective)}</span></div>`;
}

function clientCharacterKeysForSetting(settingId, demographicsEnabled = true) {
  if (settingId === "detective") return DETECTIVE_CHARACTER_KEYS;
  return demographicsEnabled === false ? BASE_CHARACTER_KEYS.filter((key) => !["demographicContext", "attitudeToChildren"].includes(key)) : BASE_CHARACTER_KEYS;
}
function normalizedClientCharacterSet(mode, customKeys, settingId, demographicsEnabled = true) {
  const available = clientCharacterKeysForSetting(settingId, demographicsEnabled);
  if (mode === "extended") return { mode: "extended", keys: [...available] };
  if (mode === "custom") {
    const requested = Array.isArray(customKeys) ? customKeys : [];
    const keys = available.filter((key) => requested.includes(key));
    if (keys.length >= 4) return { mode: "custom", keys };
  }
  const compact = settingId === "detective" ? DETECTIVE_COMPACT_CHARACTER_KEYS : COMPACT_CHARACTER_KEYS;
  return { mode: "compact", keys: compact.filter((key) => available.includes(key)) };
}
function selectedCustomKeys(prefix = "") {
  const container = $(`${prefix}CustomCharacterKeys`);
  if (!container) return [];
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}
function renderCharacterSetPicker(scope = "create", preserveSelection = true) {
  const prefix = scope === "lobby" ? "lobby" : "";
  const setting = $(prefix ? "lobbySetting" : "setting")?.value || "modern";
  const select = $(prefix ? "lobbyCharacterSetMode" : "characterSetMode");
  const grid = $(`${prefix}CustomCharacterKeys`);
  const hint = $(`${prefix}CharacterSetHint`);
  const demographicsControl = $(prefix ? "lobbyDemographicsEnabled" : "demographicsEnabled");
  if (!select || !grid || !hint) return;
  const demographicsEnabled = setting !== "detective" && (demographicsControl ? demographicsControl.checked : true);
  const available = clientCharacterKeysForSetting(setting, demographicsEnabled);
  const previous = preserveSelection ? new Set(selectedCustomKeys(prefix)) : new Set();
  const defaults = setting === "detective" ? DETECTIVE_COMPACT_CHARACTER_KEYS : COMPACT_CHARACTER_KEYS;
  grid.innerHTML = available.map((key) => `<label><input type="checkbox" value="${escapeHtml(key)}" ${(previous.has(key) || (!previous.size && defaults.includes(key))) ? "checked" : ""}/><span>${escapeHtml(KEY_LABELS[key] || key)}</span></label>`).join("");
  const update = () => {
    const mode = select.value || "extended";
    grid.classList.toggle("hidden", mode !== "custom");
    const normalized = normalizedClientCharacterSet(mode, selectedCustomKeys(prefix), setting, demographicsEnabled);
    const rounds = Number($(prefix ? "lobbyRounds" : "rounds")?.value || 4);
    const reveals = Number($(prefix ? "lobbyReveals" : "revealsPerRound")?.value || 2);
    const totalVisible = Math.min(normalized.keys.length, Math.max(0, rounds * reveals));
    const coverage = normalized.keys.length ? Math.round((totalVisible / normalized.keys.length) * 100) : 0;
    const fallback = mode === "custom" && selectedCustomKeys(prefix).length < 4;
    hint.textContent = fallback
      ? `Оберіть щонайменше 4 категорії. Поки що буде застосовано стислий набір (${normalized.keys.length}).`
      : `${CHARACTER_SET_LABELS[normalized.mode]} набір: ${normalized.keys.length} характеристик. За поточний час можна відкрити до ${totalVisible} (${coverage}%).${setting !== "detective" && !demographicsEnabled ? " Демографічний блок вимкнено." : ""}`;
    renderConfigurationAnalysis(scope);
  };
  grid.querySelectorAll('input[type="checkbox"]').forEach((input) => input.addEventListener("change", update));
  update();
}
function roundToFive(value) { return Math.max(5, Math.round(Number(value || 0) / 5) * 5); }
function estimateConfigurationDuration(settings, playerCount) {
  if (settings.tutorialEnabled === true) return { min: 20, max: 35, label: "Навчальна", text: "20–35 хв" };
  const players = Math.max(4, Math.min(12, Number(playerCount || 4)));
  const rounds = Math.max(2, Math.min(7, Number(settings.rounds || 4)));
  const loop = modeLoopPreview(settings.mode, settings.advancedModules, settings.setting);
  const weights = {
    "Розкриття": Math.max(1, players * 0.2),
    "Обговорення": 1.5 + players * 0.25,
    "Планування": 1.7 + players * 0.24,
    "Переговори": 1.8 + players * 0.28,
    "Розслідування": 2 + players * 0.3,
    "Операції": 2 + players * 0.2 + ((settings.advancedModules || []).length * 0.75),
    "Інтриги": 1.5 + players * 0.2,
    "Криза": 1.2 + players * 0.15,
    "Рішення": 1.2 + players * 0.18,
    "Звинувачення": 1.5 + players * 0.2,
    "Наслідки": 0.5
  };
  const perRound = loop.reduce((sum, label) => sum + (weights[label] || 1), 0);
  const total = perRound * rounds + 3 + Math.max(0, players - 4) * 0.35;
  const min = roundToFive(total * 0.85);
  const max = Math.max(min + 5, roundToFive(total * 1.2));
  const label = max <= 35 ? "Коротка" : max <= 65 ? "Середня" : max <= 95 ? "Довга" : "Дуже довга";
  return { min, max, label, text: `${min}–${max} хв` };
}
function analyzeClientConfiguration(settings, playerCount) {
  const players = Math.max(1, Math.min(12, Number(playerCount || 1)));
  if (settings.tutorialEnabled === true) {
    const issues = [];
    if (players < 3) issues.push({ severity: "error", title: "Замало гравців", text: "Для навчальної партії потрібно щонайменше 3 учасники.", code: "players_min" });
    else issues.push({ severity: "success", title: "Навчальний сценарій готовий", text: "2 раунди, стислий набір, одна характеристика за раунд, відкриті голоси та безпечний перший раунд без санкцій.", code: "tutorial_ready" });
    return {
      playerCount: players, issues, blocking: issues.filter((item) => item.severity === "error").length, warnings: 0,
      duration: { min: 20, max: 35, label: "Навчальна", text: "20–35 хв" }, characterCount: 8, maxRevealed: 2, revealCoverage: 25,
      selection: { capacity: Math.max(2, players - 1), exilesNeeded: Math.max(0, players - Math.max(2, players - 1)) },
      recommendations: { rounds: 2, revealsPerRound: 1 }
    };
  }
  const mode = MODE_INFO[settings.mode] || MODE_INFO.classic;
  const advancedModules = normalizeClientAdvancedModules(settings.advancedModules, settings.mode, settings.setting);
  const set = normalizedClientCharacterSet(settings.characterSetMode, settings.customCharacterKeys, settings.setting, settings.demographicsEnabled !== false);
  const rounds = Math.max(2, Math.min(7, Number(settings.rounds || 4)));
  const reveals = Math.max(1, Math.min(4, Number(settings.revealsPerRound || 2)));
  const capacity = Math.max(settings.soloTestMode === true ? 1 : 2, Math.min(10, Number(settings.capacity || 3)));
  const maxRevealed = Math.min(set.keys.length, rounds * reveals);
  const coverage = set.keys.length ? Math.round((maxRevealed / set.keys.length) * 100) : 0;
  const fullRevealRound = Math.ceil(set.keys.length / reveals);
  const hiddenRoles = settings.setting === "detective" || settings.mode === "factions" || (settings.mode === "advanced" && advancedModules.includes("roles"));
  const issues = [];
  const add = (severity, title, text, code) => issues.push({ severity, title, text, code });
  if (settings.soloTestMode === true) add("info", "Соло-тестування", "Режим розробника дозволяє запуск кімнати з одним гравцем.", "solo_test");
  else if (players < 4) add("error", "Замало гравців", "Для старту потрібно щонайменше 4 учасники.", "players_min");
  const exilesNeeded = mode.elimination ? Math.max(0, players - capacity) : 0;
  if (mode.elimination && capacity >= players && settings.soloTestMode !== true) add("error", "Місткість не створює відбору", `Місць (${capacity}) має бути менше, ніж гравців (${players}).`, "capacity");
  if (mode.elimination && exilesNeeded > rounds) add("warning", settings.mode === "classic" ? "Відбір не встигне досягти місткості" : "Фінальна група може лишитися переповненою", `Для місткості ${capacity} потрібно ${exilesNeeded} вигнань, а раундів лише ${rounds}. Партія завершиться за лімітом раундів, навіть якщо активних людей буде більше.`, "selection_pressure");
  else if (mode.elimination && exilesNeeded === rounds && exilesNeeded > 0) add("warning", "Немає запасу на нічию", "Щоб досягти місткості, у кожному раунді має відбутися результативне вигнання.", "selection_margin");
  if (coverage < 50) add("warning", "Більшість картки залишиться прихованою", `За партію можна відкрити лише ${maxRevealed} із ${set.keys.length} характеристик (${coverage}%).`, "reveal_low");
  else if (coverage < 75) add("info", "Частина картки не відкриється", `Максимальне розкриття — ${maxRevealed} із ${set.keys.length} характеристик (${coverage}%).`, "reveal_partial");
  if (fullRevealRound <= Math.max(1, Math.floor(rounds / 2)) && set.keys.length > 4) add("warning", "Картка відкриється надто рано", `Усі характеристики можна показати вже до ${fullRevealRound}-го раунду з ${rounds}.`, "reveal_fast");
  if (settings.setting === "detective" && rounds < 4) add("warning", "Замало часу на розслідування", "Детективному режиму рекомендовано щонайменше 4 раунди для перевірок і формування доказового ланцюга.", "detective_rounds");
  if (hiddenRoles && settings.voteVisibility === "open") add("warning", "Відкриті голоси послаблюють дедукцію", "За прихованих ролей відкриті голоси швидко формують безпечні коаліції та спрощують читання фракцій.", "open_hidden_roles");
  if (mode.elimination && settings.tieRule === "no_action") add("info", "Нічия одразу скасовує санкцію", "За цього правила переголосування не проводиться. Рекомендований варіант — повторне голосування між лідерами.", "tie_without_runoff");
  if (settings.mode === "advanced" && advancedModules.includes("outside") && rounds < 3) add("warning", "Гра вигнанців майже не встигне розкритися", "Для зовнішніх ролей бажано щонайменше 3 раунди.", "outside_short");
  const automationMode = ["assist", "auto"].includes(settings.automationMode) ? settings.automationMode : "off";
  const inactivitySeconds = Math.max(5, Number(settings.inactivityTimeoutSeconds || 90));
  const phaseSeconds = Math.max(15, Number(settings.phaseTimeoutSeconds || 180));
  if (automationMode === "auto" && phaseSeconds < 60) add("warning", "Автоматичні фази надто короткі", `Ліміт ${phaseSeconds} с може не залишити часу на обговорення.`, "automation_short");
  else if (automationMode !== "off") add("info", "Захист від простою ввімкнено", `${AUTOMATION_LABELS[automationMode]}: відсутність ${inactivitySeconds} с, ліміт фази ${phaseSeconds} с.`, "automation_enabled");
  if (players >= 10 && set.keys.length >= 12) add("warning", "Високе інформаційне навантаження", `Групі доведеться відстежувати до ${players * set.keys.length} фактів про персонажів.`, "memory_load");
  const duration = estimateConfigurationDuration({ ...settings, advancedModules }, players);
  if (duration.max >= 90) add("warning", "Партія може бути дуже довгою", `Орієнтовна тривалість — ${duration.text}.`, "duration_long");
  else if (duration.max >= 65) add("info", "Заплануйте довгу сесію", `Орієнтовна тривалість — ${duration.text}.`, "duration_medium");
  if (!issues.some((item) => item.severity === "error" || item.severity === "warning")) add("success", "Конфігурація збалансована", "Критичних суперечностей для цієї кількості учасників не виявлено.", "balanced");
  const recommendedRounds = settings.setting === "detective" ? (players >= 10 ? 5 : 4) : settings.mode === "classic" ? Math.max(3, Math.min(7, exilesNeeded + 1)) : players <= 6 ? 3 : players <= 9 ? 4 : 5;
  const recommendedReveals = Math.max(1, Math.min(4, Math.ceil((set.keys.length * 0.75) / rounds)));
  return {
    playerCount: players, issues, blocking: issues.filter((item) => item.severity === "error").length,
    warnings: issues.filter((item) => item.severity === "warning").length,
    duration, characterCount: set.keys.length, maxRevealed, revealCoverage: coverage,
    selection: mode.elimination ? { capacity, exilesNeeded } : null,
    recommendations: { rounds: recommendedRounds, revealsPerRound: recommendedReveals }
  };
}
function settingIsDetective(scope = "create") {
  return ($(scope === "lobby" ? "lobbySetting" : "setting")?.value || "modern") === "detective";
}
function configurationSettingsFromControls(scope = "create") {
  const prefix = scope === "lobby" ? "lobby" : "";
  return {
    tutorialEnabled: Boolean($(prefix ? "lobbyTutorialEnabled" : "tutorialEnabled")?.checked),
    mode: $(prefix ? "lobbyGameMode" : "gameMode")?.value || "classic",
    setting: $(prefix ? "lobbySetting" : "setting")?.value || "modern",
    advancedModules: selectedAdvancedModules(prefix),
    capacity: Number($(prefix ? "lobbyCapacity" : "capacity")?.value || 3),
    rounds: Number($(prefix ? "lobbyRounds" : "rounds")?.value || 4),
    revealsPerRound: Number($(prefix ? "lobbyReveals" : "revealsPerRound")?.value || 2),
    characterSetMode: $(prefix ? "lobbyCharacterSetMode" : "characterSetMode")?.value || "extended",
    customCharacterKeys: selectedCustomKeys(prefix),
    demographicsEnabled: settingIsDetective(scope) ? false : Boolean($(prefix ? "lobbyDemographicsEnabled" : "demographicsEnabled")?.checked),
    voteVisibility: $(prefix ? "lobbyVoteVisibility" : "voteVisibility")?.value || "secret",
    tieRule: $(prefix ? "lobbyTieRule" : "tieRule")?.value || "runoff",
    automationMode: $(prefix ? "lobbyAutomationMode" : "automationMode")?.value || "off",
    inactivityTimeoutSeconds: Number($(prefix ? "lobbyInactivityTimeoutSeconds" : "inactivityTimeoutSeconds")?.value || 90),
    phaseTimeoutSeconds: Number($(prefix ? "lobbyPhaseTimeoutSeconds" : "phaseTimeoutSeconds")?.value || 180)
  };
}
function renderConfigurationAnalysis(scope = "create", provided = null) {
  const target = $(scope === "lobby" ? "lobbyConfigurationAnalysis" : "createConfigurationAnalysis");
  const status = $(scope === "lobby" ? "lobbyConfigurationStatus" : "createConfigurationStatus");
  if (!target || !status) return;
  const players = scope === "lobby" ? (state?.players?.length || 1) : Number($("expectedPlayers")?.value || 6);
  const analysis = provided || analyzeClientConfiguration(configurationSettingsFromControls(scope), players);
  const statusText = analysis.blocking ? `${analysis.blocking} крит.` : analysis.warnings ? `${analysis.warnings} попередж.` : "Готово";
  status.textContent = statusText;
  status.className = scope === "lobby" ? `badge configuration-status ${analysis.blocking ? "error" : analysis.warnings ? "warning" : "success"}` : `configuration-status ${analysis.blocking ? "error" : analysis.warnings ? "warning" : "success"}`;
  const metrics = [
    ["Учасники", String(analysis.playerCount), analysis.selection ? `${analysis.selection.exilesNeeded} мають вибути` : "спільна команда"],
    ["Тривалість", analysis.duration.text, analysis.duration.label],
    ["Розкриття", `${analysis.maxRevealed}/${analysis.characterCount}`, `${analysis.revealCoverage}% картки`],
    ["Рекомендація", `${analysis.recommendations.rounds} раунди`, `${analysis.recommendations.revealsPerRound} хар. / раунд`]
  ];
  target.innerHTML = `<div class="configuration-metrics">${metrics.map(([label, value, note]) => `<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong><span>${escapeHtml(note)}</span></article>`).join("")}</div><div class="configuration-issues">${analysis.issues.map((item) => `<article class="configuration-issue ${escapeHtml(item.severity)}"><b>${item.severity === "error" ? "!" : item.severity === "warning" ? "△" : item.severity === "success" ? "✓" : "i"}</b><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></article>`).join("")}</div>`;
}
const KEY_LABELS = {
  origin: "Походження / вид", demographicContext: "Стать та ідентичність", attitudeToChildren: "Ставлення до дітей",
  anomaly: "Аномалія", age: "Вік", profession: "Професія", health: "Здоров’я",
  skill: "Навичка", trait: "Риса", item: "Початковий багаж", hobby: "Хобі",
  phobia: "Фобія", secret: "Таємниця", relationship: "Стосунок",
  alibi: "Алібі", motive: "Можливий мотив", access: "Доступ і можливість",
  testimony: "Свідчення", evidenceLink: "Зв’язок із доказами"
};
const BASE_CHARACTER_KEYS = ["origin", "demographicContext", "attitudeToChildren", "anomaly", "age", "profession", "health", "skill", "trait", "item", "hobby", "phobia", "secret", "relationship"];
const DETECTIVE_CHARACTER_KEYS = ["origin", "age", "profession", "health", "skill", "trait", "item", "relationship", "alibi", "motive", "access", "testimony", "evidenceLink", "secret"];
const COMPACT_CHARACTER_KEYS = ["profession", "health", "skill", "trait", "item", "phobia", "secret", "relationship"];
const DETECTIVE_COMPACT_CHARACTER_KEYS = ["profession", "health", "skill", "trait", "item", "alibi", "testimony", "secret"];
const CHARACTER_SET_LABELS = { compact: "Стислий", extended: "Розширений", custom: "Власний" };
const RESOURCE_LABELS = { food: "Їжа", water: "Вода", energy: "Енергія", integrity: "Цілісність", medicine: "Медицина", morale: "Мораль" };
const PROVISION_LABELS = { food: "Їжа", water: "Вода", medicine: "Медицина", energy: "Енергія", utility: "Спорядження" };
const PHASES = {
  reveal: ["Розкриття", "Оберіть власні характеристики в межах ліміту поточного раунду."],
  discussion: ["Обговорення", "Зіставте відкриті дані, використайте здібності та підготуйте спільне рішення."],
  planning: ["Планування", "Визначте головну проблему раунду, розподіліть відповідальність і підготуйте команду до операцій."],
  operations: ["Операції", "Проведіть експедицію, ремонт, лікування та потрібні передачі предметів."],
  negotiation: ["Переговори", "Домовляйтеся, формуйте союзи, обмінюйтеся інформацією та предметами."],
  intrigue: ["Інтриги", "Використайте приховані рольові дії та підготуйтеся до рішення громади."],
  investigation: ["Розслідування", "Проведіть приватну перевірку, зіставте докази та обговоріть версії."],
  event: ["Криза", "Обговоріть варіанти поточної загрози та зафіксуйте рішення за правилами режиму."],
  elimination: ["Рішення громади", "Застосуйте санкцію, підтримайте апеляцію або зафіксуйте формальне звинувачення."],
  round_end: ["Наслідки", "Хост завершує раунд. Система застосує витрати й запустить наступний цикл або фінал."],
  final: ["Фінал", "Партію завершено."]
};
function isTimedClientPhase(phase) { return ["discussion", "planning", "negotiation", "intrigue", "investigation"].includes(phase); }
function isSocialClientPhase(phase) { return ["discussion", "planning", "negotiation", "intrigue", "investigation"].includes(phase); }
function isOperationClientPhase() { return state?.game?.phase === "operations"; }
function isRoleClientPhase() {
  const mode = state?.game?.features?.mode;
  if (mode === "factions" || mode === "advanced") return state?.game?.phase === "intrigue";
  return isSocialClientPhase(state?.game?.phase);
}

const $ = (id) => document.getElementById(id);
let session = null;
let state = null;
let pollTimer = null;
let pollAbortController = null;
let pollingActive = false;
let pollFailureCount = 0;
let recoveryPollTimer = null;
let toastTimer = null;
let requestBusy = false;
let renderDeferred = false;
let controlsLockedUntil = 0;
let deferredRenderTimer = null;
let discussionTicker = null;
let lastEventModalId = null;
let pendingEventChoiceId = null;
let pendingJudgementChoice = null;
const expandedEliminatedPlayers = new Set();
let activeGameTab = localStorage.getItem("shelter100-game-tab") || "turn";
let activeLogFilter = "key";
let currentActionModel = null;
let platformData = { account: null, campaigns: [], packs: [], statistics: null };
function readAccountSession() {
  try {
    const raw = sessionStorage.getItem("shelter129-account") || localStorage.getItem("shelter100-account");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    sessionStorage.setItem("shelter129-account", JSON.stringify(parsed));
    localStorage.removeItem("shelter100-account");
    return parsed;
  } catch { return null; }
}
function accountCredentials() {
  const value = readAccountSession();
  return value ? { accountId: value.accountId, accountToken: value.token } : {};
}
function refreshPlatformSelects() {
  const campaigns = platformData.campaigns || [];
  const packs = platformData.packs || [];
  const campaignOptions = '<option value="">Окрема партія</option>' + campaigns.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${item.chapters?.length || 0} розд.</option>`).join("");
  const packOptions = '<option value="">Базовий контент</option>' + packs.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  ["campaignSelect", "lobbyCampaign"].forEach((id) => { if ($(id)) $(id).innerHTML = campaignOptions; });
  ["contentPackSelect", "lobbyContentPack"].forEach((id) => { if ($(id)) $(id).innerHTML = packOptions; });
}
async function loadPlatform() {
  try {
    platformData = await api("/api/platform/bootstrap");
    $("accountBadge").textContent = platformData.account ? `Профіль: ${platformData.account.displayName}` : "Гостьовий режим";
    if (platformData.account) {
      $("createName").value = platformData.account.displayName;
      $("joinName").value = platformData.account.displayName;
    }
    refreshPlatformSelects();
  } catch (error) { $("accountBadge").textContent = "Профіль недоступний"; }
}

function characterKeyLabel(key) {
  return state?.game?.characterLabels?.[key] || KEY_LABELS[key] || String(key ?? "");
}
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((node) => node.classList.toggle("active", node.id === id));
}
function selectGameTab(tab, options = {}) {
  const hasInvestigation = Boolean(state?.game?.mystery);
  const aliases = { overview: "group" };
  const requestedTab = aliases[tab] || tab;
  const allowed = new Set(["turn", "character", "group", "catastrophe", "shelter", "log", "system", ...(hasInvestigation ? ["investigation"] : [])]);
  const nextTab = allowed.has(requestedTab) ? requestedTab : "turn";
  activeGameTab = nextTab;
  try { localStorage.setItem("shelter100-game-tab", nextTab); } catch {}
  document.querySelectorAll("[data-game-tab-button]").forEach((button) => {
    const active = button.dataset.gameTabButton === nextTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll("[data-game-tab-panel]").forEach((panel) => {
    panel.classList.toggle("game-tab-hidden", panel.dataset.gameTabPanel !== nextTab);
  });
  if (options.scroll) $("gameTabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function bindGameTabs() {
  document.querySelectorAll("[data-game-tab-button]").forEach((button) => {
    if (button.dataset.tabBound === "1") return;
    button.dataset.tabBound = "1";
    button.addEventListener("click", () => selectGameTab(button.dataset.gameTabButton));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const visible = [...document.querySelectorAll("[data-game-tab-button]:not(.hidden)")];
      const index = visible.indexOf(button);
      if (index < 0) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + visible.length) % visible.length;
      visible[nextIndex].focus();
      selectGameTab(visible[nextIndex].dataset.gameTabButton);
    });
  });
}
function getCurrentActionModel() {
  const game = state.game;
  const privateData = state.self.privateCharacter || {};
  const inactive = !state.self.active;
  const blocked = Boolean(privateData.detained);
  const cannotVote = inactive || blocked || Boolean(privateData.silenced);
  if (game.phase === "reveal") {
    const remaining = Math.max(0, Number(privateData.revealLimit || 0) - Number(privateData.revealsUsedRound || 0));
    if (inactive) return { title: "Слідкуйте за розкриттям групи", text: "Ваш персонаж перебуває поза сховищем. Переглядайте відкриті дані інших учасників.", badge: "Очікування", tone: "waiting", targetTab: "group", button: "Переглянути групу", required: false, steps: [{ label: "Відкриття інших гравців", state: "waiting" }] };
    if (blocked) return { title: "Зачекайте завершення ізоляції", text: "Під час ізоляції відкривати нові характеристики не можна.", badge: "Ізоляція", tone: "warning", targetTab: "character", button: "Переглянути персонажа", required: false, steps: [{ label: "Розкриття недоступне", state: "waiting" }] };
    if (remaining > 0) return { title: `Відкрийте ще ${remaining} ${remaining === 1 ? "характеристику" : "характеристики"}`, text: "Перейдіть до картки персонажа, позначте характеристики й підтвердьте вибір.", badge: "Обов’язкова дія", tone: "warning", targetTab: "character", button: "Відкрити картку", required: true, steps: [{ label: `${privateData.revealsUsedRound || 0}/${privateData.revealLimit || 0} відкрито`, state: "pending" }] };
    return { title: "Розкриття завершено", text: "Порівняйте відкриті характеристики групи й дочекайтеся наступної фази.", badge: "Виконано", tone: "done", targetTab: "group", button: "Переглянути групу", required: false, steps: [{ label: "Характеристики відкрито", state: "done" }] };
  }
  if (game.phase === "operations") {
    if (blocked || inactive) return { title: "Спостерігайте за операціями", text: blocked ? "Ізоляція не дозволяє брати участь у внутрішніх діях." : "Ваш персонаж перебуває поза сховищем.", badge: "Очікування", tone: "waiting", targetTab: "turn", button: "Переглянути операції", required: false, steps: [{ label: "Участь недоступна", state: "waiting" }] };
    const hasOperations = Boolean(game.features?.operations);
    const hasTreatment = Boolean(game.features?.treatment);
    const expeditionDone = !hasOperations || Boolean(game.operations?.expeditionUsed);
    const repairDone = !hasOperations || Boolean(game.operations?.repairUsed);
    const support = game.operations?.mySupport || privateData.operationSupport?.current || null;
    const supportDone = !hasOperations || Boolean(support);
    const done = expeditionDone && repairDone;
    const steps = [];
    if (hasOperations) steps.push({ label: "Командний внесок", state: support ? "done" : "optional" }, { label: "Експедиція", state: game.operations?.expeditionUsed ? "done" : "optional" }, { label: "Ремонт", state: game.operations?.repairUsed ? "done" : "optional" });
    if (hasTreatment) steps.push({ label: "Лікування", state: "optional" });
    const title = hasOperations && !supportDone ? "Оберіть внесок у командну операцію" : done ? "Основні операції завершено" : "Проведіть обрані операції";
    const text = [hasOperations ? (state.self.isHost ? "Розподіліть підтримку, оберіть польову групу та основного ремонтника." : "Оберіть підготовку спорядження, зв’язок, охорону або допомогу ремонту; хост призначить безпосередніх виконавців.") : "", hasTreatment ? "Кваліфіковані гравці можуть лікувати з картки персонажа." : ""].filter(Boolean).join(" ");
    return { title, text, badge: done ? "Готово" : support ? "Внесок обрано" : "Командна дія", tone: done ? "done" : "warning", targetTab: "turn", button: "Відкрити операції", required: false, steps };
  }
  if (game.phase === "discussion" || ["planning", "negotiation", "intrigue", "investigation"].includes(game.phase)) {
    if (inactive && game.features?.outsidePlay && privateData.outsideRole && ["discussion", "planning", "negotiation", "intrigue"].includes(game.phase)) {
      const used = privateData.outsideActionUsedRound === game.round;
      const camp = game.outsideCamp;
      return { title: camp?.collapsed ? "Зовнішній табір зруйновано" : used ? "Дію зовнішнього табору виконано" : "Зробіть внесок у зовнішню громаду", text: camp?.collapsed ? "Залишається лише спостерігати за фінальними наслідками або використати апеляцію." : used ? "Стежте за угодами, ресурсами табору та апеляціями." : "Оберіть пошук припасів, укріплення, дослідження, переговори, допомогу сховищу або відновлення.", badge: camp?.collapsed ? "Крах" : used ? "Виконано" : "Обов’язкова дія", tone: camp?.collapsed ? "warning" : used ? "done" : "warning", targetTab: "turn", button: "Відкрити зовнішній табір", required: !used && !camp?.collapsed, steps: [{ label: "Дія табору", state: used ? "done" : camp?.collapsed ? "waiting" : "pending" }, { label: "Спільне виживання", state: camp?.allied ? "done" : "optional" }] };
    }
    if (blocked) return { title: `Спостерігайте: ${PHASES[game.phase]?.[0] || "Соціальна фаза"}`, text: "Персонаж перебуває в ізоляції та не може виконувати активні дії.", badge: "Ізоляція", tone: "waiting", targetTab: "group", button: "Переглянути групу", required: false, steps: [{ label: "Активні дії недоступні", state: "waiting" }] };
    if (game.phase === "investigation" && game.mystery?.canInvestigate) return { title: "Проведіть приватну перевірку", text: "Оберіть гравця та аспект досьє. Результат з’явиться лише у вашому блокноті.", badge: "Обов’язкова дія", tone: "warning", targetTab: "investigation", button: "Відкрити розслідування", required: true, steps: [{ label: "Приватна перевірка", state: "pending" }] };
    const phaseText = {
      planning: "Обговоріть головні ризики й визначте, кого та що залучити до операцій.",
      negotiation: "Домовляйтеся, формуйте союзи й перевіряйте заяви інших учасників.",
      intrigue: "Скористайтеся прихованою рольовою дією або підготуйтеся до голосування.",
      investigation: "Зіставте докази та приватні висновки, не розкриваючи зайвого.",
      discussion: "Порівняйте відкриті характеристики й підготуйтеся до кризи."
    };
    return { title: PHASES[game.phase]?.[0] || "Соціальна фаза", text: phaseText[game.phase] || PHASES[game.phase]?.[1], badge: PHASES[game.phase]?.[0] || "Фаза", tone: "", targetTab: game.phase === "investigation" ? "investigation" : "group", button: game.phase === "investigation" ? "Відкрити розслідування" : "Переглянути групу", required: false, steps: [{ label: "Обговорити ситуацію", state: "optional" }, ...(game.phase === "intrigue" && game.features?.hiddenRoles ? [{ label: "Таємна рольова дія", state: privateData.roleActionUsed ? "done" : "optional" }] : [])] };
  }
  if (game.phase === "event" && game.event) {
    if (game.event.resolved) return { title: "Перегляньте наслідок кризи", text: game.event.resultText || "Рішення застосовано.", badge: "Кризу вирішено", tone: "done", targetTab: "turn", button: "Відкрити результат", required: false, steps: [{ label: "Наслідок застосовано", state: "done" }] };
    const hostDecision = game.event.decisionPolicy === "host";
    const canDecide = Boolean(game.event.canVote);
    if (hostDecision && !canDecide) return { title: "Обговоріть рішення кризи", text: "Висловіть аргументи групі. Після обговорення остаточний варіант підтвердить хост.", badge: "Рішення хоста", tone: "waiting", targetTab: "turn", button: "Переглянути кризу", required: false, steps: [{ label: "Обговорити варіанти", state: "optional" }, { label: "Рішення хоста", state: "waiting" }] };
    if (!canDecide || (!hostDecision && cannotVote)) return { title: "Очікуйте рішення групи", text: "Ваш персонаж не бере участі в цьому колективному голосуванні.", badge: "Без голосу", tone: "waiting", targetTab: "turn", button: "Переглянути кризу", required: false, steps: [{ label: "Голосування недоступне", state: "waiting" }] };
    const voted = Boolean(game.eventVote);
    return { title: voted ? (hostDecision ? "Рішення кризи обрано" : "Ваш голос враховано") : (hostDecision ? "Оберіть рішення кризи як хост" : "Проголосуйте за рішення кризи"), text: voted ? "До підрахунку можна змінити вибір." : (hostDecision ? "Врахуйте обговорення групи, оцініть ризики та підтвердьте один варіант." : "Оцініть ризик кожного варіанта й оберіть один."), badge: voted ? (hostDecision ? "Рішення обрано" : "Голос подано") : "Обов’язкова дія", tone: voted ? "done" : "warning", targetTab: "turn", button: "Відкрити кризу", required: !voted, steps: [{ label: hostDecision ? "Підтвердити рішення" : "Подати голос", state: voted ? "done" : "pending" }] };
  }
  if (game.phase === "elimination") {
    const runoff = Boolean(game.judgement?.runoff?.active);
    if (cannotVote) return { title: runoff ? "Триває повторне голосування" : "Очікуйте рішення громади", text: "У цій фазі ваш голос недоступний.", badge: "Без голосу", tone: "waiting", targetTab: "turn", button: "Переглянути голосування", required: false, steps: [{ label: "Голосування недоступне", state: "waiting" }] };
    const voted = Boolean(game.eliminationVote);
    return { title: voted ? (runoff ? "Повторний голос зафіксовано" : "Ваше рішення зафіксовано") : runoff ? "Переголосуйте між лідерами" : (state.settings.setting === "detective" ? "Оберіть головного підозрюваного" : "Проголосуйте за рішення громади"), text: voted ? "До підрахунку можна змінити голос." : runoff ? "Перший підрахунок завершився нічиєю. Доступні лише варіанти з найбільшою кількістю голосів." : "Оберіть ціль або варіант без санкцій і підтвердьте рішення.", badge: voted ? "Голос подано" : runoff ? "Повторне голосування" : "Обов’язкова дія", tone: voted ? "done" : "warning", targetTab: "turn", button: "Відкрити голосування", required: !voted, steps: [{ label: runoff ? "Повторний голос" : "Основний голос", state: voted ? "done" : "pending" }] };
  }
  if (game.phase === "round_end") return state.self.isHost
    ? { title: "Застосуйте наслідки раунду", text: "Перевірте журнал і стан сховища, а тоді запустіть наступний цикл або фінал.", badge: "Дія хоста", tone: "warning", targetTab: "turn", targetElement: "hostNextButton", button: "До керування фазою", required: true, steps: [{ label: "Завершити раунд", state: "pending" }] }
    : { title: "Очікуйте завершення раунду", text: "Хост підсумовує наслідки.", badge: "Очікування", tone: "waiting", targetTab: "log", button: "Відкрити журнал", required: false, steps: [{ label: "Підсумок раунду", state: "waiting" }] };
  return { title: "Слідкуйте за поточною фазою", text: PHASES[game.phase]?.[1] || "Очікуйте наступної дії.", badge: PHASES[game.phase]?.[0] || "Партія", tone: "waiting", targetTab: "turn", button: "Відкрити хід", required: false, steps: [] };
}

function renderHostDashboard() {
  const panel = $("hostDashboardPanel");
  const dashboard = state?.game?.hostDashboard;
  const visible = Boolean(state?.self?.isHost && dashboard);
  panel.classList.toggle("hidden", !visible);
  if (!visible) return;
  const safe = Boolean(dashboard.canAdvance);
  $("hostDashboardSafety").textContent = safe ? "Можна переходити далі" : `Очікується: ${dashboard.pending}`;
  $("hostDashboardSafety").className = `badge ${safe ? "host-safe" : "host-warning"}`;
  $("hostDashboardHelp").textContent = safe
    ? "Усі обов’язкові дії поточної фази виконано. Необов’язкові можливості можна використати до переходу далі."
    : "Перехід можливий лише після підтвердження: частина гравців ще не виконала обов’язкову дію.";
  const operationCards = dashboard.operations?.enabled ? [
    { label: "Експедиція", value: dashboard.operations.expeditionUsed ? "Виконано" : "Доступна", tone: dashboard.operations.expeditionUsed ? "done" : "optional" },
    { label: "Ремонт", value: dashboard.operations.repairUsed ? "Виконано" : "Доступний", tone: dashboard.operations.repairUsed ? "done" : "optional" },
    { label: "Командні внески", value: `${dashboard.operations.supportSubmitted || 0}/${dashboard.operations.supportTotal || 0} активні`, tone: dashboard.operations.supportSubmitted ? "done" : "optional" }
  ] : [];
  const cards = [
    { label: "Обов’язкові дії", value: dashboard.required ? `${dashboard.completed}/${dashboard.required}` : "Немає", tone: safe ? "done" : "pending" },
    { label: "У мережі", value: `${dashboard.connected}/${dashboard.totalPlayers}`, tone: dashboard.connected === dashboard.totalPlayers ? "done" : "pending" },
    { label: "Блокують перехід", value: dashboard.pending ? String(dashboard.pending) : "0", tone: dashboard.pending ? "pending" : "done" },
    ...operationCards
  ];
  $("hostDashboardSummary").innerHTML = cards.map((card) => `<article class="host-summary-card ${escapeHtml(card.tone)}"><small>${escapeHtml(card.label)}</small><strong>${escapeHtml(card.value)}</strong></article>`).join("");
  $("hostDashboardWarnings").innerHTML = (dashboard.warnings || []).length
    ? dashboard.warnings.map((warning) => `<div class="host-dashboard-warning">${escapeHtml(warning)}</div>`).join("")
    : '<div class="host-dashboard-ok">Критичних попереджень немає.</div>';
  const automation = dashboard.automation || state.game.automation || { mode: "off", remainingSeconds: null };
  $("hostAutomationMode").value = automation.mode || "off";
  if (document.activeElement !== $("hostAutomationInactivity")) $("hostAutomationInactivity").value = Number(automation.inactivitySeconds || 90);
  if (document.activeElement !== $("hostAutomationPhase")) $("hostAutomationPhase").value = Number(automation.phaseSeconds || 180);
  $("hostAutomationStatus").textContent = `${automation.modeLabel || AUTOMATION_LABELS[automation.mode] || "Ручне ведення"}. ${automation.pending?.length ? `Очікуються: ${automation.pending.join(", ")}.` : "Обов’язкові дії не блокують фазу."}`;
  $("hostAutomationCountdown").textContent = automation.remainingSeconds == null ? "Без ліміту" : automation.expired ? "Час вичерпано" : `Залишилось ${formatClock(automation.remainingSeconds)}`;
  $("hostAutomationCountdown").className = `badge ${automation.expired ? "host-warning" : automation.mode === "off" ? "" : "host-safe"}`;
  $("hostAutomationSave").onclick = () => sendAction("automation_settings", {
    automationMode: $("hostAutomationMode").value,
    inactivityTimeoutSeconds: Number($("hostAutomationInactivity").value),
    phaseTimeoutSeconds: Number($("hostAutomationPhase").value)
  });
  $("hostResolveInactive").onclick = () => sendAction("resolve_inactive");
  $("hostResolveAllPending").onclick = () => window.confirm("Зафіксувати нейтральні дії для всіх, хто ще не виконав обов’язкову дію?") && sendAction("resolve_inactive", { allPending: true });
  $("hostDashboardPlayers").innerHTML = (dashboard.players || []).map((player) => {
    const connection = player.connected ? '<span class="host-connection online">У мережі</span>' : `<span class="host-connection offline">Офлайн · ${Number(player.secondsSinceSeen || 0)} с</span>`;
    const sanctions = (player.sanctions || []).length ? player.sanctions.map((item) => `<span class="badge host-sanction">${escapeHtml(item)}</span>`).join("") : '<span class="muted">Без санкцій</span>';
    const actions = (player.publicActions || []).length ? player.publicActions.map((item) => `<span class="host-action-chip">${escapeHtml(item)}</span>`).join("") : '<span class="muted">Немає</span>';
    return `<tr class="host-player-row ${escapeHtml(player.phaseState?.code || "optional")}">
      <td><strong>${escapeHtml(player.name)}</strong>${player.isHost ? '<span class="badge accent">Хост</span>' : ''}${player.automationControlled ? `<span class="badge bot-badge" title="${escapeHtml(player.automationLastAction || "Нейтральна автоматична дія")}">Автобот</span>` : ''}</td>
      <td>${connection}</td>
      <td><div class="host-chip-list">${sanctions}</div></td>
      <td><span class="host-phase-state ${escapeHtml(player.phaseState?.code || "optional")}">${escapeHtml(player.phaseState?.label || "—")}</span><small>${escapeHtml(player.phaseState?.detail || "")}</small></td>
      <td><div class="host-chip-list">${actions}</div></td>
    </tr>`;
  }).join("");
  const roster = $("hostDashboardRoster");
  if (roster) roster.innerHTML = (dashboard.players || []).map((player) => {
    const phaseCode = escapeHtml(player.phaseState?.code || "optional");
    const phaseLabel = escapeHtml(player.phaseState?.label || "—");
    const detail = escapeHtml(player.phaseState?.detail || "");
    const connectionLabel = player.connected ? "У мережі" : `Офлайн · ${Number(player.secondsSinceSeen || 0)} с`;
    const actions = (player.publicActions || []).length ? player.publicActions.map((item) => `<span class="host-action-chip">${escapeHtml(item)}</span>`).join("") : '<span class="muted">Публічних дій немає</span>';
    return `<article class="host-player-card ${phaseCode}">
      <div class="host-player-identity"><span class="host-presence-dot ${player.connected ? "online" : "offline"}"></span><div><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(connectionLabel)}</small></div>${player.isHost ? '<span class="role-tag">Хост</span>' : ''}</div>
      <div class="host-player-readiness"><span class="host-phase-state ${phaseCode}">${phaseLabel}</span>${detail ? `<small>${detail}</small>` : ""}</div>
      <div class="host-player-public">${actions}</div>
    </article>`;
  }).join("");
  const roleBadge = $("systemRoleBadge");
  if (roleBadge) roleBadge.textContent = state.self?.isHost ? "Ви ведучий" : "Учасник";
}
function confirmHostAdvance() {
  const dashboard = state?.game?.hostDashboard;
  if (!dashboard || dashboard.canAdvance) return true;
  const names = (dashboard.blockers || []).join(", ") || "частина гравців";
  return window.confirm(`Не всі обов’язкові дії виконано. Очікуються: ${names}.\n\nПерейти до наступної фази попри це?`);
}

function renderCurrentAction() {
  currentActionModel = getCurrentActionModel();
  const model = currentActionModel;
  if (state.self?.privateCharacter?.automationControlled) {
    model.text = `${model.text} Нейтральний бот уже виконав дію цієї фази через вашу відсутність; наступні фази знову доступні вручну.`;
    model.badge = "Автодія виконана";
    model.required = false;
  }
  $("currentActionTitle").textContent = model.title;
  $("currentActionText").textContent = model.text;
  $("currentActionBadge").textContent = model.badge;
  $("currentActionPanel").className = `panel current-action-panel compact-panel ${model.tone || ""}`.trim();
  $("currentActionPanel").dataset.gameTabPanel = "turn";
  $("currentActionPanel").setAttribute("role", "tabpanel");
  $("currentActionSteps").innerHTML = (model.steps || []).map((step) => `<span class="current-action-step ${escapeHtml(step.state || "pending")}">${escapeHtml(step.label)}</span>`).join("");
  $("currentActionShortcut").textContent = model.button || "Перейти до дії";
  $("currentActionShortcut").onclick = () => {
    selectGameTab(model.targetTab || "turn");
    const target = model.targetElement ? $(model.targetElement) : model.targetTab === "character" ? $("privateCharacter") : model.targetTab === "investigation" ? $("detectivePanel") : model.targetTab === "group" ? $("publicPlayers") : model.targetTab === "shelter" ? $("resources") : model.targetTab === "log" ? $("gameLog") : $("primaryActionPanel");
    setTimeout(() => target?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };
}
function renderGameTabs() {
  bindGameTabs();
  const hasInvestigation = Boolean(state?.game?.mystery);
  $("investigationTabButton").classList.toggle("hidden", !hasInvestigation);
  if (!hasInvestigation && activeGameTab === "investigation") activeGameTab = "turn";
  if (!["turn","character","group","catastrophe","shelter","log","system","investigation"].includes(activeGameTab)) activeGameTab = "turn";
  document.querySelectorAll("[data-game-tab-button]").forEach((button) => {
    const targetTab = ({ group: "overview", shelter: "overview", log: "overview" })[currentActionModel?.targetTab] || currentActionModel?.targetTab;
    const requiresAction = Boolean(currentActionModel?.required && targetTab === button.dataset.gameTabButton);
    button.classList.toggle("action-required", requiresAction);
  });
  const turnStatus = $("gameTabTurnStatus");
  if (turnStatus) turnStatus.textContent = currentActionModel?.required ? "Потрібна дія" : currentActionModel?.badge || "Поточна дія";
  selectGameTab(activeGameTab);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
function openInfoDrawer(label, value, description) {
  $("infoDrawerLabel").textContent = label || "Характеристика";
  $("infoDrawerValue").textContent = value || "Не зазначено";
  $("infoDrawerDescription").textContent = description || "Для цієї характеристики окремого опису немає.";
  $("infoDrawer").classList.remove("hidden");
  $("infoDrawerBackdrop").classList.remove("hidden");
}
function closeInfoDrawer() {
  $("infoDrawer").classList.add("hidden");
  $("infoDrawerBackdrop").classList.add("hidden");
}
function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function currentDiscussionRemaining() {
  const timer = state?.game?.discussionTimer;
  if (!timer) return 0;
  if (timer.running && timer.endsAt) return Math.max(0, Math.ceil((Number(timer.endsAt) - Date.now()) / 1000));
  return Math.max(0, Number(timer.remainingSeconds || 0));
}
function refreshDiscussionClock() {
  const node = $("discussionTimerDisplay");
  if (!node || !state?.game || !isTimedClientPhase(state.game.phase)) return;
  const remaining = currentDiscussionRemaining();
  node.textContent = formatClock(remaining);
  $("discussionTimer").classList.toggle("timer-running", Boolean(state.game.discussionTimer?.running && remaining > 0));
  $("discussionTimer").classList.toggle("timer-urgent", remaining > 0 && remaining <= 30);
  $("discussionTimer").classList.toggle("timer-finished", remaining <= 0);
  if (state.self?.isHost && remaining <= 0) {
    $("discussionTimerStart").disabled = false;
    $("discussionTimerPause").disabled = true;
  }
}
function renderDiscussionTimer() {
  clearInterval(discussionTicker);
  const visible = Boolean(state?.game && isTimedClientPhase(state.game.phase));
  $("discussionTimer").classList.toggle("hidden", !visible);
  if (!visible) return;
  const timer = state.game.discussionTimer || { durationSeconds: 300, remainingSeconds: 300, running: false };
  $("discussionTimerHostControls").classList.toggle("hidden", !state.self.isHost);
  if (state.self.isHost && document.activeElement !== $("discussionTimerMinutes")) $("discussionTimerMinutes").value = Math.max(0.25, Number(timer.durationSeconds || 300) / 60);
  $("discussionTimerStart").disabled = Boolean(timer.running);
  $("discussionTimerPause").disabled = !timer.running;
  $("discussionTimerSet").onclick = () => sendAction("discussion_timer_set", { minutes: Number($("discussionTimerMinutes").value) });
  $("discussionTimerStart").onclick = () => sendAction("discussion_timer_start");
  $("discussionTimerPause").onclick = () => sendAction("discussion_timer_pause");
  $("discussionTimerReset").onclick = () => sendAction("discussion_timer_reset");
  refreshDiscussionClock();
  discussionTicker = setInterval(refreshDiscussionClock, 250);
}
function closeRoundEventModal() {
  $("roundEventModal").classList.add("hidden");
  $("roundEventBackdrop").classList.add("hidden");
}
function openRoundEventModal() {
  if (!state?.game?.event) return;
  $("roundEventModal").classList.remove("hidden");
  $("roundEventBackdrop").classList.remove("hidden");
}
function eventImpactLabel(keys = []) {
  const labels = { food: "їжа", water: "вода", energy: "енергія", integrity: "цілісність", medicine: "медицина", morale: "мораль", allies: "союзники" };
  return keys.map((key) => labels[key] || key).join(", ");
}
function chanceBadgeHtml(label, tone = "neutral") {
  return `<span class="chance-badge ${escapeHtml(tone)}">${escapeHtml(label || "Невизначений ризик")}</span>`;
}
function contentLevelBadgeHtml(level) {
  if (level === "absurd") return '<span class="content-level-badge absurd">Повний хаос</span>';
  if (level === "odd") return '<span class="content-level-badge odd">Дивина</span>';
  return "";
}
function reasonReportHtml(report, compact = false) {
  if (!report) return "";
  const chance = report.chance || {};
  const typeLabel = { event: "криза", expedition: "експедиція", repair: "ремонт", treatment: "лікування", system: "система" }[report.type] || report.type || "дія";
  const chanceHtml = chance.label ? `<div class="reason-chance ${escapeHtml(chance.tone || "neutral")}"><strong>${escapeHtml(chance.label)}</strong><span>${chance.finalPercent != null ? `Підсумковий шанс: ${Number(chance.finalPercent)}%` : ""}${chance.rollPercent != null ? ` · кидок: ${Number(chance.rollPercent)}` : chance.autoSuccess ? " · без кидка" : ""}</span></div>` : "";
  const factors = (report.factors || []).map((item) => `<li class="${escapeHtml(item.tone || "neutral")}"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.displayValue || "")}</span><small>${escapeHtml(item.detail || "")}</small></li>`).join("");
  const costs = (report.costs || []).map((item) => `<span><b>${escapeHtml(item.label)}</b> ${escapeHtml(item.value)}</span>`).join("");
  const secondary = (report.secondary || []).map((item) => `<div class="reason-secondary-item"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.result || item.detail || "")}${item.rollPercent != null ? ` · кидок ${Number(item.rollPercent)}${item.thresholdPercent != null ? ` / поріг ${Number(item.thresholdPercent)}` : ""}` : ""}</span></div>`).join("");
  const outcome = report.outcome ? `<div class="reason-outcome ${report.success === true ? "success" : report.success === false ? "failure" : ""}"><strong>${report.success === true ? "Успіх" : report.success === false ? "Невдача" : "Наслідок"}</strong><p>${escapeHtml(report.outcome.summary || "")}</p>${report.outcome.effects ? `<small>${escapeHtml(report.outcome.effects)}</small>` : ""}</div>` : "";
  return `<article class="reason-report ${compact ? "compact" : ""}"><header><div><small>Раунд ${Number(report.round || 0)} · ${escapeHtml(typeLabel)}</small><h4>${escapeHtml(report.title || "Пояснення результату")}</h4>${report.subtitle ? `<p>${escapeHtml(report.subtitle)}</p>` : ""}</div></header>${chanceHtml}${factors ? `<ul class="reason-factors">${factors}</ul>` : ""}${costs ? `<div class="reason-costs">${costs}</div>` : ""}${outcome}${secondary ? `<details class="reason-secondary"><summary>Додаткові чинники й кидки</summary>${secondary}</details>` : ""}</article>`;
}
function findRepairPreview(moduleId, workerId) {
  return (state?.game?.operations?.repairPreviews || []).find((item) => item.moduleId === moduleId && item.workerId === workerId) || null;
}
function updateRepairPreview() {
  const node = $("repairChancePreview");
  if (!node) return;
  const preview = findRepairPreview($("repairModule")?.value, $("repairWorker")?.value);
  node.innerHTML = preview ? `${chanceBadgeHtml(preview.label, preview.tone)}<small>Оцінка враховує виконавця, стан модуля та ${Number(preview.supportCount || 0)} доступних помічників ремонтної бригади; приховані джерела бонусів не розкриваються.</small>` : '<small>Оберіть модуль і виконавця, щоб побачити оцінку.</small>';
}
function updateTreatmentPreview() {
  const node = $("careChancePreview");
  if (!node) return;
  const data = state?.self?.privateCharacter;
  const preview = (data?.treatmentPreviews || []).find((item) => item.methodId === $("careMethod")?.value && item.targetId === $("careTarget")?.value && item.approachId === $("careApproach")?.value);
  const button = $("careButton");
  if (!preview) {
    node.innerHTML = '<small>Оберіть тактику, метод і ціль.</small>';
    if (button) button.disabled = true;
    return;
  }
  node.innerHTML = `${chanceBadgeHtml(preview.label, preview.tone)}<strong>${escapeHtml(preview.planDescription || "")}</strong><small>${escapeHtml(preview.costLabel || "")}. ${escapeHtml(preview.outcomeHint || "")}</small>${preview.available ? "" : `<em class="care-unavailable">${escapeHtml(preview.unavailableReason || "Ця тактика недоступна.")}</em>`}`;
  if (button) button.disabled = Boolean(data?.careUsedRound === state.game.round || !preview.available);
}
function renderRoundEventModal(game) {
  if (game.phase !== "event" || !game.event) {
    closeRoundEventModal();
    lastEventModalId = null;
    return;
  }
  const event = game.event;
  $("roundEventModalTitle").innerHTML = `${escapeHtml(event.title)} ${contentLevelBadgeHtml(event.level)}`;
  $("roundEventModalDescription").textContent = event.description;
  $("roundEventSymbol").textContent = state.settings.setting === "fantasy" ? "✦" : state.settings.setting === "space" ? "◈" : state.settings.setting === "horror" ? "◉" : state.settings.setting === "detective" ? "⌕" : "◇";
  const cannotVote = !event.canVote;
  const selectedEventChoice = pendingEventChoiceId || game.eventVote || null;
  $("roundEventChoices").innerHTML = `<p class="event-decision-policy">${escapeHtml(event.decisionPolicyLabel || "")}</p>` + event.choices.map((choice, index) => `<button class="round-event-choice council-option ${selectedEventChoice === choice.id ? "selected" : ""}" data-modal-event-choice="${escapeHtml(choice.id)}" ${event.resolved || cannotVote ? "disabled" : ""}><span class="council-option-index">${String(index + 1).padStart(2, "0")}</span><div class="council-option-copy"><strong>${escapeHtml(choice.label)}</strong>${chanceBadgeHtml(choice.chanceLabel, choice.chanceTone)}<small>${choice.impact?.length ? `Може вплинути: ${escapeHtml(eventImpactLabel(choice.impact))}` : "Наслідки залежать від складу групи"}</small>${choice.preview?.explanation ? `<em>${escapeHtml(choice.preview.explanation)}</em>` : ""}</div><span class="council-option-mark" aria-hidden="true">${selectedEventChoice === choice.id ? "✓" : ""}</span></button>`).join("");
  document.querySelectorAll("[data-modal-event-choice]").forEach((button) => button.onclick = () => {
    pendingEventChoiceId = button.dataset.modalEventChoice;
    document.querySelectorAll("[data-modal-event-choice]").forEach((item) => item.classList.toggle("selected", item === button));
    const confirm = $("roundEventConfirm");
    if (confirm) {
      confirm.disabled = false;
      confirm.textContent = game.eventVote === pendingEventChoiceId ? "Рішення вже зафіксовано" : "Підтвердити рішення";
    }
  });
  const eventConfirm = $("roundEventConfirm");
  if (eventConfirm) {
    eventConfirm.classList.toggle("hidden", event.resolved || cannotVote);
    eventConfirm.disabled = !selectedEventChoice || selectedEventChoice === game.eventVote;
    eventConfirm.textContent = selectedEventChoice === game.eventVote && selectedEventChoice ? "Рішення вже зафіксовано" : "Підтвердити рішення";
    eventConfirm.onclick = () => {
      const choiceId = pendingEventChoiceId || game.eventVote;
      if (!choiceId) return;
      sendAction("event_vote", { choiceId });
      pendingEventChoiceId = null;
    };
  }
  const hasReasonReport = Boolean(event.reasonReport);
  $("roundEventModalResult").classList.toggle("hidden", !event.resolved || hasReasonReport);
  $("roundEventModalResult").textContent = hasReasonReport ? "" : (event.resultText || "");
  $("roundEventReasonReport").classList.toggle("hidden", !hasReasonReport);
  $("roundEventReasonReport").innerHTML = reasonReportHtml(event.reasonReport);
  $("roundEventVoteCount").textContent = event.decisionPolicy === "host" ? (event.voteCount ? "Рішення хоста зафіксовано" : "Очікується рішення хоста") : `Голосів: ${event.voteCount || 0}/${event.requiredCount || 0}`;
  $("roundEventResolve").classList.toggle("hidden", !state.self.isHost || event.resolved);
  $("roundEventResolve").onclick = () => sendAction("resolve_event");
  if (lastEventModalId !== event.id) {
    lastEventModalId = event.id;
    pendingEventChoiceId = null;
    openRoundEventModal();
  }
}
function bindInfoButtons(root = document) {
  root.querySelectorAll?.("[data-open-info]").forEach((button) => {
    if (button.dataset.infoBound === "1") return;
    button.dataset.infoBound = "1";
    button.addEventListener("click", () => openInfoDrawer(button.dataset.infoLabel, button.dataset.infoValue, button.dataset.infoDescription));
  });
}
function toast(message, error = false) {
  const node = $("toast");
  node.textContent = message;
  node.classList.toggle("error", error);
  node.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.add("hidden"), 3600);
}
function saveSession(value) {
  session = value;
  localStorage.removeItem("shelter100-session");
  if (value) sessionStorage.setItem("shelter129-room-session", JSON.stringify(value));
  else sessionStorage.removeItem("shelter129-room-session");
  updateResumeButton();
}
function readSession() {
  try {
    const raw = sessionStorage.getItem("shelter129-room-session") || localStorage.getItem("shelter100-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    sessionStorage.setItem("shelter129-room-session", JSON.stringify(parsed));
    localStorage.removeItem("shelter100-session");
    return parsed;
  } catch { return null; }
}
function updateResumeButton() {
  const saved = readSession();
  $("resumeButton").classList.toggle("hidden", !saved);
  if (saved) $("resumeButton").textContent = `Відновити кімнату ${saved.code}`;
}
async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (session?.playerId) {
    headers["X-Player-Id"] = session.playerId;
    headers["X-Player-Token"] = session.token;
  }
  const account = readAccountSession();
  if (account) {
    headers.Authorization = `Bearer ${account.token}`;
    headers["X-Account-Id"] = account.accountId;
  }
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: Object.keys(headers).length ? headers : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: options.signal
  });
  const contentType = String(response.headers.get("Content-Type") || "");
  let payload;
  if (contentType.includes("application/json")) payload = await response.json().catch(() => null);
  else {
    const text = await response.text().catch(() => "");
    const gatewayFailure = response.status === 502 || /bad gateway/i.test(text);
    payload = { ok: false, error: gatewayFailure
      ? "Публічний тунель втратив зв’язок із сервером. Хосту треба перезапустити start_internet.bat і надіслати нове посилання."
      : "Сервер повернув некоректну відповідь." };
  }
  payload ||= { ok: false, error: "Сервер повернув некоректну відповідь." };
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || `Помилка ${response.status}`);
    error.status = response.status;
    error.retryAfterMs = Math.max(0, Number(payload.retryAfterSeconds || response.headers.get("Retry-After") || 0) * 1000);
    throw error;
  }
  return payload;
}
async function sendAction(action, extra = {}) {
  if (!session || requestBusy) return;
  requestBusy = true;
  pollAbortController?.abort();
  try {
    const payload = await api(`/api/rooms/${session.code}/action`, {
      method: "POST",
      body: { playerId: session.playerId, token: session.token, action, ...extra }
    });
    state = payload;
    pollFailureCount = 0;
    render(true);
  } catch (error) {
    toast(error.message, true);
  } finally {
    requestBusy = false;
    if (pollingActive) schedulePoll(80);
  }
}
function controlsAreActive() {
  const active = document.activeElement;
  const focusedControl = Boolean(active && active.closest?.("#gameScreen, #roomScreen") && active.matches("select, input, textarea"));
  return focusedControl || Date.now() < controlsLockedUntil;
}
function scheduleDeferredRender() {
  clearTimeout(deferredRenderTimer);
  const delay = Math.max(40, controlsLockedUntil - Date.now() + 40);
  deferredRenderTimer = setTimeout(() => {
    if (!renderDeferred) return;
    if (controlsAreActive()) return scheduleDeferredRender();
    render(true);
  }, delay);
}
document.addEventListener("pointerdown", (event) => {
  if (event.target.closest?.("#gameScreen select, #gameScreen input, #gameScreen textarea, #roomScreen select, #roomScreen input")) {
    controlsLockedUntil = Date.now() + 2500;
  }
});
document.addEventListener("focusin", (event) => {
  if (event.target.closest?.("#gameScreen select, #gameScreen input, #gameScreen textarea, #roomScreen select, #roomScreen input")) {
    controlsLockedUntil = Date.now() + 2500;
  }
});
document.addEventListener("change", (event) => {
  if (event.target.closest?.("#gameScreen select, #gameScreen input, #gameScreen textarea, #roomScreen select, #roomScreen input")) {
    controlsLockedUntil = Date.now() + 900;
    if (renderDeferred) scheduleDeferredRender();
  }
});
function stopPolling() {
  pollingActive = false;
  clearTimeout(pollTimer);
  pollTimer = null;
  pollAbortController?.abort();
  pollAbortController = null;
}
function schedulePoll(delay = 0) {
  if (!pollingActive || !session) return;
  clearTimeout(pollTimer);
  pollTimer = setTimeout(poll, Math.max(0, delay));
}
function pollWaitMs() {
  if (document.hidden) return 25000;
  if (state?.game?.phase === "final") return 25000;
  return 20000;
}
async function poll() {
  if (!pollingActive || !session) return;
  if (requestBusy) return schedulePoll(250);
  pollAbortController?.abort();
  const controller = new AbortController();
  pollAbortController = controller;
  const startedAt = Date.now();
  try {
    const previousRevision = state?.revision;
    const waitMs = previousRevision == null ? 0 : pollWaitMs();
    const query = new URLSearchParams({
      sinceRevision: String(previousRevision ?? -1),
      waitMs: String(waitMs)
    });
    const payload = await api(`/api/rooms/${session.code}/state?${query}`, { signal: controller.signal });
    if (!pollingActive || controller.signal.aborted) return;
    state = payload;
    pollFailureCount = 0;
    const duration = Date.now() - startedAt;
    $("connectionBadge").textContent = "Підключено";
    $("connectionBadge").title = `Економне довге опитування · остання відповідь ${Math.round(duration / 100) / 10} с`;
    $("connectionBadge").classList.remove("connection-error");
    if (previousRevision !== payload.revision) render(false);
    schedulePoll(60);
  } catch (error) {
    if (error.name === "AbortError" || controller.signal.aborted || !pollingActive) return;
    pollFailureCount += 1;
    $("connectionBadge").textContent = "Відновлення зв’язку…";
    $("connectionBadge").title = error.message;
    $("connectionBadge").classList.add("connection-error");
    if (/недійсний|не знайдено/i.test(error.message)) {
      stopPolling();
      toast(error.message, true);
      return;
    }
    const backoff = error.retryAfterMs || Math.min(15000, 700 * (2 ** Math.min(5, pollFailureCount - 1)));
    schedulePoll(backoff);
  }
}
function startPolling() {
  stopPolling();
  pollingActive = true;
  pollFailureCount = 0;
  schedulePoll(0);
}
function render(force = false) {
  if (!state) return;
  if (!force && controlsAreActive()) {
    renderDeferred = true;
    return;
  }
  renderDeferred = false;
  $("leaveButton").classList.remove("hidden");
  if (!state.game) renderLobby();
  else if (state.game.phase === "final") renderFinal();
  else renderGame();
}
document.addEventListener("focusout", () => {
  if (!renderDeferred) return;
  scheduleDeferredRender();
});

function recoveryRequestRowsHtml(requests = []) {
  if (!requests.length) return "";
  return `<div class="section-title compact-title"><div><p class="eyebrow">Запити повернення</p><h4>Потрібне підтвердження хоста</h4></div><span class="badge">${requests.length}</span></div>${requests.map((request) => `<article class="recovery-request-row"><div><strong>${escapeHtml(request.playerName)}</strong><small>Запит на перенесення сеансу</small></div><div><button class="button secondary" type="button" data-recovery-approve="${escapeHtml(request.id)}">Підтвердити</button><button class="button ghost" type="button" data-recovery-reject="${escapeHtml(request.id)}">Відхилити</button></div></article>`).join("")}`;
}
function bindRecoveryRequestButtons(container) {
  if (!container) return;
  container.querySelectorAll("[data-recovery-approve]").forEach((button) => { button.onclick = () => sendAction("resolve_recovery_request", { requestId: button.dataset.recoveryApprove, approve: true }); });
  container.querySelectorAll("[data-recovery-reject]").forEach((button) => { button.onclick = () => sendAction("resolve_recovery_request", { requestId: button.dataset.recoveryReject, approve: false }); });
}
function renderSessionManagement(scope = "lobby") {
  const prefix = scope === "game" ? "game" : "lobby";
  const management = state?.sessionManagement;
  if (!management) return;
  const codeElement = $(`${prefix}RecoveryCode`);
  const hostBadge = $(`${prefix}SessionHostBadge`);
  const hostPanel = $(`${prefix}HostManagement`);
  const targetSelect = $(`${prefix}HostTransferTarget`);
  const requestsPanel = $(`${prefix}RecoveryRequests`);
  if (codeElement) codeElement.textContent = management.recoveryCode || state.self.recoveryCode || "----------";
  if (hostBadge) {
    hostBadge.textContent = state.self.isHost ? "Ви хост" : `Хост: ${management.host?.name || "—"}`;
    hostBadge.className = `badge ${state.self.isHost ? "accent" : ""}`;
  }
  if (hostPanel) hostPanel.classList.toggle("hidden", !state.self.isHost);
  if (state.self.isHost && targetSelect) {
    targetSelect.innerHTML = (management.transferCandidates || []).map((player) => `<option value="${escapeHtml(player.id)}" ${player.connected ? "" : "disabled"}>${escapeHtml(player.name)}${player.connected ? "" : " · не в мережі"}</option>`).join("") || '<option value="">Немає іншого підключеного гравця</option>';
    $(`${prefix}HostFailoverEnabled`).checked = management.failoverEnabled !== false;
    $(`${prefix}HostFailoverSeconds`).value = Number(management.failoverSeconds || 120);
  }
  if (requestsPanel) {
    const requests = management.recoveryRequests || [];
    requestsPanel.classList.toggle("hidden", !state.self.isHost || !requests.length);
    requestsPanel.innerHTML = recoveryRequestRowsHtml(requests);
    bindRecoveryRequestButtons(requestsPanel);
  }
}

function normalizeGenerationSeedClient(value) {
  return String(value || "").normalize("NFKD").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}
function randomGenerationSeed() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return [0, 1, 2].map((group) => [0, 1, 2, 3].map((offset) => alphabet[bytes[group * 4 + offset] % alphabet.length]).join("")).join("-");
}
function renderGenerationPanel(scope = "lobby") {
  const generation = state?.generation;
  if (!generation) return;
  if (scope === "lobby") {
    $("lobbyGenerationSeedValue").textContent = generation.seed || "—";
    $("lobbyGenerationConfigCode").textContent = generation.configCode || "—";
    $("lobbyGenerationSchema").textContent = generation.schema || "—";
    $("lobbyGenerationFingerprintCard").classList.toggle("hidden", !generation.fingerprint);
    $("lobbyGenerationFingerprint").textContent = generation.fingerprint || "—";
    $("lobbyGenerationNote").textContent = generation.note || "";
  } else {
    $("gameGenerationSeedValue").textContent = generation.seed || "—";
    $("gameGenerationConfigCode").textContent = generation.configCode || "—";
    $("gameGenerationFingerprint").textContent = generation.fingerprint || "—";
    $("gameGenerationPanel").classList.toggle("generation-migrated", generation.reproducible === false);
  }
}
async function copyGenerationValue(value, label) {
  if (!value) return;
  try { await navigator.clipboard.writeText(value); toast(`${label} скопійовано.`); }
  catch { toast(`${label}: ${value}`); }
}

function renderLobby() {
  showScreen("roomScreen");
  $("roomCode").textContent = state.code;
  const settingNames = { modern: "Наші дні", fantasy: "Темне фентезі", space: "Далекий космос", postapocalypse: "Постапокаліпсис", cyberpunk: "Кіберпанк", horror: "Горор", detective: "Детектив" };
  const modeInfo = MODE_INFO[state.settings.mode] || MODE_INFO.classic;
  $("roomSettings").innerHTML = [
    state.settings.soloTestMode ? "Соло-тестування" : (state.settings.tutorialEnabled ? "Навчальна партія" : modeInfo.name), `Цикл: ${(state.settings.tutorialEnabled ? ["Розкриття", "Обговорення", "Криза", "Наслідки", "Рішення громади", "Фінал"] : modeLoopPreview(state.settings.mode, state.settings.advancedModules, state.settings.setting)).join(" → ")}`, settingNames[state.settings.setting],
    ...(state.settings.mode === "advanced" ? (state.settings.advancedModules || []).map((id) => `Модуль: ${ADVANCED_MODULE_INFO[id]?.name || id}`) : []),
    state.settings.scenarioMode === "catalog" ? "Готова катастрофа" : "Процедурна катастрофа",
    state.generation?.seed ? `Seed: ${state.generation.seed}` : null,
    modeInfo.elimination ? `${state.settings.capacity} місць` : "Без вигнання",
    modeInfo.elimination ? (state.settings.voteSystem === "tribunal" ? "Трибунал" : "Вигнання") : null,
    `${state.settings.rounds} раунди`, `${state.settings.revealsPerRound} характеристики за раунд`, `${CHARACTER_SET_LABELS[state.settings.characterSetMode || "extended"] || "Розширений"} набір`, state.settings.setting === "detective" ? null : (state.settings.demographicsEnabled === false ? "Демографія вимкнена" : "Демографія в епілозі"), AUTOMATION_LABELS[state.settings.automationMode || "off"], ABSURDITY[state.settings.absurdity],
    state.settings.campaignName ? `Кампанія: ${state.settings.campaignName}` : null,
    state.settings.contentPackName ? `Набір: ${state.settings.contentPackName}` : null
  ].filter(Boolean).map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("");
  renderGenerationPanel("lobby");
  renderVictoryRuleCards("lobbyVictoryRules", state.victoryRules || previewVictoryRules(state.settings.mode, state.settings.setting, state.settings.rounds, state.settings.capacity, state.settings.advancedModules));
  $("lobbyEndCondition").textContent = `Завершення: ${(state.victoryRules || {}).end?.objective || "умова визначається режимом"}`;
  $("playerCount").textContent = `${state.players.length}/12`;
  $("lobbyPlayers").innerHTML = state.players.map((player) => `
    <div class="lobby-player">
      <div class="player-meta"><span class="dot ${player.connected ? "online" : ""}"></span><strong>${escapeHtml(player.name)}</strong>${player.isHost ? '<span class="badge accent">Хост</span>' : ""}</div>
      <span class="badge">${player.ready || player.isHost ? "Готовий" : "Не готовий"}</span>
    </div>`).join("");
  $("readyButton").classList.toggle("hidden", state.self.isHost);
  $("readyButton").textContent = state.self.ready ? "Скасувати готовність" : "Я готовий";
  $("startButton").classList.toggle("hidden", !state.self.isHost);
  const allReady = state.players.every((player) => player.ready || player.isHost);
  const savedAnalysis = state.configurationAnalysis || analyzeClientConfiguration(state.settings, state.players.length);
  renderConfigurationAnalysis("lobby", savedAnalysis);
  const minimumPlayers = state.settings.soloTestMode ? 1 : (state.settings.tutorialEnabled ? 3 : 4);
  $("startButton").disabled = state.players.length < minimumPlayers || !allReady || Boolean(savedAnalysis.blocking);
  $("lobbyTitle").textContent = state.self.isHost ? "Запросіть друзів" : "Очікуйте старту";
  $("lobbyMinimumHint").textContent = state.settings.soloTestMode ? "Соло-тестування активне: кімнату можна запустити одному." : state.settings.tutorialEnabled ? "Для навчальної партії потрібно щонайменше троє. Перший раунд проходить без санкцій." : "Потрібно щонайменше четверо. Після старту нові гравці вже не зможуть приєднатися.";
  const blockingText = (savedAnalysis.issues || []).filter((item) => item.severity === "error").map((item) => item.title).join(" · ");
  $("lobbyError").textContent = state.players.length < minimumPlayers ? `Потрібно щонайменше ${minimumPlayers} гравці.` : !allReady ? "Не всі гравці підтвердили готовність." : savedAnalysis.blocking ? blockingText : savedAnalysis.warnings ? "Старт можливий, але перевірте попередження конфігурації." : "Усе готово до старту.";
  if ($("lobbySummaryRoomCode")) $("lobbySummaryRoomCode").textContent = state.code;
  if ($("lobbySummaryPlayers")) $("lobbySummaryPlayers").textContent = `${state.players.length}`;
  if ($("lobbySummaryReady")) $("lobbySummaryReady").textContent = `${state.players.filter((player) => player.ready || player.isHost).length}`;
  if ($("lobbySummaryCapacity")) $("lobbySummaryCapacity").textContent = modeInfo.elimination ? `${state.settings.capacity}` : "Без ліміту";
  if ($("lobbyBriefingStatus")) $("lobbyBriefingStatus").textContent = state.players.length < minimumPlayers ? "Очікування учасників" : !allReady ? "Очікування готовності" : savedAnalysis.blocking ? "Потрібна зміна параметрів" : "Гермодвері готові до закриття";
  renderSessionManagement("lobby");

  $("lobbySettingsPanel").classList.toggle("hidden", !state.self.isHost);
  if (state.self.isHost && !controlsAreActive()) {
    $("lobbyTutorialEnabled").checked = state.settings.tutorialEnabled === true;
    if ($("lobbySoloTestMode")) $("lobbySoloTestMode").checked = state.settings.soloTestMode === true;
    $("lobbyGameMode").value = state.settings.mode || "classic";
    $("lobbySetting").value = state.settings.setting;
    renderAdvancedModules("lobby", state.settings.advancedModules || []);
    $("lobbyScenarioMode").value = state.settings.scenarioMode || "procedural";
    $("lobbyGenerationSeed").value = state.generation?.seed || state.settings.generationSeed || "";
    refreshPlatformSelects();
    $("lobbyCampaign").value = state.settings.campaignId || "";
    $("lobbyContentPack").value = state.settings.contentPackId || "";
    $("lobbyCapacity").value = state.settings.capacity;
    $("lobbyRounds").value = state.settings.rounds;
    $("lobbyReveals").value = state.settings.revealsPerRound;
    $("lobbyDemographicsEnabled").checked = state.settings.setting !== "detective" && state.settings.demographicsEnabled !== false;
    syncDemographicsControl("lobby");
    $("lobbyCharacterSetMode").value = state.settings.characterSetMode || "extended";
    renderCharacterSetPicker("lobby", false);
    if ((state.settings.characterSetMode || "extended") === "custom") {
      const selected = new Set(state.settings.customCharacterKeys || []);
      $("lobbyCustomCharacterKeys").querySelectorAll("input").forEach((input) => { input.checked = selected.has(input.value); });
      renderCharacterSetPicker("lobby", true);
    }
    $("lobbyAbsurdity").value = state.settings.absurdity;
    $("lobbyVoteSystem").value = state.settings.voteSystem || "exile";
    $("lobbyVoteVisibility").value = state.settings.voteVisibility || "secret";
    $("lobbyTieRule").value = state.settings.tieRule === "random" ? "runoff" : (state.settings.tieRule || "runoff");
    $("lobbyAutomationMode").value = state.settings.automationMode || "off";
    $("lobbyInactivityTimeoutSeconds").value = Number(state.settings.inactivityTimeoutSeconds || 90);
    $("lobbyPhaseTimeoutSeconds").value = Number(state.settings.phaseTimeoutSeconds || 180);
    $("lobbySettingsHostFailoverEnabled").checked = state.settings.hostFailoverEnabled !== false;
    $("lobbySettingsHostFailoverSeconds").value = Number(state.settings.hostFailoverSeconds || 120);
    syncModeFields("lobby");
    applyTutorialPresetClient("lobby");
  }
}

function resourceToneClass(value) {
  if (value < 20) return "critical";
  if (value < 40) return "warning";
  return "good";
}
function resourceLevel(value) {
  const number = Number(value || 0);
  if (number < 20) return "Критично";
  if (number < 40) return "Мало";
  if (number < 65) return "Достатньо";
  if (number < 85) return "Стабільно";
  return "Надлишок";
}
function assetText(asset) {
  return typeof asset === "string" ? asset : `${asset.name}${asset.description ? ` — ${asset.description}` : ""}`;
}
function scenarioPriorityItemsHtml(items, kind) {
  return (items || []).map((item, index) => `
    <section class="scenario-priority-item ${escapeHtml(kind)}">
      <span class="scenario-priority-index">${index + 1}</span>
      <div><strong>${escapeHtml(item.title || "Без назви")}</strong><p>${escapeHtml(item.detail || "")}</p>${item.status ? `<small>${escapeHtml(item.status)}</small>` : item.source ? `<small>${escapeHtml(item.source)}</small>` : ""}</div>
    </section>`).join("");
}
function renderScenarioPriorities(priorities) {
  const visible = Boolean(priorities && priorities.threats?.length && priorities.needs?.length && priorities.conditions?.length && priorities.longTermRisk);
  $("scenarioPriorities").classList.toggle("hidden", !visible);
  if (!visible) return;
  $("scenarioPriorityThreats").innerHTML = scenarioPriorityItemsHtml(priorities.threats, "threat");
  $("scenarioPriorityNeeds").innerHTML = scenarioPriorityItemsHtml(priorities.needs, "need");
  $("scenarioPriorityConditions").innerHTML = scenarioPriorityItemsHtml(priorities.conditions, "condition");
  const risk = priorities.longTermRisk;
  $("scenarioPriorityLongTerm").innerHTML = `<div><small>1 довгостроковий ризик</small><strong>${escapeHtml(risk.title || "Невідомий ризик")}</strong></div><p>${escapeHtml(risk.detail || "")}</p>`;
}
function campaignEffectText(effects = {}) {
  return Object.entries(effects).map(([key, value]) => {
    const label = key === "allies" ? "Союзники" : (RESOURCE_LABELS[key] || key);
    return `${label} ${Number(value) >= 0 ? "+" : ""}${Number(value)}`;
  }).join(" · ") || "Без прямої числової зміни";
}
function renderCampaignLegacy(legacy) {
  const visible = Boolean(legacy?.enabled && legacy.dilemma);
  $("campaignLegacyPanel").classList.toggle("hidden", !visible);
  if (!visible) return;
  const dilemma = legacy.dilemma;
  $("campaignLegacyTitle").textContent = dilemma.title || "Перевага з ціною";
  $("campaignLegacyDeadline").textContent = dilemma.status === "resolved" ? "Вирішено" : `До кінця ${dilemma.dueRound}-го раунду`;
  $("campaignLegacyDeadline").className = `badge ${dilemma.status === "resolved" ? "good" : state.game.round >= dilemma.dueRound ? "danger" : "accent"}`;
  const source = legacy.sourceChapter;
  $("campaignLegacySource").textContent = source ? `Розділ ${source.number}: ${source.verdict || "попередній результат"} · ${source.score ?? "?"}/100 · ${source.settlement || "сховище"}` : `Розділ ${legacy.chapterNumber} кампанії «${legacy.campaignName}»`;
  $("campaignLegacyBenefit").textContent = dilemma.benefit || "Кампанійна перевага";
  $("campaignLegacyContext").textContent = dilemma.context || "Громада має визначити ціну спадщини.";
  $("campaignLegacyStarting").textContent = legacy.startingSummary ? `На старті: ${legacy.startingSummary}` : "";
  $("campaignLegacyOptions").innerHTML = (dilemma.options || []).map((option) => {
    const selected = legacy.myVote === option.id;
    const resolved = dilemma.resolvedOptionId === option.id;
    return `<article class="campaign-legacy-option ${selected ? "selected" : ""} ${resolved ? "resolved" : ""}">
      <div class="campaign-option-head"><strong>${escapeHtml(option.label)}</strong><span class="badge">${option.votes || 0} голос.</span></div>
      <p>${escapeHtml(option.description || "")}</p>
      <small>${escapeHtml(campaignEffectText(option.effects))}${option.affordable ? "" : " · Зараз бракує ресурсів для виконання"}</small>
      ${dilemma.status === "open" && legacy.canVote ? `<button class="button ${selected ? "primary" : "ghost"}" type="button" data-campaign-legacy-vote="${escapeHtml(option.id)}">${selected ? "Ваш вибір" : "Підтримати"}</button>` : ""}
    </article>`;
  }).join("");
  $("campaignLegacyOptions").querySelectorAll("[data-campaign-legacy-vote]").forEach((button) => {
    button.onclick = () => sendAction("campaign_legacy_vote", { optionId: button.dataset.campaignLegacyVote });
  });
  $("campaignLegacyStatus").textContent = dilemma.status === "resolved"
    ? (dilemma.automatic ? "Рішення застосовано автоматично після завершення строку." : "Громада завершила кампанійне рішення.")
    : `Подано голосів: ${legacy.votesCast}/${legacy.eligibleVoters}.${legacy.myVote ? " Ваш вибір збережено." : " Оберіть один підхід."}`;
  $("campaignLegacyResolve").classList.toggle("hidden", !legacy.canResolve || dilemma.status !== "open");
  $("campaignLegacyResolve").disabled = legacy.votesCast === 0 && state.game.round < dilemma.dueRound;
  $("campaignLegacyResolve").textContent = legacy.votesCast >= legacy.eligibleVoters ? "Застосувати рішення" : "Завершити достроково";
  $("campaignLegacyResolve").onclick = () => sendAction("resolve_campaign_legacy", { force: true });
  $("campaignLegacyResult").classList.toggle("hidden", dilemma.status !== "resolved");
  $("campaignLegacyResult").innerHTML = dilemma.status === "resolved" ? `<strong>Наслідок</strong><p>${escapeHtml(dilemma.resultText || "Рішення застосовано.")}</p>` : "";
}
function renderShelter(game) {
  $("catastropheTitle").textContent = game.catastrophe.title;
  $("catastropheDescription").textContent = game.catastrophe.description;
  $("catastropheThreat").textContent = game.catastrophe.threat;
  const modules = game.catastrophe.modules || null;
  const moduleCards = modules ? [
    ["Причина", modules.cause], ["Масштаб", modules.scale], ["Загроза", modules.threat], ["Ізоляція", modules.isolation]
  ].map(([label, value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value || "—")}</strong></div>`).join("") : "";
  const ruleCard = game.settingRule ? `<div class="setting-rule-card"><small>Правило сетингу</small><strong>${escapeHtml(game.settingRule.name)}</strong><p>${escapeHtml(game.settingRule.description)}</p></div>` : "";
  $("catastropheModules").innerHTML = moduleCards + ruleCard;
  $("catastropheModules").classList.toggle("hidden", !modules && !game.settingRule);
  renderScenarioPriorities(game.scenarioPriorities);
  const complication = game.catastrophe.complication;
  $("catastropheComplication").classList.toggle("hidden", !complication);
  $("catastropheComplication").innerHTML = complication ? `<small>Додаткова обставина</small><strong>${escapeHtml(complication.title)}</strong><p>${escapeHtml(complication.text)}</p>` : "";
  const lore = game.catastrophe.lore || {};
  $("catastropheCause").textContent = lore.cause || "Передумови катастрофи не задокументовані.";
  $("catastropheCollapse").textContent = lore.collapse || game.catastrophe.description;
  $("catastropheSurface").textContent = lore.surface || `Головна загроза поверхні: ${game.catastrophe.threat}.`;
  $("catastropheHorizon").textContent = lore.horizon || "Довгостроковий прогноз залежить від стану сховища та рішень групи.";
  $("shelterTitle").textContent = game.shelter.title;
  $("shelterDescription").textContent = game.shelter.description;
  const roomCount = Number(game.shelter.roomCount || 0);
  const area = Number(game.shelter.areaM2 || 0).toLocaleString("uk-UA");
  $("shelterFacts").innerHTML = `
    <span><small>Площа комплексу</small><strong>${area} м²</strong></span>
    <span><small>Приміщення</small><strong>${roomCount}</strong></span>
    <span><small>Проєктна місткість</small><strong>${game.shelter.residentCapacity || game.shelter.capacity} ос.</strong></span>
    <span><small>Фінальна група</small><strong>${game.shelter.selectionCapacity || game.shelter.capacity} ос.</strong></span>
    <span><small>Позиції провіанту</small><strong>${(game.shelter.provisions || []).length}</strong></span>`;
  $("shelterRooms").innerHTML = (game.shelter.rooms || []).map((roomInfo) => `
    <div class="room-item"><span>${escapeHtml(roomInfo.name)}</span><strong>${Number(roomInfo.count) > 1 ? `×${roomInfo.count}` : "1"}</strong></div>`).join("") || '<p class="muted">План приміщень відсутній.</p>';
  $("shelterProvisions").innerHTML = (game.shelter.provisions || []).map((item) => `
    <div class="provision-item">
      <span><small>${escapeHtml(PROVISION_LABELS[item.category] || item.category)}</small><strong>${escapeHtml(item.name)}</strong>${item.note ? `<em>${escapeHtml(item.note)}</em>` : ""}</span>
      <b>${Number(item.amount).toLocaleString("uk-UA")} ${escapeHtml(item.unit)}</b>
    </div>`).join("") || '<p class="muted">Маніфест провіанту відсутній.</p>';
  $("resources").innerHTML = Object.entries(game.shelter.resources).map(([key, value]) => `
    <div class="resource" ${state.self.isHost ? `title="Точне значення: ${Number(value)}%"` : ""}><small>${RESOURCE_LABELS[key] || key}</small><strong class="${resourceToneClass(value)}">${resourceLevel(value)}</strong>${state.self.isHost ? `<span>${Number(value)}%</span>` : ""}</div>`).join("");
  $("modules").innerHTML = game.shelter.modules.map((module) => `
    <div class="module" title="${escapeHtml(module.description || "")}${state.self.isHost ? ` Точний стан: ${Number(module.condition)}%.` : ""}"><span><strong>${escapeHtml(module.name)}</strong><small>${resourceLevel(module.condition)}${state.self.isHost ? ` · ${Number(module.condition)}%` : ""}</small></span><div class="progress qualitative-progress"><span class="${resourceToneClass(module.condition)}" style="width:${Math.max(10, Math.min(100, Math.round(Number(module.condition) / 20) * 20))}%"></span></div></div>`).join("");
  const assets = [];
  if (game.shelter.allies) assets.push(`Союзники: ${game.shelter.allies}`);
  if (game.shelter.assets.length) assets.push(...game.shelter.assets.map(assetText));
  const social = state.game.social;
  const socialParts = [];
  if (state.game.features?.itemTrade) socialParts.push(`Передачі: ${social.tradeCount}`);
  if (state.game.features?.treatment) socialParts.push(`Допомога: ${social.treatmentCount}`);
  const socialLine = socialParts.length ? ` ${socialParts.join(" · ")}` : "";
  $("assets").textContent = `${assets.length ? `Надбання: ${assets.join(" · ")}` : "Надбань поки немає."}${socialLine}`;
  renderCampaignLegacy(game.campaignLegacy);
}
function revealedData(raw) {
  if (raw && typeof raw === "object" && Object.prototype.hasOwnProperty.call(raw, "value")) return raw;
  return { value: raw, description: "" };
}
function conditionText(status) {
  if (!status) return "";
  const parts = [status.injury ? `Травма ${status.injury}/5` : "Без травм", status.stress ? `Стрес ${status.stress}/5` : "Стабільний"];
  if (state.game?.features?.treatment && status.medical) parts.push(`${status.medical.severityLabel}: ${status.medical.name}`);
  if (status.medicalIsolation) parts.push("Медична ізоляція");
  if (status.protected) parts.push("Захищений");
  if (status.detained) parts.push("В ізоляції");
  if (status.silenced) parts.push("Без участі в рішеннях");
  if (status.sanctionEffects?.length) parts.push(status.sanctionEffects.join("; "));
  return parts.join(" · ");
}
function renderRevealStrategy() {
  const strategy = state.game?.revealStrategy;
  const privateStrategy = state.self.privateCharacter?.revealStrategy;
  const visible = Boolean(strategy?.enabled && privateStrategy);
  $("revealStrategyPanel").classList.toggle("hidden", !visible);
  $("revealRequestPanel").classList.toggle("hidden", !visible);
  if (!visible) return;
  const labels = state.game.characterLabels || {};
  $("revealStrategyTitle").textContent = strategy.title || "Стратегічне розкриття";
  $("revealStrategyReason").textContent = strategy.reason || "";
  $("revealInfluenceBadge").textContent = `Вплив: ${privateStrategy.influence || 0}/3`;
  $("revealFocusChips").innerHTML = (strategy.focusKeys || []).map((key) => `<span class="reveal-focus-chip">Фокус: ${escapeHtml(labels[key] || characterKeyLabel(key))}</span>`).join("");
  const choiceNames = (privateStrategy.choiceKeys || []).map((key) => labels[key] || characterKeyLabel(key));
  const directive = [];
  if (privateStrategy.choiceRequired && choiceNames.length) directive.push(`<div class="reveal-directive-line"><strong>Перше відкриття:</strong> оберіть «${choiceNames.map(escapeHtml).join("» або «")}».</div>`);
  else if (choiceNames.length) directive.push(`<div class="reveal-directive-line"><strong>Персональні варіанти:</strong> ${choiceNames.map(escapeHtml).join(" · ")}</div>`);
  if (privateStrategy.pressure) {
    const label = labels[privateStrategy.pressure.key] || characterKeyLabel(privateStrategy.pressure.key);
    directive.push(`<div class="reveal-directive-line warning"><strong>Під тиском:</strong> «${escapeHtml(label)}» матиме наслідок, якщо лишиться прихованою до кінця ${privateStrategy.pressure.dueRound}-го раунду.</div>`);
  }
  if (privateStrategy.concealmentStrain) directive.push(`<div class="reveal-directive-line warning">Накопичена напруга приховування: ${privateStrategy.concealmentStrain}.</div>`);
  $("revealPersonalDirective").innerHTML = directive.join("");
  $("revealIncomingRequests").innerHTML = (privateStrategy.incomingRequests || []).map((request) => `<div class="reveal-request-line"><strong>${escapeHtml(request.fromName)}</strong> просить відкрити «${escapeHtml(labels[request.key] || characterKeyLabel(request.key))}» у цьому раунді.</div>`).join("");

  $("revealRequestInfluence").textContent = `Ваш вплив: ${privateStrategy.influence || 0}`;
  const requests = strategy.requests || [];
  $("revealRequestHistory").innerHTML = requests.length ? requests.map((request) => `<div class="request-entry ${request.status === "fulfilled" ? "fulfilled" : ""}"><span>${escapeHtml(request.fromName)} → ${escapeHtml(request.targetName)}: <b>${escapeHtml(labels[request.key] || characterKeyLabel(request.key))}</b></span><small>${request.status === "fulfilled" ? "Виконано" : `До раунду ${request.dueRound}`}</small></div>`).join("") : '<span class="muted">Активних запитів ще немає.</span>';
  const controls = $("revealRequestControls");
  controls.classList.toggle("hidden", !strategy.canRequest);
  const status = $("revealRequestStatus");
  status.textContent = strategy.canRequest ? "Оберіть одну ще приховану категорію іншого учасника." : privateStrategy.requestUsedRound === state.game.round ? "Запит цього раунду вже використано." : isTimedClientPhase(state.game.phase) ? "Для запиту потрібен щонайменше 1 вплив." : "Нові запити створюються під час обговорення, переговорів, інтриг або розслідування.";
  if (!strategy.canRequest) return;
  const candidates = state.players.filter((player) => player.active && player.id !== state.self.id);
  $("revealRequestTarget").innerHTML = candidates.map((player) => `<option value="${escapeHtml(player.id)}">${escapeHtml(player.name)}</option>`).join("");
  const updateKeys = () => {
    const target = state.players.find((player) => player.id === $("revealRequestTarget").value);
    const roomKeys = Object.keys(state.self.privateCharacter?.values || {});
    const available = roomKeys.filter((key) => !target?.revealed?.[key]);
    $("revealRequestKey").innerHTML = available.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(labels[key] || characterKeyLabel(key))}</option>`).join("");
    $("revealRequestButton").disabled = !target || !available.length;
  };
  $("revealRequestTarget").onchange = updateKeys;
  updateKeys();
  $("revealRequestButton").onclick = () => sendAction("request_reveal_category", { targetId: $("revealRequestTarget").value, key: $("revealRequestKey").value });
}

function renderPublicPlayers() {
  const totalCharacteristics = Object.keys(state.game?.characterLabels || KEY_LABELS).length;
  $("publicPlayers").innerHTML = state.players.map((player) => {
    const entries = Object.entries(player.revealed || {});
    const rows = entries.map(([key, raw]) => {
      const data = revealedData(raw);
      return `<button type="button" class="revealed-row info-row" data-open-info data-info-label="${escapeHtml(characterKeyLabel(key))}" data-info-value="${escapeHtml(data.value)}" data-info-description="${escapeHtml(data.description || "Для цієї характеристики окремого опису немає.")}"><span>${escapeHtml(characterKeyLabel(key))}</span><strong>${escapeHtml(data.value)}</strong><b aria-hidden="true">ⓘ</b></button>`;
    }).join("");
    const medical = player.status?.medical;
    const healthAlreadyRevealed = entries.some(([key]) => key === "health");
    const medicalRow = medical && (medical.severity > 0 || !healthAlreadyRevealed)
      ? `<div class="revealed-row medical-public"><span>${medical.severity > 0 ? "Медичний стан" : "Здоров’я"}</span><strong>${escapeHtml(medical.severity > 0 ? `${medical.severityLabel} · ${medical.name}` : medical.name)}</strong></div>`
      : "";
    const statusBadge = player.active ? (player.status?.medicalIsolation ? "Медична ізоляція" : player.status?.detained ? "Ізоляція" : player.status?.silenced ? "Без голосу" : player.connected ? "У грі" : "Офлайн") : player.outsideRole?.name || "Поза сховищем";
    const header = `<div class="public-card-heading"><div><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(conditionText(player.status))}</small></div><div class="public-badges"><span class="badge">${entries.length}/${totalCharacteristics}</span>${player.revealCredibility ? `<span class="badge credibility-badge">Відкритість ${player.revealCredibility}</span>` : ""}<span class="badge">${escapeHtml(statusBadge)}</span></div></div>`;
    const body = `<div class="revealed-list legacy-revealed">${rows || '<span class="muted empty-revealed">Ще нічого не відкрито.</span>'}${medicalRow}</div>`;
    const collapsible = !player.active && entries.length >= totalCharacteristics;
    if (collapsible) {
      const open = expandedEliminatedPlayers.has(player.id);
      return `<details class="public-card eliminated eliminated-collapsible" data-eliminated-player="${escapeHtml(player.id)}" ${open ? "open" : ""}>
        <summary>${header}<span class="collapse-hint">${open ? "Згорнути характеристики" : "Показати всі характеристики"}</span></summary>
        ${body}
      </details>`;
    }
    return `<article class="public-card ${player.active ? "" : "eliminated"}"><header>${header}</header>${body}</article>`;
  }).join("");
  document.querySelectorAll("[data-eliminated-player]").forEach((details) => {
    details.addEventListener("toggle", () => {
      const id = details.dataset.eliminatedPlayer;
      if (details.open) expandedEliminatedPlayers.add(id);
      else expandedEliminatedPlayers.delete(id);
      const hint = details.querySelector(".collapse-hint");
      if (hint) hint.textContent = details.open ? "Згорнути характеристики" : "Показати всі характеристики";
    });
  });
  bindInfoButtons($("publicPlayers"));
}

function renderPrivateCharacter() {
  const privateData = state.self.privateCharacter;
  $("privateName").textContent = state.self.name;
  if (!privateData) return;
  const fileNumber = String(state.self.id || state.self.name || "КАНДИДАТ").replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/g, "").slice(-6).toUpperCase() || "КАНДИДАТ";
  $("dossierFileNumber").textContent = `СПРАВА ${fileNumber}`;
  $("privateStatus").textContent = state.self.active ? (privateData.detained ? "В ізоляції" : privateData.silenced ? "Без права голосу" : "Активний") : (privateData.outsideRole?.name || "Поза сховищем");
  const features = state.game.features || {};
  $("roleBox").classList.toggle("hidden", !features.hiddenRoles);
  $("medicalBox").classList.toggle("hidden", !features.treatment);
  $("goalBox").classList.toggle("hidden", !features.personalGoals);
  $("abilityBox").classList.toggle("hidden", features.abilities === false);
  $("interactionBox").classList.toggle("hidden", !features.itemTrade && !features.treatment);
  const remaining = Math.max(0, privateData.revealLimit - privateData.revealsUsedRound);
  const canSelect = state.game.phase === "reveal" && state.self.active && !privateData.detained && remaining > 0;
  $("revealToolbar").classList.toggle("hidden", !canSelect);
  $("revealCounter").textContent = `Використано ${privateData.revealsUsedRound}/${privateData.revealLimit}. Можна вибрати ще ${remaining}.`;
  const revealStrategy = privateData.revealStrategy || {};
  const strategicChoices = new Set(revealStrategy.choiceKeys || []);
  const requestedChoices = new Set((revealStrategy.incomingRequests || []).map((item) => item.key));
  const pressureKey = revealStrategy.pressure?.key || null;
  const dossierGroups = [
    ["Ідентифікація", ["origin", "demographicContext", "age", "attitudeToChildren", "relationship"]],
    ["Компетенції", ["profession", "skill", "hobby", "item"]],
    ["Психологічний профіль", ["trait", "phobia", "secret"]],
    ["Ризики та особливості", ["health", "anomaly"]]
  ];
  const renderDossierEntry = ([key, value]) => {
    const isRevealed = Boolean(privateData.revealed[key]);
    const description = privateData.descriptions?.[key] || "";
    const strategicClass = !isRevealed && strategicChoices.has(key) ? " strategic-choice" : "";
    const requestedClass = !isRevealed && requestedChoices.has(key) ? " requested-choice" : "";
    const pressureClass = !isRevealed && pressureKey === key ? " pressure-choice" : "";
    const strategicBadges = [
      !isRevealed && strategicChoices.has(key) ? "Вибір раунду" : null,
      !isRevealed && requestedChoices.has(key) ? "Запит громади" : null,
      !isRevealed && pressureKey === key ? "Під тиском" : null,
      !isRevealed && (revealStrategy.sensitiveKeys || []).includes(key) && state.game.round <= 2 ? "+1 вплив за раннє відкриття" : null
    ].filter(Boolean);
    return `<article class="char-card ${isRevealed ? "revealed" : ""}${strategicClass}${requestedClass}${pressureClass}">
      <div class="char-card-top">
        ${canSelect && !isRevealed ? `<input class="reveal-select" type="checkbox" data-key="${key}" aria-label="Вибрати ${escapeHtml(characterKeyLabel(key))}" />` : ""}
        <div><p class="eyebrow">${escapeHtml(characterKeyLabel(key))}</p><strong>${escapeHtml(value)}</strong></div>
        <span class="dossier-state" title="${isRevealed ? "Відкрито" : "Засекречено"}" aria-label="${isRevealed ? "Відкрито" : "Засекречено"}">${isRevealed ? "✓" : "⌁"}</span>
      </div>
      ${strategicBadges.length ? `<div class="char-strategy-badges">${strategicBadges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}</div>` : ""}
      <button type="button" class="char-info-button" data-open-info data-info-label="${escapeHtml(characterKeyLabel(key))}" data-info-value="${escapeHtml(value)}" data-info-description="${escapeHtml(description)}" aria-label="Відкрити опис характеристики ${escapeHtml(characterKeyLabel(key))}" title="Докладніше">ⓘ</button>
    </article>`;
  };
  const valueEntries = Object.entries(privateData.values);
  $("privateCharacter").innerHTML = dossierGroups.map(([title, keys]) => {
    const entries = keys.map((key) => valueEntries.find(([entryKey]) => entryKey === key)).filter(Boolean);
    if (!entries.length) return "";
    return `<section class="dossier-group"><header><span>${escapeHtml(title)}</span><b>${entries.filter(([key]) => privateData.revealed[key]).length}/${entries.length}</b></header><div>${entries.map(renderDossierEntry).join("")}</div></section>`;
  }).join("");
  bindInfoButtons($("privateCharacter"));
  document.querySelectorAll(".reveal-select").forEach((checkbox) => checkbox.addEventListener("change", () => {
    const selected = [...document.querySelectorAll(".reveal-select:checked")];
    if (selected.length > remaining) {
      checkbox.checked = false;
      toast(`Можна вибрати не більше ${remaining}.`, true);
    }
  }));
  $("revealSelectedButton").onclick = () => {
    const keys = [...document.querySelectorAll(".reveal-select:checked")].map((node) => node.dataset.key);
    if (!keys.length) return toast("Оберіть характеристики для відкриття.", true);
    sendAction("reveal_many", { keys, strategicChoice: true });
  };

  $("personalGoal").textContent = privateData.goal;
  $("abilityName").textContent = privateData.ability.name;
  $("abilityDescription").textContent = privateData.ability.description;
  renderAbility(privateData);

  $("roleName").textContent = privateData.role.name;
  $("roleFaction").textContent = privateData.role.faction;
  $("roleFaction").className = `badge faction-${privateData.role.faction === "Загроза" ? "threat" : privateData.role.faction === "Одинак" ? "solo" : "community"}`;
  $("roleDescription").textContent = privateData.role.description;
  $("roleObjective").textContent = privateData.role.objective;
  renderRoleAction(privateData);

  const injury = privateData.injury || 0;
  const stress = privateData.stress || 0;
  const medical = privateData.medicalCondition || { severity: 0, severityLabel: "Немає активної хвороби", name: privateData.values.health };
  $("conditionTitle").textContent = medical.severity >= 4 ? "Критичний медичний стан" : medical.severity > 0 ? "Потребує лікування" : injury || stress ? "Потребує відпочинку" : "Стабільний стан";
  $("conditionBadge").textContent = `${medical.severityLabel} · Т ${injury}/5 · С ${stress}/5`;
  $("conditionText").textContent = `Медична характеристика: ${medical.name}. Тяжкість: ${medical.severity}/5. Травма: ${injury}/5. Стрес: ${stress}/5.`;
  $("diseaseMeter").className = `disease-meter severity-${medical.severity}`;
  $("diseaseMeter").querySelector("span").style.width = `${Math.max(4, medical.severity * 20)}%`;
  const medicalFlags = [];
  if (privateData.medicalIsolation) medicalFlags.push("Медична ізоляція діє до завершення поточного раунду.");
  if (medical.observedRound === state.game.round) medicalFlags.push("Стан перебуває під наглядом: ризик погіршення цього раунду знижено.");
  if (Number(medical.observationBonusUntilRound || 0) >= state.game.round) medicalFlags.push("Наступна активна терапія має бонус підготовки +10%.");
  $("diseaseDetails").textContent = `${medical.description || (medical.severity ? "Без лікування стан може погіршуватися наприкінці раунду." : "Активна хвороба не виявлена.")}${medicalFlags.length ? ` ${medicalFlags.join(" ")}` : ""}`;
  $("privateNotes").innerHTML = privateData.privateNotes.length
    ? [...privateData.privateNotes].reverse().map((note) => `<div class="private-note">${escapeHtml(note)}</div>`).join("")
    : '<span class="muted">Особистих записів поки немає.</span>';

  $("inventoryList").innerHTML = privateData.inventory.length
    ? privateData.inventory.map((item) => `<div class="inventory-item"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.source || "Особистий предмет")}${item.medicalUses ? ` · лікування: ${item.medicalUses} вик.` : ""}</small></div><span class="badge">${item.medicalUses ? "Медичний" : item.receivedFrom ? "Отримано" : "Власний"}</span></div>`).join("")
    : '<span class="muted">Інвентар порожній.</span>';
  renderInteractions(privateData);
}

function activePlayerOptions(includeSelf = true) {
  return state.players.filter((player) => player.active && !player.status?.detained && (includeSelf || player.id !== state.self.id))
    .map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join("");
}
function renderAbility(privateData) {
  const container = $("abilityControls");
  if (privateData.abilityUsed) return void (container.innerHTML = '<span class="badge">Використано</span>');
  if (!state.self.active) return void (container.innerHTML = '<span class="badge">Недоступно поза сховищем</span>');
  if (privateData.detained) return void (container.innerHTML = '<span class="badge">Недоступно в ізоляції</span>');
  const ability = privateData.ability;
  if (String(ability.id || "").startsWith("case_")) {
    const needsTarget = ability.target === "player";
    const includeSelf = !["case_cross_check", "case_redirect", "case_plant"].includes(ability.id);
    const targetControl = needsTarget ? `<label><span>Ціль</span><select id="abilityTarget">${activePlayerOptions(includeSelf)}</select></label>` : "";
    const aspectControl = ability.needsAspect ? `<label><span>Аспект досьє</span><select id="abilityAspect"><option value="alibi">Алібі</option><option value="motive">Мотив</option><option value="access">Доступ</option><option value="testimony">Свідчення</option><option value="evidenceLink">Речові докази</option></select></label>` : "";
    const duringDiscussion = state.game.phase === "investigation";
    container.innerHTML = `<div class="persistent-controls case-ability-controls">${targetControl}${aspectControl}<button id="useAbilityButton" class="button primary full" type="button" ${duringDiscussion ? "" : "disabled"}>Використати приховано</button><small>${duringDiscussion ? "Слідча здібність не створює запису в загальному журналі." : "Слідчі здібності доступні під час розслідування."}</small></div>`;
    $("useAbilityButton").onclick = () => sendAction("use_ability", { targetId: $("abilityTarget")?.value, aspect: $("abilityAspect")?.value });
  } else if (ability.target === "none") {
    container.innerHTML = '<button id="useAbilityButton" class="button primary full" type="button">Використати</button>';
    $("useAbilityButton").onclick = () => sendAction("use_ability");
  } else if (ability.target === "player") {
    const includeSelf = ability.id !== "truth";
    container.innerHTML = `<div class="persistent-controls"><select id="abilityTarget">${activePlayerOptions(includeSelf)}</select><button id="useAbilityButton" class="button primary full" type="button">Використати</button></div>`;
    $("useAbilityButton").onclick = () => sendAction("use_ability", { targetId: $("abilityTarget").value });
  } else if (ability.target === "module") {
    const options = state.game.shelter.modules.map((module) => `<option value="${module.id}">${escapeHtml(module.name)} — ${module.condition}%</option>`).join("");
    container.innerHTML = `<div class="persistent-controls"><select id="abilityModule">${options}</select><button id="useAbilityButton" class="button primary full" type="button">Використати</button></div>`;
    $("useAbilityButton").onclick = () => sendAction("use_ability", { moduleId: $("abilityModule").value });
  }
}

function renderRoleAction(privateData) {
  const container = $("roleActionControls");
  const role = privateData.role;
  if (!state.game.social.hiddenRolesEnabled) return void (container.innerHTML = '<span class="badge">Приховані ролі вимкнено</span>');
  if (privateData.roleActionUsed) return void (container.innerHTML = '<span class="badge">Таємну дію використано</span>');
  if (role.id === "survivor") return void (container.innerHTML = '<span class="badge">Активної дії немає</span>');
  if (!state.self.active || privateData.detained || !isRoleClientPhase()) return void (container.innerHTML = `<span class="badge">Доступно під час фази інтриг</span>`);
  if (["saboteur", "engineer"].includes(role.id)) {
    const modules = state.game.shelter.modules.map((module) => `<option value="${module.id}">${escapeHtml(module.name)} — ${module.condition}%</option>`).join("");
    container.innerHTML = `<div class="persistent-controls"><select id="roleModule">${modules}</select><button id="roleActionButton" class="button ${role.id === "saboteur" ? "danger-button" : "secondary"} full" type="button">${role.id === "saboteur" ? "Провести диверсію" : "Посилити модуль"}</button></div>`;
    $("roleActionButton").onclick = () => sendAction("role_action", { moduleId: $("roleModule").value });
  } else if (["medic", "archivist", "mediator", "collector"].includes(role.id)) {
    const includeSelf = role.id !== "collector";
    container.innerHTML = `<div class="persistent-controls"><select id="roleTarget">${activePlayerOptions(includeSelf)}</select><button id="roleActionButton" class="button secondary full" type="button">Використати таємну дію</button></div>`;
    $("roleActionButton").onclick = () => sendAction("role_action", { targetId: $("roleTarget").value });
  } else {
    container.innerHTML = '<button id="roleActionButton" class="button secondary full" type="button">Використати таємну дію</button>';
    $("roleActionButton").onclick = () => sendAction("role_action");
  }
}

function renderInteractions(privateData) {
  const container = $("interactionControls");
  const features = state.game.features || {};
  if (!features.itemTrade && !features.treatment) {
    container.innerHTML = "";
    return;
  }
  const interactionAvailable = state.self.active && !privateData.detained && (isSocialClientPhase(state.game.phase) || state.game.phase === "operations");
  if (!interactionAvailable) {
    container.innerHTML = '<span class="badge">Дії доступні під час соціальної фази або операцій</span>';
    return;
  }
  const blocks = [];
  const others = activePlayerOptions(false);
  const everyone = activePlayerOptions(true);
  const itemOptions = privateData.inventory.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}${item.receivedFrom ? " · отримано" : ""}</option>`).join("");
  const tradeUsed = privateData.tradeUsedRound === state.game.round;
  const careUsed = privateData.careUsedRound === state.game.round;
  if (features.itemTrade) {
    blocks.push(`<section class="mini-action"><div><strong>Передати предмет</strong><small>Передані речі зберігають залишок використань.</small></div>${itemOptions ? `<select id="tradeItem" ${tradeUsed ? "disabled" : ""}>${itemOptions}</select><select id="tradeTarget" ${tradeUsed ? "disabled" : ""}>${others}</select><button id="tradeButton" class="button ghost full" type="button" ${tradeUsed ? "disabled" : ""}>${tradeUsed ? "Передачу використано" : "Передати"}</button>` : '<span class="muted">Немає предметів.</span>'}</section>`);
  }
  if (features.treatment && isOperationClientPhase()) {
    const treatmentOptions = (privateData.treatmentOptions || []).map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}${option.cost ? ` · базово медикаменти −${option.cost}` : " · витратний засіб"}</option>`).join("");
    const approachOptions = (privateData.careApproaches || []).map((approach) => `<option value="${escapeHtml(approach.id)}">${escapeHtml(approach.name)}</option>`).join("");
    const treatmentBlock = treatmentOptions ? `<div class="care-dilemma-grid"><label><span>Тактика допомоги</span><select id="careApproach" ${careUsed ? "disabled" : ""}>${approachOptions}</select></label><label><span>Метод або засіб</span><select id="careMethod" ${careUsed ? "disabled" : ""}>${treatmentOptions}</select></label><label><span>Пацієнт</span><select id="careTarget" ${careUsed ? "disabled" : ""}>${everyone}</select></label></div><div id="careChancePreview" class="action-chance-preview care-plan-preview"></div><button id="careButton" class="button primary full" type="button" ${careUsed ? "disabled" : ""}>${careUsed ? "Медичне рішення використано" : "Підтвердити медичне рішення"}</button>` : '<p class="muted treatment-locked">Потрібна медична професія, навичка або лікувальний предмет.</p>';
    blocks.push(`<section class="mini-action medical-action"><div><strong>Медична дилема</strong><small>Оберіть між швидким ефектом, економією запасів, наглядом, карантином або ризикованим втручанням.</small></div>${treatmentBlock}</section>`);
  }
  container.innerHTML = `<div class="interaction-grid">${blocks.join("")}</div>`;
  if ($("tradeButton") && !tradeUsed) $("tradeButton").onclick = () => sendAction("give_item", { itemId: $("tradeItem").value, targetId: $("tradeTarget").value });
  if ($("careApproach")) $("careApproach").onchange = updateTreatmentPreview;
  if ($("careMethod")) $("careMethod").onchange = updateTreatmentPreview;
  if ($("careTarget")) $("careTarget").onchange = updateTreatmentPreview;
  updateTreatmentPreview();
  if ($("careButton") && !careUsed) $("careButton").onclick = () => sendAction("provide_care", { targetId: $("careTarget").value, method: $("careMethod").value, approach: $("careApproach").value });
}

function operationSupportBoardHtml(operations) {
  const entries = operations.supportContributions || [];
  if (!entries.length) return '<p class="muted">Командні ролі ще не розподілено.</p>';
  const grouped = ["equipment", "communications", "guard", "repair_assist"].map((roleId) => {
    const role = (operations.supportRoles || []).find((item) => item.id === roleId);
    const members = entries.filter((item) => item.roleId === roleId);
    if (!role || !members.length) return "";
    return `<article class="operation-support-group"><div><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.description || "")}</small></div><div class="host-chip-list">${members.map((item) => `<span class="host-action-chip ${item.usedFor ? "used" : ""}">${escapeHtml(item.playerName)}${item.usedFor ? ` · ${item.usedFor === "expedition" ? "експедиція" : item.usedFor === "repair" ? "ремонт" : "пряма участь"}` : ""}</span>`).join("")}</div></article>`;
  }).filter(Boolean).join("");
  return grouped || '<p class="muted">Командні ролі ще не розподілено.</p>';
}
function renderOperations() {
  const container = $("operationsControls");
  const operations = state.game.operations || {};
  const features = state.game.features || {};
  const privateData = state.self.privateCharacter || {};
  const historyHtml = (operations.history || []).length ? `<div class="operation-history reason-history">${operations.history.map((item) => item.reasonReport ? reasonReportHtml(item.reasonReport, true) : `<div>${escapeHtml(item.text)}</div>`).join("")}</div>` : "";
  const cards = [];
  let supportLocked = false;
  if (features.operations) {
    const currentSupport = operations.mySupport || privateData.operationSupport?.current || null;
    supportLocked = Boolean(currentSupport?.usedFor);
    const supportUnavailable = !state.self.active || Boolean(privateData.detained);
    const supportOptions = ['<option value="">Без окремої ролі</option>', ...(operations.supportRoles || []).map((role) => {
      const completed = role.target === "expedition" ? operations.expeditionUsed : operations.repairUsed;
      return `<option value="${escapeHtml(role.id)}" ${currentSupport?.roleId === role.id ? "selected" : ""} ${completed && currentSupport?.roleId !== role.id ? "disabled" : ""}>${escapeHtml(role.name)} · ${role.target === "expedition" ? "експедиція" : "ремонт"}</option>`;
    })].join("");
    cards.push(`<section class="mini-action operation-card operation-support-card"><div><strong>Мій внесок у командну операцію</strong><small>Кожен активний учасник може обрати одну роль. Внесок зараховується, якщо ви не є безпосереднім учасником цієї ж операції.</small></div><select id="operationSupportRole" ${supportLocked || supportUnavailable ? "disabled" : ""}>${supportOptions}</select><button id="operationSupportButton" class="button secondary full" type="button" ${supportLocked || supportUnavailable ? "disabled" : ""}>${supportUnavailable ? "Участь недоступна" : supportLocked ? "Внесок уже використано" : currentSupport ? "Оновити внесок" : "Підтвердити внесок"}</button><div class="operation-support-board">${operationSupportBoardHtml(operations)}</div></section>`);
    if (!state.self.isHost) {
      cards.push(`<section class="mini-action operation-card"><div><strong>Експедиції та ремонт</strong><small>Маршрут і безпосередніх виконавців обирає хост; ваша роль підтримки впливає автоматично.</small></div><div class="operation-status"><span class="badge">Експедиція: ${operations.expeditionUsed ? "проведена" : "доступна"}</span><span class="badge">Ремонт: ${operations.repairUsed ? "проведений" : "доступний"}</span></div></section>`);
    } else {
      const supportSummary = (operations.supportContributions || []).filter((item) => !item.usedFor).reduce((map, item) => { map[item.roleId] = (map[item.roleId] || 0) + 1; return map; }, {});
      const summaryText = `Спорядження: ${supportSummary.equipment || 0} · зв’язок: ${supportSummary.communications || 0} · охорона: ${supportSummary.guard || 0} · ремонтна допомога: ${supportSummary.repair_assist || 0}`;
      const routeCards = (operations.expeditions || []).map((item, index) => `<label class="expedition-route ${operations.expeditionUsed ? "disabled" : ""}"><input type="radio" name="expeditionRoute" value="${escapeHtml(item.id)}" ${index === 0 ? "checked" : ""} ${operations.expeditionUsed ? "disabled" : ""}/><span><span class="route-head"><strong>${escapeHtml(item.name)} ${contentLevelBadgeHtml(item.level)}</strong><b>ризик ${item.difficulty}/6</b></span>${chanceBadgeHtml(item.preview?.label, item.preview?.tone)}<small>${escapeHtml(item.description)}</small></span></label>`).join("");
      const playerChecks = state.players.filter((player) => player.active).map((player) => `<label class="check-player"><input type="checkbox" data-expedition-player value="${player.id}" ${operations.expeditionUsed ? "disabled" : ""}/><span>${escapeHtml(player.name)}${player.operationSupport?.target === "expedition" && !player.operationSupport?.usedFor ? ` <small>(${escapeHtml(player.operationSupport.roleName)})</small>` : ""}</span></label>`).join("");
      const moduleOptions = state.game.shelter.modules.map((module) => `<option value="${module.id}">${escapeHtml(module.name)} — ${module.condition}%</option>`).join("");
      cards.push(`<section class="mini-action operation-card expedition-card"><div><strong>Командна експедиція</strong><small>Оберіть 1–3 польових учасників. Інші внески застосуються автоматично. Учасник польової групи не може одночасно дати зовнішній бонус підтримки.</small></div><div class="operation-support-summary">${escapeHtml(summaryText)}</div><div class="expedition-route-list">${routeCards || '<p class="muted">Маршрутів не знайдено.</p>'}</div><div class="check-player-grid">${playerChecks}</div><button id="launchExpeditionButton" class="button secondary full" type="button" ${operations.expeditionUsed ? "disabled" : ""}>${operations.expeditionUsed ? "Експедицію проведено" : "Відправити командну експедицію"}</button></section>`);
      cards.push(`<section class="mini-action operation-card"><div><strong>Командний плановий ремонт</strong><small>Витрачає 3% енергії. Помічники з роллю ремонтної бригади підвищують шанс, посилюють відновлення та знижують ризик травми.</small></div><select id="repairModule" ${operations.repairUsed ? "disabled" : ""}>${moduleOptions}</select><select id="repairWorker" ${operations.repairUsed ? "disabled" : ""}>${activePlayerOptions(true)}</select><div id="repairChancePreview" class="action-chance-preview"></div><button id="repairModuleButton" class="button ghost full" type="button" ${operations.repairUsed ? "disabled" : ""}>${operations.repairUsed ? "Ремонт проведено" : "Провести командний ремонт"}</button></section>`);
    }
  }
  if (features.treatment) cards.push(`<section class="mini-action operation-card medical-action"><div><strong>Медичний модуль</strong><small>Лікування виконується з картки персонажа у вкладці «Мій персонаж». Кожен кваліфікований учасник має одну спробу за раунд.</small></div><button id="openCharacterForCare" class="button ghost full" type="button">Перейти до лікування</button></section>`);
  container.innerHTML = `<div class="operations-grid">${cards.join("") || '<p class="muted">Для цієї фази не вибрано активних систем.</p>'}</div>${historyHtml}`;
  if ($("operationSupportButton") && !supportLocked && state.self.active && !privateData.detained) $("operationSupportButton").onclick = () => sendAction("set_operation_support", { roleId: $("operationSupportRole").value });
  document.querySelectorAll("[data-expedition-player]").forEach((box) => box.addEventListener("change", () => {
    const selected = [...document.querySelectorAll("[data-expedition-player]:checked")];
    if (selected.length > 3) { box.checked = false; toast("Для експедиції можна обрати не більше трьох гравців.", true); }
  }));
  if ($("launchExpeditionButton") && !operations.expeditionUsed) $("launchExpeditionButton").onclick = () => {
    const playerIds = [...document.querySelectorAll("[data-expedition-player]:checked")].map((node) => node.value);
    const route = document.querySelector('input[name="expeditionRoute"]:checked');
    if (!route) return toast("Оберіть маршрут.", true);
    if (!playerIds.length) return toast("Оберіть хоча б одного учасника.", true);
    sendAction("launch_expedition", { locationId: route.value, playerIds });
  };
  if ($("repairModule")) $("repairModule").onchange = updateRepairPreview;
  if ($("repairWorker")) $("repairWorker").onchange = updateRepairPreview;
  updateRepairPreview();
  if ($("repairModuleButton") && !operations.repairUsed) $("repairModuleButton").onclick = () => sendAction("repair_module", { moduleId: $("repairModule").value, workerId: $("repairWorker").value });
  if ($("openCharacterForCare")) $("openCharacterForCare").onclick = () => selectGameTab("character", { scroll: true });
}
function outsideResourceLabel(key) {
  return ({ food: "Їжа", water: "Вода", medicine: "Медицина", scrap: "Брухт", energy: "Енергія" })[key] || key;
}
function renderOutsidePanel() {
  const data = state.self.privateCharacter;
  const role = data?.outsideRole;
  const camp = state.game.outsideCamp;
  if (!role || !camp) return;
  $("outsideRoleName").textContent = role.name;
  $("outsideRoleDescription").textContent = `${role.description} Роль також дає тематичну перевагу відповідній дії зовнішнього табору.`;
  const used = data.outsideActionUsedRound === state.game.round;
  const pendingDeal = camp.proposal?.status === "pending";
  const actionOptions = (camp.actions || []).map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === "scavenge" ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
  const controls = `<div class="outside-action-builder">
    <label><span>Дія цього раунду</span><select id="outsideCampAction" ${used || camp.collapsed ? "disabled" : ""}>${actionOptions}</select></label>
    <div id="outsideActionFields"></div>
    <div id="outsideActionDescription" class="action-chance-preview"></div>
    <button id="outsideActionButton" class="button secondary full" ${used || camp.collapsed ? "disabled" : ""}>${camp.collapsed ? "Табір зруйновано" : used ? "Дію виконано" : "Виконати дію табору"}</button>
  </div>`;
  $("outsideControls").innerHTML = `<div class="persistent-controls">${controls}</div>`;
  const renderFields = () => {
    const actionId = $("outsideCampAction")?.value || "scavenge";
    const action = (camp.actions || []).find((item) => item.id === actionId);
    const resourceOptions = `<option value="food">Їжа</option><option value="water">Вода</option><option value="medicine">Медицина</option>`;
    let fields = "";
    if (actionId === "scavenge") fields = `<label><span>Що шукати</span><select id="outsideResource"><option value="food">Їжу</option><option value="water">Воду</option><option value="energy">Енергію</option><option value="medicine">Медикаменти</option><option value="scrap">Брухт</option></select></label>`;
    else if (actionId === "support") fields = `<div class="outside-deal-grid"><label><span>Ресурс</span><select id="outsideResource">${resourceOptions}</select></label><label><span>Кількість</span><input id="outsideAmount" type="number" min="1" max="5" value="3"></label></div>`;
    else if (actionId === "negotiate") fields = `<div class="outside-deal-grid"><label><span>Запропонувати</span><select id="outsideOfferResource">${resourceOptions}</select></label><label><span>Кількість</span><input id="outsideOfferAmount" type="number" min="1" max="6" value="2"></label><label><span>Попросити</span><select id="outsideRequestResource"><option value="energy">Енергію</option>${resourceOptions}</select></label><label><span>Кількість</span><input id="outsideRequestAmount" type="number" min="1" max="6" value="2"></label></div><textarea id="outsideMessage" maxlength="180" placeholder="Коротке пояснення угоди"></textarea>${pendingDeal ? '<p class="warning-text">Інша угода вже очікує рішення громади.</p>' : ""}`;
    $("outsideActionFields").innerHTML = fields;
    $("outsideActionDescription").innerHTML = `<strong>${escapeHtml(action?.name || "Дія")}</strong><span>${escapeHtml(action?.description || "")}</span>`;
  };
  if ($("outsideCampAction")) $("outsideCampAction").onchange = renderFields;
  renderFields();
  if ($("outsideActionButton") && !used && !camp.collapsed) $("outsideActionButton").onclick = () => sendAction("outside_action", {
    campAction: $("outsideCampAction")?.value,
    resource: $("outsideResource")?.value,
    amount: Number($("outsideAmount")?.value || 0),
    offerResource: $("outsideOfferResource")?.value,
    offerAmount: Number($("outsideOfferAmount")?.value || 0),
    requestResource: $("outsideRequestResource")?.value,
    requestAmount: Number($("outsideRequestAmount")?.value || 0),
    message: $("outsideMessage")?.value
  });
  const appeal = data.appeal;
  if (data.appealUsed) {
    const label = appeal?.status === "pending" ? "Апеляцію подано — очікуйте голосування" : appeal?.status === "accepted" ? "Апеляцію прийнято" : "Право на апеляцію використано";
    $("appealControls").innerHTML = `<span class="badge">${escapeHtml(label)}</span>`;
  } else {
    $("appealControls").innerHTML = `<label><span>Одноразова апеляція</span><textarea id="appealText" maxlength="220" placeholder="Чому громада має дозволити вам повернутися?"></textarea></label><button id="appealButton" class="button ghost full">Подати апеляцію</button>`;
    $("appealButton").onclick = () => sendAction("submit_appeal", { text: $("appealText").value });
  }
}
function renderOutsideCampBoard() {
  const panel = $("outsideCampBoard");
  const camp = state.game?.outsideCamp;
  panel.classList.toggle("hidden", !camp?.active && !(camp?.history || []).length);
  if (!camp) return;
  $("outsideCampStatus").textContent = camp.collapsed ? "Зруйновано" : camp.allied ? "Союзник" : camp.active ? `${camp.members.length} мешк.` : "Порожній";
  const stats = [
    ["Їжа", camp.resources.food], ["Вода", camp.resources.water], ["Енергія", camp.resources.energy], ["Медицина", camp.resources.medicine], ["Брухт", camp.resources.scrap],
    ["Укриття", camp.shelter], ["Мораль", camp.morale], ["Дослідження", camp.exploration], ["Загроза", camp.threat]
  ];
  const members = (camp.members || []).map((item) => `<span class="host-action-chip ${item.actionUsed ? "used" : ""}">${escapeHtml(item.name)} · ${escapeHtml(item.role)}</span>`).join("") || '<span class="muted">У таборі нікого немає.</span>';
  const discoveries = (camp.discoveries || []).map((item) => `<article class="outside-discovery"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></article>`).join("") || '<p class="muted">Постійних відкриттів ще немає.</p>';
  $("outsideCampSummary").innerHTML = `<div class="outside-camp-stats">${stats.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${Number(value || 0)}</b></div>`).join("")}</div><div class="outside-trust-line"><span>Довіра сховища</span><b>${Number(camp.trust || 0) >= 0 ? "+" : ""}${Number(camp.trust || 0)}</b></div><div class="host-chip-list">${members}</div><details class="outside-discoveries"><summary>Відкриття поверхні (${(camp.discoveries || []).length})</summary>${discoveries}</details>`;
  const proposal = camp.proposal;
  if (proposal) {
    const pending = proposal.status === "pending";
    $("outsideDealBox").innerHTML = `<article class="outside-deal ${escapeHtml(proposal.status)}"><div><strong>Угода від ${escapeHtml(proposal.playerName)}</strong><span class="badge">${pending ? "Очікує рішення" : proposal.status === "accepted" ? "Схвалено" : "Відхилено"}</span></div><p>Табір передає: <b>${escapeHtml(outsideResourceLabel(proposal.offerResource))} +${proposal.offerAmount}</b>. Просить: <b>${escapeHtml(outsideResourceLabel(proposal.requestResource))} ${proposal.requestAmount}</b>.</p>${proposal.message ? `<small>«${escapeHtml(proposal.message)}»</small>` : ""}<div class="outside-vote-counts"><span>За: ${proposal.yes}</span><span>Проти: ${proposal.no}</span><span>Потрібно: ${proposal.required}</span></div>${pending && proposal.canVote ? `<div class="outside-deal-actions"><button id="outsideDealAccept" class="button primary ${proposal.myVote === "accept" ? "selected" : ""}">Схвалити</button><button id="outsideDealReject" class="button ghost ${proposal.myVote === "reject" ? "selected" : ""}">Відхилити</button></div>` : proposal.result ? `<p class="result-box">${escapeHtml(proposal.result)}</p>` : ""}</article>`;
    if ($("outsideDealAccept")) $("outsideDealAccept").onclick = () => sendAction("outside_deal_vote", { choice: "accept" });
    if ($("outsideDealReject")) $("outsideDealReject").onclick = () => sendAction("outside_deal_vote", { choice: "reject" });
  } else $("outsideDealBox").innerHTML = '<div class="empty-card">Зовнішній табір ще не запропонував угоди.</div>';
  $("outsideCampHistory").innerHTML = (camp.history || []).length ? [...camp.history].reverse().slice(0, 8).map((item) => `<div><span>Р${item.round}</span><p>${escapeHtml(item.text)}</p></div>`).join("") : "";
}

function renderActionPanel() {
  const game = state.game;
  ["operationsPanel", "eventPanel", "votePanel", "outsidePanel", "waitingPanel"].forEach((id) => $(id).classList.add("hidden"));
  $("waitingPanel").classList.remove("compact-empty-phase");
  if (game.phase === "operations") {
    $("operationsPanel").classList.remove("hidden");
    renderOperations();
  } else if (isSocialClientPhase(game.phase)) {
    if (!state.self.active && game.features?.outsidePlay && state.self.privateCharacter?.outsideRole && ["discussion", "planning", "negotiation", "intrigue"].includes(game.phase)) {
      $("outsidePanel").classList.remove("hidden");
      renderOutsidePanel();
    } else {
      $("waitingPanel").classList.remove("hidden");
      $("waitingTitle").textContent = PHASES[game.phase]?.[0] || "Соціальна фаза";
      const descriptions = {
        planning: "Визначте пріоритети й підготуйте команду до операцій.",
        negotiation: "Домовляйтеся, обмінюйтеся предметами й формуйте союзи.",
        intrigue: "Приховані рольові дії доступні з картки персонажа.",
        investigation: "Перейдіть до вкладки розслідування для приватної перевірки.",
        discussion: "Обговоріть відкриті характеристики й підготуйтеся до кризи."
      };
      $("waitingText").textContent = descriptions[game.phase] || PHASES[game.phase]?.[1] || "Обговоріть ситуацію.";
    }
  } else if (game.phase === "event" && game.event) {
    $("eventPanel").classList.remove("hidden");
    $("eventTitle").innerHTML = `${escapeHtml(game.event.title)} ${contentLevelBadgeHtml(game.event.level)}`;
    $("eventDescription").textContent = game.event.description;
    $("eventChoices").innerHTML = `<button id="openRoundEventButton" class="button primary full event-open-button" type="button">${game.event.resolved ? "Переглянути наслідок події" : game.event.canVote ? (game.event.decisionPolicy === "host" ? "Відкрити подію та обрати рішення" : "Відкрити подію та проголосувати") : "Відкрити подію для обговорення"}</button>`;
    $("openRoundEventButton").onclick = openRoundEventModal;
    const showCompactEventResult = Boolean(game.event.resolved && !game.event.reasonReport);
    $("eventResult").classList.toggle("hidden", !showCompactEventResult);
    $("eventResult").textContent = showCompactEventResult ? (game.event.resultText || "") : "";
    renderRoundEventModal(game);
  } else if (game.phase === "reveal") {
    const privateData = state.self.privateCharacter || {};
    const remaining = Math.max(0, Number(privateData.revealLimit || 0) - Number(privateData.revealsUsedRound || 0));
    if (remaining > 0) {
      $("waitingPanel").classList.remove("hidden");
      $("waitingPanel").classList.remove("compact-empty-phase");
      $("waitingTitle").textContent = "Розкриття";
      $("waitingText").textContent = `Залишилося відкрити: ${remaining}.`;
    } else {
      $("waitingPanel").classList.remove("hidden");
      $("waitingPanel").classList.add("compact-empty-phase");
      $("waitingTitle").textContent = "Очікування наступної фази";
      $("waitingText").textContent = "Ваші характеристики відкрито.";
    }
  } else if (game.phase === "elimination") {
    $("votePanel").classList.remove("hidden");
    const judgement = game.judgement || { system: "exile", visibility: "secret", appeals: [] };
    const ownVote = game.eliminationVote || null;
    const cannotVote = !state.self.active || state.self.privateCharacter?.detained || state.self.privateCharacter?.silenced;
    const detectiveVote = state.settings.setting === "detective";
    $("votePanelTitle").textContent = detectiveVote ? "Формальне звинувачення" : judgement.system === "tribunal" ? "Трибунал громади" : "Голосування за вигнання";
    const runoff = judgement.runoff?.active ? judgement.runoff : null;
    $("votePanelHelp").textContent = runoff
      ? "Перший підрахунок завершився нічиєю. Повторно голосувати можна лише за варіанти-лідери; якщо нічия повториться, санкцію буде скасовано."
      : detectiveVote
        ? "Оберіть підозрюваного, проти якого група має найпереконливіший ланцюг доказів. Помилкове звинувачення залишить справжнього винуватця в групі."
        : judgement.visibility === "open" ? "Голоси публікуються одразу." : "До підрахунку видно лише кількість поданих голосів.";
    $("voteRunoffBanner").classList.toggle("hidden", !runoff);
    $("voteRunoffBanner").textContent = runoff ? `Повторне голосування · ${runoff.options.length} варіанти-лідери` : "";
    $("voteSanctionWrap").classList.toggle("hidden", Boolean(runoff) || judgement.system !== "tribunal");
    if (ownVote?.sanction) $("voteSanction").value = ownVote.sanction;
    const allowSoloSelfVote = state.settings?.soloTestMode === true && state.players.filter((item) => item.active).length === 1;
    if (runoff) {
      $("eliminationChoices").innerHTML = runoff.options.map((option, index) => {
        const selected = pendingJudgementChoice ? pendingJudgementChoice.targetId === option.targetId && pendingJudgementChoice.sanction === option.sanction : ownVote?.targetId === option.targetId && (option.targetId === "__skip__" || ownVote?.sanction === option.sanction);
        const selfTarget = option.targetId === state.self.id;
        const player = state.players.find((item) => item.id === option.targetId);
        const selfBlocked = selfTarget && !allowSoloSelfVote;
        return `<button class="choice council-candidate runoff-choice ${selected ? "selected" : ""}" data-runoff-target="${escapeHtml(option.targetId)}" data-runoff-sanction="${escapeHtml(option.sanction)}" ${cannotVote || selfBlocked ? "disabled" : ""}><span class="council-candidate-number">${String(index + 1).padStart(2, "0")}</span><div class="council-candidate-main"><strong>${escapeHtml(option.label)}</strong><small>${selfBlocked ? "Не можна голосувати за себе" : selfTarget ? "DEV-соло: дозволене самоголосування" : `Перший підрахунок: ${Number(option.count || 0)} голосів`}</small><div class="council-facts">${player ? publicRevealPreview(player) : ""}</div></div><span class="council-selection-mark">${selected ? "✓" : ""}</span></button>`;
      }).join("");
      document.querySelectorAll("[data-runoff-target]").forEach((button) => button.onclick = () => setPendingJudgementChoice(button.dataset.runoffTarget, button.dataset.runoffSanction, button));
    } else {
      const candidates = state.players.filter((player) => player.active && (allowSoloSelfVote || player.id !== state.self.id));
      const currentSanction = $("voteSanction").value;
      const skipSelected = pendingJudgementChoice ? pendingJudgementChoice.targetId === "__skip__" : ownVote?.targetId === "__skip__";
      const skip = `<button class="choice council-candidate skip-choice ${skipSelected ? "selected" : ""}" data-target="__skip__" ${cannotVote ? "disabled" : ""}><span class="council-candidate-number">00</span><div class="council-candidate-main"><strong>Без санкцій</strong><small>Залишити склад групи без змін цього раунду.</small><div class="council-facts"><span class="council-empty">Рішення без цілі</span></div></div><span class="council-selection-mark">${skipSelected ? "✓" : ""}</span></button>`;
      $("eliminationChoices").innerHTML = skip + candidates.map((player, index) => {
        const selected = pendingJudgementChoice ? pendingJudgementChoice.targetId === player.id : ownVote?.targetId === player.id;
        return `<button class="choice council-candidate ${selected ? "selected" : ""}" data-target="${escapeHtml(player.id)}" ${cannotVote ? "disabled" : ""}><span class="council-candidate-number">${String(index + 1).padStart(2, "0")}</span><div class="council-candidate-main"><div class="council-candidate-title"><strong>${escapeHtml(player.name)}</strong><span>${escapeHtml(conditionText(player.status))}</span></div>${player.id === state.self.id && allowSoloSelfVote ? '<small class="solo-self-vote-note">DEV-соло: можна проголосувати за себе</small>' : ''}<div class="council-facts">${publicRevealPreview(player)}</div></div><span class="council-selection-mark">${selected ? "✓" : ""}</span></button>`;
      }).join("");
      document.querySelectorAll("[data-target]").forEach((button) => button.onclick = () => setPendingJudgementChoice(button.dataset.target, button.dataset.target === "__skip__" ? "none" : $("voteSanction").value, button));
      $("voteSanction").onchange = () => {
        pendingJudgementChoice = null;
        document.querySelectorAll("[data-target]").forEach((item) => item.classList.remove("selected"));
        $("voteConfirmButton").disabled = true;
        $("voteConfirmSummary").textContent = "Оберіть кандидата або варіант без санкцій";
      };
    }
    const voteConfirm = $("voteConfirmButton");
    const voteConfirmSummary = $("voteConfirmSummary");
    if (voteConfirm) {
      voteConfirm.classList.toggle("hidden", cannotVote);
      voteConfirm.disabled = !pendingJudgementChoice;
      voteConfirm.onclick = () => {
        if (!pendingJudgementChoice) return;
        sendAction("elimination_vote", pendingJudgementChoice);
        pendingJudgementChoice = null;
      };
    }
    if (voteConfirmSummary && !pendingJudgementChoice) {
      voteConfirmSummary.textContent = ownVote ? "Ваш попередній голос зафіксовано. Можна обрати інший варіант." : "Оберіть кандидата або варіант без санкцій";
    }
    const ledger = judgement.publicVotes || [];
    $("publicVoteLedger").classList.toggle("hidden", judgement.visibility !== "open");
    $("publicVoteLedger").innerHTML = ledger.length ? ledger.map((vote) => `<div><strong>${escapeHtml(vote.voterName)}</strong><span>${escapeHtml(vote.sanction)} → ${escapeHtml(vote.targetName)}</span></div>`).join("") : '<span class="muted">Відкритих голосів ще немає.</span>';
    const appeals = judgement.appeals || [];
    $("appealReturnBox").classList.toggle("hidden", !appeals.length);
    if (appeals.length) {
      const returnVote = game.returnVote || "__skip__";
      $("appealChoices").innerHTML = `<button class="choice skip-choice ${returnVote === "__skip__" ? "selected" : ""}" data-return-target="__skip__" ${cannotVote ? "disabled" : ""}>Не повертати нікого</button>` + appeals.map((appeal) => `<button class="choice ${returnVote === appeal.playerId ? "selected" : ""}" data-return-target="${appeal.playerId}" ${cannotVote ? "disabled" : ""}><strong>Повернути ${escapeHtml(appeal.name)}</strong><small>${escapeHtml(appeal.text)}</small></button>`).join("");
      document.querySelectorAll("[data-return-target]").forEach((button) => button.onclick = () => sendAction("return_vote", { targetId: button.dataset.returnTarget }));
    }
  } else {
    pendingJudgementChoice = null;
    $("waitingPanel").classList.remove("hidden");
    $("waitingTitle").textContent = PHASES[game.phase][0];
    $("waitingText").textContent = PHASES[game.phase][1];
  }
}


function publicRevealPreview(player, limit = 3) {
  const entries = Object.entries(player?.revealed || {}).slice(0, limit);
  if (!entries.length) return '<span class="council-empty">Відкритих даних ще немає</span>';
  return entries.map(([key, raw]) => {
    const data = revealedData(raw);
    return `<span class="council-fact"><small>${escapeHtml(characterKeyLabel(key))}</small><b>${escapeHtml(data.value)}</b></span>`;
  }).join("");
}
function setPendingJudgementChoice(targetId, sanction, button) {
  pendingJudgementChoice = { targetId, sanction };
  document.querySelectorAll("[data-target], [data-runoff-target]").forEach((item) => item.classList.toggle("selected", item === button));
  const confirm = $("voteConfirmButton");
  const summary = $("voteConfirmSummary");
  if (confirm) confirm.disabled = false;
  if (summary) {
    const player = state.players.find((item) => item.id === targetId);
    const sanctionLabels = { exile: "Вигнання", detention: "Ізоляція", silence: "Позбавлення голосу" };
    summary.textContent = targetId === "__skip__" ? "Обрано: без санкцій" : `Обрано: ${player?.name || "кандидат"} · ${sanctionLabels[sanction] || sanction}`;
  }
}

function renderDetectivePanel() {
  const panel = $("detectivePanel");
  const mystery = state.game?.mystery;
  panel.classList.toggle("hidden", !mystery);
  if (!mystery) return;
  const brief = mystery.caseBrief || {};
  $("detectiveCaseBrief").innerHTML = `<p class="eyebrow">${escapeHtml(brief.title || "Центральна справа")}</p>
    <strong>${escapeHtml(brief.incident || "У комплексі стався злочин, який потрібно розслідувати.")}</strong>
    <div class="detective-case-facts">
      <span><small>Об’єкт справи</small><b>${escapeHtml(brief.target || "безпека комплексу")}</b></span>
      <span><small>Постраждалий / постраждала</small><b>${escapeHtml(brief.victim || "громада")}</b></span>
      <span><small>Місце</small><b>${escapeHtml(brief.location || "закрита зона")}</b></span>
      <span><small>Часовий проміжок</small><b>${escapeHtml(brief.timeWindow || "невідомо")}</b></span>
    </div>
    <p class="detective-proof-rule">Для доведення справи потрібно: правильне фінальне звинувачення + щонайменше <b>${Number(mystery.requiredEvidence || 2)}</b> незалежні ланки доказів.</p>`;
  const caseRole = state.self.privateCharacter?.caseRole;
  $("detectivePrivateRole").innerHTML = caseRole ? `<div class="detective-role-heading"><span class="badge ${caseRole.faction === "Злочин" ? "faction-threat" : "faction-community"}">${escapeHtml(caseRole.faction)}</span><strong>${escapeHtml(caseRole.name)}</strong></div><p>${escapeHtml(caseRole.description)}</p><small><b>Мета:</b> ${escapeHtml(caseRole.objective)}</small>` : "";
  const clues = mystery.evidence || [];
  $("detectiveClues").innerHTML = clues.length
    ? [...clues].reverse().map((item, index) => `<article class="detective-clue ${item.disputed ? "disputed" : ""}"><span>${String(clues.length - index).padStart(2, "0")}</span><div><small>Раунд ${item.round} · ${escapeHtml(item.label || "Доказ")} · ${item.disputed ? "оскаржено" : `надійність ${Number(item.reliability || 1)}/3`}</small><p>${escapeHtml(item.text)}</p></div></article>`).join("")
    : '<div class="empty-card">Перших доказів ще немає.</div>';
  const theory = [...(mystery.publicTheory || [])].sort((a, b) => b.value - a.value);
  $("detectiveSuspicion").innerHTML = theory.map((item) => {
    const normalized = Math.max(0, Math.min(100, (Number(item.value || 0) + 5) * (100 / 15)));
    const label = item.value >= 5 ? "Сильна публічна версія" : item.value >= 2 ? "Помітна версія" : item.value <= -2 ? "Версію послаблено" : "Немає спільної думки";
    return `<div class="suspicion-row"><div><strong>${escapeHtml(item.name)}</strong><span>${label}</span></div><div class="suspicion-track"><i style="width:${normalized}%"></i></div></div>`;
  }).join("");
  const claims = mystery.publicClaims || [];
  $("detectivePublicClaims").innerHTML = claims.length ? `<p class="eyebrow">Анонімні заяви</p>${[...claims].reverse().map((item) => `<article class="detective-claim ${escapeHtml(item.tone || "ambiguous")}"><small>Раунд ${item.round} · ${escapeHtml(item.aspectLabel || "версія")}</small><p>${escapeHtml(item.text)}</p></article>`).join("")}` : '<p class="muted">Анонімних заяв поки немає. Вони можуть бути як правдивими, так і навмисно хибними.</p>';
  const previousTarget = $("detectiveTarget")?.value || "";
  const previousAspect = $("detectiveAspect")?.value || "alibi";
  const candidates = state.players.filter((item) => item.active && item.id !== state.self.id);
  $("detectiveTarget").innerHTML = candidates.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  if (candidates.some((item) => item.id === previousTarget)) $("detectiveTarget").value = previousTarget;
  $("detectiveAspect").value = previousAspect;
  const canInvestigate = Boolean(mystery.canInvestigate);
  $("detectiveInvestigateButton").disabled = !canInvestigate || !candidates.length;
  $("detectiveInvestigationStatus").textContent = canInvestigate
    ? "Можна провести одну приватну перевірку цього раунду. Ні вашого імені, ні цілі перевірки в загальному журналі не буде."
    : state.game.phase !== "investigation" ? "Перевірки доступні під час розслідування." : "Звичайну перевірку цього раунду вже використано або персонаж не може діяти.";
  $("detectiveInvestigateButton").onclick = () => sendAction("investigate_case", { targetId: $("detectiveTarget").value, aspect: $("detectiveAspect").value });
  const notebook = state.self.privateCharacter?.caseNotebook;
  const findings = notebook?.findings || [];
  const privateTheory = [...(notebook?.privateSuspicion || [])].filter((item) => item.playerId !== state.self.id && item.value !== 0).sort((a, b) => b.value - a.value);
  $("detectiveNotebook").innerHTML = `<details ${findings.length ? "open" : ""}><summary>Приватний блокнот (${findings.length})</summary>
    ${privateTheory.length ? `<div class="private-theory">${privateTheory.map((item) => `<span><b>${escapeHtml(item.name)}</b><em>${item.value > 0 ? `підозра +${item.value}` : `послаблення ${item.value}`}</em></span>`).join("")}</div>` : ""}
    ${findings.length ? [...findings].reverse().map((finding) => `<article class="notebook-finding ${escapeHtml(finding.resultType)}"><small>Раунд ${finding.round} · ${escapeHtml(finding.targetName)} · ${escapeHtml(finding.aspectLabel)}</small><p>${escapeHtml(finding.result)}</p>${finding.published ? '<span class="badge">Оприлюднено анонімно</span>' : ""}</article>`).join("") : '<p class="muted">Приватних висновків ще немає.</p>'}
  </details>`;
  const accusationCandidates = state.players.filter((item) => item.id !== state.self.id);
  const previousAccused = mystery.accusationVote || $("detectiveAccusationTarget")?.value || "";
  $("detectiveAccusationTarget").innerHTML = accusationCandidates.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  if (accusationCandidates.some((item) => item.id === previousAccused)) $("detectiveAccusationTarget").value = previousAccused;
  $("detectiveAccusationButton").disabled = !state.self.active || state.game.phase === "final";
  $("detectiveAccusationButton").onclick = () => sendAction("case_accusation", { targetId: $("detectiveAccusationTarget").value });
  $("detectiveAccusationStatus").textContent = mystery.accusationVote
    ? `Вашу версію зафіксовано. Загалом проголосували: ${mystery.accusationVoteCount}. Імена залишаються прихованими до фіналу.`
    : `Оберіть головного підозрюваного. Правильного імені недостатньо без ${Number(mystery.requiredEvidence || 2)} незалежних ланок доказів. Проголосували: ${mystery.accusationVoteCount}.`;
}

function judgementStageHtml(report) {
  if (!report) return "";
  const totals = report.totals || [];
  const participation = report.participation || {};
  const outcome = report.outcome || {};
  const totalsHtml = totals.length ? totals.map((item) => `<article class="judgement-total ${item.key === "skip" ? "skip" : ""}"><div><strong>${escapeHtml(item.label)}</strong><span>${Number(item.count || 0)} голосів</span></div><small>Базові: ${Number(item.baseVotes || 0)}${item.bonusVotes ? ` · додаткова вага: +${Number(item.bonusVotes)}` : ""}${item.forcedVotes ? ` · прихований вплив: +${Number(item.forcedVotes)}` : ""}</small></article>`).join("") : '<div class="empty-card">Дійсних варіантів не було.</div>';
  const ignoredHtml = (report.ignored || []).length ? `<div class="judgement-reasons"><strong>Не враховано</strong>${report.ignored.map((item) => `<span>${escapeHtml(item.reason)} — ${Number(item.count || 0)}</span>`).join("")}</div>` : "";
  const modifiersHtml = (report.modifiers || []).length ? `<div class="judgement-reasons"><strong>Модифікатори</strong>${report.modifiers.map((item) => `<span>${escapeHtml(item.label)}: ${escapeHtml(item.detail)}</span>`).join("")}</div>` : "";
  const individualHtml = report.visibility === "open" && (report.individualVotes || []).length ? `<details class="judgement-individual"><summary>Поіменні голоси (${report.individualVotes.length})</summary>${report.individualVotes.map((item) => `<div class="${escapeHtml(item.status || "counted")}"><strong>${escapeHtml(item.voterName)}</strong><span>${escapeHtml(item.label)}${item.weight > 1 ? ` · вага ${Number(item.weight)}` : ""}${item.reason ? ` · ${escapeHtml(item.reason)}` : ""}</span></div>`).join("")}</details>` : "";
  return `<section class="judgement-stage"><div class="judgement-stage-heading"><div><small>Раунд ${Number(report.round || 0)} · підрахунок ${Number(report.attempt || 1)}</small><h4>${escapeHtml(report.title || "Рішення громади")}</h4></div><span class="badge ${report.status === "runoff" ? "host-warning" : "host-safe"}">${escapeHtml(outcome.label || "Підраховано")}</span></div><p class="judgement-outcome">${escapeHtml(outcome.detail || "")}</p><div class="judgement-participation"><span>Мали право голосу: <b>${Number(participation.eligible || 0)}</b></span><span>Подали: <b>${Number(participation.submitted || 0)}</b></span><span>Не подали: <b>${Number(participation.missing || 0)}</b></span></div><div class="judgement-totals">${totalsHtml}</div>${modifiersHtml}${ignoredHtml}${individualHtml}</section>`;
}
function renderJudgementProtocol() {
  const panel = $("judgementProtocolPanel");
  const report = state?.game?.judgement?.report;
  panel.classList.toggle("hidden", !report);
  if (!report) return;
  $("judgementProtocolStatus").textContent = report.status === "runoff" ? "Потрібне переголосування" : "Підраховано";
  $("judgementProtocolStatus").className = `badge ${report.status === "runoff" ? "host-warning" : "host-safe"}`;
  const stages = report.previousAttempt ? [report.previousAttempt, report] : [report];
  $("judgementProtocolBody").innerHTML = stages.map(judgementStageHtml).join("");
}

function renderHostControls() {
  const game = state.game;
  const isHost = state.self.isHost;
  $("hostNextButton").classList.toggle("hidden", !isHost || game.phase === "final");
  $("hostResolveButton").classList.add("hidden");
  if (isHost && game.phase === "event" && game.event && !game.event.resolved) {
    $("hostResolveButton").classList.remove("hidden");
    $("hostResolveButton").textContent = `Підрахувати голоси (${game.event.voteCount})`;
    $("hostResolveButton").onclick = () => sendAction("resolve_event");
    $("hostNextButton").disabled = true;
  } else {
    $("hostNextButton").disabled = false;
  }
  const loop = game.phaseLoop || game.features?.phaseLoop || [];
  const currentIndex = loop.findIndex((item) => item.code === game.phase);
  const nextInfo = currentIndex >= 0 ? loop[currentIndex + 1] : null;
  const labels = {
    reveal: nextInfo ? `До фази «${nextInfo.label}»` : "Далі",
    discussion: nextInfo ? `До фази «${nextInfo.label}»` : "Далі",
    planning: nextInfo ? `До фази «${nextInfo.label}»` : "Далі",
    negotiation: nextInfo ? `До фази «${nextInfo.label}»` : "Далі",
    intrigue: nextInfo ? `До фази «${nextInfo.label}»` : "Далі",
    investigation: nextInfo ? `До фази «${nextInfo.label}»` : "Далі",
    operations: nextInfo ? `До фази «${nextInfo.label}»` : "Далі",
    event: nextInfo ? `До фази «${nextInfo.label}»` : (game.features?.elimination ? "До рішення громади" : "До наслідків"),
    elimination: `${game.judgement?.runoff?.active ? "Підрахувати переголосування" : "Підрахувати рішення"} (${game.eliminationVoteCount}${game.returnVoteCount ? ` + ${game.returnVoteCount} апел.` : ""})`,
    round_end: "Завершити раунд"
  };
  $("hostNextButton").textContent = labels[game.phase] || "Наступна фаза";
  const dashboard = game.hostDashboard;
  $("hostNextButton").classList.toggle("host-advance-warning", Boolean(isHost && dashboard && !dashboard.canAdvance && game.phase !== "event"));
  $("hostNextButton").onclick = () => { if (confirmHostAdvance()) sendAction("next_phase"); };
}
function renderVictoryRules() {
  const rules = state.game?.victoryRules;
  if (!rules) return;
  $("victoryModeBadge").textContent = rules.modeName || state.game.features?.modeName || "Режим";
  renderVictoryRuleCards("victoryRulesCards", rules);
  $("victoryEndCondition").textContent = `Партія завершується: ${rules.end?.objective || "за правилами режиму"}`;
}
function renderFinalVictorySummary() {
  const summary = state.game?.victorySummary;
  const target = $("finalVictorySummary");
  if (!target) return;
  if (!summary) {
    target.innerHTML = '<div class="empty-card">Підсумок перемоги не сформовано.</div>';
    return;
  }
  const resultCard = (item, kind, fallbackTitle) => {
    if (!item) return "";
    const stateClass = item.completed === null ? "neutral" : item.completed ? "complete" : "failed";
    const status = item.status || (item.completed ? "Успіх" : item.completed === null ? "Не застосовується" : "Не виконано");
    return `<article class="final-victory-card ${escapeHtml(kind)} ${stateClass}"><small>${kind === "group" ? "01 · Група" : kind === "personal" ? "02 · Ваш персонаж" : "03 · Спеціальна умова"}</small><h4>${escapeHtml(item.title || fallbackTitle)}</h4><span class="badge">${escapeHtml(status)}</span><p>${escapeHtml(item.objective || "")}</p>${item.reason ? `<em>${escapeHtml(item.reason)}</em>` : ""}</article>`;
  };
  target.innerHTML = resultCard(summary.group, "group", "Груповий результат") + resultCard(summary.personal, "personal", "Особистий результат") + resultCard(summary.special, "special", "Спеціальна умова");
}
function renderTutorialGuide() {
  const tutorial = state.game?.tutorial;
  const panel = $("tutorialGuidePanel");
  if (!panel) return;
  panel.classList.toggle("hidden", !tutorial?.enabled);
  if (!tutorial?.enabled) return;
  $("tutorialGuideTitle").textContent = tutorial.title || "Навчальний крок";
  $("tutorialGuideStep").textContent = `${tutorial.step}/${tutorial.totalSteps}`;
  $("tutorialGuideProgress").style.width = `${Math.max(0, Math.min(100, Number(tutorial.progressPercent || 0)))}%`;
  $("tutorialGuideText").textContent = tutorial.text || "";
  $("tutorialGuideChecklist").innerHTML = (tutorial.checklist || []).map((item) => `<div class="tutorial-check ${escapeHtml(item.status || "waiting")}"><span>${item.status === "done" ? "✓" : item.status === "pending" ? "!" : "•"}</span><p>${escapeHtml(item.label)}</p></div>`).join("");
  const hostNote = $("tutorialGuideHostNote");
  hostNote.classList.toggle("hidden", !tutorial.hostNote);
  hostNote.textContent = tutorial.hostNote || "";
  const button = $("tutorialGuidePrimary");
  button.textContent = tutorial.button || "Перейти до кроку";
  button.disabled = tutorial.completed;
  button.onclick = () => selectGameTab(tutorial.targetTab || "turn", { scroll: true });
  panel.classList.toggle("required", Boolean(tutorial.required));
}

function renderGame() {
  showScreen("gameScreen");
  const game = state.game;
  renderGenerationPanel("game");
  renderShelter(game);
  const [phaseLabel, phaseHelp] = PHASES[game.phase] || [game.phaseInfo?.label || "Фаза", game.phaseInfo?.purpose || ""];
  $("phaseTitle").textContent = `Раунд ${game.round}/${game.maxRounds} · ${phaseLabel}`;
  $("phaseHelp").textContent = phaseHelp;
  $("phaseBadge").textContent = phaseLabel;
  const loop = game.phaseLoop || game.features?.phaseLoop || [];
  $("phaseLoopTrack").innerHTML = loop.map((item) => `<span class="${item.code === game.phase ? "active" : ""}"><b>${item.order}</b>${escapeHtml(item.label)}</span>`).join('<i>→</i>');
  renderHostControls();
  renderDiscussionTimer();
  renderDetectivePanel();
  renderRevealStrategy();
  renderPublicPlayers();
  renderPrivateCharacter();
  renderActionPanel();
  renderOutsideCampBoard();
  renderJudgementProtocol();
  renderVictoryRules();
  renderTutorialGuide();
  renderCurrentAction();
  renderHostDashboard();
  renderSessionManagement("game");
  renderGameTabs();
  if (game.phase !== "event") renderRoundEventModal(game);
  $("reasonJournal").innerHTML = (game.reasonLog || []).length
    ? [...game.reasonLog].reverse().map((report) => reasonReportHtml(report, true)).join("")
    : '<div class="empty-card">Пояснень результатів ще немає. Вони з’являться після кризи, експедиції, ремонту або лікування.</div>';
  const classifyLog = (line) => /голос|санкц|вигнан|апеляц/i.test(line) ? "votes" : /їж|вод|енерг|медикамент|ресурс|морал|цілісн/i.test(line) ? "resources" : /відкрива|персонаж|характерист|роль|здібн/i.test(line) ? "characters" : /таєм|розслід|доказ|підозр|фракц/i.test(line) ? "secrets" : /фаза|автомат|хост|сеанс|підключ/i.test(line) ? "system" : "key";
  const filteredLog = [...game.log].reverse().filter((line) => activeLogFilter === "all" || classifyLog(line) === activeLogFilter);
  const logMeta = { key:["Ключове","◆"], votes:["Рішення","◎"], resources:["Ресурси","▣"], characters:["Персонаж","◇"], secrets:["Таємниця","⌁"], system:["Система","≡"] };
  $("gameLog").innerHTML = filteredLog.map((line) => { const category = classifyLog(line); const meta = logMeta[category] || logMeta.key; return `<article class="log-entry log-${category}" data-log-category="${category}"><span class="log-entry-icon">${meta[1]}</span><div><small>${meta[0]}</small><p>${escapeHtml(line)}</p></div></article>`; }).join("") || `<div class="log-empty-state"><strong>Записів у цій категорії немає</strong><span>Змініть фільтр або продовжуйте партію.</span></div>`;
  const keyRoundLines = [...game.log].reverse().filter((line) => ["key", "votes"].includes(classifyLog(line))).slice(0, 6);
  if ($("roundSummary")) $("roundSummary").innerHTML = keyRoundLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("") || '<p class="muted">Ключових подій у цьому раунді ще немає.</p>';
  document.querySelectorAll("[data-log-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.logFilter === activeLogFilter);
    button.onclick = () => { activeLogFilter = button.dataset.logFilter; renderGame(); };
  });
}

function renderFinal() {
  clearInterval(discussionTicker);
  closeRoundEventModal();
  showScreen("finalScreen");
  const final = state.game.final;
  const features = state.game.features || {};
  const detectiveMode = state.settings?.setting === "detective";
  $("finalGoalsSection").classList.toggle("hidden", !features.personalGoals && !detectiveMode);
  $("finalRolesSection").classList.toggle("hidden", !features.hiddenRoles && !detectiveMode);
  renderFinalVictorySummary();
  $("finalTutorialPanel")?.classList.toggle("hidden", !state.settings?.tutorialEnabled);
  $("finalVerdict").textContent = final.verdict;
  $("finalScore").textContent = `${final.score}`;
  $("finalDescription").textContent = final.description;
  $("finalMetrics").innerHTML = (final.summaryStats || []).map((item) => `<article class="final-metric"><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.note || "")}</span></article>`).join("");
  const layers = final.scoreLayers || { directScore: final.directScore ?? final.score, finalScore: final.score, forecastMin: final.forecastRange?.min, forecastMax: final.forecastRange?.max };
  const forecastText = Number.isFinite(Number(layers.forecastMin)) && Number.isFinite(Number(layers.forecastMax)) ? `${Number(layers.forecastMin)}–${Number(layers.forecastMax)}/100` : "Немає даних";
  $("finalScoreLayers").innerHTML = `<article><small>Результат партії</small><strong>${Number(layers.directScore || 0)}/100</strong><span>Лише контрольовані рішення</span></article><article class="neutral"><small>Прогноз майбутнього</small><strong>${forecastText}</strong><span>Окремий епілог, не модифікатор</span></article><article><small>Зафіксований підсумок</small><strong>${Number(layers.finalScore ?? final.score)}/100</strong><span>Прогноз не змінює перемогу</span></article>`;
  const causalityCard = (item, assumption = false) => {
    const numeric = Number(item.scoreImpact ?? item.value ?? 0);
    const indicator = assumption ? `${numeric >= 0 ? "+" : ""}${numeric} б.` : `${numeric}/100`;
    return `<article class="causality-card ${escapeHtml(item.impact || "neutral")}"><div><span class="badge">${escapeHtml(item.category || (assumption ? "Прогноз" : "Рішення"))}</span><strong>${indicator}</strong></div><h4>${escapeHtml(item.title || "Наслідок")}</h4><p>${escapeHtml(item.text || item.detail || "")}</p>${assumption ? '<small>Симуляційне припущення, а не гарантована подія.</small>' : '<small>Зафіксовано за станом і журналом основної партії.</small>'}</article>`;
  };
  $("finalDirectConsequences").innerHTML = (final.directConsequences || []).map((item) => causalityCard(item, false)).join("") || '<div class="empty-card">Прямі наслідки не сформовано.</div>';
  $("finalSimulationAssumptions").innerHTML = (final.simulationAssumptions || []).map((item) => causalityCard(item, true)).join("") || '<div class="empty-card">Симуляційні припущення не сформовано.</div>';
  const simulation = final.longTermSimulation || null;
  const resourceLabels = { food: "Їжа", water: "Вода", energy: "Енергія", integrity: "Цілісність", medicine: "Медицина", morale: "Мораль" };
  $("simulationHorizonBadge").textContent = simulation ? `${simulation.horizonYears} років симуляції` : "Немає даних";
  $("simulationTimeSlices").innerHTML = simulation ? (simulation.timeSlices || []).map((slice, index) => {
    const resourceRows = Object.entries(slice.resources || {}).map(([key, value]) => `<div class="sim-resource"><span>${escapeHtml(resourceLabels[key] || key)}</span><b>${value}%</b><i><em style="width:${Math.max(0, Math.min(100, value))}%"></em></i></div>`).join("");
    const buildings = (slice.buildings || []).length ? `<div class="sim-buildings"><span>Створені об’єкти</span><p>${(slice.buildings || []).map(escapeHtml).join(" · ")}</p></div>` : "";
    return `<article class="simulation-slice ${escapeHtml(slice.status || "fragile")}" ${index === (simulation.timeSlices || []).length - 1 ? 'data-final-slice="true"' : ""}>
      <div class="simulation-slice-head"><span class="sim-time">${escapeHtml(slice.label)}</span><span class="badge">${slice.population} мешк.</span></div>
      <h4>${escapeHtml(slice.headline)}</h4><p>${escapeHtml(slice.summary)}</p>
      <div class="simulation-slice-stats">${simulation.demography?.modeled ? `<span>Дітей: <b>${slice.children || 0}</b></span>` : ""}<span>Системи: <b>${slice.moduleAverage}%</b></span><span>Етап: <b>${escapeHtml(slice.settlementStage)}</b></span></div>
      <div class="sim-resource-grid">${resourceRows}</div>${buildings}
    </article>`;
  }).join("") : `<div class="empty-card">Довгострокову симуляцію не сформовано.</div>`;
  if (simulation) {
    const settlement = simulation.settlement || {};
    $("finalSettlementSummary").innerHTML = `<h3>${escapeHtml(settlement.name || "Поселення")}</h3><p class="simulation-stage">${escapeHtml(settlement.stage || "Початковий етап")}</p><dl class="simulation-dl"><div><dt>Управління</dt><dd>${escapeHtml(settlement.governance || "не визначено")}</dd></div><div><dt>Рівень розвитку</dt><dd>${Number(settlement.level || 0) + 1}/5</dd></div><div><dt>Стан систем</dt><dd>${settlement.moduleAverage || 0}%</dd></div></dl><div class="sim-building-list">${(settlement.buildings || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || '<span class="muted">Нові постійні об’єкти ще не збудовано.</span>'}</div>`;
    const demography = simulation.demography || {};
    $("finalDemographySummary").innerHTML = demography.modeled
      ? `<div class="demography-number"><strong>${demography.endPopulation || 0}</strong><span>мешканців наприкінці</span></div><dl class="simulation-dl"><div><dt>На старті</dt><dd>${demography.startPopulation || 0}</dd></div><div><dt>Народилося</dt><dd class="positive-text">+${demography.births || 0}</dd></div><div><dt>Приєдналося</dt><dd class="positive-text">+${demography.outsidersJoined || 0}</dd></div><div><dt>Померло</dt><dd class="negative-text">−${demography.deaths || 0}</dd></div><div><dt>Хотіли дітей</dt><dd>${demography.willingToHaveChildren || 0}</dd></div><div><dt>Сумісні носії вагітності</dt><dd>${demography.compatiblePairs || 0}</dd></div><div><dt>Прямий вплив на оцінку</dt><dd>0</dd></div></dl><p class="demography-explanation">${escapeHtml(demography.explanation || "Демографічні умови не проаналізовано.")}</p>`
      : `<div class="demography-number"><strong>${demography.enabled === false ? "Вимкнено" : "Не моделюється"}</strong><span>${demography.enabled === false ? "правилами кімнати" : "через короткий часовий горизонт"}</span></div><dl class="simulation-dl"><div><dt>Населення на старті</dt><dd>${demography.startPopulation || 0}</dd></div><div><dt>Населення наприкінці</dt><dd>${demography.endPopulation || 0}</dd></div><div><dt>Прямий вплив на оцінку</dt><dd>0</dd></div></dl><p class="demography-explanation">${escapeHtml(demography.explanation || "Демографічні обставини не використовувалися.")}</p>`;
    const medical = simulation.medical || {};
    $("finalMedicalSummary").innerHTML = `<div class="demography-number"><strong>${medical.finalPatients || 0}</strong><span>активних хворих наприкінці</span></div><dl class="simulation-dl"><div><dt>Хворих на старті</dt><dd>${medical.initialPatients || 0}</dd></div><div><dt>Одужало</dt><dd class="positive-text">${medical.recovered || 0}</dd></div><div><dt>Медичні смерті й втрати</dt><dd class="negative-text">${medical.deaths || 0}</dd></div><div><dt>Запас медицини</dt><dd>${medical.medicineEnd || 0}%</dd></div></dl>`;
    $("finalConflictBadge").textContent = `${(simulation.conflicts || []).length} зафіксовано`;
    $("finalConflicts").innerHTML = (simulation.conflicts || []).length ? simulation.conflicts.map((conflict) => `<article class="simulation-conflict ${conflict.resolved ? "resolved" : "unresolved"}"><div><span class="sim-time">${escapeHtml(conflict.time)}</span><span class="badge">${conflict.resolved ? "Владнано" : "Наслідки лишилися"}</span></div><h4>${(conflict.participants || []).map(escapeHtml).join(" ↔ ")}</h4><p><b>Причина:</b> ${escapeHtml(conflict.cause)}</p><p><b>Розв’язання:</b> ${escapeHtml(conflict.resolution)}</p><small>${escapeHtml(conflict.impact)}</small></article>`).join("") : `<div class="empty-card">Відкритих персональних конфліктів у симуляції не виникло.</div>`;
    const partyEntries = (final.chronology || []).map((text, index) => ({ time: `Партія · ${String(index + 1).padStart(2, "0")}`, title: "Рішення та наслідок", text, category: "Основна гра", tone: "neutral", people: [] }));
    const futureEntries = simulation.chronicle || [];
    const mergedEntries = [...partyEntries, ...futureEntries];
    const simpleChronicle = mergedEntries.map((item) => `<article class="chronicle-book-entry ${escapeHtml(item.tone || "neutral")}"><strong>${escapeHtml(item.time)}</strong><h4>${escapeHtml(item.title || item.category || "Подія")}</h4><p>${escapeHtml(item.text)}</p>${(item.people || []).length ? `<small>Учасники: ${(item.people || []).map(escapeHtml).join(", ")}</small>` : ""}</article>`).join("");
    const detailedChronicle = futureEntries.map((item) => `<article class="chronicle-entry ${escapeHtml(item.tone || "neutral")}"><div class="chronicle-time"><strong>${escapeHtml(item.time)}</strong><span>${escapeHtml(item.category)}</span></div><div class="chronicle-copy"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p>${(item.people || []).length ? `<small>Учасники: ${(item.people || []).map(escapeHtml).join(", ")}</small>` : ""}</div></article>`).join("");
    $("longTermChronicle").innerHTML = `<div class="chronicle-book">${simpleChronicle}</div><details class="chronicle-rich-details"><summary>Показати докладні картки довгострокових наслідків</summary><div class="chronicle-rich-list">${detailedChronicle}</div></details>`;
  } else {
    ["finalSettlementSummary", "finalDemographySummary", "finalMedicalSummary", "finalConflicts", "longTermChronicle"].forEach((id) => { $(id).innerHTML = `<div class="empty-card">Немає даних.</div>`; });
    $("finalConflictBadge").textContent = "0";
  }
  $("finalScoreBreakdown").innerHTML = (final.scoreBreakdown || []).map((item) => {
    const positiveMax = item.max > 0 ? item.max : Math.max(1, Math.abs(item.value));
    const width = item.value >= 0 ? Math.min(100, Math.round((item.value / positiveMax) * 100)) : Math.min(100, Math.abs(item.value) * 8);
    return `<div class="score-line ${escapeHtml(item.tone || "neutral")}"><div><span>${escapeHtml(item.label)}</span><strong>${item.value >= 0 ? "+" : ""}${item.value}</strong></div><div class="score-track"><span style="width:${width}%"></span></div></div>`;
  }).join("");
  const brief = (items, icon) => (items || []).map((item, index) => `<div class="brief-item"><b>${icon === "number" ? index + 1 : icon}</b><span>${escapeHtml(item)}</span></div>`).join("");
  $("finalStrengths").innerHTML = brief(final.strengths, "✓");
  $("finalRisks").innerHTML = brief(final.risks, "!");
  $("finalPriorities").innerHTML = brief(final.priorities, "number");
  $("finalSurvivors").innerHTML = final.survivors.map((player) => `<div class="survivor"><strong>${escapeHtml(player.name)}</strong><span class="badge">${escapeHtml(player.role)}</span></div>`).join("");
  $("finalGoals").innerHTML = (final.personalGoals || []).map((goal) => `<div class="goal ${goal.completed ? "complete" : "failed"}"><strong>${escapeHtml(goal.name)}</strong><p>${escapeHtml(goal.goal)}</p><span class="badge">${goal.completed ? "Виконано" : "Не виконано"}</span></div>`).join("");
  const outside = final.outsideCampResult;
  $("finalOutsideCampSection").classList.toggle("hidden", !outside);
  if (outside) {
    $("finalOutsideCamp").innerHTML = `<article class="final-outside-camp ${outside.survived ? "complete" : "failed"}"><div class="section-title compact-title"><div><h3>${escapeHtml(outside.verdict)}</h3><p>${escapeHtml(outside.description)}</p></div><strong>${outside.score}/100</strong></div><div class="outside-camp-stats"><div><span>Їжа</span><b>${outside.resources.food}</b></div><div><span>Вода</span><b>${outside.resources.water}</b></div><div><span>Енергія</span><b>${outside.resources.energy}</b></div><div><span>Медицина</span><b>${outside.resources.medicine}</b></div><div><span>Брухт</span><b>${outside.resources.scrap}</b></div><div><span>Укриття</span><b>${outside.shelter}</b></div><div><span>Мораль</span><b>${outside.morale}</b></div><div><span>Загроза</span><b>${outside.threat}</b></div><div><span>Дослідження</span><b>${outside.exploration}</b></div></div><p><b>Відносини зі сховищем:</b> ${outside.allied ? "постійний союз" : `довіра ${outside.trust >= 0 ? "+" : ""}${outside.trust}`}.</p><div class="host-chip-list">${(outside.members || []).map((item) => `<span class="host-action-chip">${escapeHtml(item.name)} · ${escapeHtml(item.role)}</span>`).join("") || '<span class="muted">Фінальних мешканців немає.</span>'}</div><details><summary>Хроніка зовнішнього табору</summary>${(outside.history || []).map((item) => `<p><b>Раунд ${item.round}:</b> ${escapeHtml(item.text)}</p>`).join("")}</details></article>`;
  }
  const mysteryAnalysis = final.mysteryResult ? `<article class="analysis-card mystery-final ${final.mysteryResult.solved ? "solved" : "unsolved"}">
    <div><strong>${final.mysteryResult.solved ? "Справу доведено" : final.mysteryResult.correctAccusation ? "Організатора названо, але доказів недостатньо" : "Фінальна версія виявилася хибною"}</strong><span class="badge">Детектив</span></div>
    <p><b>Інцидент:</b> ${escapeHtml(final.mysteryResult.caseBrief?.incident || final.mysteryResult.crime || "Невідомо")}.</p>
    <p><b>Реальний спосіб:</b> ${escapeHtml(final.mysteryResult.method || "Невідомо")}.</p>
    <p><b>Групове звинувачення:</b> ${escapeHtml(final.mysteryResult.accusedName || "не сформовано")}.</p>
    <p><b>Доказова сила:</b> ${Number(final.mysteryResult.evidenceStrength || 0)}/${Number(final.mysteryResult.requiredEvidence || 2)} необхідних незалежних ланок.</p>
    <p><b>Організатор:</b> ${escapeHtml(final.mysteryResult.culpritName)} — ${final.mysteryResult.correctAccusation ? "названий правильно" : "не встановлений групою"}${final.mysteryResult.culpritCaught ? "; вибув із групи" : ""}.</p>
    ${final.mysteryResult.accompliceName ? `<p><b>Співучасник:</b> ${escapeHtml(final.mysteryResult.accompliceName)} — ${final.mysteryResult.accompliceIdentified ? "викритий або правильно запідозрений" : "уникнув викриття"}.</p>` : ""}
    <details><summary>Докази, анонімні версії та приватні перевірки після розкриття ролей</summary>${(final.mysteryResult.evidence || []).map((item) => `<p><b>${escapeHtml(item.label)}${item.disputed ? " — оскаржено" : ""}:</b> ${escapeHtml(item.text)}</p>`).join("")}${(final.mysteryResult.publicClaims || []).map((item) => `<p><b>Анонімна версія:</b> ${escapeHtml(item.text)}</p>`).join("")}${(final.mysteryResult.investigationLog || []).map((item) => `<p><b>${escapeHtml(item.investigatorName)}</b> перевіряв / перевіряла ${escapeHtml(item.targetName)}: ${escapeHtml(item.result)}</p>`).join("")}</details>
  </article>` : "";
  $("finalAnalysis").innerHTML = mysteryAnalysis + (final.analysis || []).map((item) => `<article class="analysis-card"><div><strong>${escapeHtml(item.title)}</strong><span class="badge">${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.text)}</p></article>`).join("");
  $("finalOutcomes").innerHTML = (final.playerOutcomes || []).map((item) => `<article class="outcome ${item.active ? "complete" : "failed"}"><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.text)}</p></article>`).join("");
  $("finalCharacters").innerHTML = (final.characters || []).map((character, index) => {
    const medical = character.medicalCondition || { name: character.values.health, severity: 0, severityLabel: "Немає активної хвороби" };
    return `<details class="final-character" ${index === 0 ? "open" : ""}>
      <summary><span><strong>${escapeHtml(character.name)}</strong><small>${character.active ? "Залишився / залишилася у сховищі" : `Вигнано у раунді ${character.eliminatedRound || "?"}`}</small></span><span class="badge">${escapeHtml(character.role.name)}</span></summary>
      <div class="final-character-meta"><span class="badge">Здібність: ${escapeHtml(character.ability.name)}</span><span class="badge medical-badge">${escapeHtml(medical.severityLabel)}: ${escapeHtml(medical.name)}</span><span class="badge">Травма ${character.injury}/5</span><span class="badge">Стрес ${character.stress}/5</span><span class="badge">Успішних лікувань: ${character.successfulTreatments || 0}</span></div>
      <div class="final-character-grid">${Object.entries(character.values).map(([key, value]) => `<div class="final-char-row"><small>${escapeHtml(characterKeyLabel(key))}</small><strong>${escapeHtml(value)}</strong><button type="button" class="char-info-button" data-open-info data-info-label="${escapeHtml(characterKeyLabel(key))}" data-info-value="${escapeHtml(value)}" data-info-description="${escapeHtml(character.descriptions?.[key] || "")}">ⓘ Опис</button></div>`).join("")}</div>
      <p class="inventory-summary"><strong>Фінальний інвентар:</strong> ${escapeHtml(character.inventory.join(" · ") || "порожній")}</p>
    </details>`;
  }).join("");
  $("finalRoles").innerHTML = (final.roleResults || []).map((result) => `<article class="role-result ${result.completed ? "complete" : "failed"}">
    <div><strong>${escapeHtml(result.name)}</strong><span class="badge">${escapeHtml(result.faction)}</span></div>
    <h4>${escapeHtml(result.role)}</h4><p>${escapeHtml(result.objective)}</p>
    <span class="badge">${result.completed ? "Перемога ролі" : "Умову не виконано"}</span>
  </article>`).join("");
  $("finalChronology").innerHTML = final.chronology.map((item, index) => `<div class="timeline-item"><small>${String(index + 1).padStart(2, "0")}</small><span>${escapeHtml(item)}</span></div>`).join("");
  bindInfoButtons($("finalScreen"));
}

function advancedModulePrefix(scope = "create") { return scope === "lobby" ? "lobby" : ""; }
function selectedAdvancedModules(prefix = "") {
  const container = $(`${prefix}AdvancedModulesGrid`);
  if (!container) return [];
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value).slice(0, ADVANCED_MODULE_LIMIT);
}
function renderAdvancedModules(scope = "create", values = null) {
  const prefix = advancedModulePrefix(scope);
  const mode = $(prefix ? "lobbyGameMode" : "gameMode")?.value || "classic";
  const setting = $(prefix ? "lobbySetting" : "setting")?.value || "modern";
  const picker = $(`${prefix}AdvancedModulesPicker`);
  const grid = $(`${prefix}AdvancedModulesGrid`);
  const count = $(`${prefix}AdvancedModulesCount`);
  const hint = $(`${prefix}AdvancedModulesHint`);
  if (!picker || !grid) return;
  const active = mode === "advanced" && setting !== "detective";
  picker.classList.toggle("hidden", !active);
  if (!active) { grid.innerHTML = ""; if (count) count.textContent = "0/2"; return; }
  const selected = new Set(normalizeClientAdvancedModules(values ?? selectedAdvancedModules(prefix), mode, setting));
  if (!selected.size && values == null && !grid.children.length) DEFAULT_ADVANCED_MODULES.forEach((id) => selected.add(id));
  grid.innerHTML = Object.entries(ADVANCED_MODULE_INFO).map(([id, module]) => `<label class="advanced-module-option"><input type="checkbox" value="${id}" ${selected.has(id) ? "checked" : ""}/><span><strong>${escapeHtml(module.name)}</strong><small>${escapeHtml(module.description)}</small></span></label>`).join("");
  const update = () => {
    const chosen = selectedAdvancedModules(prefix);
    grid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      const blocked = !input.checked && chosen.length >= ADVANCED_MODULE_LIMIT;
      input.disabled = blocked;
      input.closest("label")?.classList.toggle("disabled", blocked);
    });
    if (count) count.textContent = `${chosen.length}/${ADVANCED_MODULE_LIMIT}`;
    if (hint) hint.textContent = chosen.length
      ? `Активний цикл: ${modeLoopPreview("advanced", chosen, setting).join(" → ")}`
      : "Без додаткових систем: лише розкриття, обговорення, криза та рішення громади.";
    syncModeDescription(scope);
    renderVictoryPreview(scope);
    renderConfigurationAnalysis(scope);
  };
  grid.querySelectorAll('input[type="checkbox"]').forEach((input) => input.addEventListener("change", update));
  update();
}
function syncModeDescription(scope = "create") {
  const prefix = advancedModulePrefix(scope);
  const modeSelect = $(prefix ? "lobbyGameMode" : "gameMode");
  const description = $(prefix ? "lobbyModeDescription" : "modeDescription");
  if (!modeSelect || !description) return;
  const info = MODE_INFO[modeSelect.value] || MODE_INFO.classic;
  const setting = $(prefix ? "lobbySetting" : "setting")?.value || "modern";
  const modules = selectedAdvancedModules(prefix);
  const loop = modeLoopPreview(modeSelect.value, modules, setting);
  const moduleNames = modeSelect.value === "advanced" && setting !== "detective"
    ? modules.map((id) => ADVANCED_MODULE_INFO[id]?.name).filter(Boolean)
    : [];
  const tutorial = tutorialScopeEnabled(scope);
  const tutorialLoop = ["Розкриття", "Обговорення", "Криза", "Наслідки", "Другий раунд", "Рішення громади", "Фінал"];
  description.innerHTML = tutorial
    ? `<strong>Навчальна партія</strong><span>Керований вступ на 2 раунди: перший без санкцій, другий — із повним голосуванням та фіналом.</span><div class="mode-loop-preview">${tutorialLoop.map((item, index) => `<b><i>${index + 1}</i>${escapeHtml(item)}</b>`).join('<em>→</em>')}</div>`
    : `<strong>${escapeHtml(info.name)}</strong><span>${escapeHtml(info.description)}</span>${moduleNames.length ? `<div class="advanced-module-badges">${moduleNames.map((name) => `<span class="badge">${escapeHtml(name)}</span>`).join("")}</div>` : ""}<div class="mode-loop-preview">${loop.map((item, index) => `<b><i>${index + 1}</i>${escapeHtml(item)}</b>`).join('<em>→</em>')}</div>`;
}

function tutorialScopeEnabled(scope = "create") {
  return Boolean($(scope === "lobby" ? "lobbyTutorialEnabled" : "tutorialEnabled")?.checked);
}
function applyTutorialPresetClient(scope = "create") {
  const lobby = scope === "lobby";
  const enabled = tutorialScopeEnabled(scope);
  const prefix = lobby ? "lobby" : "";
  const ids = lobby
    ? ["lobbyGameMode", "lobbySetting", "lobbyScenarioMode", "lobbyCapacity", "lobbyRounds", "lobbyReveals", "lobbyCampaign", "lobbyContentPack", "lobbyDemographicsEnabled", "lobbyCharacterSetMode", "lobbyVoteSystem", "lobbyVoteVisibility", "lobbyTieRule", "lobbyAutomationMode", "lobbyInactivityTimeoutSeconds", "lobbyPhaseTimeoutSeconds", "lobbyAbsurdity"]
    : ["gameMode", "setting", "scenarioMode", "capacity", "rounds", "revealsPerRound", "campaignSelect", "contentPackSelect", "demographicsEnabled", "characterSetMode", "voteSystem", "voteVisibility", "tieRule", "automationMode", "inactivityTimeoutSeconds", "phaseTimeoutSeconds", "absurdity"];
  if (enabled) {
    $(lobby ? "lobbyGameMode" : "gameMode").value = "classic";
    $(lobby ? "lobbySetting" : "setting").value = "modern";
    $(lobby ? "lobbyScenarioMode" : "scenarioMode").value = "catalog";
    const expected = lobby ? Math.max(3, Number(state?.players?.length || 3)) : Math.max(3, Number($("expectedPlayers")?.value || 3));
    $(lobby ? "lobbyCapacity" : "capacity").value = Math.max(2, expected - 1);
    $(lobby ? "lobbyRounds" : "rounds").value = 2;
    $(lobby ? "lobbyReveals" : "revealsPerRound").value = 1;
    $(lobby ? "lobbyCampaign" : "campaignSelect").value = "";
    $(lobby ? "lobbyContentPack" : "contentPackSelect").value = "";
    $(lobby ? "lobbyDemographicsEnabled" : "demographicsEnabled").checked = false;
    $(lobby ? "lobbyCharacterSetMode" : "characterSetMode").value = "compact";
    $(lobby ? "lobbyVoteSystem" : "voteSystem").value = "tribunal";
    $(lobby ? "lobbyVoteVisibility" : "voteVisibility").value = "open";
    $(lobby ? "lobbyTieRule" : "tieRule").value = "runoff";
    $(lobby ? "lobbyAutomationMode" : "automationMode").value = "off";
    $(lobby ? "lobbyAbsurdity" : "absurdity").value = 1;
    if (!lobby && $("absurdityText")) $("absurdityText").textContent = ABSURDITY[1];
  }
  for (const id of ids) {
    const control = $(id);
    if (!control) continue;
    control.disabled = enabled;
    control.closest("label, section")?.classList.toggle("tutorial-locked", enabled);
  }
  $(lobby ? "lobbyTutorialModeCard" : "tutorialModeCard")?.classList.toggle("active", enabled);
  if (enabled) {
    renderAdvancedModules(scope, []);
    syncDemographicsControl(scope);
    renderCharacterSetPicker(scope, false);
  } else {
    syncDemographicsControl(scope);
  }
  syncModeDescription(scope);
  renderVictoryPreview(scope);
  renderConfigurationAnalysis(scope);
}

function syncModeFields(scope = "create") {
  const modeSelect = scope === "lobby" ? $("lobbyGameMode") : $("gameMode");
  const capacityInput = scope === "lobby" ? $("lobbyCapacity") : $("capacity");
  const description = scope === "lobby" ? $("lobbyModeDescription") : $("modeDescription");
  if (!modeSelect || !capacityInput || !description) return;
  const info = MODE_INFO[modeSelect.value] || MODE_INFO.classic;
  syncModeDescription(scope);
  capacityInput.disabled = !info.elimination;
  capacityInput.closest("label")?.classList.toggle("disabled-field", !info.elimination);
  const prefix = scope === "lobby" ? "lobby" : "";
  const voteSystem = $(prefix ? "lobbyVoteSystem" : "voteSystem");
  const voteVisibility = $(prefix ? "lobbyVoteVisibility" : "voteVisibility");
  const tieRule = $(prefix ? "lobbyTieRule" : "tieRule");
  [voteSystem, voteVisibility, tieRule].forEach((control) => {
    if (!control) return;
    control.disabled = !info.elimination;
    control.closest("label")?.classList.toggle("disabled-field", !info.elimination);
  });
  renderVictoryPreview(scope);
}
function syncDemographicsControl(scope = "create") {
  const lobby = scope === "lobby";
  const setting = $(lobby ? "lobbySetting" : "setting")?.value || "modern";
  const control = $(lobby ? "lobbyDemographicsEnabled" : "demographicsEnabled");
  const card = $(lobby ? "lobbyDemographicsCard" : "demographicsCard");
  if (!control) return;
  const detective = setting === "detective";
  control.disabled = detective;
  if (detective) control.checked = false;
  card?.classList.toggle("disabled-field", detective);
  const note = card?.querySelector("small");
  if (note) note.textContent = detective ? "У детективному сетингу цей блок не використовується." : "Не впливає на поточну корисність; моделюється лише у довгому епілозі.";
}
function syncSoloTestMode(scope = "create") {
  const lobby = scope === "lobby";
  const toggle = $(lobby ? "lobbySoloTestMode" : "soloTestMode");
  const capacity = $(lobby ? "lobbyCapacity" : "capacity");
  if (!toggle || !capacity) return;
  if (toggle.checked) {
    capacity.min = "1"; capacity.value = "1";
    if (!lobby && $("expectedPlayers")) { $("expectedPlayers").min = "1"; $("expectedPlayers").value = "1"; }
  } else {
    capacity.min = "2"; if (Number(capacity.value) < 2) capacity.value = "2";
    if (!lobby && $("expectedPlayers")) { $("expectedPlayers").min = "4"; if (Number($("expectedPlayers").value) < 4) $("expectedPlayers").value = "4"; }
  }
  renderVictoryPreview(scope); renderConfigurationAnalysis(scope);
}
$("soloTestMode")?.addEventListener("change", () => syncSoloTestMode("create"));
$("lobbySoloTestMode")?.addEventListener("change", () => syncSoloTestMode("lobby"));
$("demographicsEnabled")?.addEventListener("change", () => { renderCharacterSetPicker("create", true); renderConfigurationAnalysis("create"); });
$("lobbyDemographicsEnabled")?.addEventListener("change", () => { renderCharacterSetPicker("lobby", true); renderConfigurationAnalysis("lobby"); });
$("tutorialEnabled")?.addEventListener("change", () => applyTutorialPresetClient("create"));
$("lobbyTutorialEnabled")?.addEventListener("change", () => applyTutorialPresetClient("lobby"));
$("expectedPlayers")?.addEventListener("input", () => { if (tutorialScopeEnabled("create")) applyTutorialPresetClient("create"); });
$("gameMode").addEventListener("change", () => { renderAdvancedModules("create", $("gameMode").value === "advanced" ? DEFAULT_ADVANCED_MODULES : []); syncModeFields("create"); renderConfigurationAnalysis("create"); });
$("setting").addEventListener("change", () => { refreshPlatformSelects(); syncDemographicsControl("create"); renderCharacterSetPicker("create", false); renderAdvancedModules("create"); renderVictoryPreview("create"); renderConfigurationAnalysis("create"); });
$("lobbyGameMode").addEventListener("change", () => { renderAdvancedModules("lobby", $("lobbyGameMode").value === "advanced" ? DEFAULT_ADVANCED_MODULES : []); syncModeFields("lobby"); renderConfigurationAnalysis("lobby"); });
$("lobbySetting").addEventListener("change", () => { syncDemographicsControl("lobby"); renderCharacterSetPicker("lobby", false); renderAdvancedModules("lobby"); renderVictoryPreview("lobby"); renderConfigurationAnalysis("lobby"); });
$("characterSetMode").addEventListener("change", () => renderCharacterSetPicker("create", true));
$("lobbyCharacterSetMode").addEventListener("change", () => renderCharacterSetPicker("lobby", true));
[["rounds", "create"], ["revealsPerRound", "create"], ["lobbyRounds", "lobby"], ["lobbyReveals", "lobby"]].forEach(([id, scope]) => $(id)?.addEventListener("input", () => { renderCharacterSetPicker(scope, true); renderConfigurationAnalysis(scope); }));
[["expectedPlayers", "create"], ["capacity", "create"], ["voteVisibility", "create"], ["tieRule", "create"], ["automationMode", "create"], ["inactivityTimeoutSeconds", "create"], ["phaseTimeoutSeconds", "create"], ["lobbyCapacity", "lobby"], ["lobbyVoteVisibility", "lobby"], ["lobbyTieRule", "lobby"], ["lobbyAutomationMode", "lobby"], ["lobbyInactivityTimeoutSeconds", "lobby"], ["lobbyPhaseTimeoutSeconds", "lobby"]].forEach(([id, scope]) => $(id)?.addEventListener("input", () => { renderVictoryPreview(scope); renderConfigurationAnalysis(scope); }));
renderAdvancedModules("create", []);
syncDemographicsControl("create");
syncModeFields("create");
renderCharacterSetPicker("create", false);
renderConfigurationAnalysis("create");
applyTutorialPresetClient("create");

$("generationSeed")?.addEventListener("input", () => { $("generationSeed").value = normalizeGenerationSeedClient($("generationSeed").value); });
$("lobbyGenerationSeed")?.addEventListener("input", () => { $("lobbyGenerationSeed").value = normalizeGenerationSeedClient($("lobbyGenerationSeed").value); });
$("randomizeGenerationSeed")?.addEventListener("click", () => { $("generationSeed").value = randomGenerationSeed(); });
$("lobbyRandomizeGenerationSeed")?.addEventListener("click", () => { $("lobbyGenerationSeed").value = randomGenerationSeed(); });
$("lobbyCopyGenerationSeed")?.addEventListener("click", () => copyGenerationValue(state?.generation?.seed, "Seed"));
$("lobbyCopyGenerationConfig")?.addEventListener("click", () => copyGenerationValue(state?.generation?.configCode, "Код конфігурації"));
$("gameCopyGenerationBundle")?.addEventListener("click", () => {
  const generation = state?.generation;
  if (!generation) return;
  copyGenerationValue(`Seed: ${generation.seed}
Схема: ${generation.schema}
Конфігурація: ${generation.configCode}
Відбиток: ${generation.fingerprint || "—"}`, "Дані генерації");
});
$("absurdity").addEventListener("input", () => { $("absurdityText").textContent = ABSURDITY[Number($("absurdity").value)]; });
$("createForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = await api("/api/rooms/create", { method: "POST", body: {
      name: $("createName").value,
      tutorialEnabled: $("tutorialEnabled").checked,
      soloTestMode: $("soloTestMode")?.checked === true,
      mode: $("gameMode").value,
      advancedModules: selectedAdvancedModules(""),
      setting: $("setting").value,
      scenarioMode: $("scenarioMode").value,
      capacity: Number($("capacity").value),
      rounds: Number($("rounds").value),
      revealsPerRound: Number($("revealsPerRound").value),
      characterSetMode: $("characterSetMode").value,
      customCharacterKeys: selectedCustomKeys(""),
      demographicsEnabled: $("setting").value !== "detective" && $("demographicsEnabled").checked,
      absurdity: Number($("absurdity").value),
      voteSystem: $("voteSystem").value,
      voteVisibility: $("voteVisibility").value,
      tieRule: $("tieRule").value,
      automationMode: $("automationMode").value,
      inactivityTimeoutSeconds: Number($("inactivityTimeoutSeconds").value),
      phaseTimeoutSeconds: Number($("phaseTimeoutSeconds").value),
      hostFailoverEnabled: $("hostFailoverEnabled").checked,
      hostFailoverSeconds: Number($("hostFailoverSeconds").value),
      generationSeed: normalizeGenerationSeedClient($("generationSeed").value),
      campaignId: $("campaignSelect").value || null,
      contentPackId: $("contentPackSelect").value || null,
      ...accountCredentials()
    }});
    saveSession({ code: payload.code, playerId: payload.playerId, token: payload.token, recoveryCode: payload.recoveryCode || null });
    startPolling();
  } catch (error) { toast(error.message, true); }
});
function normalizeAccessCode(value, maxLength) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, maxLength);
}
function bindAccessCodeInput(id, maxLength) {
  const input = $(id);
  if (!input) return;
  input.addEventListener("input", () => {
    const normalized = normalizeAccessCode(input.value, maxLength);
    if (input.value !== normalized) input.value = normalized;
  });
}
bindAccessCodeInput("joinCode", 10);
bindAccessCodeInput("rejoinRoomCode", 6);
bindAccessCodeInput("rejoinRecoveryCode", 10);
bindAccessCodeInput("recoveryRequestRoomCode", 6);

$("joinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const enteredCode = normalizeAccessCode($("joinCode").value, 10);
    if (enteredCode.length === 10) {
      $("recoveryEntryDetails").open = true;
      $("rejoinRecoveryCode").value = enteredCode;
      $("joinCode").value = "";
      $("rejoinRoomCode").focus();
      toast("Це персональний код із 10 символів. Додатково введіть 6-символьний код кімнати у відкритій формі нижче.");
      return;
    }
    if (enteredCode.length !== 6) throw new Error("Код кімнати має містити рівно 6 символів.");
    const payload = await api("/api/rooms/join", { method: "POST", body: { name: $("joinName").value, code: enteredCode, ...accountCredentials() } });
    saveSession({ code: payload.code, playerId: payload.playerId, token: payload.token, recoveryCode: payload.recoveryCode || null });
    startPolling();
  } catch (error) { toast(error.message, true); }
});
async function pollRecoveryRequestStatus(requestData) {
  clearInterval(recoveryPollTimer);
  const statusElement = $("recoveryRequestStatus");
  const check = async () => {
    try {
      const payload = await api(`/api/rooms/recovery-status?code=${encodeURIComponent(requestData.code)}&requestId=${encodeURIComponent(requestData.requestId)}&requestToken=${encodeURIComponent(requestData.requestToken)}`);
      if (payload.status === "approved") {
        clearInterval(recoveryPollTimer);
        localStorage.removeItem("shelter100-recovery-request");
        saveSession({ code: payload.code, playerId: payload.playerId, token: payload.token, recoveryCode: payload.recoveryCode || null });
        if (statusElement) statusElement.textContent = `Хост підтвердив повернення ${payload.name || "гравця"}.`;
        startPolling();
      } else if (["rejected", "expired", "superseded"].includes(payload.status)) {
        clearInterval(recoveryPollTimer);
        localStorage.removeItem("shelter100-recovery-request");
        if (statusElement) statusElement.textContent = payload.status === "rejected" ? "Хост відхилив запит." : payload.status === "superseded" ? "Цей запит замінено новішим." : "Запит прострочено.";
      } else if (statusElement) statusElement.textContent = `Очікується підтвердження хоста для ${payload.playerName || requestData.playerName || "гравця"}…`;
    } catch (error) {
      if (statusElement) statusElement.textContent = error.message;
    }
  };
  await check();
  recoveryPollTimer = setInterval(check, 3000);
}
$("rejoinSubmit").onclick = async () => {
  try {
    const roomCodeValue = normalizeAccessCode($("rejoinRoomCode").value, 6);
    const personalCodeValue = normalizeAccessCode($("rejoinRecoveryCode").value, 10);
    if (roomCodeValue.length !== 6) throw new Error("Код кімнати має містити рівно 6 символів.");
    if (personalCodeValue.length !== 10) throw new Error("Персональний код має містити рівно 10 символів.");
    const payload = await api("/api/rooms/rejoin", { method: "POST", body: { code: roomCodeValue, recoveryCode: personalCodeValue } });
    saveSession({ code: payload.code, playerId: payload.playerId, token: payload.token, recoveryCode: payload.recoveryCode || null });
    toast(`Сеанс ${payload.name || "гравця"} відновлено.`);
    startPolling();
  } catch (error) { toast(error.message, true); }
};
$("recoveryRequestSubmit").onclick = async () => {
  try {
    const roomCodeValue = normalizeAccessCode($("recoveryRequestRoomCode").value, 6);
    if (roomCodeValue.length !== 6) throw new Error("Код кімнати має містити рівно 6 символів.");
    const payload = await api("/api/rooms/recovery-request", { method: "POST", body: { code: roomCodeValue, name: $("recoveryRequestName").value } });
    const requestData = { code: payload.code, requestId: payload.requestId, requestToken: payload.requestToken, playerName: payload.playerName };
    localStorage.setItem("shelter100-recovery-request", JSON.stringify(requestData));
    await pollRecoveryRequestStatus(requestData);
  } catch (error) { toast(error.message, true); }
};
$("resumeButton").onclick = () => { saveSession(readSession()); startPolling(); };
$("readyButton").onclick = () => sendAction("ready", { value: !state.self.ready });
$("startButton").onclick = () => sendAction("start");
$("saveLobbySettings").onclick = () => sendAction("update_settings", {
  tutorialEnabled: $("lobbyTutorialEnabled").checked,
  soloTestMode: $("lobbySoloTestMode")?.checked === true,
  mode: $("lobbyGameMode").value,
  advancedModules: selectedAdvancedModules("lobby"),
  setting: $("lobbySetting").value,
  scenarioMode: $("lobbyScenarioMode").value,
  capacity: Number($("lobbyCapacity").value),
  rounds: Number($("lobbyRounds").value),
  revealsPerRound: Number($("lobbyReveals").value),
  characterSetMode: $("lobbyCharacterSetMode").value,
  customCharacterKeys: selectedCustomKeys("lobby"),
  demographicsEnabled: $("lobbySetting").value !== "detective" && $("lobbyDemographicsEnabled").checked,
  absurdity: Number($("lobbyAbsurdity").value),
  voteSystem: $("lobbyVoteSystem").value,
  voteVisibility: $("lobbyVoteVisibility").value,
  tieRule: $("lobbyTieRule").value,
  automationMode: $("lobbyAutomationMode").value,
  inactivityTimeoutSeconds: Number($("lobbyInactivityTimeoutSeconds").value),
  phaseTimeoutSeconds: Number($("lobbyPhaseTimeoutSeconds").value),
  hostFailoverEnabled: $("lobbySettingsHostFailoverEnabled").checked,
  hostFailoverSeconds: Number($("lobbySettingsHostFailoverSeconds").value),
  generationSeed: normalizeGenerationSeedClient($("lobbyGenerationSeed").value),
  campaignId: $("lobbyCampaign").value || null,
  contentPackId: $("lobbyContentPack").value || null
});
async function copyRecoveryCode(scope) {
  const value = state?.sessionManagement?.recoveryCode || state?.self?.recoveryCode || "";
  try { await navigator.clipboard.writeText(value); toast("Персональний код скопійовано."); }
  catch { toast(`Персональний код: ${value}`); }
}
function transferHostFrom(scope) {
  const targetId = $(`${scope}HostTransferTarget`)?.value;
  if (!targetId) return toast("Немає доступного кандидата.", true);
  const target = state.players.find((player) => player.id === targetId);
  if (!confirm(`Передати права хоста гравцеві ${target?.name || "?"}?`)) return;
  sendAction("transfer_host", { targetId });
}
function saveHostFailoverFrom(scope) {
  sendAction("host_failover_settings", { enabled: $(`${scope}HostFailoverEnabled`).checked, seconds: Number($(`${scope}HostFailoverSeconds`).value) });
}
["lobby", "game"].forEach((scope) => {
  $(`${scope}CopyRecoveryCode`).onclick = () => copyRecoveryCode(scope);
  $(`${scope}RegenerateRecoveryCode`).onclick = () => { if (confirm("Старий персональний код перестане працювати. Створити новий?")) sendAction("regenerate_recovery_code"); };
  $(`${scope}TransferHost`).onclick = () => transferHostFrom(scope);
  $(`${scope}SaveHostFailover`).onclick = () => saveHostFailoverFrom(scope);
});

$("roomCode").onclick = async () => {
  try { await navigator.clipboard.writeText(state.code); toast("Код кімнати скопійовано."); }
  catch { toast(`Код: ${state.code}`); }
};
$("leaveButton").onclick = () => {
  stopPolling();
  saveSession(null);
  state = null;
  $("leaveButton").classList.add("hidden");
  $("connectionBadge").textContent = "Не підключено";
  showScreen("homeScreen");
};

$("roundEventClose").onclick = closeRoundEventModal;
$("roundEventBackdrop").onclick = closeRoundEventModal;
$("infoDrawerClose").onclick = closeInfoDrawer;
$("infoDrawerBackdrop").onclick = closeInfoDrawer;
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeInfoDrawer(); closeRoundEventModal(); } });

document.addEventListener("visibilitychange", () => {
  if (!pollingActive || !session) return;
  pollAbortController?.abort();
  schedulePoll(document.hidden ? 500 : 0);
});
window.addEventListener("online", () => { if (pollingActive) { pollFailureCount = 0; schedulePoll(0); } });
window.addEventListener("offline", () => {
  $("connectionBadge").textContent = "Немає мережі";
  $("connectionBadge").classList.add("connection-error");
});


function initializeLobbyDrawer() {
  const backdrop = $("lobbyDrawerBackdrop");
  const drawer = $("lobbyConfigDrawer");
  if (!backdrop || !drawer) return;
  const open = (tab = "overview") => {
    backdrop.classList.remove("hidden");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("lobby-drawer-open");
    document.querySelectorAll("[data-lobby-drawer-tab]").forEach((button) => button.classList.toggle("active", button.dataset.lobbyDrawerTab === tab));
    document.querySelectorAll("[data-lobby-drawer-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.lobbyDrawerPanel === tab));
  };
  const close = () => {
    backdrop.classList.add("hidden");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lobby-drawer-open");
  };
  $("openLobbyDrawer")?.addEventListener("click", () => open("overview"));
  $("openLobbyDrawerSecondary")?.addEventListener("click", () => open("overview"));
  $("closeLobbyDrawer")?.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
  document.querySelectorAll("[data-lobby-drawer-tab]").forEach((button) => button.addEventListener("click", () => open(button.dataset.lobbyDrawerTab)));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !backdrop.classList.contains("hidden")) close(); });
}

function initializeSetupLevels() {
  const customIds = ["setting", "scenarioMode", "rounds", "revealsPerRound", "characterSetMode", "voteSystem", "voteVisibility", "tieRule"];
  const expertIds = ["tutorialModeCard", "advancedModulesPicker", "campaignSelect", "contentPackSelect", "demographicsCard", "automationMode", "inactivityTimeoutSeconds", "phaseTimeoutSeconds", "hostFailoverEnabled", "hostFailoverSeconds", "generationSeed", "randomizeGenerationSeed"];
  const owner = (id) => {
    const node = $(id);
    if (!node) return null;
    return node.matches("section,[id$='Card']") ? node : node.closest("section,label") || node;
  };
  const customNodes = [...new Set(customIds.map(owner).filter(Boolean))];
  const expertNodes = [...new Set(expertIds.map(owner).filter(Boolean))];
  const applyLevel = (level) => {
    document.querySelectorAll("[data-setup-level]").forEach((button) => button.classList.toggle("active", button.dataset.setupLevel === level));
    customNodes.forEach((node) => node.classList.toggle("setup-hidden", level === "quick"));
    expertNodes.forEach((node) => node.classList.toggle("setup-hidden", level !== "expert"));
    $("setupLevelNote").textContent = level === "quick" ? "Показано лише параметри, потрібні для швидкого старту." : level === "custom" ? "Доступні правила, тривалість і набір характеристик." : "Відкрито seed, модулі, кампанію, автоматизацію та технічні тайм-аути.";
  };
  document.querySelectorAll("[data-setup-level]").forEach((button) => { button.onclick = () => applyLevel(button.dataset.setupLevel); });
  const presets = {
    classic: { mode: "classic", setting: "modern", players: 6, capacity: 3, rounds: 4, reveals: 2, absurdity: 2, vote: "exile", automation: "off", characterSet: "extended" },
    survival: { mode: "survival", setting: "modern", players: 6, capacity: 6, rounds: 4, reveals: 2, absurdity: 1, vote: "tribunal", automation: "assist", characterSet: "extended" },
    detective: { mode: "advanced", setting: "detective", players: 7, capacity: 5, rounds: 4, reveals: 2, absurdity: 0, vote: "tribunal", automation: "assist", modules: [], characterSet: "extended" },
    chaos: { mode: "advanced", setting: "modern", players: 8, capacity: 4, rounds: 4, reveals: 2, absurdity: 4, vote: "tribunal", automation: "assist", modules: ["operations"], characterSet: "extended" },
    short: { mode: "classic", setting: "modern", players: 6, capacity: 4, rounds: 3, reveals: 2, absurdity: 2, vote: "exile", automation: "assist", characterSet: "compact" }
  };
  document.querySelectorAll("[data-game-preset]").forEach((button) => { button.onclick = () => {
    const preset = presets[button.dataset.gamePreset];
    if (!preset) return;
    $("gameMode").value = preset.mode; $("setting").value = preset.setting; $("expectedPlayers").value = preset.players; $("capacity").value = preset.capacity; $("rounds").value = preset.rounds; $("revealsPerRound").value = preset.reveals; $("absurdity").value = preset.absurdity; $("voteSystem").value = preset.vote; $("voteVisibility").value = "secret"; $("automationMode").value = preset.automation; $("characterSetMode").value = preset.characterSet || "extended"; renderCharacterSetPicker("create", false);
    renderAdvancedModules("create", preset.mode === "advanced" ? (preset.modules || DEFAULT_ADVANCED_MODULES) : []);
    syncModeFields("create"); $("absurdity").dispatchEvent(new Event("input")); renderConfigurationAnalysis("create");
    toast(`Застосовано пресет «${button.textContent.trim()}».`);
  }; });
  applyLevel("quick");
}

initializeLobbyDrawer();
initializeSetupLevels();
updateResumeButton();
try {
  const pendingRecovery = JSON.parse(localStorage.getItem("shelter100-recovery-request") || "null");
  if (pendingRecovery?.code && pendingRecovery?.requestId && pendingRecovery?.requestToken) pollRecoveryRequestStatus(pendingRecovery);
} catch {}
loadPlatform().finally(() => {
  const saved = readSession();
  if (saved) { session = saved; startPolling(); }
  else showScreen("homeScreen");
});

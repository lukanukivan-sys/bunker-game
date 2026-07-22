"use strict";

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const MARKER = "Comfort hotfix: group timer, crisis layout and public cards";

function edit(relativePath, transform) {
  const file = path.join(ROOT, relativePath);
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log(`[comfort-hotfix] updated ${relativePath}`);
  }
}
function replaceRequired(text, search, replacement, label) {
  if (text.includes(replacement)) return text;
  if (!text.includes(search)) throw new Error(`Не знайдено фрагмент для ${label}`);
  return text.replace(search, replacement);
}

edit("server.js", (text) => replaceRequired(
  text,
  'function eventDecisionPolicy(room) {\n  return room.game?.features?.elimination ? "host" : "collective";\n}',
  'function eventDecisionPolicy(room) {\n  // Криза є груповим рішенням у всіх режимах. Хост лише завершує підрахунок.\n  return "collective";\n}',
  "групового голосування в кризі"
));

edit("public/app.js", (text) => {
  text = replaceRequired(text,
    'let platformData = { account: null, campaigns: [], packs: [], statistics: null };\nfunction readAccountSession() {',
    'let platformData = { account: null, campaigns: [], packs: [], statistics: null };\nconst ACCOUNT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;\nfunction readAccountSession() {',
    "терміну акаунт-сесії");
  return replaceRequired(text,
    '    const raw = sessionStorage.getItem("shelter129-account") || localStorage.getItem("shelter100-account");\n    if (!raw) return null;\n    const parsed = JSON.parse(raw);\n    sessionStorage.setItem("shelter129-account", JSON.stringify(parsed));\n    localStorage.removeItem("shelter100-account");\n    return parsed;',
    '    const raw = localStorage.getItem("shelter129-account") || sessionStorage.getItem("shelter129-account") || localStorage.getItem("shelter100-account");\n    if (!raw) return null;\n    const parsed = JSON.parse(raw);\n    if (!parsed?.accountId || !parsed?.token || Number(parsed.expiresAt || 0) <= Date.now()) {\n      localStorage.removeItem("shelter129-account");\n      sessionStorage.removeItem("shelter129-account");\n      localStorage.removeItem("shelter100-account");\n      return null;\n    }\n    localStorage.setItem("shelter129-account", JSON.stringify(parsed));\n    sessionStorage.removeItem("shelter129-account");\n    localStorage.removeItem("shelter100-account");\n    return parsed;',
    "читання збереженої акаунт-сесії");
});

edit("public/manage.js", (text) => {
  text = replaceRequired(text, 'let toastTimer;', 'let toastTimer;\nconst ACCOUNT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;', "TTL входу");
  text = replaceRequired(text,
    '    const current = sessionStorage.getItem("shelter129-account") || localStorage.getItem("shelter100-account");\n    if (!current) return null;\n    const parsed = JSON.parse(current);\n    sessionStorage.setItem("shelter129-account", JSON.stringify(parsed));\n    localStorage.removeItem("shelter100-account");\n    return parsed;',
    '    const current = localStorage.getItem("shelter129-account") || sessionStorage.getItem("shelter129-account") || localStorage.getItem("shelter100-account");\n    if (!current) return null;\n    const parsed = JSON.parse(current);\n    if (!parsed?.accountId || !parsed?.token || Number(parsed.expiresAt || 0) <= Date.now()) {\n      localStorage.removeItem("shelter129-account");\n      sessionStorage.removeItem("shelter129-account");\n      localStorage.removeItem("shelter100-account");\n      return null;\n    }\n    localStorage.setItem("shelter129-account", JSON.stringify(parsed));\n    sessionStorage.removeItem("shelter129-account");\n    localStorage.removeItem("shelter100-account");\n    return parsed;',
    "читання довготривалої сесії");
  return replaceRequired(text,
    'function saveSession(value) {\n  localStorage.removeItem("shelter100-account");\n  if (value) sessionStorage.setItem("shelter129-account", JSON.stringify(value));\n  else sessionStorage.removeItem("shelter129-account");\n}',
    'function saveSession(value) {\n  localStorage.removeItem("shelter100-account");\n  sessionStorage.removeItem("shelter129-account");\n  if (value) localStorage.setItem("shelter129-account", JSON.stringify({ ...value, expiresAt: Date.now() + ACCOUNT_SESSION_TTL_MS }));\n  else localStorage.removeItem("shelter129-account");\n}',
    "збереження входу на 30 днів");
});

const timer = `<section aria-label="Таймер обговорення" class="discussion-timer hidden" id="discussionTimer">\n<div class="timer-face"><small>Час на поточну соціальну фазу</small><strong id="discussionTimerDisplay">05:00</strong></div>\n<div class="timer-host-controls hidden" id="discussionTimerHostControls">\n<label><span>Хвилин</span><input id="discussionTimerMinutes" max="60" min="0.25" step="0.25" type="number" value="5"/></label>\n<button class="button ghost timer-button" id="discussionTimerSet" type="button">Задати</button>\n<button class="button secondary timer-button" id="discussionTimerStart" type="button">Старт</button>\n<button class="button ghost timer-button" id="discussionTimerPause" type="button">Пауза</button>\n<button class="button ghost timer-button" id="discussionTimerReset" type="button">Скинути</button>\n</div>\n</section>\n`;
edit("public/index.html", (text) => {
  if (text.includes('class="discussion-timer group-discussion-timer hidden"')) return text;
  if (!text.includes(timer)) throw new Error("Не знайдено таймер у вкладці Хід");
  text = text.replace(timer, "");
  const anchor = '<div class="section-title compact-title"><div><p class="eyebrow">Учасники</p><h3>Відкриті дані</h3></div></div>\n';
  if (!text.includes(anchor)) throw new Error("Не знайдено вкладку Група");
  return text.replace(anchor, anchor + timer.replace('class="discussion-timer hidden"', 'class="discussion-timer group-discussion-timer hidden"'));
});

edit("public/styles.css", (text) => {
  if (text.includes(MARKER)) return text;
  return `${text}\n\n/* ${MARKER} */\n.ui5-command .round-event-modal {\n  top:50%; left:50%; right:auto; bottom:auto; inset:auto;\n  transform:translate(-50%,-50%);\n  max-height:calc(100vh - 32px);\n}\n.ui5-command .event-decision-policy { grid-column:1 / -1; margin:0 0 2px; }\n.ui5-command .round-event-choices { grid-auto-rows:1fr; }\n.ui5-command .round-event-choice.council-option { height:100%; min-height:180px; transform:none; }\n.ui5-command .round-event-choice.council-option:hover:not(:disabled),\n.ui5-command .round-event-choice.council-option.selected { transform:none; }\n.ui5-command [data-game-tab-panel="group"] .revealed-list { grid-template-columns:1fr; gap:8px; }\n.ui5-command [data-game-tab-panel="group"] .revealed-chip {\n  width:100%; grid-template-columns:minmax(150px,.48fr) minmax(0,1fr);\n  align-items:center; min-height:44px; padding:9px 12px;\n}\n.ui5-command [data-game-tab-panel="group"] .revealed-chip small { font-size:11px; }\n.ui5-command [data-game-tab-panel="group"] .revealed-chip strong { font-size:14px; line-height:1.35; }\n.group-discussion-timer { margin:0 0 16px; width:100%; }\n@media(max-width:820px){\n  .ui5-command .round-event-modal { max-height:calc(100vh - 16px); width:calc(100% - 16px); padding:20px; }\n  .ui5-command [data-game-tab-panel="group"] .revealed-chip { grid-template-columns:1fr; gap:3px; }\n}\n`;
});

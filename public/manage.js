"use strict";

const $ = (id) => document.getElementById(id);
let data = { account: null, campaigns: [], packs: [], statistics: null };
let packDraft = emptyPack();
let activeCategory = "professions";
let analysisReport = null;
let toastTimer;

const CATEGORY_LABELS = {
  origins: "Походження", professions: "Професії", health: "Здоров’я", skills: "Навички",
  items: "Предмети", secrets: "Таємниці", traits: "Риси", hobbies: "Хобі",
  phobias: "Фобії", anomalies: "Аномалії", relationships: "Стосунки",
  catastrophes: "Катастрофи", shelters: "Сховища", events: "Події", expeditions: "Експедиції"
};
const SETTING_LABELS = {
  all: "Усі сетинги", modern: "Наші дні", fantasy: "Темне фентезі", space: "Далекий космос",
  postapocalypse: "Постапокаліпсис", cyberpunk: "Кіберпанк", horror: "Горор", detective: "Детектив"
};
const TEMPLATES = {
  event: {
    id: "broken_filter_custom",
    title: "Фільтр почав співати гімн",
    description: "Вентиляція працює, але кожні п’ять хвилин виконує гімн невідомої держави й лякає мешканців.",
    level: "absurd",
    choices: [
      { id: "repair", label: "Розібрати панель і полагодити", success: 0.68, good: { integrity: 5, morale: 2 }, bad: { energy: -7, morale: -4 }, goodText: "Система замовкла й почала працювати стабільніше.", badText: "Гімн став голоснішим, а панель втратила частину живлення." },
      { id: "choir", label: "Створити хор і співати разом", success: 0.58, good: { morale: 9 }, bad: { morale: -5, energy: -2 }, goodText: "Спільний спів раптово підняв мораль.", badText: "Хор пересварився через неправильний другий куплет." },
      { id: "ignore", label: "Оголосити це культурною особливістю", success: 0.82, good: { morale: 2 }, bad: { morale: -7 }, goodText: "Люди звикли до дивної системи.", badText: "На четвертий день усі почали ненавидіти музику." }
    ]
  },
  expedition: {
    id: "custom_vending_machine",
    name: "Автомат із підозріло свіжими батончиками",
    description: "Автомат працює посеред зруйнованого вокзалу й вимагає оплату монетами держави, якої ніколи не існувало.",
    tags: ["technical", "survival", "social"],
    difficulty: 3,
    level: "absurd",
    success: { food: 12, morale: 4 },
    failure: { energy: -4, morale: -3 },
    asset: { name: "Інструкція до автоматів", description: "Допомагає знаходити приховані сервісні режими." }
  },
  catastrophe: {
    title: "Повстання побутової техніки",
    description: "Розумні чайники, пилососи й холодильники об’єдналися в профспілку та відмовляються обслуговувати людство без вихідних і соцпакета.",
    threat: "Автономна побутова техніка",
    level: "absurd"
  },
  shelter: {
    title: "Підземний супермаркет",
    description: "Великий торговий комплекс із запасами, складами й підозріло активною системою оголошень.",
    modules: ["Вентиляція", "Генератор", "Вода", "Холодильні склади", "Аптека", "Службові тунелі"],
    areaM2: 3200,
    roomCount: 18,
    rooms: ["Склад", "Їдальня", "Медпункт", "Майстерня"],
    provisions: ["Консерви", "Вода", "Побутова хімія"],
    initialResources: { food: 68, water: 54, energy: 48, medicine: 42, integrity: 62, morale: 55 }
  }
};

function emptyPack() {
  return { name: "", description: "", setting: "modern", public: false, entries: {} };
}
function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
function toast(message, error = false) {
  const node = $("toast");
  node.textContent = message;
  node.classList.toggle("error", error);
  node.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.add("hidden"), 4000);
}
function session() {
  try {
    const current = sessionStorage.getItem("shelter129-account") || localStorage.getItem("shelter100-account");
    if (!current) return null;
    const parsed = JSON.parse(current);
    sessionStorage.setItem("shelter129-account", JSON.stringify(parsed));
    localStorage.removeItem("shelter100-account");
    return parsed;
  } catch { return null; }
}
function saveSession(value) {
  localStorage.removeItem("shelter100-account");
  if (value) sessionStorage.setItem("shelter129-account", JSON.stringify(value));
  else sessionStorage.removeItem("shelter129-account");
}
async function api(path, options = {}) {
  const current = session();
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}) };
  if (current) {
    headers.Authorization = `Bearer ${current.token}`;
    headers["X-Account-Id"] = current.accountId;
  }
  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({ ok: false, error: "Некоректна відповідь сервера." }));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Помилка ${response.status}`);
  return payload;
}
function creds() {
  const current = session();
  return current ? { accountId: current.accountId, accountToken: current.token } : {};
}
async function load() {
  data = await api("/api/platform/bootstrap");
  render();
  if (data.account) await loadSessions();
}
function metric(label, value, note = "") {
  return `<article class="final-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note)}</span></article>`;
}
function campaignCard(campaign) {
  const chapters = Array.isArray(campaign.chapters) ? campaign.chapters : [];
  const history = chapters.length
    ? chapters.map((chapter) => `<div class="campaign-chapter-row"><p><b>${chapter.number}. ${esc(chapter.verdict)}</b> · ${chapter.score}/100 · ${new Date(chapter.completedAt).toLocaleDateString("uk-UA")}</p>${chapter.legacyOutcome ? `<small>Спадщина: ${esc(chapter.legacyOutcome.resultText || "Рішення не зафіксовано")}</small>` : ""}</div>`).join("")
    : "<p class=muted>Партій ще не було.</p>";
  const carry = chapters.length
    ? `<div class="campaign-carryover"><small>Наступний розділ</small><p>${esc(campaign.carryoverSummary || "Спадщина буде визначена після завершення розділу.")}</p><em>Кожна перевага створить окреме зобов’язання або вибір.</em></div>`
    : "";
  return `<article class="manage-card campaign-manage-card"><div><h4>${esc(campaign.name)}</h4><p>${esc(campaign.description || "Без опису")}</p></div><span class="badge">${chapters.length} розд.</span>${carry}<details><summary>Історія</summary>${history}</details></article>`;
}
function packCard(pack) {
  const count = Object.values(pack.entries || {}).reduce((sum, list) => sum + (list?.length || 0), 0);
  return `<article class="manage-card"><div><h4>${esc(pack.name)}</h4><p>${esc(SETTING_LABELS[pack.setting] || pack.setting)} · ${count} записів</p>${pack.description ? `<small>${esc(pack.description)}</small>` : ""}</div><div class="button-row"><button data-edit-pack="${pack.id}" class="button ghost">Редагувати</button><button data-analyze-pack="${pack.id}" class="button secondary">Аналіз</button><button data-export-pack="${pack.id}" class="button ghost">Експорт</button><button data-delete-pack="${pack.id}" class="button danger-button">Видалити</button></div></article>`;
}
function showRecoveryCode(value) {
  if (!value) return;
  $("recoveryCodeValue").textContent = value;
  $("recoveryCodePanel").classList.remove("hidden");
  $("recoveryCodePanel").scrollIntoView({ behavior: "smooth", block: "center" });
}
async function loadSessions() {
  const result = await api("/api/accounts/sessions");
  $("sessionList").innerHTML = (result.sessions || []).map((item) => `<article class="manage-card"><div><b>${esc(item.label || "Пристрій")}${item.current ? " · поточний" : ""}</b><p>Остання активність: ${new Date(item.lastSeenAt).toLocaleString("uk-UA")}</p></div>${item.current ? '<span class="badge">Цей сеанс</span>' : `<button class="button danger-button" data-revoke-session="${esc(item.id)}">Завершити</button>`}</article>`).join("") || '<div class="empty-card">Активних сеансів немає.</div>';
  document.querySelectorAll("[data-revoke-session]").forEach((button) => { button.onclick = async () => { await api("/api/accounts/sessions/revoke", { method: "POST", body: { sessionId: button.dataset.revokeSession } }); await loadSessions(); toast("Сеанс завершено."); }; });
}
function render() {
  const account = data.account;
  $("manageAccountBadge").textContent = account ? `Профіль: ${account.displayName}` : "Не авторизовано";
  $("authForms").classList.toggle("hidden", Boolean(account));
  $("profilePanel").classList.toggle("hidden", !account);
  if (account) {
    $("profileName").textContent = `${account.displayName} · @${account.username}`;
    const stats = account.stats;
    $("profileStats").innerHTML = metric("Партії", stats.games) + metric("Вижив", stats.survived) + metric("Успішні громади", stats.successfulSettlements) + metric("Середня оцінка", stats.averageScore) + metric("Найкраща", stats.bestScore) + metric("Успішні лікування", stats.treatments);
  }
  $("campaignList").innerHTML = account
    ? (data.campaigns.length ? data.campaigns.map(campaignCard).join("") : "<div class=empty-card>Кампаній ще немає.</div>")
    : "<div class=empty-card>Увійдіть до профілю.</div>";
  const owned = data.packs.filter((pack) => pack.owner);
  $("packList").innerHTML = account
    ? (owned.length ? owned.map(packCard).join("") : "<div class=empty-card>Наборів ще немає.</div>")
    : "<div class=empty-card>Увійдіть до профілю.</div>";
  const global = data.statistics || {};
  $("globalStats").innerHTML = metric("Партії", global.games || 0) + metric("Гравці", global.players || 0) + metric("Середня оцінка", global.averageScore || 0) + metric("Рекорд", global.bestScore || 0) + metric("Народження", global.births || 0) + metric("Смерті", global.deaths || 0);
  $("recentGames").innerHTML = (global.recentGames || []).map((game) => `<article class="manage-card"><div><b>${esc(game.verdict)}</b><p>${esc(game.setting)} · ${esc(game.mode)} · ${game.players} гравців</p></div><span class="badge">${game.score}/100</span></article>`).join("") || "<div class=empty-card>Завершених партій ще немає.</div>";
  bindPackButtons();
}
function bindPackButtons() {
  document.querySelectorAll("[data-edit-pack]").forEach((button) => { button.onclick = () => editPack(button.dataset.editPack); });
  document.querySelectorAll("[data-analyze-pack]").forEach((button) => { button.onclick = () => analyzeSavedPack(button.dataset.analyzePack); });
  document.querySelectorAll("[data-export-pack]").forEach((button) => { button.onclick = () => exportPack(button.dataset.exportPack); });
  document.querySelectorAll("[data-delete-pack]").forEach((button) => { button.onclick = () => deletePack(button.dataset.deletePack); });
}
function parseLines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    const name = parts.shift() || "";
    const levelRaw = parts.shift() || "normal";
    const level = ["normal", "odd", "absurd"].includes(levelRaw) ? levelRaw : levelRaw;
    return { name, level };
  });
}
function serializeLines(entries) {
  return (entries || []).map((entry) => {
    if (typeof entry === "string") return entry;
    const name = entry.name || entry.text || "";
    return `${name}${entry.level && entry.level !== "normal" ? ` | ${entry.level}` : ""}`;
  }).join("\n");
}
function syncCurrentCategory() {
  packDraft.entries ||= {};
  packDraft.entries[activeCategory] = parseLines($("packEntries").value);
}
function syncFormToDraft() {
  syncCurrentCategory();
  packDraft.name = $("packName").value.trim();
  packDraft.description = $("packDescription").value.trim();
  packDraft.setting = $("packSetting").value;
  packDraft.public = $("packPublic").checked;
  return packDraft;
}
function applyDraftToForm() {
  $("packId").value = packDraft.id || "";
  $("packName").value = packDraft.name || "";
  $("packDescription").value = packDraft.description || "";
  $("packSetting").value = packDraft.setting || "modern";
  $("packPublic").checked = Boolean(packDraft.public);
  activeCategory = $("packCategory").value || "professions";
  $("packEntries").value = serializeLines(packDraft.entries?.[activeCategory]);
  $("packJson").value = JSON.stringify(packDraft, null, 2);
}
function resetPack() {
  packDraft = emptyPack();
  activeCategory = "professions";
  $("packCategory").value = activeCategory;
  applyDraftToForm();
  analysisReport = null;
  $("analysisPanel").classList.add("hidden");
}
function editPack(id) {
  const pack = data.packs.find((item) => item.id === id);
  if (!pack) return;
  packDraft = JSON.parse(JSON.stringify(pack));
  activeCategory = "professions";
  $("packCategory").value = activeCategory;
  applyDraftToForm();
  document.querySelector('[data-tab="content"]').click();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
async function savePack() {
  if (!data.account) throw new Error("Спочатку увійдіть.");
  syncFormToDraft();
  const id = $("packId").value;
  const result = await api(id ? `/api/content-packs/${id}` : "/api/content-packs/create", { method: id ? "PUT" : "POST", body: { ...creds(), pack: packDraft } });
  packDraft = result.pack;
  applyDraftToForm();
  toast("Набір збережено.");
  await load();
}
async function exportPack(id) {
  const response = await api(`/api/content-packs/${id}`);
  downloadJson(response.pack, `${response.pack.name.replace(/[^\p{L}\p{N}_-]+/gu, "_")}.json`);
}
function downloadJson(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
async function deletePack(id) {
  if (!confirm("Видалити набір?")) return;
  await api(`/api/content-packs/${id}`, { method: "DELETE", body: creds() });
  if ($("packId").value === id) resetPack();
  await load();
}
function severityLabel(value) {
  return ({ error: "Помилка", warning: "Попередження", suggestion: "Порада" })[value] || value;
}
function renderAnalysis(report) {
  analysisReport = report;
  $("analysisPanel").classList.remove("hidden");
  const summary = report.summary;
  $("analysisScoreBadge").textContent = `${summary.score}/100`;
  $("analysisScoreBadge").className = `badge analysis-score ${summary.errors ? "bad" : summary.warnings ? "warn" : "good"}`;
  $("analysisSummary").innerHTML = metric("Оцінка", `${summary.score}/100`, summary.errors ? "Потрібні виправлення" : "Структура працездатна") + metric("Сумісність", summary.compatibility?.label || "Не визначено", summary.compatibility?.description || "") + metric("Помилки", summary.errors) + metric("Попередження", summary.warnings) + metric("Поради", summary.suggestions) + metric("Записи", summary.totalEntries) + metric("Схожі пари", summary.duplicatePairs);
  $("analysisIssues").innerHTML = report.issues.length
    ? report.issues.map((item) => `<article class="analysis-item ${esc(item.severity)}"><div><span class="analysis-severity">${esc(severityLabel(item.severity))}</span><b>${esc(item.title)}</b><small>${esc(item.categoryLabel || item.category || "Набір")}</small></div><p>${esc(item.message)}</p>${item.suggestion ? `<em>${esc(item.suggestion)}</em>` : ""}</article>`).join("")
    : "<div class=empty-card>Критичних зауважень не знайдено.</div>";
  $("analysisDuplicates").innerHTML = report.duplicates.length
    ? report.duplicates.map((item) => `<article class="duplicate-row"><b>${esc(item.one)}</b><span>≈ ${esc(item.two)}</span><strong>${item.similarity}%</strong><small>${item.source === "base" ? "Базовий контент" : "Усередині набору"} · ${esc(item.categoryLabel)}</small></article>`).join("")
    : "<div class=empty-card>Схожих записів не знайдено.</div>";
  $("analysisPreview").innerHTML = report.preview.length
    ? report.preview.map((item) => {
      if (item.type === "event") return `<article class="content-preview event"><small>${esc(item.categoryLabel)}</small><b>${esc(item.name)}</b><ul>${(item.choices || []).map((choice) => `<li>${esc(choice)}</li>`).join("")}</ul></article>`;
      if (item.type === "expedition") return `<article class="content-preview expedition"><small>${esc(item.categoryLabel)} · складність ${esc(item.difficulty || "?")}</small><b>${esc(item.name)}</b><p>${(item.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join(" ")}</p></article>`;
      return `<article class="content-preview ${esc(item.level)}"><small>${esc(item.categoryLabel)} · ${esc(item.level)}</small><b>${esc(item.name)}</b></article>`;
    }).join("")
    : "<div class=empty-card>Немає записів для попереднього перегляду.</div>";
  const coverage = report.simulation.coverage || [];
  $("analysisSimulation").innerHTML = `<p>Згенеровано <b>${report.simulation.generated}</b> тестових карток. Нижче показано, як часто авторські записи потрапляли до вибірки.</p><div class="simulation-bars">${coverage.map((item) => `<div class="simulation-row"><span>${esc(item.label)}</span><progress max="${Math.max(report.simulation.generated, 1)}" value="${item.appearances}"></progress><b>${item.appearances}</b><small class="risk-${esc(item.repeatRisk)}">ризик повторів: ${item.repeatRisk === "high" ? "високий" : item.repeatRisk === "medium" ? "середній" : "низький"}</small></div>`).join("")}</div><details><summary>Приклади тестових карток</summary>${(report.simulation.cards || []).map((card) => `<article class="simulation-card"><b>Картка ${card.number}</b>${Object.entries(card.fields || {}).slice(0, 6).map(([key, value]) => `<span><small>${esc(CATEGORY_LABELS[key] || key)}</small>${esc(value)}</span>`).join("")}</article>`).join("")}</details>`;
  $("knownExpeditionTags").innerHTML = (report.knownExpeditionTags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join("");
  $("analysisPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}
async function analyzeDraft(pack) {
  if (!data.account) throw new Error("Спочатку увійдіть до профілю.");
  const result = await api("/api/content-packs/analyze", { method: "POST", body: { ...creds(), pack, sampleSize: Number($("analysisSampleSize").value || 25) } });
  renderAnalysis(result.report);
  toast(result.report.summary.errors ? "Аналіз завершено: знайдено помилки." : "Аналіз завершено.", Boolean(result.report.summary.errors));
}
async function analyzeCurrentPack() {
  syncFormToDraft();
  await analyzeDraft(packDraft);
}
async function analyzeSavedPack(id) {
  const pack = data.packs.find((item) => item.id === id);
  if (!pack) return;
  packDraft = JSON.parse(JSON.stringify(pack));
  activeCategory = "professions";
  $("packCategory").value = activeCategory;
  applyDraftToForm();
  document.querySelector('[data-tab="content"]').click();
  await analyzeDraft(packDraft);
}
function applyTemplate(type) {
  syncFormToDraft();
  packDraft.entries ||= {};
  const category = type === "event" ? "events" : type === "expedition" ? "expeditions" : type === "catastrophe" ? "catastrophes" : "shelters";
  packDraft.entries[category] ||= [];
  packDraft.entries[category].push(JSON.parse(JSON.stringify(TEMPLATES[type])));
  $("packJson").value = JSON.stringify(packDraft, null, 2);
  toast(`Додано шаблон: ${CATEGORY_LABELS[category]}. Відредагуйте його в JSON і натисніть «Застосувати JSON».`);
}

// Tabs
document.querySelectorAll("[data-tab]").forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".manage-tab").forEach((item) => item.classList.toggle("active", item.id === `tab-${button.dataset.tab}`));
  };
});

$("registerForm").onsubmit = async (event) => {
  event.preventDefault();
  try {
    const result = await api("/api/accounts/register", { method: "POST", body: { username: $("registerUsername").value, displayName: $("registerDisplayName").value, password: $("registerPassword").value } });
    saveSession({ accountId: result.accountId, token: result.token });
    showRecoveryCode(result.recoveryCode); await load(); toast("Профіль створено. Збережіть резервний код.");
  } catch (error) { toast(error.message, true); }
};
$("resetPasswordForm").onsubmit = async (event) => {
  event.preventDefault();
  try {
    const result = await api("/api/accounts/reset-password", { method: "POST", body: { username: $("resetUsername").value, recoveryCode: $("resetRecoveryCode").value, newPassword: $("resetNewPassword").value } });
    saveSession({ accountId: result.accountId, token: result.token });
    showRecoveryCode(result.recoveryCode);
    await load(); toast("Пароль оновлено. Старі сеанси завершено.");
  } catch (error) { toast(error.message, true); }
};
$("copyRecoveryCode").onclick = async () => { await navigator.clipboard.writeText($("recoveryCodeValue").textContent); toast("Резервний код скопійовано."); };
$("hideRecoveryCode").onclick = () => $("recoveryCodePanel").classList.add("hidden");
$("loginForm").onsubmit = async (event) => {
  event.preventDefault();
  try {
    const result = await api("/api/accounts/login", { method: "POST", body: { username: $("loginUsername").value, password: $("loginPassword").value } });
    saveSession({ accountId: result.accountId, token: result.token });
    await load(); toast("Вхід виконано.");
  } catch (error) { toast(error.message, true); }
};
$("logoutButton").onclick = () => { saveSession(null); load(); };
$("campaignForm").onsubmit = async (event) => {
  event.preventDefault();
  try {
    await api("/api/campaigns/create", { method: "POST", body: { ...creds(), name: $("campaignName").value, setting: $("campaignSetting").value, description: $("campaignDescription").value } });
    event.target.reset(); await load(); toast("Кампанію створено.");
  } catch (error) { toast(error.message, true); }
};
$("packForm").onsubmit = async (event) => { event.preventDefault(); try { await savePack(); } catch (error) { toast(error.message, true); } };
$("packCategory").onchange = () => {
  syncCurrentCategory();
  activeCategory = $("packCategory").value;
  $("packEntries").value = serializeLines(packDraft.entries?.[activeCategory]);
};
$("newPackButton").onclick = resetPack;
$("analyzePackButton").onclick = () => analyzeCurrentPack().catch((error) => toast(error.message, true));
$("applyJsonButton").onclick = () => {
  try {
    syncCurrentCategory();
    const parsed = JSON.parse($("packJson").value);
    packDraft = parsed && typeof parsed === "object" ? parsed : emptyPack();
    packDraft.entries ||= {};
    applyDraftToForm();
    toast("JSON застосовано до редактора.");
  } catch { toast("Некоректний JSON.", true); }
};
document.querySelectorAll("[data-pack-template]").forEach((button) => { button.onclick = () => applyTemplate(button.dataset.packTemplate); });
$("downloadPackTemplate").onclick = () => downloadJson({
  name: "Мій авторський набір", description: "Короткий опис набору", setting: "modern", public: false,
  entries: {
    origins: [], professions: [], health: [], skills: [], items: [], secrets: [], traits: [], hobbies: [], phobias: [], anomalies: [], relationships: [],
    catastrophes: [TEMPLATES.catastrophe], shelters: [TEMPLATES.shelter], events: [TEMPLATES.event], expeditions: [TEMPLATES.expedition]
  }
}, "author_content_template.json");
$("importPackFile").onchange = async (event) => {
  try {
    const file = event.target.files[0];
    if (!file) return;
    const pack = JSON.parse(await file.text());
    const preflight = await api("/api/content-packs/analyze", { method: "POST", body: { ...creds(), pack, sampleSize: Number($("analysisSampleSize").value || 25) } });
    renderAnalysis(preflight.report);
    if (preflight.report.summary.errors && !confirm(`Аналіз знайшов ${preflight.report.summary.errors} помилок. Спробувати імпорт однаково?`)) return;
    await api("/api/content-packs/import", { method: "POST", body: { ...creds(), pack } });
    await load(); toast("Набір імпортовано.");
  } catch (error) { toast(error.message, true); }
  finally { event.target.value = ""; }
};

resetPack();
load().catch((error) => toast(error.message, true));

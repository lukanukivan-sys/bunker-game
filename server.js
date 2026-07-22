"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { COMMON, SETTINGS, RELATIONSHIPS, EVENTS, EXPEDITIONS, MEDICAL, LORE, SCENARIOS, SETTING_RULES } = require("./content");
const { simulateLongTerm } = require("./final_simulation");
const { evaluateDirectOutcome } = require("./final_balance");
const { createPlatform } = require("./platform");
const { describeCharacteristic } = require("./content/character_descriptions");
const DETECTIVE_CASE = require("./content/detective_case");
const { buildScenarioPriorities, validatePriorities } = require("./content/scenario_priorities");
const { buildCampaignLegacy, balancedStartingEffects } = require("./content/campaign_legacy");
const { PRODUCT_VERSION: VERSION, ROOM_SCHEMA, GENERATION_SCHEMA, CONTENT_SCHEMA, PLATFORM_SCHEMA } = require("./config/version");
const { random, runWithSeed } = require("./lib/random");
const { securityHeaders } = require("./lib/security");
const { createRoomStore } = require("./lib/room_store");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const LEGACY_SAVE_FILES = [path.join(DATA_DIR, "rooms_v105.json")];
const ROOM_TTL_MS = clampRoomTtl(process.env.ROOM_TTL_DAYS);
const platform = createPlatform(__dirname, DATA_DIR);
const startedAt = Date.now();
const IS_TEST_RUNTIME = process.env.NODE_ENV === "test";
const MIN_AUTOMATION_TIMEOUT_SECONDS = IS_TEST_RUNTIME ? 1 : 5;
const MIN_HOST_FAILOVER_SECONDS = IS_TEST_RUNTIME ? 1 : 15;
const AUTOMATION_TICK_MS = IS_TEST_RUNTIME ? 100 : 1000;
const AUTO_ADVANCE_DELAY_MS = IS_TEST_RUNTIME ? 120 : 1200;
const AUTO_EVENT_DELAY_MS = IS_TEST_RUNTIME ? 180 : 1800;
const AUTO_PHASE_DELAY_MS = IS_TEST_RUNTIME ? 80 : 800;
const requestBuckets = new Map();
const roomStateWaiters = new Map();
const networkMetrics = { requests: 0, limited: 0, stateRequests: 0, longPolls: 0, longPollTimeouts: 0, longPollWakeups: 0 };
const rooms = new Map();
const roomStore = createRoomStore({
  dataDir: DATA_DIR,
  schema: ROOM_SCHEMA,
  productVersion: VERSION,
  ttlMs: ROOM_TTL_MS,
  getRooms: () => rooms.values(),
  legacyFiles: LEGACY_SAVE_FILES
});
const SKIP_VOTE = "__skip__";
const VOTE_SYSTEMS = new Set(["exile", "tribunal"]);
const VOTE_VISIBILITIES = new Set(["secret", "open"]);
const TIE_RULES = new Set(["no_action", "runoff"]);
const AUTOMATION_MODES = new Set(["off", "assist", "auto"]);
const SCENARIO_MODES = new Set(["procedural", "catalog"]);
const SETTING_IDS = new Set(Object.keys(SETTINGS));
const SANCTION_LABELS = { exile: "Вигнання", detention: "Ізоляція на раунд", silence: "Позбавлення голосу", skip: "Без санкцій" };
function clampRoomTtl(value) {
  const days = Math.max(1, Math.min(365, Number(value) || 30));
  return days * 24 * 60 * 60 * 1000;
}

function normalizeTieRule(value) {
  return value === "no_action" ? "no_action" : "runoff";
}
function normalizeAutomationMode(value) {
  return AUTOMATION_MODES.has(value) ? value : "off";
}
function normalizeAutomationSettings(settings = {}) {
  return {
    mode: normalizeAutomationMode(settings.automationMode),
    inactivitySeconds: clamp(Number(settings.inactivityTimeoutSeconds) || 90, MIN_AUTOMATION_TIMEOUT_SECONDS, 600),
    phaseSeconds: clamp(Number(settings.phaseTimeoutSeconds) || 180, MIN_AUTOMATION_TIMEOUT_SECONDS, 1800)
  };
}
const OUTSIDE_ROLES = [
  { id: "scout", name: "Зовнішній розвідник", description: "Має підвищений шанс безпечно досліджувати поверхню й відкривати нові маршрути." },
  { id: "courier", name: "Кур’єр пустки", description: "Краще знаходить припаси та швидше зміцнює довіру під час допомоги сховищу." },
  { id: "broadcaster", name: "Радіоголос", description: "Посилює переговори й допомагає зовнішньому табору будувати політичні відносини зі сховищем." },
  { id: "investigator", name: "Спостерігач", description: "Уважніше досліджує територію та швидше знаходить корисні сліди й об’єкти." }
];

const OUTSIDE_CAMP_ACTIONS = [
  { id: "scavenge", name: "Пошук припасів", description: "Ризикнути й поповнити один із запасів зовнішнього табору." },
  { id: "fortify", name: "Укріпити табір", description: "Витратити брухт, поліпшити укриття та знизити загрозу." },
  { id: "explore", name: "Дослідити поверхню", description: "Просунути розвідку території та відкрити постійні переваги." },
  { id: "negotiate", name: "Запропонувати обмін", description: "Надіслати сховищу угоду, яку активні мешканці мають схвалити більшістю." },
  { id: "support", name: "Допомогти сховищу", description: "Безумовно передати частину запасів і підвищити довіру." },
  { id: "rest", name: "Відновитися", description: "Знизити власний стрес і підтримати мораль табору." }
];
const OUTSIDE_DISCOVERIES = [
  { id: "dry_store", name: "Сухий склад", description: "Знайдено герметичне приміщення із залишками харчів.", effects: { food: 8, scrap: 2 } },
  { id: "water_source", name: "Захищене джерело", description: "Табір отримав стабільніший доступ до води.", effects: { water: 10, morale: 2 } },
  { id: "relay", name: "Старий ретранслятор", description: "Зв’язок зі сховищем став надійнішим.", effects: { energy: 6, trust: 8, threat: -3 } },
  { id: "clinic", name: "Покинутий медпункт", description: "Уціліли базові медикаменти й перев’язувальні матеріали.", effects: { medicine: 7 } },
  { id: "tunnel", name: "Підземний маршрут", description: "Відкрито безпечний шлях між районом табору та сховищем.", effects: { shelter: 8, trust: 5, threat: -5 } }
];
function newOutsideCamp() {
  return {
    resources: { food: 12, water: 12, energy: 5, medicine: 5, scrap: 8 },
    shelter: 18,
    morale: 55,
    trust: 0,
    threat: 24,
    exploration: 0,
    discoveries: [],
    joinedPlayerIds: [],
    history: [],
    proposals: [],
    allied: false,
    collapsed: false,
    createdRound: null
  };
}
function ensureOutsideCamp(room) {
  if (!room.game) return null;
  room.game.outsideCamp ||= newOutsideCamp();
  const camp = room.game.outsideCamp;
  camp.resources ||= { food: 12, water: 12, energy: 5, medicine: 5, scrap: 8 };
  for (const key of ["food", "water", "energy", "medicine", "scrap"]) camp.resources[key] = clamp(Number(camp.resources[key] || 0), 0, 100);
  camp.shelter = clamp(Number(camp.shelter ?? 18), 0, 100);
  camp.morale = clamp(Number(camp.morale ?? 55), 0, 100);
  camp.trust = clamp(Number(camp.trust || 0), -100, 100);
  camp.threat = clamp(Number(camp.threat ?? 24), 0, 100);
  camp.exploration = clamp(Number(camp.exploration || 0), 0, 100);
  camp.discoveries ||= [];
  camp.joinedPlayerIds ||= [];
  camp.history ||= [];
  camp.proposals ||= [];
  camp.allied = Boolean(camp.allied);
  camp.collapsed = Boolean(camp.collapsed);
  return camp;
}
function outsideCampMembers(room) {
  return room.players.filter((player) => !player.active);
}
function outsideResourceName(key) {
  return ({ food: "їжа", water: "вода", medicine: "медицина", scrap: "брухт", energy: "енергія" })[key] || key;
}
function joinOutsideCamp(room, player) {
  const camp = ensureOutsideCamp(room);
  if (!camp || camp.joinedPlayerIds.includes(player.id)) return camp;
  camp.joinedPlayerIds.push(player.id);
  camp.createdRound ||= room.game.round;
  camp.resources.food = clamp(camp.resources.food + 3, 0, 100);
  camp.resources.water = clamp(camp.resources.water + 3, 0, 100);
  camp.resources.scrap = clamp(camp.resources.scrap + 2, 0, 100);
  camp.morale = clamp(camp.morale + 2, 0, 100);
  camp.history.push({ round: room.game.round, type: "arrival", text: `${player.name} приєднався / приєдналася до зовнішнього табору.` });
  camp.history = camp.history.slice(-40);
  return camp;
}
function currentOutsideProposal(room) {
  const camp = ensureOutsideCamp(room);
  return [...(camp?.proposals || [])].reverse().find((item) => item.status === "pending") || null;
}
function outsideRoleActionBonus(player, actionId) {
  const roleId = player.outsideRole?.id;
  if (actionId === "scavenge" && roleId === "courier") return 0.12;
  if (actionId === "explore" && roleId === "scout") return 0.14;
  if (actionId === "explore" && roleId === "investigator") return 0.08;
  if (actionId === "negotiate" && roleId === "broadcaster") return 0.08;
  if (actionId === "support" && roleId === "courier") return 0.05;
  return 0;
}
function applyOutsideDiscovery(room, player) {
  const camp = ensureOutsideCamp(room);
  const threshold = (camp.discoveries.length + 1) * 20;
  if (camp.exploration < threshold) return null;
  const available = OUTSIDE_DISCOVERIES.filter((item) => !camp.discoveries.some((found) => found.id === item.id));
  const discovery = sample(available);
  if (!discovery) return null;
  camp.discoveries.push({ id: discovery.id, name: discovery.name, description: discovery.description, round: room.game.round });
  const effects = discovery.effects || {};
  for (const key of ["food", "water", "energy", "medicine", "scrap"]) if (effects[key]) camp.resources[key] = clamp(camp.resources[key] + Number(effects[key]), 0, 100);
  if (effects.shelter) camp.shelter = clamp(camp.shelter + Number(effects.shelter), 0, 100);
  if (effects.morale) camp.morale = clamp(camp.morale + Number(effects.morale), 0, 100);
  if (effects.trust) camp.trust = clamp(camp.trust + Number(effects.trust), -100, 100);
  if (effects.threat) camp.threat = clamp(camp.threat + Number(effects.threat), 0, 100);
  const text = `${player.name} відкрив / відкрила об’єкт «${discovery.name}»: ${discovery.description}`;
  camp.history.push({ round: room.game.round, type: "discovery", text });
  room.game.log.push(`Зовнішній табір відкрив об’єкт «${discovery.name}».`);
  return discovery;
}
function createOutsideProposal(room, player, body) {
  const camp = ensureOutsideCamp(room);
  if (currentOutsideProposal(room)) throw new Error("Спершу потрібно завершити голосування за попередню зовнішню угоду.");
  const offerResource = ["food", "water", "medicine"].includes(body.offerResource) ? body.offerResource : "food";
  const requestResource = ["food", "water", "medicine", "energy"].includes(body.requestResource) ? body.requestResource : "energy";
  const offerAmount = clamp(Math.floor(Number(body.offerAmount || 2)), 1, 6);
  const requestAmount = clamp(Math.floor(Number(body.requestAmount || 2)), 1, 6);
  if (camp.resources[offerResource] < offerAmount) throw new Error("У зовнішнього табору недостатньо запропонованого ресурсу.");
  camp.resources[offerResource] -= offerAmount;
  const proposal = {
    id: uid("outside_deal"),
    playerId: player.id,
    playerName: player.name,
    round: room.game.round,
    offerResource,
    offerAmount,
    requestResource,
    requestAmount,
    message: String(body.message || "").trim().slice(0, 180),
    status: "pending",
    votes: {},
    reserved: true,
    createdAt: Date.now()
  };
  camp.proposals.push(proposal);
  camp.proposals = camp.proposals.slice(-12);
  room.game.log.push(`${player.name} від імені зовнішнього табору пропонує обмін: ${outsideResourceName(offerResource)} +${offerAmount} в обмін на ${outsideResourceName(requestResource)} ${requestAmount}.`);
  return proposal;
}
function resolveOutsideProposal(room, proposal, accepted, reason = "") {
  const camp = ensureOutsideCamp(room);
  if (!proposal || proposal.status !== "pending") return null;
  if (accepted) {
    const available = Number(room.game.shelter.resources[proposal.requestResource] || 0);
    if (available < proposal.requestAmount) accepted = false;
  }
  if (accepted) {
    applyEffects(room, { [proposal.offerResource]: proposal.offerAmount });
    room.game.shelter.resources[proposal.requestResource] = clamp(room.game.shelter.resources[proposal.requestResource] - proposal.requestAmount, 0, 100);
    camp.resources[proposal.requestResource] = clamp(Number(camp.resources[proposal.requestResource] || 0) + proposal.requestAmount, 0, 100);
    camp.trust = clamp(camp.trust + 10, -100, 100);
    camp.morale = clamp(camp.morale + 3, 0, 100);
    proposal.status = "accepted";
    proposal.result = "Угоду схвалено й виконано.";
    room.game.log.push(`Громада схвалила угоду із зовнішнім табором. Довіра між групами зросла.`);
  } else {
    if (proposal.reserved) camp.resources[proposal.offerResource] = clamp(camp.resources[proposal.offerResource] + proposal.offerAmount, 0, 100);
    camp.trust = clamp(camp.trust - 4, -100, 100);
    proposal.status = "rejected";
    proposal.result = reason || "Громада відхилила угоду.";
    room.game.log.push(`Угоду із зовнішнім табором відхилено.`);
  }
  proposal.reserved = false;
  proposal.resolvedRound = room.game.round;
  proposal.resolvedAt = Date.now();
  if (!camp.allied && camp.trust >= 30 && !camp.collapsed) {
    camp.allied = true;
    room.game.shelter.allies += 1;
    room.game.log.push("Зовнішній табір став постійним союзником сховища.");
  }
  camp.history.push({ round: room.game.round, type: "deal", text: `${proposal.playerName}: ${proposal.result}` });
  camp.history = camp.history.slice(-40);
  return proposal;
}
function voteOutsideProposal(room, player, body) {
  if (!room.game || !isSocialPhase(room.game.phase)) throw new Error("Рішення щодо зовнішньої угоди доступне лише під час соціальної фази.");
  if (player.id !== room.hostPlayerId) throw new Error("Зовнішню угоду схвалює або відхиляє хост як окреме ресурсне рішення, без другого загального голосування.");
  if (!canParticipateInDecision(room, player, "outside_deal")) throw new Error("Зараз ви не можете ухвалити це рішення.");
  const proposal = currentOutsideProposal(room);
  if (!proposal) throw new Error("Активної зовнішньої угоди немає.");
  const choice = body.choice === "accept" ? "accept" : body.choice === "reject" ? "reject" : null;
  if (!choice) throw new Error("Оберіть схвалити або відхилити угоду.");
  proposal.votes = { [player.id]: choice };
  resolveOutsideProposal(room, proposal, choice === "accept");
}
function outsideCampPublic(room, requester) {
  if (!room.game?.features?.outsidePlay) return null;
  const camp = ensureOutsideCamp(room);
  const members = outsideCampMembers(room);
  const proposal = currentOutsideProposal(room) || [...camp.proposals].reverse()[0] || null;
  const voters = eligibleVoters(room, "outside_deal");
  const yes = proposal ? voters.filter((voter) => proposal.votes?.[voter.id] === "accept").length : 0;
  const no = proposal ? voters.filter((voter) => proposal.votes?.[voter.id] === "reject").length : 0;
  return {
    active: members.length > 0,
    members: members.map((player) => ({ id: player.id, name: player.name, role: player.outsideRole?.name || "Мешканець поверхні", actionUsed: player.outsideActionUsedRound === room.game.round })),
    resources: { ...camp.resources },
    shelter: camp.shelter,
    morale: camp.morale,
    trust: camp.trust,
    threat: camp.threat,
    exploration: camp.exploration,
    discoveries: camp.discoveries.map((item) => ({ ...item })),
    allied: camp.allied,
    collapsed: camp.collapsed,
    actions: OUTSIDE_CAMP_ACTIONS.map((item) => ({ ...item })),
    canAct: !requester.active && isSocialPhase(room.game.phase) && requester.outsideActionUsedRound !== room.game.round && !camp.collapsed,
    history: camp.history.slice(-12),
    proposal: proposal ? {
      id: proposal.id,
      playerName: proposal.playerName,
      offerResource: proposal.offerResource,
      offerAmount: proposal.offerAmount,
      requestResource: proposal.requestResource,
      requestAmount: proposal.requestAmount,
      message: proposal.message,
      status: proposal.status,
      result: proposal.result || null,
      yes,
      no,
      required: 1,
      myVote: proposal.votes?.[requester.id] || null,
      canVote: proposal.status === "pending" && requester.id === room.hostPlayerId && canParticipateInDecision(room, requester, "outside_deal") && isSocialPhase(room.game.phase)
    } : null
  };
}
function useLegacyOutsideRoleAction(room, player, body, role) {
  if (role.id === "scout") {
    const candidates = eventPool(room);
    room.game.preparedEvent ||= JSON.parse(JSON.stringify(chooseContentEntry(candidates, room.settings.absurdity)));
    player.character.privateNotes.push(`Розвідка: наступна подія — «${room.game.preparedEvent.title}». ${room.game.preparedEvent.description}`);
    room.game.log.push("Зовнішній розвідник передав зашифроване попередження про майбутню загрозу.");
  } else if (role.id === "courier") {
    const resource = ["food", "water", "energy", "medicine"].includes(body.resource) ? body.resource : "food";
    applyEffects(room, { [resource]: 5 });
    room.game.log.push(`${player.name} передає зі зовнішнього світу невеликий запас: ${resourceName(resource)} +5.`);
  } else if (role.id === "broadcaster") {
    const message = String(body.message || "").trim().slice(0, 180);
    if (message.length < 3) throw new Error("Введіть повідомлення.");
    applyEffects(room, { morale: 1 });
    room.game.log.push(`Радіопередача від ${player.name}: «${message}»`);
  } else if (role.id === "investigator") {
    const target = room.players.find((item) => item.id === body.targetId && item.active);
    if (!target) throw new Error("Оберіть активного гравця.");
    const hidden = characterKeysForRoom(room).filter((key) => !target.character.revealed[key]);
    if (!hidden.length) throw new Error("У цього гравця вже все відкрито.");
    const key = sample(hidden);
    target.character.revealed[key] = true;
    room.game.log.push(`Зовнішній спостерігач оприлюднив характеристику «${characterKeyLabel(room, key)}» гравця ${target.name}.`);
  }
}
function useOutsideCampAction(room, player, body) {
  const role = assignOutsideRole(player, room);
  const camp = joinOutsideCamp(room, player);
  const actionId = String(body.campAction || "");
  if (!actionId) {
    useLegacyOutsideRoleAction(room, player, body, role);
    return { actionId: role.id, text: `Використано зовнішню роль «${role.name}».` };
  }
  if (!OUTSIDE_CAMP_ACTIONS.some((item) => item.id === actionId)) throw new Error("Невідома дія зовнішнього табору.");
  if (camp.collapsed) throw new Error("Зовнішній табір зруйнований і не може виконувати дії.");
  let text = "";
  let success = true;
  const bonus = outsideRoleActionBonus(player, actionId);
  if (actionId === "scavenge") {
    const resource = ["food", "water", "energy", "medicine", "scrap"].includes(body.resource) ? body.resource : "food";
    const chance = clamp(0.62 + bonus + camp.exploration * 0.001 - camp.threat * 0.003, 0.20, 0.92);
    const roll = random();
    success = roll <= chance;
    if (success) {
      const amount = resource === "medicine" ? randomInt(2, 5) : resource === "energy" ? randomInt(3, 7) : randomInt(4, 9);
      camp.resources[resource] = clamp(camp.resources[resource] + amount, 0, 100);
      camp.morale = clamp(camp.morale + 1, 0, 100);
      text = `${player.name} знайшов / знайшла ${outsideResourceName(resource)} +${amount}.`;
    } else {
      camp.threat = clamp(camp.threat + 6, 0, 100);
      player.character.stress = clamp((player.character.stress || 0) + 1, 0, 5);
      if (random() < 0.28) player.character.injury = clamp((player.character.injury || 0) + 1, 0, 5);
      text = `${player.name} повернувся / повернулася без припасів; загроза навколо табору зросла.`;
    }
  } else if (actionId === "fortify") {
    if (camp.resources.scrap < 4) throw new Error("Для укріплення потрібно щонайменше 4 одиниці брухту.");
    camp.resources.scrap -= 4;
    camp.shelter = clamp(camp.shelter + 9, 0, 100);
    camp.threat = clamp(camp.threat - 6, 0, 100);
    camp.morale = clamp(camp.morale + 1, 0, 100);
    text = `${player.name} укріпив / укріпила табір: укриття +9, загроза −6.`;
  } else if (actionId === "explore") {
    const chance = clamp(0.58 + bonus + camp.shelter * 0.001 - camp.threat * 0.002, 0.22, 0.92);
    success = random() <= chance;
    if (success) {
      const progress = randomInt(8, 14);
      camp.exploration = clamp(camp.exploration + progress, 0, 100);
      camp.resources.scrap = clamp(camp.resources.scrap + 2, 0, 100);
      text = `${player.name} дослідив / дослідила поверхню: прогрес +${progress}, брухт +2.`;
      const discovery = applyOutsideDiscovery(room, player);
      if (discovery) text += ` Відкрито «${discovery.name}».`;
    } else {
      camp.threat = clamp(camp.threat + 7, 0, 100);
      player.character.stress = clamp((player.character.stress || 0) + 1, 0, 5);
      text = `${player.name} не знайшов / не знайшла безпечного маршруту; загроза +7.`;
    }
  } else if (actionId === "negotiate") {
    createOutsideProposal(room, player, body);
    camp.trust = clamp(camp.trust + Math.round(bonus * 25), -100, 100);
    text = `${player.name} підготував / підготувала угоду для сховища.`;
  } else if (actionId === "support") {
    const resource = ["food", "water", "medicine"].includes(body.resource) ? body.resource : "food";
    const amount = clamp(Math.floor(Number(body.amount || 3)), 1, 5);
    if (camp.resources[resource] < amount) throw new Error("У табору недостатньо вибраного ресурсу.");
    camp.resources[resource] -= amount;
    applyEffects(room, { [resource]: amount });
    camp.trust = clamp(camp.trust + 6 + Math.round(bonus * 20), -100, 100);
    camp.morale = clamp(camp.morale + 1, 0, 100);
    text = `${player.name} безумовно передав / передала сховищу ${outsideResourceName(resource)} +${amount}.`;
  } else if (actionId === "rest") {
    player.character.stress = clamp((player.character.stress || 0) - 2, 0, 5);
    camp.morale = clamp(camp.morale + 5, 0, 100);
    camp.threat = clamp(camp.threat - 2, 0, 100);
    text = `${player.name} відновився / відновилася й підтримав / підтримала мораль табору.`;
  }
  if (!camp.allied && camp.trust >= 30 && !camp.collapsed) {
    camp.allied = true;
    room.game.shelter.allies += 1;
    text += " Табір став союзником сховища.";
  }
  camp.history.push({ round: room.game.round, type: actionId, playerId: player.id, playerName: player.name, success, text });
  camp.history = camp.history.slice(-40);
  room.game.log.push(`Зовнішній табір: ${text}`);
  return { actionId, success, text };
}
function consumeOutsideCampRound(room) {
  if (!room.game?.features?.outsidePlay) return;
  const camp = ensureOutsideCamp(room);
  const members = outsideCampMembers(room);
  if (!members.length) return;
  const proposal = currentOutsideProposal(room);
  if (proposal) resolveOutsideProposal(room, proposal, false, "Строк обговорення угоди минув.");
  const cost = Math.max(2, members.length * 2);
  let shortage = 0;
  for (const key of ["food", "water"]) {
    const available = camp.resources[key];
    if (available < cost) shortage += 1;
    camp.resources[key] = clamp(available - cost, 0, 100);
  }
  const energyCost = Math.max(1, members.length);
  if (camp.resources.energy < energyCost) {
    shortage += 1;
    camp.shelter = clamp(camp.shelter - 3, 0, 100);
  }
  camp.resources.energy = clamp(camp.resources.energy - energyCost, 0, 100);
  if (shortage) {
    camp.morale = clamp(camp.morale - shortage * 8, 0, 100);
    camp.threat = clamp(camp.threat + shortage * 4, 0, 100);
    for (const member of members) member.character.stress = clamp((member.character.stress || 0) + 1, 0, 5);
  } else camp.morale = clamp(camp.morale + 1, 0, 100);
  if (camp.shelter < 25) {
    camp.morale = clamp(camp.morale - 4, 0, 100);
    camp.threat = clamp(camp.threat + 3, 0, 100);
  }
  camp.threat = clamp(camp.threat - Math.floor(camp.shelter / 30), 0, 100);
  camp.collapsed = camp.morale <= 0 || (camp.resources.food <= 0 && camp.resources.water <= 0 && camp.shelter < 15 && camp.threat >= 80);
  const text = camp.collapsed
    ? `Зовнішній табір не пережив наслідки раунду ${room.game.round}.`
    : `Зовнішній табір витратив по ${cost} їжі та води й ${energyCost} енергії для ${members.length} мешканців.`;
  camp.history.push({ round: room.game.round, type: "upkeep", text });
  camp.history = camp.history.slice(-40);
  room.game.log.push(text);
}
function outsideCampFinalResult(room) {
  if (!room.game?.features?.outsidePlay) return null;
  const camp = ensureOutsideCamp(room);
  const members = outsideCampMembers(room);
  if (!members.length && !camp.joinedPlayerIds.length) return null;
  const resourceScore = Math.round((camp.resources.food + camp.resources.water + camp.resources.energy + camp.resources.medicine + Math.min(100, camp.resources.scrap * 4)) / 5);
  const trustScore = clamp(50 + camp.trust / 2, 0, 100);
  const score = clamp(Math.round((resourceScore + camp.shelter + camp.morale + (100 - camp.threat) + camp.exploration + trustScore) / 6), 0, 100);
  const survived = !camp.collapsed && score >= 35 && members.length > 0;
  const verdict = camp.collapsed ? "Табір зруйновано" : score >= 72 ? "Незалежна громада поверхні" : score >= 55 ? "Стійкий зовнішній табір" : score >= 35 ? "Крихке виживання зовні" : "Розпад табору";
  const description = survived
    ? (camp.allied ? "Вигнанці зберегли власну громаду й налагодили постійний союз зі сховищем." : "Вигнанці зуміли вижити окремо, але їхні відносини зі сховищем залишилися нестабільними.")
    : "Запасів, захисту або внутрішньої стійкості не вистачило для окремого довгострокового виживання.";
  return {
    exists: true,
    survived,
    score,
    verdict,
    description,
    allied: camp.allied,
    members: members.map((player) => ({ id: player.id, name: player.name, role: player.outsideRole?.name || "Мешканець поверхні" })),
    resources: { ...camp.resources },
    shelter: camp.shelter,
    morale: camp.morale,
    trust: camp.trust,
    threat: camp.threat,
    exploration: camp.exploration,
    discoveries: camp.discoveries.map((item) => ({ ...item })),
    history: camp.history.slice(-20)
  };
}
const OPERATION_SUPPORT_ROLES = {
  equipment: {
    id: "equipment", name: "Підготовка спорядження", target: "expedition",
    description: "Перевіряє спорядження та додає +4% до шансу експедиції (до +12%)."
  },
  communications: {
    id: "communications", name: "Зв’язок і координація", target: "expedition",
    description: "Додає +3% до шансу експедиції (до +9%) і підвищує шанс уникнути травми після невдачі."
  },
  guard: {
    id: "guard", name: "Охорона сховища", target: "expedition",
    description: "Не підвищує шанс успіху, але зменшує втрати ресурсів після невдалої експедиції на 15% (до 30%)."
  },
  repair_assist: {
    id: "repair_assist", name: "Допомога ремонтній бригаді", target: "repair",
    description: "Додає +4% до шансу ремонту (до +16%) і знижує ризик травми виконавця."
  }
};
function operationSupportRoleList() {
  return Object.values(OPERATION_SUPPORT_ROLES).map((item) => ({ ...item }));
}
function ensureOperationSupport(room) {
  if (!room.game) return { round: 0, contributions: {} };
  if (!room.game.operationSupport || Number(room.game.operationSupport.round) !== Number(room.game.round)) {
    room.game.operationSupport = { round: Number(room.game.round || 1), contributions: {} };
  }
  room.game.operationSupport.contributions ||= {};
  return room.game.operationSupport;
}
function operationSupportContribution(room, playerId) {
  return ensureOperationSupport(room).contributions?.[playerId] || null;
}
function publicOperationSupport(room) {
  const support = ensureOperationSupport(room);
  return Object.entries(support.contributions || {}).map(([playerId, entry]) => {
    const player = room.players.find((item) => item.id === playerId);
    const role = OPERATION_SUPPORT_ROLES[entry.roleId];
    if (!player || !role) return null;
    return {
      playerId, playerName: player.name, roleId: role.id, roleName: role.name,
      target: role.target, usedFor: entry.usedFor || null, submittedAt: Number(entry.submittedAt || 0)
    };
  }).filter(Boolean).sort((a, b) => a.submittedAt - b.submittedAt || a.playerName.localeCompare(b.playerName, 'uk'));
}
function eligibleOperationSupport(room, target, excludedPlayerIds = []) {
  const excluded = new Set((excludedPlayerIds || []).map(String));
  return publicOperationSupport(room).filter((entry) => {
    if (entry.target !== target || entry.usedFor || excluded.has(entry.playerId)) return false;
    const player = room.players.find((item) => item.id === entry.playerId);
    return Boolean(player?.active && !isDetained(room, player));
  });
}
function markOperationSupportUsed(room, entries, usedFor) {
  const support = ensureOperationSupport(room);
  for (const entry of entries || []) {
    const stored = support.contributions?.[entry.playerId];
    if (!stored || stored.usedFor) continue;
    stored.usedFor = usedFor;
    const player = room.players.find((item) => item.id === entry.playerId);
    if (player?.character) {
      player.character.supportOperations = Number(player.character.supportOperations || 0) + 1;
    }
  }
}
function setOperationSupport(room, player, body) {
  requireModeAction(room, player, "operations");
  if (!room.game?.features?.operations) throw new Error("У цьому режимі командні операції вимкнено.");
  const support = ensureOperationSupport(room);
  const previous = support.contributions[player.id] || null;
  if (previous?.usedFor) throw new Error("Ваш внесок уже використано в операції цього раунду.");
  const roleId = String(body.roleId || "");
  if (!roleId) {
    delete support.contributions[player.id];
    room.game.log.push(`${player.name} скасовує попередній внесок в операції.`);
    return;
  }
  const role = OPERATION_SUPPORT_ROLES[roleId];
  if (!role) throw new Error("Оберіть доступну роль внеску.");
  if (role.target === "expedition" && (room.game.expeditionRounds || []).includes(room.game.round)) throw new Error("Експедицію цього раунду вже завершено.");
  if (role.target === "repair" && (room.game.repairRounds || []).includes(room.game.round)) throw new Error("Ремонт цього раунду вже завершено.");
  support.contributions[player.id] = { roleId, submittedAt: Date.now(), usedFor: null };
  room.game.log.push(`${player.name} бере на себе внесок «${role.name}».`);
}

const GAME_MODES = {
  classic: {
    id: "classic", name: "Класичний відбір",
    description: "Соціальний відбір: розкриття характеристик, обговорення, одна криза та голосування за місце у сховищі.",
    hiddenRoles: false, elimination: true, operations: false, treatment: false, itemTrade: false, personalGoals: false, abilities: true, outsidePlay: false, endWhenCapacityReached: true
  },
  survival: {
    id: "survival", name: "Спільне виживання",
    description: "Кооперативний цикл без вигнання: планування, окрема фаза операцій, спільне рішення кризи та наслідки.",
    hiddenRoles: false, elimination: false, operations: true, treatment: true, itemTrade: true, personalGoals: true, abilities: true, outsidePlay: false, endWhenCapacityReached: false
  },
  factions: {
    id: "factions", name: "Фракції та зрадники",
    description: "Соціальна дедукція: розкриття, переговори, таємні рольові дії та рішення громади. Ресурсні операції не відволікають від інтриг.",
    hiddenRoles: true, elimination: true, operations: false, treatment: false, itemTrade: true, personalGoals: true, abilities: true, outsidePlay: false, endWhenCapacityReached: false
  },
  advanced: {
    id: "advanced", name: "Розширена гра",
    description: "Модульний цикл для досвідченої групи: базовий відбір доповнюється не більше ніж двома обраними системами.",
    hiddenRoles: false, elimination: true, operations: false, treatment: false, itemTrade: false, personalGoals: false, abilities: true, outsidePlay: false, endWhenCapacityReached: false
  }
};
const ADVANCED_MODULE_LIMIT = 2;
const DEFAULT_ADVANCED_MODULES = ["operations"];
const ADVANCED_MODULES = {
  operations: { id: "operations", name: "Експедиції та ремонт", description: "Додає окрему фазу операцій, експедиції й плановий ремонт.", features: { operations: true } },
  medicine: { id: "medicine", name: "Медицина", description: "Додає лікування, медичні витрати й догляд під час фази операцій.", features: { treatment: true } },
  roles: { id: "roles", name: "Приховані ролі й цілі", description: "Додає таємні фракції, особисті цілі та окрему фазу інтриг.", features: { hiddenRoles: true, personalGoals: true } },
  trade: { id: "trade", name: "Обмін предметами", description: "Дозволяє передавати предмети іншим учасникам під час обговорення.", features: { itemTrade: true } },
  outside: { id: "outside", name: "Гра після вигнання", description: "Після вигнання персонаж отримує зовнішню роль, дію та право на апеляцію.", features: { outsidePlay: true } }
};
function normalizeAdvancedModules(value, mode = "advanced", setting = "modern") {
  if (mode !== "advanced" || setting === "detective") return [];
  const source = Array.isArray(value) ? value : DEFAULT_ADVANCED_MODULES;
  const result = [];
  for (const raw of source) {
    const id = String(raw || "");
    if (!ADVANCED_MODULES[id] || result.includes(id)) continue;
    // Приховані фракції та повноцінна гра вигнанців створюють дві паралельні
    // соціальні гри, тому сервер не дозволяє ввімкнути їх одночасно.
    if ((id === "outside" && result.includes("roles")) || (id === "roles" && result.includes("outside"))) continue;
    result.push(id);
    if (result.length >= ADVANCED_MODULE_LIMIT) break;
  }
  return result;
}
function applyConfigurationSafety(settings) {
  const mode = modeConfig(settings);
  if (settings.setting === "detective" || mode.hiddenRoles) settings.voteVisibility = "secret";
  const modules = normalizeAdvancedModules(settings.advancedModules, settings.mode, settings.setting);
  settings.advancedModules = modules;
  const complexAutoHost = settings.setting === "detective" || settings.mode === "factions" || settings.mode === "advanced" || modules.length > 0 || settings.voteSystem === "tribunal";
  if (normalizeAutomationMode(settings.automationMode) === "auto" && complexAutoHost) settings.automationMode = "assist";
  return settings;
}
function advancedModuleSummary(settingsOrRoom) {
  const settings = settingsOrRoom?.settings || settingsOrRoom || {};
  return normalizeAdvancedModules(settings.advancedModules, settings.mode, settings.setting)
    .map((id) => ({ ...ADVANCED_MODULES[id], features: { ...ADVANCED_MODULES[id].features } }));
}
const PHASE_DEFINITIONS = {
  reveal: { label: "Розкриття", purpose: "Відкрити характеристики персонажів." },
  discussion: { label: "Обговорення", purpose: "Зіставити відкриті дані й підготувати рішення." },
  planning: { label: "Планування", purpose: "Визначити головну проблему раунду та розподілити відповідальність." },
  operations: { label: "Операції", purpose: "Провести експедицію, ремонт, лікування та обмін." },
  negotiation: { label: "Переговори", purpose: "Домовлятися, формувати союзи й перевіряти версії." },
  intrigue: { label: "Інтриги", purpose: "Використати приховані рольові дії перед рішенням громади." },
  investigation: { label: "Розслідування", purpose: "Проводити приватні перевірки й зіставляти докази." },
  event: { label: "Криза", purpose: "Обрати спільне рішення поточної загрози." },
  elimination: { label: "Рішення громади", purpose: "Застосувати санкцію або формальне звинувачення." },
  round_end: { label: "Наслідки", purpose: "Підсумувати раунд і застосувати витрати." },
  final: { label: "Фінал", purpose: "Партію завершено." }
};
const MODE_PHASE_LOOPS = {
  classic: ["reveal", "discussion", "event", "elimination", "round_end"],
  survival: ["planning", "operations", "event", "round_end"],
  factions: ["reveal", "negotiation", "intrigue", "elimination", "round_end"]
};
const DETECTIVE_PHASE_LOOP = ["reveal", "investigation", "event", "elimination", "round_end"];
const TUTORIAL_PHASE_LOOPS = {
  1: ["reveal", "discussion", "event", "round_end"],
  2: ["reveal", "discussion", "event", "elimination", "round_end"]
};
const TUTORIAL_CATASTROPHE = {
  id: "tutorial_infrastructure_collapse",
  title: "Ланцюговий колапс інфраструктури",
  description: "Після серії масштабних відключень міста втратили електрику, воду, зв’язок і централізоване постачання. Навчальна група має стабілізувати невелике сховище та навчитися ухвалювати спільні рішення.",
  threat: "Холод, забруднене повітря й нестача базових ресурсів",
  procedural: false,
  modules: null,
  pressure: 1,
  startingEffects: {},
  hiddenComplication: null,
  complicationRevealRound: null,
  lore: {
    cause: "Каскадна аварія енергомережі зупинила насосні станції, транспорт і системи зв’язку.",
    collapse: "За кілька днів локальні запаси вичерпалися, а міські служби втратили можливість координувати допомогу.",
    surface: "Поверхня частково придатна для коротких виходів, але погода, дим і нестабільні будівлі залишаються небезпечними.",
    horizon: "Перші тижні визначать, чи зможе громада перейти від аварійного виживання до стабільного поселення."
  }
};
const TUTORIAL_SHELTER = {
  title: "Навчальне сховище №7",
  description: "Компактний цивільний комплекс із простими системами, на яких легко побачити наслідки кожного рішення.",
  areaM2: 360,
  rooms: [
    { name: "Спальна кімната", count: 2, description: "Двоярусні ліжка й мінімальний особистий простір." },
    { name: "Технічна кімната", count: 1, description: "Генератор, щитова та інструменти." },
    { name: "Медпункт", count: 1, description: "Базовий набір першої допомоги." },
    { name: "Склад", count: 1, description: "Їжа, вода й витратні матеріали." }
  ],
  provisions: [
    { name: "Сухі пайки", quantity: 24, unit: "компл." },
    { name: "Питна вода", quantity: 48, unit: "л" },
    { name: "Аптечки", quantity: 4, unit: "шт." },
    { name: "Паливні каністри", quantity: 5, unit: "шт." }
  ],
  initialResources: { food: 72, water: 74, energy: 66, integrity: 70, medicine: 58, morale: 68 },
  modules: ["Вентиляція", "Генератор", "Водний контур", "Склад", "Медпункт", "Шлюз"]
};
const TUTORIAL_EVENTS = {
  1: {
    id: "tutorial_filters",
    title: "Перевантаження вентиляції",
    description: "Фільтри швидко забиваються пилом. Група має обрати між безпечним, швидким і ризикованим рішенням.",
    choices: [
      { id: "economy", label: "Перевести вентиляцію в ощадливий режим", success: 0.82, good: { energy: -4, integrity: 4, morale: 2 }, bad: { medicine: -4, morale: -3 }, goodText: "Навантаження знизилося, і команда виграла час для планового обслуговування.", badText: "Потік повітря виявився надто слабким, кільком людям стало зле." },
      { id: "repair", label: "Негайно розібрати й очистити фільтри", success: 0.62, good: { integrity: 8, energy: -6 }, bad: { integrity: -7, medicine: -5 }, goodText: "Фільтри повністю очищено, вентиляція працює стабільніше.", badText: "Під час поспішного ремонту пошкоджено кріплення й піднято хмару пилу." },
      { id: "ignore", label: "Почекати й не витрачати ресурси", success: 0.34, good: { energy: 2 }, bad: { medicine: -8, morale: -6 }, goodText: "Система несподівано стабілізувалася після зменшення зовнішнього пилу.", badText: "Якість повітря різко погіршилася, і група втратила медичні запаси." }
    ]
  },
  2: {
    id: "tutorial_water",
    title: "Домішки у водному контурі",
    description: "Датчики виявили забруднення резервуара. Тепер важливо врахувати не лише шанс, а й ціну успіху та провалу.",
    choices: [
      { id: "boil", label: "Кип’ятити воду малими партіями", success: 0.78, good: { water: -4, energy: -7, morale: 2 }, bad: { water: -10, energy: -8 }, goodText: "Група зберегла більшість запасу й отримала безпечну воду.", badText: "Частину води втрачено через помилку температурного режиму." },
      { id: "flush", label: "Повністю промити контур", success: 0.58, good: { water: -8, integrity: 7 }, bad: { water: -16, integrity: -5 }, goodText: "Контур очищено, а зношені з’єднання одночасно замінено.", badText: "Промивання спричинило протікання й значну втрату води." },
      { id: "tablets", label: "Використати медичні знезаражувальні засоби", success: 0.9, good: { medicine: -7, morale: 3 }, bad: { medicine: -10, morale: -2 }, goodText: "Воду швидко знезаражено без втрати основного запасу.", badText: "Дозування виявилося невдалим, довелося витратити додаткові препарати." }
    ]
  }
};
const TUTORIAL_GUIDE_STEPS = [
  { round: 1, phase: "reveal", title: "1. Познайомтеся зі своєю карткою", text: "Відкрийте вкладку «Мій персонаж». Гра запропонує дві категорії — виберіть одну й відкрийте її групі.", targetTab: "character", button: "Відкрити картку" },
  { round: 1, phase: "discussion", title: "2. Порівняйте відкриті факти", text: "Перейдіть до вкладок «Група» та «Сховище». Обговоріть, які відкриті характеристики допомагають саме за цієї катастрофи.", targetTab: "group", button: "Переглянути групу" },
  { round: 1, phase: "event", title: "3. Ухваліть перше спільне рішення", text: "Оберіть варіант кризи. До підрахунку показується якісна оцінка ризику, а після — точний шанс, кидок і всі причини результату.", targetTab: "turn", button: "Перейти до кризи" },
  { round: 1, phase: "round_end", title: "4. Розберіть наслідки", text: "Перший раунд навмисно завершується без санкцій. Перегляньте журнал причин і зміни ресурсів, а потім переходьте до другого раунду.", targetTab: "log", button: "Відкрити журнал" },
  { round: 2, phase: "reveal", title: "5. Додайте нову інформацію", text: "Відкрийте ще одну характеристику. Зверніть увагу, як нові факти можуть змінити попередню оцінку персонажа.", targetTab: "character", button: "Відкрити картку" },
  { round: 2, phase: "discussion", title: "6. Підготуйте аргументи", text: "Зіставте потреби сховища, відкриті характеристики й наслідки першого раунду. Формулюйте аргументи через користь і ризики, а не лише через симпатії.", targetTab: "group", button: "Порівняти учасників" },
  { round: 2, phase: "event", title: "7. Перевірте ціну рішення", text: "У другій кризі порівнюйте не тільки шанс успіху, а й ресурси, які витратить або втратить громада.", targetTab: "turn", button: "Перейти до кризи" },
  { round: 2, phase: "elimination", title: "8. Проведіть рішення громади", text: "Подайте відкритий голос за санкцію або «Без санкцій». Протокол пояснить вагу голосів, нічию та остаточний наслідок.", targetTab: "turn", button: "Відкрити голосування" },
  { round: 2, phase: "round_end", title: "9. Завершіть навчальну партію", text: "Перевірте останні наслідки й завершіть раунд. Фінал окремо покаже результат громади та долю кожного персонажа.", targetTab: "log", button: "Переглянути підсумок" },
  { round: 2, phase: "final", title: "Навчання завершено", text: "Ви пройшли повний базовий цикл: картка, розкриття, обговорення, криза, пояснення шансів, голосування та фінал.", targetTab: "turn", button: "Навчання завершено" }
];
function tutorialEnabled(settingsOrRoom) {
  const settings = settingsOrRoom?.settings || settingsOrRoom || {};
  return settings.tutorialEnabled === true;
}
function applyTutorialPreset(settings, playerCount = 0) {
  settings.tutorialEnabled = settings.tutorialEnabled === true;
  if (!settings.tutorialEnabled) return settings;
  const players = Math.max(0, Number(playerCount || 0));
  settings.mode = "classic";
  settings.setting = "modern";
  settings.scenarioMode = "catalog";
  settings.rounds = 2;
  settings.revealsPerRound = 1;
  settings.characterSetMode = "compact";
  settings.customCharacterKeys = [];
  settings.demographicsEnabled = false;
  settings.voteSystem = "tribunal";
  settings.voteVisibility = "open";
  settings.tieRule = "runoff";
  settings.automationMode = "off";
  settings.advancedModules = [];
  settings.hiddenRoles = false;
  settings.absurdity = 1;
  settings.contentPackId = null;
  settings.campaignId = null;
  if (players >= 3) settings.capacity = Math.max(2, Math.min(10, players - 1));
  else settings.capacity = 2;
  return settings;
}
function phaseLoopFor(settingsOrRoom) {
  const settings = settingsOrRoom?.settings || settingsOrRoom || {};
  if (settings.tutorialEnabled === true) {
    const round = Number(settingsOrRoom?.game?.round || 2);
    return [...(round <= 1 ? TUTORIAL_PHASE_LOOPS[1] : TUTORIAL_PHASE_LOOPS[2])];
  }
  if (settings.setting === "detective") return [...DETECTIVE_PHASE_LOOP];
  if (settings.mode === "advanced") {
    const features = modeConfig(settings);
    const loop = ["reveal", "discussion"];
    if (features.operations || features.treatment) loop.push("operations");
    if (features.hiddenRoles) loop.push("intrigue");
    loop.push("event", "elimination", "round_end");
    return loop;
  }
  return [...(MODE_PHASE_LOOPS[settings.mode] || MODE_PHASE_LOOPS.classic)];
}
function publicPhaseLoop(settingsOrRoom) {
  const features = modeConfig(settingsOrRoom);
  return phaseLoopFor(settingsOrRoom).map((code, index) => {
    const definition = { ...(PHASE_DEFINITIONS[code] || { label: code, purpose: "" }) };
    if (code === "operations") {
      const actions = [];
      if (features.operations) actions.push("експедицію та ремонт");
      if (features.treatment) actions.push("лікування");
      definition.purpose = actions.length ? `Провести ${actions.join(" і ")}.` : definition.purpose;
    }
    return { code, order: index + 1, ...definition };
  });
}
function isTimedPhase(phase) {
  return ["discussion", "planning", "negotiation", "intrigue", "investigation"].includes(phase);
}
function isSocialPhase(phase) {
  return ["discussion", "planning", "negotiation", "intrigue", "investigation"].includes(phase);
}
function isOperationPhase(room) {
  return room.game?.phase === "operations";
}
function isRoleActionPhase(room) {
  const phase = room.game?.phase;
  const mode = modeConfig(room.settings).id;
  if (mode === "factions" || mode === "advanced") return phase === "intrigue";
  return isSocialPhase(phase);
}
function modeConfig(settingsOrRoom) {
  const settings = settingsOrRoom?.settings || settingsOrRoom || {};
  const base = GAME_MODES[settings.mode] || GAME_MODES.classic;
  if (base.id !== "advanced") return base;
  if (settings.setting === "detective") return { ...base, hiddenRoles: true, personalGoals: true };
  const effective = { ...base };
  for (const module of advancedModuleSummary(settings)) Object.assign(effective, module.features || {});
  return effective;
}
function publicModeFeatures(settingsOrRoom) {
  const mode = modeConfig(settingsOrRoom);
  const modules = advancedModuleSummary(settingsOrRoom);
  return {
    mode: mode.id, modeName: mode.name, modeDescription: mode.description,
    hiddenRoles: mode.hiddenRoles, elimination: mode.elimination,
    operations: mode.operations, treatment: mode.treatment,
    itemTrade: mode.itemTrade, personalGoals: mode.personalGoals,
    abilities: mode.abilities, outsidePlay: mode.outsidePlay,
    endWhenCapacityReached: mode.endWhenCapacityReached,
    advancedModules: modules.map((item) => item.id),
    advancedModuleDetails: modules.map(({ id, name, description }) => ({ id, name, description })),
    phaseLoop: publicPhaseLoop(settingsOrRoom)
  };
}
const GROUP_VICTORY_SCORE = 43;
function publicVictoryRules(settingsOrRoom) {
  const settings = settingsOrRoom?.settings || settingsOrRoom || {};
  const mode = modeConfig(settings);
  if (settings.setting === "detective") {
    return {
      mode: mode.id,
      modeName: mode.name,
      group: {
        title: "Перемога розслідування",
        objective: "Правильно назвати організатора злочину та зібрати потрібну кількість незалежних ланок доказів.",
        success: "Фінальне звинувачення збігається зі справжнім організатором, а доказова сила досягає встановленого порога."
      },
      personal: {
        title: "Особистий результат",
        objective: "Дожити до завершення справи та виконати власну слідчу або приховану мету.",
        success: "Особистий статус оцінюється окремо від загального результату розслідування."
      },
      special: {
        title: "Роль у справі",
        enabled: true,
        objective: "Виконати приватну умову своєї ролі: довести справу або зірвати розслідування."
      },
      end: {
        title: "Коли завершується партія",
        objective: `Після ${Number(settings.rounds || 4)} раундів; фінальні версії та докази підраховуються один раз.`
      }
    };
  }
  const common = {
    mode: mode.id,
    modeName: mode.name,
    personal: {
      title: "Особистий результат",
      objective: mode.elimination ? (mode.outsidePlay ? "Залишитися у сховищі або забезпечити стійке виживання зовнішнього табору." : "Залишитися у фінальній групі сховища.") : "Дожити до завершення довгострокової симуляції громади.",
      success: "Цей результат не скасовується автоматично перемогою або поразкою всієї групи."
    },
    end: {
      title: "Коли завершується партія",
      objective: mode.endWhenCapacityReached
        ? `Коли у сховищі залишиться не більше ${Number(settings.capacity || 3)} активних гравців або завершиться останній раунд.`
        : `Після завершення ${Number(settings.rounds || 4)} раундів.`
    }
  };
  if (mode.id === "classic") return {
    ...common,
    group: {
      title: "Перемога групи",
      objective: "Сформувати фінальну групу в межах місткості сховища та забезпечити їй життєздатний результат.",
      success: `У відборі залишилося не більше місць, ніж у сховищі, а фінальна оцінка становить щонайменше ${GROUP_VICTORY_SCORE}/100.`
    },
    special: { title: "Додаткова умова", enabled: false, objective: "У класичному режимі немає прихованих ролей або обов’язкової додаткової мети." }
  };
  if (mode.id === "survival") return {
    ...common,
    group: {
      title: "Перемога групи",
      objective: "Разом утримати ресурси, системи та людей у стані, придатному для подальшого життя.",
      success: `Фінальна оцінка громади становить щонайменше ${GROUP_VICTORY_SCORE}/100.`
    },
    special: { title: "Особиста мета", enabled: true, objective: "Виконати видану особисту мету; вона оцінюється окремо від виживання персонажа." }
  };
  if (mode.id === "factions") return {
    ...common,
    group: {
      title: "Результат громади",
      objective: "Завершити кризу з життєздатним сховищем, попри приховані інтереси та боротьбу за місця.",
      success: `Фінальна оцінка громади становить щонайменше ${GROUP_VICTORY_SCORE}/100.`
    },
    special: { title: "Прихована роль", enabled: true, objective: "Виконати приватну умову своєї ролі або фракції; вона може суперечити інтересам громади." }
  };
  return {
    ...common,
    group: {
      title: "Перемога громади",
      objective: "Пройти відбір і завершити обрані модульні випробування з життєздатним поселенням.",
      success: `Фінальна оцінка громади становить щонайменше ${GROUP_VICTORY_SCORE}/100.`
    },
    special: mode.hiddenRoles || mode.personalGoals
      ? { title: mode.hiddenRoles ? "Прихована роль" : "Особиста мета", enabled: true, objective: "Виконати приватну умову обраного модуля; вона оцінюється окремо від особистого виживання та результату громади." }
      : { title: "Додаткова умова", enabled: false, objective: "Модуль прихованих ролей і цілей не ввімкнено." }
  };
}
function victoryRulesForPlayer(room, player) {
  const rules = publicVictoryRules(room.settings);
  if (!player?.character) return rules;
  const features = room.game?.features || publicModeFeatures(room.settings);
  const personalObjective = room.settings.setting === "detective"
    ? "Дожити до завершення справи та виконати власну мету розслідування."
    : features.elimination
      ? (features.outsidePlay ? "Залишитися у сховищі або вижити у стійкому зовнішньому таборі." : "Залишитися у фінальній групі сховища.")
      : "Дожити до кінця довгострокової симуляції громади.";
  let special = { ...rules.special };
  if (player.character.caseRole) {
    special = {
      title: player.character.caseRole.name,
      enabled: true,
      faction: player.character.caseRole.faction,
      objective: player.character.caseRole.objective
    };
  } else if (features.hiddenRoles && player.character.role) {
    special = {
      title: player.character.role.name,
      enabled: true,
      faction: player.character.role.faction,
      objective: player.character.role.objective
    };
  } else if (features.personalGoals && player.character.goal) {
    special = {
      title: "Особиста мета",
      enabled: true,
      objective: player.character.goal
    };
  }
  return {
    ...rules,
    personal: { ...rules.personal, objective: personalObjective },
    special
  };
}
const MEDICAL_ABILITY_IDS = new Set(["field_aid", "heal", "surgery", "herbalist", "quarantine", "immune", "triage", "sterilize", "healing_light", "passive_heal", "passive_med", "cryo"]);
const ELIMINATION_ABILITY_IDS = new Set(["protect", "double_vote", "persuasion", "intimidation", "leadership", "loyalty", "betrayal", "trust", "curse"]);
const EXPEDITION_ABILITY_IDS = new Set([
  "scout", "pathfinder", "navigation", "radar", "survival", "tracking", "stealth", "shadow", "clone",
  "teleport", "portal", "invisibility", "scrying", "hyperspace", "warp_drive", "scanner", "android"
]);
const DETECTIVE_ABILITY_IDS = new Set([
  "truth", "protect", "double_vote", "calm", "persuasion", "intimidation", "support", "leadership",
  "secrets", "loyalty", "betrayal", "trust", "reveal_extra", "luck", "savvy", "focus", "persistence",
  "insight", "diplomat", "prophet", "charm", "mimicry"
]);
function abilityAllowedForMode(ability, mode) {
  if (!mode.operations && (ability.target === "module" || EXPEDITION_ABILITY_IDS.has(ability.id))) return false;
  if (!mode.treatment && MEDICAL_ABILITY_IDS.has(ability.id)) return false;
  if (!mode.elimination && ELIMINATION_ABILITY_IDS.has(ability.id)) return false;
  if (!mode.hiddenRoles && ability.id === "faction") return false;
  return true;
}

const BASE_CHARACTER_KEYS = [
  "origin", "demographicContext", "attitudeToChildren", "anomaly", "age", "profession", "health", "skill",
  "trait", "item", "hobby", "phobia", "secret", "relationship"
];
const DETECTIVE_CHARACTER_KEYS = [
  "origin", "age", "profession", "health", "skill", "trait", "item", "relationship",
  "alibi", "motive", "access", "testimony", "evidenceLink", "secret"
];
const CHARACTER_KEYS = BASE_CHARACTER_KEYS;
const CHARACTER_SET_MODES = new Set(["compact", "extended", "custom"]);
const COMPACT_CHARACTER_KEYS = [
  "profession", "health", "skill", "trait", "item", "phobia", "secret", "relationship"
];
const DETECTIVE_COMPACT_CHARACTER_KEYS = [
  "profession", "health", "skill", "trait", "item", "alibi", "testimony", "secret"
];

const KEY_LABELS = {
  origin: "Походження / вид",
  demographicContext: "Стать та ідентичність",
  attitudeToChildren: "Ставлення до дітей",
  anomaly: "Аномалія",
  age: "Вік",
  profession: "Професія",
  health: "Здоров’я",
  skill: "Практична навичка",
  trait: "Риса характеру",
  item: "Початковий багаж",
  hobby: "Хобі",
  phobia: "Фобія",
  secret: "Таємниця",
  relationship: "Стосунок",
  alibi: "Алібі",
  motive: "Можливий мотив",
  access: "Доступ і можливість",
  testimony: "Свідчення",
  evidenceLink: "Зв’язок із доказами"
};
const DETECTIVE_KEY_LABELS = {
  origin: "Статус у справі",
  age: "Вік",
  profession: "Фах / роль",
  health: "Стан здоров’я",
  skill: "Слідча компетенція",
  trait: "Манера поведінки",
  item: "Предмет при собі",
  relationship: "Зв’язок з учасником",
  alibi: "Алібі",
  motive: "Можливий мотив",
  access: "Доступ і можливість",
  testimony: "Свідчення",
  evidenceLink: "Зв’язок із доказами",
  secret: "Прихована обставина"
};
function characterKeysForSetting(settingId, demographicsEnabled = true) {
  if (settingId === "detective") return DETECTIVE_CHARACTER_KEYS;
  return demographicsEnabled === false ? BASE_CHARACTER_KEYS.filter((key) => !["demographicContext", "attitudeToChildren"].includes(key)) : BASE_CHARACTER_KEYS;
}
function normalizeCharacterSet(mode, customKeys, settingId, demographicsEnabled = true) {
  const available = characterKeysForSetting(settingId, demographicsEnabled);
  const selectedMode = CHARACTER_SET_MODES.has(mode) ? mode : "extended";
  if (selectedMode === "extended") return { mode: selectedMode, keys: [...available] };
  if (selectedMode === "custom") {
    const requested = Array.isArray(customKeys) ? customKeys : [];
    const keys = available.filter((key) => requested.includes(key));
    if (keys.length >= 4) return { mode: selectedMode, keys };
  }
  const compact = settingId === "detective" ? DETECTIVE_COMPACT_CHARACTER_KEYS : COMPACT_CHARACTER_KEYS;
  return { mode: "compact", keys: compact.filter((key) => available.includes(key)) };
}
function characterKeysForRoom(room) {
  const normalized = normalizeCharacterSet(
    room?.settings?.characterSetMode,
    room?.settings?.customCharacterKeys,
    room?.settings?.setting,
    room?.settings?.demographicsEnabled !== false
  );
  return normalized.keys;
}
function characterLabelsForSetting(settingId, demographicsEnabled = true) {
  const keys = characterKeysForSetting(settingId, demographicsEnabled);
  const special = settingId === "detective" ? DETECTIVE_KEY_LABELS : KEY_LABELS;
  return Object.fromEntries(keys.map((key) => [key, special[key] || KEY_LABELS[key] || key]));
}
function characterKeyLabel(room, key) {
  return characterLabelsForSetting(room?.settings?.setting)[key] || KEY_LABELS[key] || key;
}


const STRATEGIC_REVEAL_SENSITIVE_KEYS = new Set([
  "health", "phobia", "secret", "relationship", "anomaly", "demographicContext", "attitudeToChildren",
  "alibi", "motive", "testimony", "evidenceLink"
]);
const REVEAL_RESOURCE_FOCUS = {
  food: ["profession", "skill", "item", "hobby"],
  water: ["profession", "skill", "item", "health"],
  energy: ["profession", "skill", "item", "anomaly"],
  integrity: ["profession", "skill", "item", "health"],
  medicine: ["health", "profession", "skill", "item"],
  morale: ["trait", "phobia", "relationship", "secret"]
};
function strategicRevealEnabled(room) {
  return Boolean(room?.game && phaseLoopFor(room).includes("reveal") && room.settings.mode !== "survival");
}
function strategicSensitiveKeys(room) {
  return characterKeysForRoom(room).filter((key) => STRATEGIC_REVEAL_SENSITIVE_KEYS.has(key));
}
function revealFocusForRound(room) {
  const available = characterKeysForRoom(room);
  if (room.settings.setting === "detective") {
    const detectiveRotation = [
      ["alibi", "testimony"], ["motive", "access"], ["evidenceLink", "relationship"], ["secret", "trait"]
    ];
    const selected = detectiveRotation[(Math.max(1, room.game?.round || 1) - 1) % detectiveRotation.length].filter((key) => available.includes(key));
    return {
      title: "Фокус слідства",
      reason: "Раунд звужує поле перевірки, щоб справа не зводилася до хаотичного відкриття всього досьє.",
      focusKeys: selected.length ? selected : available.slice(0, 2)
    };
  }
  const resources = room.game?.shelter?.resources || {};
  const weakest = Object.entries(resources)
    .filter(([key]) => REVEAL_RESOURCE_FOCUS[key])
    .sort((a, b) => Number(a[1]) - Number(b[1]))[0]?.[0] || "morale";
  const focusPool = [...(REVEAL_RESOURCE_FOCUS[weakest] || []), ...strategicSensitiveKeys(room), ...available];
  const start = (Math.max(1, room.game?.round || 1) - 1) % Math.max(1, focusPool.length);
  const focusKeys = [];
  for (let offset = 0; offset < focusPool.length && focusKeys.length < 2; offset += 1) {
    const key = focusPool[(start + offset) % focusPool.length];
    if (available.includes(key) && !focusKeys.includes(key)) focusKeys.push(key);
  }
  return {
    title: `Фокус раунду: ${resourceName(weakest)}`,
    reason: `Найслабша стартова ланка — ${resourceName(weakest)}. Пов’язані характеристики цього раунду мають підвищену цінність.`,
    focusKeys
  };
}
function pendingRevealRequests(room, targetId = null, dueRound = null) {
  return (room.game?.revealRequests || []).filter((request) => request.status === "pending"
    && (!targetId || request.targetPlayerId === targetId)
    && (dueRound == null || Number(request.dueRound || 0) <= Number(dueRound)));
}
function chooseNextRevealPressure(room, player) {
  if (!strategicRevealEnabled(room) || !player?.active || !player.character) return null;
  const hidden = strategicSensitiveKeys(room).filter((key) => !player.character.revealed?.[key]);
  if (!hidden.length) return null;
  const requested = pendingRevealRequests(room, player.id, (room.game?.round || 1) + 1).map((item) => item.key);
  const ordered = [...requested, ...shuffled(hidden)].filter((key, index, arr) => hidden.includes(key) && arr.indexOf(key) === index);
  const key = ordered[0] || hidden[0];
  return { key, assignedRound: room.game.round, dueRound: Math.min(room.game.maxRounds, room.game.round + 1) };
}
function prepareStrategicRevealRound(room) {
  if (!strategicRevealEnabled(room)) return;
  const alreadyPrepared = room.game.revealStrategy?.round === room.game.round
    && activePlayers(room).every((player) => player.character?.revealChoiceRound === room.game.round);
  if (alreadyPrepared) return;
  const focus = revealFocusForRound(room);
  room.game.revealStrategy = {
    enabled: true,
    round: room.game.round,
    title: focus.title,
    reason: focus.reason,
    focusKeys: [...focus.focusKeys]
  };
  for (const player of activePlayers(room)) {
    const character = player.character;
    const hidden = characterKeysForRoom(room).filter((key) => !character.revealed?.[key]);
    const dueRequests = pendingRevealRequests(room, player.id, room.game.round).map((item) => item.key);
    const pressureKey = character.revealPressure && Number(character.revealPressure.dueRound || 0) <= room.game.round
      ? character.revealPressure.key : null;
    const candidates = [
      ...dueRequests,
      ...(pressureKey ? [pressureKey] : []),
      ...focus.focusKeys,
      ...shuffled(hidden.filter((key) => STRATEGIC_REVEAL_SENSITIVE_KEYS.has(key))),
      ...shuffled(hidden)
    ];
    const choices = [];
    for (const key of candidates) {
      if (hidden.includes(key) && !choices.includes(key)) choices.push(key);
      if (choices.length >= Math.min(2, hidden.length)) break;
    }
    character.revealChoiceRound = room.game.round;
    character.revealChoiceKeys = choices;
  }
}
function initializeStrategicReveals(room) {
  room.game.revealRequests ||= [];
  for (const player of room.players) {
    if (!player.character) continue;
    const character = player.character;
    character.revealInfluence = clamp(Number(character.revealInfluence || 0), 0, 3);
    character.revealCredibility = Number(character.revealCredibility || 0);
    character.revealBonusKeys = Array.isArray(character.revealBonusKeys) ? character.revealBonusKeys : [];
    character.revealRequestUsedRound ??= null;
    character.concealmentStrain = Number(character.concealmentStrain || 0);
    if (strategicRevealEnabled(room) && !character.revealPressure) {
      const hidden = strategicSensitiveKeys(room).filter((key) => !character.revealed?.[key]);
      if (hidden.length) character.revealPressure = { key: sample(hidden), assignedRound: 0, dueRound: Math.min(room.game.maxRounds, 2) };
    }
  }
  prepareStrategicRevealRound(room);
}
function applyConcealmentPressure(room) {
  if (!strategicRevealEnabled(room)) return;
  for (const player of activePlayers(room)) {
    const character = player.character;
    const pressure = character.revealPressure;
    if (pressure && character.revealed?.[pressure.key]) character.revealPressure = null;
    else if (pressure && Number(pressure.dueRound || 0) <= room.game.round) {
      let effect = "напруга зросла";
      if (pressure.key === "health" && (character.medicalCondition?.severity || 0) > 0) {
        const before = character.medicalCondition.severity;
        character.medicalCondition.severity = clamp(before + 1, 0, 5);
        effect = `стан здоров’я погіршився: ${severityLabel(before)} → ${severityLabel(character.medicalCondition.severity)}`;
      } else {
        character.stress = clamp(Number(character.stress || 0) + 1, 0, 5);
      }
      character.concealmentStrain = Number(character.concealmentStrain || 0) + 1;
      character.privateNotes ||= [];
      character.privateNotes.push(`Приховування характеристики «${characterKeyLabel(room, pressure.key)}» мало наслідок: ${effect}.`);
      room.game.log.push(`Тривале приховування важливої характеристики посилило напругу персонажа ${player.name}.`);
      character.revealPressure = null;
    }
    if (room.game.round < room.game.maxRounds && !character.revealPressure) character.revealPressure = chooseNextRevealPressure(room, player);
  }
}
function processStrategicReveal(room, player, key) {
  if (!strategicRevealEnabled(room)) return;
  const character = player.character;
  if (character.revealPressure?.key === key) character.revealPressure = null;
  const bonusKeys = character.revealBonusKeys ||= [];
  if (room.game.round <= 2 && STRATEGIC_REVEAL_SENSITIVE_KEYS.has(key) && !bonusKeys.includes(key)) {
    bonusKeys.push(key);
    character.revealInfluence = clamp(Number(character.revealInfluence || 0) + 1, 0, 3);
    character.revealCredibility = Number(character.revealCredibility || 0) + 1;
    room.game.log.push(`${player.name} рано відкриває ризиковану характеристику й отримує 1 вплив.`);
  }
  for (const request of pendingRevealRequests(room, player.id, room.game.round)) {
    if (request.key !== key) continue;
    request.status = "fulfilled";
    request.fulfilledRound = room.game.round;
    character.revealInfluence = clamp(Number(character.revealInfluence || 0) + 1, 0, 3);
    character.revealCredibility = Number(character.revealCredibility || 0) + 1;
    room.game.log.push(`${player.name} виконує публічний запит і відкриває «${characterKeyLabel(room, key)}».`);
  }
}
function requestRevealCategory(room, player, body) {
  if (!room.game || !isSocialPhase(room.game.phase)) throw new Error("Запити характеристик доступні під час спільного обговорення.");
  if (!strategicRevealEnabled(room)) throw new Error("У цьому режимі стратегічні запити не використовуються.");
  if (!canParticipateInDecision(room, player, "request")) throw new Error("Зараз ви не можете створити запит.");
  if (room.game.round >= room.game.maxRounds) throw new Error("Наступного раунду вже не буде.");
  if (Number(player.character.revealInfluence || 0) < 1) throw new Error("Для запиту потрібен 1 вплив.");
  if (player.character.revealRequestUsedRound === room.game.round) throw new Error("У цьому раунді ви вже створили запит.");
  const target = room.players.find((item) => item.id === body.targetId && item.active && item.id !== player.id);
  if (!target) throw new Error("Оберіть іншого активного гравця.");
  const key = String(body.key || "");
  if (!characterKeysForRoom(room).includes(key)) throw new Error("Невідома категорія характеристики.");
  if (target.character.revealed?.[key]) throw new Error("Ця характеристика вже відкрита.");
  const duplicate = pendingRevealRequests(room).some((item) => item.targetPlayerId === target.id && item.key === key && Number(item.dueRound || 0) === room.game.round + 1);
  if (duplicate) throw new Error("Такий запит на наступний раунд уже є.");
  player.character.revealInfluence -= 1;
  player.character.revealRequestUsedRound = room.game.round;
  room.game.revealRequests.push({
    id: uid("reveal_request"), fromPlayerId: player.id, fromName: player.name,
    targetPlayerId: target.id, targetName: target.name, key,
    createdRound: room.game.round, dueRound: room.game.round + 1, status: "pending"
  });
  room.game.log.push(`${player.name} витрачає 1 вплив і просить ${target.name} відкрити «${characterKeyLabel(room, key)}» у наступному раунді.`);
}

function roundToFive(value) {
  return Math.max(5, Math.round(Number(value || 0) / 5) * 5);
}
function estimateConfigurationDuration(settingsOrRoom, playerCount) {
  const settings = settingsOrRoom?.settings || settingsOrRoom || {};
  if (settings.tutorialEnabled === true) return { min: 20, max: 35, label: "Навчальна", text: "20–35 хв" };
  const players = clamp(Number(playerCount) || 4, 4, 12);
  const rounds = clamp(Number(settings.rounds) || 4, 2, 7);
  const labels = publicPhaseLoop(settings).map((item) => item.label);
  const moduleCount = advancedModuleSummary(settings).length;
  const weights = {
    "Розкриття": Math.max(1, players * 0.2),
    "Обговорення": 1.5 + players * 0.25,
    "Планування": 1.7 + players * 0.24,
    "Переговори": 1.8 + players * 0.28,
    "Розслідування": 2 + players * 0.3,
    "Операції": 2 + players * 0.2 + moduleCount * 0.75,
    "Інтриги": 1.5 + players * 0.2,
    "Криза": 1.2 + players * 0.15,
    "Рішення громади": 1.2 + players * 0.18,
    "Наслідки": 0.5
  };
  const perRound = labels.reduce((sum, label) => sum + (weights[label] || 1), 0);
  const total = perRound * rounds + 3 + Math.max(0, players - 4) * 0.35;
  const min = roundToFive(total * 0.85);
  const max = Math.max(min + 5, roundToFive(total * 1.2));
  const label = max <= 35 ? "Коротка" : max <= 65 ? "Середня" : max <= 95 ? "Довга" : "Дуже довга";
  return { min, max, label, text: `${min}–${max} хв` };
}
function analyzeRoomConfiguration(settingsOrRoom, playerCount) {
  const sourceSettings = settingsOrRoom?.settings || settingsOrRoom || {};
  const settings = applyTutorialPreset({ ...sourceSettings, advancedModules: [...(sourceSettings.advancedModules || [])], customCharacterKeys: [...(sourceSettings.customCharacterKeys || [])] }, playerCount);
  const players = clamp(Number(playerCount) || 1, 1, 12);
  const mode = modeConfig(settings);
  const modules = normalizeAdvancedModules(settings.advancedModules, settings.mode, settings.setting);
  const set = normalizeCharacterSet(settings.characterSetMode, settings.customCharacterKeys, settings.setting, settings.demographicsEnabled !== false);
  const rounds = clamp(Number(settings.rounds) || 4, 2, 7);
  const reveals = clamp(Number(settings.revealsPerRound) || 2, 1, 4);
  const capacity = clamp(Number(settings.capacity) || (settings.soloTestMode === true ? 1 : 3), settings.soloTestMode === true ? 1 : 2, 10);
  const maxRevealed = Math.min(set.keys.length, rounds * reveals);
  const revealCoverage = set.keys.length ? Math.round((maxRevealed / set.keys.length) * 100) : 0;
  const fullRevealRound = Math.ceil(set.keys.length / reveals);
  const hiddenRoles = settings.setting === "detective" || mode.hiddenRoles;
  const issues = [];
  const add = (severity, title, text, code) => issues.push({ severity, title, text, code });
  const minimumPlayers = settings.soloTestMode === true ? 1 : (settings.tutorialEnabled === true ? 3 : 4);
  if (settings.soloTestMode === true) add("info", "Соло-тестування", "Режим розробника дозволяє запуск із одним гравцем.", "solo_test");
  if (players < minimumPlayers) add("error", "Замало гравців", `Для ${settings.tutorialEnabled === true ? "навчальної" : "звичайної"} партії потрібно щонайменше ${minimumPlayers} учасники.`, "players_min");
  if (settings.tutorialEnabled === true) add("info", "Навчальний сценарій", "Гра автоматично використовує 2 раунди, стислий набір, відкриті голоси й безпечний перший раунд без санкцій.", "tutorial_mode");
  const exilesNeeded = mode.elimination ? Math.max(0, players - capacity) : 0;
  if (mode.elimination && capacity >= players && settings.soloTestMode !== true) add("error", "Місткість не створює відбору", `Місць (${capacity}) має бути менше, ніж гравців (${players}).`, "capacity");
  if (mode.elimination && exilesNeeded > rounds) add("warning", settings.mode === "classic" ? "Відбір не встигне досягти місткості" : "Фінальна група може лишитися переповненою", `Для місткості ${capacity} потрібно ${exilesNeeded} вигнань, а раундів лише ${rounds}. Партія завершиться за лімітом раундів, навіть якщо активних людей буде більше.`, "selection_pressure");
  else if (mode.elimination && exilesNeeded === rounds && exilesNeeded > 0) add("warning", "Немає запасу на нічию", "Щоб досягти місткості, у кожному раунді має відбутися результативне вигнання.", "selection_margin");
  if (revealCoverage < 50) add("warning", "Більшість картки залишиться прихованою", `За партію можна відкрити лише ${maxRevealed} із ${set.keys.length} характеристик (${revealCoverage}%).`, "reveal_low");
  else if (revealCoverage < 75) add("info", "Частина картки не відкриється", `Максимальне розкриття — ${maxRevealed} із ${set.keys.length} характеристик (${revealCoverage}%).`, "reveal_partial");
  if (fullRevealRound <= Math.max(1, Math.floor(rounds / 2)) && set.keys.length > 4) add("warning", "Картка відкриється надто рано", `Усі характеристики можна показати вже до ${fullRevealRound}-го раунду з ${rounds}.`, "reveal_fast");
  if (settings.setting === "detective" && rounds < 4) add("warning", "Замало часу на розслідування", "Детективному режиму рекомендовано щонайменше 4 раунди для перевірок і формування доказового ланцюга.", "detective_rounds");
  if (hiddenRoles && settings.voteVisibility === "open") add("warning", "Відкриті голоси послаблюють дедукцію", "За прихованих ролей відкриті голоси швидко формують безпечні коаліції та спрощують читання фракцій.", "open_hidden_roles");
  if (mode.elimination && normalizeTieRule(settings.tieRule) === "no_action") add("info", "Нічия одразу скасовує санкцію", "За цього правила переголосування не проводиться. Рекомендований варіант — повторне голосування між лідерами.", "tie_without_runoff");
  if (settings.mode === "advanced" && modules.includes("outside") && rounds < 3) add("warning", "Гра вигнанців майже не встигне розкритися", "Для зовнішніх ролей бажано щонайменше 3 раунди.", "outside_short");
  const requestedModules = Array.isArray(sourceSettings.advancedModules) ? sourceSettings.advancedModules.map(String) : [];
  if (requestedModules.includes("roles") && requestedModules.includes("outside")) add("error", "Несумісні модулі", "Фракції та зовнішній табір не можна запускати одночасно: вигнання має залишатися основною ставкою соціального конфлікту.", "roles_outside_conflict");
  if (modules.includes("roles") && modules.includes("operations")) add("warning", "Два конкуруючі цикли", "Приховані дії та ресурсні операції подовжують раунд. Використовуйте цю комбінацію лише з досвідченою групою.", "roles_operations_load");
  if (modules.includes("medicine") && !modules.includes("operations")) add("info", "Медицина створює фазу операцій", "Лікування буде єдиною основною дією операційної фази.", "medicine_phase");
  const automation = normalizeAutomationSettings(settings);
  const fullAutoAllowed = settings.mode === "classic" && settings.setting !== "detective" && settings.voteSystem !== "tribunal" && modules.length === 0;
  if (automation.mode === "auto" && !fullAutoAllowed) add("warning", "Повний автохост обмежено", "Для складних режимів сервер використовуватиме режим помічника: він підкаже наступну дію, але не вирішуватиме соціальні дилеми замість групи.", "automation_complex");
  else if (automation.mode === "auto" && automation.phaseSeconds < 60) add("warning", "Автоматичні фази надто короткі", `Ліміт ${automation.phaseSeconds} с може не залишити часу на обговорення.`, "automation_short");
  else if (automation.mode !== "off") add("info", "Захист від простою ввімкнено", `${automation.mode === "auto" ? "Автоматичний ведучий" : "Допоміжний режим"}: відсутність ${automation.inactivitySeconds} с, ліміт фази ${automation.phaseSeconds} с.`, "automation_enabled");
  if (players >= 10 && set.keys.length >= 12) add("warning", "Високе інформаційне навантаження", `Групі доведеться відстежувати до ${players * set.keys.length} фактів про персонажів.`, "memory_load");
  const duration = estimateConfigurationDuration(settings, players);
  if (duration.max >= 90) add("warning", "Партія може бути дуже довгою", `Орієнтовна тривалість — ${duration.text}.`, "duration_long");
  else if (duration.max >= 65) add("info", "Заплануйте довгу сесію", `Орієнтовна тривалість — ${duration.text}.`, "duration_medium");
  if (!issues.some((item) => item.severity === "error" || item.severity === "warning")) add("success", "Конфігурація збалансована", "Критичних суперечностей для цієї кількості учасників не виявлено.", "balanced");
  const recommendedRounds = settings.setting === "detective" ? (players >= 10 ? 5 : 4) : settings.mode === "classic" ? Math.max(3, Math.min(7, exilesNeeded + 1)) : players <= 6 ? 3 : players <= 9 ? 4 : 5;
  const recommendedReveals = Math.max(1, Math.min(4, Math.ceil((set.keys.length * 0.75) / rounds)));
  return {
    playerCount: players,
    issues,
    blocking: issues.filter((item) => item.severity === "error").length,
    warnings: issues.filter((item) => item.severity === "warning").length,
    duration,
    characterCount: set.keys.length,
    maxRevealed,
    revealCoverage,
    selection: mode.elimination ? { capacity, exilesNeeded } : null,
    recommendations: { rounds: recommendedRounds, revealsPerRound: recommendedReveals }
  };
}

const ACTION_TAG_LABELS = {
  medicine: "медицина", repair: "ремонт", technical: "техніка", science: "наука",
  survival: "виживання", navigation: "навігація", communication: "зв’язок",
  social: "соціальна взаємодія", defense: "захист", food: "харчування",
  water: "водопостачання", biology: "біологія", magic: "магія",
  digital: "цифрові системи", mining: "видобуток", space: "космос", morale: "мораль і психологія"
};

const HIDDEN_ROLES = {
  survivor: {
    id: "survivor", faction: "Громада", name: "Вцілілий",
    description: "Ви не маєте спеціальної влади, але ваша сила — у здатності пережити всі рішення групи.",
    objective: "Залишитися у сховищі до фіналу."
  },
  guardian: {
    id: "guardian", faction: "Громада", name: "Охоронець",
    description: "Ви таємно відповідаєте за безпеку призначеного підопічного.",
    objective: "Вижити разом із призначеним підопічним."
  },
  medic: {
    id: "medic", faction: "Громада", name: "Польовий медик",
    description: "Один раз ви можете провести посилене лікування без витрати запасів.",
    objective: "Успішно вилікувати хворобу або тяжку травму й залишитися у грі."
  },
  archivist: {
    id: "archivist", faction: "Одинак", name: "Архіваріус",
    description: "Для вас знання важливіше за довіру групи.",
    objective: "Домогтися відкриття щонайменше 18 характеристик у групі."
  },
  opportunist: {
    id: "opportunist", faction: "Одинак", name: "Опортуніст",
    description: "Ви виживаєте насамперед заради себе й можете приховати частину запасів.",
    objective: "Залишитися у фінальній групі, навіть якщо сховище ледь тримається."
  },
  saboteur: {
    id: "saboteur", faction: "Загроза", name: "Диверсант",
    description: "Ви прагнете послабити сховище, не видавши себе.",
    objective: "Дожити до фіналу, опустивши цілісність або один модуль нижче 35%."
  },
  engineer: {
    id: "engineer", faction: "Громада", name: "Таємний інженер",
    description: "Ви зберегли доступ до резервних схем і можете непомітно посилити один модуль.",
    objective: "Підняти стан будь-якого модуля щонайменше до 80% і дожити до фіналу."
  },
  quartermaster: {
    id: "quartermaster", faction: "Громада", name: "Комірник",
    description: "Ви знаєте про резервну схованку зі стратегічними запасами.",
    objective: "Відкрити резерв і завершити партію із середнім запасом ресурсів не нижче 45%."
  },
  scoutmaster: {
    id: "scoutmaster", faction: "Громада", name: "Розвідник",
    description: "Ви можете один раз підготувати безпечніший маршрут для наступної експедиції.",
    objective: "Забезпечити успіх експедиції та залишитися у фінальній групі."
  },
  mediator: {
    id: "mediator", faction: "Громада", name: "Посередник",
    description: "Ви вмієте зняти напругу й тимчасово захистити одного учасника від рішення натовпу.",
    objective: "Знизити стрес іншого гравця й не допустити критичного падіння моралі."
  },
  agitator: {
    id: "agitator", faction: "Одинак", name: "Агітатор",
    description: "Ви здатні непомітно посилити вагу власного голосу.",
    objective: "Використати вирішальний голос і залишитися у сховищі до фіналу."
  },
  collector: {
    id: "collector", faction: "Одинак", name: "Колекціонер",
    description: "Ви шукаєте рідкісні речі й можете один раз забрати випадковий предмет в іншого гравця.",
    objective: "Завершити партію щонайменше з трьома предметами в інвентарі."
  }
};

function normalizeGenerationSeed(value) {
  return String(value || "")
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
function generatedSeed() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const groups = [];
  for (let group = 0; group < 3; group += 1) {
    let value = "";
    for (let index = 0; index < 4; index += 1) value += alphabet[crypto.randomInt(0, alphabet.length)];
    groups.push(value);
  }
  return groups.join("-");
}
function resolveGenerationSeed(value, fallback = null) {
  const raw = String(value || "").trim();
  if (!raw) return normalizeGenerationSeed(fallback) || generatedSeed();
  const normalized = normalizeGenerationSeed(raw);
  if (normalized.replace(/-/g, "").length < 4) {
    const error = new Error("Seed генерації має містити щонайменше 4 літери або цифри.");
    error.status = 400;
    throw error;
  }
  return normalized;
}
function withSeededRandom(seed, callback) {
  return runWithSeed(seed, GENERATION_SCHEMA, callback);
}
function stableSortValue(value) {
  if (Array.isArray(value)) return value.map(stableSortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableSortValue(value[key])]));
}
function stableStringify(value) {
  return JSON.stringify(stableSortValue(value));
}
function diagnosticHash(value, length = 12) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").toUpperCase().slice(0, length);
}
function formattedDiagnostic(prefix, hash) {
  const clean = String(hash || "").replace(/[^A-Z0-9]/g, "");
  return `${prefix}-${clean.slice(0, 4)}-${clean.slice(4, 8)}${clean.length > 8 ? `-${clean.slice(8, 12)}` : ""}`;
}
function generationConfigurationPayload(room, playerCount = room.players?.length || 0) {
  const settings = room.settings || {};
  const pack = platform.getPack(settings.contentPackId);
  const campaign = platform.getCampaign(room.campaignId || settings.campaignId);
  return {
    schema: GENERATION_SCHEMA,
    seed: normalizeGenerationSeed(settings.generationSeed),
    playerCount: Number(playerCount || 0),
    settings: {
      mode: settings.mode,
      setting: settings.setting,
      scenarioMode: settings.scenarioMode,
      capacity: settings.capacity,
      rounds: settings.rounds,
      absurdity: settings.absurdity,
      advancedModules: [...(settings.advancedModules || [])].sort(),
      hiddenRoles: Boolean(settings.hiddenRoles),
      revealsPerRound: settings.revealsPerRound,
      demographicsEnabled: settings.demographicsEnabled !== false,
      characterSetMode: settings.characterSetMode || "extended",
      customCharacterKeys: [...(settings.customCharacterKeys || [])].sort(),
      tutorialEnabled: settings.tutorialEnabled === true
    },
    content: pack ? {
      id: pack.id,
      schemaVersion: pack.schemaVersion || null,
      updatedAt: pack.updatedAt || null,
      entriesHash: diagnosticHash(pack.entries || {}, 12)
    } : { id: "base", version: VERSION },
    campaign: campaign ? {
      id: campaign.id,
      updatedAt: campaign.updatedAt || null,
      carryoverHash: diagnosticHash(campaign.carryover || {}, 12)
    } : null
  };
}
function generationConfigCode(room) {
  return formattedDiagnostic("CFG", diagnosticHash(generationConfigurationPayload(room), 12));
}
function anonymizeGeneratedText(room, value) {
  let text = String(value || "");
  const ordered = [...(room.players || [])].map((player, index) => ({ name: player.name, replacement: `ГРАВЕЦЬ-${index + 1}` })).sort((a, b) => b.name.length - a.name.length);
  for (const item of ordered) if (item.name) text = text.split(item.name).join(item.replacement);
  return text;
}
function generationFingerprintPayload(room) {
  if (!room.game) return null;
  const playerIndex = new Map((room.players || []).map((player, index) => [player.id, index + 1]));
  const keys = characterKeysForRoom(room);
  return {
    schema: GENERATION_SCHEMA,
    configuration: generationConfigurationPayload(room),
    catastrophe: room.game.catastrophe,
    scenario: {
      pressure: room.game.scenario?.pressure || 1,
      hiddenComplication: room.game.scenario?.hiddenComplication || null,
      complicationRevealRound: room.game.scenario?.complicationRevealRound || null
    },
    shelter: {
      title: room.game.shelter?.title,
      description: room.game.shelter?.description,
      capacity: room.game.shelter?.capacity,
      residentCapacity: room.game.shelter?.residentCapacity,
      areaM2: room.game.shelter?.areaM2,
      roomCount: room.game.shelter?.roomCount,
      rooms: (room.game.shelter?.rooms || []).map((item) => ({ name: item.name || item.title, description: item.description })),
      provisions: room.game.shelter?.provisions || [],
      resources: room.game.shelter?.resources || {},
      modules: (room.game.shelter?.modules || []).map((item) => ({ name: item.name, description: item.description, condition: item.condition }))
    },
    players: (room.players || []).map((player) => ({
      values: Object.fromEntries(keys.map((key) => [key, key === "relationship" ? anonymizeGeneratedText(room, player.character?.[key]) : player.character?.[key]])),
      demographics: player.character?.demographics || null,
      role: player.character?.role?.id || null,
      ability: player.character?.ability?.id || null,
      goalId: player.character?.goalId || null,
      goal: anonymizeGeneratedText(room, player.character?.goal || ""),
      relationshipTargets: (player.character?.relationshipTargetIds || []).map((id) => playerIndex.get(id) || 0),
      medical: player.character?.medicalCondition ? {
        name: player.character.medicalCondition.name,
        type: player.character.medicalCondition.type,
        severity: player.character.medicalCondition.severity
      } : null,
      inventory: (player.character?.inventory || []).map((item) => ({ name: item.name, medicalUses: item.medicalUses || 0, medicalPotency: item.medicalPotency || 0 }))
    })),
    scenarioPriorities: room.game.scenarioPriorities || null,
    revealPlan: {
      strategy: room.game.revealStrategy || null,
      players: (room.players || []).map((player) => ({
        choiceKeys: [...(player.character?.revealChoiceKeys || [])],
        pressure: player.character?.revealPressure ? { key: player.character.revealPressure.key, dueRound: player.character.revealPressure.dueRound } : null
      }))
    },
    mystery: room.game.mystery ? {
      culpritSeat: playerIndex.get(room.game.mystery.culpritId) || 0,
      accompliceSeat: playerIndex.get(room.game.mystery.accompliceId) || 0,
      caseBrief: stableSortValue(room.game.mystery.caseBrief || {}),
      evidence: (room.game.mystery.evidence || []).map((item) => ({ aspect: item.aspect, label: item.label, text: anonymizeGeneratedText(room, item.text), reliability: item.reliability }))
    } : null,
    expeditionOfferIds: [...(room.game.expeditionOfferIds || [])]
  };
}
function generationFingerprint(room) {
  return formattedDiagnostic("GEN", diagnosticHash(generationFingerprintPayload(room), 12));
}
function ensureGenerationSettings(room) {
  room.settings ||= {};
  room.settings.generationSeed = resolveGenerationSeed(room.settings.generationSeed);
  room.settings.generationSchema = room.settings.generationSchema || GENERATION_SCHEMA;
  return room.settings.generationSeed;
}
function publicGenerationState(room) {
  ensureGenerationSettings(room);
  const gameMeta = room.game?.generation || null;
  return {
    seed: room.settings.generationSeed,
    schema: gameMeta?.schema || room.settings.generationSchema || GENERATION_SCHEMA,
    configCode: gameMeta?.configCode || generationConfigCode(room),
    fingerprint: gameMeta?.fingerprint || null,
    playerCount: room.players?.length || 0,
    reproducible: gameMeta ? gameMeta.reproducible !== false : true,
    migrated: Boolean(gameMeta?.migrated),
    note: gameMeta?.migrated
      ? "Цей seed призначено вже після створення старої партії; він не відтворює її первинну роздачу."
      : "Однакові seed, конфігурація, кількість гравців і схема генерації дають однакову стартову партію."
  };
}

function uid(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}
function token() {
  return crypto.randomBytes(24).toString("hex");
}
function recoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let index = 0; index < 10; index += 1) value += alphabet[crypto.randomInt(0, alphabet.length)];
  return value;
}
function normalizeRecoveryCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}
function uniqueRecoveryCode(room = null) {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const value = recoveryCode();
    if (!room || !room.players?.some((player) => normalizeRecoveryCode(player.recoveryCode) === value)) return value;
  }
  throw new Error("Не вдалося створити персональний код відновлення.");
}
function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(random() * alphabet.length)];
    if (!rooms.has(code)) return code;
  }
  throw new Error("Не вдалося створити код кімнати.");
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function randomInt(min, max) {
  return min + Math.floor(random() * (max - min + 1));
}
function sample(array) {
  if (!array?.length) return null;
  return array[Math.floor(random() * array.length)];
}
function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function itemName(item) {
  return typeof item === "string" ? item : String(item?.name || "");
}
function entryLevel(item) {
  return typeof item === "string" ? "normal" : (item?.level || "normal");
}
function uniqueEntries(entries) {
  const seen = new Set();
  return (entries || []).filter((item) => {
    const name = itemName(item).trim();
    if (!name || seen.has(name.toLocaleLowerCase("uk"))) return false;
    seen.add(name.toLocaleLowerCase("uk"));
    return true;
  });
}
function chooseEntry(entries, absurdityLevel = 2, used = null) {
  const clean = uniqueEntries(entries);
  const weightsByLevel = [
    { normal: 0.96, odd: 0.04, absurd: 0 },
    { normal: 0.86, odd: 0.12, absurd: 0.02 },
    { normal: 0.72, odd: 0.23, absurd: 0.05 },
    { normal: 0.52, odd: 0.34, absurd: 0.14 },
    { normal: 0.30, odd: 0.43, absurd: 0.27 }
  ];
  const profile = weightsByLevel[clamp(Number(absurdityLevel) || 0, 0, 4)];
  let allowed = clean.filter((item) => !used || !used.has(itemName(item)));
  if (!allowed.length) allowed = clean;
  const roll = random();
  let level = "normal";
  if (roll > profile.normal + profile.odd) level = "absurd";
  else if (roll > profile.normal) level = "odd";
  let candidates = allowed.filter((item) => entryLevel(item) === level);
  if (!candidates.length) candidates = allowed.filter((item) => entryLevel(item) === "normal");
  if (!candidates.length) candidates = allowed;
  const selected = sample(candidates);
  const name = itemName(selected);
  if (used) used.add(name);
  return name;
}
function chooseUniqueValue(entries, used = null) {
  const clean = uniqueEntries(entries);
  let allowed = clean.filter((item) => !used || !used.has(itemName(item)));
  if (!allowed.length) allowed = clean;
  const selected = sample(allowed);
  const name = itemName(selected);
  if (used) used.add(name);
  return { raw: selected, name };
}
function settingData(id) {
  return SETTINGS[id] || SETTINGS.modern;
}
function contentPackForRoom(room) {
  const pack = platform.getPack(room?.settings?.contentPackId);
  if (!pack) return null;
  if (pack.setting !== "all" && pack.setting !== room.settings.setting) return null;
  if (!pack.public && pack.ownerAccountId !== room.hostAccountId) return null;
  return pack;
}
function contentBundle(settingId, pack = null) {
  const base = settingData(settingId);
  const entries = pack?.entries || {};
  const dedupeByTitle = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = String(item?.title || "").trim().toLocaleLowerCase("uk");
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  };
  const data = {
    ...base,
    origins: uniqueEntries([...(base.origins || []), ...(entries.origins || [])]),
    professions: uniqueEntries([...(base.professions || []), ...(entries.professions || [])]),
    health: uniqueEntries([...(base.health || []), ...(entries.health || [])]),
    skills: uniqueEntries([...(base.skills || []), ...(entries.skills || [])]),
    items: uniqueEntries([...(base.items || []), ...(entries.items || [])]),
    secrets: uniqueEntries([...(base.secrets || []), ...(entries.secrets || [])]),
    catastrophes: dedupeByTitle([...(base.catastrophes || []), ...(entries.catastrophes || [])]),
    shelters: dedupeByTitle([...(base.shelters || []), ...(entries.shelters || [])])
  };
  const common = {
    ...COMMON,
    traits: uniqueEntries([...(COMMON.traits || []), ...(entries.traits || [])]),
    hobbies: uniqueEntries([...(COMMON.hobbies || []), ...(entries.hobbies || [])]),
    phobias: uniqueEntries([...(COMMON.phobias || []), ...(entries.phobias || [])]),
    anomalies: uniqueEntries([...(COMMON.anomalies || []), ...(entries.anomalies || [])])
  };
  const relationSeen = new Set();
  const relationships = [...RELATIONSHIPS, ...(entries.relationships || []).map((item) => ({ text: item.text || item.name || String(item), level: item.level || "normal" }))].filter((item) => {
    const key = String(item.text || "").trim().toLocaleLowerCase("uk");
    if (!key || relationSeen.has(key)) return false;
    relationSeen.add(key); return true;
  });
  return { data, common, relationships, pack };
}
function eventPool(room) {
  const pack = contentPackForRoom(room);
  const custom = (pack?.entries?.events || []).map((event) => ({ ...event, id: `${pack.id}_${event.id}`, choices: (event.choices || []).map((choice) => ({ ...choice })) }));
  return [...(EVENTS[room.settings.setting] || EVENTS.modern), ...custom].filter((item) => entryAllowedByAbsurdity(item, room.settings.absurdity));
}
function customExpeditionPool(room) {
  const pack = contentPackForRoom(room);
  const custom = (pack?.entries?.expeditions || []).map((item) => ({ ...item, id: `${pack.id}_${item.id}` }));
  return [...(EXPEDITIONS[room.settings.setting] || EXPEDITIONS.modern), ...custom].filter((item) => entryAllowedByAbsurdity(item, room.settings.absurdity));
}

const HEALTHY_STATUS_VARIANTS = {
  modern: [
    "Цілком здоровий",
    "Без активних захворювань",
    "Медичних протипоказань немає",
    "Фізично здоровий / здорова",
    "Задовільний стан здоров’я",
    "Не потребує постійного лікування"
  ],
  fantasy: [
    "Цілком здоровий",
    "Міцне здоров’я",
    "Не має хвороб чи проклять",
    "Організм не уражений магією",
    "Здоров’я загартоване мандрами",
    "Життєві сили в нормі"
  ],
  space: [
    "Цілком здоровий",
    "Без активних патологій",
    "Медсканування не виявило відхилень",
    "Організм у межах норми",
    "Фізіологічні показники стабільні",
    "Не потребує медичного супроводу"
  ],
  postapocalypse: ["Цілком здоровий", "Без активних захворювань", "Стійкий до умов пустки", "Не потребує постійних ліків", "Фізичний стан задовільний", "Ознак променевої хвороби немає"],
  cyberpunk: ["Медсканування не виявило відхилень", "Імпланти працюють стабільно", "Без активних патологій", "Біосумісність у нормі", "Не потребує медичного супроводу", "Нейроінтерфейс стабільний"],
  horror: ["Стабільний фізичний стан", "Без активних захворювань", "Цілком здоровий", "Психофізіологічні показники в нормі", "Не потребує постійного лікування", "Ознак впливу не виявлено"],
  detective: ["Цілком здоровий", "Без активних захворювань", "Медичних протипоказань немає", "Фізичний стан задовільний", "Стабільний психічний стан", "Не потребує постійного лікування"]
};
function entryAllowedByAbsurdity(item, absurdityLevel) {
  const maxLevel = clamp(Number(absurdityLevel) || 0, 0, 4);
  const level = entryLevel(item);
  if (level === "normal") return true;
  if (level === "odd") return maxLevel >= 1;
  return maxLevel >= 2;
}
function contentProfile(absurdityLevel) {
  return [
    { normal: 1, odd: 0, absurd: 0 },
    { normal: 0.86, odd: 0.14, absurd: 0 },
    { normal: 0.70, odd: 0.24, absurd: 0.06 },
    { normal: 0.48, odd: 0.34, absurd: 0.18 },
    { normal: 0.30, odd: 0.43, absurd: 0.27 }
  ][clamp(Number(absurdityLevel) || 0, 0, 4)];
}
function chooseContentEntry(entries, absurdityLevel = 2) {
  const allowed = (entries || []).filter((item) => entryAllowedByAbsurdity(item, absurdityLevel));
  if (!allowed.length) return sample(entries || []);
  const profile = contentProfile(absurdityLevel);
  const roll = random();
  const wanted = roll < profile.normal ? "normal" : roll < profile.normal + profile.odd ? "odd" : "absurd";
  const candidates = allowed.filter((item) => entryLevel(item) === wanted);
  return sample(candidates.length ? candidates : allowed);
}
function chooseContentEntries(entries, count, absurdityLevel = 2) {
  const remaining = [...(entries || []).filter((item) => entryAllowedByAbsurdity(item, absurdityLevel))];
  const chosen = [];
  while (remaining.length && chosen.length < count) {
    const selected = chooseContentEntry(remaining, absurdityLevel);
    if (!selected) break;
    chosen.push(selected);
    remaining.splice(remaining.indexOf(selected), 1);
  }
  return chosen;
}
function weightedConditionChoice(candidates) {
  if (!candidates.length) return null;
  const weighted = [];
  for (const item of candidates) {
    const name = itemName(item);
    const severity = MEDICAL.buildMedicalCondition(name).severity || 1;
    const weight = /безплід/i.test(name) ? 5 : (({ 1: 58, 2: 28, 3: 11, 4: 3, 5: 1 })[severity] || 8);
    for (let index = 0; index < weight; index += 1) weighted.push(item);
  }
  return sample(weighted);
}
function buildHealthDeck(settingId, data, playerCount, absurdityLevel) {
  const count = Math.max(1, Number(playerCount) || 1);
  const healthyTarget = Math.min(count, Math.max(1, Math.round(count * 0.40)));
  const healthyPool = shuffled([...(HEALTHY_STATUS_VARIANTS[settingId] || HEALTHY_STATUS_VARIANTS.modern)]);
  const universalHealth = [{ name: "Безпліддя", level: "normal" }];
  const allowed = uniqueEntries([...(data.health || []), ...universalHealth]).filter((item) => entryAllowedByAbsurdity(item, absurdityLevel));
  const conditionPool = allowed.filter((item) => MEDICAL.buildMedicalCondition(itemName(item)).severity > 0 || /безплід/i.test(itemName(item)));
  const selectedConditions = [];
  const available = [...conditionPool];
  while (selectedConditions.length < count - healthyTarget && available.length) {
    const selected = weightedConditionChoice(available);
    if (!selected) break;
    selectedConditions.push(itemName(selected));
    const selectedName = itemName(selected).toLocaleLowerCase("uk");
    const index = available.findIndex((item) => itemName(item).toLocaleLowerCase("uk") === selectedName);
    if (index >= 0) available.splice(index, 1);
  }
  while (selectedConditions.length < count - healthyTarget) {
    selectedConditions.push(itemName(sample(conditionPool)) || "Легка застуда");
  }
  const healthy = Array.from({ length: healthyTarget }, (_, index) => healthyPool[index % healthyPool.length]);
  return shuffled([...healthy, ...selectedConditions]);
}
function makeModules(shelter) {
  return shelter.modules.map((name, index) => ({
    id: `module_${index}`,
    name,
    description: `Ключова система сховища «${name}». Її низький стан щораунду погіршує один із ресурсів.`,
    condition: 55 + Math.floor(random() * 41)
  }));
}
function buildRoleDeck(playerCount, enabled = true, mode = GAME_MODES.advanced) {
  if (!enabled) return Array.from({ length: playerCount }, () => "survivor");
  const modeId = typeof mode === "string" ? mode : mode.id;
  const uniqueRoles = [
    "survivor", "guardian", "medic", "archivist", "opportunist", "saboteur",
    "engineer", "quartermaster", "scoutmaster", "mediator", "agitator", "collector"
  ].filter((roleId) => modeId !== "factions" || roleId !== "scoutmaster");
  return shuffled(uniqueRoles).slice(0, Math.min(playerCount, uniqueRoles.length));
}
function roleForPlayer(roleId, player, allPlayers) {
  const base = HIDDEN_ROLES[roleId] || HIDDEN_ROLES.survivor;
  const role = { ...base, targetId: null, targetName: null };
  if (roleId === "guardian") {
    const target = sample(allPlayers.filter((candidate) => candidate.id !== player.id));
    role.targetId = target?.id || null;
    role.targetName = target?.name || null;
    role.objective = target ? `Вижити разом із гравцем «${target.name}».` : base.objective;
  }
  return role;
}

function makeInventoryItem(name, source = "Особистий предмет", receivedFrom = null) {
  const medical = MEDICAL.treatmentItemMeta(name);
  return {
    id: uid("item"),
    name: String(name || "Невідомий предмет"),
    source,
    receivedFrom,
    medicalUses: medical?.uses || 0,
    medicalPotency: medical?.potency || 0,
    medicalLabel: medical?.label || null
  };
}
function severityLabel(level) {
  return MEDICAL.severityMeta(level).name;
}

const CARE_APPROACHES = Object.freeze({
  standard: {
    id: "standard", name: "Звичайне лікування",
    description: "Збалансована спроба без додаткових витрат або особливого ризику.",
    chanceBonus: 0, potencyBonus: 0
  },
  urgent: {
    id: "urgent", name: "Термінове лікування",
    description: "Вищий шанс і сильніший ефект, але потрібно більше медикаментів, а процедура виснажує пацієнта.",
    chanceBonus: 0.12, potencyBonus: 1, extraMedicine: 3
  },
  conserve: {
    id: "conserve", name: "Ощадлива терапія",
    description: "Економить спільні медикаменти, але має нижчий шанс і слабше відновлює травми.",
    chanceBonus: -0.08, potencyBonus: 0, sharedMedicineDiscount: 2
  },
  observe: {
    id: "observe", name: "Відкласти під наглядом",
    description: "Не витрачає медикаменти й не покращує стан одразу, зате зменшує ризик погіршення та готує наступне лікування.",
    special: "observe", requiresCompetence: true
  },
  quarantine: {
    id: "quarantine", name: "Медичний карантин",
    description: "Ізолює заразного пацієнта до завершення раунду, захищає громаду, але знижує мораль і підвищує стрес пацієнта.",
    special: "quarantine", requiresCompetence: true
  },
  risky: {
    id: "risky", name: "Ризиковане втручання",
    description: "Може різко покращити тяжкий стан, але має нижчий шанс, додаткові витрати й небезпечні наслідки невдачі.",
    chanceBonus: -0.14, potencyBonus: 2, extraMedicine: 2, severeOnly: true
  }
});
function careApproachList() {
  return Object.values(CARE_APPROACHES).map((item) => ({
    id: item.id, name: item.name, description: item.description,
    special: item.special || null, severeOnly: Boolean(item.severeOnly),
    requiresCompetence: Boolean(item.requiresCompetence)
  }));
}
function careAssessment(room, healer, target, option, approachId = "standard") {
  const approach = CARE_APPROACHES[approachId] || CARE_APPROACHES.standard;
  const condition = target?.character?.medicalCondition || { severity: 0, contagious: false };
  const targetNeedsCare = (condition.severity || 0) > 0 || (target?.character?.injury || 0) > 0 || (target?.character?.stress || 0) > 0;
  const hasCompetence = MEDICAL.hasMedicalCompetence(healer?.character) || healer?.character?.role?.id === "medic";
  let available = Boolean(target && target.active && targetNeedsCare);
  let unavailableReason = available ? "" : "Ціль зараз не потребує медичної допомоги.";
  if (approach.requiresCompetence && !hasCompetence) {
    available = false;
    unavailableReason = "Для цієї тактики потрібна медична компетентність, а не лише лікувальний предмет.";
  }
  if (approach.special === "quarantine" && (!condition.contagious || (condition.severity || 0) <= 0)) {
    available = false;
    unavailableReason = "Карантин доступний лише для активного заразного стану.";
  }
  if (approach.severeOnly && (condition.severity || 0) < 3 && (target?.character?.injury || 0) < 3) {
    available = false;
    unavailableReason = "Ризиковане втручання виправдане лише за тяжкого стану або травми 3/5 і вище.";
  }
  if (!approach.special && !option) {
    available = false;
    unavailableReason = "Оберіть доступний метод лікування.";
  }

  if (approach.special) {
    return {
      approach, available, unavailableReason, targetNeedsCare,
      chance: null, band: { label: "Без кидка", tone: "neutral" },
      effectivePotency: 0, medicineCost: 0, itemUses: 0,
      observationBonus: 0,
      costLabel: approach.special === "observe" ? "Без медикаментів" : "Мораль громади −2",
      outcomeHint: approach.special === "observe"
        ? "Стан не покращиться одразу; ризик погіршення цього раунду зменшиться, а наступна активна терапія отримає бонус."
        : "Пацієнт буде ізольований до завершення раунду; це усуне тиск заразного стану на спільні запаси."
    };
  }

  const competenceBonus = MEDICAL.hasMedicalCompetence(healer.character) ? 0.12 : 0;
  const medicBonus = healer.character.role.id === "medic" ? 0.14 : 0;
  const triageBonus = room.game.treatmentBoostRound === room.game.round ? Number(room.game.treatmentBoost || 0) : 0;
  const observationBonus = Number(condition.observationBonusUntilRound || 0) >= room.game.round ? 0.10 : 0;
  const severityPenalty = (condition.severity || 0) * 0.035;
  const effectivePotency = Math.max(1, Number(option?.potency || 1) + Number(approach.potencyBonus || 0));
  const minChance = approach.id === "risky" ? 0.20 : approach.id === "conserve" ? 0.28 : 0.35;
  const chance = clamp(0.55 + Number(option?.potency || 1) * 0.10 + competenceBonus + medicBonus + triageBonus + observationBonus + Number(approach.chanceBonus || 0) - severityPenalty, minChance, 0.99);
  let medicineCost = option?.source === "shared" ? Number(option.cost || 0) : 0;
  if (approach.id === "conserve" && medicineCost) medicineCost = Math.max(1, medicineCost - Number(approach.sharedMedicineDiscount || 0));
  medicineCost += Number(approach.extraMedicine || 0);
  const itemUses = option?.source === "item" ? 1 : 0;
  if (medicineCost > room.game.shelter.resources.medicine) {
    available = false;
    unavailableReason = `Потрібно ${medicineCost}% медикаментів, у сховищі є ${room.game.shelter.resources.medicine}%.`;
  }
  const band = chanceBand(chance);
  const costParts = [];
  if (medicineCost) costParts.push(`медикаменти −${medicineCost}%`);
  if (itemUses) costParts.push("1 використання предмета");
  if (!costParts.length) costParts.push("без витрат");
  return {
    approach, available, unavailableReason, targetNeedsCare,
    chance, band, effectivePotency, medicineCost, itemUses,
    observationBonus,
    costLabel: costParts.join(" · "),
    outcomeHint: approach.id === "urgent"
      ? "Успіх сильніше знизить тяжкість, але пацієнт отримає +1 стрес навіть після успішної процедури."
      : approach.id === "conserve"
        ? "Успіх буде обережним: менше витрат, але слабше відновлення травми."
        : approach.id === "risky"
          ? "Успіх може знизити тяжкість на 2–3 рівні; невдача погіршить стан, травму та стрес."
          : "Стандартний ефект без додаткових переваг або штрафів."
  };
}
function treatmentCapability(character) {
  const options = [];
  if (!character) return options;
  if (MEDICAL.hasMedicalCompetence(character)) {
    options.push({ id: "competence", label: "Медична компетентність", cost: 4, potency: 2, source: "shared" });
  }
  for (const item of character.inventory || []) {
    if ((item.medicalUses || 0) > 0) {
      options.push({ id: `item:${item.id}`, label: `${item.name} · ${item.medicalUses} вик.`, cost: 0, potency: item.medicalPotency || 1, source: "item", itemId: item.id });
    }
  }
  return options;
}
function publicMedicalCondition(player) {
  const condition = player?.character?.medicalCondition;
  if (!condition || !player.character.revealed.health) return null;
  return {
    name: condition.name,
    severity: condition.severity,
    severityLabel: severityLabel(condition.severity),
    type: condition.type
  };
}

function lowerFirst(value) {
  const text = String(value || "").trim();
  return text ? text[0].toLocaleLowerCase("uk-UA") + text.slice(1) : text;
}
function composeIdentity(sex, genderIdentity) {
  const parts = [sex, genderIdentity].filter((value) => value && value !== "Не застосовується");
  return parts.length ? parts.join(" • ") : "Не застосовується";
}
function composeFamilyStatus(attitude) {
  return attitude && attitude !== "Не застосовується" ? String(attitude) : "Не застосовується";
}
function composeDemographicContext(identity) {
  return identity && identity !== "Не застосовується" ? String(identity) : "Не застосовується";
}
const SIMPLE_CHILD_ATTITUDES = ["Чайлдфрі", "Не заперечує проти дітей", "Хоче мати дітей"];
const RECIPROCAL_RELATIONSHIPS = [
  { a: "Має спільну з гравцем «{name}» мрію про подорож до океану.", b: "Має спільну з гравцем «{name}» мрію про подорож до океану." },
  { a: "Колись урятував / урятувала життя гравця «{name}».", b: "Завдячує життям гравцеві «{name}»." },
  { a: "Має давній взаємний конфлікт із гравцем «{name}».", b: "Має давній взаємний конфлікт із гравцем «{name}»." },
  { a: "Разом із гравцем «{name}» приховує спільну таємницю.", b: "Разом із гравцем «{name}» приховує спільну таємницю." },
  { a: "Є близьким родичем гравця «{name}».", b: "Є близьким родичем гравця «{name}»." },
  { a: "Колись був / була партнером гравця «{name}».", b: "Колись був / була партнером гравця «{name}»." },
  { a: "Разом із гравцем «{name}» служив / служила в одному загоні.", b: "Разом із гравцем «{name}» служив / служила в одному загоні." },
  { a: "Знає таємницю гравця «{name}», а той знає його / її таємницю.", b: "Знає таємницю гравця «{name}», а той знає його / її таємницю." },
  { a: "Має спільного ворога з гравцем «{name}».", b: "Має спільного ворога з гравцем «{name}»." },
  { a: "Пообіцяв / пообіцяла взаємно захищати гравця «{name}».", b: "Пообіцяв / пообіцяла взаємно захищати гравця «{name}»." },
  { a: "Заборгував / заборгувала гравцеві «{name}» ресурси.", b: "Позичив / позичила ресурси гравцеві «{name}» і чекає повернення боргу." },
  { a: "Не довіряє гравцеві «{name}», і недовіра взаємна.", b: "Не довіряє гравцеві «{name}», і недовіра взаємна." },
  { a: "Разом із гравцем «{name}» виховував / виховувала дитину.", b: "Разом із гравцем «{name}» виховував / виховувала дитину." },
  { a: "Має романтичні почуття до гравця «{name}», і вони взаємні.", b: "Має романтичні почуття до гравця «{name}», і вони взаємні." },
  { a: "Разом із гравцем «{name}» пережив / пережила попередню катастрофу.", b: "Разом із гравцем «{name}» пережив / пережила попередню катастрофу." }
];
function applyRelationship(player, text, targetIds) {
  if (!player?.character) return;
  player.character.relationship = text;
  player.character.relationshipTargetIds = [...targetIds];
  player.character.relationshipTargetId = targetIds[0] || null;
  player.character.descriptions.relationship = describeCharacteristic("relationship", text);
}
function assignReciprocalRelationships(players) {
  const deck = shuffled(players.filter((player) => player?.character));
  let index = 0;
  while (deck.length - index > 3) {
    const first = deck[index];
    const second = deck[index + 1];
    const template = sample(RECIPROCAL_RELATIONSHIPS);
    applyRelationship(first, template.a.replace("{name}", second.name), [second.id]);
    applyRelationship(second, template.b.replace("{name}", first.name), [first.id]);
    index += 2;
  }
  const remaining = deck.slice(index);
  if (remaining.length === 2) {
    const [first, second] = remaining;
    const template = sample(RECIPROCAL_RELATIONSHIPS);
    applyRelationship(first, template.a.replace("{name}", second.name), [second.id]);
    applyRelationship(second, template.b.replace("{name}", first.name), [first.id]);
  } else if (remaining.length === 3) {
    const [first, second, third] = remaining;
    applyRelationship(first, `Разом із гравцями «${second.name}» та «${third.name}» належить до однієї давньої групи.`, [second.id, third.id]);
    applyRelationship(second, `Разом із гравцями «${first.name}» та «${third.name}» належить до однієї давньої групи.`, [first.id, third.id]);
    applyRelationship(third, `Разом із гравцями «${first.name}» та «${second.name}» належить до однієї давньої групи.`, [first.id, second.id]);
  } else if (remaining.length === 1 && deck.length > 1) {
    const lone = remaining[0];
    const target = deck[0];
    applyRelationship(lone, `Давно знає гравця «${target.name}», але їхній зв’язок не є взаємною залежністю.`, [target.id]);
  }
}
function assignPersonalGoals(room, mode) {
  for (const player of room.players) {
    const character = player.character;
    const targetId = character.relationshipTargetId;
    const target = room.players.find((candidate) => candidate.id === targetId);
    const goals = [
      { id: "survive_final", text: "Дожити до фіналу партії." },
      { id: "protect_relationship", text: target ? `Допомогти гравцеві «${target.name}» залишитися у сховищі.` : "Допомогти іншому гравцеві дожити до фіналу." },
      { id: "reveal_six", text: "Відкрити щонайменше шість своїх характеристик." },
      { id: "preserve_integrity", text: "Не допустити падіння цілісності сховища нижче 35%." }
    ];
    if (mode.abilities) goals.push({ id: "use_ability", text: "Використати особливу здібність." });
    if (mode.operations) goals.push(
      { id: "successful_expedition", text: "Взяти участь в успішній експедиції." },
      { id: "successful_repair", text: "Успішно відремонтувати модуль сховища." }
    );
    if (room.settings.setting === "detective") goals.push(
      { id: "case_investigation", text: "Провести особисту перевірку під час обговорення." },
      { id: "case_reveal_fact", text: "Домогтися розкриття щонайменше одного алібі або мотиву." },
      { id: "case_culprit_stopped", text: "Дожити до фіналу й не дозволити винуватцю залишитися безкарним." }
    );
    const selected = sample(goals);
    character.goalId = selected.id;
    character.goal = selected.text;
  }
}
function descriptionsFor(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, describeCharacteristic(key, value)]));
}

function generateCharacter(settingId, settings, used, player, allPlayers, roleId, ability, sexData, healthValueOverride = null, bundle = null) {
  const data = bundle?.data || settingData(settingId);
  const common = bundle?.common || COMMON;
  const absurdity = settings.absurdity;
  const origin = chooseEntry(data.origins, absurdity, used.origin);
  const demographicsEnabled = settingId !== "detective" && settings.demographicsEnabled !== false;
  const sex = demographicsEnabled ? itemName(sexData) : "Не застосовується";
  const canBecomePregnant = demographicsEnabled && typeof sexData === "object" ? sexData.canBecomePregnant : false;
  const genderIdentity = demographicsEnabled ? chooseUniqueValue(common.genderIdentities, used.genderIdentity).name : "Не застосовується";
  const availableAttitudes = SIMPLE_CHILD_ATTITUDES.filter((value) => (common.attitudesToChildren || []).includes(value));
  const attitudeToChildren = demographicsEnabled ? chooseUniqueValue(availableAttitudes.length ? availableAttitudes : SIMPLE_CHILD_ATTITUDES, used.attitudeToChildren).name : "Не застосовується";
  let reproductiveStatus = "Без особливостей";
  let finalSex = sex;
  let finalGenderIdentity = genderIdentity;
  let finalAttitude = attitudeToChildren;
  let finalParental = "Не зазначено";
  const anomaly = chooseEntry(common.anomalies, absurdity, used.anomaly);
  if ((settingId === "space" && origin === "Синтетична людина") || (settingId === "cyberpunk" && (SETTING_RULES.cyberpunk?.syntheticOrigins || []).includes(origin))) {
    finalSex = "Не застосовується";
    finalGenderIdentity = "Не застосовується";
    finalAttitude = "Не застосовується";
    finalParental = "Не застосовується";
    reproductiveStatus = "Не застосовується";
  }
  const originalItem = chooseEntry(data.items, absurdity, used.item);
  const healthValue = healthValueOverride || chooseEntry(data.health, absurdity, used.health);
  if (used.health && healthValue) used.health.add(healthValue);
  if (/безплід|стерильн/i.test(healthValue)) reproductiveStatus = "Безпліддя";
  const identity = composeIdentity(finalSex, finalGenderIdentity);
  const familyStatus = composeFamilyStatus(finalAttitude);
  const demographicContext = composeDemographicContext(identity);
  const relationship = "Стосунок буде сформовано після роздачі персонажів.";
  const age = `${18 + Math.floor(random() * 58)} років`;
  const profession = chooseEntry(data.professions, absurdity, used.profession);
  const skill = chooseEntry(data.skills, absurdity, used.skill);
  const trait = chooseEntry(common.traits, absurdity, used.trait);
  const secret = chooseEntry(data.secrets, absurdity, used.secret);
  const values = settingId === "detective" ? {
    origin,
    age,
    profession,
    health: healthValue,
    skill,
    trait,
    item: originalItem,
    relationship,
    alibi: chooseEntry(data.alibis, absurdity, used.alibi),
    motive: chooseEntry(data.motives, absurdity, used.motive),
    access: chooseEntry(data.access, absurdity, used.access),
    testimony: chooseEntry(data.testimonies, absurdity, used.testimony),
    evidenceLink: chooseEntry(data.evidenceLinks, absurdity, used.evidenceLink),
    secret
  } : {
    origin,
    demographicContext,
    attitudeToChildren: finalAttitude,
    anomaly,
    age,
    profession,
    health: healthValue,
    skill,
    trait,
    item: originalItem,
    hobby: chooseEntry(common.hobbies, absurdity, used.hobby),
    phobia: chooseEntry(common.phobias, absurdity, used.phobia),
    secret,
    relationship
  };
  return {
    ...values,
    sex: finalSex,
    genderIdentity: finalGenderIdentity,
    attitudeToChildren: finalAttitude,
    parentalStatus: finalParental,
    reproductiveStatus,
    canBecomePregnant,
    demographics: {
      enabled: demographicsEnabled,
      sex: finalSex,
      genderIdentity: finalGenderIdentity,
      attitudeToChildren: finalAttitude,
      parentalStatus: finalParental,
      reproductiveStatus,
      canBecomePregnant
    },
    descriptions: descriptionsFor(values),
    relationshipTargetId: null,
    relationshipTargetIds: [],
    role: roleForPlayer(roleId, player, allPlayers),
    roleActionUsed: false,
    treatmentCount: 0,
    successfulTreatments: 0,
    inventory: [makeInventoryItem(originalItem, "Початковий багаж")],
    medicalCondition: MEDICAL.buildMedicalCondition(healthValue),
    ability: { ...ability },
    goal: "Дожити до фіналу партії.",
    revealed: {},
    abilityUsed: false,
    revealsUsedRound: 0,
    voteBoost: false,
    protectedRound: null,
    stress: 0,
    injury: 0,
    tradeUsedRound: null,
    careUsedRound: null,
    successfulExpeditions: 0,
    failedExpeditions: 0,
    successfulRepairs: 0,
    privateNotes: [],
    operationBonus: 0,
    operationBonusUntilRound: null,
    operationPenalty: 0,
    operationPenaltyUntilRound: null,
    immuneUntilRound: null,
    silencedRound: null,
    cannotVoteAgainstId: null,
    cannotVoteAgainstUntilRound: null,
    passiveAbilityActive: false,
    permanentDefense: 0,
    abilityFlags: {}
  };
}

function detectiveAspectLabel(aspect) {
  return ({ alibi: "алібі", motive: "мотив", access: "доступ", testimony: "свідчення", evidenceLink: "зв’язок із доказами" })[aspect] || aspect;
}
function initializeDetectiveMystery(room) {
  const candidates = shuffled(room.players.filter((player) => player.character));
  const culprit = candidates[0];
  if (!culprit) return;
  const accomplice = room.players.length >= 8 && random() < 0.35 ? candidates[1] : null;
  const caseBrief = DETECTIVE_CASE.caseBriefFor(room.game.catastrophe);
  const truth = {
    crime: caseBrief.crime,
    culpritId: culprit.id,
    accompliceId: accomplice?.id || null,
    method: sample(caseBrief.methods),
    decisiveAspect: sample(DETECTIVE_CASE.ASPECTS)
  };
  room.game.mystery = {
    ...truth,
    caseBrief,
    evidence: [],
    usedKeys: [],
    publicTheory: Object.fromEntries(room.players.map((player) => [player.id, 0])),
    publicClaims: [],
    confirmedLinks: [],
    requiredEvidence: Math.max(2, Math.min(3, Math.ceil(room.players.length / 4))),
    investigationLog: [],
    accusationVotes: {},
    solved: false
  };
  const threatAbilityIds = shuffled(DETECTIVE_CASE.THREAT_ABILITY_IDS);
  const innocentAbilityIds = shuffled(DETECTIVE_CASE.INNOCENT_ABILITY_IDS);
  const statusDeck = DETECTIVE_CASE.statusDeckFor(caseBrief, room.players.length);
  let threatIndex = 0;
  let innocentIndex = 0;
  let statusIndex = 0;
  for (const player of room.players) {
    const roleId = player.id === culprit.id ? "culprit" : player.id === accomplice?.id ? "accomplice" : "innocent";
    const dossier = DETECTIVE_CASE.dossierValues();
    Object.assign(player.character, dossier);
    player.character.origin = statusDeck[statusIndex % statusDeck.length];
    statusIndex += 1;
    player.character.caseTruth = DETECTIVE_CASE.buildTruthProfile(roleId);
    player.character.caseNotebook = { privateSuspicion: {}, findings: [], lastFinding: null };
    player.character.caseProtection = null;
    player.character.investigationUsedRound = null;
    if (roleId === "culprit") {
      player.character.caseRole = {
        id: "culprit",
        name: "Організатор злочину",
        faction: "Злочин",
        description: `Ви організували центральний інцидент: ${caseBrief.crime}. Публічне досьє не видає вас автоматично — у невинних також є слабкі алібі, мотиви й непрямі сліди.`,
        objective: `Не допустити обґрунтованого фінального звинувачення. Для доведення справи групі потрібно назвати вас і зібрати щонайменше ${room.game.mystery.requiredEvidence} незалежні ланки доказів.`
      };
      player.character.privateNotes.push(`Ви організували: ${caseBrief.crime}. Реальний спосіб: ${truth.method}. Використовуйте суперечності в чужих досьє та свою здібність, щоб відвести версію групи.`);
      player.character.goalId = "detective_culprit_escape";
      player.character.goal = "Залишитися у фінальній групі та не допустити доведення справи.";
      const abilityId = threatAbilityIds[threatIndex % threatAbilityIds.length];
      threatIndex += 1;
      player.character.ability = { ...DETECTIVE_CASE.CASE_ABILITIES[abilityId] };
    } else if (roleId === "accomplice") {
      player.character.caseRole = {
        id: "accomplice",
        name: "Співучасник",
        faction: "Злочин",
        description: `Ви допомогли приховати наслідки інциденту, організованого гравцем «${culprit.name}». Ваше досьє також не є автоматичним доказом.`,
        objective: "Захистити організатора, спотворити публічну версію справи й уникнути окремого викриття."
      };
      player.character.privateNotes.push(`Організатор — «${culprit.name}». Реальний спосіб: ${truth.method}. Ваші приховані дії не записуються в загальний журнал.`);
      player.character.goalId = "detective_accomplice_protect";
      player.character.goal = `Допомогти гравцеві «${culprit.name}» уникнути доведеного звинувачення.`;
      const abilityId = threatAbilityIds[threatIndex % threatAbilityIds.length];
      threatIndex += 1;
      player.character.ability = { ...DETECTIVE_CASE.CASE_ABILITIES[abilityId] };
    } else {
      player.character.caseRole = {
        id: "innocent",
        name: "Учасник розслідування",
        faction: "Розслідування",
        description: "Ви не організовували центральний злочин. Водночас ваше досьє може містити слабке алібі, особистий мотив або непрямий слід, тому одна підозріла картка нічого не доводить.",
        objective: `Назвати справжнього організатора й допомогти зібрати щонайменше ${room.game.mystery.requiredEvidence} незалежні ланки доказів.`
      };
      const abilityId = innocentAbilityIds[innocentIndex % innocentAbilityIds.length];
      innocentIndex += 1;
      player.character.ability = { ...DETECTIVE_CASE.CASE_ABILITIES[abilityId] };
      player.character.goalId = "detective_innocent_solve";
      player.character.goal = "Провести перевірку, обмінятися висновками й правильно назвати організатора злочину.";
    }
    player.character.abilityUsed = false;
    player.character.descriptions = descriptionsFor(Object.fromEntries(characterKeysForRoom(room).map((key) => [key, player.character[key]])));
  }
  revealDetectiveClue(room);
  room.game.log.push(`Відкрито центральну справу «${caseBrief.title}». Публічні докази називають кілька можливих версій; приватні перевірки та приховані слідчі здібності не відображаються в журналі.`);
}
function revealDetectiveClue(room) {
  const mystery = room.game?.mystery;
  if (!mystery) return;
  const culprit = room.players.find((item) => item.id === mystery.culpritId);
  if (!culprit?.character) return;
  const choices = DETECTIVE_CASE.ASPECTS.filter((key) => !mystery.usedKeys.includes(key));
  if (!choices.length) return;
  const aspect = sample(choices);
  mystery.usedKeys.push(aspect);
  const decoys = shuffled(room.players.filter((item) => item.id !== culprit.id && item.id !== mystery.accompliceId)).slice(0, room.players.length <= 4 ? 1 : 2);
  const candidatePlayers = shuffled([culprit, ...(mystery.accompliceId ? room.players.filter((item) => item.id === mystery.accompliceId).slice(0, 1) : []), ...decoys]).slice(0, Math.min(4, Math.max(2, room.players.length - 1)));
  const names = candidatePlayers.map((item) => `«${item.name}»`).join(", ");
  const brief = mystery.caseBrief;
  const texts = {
    alibi: `У часових даних виявлено прогалину, яка стосується версій кількох учасників: ${names}. Сам запис не встановлює, хто саме скористався прогалиною.`,
    motive: `Знайдений документ вказує на можливу вигоду для кількох людей: ${names}. Походження документа ще потрібно перевірити.`,
    access: `Доступ до зони «${brief.location}» могли отримати щонайменше такі учасники: ${names}. Журнал не розрізняє власника ключа та людину, яка ним скористалася.`,
    testimony: `Нове свідчення описує ознаку, сумісну з кількома учасниками: ${names}. Свідок не бачив обличчя й міг помилитися.`,
    evidenceLink: `Речовий слід із місця інциденту підходить до кількох досьє: ${names}. Потрібна персональна перевірка, перш ніж вважати його доказом.`
  };
  mystery.evidence.push({
    id: uid("clue"), round: room.game.round, aspect, label: detectiveAspectLabel(aspect),
    text: texts[aspect], reliability: random() < 0.3 ? 2 : 3, disputed: false,
    candidateNames: candidatePlayers.map((item) => item.name)
  });
}
function detectiveInvestigationStrength(character, bonus = 0) {
  const text = [character.profession, character.skill, character.item, character.trait].join(" ").toLocaleLowerCase("uk");
  let strength = 0.54 + Number(bonus || 0);
  if (/слідч|детектив|криміналіст|судовий медик|профайлер|аудитор|експерт|журналіст-розслідувач/.test(text)) strength += 0.16;
  if (/аналіз|допит|відбит|реконструк|токсиколог|почерк|відео|логіч|часов/.test(text)) strength += 0.14;
  if (/набір криміналіста|диктофон|ультрафіолет|сканер|відбитків|фотоапарат/.test(text)) strength += 0.08;
  return clamp(strength, 0.35, 0.94);
}
function runDetectiveInvestigation(room, investigator, target, aspect, options = {}) {
  const labels = { alibi: "алібі", motive: "мотив", access: "доступ", testimony: "свідчення", evidenceLink: "зв’язок із доказами" };
  const protectedAspect = target.character.caseProtection?.aspect;
  let success = random() < detectiveInvestigationStrength(investigator.character, options.bonus || 0);
  let resultType = "inconclusive";
  let result = `Перевірка ${labels[aspect]} не дала надійного висновку. Дані можна тлумачити кількома способами.`;
  if ((protectedAspect === aspect || protectedAspect === "*") && target.character.caseProtection?.uses > 0) {
    target.character.caseProtection.uses -= 1;
    success = false;
    result = `Джерело або запис щодо аспекту «${labels[aspect]}» виявився недоступним. Висновок непевний.`;
  } else if (success) {
    const truth = target.character.caseTruth?.[aspect] || "ambiguous";
    if (truth === "contradiction") {
      resultType = "contradiction";
      result = `У перевіреному аспекті є реальна невідповідність. Публічна картка: «${target.character[aspect]}». Це підстава для підозри, але не доказ вини без інших незалежних ланок.`;
    } else if (truth === "consistent") {
      resultType = "consistent";
      result = `Перевірений аспект не суперечить доступним даним. Публічна картка: «${target.character[aspect]}». Це послаблює цю конкретну версію, але не доводить повної невинуватості.`;
    } else {
      resultType = "ambiguous";
      result = `Аспект підтверджується лише частково. Публічна картка: «${target.character[aspect]}». Даних недостатньо, щоб використати це як надійну ланку доказів.`;
    }
  }
  const notebook = investigator.character.caseNotebook || (investigator.character.caseNotebook = { privateSuspicion: {}, findings: [], lastFinding: null });
  const privateDelta = resultType === "contradiction" ? 2 : resultType === "consistent" ? -1 : 0;
  notebook.privateSuspicion[target.id] = clamp(Number(notebook.privateSuspicion[target.id] || 0) + privateDelta, -5, 10);
  const finding = {
    id: uid("finding"), round: room.game.round, targetId: target.id, targetName: target.name,
    aspect, aspectLabel: labels[aspect], success, resultType, result, published: false
  };
  notebook.findings.push(finding);
  notebook.lastFinding = finding;
  investigator.character.privateNotes.push(`Раунд ${room.game.round}. Приватна перевірка гравця «${target.name}»: ${result}`);
  room.game.mystery.investigationLog.push({ ...finding, investigatorId: investigator.id, investigatorName: investigator.name });
  const targetIsThreat = target.id === room.game.mystery.culpritId || target.id === room.game.mystery.accompliceId;
  const investigatorIsInnocent = investigator.character.caseRole?.id === "innocent";
  if (success && resultType === "contradiction" && targetIsThreat && investigatorIsInnocent) {
    const key = `${target.id}:${aspect}`;
    if (!room.game.mystery.confirmedLinks.some((item) => item.key === key)) room.game.mystery.confirmedLinks.push({ key, targetId: target.id, aspect, investigatorId: investigator.id });
  }
  return finding;
}
function investigateDetectiveCase(room, player, body) {
  if (room.settings.setting !== "detective" || !room.game?.mystery) throw new Error("Розслідування доступне лише в детективному сетингу.");
  if (!player.active || isDetained(room, player)) throw new Error("Ви не можете проводити перевірку зараз.");
  if (room.game.phase !== "investigation") throw new Error("Перевірки проводяться під час фази розслідування.");
  if (player.character.investigationUsedRound === room.game.round) throw new Error("Цього раунду ви вже проводили перевірку.");
  const target = room.players.find((candidate) => candidate.id === String(body.targetId || "") && candidate.active && candidate.id !== player.id);
  if (!target) throw new Error("Оберіть іншого активного гравця для перевірки.");
  const aspect = DETECTIVE_CASE.ASPECTS.includes(body.aspect) ? body.aspect : "alibi";
  runDetectiveInvestigation(room, player, target, aspect);
  player.character.investigationUsedRound = room.game.round;
}
function publishDetectiveFinding(room, player) {
  const finding = player.character.caseNotebook?.lastFinding;
  if (!finding) throw new Error("Спочатку проведіть приватну перевірку.");
  if (finding.published) throw new Error("Цей висновок уже оприлюднено.");
  const delta = finding.resultType === "contradiction" ? 2 : finding.resultType === "consistent" ? -1 : 0;
  room.game.mystery.publicTheory[finding.targetId] = clamp(Number(room.game.mystery.publicTheory[finding.targetId] || 0) + delta, -5, 10);
  const toneText = finding.resultType === "contradiction" ? "виявила невідповідність" : finding.resultType === "consistent" ? "не виявила суперечності" : "не дала певного висновку";
  room.game.mystery.publicClaims.push({ round: room.game.round, targetName: finding.targetName, aspectLabel: finding.aspectLabel, tone: finding.resultType, text: `Анонімна перевірка ${finding.aspectLabel} гравця «${finding.targetName}» ${toneText}. Автор і надійність джерела не розкриваються.` });
  finding.published = true;
  player.character.privateNotes.push("Останній висновок анонімно додано до публічної дошки версій.");
}
function castDetectiveAccusation(room, player, body) {
  if (room.settings.setting !== "detective" || !room.game?.mystery) throw new Error("Фінальне звинувачення доступне лише в детективному сетингу.");
  if (!canParticipateInDecision(room, player, "final_accusation")) throw new Error("Ви не можете висунути звинувачення зараз.");
  if (room.game.phase === "final") throw new Error("Справу вже завершено.");
  const target = room.players.find((candidate) => candidate.id === String(body.targetId || "") && candidate.id !== player.id);
  if (!target) throw new Error("Оберіть іншого учасника як головного підозрюваного.");
  room.game.mystery.accusationVotes[player.id] = target.id;
  player.character.privateNotes.push(`Ваше фінальне звинувачення зафіксовано проти гравця «${target.name}». Воно залишається таємним до фіналу.`);
}

function compactShelterDefinition(source) {
  const shelter = JSON.parse(JSON.stringify(source || {}));
  const originalRooms = Array.isArray(shelter.rooms) ? shelter.rooms : [];
  const selectedRooms = originalRooms.slice(0, 6).map((room, index) => {
    const name = String(room.name || `Приміщення ${index + 1}`);
    const isHousing = /(житл|спаль|кают|палат|казарм|келі|гуртож|барак|капсул|кімнат)/i.test(name);
    const count = Math.max(1, Math.min(Number(room.count) || 1, isHousing ? 2 : 1));
    return { ...room, name, count };
  });
  let roomBudget = 7;
  for (let index = 0; index < selectedRooms.length; index += 1) {
    const minimumForRest = selectedRooms.length - index - 1;
    selectedRooms[index].count = Math.max(1, Math.min(selectedRooms[index].count, roomBudget - minimumForRest));
    roomBudget -= selectedRooms[index].count;
  }
  const totalRooms = selectedRooms.reduce((sum, room) => sum + room.count, 0);
  shelter.rooms = selectedRooms;
  shelter.roomCount = totalRooms;
  const compactArea = Math.round(Math.max(180, Math.min(Number(shelter.areaM2) || totalRooms * 70, totalRooms * 70 + 120, 850)) / 10) * 10;
  shelter.areaM2 = compactArea;
  shelter.provisions = (Array.isArray(shelter.provisions) ? shelter.provisions : []).slice(0, 4).map((item) => {
    const quantity = Number(item.quantity);
    return Number.isFinite(quantity) ? { ...item, quantity: Math.max(1, Math.round(quantity * 0.18)) } : { ...item };
  });
  return shelter;
}
function estimateShelterResidentCapacity(shelter) {
  const rooms = Array.isArray(shelter?.rooms) ? shelter.rooms : [];
  let beds = 0;
  for (const room of rooms) {
    const name = String(room.name || "").toLocaleLowerCase("uk-UA");
    const count = Math.max(0, Number(room.count) || 0);
    if (!/(житл|спаль|кают|палат|казарм|келі|гуртож|барак|капсул|кімнат|кубри|дормітор)/.test(name)) continue;
    let perRoom = 3;
    if (/(казарм|гуртож|барак|палат)/.test(name)) perRoom = 4;
    if (/(кают|капсул|келі)/.test(name)) perRoom = 2;
    beds += count * perRoom;
  }
  const areaLimit = Math.max(4, Math.floor((Number(shelter?.areaM2) || 0) / 24));
  const roomLimit = Math.max(4, Math.floor((Number(shelter?.roomCount) || rooms.reduce((sum, room) => sum + (Number(room.count) || 0), 0)) * 1.8));
  const estimated = beds > 0 ? beds : roomLimit;
  return clamp(Math.min(estimated, areaLimit, Math.max(roomLimit, estimated)), 4, 120);
}
function balancedStartingResources(initialResources, catastrophe) {
  const defaults = { food: 68, water: 68, energy: 62, integrity: 68, medicine: 52, morale: 62 };
  const pressure = Number(catastrophe?.pressure || 1);
  const result = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const raw = Number(initialResources?.[key] ?? fallback);
    const compressed = 58 + (raw - 58) * 0.55;
    const pressurePenalty = ["food", "water", "energy", "medicine"].includes(key) ? Math.max(0, pressure - 1) * 13 : Math.max(0, pressure - 1) * 6;
    const jitter = Math.floor(random() * 13) - 7;
    result[key] = clamp(Math.round(compressed - pressurePenalty + jitter), 28, 88);
  }
  return result;
}
function publicDiscussionTimer(room) {
  const timer = room.game?.discussionTimer || { durationSeconds: 300, remainingSeconds: 300, running: false, endsAt: null };
  const remainingSeconds = timer.running && timer.endsAt
    ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000))
    : Math.max(0, Number(timer.remainingSeconds || 0));
  return {
    durationSeconds: Number(timer.durationSeconds || 300),
    remainingSeconds,
    running: Boolean(timer.running && remainingSeconds > 0),
    endsAt: timer.running && remainingSeconds > 0 ? Number(timer.endsAt) : null
  };
}
function pauseDiscussionTimer(room) {
  const current = publicDiscussionTimer(room);
  room.game.discussionTimer = { ...current, running: false, endsAt: null };
}
function resetDiscussionTimer(room) {
  const durationSeconds = clamp(Number(room.game?.discussionTimer?.durationSeconds || 300), 15, 3600);
  room.game.discussionTimer = { durationSeconds, remainingSeconds: durationSeconds, running: false, endsAt: null };
}
function automationPhaseKey(room) {
  const attempt = room.game?.runoff?.status === "voting" && room.game?.runoff?.round === room.game?.round ? 2 : 1;
  return `${Number(room.game?.round || 0)}:${room.game?.phase || "none"}:${attempt}`;
}
function ensureAutomationRuntime(room) {
  if (!room.game) return null;
  const config = normalizeAutomationSettings(room.settings);
  room.game.automation ||= {};
  const runtime = room.game.automation;
  runtime.mode = config.mode;
  runtime.inactivitySeconds = config.inactivitySeconds;
  runtime.phaseSeconds = config.phaseSeconds;
  runtime.skips ||= {};
  runtime.history ||= [];
  runtime.phaseEnteredAt ||= Date.now();
  if (config.mode !== "off" && !runtime.phaseDeadlineAt) runtime.phaseDeadlineAt = runtime.phaseEnteredAt + config.phaseSeconds * 1000;
  if (config.mode === "off") runtime.phaseDeadlineAt = null;
  return runtime;
}
function startAutomationPhase(room, { preserveEnteredAt = false } = {}) {
  const runtime = ensureAutomationRuntime(room);
  if (!runtime) return;
  const config = normalizeAutomationSettings(room.settings);
  const now = Date.now();
  if (!preserveEnteredAt) runtime.phaseEnteredAt = now;
  runtime.phaseKey = automationPhaseKey(room);
  runtime.phaseDeadlineAt = config.mode === "off" ? null : now + config.phaseSeconds * 1000;
  runtime.nextAutoAdvanceAt = null;
  runtime.lastPhaseMessage = null;
  runtime.skips[runtime.phaseKey] ||= [];
  for (const player of room.players) {
    if (player.automation) player.automation.controlled = false;
  }
  if (isTimedPhase(room.game.phase)) {
    if (config.mode === "auto") {
      room.game.discussionTimer = { durationSeconds: config.phaseSeconds, remainingSeconds: config.phaseSeconds, running: true, endsAt: runtime.phaseDeadlineAt };
    } else {
      resetDiscussionTimer(room);
    }
  }
}
function automationSkipSet(room) {
  const runtime = ensureAutomationRuntime(room);
  const key = automationPhaseKey(room);
  runtime.skips[key] ||= [];
  return new Set(runtime.skips[key]);
}
function isAutomationSkipped(room, playerId) {
  return automationSkipSet(room).has(playerId);
}
function markAutomationSkipped(room, player, reason, actionLabel) {
  const runtime = ensureAutomationRuntime(room);
  const key = automationPhaseKey(room);
  const set = new Set(runtime.skips[key] || []);
  set.add(player.id);
  runtime.skips[key] = [...set];
  runtime.history.push({ at: Date.now(), round: room.game.round, phase: room.game.phase, playerId: player.id, playerName: player.name, reason, action: actionLabel });
  runtime.history = runtime.history.slice(-60);
  runtime.lastPhaseMessage = `${player.name}: ${actionLabel}`;
  player.automation ||= {};
  player.automation.controlled = true;
  player.automation.lastActionAt = Date.now();
  player.automation.lastAction = actionLabel;
  player.automation.lastReason = reason;
}
function clearAutomationControlOnReturn(player) {
  if (!player.automation?.controlled) return false;
  player.automation.controlled = false;
  player.automation.returnedAt = Date.now();
  return true;
}
function playerOfflineSeconds(player, now = Date.now()) {
  return Math.max(0, Math.floor((now - Number(player.lastSeen || now)) / 1000));
}
function playerIsOffline(player, now = Date.now()) {
  return now - Number(player.lastSeen || 0) >= 12000;
}
function playerIsAutomationInactive(room, player, now = Date.now()) {
  const config = normalizeAutomationSettings(room.settings);
  return now - Number(player.lastSeen || 0) >= config.inactivitySeconds * 1000;
}
function revealRequirement(room, player) {
  if (!player.active || isDetained(room, player) || !player.character) return { required: 0, used: 0, complete: true };
  const keys = characterKeysForRoom(room);
  const used = Number(player.character.revealsUsedRound || 0);
  const hidden = keys.filter((key) => !player.character.revealed?.[key]).length;
  const required = Math.min(Number(room.settings.revealsPerRound || 0), hidden + used);
  return { required, used, complete: required === 0 || used >= required || isAutomationSkipped(room, player.id) };
}
function eventDecisionPolicy(room) {
  return room.game?.features?.elimination ? "host" : "collective";
}
function eventDecisionEligible(room, player) {
  if (!player || !room.game || room.game.phase !== "event") return false;
  if (eventDecisionPolicy(room) === "host") return player.id === room.hostPlayerId;
  return canParticipateInDecision(room, player, "event");
}
function eventDecisionVoters(room) {
  return room.players.filter((player) => eventDecisionEligible(room, player));
}
function neutralEventChoice(event) {
  const choices = Array.isArray(event?.choices) ? event.choices : [];
  return [...choices].sort((a, b) => {
    const badA = Object.values(a.bad || {}).reduce((sum, value) => sum + Math.abs(Number(value) || 0), 0);
    const badB = Object.values(b.bad || {}).reduce((sum, value) => sum + Math.abs(Number(value) || 0), 0);
    return Number(b.success || 0) - Number(a.success || 0) || badA - badB || String(a.id).localeCompare(String(b.id));
  })[0] || null;
}
function neutralizePlayerForPhase(room, player, reason = "тайм-аут") {
  const game = room.game;
  if (!game || game.phase === "final") return false;
  const phase = game.phase;
  if (isAutomationSkipped(room, player.id)) return false;
  if (phase === "reveal") {
    const requirement = revealRequirement(room, player);
    if (requirement.complete) return false;
    markAutomationSkipped(room, player, reason, "пропуск розкриття");
    game.log.push(`Автоматичний ведучий: ${player.name} пропускає розкриття через ${reason}.`);
    return true;
  }
  if (phase === "investigation" && room.settings.setting === "detective" && game.mystery) {
    if (!player.active || isDetained(room, player) || player.character?.investigationUsedRound === game.round) return false;
    const candidates = room.players
      .filter((candidate) => candidate.active && candidate.id !== player.id)
      .sort((a, b) => Number(game.mystery.publicTheory?.[a.id] || 0) - Number(game.mystery.publicTheory?.[b.id] || 0) || String(a.id).localeCompare(String(b.id)));
    const target = candidates[0];
    if (!target) return false;
    const aspects = DETECTIVE_CASE.ASPECTS || ["alibi"];
    const playerIndex = Math.max(0, room.players.findIndex((candidate) => candidate.id === player.id));
    const aspect = aspects[(Number(game.round || 1) + playerIndex - 1) % aspects.length] || "alibi";
    runDetectiveInvestigation(room, player, target, aspect);
    player.character.investigationUsedRound = game.round;
    markAutomationSkipped(room, player, reason, "нейтральна приватна перевірка");
    game.log.push(`Автоматичний ведучий: для відсутнього гравця ${player.name} проведено нейтральну приватну перевірку без розкриття його ролі.`);
    return true;
  }
  if (phase === "event") {
    if (!eventDecisionEligible(room, player) || game.eventVotes?.[player.id]) return false;
    const hostDecision = eventDecisionPolicy(room) === "host";
    const neutralChoice = neutralEventChoice(game.event);
    game.eventVotes[player.id] = hostDecision && neutralChoice ? neutralChoice.id : SKIP_VOTE;
    markAutomationSkipped(room, player, reason, hostDecision ? "нейтральне рішення кризи" : "утримання під час кризи");
    game.log.push(hostDecision
      ? `Автоматичний ведучий: для кризи обрано нейтральний варіант через ${reason}.`
      : `Автоматичний ведучий: для ${player.name} зафіксовано утримання під час кризи.`);
    return true;
  }
  if (phase === "elimination") {
    if (!player.active || isDetained(room, player) || isSilenced(room, player)) return false;
    let changed = false;
    if (!game.eliminationVotes?.[player.id]) {
      game.eliminationVotes[player.id] = { targetId: SKIP_VOTE, sanction: "exile" };
      changed = true;
    }
    if (pendingAppeals(room).length && !game.returnVotes?.[player.id]) {
      game.returnVotes[player.id] = SKIP_VOTE;
      changed = true;
    }
    if (room.settings.setting === "detective" && game.mystery && !game.mystery.accusationVotes?.[player.id]) {
      game.mystery.accusationVotes[player.id] = SKIP_VOTE;
      changed = true;
    }
    if (!changed) return false;
    markAutomationSkipped(room, player, reason, "утримання під час рішення громади");
    game.log.push(`Автоматичний ведучий: для ${player.name} зафіксовано нейтральне рішення.`);
    return true;
  }
  if (!player.active && game.features?.outsidePlay && isSocialPhase(phase) && player.outsideActionUsedRound !== game.round) {
    markAutomationSkipped(room, player, reason, "пропуск зовнішньої дії");
    game.log.push(`Автоматичний ведучий: ${player.name} пропускає зовнішню дію цього раунду.`);
    return true;
  }
  if (isSocialPhase(phase) || phase === "operations") {
    markAutomationSkipped(room, player, reason, "пропуск необов’язкових дій");
    return true;
  }
  return false;
}
function phaseRequiredStatus(room) {
  const game = room.game;
  if (!game) return { required: 0, completed: 0, pending: [] };
  const pending = [];
  let required = 0;
  let completed = 0;
  for (const player of room.players) {
    if (game.phase === "reveal") {
      if (!player.active || isDetained(room, player) || !player.character) continue;
      required += 1;
      if (revealRequirement(room, player).complete) completed += 1;
      else pending.push(player);
    } else if (game.phase === "investigation") {
      if (room.settings.setting !== "detective" || !game.mystery || !player.active || isDetained(room, player)) continue;
      required += 1;
      if (player.character?.investigationUsedRound === game.round || isAutomationSkipped(room, player.id)) completed += 1;
      else pending.push(player);
    } else if (game.phase === "event") {
      if (!eventDecisionEligible(room, player)) continue;
      required += 1;
      if (game.eventVotes?.[player.id]) completed += 1;
      else pending.push(player);
    } else if (game.phase === "elimination") {
      if (!player.active || isDetained(room, player) || isSilenced(room, player)) continue;
      required += 1;
      const main = Boolean(game.eliminationVotes?.[player.id]);
      const appeal = !pendingAppeals(room).length || Boolean(game.returnVotes?.[player.id]);
      const accusation = room.settings.setting !== "detective" || Boolean(game.mystery?.accusationVotes?.[player.id]);
      if (main && appeal && accusation) completed += 1;
      else pending.push(player);
    }
  }
  return { required, completed, pending };
}
function neutralizePendingPlayers(room, { allPending = false, reason = "тайм-аут", targetId = null } = {}) {
  const now = Date.now();
  const candidates = targetId
    ? room.players.filter((player) => player.id === targetId)
    : phaseRequiredStatus(room).pending;
  const changed = [];
  for (const player of candidates) {
    if (!allPending && !playerIsOffline(player, now)) continue;
    if (neutralizePlayerForPhase(room, player, reason)) changed.push(player.name);
  }
  return changed;
}
function publicAutomationState(room) {
  const runtime = ensureAutomationRuntime(room);
  const config = normalizeAutomationSettings(room.settings);
  if (!runtime) return null;
  const remainingSeconds = runtime.phaseDeadlineAt ? Math.max(0, Math.ceil((runtime.phaseDeadlineAt - Date.now()) / 1000)) : null;
  const required = phaseRequiredStatus(room);
  return {
    mode: config.mode,
    modeLabel: config.mode === "auto" ? "Автоматичний ведучий" : config.mode === "assist" ? "Допоміжний режим" : "Ручне ведення",
    inactivitySeconds: config.inactivitySeconds,
    phaseSeconds: config.phaseSeconds,
    phaseEnteredAt: runtime.phaseEnteredAt,
    phaseDeadlineAt: runtime.phaseDeadlineAt,
    remainingSeconds,
    expired: remainingSeconds === 0 && runtime.phaseDeadlineAt != null,
    required: required.required,
    completed: required.completed,
    pending: required.pending.map((player) => player.name),
    lastMessage: runtime.lastPhaseMessage || null,
    history: (runtime.history || []).slice(-12).map((item) => ({ ...item }))
  };
}
function autoAdvanceCurrentPhase(room, reason = "автоматичний ведучий") {
  const game = room.game;
  if (!game || game.phase === "final") return false;
  if (game.phase === "event" && !game.event?.resolved) {
    resolveEvent(room);
    const runtime = ensureAutomationRuntime(room);
    runtime.nextAutoAdvanceAt = Date.now() + AUTO_EVENT_DELAY_MS;
    runtime.lastPhaseMessage = "Кризу автоматично підраховано";
    return true;
  }
  const before = `${game.round}:${game.phase}:${game.runoff?.status || ""}`;
  advancePhase(room);
  const after = `${game.round}:${game.phase}:${game.runoff?.status || ""}`;
  if (before !== after) {
    room.game.log.push(`Автоматичний ведучий переходить далі: ${reason}.`);
    return true;
  }
  return false;
}
function processRoomAutomation(room) {
  if (!room.game || room.game.phase === "final") return false;
  const config = normalizeAutomationSettings(room.settings);
  if (config.mode === "off") return false;
  const runtime = ensureAutomationRuntime(room);
  const now = Date.now();
  let changed = false;
  const required = phaseRequiredStatus(room);
  const hasRequired = ["reveal", "investigation", "event", "elimination"].includes(room.game.phase);
  if (config.mode === "assist") {
    const absent = required.pending.filter((player) => playerIsAutomationInactive(room, player, now));
    for (const player of absent) if (neutralizePlayerForPhase(room, player, `відсутність понад ${config.inactivitySeconds} с`)) changed = true;
  }
  if (config.mode === "auto" && runtime.phaseDeadlineAt && now >= runtime.phaseDeadlineAt) {
    const names = neutralizePendingPlayers(room, { allPending: true, reason: `завершення ліміту фази (${config.phaseSeconds} с)` });
    if (names.length) changed = true;
    if (!runtime.nextAutoAdvanceAt) runtime.nextAutoAdvanceAt = now + AUTO_PHASE_DELAY_MS;
  }
  if (config.mode === "auto" && hasRequired && phaseRequiredStatus(room).pending.length === 0 && !runtime.nextAutoAdvanceAt) {
    runtime.nextAutoAdvanceAt = now + AUTO_ADVANCE_DELAY_MS;
  }
  if (config.mode === "auto" && runtime.nextAutoAdvanceAt && now >= runtime.nextAutoAdvanceAt) {
    runtime.nextAutoAdvanceAt = null;
    if (autoAdvanceCurrentPhase(room, runtime.phaseDeadlineAt && now >= runtime.phaseDeadlineAt ? "час фази вичерпано" : "усі обов’язкові дії виконано")) changed = true;
  }
  return changed;
}

function createSeededGame(room) {
  const mode = modeConfig(room.settings);
  room.settings.hiddenRoles = mode.hiddenRoles;
  if (!mode.elimination) room.settings.capacity = room.players.length;
  const pack = contentPackForRoom(room);
  const bundle = contentBundle(room.settings.setting, pack);
  const data = bundle.data;
  const settingRule = SETTING_RULES[room.settings.setting] || null;
  const tutorial = tutorialEnabled(room);
  const catastrophe = tutorial
    ? JSON.parse(JSON.stringify(TUTORIAL_CATASTROPHE))
    : room.settings.scenarioMode === "catalog"
      ? { ...LORE.enrichCatastrophe(chooseContentEntry(data.catastrophes, room.settings.absurdity)), procedural: false, modules: null, pressure: 1, startingEffects: {}, hiddenComplication: null, complicationRevealRound: null }
      : SCENARIOS.generate(room.settings.setting, room.settings.absurdity);
  const shelterBase = compactShelterDefinition(tutorial ? TUTORIAL_SHELTER : sample(data.shelters));
  const used = Object.fromEntries([
    "origin", "genderIdentity", "attitudeToChildren", "anomaly",
    "profession", "health", "skill", "trait", "item", "hobby", "phobia", "secret", "relationship",
    "alibi", "motive", "access", "testimony", "evidenceLink"
  ].map((key) => [key, new Set()]));
  const roleDeck = buildRoleDeck(room.players.length, mode.hiddenRoles, mode);
  const compatibleAbilities = uniqueEntries(bundle.common.abilities).filter((ability) => abilityAllowedForMode(ability, mode));
  const settingCompatibleAbilities = room.settings.setting === "detective"
    ? compatibleAbilities.filter((ability) => DETECTIVE_ABILITY_IDS.has(ability.id))
    : compatibleAbilities;
  const abilityDeck = shuffled(settingCompatibleAbilities.length ? settingCompatibleAbilities : compatibleAbilities.length ? compatibleAbilities : uniqueEntries(bundle.common.abilities));
  const sexDeck = shuffled(bundle.common.sexes);
  const healthDeck = buildHealthDeck(room.settings.setting, data, room.players.length, room.settings.absurdity);
  room.players.forEach((player, index) => {
    player.active = true;
    player.eliminatedRound = null;
    player.returnedRound = null;
    player.detainedUntilRound = null;
    player.silencedUntilRound = null;
    player.outsideRole = null;
    player.outsideActionUsedRound = null;
    player.appealUsed = false;
    const ability = abilityDeck[index % abilityDeck.length];
    const sexData = sexDeck[index % sexDeck.length];
    player.character = generateCharacter(room.settings.setting, room.settings, used, player, room.players, roleDeck[index], ability, sexData, healthDeck[index], bundle);
    if (player.character.role?.id === "scoutmaster" && !mode.operations) {
      player.character.role.description = "Ви можете один раз підготувати захисний план до наступної кризи.";
      player.character.role.objective = "Скасувати один негативний наслідок події та залишитися у фінальній групі.";
    }
  });
  assignReciprocalRelationships(room.players);
  assignPersonalGoals(room, mode);
  room.game = {
    mode: mode.id,
    settingRule: settingRule ? { name: settingRule.name, description: settingRule.description } : null,
    contentPack: pack ? { id: pack.id, name: pack.name } : null,
    campaign: room.campaignId ? { id: room.campaignId, name: platform.getCampaign(room.campaignId)?.name || "Кампанія" } : null,
    settingModifiers: settingRule ? JSON.parse(JSON.stringify(settingRule)) : null,
    features: publicModeFeatures(room.settings),
    phase: phaseLoopFor(room.settings)[0],
    round: 1,
    maxRounds: room.settings.rounds,
    catastrophe,
    shelter: {
      title: shelterBase.title,
      description: shelterBase.description,
      capacity: room.settings.capacity,
      selectionCapacity: room.settings.capacity,
      residentCapacity: estimateShelterResidentCapacity(shelterBase),
      areaM2: shelterBase.areaM2,
      roomCount: shelterBase.roomCount,
      rooms: (shelterBase.rooms || []).map((roomInfo) => ({ ...roomInfo })),
      provisions: (shelterBase.provisions || []).map((item) => ({ ...item })),
      resources: tutorial ? { ...TUTORIAL_SHELTER.initialResources } : balancedStartingResources(shelterBase.initialResources, catastrophe),
      modules: makeModules(shelterBase),
      allies: 0,
      assets: []
    },
    event: null,
    discussionTimer: { durationSeconds: 300, remainingSeconds: 300, running: false, endsAt: null },
    automation: null,
    eventVotes: {},
    eliminationVotes: {},
    returnVotes: {},
    appeals: {},
    outsideCamp: mode.outsidePlay ? newOutsideCamp() : null,
    runoff: null,
    judgementReport: null,
    judgementHistory: [],
    tradeCount: 0,
    treatmentCount: 0,
    treatmentHistory: [],
    reasonHistory: [],
    expeditionBoost: 0,
    expeditionFailureMitigation: 0,
    expeditionRewardMultiplier: 1,
    expeditionNoInjury: false,
    expeditionAutoSuccess: false,
    eventShield: 0,
    rationingRound: null,
    quarantineRound: null,
    treatmentBoostRound: null,
    treatmentBoost: 0,
    forcedEliminationVotes: {},
    preparedEvent: null,
    expeditionRounds: [],
    expeditionOfferRound: 1,
    expeditionOfferIds: [],
    repairRounds: [],
    operationSupport: { round: 1, contributions: {} },
    expeditionHistory: [],
    repairHistory: [],
    log: [
      `Партію розпочато у режимі «${mode.name}», сетинг «${data.name}».`,
      ...(pack ? [`Активовано авторський набір «${pack.name}».`] : []),
      ...(room.campaignId ? [`Продовження кампанії «${platform.getCampaign(room.campaignId)?.name || "Без назви"}».`] : []),
      `Катастрофа: ${catastrophe.title}.`,
      `Сховище: ${shelterBase.title}; площа — ${shelterBase.areaM2} м²; приміщень — ${shelterBase.roomCount}; проєктна місткість — ${estimateShelterResidentCapacity(shelterBase)}; до фінальної групи потрібно відібрати ${room.settings.capacity}.`
    ],
    final: null,
    tutorial: tutorial ? { enabled: true, version: 1, startedAt: Date.now(), completed: false } : null
  };
  if (tutorial) {
    room.game.log.push("Навчальна партія: перший раунд знайомить із розкриттям і кризою без санкцій; другий додає повне рішення громади.");
  }
  if (mode.id === "survival" && room.settings.setting !== "detective") {
    const sharedKeys = ["profession", "health", "skill", "trait", "item"].filter((key) => characterKeysForRoom(room).includes(key));
    for (const player of room.players) {
      for (const key of sharedKeys) player.character.revealed[key] = true;
      player.character.revealsUsedRound = 0;
    }
    room.game.log.push(`Кооперативний брифінг: професія, здоров’я, навичка, риса й багаж усіх учасників відкриті одразу. Таємниці та особисті зв’язки залишаються приватними.`);
  }
  if (isTimedPhase(room.game.phase)) resetDiscussionTimer(room);
  room.game.scenario = {
    procedural: Boolean(catastrophe.procedural),
    pressure: Number(catastrophe.pressure || 1),
    hiddenComplication: catastrophe.hiddenComplication || null,
    complicationRevealRound: catastrophe.complicationRevealRound || null,
    complicationRevealed: false,
    complicationApplied: false
  };
  delete room.game.catastrophe.hiddenComplication;
  delete room.game.catastrophe.startingEffects;
  delete room.game.catastrophe.complicationRevealRound;
  delete room.game.catastrophe.pressure;
  if (catastrophe.startingEffects && Object.keys(catastrophe.startingEffects).length) {
    const notes = applyEffects(room, catastrophe.startingEffects);
    room.game.log.push(`Початковий тиск сценарію: ${notes}.`);
  }
  if (settingRule?.startEffects && Object.keys(settingRule.startEffects).length) {
    const notes = applyEffects(room, settingRule.startEffects);
    room.game.log.push(`Правило сетингу «${settingRule.name}»: ${notes}.`);
  }
  initializeCampaignLegacy(room);
  if (room.settings.setting === "detective") initializeDetectiveMystery(room);
  room.game.scenarioPriorities = buildScenarioPriorities(room);
  validatePriorities(room.game.scenarioPriorities);
  room.game.log.push("Сформовано короткий брифінг: 3 загрози, 3 критичні потреби, 2 особливі умови та 1 довгостроковий ризик.");
  initializeStrategicReveals(room);
  if (mode.operations) refreshExpeditionOffers(room, true);
  startAutomationPhase(room);
}
function createGame(room) {
  applyTutorialPreset(room.settings, room.players.length);
  room.campaignId = room.settings.tutorialEnabled ? null : room.campaignId;
  const seed = ensureGenerationSettings(room);
  withSeededRandom(seed, () => createSeededGame(room));
  room.game.generation = {
    seed,
    schema: GENERATION_SCHEMA,
    configCode: generationConfigCode(room),
    fingerprint: generationFingerprint(room),
    playerCount: room.players.length,
    reproducible: true,
    migrated: false,
    createdAt: Date.now()
  };
  room.settings.generationSchema = GENERATION_SCHEMA;
  room.game.log.push(`Відтворювана генерація: seed ${seed}; код ${room.game.generation.configCode}; відбиток ${room.game.generation.fingerprint}.`);
}

function publicCatastrophe(room, includeHidden = false) {
  const base = JSON.parse(JSON.stringify(room.game?.catastrophe || {}));
  const scenario = room.game?.scenario || {};
  if (base.modules) {
    base.modules.complication = scenario.complicationRevealed && scenario.hiddenComplication
      ? scenario.hiddenComplication.title
      : "Невідома обставина";
  }
  base.complication = scenario.complicationRevealed && scenario.hiddenComplication
    ? { title: scenario.hiddenComplication.title, text: scenario.hiddenComplication.reveal }
    : scenario.procedural ? { title: "Невідома обставина", text: scenario.hiddenComplication?.publicHint || "У сценарії є прихований чинник, який відкриється пізніше." } : null;
  if (includeHidden && scenario.hiddenComplication) base.hiddenComplication = JSON.parse(JSON.stringify(scenario.hiddenComplication));
  return base;
}
function revealScenarioComplication(room) {
  const scenario = room.game?.scenario;
  if (!scenario?.procedural || scenario.complicationRevealed || !scenario.hiddenComplication) return false;
  if (room.game.round < Number(scenario.complicationRevealRound || 2)) return false;
  scenario.complicationRevealed = true;
  const complication = scenario.hiddenComplication;
  let notes = "";
  if (!scenario.complicationApplied && complication.effects) {
    notes = applyEffects(room, complication.effects);
    scenario.complicationApplied = true;
  }
  room.game.log.push(`Розкрито невідому обставину «${complication.title}». ${complication.reveal}${notes ? ` Наслідки: ${notes}.` : ""}`);
  room.game.scenarioPriorities = buildScenarioPriorities(room);
  validatePriorities(room.game.scenarioPriorities);
  return true;
}

function resourceName(key) {
  return ({ food: "їжа", water: "вода", energy: "енергія", integrity: "цілісність", medicine: "медицина", morale: "мораль" })[key] || key;
}
function applyEffects(room, effects) {
  const shelter = room.game.shelter;
  const notes = [];
  for (const [key, value] of Object.entries(effects || {})) {
    if (Object.prototype.hasOwnProperty.call(shelter.resources, key)) {
      shelter.resources[key] = clamp(shelter.resources[key] + value, 0, 100);
      notes.push(`${resourceName(key)} ${value >= 0 ? "+" : ""}${value}`);
    } else if (key === "allies") {
      shelter.allies = Math.max(0, shelter.allies + value);
      notes.push(`союзники ${value >= 0 ? "+" : ""}${value}`);
    } else if (key === "assets") {
      shelter.assets.push(value);
      notes.push(`знахідка: ${typeof value === "string" ? value : value.name}`);
    }
  }
  return notes.join(", ");
}
function campaignLegacyEligibleVoters(room) {
  return activePlayers(room).filter((player) => canParticipateInDecision(room, player, "campaign"));
}
function campaignLegacyOptionAffordable(room, option) {
  const resources = room.game?.shelter?.resources || {};
  return Object.entries(option?.requires || {}).every(([key, amount]) => Number(resources[key] || 0) >= Number(amount || 0));
}
function campaignLegacyTally(room) {
  const legacy = room.game?.campaignLegacy;
  if (!legacy?.dilemma) return [];
  const eligible = new Set(campaignLegacyEligibleVoters(room).map((player) => player.id));
  const counts = Object.fromEntries((legacy.dilemma.options || []).map((option) => [option.id, 0]));
  for (const [playerId, optionId] of Object.entries(legacy.dilemma.votes || {})) {
    if (eligible.has(playerId) && Object.prototype.hasOwnProperty.call(counts, optionId)) counts[optionId] += 1;
  }
  return (legacy.dilemma.options || []).map((option) => ({ optionId: option.id, count: counts[option.id] || 0 }));
}
function publicCampaignLegacy(room, requester) {
  const legacy = room.game?.campaignLegacy;
  if (!legacy?.enabled || !legacy.dilemma) return null;
  const eligible = campaignLegacyEligibleVoters(room);
  const tally = campaignLegacyTally(room);
  const counts = Object.fromEntries(tally.map((item) => [item.optionId, item.count]));
  const dilemma = legacy.dilemma;
  return {
    enabled: true,
    campaignName: legacy.campaignName,
    chapterNumber: legacy.chapterNumber,
    sourceChapter: legacy.sourceChapter || null,
    startingSummary: legacy.startingSummary || null,
    startingEffects: { ...(legacy.startingEffects || {}) },
    legacyAssets: [...(legacy.legacyAssets || [])],
    dilemma: {
      id: dilemma.id,
      kind: dilemma.kind,
      title: dilemma.title,
      context: dilemma.context,
      benefit: dilemma.benefit,
      dueRound: dilemma.dueRound,
      status: dilemma.status,
      resolvedOptionId: dilemma.resolvedOptionId || null,
      resultText: dilemma.resultText || null,
      automatic: Boolean(dilemma.automatic),
      options: (dilemma.options || []).map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        effects: { ...(option.effects || {}) },
        affordable: campaignLegacyOptionAffordable(room, option),
        votes: counts[option.id] || 0
      }))
    },
    myVote: dilemma.votes?.[requester.id] || null,
    eligibleVoters: eligible.length,
    votesCast: Object.keys(dilemma.votes || {}).filter((playerId) => eligible.some((player) => player.id === playerId)).length,
    canVote: dilemma.status === "open" && eligible.some((player) => player.id === requester.id),
    canResolve: requester.id === room.hostPlayerId && dilemma.status === "open",
    history: (legacy.history || []).slice(-8).map((item) => ({ ...item }))
  };
}
function initializeCampaignLegacy(room, { migrated = false } = {}) {
  const campaign = platform.getCampaign(room.campaignId || room.settings?.campaignId);
  if (!campaign || !campaign.chapters?.length || !room.game) {
    room.game.campaignLegacy = null;
    return null;
  }
  if (room.game.campaignLegacy !== undefined) return room.game.campaignLegacy;
  const legacy = buildCampaignLegacy(campaign, room.game.maxRounds || room.settings.rounds);
  if (!legacy) {
    room.game.campaignLegacy = null;
    return null;
  }
  legacy.migrated = Boolean(migrated);
  legacy.startingApplied = !migrated;
  legacy.startingSummary = migrated ? "Стара активна кімната: попередні стартові ефекти не застосовуються повторно." : "";
  room.game.campaignLegacy = legacy;
  if (!migrated) {
    const notes = applyEffects(room, legacy.startingEffects || balancedStartingEffects(campaign.carryover || {}));
    for (const name of legacy.legacyAssets || []) {
      room.game.shelter.assets.push({ name, description: "Спадковий об’єкт кампанії. Його перевага пов’язана з окремим зобов’язанням.", campaignLegacy: true });
    }
    legacy.startingSummary = [notes, legacy.legacyAssets?.length ? `спадкові об’єкти: ${legacy.legacyAssets.join(", ")}` : ""].filter(Boolean).join("; ") || "Числової стартової переваги немає.";
  }
  room.game.log.push(`Кампанійна спадщина: ${legacy.dilemma.title}. Перевага має ціну; рішення потрібно ухвалити до завершення ${legacy.dilemma.dueRound}-го раунду.`);
  return legacy;
}
function applyCampaignLegacyOption(room, option) {
  const legacy = room.game.campaignLegacy;
  const notes = [];
  const effectText = applyEffects(room, option.effects || {});
  if (effectText) notes.push(effectText);
  if (Number(option.moduleDelta || 0)) {
    const module = [...(room.game.shelter.modules || [])].sort((a, b) => Number(a.condition || 0) - Number(b.condition || 0))[0];
    if (module) {
      const before = Number(module.condition || 0);
      module.condition = clamp(before + Number(option.moduleDelta || 0), 0, 100);
      notes.push(`${module.name}: ${before}% → ${module.condition}%`);
    }
  }
  if (option.removeLegacyAsset) {
    const targetName = legacy.dilemma.legacyAsset || legacy.legacyAssets?.[0];
    const index = room.game.shelter.assets.findIndex((asset) => (typeof asset === "string" ? asset : asset?.name) === targetName);
    if (index >= 0) room.game.shelter.assets.splice(index, 1);
    notes.push(`об’єкт «${targetName || "спадщина"}» розібрано`);
  }
  return notes.join("; ") || "без числових змін";
}
function resolveCampaignLegacy(room, { automatic = false, force = false } = {}) {
  const legacy = room.game?.campaignLegacy;
  const dilemma = legacy?.dilemma;
  if (!legacy?.enabled || !dilemma || dilemma.status !== "open") return null;
  const eligible = campaignLegacyEligibleVoters(room);
  const tally = campaignLegacyTally(room);
  const votesCast = tally.reduce((sum, item) => sum + item.count, 0);
  if (!automatic && !force && votesCast < eligible.length && Number(room.game.round || 1) < Number(dilemma.dueRound || 1)) {
    throw new Error(`Ще не всі учасники проголосували (${votesCast}/${eligible.length}). Хост може завершити рішення достроково окремим підтвердженням.`);
  }
  const maxVotes = Math.max(0, ...tally.map((item) => item.count));
  const leaders = tally.filter((item) => item.count === maxVotes && maxVotes > 0).map((item) => item.optionId);
  let optionId = leaders.length === 1 ? leaders[0] : dilemma.fallbackOptionId;
  let option = (dilemma.options || []).find((item) => item.id === optionId);
  if (!option || !campaignLegacyOptionAffordable(room, option)) {
    option = (dilemma.options || []).find((item) => item.id === dilemma.fallbackOptionId && campaignLegacyOptionAffordable(room, item))
      || (dilemma.options || []).find((item) => campaignLegacyOptionAffordable(room, item))
      || (dilemma.options || []).at(-1);
  }
  if (!option) throw new Error("Для кампанійної спадщини не визначено доступного рішення.");
  const resultNotes = applyCampaignLegacyOption(room, option);
  dilemma.status = "resolved";
  dilemma.resolvedOptionId = option.id;
  dilemma.resolvedAt = Date.now();
  dilemma.automatic = Boolean(automatic);
  dilemma.resultText = `${option.label}: ${resultNotes}.`;
  legacy.history ||= [];
  legacy.history.push({ round: room.game.round, optionId: option.id, label: option.label, resultText: dilemma.resultText, automatic: Boolean(automatic), votes: tally });
  room.game.log.push(`Кампанійна дилема${automatic ? " автоматично" : ""} вирішена — «${option.label}». ${resultNotes}.`);
  return option;
}
function activePlayers(room) {
  return room.players.filter((player) => player.active);
}
function isDetained(room, player) {
  return Boolean(player?.active && Number(player.detainedUntilRound || 0) >= Number(room.game?.round || 0));
}
function isSilenced(room, player) {
  return Boolean(player?.active && (Number(player.silencedUntilRound || 0) >= Number(room.game?.round || 0) || player.character?.silencedRound === room.game?.round));
}
const SILENCE_BLOCKED_DECISIONS = new Set(["general", "event", "elimination", "campaign", "outside_deal", "request", "final_accusation", "appeal"]);
function canParticipateInDecision(room, player, type = "general") {
  if (!player?.active) return false;
  if (isDetained(room, player)) return false;
  if (isSilenced(room, player) && SILENCE_BLOCKED_DECISIONS.has(type)) return false;
  return true;
}
function decisionPermissions(room, player) {
  return {
    general: canParticipateInDecision(room, player, "general"),
    event: canParticipateInDecision(room, player, "event"),
    elimination: canParticipateInDecision(room, player, "elimination"),
    campaign: canParticipateInDecision(room, player, "campaign"),
    request: canParticipateInDecision(room, player, "request"),
    finalAccusation: canParticipateInDecision(room, player, "final_accusation"),
    specialist: canParticipateInDecision(room, player, "specialist")
  };
}
function eligibleVoters(room, type = "general") {
  return activePlayers(room).filter((player) => canParticipateInDecision(room, player, type));
}
function pendingAppeals(room) {
  return room.players.filter((player) => !player.active && room.game?.appeals?.[player.id]?.status === "pending");
}
function shouldRunJudgement(room) {
  const mode = modeConfig(room.settings);
  if (!mode.elimination) return false;
  if (room.settings.soloTestMode === true && activePlayers(room).length === 1) return true;
  if (activePlayers(room).length > room.settings.capacity) return true;
  if (room.settings.voteSystem === "tribunal" && !mode.endWhenCapacityReached) return true;
  return pendingAppeals(room).length > 0;
}
function assignOutsideRole(player, room = null) {
  const hasEventPhase = room ? phaseLoopFor(room).includes("event") : true;
  const pool = hasEventPhase ? OUTSIDE_ROLES : OUTSIDE_ROLES.filter((role) => role.id !== "scout");
  if (!player.outsideRole || (!hasEventPhase && player.outsideRole.id === "scout")) player.outsideRole = { ...sample(pool) };
  return player.outsideRole;
}
function notifyRoomStateWaiters(room) {
  const waiters = roomStateWaiters.get(room.code);
  if (!waiters?.size) return;
  for (const waiter of [...waiters]) {
    if (room.revision !== waiter.revision) waiter.finish("changed");
  }
}
function touch(room) {
  room.revision = (room.revision || 0) + 1;
  room.updatedAt = Date.now();
  notifyRoomStateWaiters(room);
  saveRoomsSoon();
}
function ensurePlayerSessionFields(player, room = null) {
  player.joinedAt ||= player.lastSeen || Date.now();
  if (!normalizeRecoveryCode(player.recoveryCode)) player.recoveryCode = uniqueRecoveryCode(room);
  player.recoveryCode = normalizeRecoveryCode(player.recoveryCode);
  player.sessionGeneration = Number(player.sessionGeneration || 1);
  player.connected = Boolean(player.connected);
  return player;
}
function ensureRoomSessionState(room) {
  room.recoveryRequests ||= [];
  room.hostHistory ||= [];
  room.hostLastChangedAt ||= room.createdAt || Date.now();
  room.settings ||= {};
  room.settings.hostFailoverEnabled = room.settings.hostFailoverEnabled !== false;
  room.settings.hostFailoverSeconds = clamp(Number(room.settings.hostFailoverSeconds) || 120, MIN_HOST_FAILOVER_SECONDS, 900);
  ensureGenerationSettings(room);
  for (const player of room.players || []) ensurePlayerSessionFields(player, room);
  const seen = new Set();
  for (const player of room.players || []) {
    while (seen.has(player.recoveryCode)) player.recoveryCode = uniqueRecoveryCode(room);
    seen.add(player.recoveryCode);
  }
  cleanupRecoveryRequests(room);
  return room;
}
function cleanupRecoveryRequests(room, now = Date.now()) {
  room.recoveryRequests ||= [];
  for (const request of room.recoveryRequests) {
    if (request.status === "pending" && Number(request.expiresAt || 0) <= now) request.status = "expired";
  }
  room.recoveryRequests = room.recoveryRequests
    .filter((request) => now - Number(request.createdAt || now) < 1000 * 60 * 60 * 24)
    .slice(-40);
  return room.recoveryRequests;
}
function transferHost(room, target, reason = "Передавання прав") {
  if (!target || !room.players.includes(target)) throw new Error("Нового хоста не знайдено.");
  const previous = room.players.find((item) => item.id === room.hostPlayerId) || null;
  if (previous?.id === target.id) return false;
  room.hostPlayerId = target.id;
  room.hostAccountId = target.accountId || null;
  room.hostLastChangedAt = Date.now();
  target.ready = true;
  room.hostHistory ||= [];
  room.hostHistory.push({ at: Date.now(), previousHostId: previous?.id || null, previousHostName: previous?.name || "Невідомо", newHostId: target.id, newHostName: target.name, reason });
  room.hostHistory = room.hostHistory.slice(-30);
  if (room.game) room.game.log.push(`${reason}: ${target.name} тепер веде партію.`);
  else {
    const campaign = platform.getCampaign(room.campaignId);
    if (!campaign || campaign.ownerAccountId !== room.hostAccountId) { room.campaignId = null; room.settings.campaignId = null; }
    const pack = platform.getPack(room.settings.contentPackId);
    if (pack && !pack.public && pack.ownerAccountId !== room.hostAccountId) room.settings.contentPackId = null;
  }
  return true;
}
function hostFailoverCandidate(room, now = Date.now()) {
  return [...(room.players || [])]
    .filter((player) => player.id !== room.hostPlayerId && !playerIsOffline(player, now))
    .sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || Number(a.joinedAt || 0) - Number(b.joinedAt || 0))[0] || null;
}
function processHostFailover(room, now = Date.now()) {
  ensureRoomSessionState(room);
  if (room.settings.hostFailoverEnabled === false) return false;
  const host = room.players.find((player) => player.id === room.hostPlayerId);
  const threshold = clamp(Number(room.settings.hostFailoverSeconds) || 120, MIN_HOST_FAILOVER_SECONDS, 900);
  if (host && now - Number(host.lastSeen || 0) < threshold * 1000) return false;
  const candidate = hostFailoverCandidate(room, now);
  if (!candidate) return false;
  const hostName = host?.name || "Попередній хост";
  return transferHost(room, candidate, `Автоматична заміна: ${hostName} відсутній понад ${threshold} с`);
}

function persistentRooms(now = Date.now()) { return roomStore.persistentRooms(now); }
function saveRoomsNow() { return roomStore.saveNow(); }
function saveRoomsAsync() { return roomStore.saveAsync(); }
function saveRoomsSoon() { return roomStore.saveSoon(); }
function backupRooms(label = "manual") { return roomStore.backup(label); }
function readPersistedRoomFiles() { return roomStore.read(); }
function loadRooms() {
  try {
    const parsed = readPersistedRoomFiles();
    for (const room of parsed) {
      if (Date.now() - Number(room.updatedAt || room.createdAt || Date.now()) >= ROOM_TTL_MS) continue;
      room.players.forEach((player) => {
        player.connected = false;
        ensurePlayerSessionFields(player, room);
        player.returnedRound ??= null;
        player.detainedUntilRound ??= null;
        player.silencedUntilRound ??= null;
        player.outsideRole ??= null;
        player.outsideActionUsedRound ??= null;
        player.appealUsed ??= false;
        player.accountId ??= null;
        player.automation ||= { controlled: false };
        if (player.character) {
          player.character.medicalCondition ||= MEDICAL.buildMedicalCondition(player.character.health);
          player.character.inventory = (player.character.inventory || []).map((item) => {
            if (typeof item === "string") return makeInventoryItem(item, "Відновлено зі збереження");
            const medical = MEDICAL.treatmentItemMeta(item.name);
            return { medicalUses: item.medicalUses ?? medical?.uses ?? 0, medicalPotency: item.medicalPotency ?? medical?.potency ?? 0, medicalLabel: item.medicalLabel ?? medical?.label ?? null, ...item };
          });
        }
      });
      room.settings ||= {};
      ensureRoomSessionState(room);
      room.settings.mode ||= "advanced";
      room.settings.tutorialEnabled = room.settings.tutorialEnabled === true;
      applyTutorialPreset(room.settings, room.players.length);
      room.settings.scenarioMode = SCENARIO_MODES.has(room.settings.scenarioMode) ? room.settings.scenarioMode : "procedural";
      room.settings.voteSystem = VOTE_SYSTEMS.has(room.settings.voteSystem) ? room.settings.voteSystem : (room.settings.mode === "classic" ? "exile" : "tribunal");
      room.settings.voteVisibility = VOTE_VISIBILITIES.has(room.settings.voteVisibility) ? room.settings.voteVisibility : "secret";
      room.settings.tieRule = normalizeTieRule(room.settings.tieRule);
      const automationSettings = normalizeAutomationSettings(room.settings);
      room.settings.automationMode = automationSettings.mode;
      room.settings.inactivityTimeoutSeconds = automationSettings.inactivitySeconds;
      room.settings.phaseTimeoutSeconds = automationSettings.phaseSeconds;
      room.settings.advancedModules = normalizeAdvancedModules(room.settings.advancedModules, room.settings.mode, room.settings.setting);
      room.settings.demographicsEnabled = room.settings.demographicsEnabled !== false;
      room.settings.hiddenRoles = modeConfig(room.settings).hiddenRoles;
      room.settings.contentPackId ||= null;
      room.campaignId ||= room.settings.campaignId || null;
      room.hostAccountId ||= room.players.find((item) => item.id === room.hostPlayerId)?.accountId || null;
      if (room.game) {
        for (const player of room.players || []) {
          if (!player.character) continue;
          player.character.identity ||= composeIdentity(player.character.sex, player.character.genderIdentity);
          player.character.familyStatus ||= composeFamilyStatus(player.character.attitudeToChildren);
          player.character.demographicContext ||= composeDemographicContext(player.character.identity);
          player.character.attitudeToChildren ||= player.character.familyStatus || "Не застосовується";
          player.character.demographics ||= {
            enabled: room.settings.demographicsEnabled !== false,
            sex: player.character.sex || "Не застосовується",
            genderIdentity: player.character.genderIdentity || "Не застосовується",
            attitudeToChildren: player.character.attitudeToChildren || "Не застосовується",
            parentalStatus: player.character.parentalStatus || "Не зазначено",
            reproductiveStatus: player.character.reproductiveStatus || "Без особливостей",
            canBecomePregnant: Boolean(player.character.canBecomePregnant)
          };
          player.character.demographics.enabled = room.settings.demographicsEnabled !== false;
          player.character.descriptions ||= descriptionsFor(player.character);
          player.character.descriptions.demographicContext ||= describeCharacteristic("demographicContext", player.character.demographicContext);
          player.character.descriptions.attitudeToChildren ||= describeCharacteristic("attitudeToChildren", player.character.attitudeToChildren);
          const migratedRevealed = player.character.revealed || {};
          if (migratedRevealed.sex || migratedRevealed.genderIdentity || migratedRevealed.identity || migratedRevealed.parentalStatus || migratedRevealed.reproductiveStatus) migratedRevealed.demographicContext = true;
          if (migratedRevealed.attitudeToChildren || migratedRevealed.familyStatus) migratedRevealed.attitudeToChildren = true;
          ["sex", "genderIdentity", "identity", "attitudeToChildren", "familyStatus", "parentalStatus", "reproductiveStatus"].forEach((key) => delete migratedRevealed[key]);
          if (room.settings.demographicsEnabled === false) { delete migratedRevealed.demographicContext; delete migratedRevealed.attitudeToChildren; }
          player.character.revealed = migratedRevealed;
        }
        room.game.mode ||= room.settings.mode;
        if (room.settings.tutorialEnabled) room.game.tutorial ||= { enabled: true, version: 1, startedAt: room.createdAt || Date.now(), completed: room.game.phase === "final" };
        room.game.shelter ||= {};
        room.game.shelter.selectionCapacity ||= room.game.shelter.capacity || room.settings.capacity;
        room.game.shelter.residentCapacity ||= estimateShelterResidentCapacity(room.game.shelter);
        room.game.discussionTimer ||= { durationSeconds: 300, remainingSeconds: 300, running: false, endsAt: null };
        room.game.features = publicModeFeatures(room.settings);
        const validLoop = phaseLoopFor(room.settings);
        if (!validLoop.includes(room.game.phase) && room.game.phase !== "final") {
          const compatibility = {
            discussion: validLoop.includes("negotiation") ? "negotiation" : validLoop.includes("planning") ? "planning" : validLoop.includes("investigation") ? "investigation" : validLoop[0],
            reveal: validLoop[0],
            event: validLoop.includes("intrigue") ? "intrigue" : validLoop.includes("event") ? "event" : validLoop[0]
          };
          room.game.phase = compatibility[room.game.phase] || validLoop[0];
        }
        room.game.returnVotes ||= {};
        room.game.appeals ||= {};
        if (room.game.features?.outsidePlay) {
          ensureOutsideCamp(room);
          for (const player of room.players.filter((item) => !item.active)) joinOutsideCamp(room, player);
        }
        room.game.runoff ||= null;
        room.game.judgementReport ||= null;
        room.game.judgementHistory ||= [];
        room.game.treatmentHistory ||= [];
        room.game.reasonHistory ||= [];
        if (room.game.campaignLegacy === undefined) initializeCampaignLegacy(room, { migrated: true });
        ensureAutomationRuntime(room);
        ensureOperationSupport(room);
        room.game.scenarioPriorities ||= buildScenarioPriorities(room);
        validatePriorities(room.game.scenarioPriorities);
        initializeStrategicReveals(room);
        room.game.expeditionOfferIds ||= [];
        room.game.expeditionOfferRound ||= room.game.round || 1;
        if (room.game.features.operations) refreshExpeditionOffers(room, !room.game.expeditionOfferIds.length);
        if (!room.game.generation) {
          room.game.generation = {
            seed: room.settings.generationSeed,
            schema: room.settings.generationSchema || GENERATION_SCHEMA,
            configCode: generationConfigCode(room),
            fingerprint: generationFingerprint(room),
            playerCount: room.players.length,
            reproducible: false,
            migrated: true,
            createdAt: room.createdAt || Date.now()
          };
        }
      }
      if (room.game?.phase === "event" && !room.game.event) createEvent(room);
      rooms.set(room.code, room);
    }
    if (parsed.length) saveRoomsSoon();
  } catch (error) {
    console.warn("Збереження кімнат не завантажено:", error.message);
  }
}
function auth(room, playerId, playerToken) {
  return room.players.find((player) => player.id === playerId && player.token === playerToken) || null;
}

function publicPlayer(player, room) {
  const connected = !playerIsOffline(player);
  const revealed = {};
  if (player.character) {
    for (const key of characterKeysForRoom(room)) {
      if (player.character.revealed[key]) {
        revealed[key] = {
          value: player.character[key],
          description: player.character.descriptions?.[key] || describeCharacteristic(key, player.character[key])
        };
      }
    }
  }
  return {
    id: player.id,
    name: player.name,
    hasAccount: Boolean(player.accountId),
    isHost: player.id === room.hostPlayerId,
    ready: player.ready,
    connected,
    secondsSinceSeen: playerOfflineSeconds(player),
    automationControlled: Boolean(player.automation?.controlled),
    automationLastAction: player.automation?.lastAction || null,
    active: player.active,
    eliminatedRound: player.eliminatedRound,
    returnedRound: player.returnedRound,
    outsideRole: player.outsideRole ? { name: player.outsideRole.name } : null,
    revealed,
    revealCredibility: Number(player.character?.revealCredibility || 0),
    operationSupport: room.game?.features?.operations ? (() => {
      const entry = operationSupportContribution(room, player.id);
      const role = entry ? OPERATION_SUPPORT_ROLES[entry.roleId] : null;
      return role ? { roleId: role.id, roleName: role.name, target: role.target, usedFor: entry.usedFor || null } : null;
    })() : null,
    status: player.character ? {
      stress: player.character.stress || 0,
      injury: player.character.injury || 0,
      protected: player.character.protectedRound === room.game?.round,
      detained: isDetained(room, player),
      silenced: isSilenced(room, player),
      medicalIsolation: Number(player.character.medicalIsolationUntilRound || 0) >= Number(room.game?.round || 0),
      medical: publicMedicalCondition(player),
      decisionPermissions: decisionPermissions(room, player),
      sanctionEffects: isDetained(room, player)
        ? ["Не голосує", "Не лікує", "Не ремонтує", "Не бере участі в експедиції", "Не використовує активні здібності"]
        : isSilenced(room, player) ? ["Не бере участі в колективних рішеннях", "Не створює стратегічні запити", "Не висуває фінальне звинувачення"] : []
    } : null
  };
}
function hostDashboardFor(room) {
  if (!room.game) return null;
  const game = room.game;
  const keys = characterKeysForRoom(room);
  const phase = game.phase;
  const appealsRequired = pendingAppeals(room).length > 0;
  const now = Date.now();
  const features = game.features || publicModeFeatures(room.settings);
  const playerRows = room.players.map((player) => {
    const connected = !playerIsOffline(player, now);
    const detained = Boolean(player.character && isDetained(room, player));
    const silenced = Boolean(player.character && isSilenced(room, player));
    const protectedStatus = Boolean(player.character && player.character.protectedRound === game.round);
    const active = Boolean(player.active);
    const canVote = active && !detained && !silenced;
    const revealsUsed = Number(player.character?.revealsUsedRound || 0);
    const hiddenNow = player.character ? keys.filter((key) => !player.character.revealed?.[key]).length : 0;
    const revealRequired = active && !detained && player.character ? Math.min(Number(room.settings.revealsPerRound || 0), hiddenNow + revealsUsed) : 0;
    const autoSkipped = isAutomationSkipped(room, player.id);
    const revealComplete = revealRequired === 0 || revealsUsed >= revealRequired || autoSkipped;
    const eventVoted = Boolean(game.eventVotes?.[player.id]);
    const eliminationVoted = Boolean(game.eliminationVotes?.[player.id]);
    const returnVoted = Boolean(game.returnVotes?.[player.id]);
    const publicActions = [];
    if (player.character?.tradeUsedRound === game.round) publicActions.push('Передавання предмета');
    if (player.character?.careUsedRound === game.round) publicActions.push('Допомога або лікування');
    if (player.character?.investigationUsedRound === game.round) publicActions.push('Приватна перевірка');
    const supportEntry = operationSupportContribution(room, player.id);
    const supportRole = supportEntry ? OPERATION_SUPPORT_ROLES[supportEntry.roleId] : null;
    if (supportRole) publicActions.push(`${supportRole.name}${supportEntry.usedFor ? ' · використано' : ''}`);
    if (player.outsideActionUsedRound === game.round) publicActions.push('Зовнішня дія');
    if (player.appealUsed) publicActions.push('Апеляція');
    const sanctions = [];
    if (detained) sanctions.push('Ізоляція');
    if (silenced) sanctions.push('Без голосу');
    if (protectedStatus) sanctions.push('Захист');
    if (!active) sanctions.push(player.outsideRole?.name || 'Поза сховищем');

    let phaseState = { code: 'optional', label: 'Необов’язкова участь', detail: 'Обов’язкових дій немає.' };
    if (phase === 'reveal') {
      phaseState = !active || detained
        ? { code: 'exempt', label: 'Не бере участі', detail: detained ? 'Ізоляція' : 'Поза сховищем' }
        : revealComplete
          ? { code: 'done', label: autoSkipped ? 'Розкриття пропущено автоматично' : 'Розкриття завершено', detail: autoSkipped ? 'Нейтральний автопропуск' : `${revealsUsed}/${revealRequired}` }
          : { code: 'pending', label: 'Очікується розкриття', detail: `${revealsUsed}/${revealRequired}` };
    } else if (phase === 'investigation' && room.settings.setting === 'detective') {
      const investigated = player.character?.investigationUsedRound === game.round || autoSkipped;
      phaseState = !active || detained
        ? { code: 'exempt', label: 'Не проводить перевірку', detail: !active ? 'Поза сховищем' : 'Ізоляція' }
        : investigated
          ? { code: 'done', label: autoSkipped ? 'Нейтральну перевірку виконано автоматично' : 'Приватну перевірку виконано', detail: autoSkipped ? 'Роль та результат не розкриваються' : 'Результат у приватному блокноті' }
          : { code: 'pending', label: 'Очікується приватна перевірка', detail: 'Одна перевірка на раунд' };
    } else if (isSocialPhase(phase) || phase === 'operations') {
      phaseState = !active && features.outsidePlay && isSocialPhase(phase)
        ? { code: player.outsideActionUsedRound === game.round ? 'done' : 'optional', label: player.outsideActionUsedRound === game.round ? 'Зовнішню дію виконано' : 'Зовнішня дія доступна', detail: publicActions.join(' · ') || 'Не використано' }
        : detained
          ? { code: 'exempt', label: 'В ізоляції', detail: 'Активні дії недоступні' }
          : { code: publicActions.length ? 'done' : 'optional', label: publicActions.length ? 'Є виконані дії' : (PHASE_DEFINITIONS[phase]?.label || 'Фаза дій'), detail: publicActions.join(' · ') || 'Дії необов’язкові' };
    } else if (phase === 'event') {
      const eventEligible = eventDecisionEligible(room, player);
      const hostDecision = eventDecisionPolicy(room) === 'host';
      phaseState = !eventEligible
        ? { code: 'exempt', label: hostDecision ? 'Участь в обговоренні' : 'Не голосує', detail: hostDecision ? 'Рішення кризи підтверджує хост' : !active ? 'Поза сховищем' : detained ? 'Ізоляція' : 'Без права голосу' }
        : eventVoted
          ? { code: 'done', label: hostDecision ? 'Рішення обрано' : 'Голос подано', detail: hostDecision ? 'Хост може підрахувати кризу' : 'Вибір приховано' }
          : { code: 'pending', label: hostDecision ? 'Очікується рішення хоста' : 'Очікується голос', detail: 'Рішення ще не подано' };
    } else if (phase === 'elimination') {
      const runoffActive = Boolean(game.runoff?.status === 'voting' && game.runoff?.round === game.round);
      const judgementComplete = eliminationVoted && (!appealsRequired || returnVoted);
      phaseState = !canVote
        ? { code: 'exempt', label: 'Не голосує', detail: !active ? 'Поза сховищем' : detained ? 'Ізоляція' : 'Без права голосу' }
        : judgementComplete
          ? { code: 'done', label: runoffActive ? 'Повторний голос подано' : 'Рішення подано', detail: appealsRequired ? `${runoffActive ? 'Повторний' : 'Основний'} голос і апеляція` : `${runoffActive ? 'Повторний' : 'Основний'} голос` }
          : { code: 'pending', label: runoffActive ? 'Очікується переголосування' : 'Очікується рішення', detail: !eliminationVoted ? (runoffActive ? 'Немає повторного голосу' : 'Немає основного голосу') : 'Немає голосу за апеляцію' };
    } else if (phase === 'round_end') {
      phaseState = { code: 'done', label: 'Раунд підсумовано', detail: 'Очікується дія хоста' };
    }

    return {
      id: player.id,
      name: player.name,
      active,
      connected,
      secondsSinceSeen: playerOfflineSeconds(player, now),
      automationControlled: Boolean(player.automation?.controlled),
      automationLastAction: player.automation?.lastAction || null,
      autoSkipped,
      ready: Boolean(player.ready || player.id === room.hostPlayerId),
      isHost: player.id === room.hostPlayerId,
      sanctions,
      phaseState,
      publicActions
    };
  });

  const requiredRows = playerRows.filter((row) => row.phaseState.code === 'done' || row.phaseState.code === 'pending');
  const completed = requiredRows.filter((row) => row.phaseState.code === 'done').length;
  const pendingRows = requiredRows.filter((row) => row.phaseState.code === 'pending');
  let canAdvance = pendingRows.length === 0;
  if (phase === 'event') canAdvance = Boolean(game.event?.resolved);
  if (isSocialPhase(phase) || phase === 'operations' || phase === 'round_end') canAdvance = true;
  const warnings = [];
  if (pendingRows.length) warnings.push(`Очікуються дії: ${pendingRows.map((row) => row.name).join(', ')}.`);
  const offline = playerRows.filter((row) => !row.connected);
  if (offline.length) warnings.push(`Не в мережі: ${offline.map((row) => row.name).join(', ')}.`);
  if (phase === 'event' && !game.event?.resolved) warnings.push('Подію ще не підраховано.');
  if (phase === 'elimination' && game.runoff?.status === 'voting') warnings.push('Триває повторне голосування лише між лідерами першого підрахунку.');
  if (phase === 'operations' && features.operations) {
    if (!(game.expeditionRounds || []).includes(game.round)) warnings.push('Експедицію цього раунду ще не проводили.');
    if (!(game.repairRounds || []).includes(game.round)) warnings.push('Плановий ремонт цього раунду ще не проводили.');
  }
  return {
    phase,
    canAdvance,
    completed,
    required: requiredRows.length,
    pending: pendingRows.length,
    connected: playerRows.filter((row) => row.connected).length,
    totalPlayers: playerRows.length,
    warnings,
    blockers: pendingRows.map((row) => row.name),
    players: playerRows,
    automation: publicAutomationState(room),
    operations: {
      enabled: Boolean(features.operations),
      expeditionUsed: (game.expeditionRounds || []).includes(game.round),
      repairUsed: (game.repairRounds || []).includes(game.round),
      supportSubmitted: publicOperationSupport(room).filter((item) => !item.usedFor).length,
      supportTotal: publicOperationSupport(room).length
    },
    appealsRequired
  };
}

function sessionManagementState(room, requester) {
  ensureRoomSessionState(room);
  const host = room.players.find((player) => player.id === room.hostPlayerId) || null;
  const requests = cleanupRecoveryRequests(room);
  return {
    recoveryCode: requester.recoveryCode,
    host: host ? { id: host.id, name: host.name, connected: !playerIsOffline(host), secondsSinceSeen: playerOfflineSeconds(host) } : null,
    failoverEnabled: room.settings.hostFailoverEnabled !== false,
    failoverSeconds: Number(room.settings.hostFailoverSeconds || 120),
    lastHostChange: (room.hostHistory || []).slice(-1)[0] || null,
    transferCandidates: requester.id === room.hostPlayerId
      ? room.players.filter((player) => player.id !== requester.id).map((player) => ({ id: player.id, name: player.name, connected: !playerIsOffline(player), active: Boolean(player.active) }))
      : [],
    recoveryRequests: requester.id === room.hostPlayerId
      ? requests.filter((request) => request.status === "pending").map((request) => ({ id: request.id, playerId: request.playerId, playerName: request.playerName, createdAt: request.createdAt, expiresAt: request.expiresAt }))
      : []
  };
}

function privateCharacter(player, room) {
  if (!player.character) return null;
  const keys = characterKeysForRoom(room);
  const values = Object.fromEntries(keys.map((key) => [key, player.character[key]]));
  const allDescriptions = player.character.descriptions || descriptionsFor(values);
  const descriptions = Object.fromEntries(keys.map((key) => [key, allDescriptions[key] || describeCharacteristic(key, player.character[key])]));
  return {
    values,
    descriptions,
    revealed: { ...player.character.revealed },
    ability: { ...player.character.ability },
    abilityUsed: player.character.abilityUsed,
    revealsUsedRound: player.character.revealsUsedRound || 0,
    revealLimit: room.settings.revealsPerRound,
    revealStrategy: strategicRevealEnabled(room) ? {
      influence: Number(player.character.revealInfluence || 0),
      credibility: Number(player.character.revealCredibility || 0),
      choiceRound: player.character.revealChoiceRound || null,
      choiceKeys: [...(player.character.revealChoiceKeys || [])],
      choiceRequired: player.character.revealChoiceRound === room.game.round && (player.character.revealsUsedRound || 0) === 0,
      sensitiveKeys: strategicSensitiveKeys(room),
      pressure: player.character.revealPressure ? { ...player.character.revealPressure } : null,
      incomingRequests: pendingRevealRequests(room, player.id, room.game.round).map((item) => ({ id: item.id, fromName: item.fromName, key: item.key, dueRound: item.dueRound })),
      requestUsedRound: player.character.revealRequestUsedRound || null,
      concealmentStrain: Number(player.character.concealmentStrain || 0)
    } : null,
    voteBoost: player.character.voteBoost,
    goal: player.character.goal,
    goalId: player.character.goalId || null,
    role: { ...player.character.role },
    inventory: player.character.inventory.map((item) => ({ ...item })),
    privateNotes: (player.character.privateNotes || []).slice(-12),
    roleActionUsed: player.character.roleActionUsed,
    tradeUsedRound: player.character.tradeUsedRound,
    careUsedRound: player.character.careUsedRound,
    stress: player.character.stress || 0,
    injury: player.character.injury || 0,
    medicalCondition: { ...player.character.medicalCondition, severityLabel: severityLabel(player.character.medicalCondition?.severity || 0) },
    treatmentOptions: treatmentCapability(player.character),
    operationSupport: room.game?.features?.operations ? (() => {
      const entry = operationSupportContribution(room, player.id);
      const role = entry ? OPERATION_SUPPORT_ROLES[entry.roleId] : null;
      return {
        current: role ? { roleId: role.id, roleName: role.name, target: role.target, usedFor: entry.usedFor || null } : null,
        roles: operationSupportRoleList(),
        expeditionComplete: (room.game.expeditionRounds || []).includes(room.game.round),
        repairComplete: (room.game.repairRounds || []).includes(room.game.round)
      };
    })() : null,
    careApproaches: careApproachList(),
    medicalIsolation: Number(player.character.medicalIsolationUntilRound || 0) >= room.game.round,
    treatmentPreviews: careApproachList().flatMap((approach) => treatmentCapability(player.character).flatMap((option) => activePlayers(room).map((target) => {
      const assessment = careAssessment(room, player, target, option, approach.id);
      return {
        methodId: option.id, targetId: target.id, approachId: approach.id,
        label: assessment.band.label, tone: assessment.band.tone,
        available: assessment.available, unavailableReason: assessment.unavailableReason,
        cost: assessment.medicineCost, costLabel: assessment.costLabel,
        targetNeedsCare: assessment.targetNeedsCare,
        planDescription: assessment.approach.description,
        outcomeHint: assessment.outcomeHint,
        observationBonusPercent: Math.round(Number(assessment.observationBonus || 0) * 100),
        special: assessment.approach.special || null
      };
    }))),
    detained: isDetained(room, player),
    silenced: isSilenced(room, player),
    outsideRole: player.outsideRole ? { ...player.outsideRole } : null,
    outsideActionUsedRound: player.outsideActionUsedRound,
    automationControlled: Boolean(player.automation?.controlled),
    automationLastAction: player.automation?.lastAction || null,
    appealUsed: Boolean(player.appealUsed),
    appeal: room.game?.appeals?.[player.id] || null,
    caseRole: player.character.caseRole ? { ...player.character.caseRole } : null,
    caseProtection: player.character.caseProtection ? { ...player.character.caseProtection } : null,
    caseNotebook: player.character.caseNotebook ? {
      findings: (player.character.caseNotebook.findings || []).slice(-10).map((item) => ({ ...item })),
      lastFinding: player.character.caseNotebook.lastFinding ? { ...player.character.caseNotebook.lastFinding } : null,
      privateSuspicion: room.players.map((item) => ({ playerId: item.id, name: item.name, value: Number(player.character.caseNotebook.privateSuspicion?.[item.id] || 0) }))
    } : null
  };
}
const EXPEDITION_OFFER_COUNT = 6;
function expeditionPool(room) {
  const all = customExpeditionPool(room);
  const used = new Set((room.game.expeditionHistory || []).map((item) => item.locationId));
  const fresh = all.filter((item) => !used.has(item.id));
  return fresh.length >= EXPEDITION_OFFER_COUNT ? fresh : all;
}
function refreshExpeditionOffers(room, force = false) {
  if (!room.game) return [];
  const currentRound = room.game.round;
  if (!force && room.game.expeditionOfferRound === currentRound && Array.isArray(room.game.expeditionOfferIds) && room.game.expeditionOfferIds.length) {
    return room.game.expeditionOfferIds;
  }
  const pool = expeditionPool(room);
  room.game.expeditionOfferIds = chooseContentEntries(pool, Math.min(EXPEDITION_OFFER_COUNT, pool.length), room.settings.absurdity).map((item) => item.id);
  room.game.expeditionOfferRound = currentRound;
  return room.game.expeditionOfferIds;
}
function availableExpeditions(room) {
  const all = customExpeditionPool(room);
  const ids = new Set(refreshExpeditionOffers(room));
  return all.filter((item) => ids.has(item.id));
}
function publicTutorialState(room, requester) {
  if (!tutorialEnabled(room) || !room.game) return null;
  const phase = room.game.phase || "final";
  const round = Math.min(2, Math.max(1, Number(room.game.round || 1)));
  const stepIndex = TUTORIAL_GUIDE_STEPS.findIndex((item) => item.phase === phase && (phase === "final" || item.round === round));
  const step = TUTORIAL_GUIDE_STEPS[stepIndex >= 0 ? stepIndex : TUTORIAL_GUIDE_STEPS.length - 1];
  const privateCharacterData = requester.character || {};
  const revealDone = Number(privateCharacterData.revealsUsedRound || 0) >= Number(room.settings.revealsPerRound || 1) || !requester.active || isDetained(room, requester);
  const eventHostDecision = eventDecisionPolicy(room) === "host";
  const eventEligible = eventDecisionEligible(room, requester);
  const eventVoted = Boolean(room.game.eventVotes?.[requester.id]) || !eventEligible;
  const judgementVoted = Boolean(room.game.eliminationVotes?.[requester.id]) || !requester.active || isDetained(room, requester) || isSilenced(room, requester);
  const checklist = [];
  let required = false;
  if (phase === "reveal") {
    checklist.push({ label: "Переглянути приватну картку", status: "current" });
    checklist.push({ label: "Відкрити одну запропоновану характеристику", status: revealDone ? "done" : "pending" });
    required = !revealDone;
  } else if (phase === "discussion") {
    checklist.push({ label: "Порівняти відкриті характеристики", status: "current" });
    checklist.push({ label: "Перевірити потреби й ресурси сховища", status: "current" });
  } else if (phase === "event") {
    checklist.push({ label: eventHostDecision ? (eventEligible ? "Обрати рішення кризи як хост" : "Обговорити варіанти з хостом") : "Подати голос за рішення кризи", status: eventVoted ? "done" : "pending" });
    checklist.push({ label: "Переглянути пояснення шансу й наслідків", status: room.game.event?.resolved ? "done" : "waiting" });
    required = eventEligible && !eventVoted;
  } else if (phase === "elimination") {
    checklist.push({ label: "Обрати санкцію, ціль або «Без санкцій»", status: judgementVoted ? "done" : "pending" });
    checklist.push({ label: "Переглянути відкритий протокол", status: room.game.judgementReport ? "done" : "waiting" });
    required = !judgementVoted;
  } else if (phase === "round_end") {
    checklist.push({ label: "Переглянути журнал причин", status: "current" });
    checklist.push({ label: round === 1 ? "Перейти до другого раунду" : "Завершити навчальну партію", status: requester.id === room.hostPlayerId ? "pending" : "waiting" });
  } else if (phase === "final") {
    checklist.push({ label: "Базовий цикл гри пройдено", status: "done" });
    checklist.push({ label: "Переглянути результат громади й персонажа", status: "current" });
  }
  let hostNote = null;
  if (requester.id === room.hostPlayerId) {
    if (phase === "event" && !room.game.event?.resolved) hostNote = eventHostDecision
      ? (Boolean(room.game.eventVotes?.[requester.id]) ? "Рішення обрано. Натисніть «Підрахувати кризу»." : "Обговоріть варіанти з групою та оберіть рішення як хост.")
      : (eventDecisionVoters(room).every((player) => room.game.eventVotes?.[player.id])
        ? "Усі доступні голоси подано. Натисніть «Підрахувати кризу»."
        : "Дочекайтеся голосів, а потім підрахуйте кризу.");
    else if (phase === "elimination" && !room.game.judgementReport) hostNote = "Дочекайтеся рішень і натисніть підрахунок громади. За нічиєї гра проведе переголосування.";
    else if (phase === "round_end") hostNote = round === 1 ? "Натисніть «Завершити раунд», щоб перейти до другого навчального раунду." : "Натисніть «Завершити раунд», щоб сформувати фінал.";
    else if (phase !== "final") hostNote = "Коли група завершить поточний крок, переведіть партію до наступної фази.";
  }
  return {
    enabled: true,
    version: 1,
    step: Math.max(1, stepIndex + 1),
    totalSteps: TUTORIAL_GUIDE_STEPS.length,
    progressPercent: Math.round((Math.max(0, stepIndex) / Math.max(1, TUTORIAL_GUIDE_STEPS.length - 1)) * 100),
    title: step.title,
    text: step.text,
    targetTab: step.targetTab,
    button: step.button,
    required,
    checklist,
    hostNote,
    firstRoundWithoutSanction: round === 1,
    completed: phase === "final"
  };
}

function buildState(room, requester) {
  const game = room.game ? {
    phase: room.game.phase,
    phaseInfo: { code: room.game.phase, ...(PHASE_DEFINITIONS[room.game.phase] || {}) },
    phaseLoop: publicPhaseLoop(room),
    tutorial: publicTutorialState(room, requester),
    campaignLegacy: publicCampaignLegacy(room, requester),
    round: room.game.round,
    maxRounds: room.game.maxRounds,
    catastrophe: publicCatastrophe(room),
    scenarioPriorities: room.game.scenarioPriorities || buildScenarioPriorities(room),
    revealStrategy: strategicRevealEnabled(room) ? {
      enabled: true,
      round: room.game.revealStrategy?.round || room.game.round,
      title: room.game.revealStrategy?.title || "Стратегічне розкриття",
      reason: room.game.revealStrategy?.reason || "Щораунду змінюється пріоритет відкриття.",
      focusKeys: [...(room.game.revealStrategy?.focusKeys || [])],
      requests: (room.game.revealRequests || []).filter((item) => item.status === "pending" || Number(item.fulfilledRound || 0) >= room.game.round - 1).map((item) => ({
        id: item.id, fromName: item.fromName, targetPlayerId: item.targetPlayerId, targetName: item.targetName,
        key: item.key, dueRound: item.dueRound, status: item.status, fulfilledRound: item.fulfilledRound || null
      })),
      canRequest: isSocialPhase(room.game.phase) && requester.active && !isDetained(room, requester)
        && room.game.round < room.game.maxRounds && Number(requester.character?.revealInfluence || 0) > 0
        && requester.character?.revealRequestUsedRound !== room.game.round
    } : null,
    settingRule: room.game.settingRule || null,
    mystery: room.game.mystery ? {
      active: true,
      caseBrief: { ...room.game.mystery.caseBrief },
      evidence: (room.game.mystery.evidence || []).map((item) => ({
        id: item.id, round: item.round, aspect: item.aspect, label: item.label,
        text: item.text, reliability: item.reliability, disputed: Boolean(item.disputed), candidateNames: [...(item.candidateNames || [])]
      })),
      title: room.game.mystery.caseBrief?.title || "Центральна справа",
      publicTheory: room.players.map((item) => ({ playerId: item.id, name: item.name, value: Number(room.game.mystery.publicTheory?.[item.id] || 0) })),
      publicClaims: (room.game.mystery.publicClaims || []).slice(-8).map((item) => ({ ...item })),
      requiredEvidence: room.game.mystery.requiredEvidence,
      publishedFindingCount: (room.game.mystery.publicClaims || []).length,
      canInvestigate: room.game.phase === "investigation" && requester.active && !isDetained(room, requester) && requester.character?.investigationUsedRound !== room.game.round,
      investigationUsedRound: requester.character?.investigationUsedRound || null,
      accusationVote: room.game.mystery.accusationVotes?.[requester.id] || null,
      accusationVoteCount: Object.keys(room.game.mystery.accusationVotes || {}).length
    } : null,
    characterLabels: characterLabelsForSetting(room.settings.setting, room.settings.demographicsEnabled !== false),
    hostDashboard: requester.id === room.hostPlayerId ? hostDashboardFor(room) : null,
    shelter: room.game.shelter,
    discussionTimer: publicDiscussionTimer(room),
    automation: publicAutomationState(room),
    event: room.game.event ? {
      id: room.game.event.id,
      title: room.game.event.title,
      description: room.game.event.description,
      level: entryLevel(room.game.event),
      choices: room.game.event.choices.map((choice) => {
        const baseChance = clamp(Number(choice.success || 0), 0.1, 0.95);
        const band = chanceBand(baseChance);
        return {
          id: choice.id,
          label: choice.label,
          chanceLabel: band.label,
          chanceTone: band.tone,
          preview: {
            label: band.label,
            tone: band.tone,
            explanation: "Це базова оцінка. Під час підрахунку сервер додасть командні компетенції, сетингові модифікатори та активну підготовку.",
            factors: [
              { label: "Базовий ризик рішення", tone: band.tone },
              { label: "Командні компетенції", tone: "neutral" },
              { label: "Сетинг і підготовка", tone: "neutral" }
            ]
          },
          impact: [...new Set([...Object.keys(choice.good || {}), ...Object.keys(choice.bad || {})])].filter((key) => ["food", "water", "energy", "integrity", "medicine", "morale", "allies"].includes(key))
        };
      }),
      resolved: Boolean(room.game.event.resolved),
      resultText: room.game.event.resultText || null,
      reasonReport: room.game.event.reasonReport || null,
      winningChoiceId: room.game.event.winningChoiceId || null,
      decisionPolicy: eventDecisionPolicy(room),
      decisionPolicyLabel: eventDecisionPolicy(room) === "host" ? "Після обговорення рішення підтверджує хост" : "Таємне голосування активних гравців",
      canVote: eventDecisionEligible(room, requester),
      requiredCount: eventDecisionVoters(room).length,
      voteCount: eventDecisionVoters(room).filter((player) => Boolean(room.game.eventVotes?.[player.id])).length
    } : null,
    eventVote: room.game.eventVotes?.[requester.id] || null,
    eliminationVote: room.game.eliminationVotes?.[requester.id] || null,
    eliminationVoteCount: Object.keys(room.game.eliminationVotes || {}).length,
    returnVote: room.game.returnVotes?.[requester.id] || null,
    returnVoteCount: Object.keys(room.game.returnVotes || {}).length,
    judgement: {
      system: room.settings.voteSystem || "exile",
      visibility: room.settings.voteVisibility || "secret",
      tieRule: normalizeTieRule(room.settings.tieRule),
      runoff: room.game.runoff ? {
        active: room.game.runoff.status === "voting" && room.game.runoff.round === room.game.round,
        attempt: room.game.runoff.attempt || 2,
        options: (room.game.runoff.options || []).map((item) => ({ key: item.key, targetId: item.targetId, targetName: item.targetName, sanction: item.sanction, sanctionLabel: item.sanctionLabel, label: item.label, count: item.count }))
      } : null,
      report: room.game.judgementReport || null,
      publicVotes: room.settings.voteVisibility === "open" ? Object.entries(room.game.eliminationVotes || {}).map(([voterId, vote]) => {
        const voter = room.players.find((item) => item.id === voterId);
        const target = room.players.find((item) => item.id === vote?.targetId);
        return { voterName: voter?.name || "?", targetName: vote?.targetId === SKIP_VOTE ? "Без санкцій" : target?.name || "?", sanction: vote?.targetId === SKIP_VOTE ? SANCTION_LABELS.skip : (SANCTION_LABELS[vote?.sanction] || SANCTION_LABELS.exile) };
      }) : [],
      appeals: pendingAppeals(room).map((item) => ({ playerId: item.id, name: item.name, text: room.game.appeals[item.id].text }))
    },
    log: room.game.log.slice(-120),
    reasonLog: publicReasonHistory(room, requester),
    outsideCamp: outsideCampPublic(room, requester),
    features: room.game.features || publicModeFeatures(room.settings),
    victoryRules: victoryRulesForPlayer(room, requester),
    victorySummary: room.game.phase === "final" ? finalVictorySummaryForPlayer(room, requester) : null,
    social: {
      hiddenRolesEnabled: Boolean((room.game.features || publicModeFeatures(room.settings)).hiddenRoles),
      tradeCount: room.game.tradeCount || 0,
      treatmentCount: room.game.treatmentCount || 0
    },
    operations: {
      enabled: Boolean((room.game.features || publicModeFeatures(room.settings)).operations),
      treatmentEnabled: Boolean((room.game.features || publicModeFeatures(room.settings)).treatment),
      expeditionUsed: (room.game.expeditionRounds || []).includes(room.game.round),
      repairUsed: (room.game.repairRounds || []).includes(room.game.round),
      supportRoles: operationSupportRoleList(),
      supportContributions: publicOperationSupport(room),
      mySupport: (() => {
        const entry = operationSupportContribution(room, requester.id);
        const role = entry ? OPERATION_SUPPORT_ROLES[entry.roleId] : null;
        return role ? { roleId: role.id, roleName: role.name, target: role.target, usedFor: entry.usedFor || null } : null;
      })(),
      expeditions: (room.game.features || publicModeFeatures(room.settings)).operations ? availableExpeditions(room).map((item) => {
        const rule = room.game.settingModifiers || {};
        const settingBonus = Number(rule.expeditionBonus || 0) + (item.tags || []).reduce((sum, tag) => sum + Number(rule.tagBonuses?.[tag] || 0), 0);
        const baseChance = clamp(0.35 + settingBonus - Number(item.difficulty || 0) * 0.055, 0.12, 0.92);
        const band = chanceBand(baseChance);
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          level: entryLevel(item),
          difficulty: item.difficulty,
          preview: { label: band.label, tone: band.tone, explanation: "Оцінка без урахування вибраних учасників. Опис маршруту підказує, який досвід може допомогти; точні системні теги лишаються прихованими." }
        };
      }) : [],
      repairPreviews: requester.id === room.hostPlayerId && (room.game.features || publicModeFeatures(room.settings)).operations
        ? room.game.shelter.modules.flatMap((module) => activePlayers(room).filter((worker) => !isDetained(room, worker)).map((worker) => {
          const chance = repairChance(room, module, worker);
          const band = chanceBand(chance);
          const supportCount = eligibleOperationSupport(room, "repair", [worker.id]).length;
          return { moduleId: module.id, workerId: worker.id, label: band.label, tone: band.tone, supportCount };
        }))
        : [],
      history: [
        ...(room.game.expeditionHistory || []).map((item) => ({ type: "expedition", ...item })),
        ...(room.game.repairHistory || []).map((item) => ({ type: "repair", ...item })),
        ...(room.game.treatmentHistory || []).filter((item) => (item.playerIds || []).includes(requester.id)).map((item) => ({ type: "treatment", ...item }))
      ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || (b.round || 0) - (a.round || 0)).slice(0, 12)
    },
    final: room.game.final
  } : null;
  return {
    ok: true,
    version: VERSION,
    revision: room.revision,
    code: room.code,
    generation: publicGenerationState(room),
    settings: {
      ...room.settings,
      contentPackName: room.game?.contentPack?.name || platform.getPack(room.settings.contentPackId)?.name || null,
      campaignName: room.game?.campaign?.name || platform.getCampaign(room.campaignId)?.name || null
    },
    hostPlayerId: room.hostPlayerId,
    sessionManagement: sessionManagementState(room, requester),
    victoryRules: publicVictoryRules(room.settings),
    configurationAnalysis: analyzeRoomConfiguration(room.settings, room.players.length),
    self: {
      id: requester.id,
      name: requester.name,
      isHost: requester.id === room.hostPlayerId,
      ready: requester.ready,
      active: requester.active,
      accountId: requester.accountId || null,
      recoveryCode: requester.recoveryCode,
      privateCharacter: privateCharacter(requester, room)
    },
    players: room.players.map((player) => publicPlayer(player, room)),
    game
  };
}

function createEvent(room) {
  const candidates = eventPool(room);
  const recentIds = room.game.log.filter((line) => line.startsWith("Подія:")).map((line) => line.slice(7).trim());
  const unused = candidates.filter((event) => !recentIds.includes(event.title));
  const tutorialEvent = tutorialEnabled(room) ? TUTORIAL_EVENTS[Math.min(2, Number(room.game.round || 1))] : null;
  const base = tutorialEvent || room.game.preparedEvent || chooseContentEntry(unused.length ? unused : candidates, room.settings.absurdity);
  room.game.preparedEvent = null;
  room.game.event = JSON.parse(JSON.stringify(base));
  room.game.eventVotes = {};
  room.game.log.push(`Подія: ${base.title}`);
}
function textTags(text) {
  const value = String(text || "").toLocaleLowerCase("uk");
  const map = {
    medicine: /лікар|медик|фельдшер|парамедик|цілител|лікув|фарма|біолог|травник|ветеринар|аптеч|здоров|перша допомога/,
    repair: /ремонт|механік|інженер|технік|слюсар|звар|коваль|столяр|тесляр|інструмент|електрик|руни|молот/,
    technical: /інженер|технік|механік|електр|програм|системн|кібер|робот|звар|слюсар|реактор|електрон/,
    science: /наук|хімік|фізик|біолог|астроном|геолог|лаборатор|алхімік/,
    survival: /вижив|мислив|рибал|фермер|лісник|орієнту|вогонь|кемпінг|слідопит|розвід/,
    navigation: /навіга|картограф|орієнту|астроном|пілот|льотчик|моряк|слідопит/,
    communication: /радіо|журналіст|перекладач|переговор|дипломат|герольд|зв’язок|зв'язок|стенограф|протокол|документ/,
    social: /психолог|учитель|менеджер|актор|харизмат|переговор|соціолог|бард|жрець/,
    defense: /військ|поліц|пожеж|стрільб|мислив|меч|лук|охорон|захис|бойов/,
    food: /кухар|агроном|фермер|садів|рослин|гідропон|їжа|насіння|рибал/,
    water: /сантех|вода|очищення|опріснення|фільтр|гідропон/,
    biology: /біолог|агроном|ветеринар|рослин|трав|фермер|еколог|зоолог/,
    magic: /маг|рун|алхім|чар|відьм|жрець|проклят|фея/,
    digital: /програм|системн|кібер|робот|електрон|комп'ют|комп’ют|штучн/,
    mining: /шахтар|геолог|гірник|копаль|руда|коваль/,
    space: /косм|зор|орбіт|реактор|скафандр|астро|кораб|пілот/,
    morale: /психолог|мораль|оптиміст|бард|музик|актор|поет|підтрим|натхнен|харизмат|медіатор/,
    hacking: /хак|нетран|злам|кібер|код|мереж|квантов|шифр/,
    investigation: /слідч|детектив|криміналіст|доказ|допит|розсліду|архів|профайл|аналіз|стенограф|протокол/,
    radiation: /радіац|дозиметр|антирадіац|пустк|мутац/
  };
  return Object.entries(map).filter(([, regex]) => regex.test(value)).map(([tag]) => tag);
}
function chanceBand(chance) {
  const value = clamp(Number(chance || 0), 0, 1);
  if (value < 0.35) return { id: "low", label: "Низька ймовірність", shortLabel: "Низький шанс", tone: "danger" };
  if (value < 0.55) return { id: "risky", label: "Ризиковано", shortLabel: "Ризиковано", tone: "warn" };
  if (value < 0.75) return { id: "fair", label: "Прийнятний шанс", shortLabel: "Прийнятно", tone: "neutral" };
  return { id: "high", label: "Висока ймовірність", shortLabel: "Високий шанс", tone: "good" };
}
function percentNumber(value) {
  return Math.round(clamp(Number(value || 0), 0, 1) * 100);
}
function signedPercent(value) {
  const percent = Math.round(Number(value || 0) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}
function factorEntry(label, value = 0, detail = "", source = "public") {
  const number = Number(value || 0);
  return { label, value: number, displayValue: signedPercent(number), tone: number > 0 ? "positive" : number < 0 ? "negative" : "neutral", detail, source };
}
function operationPowerBreakdown(players, tags) {
  const people = [];
  let total = 0;
  for (const player of players) {
    const character = player.character;
    const sources = [
      { key: "profession", label: "професія", text: character.profession, weight: 1.6 },
      { key: "skill", label: "навичка", text: character.skill, weight: 1.8 },
      { key: "hobby", label: "хобі", text: character.hobby, weight: 0.5 },
      ...(character.inventory || []).map((item) => ({ key: "item", label: "предмет", text: item.name, weight: 0.8 }))
    ];
    let rawPower = 0;
    const matchedSources = [];
    for (const source of sources) {
      const matches = textTags(source.text).filter((tag) => tags.includes(tag));
      if (!matches.length) continue;
      const contribution = matches.length * source.weight;
      rawPower += contribution;
      matchedSources.push({ key: source.key, label: source.label, contribution, tags: matches });
    }
    const diseasePenalty = MEDICAL.severityMeta(character.medicalCondition?.severity || 0).operationPenalty;
    const injuryPenalty = (character.injury || 0) * 0.15;
    const stressPenalty = (character.stress || 0) * 0.08;
    const conditionFactor = clamp(1 - injuryPenalty - stressPenalty - diseasePenalty, 0.28, 1);
    const abilityBonus = Number(character.operationBonus || 0) + Number(character.abilityFlags?.permanentOperationBonus || 0);
    const abilityPenalty = Number(character.operationPenalty || 0);
    const abilityFactor = clamp(1 + abilityBonus - abilityPenalty, 0.25, 1.8);
    const finalPower = rawPower * conditionFactor * abilityFactor + Math.max(0, abilityBonus - abilityPenalty) * 2;
    total += finalPower;
    people.push({
      playerId: player.id,
      playerName: player.name,
      rawPower,
      finalPower,
      matchedSources,
      injuryPenalty,
      stressPenalty,
      diseasePenalty,
      abilityBonus,
      abilityPenalty,
      conditionFactor,
      abilityFactor
    });
  }
  return { power: total, people };
}
function actionPower(players, tags) {
  return operationPowerBreakdown(players, tags).power;
}
function reasonReport(room, data) {
  return {
    id: uid("reason"),
    round: Number(room.game?.round || 0),
    createdAt: Date.now(),
    type: data.type || "system",
    title: data.title || "Пояснення результату",
    subtitle: data.subtitle || "",
    success: typeof data.success === "boolean" ? data.success : null,
    visibility: data.visibility || "public",
    playerIds: [...new Set(data.playerIds || [])],
    chance: data.chance || null,
    factors: (data.factors || []).map((item) => ({ ...item })),
    costs: (data.costs || []).map((item) => ({ ...item })),
    outcome: data.outcome ? { ...data.outcome } : null,
    secondary: (data.secondary || []).map((item) => ({ ...item }))
  };
}
function rememberReason(room, report) {
  room.game.reasonHistory ||= [];
  room.game.reasonHistory.push(report);
  room.game.reasonHistory = room.game.reasonHistory.slice(-80);
  return report;
}
function publicReasonHistory(room, requester) {
  return (room.game.reasonHistory || []).filter((item) => item.visibility === "public" || (item.playerIds || []).includes(requester.id)).slice(-24).map((item) => ({ ...item, playerIds: undefined }));
}
function publicOperationFactorSummary(breakdown) {
  const competence = breakdown.people.reduce((sum, item) => sum + item.rawPower, 0);
  const conditionLoss = breakdown.people.reduce((sum, item) => sum + Math.max(0, 1 - item.conditionFactor), 0);
  const abilityNet = breakdown.people.reduce((sum, item) => sum + item.abilityBonus - item.abilityPenalty, 0);
  const factors = [];
  if (competence > 0) factors.push({ label: "Сукупні релевантні компетенції", detail: `Командна сила ${competence.toFixed(1)}; конкретні приховані джерела не розкриваються.` });
  else factors.push({ label: "Релевантних компетенцій не виявлено", detail: "Професії, навички й предмети не дають помітної переваги для цієї дії." });
  if (conditionLoss > 0.01) factors.push({ label: "Стан учасників знижує ефективність", detail: "Травми, стрес або активні захворювання послабили командний внесок." });
  if (abilityNet > 0.001) factors.push({ label: "Підготовка та здібності допомагають", detail: "Активні або постійні бонуси підсилюють дію." });
  if (abilityNet < -0.001) factors.push({ label: "Активні перешкоди заважають", detail: "Штрафи здібностей послаблюють дію." });
  return factors;
}
function resolveEvent(room) {
  const event = room.game.event;
  if (!event || event.resolved) throw new Error("Подія відсутня або вже завершена.");
  const actives = activePlayers(room);
  const voters = eventDecisionVoters(room);
  if (!voters.some((player) => room.game.eventVotes?.[player.id])) {
    throw new Error(eventDecisionPolicy(room) === "host" ? "Хост ще не обрав рішення кризи." : "Ще немає жодного голосу.");
  }
  const tally = {};
  let abstentions = 0;
  for (const player of voters) {
    const choiceId = room.game.eventVotes[player.id];
    if (!choiceId) continue;
    if (choiceId === SKIP_VOTE) {
      abstentions += 1;
      if (player.character.voteBoost) player.character.voteBoost = false;
      continue;
    }
    const weight = player.character.voteBoost ? 2 : 1;
    tally[choiceId] = (tally[choiceId] || 0) + weight;
    if (player.character.voteBoost) player.character.voteBoost = false;
  }
  const values = Object.values(tally);
  const max = values.length ? Math.max(...values) : 0;
  const winners = Object.entries(tally).filter(([, value]) => value === max).map(([id]) => id);
  const fallbackChoice = neutralEventChoice(event);
  const winningChoiceId = winners.length ? sample(winners) : fallbackChoice?.id;
  const choice = event.choices.find((item) => item.id === winningChoiceId) || fallbackChoice;
  if (!choice) throw new Error("Для події не визначено жодного варіанта рішення.");
  const eventTags = ["medicine", "repair", "technical", "magic", "social"];
  const powerBreakdown = operationPowerBreakdown(actives, eventTags);
  const teamBonus = Math.min(0.16, powerBreakdown.power * 0.012);
  const preparationBonus = Number(room.game.eventLuckBoost || 0);
  const settingBonus = Number(room.game.settingModifiers?.eventLuckBonus || 0);
  const luckBonus = preparationBonus + settingBonus;
  const finalChance = clamp(choice.success + teamBonus + luckBonus, 0.1, 0.95);
  const roll = random();
  const success = roll < finalChance;
  room.game.eventLuckBoost = 0;
  let effects = success ? choice.good : choice.bad;
  let outcomeText = success ? choice.goodText : choice.badText;
  if (!success && (room.game.eventShield || 0) > 0) {
    room.game.eventShield -= 1;
    effects = {};
    outcomeText = `${choice.badText} Захисна здібність нейтралізувала всі механічні втрати.`;
  }
  const notes = applyEffects(room, effects);
  event.resolved = true;
  event.winningChoiceId = winningChoiceId;
  event.resultText = `${outcomeText}${notes ? ` Наслідки: ${notes}.` : ""}`;
  const factors = [
    { ...factorEntry("Базовий шанс рішення", 0, "Закладений у варіант події."), displayValue: `${percentNumber(choice.success)}%` },
    factorEntry("Командний внесок", teamBonus, "Професії, навички, предмети та стан активних учасників; джерела не розкриваються."),
    factorEntry("Підготовка до кризи", preparationBonus, preparationBonus ? "Одноразові бонуси, отримані до підрахунку." : "Додаткової підготовки не було."),
    factorEntry("Правило сетингу", settingBonus, settingBonus ? "Сетинговий модифікатор подій." : "Сетинг не змінив шанс.")
  ];
  const report = reasonReport(room, {
    type: "event",
    title: `Криза: ${event.title}`,
    subtitle: `${values.length ? "Рішення групи" : "Нейтральне автоматичне рішення"}: ${choice.label}`,
    success,
    chance: { basePercent: percentNumber(choice.success), finalPercent: percentNumber(finalChance), rollPercent: Math.round(roll * 100), label: chanceBand(finalChance).label, tone: chanceBand(finalChance).tone, autoSuccess: false },
    factors,
    costs: [],
    outcome: { summary: event.resultText, effects: notes || "Числових змін ресурсів не було." },
    secondary: [
      ...(abstentions ? [{ label: "Утримання", result: `${abstentions} гравців не обрали варіант; їхні голоси не вплинули на підсумок.` }] : []),
      ...(values.length ? [] : [{ label: "Автоматичний вибір", result: "Коли всі утрималися, система обрала найбезпечніший доступний варіант за базовим шансом і можливими втратами." }]),
      ...publicOperationFactorSummary(powerBreakdown)
    ]
  });
  event.reasonReport = report;
  rememberReason(room, report);
  room.game.log.push(`Рішення події: ${choice.label}. ${event.resultText} Шанс ${percentNumber(finalChance)}%, кидок ${Math.round(roll * 100)}.`);
}
function judgementOptionKey(targetId, sanction = "exile") {
  if (targetId === SKIP_VOTE || targetId === "skip") return "skip";
  return `${sanction}:${targetId}`;
}
function judgementOption(room, key, count = 0, breakdown = {}) {
  if (key === "skip") return {
    key,
    targetId: SKIP_VOTE,
    targetName: "Без санкцій",
    sanction: "skip",
    sanctionLabel: SANCTION_LABELS.skip,
    label: "Без санкцій",
    count,
    baseVotes: Number(breakdown.baseVotes || 0),
    bonusVotes: Number(breakdown.bonusVotes || 0),
    forcedVotes: Number(breakdown.forcedVotes || 0)
  };
  const [sanction, targetId] = String(key).split(":");
  const target = room.players.find((item) => item.id === targetId);
  return {
    key,
    targetId,
    targetName: target?.name || "Невідомий учасник",
    sanction,
    sanctionLabel: SANCTION_LABELS[sanction] || SANCTION_LABELS.exile,
    label: `${SANCTION_LABELS[sanction] || SANCTION_LABELS.exile}: ${target?.name || "Невідомий учасник"}`,
    count,
    baseVotes: Number(breakdown.baseVotes || 0),
    bonusVotes: Number(breakdown.bonusVotes || 0),
    forcedVotes: Number(breakdown.forcedVotes || 0)
  };
}
function aggregateIgnoredVotes(items = []) {
  const counts = new Map();
  for (const item of items) counts.set(item.reason, (counts.get(item.reason) || 0) + 1);
  return [...counts.entries()].map(([reason, count]) => ({ reason, count }));
}
function storeJudgementReport(room, report) {
  room.game.judgementReport = report;
  room.game.judgementHistory ||= [];
  room.game.judgementHistory.push(report);
  room.game.judgementHistory = room.game.judgementHistory.slice(-12);
}
function resolveReturnVotes(room) {
  const appeals = pendingAppeals(room);
  if (!appeals.length) {
    room.game.returnVotes = {};
    return;
  }
  const voters = eligibleVoters(room);
  const tally = {};
  for (const voter of voters) {
    const targetId = room.game.returnVotes?.[voter.id];
    if (!targetId || targetId === SKIP_VOTE) continue;
    if (!appeals.some((item) => item.id === targetId)) continue;
    tally[targetId] = (tally[targetId] || 0) + 1;
  }
  const required = Math.floor(voters.length / 2) + 1;
  const eligible = Object.entries(tally).filter(([, count]) => count >= required).sort((a, b) => b[1] - a[1]);
  if (eligible.length) {
    const [targetId, count] = eligible[0];
    const target = room.players.find((item) => item.id === targetId);
    if (target) {
      target.active = true;
      target.returnedRound = room.game.round;
      target.outsideRole = null;
      target.detainedUntilRound = null;
      target.silencedUntilRound = null;
      room.game.log.push(`Апеляцію гравця ${target.name} підтримано (${count}/${voters.length}). Гравець повертається до громади.`);
    }
  } else if (Object.keys(room.game.returnVotes || {}).length) {
    room.game.log.push(`Жодна апеляція не набрала більшості у ${required} голосів.`);
  }
  for (const player of appeals) room.game.appeals[player.id].status = player.active ? "accepted" : "rejected";
  room.game.returnVotes = {};
}
function applySanction(room, target, sanction) {
  room.game.sanctionHistory ||= [];
  if (sanction === "detention") {
    target.detainedUntilRound = room.game.round + 1;
    room.game.shelter.resources.energy = clamp(Number(room.game.shelter.resources.energy || 0) - 3, 0, 100);
    room.game.shelter.resources.morale = clamp(Number(room.game.shelter.resources.morale || 0) - 2, 0, 100);
    room.game.log.push(`${target.name} ізольовано на наступний раунд: без розкриття, здібностей, експедицій, ремонту й голосування. Утримання ізоляції коштує 3 енергії та 2 моралі.`);
  } else if (sanction === "silence") {
    target.silencedUntilRound = room.game.round + 1;
    target.character.revealInfluence = clamp(Number(target.character.revealInfluence || 0) + 1, 0, 3);
    room.game.log.push(`${target.name} позбавлено участі в колективних рішеннях на наступний раунд, але отримує 1 вплив як компенсацію.`);
  } else {
    target.active = false;
    target.eliminatedRound = room.game.round;
    if (modeConfig(room.settings).outsidePlay) {
      assignOutsideRole(target, room);
      joinOutsideCamp(room, target);
    }
    for (const key of characterKeysForRoom(room)) target.character.revealed[key] = true;
    room.game.log.push(target.outsideRole
      ? `${target.name} залишає сховище за рішенням громади та отримує зовнішню роль «${target.outsideRole.name}».`
      : `${target.name} залишає сховище за рішенням громади.`);
  }
  room.game.sanctionHistory.push({ round: room.game.round, targetId: target.id, targetName: target.name, sanction });
  room.game.sanctionHistory = room.game.sanctionHistory.slice(-20);
}
function resolveElimination(room) {
  const game = room.game;
  const voters = eligibleVoters(room);
  const votes = game.eliminationVotes || {};
  const activeRunoff = game.runoff && game.runoff.round === game.round && game.runoff.status === "voting" ? game.runoff : null;
  const allowedRunoffKeys = activeRunoff ? new Set(activeRunoff.options.map((item) => item.key)) : null;
  const forcedVotes = activeRunoff ? {} : (game.forcedEliminationVotes || {});
  const tally = {};
  const breakdown = {};
  const ignored = [];
  const individualVotes = [];
  let hiddenModifierCount = 0;
  let submitted = 0;

  const addTally = (key, baseVotes = 0, bonusVotes = 0, extraForced = 0) => {
    const total = baseVotes + bonusVotes + extraForced;
    if (total <= 0) return;
    tally[key] = (tally[key] || 0) + total;
    breakdown[key] ||= { baseVotes: 0, bonusVotes: 0, forcedVotes: 0 };
    breakdown[key].baseVotes += baseVotes;
    breakdown[key].bonusVotes += bonusVotes;
    breakdown[key].forcedVotes += extraForced;
  };

  for (const voter of voters) {
    const vote = votes[voter.id];
    if (!vote) continue;
    submitted += 1;
    const targetId = vote.targetId;
    const sanction = room.settings.voteSystem === "tribunal" ? String(vote.sanction || "exile") : "exile";
    const validSanction = ["exile", "detention", "silence"].includes(sanction) ? sanction : "exile";
    const key = judgementOptionKey(targetId, validSanction);
    let ignoredReason = null;
    let target = null;
    if (targetId !== SKIP_VOTE) {
      target = room.players.find((item) => item.id === targetId && item.active);
      if (!target) ignoredReason = "Ціль уже недоступна";
      else if (target.id === voter.id && !(room.settings.soloTestMode === true && voters.length === 1)) ignoredReason = "Самоголосування не враховується";
      else if (target.character.protectedRound === game.round) ignoredReason = "Ціль мала активний захист";
    }
    if (!ignoredReason && activeRunoff && !allowedRunoffKeys.has(key)) ignoredReason = "Варіант не входив до повторного голосування";
    if (ignoredReason) {
      ignored.push({ voterName: voter.name, reason: ignoredReason });
      if (room.settings.voteVisibility === "open") individualVotes.push({ voterName: voter.name, label: targetId === SKIP_VOTE ? "Без санкцій" : `${SANCTION_LABELS[validSanction]}: ${target?.name || "?"}`, status: "ignored", reason: ignoredReason });
      if (voter.character.voteBoost) voter.character.voteBoost = false;
      continue;
    }
    const bonus = voter.character.voteBoost ? 1 : 0;
    addTally(key, 1, bonus, 0);
    if (bonus) hiddenModifierCount += 1;
    if (room.settings.voteVisibility === "open") individualVotes.push({ voterName: voter.name, label: judgementOption(room, key).label, status: "counted", weight: 1 + bonus });
    if (voter.character.voteBoost) voter.character.voteBoost = false;
  }

  for (const [targetId, rawWeight] of Object.entries(forcedVotes)) {
    const weight = Math.max(0, Number(rawWeight) || 0);
    if (!weight) continue;
    const target = room.players.find((item) => item.id === targetId && item.active);
    if (!target) {
      ignored.push({ voterName: null, reason: "Прихований модифікатор утратив ціль" });
      continue;
    }
    if (target.character.protectedRound === game.round) {
      ignored.push({ voterName: null, reason: "Прихований модифікатор нейтралізовано захистом" });
      continue;
    }
    const key = judgementOptionKey(targetId, "exile");
    addTally(key, 0, 0, weight);
    hiddenModifierCount += weight;
  }
  game.forcedEliminationVotes = {};

  const totals = Object.entries(tally)
    .map(([key, count]) => judgementOption(room, key, count, breakdown[key]))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "uk"));
  const max = totals.length ? totals[0].count : 0;
  const winners = totals.filter((item) => item.count === max);
  const attempt = activeRunoff ? 2 : 1;
  const baseReport = {
    id: uid("judgement"),
    round: game.round,
    attempt,
    title: activeRunoff ? "Повторне голосування" : "Рішення громади",
    visibility: room.settings.voteVisibility,
    system: room.settings.voteSystem,
    status: "resolved",
    participation: { eligible: voters.length, submitted, missing: Math.max(0, voters.length - submitted) },
    totals,
    ignored: aggregateIgnoredVotes(ignored),
    individualVotes: room.settings.voteVisibility === "open" ? individualVotes : [],
    modifiers: hiddenModifierCount > 0 ? [{ label: "Приховані модифікатори", detail: `До ваги голосів застосовано ${hiddenModifierCount} додатков${hiddenModifierCount === 1 ? "ий голос" : "і голоси"}. Джерело не розкривається.` }] : [],
    previousAttempt: activeRunoff?.initialReport || null,
    outcome: null,
    createdAt: Date.now()
  };

  if (!totals.length) {
    baseReport.outcome = { type: "no_valid_votes", label: "Без санкцій", detail: "Дійсних голосів за санкцію не було." };
    game.log.push(baseReport.outcome.detail);
    game.runoff = null;
    game.eliminationVotes = {};
    resolveReturnVotes(room);
    storeJudgementReport(room, baseReport);
    return { pendingRunoff: false, report: baseReport };
  }

  if (winners.length > 1 && !activeRunoff && normalizeTieRule(room.settings.tieRule) === "runoff") {
    const runoffOptions = winners.map((item) => ({ key: item.key, targetId: item.targetId, targetName: item.targetName, sanction: item.sanction, sanctionLabel: item.sanctionLabel, label: item.label, count: item.count }));
    baseReport.status = "runoff";
    baseReport.outcome = { type: "runoff", label: "Потрібне переголосування", detail: `Нічия — по ${max} голос${max === 1 ? "у" : "и"}. Повторне голосування проводиться лише між лідерами.` };
    game.runoff = { round: game.round, status: "voting", attempt: 2, options: runoffOptions, initialReport: baseReport, startedAt: Date.now() };
    game.judgementReport = baseReport;
    game.eliminationVotes = {};
    startAutomationPhase(room);
    game.log.push(`${baseReport.outcome.detail} Варіанти: ${runoffOptions.map((item) => item.label).join("; ")}.`);
    return { pendingRunoff: true, report: baseReport };
  }

  if (winners.length > 1) {
    baseReport.outcome = { type: "tie_no_action", label: "Санкцію скасовано", detail: activeRunoff ? `Повторне голосування знову завершилося нічиєю — по ${max} голоси. Санкцію не застосовано.` : `Голосування завершилося нічиєю — по ${max} голоси. За правилами санкцію не застосовано.` };
    game.log.push(baseReport.outcome.detail);
  } else {
    const winner = winners[0];
    if (winner.key === "skip") {
      baseReport.outcome = { type: "skip", label: "Без санкцій", detail: `Варіант «Без санкцій» переміг із результатом ${winner.count}.` };
      game.log.push("Група вирішила не застосовувати санкцій цього раунду.");
    } else {
      const target = room.players.find((item) => item.id === winner.targetId && item.active);
      if (target) {
        applySanction(room, target, winner.sanction);
        baseReport.outcome = { type: "sanction", label: winner.label, targetName: target.name, sanction: winner.sanction, sanctionLabel: winner.sanctionLabel, detail: `${winner.label} — ${winner.count} голосів. Санкцію застосовано.` };
      } else {
        baseReport.outcome = { type: "invalidated", label: "Без санкцій", detail: "Переможна ціль стала недоступною до моменту підрахунку." };
        game.log.push(baseReport.outcome.detail);
      }
    }
  }
  const exileApplied = baseReport.outcome?.type === "sanction" && baseReport.outcome?.sanction === "exile";
  game.roundsWithoutExile = exileApplied ? 0 : Number(game.roundsWithoutExile || 0) + 1;
  const excess = Math.max(0, activePlayers(room).length - Number(room.settings.capacity || activePlayers(room).length));
  if (!exileApplied && excess > 0) {
    const pressure = Math.min(8, excess * Math.max(1, game.roundsWithoutExile));
    game.shelter.resources.food = clamp(Number(game.shelter.resources.food || 0) - pressure, 0, 100);
    game.shelter.resources.water = clamp(Number(game.shelter.resources.water || 0) - pressure, 0, 100);
    game.log.push(`Відсутність вигнання підвищила тиск місткості: їжа й вода −${pressure}.`);
  }
  game.runoff = null;
  game.eliminationVotes = {};
  resolveReturnVotes(room);
  storeJudgementReport(room, baseReport);
  return { pendingRunoff: false, report: baseReport };
}

function requireModeAction(room, player, kind = "social") {
  if (!room.game) throw new Error("Партія ще не почалася.");
  const phase = room.game.phase;
  const allowed = kind === "operations"
    ? isOperationPhase(room)
    : kind === "role"
      ? isRoleActionPhase(room)
      : kind === "treatment"
        ? (isOperationPhase(room) || (modeConfig(room.settings).id === "factions" && phase === "intrigue"))
        : isSocialPhase(phase) || phase === "operations";
  if (!allowed) {
    const label = kind === "operations" ? "фази операцій" : kind === "role" ? "фази інтриг" : "соціальної фази";
    throw new Error(`Ця дія доступна лише під час ${label}.`);
  }
  if (!player.active) throw new Error("Вигнаний гравець не може виконувати внутрішні дії.");
  if (isDetained(room, player)) throw new Error("Ви перебуваєте в ізоляції та не можете виконувати дії цього раунду.");
}
function giveItem(room, player, body) {
  requireModeAction(room, player, "social");
  if (player.character.tradeUsedRound === room.game.round) throw new Error("У цьому раунді ви вже передавали предмет.");
  const target = room.players.find((candidate) => candidate.id === body.targetId && candidate.active && candidate.id !== player.id);
  if (!target) throw new Error("Оберіть іншого активного гравця.");
  const itemId = String(body.itemId || "");
  const index = player.character.inventory.findIndex((item) => item.id === itemId);
  if (index < 0) throw new Error("Цього предмета більше немає у вашому інвентарі.");
  const [item] = player.character.inventory.splice(index, 1);
  item.receivedFrom = player.name;
  item.source = `Передано гравцем ${player.name}`;
  target.character.inventory.push(item);
  player.character.tradeUsedRound = room.game.round;
  room.game.tradeCount = (room.game.tradeCount || 0) + 1;
  room.game.log.push(`${player.name} передає предмет «${item.name}» гравцеві ${target.name}.`);
}
function provideCare(room, player, body, free = false, forcedPotency = null) {
  if (!free) requireModeAction(room, player, "treatment");
  if (!free && player.character.careUsedRound === room.game.round) throw new Error("У цьому раунді ви вже проводили лікування.");
  const target = room.players.find((candidate) => candidate.id === body.targetId && candidate.active);
  if (!target) throw new Error("Оберіть активного гравця.");
  const condition = target.character.medicalCondition;
  if (!condition) throw new Error("Медичний стан гравця не визначено.");
  if ((condition.severity || 0) <= 0 && !(target.character.injury || 0) && !(target.character.stress || 0)) {
    throw new Error("Цей гравець зараз не потребує лікування.");
  }

  const options = treatmentCapability(player.character);
  const option = free
    ? { id: "special", label: "Особлива медична дія", cost: 0, potency: forcedPotency || 3, source: "special" }
    : options.find((entry) => entry.id === String(body.method || ""));
  if (!option) throw new Error("У вас немає відповідної здібності або лікувального засобу.");
  const approachId = free ? "standard" : String(body.approach || "standard");
  const assessment = careAssessment(room, player, target, option, approachId);
  if (!free && !assessment.available) throw new Error(assessment.unavailableReason || "Обрана медична тактика зараз недоступна.");
  const approach = free ? CARE_APPROACHES.standard : assessment.approach;
  const methodText = option.label;
  const beforeSeverity = condition.severity || 0;
  const beforeInjury = target.character.injury || 0;
  const beforeStress = target.character.stress || 0;

  // Відкладення під наглядом і карантин є самостійними рішеннями без випадкового кидка.
  if (!free && approach.special === "observe") {
    condition.observedRound = room.game.round;
    condition.observationBonusUntilRound = room.game.round + 1;
    target.character.stress = Math.max(0, beforeStress - 1);
    player.character.careUsedRound = room.game.round;
    target.character.treatmentCount = (target.character.treatmentCount || 0) + 1;
    player.character.treatmentCount = (player.character.treatmentCount || 0) + 1;
    player.character.successfulCarePlans = (player.character.successfulCarePlans || 0) + 1;
    room.game.treatmentCount = (room.game.treatmentCount || 0) + 1;
    const result = `Пацієнта залишено під наглядом: тяжкість поки лишається «${severityLabel(beforeSeverity)}», стрес ${beforeStress} → ${target.character.stress}.`;
    const note = `${player.name} обрав / обрала тактику «${approach.name}». ${result} Наступна активна терапія до кінця раунду ${room.game.round + 1} отримає бонус підготовки.`;
    target.character.privateNotes.push(note);
    const report = reasonReport(room, {
      type: "treatment", title: `Медичне рішення: ${target.name}`, subtitle: `${player.name} · ${approach.name}`,
      success: true, visibility: "participants", playerIds: [player.id, target.id],
      chance: { label: "Без кидка", tone: "neutral", autoSuccess: true },
      factors: [
        factorEntry("Тактика допомоги", 0, approach.description),
        factorEntry("Клінічний нагляд", 0.10, "Наступна активна терапія отримає +10% до шансу."),
        factorEntry("Контроль погіршення", 0, "Ризик прогресування цього раунду зменшено приблизно вдвічі.")
      ],
      costs: [{ label: "Медикаменти", value: "не витрачено" }, { label: "Дія медика", value: "використано" }],
      outcome: { summary: result, effects: "Негайного зниження тяжкості немає; створено бонус підготовки до наступного лікування." }
    });
    rememberReason(room, report);
    room.game.treatmentHistory ||= [];
    room.game.treatmentHistory.push({ round: room.game.round, createdAt: report.createdAt, playerIds: [player.id, target.id], healerName: player.name, targetName: target.name, success: true, approachId: approach.id, text: `${player.name} → ${target.name}: встановлено нагляд.`, reasonReport: report });
    room.game.treatmentHistory = room.game.treatmentHistory.slice(-24);
    room.game.log.push(`${player.name} організовує медичний нагляд за гравцем ${target.name}; медикаменти не витрачено.`);
    return { success: true, result, reasonReport: report };
  }

  if (!free && approach.special === "quarantine") {
    target.character.medicalIsolationUntilRound = room.game.round;
    condition.quarantinedRound = room.game.round;
    target.character.stress = clamp(beforeStress + 1, 0, 5);
    room.game.shelter.resources.morale = clamp(room.game.shelter.resources.morale - 2, 0, 100);
    player.character.careUsedRound = room.game.round;
    target.character.treatmentCount = (target.character.treatmentCount || 0) + 1;
    player.character.treatmentCount = (player.character.treatmentCount || 0) + 1;
    player.character.successfulCarePlans = (player.character.successfulCarePlans || 0) + 1;
    room.game.treatmentCount = (room.game.treatmentCount || 0) + 1;
    const result = `Пацієнта ізольовано до завершення раунду. Тяжкість не змінилася, стрес ${beforeStress} → ${target.character.stress}, мораль громади −2%.`;
    target.character.privateNotes.push(`${player.name} запровадив / запровадила медичний карантин. ${result}`);
    const report = reasonReport(room, {
      type: "treatment", title: `Медичний карантин: ${target.name}`, subtitle: `${player.name} · ${approach.name}`,
      success: true, visibility: "participants", playerIds: [player.id, target.id],
      chance: { label: "Без кидка", tone: "neutral", autoSuccess: true },
      factors: [
        factorEntry("Заразний стан", 0, "Карантин доступний лише через підтверджений активний ризик передачі."),
        factorEntry("Захист громади", 0, "Ізольований стан не створить додаткового тиску на медикаменти й мораль наприкінці раунду."),
        factorEntry("Ціна ізоляції", -0.02, "Пацієнт отримує +1 стрес, громада втрачає 2% моралі.")
      ],
      costs: [{ label: "Мораль", value: "−2%" }, { label: "Медикаменти", value: "не витрачено" }],
      outcome: { summary: result, effects: "Погіршення заразного стану цього раунду заблоковано; спільний епідемічний тиск усунено." }
    });
    rememberReason(room, report);
    room.game.treatmentHistory ||= [];
    room.game.treatmentHistory.push({ round: room.game.round, createdAt: report.createdAt, playerIds: [player.id, target.id], healerName: player.name, targetName: target.name, success: true, approachId: approach.id, text: `${player.name} → ${target.name}: карантин.`, reasonReport: report });
    room.game.treatmentHistory = room.game.treatmentHistory.slice(-24);
    room.game.log.push(`${target.name} переведено в медичну ізоляцію до завершення раунду; мораль −2%.`);
    return { success: true, result, reasonReport: report };
  }

  const potency = free ? (forcedPotency || 3) : assessment.effectivePotency;
  const medicineCost = free ? 0 : assessment.medicineCost;
  if (!free) {
    const item = option.source === "item" ? player.character.inventory.find((entry) => entry.id === option.itemId) : null;
    if (option.source === "item" && (!item || (item.medicalUses || 0) <= 0)) throw new Error("Лікувальний засіб уже витрачено.");
    if (medicineCost) {
      if (room.game.shelter.resources.medicine < medicineCost) throw new Error("У сховищі недостатньо медикаментів.");
      room.game.shelter.resources.medicine = clamp(room.game.shelter.resources.medicine - medicineCost, 0, 100);
    }
    if (item) {
      item.medicalUses -= 1;
      if (item.medicalUses <= 0) player.character.inventory = player.character.inventory.filter((entry) => entry.id !== item.id);
    }
  }

  const competenceBonus = MEDICAL.hasMedicalCompetence(player.character) ? 0.12 : 0;
  const medicBonus = player.character.role.id === "medic" ? 0.14 : 0;
  const triageBonus = room.game.treatmentBoostRound === room.game.round ? Number(room.game.treatmentBoost || 0) : 0;
  const observationBonus = Number(condition.observationBonusUntilRound || 0) >= room.game.round ? 0.10 : 0;
  const severityPenalty = (condition.severity || 0) * 0.035;
  const successChance = free
    ? clamp(0.55 + potency * 0.10 + competenceBonus + medicBonus + triageBonus + observationBonus - severityPenalty, 0.35, 0.99)
    : assessment.chance;
  const roll = random();
  const success = roll < successChance;
  let severityDrop = 0;
  let complicationText = "";
  if (success) {
    if (beforeSeverity > 0) {
      severityDrop = potency >= 4 ? 3 : potency >= 3 ? 2 : 1;
      if (approach.id === "conserve") severityDrop = Math.min(1, severityDrop);
    }
    condition.severity = Math.max(0, beforeSeverity - severityDrop);
    condition.treatedRound = room.game.round;
    condition.treatmentsReceived = (condition.treatmentsReceived || 0) + 1;
    condition.stableRounds = (condition.stableRounds || 0) + 1;
    const injuryDrop = approach.id === "risky"
      ? Math.max(2, potency - 1)
      : approach.id === "urgent"
        ? Math.max(1, potency - 1)
        : approach.id === "conserve"
          ? Math.max(0, potency - 2)
          : Math.max(1, potency - 1);
    target.character.injury = Math.max(0, beforeInjury - injuryDrop);
    if (approach.id === "urgent" || approach.id === "risky") target.character.stress = clamp(beforeStress + 1, 0, 5);
    else if (approach.id === "conserve") target.character.stress = beforeStress;
    else target.character.stress = Math.max(0, beforeStress - 1);
    player.character.successfulTreatments = (player.character.successfulTreatments || 0) + 1;
  } else {
    condition.failedTreatments = (condition.failedTreatments || 0) + 1;
    if (approach.id === "risky") {
      const worsenedFrom = condition.severity || 0;
      if (condition.severity > 0) condition.severity = clamp(condition.severity + 1, 0, 5);
      target.character.injury = clamp(beforeInjury + 1, 0, 5);
      target.character.stress = clamp(beforeStress + 2, 0, 5);
      complicationText = ` Виникло ускладнення: тяжкість ${severityLabel(worsenedFrom)} → ${severityLabel(condition.severity)}, травма +1.`;
    } else if (approach.id === "urgent") target.character.stress = clamp(beforeStress + 2, 0, 5);
    else if (approach.id === "conserve") target.character.stress = beforeStress;
    else target.character.stress = clamp(beforeStress + 1, 0, 5);
  }
  condition.observationBonusUntilRound = null;
  target.character.treatmentCount = (target.character.treatmentCount || 0) + 1;
  player.character.treatmentCount = (player.character.treatmentCount || 0) + 1;
  if (!free) player.character.careUsedRound = room.game.round;
  room.game.treatmentCount = (room.game.treatmentCount || 0) + 1;
  const result = success
    ? `Тяжкість ${severityLabel(beforeSeverity)} → ${severityLabel(condition.severity)}${severityDrop ? `, знижено на ${severityDrop}` : ""}.`
    : `Лікування не дало очікуваного ефекту.${complicationText || ` Стан лишився на рівні «${severityLabel(beforeSeverity)}».`}`;
  const note = `${player.name} застосував / застосувала «${methodText}» із тактикою «${approach.name}». ${result} Травма ${beforeInjury} → ${target.character.injury}, стрес ${beforeStress} → ${target.character.stress}.`;
  target.character.privateNotes.push(note);
  const factorPlan = free ? factorEntry("Особлива дія", 0, "Здібність застосовує стандартну лікувальну тактику без витрат.") : factorEntry("Тактика допомоги", Number(approach.chanceBonus || 0), approach.description);
  const report = reasonReport(room, {
    type: "treatment",
    title: `Лікування: ${target.name}`,
    subtitle: `${player.name} · ${methodText} · ${approach.name}`,
    success,
    visibility: "participants",
    playerIds: [player.id, target.id],
    chance: { basePercent: 55, finalPercent: percentNumber(successChance), rollPercent: Math.round(roll * 100), label: chanceBand(successChance).label, tone: chanceBand(successChance).tone, autoSuccess: false },
    factors: [
      { ...factorEntry("Базова ефективність", 0, "Стандартна основа лікування."), displayValue: "55%" },
      factorEntry("Сила методу", Number(option.potency || potency) * 0.10, `${methodText}; базова потужність ${option.potency || potency}.`),
      factorPlan,
      factorEntry("Медична компетентність", competenceBonus, competenceBonus ? "Лікарська професія або навичка." : "Профільної компетентності немає."),
      factorEntry("Особлива медична підготовка", medicBonus, medicBonus ? "Додатковий приватний бонус підсилює лікування без розкриття його джерела." : "Додаткового приватного бонусу немає.", medicBonus ? "private" : "public"),
      factorEntry("Тріаж і підготовка", triageBonus, triageBonus ? "Командна медична підготовка цього раунду." : "Бонус тріажу відсутній."),
      factorEntry("Попередній нагляд", observationBonus, observationBonus ? "Попереднє спостереження додало +10% до шансу." : "Підготовчого нагляду не було."),
      factorEntry("Складність стану", -severityPenalty, `Тяжкість до лікування: ${severityLabel(beforeSeverity)}.`)
    ],
    costs: free
      ? [{ label: "Особлива дія", value: "без витрат" }]
      : [
          ...(medicineCost ? [{ label: "Медикаменти", value: `−${medicineCost}%` }] : []),
          ...(option.source === "item" ? [{ label: "Витратний засіб", value: "1 використання" }] : []),
          ...(!medicineCost && option.source !== "item" ? [{ label: "Медикаменти", value: "не витрачено" }] : [])
        ],
    outcome: { summary: result, effects: `Травма ${beforeInjury} → ${target.character.injury}; стрес ${beforeStress} → ${target.character.stress}.` },
    secondary: approach.id === "risky" && !success ? [{ label: "Ускладнення ризикованого втручання", result: complicationText.trim() }] : []
  });
  rememberReason(room, report);
  room.game.treatmentHistory ||= [];
  room.game.treatmentHistory.push({ round: room.game.round, createdAt: report.createdAt, playerIds: [player.id, target.id], healerName: player.name, targetName: target.name, success, approachId: approach.id, text: `${player.name} → ${target.name}: ${success ? "успішно" : "без успіху"}.`, reasonReport: report });
  room.game.treatmentHistory = room.game.treatmentHistory.slice(-24);
  room.game.log.push(`${player.name} проводить лікування гравця ${target.name} (${approach.name}): ${success ? "успішно" : "без успіху"}${medicineCost ? `, медикаменти −${medicineCost}` : ""}. Деталі доступні учасникам лікування.`);
  return { success, result, reasonReport: report };
}
function useRoleAction(room, player, body) {
  requireModeAction(room, player, "role");
  const role = player.character.role;
  if (player.character.roleActionUsed) throw new Error("Особливу дію прихованої ролі вже використано.");
  if (role.id === "saboteur") {
    const module = room.game.shelter.modules.find((candidate) => candidate.id === body.moduleId);
    if (!module) throw new Error("Оберіть модуль.");
    module.condition = clamp(module.condition - 20, 0, 100);
    room.game.shelter.resources.integrity = clamp(room.game.shelter.resources.integrity - 6, 0, 100);
    room.game.log.push(`Невідома диверсія пошкодила модуль «${module.name}» і послабила цілісність сховища.`);
  } else if (role.id === "guardian") {
    const target = room.players.find((candidate) => candidate.id === role.targetId && candidate.active);
    if (!target) throw new Error("Ваш підопічний уже не бере участі у грі.");
    target.character.protectedRound = room.game.round;
    room.game.log.push(`Хтось таємно забезпечив захист гравцеві ${target.name} на цей раунд.`);
  } else if (role.id === "medic") {
    provideCare(room, player, body, true, 3);
  } else if (role.id === "archivist") {
    const target = room.players.find((candidate) => candidate.id === body.targetId && candidate.active);
    if (!target) throw new Error("Оберіть активного гравця.");
    const hidden = characterKeysForRoom(room).filter((key) => !target.character.revealed[key]);
    if (!hidden.length) throw new Error("У цього гравця вже все відкрито.");
    const keys = shuffled(hidden).slice(0, Math.min(2, hidden.length));
    for (const key of keys) target.character.revealed[key] = true;
    room.game.log.push(`Анонімне джерело оприлюднило ${keys.length} характеристики гравця ${target.name}.`);
  } else if (role.id === "opportunist") {
    room.game.shelter.resources.food = clamp(room.game.shelter.resources.food - 4, 0, 100);
    player.character.inventory.push(makeInventoryItem("Прихований особистий пайок", "Таємна схованка"));
    player.character.privateNotes.push("Ви приховали особистий пайок.");
    room.game.log.push("Під час інвентаризації виявлено нестачу частини продовольства.");
  } else if (role.id === "engineer") {
    const module = room.game.shelter.modules.find((candidate) => candidate.id === body.moduleId);
    if (!module) throw new Error("Оберіть модуль.");
    module.condition = clamp(module.condition + 16, 0, 100);
    room.game.log.push(`Резервна ремонтна система непомітно відновила модуль «${module.name}» на 16%.`);
  } else if (role.id === "quartermaster") {
    applyEffects(room, { food: 8, water: 8, medicine: 7 });
    room.game.log.push("У прихованому відсіку знайдено резерв: їжа +8, вода +8, медикаменти +7.");
  } else if (role.id === "scoutmaster") {
    if (room.game.features?.operations) {
      room.game.expeditionBoost = Math.max(room.game.expeditionBoost || 0, 0.22);
      room.game.log.push("Невідомий розвідник підготував маршрут: наступна експедиція отримує +22% до шансу успіху.");
    } else {
      room.game.eventShield = (room.game.eventShield || 0) + 1;
      room.game.log.push("Невідомий розвідник підготував захисний план: один негативний наслідок наступної кризи буде скасовано.");
    }
  } else if (role.id === "mediator") {
    const target = room.players.find((candidate) => candidate.id === body.targetId && candidate.active);
    if (!target) throw new Error("Оберіть активного гравця.");
    target.character.stress = Math.max(0, (target.character.stress || 0) - 2);
    target.character.protectedRound = room.game.round;
    applyEffects(room, { morale: 6 });
    room.game.log.push(`Хтось зняв напругу навколо гравця ${target.name} і підвищив мораль групи.`);
  } else if (role.id === "agitator") {
    player.character.voteBoost = true;
    room.game.log.push("У групі поширюються переконливі чутки, але їхнє джерело невідоме.");
  } else if (role.id === "collector") {
    const target = room.players.find((candidate) => candidate.id === body.targetId && candidate.active && candidate.id !== player.id);
    if (!target) throw new Error("Оберіть іншого активного гравця.");
    const item = sample(target.character.inventory || []);
    if (!item) throw new Error("У цього гравця немає предметів.");
    target.character.inventory = target.character.inventory.filter((entry) => entry.id !== item.id);
    item.source = "Таємно привласнено";
    item.receivedFrom = target.name;
    player.character.inventory.push(item);
    player.character.privateNotes.push(`Ви таємно отримали предмет «${item.name}» від гравця ${target.name}.`);
    room.game.log.push("Під час перевірки особистих речей виявлено зникнення одного предмета.");
  } else {
    throw new Error("Ця прихована роль не має одноразової активної дії.");
  }
  player.character.roleActionUsed = true;
}

function submitAppeal(room, player, body) {
  if (!room.game || !["discussion", "negotiation", "intrigue"].includes(room.game.phase)) throw new Error("Апеляцію можна подати під час обговорення, переговорів або інтриг.");
  if (player.active) throw new Error("Апеляція доступна лише гравцеві поза сховищем.");
  if (!room.game.features?.outsidePlay) throw new Error("У цьому режимі зовнішня гра вимкнена.");
  if (player.appealUsed) throw new Error("Ви вже використали право на апеляцію.");
  const text = String(body.text || "").trim().slice(0, 220);
  if (text.length < 10) throw new Error("Напишіть коротке обґрунтування щонайменше з 10 символів.");
  room.game.appeals[player.id] = { text, round: room.game.round, status: "pending" };
  player.appealUsed = true;
  room.game.log.push(`${player.name} подав / подала апеляцію на повернення до громади.`);
}
function useOutsideAction(room, player, body) {
  if (!room.game || !["discussion", "planning", "negotiation", "intrigue"].includes(room.game.phase)) throw new Error("Зовнішню дію можна виконати під час соціальної фази.");
  if (player.active) throw new Error("Зовнішня дія доступна лише після вигнання.");
  if (!room.game.features?.outsidePlay) throw new Error("У цьому режимі зовнішня гра вимкнена.");
  if (player.outsideActionUsedRound === room.game.round) throw new Error("У цьому раунді зовнішню дію вже використано.");
  joinOutsideCamp(room, player);
  const result = useOutsideCampAction(room, player, body);
  player.outsideActionUsedRound = room.game.round;
  return result;
}

function expeditionChance(room, location, players) {
  const power = actionPower(players, location.tags || []);
  const teamBonus = players.length === 3 ? 0.10 : players.length === 2 ? 0.06 : 0;
  const supports = eligibleOperationSupport(room, "expedition", players.map((item) => item.id));
  const equipmentBonus = Math.min(0.12, supports.filter((item) => item.roleId === "equipment").length * 0.04);
  const communicationsBonus = Math.min(0.09, supports.filter((item) => item.roleId === "communications").length * 0.03);
  const rule = room.game.settingModifiers || {};
  const settingBonus = Number(rule.expeditionBonus || 0) + (location.tags || []).reduce((sum, tag) => sum + Number(rule.tagBonuses?.[tag] || 0), 0);
  return clamp(0.35 + power * 0.06 + teamBonus + equipmentBonus + communicationsBonus + settingBonus - location.difficulty * 0.055 + (room.game.expeditionBoost || 0), 0.12, 0.92);
}
function launchExpedition(room, player, body) {
  requireModeAction(room, player, "operations");
  if (player.id !== room.hostPlayerId) throw new Error("Лише хост може відправити експедицію.");
  if ((room.game.expeditionRounds || []).includes(room.game.round)) throw new Error("У цьому раунді експедицію вже проведено.");
  const location = availableExpeditions(room).find((item) => item.id === body.locationId);
  if (!location) throw new Error("Оберіть доступний маршрут.");
  const ids = [...new Set(Array.isArray(body.playerIds) ? body.playerIds.map(String) : [])];
  const players = ids.map((id) => room.players.find((candidate) => candidate.id === id && candidate.active && !isDetained(room, candidate))).filter(Boolean);
  if (players.length < 1 || players.length > 3) throw new Error("Оберіть від одного до трьох учасників експедиції.");
  const powerBreakdown = operationPowerBreakdown(players, location.tags || []);
  const teamBonus = players.length === 3 ? 0.10 : players.length === 2 ? 0.06 : 0;
  const expeditionSupport = eligibleOperationSupport(room, "expedition", players.map((item) => item.id));
  const equipmentSupport = expeditionSupport.filter((item) => item.roleId === "equipment");
  const communicationsSupport = expeditionSupport.filter((item) => item.roleId === "communications");
  const guardSupport = expeditionSupport.filter((item) => item.roleId === "guard");
  const equipmentBonus = Math.min(0.12, equipmentSupport.length * 0.04);
  const communicationsBonus = Math.min(0.09, communicationsSupport.length * 0.03);
  const guardMitigation = Math.min(0.30, guardSupport.length * 0.15);
  const communicationRescueChance = Math.min(0.50, communicationsSupport.length * 0.20);
  const rule = room.game.settingModifiers || {};
  const settingBonus = Number(rule.expeditionBonus || 0) + (location.tags || []).reduce((sum, tag) => sum + Number(rule.tagBonuses?.[tag] || 0), 0);
  const competenceBonus = powerBreakdown.power * 0.06;
  const difficultyPenalty = Number(location.difficulty || 0) * 0.055;
  const preparationBonus = Number(room.game.expeditionBoost || 0);
  const chance = clamp(0.35 + competenceBonus + teamBonus + equipmentBonus + communicationsBonus + settingBonus - difficultyPenalty + preparationBonus, 0.12, 0.92);
  const autoSuccess = Boolean(room.game.expeditionAutoSuccess);
  const roll = autoSuccess ? 0 : random();
  const success = autoSuccess || roll < chance;
  room.game.expeditionRounds.push(room.game.round);
  const rawChanges = success ? location.success : location.failure;
  const rewardMultiplier = success ? Math.max(1, Number(room.game.expeditionRewardMultiplier || 1)) : 1;
  const abilityFailureMultiplier = success ? 1 : clamp(1 - Number(room.game.expeditionFailureMitigation || 0), 0.2, 1);
  const failureMultiplier = success ? 1 : clamp(abilityFailureMultiplier * (1 - guardMitigation), 0.2, 1);
  const changes = Object.fromEntries(Object.entries(rawChanges || {}).map(([key, value]) => {
    if (typeof value !== "number") return [key, value];
    if (success && value > 0) return [key, Math.round(value * rewardMultiplier)];
    if (!success && value < 0) return [key, Math.round(value * failureMultiplier)];
    return [key, value];
  }));
  const notes = applyEffects(room, changes);
  for (const member of players) {
    member.character.stress = clamp((member.character.stress || 0) + (success ? 1 : 2), 0, 5);
    if (success) member.character.successfulExpeditions += 1;
    else member.character.failedExpeditions += 1;
  }
  let text = `Експедиція до «${location.name}» ${success ? "завершилася успішно" : "зазнала невдачі"}.`;
  if (notes) text += ` Наслідки: ${notes}.`;
  const secondary = [];
  if (success && location.asset) {
    const assetRoll = random();
    const foundAsset = assetRoll < 0.5;
    secondary.push({ label: "Додаткова знахідка", result: foundAsset ? `Знайдено: ${location.asset.name}` : "Окремої знахідки немає", rollPercent: Math.round(assetRoll * 100), thresholdPercent: 50 });
    if (foundAsset) {
      room.game.shelter.assets.push({ ...location.asset });
      text += ` Знайдено: ${location.asset.name}.`;
    }
  }
  if (!success && !room.game.expeditionNoInjury) {
    const rescueRoll = communicationRescueChance > 0 ? random() : 1;
    const rescuedByCommunications = communicationRescueChance > 0 && rescueRoll < communicationRescueChance;
    if (communicationRescueChance > 0) secondary.push({ label: "Евакуація через зв’язок", result: rescuedByCommunications ? "Координатори вивели групу з небезпечної зони" : "Канал зв’язку не встиг запобігти ризику", rollPercent: Math.round(rescueRoll * 100), thresholdPercent: Math.round(communicationRescueChance * 100) });
    if (rescuedByCommunications) {
      text += " Координатори зв’язку вчасно організували евакуацію, тому травм вдалося уникнути.";
      secondary.push({ label: "Наслідок невдачі", result: "Команда зв’язку відвернула травму." });
    } else {
      const vulnerable = [];
      for (const member of players) {
        const defense = Number(member.character.permanentDefense || 0);
        const defenseRoll = defense > 0 ? random() : 1;
        if (!defense || defenseRoll > defense) vulnerable.push(member);
        secondary.push({ label: `Захист: ${member.name}`, result: !defense ? "Постійного захисту немає" : defenseRoll <= defense ? "Захист спрацював" : "Захист не спрацював", rollPercent: Math.round(defenseRoll * 100), thresholdPercent: Math.round(defense * 100) });
      }
      if (vulnerable.length) {
        const injured = sample(vulnerable);
        injured.character.injury = clamp((injured.character.injury || 0) + (location.difficulty >= 5 ? 2 : 1), 0, 5);
        injured.character.privateNotes.push(`Травма під час експедиції до «${location.name}».`);
        text += ` ${injured.name} отримує травму.`;
        secondary.push({ label: "Наслідок невдачі", result: `${injured.name} отримує травму.` });
      } else {
        text += " Особистий захист учасників відвернув травми.";
        secondary.push({ label: "Наслідок невдачі", result: "Усі учасники уникнули травми." });
      }
    }
  } else if (!success && room.game.expeditionNoInjury) {
    text += " Захисна підготовка вберегла учасників від травм.";
    secondary.push({ label: "Захисна підготовка", result: "Травму автоматично відвернено." });
  }
  markOperationSupportUsed(room, expeditionSupport, "expedition");
  const directSupportEntries = publicOperationSupport(room).filter((entry) => players.some((member) => member.id === entry.playerId) && entry.target === "expedition" && !entry.usedFor);
  markOperationSupportUsed(room, directSupportEntries, "direct_participant");
  for (const support of expeditionSupport) {
    const supporter = room.players.find((item) => item.id === support.playerId);
    if (supporter?.character && success) supporter.character.successfulSupportOperations = Number(supporter.character.successfulSupportOperations || 0) + 1;
  }
  room.game.expeditionBoost = 0;
  room.game.expeditionFailureMitigation = 0;
  room.game.expeditionRewardMultiplier = 1;
  room.game.expeditionNoInjury = false;
  room.game.expeditionAutoSuccess = false;
  const report = reasonReport(room, {
    type: "expedition",
    title: `Експедиція: ${location.name}`,
    subtitle: `Учасники: ${players.map((item) => item.name).join(", ")}${expeditionSupport.length ? ` · підтримка: ${expeditionSupport.map((item) => item.playerName).join(", ")}` : ""}`,
    success,
    chance: { basePercent: 35, finalPercent: percentNumber(chance), rollPercent: autoSuccess ? null : Math.round(roll * 100), label: autoSuccess ? "Автоматичний успіх" : chanceBand(chance).label, tone: autoSuccess ? "good" : chanceBand(chance).tone, autoSuccess },
    factors: [
      { ...factorEntry("Базова готовність", 0, "Стандартна основа експедиції."), displayValue: "35%" },
      factorEntry("Компетенції учасників", competenceBonus, "Професії, навички, предмети та фізичний стан; джерела не розкриваються."),
      factorEntry("Розмір польової групи", teamBonus, players.length === 3 ? "Троє учасників розподіляють завдання й підстраховують одне одного." : players.length === 2 ? "Двоє учасників взаємно підстраховують одне одного." : "Експедицію виконує одна людина."),
      factorEntry("Підготовка спорядження", equipmentBonus, equipmentSupport.length ? `${equipmentSupport.length} учасн. підготували спорядження.` : "Окремої підготовки спорядження не було."),
      factorEntry("Зв’язок і координація", communicationsBonus, communicationsSupport.length ? `${communicationsSupport.length} учасн. підтримували канал зв’язку.` : "Окремої команди зв’язку не було."),
      factorEntry("Охорона сховища", 0, guardSupport.length ? `${guardSupport.length} учасн. зменшили можливі ресурсні втрати на ${Math.round(guardMitigation * 100)}%.` : "Окремої охорони тилу не було."),
      factorEntry("Правило сетингу", settingBonus, settingBonus ? "Сетинг або теги маршруту змінили шанс." : "Сетинг не змінив шанс."),
      factorEntry("Складність маршруту", -difficultyPenalty, `Рівень ${location.difficulty}/6.`),
      factorEntry("Попередня підготовка", preparationBonus, preparationBonus ? "Разовий бонус експедиції." : "Додаткового бонусу не було.")
    ],
    costs: [],
    outcome: { summary: text, effects: notes || "Зміни ресурсів не зафіксовано." },
    secondary: [...publicOperationFactorSummary(powerBreakdown), ...secondary]
  });
  rememberReason(room, report);
  const record = { round: room.game.round, createdAt: report.createdAt, locationId: location.id, locationName: location.name, playerIds: players.map((item) => item.id), playerNames: players.map((item) => item.name), supportPlayerIds: expeditionSupport.map((item) => item.playerId), supportPlayerNames: expeditionSupport.map((item) => item.playerName), success, text, reasonReport: report };
  room.game.expeditionHistory.push(record);
  room.game.log.push(`${text} Шанс ${percentNumber(chance)}%${autoSuccess ? ", автоматичний успіх" : `, кидок ${Math.round(roll * 100)}`}.`);
}
function moduleTags(module) {
  const tags = textTags(module.name);
  if (!tags.includes("repair")) tags.push("repair");
  return tags;
}
function repairChance(room, module, worker) {
  const power = actionPower([worker], moduleTags(module));
  const urgency = module.condition <= 30 ? -0.04 : module.condition >= 85 ? 0.06 : 0;
  const supportBonus = Math.min(0.16, eligibleOperationSupport(room, "repair", [worker.id]).length * 0.04);
  return clamp(0.42 + power * 0.085 + urgency + supportBonus, 0.16, 0.93);
}
function repairModule(room, player, body) {
  requireModeAction(room, player, "operations");
  if (player.id !== room.hostPlayerId) throw new Error("Лише хост може призначити ремонт.");
  if ((room.game.repairRounds || []).includes(room.game.round)) throw new Error("У цьому раунді плановий ремонт уже проведено.");
  const module = room.game.shelter.modules.find((item) => item.id === body.moduleId);
  const worker = room.players.find((item) => item.id === body.workerId && item.active && !isDetained(room, item));
  if (!module || !worker) throw new Error("Оберіть модуль і активного виконавця.");
  if (room.game.shelter.resources.energy < 3) throw new Error("Для ремонту потрібно щонайменше 3% енергії.");
  room.game.shelter.resources.energy -= 3;
  room.game.repairRounds.push(room.game.round);
  const before = module.condition;
  const powerBreakdown = operationPowerBreakdown([worker], moduleTags(module));
  const competenceBonus = powerBreakdown.power * 0.085;
  const urgency = module.condition <= 30 ? -0.04 : module.condition >= 85 ? 0.06 : 0;
  const repairSupport = eligibleOperationSupport(room, "repair", [worker.id]);
  const supportBonus = Math.min(0.16, repairSupport.length * 0.04);
  const injuryThreshold = Math.max(0.10, 0.25 - Math.min(0.15, repairSupport.length * 0.05));
  const chance = clamp(0.42 + competenceBonus + urgency + supportBonus, 0.16, 0.93);
  const roll = random();
  const success = roll < chance;
  let injuryRoll = null;
  let text;
  if (success) {
    module.condition = clamp(module.condition + randomInt(12, 24) + Math.min(8, repairSupport.length * 2), 0, 100);
    worker.character.successfulRepairs += 1;
    worker.character.stress = clamp((worker.character.stress || 0) + 1, 0, 5);
    text = `${worker.name} успішно ремонтує модуль «${module.name}»: ${before}% → ${module.condition}%.`;
  } else {
    module.condition = clamp(module.condition - randomInt(2, 7), 0, 100);
    worker.character.stress = clamp((worker.character.stress || 0) + 2, 0, 5);
    injuryRoll = random();
    if (injuryRoll < injuryThreshold) worker.character.injury = clamp((worker.character.injury || 0) + 1, 0, 5);
    text = `${worker.name} не справляється з ремонтом модуля «${module.name}». Стан: ${before}% → ${module.condition}%.`;
  }
  markOperationSupportUsed(room, repairSupport, "repair");
  const directRepairSupport = publicOperationSupport(room).filter((entry) => entry.playerId === worker.id && entry.target === "repair" && !entry.usedFor);
  markOperationSupportUsed(room, directRepairSupport, "direct_worker");
  for (const support of repairSupport) {
    const supporter = room.players.find((item) => item.id === support.playerId);
    if (supporter?.character && success) supporter.character.successfulSupportOperations = Number(supporter.character.successfulSupportOperations || 0) + 1;
  }
  const report = reasonReport(room, {
    type: "repair",
    title: `Ремонт: ${module.name}`,
    subtitle: `Виконавець: ${worker.name}${repairSupport.length ? ` · помічники: ${repairSupport.map((item) => item.playerName).join(", ")}` : ""}`,
    success,
    chance: { basePercent: 42, finalPercent: percentNumber(chance), rollPercent: Math.round(roll * 100), label: chanceBand(chance).label, tone: chanceBand(chance).tone, autoSuccess: false },
    factors: [
      { ...factorEntry("Базова готовність", 0, "Стандартна основа планового ремонту."), displayValue: "42%" },
      factorEntry("Компетенції виконавця", competenceBonus, "Професія, навичка, предмети та стан; джерела не розкриваються."),
      factorEntry("Допомога ремонтної бригади", supportBonus, repairSupport.length ? `${repairSupport.length} учасн. допомагають із інструментами, діагностикою та безпекою.` : "Додаткових помічників немає."),
      factorEntry("Стан модуля", urgency, before <= 30 ? "Критично пошкоджений модуль складніше ремонтувати." : before >= 85 ? "Справний модуль легше обслуговувати." : "Стан модуля не дає додаткового модифікатора.")
    ],
    costs: [{ label: "Енергія", value: "−3%" }],
    outcome: { summary: text, effects: `Стан модуля ${before}% → ${module.condition}%; стрес виконавця ${worker.character.stress}/5.` },
    secondary: [
      ...(repairSupport.length ? [{ label: "Ремонтна бригада", result: `${repairSupport.map((item) => item.playerName).join(", ")} допомогли; успішне відновлення посилено на ${Math.min(8, repairSupport.length * 2)}%.` }] : []),
      ...(injuryRoll === null ? [] : [{ label: "Ризик травми після невдачі", result: injuryRoll < injuryThreshold ? "Виконавець отримав травму" : "Травми вдалося уникнути", rollPercent: Math.round(injuryRoll * 100), thresholdPercent: Math.round(injuryThreshold * 100) }])
    ]
  });
  rememberReason(room, report);
  room.game.repairHistory.push({ round: room.game.round, createdAt: report.createdAt, moduleId: module.id, moduleName: module.name, workerId: worker.id, workerName: worker.name, supportPlayerIds: repairSupport.map((item) => item.playerId), supportPlayerNames: repairSupport.map((item) => item.playerName), success, text, reasonReport: report });
  room.game.log.push(`${text} Шанс ${percentNumber(chance)}%, кидок ${Math.round(roll * 100)}.`);
}

function progressMedicalConditions(room) {
  for (const player of activePlayers(room)) {
    const condition = player.character.medicalCondition;
    if (!condition || (condition.severity || 0) <= 0) continue;
    if (Number(player.character.immuneUntilRound || 0) >= room.game.round) {
      condition.stableRounds = (condition.stableRounds || 0) + 1;
      continue;
    }
    const treated = condition.treatedRound === room.game.round;
    const targetedIsolation = Number(player.character.medicalIsolationUntilRound || 0) >= room.game.round && condition.contagious;
    const quarantineProtected = (room.game.quarantineRound === room.game.round && condition.contagious) || targetedIsolation;
    const observed = condition.observedRound === room.game.round;
    const medicinePressure = room.game.shelter.resources.medicine < 25 ? 0.12 : 0;
    const stressPressure = (player.character.stress || 0) * 0.025;
    const base = MEDICAL.severityMeta(condition.severity).progression;
    const untreatedChance = clamp(base + medicinePressure + stressPressure, 0.08, 0.72);
    const chance = quarantineProtected ? 0 : observed ? untreatedChance * 0.5 : (treated ? Math.max(0.02, base * 0.2) : untreatedChance);
    if (random() < chance && condition.severity < 5) {
      const before = condition.severity;
      condition.severity += 1;
      condition.worsenedRounds = (condition.worsenedRounds || 0) + 1;
      player.character.stress = clamp((player.character.stress || 0) + 1, 0, 5);
      if (condition.severity >= 4) player.character.injury = clamp((player.character.injury || 0) + 1, 0, 5);
      const note = `Стан «${condition.name}» погіршився: ${severityLabel(before)} → ${severityLabel(condition.severity)}.`;
      player.character.privateNotes.push(note);
      room.game.log.push(player.character.revealed.health ? `${player.name}: ${note}` : `Медичний стан одного з мешканців погіршився.`);
    } else {
      condition.stableRounds = (condition.stableRounds || 0) + 1;
    }
    if (condition.severity >= 5) {
      room.game.shelter.resources.medicine = clamp(room.game.shelter.resources.medicine - 3, 0, 100);
      player.character.stress = clamp((player.character.stress || 0) + 1, 0, 5);
    }
  }
  const globallyQuarantined = room.game.quarantineRound === room.game.round;
  const exposedContagious = globallyQuarantined ? [] : activePlayers(room).filter((player) => {
    const condition = player.character.medicalCondition;
    return Boolean(condition?.contagious && (condition.severity || 0) > 0 && Number(player.character.medicalIsolationUntilRound || 0) < room.game.round);
  });
  if (exposedContagious.length) {
    const medicineLoss = Math.min(6, exposedContagious.length * 2);
    const moraleLoss = Math.min(4, exposedContagious.length);
    room.game.shelter.resources.medicine = clamp(room.game.shelter.resources.medicine - medicineLoss, 0, 100);
    room.game.shelter.resources.morale = clamp(room.game.shelter.resources.morale - moraleLoss, 0, 100);
    room.game.log.push(`Неізольований заразний стан створив додатковий тиск на громаду: медикаменти −${medicineLoss}%, мораль −${moraleLoss}%.`);
  }
}


function applyPassiveAbilities(room) {
  for (const player of activePlayers(room)) {
    const character = player.character;
    if (!character.passiveAbilityActive) continue;
    const id = character.ability?.id;
    if (id === "passive_heal") {
      const condition = character.medicalCondition;
      if ((condition?.severity || 0) > 0) condition.severity = Math.max(0, condition.severity - 1);
      else character.injury = Math.max(0, (character.injury || 0) - 1);
    } else if (id === "passive_food") applyEffects(room, { food: 3 });
    else if (id === "passive_water") applyEffects(room, { water: 3 });
    else if (id === "passive_energy") applyEffects(room, { energy: 2 });
    else if (id === "passive_med") applyEffects(room, { medicine: 2 });
    else if (id === "passive_morale") applyEffects(room, { morale: 3 });
  }
}

function consumeRound(room) {
  const shelter = room.game.shelter;
  const count = activePlayers(room).length + shelter.allies;
  applyPassiveAbilities(room);
  const pressure = Number(room.game.scenario?.pressure || 1);
  const foodCost = Math.max(4, Math.ceil(count * 2 * pressure));
  const adjustedFoodCost = room.game.rationingRound === room.game.round ? Math.ceil(foodCost / 2) : foodCost;
  shelter.resources.food = clamp(shelter.resources.food - adjustedFoodCost, 0, 100);
  shelter.resources.water = clamp(shelter.resources.water - Math.max(5, Math.ceil(count * 2 * pressure)), 0, 100);
  shelter.resources.energy = clamp(shelter.resources.energy - Math.ceil(5 * pressure), 0, 100);
  for (const [index, module] of shelter.modules.entries()) {
    if (module.condition < 45) {
      const keys = ["energy", "water", "integrity", "medicine", "food", "morale"];
      const key = keys[index % keys.length];
      shelter.resources[key] = clamp(shelter.resources[key] - 4, 0, 100);
    }
  }
  const rule = room.game.settingModifiers || {};
  if (rule.roundEffects && Object.keys(rule.roundEffects).length) applyEffects(room, rule.roundEffects);
  if (Number(rule.stressPerRound || 0) > 0) {
    for (const player of activePlayers(room)) player.character.stress = clamp((player.character.stress || 0) + Number(rule.stressPerRound), 0, 5);
  }
  applyConcealmentPressure(room);
  progressMedicalConditions(room);
  consumeOutsideCampRound(room);
  room.game.log.push(`Завершення раунду: ресурси витрачено на ${count} мешканців із коефіцієнтом тиску ${pressure.toFixed(2)}; медичні стани переоцінено.`);
}
function detectiveMysteryResult(room) {
  const game = room.game;
  if (!game?.mystery) return null;
  const culpritPlayer = room.players.find((item) => item.id === game.mystery.culpritId);
  const accomplicePlayer = room.players.find((item) => item.id === game.mystery.accompliceId);
  const culpritCaught = Boolean(culpritPlayer && !culpritPlayer.active);
  const accompliceCaught = !accomplicePlayer || !accomplicePlayer.active;
  const counts = {};
  for (const targetId of Object.values(game.mystery.accusationVotes || {})) {
    if (!targetId || targetId === SKIP_VOTE) continue;
    counts[targetId] = (counts[targetId] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const accusedId = ranked[0]?.[0] || null;
  const accusedPlayer = room.players.find((item) => item.id === accusedId);
  const correctAccusation = accusedId === game.mystery.culpritId;
  const confirmedAgainstCulprit = new Set((game.mystery.confirmedLinks || []).filter((item) => item.targetId === game.mystery.culpritId).map((item) => item.aspect)).size;
  const reliablePublicClues = (game.mystery.evidence || []).filter((item) => !item.disputed && Number(item.reliability || 0) >= 2).length;
  const publicClueContribution = Math.min(2, Math.ceil(reliablePublicClues / 2));
  const evidenceStrength = confirmedAgainstCulprit + publicClueContribution;
  const enoughEvidence = evidenceStrength >= Number(game.mystery.requiredEvidence || 2);
  const culpritIdentified = correctAccusation;
  const accompliceIdentified = !accomplicePlayer || accompliceCaught || ranked.some(([id, votes], index) => index < 2 && id === game.mystery.accompliceId && votes > 0);
  game.mystery.solved = Boolean(correctAccusation && enoughEvidence);
  return {
    caseBrief: { ...game.mystery.caseBrief },
    culpritName: culpritPlayer?.name || "Невідомо",
    accompliceName: accomplicePlayer?.name || null,
    accusedName: accusedPlayer?.name || null,
    accusationVotes: ranked.map(([id, votes]) => ({ name: room.players.find((item) => item.id === id)?.name || "Невідомо", votes })),
    crime: game.mystery.crime,
    method: game.mystery.method,
    solved: game.mystery.solved,
    fullySolved: game.mystery.solved && accompliceIdentified,
    correctAccusation,
    enoughEvidence,
    evidenceStrength,
    requiredEvidence: game.mystery.requiredEvidence,
    culpritCaught,
    culpritIdentified,
    accompliceCaught,
    accompliceIdentified,
    evidence: (game.mystery.evidence || []).map((item) => ({ ...item })),
    publicClaims: (game.mystery.publicClaims || []).map((item) => ({ ...item })),
    investigationLog: (game.mystery.investigationLog || []).map((item) => ({ ...item })),
    publicTheory: room.players.map((item) => ({ name: item.name, value: Number(game.mystery.publicTheory?.[item.id] || 0), guilty: item.id === game.mystery.culpritId || item.id === game.mystery.accompliceId }))
  };
}

function legacyGoalId(goal = "") {
  if (/Дожити/i.test(goal)) return "survive_final";
  if (/Допомогти гравцеві|Допомогти іншому/i.test(goal)) return "protect_relationship";
  if (/Відкрити/i.test(goal)) return "reveal_six";
  if (/цілісності/i.test(goal)) return "preserve_integrity";
  if (/здібність/i.test(goal)) return "use_ability";
  if (/експедиції/i.test(goal)) return "successful_expedition";
  if (/відремонтувати/i.test(goal)) return "successful_repair";
  if (/особисту перевірку/i.test(goal)) return "case_investigation";
  if (/алібі або мотиву/i.test(goal)) return "case_reveal_fact";
  if (/винуватцю/i.test(goal)) return "case_culprit_stopped";
  if (/не допустити доведення справи/i.test(goal)) return "detective_culprit_escape";
  if (/уникнути доведеного звинувачення/i.test(goal)) return "detective_accomplice_protect";
  if (/правильно назвати організатора/i.test(goal)) return "detective_innocent_solve";
  return "unknown";
}
function personalGoalCompleted(room, player, mysteryOutcome = null) {
  const game = room.game;
  const character = player.character;
  const goalId = character.goalId || legacyGoalId(character.goal);
  const target = room.players.find((candidate) => candidate.id === character.relationshipTargetId);
  const ownAccusation = game.mystery?.accusationVotes?.[player.id] || null;
  const investigated = Boolean(game.mystery?.investigationLog?.some((item) => item.investigatorId === player.id));
  const revealedTarget = Math.min(6, characterKeysForRoom(room).length);
  const rules = {
    survive_final: () => player.active || Boolean(game.features?.outsidePlay && outsideCampFinalResult(room)?.survived && outsideCampFinalResult(room).members.some((item) => item.id === player.id)),
    protect_relationship: () => Boolean(target?.active),
    reveal_six: () => Object.keys(character.revealed || {}).length >= revealedTarget,
    preserve_integrity: () => Number(game.shelter.resources.integrity || 0) >= 35,
    use_ability: () => Boolean(character.abilityUsed),
    successful_expedition: () => Number(character.successfulExpeditions || 0) > 0,
    successful_repair: () => Number(character.successfulRepairs || 0) > 0,
    case_investigation: () => investigated,
    case_reveal_fact: () => Boolean(room.players.some((candidate) => candidate.character.revealed.alibi || candidate.character.revealed.motive)),
    case_culprit_stopped: () => player.active && Boolean(mysteryOutcome?.solved || mysteryOutcome?.culpritCaught),
    detective_culprit_escape: () => player.active && !mysteryOutcome?.solved,
    detective_accomplice_protect: () => player.active && !mysteryOutcome?.solved && !mysteryOutcome?.accompliceIdentified,
    detective_innocent_solve: () => player.active && investigated && ownAccusation === game.mystery?.culpritId && Boolean(mysteryOutcome?.solved)
  };
  return Boolean((rules[goalId] || (() => false))());
}
function roleResultForPlayer(room, player, context) {
  const { totalRevealed, resourceAverage, mysteryOutcome } = context;
  const character = player.character;
  if (character.caseRole) {
    let completed = false;
    if (character.caseRole.id === "culprit") completed = player.active && !mysteryOutcome?.solved;
    else if (character.caseRole.id === "accomplice") completed = player.active && !mysteryOutcome?.solved && !mysteryOutcome?.accompliceIdentified;
    else completed = Boolean(mysteryOutcome?.solved && room.game.mystery?.accusationVotes?.[player.id] === room.game.mystery?.culpritId);
    return { playerId: player.id, name: player.name, role: character.caseRole.name, faction: character.caseRole.faction, objective: character.caseRole.objective, completed };
  }
  const role = character.role;
  let completed = false;
  if (role.id === "survivor") completed = player.active;
  else if (role.id === "guardian") {
    const target = room.players.find((candidate) => candidate.id === role.targetId);
    completed = player.active && Boolean(target?.active);
  } else if (role.id === "medic") completed = player.active && character.successfulTreatments > 0;
  else if (role.id === "archivist") completed = totalRevealed >= 18;
  else if (role.id === "opportunist") completed = player.active;
  else if (role.id === "saboteur") completed = player.active && (room.game.shelter.resources.integrity < 35 || room.game.shelter.modules.some((module) => module.condition < 35));
  else if (role.id === "engineer") completed = player.active && room.game.shelter.modules.some((module) => module.condition >= 80);
  else if (role.id === "quartermaster") completed = character.roleActionUsed && resourceAverage >= 45;
  else if (role.id === "scoutmaster") completed = player.active && character.roleActionUsed && (!room.game.features?.operations || (room.game.expeditionHistory || []).some((item) => item.success));
  else if (role.id === "mediator") completed = character.roleActionUsed && room.game.shelter.resources.morale >= 35;
  else if (role.id === "agitator") completed = player.active && character.roleActionUsed;
  else if (role.id === "collector") completed = player.active && character.inventory.length >= 3;
  return { playerId: player.id, name: player.name, role: role.name, faction: role.faction, objective: role.objective, completed };
}
function groupVictoryResult(room, score, mysteryOutcome) {
  const mode = modeConfig(room.settings);
  if (room.settings.setting === "detective") {
    return {
      title: "Результат розслідування",
      completed: Boolean(mysteryOutcome?.solved),
      objective: publicVictoryRules(room.settings).group.objective,
      status: mysteryOutcome?.solved ? "Групова перемога" : "Групова поразка",
      reason: mysteryOutcome?.solved
        ? `Організатора названо правильно, доказова сила — ${mysteryOutcome.evidenceStrength}/${mysteryOutcome.requiredEvidence}.`
        : mysteryOutcome?.correctAccusation
          ? `Організатора названо правильно, але доказова сила лише ${mysteryOutcome.evidenceStrength}/${mysteryOutcome.requiredEvidence}.`
          : "Фінальне звинувачення не встановило справжнього організатора."
    };
  }
  const selectionComplete = !mode.elimination || activePlayers(room).length <= Number(room.settings.capacity || activePlayers(room).length);
  const viable = Number(score || 0) >= GROUP_VICTORY_SCORE;
  const completed = selectionComplete && viable;
  return {
    title: mode.id === "factions" ? "Результат громади" : "Перемога групи",
    completed,
    objective: publicVictoryRules(room.settings).group.objective,
    status: completed ? "Групова перемога" : "Групова поразка",
    reason: !selectionComplete
      ? `Відбір не завершено: активних гравців ${activePlayers(room).length}, місць ${room.settings.capacity}.`
      : viable
        ? `Фінальна оцінка громади — ${score}/100, поріг життєздатності подолано.`
        : `Фінальна оцінка громади — ${score}/100, потрібно щонайменше ${GROUP_VICTORY_SCORE}/100.`
  };
}
function finalVictorySummaryForPlayer(room, player) {
  const final = room.game?.final;
  if (!final) return null;
  const personal = (final.personalResults || []).find((item) => item.playerId === player.id) || null;
  const role = (final.roleResults || []).find((item) => item.playerId === player.id) || null;
  const goal = (final.personalGoals || []).find((item) => item.playerId === player.id) || null;
  const features = room.game.features || publicModeFeatures(room.settings);
  let special = role;
  if (!player.character?.caseRole && !features.hiddenRoles) special = features.personalGoals ? goal : null;
  return {
    group: final.groupResult || null,
    personal,
    special: special ? {
      title: special.role || "Особиста мета",
      faction: special.faction || null,
      objective: special.objective || special.goal,
      completed: Boolean(special.completed),
      status: special.completed ? "Умову виконано" : "Умову не виконано"
    } : {
      title: "Додаткова умова",
      objective: "У цьому режимі немає прихованої ролі або обов’язкової додаткової мети.",
      completed: null,
      status: "Не застосовується"
    }
  };
}

function finishGame(room) {
  const game = room.game;
  if (game.tutorial) game.tutorial.completed = true;
  const survivors = activePlayers(room);
  const resources = game.shelter.resources;
  const moduleAverage = Math.round(game.shelter.modules.reduce((sum, module) => sum + module.condition, 0) / game.shelter.modules.length);
  const resourceAverage = Math.round(Object.values(resources).reduce((sum, value) => sum + value, 0) / Object.keys(resources).length);
  const hiddenThreats = survivors.filter((player) => player.character.role.faction === "Загроза");
  const overcrowding = Math.max(0, survivors.length - (game.shelter.residentCapacity || room.settings.capacity));
  const criticalPatients = survivors.filter((player) => (player.character.medicalCondition?.severity || 0) >= 4);
  const severePatients = survivors.filter((player) => (player.character.medicalCondition?.severity || 0) >= 3);
  const medicalPenalty = criticalPatients.length * 5 + Math.max(0, severePatients.length - criticalPatients.length) * 2;
  const socialPenalty = hiddenThreats.length * 3 + overcrowding * 6;
  const operationBonus = game.features?.operations
    ? Math.min(12, (game.expeditionHistory || []).filter((item) => item.success).length * 3 + (game.repairHistory || []).filter((item) => item.success).length * 2)
    : 0;
  const preliminaryMysteryOutcome = detectiveMysteryResult(room);
  const directOutcome = evaluateDirectOutcome(room, preliminaryMysteryOutcome);
  let score = directOutcome.directScore;
  let verdict = "Критичний фінал";
  let description = "Сховище формально пережило кризовий період, однак його системи, медицина й внутрішня довіра перебувають на межі. Наступна велика аварія може стати останньою.";
  if (score >= 78) {
    verdict = "Стійка нова громада";
    description = "Група не просто вижила: вона зберегла керованість, відновила ключові системи й створила запас міцності для наступних років. Сховище може стати основою нового поселення.";
  } else if (score >= 60) {
    verdict = "Надійне виживання";
    description = "Сховище функціонує стабільно, хоча окремі ресурси та людські конфлікти ще потребують уваги. За дисциплінованого керівництва громада має добрі довгострокові шанси.";
  } else if (score >= 43) {
    verdict = "Нестабільне виживання";
    description = "Група пережила перші роки, але залежить від постійних ремонтів, вдалих експедицій і крихких домовленостей. Помилка в медицині або постачанні може зруйнувати баланс.";
  } else if (score >= 27) {
    verdict = "Виживання на межі";
    description = "Сховище тримається завдяки жорсткій економії та небезпечним компромісам. Люди вижили, але ще не створили системи, яка гарантує наступний рік.";
  }
  if (overcrowding) description += ` Усередині на ${overcrowding} мешканців більше, ніж передбачено проєктом.`;
  if (criticalPatients.length) description += ` ${criticalPatients.length} мешканців залишаються у критичному медичному стані.`;

  const totalRevealed = room.players.reduce((sum, player) => sum + Object.keys(player.character.revealed).length, 0);
  const personalGoals = room.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    goal: player.character.goal,
    goalId: player.character.goalId || legacyGoalId(player.character.goal),
    completed: personalGoalCompleted(room, player, preliminaryMysteryOutcome)
  }));
  const roleResults = room.players.map((player) => roleResultForPlayer(room, player, {
    totalRevealed,
    resourceAverage,
    mysteryOutcome: preliminaryMysteryOutcome
  }));
  const characters = room.players.map((player) => {
    const values = Object.fromEntries(characterKeysForRoom(room).map((key) => [key, player.character[key]]));
    return {
      playerId: player.id,
      name: player.name,
      active: player.active,
      eliminatedRound: player.eliminatedRound,
      values,
      descriptions: player.character.descriptions || descriptionsFor(values),
      ability: { ...player.character.ability },
      role: { name: player.character.role.name, faction: player.character.role.faction },
      inventory: player.character.inventory.map((item) => `${item.name}${item.medicalUses ? ` (${item.medicalUses} вик.)` : ""}`),
      injury: player.character.injury || 0,
      stress: player.character.stress || 0,
      medicalCondition: { ...player.character.medicalCondition, severityLabel: severityLabel(player.character.medicalCondition?.severity || 0) },
      treatmentsProvided: player.character.treatmentCount || 0,
      successfulTreatments: player.character.successfulTreatments || 0,
      outsideRole: player.outsideRole ? { ...player.outsideRole } : null,
      returnedRound: player.returnedRound || null
    };
  });

  const weakModules = game.shelter.modules.filter((module) => module.condition < 45);
  const lowResources = Object.entries(resources).filter(([, value]) => value < 35).map(([key]) => resourceName(key));
  const analysis = [
    {
      title: "Стартові умови · Запаси",
      status: resourceAverage >= 65 ? "Стабільно" : resourceAverage >= 40 ? "Напружено" : "Критично",
      text: `Середній запас ресурсів — ${resourceAverage}%. Сховище має площу ${game.shelter.areaM2.toLocaleString("uk-UA")} м² і ${game.shelter.roomCount} приміщень; стартовий маніфест містив ${game.shelter.provisions.length} конкретних позицій провіанту. ${lowResources.length ? `Найслабші позиції: ${lowResources.join(", ")}.` : "Жоден базовий ресурс не впав нижче критичної межі."}`
    },
    {
      title: "Стартові умови · Системи",
      status: moduleAverage >= 70 ? "Надійно" : moduleAverage >= 45 ? "Зношено" : "Аварійно",
      text: `Середній стан модулів — ${moduleAverage}%. ${weakModules.length ? `Проблемні системи: ${weakModules.map((module) => `${module.name} ${module.condition}%`).join(", ")}.` : "Усі ключові модулі залишилися працездатними."}`
    },
    {
      title: "Стартові умови · Медицина",
      status: criticalPatients.length ? "Критично" : severePatients.length ? "Потрібен нагляд" : "Контрольовано",
      text: `Проведено ${game.treatmentCount || 0} лікувань. Тяжких або критичних пацієнтів у фінальній групі: ${severePatients.length}; запас медикаментів — ${resources.medicine}%.`
    },
    ...(game.features?.operations ? [{
      title: "Експедиції та ремонти",
      status: operationBonus >= 8 ? "Ефективно" : operationBonus >= 3 ? "Посередньо" : "Мало результатів",
      text: `Експедиції: ${(game.expeditionHistory || []).filter((item) => item.success).length} успішних із ${(game.expeditionHistory || []).length}. Ремонти: ${(game.repairHistory || []).filter((item) => item.success).length} успішних із ${(game.repairHistory || []).length}.`
    }] : []),
    {
      title: "Стартові умови · Соціум",
      status: resources.morale >= 60 && !hiddenThreats.length ? "Згуртовано" : resources.morale >= 35 ? "Крихкий баланс" : "Розкол",
      text: `Мораль — ${resources.morale}%. У фінальній групі прихованих загроз: ${hiddenThreats.length}; передано предметів: ${game.tradeCount || 0}.`
    },
    {
      title: "Початковий прогноз",
      status: score >= 60 ? "Позитивна" : score >= 40 ? "Невизначена" : "Похмура",
      text: score >= 60
        ? "Група може переходити від аварійного виживання до планування поселення, навчання наступників і відновлення контактів із зовнішнім світом."
        : score >= 40
          ? "Громада здатна протриматися, але один невдалий сезон або серйозна аварія поверне її до боротьби за кожен день."
          : "Без радикальної зміни управління запасами, лікування та ремонтів сховище поступово втратить автономність."
    }
  ];

  const playerOutcomes = characters.map((character) => {
    const health = character.medicalCondition;
    const placeText = character.active ? "залишився / залишилася у сховищі" : `був / була вигнана в раунді ${character.eliminatedRound || "?"}`;
    const medicalText = health.severity > 0
      ? `Стан «${health.name}» завершив партію на рівні «${health.severityLabel}».`
      : "Активної хвороби у фіналі немає.";
    const contribution = character.successfulTreatments
      ? `Успішних лікувань: ${character.successfulTreatments}.`
      : character.treatmentsProvided ? `Спроб лікування: ${character.treatmentsProvided}, без підтвердженого успіху.` : "Медичної допомоги іншим не надавав / не надавала.";
    return { playerId: character.playerId, name: character.name, active: character.active, text: `${character.name} ${placeText}. ${medicalText} Травма ${character.injury}/5, стрес ${character.stress}/5. ${contribution}` };
  });

  const keyLog = (game.log || []).filter((line) => /Партію|Катастрофа|Сховище|Подія:|Рішення події|експедиц|ремонт|лікуван|залишає сховище|нікого не виганяти/i.test(line));
  const chronology = [
    `Початок кризи: ${publicCatastrophe(room, true).title}. ${publicCatastrophe(room, true).description}`,
    `Початкове укриття: ${game.shelter.title}, ${game.shelter.areaM2.toLocaleString("uk-UA")} м², ${game.shelter.roomCount} приміщень, проєктна місткість — ${game.shelter.residentCapacity || room.settings.capacity}; до фінальної групи відібрано до ${room.settings.capacity} людей.`,
    ...keyLog.slice(-12),
    `Фінальний склад: ${survivors.length} мешканців і ${game.shelter.allies} зовнішніх союзників.`,
    `Оцінка контрольованих рішень: ${score}/100. ${description}`
  ];

  const expeditionSuccesses = (game.expeditionHistory || []).filter((item) => item.success).length;
  const repairSuccesses = (game.repairHistory || []).filter((item) => item.success).length;
  const weakestModule = [...game.shelter.modules].sort((a, b) => a.condition - b.condition)[0];
  const strengths = [];
  if (resourceAverage >= 60) strengths.push(`Середній запас ресурсів утримано на рівні ${resourceAverage}%.`);
  if (moduleAverage >= 65) strengths.push(`Ключові системи збережено у робочому стані: середнє значення ${moduleAverage}%.`);
  if (!criticalPatients.length && !severePatients.length) strengths.push("У фінальній групі немає тяжких або критичних пацієнтів.");
  if (resources.morale >= 55) strengths.push(`Мораль громади залишається керованою — ${resources.morale}%.`);
  if (expeditionSuccesses) strengths.push(`Успішні експедиції: ${expeditionSuccesses}. Вони створили зовнішні маршрути постачання.`);
  if (!strengths.length) strengths.push("Попри втрати, група зберегла базову керованість і завершила кризовий період разом.");

  const risks = [];
  if (lowResources.length) risks.push(`Критично слабкі ресурси: ${lowResources.join(", ")}.`);
  if (weakModules.length) risks.push(`Негайного ремонту потребують: ${weakModules.map((module) => module.name).join(", ")}.`);
  if (severePatients.length) risks.push(`Тяжкі або критичні медичні стани мають ${severePatients.length} мешканців.`);
  if (overcrowding) risks.push(`Перенаселення: понад проєктну місткість на ${overcrowding} осіб.`);
  if (hiddenThreats.length) risks.push(`У громаді залишилося прихованих загроз: ${hiddenThreats.length}.`);
  if (resources.morale < 40) risks.push(`Низька мораль (${resources.morale}%) створює ризик розколу.`);
  if (!risks.length) risks.push("Негайних системних загроз не виявлено, але запас міцності слід регулярно переоцінювати.");

  const priorities = [];
  if (lowResources.length) priorities.push(game.features?.operations
    ? `Поповнити ${lowResources.slice(0, 2).join(" і ")} першою ж безпечною експедицією.`
    : `Скоротити витрати й шукати безпечний спосіб поповнити ${lowResources.slice(0, 2).join(" і ")}.`);
  if (weakestModule && weakestModule.condition < 60) priorities.push(`Відновити модуль «${weakestModule.name}» (${weakestModule.condition}%).`);
  if (severePatients.length) priorities.push("Спрямувати медикаменти та компетентних медиків на найтяжчих пацієнтів.");
  if (resources.morale < 55 || hiddenThreats.length) priorities.push("Провести внутрішню перевірку й відновити довіру між мешканцями.");
  if (!priorities.length) priorities.push("Перейти від аварійного виживання до довгострокового плану поселення й підготовки наступників.");

  const scoreBreakdown = directOutcome.scoreBreakdown.map((item) => ({ ...item }));
  analysis.unshift({
    title: `Оцінка рішень · ${publicVictoryRules(room.settings).modeName}`,
    status: `${directOutcome.directScore}/100`,
    text: directOutcome.competence.labelsMissing.length
      ? `Формула режиму врахувала фактичні рішення групи. Непокриті критичні напрями: ${directOutcome.competence.labelsMissing.join(", ")}.`
      : `Формула режиму врахувала фактичні рішення групи; усі критичні напрями сценарію покрито.`
  });

  const longTermSimulation = simulateLongTerm(room, score);
  const forecastCenter = Number(longTermSimulation.finalScore ?? score);
  const forecastRange = {
    min: clamp(Math.round(forecastCenter - 4), 0, 100),
    max: clamp(Math.round(forecastCenter + 4), 0, 100),
    center: clamp(Math.round(forecastCenter), 0, 100)
  };
  analysis.unshift({
    title: `Результат через ${longTermSimulation.horizonYears} років`,
    status: longTermSimulation.verdict,
    text: `${longTermSimulation.description} Населення змінилося з ${longTermSimulation.demography.startPopulation} до ${longTermSimulation.demography.endPopulation}; ${longTermSimulation.demography.modeled ? `народжень — ${longTermSimulation.demography.births}, ` : ""}смертей — ${longTermSimulation.demography.deaths}. Етап розвитку: ${longTermSimulation.settlement.stage}.`
  });

  strengths.length = 0;
  risks.length = 0;
  priorities.length = 0;
  const simulatedResourceEntries = Object.entries(longTermSimulation.finalResources || {});
  const simulatedLowResources = simulatedResourceEntries.filter(([, value]) => value < 30).map(([key]) => resourceName(key));
  const simulatedStrongResources = simulatedResourceEntries.filter(([, value]) => value >= 65).map(([key]) => resourceName(key));
  if (longTermSimulation.settlement.level >= 2) strengths.push(`Громада перейшла до етапу «${longTermSimulation.settlement.stage}».`);
  if (longTermSimulation.settlement.buildings.length) strengths.push(`Збудовано постійних об’єктів: ${longTermSimulation.settlement.buildings.length}.`);
  if (longTermSimulation.demography.births) strengths.push(`Народилося дітей: ${longTermSimulation.demography.births}; з’явилося наступне покоління.`);
  if (longTermSimulation.demography.endPopulation >= longTermSimulation.demography.startPopulation) strengths.push(`Населення не скоротилося: ${longTermSimulation.demography.endPopulation} мешканців наприкінці.`);
  if (simulatedStrongResources.length) strengths.push(`Стабільні ресурси наприкінці: ${simulatedStrongResources.join(", ")}.`);
  if (longTermSimulation.medical.recovered) strengths.push(`Одужало мешканців: ${longTermSimulation.medical.recovered}.`);
  if (!strengths.length) strengths.push("Громада зберегла принаймні одну працездатну соціальну й технічну структуру попри тривалу кризу.");

  if (longTermSimulation.demography.deaths) risks.push(`За роки симуляції померло мешканців: ${longTermSimulation.demography.deaths}.`);
  if (simulatedLowResources.length) risks.push(`Критично низькі ресурси наприкінці: ${simulatedLowResources.join(", ")}.`);
  if (longTermSimulation.conflicts.some((item) => !item.resolved)) risks.push("Частина персональних конфліктів залишилася невирішеною.");
  if (longTermSimulation.medical.finalPatients) risks.push(`Активних хворих наприкінці: ${longTermSimulation.medical.finalPatients}.`);
  if (longTermSimulation.settlement.moduleAverage < 40) risks.push(`Середній стан систем упав до ${longTermSimulation.settlement.moduleAverage}%.`);
  if (!risks.length) risks.push("Системних загроз, здатних негайно знищити громаду, наприкінці симуляції не зафіксовано.");

  const finalWeakestResource = simulatedResourceEntries.sort((a, b) => a[1] - b[1])[0];
  if (finalWeakestResource) priorities.push(`Першочергово відновити ресурс «${resourceName(finalWeakestResource[0])}» (${finalWeakestResource[1]}%).`);
  if (longTermSimulation.settlement.moduleAverage < 60) priorities.push("Спрямувати технічні зміни на профілактичний ремонт, а не лише на аварійні роботи.");
  if (longTermSimulation.medical.finalPatients) priorities.push("Створити довготривалий запас ліків і підготувати наступника для медичного фахівця.");
  if (longTermSimulation.conflicts.some((item) => !item.resolved)) priorities.push("Закріпити процедуру медіації та чіткий розподіл повноважень.");
  if (longTermSimulation.demography.births || longTermSimulation.demography.children) priorities.push("Забезпечити навчання, житло й окремі норми харчування для нового покоління.");
  if (priorities.length < 3) priorities.push("Розширювати зовнішні контакти й резервні маршрути постачання.");

  const outsideCampResultPreview = outsideCampFinalResult(room);
  const outsideMemberIds = new Set((outsideCampResultPreview?.members || []).map((item) => item.id));
  const simulatedPlayerOutcomes = longTermSimulation.personalFates.map((item) => {
    if (outsideMemberIds.has(item.playerId)) return {
      playerId: item.playerId,
      name: item.name,
      active: Boolean(outsideCampResultPreview?.survived),
      text: `${outsideCampResultPreview.verdict}. ${outsideCampResultPreview.description}`
    };
    return { playerId: item.playerId, name: item.name, active: item.alive, text: `${item.title}. ${item.text}` };
  });
  const endOriginalSurvivors = longTermSimulation.personalFates
    .filter((item) => item.alive && item.status === "resident")
    .map((item) => {
      const source = room.players.find((player) => player.id === item.playerId);
      return { id: item.playerId, name: item.name, role: source?.character?.role?.name || "Мешканець" };
    });

  chronology.push(`Результат партії за контрольованими рішеннями: ${score}/100. Окремий прогноз через ${longTermSimulation.horizonYears} років: ${forecastRange.min}–${forecastRange.max}/100; він не змінює результат партії.`);
  const summaryStats = [
    { label: "Результат партії", value: `${directOutcome.directScore}/100`, note: `Формула режиму: ${directOutcome.mode}` },
    { label: "Прогноз через роки", value: `${forecastRange.min}–${forecastRange.max}`, note: "Епілог, не складова бала" },
    { label: "Населення", value: `${longTermSimulation.demography.endPopulation}`, note: `На старті симуляції: ${longTermSimulation.demography.startPopulation}` },
    { label: "Часовий горизонт", value: `${longTermSimulation.horizonYears} р.`, note: longTermSimulation.settlement.stage },
    longTermSimulation.demography.modeled
      ? { label: "Народження", value: `${longTermSimulation.demography.births}`, note: `Дітей у громаді: ${longTermSimulation.demography.children}` }
      : { label: "Демографія", value: longTermSimulation.demography.enabled ? "Не моделювалася" : "Вимкнена", note: "Прямий вплив на оцінку: 0" },
    { label: "Смерті", value: `${longTermSimulation.demography.deaths}`, note: `Пацієнтів наприкінці: ${longTermSimulation.medical.finalPatients}` },
    { label: "Ресурси", value: `${Math.round(Object.values(longTermSimulation.finalResources).reduce((a,b)=>a+b,0)/6)}%`, note: `Медицина: ${longTermSimulation.medical.medicineEnd}%` },
    { label: "Поселення", value: `${longTermSimulation.settlement.level + 1}/5`, note: `${longTermSimulation.settlement.buildings.length} нових об’єктів` },
    ...(outsideCampResultPreview ? [{ label: "Зовнішній табір", value: `${outsideCampResultPreview.score}/100`, note: outsideCampResultPreview.verdict }] : [])
  ];

  const mysteryOutcome = preliminaryMysteryOutcome;
  if (mysteryOutcome) {
    if (mysteryOutcome.solved) {
      strengths.unshift(`Центральну справу доведено: організатора ${mysteryOutcome.culpritName} правильно названо й зібрано ${mysteryOutcome.evidenceStrength}/${mysteryOutcome.requiredEvidence} необхідних ланок доказів.`);
      description += " Група не лише назвала організатора, а й побудувала достатній ланцюг доказів.";
    } else if (mysteryOutcome.correctAccusation) {
      risks.unshift(`Група правильно запідозрила ${mysteryOutcome.culpritName}, але зібрала лише ${mysteryOutcome.evidenceStrength}/${mysteryOutcome.requiredEvidence} необхідних ланок доказів.`);
      description += " Фінальна підозра була правильною, однак доказової бази не вистачило для надійного доведення справи.";
    } else {
      risks.unshift(`Фінальне звинувачення було хибним, а справжній організатор ${mysteryOutcome.culpritName} уникнув доведення вини.`);
      description += " Центральний злочин не було розкрито, тому недовіра й ризик повторного саботажу залишилися.";
    }
  }

  const fateByPlayerId = new Map((longTermSimulation.personalFates || []).map((item) => [item.playerId, item]));
  const outsideCampResult = outsideCampFinalResult(room);
  const personalResults = room.players.map((player) => {
    const fate = fateByPlayerId.get(player.id);
    const outsideSurvivor = Boolean(!player.active && game.features?.outsidePlay && outsideCampResult?.survived && outsideCampResult.members.some((item) => item.id === player.id));
    const survived = modeConfig(room.settings).elimination ? Boolean(player.active || outsideSurvivor) : Boolean(fate ? fate.alive : player.active);
    return {
      playerId: player.id,
      name: player.name,
      completed: survived,
      objective: publicVictoryRules(room.settings).personal.objective,
      status: outsideSurvivor ? "Зовнішній успіх" : survived ? "Особистий успіх" : "Особиста поразка",
      reason: modeConfig(room.settings).elimination
        ? (player.active ? "Персонаж залишився у фінальній групі сховища." : outsideSurvivor ? `Персонаж вижив у зовнішньому таборі «${outsideCampResult.verdict}».` : `Персонаж вибув у раунді ${player.eliminatedRound || "?"}, а зовнішній табір не забезпечив стійкого виживання.`)
        : (fate?.alive ? fate.text : fate?.text || "Персонаж не дожив до завершення довгострокової симуляції.")
    };
  });
  const groupResult = groupVictoryResult(room, score, mysteryOutcome);

  game.final = {
    verdict,
    description,
    score,
    directScore: directOutcome.directScore,
    simulationImpact: 0,
    forecastRange,
    scoreLayers: {
      directScore: directOutcome.directScore,
      finalScore: directOutcome.directScore,
      forecastCenter: forecastRange.center,
      forecastMin: forecastRange.min,
      forecastMax: forecastRange.max,
      forecastOnly: true,
      mode: directOutcome.mode
    },
    directConsequences: directOutcome.directConsequences,
    simulationAssumptions: longTermSimulation.simulationAssumptions,
    balanceMetrics: directOutcome.metrics,
    competenceAudit: directOutcome.competence,
    survivors: endOriginalSurvivors,
    moduleAverage,
    resourceAverage,
    groupResult,
    personalResults,
    personalGoals,
    roleResults,
    characters,
    analysis,
    playerOutcomes: simulatedPlayerOutcomes,
    chronology,
    longTermSimulation,
    outsideCampResult,
    catastrophe: publicCatastrophe(room, true),
    mysteryResult: mysteryOutcome,
    summaryStats,
    scoreBreakdown,
    strengths,
    risks,
    priorities
  };
  game.phase = "final";
  game.log.push(`Фінал: ${verdict} (${score}/100).`);
  platform.recordGame(room);
}

function enterPhase(room, phase) {
  const game = room.game;
  game.phase = phase;
  if (isTimedPhase(phase)) resetDiscussionTimer(room);
  if (phase === "event") {
    createEvent(room);
  } else if (phase === "elimination") {
    game.eliminationVotes = {};
    game.returnVotes = {};
  }
  startAutomationPhase(room);
  const info = PHASE_DEFINITIONS[phase];
  if (info) game.log.push(`Фаза «${info.label}»: ${info.purpose}`);
}
function nextLoopPhase(room, currentPhase) {
  const loop = phaseLoopFor(room);
  let index = loop.indexOf(currentPhase);
  if (index < 0) index = -1;
  for (let nextIndex = index + 1; nextIndex < loop.length; nextIndex += 1) {
    const candidate = loop[nextIndex];
    if (candidate === "elimination" && !shouldRunJudgement(room)) continue;
    return candidate;
  }
  return null;
}
function resetRoundState(room) {
  const game = room.game;
  game.event = null;
  game.eventVotes = {};
  game.eliminationVotes = {};
  game.returnVotes = {};
  game.forcedEliminationVotes = {};
  game.runoff = null;
  game.rationingRound = null;
  game.quarantineRound = null;
  game.treatmentBoostRound = null;
  game.treatmentBoost = 0;
  game.operationSupport = { round: Number(game.round || 1), contributions: {} };
  for (const player of room.players) {
    player.outsideActionUsedRound = null;
    if (!player.active) continue;
    player.character.revealsUsedRound = 0;
    player.character.protectedRound = null;
    player.character.tradeUsedRound = null;
    player.character.careUsedRound = null;
    player.character.investigationUsedRound = null;
    player.character.operationBonus = 0;
    player.character.operationPenalty = 0;
    player.character.silencedRound = null;
    if (Number(player.character.cannotVoteAgainstUntilRound || 0) < game.round) {
      player.character.cannotVoteAgainstId = null;
      player.character.cannotVoteAgainstUntilRound = null;
    }
  }
  if (game.features?.operations) refreshExpeditionOffers(room, true);
}
function advancePhase(room) {
  const game = room.game;
  if (!game) throw new Error("Партія ще не почалася.");
  const current = game.phase;
  if (current === "event") {
    if (!game.event) { createEvent(room); return; }
    if (!game.event.resolved) throw new Error("Спочатку завершіть кризу.");
  }
  if (current === "elimination") {
    if (!game.features?.elimination) throw new Error("У цьому режимі рішення громади вимкнено.");
    const judgementResult = resolveElimination(room);
    if (judgementResult?.pendingRunoff) return;
  }
  if (isTimedPhase(current)) pauseDiscussionTimer(room);
  if (current === "round_end") {
    if (game.campaignLegacy?.dilemma?.status === "open" && Number(game.round || 1) >= Number(game.campaignLegacy.dilemma.dueRound || 1)) {
      resolveCampaignLegacy(room, { automatic: true, force: true });
    }
    consumeRound(room);
    const selectionComplete = Boolean(room.settings.soloTestMode !== true && modeConfig(room.settings).endWhenCapacityReached && game.features?.elimination && activePlayers(room).length <= room.settings.capacity && (room.settings.setting !== "detective" || game.round >= game.maxRounds));
    if (selectionComplete || game.round >= game.maxRounds) {
      finishGame(room);
      return;
    }
    game.round += 1;
    revealScenarioComplication(room);
    if (room.settings.setting === "detective") revealDetectiveClue(room);
    resetRoundState(room);
    prepareStrategicRevealRound(room);
    const firstPhase = phaseLoopFor(room)[0];
    enterPhase(room, firstPhase);
    game.log.push(`Починається раунд ${game.round}.`);
    return;
  }
  const next = nextLoopPhase(room, current);
  if (!next) throw new Error("Для поточного режиму не визначено наступну фазу.");
  enterPhase(room, next);
}

function revealMany(room, player, keys, { enforceStrategic = false } = {}) {
  if (!room.game || room.game.phase !== "reveal") throw new Error("Характеристики відкриваються лише у відповідній фазі.");
  if (!player.active) throw new Error("Вигнаний гравець не бере участі у розкритті.");
  if (isDetained(room, player)) throw new Error("Ви перебуваєте в ізоляції та пропускаєте розкриття цього раунду.");
  const requested = [...new Set((Array.isArray(keys) ? keys : []).map(String))];
  if (!requested.length) throw new Error("Оберіть хоча б одну характеристику.");
  const used = player.character.revealsUsedRound || 0;
  const remaining = Math.max(0, room.settings.revealsPerRound - used);
  if (!remaining) throw new Error("Ліміт розкриття цього раунду вже вичерпано.");
  if (requested.length > remaining) throw new Error(`Цього раунду можна відкрити ще ${remaining}.`);
  if (enforceStrategic && strategicRevealEnabled(room) && used === 0 && player.character.revealChoiceRound === room.game.round) {
    const choiceKeys = (player.character.revealChoiceKeys || []).filter((key) => !player.character.revealed?.[key]);
    if (choiceKeys.length && !requested.some((key) => choiceKeys.includes(key))) {
      throw new Error(`Перше відкриття раунду має містити одну з двох запропонованих категорій: ${choiceKeys.map((key) => characterKeyLabel(room, key)).join(" або ")}.`);
    }
  }
  for (const key of requested) {
    if (!characterKeysForRoom(room).includes(key)) throw new Error("Невідома характеристика.");
    if (player.character.revealed[key]) throw new Error(`Характеристику «${characterKeyLabel(room, key)}» уже відкрито.`);
  }
  for (const key of requested) {
    player.character.revealed[key] = true;
    processStrategicReveal(room, player, key);
    room.game.log.push(`${player.name} відкриває: ${characterKeyLabel(room, key)} — ${player.character[key]}.`);
  }
  player.character.revealsUsedRound = used + requested.length;
}
function abilityTargetPlayer(room, player, body, { allowSelf = true } = {}) {
  const target = room.players.find((candidate) => candidate.id === body.targetId && candidate.active && (allowSelf || candidate.id !== player.id));
  if (!target) throw new Error(allowSelf ? "Оберіть активного гравця." : "Оберіть іншого активного гравця.");
  return target;
}
function abilityTargetModule(room, body) {
  const module = room.game.shelter.modules.find((candidate) => candidate.id === body.moduleId);
  if (!module) throw new Error("Оберіть модуль.");
  return module;
}
function revealTargetKey(room, source, target, key) {
  if (!characterKeysForRoom(room).includes(key)) throw new Error("Невідома характеристика.");
  if (target.character.revealed[key]) throw new Error(`Характеристику «${characterKeyLabel(room, key)}» уже відкрито.`);
  target.character.revealed[key] = true;
  room.game.log.push(`${source.name} розкриває характеристику «${characterKeyLabel(room, key)}» гравця ${target.name}.`);
}
function addAbilityItem(room, player, preferredName = null, source = "Особлива здібність") {
  const found = preferredName || chooseEntry(settingData(room.settings.setting).items, room.settings.absurdity, null);
  player.character.inventory.push(makeInventoryItem(found, source));
  room.game.log.push(`${player.name} отримує предмет «${found}».`);
  return found;
}
function reduceMedicalState(target, levels = 1) {
  const condition = target.character.medicalCondition;
  const before = condition?.severity || 0;
  if (condition) {
    condition.severity = Math.max(0, before - Math.max(1, levels));
    condition.treatmentsReceived = (condition.treatmentsReceived || 0) + 1;
  }
  target.character.injury = Math.max(0, (target.character.injury || 0) - Math.max(1, levels - 1));
  target.character.stress = Math.max(0, (target.character.stress || 0) - 1);
  return { before, after: condition?.severity || 0 };
}
function boostOperation(target, amount) {
  target.character.operationBonus = clamp(Number(target.character.operationBonus || 0) + amount, 0, 0.6);
}
function penalizeOperation(target, amount) {
  target.character.operationPenalty = clamp(Number(target.character.operationPenalty || 0) + amount, 0, 0.6);
}
function useAbility(room, player, body) {
  const character = player.character;
  if (!room.game || room.game.phase === "final") throw new Error("Здібність зараз недоступна.");
  if (!player.active) throw new Error("Вигнаний гравець не може використовувати внутрішні здібності.");
  if (isDetained(room, player)) throw new Error("В ізоляції здібності недоступні.");
  if (character.abilityUsed) throw new Error("Здібність уже використано.");
  const ability = character.ability;
  const id = ability.id;
  const game = room.game;

  if (String(id).startsWith("case_")) {
    if (room.settings.setting !== "detective" || !game.mystery) throw new Error("Ця слідча здібність доступна лише в детективному сетингу.");
    if (game.phase !== "investigation") throw new Error("Приховані слідчі здібності використовуються під час розслідування.");
    const aspect = DETECTIVE_CASE.ASPECTS.includes(body.aspect) ? body.aspect : "alibi";
    if (id === "case_cross_check") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      runDetectiveInvestigation(room, player, target, aspect, { bonus: 0.22 });
      player.character.privateNotes.push("Перехресну перевірку завершено. Вона не витрачає звичайну перевірку раунду.");
    } else if (id === "case_publish") {
      publishDetectiveFinding(room, player);
    } else if (id === "case_cover") {
      player.character.caseProtection = { aspect, uses: 1 };
      player.character.privateNotes.push(`Аспект «${detectiveAspectLabel(aspect)}» захищено від наступної персональної перевірки.`);
    } else if (id === "case_clear") {
      const target = abilityTargetPlayer(room, player, body);
      game.mystery.publicTheory[target.id] = clamp(Number(game.mystery.publicTheory[target.id] || 0) - 2, -5, 10);
      game.mystery.publicClaims.push({ round: game.round, targetName: target.name, aspectLabel: "публічна версія", tone: "consistent", text: `Анонімне джерело спростувало одну з чуток щодо гравця «${target.name}». Надійність джерела не встановлена.` });
      player.character.privateNotes.push(`Ви анонімно послабили публічну підозру до гравця «${target.name}».`);
    } else if (id === "case_redirect") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      game.mystery.publicTheory[player.id] = clamp(Number(game.mystery.publicTheory[player.id] || 0) - 2, -5, 10);
      game.mystery.publicTheory[target.id] = clamp(Number(game.mystery.publicTheory[target.id] || 0) + 2, -5, 10);
      game.mystery.publicClaims.push({ round: game.round, targetName: target.name, aspectLabel: "анонімна наводка", tone: "contradiction", text: `На дошці з’явилася анонімна наводка проти гравця «${target.name}». Її походження та правдивість невідомі.` });
      player.character.privateNotes.push(`Ви перенаправили частину публічної підозри на гравця «${target.name}». Дія не потрапила до журналу.`);
    } else if (id === "case_plant") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      game.mystery.publicTheory[target.id] = clamp(Number(game.mystery.publicTheory[target.id] || 0) + 2, -5, 10);
      game.mystery.publicClaims.push({ round: game.round, targetName: target.name, aspectLabel: "неперевірена версія", tone: "contradiction", text: `Невідомий передав підозрілу версію щодо гравця «${target.name}». Вона не є підтвердженим доказом.` });
      player.character.privateNotes.push(`Ви створили неперевірену публічну версію проти гравця «${target.name}».`);
    } else if (id === "case_time_audit") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      runDetectiveInvestigation(room, player, target, aspect, { bonus: 0.32 });
      player.character.privateNotes.push("Аудит часової лінії завершено з підвищеною надійністю.");
    } else if (id === "case_anonymous_tip") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      game.mystery.publicTheory[target.id] = clamp(Number(game.mystery.publicTheory[target.id] || 0) + 1, -5, 10);
      game.mystery.publicClaims.push({ round: game.round, targetName: target.name, aspectLabel: "слабка наводка", tone: "ambiguous", text: `На дошці з’явилася слабка анонімна наводка щодо гравця «${target.name}». Вона не має статусу доказу.` });
      player.character.privateNotes.push(`Ви передали слабку анонімну наводку щодо гравця «${target.name}».`);
    } else if (id === "case_countertrace") {
      const target = abilityTargetPlayer(room, player, body);
      game.mystery.publicTheory[target.id] = clamp(Number(game.mystery.publicTheory[target.id] || 0) - 1, -5, 10);
      game.mystery.publicClaims.push({ round: game.round, targetName: target.name, aspectLabel: "контрверсія", tone: "consistent", text: `Анонімне джерело запропонувало альтернативне пояснення обставин навколо гравця «${target.name}».` });
      player.character.privateNotes.push(`Ви додали контрверсію, що послабила публічну підозру до гравця «${target.name}».`);
    } else if (id === "case_second_opinion") {
      if (player.character.investigationUsedRound !== game.round) throw new Error("Спочатку використайте звичайну перевірку цього раунду.");
      player.character.investigationUsedRound = null;
      player.character.privateNotes.push("Ви отримали право провести ще одну звичайну перевірку цього раунду.");
    } else if (id === "case_private_archive") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      player.character.privateNotes.push(`Закритий архів: ${detectiveAspectLabel(aspect)} гравця «${target.name}» — «${target.character[aspect]}». Запис показує текст картки, але не підтверджує його правдивість.`);
    } else if (id === "case_noise") {
      for (const targetId of Object.keys(game.mystery.publicTheory || {})) {
        const value = Number(game.mystery.publicTheory[targetId] || 0);
        game.mystery.publicTheory[targetId] = value > 0 ? value - 1 : value < 0 ? value + 1 : 0;
      }
      game.mystery.publicClaims.push({ round: game.round, targetName: "усі учасники", aspectLabel: "перегляд версій", tone: "ambiguous", text: "Після анонімного перегляду дошки крайні версії стали менш переконливими. Жоден доказ не було видалено." });
      player.character.privateNotes.push("Ви наблизили всі публічні показники підозри до нейтрального значення.");
    } else if (id === "case_sealed_record") {
      player.character.caseProtection = { aspect: "*", uses: 1 };
      player.character.privateNotes.push("Наступна персональна перевірка будь-якого аспекту вашого досьє буде непевною.");
    } else if (id === "case_forensic_focus") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      runDetectiveInvestigation(room, player, target, "evidenceLink", { bonus: 0.28 });
      player.character.privateNotes.push("Посилену перевірку речового доказу завершено.");
    } else if (id === "case_witness_map") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      runDetectiveInvestigation(room, player, target, "testimony", { bonus: 0.24 });
      player.character.privateNotes.push("Карту свідчень звірено з часовою лінією.");
    } else if (id === "case_motive_matrix") {
      const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
      runDetectiveInvestigation(room, player, target, "motive", { bonus: 0.24 });
      player.character.privateNotes.push("Можливий мотив перевірено за матрицею вигод і ризиків.");
    } else if (id === "case_discredit") {
      const latest = [...(game.mystery.evidence || [])].reverse().find((item) => !item.disputed);
      if (!latest) throw new Error("Немає доказу, який можна оскаржити.");
      latest.disputed = true;
      game.mystery.publicClaims.push({ round: game.round, targetName: "доказова дошка", aspectLabel: latest.label, tone: "ambiguous", text: `Надійність доказу «${latest.label}» анонімно оскаржено. Доказ залишається в справі, але його вагу знижено.` });
      player.character.privateNotes.push(`Ви оскаржили доказ «${latest.label}». Дія не потрапила до журналу.`);
    } else {
      throw new Error("Невідома слідча здібність.");
    }
    character.abilityUsed = true;
    return;
  }

  if (id === "supplies") {
    applyEffects(room, { food: 12, water: 12 });
    game.log.push(`${player.name} відкриває аварійний запас: їжа +12, вода +12.`);
  } else if (id === "double_vote") {
    character.voteBoost = true;
    character.stress = clamp((character.stress || 0) + 1, 0, 5);
    game.log.push(`${player.name} активує вирішальний голос, але напруга підвищує його / її стрес.`);
  } else if (id === "truth") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    const hidden = characterKeysForRoom(room).filter((key) => !target.character.revealed[key]);
    if (!hidden.length) throw new Error("У цього гравця вже все відкрито.");
    revealTargetKey(room, player, target, sample(hidden));
  } else if (id === "protect") {
    const target = abilityTargetPlayer(room, player, body);
    target.character.protectedRound = game.round;
    character.stress = clamp((character.stress || 0) + 1, 0, 5);
    game.log.push(`${player.name} захищає гравця ${target.name} від вигнання в цьому раунді й бере частину напруги на себе.`);
  } else if (id === "repair") {
    const module = abilityTargetModule(room, body);
    module.condition = clamp(module.condition + 18, 0, 100);
    game.log.push(`${player.name} виконує аварійний ремонт модуля «${module.name}» (+18%).`);
  } else if (id === "inspire") {
    applyEffects(room, { morale: 12 });
    game.log.push(`${player.name} підвищує мораль групи на 12 пунктів.`);
  } else if (id === "reinforce") {
    applyEffects(room, { integrity: 12 });
    game.log.push(`${player.name} посилює конструкції сховища (+12 цілісності).`);
  } else if (id === "field_aid") {
    provideCare(room, player, body, true, 3);
  } else if (id === "calm") {
    const target = abilityTargetPlayer(room, player, body);
    character.stress = Math.max(0, (character.stress || 0) - 2);
    target.character.stress = Math.max(0, (target.character.stress || 0) - 2);
    game.log.push(`${player.name} допомагає групі опанувати стрес.`);
  } else if (id === "scout") {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.15);
    game.log.push(`${player.name} розвідує маршрут: наступна експедиція отримує +15% до шансу успіху.`);
  } else if (id === "salvage") {
    addAbilityItem(room, player, null, "Особлива знахідка");
  } else if (id === "reveal_extra") {
    const hidden = shuffled(characterKeysForRoom(room).filter((key) => !character.revealed[key])).slice(0, 2);
    if (!hidden.length) throw new Error("Усі ваші характеристики вже відкриті.");
    for (const key of hidden) character.revealed[key] = true;
    game.log.push(`${player.name} добровільно відкриває додаткові характеристики: ${hidden.map((key) => characterKeyLabel(room, key)).join(", ")}.`);

  // Соціальні здібності
  } else if (id === "persuasion") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    game.forcedEliminationVotes[target.id] = (game.forcedEliminationVotes[target.id] || 0) + 1;
    character.stress = clamp((character.stress || 0) + 1, 0, 5);
    applyEffects(room, { morale: -2 });
    game.log.push(`${player.name} створює додатковий голос проти гравця ${target.name}; тиск знижує мораль громади.`);
  } else if (id === "intimidation") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    target.character.silencedRound = game.round;
    target.character.stress = clamp((target.character.stress || 0) + 1, 0, 5);
    character.stress = clamp((character.stress || 0) + 1, 0, 5);
    applyEffects(room, { morale: -4 });
    game.log.push(`${player.name} залякує гравця ${target.name}: він / вона не бере участі в рішеннях цього раунду, а мораль громади падає.`);
  } else if (id === "support") {
    const target = abilityTargetPlayer(room, player, body);
    boostOperation(target, 0.10);
    target.character.stress = Math.max(0, (target.character.stress || 0) - 1);
    game.log.push(`${player.name} підтримує гравця ${target.name}, підвищуючи ефективність його / її дій цього раунду.`);
  } else if (id === "inspire_all") {
    applyEffects(room, { morale: 8 });
    for (const member of activePlayers(room)) member.character.stress = Math.max(0, (member.character.stress || 0) - 1);
    game.log.push(`${player.name} надихає всю групу: мораль +8, стрес мешканців знижено.`);
  } else if (id === "leadership") {
    const target = abilityTargetPlayer(room, player, body);
    boostOperation(target, 0.16);
    game.log.push(`${player.name} призначає гравця ${target.name} відповідальним за складні дії цього раунду.`);
  } else if (id === "secrets") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    if (target.character.revealed.secret) throw new Error("Таємницю цього гравця вже відкрито.");
    revealTargetKey(room, player, target, "secret");
  } else if (id === "loyalty") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    target.character.cannotVoteAgainstId = player.id;
    target.character.cannotVoteAgainstUntilRound = game.round;
    character.stress = clamp((character.stress || 0) + 1, 0, 5);
    game.log.push(`${target.name} дає гравцеві ${player.name} клятву не голосувати проти нього / неї цього раунду; підтримання союзу виснажує користувача.`);
  } else if (id === "betrayal") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    target.character.stress = clamp((target.character.stress || 0) + 2, 0, 5);
    penalizeOperation(target, 0.10);
    applyEffects(room, { morale: -3 });
    game.log.push(`${player.name} підриває довіру до гравця ${target.name}; мораль групи падає.`);
  } else if (id === "trust") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    character.protectedRound = game.round;
    target.character.stress = Math.max(0, (target.character.stress || 0) - 1);
    game.log.push(`${target.name} бере гравця ${player.name} під захист на цей раунд.`);
  } else if (id === "faction") {
    const candidates = activePlayers(room).filter((candidate) => candidate.id !== player.id);
    const ally = sample(candidates);
    if (!ally) throw new Error("У кімнаті немає іншого активного гравця.");
    boostOperation(player, 0.08);
    boostOperation(ally, 0.08);
    applyEffects(room, { morale: 4 });
    character.privateNotes.push(`Ваш таємний союзник на цей раунд — ${ally.name}.`);
    ally.character.privateNotes.push(`Ваш таємний союзник на цей раунд — ${player.name}.`);
    game.log.push("У групі виник непублічний союз, який трохи підняв мораль.");
  } else if (id === "sacrifice") {
    character.stress = clamp((character.stress || 0) + 2, 0, 5);
    applyEffects(room, { morale: 10 });
    game.log.push(`${player.name} бере кризову відповідальність на себе: власний стрес зростає, мораль групи +10.`);

  // Запаси
  } else if (id === "food_cache") {
    applyEffects(room, { food: 18 });
    game.log.push(`${player.name} відкриває таємний склад їжі (+18).`);
  } else if (id === "water_purifier") {
    applyEffects(room, { water: 20 });
    game.log.push(`${player.name} запускає портативний очищувач води (+20).`);
  } else if (id === "med_stash") {
    applyEffects(room, { medicine: 15 });
    game.log.push(`${player.name} відкриває медичну схованку (+15 медикаментів).`);
  } else if (id === "fuel_reserve") {
    applyEffects(room, { energy: 20 });
    game.log.push(`${player.name} підключає паливний резерв (+20 енергії).`);
  } else if (id === "tools") {
    addAbilityItem(room, player, "Універсальний набір інструментів", "Особиста здібність");
  } else if (id === "trade") {
    if (game.shelter.resources.food >= 10) applyEffects(room, { food: -10, medicine: 15 });
    else if (game.shelter.resources.medicine >= 10) applyEffects(room, { medicine: -10, food: 15 });
    else throw new Error("Для обміну потрібно щонайменше 10 їжі або 10 медикаментів.");
    game.log.push(`${player.name} проводить вигідний обмін запасів.`);
  } else if (id === "rationing") {
    game.rationingRound = game.round;
    game.log.push(`${player.name} запроваджує суворе нормування: витрати їжі наприкінці раунду буде зменшено вдвічі.`);
  } else if (id === "recycling") {
    const key = sample(["energy", "integrity", "medicine", "water"]);
    applyEffects(room, { [key]: 8 });
    game.log.push(`${player.name} переробляє непотрібні матеріали: ${resourceName(key)} +8.`);
  } else if (id === "hunting") {
    applyEffects(room, { food: 15 });
    game.log.push(`${player.name} поповнює запаси їжі полюванням (+15).`);
  } else if (id === "fishing") {
    applyEffects(room, { food: 10, water: 5 });
    game.log.push(`${player.name} повертається з уловом: їжа +10, вода +5.`);
  } else if (id === "foraging") {
    applyEffects(room, { food: 8, medicine: 8 });
    game.log.push(`${player.name} знаходить їстівні й лікарські рослини.`);
  } else if (id === "mining") {
    applyEffects(room, { integrity: 10, energy: 5 });
    game.log.push(`${player.name} добуває матеріали для ремонту: цілісність +10, енергія +5.`);

  // Медицина
  } else if (id === "heal") {
    provideCare(room, player, body, true, 4);
  } else if (id === "surgery") {
    const target = abilityTargetPlayer(room, player, body);
    if (game.shelter.resources.medicine < 10) throw new Error("Для операції потрібно 10 медикаментів.");
    applyEffects(room, { medicine: -10 });
    const result = reduceMedicalState(target, 5);
    game.log.push(`${player.name} проводить складну операцію гравцеві ${target.name}: тяжкість ${severityLabel(result.before)} → ${severityLabel(result.after)}.`);
  } else if (id === "herbalist") {
    addAbilityItem(room, player, "Сумка лікувальних трав", "Виготовлено травником");
  } else if (id === "quarantine") {
    game.quarantineRound = game.round;
    game.log.push(`${player.name} запроваджує карантин: заразні стани не погіршуються цього раунду.`);
  } else if (id === "immune") {
    const target = abilityTargetPlayer(room, player, body);
    target.character.immuneUntilRound = game.round + 2;
    game.log.push(`${player.name} надає гравцеві ${target.name} медичний захист на два раунди.`);
  } else if (id === "triage") {
    game.treatmentBoostRound = game.round;
    game.treatmentBoost = 0.25;
    game.log.push(`${player.name} організовує сортування пацієнтів: лікування цього раунду ефективніше.`);
  } else if (id === "sterilize") {
    const module = abilityTargetModule(room, body);
    module.condition = clamp(module.condition + 12, 0, 100);
    game.quarantineRound = game.round;
    applyEffects(room, { medicine: 3 });
    game.log.push(`${player.name} стерилізує модуль «${module.name}»: стан +12%, медицина +3.`);

  // Техніка й оборона
  } else if (id === "engineer") {
    const module = [...game.shelter.modules].sort((a, b) => a.condition - b.condition)[0];
    module.condition = clamp(module.condition + 24, 0, 100);
    game.log.push(`${player.name} відновлює найслабший модуль «${module.name}» (+24%).`);
  } else if (id === "overclock") {
    const module = abilityTargetModule(room, body);
    if (game.shelter.resources.energy < 5) throw new Error("Для розгону потрібно 5 енергії.");
    applyEffects(room, { energy: -5 });
    module.condition = clamp(module.condition + 25, 0, 100);
    game.log.push(`${player.name} розганяє систему «${module.name}»: стан +25%, енергія −5.`);
  } else if (id === "electrician") {
    applyEffects(room, { energy: 20 });
    game.log.push(`${player.name} відновлює електромережу (+20 енергії).`);
  } else if (id === "plumbing") {
    applyEffects(room, { water: 18 });
    game.log.push(`${player.name} ремонтує водний контур (+18 води).`);
  } else if (id === "automation") {
    const module = abilityTargetModule(room, body);
    module.condition = clamp(module.condition + 15, 0, 100);
    applyEffects(room, { energy: 5 });
    game.log.push(`${player.name} автоматизує модуль «${module.name}»: стан +15%, енергія +5.`);
  } else if (id === "fortify") {
    game.eventShield = (game.eventShield || 0) + 1;
    applyEffects(room, { integrity: 8 });
    game.log.push(`${player.name} фортифікує сховище: цілісність +8 і захист від одного провалу події.`);
  } else if (id === "shield") {
    game.eventShield = (game.eventShield || 0) + 1;
    game.log.push(`${player.name} активує щит від одного негативного наслідку події.`);
  } else if (id === "scavenge_tech") {
    addAbilityItem(room, player, "Відновлена технологія минулої епохи", "Технічний розбір");

  // Експедиції
  } else if (id === "pathfinder") {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.10);
    game.expeditionFailureMitigation = Math.max(game.expeditionFailureMitigation || 0, 0.30);
    game.log.push(`${player.name} готує економний маршрут для наступної експедиції.`);
  } else if (id === "navigation") {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.16);
    game.log.push(`${player.name} наносить безпечний маршрут на карту (+16% до наступної експедиції).`);
  } else if (id === "radar") {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.12);
    game.expeditionNoInjury = true;
    game.log.push(`${player.name} проводить радарну розвідку: шанс успіху зростає, ризик травм знижено.`);
  } else if (id === "survival") {
    game.expeditionFailureMitigation = Math.max(game.expeditionFailureMitigation || 0, 0.50);
    game.log.push(`${player.name} готує аварійний план: втрати при провалі наступної експедиції зменшено вдвічі.`);
  } else if (id === "tracking") {
    game.expeditionRewardMultiplier = Math.max(game.expeditionRewardMultiplier || 1, 1.20);
    game.log.push(`${player.name} знаходить додаткові сліди ресурсів: нагорода наступної експедиції +20%.`);
  } else if (id === "stealth") {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.10);
    game.expeditionNoInjury = true;
    game.log.push(`${player.name} готує прихований маршрут для наступної експедиції.`);

  // Універсальні здібності
  } else if (id === "luck") {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.12);
    game.eventLuckBoost = Math.max(game.eventLuckBoost || 0, 0.12);
    game.log.push(`${player.name} покладається на неймовірну вдачу: наступні перевірки отримують бонус.`);
  } else if (id === "savvy") {
    game.eventShield = (game.eventShield || 0) + 1;
    game.log.push(`${player.name} заздалегідь готує план, який скасує один негативний наслідок події.`);
  } else if (id === "adapt") {
    boostOperation(player, 0.10);
    game.log.push(`${player.name} швидко адаптується до умов і підсилює власні дії цього раунду.`);
  } else if (id === "focus") {
    boostOperation(player, 0.18);
    game.log.push(`${player.name} входить у стан глибокої концентрації.`);
  } else if (id === "persistence") {
    character.stress = Math.max(0, (character.stress || 0) - 2);
    boostOperation(player, 0.08);
    game.log.push(`${player.name} долає втому й продовжує працювати ефективніше.`);
  } else if (id === "insight") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    const hidden = characterKeysForRoom(room).filter((key) => !target.character.revealed[key]);
    if (!hidden.length) throw new Error("У цього гравця вже все відкрито.");
    const revealed = shuffled(hidden).slice(0, 3);
    for (const key of revealed) target.character.revealed[key] = true;
    game.log.push(`${player.name} розкриває три характеристики гравця ${target.name}: ${revealed.map((key) => characterKeyLabel(room, key)).join(", ")}.`);
  } else if (id === "mimicry") {
    const currentMode = modeConfig(room.settings);
    const choices = COMMON.abilities.filter((candidate) => abilityAllowedForMode(candidate, currentMode) && candidate.id !== "mimicry" && !String(candidate.id).startsWith("passive_") && candidate.id !== character.ability.id);
    const copied = sample(choices);
    if (!copied) throw new Error("Не вдалося знайти здібність для копіювання.");
    character.ability = { ...copied };
    character.abilityUsed = false;
    character.privateNotes.push(`Ви скопіювали здібність «${copied.name}». Її можна використати окремо.`);
    game.log.push(`${player.name} копіює чужий талант і отримує нову здібність.`);
    return;
  } else if (id === "resilience") {
    character.stress = 0;
    boostOperation(player, 0.10);
    game.log.push(`${player.name} демонструє сталеву волю: стрес скинуто, ефективність підвищено.`);
  } else if (id === "genius") {
    const name = `Експериментальний модуль ${game.shelter.modules.length + 1}`;
    game.shelter.modules.push({ id: uid("module"), name, description: "Саморобна система, створена під час кризи.", condition: 70 });
    game.log.push(`${player.name} створює новий модуль «${name}».`);
  } else if (id === "diplomat") {
    applyEffects(room, { allies: 1, morale: 8 });
    game.log.push(`${player.name} домовляється з зовнішньою групою: союзники +1, мораль +8.`);
  } else if (id === "prophet") {
    const candidates = eventPool(room);
    const future = chooseContentEntry(candidates, room.settings.absurdity);
    game.preparedEvent = future ? JSON.parse(JSON.stringify(future)) : null;
    character.privateNotes.push(future ? `Передбачення: наступна подія — «${future.title}».` : "Передбачення залишилося неясним.");
    game.log.push(`${player.name} отримує передчуття наступної події.`);
  } else if (id === "charm") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    target.character.cannotVoteAgainstId = player.id;
    target.character.cannotVoteAgainstUntilRound = Math.min(game.maxRounds, game.round + 1);
    character.stress = clamp((character.stress || 0) + 1, 0, 5);
    applyEffects(room, { morale: -3 });
    game.log.push(`${target.name} не може голосувати проти гравця ${player.name} до завершення наступного раунду; маніпуляція знижує мораль громади.`);
  } else if (id === "legend") {
    applyEffects(room, { morale: 10 });
    character.stress = clamp((character.stress || 0) + 1, 0, 5);
    game.log.push(`${player.name} стає символом групи: мораль +10, але особистий тиск зростає.`);
  } else if (id === "shadow") {
    game.expeditionNoInjury = true;
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.12);
    game.log.push(`${player.name} готує непомітне проходження наступної експедиції.`);
  } else if (id === "ancient") {
    addAbilityItem(room, player, "Артефакт минулої епохи", "Давнє знання");
  } else if (id === "mutant") {
    character.abilityFlags.permanentOperationBonus = clamp((character.abilityFlags.permanentOperationBonus || 0) + 0.12, 0, 0.3);
    game.log.push(`${player.name} набуває корисної мутації: постійний бонус до складних дій.`);
  } else if (id === "cyborg") {
    character.abilityFlags.permanentOperationBonus = clamp((character.abilityFlags.permanentOperationBonus || 0) + 0.15, 0, 0.3);
    character.injury = Math.max(0, (character.injury || 0) - 1);
    game.log.push(`${player.name} встановлює кібернетичний імплант і стає ефективнішим / ефективнішою.`);
  } else if (id === "clone") {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.30);
    game.expeditionNoInjury = true;
    game.log.push(`${player.name} готує клона: наступна експедиція отримує +30% і захист від травм, але успіх не гарантований.`);

  // Фентезійні здібності
  } else if (id === "fireball") {
    game.eventShield = (game.eventShield || 0) + 1;
    applyEffects(room, { integrity: 5 });
    game.log.push(`${player.name} готує вогняний захист від наступної загрози.`);
  } else if (id === "healing_light") {
    for (const member of activePlayers(room)) reduceMedicalState(member, 1);
    game.log.push(`${player.name} огортає групу цілющим світлом: медичні стани всіх активних гравців полегшено.`);
  } else if (id === "barrier") {
    game.eventShield = (game.eventShield || 0) + 2;
    game.log.push(`${player.name} створює магічний бар’єр від двох негативних наслідків.`);
  } else if (["teleport", "portal", "invisibility"].includes(id)) {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.32);
    game.expeditionNoInjury = true;
    game.log.push(`${player.name} дає наступній експедиції +32% і захист від травм, але не гарантує успіху.`);
  } else if (id === "scrying") {
    const locations = availableExpeditions(room).slice(0, 3).map((item) => `${item.name} (складність ${item.difficulty})`).join("; ");
    character.privateNotes.push(`Ясновидіння показало маршрути: ${locations || "нічого певного"}.`);
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.12);
    game.log.push(`${player.name} проводить магічну розвідку маршрутів.`);
  } else if (id === "enchant") {
    const target = abilityTargetPlayer(room, player, body);
    boostOperation(target, 0.20);
    game.log.push(`${player.name} зачаровує спорядження гравця ${target.name}.`);
  } else if (id === "curse") {
    const target = abilityTargetPlayer(room, player, body, { allowSelf: false });
    penalizeOperation(target, 0.15);
    target.character.stress = clamp((target.character.stress || 0) + 1, 0, 5);
    game.log.push(`${player.name} накладає прокляття на гравця ${target.name}.`);
  } else if (id === "bless") {
    const target = abilityTargetPlayer(room, player, body);
    boostOperation(target, 0.20);
    target.character.stress = Math.max(0, (target.character.stress || 0) - 1);
    game.log.push(`${player.name} благословляє гравця ${target.name}.`);
  } else if (id === "raise_dead") {
    applyEffects(room, { allies: 2 });
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.15);
    game.log.push(`${player.name} піднімає двох скелетів-помічників для громади.`);

  // Космічні здібності
  } else if (["hyperspace", "warp_drive"].includes(id)) {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.32);
    game.expeditionNoInjury = true;
    game.log.push(`${player.name} прокладає надпросторовий маршрут: +32% до наступної експедиції та захист від травм без гарантованого успіху.`);
  } else if (id === "shield_gen") {
    game.eventShield = (game.eventShield || 0) + 2;
    applyEffects(room, { integrity: 8 });
    game.log.push(`${player.name} активує корабельний енергетичний щит.`);
  } else if (id === "scanner") {
    game.expeditionRewardMultiplier = Math.max(game.expeditionRewardMultiplier || 1, 1.25);
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.10);
    game.log.push(`${player.name} сканує систему: нагорода наступної експедиції +25%.`);
  } else if (id === "tractor") {
    game.shelter.assets.push({ name: "Притягнутий вантажний контейнер", description: "Містить корисні запчастини й матеріали." });
    applyEffects(room, { integrity: 6, energy: 4 });
    game.log.push(`${player.name} притягує до дока корисний вантаж.`);
  } else if (id === "nanotech") {
    for (const module of game.shelter.modules) module.condition = clamp(module.condition + 12, 0, 100);
    game.log.push(`${player.name} запускає наноремонт усіх модулів (+12%).`);
  } else if (id === "android") {
    game.expeditionBoost = Math.max(game.expeditionBoost || 0, 0.30);
    game.expeditionNoInjury = true;
    game.log.push(`${player.name} виділяє андроїда: +30% до наступної місії та захист від травм без гарантованого успіху.`);
  } else if (id === "telepathy") {
    applyEffects(room, { allies: 1, morale: 8 });
    game.log.push(`${player.name} встановлює мирний контакт із чужою цивілізацією.`);
  } else if (id === "gravity") {
    game.eventShield = (game.eventShield || 0) + 1;
    applyEffects(room, { integrity: 10 });
    game.log.push(`${player.name} відхиляє небезпечний об’єкт гравітаційним полем.`);
  } else if (id === "energy_siphon") {
    applyEffects(room, { energy: 20 });
    game.log.push(`${player.name} поповнює енергосистему за допомогою поглинача (+20).`);
  } else if (id === "cryo") {
    const target = abilityTargetPlayer(room, player, body);
    target.character.protectedRound = game.round;
    target.character.immuneUntilRound = game.round + 3;
    target.character.stress = 0;
    game.log.push(`${player.name} тимчасово консервує гравця ${target.name}: захист, імунітет і нульовий стрес.`);

  // Пасивні здібності активуються назавжди
  } else if (String(id).startsWith("passive_")) {
    character.passiveAbilityActive = true;
    if (id === "passive_defense") character.permanentDefense = Math.max(character.permanentDefense || 0, 0.20);
    if (id === "passive_speed") character.abilityFlags.permanentOperationBonus = Math.max(character.abilityFlags.permanentOperationBonus || 0, 0.08);
    if (id === "passive_luck") character.abilityFlags.permanentOperationBonus = Math.max(character.abilityFlags.permanentOperationBonus || 0, 0.10);
    game.log.push(`${player.name} активує постійну здібність «${ability.name}».`);
  } else {
    throw new Error(`Для здібності «${ability.name}» не визначено сумісної дії.`);
  }
  character.abilityUsed = true;
}


function gameRuleStatus(message) {
  return /^(Оберіть|Введіть|Вкажіть|Напишіть|Невідома|Перше відкриття|Цього раунду можна|Seed генерації)/u.test(String(message || "")) ? 400 : 409;
}

function gameRuleError(message, status = 409) {
  const error = new Error(message);
  error.name = "GameRuleError";
  error.status = status;
  error.expose = true;
  return error;
}

function handleAction(room, player, action, body) {
  const isolationBlockedActions = new Set(["provide_care", "role_action", "set_operation_support", "launch_expedition", "repair_module", "use_ability", "investigate_case"]);
  if (room.game && isDetained(room, player) && isolationBlockedActions.has(action)) throw gameRuleError("Ізоляція блокує лікування, ремонт, експедиції, рольові дії та активні здібності до завершення санкції.");
  switch (action) {
    case "ready":
      if (room.game) throw gameRuleError("Партія вже почалася.");
      player.ready = Boolean(body.value);
      break;
    case "update_settings": {
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост може змінювати налаштування кімнати.");
      if (room.game) throw gameRuleError("Після початку партії базові налаштування вже не змінюються.");
      const mode = GAME_MODES[body.mode] ? body.mode : (room.settings.mode || "classic");
      const next = {
        mode,
        setting: SETTING_IDS.has(body.setting) ? body.setting : room.settings.setting,
        scenarioMode: SCENARIO_MODES.has(body.scenarioMode) ? body.scenarioMode : (room.settings.scenarioMode || "procedural"),
        soloTestMode: body.soloTestMode === undefined ? room.settings.soloTestMode === true : body.soloTestMode === true,
        capacity: clamp(Number(body.capacity) || room.settings.capacity, (body.soloTestMode === true || (body.soloTestMode === undefined && room.settings.soloTestMode === true)) ? 1 : 2, 10),
        rounds: clamp(Number(body.rounds) || room.settings.rounds, 2, 7),
        absurdity: clamp(Number(body.absurdity) || 0, 0, 4),
        advancedModules: normalizeAdvancedModules(body.advancedModules, mode, SETTING_IDS.has(body.setting) ? body.setting : room.settings.setting),
        hiddenRoles: false,
        revealsPerRound: clamp(Number(body.revealsPerRound) || room.settings.revealsPerRound, 1, 4),
        demographicsEnabled: body.demographicsEnabled !== false,
        ...(() => {
          const set = normalizeCharacterSet(body.characterSetMode, body.customCharacterKeys, SETTING_IDS.has(body.setting) ? body.setting : room.settings.setting, body.demographicsEnabled !== false);
          return { characterSetMode: set.mode, customCharacterKeys: set.mode === "custom" ? set.keys : [] };
        })(),
        voteSystem: VOTE_SYSTEMS.has(body.voteSystem) ? body.voteSystem : (mode === "classic" ? "exile" : "tribunal"),
        voteVisibility: VOTE_VISIBILITIES.has(body.voteVisibility) ? body.voteVisibility : (room.settings.voteVisibility || "secret"),
        tieRule: normalizeTieRule(body.tieRule ?? room.settings.tieRule),
        automationMode: normalizeAutomationMode(body.automationMode ?? room.settings.automationMode),
        inactivityTimeoutSeconds: clamp(Number(body.inactivityTimeoutSeconds) || room.settings.inactivityTimeoutSeconds || 90, MIN_AUTOMATION_TIMEOUT_SECONDS, 600),
        phaseTimeoutSeconds: clamp(Number(body.phaseTimeoutSeconds) || room.settings.phaseTimeoutSeconds || 180, MIN_AUTOMATION_TIMEOUT_SECONDS, 1800),
        hostFailoverEnabled: body.hostFailoverEnabled === undefined ? room.settings.hostFailoverEnabled !== false : body.hostFailoverEnabled !== false,
        hostFailoverSeconds: clamp(Number(body.hostFailoverSeconds) || room.settings.hostFailoverSeconds || 120, MIN_HOST_FAILOVER_SECONDS, 900),
        generationSeed: resolveGenerationSeed(body.generationSeed, room.settings.generationSeed),
        generationSchema: GENERATION_SCHEMA,
        tutorialEnabled: body.tutorialEnabled === undefined ? room.settings.tutorialEnabled === true : body.tutorialEnabled === true,
        contentPackId: (() => {
          const pack = platform.getPack(body.contentPackId);
          return pack && (pack.public || pack.ownerAccountId === player.accountId) && (pack.setting === "all" || pack.setting === (SETTING_IDS.has(body.setting) ? body.setting : room.settings.setting)) ? pack.id : null;
        })(),
        campaignId: (() => {
          const campaign = platform.getCampaign(body.campaignId);
          return campaign && campaign.ownerAccountId === player.accountId && !campaign.archived ? campaign.id : null;
        })()
      };
      applyTutorialPreset(next, room.players.length);
      applyConfigurationSafety(next);
      next.hiddenRoles = modeConfig(next).hiddenRoles;
      room.campaignId = next.tutorialEnabled ? null : next.campaignId;
      room.hostAccountId = player.accountId || room.hostAccountId || null;
      room.settings = next;
      for (const item of room.players) item.ready = item.id === room.hostPlayerId;
      break;
    }
    case "start":
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост може почати партію.");
      if (room.game) throw gameRuleError("Партія вже почалася.");
      const configurationAnalysis = analyzeRoomConfiguration(room.settings, room.players.length);
      const blockingIssues = configurationAnalysis.issues.filter((item) => item.severity === "error");
      if (blockingIssues.length) {
        const validationError = new Error(blockingIssues.map((item) => item.text).join(" "));
        validationError.status = 400;
        throw validationError;
      }
      if (room.players.some((item) => !item.ready && item.id !== room.hostPlayerId)) throw gameRuleError("Не всі гравці готові.");
      createGame(room);
      break;
    case "reveal":
      revealMany(room, player, [body.key], { enforceStrategic: Boolean(body.strategicChoice) });
      break;
    case "reveal_many":
      revealMany(room, player, body.keys, { enforceStrategic: Boolean(body.strategicChoice) });
      break;
    case "request_reveal_category":
      requestRevealCategory(room, player, body);
      break;
    case "discussion_timer_set": {
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост керує таймером.");
      if (!room.game || !isTimedPhase(room.game.phase)) throw gameRuleError("Таймер доступний лише під час фаз спільного обговорення.");
      const seconds = clamp(Math.round(Number(body.minutes) * 60), 15, 3600);
      room.game.discussionTimer = { durationSeconds: seconds, remainingSeconds: seconds, running: false, endsAt: null };
      break;
    }
    case "discussion_timer_start": {
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост керує таймером.");
      if (!room.game || !isTimedPhase(room.game.phase)) throw gameRuleError("Таймер доступний лише під час фаз спільного обговорення.");
      const current = publicDiscussionTimer(room);
      const remaining = current.remainingSeconds > 0 ? current.remainingSeconds : current.durationSeconds;
      room.game.discussionTimer = { durationSeconds: current.durationSeconds, remainingSeconds: remaining, running: true, endsAt: Date.now() + remaining * 1000 };
      break;
    }
    case "discussion_timer_pause":
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост керує таймером.");
      if (!room.game || !isTimedPhase(room.game.phase)) throw gameRuleError("Таймер доступний лише під час фаз спільного обговорення.");
      pauseDiscussionTimer(room);
      break;
    case "discussion_timer_reset":
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост керує таймером.");
      if (!room.game || !isTimedPhase(room.game.phase)) throw gameRuleError("Таймер доступний лише під час фаз спільного обговорення.");
      resetDiscussionTimer(room);
      break;
    case "automation_settings": {
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост змінює автоматичне ведення.");
      room.settings.automationMode = normalizeAutomationMode(body.automationMode ?? room.settings.automationMode);
      room.settings.inactivityTimeoutSeconds = clamp(Number(body.inactivityTimeoutSeconds) || room.settings.inactivityTimeoutSeconds || 90, MIN_AUTOMATION_TIMEOUT_SECONDS, 600);
      room.settings.phaseTimeoutSeconds = clamp(Number(body.phaseTimeoutSeconds) || room.settings.phaseTimeoutSeconds || 180, MIN_AUTOMATION_TIMEOUT_SECONDS, 1800);
      if (room.game) {
        ensureAutomationRuntime(room);
        startAutomationPhase(room);
        room.game.log.push(`Режим ведення змінено: ${publicAutomationState(room).modeLabel}.`);
      }
      break;
    }
    case "resolve_inactive": {
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост може пропускати дії відсутніх гравців.");
      if (!room.game) throw gameRuleError("Партія ще не почалася.");
      const changed = neutralizePendingPlayers(room, { allPending: Boolean(body.allPending), targetId: body.targetId || null, reason: body.allPending ? "рішення хоста" : "відсутність у мережі" });
      if (!changed.length) throw gameRuleError(body.allPending ? "Немає невиконаних обов’язкових дій." : "Немає відсутніх гравців, які блокують поточну фазу.");
      room.game.log.push(`Хост застосував нейтральні дії: ${changed.join(", ")}.`);
      break;
    }
    case "transfer_host": {
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост може передавати права ведучого.");
      const target = room.players.find((item) => item.id === body.targetId);
      if (!target || target.id === player.id) throw gameRuleError("Оберіть іншого гравця.");
      if (playerIsOffline(target)) throw gameRuleError("Передати права можна лише підключеному гравцеві.");
      transferHost(room, target, `Хост ${player.name} передав права`);
      break;
    }
    case "host_failover_settings":
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост змінює резервне ведення.");
      room.settings.hostFailoverEnabled = body.enabled !== false;
      room.settings.hostFailoverSeconds = clamp(Number(body.seconds) || room.settings.hostFailoverSeconds || 120, MIN_HOST_FAILOVER_SECONDS, 900);
      if (room.game) room.game.log.push(`Автоматичну заміну хоста ${room.settings.hostFailoverEnabled ? "увімкнено" : "вимкнено"}; очікування ${room.settings.hostFailoverSeconds} с.`);
      break;
    case "regenerate_recovery_code":
      player.recoveryCode = uniqueRecoveryCode(room);
      player.sessionGeneration = Number(player.sessionGeneration || 1) + 1;
      break;
    case "resolve_recovery_request": {
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост підтверджує повернення гравця.");
      const request = cleanupRecoveryRequests(room).find((item) => item.id === body.requestId && item.status === "pending");
      if (!request) throw gameRuleError("Активний запит відновлення не знайдено.");
      const target = room.players.find((item) => item.id === request.playerId);
      if (!target) throw gameRuleError("Гравця для відновлення не знайдено.");
      if (body.approve === false) {
        request.status = "rejected";
        request.resolvedAt = Date.now();
      } else {
        target.token = token();
        target.sessionGeneration = Number(target.sessionGeneration || 1) + 1;
        request.status = "approved";
        request.resolvedAt = Date.now();
        request.grantedToken = target.token;
        request.expiresAt = Date.now() + 10 * 60 * 1000;
        if (room.game) room.game.log.push(`Хост підтвердив перенесення сеансу гравця ${target.name}.`);
      }
      break;
    }
    case "campaign_legacy_vote": {
      const legacy = room.game?.campaignLegacy;
      if (!legacy?.enabled || legacy.dilemma?.status !== "open") throw gameRuleError("Активної кампанійної дилеми немає.");
      if (!campaignLegacyEligibleVoters(room).some((candidate) => candidate.id === player.id)) throw gameRuleError("Зараз ви не маєте права голосу за кампанійну спадщину.");
      const optionId = String(body.optionId || "");
      if (!legacy.dilemma.options.some((option) => option.id === optionId)) throw gameRuleError("Невідомий варіант кампанійного рішення.");
      legacy.dilemma.votes ||= {};
      legacy.dilemma.votes[player.id] = optionId;
      break;
    }
    case "resolve_campaign_legacy":
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост завершує кампанійне рішення.");
      resolveCampaignLegacy(room, { force: Boolean(body.force) });
      break;
    case "next_phase":
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост керує фазами.");
      advancePhase(room);
      break;
    case "event_vote": {
      if (!room.game || room.game.phase !== "event" || !room.game.event || room.game.event.resolved) throw gameRuleError("Рішення щодо події зараз недоступне.");
      if (!eventDecisionEligible(room, player)) throw gameRuleError(eventDecisionPolicy(room) === "host" ? "Після обговорення рішення кризи підтверджує лише хост." : "Зараз ви не можете брати участь у цьому рішенні.");
      const choiceId = String(body.choiceId || "");
      if (!room.game.event.choices.some((choice) => choice.id === choiceId)) throw gameRuleError("Невідомий варіант рішення.");
      room.game.eventVotes[player.id] = choiceId;
      break;
    }
    case "resolve_event":
      if (player.id !== room.hostPlayerId) throw gameRuleError("Лише хост завершує голосування.");
      resolveEvent(room);
      break;
    case "elimination_vote": {
      if (!room.game?.features?.elimination) throw gameRuleError("У цьому режимі вигнання вимкнено.");
      if (!room.game || room.game.phase !== "elimination") throw gameRuleError("Голосування за вигнання зараз недоступне.");
      if (!canParticipateInDecision(room, player, "elimination")) throw gameRuleError("Зараз ви не можете брати участь у цьому рішенні.");
      const targetId = String(body.targetId || "");
      if (targetId !== SKIP_VOTE) {
        const allowSoloSelfVote = room.settings.soloTestMode === true && activePlayers(room).length === 1;
        const target = room.players.find((candidate) => candidate.id === targetId && candidate.active && (allowSoloSelfVote || candidate.id !== player.id));
        if (!target) throw gameRuleError(allowSoloSelfVote ? "Оберіть активного гравця або пропустіть вигнання." : "Оберіть іншого активного гравця або пропустіть вигнання.");
        if (player.character.cannotVoteAgainstId === targetId && Number(player.character.cannotVoteAgainstUntilRound || 0) >= room.game.round) {
          throw gameRuleError("Ваша активна клятва або зачарування не дозволяє голосувати проти цього гравця.");
        }
      }
      const sanction = room.settings.voteSystem === "tribunal" && ["exile", "detention", "silence"].includes(body.sanction) ? body.sanction : "exile";
      if (sanction !== "exile" && targetId !== SKIP_VOTE) {
        const previous = [...(room.game.sanctionHistory || [])].reverse().find((item) => item.targetId === targetId);
        if (previous && previous.round === room.game.round - 1 && previous.sanction !== "exile") throw gameRuleError("До тієї самої людини не можна застосовувати м’яку санкцію два раунди поспіль.");
        const hardDecisionRound = Math.ceil(Number(room.game.maxRounds || room.settings.rounds || 4) * 0.75);
        if (room.game.round >= hardDecisionRound && activePlayers(room).length > room.settings.capacity) throw gameRuleError("На пізньому етапі переповненої партії доступне лише вигнання або відмова від санкції.");
      }
      const runoff = room.game.runoff && room.game.runoff.round === room.game.round && room.game.runoff.status === "voting" ? room.game.runoff : null;
      if (runoff) {
        const key = judgementOptionKey(targetId, sanction);
        if (!runoff.options.some((item) => item.key === key)) throw gameRuleError("У повторному голосуванні доступні лише варіанти, що набрали однакову найбільшу кількість голосів.");
      }
      room.game.eliminationVotes[player.id] = { targetId, sanction };
      break;
    }
    case "return_vote": {
      if (!room.game || room.game.phase !== "elimination") throw gameRuleError("Голосування за повернення зараз недоступне.");
      if (!canParticipateInDecision(room, player, "appeal")) throw gameRuleError("Ви не можете голосувати цього раунду.");
      const targetId = String(body.targetId || SKIP_VOTE);
      if (targetId !== SKIP_VOTE && !pendingAppeals(room).some((item) => item.id === targetId)) throw gameRuleError("Ця апеляція вже неактивна.");
      room.game.returnVotes[player.id] = targetId;
      break;
    }
    case "submit_appeal":
      submitAppeal(room, player, body); break;
    case "outside_action":
      useOutsideAction(room, player, body); break;
    case "outside_deal_vote":
      voteOutsideProposal(room, player, body); break;
    case "give_item":
      if (!room.game?.features?.itemTrade) throw gameRuleError("У цьому режимі обмін предметами вимкнено.");
      giveItem(room, player, body); break;
    case "provide_care":
      if (!room.game?.features?.treatment) throw gameRuleError("У цьому режимі лікування вимкнено.");
      provideCare(room, player, body, false); break;
    case "role_action":
      if (!room.game?.features?.hiddenRoles) throw gameRuleError("У цьому режимі приховані ролі вимкнено.");
      useRoleAction(room, player, body); break;
    case "set_operation_support":
      setOperationSupport(room, player, body); break;
    case "launch_expedition":
      if (!room.game?.features?.operations) throw gameRuleError("У цьому режимі експедиції вимкнено.");
      launchExpedition(room, player, body); break;
    case "repair_module":
      if (!room.game?.features?.operations) throw gameRuleError("У цьому режимі плановий ремонт вимкнено.");
      repairModule(room, player, body); break;
    case "use_ability": useAbility(room, player, body); break;
    case "investigate_case": investigateDetectiveCase(room, player, body); break;
    case "case_accusation": castDetectiveAccusation(room, player, body); break;
    case "leave":
      if (room.game) throw gameRuleError("Після початку партії покинути кімнату через меню не можна.");
      room.players = room.players.filter((item) => item.id !== player.id);
      if (room.hostPlayerId === player.id && room.players.length) {
        const nextHost = room.players[0];
        room.hostPlayerId = nextHost.id;
        room.hostAccountId = nextHost.accountId || null;
        const campaign = platform.getCampaign(room.campaignId);
        if (!campaign || campaign.ownerAccountId !== room.hostAccountId) {
          room.campaignId = null;
          room.settings.campaignId = null;
        }
        const pack = platform.getPack(room.settings.contentPackId);
        if (pack && !pack.public && pack.ownerAccountId !== room.hostAccountId) room.settings.contentPackId = null;
      }
      break;
    default:
      throw gameRuleError("Невідома дія.");
  }
  touch(room);
}

function jsonResponse(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, securityHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...extraHeaders
  }));
  res.end(body);
}
function requestBodyLimit(req) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (/^\/api\/accounts\/(login|register|reset-password)$/u.test(pathname)) return 8 * 1024;
  if (/^\/api\/rooms\/[A-Z0-9]{6}\/action$/u.test(pathname) || /^\/api\/rooms\/(create|join|rejoin|recovery-request)$/u.test(pathname)) return 64 * 1024;
  if (/^\/api\/packs\/(import|analyze)$/u.test(pathname)) return 5 * 1024 * 1024;
  if (/^\/api\/packs/u.test(pathname)) return 2 * 1024 * 1024;
  return 256 * 1024;
}
function readJson(req, explicitLimit = null) {
  return new Promise((resolve, reject) => {
    const limit = Number(explicitLimit || requestBodyLimit(req));
    let size = 0;
    const chunks = [];
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > limit) {
        const error = new Error(`Запит завеликий. Максимум — ${Math.ceil(limit / 1024)} КБ.`);
        error.status = 413;
        req.pause();
        fail(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        const data = Buffer.concat(chunks).toString("utf8");
        resolve(data ? JSON.parse(data) : {});
      } catch {
        const error = new Error("Некоректний JSON.");
        error.status = 400;
        reject(error);
      }
    });
    req.on("error", fail);
  });
}
function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  })[ext] || "application/octet-stream";
}
function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safe = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" })); res.end("Forbidden"); return;
  }
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
      res.end("Файл не знайдено.");
      return;
    }
    const etag = `W/\"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}\"`;
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, securityHeaders({ ETag: etag, "Cache-Control": "no-cache" }));
      res.end();
      return;
    }
    res.writeHead(200, securityHeaders({ "Content-Type": mimeType(filePath), "Content-Length": stat.size, ETag: etag, "Cache-Control": "no-cache", "Vary": "Accept-Encoding" }));
    fs.createReadStream(filePath).pipe(res);
  });
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
}
function consumeTokenBucket(key, capacity, refillPerSecond, now = Date.now()) {
  const bucket = requestBuckets.get(key) || { tokens: capacity, updatedAt: now, lastSeen: now };
  const elapsed = Math.max(0, now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
  bucket.updatedAt = now;
  bucket.lastSeen = now;
  const allowed = bucket.tokens >= 1;
  if (allowed) bucket.tokens -= 1;
  requestBuckets.set(key, bucket);
  return { allowed, remaining: Math.max(0, Math.floor(bucket.tokens)), retryAfter: allowed ? 0 : Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerSecond)) };
}
function rateLimit(req, url, pathname = "") {
  const now = Date.now();
  const ip = clientIp(req);
  const isState = req.method === "GET" && /^\/api\/rooms\/[A-Z0-9]{6}\/state$/.test(pathname);
  const isAction = req.method === "POST" && /^\/api\/rooms\/[A-Z0-9]{6}\/action$/.test(pathname);
  const isSensitive = /^\/api\/(accounts\/(login|register)|rooms\/(rejoin|recovery-request|recovery-status))$/.test(pathname);
  const playerId = String(url.searchParams.get("playerId") || req.headers["x-player-id"] || "anonymous").slice(0, 96);
  let policy;
  if (isState) policy = { kind: "state", session: [180, 3], shared: [2400, 40] };
  else if (isAction) policy = { kind: "action", session: [90, 1.5], shared: [900, 15] };
  else if (isSensitive) policy = { kind: "auth", session: [30, 0.5], shared: [30, 0.5] };
  else if (req.method === "GET") policy = { kind: "read", session: [240, 4], shared: [1200, 20] };
  else policy = { kind: "write", session: [120, 2], shared: [600, 10] };
  const shared = consumeTokenBucket(`${ip}:${policy.kind}:shared`, policy.shared[0], policy.shared[1], now);
  // Старі клієнти не надсилали X-Player-Id для POST-дій. Для них діє великий спільний бюджет IP,
  // а нові клієнти додатково отримують окремий персональний кошик.
  const session = isAction && playerId === "anonymous"
    ? { allowed: true, remaining: shared.remaining, retryAfter: 0 }
    : consumeTokenBucket(`${ip}:${policy.kind}:${playerId}`, policy.session[0], policy.session[1], now);
  if (requestBuckets.size > 5000) {
    for (const [bucketKey, value] of requestBuckets) if (now - value.lastSeen > 300_000) requestBuckets.delete(bucketKey);
  }
  const allowed = shared.allowed && session.allowed;
  if (!allowed) networkMetrics.limited += 1;
  return {
    allowed,
    retryAfter: Math.max(shared.retryAfter, session.retryAfter),
    limit: policy.session[0],
    remaining: Math.min(shared.remaining, session.remaining),
    kind: policy.kind
  };
}
function rateHeaders(result) {
  return {
    "X-RateLimit-Policy": result.kind,
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {})
  };
}
function waitForRoomRevision(room, revision, waitMs, player, req, res) {
  if (room.revision !== revision || waitMs <= 0) return Promise.resolve("changed");
  networkMetrics.longPolls += 1;
  return new Promise((resolve) => {
    const waiters = roomStateWaiters.get(room.code) || new Set();
    roomStateWaiters.set(room.code, waiters);
    let done = false;
    let timeout = null;
    let heartbeat = null;
    const waiter = {
      revision,
      finish(reason) {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        clearInterval(heartbeat);
        waiters.delete(waiter);
        if (!waiters.size) roomStateWaiters.delete(room.code);
        if (reason === "changed") networkMetrics.longPollWakeups += 1;
        if (reason === "timeout") networkMetrics.longPollTimeouts += 1;
        resolve(reason);
      }
    };
    waiters.add(waiter);
    const keepAlive = () => {
      player.lastSeen = Date.now();
      player.connected = true;
    };
    heartbeat = setInterval(keepAlive, 3000);
    heartbeat.unref?.();
    timeout = setTimeout(() => waiter.finish("timeout"), waitMs);
    timeout.unref?.();
    req.once("aborted", () => waiter.finish("aborted"));
    res.once("close", () => { if (!res.writableEnded) waiter.finish("aborted"); });
    if (room.revision !== revision) waiter.finish("changed");
  });
}
function accountCredentials(req, url = null, body = null) {
  const authHeader = String(req?.headers?.authorization || "");
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const accountId = String(req?.headers?.["x-account-id"] || body?.accountId || "");
  const tokenValue = String(bearer || body?.accountToken || body?.token || "");
  return { accountId, token: tokenValue };
}
function accountFromRequest(req, url = null, body = null) {
  const credentials = accountCredentials(req, url, body);
  return platform.authenticate(credentials.accountId, credentials.token);
}
function requireAccount(account) { if (!account) throw new Error("Потрібен вхід до локального облікового запису."); return account; }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    // Render та інші хмарні проксі мають коректно відкривати головну адресу
    // без необхідності вручну додавати /index.html.
    if (pathname === "/" && (req.method === "GET" || req.method === "HEAD")) {
      res.writeHead(302, {
        Location: "/index.html",
        "Cache-Control": "no-store"
      });
      return res.end();
    }

    networkMetrics.requests += 1;
    const limitResult = pathname.startsWith("/api/") ? rateLimit(req, url, pathname) : null;
    if (limitResult && !limitResult.allowed) return jsonResponse(res, 429, { ok: false, error: `Забагато запитів. Повторіть через ${limitResult.retryAfter} с.`, retryAfterSeconds: limitResult.retryAfter }, rateHeaders(limitResult));
    if (pathname === "/api/health" && req.method === "GET") return jsonResponse(res, 200, { ok: true, rooms: rooms.size, version: VERSION, schemas: { rooms: ROOM_SCHEMA, generation: GENERATION_SCHEMA, content: CONTENT_SCHEMA, platform: PLATFORM_SCHEMA }, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), persistent: true, persistence: { enabled: true, strategy: "atomic-per-room-json", dataDirectory: path.basename(DATA_DIR), roomTtlDays: Math.round(ROOM_TTL_MS / 86400000) }, network: { activeLongPolls: [...roomStateWaiters.values()].reduce((sum, set) => sum + set.size, 0), rateBuckets: requestBuckets.size, ...networkMetrics } }, limitResult ? rateHeaders(limitResult) : {});

    if (pathname === "/api/accounts/register" && req.method === "POST") {
      const result = platform.register(await readJson(req));
      return jsonResponse(res, 201, { ok: true, ...result });
    }
    if (pathname === "/api/accounts/login" && req.method === "POST") {
      const result = platform.login(await readJson(req));
      return jsonResponse(res, 200, { ok: true, ...result });
    }
    if (pathname === "/api/accounts/reset-password" && req.method === "POST") {
      const result = platform.resetPassword(await readJson(req));
      return jsonResponse(res, 200, { ok: true, ...result });
    }
    if (pathname === "/api/accounts/sessions" && req.method === "GET") {
      const credentials = accountCredentials(req, url);
      const account = requireAccount(platform.authenticate(credentials.accountId, credentials.token));
      return jsonResponse(res, 200, { ok: true, sessions: platform.listSessions(account, credentials.token) });
    }
    if (pathname === "/api/accounts/sessions/revoke" && req.method === "POST") {
      const body = await readJson(req);
      const credentials = accountCredentials(req, url, body);
      const account = requireAccount(platform.authenticate(credentials.accountId, credentials.token));
      return jsonResponse(res, 200, { ok: true, ...platform.revokeSession(account, body.sessionId, credentials.token) });
    }
    if (pathname === "/api/platform/bootstrap" && req.method === "GET") {
      const account = accountFromRequest(req, url);
      return jsonResponse(res, 200, {
        ok: true,
        account: platform.publicAccount(account),
        campaigns: account ? platform.listCampaigns(account) : [],
        packs: platform.listPacks(account).map((pack) => {
          const owner = account?.id === pack.ownerAccountId;
          return owner
            ? { ...pack, owner: true, ownerAccountId: undefined }
            : { id: pack.id, name: pack.name, description: pack.description, setting: pack.setting, public: true, updatedAt: pack.updatedAt, schemaVersion: pack.schemaVersion, owner: false };
        }),
        statistics: platform.publicGlobalStats()
      });
    }
    if (pathname === "/api/campaigns/create" && req.method === "POST") {
      const body = await readJson(req); const account = requireAccount(accountFromRequest(req, url, body));
      return jsonResponse(res, 201, { ok: true, campaign: platform.createCampaign(account, body) });
    }
    if (pathname === "/api/content-packs/create" && req.method === "POST") {
      const body = await readJson(req); const account = requireAccount(accountFromRequest(req, url, body));
      return jsonResponse(res, 201, { ok: true, pack: platform.createPack(account, body.pack || body) });
    }
    if (pathname === "/api/content-packs/import" && req.method === "POST") {
      const body = await readJson(req); const account = requireAccount(accountFromRequest(req, url, body));
      return jsonResponse(res, 201, { ok: true, pack: platform.importPack(account, body.pack) });
    }
    if (pathname === "/api/content-packs/analyze" && req.method === "POST") {
      const body = await readJson(req); requireAccount(accountFromRequest(req, url, body));
      const sampleSize = clamp(Number(body.sampleSize) || 25, 10, 100);
      return jsonResponse(res, 200, { ok: true, report: platform.analyzePack(body.pack || {}, { sampleSize }) });
    }
    const packMatch = pathname.match(/^\/api\/content-packs\/([A-Za-z0-9_]+)$/);
    if (packMatch && req.method === "PUT") {
      const body = await readJson(req); const account = requireAccount(accountFromRequest(req, url, body));
      return jsonResponse(res, 200, { ok: true, pack: platform.updatePack(account, packMatch[1], body.pack || body) });
    }
    if (packMatch && req.method === "DELETE") {
      const body = await readJson(req); const account = requireAccount(accountFromRequest(req, url, body));
      platform.deletePack(account, packMatch[1]); return jsonResponse(res, 200, { ok: true });
    }
    if (packMatch && req.method === "GET") {
      const account = accountFromRequest(req, url); const pack = platform.getPack(packMatch[1]);
      if (!pack || (!pack.public && pack.ownerAccountId !== account?.id)) return jsonResponse(res, 404, { ok: false, error: "Набір не знайдено." });
      return jsonResponse(res, 200, { ok: true, pack });
    }

    if (pathname === "/api/rooms/create" && req.method === "POST") {
      const body = await readJson(req);
      const account = accountFromRequest(req, url, body);
      const name = String(body.name || account?.displayName || "").trim().slice(0, 32);
      if (!name) return jsonResponse(res, 400, { ok: false, error: "Введіть ім’я." });
      const code = roomCode();
      const player = { id: uid("player"), token: token(), recoveryCode: uniqueRecoveryCode(), sessionGeneration: 1, joinedAt: Date.now(), name, accountId: account?.id || null, ready: true, connected: true, lastSeen: Date.now(), active: true, character: null, automation: { controlled: false } };
      const mode = GAME_MODES[body.mode] ? body.mode : "classic";
      const campaign = platform.campaignForRoom(account, body.campaignId);
      const pack = platform.packForRoom(account, body.contentPackId);
      const settings = {
        mode,
        setting: SETTING_IDS.has(body.setting) ? body.setting : "modern",
        scenarioMode: SCENARIO_MODES.has(body.scenarioMode) ? body.scenarioMode : "procedural",
        soloTestMode: body.soloTestMode === true,
        capacity: clamp(Number(body.capacity) || (body.soloTestMode === true ? 1 : 3), body.soloTestMode === true ? 1 : 2, 10),
        rounds: clamp(Number(body.rounds) || 4, 2, 7),
        absurdity: clamp(Number(body.absurdity) || 2, 0, 4),
        advancedModules: normalizeAdvancedModules(body.advancedModules, mode, SETTING_IDS.has(body.setting) ? body.setting : "modern"),
        hiddenRoles: false,
        revealsPerRound: clamp(Number(body.revealsPerRound) || 2, 1, 4),
        demographicsEnabled: body.demographicsEnabled !== false,
        ...(() => {
          const setting = SETTING_IDS.has(body.setting) ? body.setting : "modern";
          const set = normalizeCharacterSet(body.characterSetMode, body.customCharacterKeys, setting, body.demographicsEnabled !== false);
          return { characterSetMode: set.mode, customCharacterKeys: set.mode === "custom" ? set.keys : [] };
        })(),
        voteSystem: VOTE_SYSTEMS.has(body.voteSystem) ? body.voteSystem : (mode === "classic" ? "exile" : "tribunal"),
        voteVisibility: VOTE_VISIBILITIES.has(body.voteVisibility) ? body.voteVisibility : "secret",
        tieRule: normalizeTieRule(body.tieRule),
        automationMode: normalizeAutomationMode(body.automationMode),
        inactivityTimeoutSeconds: clamp(Number(body.inactivityTimeoutSeconds) || 90, MIN_AUTOMATION_TIMEOUT_SECONDS, 600),
        phaseTimeoutSeconds: clamp(Number(body.phaseTimeoutSeconds) || 180, MIN_AUTOMATION_TIMEOUT_SECONDS, 1800),
        hostFailoverEnabled: body.hostFailoverEnabled !== false,
        hostFailoverSeconds: clamp(Number(body.hostFailoverSeconds) || 120, MIN_HOST_FAILOVER_SECONDS, 900),
        generationSeed: resolveGenerationSeed(body.generationSeed),
        generationSchema: GENERATION_SCHEMA,
        tutorialEnabled: body.tutorialEnabled === true,
        contentPackId: pack?.id || null,
        campaignId: campaign?.id || null
      };
      applyTutorialPreset(settings, 1);
      applyConfigurationSafety(settings);
      settings.hiddenRoles = modeConfig(settings).hiddenRoles;
      const room = { code, createdAt: Date.now(), updatedAt: Date.now(), revision: 1, hostPlayerId: player.id, hostAccountId: account?.id || null, hostLastChangedAt: Date.now(), hostHistory: [], recoveryRequests: [], campaignId: settings.tutorialEnabled ? null : (campaign?.id || null), settings, players: [player], game: null };
      rooms.set(code, room);
      saveRoomsSoon();
      return jsonResponse(res, 201, { ok: true, code, playerId: player.id, token: player.token, recoveryCode: player.recoveryCode });
    }

    if (pathname === "/api/rooms/join" && req.method === "POST") {
      const body = await readJson(req);
      const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length !== 6) return jsonResponse(res, 400, { ok: false, error: "Код кімнати має містити рівно 6 символів." });
      const account = accountFromRequest(req, url, body);
      const name = String(body.name || account?.displayName || "").trim().slice(0, 32);
      const room = rooms.get(code);
      if (!room) return jsonResponse(res, 404, { ok: false, error: "Кімнату не знайдено." });
      if (room.game) return jsonResponse(res, 409, { ok: false, error: "Партія вже почалася." });
      if (!name) return jsonResponse(res, 400, { ok: false, error: "Введіть ім’я." });
      if (room.players.length >= 12) return jsonResponse(res, 409, { ok: false, error: "У кімнаті вже 12 гравців." });
      if (room.players.some((item) => item.name.toLowerCase() === name.toLowerCase())) return jsonResponse(res, 409, { ok: false, error: "Таке ім’я вже використовується." });
      const player = { id: uid("player"), token: token(), recoveryCode: uniqueRecoveryCode(room), sessionGeneration: 1, joinedAt: Date.now(), name, accountId: account?.id || null, ready: false, connected: true, lastSeen: Date.now(), active: true, character: null, automation: { controlled: false } };
      room.players.push(player);
      touch(room);
      return jsonResponse(res, 201, { ok: true, code, playerId: player.id, token: player.token, recoveryCode: player.recoveryCode });
    }

    if (pathname === "/api/rooms/rejoin" && req.method === "POST") {
      const body = await readJson(req);
      const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length !== 6) return jsonResponse(res, 400, { ok: false, error: "Код кімнати має містити рівно 6 символів." });
      const supplied = normalizeRecoveryCode(body.recoveryCode);
      if (supplied.length !== 10) return jsonResponse(res, 400, { ok: false, error: "Персональний код має містити рівно 10 символів." });
      const room = rooms.get(code);
      if (!room) return jsonResponse(res, 404, { ok: false, error: "Кімнату не знайдено." });
      ensureRoomSessionState(room);
      const player = room.players.find((item) => normalizeRecoveryCode(item.recoveryCode) === supplied);
      if (!player) return jsonResponse(res, 401, { ok: false, error: "Персональний код відновлення недійсний." });
      player.token = token();
      player.sessionGeneration = Number(player.sessionGeneration || 1) + 1;
      player.connected = true;
      player.lastSeen = Date.now();
      clearAutomationControlOnReturn(player);
      touch(room);
      return jsonResponse(res, 200, { ok: true, code, playerId: player.id, token: player.token, recoveryCode: player.recoveryCode, name: player.name });
    }

    if (pathname === "/api/rooms/recovery-request" && req.method === "POST") {
      const body = await readJson(req);
      const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length !== 6) return jsonResponse(res, 400, { ok: false, error: "Код кімнати має містити рівно 6 символів." });
      const room = rooms.get(code);
      if (!room) return jsonResponse(res, 404, { ok: false, error: "Кімнату не знайдено." });
      ensureRoomSessionState(room);
      const name = String(body.name || "").trim().slice(0, 32);
      const player = room.players.find((item) => item.name.toLocaleLowerCase("uk") === name.toLocaleLowerCase("uk"));
      if (!player) return jsonResponse(res, 404, { ok: false, error: "Гравця з таким ім’ям у кімнаті не знайдено." });
      for (const existing of cleanupRecoveryRequests(room).filter((request) => request.playerId === player.id && request.status === "pending")) existing.status = "superseded";
      const request = { id: uid("recovery"), requestToken: token(), playerId: player.id, playerName: player.name, createdAt: Date.now(), expiresAt: Date.now() + 10 * 60 * 1000, status: "pending", grantedToken: null };
      room.recoveryRequests.push(request);
      touch(room);
      return jsonResponse(res, 201, { ok: true, code, requestId: request.id, requestToken: request.requestToken, status: request.status, playerName: player.name });
    }

    if (pathname === "/api/rooms/recovery-status" && req.method === "GET") {
      const code = String(url.searchParams.get("code") || "").trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return jsonResponse(res, 404, { ok: false, error: "Кімнату не знайдено." });
      const request = cleanupRecoveryRequests(room).find((item) => item.id === url.searchParams.get("requestId") && item.requestToken === url.searchParams.get("requestToken"));
      if (!request) return jsonResponse(res, 404, { ok: false, error: "Запит відновлення не знайдено або він прострочений." });
      if (request.status === "approved") {
        const player = room.players.find((item) => item.id === request.playerId);
        if (!player || !request.grantedToken) return jsonResponse(res, 409, { ok: false, error: "Сеанс уже недоступний." });
        player.connected = true;
        player.lastSeen = Date.now();
        clearAutomationControlOnReturn(player);
        return jsonResponse(res, 200, { ok: true, status: "approved", code, playerId: player.id, token: request.grantedToken, recoveryCode: player.recoveryCode, name: player.name });
      }
      return jsonResponse(res, 200, { ok: true, status: request.status, code, playerName: request.playerName, expiresAt: request.expiresAt });
    }

    const stateMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/state$/);
    if (stateMatch && req.method === "GET") {
      networkMetrics.stateRequests += 1;
      const room = rooms.get(stateMatch[1]);
      if (!room) return jsonResponse(res, 404, { ok: false, error: "Кімнату не знайдено." });
      const player = auth(
        room,
        req.headers["x-player-id"] || url.searchParams.get("playerId"),
        req.headers["x-player-token"] || url.searchParams.get("token")
      );
      if (!player) return jsonResponse(res, 401, { ok: false, error: "Сеанс гравця недійсний." });
      player.lastSeen = Date.now();
      player.connected = true;
      const sinceRevision = Number(url.searchParams.get("sinceRevision"));
      const waitMs = clamp(Number(url.searchParams.get("waitMs")) || 0, 0, 25_000);
      if (Number.isFinite(sinceRevision) && sinceRevision === room.revision && waitMs > 0) {
        const reason = await waitForRoomRevision(room, sinceRevision, waitMs, player, req, res);
        if (reason === "aborted" || res.writableEnded || res.destroyed) return;
      }
      player.lastSeen = Date.now();
      player.connected = true;
      return jsonResponse(res, 200, { ...buildState(room, player), network: { transport: "long-poll", recommendedWaitMs: 20_000, serverTime: Date.now() } }, limitResult ? rateHeaders(limitResult) : {});
    }

    const actionMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/action$/);
    if (actionMatch && req.method === "POST") {
      const room = rooms.get(actionMatch[1]);
      if (!room) return jsonResponse(res, 404, { ok: false, error: "Кімнату не знайдено." });
      const body = await readJson(req);
      const player = auth(room, body.playerId, body.token);
      if (!player) return jsonResponse(res, 401, { ok: false, error: "Сеанс гравця недійсний." });
      player.lastSeen = Date.now();
      try {
        handleAction(room, player, String(body.action || ""), body);
      } catch (error) {
        if (!error.status && error?.constructor === Error) {
          error.status = gameRuleStatus(error.message);
          error.expose = true;
          error.name = "GameRuleError";
        }
        throw error;
      }
      clearAutomationControlOnReturn(player);
      return jsonResponse(res, 200, { ...buildState(room, player), network: { transport: "action-response", recommendedWaitMs: 20_000, serverTime: Date.now() } }, limitResult ? rateHeaders(limitResult) : {});
    }

    if (pathname.startsWith("/api/")) return jsonResponse(res, 404, { ok: false, error: "API-маршрут не знайдено." });
    return serveStatic(req, res, pathname);
  } catch (error) {
    const message = error.message || "Внутрішня помилка сервера.";
    let status = Number(error.status || 500);
    if (status === 500 && /Потрібен вхід|Сеанс гравця недійсний|Неправильний логін або пароль|код відновлення недійсний/i.test(message)) status = 401;
    else if (status === 500 && /не знайдено/i.test(message)) status = 404;
    else if (status === 500 && /уже існує|вже використовується|немає доступу|вже почалася/i.test(message)) status = 409;
    else if (status === 500 && /Введіть|Вкажіть|має містити|Некоректн|додайте|потрібна назва|щонайменше/i.test(message)) status = 400;
    if (status >= 500) console.error(error);
    else if (!error.expose && process.env.NODE_ENV !== "test") console.warn(`[${status}] ${message}`);
    return jsonResponse(res, status, { ok: false, error: message });
  }
});

const automationInterval = setInterval(() => {
  for (const room of rooms.values()) {
    try {
      let changed = processHostFailover(room);
      if (processRoomAutomation(room)) changed = true;
      if (changed) touch(room);
    } catch (error) {
      console.warn(`Автоматичне ведення кімнати ${room.code} призупинено:`, error.message);
      const runtime = ensureAutomationRuntime(room);
      if (runtime) {
        runtime.nextAutoAdvanceAt = null;
        runtime.lastPhaseMessage = `Помилка автоматизації: ${error.message}`;
      }
    }
  }
}, AUTOMATION_TICK_MS);
automationInterval.unref();

let shutdownStarted = false;
async function gracefulShutdown(signal, exitCode = 0) {
  if (shutdownStarted) return;
  shutdownStarted = true;
  clearInterval(automationInterval);
  const forceExit = setTimeout(() => process.exit(exitCode), 4_000);
  forceExit.unref();
  try {
    await saveRoomsNow();
    await backupRooms(`shutdown-${String(signal).toLowerCase()}`);
    platform.saveAllNow();
    platform.backup(`shutdown-${String(signal).toLowerCase()}`);
  } catch (error) { console.error("Помилка фінального збереження:", error.message); }
  server.close(() => process.exit(exitCode));
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
}
process.on("SIGINT", () => { void gracefulShutdown("SIGINT"); });
process.on("SIGTERM", () => { void gracefulShutdown("SIGTERM"); });
process.on("uncaughtException", (error) => {
  console.error("Критична помилка:", error);
  void gracefulShutdown("crash", 1);
});

loadRooms();
void backupRooms("startup");
server.listen(PORT, HOST, () => {
  console.log(`\nСХОВИЩЕ ${VERSION} — сервер запущено\n`);
  console.log(`На цьому комп’ютері: http://localhost:${PORT}`);
  for (const values of Object.values(os.networkInterfaces())) {
    for (const info of values || []) {
      if (info.family === "IPv4" && !info.internal) console.log(`Адреса мережевого адаптера: http://${info.address}:${PORT}`);
    }
  }
  console.log("\nНе закривайте це вікно, доки триває партія.\n");
});

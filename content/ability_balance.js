"use strict";

const DESCRIPTION_OVERRIDES = Object.freeze({
  double_vote: "Наступний голос цього гравця рахується за два, але активація підвищує його стрес.",
  protect: "Захищає обраного активного гравця від вигнання в поточному раунді, але виснажує користувача.",
  persuasion: "Додає один відкритий системний голос проти обраного гравця в найближчому рішенні громади; активація має соціальну ціну.",
  intimidation: "Позбавляє обраного гравця участі в колективних рішеннях цього раунду, підвищує напругу й знижує мораль групи.",
  support: "Дає обраному гравцеві +10% до складних дій цього раунду та трохи знижує його стрес.",
  leadership: "Дає обраному гравцеві +16% до складних дій цього раунду.",
  betrayal: "Підвищує стрес обраного гравця, дає йому −10% до складних дій цього раунду та знижує мораль громади.",
  trust: "Забезпечує користувачеві захист від вигнання цього раунду й трохи заспокоює обраного союзника.",
  faction: "Створює таємний союз на поточний раунд: обидва учасники отримують невеликий бонус до дій, а мораль групи зростає.",
  sacrifice: "Підвищує власний стрес на 2, але додає 10 моралі громаді.",
  food_cache: "Додає 18 їжі до запасів сховища.",
  recycling: "Додає 8 одиниць випадкового практичного ресурсу без гарантованого вибору типу.",
  mining: "Додає 10 цілісності та 5 енергії.",
  field_aid: "Проводить безкоштовну посилену спробу лікування обраного активного гравця.",
  heal: "Проводить безкоштовне лікування високої потужності для хвороби, травми або стресу обраного гравця.",
  surgery: "За 10 медикаментів максимально полегшує медичний стан обраного активного гравця.",
  herbalist: "Створює особистий лікувальний набір із кількома використаннями.",
  triage: "Підвищує шанс усіх лікувальних дій цього раунду на 25%.",
  sterilize: "Відновлює обраний модуль на 12%, додає 3 медикаменти й захищає групу від погіршення заразних станів цього раунду.",
  engineer: "Відновлює 24% стану найслабшого модуля сховища.",
  overclock: "Витрачає 5 енергії та відновлює 25% стану обраного модуля.",
  plumbing: "Додає 18 води до запасів сховища.",
  automation: "Відновлює обраний модуль на 15% і повертає 5 енергії.",
  fortify: "Додає 8 цілісності та скасовує один негативний наслідок майбутньої кризи.",
  navigation: "Підвищує шанс успіху наступної експедиції на 16%.",
  radar: "Підвищує шанс наступної експедиції на 12% і захищає її учасників від травм.",
  salvage: "Додає до особистого інвентарю випадковий корисний предмет із поточного сетингу.",
  luck: "Дає +12% до наступної експедиції та наступної кризи; це не гарантує успіху.",
  adapt: "Дає користувачеві +10% до складних дій поточного раунду.",
  focus: "Дає користувачеві +18% до складних дій поточного раунду.",
  persistence: "Знижує власний стрес на 2 та дає +8% до складних дій поточного раунду.",
  insight: "Відкриває три випадкові приховані характеристики обраного гравця.",
  mimicry: "Замінює поточну здібність випадковою сумісною одноразовою здібністю, яку потрібно активувати окремо.",
  resilience: "Скидає власний стрес і дає +10% до складних дій поточного раунду.",
  diplomat: "Додає одного союзника та 8 моралі.",
  charm: "Забороняє обраному гравцеві голосувати проти користувача до завершення наступного раунду, але знижує мораль і підвищує стрес користувача.",
  legend: "Додає 10 моралі, але підвищує власний стрес на 1.",
  shadow: "Дає +12% до наступної експедиції та захищає її учасників від травм.",
  clone: "Дає +30% до наступної експедиції та захищає її учасників від травм, але не гарантує успіху.",
  fireball: "Додає 5 цілісності та скасовує один негативний наслідок майбутньої кризи.",
  barrier: "Скасовує два негативні наслідки майбутніх криз.",
  teleport: "Дає +32% до наступної експедиції та захищає її учасників від травм, але не гарантує успіху.",
  portal: "Дає +32% до наступної експедиції та захищає її учасників від травм, але не гарантує успіху.",
  invisibility: "Дає +32% до наступної експедиції та захищає її учасників від травм, але не гарантує успіху.",
  scrying: "Показує користувачеві кілька доступних маршрутів і дає +12% до наступної експедиції.",
  enchant: "Дає обраному гравцеві +20% до складних дій поточного раунду.",
  curse: "Дає обраному гравцеві −15% до складних дій поточного раунду й підвищує його стрес.",
  raise_dead: "Додає двох союзників і +15% до наступної експедиції.",
  hyperspace: "Дає +32% до наступної експедиції та захищає її учасників від травм, але не гарантує успіху.",
  warp_drive: "Дає +32% до наступної експедиції та захищає її учасників від травм, але не гарантує успіху.",
  shield_gen: "Додає 8 цілісності та скасовує два негативні наслідки майбутніх криз.",
  scanner: "Дає +10% до шансу й +25% до нагороди наступної експедиції.",
  tractor: "Додає корисний вантаж до надбань, 6 цілісності та 4 енергії.",
  nanotech: "Відновлює 12% стану кожного модуля сховища.",
  android: "Дає +30% до наступної експедиції та захищає її учасників від травм, але не гарантує успіху.",
  gravity: "Додає 10 цілісності та скасовує один негативний наслідок майбутньої кризи.",
  cryo: "Захищає обраного гравця від вигнання цього раунду, дає імунітет на три раунди та скидає його стрес; участь у грі не блокується."
});

const VOTING = new Set(["double_vote", "protect", "persuasion", "intimidation", "loyalty", "trust", "charm"]);
const INFORMATION = new Set(["truth", "secrets", "reveal_extra", "insight", "prophet", "scrying", "radar", "scanner"]);
const RECURRING = new Set(["passive_heal", "passive_food", "passive_water", "passive_energy", "passive_med", "passive_morale", "passive_defense", "passive_speed", "passive_luck"]);
const EXPEDITION = new Set(["scout", "pathfinder", "navigation", "radar", "survival", "tracking", "stealth", "luck", "shadow", "clone", "teleport", "portal", "invisibility", "scrying", "raise_dead", "hyperspace", "warp_drive", "scanner", "android"]);
const COSTED = new Set(["double_vote", "protect", "persuasion", "intimidation", "loyalty", "charm", "sacrifice", "trade", "surgery", "overclock", "curse", "legend"]);
const HIGH_IMPACT = new Set(["insight", "barrier", "shield_gen", "healing_light", "nanotech", "clone", "teleport", "portal", "invisibility", "hyperspace", "warp_drive", "android", "charm", "persuasion", "intimidation"]);

function modeDependency(id) {
  if (VOTING.has(id)) return "режим із рішенням громади";
  if (EXPEDITION.has(id)) return "режим з експедиціями або кризами";
  if (/^(heal|field_aid|surgery|herbalist|quarantine|immune|triage|sterilize|passive_heal|passive_med)$/.test(id)) return "режим із медициною";
  if (/^(repair|engineer|overclock|electrician|plumbing|automation|reinforce|fortify|shield|nanotech)$/.test(id)) return "стан сховища";
  return "універсальна";
}

function buildAbilityBalanceProfiles(abilities) {
  return Object.fromEntries((abilities || []).map((ability) => {
    const id = ability.id;
    const votingImpact = VOTING.has(id) ? 3 : 0;
    const informationValue = INFORMATION.has(id) ? (id === "insight" ? 3 : 2) : 0;
    const survivalImpact = EXPEDITION.has(id) || /heal|surgery|shield|barrier|fortify|repair|nanotech|supplies|food|water|med|energy|rationing/.test(id) ? 2 : 1;
    const costRisk = COSTED.has(id) ? 2 : HIGH_IMPACT.has(id) ? 1 : 0;
    const tier = HIGH_IMPACT.has(id) ? "високий" : votingImpact || informationValue >= 2 || survivalImpact >= 2 ? "середній" : "низький";
    return [id, {
      id,
      activationFrequency: RECURRING.has(id) ? "щораунду після одноразової активації" : "один раз за партію",
      resourceImpact: /food|water|med|energy|supplies|rationing|recycling|hunting|fishing|foraging|mining|trade/.test(id) ? 2 : 0,
      survivalImpact,
      votingImpact,
      informationValue,
      costRisk,
      modeDependency: modeDependency(id),
      powerTier: tier,
      guaranteedSuccess: false
    }];
  }));
}

function applyAbilityDescriptionOverrides(abilities) {
  for (const ability of abilities || []) if (DESCRIPTION_OVERRIDES[ability.id]) ability.description = DESCRIPTION_OVERRIDES[ability.id];
  return abilities;
}

module.exports = { DESCRIPTION_OVERRIDES, buildAbilityBalanceProfiles, applyAbilityDescriptionOverrides };

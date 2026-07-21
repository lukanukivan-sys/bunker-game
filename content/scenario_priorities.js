"use strict";

const RESOURCE_META = {
  food: {
    title: "Стабільне харчування",
    detail: "Потрібні відновлювані запаси, контроль норм і люди, здатні вирощувати або безпечно готувати їжу.",
    skills: "агрономія, кулінарія, біологія"
  },
  water: {
    title: "Безпечна вода",
    detail: "Потрібні очищення, контроль резервуарів і незалежне джерело води.",
    skills: "інженерія, хімія, санітарія"
  },
  energy: {
    title: "Надійне енергопостачання",
    detail: "Потрібні резервна генерація, економія та фахівці з електрики й автоматики.",
    skills: "електрика, енергетика, автоматика"
  },
  integrity: {
    title: "Герметичність і ремонт",
    detail: "Потрібні профілактичний ремонт, запасні частини й контроль пошкоджених систем.",
    skills: "механіка, будівництво, технічна діагностика"
  },
  medicine: {
    title: "Медична готовність",
    detail: "Потрібні ліки, ізоляція хворих і люди, здатні проводити діагностику та невідкладну допомогу.",
    skills: "медицина, фармакологія, догляд"
  },
  morale: {
    title: "Довіра й дисципліна",
    detail: "Потрібні зрозумілі правила, посередництво в конфліктах і психологічна стійкість групи.",
    skills: "психологія, медіація, управління"
  }
};

const THREAT_RULES = [
  {
    id: "infection",
    regex: /(пандем|епідем|вірус|грибк|заражен|інфекц|чума|патоген|зомбі|хвороб)/iu,
    title: "Зараження й карантин",
    detail: "Контакт із поверхнею, новими людьми та спільною вентиляцією може запустити спалах усередині сховища.",
    resources: { medicine: 7, integrity: 3, morale: 2 },
    longTerm: { title: "Хронічні спалахи", detail: "Навіть після першої хвилі носії, мутації або дефіцит ліків можуть перетворити зараження на постійну загрозу." }
  },
  {
    id: "radiation",
    regex: /(радіац|ядерн|опромінен|радіоактив)/iu,
    title: "Радіаційне забруднення",
    detail: "Пил, вода й спорядження можуть накопичувати дозу, тому виходи потребують контролю та герметизації.",
    resources: { integrity: 6, medicine: 5, water: 3 },
    longTerm: { title: "Непридатність поверхні", detail: "Забруднення може зберігатися роками, обмежуючи землеробство, воду та безпечне розселення." }
  },
  {
    id: "toxic",
    regex: /(токсич|хіміч|отруєн|отруйн|газ|забруднен)/iu,
    title: "Токсичне середовище",
    detail: "Повітря, вода або ґрунт можуть бути небезпечними без видимих ознак і потребують постійного контролю.",
    resources: { integrity: 5, medicine: 5, water: 4 },
    longTerm: { title: "Накопичення токсинів", detail: "Фільтри, вода й організм мешканців можуть поступово накопичувати забруднення навіть без гострої аварії." }
  },
  {
    id: "cold",
    regex: /(холод|мороз|крижан|вічн.*зим|зима)/iu,
    title: "Холод і втрата тепла",
    detail: "Відмова опалення або нестача палива швидко зробить сховище непридатним для життя.",
    resources: { energy: 7, food: 3, integrity: 2 },
    longTerm: { title: "Енергетичне виснаження", detail: "Тривалий холод поступово вичерпає паливо, пошкодить обладнання та унеможливить стабільне вирощування їжі." }
  },
  {
    id: "darkness",
    regex: /(темряв|згасан.*сон|чорн.*сон|без світла|втрата світла|надприродн.*темр)/iu,
    title: "Втрата світла",
    detail: "Темрява ускладнює виробництво їжі, орієнтування й захист, а освітлення стає постійним споживачем енергії.",
    resources: { energy: 6, morale: 4, food: 3 },
    longTerm: { title: "Згасання виробництва їжі", detail: "Без штучного освітлення або нового джерела світла рослини, навігація та психічна стійкість громади поступово занепадатимуть." }
  },
  {
    id: "heat",
    regex: /(спек|посух|пожеж|перегрів|кліматич|сонячн.*спалах)/iu,
    title: "Спека й виснаження води",
    detail: "Перегрів, випаровування й пожежі підвищують споживання води та навантаження на охолодження.",
    resources: { water: 7, energy: 4, medicine: 2 },
    longTerm: { title: "Неможливість відновити врожаї", detail: "Якщо спека або посуха збережеться, аварійні запаси закінчаться раніше, ніж громада створить стале виробництво їжі." }
  },
  {
    id: "water_scarcity",
    regex: /(нестач.*вод|дефіцит.*вод|брак.*вод|джерел.*вод|висохл|водосховищ|питн.*вод)/iu,
    title: "Дефіцит безпечної води",
    detail: "Відкриті джерела можуть бути виснажені, заражені або недоступні, тому кожна втрата резерву критична.",
    resources: { water: 9, integrity: 2, morale: 1 },
    longTerm: { title: "Виснаження водного циклу", detail: "Без очищення й відновлюваного джерела громада залишиться залежною від резервуарів, які неможливо поповнити." }
  },
  {
    id: "flood",
    regex: /(повін|затоплен|океан|цунамі|вода піднял|під водою)/iu,
    title: "Затоплення й тиск води",
    detail: "Протікання, корозія та втрата сухих маршрутів загрожують сховищу й зовнішнім операціям.",
    resources: { integrity: 7, energy: 4, water: 1 },
    longTerm: { title: "Втрата придатної території", detail: "Тривале затоплення скорочує простір для розселення, землеробства та пошуку сухих ресурсів." }
  },
  {
    id: "famine",
    regex: /(голод|нестач.*їж|врожай|продоволь|синтетичн.*їж|нафтовий голод)/iu,
    title: "Дефіцит їжі",
    detail: "Зовнішнє постачання зникло, а стартові запаси лише відкладають потребу у власному виробництві.",
    resources: { food: 8, water: 3, morale: 2 },
    longTerm: { title: "Залежність від аварійних запасів", detail: "Без насіння, виробництва й нормування громада вичерпає провіант до стабілізації поверхні." }
  },
  {
    id: "machines",
    regex: /(машин|ші|штучн.*інтелект|автономн|робот|дрон|кібератак|мереж|цифров|нанороб|технолог)/iu,
    title: "Ворожі або ненадійні системи",
    detail: "Сигнали, автоматика й підключене обладнання можуть видати позицію групи або саботувати життєзабезпечення.",
    resources: { energy: 5, integrity: 5, morale: 2 },
    longTerm: { title: "Втрата технологічного контролю", detail: "Залежність від складної автоматики стане критичною, якщо запасні частини, знання або безпечні протоколи не відновити." }
  },
  {
    id: "surveillance",
    regex: /(тотальн.*стеж|стеженн|масов.*нагляд|цифров.*ідентич|соціальн.*рейтинг|контрол.*свідом|контрол.*мереж)/iu,
    title: "Тотальний контроль і нагляд",
    detail: "Спостереження, цифрові профілі або примусовий контроль можуть викрити сховище й позбавити людей можливості діяти незалежно.",
    resources: { morale: 6, energy: 3, integrity: 3 },
    longTerm: { title: "Втрата автономії громади", detail: "Навіть фізично безпечне поселення може залишитися залежним від системи, яка контролює інформацію, доступ і поведінку мешканців." }
  },
  {
    id: "war",
    regex: /(війна|вторгнен|озброєн|бандит|хаос|заколот|терор|конфлікт|полюють на людей)/iu,
    title: "Зовнішнє насильство",
    detail: "Інші групи, патрулі або озброєні сили можуть контролювати маршрути, склади й джерела води.",
    resources: { integrity: 5, morale: 4, food: 2 },
    longTerm: { title: "Мілітаризація громади", detail: "Постійна загроза нападу може виснажити ресурси й перетворити внутрішню безпеку на джерело авторитаризму та конфліктів." }
  },
  {
    id: "monsters",
    regex: /(монстр|чудовиськ|дракон|нежит|мертв|хижак|істот|демон|ліч|вампір|переверт)/iu,
    title: "Хижі або надприродні істоти",
    detail: "Відкриті маршрути й шум можуть привернути істот, проти яких звичайні засоби захисту не завжди працюють.",
    resources: { integrity: 6, morale: 4, energy: 2 },
    longTerm: { title: "Поверхня залишається мисливською зоною", detail: "Без безпечних маршрутів, засобів відлякування або нового балансу сил громада не зможе розширюватися." }
  },
  {
    id: "anomaly",
    regex: /(аномал|маг|розрив|вимір|реальност|проклят|ритуал|завіс|феномен|викрив)/iu,
    title: "Нестабільні закони середовища",
    detail: "Звичні правила можуть змінюватися залежно від місця, часу, емоцій або невідомих сил.",
    resources: { morale: 5, integrity: 4, energy: 2 },
    longTerm: { title: "Накопичення аномальних змін", detail: "Якщо нестабільність не локалізувати, вона поступово змінить людей, обладнання та саме сховище." }
  },
  {
    id: "psychological",
    regex: /(безсон|божевіл|страх|жах|психіч|сни|парано|галюцин|пам'ят|пам’ят)/iu,
    title: "Психічне виснаження",
    detail: "Страх, безсоння або ненадійне сприйняття можуть зруйнувати дисципліну раніше, ніж закінчаться ресурси.",
    resources: { morale: 8, medicine: 3, energy: 1 },
    longTerm: { title: "Розпад спільної реальності", detail: "Тривала психологічна напруга підриває довіру, пам’ять і здатність групи ухвалювати узгоджені рішення." }
  },
  {
    id: "space",
    regex: /(вакуум|кисень|орбіт|косміч|корабл|станці|розгермет|атмосфер)/iu,
    title: "Відмова життєзабезпечення",
    detail: "Повітря, тиск, тепло й орбіта залежать від систем, для яких немає природного резерву.",
    resources: { integrity: 7, energy: 6, water: 2 },
    longTerm: { title: "Незворотна деградація систем", detail: "У замкненому середовищі навіть невелика втрата ефективності накопичується, доки ремонт не стане неможливим." }
  },
  {
    id: "crime",
    regex: /(убивств|злочин|саботаж|диверс|крадіж|отруєн|шантаж|самозван|підміна|фальшив|викраден)/iu,
    title: "Прихована загроза всередині групи",
    detail: "Злочинець або саботажник має доступ до людей, журналів і ключових систем, тому помилка в довірі небезпечніша за зовнішній ризик.",
    resources: { morale: 8, integrity: 4, medicine: 1 },
    longTerm: { title: "Розпад довіри після помилкового рішення", detail: "Непідтверджене звинувачення або безкарний саботаж можуть надовго розколоти групу й зробити наступну кризу некерованою." }
  }
];

const SETTING_FALLBACKS = {
  modern: ["infection", "war", "famine"],
  fantasy: ["anomaly", "monsters", "cold"],
  space: ["space", "machines", "psychological"],
  postapocalypse: ["war", "toxic", "famine"],
  cyberpunk: ["machines", "crime", "psychological"],
  horror: ["psychological", "monsters", "anomaly"],
  detective: ["crime", "psychological", "machines"]
};

function clean(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}
function firstSentence(value, max = 190) {
  const text = clean(value);
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/u)[0] || text;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).trimEnd()}…`;
}
function uniqueBy(items, keyFn) {
  const result = [];
  const seen = new Set();
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}
function ruleById(id) {
  return THREAT_RULES.find((rule) => rule.id === id) || null;
}
function publicScenarioText(room) {
  const catastrophe = room?.game?.catastrophe || {};
  const lore = catastrophe.lore || {};
  return [catastrophe.title, catastrophe.description, catastrophe.threat, ...(Array.isArray(catastrophe.threats) ? catastrophe.threats : []), lore.cause, lore.collapse, lore.surface, lore.horizon, room?.game?.settingRule?.name, room?.game?.settingRule?.description]
    .map(clean).filter(Boolean).join(" ");
}
function rankedThreatRules(room) {
  const catastrophe = room?.game?.catastrophe || {};
  const primary = clean(catastrophe.threat);
  const declaredThreats = Array.isArray(catastrophe.threats) ? catastrophe.threats.map(clean).filter(Boolean).join(" ") : "";
  const titleAndDescription = `${clean(catastrophe.title)} ${clean(catastrophe.description)}`;
  const allText = publicScenarioText(room);
  const scored = THREAT_RULES.map((rule) => {
    let score = 0;
    if (rule.regex.test(primary)) score += 12;
    rule.regex.lastIndex = 0;
    if (rule.regex.test(titleAndDescription)) score += 7;
    rule.regex.lastIndex = 0;
    if (declaredThreats && rule.regex.test(declaredThreats)) score += 8;
    rule.regex.lastIndex = 0;
    if (rule.regex.test(allText)) score += 3;
    rule.regex.lastIndex = 0;
    return { rule, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.rule.id.localeCompare(b.rule.id));
  const fallbackIds = SETTING_FALLBACKS[room?.settings?.setting] || SETTING_FALLBACKS.modern;
  for (const id of fallbackIds) {
    if (!scored.some((item) => item.rule.id === id)) scored.push({ rule: ruleById(id), score: 0 });
  }
  return scored.filter((item) => item.rule);
}
function buildThreats(room, ranked) {
  const surface = firstSentence(room?.game?.catastrophe?.lore?.surface, 210);
  const primaryThreat = clean(room?.game?.catastrophe?.threat);
  const cards = ranked.slice(0, 3).map(({ rule }, index) => ({
    id: rule.id,
    title: rule.title,
    detail: index === 0 && surface ? surface : rule.detail,
    source: index === 0 && primaryThreat ? `Головна загроза: ${primaryThreat}` : "Похідний ризик сценарію"
  }));
  return uniqueBy(cards, (item) => item.id).slice(0, 3);
}
function buildDetectiveNeeds(room) {
  const archive = (room?.game?.shelter?.modules || []).some((module) => /(архів|доказ|контрол|шлюз|камер|журнал)/iu.test(clean(module.name)));
  return [
    {
      id: "evidence",
      title: "Зберегти ланцюг доказів",
      detail: `${archive ? "У сховищі є профільний модуль, але" : "Без окремого захищеного архіву"} кожну знахідку потрібно фіксувати, датувати й відділяти від чуток.`,
      status: "Критично для повного звинувачення"
    },
    {
      id: "access",
      title: "Контролювати доступ і переміщення",
      detail: "Потрібно зіставляти журнали, можливість доступу та часову лінію, не розкриваючи приватні перевірки завчасно.",
      status: "Запобігає повторному саботажу"
    },
    {
      id: "trust",
      title: "Перевіряти свідчення без розколу",
      detail: "Групі потрібні незалежні підтвердження, нейтральне ведення обговорення й захист від передчасного колективного звинувачення.",
      status: `Мораль громади: ${Number(room?.game?.shelter?.resources?.morale || 0)}%`
    }
  ];
}
function buildNeeds(room, ranked) {
  if (room?.settings?.setting === "detective") return buildDetectiveNeeds(room);
  const resources = room?.game?.shelter?.resources || {};
  const scores = Object.fromEntries(Object.keys(RESOURCE_META).map((key) => [key, Math.max(0, (70 - Number(resources[key] ?? 60)) / 5)]));
  for (const { rule, score } of ranked.slice(0, 5)) {
    const multiplier = score > 0 ? 1 : 0.45;
    for (const [key, value] of Object.entries(rule.resources || {})) scores[key] = Number(scores[key] || 0) + value * multiplier;
  }
  const weakestModule = [...(room?.game?.shelter?.modules || [])].sort((a, b) => Number(a.condition || 0) - Number(b.condition || 0))[0];
  if (weakestModule && Number(weakestModule.condition || 0) < 65) {
    scores.integrity += (65 - Number(weakestModule.condition || 0)) / 4;
    if (/(генератор|реактор|енерг|живлен|акумулятор)/iu.test(clean(weakestModule.name))) scores.energy += 4;
    if (/(мед|лазар|клінік)/iu.test(clean(weakestModule.name))) scores.medicine += 4;
    if (/(вода|резерв|очищ)/iu.test(clean(weakestModule.name))) scores.water += 4;
  }
  const features = room?.game?.features || {};
  if (features.operations) { scores.energy += 1.5; scores.integrity += 1.5; }
  if (features.treatment) scores.medicine += 1.5;
  const selected = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
  return selected.map(([key]) => {
    const meta = RESOURCE_META[key];
    const value = Number(resources[key] ?? 0);
    const status = value < 35 ? "Критичний стартовий рівень" : value < 55 ? "Обмежений стартовий запас" : "Потрібно зберігати протягом партії";
    return {
      id: key,
      title: meta.title,
      detail: `${meta.detail} Ключові компетенції: ${meta.skills}.`,
      status: `${status}: ${value}%`
    };
  });
}
function buildConditions(room) {
  const catastrophe = room?.game?.catastrophe || {};
  const modules = catastrophe.modules || {};
  const scenario = room?.game?.scenario || {};
  const rule = room?.game?.settingRule || null;
  const conditions = [];
  if (modules.scale || modules.isolation) {
    conditions.push({
      id: "scale_isolation",
      title: "Масштаб і термін ізоляції",
      detail: `${modules.scale ? `Масштаб: ${modules.scale}. ` : ""}${modules.isolation ? `Розрахункова ізоляція: ${modules.isolation}.` : ""}${rule ? ` Діє правило сетингу «${rule.name}».` : ""}`.trim()
    });
  } else {
    const horizon = firstSentence(catastrophe?.lore?.horizon, 190);
    conditions.push({
      id: "isolation",
      title: "Умови ізоляції",
      detail: horizon || "Точний термін безпечного перебування під землею невідомий, тому група має планувати автономність без гарантованої дати виходу."
    });
  }
  if (scenario.procedural && scenario.hiddenComplication) {
    const revealed = Boolean(scenario.complicationRevealed);
    conditions.push({
      id: "complication",
      title: revealed ? clean(scenario.hiddenComplication.title) : "Невідома обставина",
      detail: revealed ? firstSentence(scenario.hiddenComplication.reveal, 210) : firstSentence(scenario.hiddenComplication.publicHint, 210) || "У сценарії є прихований чинник, який відкриється пізніше.",
      revealed
    });
  } else if (rule) {
    conditions.push({ id: "setting_rule", title: rule.name, detail: rule.description });
  } else {
    const shelter = room?.game?.shelter || {};
    const weakest = [...(shelter.modules || [])].sort((a, b) => Number(a.condition || 0) - Number(b.condition || 0))[0];
    conditions.push({
      id: "shelter_limit",
      title: "Обмеження сховища",
      detail: `Фінальна група — до ${Number(shelter.selectionCapacity || shelter.capacity || 0)} осіб; проєктна місткість — ${Number(shelter.residentCapacity || 0)}. ${weakest ? `Найслабший модуль на старті: «${clean(weakest.name)}» — ${Number(weakest.condition || 0)}%.` : "Стан модулів потрібно перевірити після старту."}`
    });
  }
  return conditions.slice(0, 2);
}
function buildLongTermRisk(room, ranked) {
  if (room?.settings?.setting === "detective") {
    return {
      id: "trust_collapse",
      title: "Розпад довіри після помилкового звинувачення",
      detail: "Якщо група назве винного без незалежного доказового ланцюга, справжня загроза може залишитися всередині, а наступні рішення втратять легітимність."
    };
  }
  const modules = room?.game?.catastrophe?.modules || {};
  const horizon = firstSentence(room?.game?.catastrophe?.lore?.horizon, 220);
  if (/(рок|поколін|невідом|невизнач)/iu.test(clean(modules.isolation))) {
    return {
      id: "autonomy",
      title: "Виснаження автономності",
      detail: horizon || "Тривала ізоляція поступово перетворить аварійні запаси, знання й технічні системи на невідновлювані ресурси."
    };
  }
  const top = ranked[0]?.rule;
  if (top?.longTerm) return { id: `${top.id}_long`, ...top.longTerm };
  return {
    id: "dependency",
    title: "Залежність від аварійних запасів",
    detail: horizon || "Громада має перейти від споживання стартових запасів до відновлюваної води, їжі, енергії та передавання знань."
  };
}

function buildScenarioPriorities(room) {
  if (!room?.game) return null;
  const ranked = rankedThreatRules(room);
  return {
    version: 1,
    setting: room.settings?.setting || "modern",
    generatedRound: Number(room.game.round || 1),
    threats: buildThreats(room, ranked),
    needs: buildNeeds(room, ranked),
    conditions: buildConditions(room),
    longTermRisk: buildLongTermRisk(room, ranked)
  };
}

function validatePriorities(value) {
  if (!value || !Array.isArray(value.threats) || value.threats.length !== 3) throw new Error("Пріоритети сценарію мають містити 3 загрози.");
  if (!Array.isArray(value.needs) || value.needs.length !== 3) throw new Error("Пріоритети сценарію мають містити 3 критичні потреби.");
  if (!Array.isArray(value.conditions) || value.conditions.length !== 2) throw new Error("Пріоритети сценарію мають містити 2 особливі умови.");
  if (!value.longTermRisk?.title || !value.longTermRisk?.detail) throw new Error("Пріоритети сценарію мають містити довгостроковий ризик.");
  return true;
}

module.exports = { buildScenarioPriorities, validatePriorities, THREAT_RULES, RESOURCE_META };

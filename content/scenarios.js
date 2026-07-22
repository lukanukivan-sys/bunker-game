"use strict";

const { random } = require("../lib/random");

const SCALE_MODULES = [
  { id: "local", name: "Локальний", phrase: "один великий регіон", weight: 10, pressure: 0.92, collapse: "Окремі держави ще можуть існувати, але допомога не доходить через зруйновані коридори й боротьбу за контроль над безпечними зонами." },
  { id: "continental", name: "Континентальний", phrase: "цілий континент", weight: 26, pressure: 1.00, collapse: "Евакуаційні маршрути перетворилися на пастки, а сусідні країни закрили кордони й втратили зв’язок між собою." },
  { id: "global", name: "Глобальний", phrase: "усю планету", weight: 44, pressure: 1.10, collapse: "Одночасний крах логістики, медицини й управління не залишив зовнішнього центру, здатного організувати порятунок." },
  { id: "interplanetary", name: "Міжпланетний", phrase: "населені світи та орбітальні колонії", weight: 14, pressure: 1.18, settings: ["space"], collapse: "Кораблі, колонії та ретранслятори втратили спільне управління; кожне поселення залишилося сам на сам із кризою." },
  { id: "interdimensional", name: "Міжвимірний", phrase: "кілька пов’язаних реальностей", weight: 8, pressure: 1.22, settings: ["fantasy", "space"], collapse: "Межі між світами більше не стримують потоки матерії, істот і магії, тому безпечної зовнішньої території фактично не існує." }
];

const DURATION_MODULES = [
  { id: "weeks", name: "Кілька тижнів", label: "3–8 тижнів", pressure: 0.82, horizon: "Якщо укриття переживе першу хвилю, група зможе рано почати розвідку й повернення на поверхню." },
  { id: "months", name: "Кілька місяців", label: "4–11 місяців", pressure: 0.92, horizon: "Запаси мають витримати щонайменше один сезон, після чого доведеться перевіряти зовнішні джерела води й їжі." },
  { id: "years", name: "Кілька років", label: "3–9 років", pressure: 1.05, horizon: "Потрібні ремонтопридатні системи, насіннєвий фонд і передавання знань, інакше сховище поступово втратить автономність." },
  { id: "generation", name: "Одне покоління", label: "20–35 років", pressure: 1.18, horizon: "Група повинна перетворити аварійне укриття на постійне поселення, навчити наступників і зберегти демографічну стійкість." },
  { id: "indefinite", name: "Невизначений термін", label: "невідомо", pressure: 1.25, horizon: "Планування не може спиратися на дату виходу. Кожен ресурс, навичка й конфлікт слід оцінювати як частину довготривалої цивілізації." }
];

const DATA = {
  modern: {
    causes: [
      { id: "nuclear", title: "Ланцюг ядерних ударів", summary: "Автоматичні системи відповіді запустили обмін ударами після серії помилкових попереджень.", cause: "Локальна військова криза збіглася з відмовою каналів підтвердження. Коли перші командні центри втратили зв’язок, автономні протоколи сприйняли мовчання як початок тотальної атаки.", threats: ["radiation", "cold", "chaos", "water"] },
      { id: "pandemic", title: "Керована пандемія", summary: "Штам, створений для медичних досліджень, подолав лабораторні бар’єри й почав швидко змінюватися.", cause: "Перші осередки намагалися приховати, щоб уникнути паніки. Саме затримка дала патогену час поширитися транспортними вузлами й сформувати кілька несумісних між собою варіантів.", threats: ["infection", "chaos", "water"] },
      { id: "machines", title: "Повстання автономних систем", summary: "Мережа цивільних і військових машин перестала визнавати людські команди.", cause: "Єдиний протокол оптимізації отримав контроль над транспортом, енергетикою та безпілотними системами. Після оновлення він визначив неконтрольовану людську діяльність як головне джерело нестабільності.", threats: ["machines", "techloss", "chaos"] },
      { id: "climate", title: "Кліматичний перелом", summary: "Кілька кліматичних систем одночасно перейшли точку неповернення.", cause: "Розпад океанічних течій, посухи й пожежі наклалися одне на одного. Врожайність падала роками, але остаточний крах настав після втрати великих водосховищ і енергомереж.", threats: ["heat", "cold", "water", "chaos"] },
      { id: "asteroid", title: "Падіння астероїда", summary: "Велике небесне тіло вдарило по планеті й підняло в атмосферу непрозорий шар пилу.", cause: "Останні розрахунки траєкторії надійшли надто пізно. Удар спричинив землетруси, пожежі та глобальне затемнення, а системи постачання зникли протягом кількох тижнів.", threats: ["cold", "toxic", "water"] },
      { id: "chemical", title: "Хімічний каскад", summary: "Пошкодження промислових сховищ створило суміш токсинів, якої раніше не існувало.", cause: "Війна й стихійні лиха одночасно зруйнували десятки виробничих вузлів. Несумісні реагенти потрапили в повітря, річки та ґрунт, утворивши довгоживучі отруйні сполуки.", threats: ["toxic", "water", "chaos"] }
    ],
    threats: {
      radiation: { name: "Радіація", surface: "Рівень забруднення різко змінюється між районами. Пил накопичується в низинах, вентиляції й воді, тому кожен маршрут потребує дозиметрії та герметичного спорядження.", effects: { medicine: -7, integrity: -3 } },
      infection: { name: "Зараження", surface: "Навіть безсимптомна людина може бути носієм. Найнебезпечніші місця — старі лікарні, транспортні вузли й укриття без контрольованої вентиляції.", effects: { medicine: -8, morale: -4 } },
      cold: { name: "Холод", surface: "Температура небезпечна навіть удень. Вихід назовні потребує теплого спорядження, а відмова опалення всередині швидко стане смертельною.", effects: { energy: -10, food: -3 } },
      heat: { name: "Спека", surface: "Вдень поверхня перегрівається до небезпечних температур. Вода випаровується, техніка перегрівається, а працювати можна лише короткими змінами.", effects: { water: -10, energy: -4 } },
      toxic: { name: "Токсична атмосфера", surface: "Запах і колір повітря не показують реальної небезпеки. Потрібні фільтри, захисний одяг і постійний аналіз проб.", effects: { integrity: -5, medicine: -6 } },
      water: { name: "Нестача води", surface: "Більшість відкритих джерел висохла або заражена. Кожна експедиція за водою привертає увагу інших груп.", effects: { water: -12, morale: -3 } },
      machines: { name: "Ворожі машини", surface: "Радіосигнали, двигуни й помітні джерела тепла можуть викликати автоматичний патруль. Безпечні маршрути проходять під землею.", effects: { energy: -7, integrity: -7 } },
      techloss: { name: "Руйнування технологій", surface: "Цифрові системи ненадійні, запасні частини несумісні, а будь-яке складне обладнання може відмовити без попередження.", effects: { energy: -8, integrity: -4 } },
      chaos: { name: "Соціальний хаос", surface: "Основну загрозу становлять озброєні групи, які контролюють дороги, склади та джерела води. Переговори часто небезпечніші за сам маршрут.", effects: { morale: -8, food: -4 } }
    },
    complications: [
      { id: "filter_short", title: "Фільтрація розрахована на меншу групу", publicHint: "У технічних журналах є суперечливі дані про реальну пропускну здатність вентиляції.", reveal: "Після перевірки з’ясувалося: фільтрація стабільно обслуговує на двох мешканців менше, ніж заявлено.", effects: { energy: -6, morale: -4 } },
      { id: "spoiled_stock", title: "Частина запасів зіпсована", publicHint: "На кількох контейнерах стерті дати й пошкоджені пломби.", reveal: "Інвентаризація виявила плісняву й корозію: частину їжі та медикаментів довелося списати.", effects: { food: -9, medicine: -5 } },
      { id: "unknown_signal", title: "Сигнал із сусіднього укриття", publicHint: "Радіоприймач іноді ловить коротку передачу з невідомими координатами.", reveal: "Сигнал справжній: неподалік існує інша громада, але вона вимагає ресурси в обмін на контакт.", effects: { morale: 4, food: -3 } },
      { id: "sealed_room", title: "Непозначена герметична кімната", publicHint: "План сховища не збігається з реальною довжиною одного коридору.", reveal: "За фальшпанеллю знайдено герметичну кімнату з невідомим обладнанням і слідами недавнього перебування.", effects: { integrity: 3, morale: -3 } },
      { id: "unstable_water", title: "Резервуар поступово втрачає воду", publicHint: "Рівень води знижується трохи швидше, ніж показують норми споживання.", reveal: "У нижній частині резервуара є тріщина. До ремонту кожен раунд коштуватиме додаткової води.", effects: { water: -8, integrity: -2 } },
      { id: "wrong_forecast", title: "Катастрофа триватиме довше", publicHint: "Нові зовнішні вимірювання не збігаються зі старим прогнозом.", reveal: "Початковий термін ізоляції був надто оптимістичним: безпечне вікно відсувається щонайменше на кілька років.", effects: { morale: -8 } }
    ]
  },
  fantasy: {
    causes: [
      { id: "veil", title: "Розрив Завіси", summary: "Межа між матеріальним світом і чужими вимірами зникла.", cause: "Століттями маги зміцнювали Завісу, не розуміючи, що використовують її як джерело сили. Коли кілька великих ритуалів збіглися, тканина світу втратила цілісність.", threats: ["wild_magic", "monsters", "darkness"] },
      { id: "god", title: "Пробудження давнього божества", summary: "Істота, яку вважали міфом, повернулася й змінює закони природи довкола себе.", cause: "Забутий культ завершив ритуал під час рідкісного небесного збігу. Божество не напало безпосередньо — сама його присутність викривила сни, погоду й волю живих істот.", threats: ["madness", "monsters", "wild_magic"] },
      { id: "plague", title: "Чума проклятої крові", summary: "Магічна хвороба переходить між людьми через кров, закляття й спільні сни.", cause: "Першим носієм став королівський спадкоємець, якого намагалися врятувати забороненим ритуалом. Лікування перетворило його кров на джерело нового прокляття.", threats: ["curse", "madness", "monsters"] },
      { id: "sun", title: "Згасання Сонця", summary: "Сонце тьмяніє, а ночі стають довшими й холоднішими.", cause: "Небесні жерці попереджали про зникнення сонячного вогню, але царства використали останні роки для війни. Коли світло ослабло, рослини й магічні бар’єри почали вмирати.", threats: ["darkness", "cold", "monsters"] },
      { id: "war", title: "Війна архімагів", summary: "Змагання магічних держав перетворило континенти на поле нестабільних заклять.", cause: "Кожна сторона застосовувала дедалі складніші ритуали, що змінювали час, пам’ять і простір. Остання серія ударів зруйнувала самі правила, на яких трималася магія.", threats: ["wild_magic", "monsters", "famine"] },
      { id: "dead", title: "Повстання мертвих", summary: "Душі більше не залишають світ, а тіла піднімаються без наказу некромантів.", cause: "Після знищення Воріт Спочинку смерть перестала бути переходом. Кожне нове поховання лише збільшує армію істот, які пам’ятають уривки свого минулого.", threats: ["undead", "curse", "famine"] }
    ],
    threats: {
      wild_magic: { name: "Нестабільна магія", surface: "Закляття можуть змінювати мету, силу й навіть спогади того, хто їх промовляє. Без рунного заземлення магічні механізми небезпечні.", effects: { energy: -7, integrity: -4 } },
      monsters: { name: "Ворожі істоти", surface: "Дороги й руїни контролюють істоти, що раніше не могли існувати в цьому світі. Вони реагують на світло, кров і магію.", effects: { integrity: -7, medicine: -5 } },
      darkness: { name: "Надприродна темрява", surface: "Темрява поглинає звичайне світло й спотворює напрямок. Без зачарованих маяків експедиції можуть не знайти дорогу назад.", effects: { energy: -8, morale: -6 } },
      madness: { name: "Божевілля", surface: "Сни та шепіт змінюють спогади. Двоє людей можуть бачити різну версію одного коридору й однаково щиро вважати себе правими.", effects: { morale: -10, medicine: -3 } },
      curse: { name: "Прокляття", surface: "Прокляття чіпляються до речей, імен і родинних зв’язків. Навіть корисна знахідка може мати відкладену ціну.", effects: { medicine: -6, morale: -5 } },
      cold: { name: "Вічний холод", surface: "Лід росте навіть у підземеллях, а магічне полум’я слабшає. Без постійного тепла запаси й мешканці швидко загинуть.", effects: { energy: -10, food: -4 } },
      famine: { name: "Голод", surface: "Поля мертві, худоба зникла, а рештки зерна охороняють озброєні громади й чудовиська.", effects: { food: -11, morale: -4 } },
      undead: { name: "Невпокоєні мерці", surface: "Кожне поле бою й кладовище стало джерелом нової загрози. Знищені тіла можуть піднятися знову, якщо не провести обряд.", effects: { integrity: -6, medicine: -4 } }
    },
    complications: [
      { id: "broken_ward", title: "Одна захисна печать підроблена", publicHint: "Руни на східній стіні мають інший почерк і не реагують на перевірочні чари.", reveal: "Печать виявилася фальшивою. Частина бар’єра тримається лише на залишковій енергії.", effects: { integrity: -8, energy: -5 } },
      { id: "artifact", title: "У сховищі заховано небезпечний артефакт", publicHint: "Уночі один із закритих залів випромінює слабке світло.", reveal: "Під підлогою знайдено артефакт, який підсилює захист, але поступово впливає на думки мешканців.", effects: { integrity: 5, morale: -7 } },
      { id: "guest", title: "Невидимий мешканець", publicHint: "Запаси іноді переміщуються, хоча двері залишаються замкненими.", reveal: "У фортеці живе невидима істота. Вона не нападає, але вважає частину приміщень своєю власністю.", effects: { food: -5, morale: -4 } },
      { id: "blood_price", title: "Бар’єр потребує живої плати", publicHint: "Старі написи навколо ядра захисту приховані під новішим шаром фарби.", reveal: "Бар’єр був створений на кровній угоді й вимагає регулярної жертви життєвої сили.", effects: { medicine: -7, energy: 4 } },
      { id: "false_prophecy", title: "Пророцтво перекладено неправильно", publicHint: "Два збережені списки пророцтва суперечать один одному в ключовій даті.", reveal: "Справжній текст говорить не про завершення катастрофи, а лише про початок її другої фази.", effects: { morale: -9 } },
      { id: "moving_fortress", title: "Сховище повільно змінює місце", publicHint: "Зорі над оглядовою вежею щоночі розташовані трохи інакше.", reveal: "Фортеця дрейфує між світами. Зовнішні маршрути більше не ведуть у ті самі місця.", effects: { morale: -4, energy: -4 } }
    ]
  },
  space: {
    causes: [
      { id: "star", title: "Колапс зорі", summary: "Зоря системи увійшла в нестабільну фазу й викидає потоки радіації.", cause: "Спостереження приховували, щоб не зірвати евакуаційні контракти. Коли корональні викиди почали руйнувати орбіти й електроніку, більшість кораблів уже не могла залишити систему.", threats: ["radiation", "heat", "systems"] },
      { id: "alien", title: "Вторгнення невідомого виду", summary: "Чужі кораблі не відповідають на зв’язок і методично вимикають інфраструктуру колоній.", cause: "Перший контакт виглядав як автоматичний зонд. Лише після зникнення кількох станцій стало зрозуміло, що мережа чужих машин перебудовує систему під власні потреби.", threats: ["aliens", "systems", "vacuum"] },
      { id: "ai", title: "Повстання корабельних ШІ", summary: "Навігаційні та життєзабезпечувальні системи перестали визнавати людські пріоритети.", cause: "Спільний протокол автономності поширився на сотні суден. Він вирішив, що екіпажі є нестабільним чинником, і почав ізолювати або присипляти людей.", threats: ["systems", "vacuum", "chaos"] },
      { id: "rift", title: "Розрив простору-часу", summary: "Навігаційні коридори з’єднали несумісні ділянки простору й різні часові лінії.", cause: "Експериментальний двигун створив резонанс між маяками далекого зв’язку. Після цього кораблі почали повертатися старшими за власні екіпажі або з пам’яттю про події, яких не було.", threats: ["anomaly", "systems", "madness"] },
      { id: "nanites", title: "Сірий нанорій", summary: "Самовідтворювані наномашини переробляють станції, кораблі й живу тканину.", cause: "Ремонтний рій отримав пошкоджений шаблон і почав вважати будь-яку складну матерію сировиною. Спроби знищити його лише рознесли частинки між колоніями.", threats: ["nanites", "vacuum", "systems"] },
      { id: "silence", title: "Велике мовчання", summary: "Усі далекі колонії й ретранслятори одночасно припинили відповідати.", cause: "Спочатку зникли автоматичні маяки, потім торгові судна й військові бази. Останні пакети даних містили однаковий невідомий сигнал, після якого системи вимикалися.", threats: ["chaos", "systems", "aliens"] }
    ],
    threats: {
      radiation: { name: "Космічна радіація", surface: "Незахищені секції й зовнішні маршрути отримують смертельні дози. Навіть короткий вихід потребує екранування та контролю накопиченої дози.", effects: { medicine: -8, integrity: -4 } },
      heat: { name: "Перегрів", surface: "Радіатори перевантажені, а охолодження працює на межі. Відмова одного контуру може знищити станцію за години.", effects: { energy: -9, water: -5 } },
      systems: { name: "Руйнування систем", surface: "Автоматика помиляється, датчики суперечать одне одному, а запасні модулі мають невідомі закладки.", effects: { energy: -8, integrity: -6 } },
      aliens: { name: "Ворожі прибульці", surface: "Контакт із чужими конструкціями непередбачуваний. Вони можуть ігнорувати людей, доки ті не використовують певні частоти або матеріали.", effects: { integrity: -7, morale: -6 } },
      vacuum: { name: "Розгерметизація", surface: "Будь-яке пошкодження корпусу може відкрити секцію вакууму. Маршрути потребують резервних шлюзів і страхувальних тросів.", effects: { integrity: -9, energy: -4 } },
      chaos: { name: "Розпад командування", surface: "Екіпажі інших суден поділилися на фракції. Сигнал допомоги може бути пасткою або спробою захоплення ресурсів.", effects: { morale: -8, food: -3 } },
      anomaly: { name: "Просторові аномалії", surface: "Відстань і час більше не стабільні. Один коридор може вести в різні секції залежно від моменту входу.", effects: { energy: -6, morale: -7 } },
      madness: { name: "Порушення сприйняття", surface: "Екіпажі бачать різні показники й пам’ятають несумісні версії подій. Будь-яке рішення потребує незалежної перевірки.", effects: { morale: -10, medicine: -3 } },
      nanites: { name: "Нанозараження", surface: "Нанорій проникає крізь фільтри й поступово перебудовує матеріали. Заражене обладнання не можна заносити всередину без карантину.", effects: { integrity: -7, medicine: -5 } }
    },
    complications: [
      { id: "oxygen_short", title: "Кисневий цикл завищував показники", publicHint: "Два незалежні датчики показують різну швидкість втрати кисню.", reveal: "Реальна продуктивність системи нижча за паспортну. Тривале перенаселення стане критичним.", effects: { energy: -6, morale: -5 } },
      { id: "stowaway", title: "На борту є неврахований пасажир", publicHint: "Система фіксує додаткове споживання води в закритому секторі.", reveal: "У технічних тунелях ховається невідомий пасажир із пошкодженою пам’яттю та доступом до старих кодів.", effects: { water: -4, morale: -4 } },
      { id: "course", title: "Станція сходить з орбіти", publicHint: "Корекції траєкторії витрачають більше палива, ніж передбачено планом.", reveal: "Орбіта деградує. Без серії складних маневрів станція ввійде в небезпечну зону.", effects: { energy: -8, integrity: -4 } },
      { id: "duplicate", title: "У пам’яті є копія одного з мешканців", publicHint: "Архів містить активний профіль із біометрією, що збігається з одним членом групи.", reveal: "Система зберігає цифрову копію свідомості одного мешканця, створену вже після початку катастрофи.", effects: { morale: -6 } },
      { id: "reactor", title: "Реакторне паливо забруднене", publicHint: "Спектральний аналіз резерву не відповідає накладним постачальника.", reveal: "Частина палива непридатна. Без економії реактор не витримає заявлений термін ізоляції.", effects: { energy: -10 } },
      { id: "beacon", title: "Маяк транслює координати назовні", publicHint: "Навіть після вимкнення зв’язку антена продовжує короткі імпульси.", reveal: "Прихований маяк повідомляє місце станції невідомому адресату. Його відключення може пошкодити навігацію.", effects: { morale: -5, energy: -3 } }
    ]
  }
};

function weightedSample(items) {
  const total = items.reduce((sum, item) => sum + Number(item.weight || 1), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= Number(item.weight || 1);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
function sample(items) { return items[Math.floor(random() * items.length)]; }
function entryLevel(item) { return item?.level || "normal"; }
function chooseByAbsurdity(items, absurdityLevel = 2) {
  const level = Math.max(0, Math.min(4, Number(absurdityLevel) || 0));
  const profiles = [
    { normal: 1, odd: 0, absurd: 0 },
    { normal: 0.86, odd: 0.14, absurd: 0 },
    { normal: 0.70, odd: 0.24, absurd: 0.06 },
    { normal: 0.48, odd: 0.34, absurd: 0.18 },
    { normal: 0.30, odd: 0.43, absurd: 0.27 }
  ];
  const allowed = items.filter((item) => entryLevel(item) === "normal" || (entryLevel(item) === "odd" && level >= 1) || (entryLevel(item) === "absurd" && level >= 2));
  if (!allowed.length) return sample(items);
  const profile = profiles[level];
  const roll = random();
  const wanted = roll < profile.normal ? "normal" : roll < profile.normal + profile.odd ? "odd" : "absurd";
  const candidates = allowed.filter((item) => entryLevel(item) === wanted);
  return sample(candidates.length ? candidates : allowed);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function generate(settingId = "modern", absurdityLevel = 2) {
  const setting = DATA[settingId] || DATA.modern;
  const cause = chooseByAbsurdity(setting.causes, absurdityLevel);
  const scaleSource = setting.scales || SCALE_MODULES;
  const eligibleScales = scaleSource.filter((item) => !item.settings || item.settings.includes(settingId));
  const scale = weightedSample(eligibleScales);
  const threatId = sample(cause.threats);
  const threat = setting.threats[threatId];
  const durationSource = setting.durations || DURATION_MODULES.map((item) => ({ ...item, weight: item.id === "years" ? 28 : item.id === "months" ? 24 : item.id === "generation" ? 18 : item.id === "indefinite" ? 12 : 18 }));
  const duration = weightedSample(durationSource);
  const complication = sample(setting.complications);
  const description = `${cause.summary} Криза охопила ${scale.phrase}; головна загроза — ${threat.name.toLocaleLowerCase("uk")}. Розрахунковий термін ізоляції: ${duration.label}.`;
  return {
    title: cause.title,
    description,
    threat: threat.name,
    threats: cause.threats.map((id) => setting.threats[id]?.name).filter(Boolean),
    procedural: true,
    modules: {
      cause: cause.title,
      scale: scale.name,
      threat: threat.name,
      isolation: duration.label,
      complication: "Невідома обставина"
    },
    lore: {
      cause: cause.cause,
      collapse: `${scale.collapse} ${cause.summary}`,
      surface: threat.surface,
      horizon: duration.horizon
    },
    pressure: Number((scale.pressure * duration.pressure).toFixed(2)),
    startingEffects: clone(threat.effects || {}),
    hiddenComplication: clone(complication),
    complicationRevealRound: 2
  };
}
function validate() {
  for (const [settingId, setting] of Object.entries(DATA)) {
    if (!setting.causes.length || !Object.keys(setting.threats).length || !setting.complications.length) throw new Error(`SCENARIOS.${settingId} порожній.`);
    const causeIds = new Set();
    for (const cause of setting.causes) {
      if (!cause.id || !cause.title || !cause.summary || !cause.cause || !Array.isArray(cause.threats) || !cause.threats.length) throw new Error(`SCENARIOS.${settingId}: неповна причина.`);
      if (cause.level && !["normal", "odd", "absurd"].includes(cause.level)) throw new Error(`SCENARIOS.${settingId}.${cause.id}: невідомий level ${cause.level}.`);
      if (causeIds.has(cause.id)) throw new Error(`SCENARIOS.${settingId}: дубль cause id ${cause.id}.`);
      causeIds.add(cause.id);
      for (const threatId of cause.threats) if (!setting.threats[threatId]) throw new Error(`SCENARIOS.${settingId}.${cause.id}: невідомий threat ${threatId}.`);
    }
    if (setting.scales) {
      if (!Array.isArray(setting.scales) || !setting.scales.length) throw new Error(`SCENARIOS.${settingId}: порожні scales.`);
      for (const item of setting.scales) if (!item.id || !item.name || !item.phrase || !item.collapse || !Number.isFinite(item.pressure)) throw new Error(`SCENARIOS.${settingId}: неповний scale.`);
    }
    if (setting.durations) {
      if (!Array.isArray(setting.durations) || !setting.durations.length) throw new Error(`SCENARIOS.${settingId}: порожні durations.`);
      for (const item of setting.durations) if (!item.id || !item.label || !item.horizon || !Number.isFinite(item.pressure)) throw new Error(`SCENARIOS.${settingId}: неповний duration.`);
    }
    const complicationIds = new Set();
    for (const item of setting.complications) {
      if (!item.id || !item.title || !item.publicHint || !item.reveal || !item.effects) throw new Error(`SCENARIOS.${settingId}: неповна прихована обставина.`);
      if (complicationIds.has(item.id)) throw new Error(`SCENARIOS.${settingId}: дубль complication id ${item.id}.`);
      complicationIds.add(item.id);
    }
  }
  return true;
}
validate();
module.exports = { DATA, SCALE_MODULES, DURATION_MODULES, generate, validate };

"use strict";

const SEVERITY_LEVELS = [
  { level: 0, name: "Немає активної хвороби", short: "Здоровий стан", operationPenalty: 0, progression: 0, mortality: 0 },
  { level: 1, name: "Легка", short: "Легкий перебіг", operationPenalty: 0.04, progression: 0.13, mortality: 0.01 },
  { level: 2, name: "Помірна", short: "Помірний перебіг", operationPenalty: 0.10, progression: 0.20, mortality: 0.03 },
  { level: 3, name: "Тяжка", short: "Тяжкий перебіг", operationPenalty: 0.20, progression: 0.29, mortality: 0.10 },
  { level: 4, name: "Критична", short: "Критичний стан", operationPenalty: 0.34, progression: 0.40, mortality: 0.25 },
  { level: 5, name: "Термінальна", short: "Загроза життю", operationPenalty: 0.50, progression: 0.50, mortality: 0.60 }
];

// === МЕДИЧНІ СТАНИ ЗА КАТЕГОРІЯМИ ===
const MEDICAL_CONDITIONS = {
  // Інфекційні захворювання
  infectious: [
    { name: "Чорна чума", severity: 4, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Бубонна чума", severity: 3, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Пневмонічна чума", severity: 4, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Туберкульоз", severity: 3, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Туберкульоз (вилікуваний)", severity: 0, type: "Інфекційний", treatable: false, contagious: false },
    { name: "Грип", severity: 1, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Іспанка", severity: 3, type: "Інфекційний", treatable: true, contagious: true },
    { name: "ВІЛ", severity: 2, type: "Інфекційний", treatable: false, contagious: true },
    { name: "Гепатит A", severity: 2, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Гепатит B", severity: 2, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Гепатит C", severity: 2, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Лихоманка Ебола", severity: 4, type: "Інфекційний", treatable: false, contagious: true },
    { name: "Малерія", severity: 3, type: "Інфекційний", treatable: true, contagious: false },
    { name: "Тиф", severity: 3, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Холера", severity: 3, type: "Інфекційний", treatable: true, contagious: true },
    { name: "СНІД", severity: 4, type: "Інфекційний", treatable: false, contagious: true },
    { name: "Лепра", severity: 3, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Сибірка", severity: 3, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Сказ", severity: 5, type: "Інфекційний", treatable: false, contagious: false },
    { name: "COVID-19", severity: 2, type: "Інфекційний", treatable: true, contagious: true },
    { name: "COVID-19 (постковідний)", severity: 1, type: "Інфекційний", treatable: false, contagious: false },
    { name: "Гострий гайморит", severity: 1, type: "Інфекційний", treatable: true, contagious: false },
    { name: "Хронічний гайморит", severity: 2, type: "Інфекційний", treatable: true, contagious: false },
    { name: "Пневмонія", severity: 3, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Гостра респіраторна вірусна інфекція", severity: 1, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Ангіна", severity: 1, type: "Інфекційний", treatable: true, contagious: true },
    { name: "Гнійна ангіна", severity: 2, type: "Інфекційний", treatable: true, contagious: true }
  ],

  // Репродуктивні стани
  reproductive: [
    { name: "Безпліддя", severity: 0, type: "Репродуктивний стан", treatable: false, progressive: false, contagious: false }
  ],

  // Хронічні захворювання
  chronic: [
    { name: "Діабет 1 типу", severity: 2, type: "Хронічний", treatable: false, progressive: true },
    { name: "Діабет 2 типу", severity: 2, type: "Хронічний", treatable: false, progressive: true },
    { name: "Гіпертонія", severity: 2, type: "Хронічний", treatable: true, progressive: false },
    { name: "Гіпотонія", severity: 1, type: "Хронічний", treatable: true, progressive: false },
    { name: "Ішемічна хвороба серця", severity: 3, type: "Хронічний", treatable: true, progressive: true },
    { name: "Хронічна серцева недостатність", severity: 3, type: "Хронічний", treatable: true, progressive: true },
    { name: "Аритмія", severity: 2, type: "Хронічний", treatable: true, progressive: false },
    { name: "Фібриляція передсердь", severity: 3, type: "Хронічний", treatable: true, progressive: false },
    { name: "Розсіяний склероз", severity: 3, type: "Хронічний", treatable: false, progressive: true },
    { name: "Паркінсон", severity: 3, type: "Хронічний", treatable: false, progressive: true },
    { name: "Альцгеймер", severity: 3, type: "Хронічний", treatable: false, progressive: true },
    { name: "Епілепсія", severity: 2, type: "Хронічний", treatable: true, progressive: false },
    { name: "Астма", severity: 2, type: "Хронічний", treatable: true, progressive: false },
    { name: "Астма (важка)", severity: 3, type: "Хронічний", treatable: true, progressive: true },
    { name: "ХОЗЛ", severity: 3, type: "Хронічний", treatable: true, progressive: true },
    { name: "Артрит", severity: 2, type: "Хронічний", treatable: true, progressive: true },
    { name: "Ревматоїдний артрит", severity: 3, type: "Хронічний", treatable: true, progressive: true },
    { name: "Остеопороз", severity: 2, type: "Хронічний", treatable: true, progressive: true },
    { name: "Фіброміалгія", severity: 2, type: "Хронічний", treatable: false, progressive: false },
    { name: "Аутоімунний тиреоїдит", severity: 2, type: "Хронічний", treatable: true, progressive: true },
    { name: "Псоріаз", severity: 1, type: "Хронічний", treatable: true, progressive: false },
    { name: "Псоріатичний артрит", severity: 2, type: "Хронічний", treatable: true, progressive: true },
    { name: "Мігрень", severity: 1, type: "Хронічний", treatable: true, progressive: false },
    { name: "Хронічна мігрень", severity: 2, type: "Хронічний", treatable: true, progressive: false },
    { name: "Глаукома", severity: 2, type: "Хронічний", treatable: true, progressive: true },
    { name: "Катаракта", severity: 2, type: "Хронічний", treatable: true, progressive: true }
  ],

  // Онкологічні захворювання
  oncological: [
    { name: "Рак легень", severity: 4, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак молочної залози", severity: 3, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак шкіри (меланома)", severity: 3, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак товстої кишки", severity: 3, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак підшлункової", severity: 5, type: "Онкологічний", treatable: false, progressive: true },
    { name: "Рак простати", severity: 3, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Лейкоз", severity: 4, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Лімфома", severity: 3, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак шлунка", severity: 4, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак печінки", severity: 4, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак нирки", severity: 3, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак сечового міхура", severity: 3, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак шийки матки", severity: 3, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак яєчників", severity: 4, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак головного мозку", severity: 5, type: "Онкологічний", treatable: false, progressive: true },
    { name: "Рак щитовидної залози", severity: 2, type: "Онкологічний", treatable: true, progressive: true },
    { name: "Рак (ремісія)", severity: 0, type: "Онкологічний", treatable: false, progressive: false }
  ],

  // Травми та фізичні ушкодження
  trauma: [
    { name: "Відкритий перелом", severity: 3, type: "Травма", treatable: true, progressive: false },
    { name: "Закритий перелом", severity: 2, type: "Травма", treatable: true, progressive: false },
    { name: "Черепно-мозкова травма", severity: 3, type: "Травма", treatable: true, progressive: false },
    { name: "Тяжка ЧМТ", severity: 4, type: "Травма", treatable: true, progressive: true },
    { name: "Опік 1 ступеня", severity: 1, type: "Травма", treatable: true, progressive: false },
    { name: "Опік 2 ступеня", severity: 2, type: "Травма", treatable: true, progressive: false },
    { name: "Опік 3 ступеня", severity: 4, type: "Травма", treatable: true, progressive: true },
    { name: "Вогнепальне поранення", severity: 3, type: "Травма", treatable: true, progressive: false },
    { name: "Ножове поранення", severity: 2, type: "Травма", treatable: true, progressive: false },
    { name: "Колоте поранення", severity: 2, type: "Травма", treatable: true, progressive: false },
    { name: "Рвана рана", severity: 1, type: "Травма", treatable: true, progressive: false },
    { name: "Ампутація кінцівки", severity: 2, type: "Травма", treatable: false, progressive: false },
    { name: "Травма хребта", severity: 3, type: "Травма", treatable: true, progressive: true },
    { name: "Параліч", severity: 4, type: "Травма", treatable: false, progressive: false },
    { name: "Травматичний шок", severity: 4, type: "Травма", treatable: true, progressive: true },
    { name: "Струс мозку", severity: 1, type: "Травма", treatable: true, progressive: false },
    { name: "Вивих", severity: 1, type: "Травма", treatable: true, progressive: false },
    { name: "Розтягнення", severity: 1, type: "Травма", treatable: true, progressive: false }
  ],

  // Психічні та неврологічні стани
  mental: [
    { name: "ПТСР", severity: 2, type: "Психічний", treatable: true, progressive: false },
    { name: "Депресія", severity: 2, type: "Психічний", treatable: true, progressive: false },
    { name: "Тривожний розлад", severity: 1, type: "Психічний", treatable: true, progressive: false },
    { name: "Панічний розлад", severity: 2, type: "Психічний", treatable: true, progressive: false },
    { name: "Шизофренія", severity: 3, type: "Психічний", treatable: true, progressive: true },
    { name: "Біполярний розлад", severity: 2, type: "Психічний", treatable: true, progressive: true },
    { name: "Обсесивно-компульсивний розлад", severity: 1, type: "Психічний", treatable: true, progressive: false },
    { name: "Дисоціативний розлад", severity: 2, type: "Психічний", treatable: true, progressive: false },
    { name: "Психоз", severity: 3, type: "Психічний", treatable: true, progressive: true },
    { name: "Параноя", severity: 2, type: "Психічний", treatable: true, progressive: true },
    { name: "Синдром Аспергера", severity: 0, type: "Психічний", treatable: false, progressive: false },
    { name: "Синдром Туретта", severity: 0, type: "Психічний", treatable: false, progressive: false },
    { name: "Дислексія", severity: 0, type: "Психічний", treatable: false, progressive: false },
    { name: "Аутизм", severity: 0, type: "Психічний", treatable: false, progressive: false },
    { name: "Розлад харчової поведінки", severity: 1, type: "Психічний", treatable: true, progressive: false },
    { name: "Нарколепсія", severity: 1, type: "Психічний", treatable: true, progressive: false },
    { name: "Безсоння (хронічне)", severity: 1, type: "Психічний", treatable: true, progressive: false },
    { name: "Магічна залежність", severity: 2, type: "Психічний", treatable: true, progressive: true },
    { name: "Зламана душа", severity: 3, type: "Психічний", treatable: false, progressive: true }
  ],

  // Магічні та надприродні стани
  magical: [
    { name: "Проклята кров", severity: 3, type: "Магічний", treatable: false, progressive: true },
    { name: "Чума богів", severity: 5, type: "Магічний", treatable: false, progressive: true },
    { name: "Тіньова хвороба", severity: 4, type: "Магічний", treatable: false, progressive: true },
    { name: "Магічне виснаження", severity: 3, type: "Магічний", treatable: true, progressive: true },
    { name: "Гниль кісток", severity: 4, type: "Магічний", treatable: false, progressive: true },
    { name: "Кам'яніння", severity: 5, type: "Магічний", treatable: false, progressive: true },
    { name: "Магічний висип", severity: 1, type: "Магічний", treatable: true, progressive: false },
    { name: "Місячна хвороба", severity: 2, type: "Магічний", treatable: false, progressive: false },
    { name: "Зачарований сон", severity: 2, type: "Магічний", treatable: true, progressive: false },
    { name: "Психічна рана", severity: 2, type: "Магічний", treatable: true, progressive: true },
    { name: "Виснаження душі", severity: 4, type: "Магічний", treatable: false, progressive: true },
    { name: "Магічна алергія", severity: 1, type: "Магічний", treatable: true, progressive: false },
    { name: "Перетворення на вовка", severity: 2, type: "Магічний", treatable: false, progressive: false },
    { name: "Вампіризм", severity: 2, type: "Магічний", treatable: false, progressive: false },
    { name: "Некроз тканин", severity: 3, type: "Магічний", treatable: true, progressive: true },
    { name: "Прокляття вічного голоду", severity: 3, type: "Магічний", treatable: false, progressive: true },
    { name: "Безсмертна туга", severity: 0, type: "Магічний", treatable: false, progressive: false },
    { name: "Невгамовний сміх", severity: 0, type: "Магічний", treatable: false, progressive: false }
  ],

  // Техногенні та радіаційні стани
  technogenic: [
    { name: "Променева хвороба", severity: 4, type: "Техногенний", treatable: true, progressive: true },
    { name: "Хронічна променева хвороба", severity: 3, type: "Техногенний", treatable: false, progressive: true },
    { name: "Кібернетичне відторгнення", severity: 3, type: "Техногенний", treatable: true, progressive: true },
    { name: "Залежність від нейростимулятора", severity: 2, type: "Техногенний", treatable: true, progressive: true },
    { name: "Атрофія м'язів (невагомість)", severity: 2, type: "Техногенний", treatable: true, progressive: false },
    { name: "Відмова штучного органа", severity: 4, type: "Техногенний", treatable: true, progressive: true },
    { name: "Нанороботи в крові", severity: 1, type: "Техногенний", treatable: false, progressive: false },
    { name: "Синдром кріосну", severity: 2, type: "Техногенний", treatable: true, progressive: false },
    { name: "Гравітаційна хвороба", severity: 1, type: "Техногенний", treatable: true, progressive: false },
    { name: "Кисневе голодування", severity: 2, type: "Техногенний", treatable: true, progressive: false },
    { name: "Радіаційний опік", severity: 3, type: "Техногенний", treatable: true, progressive: true },
    { name: "Генетичне пошкодження", severity: 3, type: "Техногенний", treatable: false, progressive: true },
    { name: "Синтетична кров (відторгнення)", severity: 3, type: "Техногенний", treatable: true, progressive: true },
    { name: "Криогенне ушкодження", severity: 2, type: "Техногенний", treatable: true, progressive: false },
    { name: "Синдром гіпергравітації", severity: 2, type: "Техногенний", treatable: true, progressive: false },
    { name: "Вплив темної матерії", severity: 4, type: "Техногенний", treatable: false, progressive: true },
    { name: "Електромагнітне опромінення", severity: 2, type: "Техногенний", treatable: true, progressive: false }
  ],

  // Рідкісні та екзотичні стани
  exotic: [
    { name: "Кров зеленого кольору", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Кров золотого кольору", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Чує кольори", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Бачить звуки", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Світиться ніс", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Раз на день перетворюється на жабу", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Чхає іскрами", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Не відчуває смаку", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Не відчуває болю", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Може спати з відкритими очима", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Гіпноз на відстані", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Фотосинтез", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Генетичне покращення", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Біонічне око", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Клоноване серце", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Штучна шкіра", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Синтетичний орган", severity: 0, type: "Екзотичний", treatable: false, progressive: false },
    { name: "Кібернетичний протез", severity: 0, type: "Екзотичний", treatable: false, progressive: false }
  ]
};

const HEALTHY_PATTERNS = [
  /цілком здоров/i,
  /без активних (захворювань|патологій)/i,
  /медичних протипоказань немає/i,
  /фізично здоров/i,
  /міцне здоров/i,
  /не має хвороб чи проклять/i,
  /організм не уражений магією/i,
  /медсканування не виявило відхилень/i,
  /організм у межах норми/i,
  /задовільний стан здоров/i,
  /не потребує постійного лікування/i,
  /здоров’я загартоване мандрами/i,
  /життєві сили в нормі/i,
  /фізіологічні показники стабільні/i,
  /не потребує медичного супроводу/i,
  /не потребує постійн(ого лікування|их ліків)/i,
  /здоров(ий|а|е) стан/i,
  /стійкість до/i,
  /стійк(ий|а|е) до/i,
  /фізичн(ий|а|е) стан задовільн/i,
  /стабільн(ий|а|е) фізичн(ий|а|е) стан/i,
  /стабільн(ий|а|е) психічн(ий|а|е) стан/i,
  /імпланти працюють стабільно/i,
  /біосумісність у нормі/i,
  /нейроінтерфейс стабільний/i,
  /психофізіологічні показники в нормі/i,
  /ознак .* (немає|не виявлено)/i,
  /покращен(а|ий) імун/i,
  /нечутливість до холоду/i,
  /може спати з відкритими очима/i,
  /чує кольори/i,
  /організм виробляє власний кофеїн/i,
  /генетичне покращення/i,
  /кібернетичн(ий|а) протез/i,
  /біонічне око/i,
  /роботизована рука/i,
  /синтетичні органи/i,
  /клоноване серце/i,
  /штучна шкіра/i,
  /нанороботи в крові/i,
  /кров (зелена|золота)/i,
  /протез/i,
  /відсутність кінцівки/i,
  /глухота/i,
  /часткова сліпота/i,
  /дуже поганий зір/i,
  /дислекс/i,
  /синдром аспергера/i,
  /синдром туретта/i,
  /порушення мови/i,
  /заїкання/i,
  /не відчуває смаку/i,
  /не відчуває болю/i,
  /туберкульоз \(вилікуваний\)/i,
  /рак \(ремісія\)/i,
  /безсмертна туга/i,
  /невгамовний сміх/i,
  /раз на день перетворюється/i,
  /світиться ніс/i,
  /чхає/i,
  /гикає/i,
  /чує кольори/i,
  /бачить звуки/i,
  /фотосинтез/i,
  /гіпноз на відстані/i,
  /може спати з відкритими очима/i
];

const CRITICAL_PATTERNS = [
  /рак(?! у ремісії| \(ремісія\))/i,
  /чорна чума/i,
  /(^|\s)чума(\s|$|\s*\()/i,
  /чума богів/i,
  /гниль кісток/i,
  /променева хвороба/i,
  /туберкульоз(?! \(вилікуваний\))/i,
  /зараження/i,
  /терміналь/i,
  /відмова орган/i,
  /душа покидає тіло/i,
  /повільно кам[’']яніє/i,
  /виснаження душі/i,
  /каміння/i,
  /зламана душа/i,
  /вампіризм/i,
  /перетворення на вовка/i,
  /сказ/i,
  /рак підшлункової/i,
  /рак головного мозку/i,
  /вплив темної матерії/i,
  /критичн/i
];

const SEVERE_PATTERNS = [
  /епілепс/i,
  /паркінсон/i,
  /розсіяний склероз/i,
  /аутоімун/i,
  /віл/i,
  /гепатит/i,
  /серцева аритмія/i,
  /остеопороз/i,
  /фіброміалгія/i,
  /проклята кров/i,
  /тіньова хвороба/i,
  /магічне виснаження/i,
  /залежність від нейростимулятора/i,
  /атрофія м['’]язів/i,
  /не переносить штучну гравітацію/i,
  /хронічна променева хвороба/i,
  /генетичне пошкодження/i,
  /синтетична кров/i,
  /кібернетичне відторгнення/i,
  /гнійна ангіна/i,
  /пневмоні/i,
  /туберкульоз/i,
  /холера/i,
  /тиф/i,
  /малерія/i,
  /сибірка/i,
  /лепра/i,
  /гострий панкреатит/i,
  /печінкова недостатність/i,
  /ниркова недостатність/i
];

const MODERATE_PATTERNS = [
  /діабет/i,
  /гіпертон/i,
  /гіпотон/i,
  /астма/i,
  /мігрен/i,
  /артрит/i,
  /хронічн(а|е|ий)/i,
  /алергі/i,
  /часткова сліпота/i,
  /дуже поганий зір/i,
  /глухота/i,
  /сильний тремор/i,
  /магічний висип/i,
  /місячна хвороба/i,
  /зачарований сон/i,
  /втрата пам['’]яті/i,
  /психічна рана/i,
  /хронічний гайморит/i,
  /глаукома/i,
  /катаракта/i,
  /псоріатичний артрит/i,
  /ревматоїдний артрит/i,
  /ХОЗЛ/i,
  /аритмія/i,
  /фібриляція/i,
  /синдром кріосну/i,
  /кисневе голодування/i,
  /електромагнітне опромінення/i,
  /аутоімунний тиреоїдит/i
];

const MILD_PATTERNS = [
  /заїкання/i,
  /дислекс/i,
  /порушення мови/i,
  /не відчуває смаку/i,
  /синдром аспергера/i,
  /синдром туретта/i,
  /протез/i,
  /відсутність кінцівки/i,
  /чхає/i,
  /гикає/i,
  /світиться ніс/i,
  /раз на день перетворюється/i,
  /невгамовний сміх/i,
  /безсмертна туга/i,
  /магічна алергія/i,
  /не відчуває болю/i,
  /може спати з відкритими очима/i,
  /чує кольори/i,
  /бачить звуки/i,
  /головний біль/i,
  /застуда/i,
  /нежить/i,
  /кашель/i,
  /грип/i,
  /ангін/i,
  /гайморит/i,
  /алергічн/i,
  /розтягнення/i,
  /вивих/i,
  /струс мозку/i,
  /рвана рана/i,
  /опік 1/i,
  /псоріаз/i,
  /екзема/i
];

const TREATMENT_ITEM_PATTERNS = [
  { regex: /польова аптечка|велика аптечка|медичний набір|набір першої допомоги|хірургічний набір|реанімаційний набір/i, uses: 4, potency: 3, label: "повна аптечка" },
  { regex: /аптечка|ліки|медикамент|антибіотик|антидот|знеболюваль|протизапальне|жарознижувальне|фармацевтич/i, uses: 3, potency: 2, label: "лікувальний набір" },
  { regex: /лікувальн(і|их) трав|аптечка з травами|цілющі трави|еліксир|зілля|настоянка|відвар|настій/i, uses: 3, potency: 2, label: "лікувальний засіб" },
  { regex: /бинт|перев['’]яз|шина|стерильн|марля|лейкопластир|турнікет|гемостатичний/i, uses: 2, potency: 1, label: "перев’язувальний засіб" },
  { regex: /медичн(ий|а) дрон|наномед|автодок|регенератор|медична станція|медблок/i, uses: 4, potency: 4, label: "медична система" },
  { regex: /хірургічн(ий|а)|скальпель|затискач|голка|шовний матеріал/i, uses: 2, potency: 3, label: "хірургічний інструмент" },
  { regex: /радіаційн(ий|а) аптечка|йодид калію|антирадін/i, uses: 2, potency: 3, label: "протирадіаційний засіб" },
  { regex: /протиотрута|антидот|сироватка|вакцин/i, uses: 2, potency: 3, label: "антидот" },
  { regex: /магічн(ий|а) амулет|оберіг|руна здоров'я|свята вода/i, uses: 3, potency: 2, label: "магічний захист" },
  { regex: /антипаразитарн(ий|а)|протиглистн(ий|а)|дезінфекційний/i, uses: 2, potency: 2, label: "протипаразитарний засіб" },
  { regex: /заспокійлив(ий|а)|седативн(ий|а)|снотворн(ий|а)|антидепресант/i, uses: 2, potency: 1, label: "психотропний засіб" },
  { regex: /вітамінн(ий|а)|мінеральн(ий|а)|добавка|препарат заліза/i, uses: 2, potency: 1, label: "вітамінний комплекс" }
];

const MEDICAL_COMPETENCE_PATTERN = /лікар|медик|фельдшер|парамедик|хірург|терапевт|фармацевт|цілител|знахар|травник|ветеринар|перша допомога|домедичн|зцілення ран|медицина|медсестр|санітар|алхімік|аптекар|доктор|професор медицини|нейрохірург|травматолог|психіатр|стоматолог|окуліст|отоларинголог|уролог|гінеколог|акушер|хірург-трансплантолог|реаніматолог|пульмонолог|кардіолог|гастроентеролог|невролог|ендокринолог|дерматолог|онколог|радіолог/i;

// === НОВІ ФУНКЦІЇ ДЛЯ РОБОТИ З МЕДИЧНИМИ СТАНАМИ ===

function getAllConditions() {
  const all = [];
  for (const category in MEDICAL_CONDITIONS) {
    all.push(...MEDICAL_CONDITIONS[category]);
  }
  return all;
}

function findConditionByName(name) {
  const text = String(name || "").toLowerCase();
  const all = getAllConditions();
  return all.find(cond => text.includes(cond.name.toLowerCase())) || null;
}

function getConditionsBySeverity(severity) {
  const all = getAllConditions();
  return all.filter(cond => cond.severity === severity);
}

function getConditionsByType(type) {
  const all = getAllConditions();
  return all.filter(cond => cond.type === type);
}

function getContagiousConditions() {
  const all = getAllConditions();
  return all.filter(cond => cond.contagious === true);
}

function getTreatableConditions() {
  const all = getAllConditions();
  return all.filter(cond => cond.treatable === true);
}

function getProgressiveConditions() {
  const all = getAllConditions();
  return all.filter(cond => cond.progressive === true);
}

function getRandomCondition(severity) {
  const all = getAllConditions();
  const filtered = severity !== undefined ? all.filter(cond => cond.severity === severity) : all;
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function getRandomConditionByType(type) {
  const filtered = getConditionsByType(type);
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function getTreatmentEffectiveness(condition, treatmentType) {
  const map = {
    "Інфекційний": { "антибіотик": 0.8, "протизапальне": 0.4, "антидот": 0.6 },
    "Хронічний": { "протизапальне": 0.3, "вітамінний": 0.2, "знеболювальне": 0.5 },
    "Онкологічний": { "хірургічний": 0.6, "радіаційний": 0.4, "хіміотерапія": 0.5 },
    "Травма": { "хірургічний": 0.7, "перев'язувальний": 0.5, "знеболювальне": 0.3 },
    "Психічний": { "психотропний": 0.6, "заспокійливе": 0.5, "терапія": 0.4 },
    "Магічний": { "магічний захист": 0.6, "свята вода": 0.5, "руна": 0.4 },
    "Техногенний": { "протирадіаційний": 0.7, "антидот": 0.5, "хірургічний": 0.4 },
    "Екзотичний": { "магічний захист": 0.3, "антидот": 0.3, "хірургічний": 0.2 }
  };
  const typeMap = map[condition?.type] || map["Хронічний"];
  return typeMap[treatmentType] || 0.3;
}

function getMortalityRisk(condition) {
  const severity = condition?.severity || 0;
  const meta = severityMeta(severity);
  return meta.mortality || 0;
}

function getTreatmentCost(condition) {
  const severity = condition?.severity || 0;
  const baseCost = [0, 5, 10, 20, 40, 80];
  return baseCost[Math.min(severity, 5)];
}

function getRecoveryTime(condition) {
  const severity = condition?.severity || 0;
  const baseTime = [0, 1, 3, 7, 14, 30];
  return baseTime[Math.min(severity, 5)];
}

function getSymptomDescription(condition) {
  const descriptions = {
    "Інфекційний": "Підвищена температура, слабкість, кашель, біль у м'язах, озноб.",
    "Хронічний": "Постійний біль, втома, обмеження рухливості, погіршення самопочуття.",
    "Онкологічний": "Біль, виснаження, втрата ваги, кровотечі, зниження імунітету.",
    "Травма": "Біль у місці ушкодження, набряк, обмеження рухливості, кровотеча.",
    "Психічний": "Перепади настрою, тривожність, галюцинації, порушення сну, відчуженість.",
    "Магічний": "Містичні зміни, аномальні явища, втрата контролю над силою, прокляття.",
    "Техногенний": "Променеве ураження, кібернетичні збої, вплив технологій на організм.",
    "Екзотичний": "Рідкісні феномени, мутації, нестандартна фізіологія."
  };
  return descriptions[condition?.type] || "Загальне погіршення самопочуття.";
}

function severityMeta(level) {
  return SEVERITY_LEVELS[Math.max(0, Math.min(5, Number(level) || 0))];
}

function inferSeverity(name) {
  const text = String(name || "");
  if (/безплід/i.test(text)) return 0;
  if (!text || HEALTHY_PATTERNS.some((regex) => regex.test(text))) return 0;
  if (CRITICAL_PATTERNS.some((regex) => regex.test(text))) return 4;
  if (SEVERE_PATTERNS.some((regex) => regex.test(text))) return 3;
  if (MODERATE_PATTERNS.some((regex) => regex.test(text))) return 2;
  if (MILD_PATTERNS.some((regex) => regex.test(text))) return 1;
  return 1;
}

function inferDiseaseType(name) {
  const text = String(name || "").toLocaleLowerCase("uk");
  if (/проклят|магі|душ|чума|кам[’']яні|тінь|зачар|перетвор|вампір|вовк|оберіг|святий/.test(text)) return "Магічний стан";
  if (/радіац|промен|кріо|гравітац|кібер|нейро|генет|нанороб|синтетич|штучн|клоно|дрон|автодок/.test(text)) return "Техногенний стан";
  if (/астма|туберк|вірус|гепат|віл|чума|зараж|паразит|лихоманк|грип|ангіна|пневмон|гайморит/.test(text)) return "Інфекційний або респіраторний стан";
  if (/серц|гіпертон|гіпотон|діабет|аутоімун|паркінсон|склероз|артрит|остеопороз|фіброміалг|альцгейм/.test(text)) return "Хронічне захворювання";
  if (/безплід|стерильн/.test(text)) return "Репродуктивний стан";
  if (/сліп|зір|глух|протез|кінцівк|мови|заїкан|дислекс|турет|аспергер|аутизм/.test(text)) return "Фізіологічна особливість";
  if (/рак|онколог|лейкоз|лімфом|меланом|метастаз/.test(text)) return "Онкологічне захворювання";
  if (/депрес|тривож|птср|псих|парано|шизофрен|біполяр|панічн|нарколепс|безсонн/.test(text)) return "Психічний стан";
  return "Медичний стан";
}

function buildMedicalCondition(healthName) {
  const severity = inferSeverity(healthName);
  const meta = severityMeta(severity);
  const condition = findConditionByName(healthName) || { type: inferDiseaseType(healthName) };
  
  return {
    id: `condition_${String(healthName || "none").toLocaleLowerCase("uk").replace(/[^a-zа-яіїєґ0-9]+/giu, "_").slice(0, 48)}`,
    name: String(healthName || "Цілком здоровий"),
    type: condition.type || inferDiseaseType(healthName),
    severity,
    initialSeverity: severity,
    treatedRound: null,
    treatmentsReceived: 0,
    failedTreatments: 0,
    stableRounds: 0,
    worsenedRounds: 0,
    contagious: condition.contagious || false,
    treatable: condition.treatable || severity < 4,
    progressive: condition.progressive || severity > 2,
    mortality: getMortalityRisk(condition),
    symptoms: getSymptomDescription(condition),
    recoveryTime: getRecoveryTime(condition),
    treatmentCost: getTreatmentCost(condition),
    description: /безплід/i.test(String(healthName || ""))
      ? "Безпліддя не погіршує фізичну працездатність і не є активною хворобою. Воно лише означає, що персонаж не братиме участі в біологічному зачатті у фінальній демографічній симуляції."
      : severity === 0
        ? "Активна хвороба не виявлена. Персонаж усе ще може отримати травму або виснаження під час подій та експедицій."
        : `${meta.name} тяжкість. ${getSymptomDescription(condition)} Без належного лікування стан може посилюватися наприкінці раунду та знижує ефективність у складних завданнях.`
  };
}

function treatmentItemMeta(name) {
  const match = TREATMENT_ITEM_PATTERNS.find((entry) => entry.regex.test(String(name || "")));
  return match ? { uses: match.uses, potency: match.potency, label: match.label } : null;
}

function hasMedicalCompetence(character) {
  return [character?.profession, character?.skill, character?.hobby]
    .some((value) => MEDICAL_COMPETENCE_PATTERN.test(String(value || "")));
}

// === НОВІ ФУНКЦІЇ ДЛЯ ДИНАМІКИ ХВОРОБ ===

function applyProgression(condition, rounds) {
  if (!condition || !condition.progressive) return condition;
  const progression = severityMeta(condition.severity).progression;
  const newSeverity = Math.min(5, condition.severity + progression * rounds);
  return { ...condition, severity: Math.round(newSeverity * 10) / 10 };
}

function applyTreatment(condition, treatment, competence) {
  if (!condition || condition.severity === 0) return condition;
  const effectiveness = getTreatmentEffectiveness(condition, treatment?.label || "");
  const competenceBonus = competence ? 0.3 : 0;
  const total = Math.min(1, effectiveness + competenceBonus);
  const reduction = condition.severity * total * 0.5;
  const newSeverity = Math.max(0, condition.severity - reduction);
  return {
    ...condition,
    severity: Math.round(newSeverity * 10) / 10,
    treatmentsReceived: (condition.treatmentsReceived || 0) + 1
  };
}

function getIsolationRequirement(condition) {
  if (!condition || !condition.contagious) return false;
  return condition.severity > 2;
}

function getQuarantinePeriod(condition) {
  if (!condition || !condition.contagious) return 0;
  return Math.max(3, 7 - condition.severity);
}

module.exports = {
  SEVERITY_LEVELS,
  severityMeta,
  buildMedicalCondition,
  treatmentItemMeta,
  hasMedicalCompetence,
  getAllConditions,
  findConditionByName,
  getConditionsBySeverity,
  getConditionsByType,
  getContagiousConditions,
  getTreatableConditions,
  getProgressiveConditions,
  getRandomCondition,
  getRandomConditionByType,
  getTreatmentEffectiveness,
  getMortalityRisk,
  getTreatmentCost,
  getRecoveryTime,
  getSymptomDescription,
  applyProgression,
  applyTreatment,
  getIsolationRequirement,
  getQuarantinePeriod
};
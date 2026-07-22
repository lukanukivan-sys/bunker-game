# Редакторський аудит контенту 1.2.10

Згенеровано: 2026-07-22T18:14:34.509Z

## Покриття

- Проаналізовано текстових полів: **9439**.
- Сетингів: **7**.
- Подій: **184**.
- Експедицій: **340**.

## Автоматичні сигнали

- Точні або нормалізовані дублікати довгих фраз: **1484**.
- Підозрілі російські конструкції: **0**.
- Непояснено англомовні довгі фрагменти: **0**.
- Варіанти подій без механічного наслідку: **0**.

### Найчастіші дублікати

- **×152** Довгострокове виживання залежить від компетенцій групи, запасів, здатності адаптувати правила та вчасно відрізняти реальну загрозу від хаотичної нісенітниці.
  - `LORE.CATASTROPHE_LORE.Війна останніх драконів.horizon`; `LORE.CATASTROPHE_LORE.Повстання неживих лісів.horizon`; `LORE.CATASTROPHE_LORE.Витік сирої мани.horizon`; `LORE.CATASTROPHE_LORE.Пекельна брама під столицею.horizon`; …
- **×48** Рідкісний актив, який покращує шанси громади у фінальній симуляції.
  - `EXPEDITIONS.postapocalypse[0].asset.description`; `EXPEDITIONS.postapocalypse[1].asset.description`; `EXPEDITIONS.postapocalypse[2].asset.description`; `EXPEDITIONS.postapocalypse[3].asset.description`; …
- **×32** Довгострокове виживання залежить від збереження ресурсів, компетентної команди та здатності вчасно викрити приховану загрозу.
  - `LORE.CATASTROPHE_LORE.Радіаційна буря.horizon`; `LORE.CATASTROPHE_LORE.Війна фракцій за воду.horizon`; `LORE.CATASTROPHE_LORE.Мутаційна чума.horizon`; `LORE.CATASTROPHE_LORE.Велика посуха пустки.horizon`; …
- **×32** Ізоляція спрацювала, основні системи залишилися стабільними.
  - `EVENTS.postapocalypse[0].choices[1].goodText`; `EVENTS.postapocalypse[1].choices[1].goodText`; `EVENTS.postapocalypse[2].choices[1].goodText`; `EVENTS.postapocalypse[3].choices[1].goodText`; …
- **×32** Команда втратила час і посилила напруження.
  - `EVENTS.postapocalypse[0].choices[0].badText`; `EVENTS.postapocalypse[1].choices[0].badText`; `EVENTS.postapocalypse[2].choices[0].badText`; `EVENTS.postapocalypse[3].choices[0].badText`; …
- **×32** Перевірка дала корисний результат і локалізувала загрозу.
  - `EVENTS.postapocalypse[0].choices[0].goodText`; `EVENTS.postapocalypse[1].choices[0].goodText`; `EVENTS.postapocalypse[2].choices[0].goodText`; `EVENTS.postapocalypse[3].choices[0].goodText`; …
- **×32** Проблема поширилася до завершення ізоляції.
  - `EVENTS.postapocalypse[0].choices[1].badText`; `EVENTS.postapocalypse[1].choices[1].badText`; `EVENTS.postapocalypse[2].choices[1].badText`; `EVENTS.postapocalypse[3].choices[1].badText`; …
- **×7** Антирадіаційні препарати
  - `SETTINGS.postapocalypse.items[10].name`; `SETTINGS.postapocalypse.shelters[0].provisions[3].name`; `SETTINGS.postapocalypse.shelters[1].provisions[3].name`; `SETTINGS.postapocalypse.shelters[2].provisions[3].name`; …
- **×6** Запасні нейромодулі
  - `SETTINGS.cyberpunk.shelters[0].provisions[6].name`; `SETTINGS.cyberpunk.shelters[1].provisions[6].name`; `SETTINGS.cyberpunk.shelters[2].provisions[6].name`; `SETTINGS.cyberpunk.shelters[3].provisions[6].name`; …
- **×6** Кімната спостереження
  - `SETTINGS.horror.shelters[0].rooms[5].name`; `SETTINGS.horror.shelters[1].rooms[5].name`; `SETTINGS.horror.shelters[2].rooms[5].name`; `SETTINGS.horror.shelters[3].rooms[5].name`; …
- **×6** Комплекти для фіксації доказів
  - `SETTINGS.detective.shelters[0].provisions[6].name`; `SETTINGS.detective.shelters[1].provisions[6].name`; `SETTINGS.detective.shelters[2].provisions[6].name`; `SETTINGS.detective.shelters[3].provisions[6].name`; …
- **×6** Ліки загального призначення
  - `SETTINGS.detective.shelters[0].provisions[4].name`; `SETTINGS.detective.shelters[1].provisions[4].name`; `SETTINGS.detective.shelters[2].provisions[4].name`; `SETTINGS.detective.shelters[3].provisions[4].name`; …
- **×6** Наномедичні ін’єктори
  - `SETTINGS.cyberpunk.shelters[0].provisions[3].name`; `SETTINGS.cyberpunk.shelters[1].provisions[3].name`; `SETTINGS.cyberpunk.shelters[2].provisions[3].name`; `SETTINGS.cyberpunk.shelters[3].provisions[3].name`; …
- **×6** Рециркульована вода
  - `SETTINGS.cyberpunk.shelters[0].provisions[0].name`; `SETTINGS.cyberpunk.shelters[1].provisions[0].name`; `SETTINGS.cyberpunk.shelters[2].provisions[0].name`; `SETTINGS.cyberpunk.shelters[3].provisions[0].name`; …
- **×6** Свічки та лампове масло
  - `SETTINGS.horror.shelters[0].provisions[6].name`; `SETTINGS.horror.shelters[1].provisions[6].name`; `SETTINGS.horror.shelters[2].provisions[6].name`; `SETTINGS.horror.shelters[3].provisions[6].name`; …
- **×6** Стерильні біопакети
  - `SETTINGS.cyberpunk.shelters[0].provisions[4].name`; `SETTINGS.cyberpunk.shelters[1].provisions[4].name`; `SETTINGS.cyberpunk.shelters[2].provisions[4].name`; `SETTINGS.cyberpunk.shelters[3].provisions[4].name`; …
- **×6** Технічна майстерня
  - `SETTINGS.cyberpunk.shelters[0].rooms[2].name`; `SETTINGS.cyberpunk.shelters[1].rooms[2].name`; `SETTINGS.cyberpunk.shelters[2].rooms[2].name`; `SETTINGS.cyberpunk.shelters[3].rooms[2].name`; …
- **×5** Дає +32% до наступної експедиції та захищає її учасників від травм, але не гарантує успіху.
  - `COMMON.abilities[77].description`; `COMMON.abilities[83].description`; `COMMON.abilities[84].description`; `COMMON.abilities[85].description`; …
- **×4** Бензиновий культ перекрив дороги
  - `SETTINGS.postapocalypse.catastrophes[16].title`; `SCENARIOS.DATA.postapocalypse.causes[13].title`; `STAGE23.settings.postapocalypse.catastrophes[8].title`; `STAGE23.scenarioCauses.postapocalypse[8].title`
- **×4** Біржовий крах життєзабезпечення
  - `SETTINGS.cyberpunk.catastrophes[8].title`; `SCENARIOS.DATA.cyberpunk.causes[5].title`; `STAGE23.settings.cyberpunk.catastrophes[0].title`; `STAGE23.scenarioCauses.cyberpunk[0].title`
- **×4** Бюрократична заборона гравітації
  - `SETTINGS.space.catastrophes[15].title`; `SCENARIOS.DATA.space.causes[15].title`; `STAGE23.settings.space.catastrophes[9].title`; `STAGE23.scenarioCauses.space[9].title`
- **×4** Великий страйк гоблінів
  - `SETTINGS.fantasy.catastrophes[15].title`; `SCENARIOS.DATA.fantasy.causes[15].title`; `STAGE23.settings.fantasy.catastrophes[9].title`; `STAGE23.scenarioCauses.fantasy[9].title`
- **×4** Викрадення цифрових особистостей
  - `SETTINGS.cyberpunk.catastrophes[12].title`; `SCENARIOS.DATA.cyberpunk.causes[9].title`; `STAGE23.settings.cyberpunk.catastrophes[4].title`; `STAGE23.scenarioCauses.cyberpunk[4].title`
- **×4** Війна дронових роїв
  - `SETTINGS.cyberpunk.catastrophes[11].title`; `SCENARIOS.DATA.cyberpunk.causes[8].title`; `STAGE23.settings.cyberpunk.catastrophes[3].title`; `STAGE23.scenarioCauses.cyberpunk[3].title`
- **×4** Війна за воду комет
  - `SETTINGS.space.catastrophes[9].title`; `SCENARIOS.DATA.space.causes[9].title`; `STAGE23.settings.space.catastrophes[3].title`; `STAGE23.scenarioCauses.space[3].title`
- **×4** Війна за насіннєвий банк
  - `SETTINGS.postapocalypse.catastrophes[9].title`; `SCENARIOS.DATA.postapocalypse.causes[6].title`; `STAGE23.settings.postapocalypse.catastrophes[1].title`; `STAGE23.scenarioCauses.postapocalypse[1].title`
- **×4** Війна останніх драконів
  - `SETTINGS.fantasy.catastrophes[6].title`; `SCENARIOS.DATA.fantasy.causes[6].title`; `STAGE23.settings.fantasy.catastrophes[0].title`; `STAGE23.scenarioCauses.fantasy[0].title`
- **×4** Гравітаційний шторм
  - `SETTINGS.space.catastrophes[8].title`; `SCENARIOS.DATA.space.causes[8].title`; `STAGE23.settings.space.catastrophes[2].title`; `STAGE23.scenarioCauses.space[2].title`
- **×4** Гуси-мутанти створили митницю
  - `SETTINGS.postapocalypse.catastrophes[18].title`; `SCENARIOS.DATA.postapocalypse.causes[15].title`; `STAGE23.settings.postapocalypse.catastrophes[10].title`; `STAGE23.scenarioCauses.postapocalypse[10].title`
- **×4** Двері у неправильний будинок
  - `SETTINGS.horror.catastrophes[10].title`; `SCENARIOS.DATA.horror.causes[7].title`; `STAGE23.settings.horror.catastrophes[2].title`; `STAGE23.scenarioCauses.horror[2].title`

### Повторювані початки конструкцій

- **×184** «перші години минули в…»
- **×184** «довгострокове виживання залежить від…»
- **×152** «на поверхні або в…»
- **×144** «тематичний актив із маршруту…»
- **×48** «рідкісний актив який покращує…»
- **×32** «перевірка дала корисний результат…»
- **×32** «команда втратила час і…»
- **×32** «ізоляція спрацювала основні системи…»
- **×32** «проблема поширилася до завершення…»
- **×32** «зовнішнє середовище або закритий…»
- **×25** «вважає що гравець name…»
- **×19** «переконаний / переконана що…»
- **×11** «гравець name єдиний хто…»
- **×10** «гравець name його /…»
- **×9** «упевнений / упевнена що…»
- **×8** «разом із гравцем name…»
- **×6** «свічки та лампове масло…»
- **×6** «комплекти для фіксації доказів…»

### Мовні сигнали

Російських канцелярських маркерів не знайдено.

Непояснено англомовних довгих фрагментів не знайдено.

### Події без ефекту

Усі перевірені варіанти подій мають механічні наслідки.

## Стратифікована редакторська вибірка

Нижче автоматично сформовано по три записи з початку, середини й кінця ключових категорій кожного сетингу. Це дає відтворювану вибірку для живої редакторської перевірки гумору, природності української та відповідності опису механіці.

- **modern / professions:** Парамедик
- **modern / professions:** Прокурор
- **modern / professions:** Професійний вигадувач нових кольорів
- **modern / skills:** Перша допомога
- **modern / skills:** Вміння маскуватися
- **modern / skills:** Вміє говорити з вогнем
- **modern / items:** Польова аптечка
- **modern / items:** Набір стерильних перев'язувальних матеріалів
- **modern / items:** Шапка-невидимка (видно тільки шапку)
- **modern / secrets:** Колись працював у цьому сховищі
- **modern / secrets:** Має таємну родину
- **modern / secrets:** Він — єдиний, хто може врятувати людство
- **modern / shelters:** Сховище цивільної оборони
- **modern / shelters:** Аграрне сховище
- **modern / shelters:** Шахтний комплекс
- **fantasy / professions:** Польовий цілитель
- **fantasy / professions:** Паладин
- **fantasy / professions:** Той, хто говорить зі статуями
- **fantasy / skills:** Зцілення ран
- **fantasy / skills:** Ворожіння
- **fantasy / skills:** Може перетворювати воду на вино (тільки навпаки)
- **fantasy / items:** Сумка лікувальних трав
- **fantasy / items:** Плащ
- **fantasy / items:** Священний еліксир від хвороб
- **fantasy / secrets:** Має кров правлячої династії
- **fantasy / secrets:** Вкрав скарб
- **fantasy / secrets:** Його тінь — це окрема істота
- **fantasy / shelters:** Рунна цитадель
- **fantasy / shelters:** Башта чарівника
- **fantasy / shelters:** Печера гномів
- **space / professions:** Корабельний лікар
- **space / professions:** Космолог
- **space / professions:** Сертифікований спостерігач за снами
- **space / skills:** Польова медицина
- **space / skills:** Переговори
- **space / skills:** Розуміє мову зірок
- **space / items:** Медичний нанонабір
- **space / items:** Мікроскоп
- **space / items:** Кріоаптечка
- **space / secrets:** Є нелегальним клоном
- **space / secrets:** Був частиною експерименту
- **space / secrets:** Він — єдиний, хто може спілкуватися з зірками
- **space / shelters:** Колоніальний ковчег
- **space / shelters:** Космічна база
- **space / shelters:** Наукова станція
- **postapocalypse / professions:** Польовий медик
- **postapocalypse / professions:** Хімік-фільтрувальник
- **postapocalypse / professions:** Археолог супермаркетних знижок
- **postapocalypse / skills:** Пошук безпечних маршрутів
- **postapocalypse / skills:** Знання фракцій пустки
- **postapocalypse / skills:** Вміє заряджати батарейку погрозами
- **postapocalypse / items:** Дозиметр
- **postapocalypse / items:** Комплект хімзахисту
- **postapocalypse / items:** Священна банка тушонки без ключа
- **postapocalypse / secrets:** Колись належав до банди рейдерів
- **postapocalypse / secrets:** Підробив документи фракції
- **postapocalypse / secrets:** Таємно видає ліцензії на володіння пакетами
- **postapocalypse / shelters:** Фортеця зі старого елеватора
- **postapocalypse / shelters:** Сховище військового анклаву
- **postapocalypse / shelters:** Плавуча комуна
- **cyberpunk / professions:** Нетраннер
- **cyberpunk / professions:** Охоронець корпорації
- **cyberpunk / professions:** Інфлюенсер аварійного виходу
- **cyberpunk / skills:** Злам захищених мереж
- **cyberpunk / skills:** Аналіз нейрозаписів
- **cyberpunk / skills:** Переконує CAPTCHA, що вона людина
- **cyberpunk / items:** Дека нетраннера
- **cyberpunk / items:** Набір стерильних ін’єкторів
- **cyberpunk / items:** Преміум-дверна ручка без підписки
- **cyberpunk / secrets:** Працює на конкуруючу корпорацію
- **cyberpunk / secrets:** Його тіло орендоване корпорацією
- **cyberpunk / secrets:** Насправді є сімейним тарифом із трьох людей
- **cyberpunk / shelters:** Корпоративний дата-бункер
- **cyberpunk / shelters:** Станція підземного маглева
- **cyberpunk / shelters:** Орбітальний пентхаус
- **horror / professions:** Психіатр
- **horror / professions:** Перекладач давніх мов
- **horror / professions:** Терапевт для портретів
- **horror / skills:** Кризова психологічна допомога
- **horror / skills:** Ведення допиту
- **horror / skills:** Може виселити привида за несплату комунальних послуг
- **horror / items:** Потужний ліхтар
- **horror / items:** Польовий мікроскоп
- **horror / items:** Свята вода зі смаком лимона
- **horror / secrets:** Уже бачив істоту до початку подій
- **horror / secrets:** Не відображається на старих фотографіях
- **horror / secrets:** Таємно здає кімнату монстру подобово
- **horror / shelters:** Монастир святого мовчання
- **horror / shelters:** Архів окультного товариства
- **horror / shelters:** Маєток із замурованим крилом
- **detective / professions:** Слідчий
- **detective / professions:** Радист
- **detective / professions:** Судовий експерт із настрою сиру
- **detective / skills:** Огляд місця злочину
- **detective / skills:** Знання кримінального права
- **detective / skills:** Відновлює алібі за крихтами печива
- **detective / items:** Набір криміналіста
- **detective / items:** Розірвана фотографія
- **detective / items:** Ордер на обшук холодильника
- **detective / secrets:** Знищив один із другорядних доказів
- **detective / secrets:** Таємно стежив за одним із учасників
- **detective / secrets:** Насправді він і є кімната без дверей
- **detective / shelters:** Закритий урядовий комплекс
- **detective / shelters:** Острівна лабораторія
- **detective / shelters:** Архівний центр міста

## Правило випуску

Автоматичний аудит блокує реліз лише за структурної помилки: відсутнього механічного наслідку події або явного неукраїнського службового тексту. Дублікати та повторювані конструкції залишаються редакторськими попередженнями, бо частина повторів може бути навмисною.

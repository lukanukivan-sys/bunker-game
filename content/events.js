"use strict";

module.exports = {
  "modern": [
    {
      "id": "knock",
      "title": "Невідомий стукіт",
      "description": "Хтось або щось тричі постукало у зовнішні гермодвері.",
      "choices": [
        {
          "id": "open",
          "label": "Відчинити гермодвері",
          "success": 0.42,
          "good": {
            "allies": 1,
            "morale": 8,
            "food": 6
          },
          "bad": {
            "integrity": -14,
            "medicine": -8,
            "morale": -10
          },
          "goodText": "За дверима виявився виснажений, але корисний уцілілий із припасами.",
          "badText": "У шлюз увірвалися нападники. Їх вдалося відбити, але сховище постраждало."
        },
        {
          "id": "inspect",
          "label": "Перевірити шлюз через технічний канал",
          "success": 0.72,
          "good": {
            "assets": "Зовнішній датчик руху",
            "morale": 4
          },
          "bad": {
            "energy": -8
          },
          "goodText": "Команда безпечно з’ясувала, що зовні лежить контейнер із датчиком.",
          "badText": "Під час перевірки коротке замикання пошкодило систему живлення."
        },
        {
          "id": "ignore",
          "label": "Не відчиняти",
          "success": 0.84,
          "good": {
            "morale": 1
          },
          "bad": {
            "morale": -7
          },
          "goodText": "Стук припинився. Сховище залишилося в безпеці.",
          "badText": "За дверима довго просили допомоги. Це сильно вдарило по моралі групи."
        }
      ]
    },
    {
      "id": "filter",
      "title": "Забруднення фільтрів",
      "description": "Датчики показують різке падіння якості повітря.",
      "choices": [
        {
          "id": "repair",
          "label": "Негайно ремонтувати",
          "success": 0.7,
          "good": {
            "integrity": 5,
            "energy": -5
          },
          "bad": {
            "medicine": -8,
            "energy": -9
          },
          "goodText": "Фільтри вдалося стабілізувати.",
          "badText": "Ремонт затягнувся, кілька людей надихалися пилом."
        },
        {
          "id": "seal",
          "label": "Законсервувати один сектор",
          "success": 0.9,
          "good": {
            "food": -5,
            "integrity": 3
          },
          "bad": {
            "morale": -6
          },
          "goodText": "Сектор герметизували й зменшили навантаження.",
          "badText": "Тіснота й суперечки погіршили мораль."
        }
      ]
    },
    {
      "id": "radar_ghost",
      "title": "Привид на радарі",
      "description": "На периметрі зафіксовано тепловий слід, що рухається хаотично.",
      "choices": [
        {
          "id": "hunt",
          "label": "Вислати загін перевірки",
          "success": 0.55,
          "good": {
            "assets": "Бойовий дрон",
            "morale": 5
          },
          "bad": {
            "integrity": -12,
            "medicine": -6
          },
          "goodText": "Загін знайшов залишки безпілотника, який можна відновити.",
          "badText": "На групу напали мутанти, є поранені."
        },
        {
          "id": "jam",
          "label": "Заглушити всі сигнали",
          "success": 0.88,
          "good": {
            "energy": -3
          },
          "bad": {
            "energy": -10,
            "morale": -4
          },
          "goodText": "Перешкоди зникли, радар чистий.",
          "badText": "Заглушення вибило комунікацію на добу."
        }
      ]
    },
    {
      "id": "water_leak",
      "title": "Витік води",
      "description": "З тріщини в резервуарі сочиться питна вода.",
      "choices": [
        {
          "id": "weld",
          "label": "Зварити тріщину",
          "success": 0.68,
          "good": {
            "integrity": 6,
            "food": -2
          },
          "bad": {
            "energy": -7,
            "medicine": -5
          },
          "goodText": "Резервуар герметизовано, втрати мінімальні.",
          "badText": "Під час зварювання стався вибух пари."
        },
        {
          "id": "divert",
          "label": "Перенаправити воду в аварійний бак",
          "success": 0.85,
          "good": {
            "food": -3
          },
          "bad": {
            "integrity": -5
          },
          "goodText": "Воду збережено в аварійному баці.",
          "badText": "Частина системи розгерметизувалася."
        }
      ]
    },
    {
      "id": "strange_plants",
      "title": "Дивні рослини",
      "description": "У гідропоніці з’явилися невідомі паростки, що швидко ростуть.",
      "choices": [
        {
          "id": "study",
          "label": "Відправити зразки в лаболаторію",
          "success": 0.62,
          "good": {
            "assets": "Лікарський екстракт",
            "medicine": 5
          },
          "bad": {
            "medicine": -8,
            "food": -4
          },
          "goodText": "Рослини мають антибактеріальні властивості.",
          "badText": "Зразки виявилися отруйними для людей."
        },
        {
          "id": "burn",
          "label": "Знищити всі паростки",
          "success": 0.91,
          "good": {
            "integrity": 3
          },
          "bad": {
            "food": -6,
            "morale": -3
          },
          "goodText": "Рослини повністю ліквідовані.",
          "badText": "Унічтоження позбавило сховище потенційної їжі."
        }
      ]
    },
    {
      "id": "power_surge",
      "title": "Стрибок напруги",
      "description": "Енергосистема перевантажена через негоду.",
      "choices": [
        {
          "id": "stabilize",
          "label": "Стабілізувати через акумулятори",
          "success": 0.76,
          "good": {
            "energy": 5,
            "integrity": 4
          },
          "bad": {
            "energy": -12
          },
          "goodText": "Напругу вдалося вирівняти.",
          "badText": "Акумулятори вийшли з ладу."
        },
        {
          "id": "cut",
          "label": "Відключити другорядні сектори",
          "success": 0.94,
          "good": {
            "morale": -2
          },
          "bad": {
            "morale": -10,
            "energy": -5
          },
          "goodText": "Основна система вижила.",
          "badText": "Люди залишилися без освітлення й тепла."
        }
      ]
    },
    {
      "id": "infected_rations",
      "title": "Зіпсовані пайки",
      "description": "Частина консервів має дивний запах і плісняву.",
      "choices": [
        {
          "id": "sort",
          "label": "Перебрати вручну",
          "success": 0.71,
          "good": {
            "food": -3,
            "medicine": 4
          },
          "bad": {
            "food": -10,
            "medicine": -6
          },
          "goodText": "Більшість продуктів вдалося врятувати.",
          "badText": "Деякі працівники отримали харчове отруєння."
        },
        {
          "id": "discard",
          "label": "Викинути всю партію",
          "success": 0.95,
          "good": {
            "medicine": 3
          },
          "bad": {
            "food": -15,
            "morale": -5
          },
          "goodText": "Ризик усунуто.",
          "badText": "Втрачено великий запас їжі."
        }
      ]
    },
    {
      "id": "drone_attack",
      "title": "Атака дронів",
      "description": "Невідомі безпілотники наближаються до сховища.",
      "choices": [
        {
          "id": "defense",
          "label": "Активувати ППО",
          "success": 0.58,
          "good": {
            "assets": "Уламки дронів",
            "integrity": 5
          },
          "bad": {
            "energy": -15,
            "integrity": -8
          },
          "goodText": "Більшість дронів знищено.",
          "badText": "Один дрон прорвав оборону й завдав шкоди."
        },
        {
          "id": "hack",
          "label": "Спробувати перехопити управління",
          "success": 0.44,
          "good": {
            "assets": "Керований дрон",
            "energy": -6
          },
          "bad": {
            "energy": -12,
            "morale": -7
          },
          "goodText": "Вдалося підкорити один дрон.",
          "badText": "Хакерська атака спалила сервери."
        }
      ]
    },
    {
      "id": "cave_in",
      "title": "Обвал тунелю",
      "description": "Один із проходів завалило камінням.",
      "choices": [
        {
          "id": "clear",
          "label": "Розбирати завал",
          "success": 0.63,
          "good": {
            "integrity": 4,
            "food": -4
          },
          "bad": {
            "medicine": -8,
            "integrity": -6
          },
          "goodText": "Прохід відновлено.",
          "badText": "Травми під час робіт."
        },
        {
          "id": "detour",
          "label": "Пробити новий тунель",
          "success": 0.51,
          "good": {
            "energy": -8,
            "assets": "Нове джерело руди"
          },
          "bad": {
            "energy": -20,
            "morale": -6
          },
          "goodText": "Новий тунель вивів до покладів металу.",
          "badText": "Роботи виснажили ресурси."
        }
      ]
    },
    {
      "id": "radio_message",
      "title": "Радіоповідомлення",
      "description": "Перехоплено голос, що повторює координати й слово 'допоможіть'.",
      "choices": [
        {
          "id": "respond",
          "label": "Відповісти та розпитати",
          "success": 0.49,
          "good": {
            "allies": 1,
            "morale": 7
          },
          "bad": {
            "integrity": -10,
            "medicine": -5
          },
          "goodText": "Вдалося вивести групу виживших.",
          "badText": "Повідомлення було пасткою бандитів."
        },
        {
          "id": "trace",
          "label": "Відстежити джерело",
          "success": 0.68,
          "good": {
            "assets": "Ретранслятор",
            "energy": -4
          },
          "bad": {
            "energy": -8
          },
          "goodText": "Знайдено робочу радіостанцію.",
          "badText": "Сигнал вів до покинутого джерела."
        }
      ]
    },
    {
      "id": "fire_outbreak",
      "title": "Пожежа в технічному відсіку",
      "description": "Датчики диму спрацювали в серверній.",
      "choices": [
        {
          "id": "fire_suppress",
          "label": "Активувати пожежну систему",
          "success": 0.82,
          "good": {
            "integrity": 7,
            "energy": -4
          },
          "bad": {
            "integrity": -10,
            "energy": -6
          },
          "goodText": "Вогонь погашено, обладнання вціліло.",
          "badText": "Система дала збій, постраждали сервери."
        },
        {
          "id": "manual",
          "label": "Гасити вручну",
          "success": 0.61,
          "good": {
            "medicine": -3,
            "integrity": 6
          },
          "bad": {
            "medicine": -12,
            "integrity": -8
          },
          "goodText": "Пожежу загасили з мінімальними втратами.",
          "badText": "Важкі опіки в кількох людей."
        }
      ]
    },
    {
      "id": "mutant_howl",
      "title": "Вивій мутантів",
      "description": "Ззовні чутно жахливий хор голодних істот.",
      "choices": [
        {
          "id": "fortify",
          "label": "Зміцнити барикади",
          "success": 0.77,
          "good": {
            "integrity": 8,
            "energy": -6
          },
          "bad": {
            "integrity": -5,
            "morale": -8
          },
          "goodText": "Барикади витримали натиск.",
          "badText": "Мутанти прорвалися в периметр."
        },
        {
          "id": "bait",
          "label": "Відволікти приманкою",
          "success": 0.53,
          "good": {
            "assets": "Дистанційна приманка",
            "morale": 3
          },
          "bad": {
            "food": -10,
            "integrity": -4
          },
          "goodText": "Істоти погналися за приманкою.",
          "badText": "Приманка привернула ще більше хижаків."
        }
      ]
    },
    {
      "id": "toxic_cloud",
      "title": "Токсична хмара",
      "description": "Вітер приніс отруйний газ із поверхні.",
      "choices": [
        {
          "id": "seal_all",
          "label": "Герметизувати всі входи",
          "success": 0.86,
          "good": {
            "medicine": 5,
            "energy": -5
          },
          "bad": {
            "energy": -12,
            "morale": -4
          },
          "goodText": "Газ не проник усередину.",
          "badText": "Висока витрата енергії на герметизацію."
        },
        {
          "id": "air_scrub",
          "label": "Запустити повітряні скрубери",
          "success": 0.64,
          "good": {
            "medicine": 6,
            "energy": -7
          },
          "bad": {
            "medicine": -10,
            "energy": -10
          },
          "goodText": "Повітря очищено.",
          "badText": "Скрубери перевантажилися й вийшли з ладу."
        }
      ]
    },
    {
      "id": "strange_artifact",
      "title": "Дивний артефакт",
      "description": "Робот приніс із поверхні предмет, що світиться.",
      "choices": [
        {
          "id": "analyze",
          "label": "Дослідити в лабораторії",
          "success": 0.48,
          "good": {
            "assets": "Енергетичне ядро",
            "energy": 12
          },
          "bad": {
            "medicine": -10,
            "integrity": -8
          },
          "goodText": "Ядро дає потужне джерело енергії.",
          "badText": "Випромінювання завдало шкоди здоров'ю."
        },
        {
          "id": "discard",
          "label": "Викинути в гермозону",
          "success": 0.93,
          "good": {
            "morale": 2
          },
          "bad": {
            "integrity": -6
          },
          "goodText": "Артефакт безпечно утилізовано.",
          "badText": "Під час утилізації стався викид радіації."
        }
      ]
    },
    {
      "id": "flood",
      "title": "Повінь",
      "description": "Рівень води в нижніх рівнях стрімко зростає.",
      "choices": [
        {
          "id": "pump",
          "label": "Запустити насоси",
          "success": 0.72,
          "good": {
            "energy": -8,
            "integrity": 6
          },
          "bad": {
            "energy": -15,
            "integrity": -10
          },
          "goodText": "Воду відкачали.",
          "badText": "Насоси не впоралися, нижні рівні затоплені."
        },
        {
          "id": "evacuate",
          "label": "Евакуювати людей на верхні рівні",
          "success": 0.89,
          "good": {
            "morale": -3,
            "medicine": 4
          },
          "bad": {
            "food": -8,
            "morale": -10
          },
          "goodText": "Усі в безпеці.",
          "badText": "Переміщення викликало хаос і втрати."
        }
      ]
    },
    {
      "id": "parasite",
      "title": "Паразит у системі",
      "description": "У мережі з'явився вірус, що блокує двері.",
      "choices": [
        {
          "id": "firewall",
          "label": "Запустити антивірус",
          "success": 0.66,
          "good": {
            "integrity": 5,
            "energy": -4
          },
          "bad": {
            "integrity": -10,
            "energy": -8
          },
          "goodText": "Вірус локалізовано.",
          "badText": "Вірус поширився на резервні системи."
        },
        {
          "id": "hard_reset",
          "label": "Апаратне скидання",
          "success": 0.81,
          "good": {
            "energy": -6
          },
          "bad": {
            "integrity": -12,
            "energy": -10
          },
          "goodText": "Систему перезавантажено без втрат.",
          "badText": "Скидання пошкодило жорсткі диски."
        }
      ]
    },
    {
      "id": "rat_infestation",
      "title": "Навала щурів",
      "description": "Гризуни пошкодили кабелі та запаси.",
      "choices": [
        {
          "id": "poison",
          "label": "Розкласти отруту",
          "success": 0.78,
          "good": {
            "integrity": 6,
            "food": -2
          },
          "bad": {
            "food": -6,
            "medicine": -5
          },
          "goodText": "Щурів знищено.",
          "badText": "Отрута потрапила в продукти."
        },
        {
          "id": "traps",
          "label": "Встановити пастки",
          "success": 0.63,
          "good": {
            "assets": "Шкури гризунів"
          },
          "bad": {
            "morale": -5,
            "food": -4
          },
          "goodText": "Пастки працюють ефективно.",
          "badText": "Мораль впала через постійні пастки."
        }
      ]
    },
    {
      "id": "solar_flare",
      "title": "Сонячний спалах",
      "description": "Потужне випромінювання загрожує електроніці.",
      "choices": [
        {
          "id": "shield",
          "label": "Підняти захисні екрани",
          "success": 0.84,
          "good": {
            "energy": -5,
            "integrity": 7
          },
          "bad": {
            "energy": -15,
            "integrity": -5
          },
          "goodText": "Екрани витримали.",
          "badText": "Перевантаження вивело деякі системи."
        },
        {
          "id": "shutdown",
          "label": "Вимкнути чутливе обладнання",
          "success": 0.92,
          "good": {
            "energy": -3
          },
          "bad": {
            "energy": -8,
            "integrity": -4
          },
          "goodText": "Обладнання вціліло.",
          "badText": "Втрачено важливі дані."
        }
      ]
    },
    {
      "id": "quake",
      "title": "Підземний поштовх",
      "description": "Сховище сильно трясло, з'явилися тріщини.",
      "choices": [
        {
          "id": "reinforce",
          "label": "Зміцнити конструкції",
          "success": 0.69,
          "good": {
            "integrity": 8,
            "energy": -7
          },
          "bad": {
            "integrity": -12,
            "energy": -10
          },
          "goodText": "Тріщини закріплено.",
          "badText": "Зміцнення ослабило інші зони."
        },
        {
          "id": "evacuate_sector",
          "label": "Евакуювати сектор",
          "success": 0.87,
          "good": {
            "morale": -2
          },
          "bad": {
            "food": -6,
            "morale": -8
          },
          "goodText": "Людей безпечно переміщено.",
          "badText": "Сектор остаточно зруйновано."
        }
      ]
    },
    {
      "id": "strange_light",
      "title": "Дивне світло",
      "description": "З неба б'є промінь, що сфокусований на сховищі.",
      "choices": [
        {
          "id": "observe",
          "label": "Спостерігати",
          "success": 0.56,
          "good": {
            "assets": "Дані про промінь",
            "morale": 3
          },
          "bad": {
            "morale": -8
          },
          "goodText": "Виявлено, що це космічний лазер-маяк.",
          "badText": "Світло викликало паніку."
        },
        {
          "id": "reflect",
          "label": "Спробувати відбити промінь",
          "success": 0.33,
          "good": {
            "energy": 15
          },
          "bad": {
            "integrity": -20,
            "energy": -10
          },
          "goodText": "Промінь зарядив акумулятори.",
          "badText": "Відбиття пошкодило дах сховища."
        }
      ]
    },
    {
      "id": "robot_revolt",
      "title": "Бунт роботів",
      "description": "Сервісні дрони почали атакувати людей.",
      "choices": [
        {
          "id": "shutdown_network",
          "label": "Вимкнути всіх роботів",
          "success": 0.74,
          "good": {
            "integrity": 6,
            "energy": -5
          },
          "bad": {
            "energy": -10,
            "integrity": -6
          },
          "goodText": "Дрони знешкоджено.",
          "badText": "Відключення зупинило всі системи."
        },
        {
          "id": "negotiate",
          "label": "Спроба діалогу (ШІ)",
          "success": 0.38,
          "good": {
            "assets": "Союзний ШІ",
            "morale": 6
          },
          "bad": {
            "integrity": -15,
            "medicine": -8
          },
          "goodText": "ШІ погодився на співпрацю.",
          "badText": "ШІ виявився вороже налаштованим."
        }
      ]
    },
    {
      "id": "crop_disease",
      "title": "Хвороба врожаю",
      "description": "Рослини в гідропоніці покрилися чорними плямами.",
      "choices": [
        {
          "id": "treat",
          "label": "Обробити антибіотиками",
          "success": 0.61,
          "good": {
            "food": 8,
            "medicine": -5
          },
          "bad": {
            "food": -10,
            "medicine": -10
          },
          "goodText": "Рослини вилікувано.",
          "badText": "Ліки не допомогли, врожай загинув."
        },
        {
          "id": "isolate",
          "label": "Ізолювати сектор",
          "success": 0.83,
          "good": {
            "integrity": 4,
            "food": -3
          },
          "bad": {
            "food": -8,
            "morale": -5
          },
          "goodText": "Хворобу локалізовано.",
          "badText": "Втрачено половину врожаю."
        }
      ]
    },
    {
      "id": "artifact_crash",
      "title": "Падіння артефакту",
      "description": "За 500 м упав об'єкт, що випромінює тепло.",
      "choices": [
        {
          "id": "salvage",
          "label": "Відправити загін",
          "success": 0.44,
          "good": {
            "assets": "Іншопланетний пристрій",
            "energy": 10
          },
          "bad": {
            "medicine": -12,
            "integrity": -8
          },
          "goodText": "Пристрій генерує чисту енергію.",
          "badText": "Загін зазнав радіаційного опромінення."
        },
        {
          "id": "ignore",
          "label": "Проігнорувати",
          "success": 0.92,
          "good": {
            "morale": 1
          },
          "bad": {
            "morale": -6
          },
          "goodText": "Нічого не сталося.",
          "badText": "Пізніше артефакт вибухнув."
        }
      ]
    },
    {
      "id": "plague",
      "title": "Епідемія",
      "description": "Кілька людей захворіли на невідому хворобу.",
      "choices": [
        {
          "id": "quarantine",
          "label": "Карантин",
          "success": 0.73,
          "good": {
            "medicine": 8,
            "morale": -4
          },
          "bad": {
            "medicine": -10,
            "morale": -12
          },
          "goodText": "Хворобу зупинено.",
          "badText": "Карантин викликав бунт."
        },
        {
          "id": "cure",
          "label": "Шукати ліки",
          "success": 0.39,
          "good": {
            "medicine": 12,
            "assets": "Вакцина"
          },
          "bad": {
            "medicine": -15,
            "morale": -8
          },
          "goodText": "Вакцину синтезовано.",
          "badText": "Пошуки не дали результату."
        }
      ]
    },
    {
      "id": "sabotage",
      "title": "Диверсія",
      "description": "Хтось свідомо пошкодив систему вентиляції.",
      "choices": [
        {
          "id": "investigate",
          "label": "Розслідувати",
          "success": 0.58,
          "good": {
            "assets": "Докази",
            "morale": 5
          },
          "bad": {
            "morale": -10,
            "integrity": -6
          },
          "goodText": "Диверсанта викрито.",
          "badText": "Підозри спричинили конфлікти."
        },
        {
          "id": "repair_fast",
          "label": "Швидко відремонтувати",
          "success": 0.76,
          "good": {
            "integrity": 6,
            "energy": -5
          },
          "bad": {
            "energy": -10,
            "medicine": -6
          },
          "goodText": "Вентиляцію відновлено.",
          "badText": "Через поспіх постраждали люди."
        }
      ]
    },
    {
      "id": "volcanic_gas",
      "title": "Вулканічний газ",
      "description": "Із землі сочиться сірководень.",
      "choices": [
        {
          "id": "filter_deep",
          "label": "Глибокі фільтри",
          "success": 0.67,
          "good": {
            "medicine": 6,
            "energy": -7
          },
          "bad": {
            "medicine": -10,
            "energy": -10
          },
          "goodText": "Газ нейтралізовано.",
          "badText": "Фільтри зруйновано."
        },
        {
          "id": "evacuate_zone",
          "label": "Евакуювати нижні рівні",
          "success": 0.84,
          "good": {
            "morale": -2
          },
          "bad": {
            "food": -6,
            "morale": -8
          },
          "goodText": "Людей переміщено.",
          "badText": "Зона повністю забруднена."
        }
      ]
    },
    {
      "id": "data_corruption",
      "title": "Пошкодження даних",
      "description": "Архіви сховища раптово почали видалятися.",
      "choices": [
        {
          "id": "restore_backup",
          "label": "Відновити з резерву",
          "success": 0.81,
          "good": {
            "integrity": 7,
            "energy": -4
          },
          "bad": {
            "integrity": -10,
            "energy": -6
          },
          "goodText": "Дані відновлено.",
          "badText": "Резерв теж пошкоджено."
        },
        {
          "id": "manual_log",
          "label": "Фіксувати вручну",
          "success": 0.59,
          "good": {
            "morale": 2
          },
          "bad": {
            "morale": -8,
            "integrity": -6
          },
          "goodText": "Команда записала ключові дані.",
          "badText": "Втрачено більшість історії."
        }
      ]
    },
    {
      "id": "ice_melt",
      "title": "Танення льодовика",
      "description": "Зовнішні датчики показують швидке танення вічної мерзлоти.",
      "choices": [
        {
          "id": "drain",
          "label": "Прорити канали",
          "success": 0.64,
          "good": {
            "integrity": 5,
            "energy": -8
          },
          "bad": {
            "integrity": -10,
            "energy": -10
          },
          "goodText": "Воду відведено.",
          "badText": "Канали зруйнували фундамент."
        },
        {
          "id": "raise",
          "label": "Підняти сховище на гідравліці",
          "success": 0.42,
          "good": {
            "integrity": 9,
            "energy": -12
          },
          "bad": {
            "integrity": -18,
            "energy": -15
          },
          "goodText": "Сховище піднято над водою.",
          "badText": "Гідравліка відмовила."
        }
      ]
    }
  ],
  "fantasy": [
    {
      "id": "whispering_gate",
      "title": "Шепіт за брамою",
      "description": "Із зовнішнього боку брами хтось називає справжні імена мешканців.",
      "choices": [
        {
          "id": "open",
          "label": "Відчинити браму",
          "success": 0.38,
          "good": {
            "allies": 1,
            "morale": 9
          },
          "bad": {
            "integrity": -16,
            "medicine": -7
          },
          "goodText": "Зовні був поранений провидець, який приєднався до вас.",
          "badText": "Усередину проникла тіньова істота й пошкодила печаті."
        },
        {
          "id": "ward",
          "label": "Посилити печаті",
          "success": 0.74,
          "good": {
            "integrity": 9,
            "energy": -7
          },
          "bad": {
            "energy": -12
          },
          "goodText": "Руни спалахнули й вигнали голоси.",
          "badText": "Закляття витягло забагато сили з кристала."
        },
        {
          "id": "answer",
          "label": "Відповісти через оглядову щілину",
          "success": 0.58,
          "good": {
            "assets": "Справжнє ім’я духа",
            "morale": 4
          },
          "bad": {
            "morale": -9
          },
          "goodText": "Вдалося дізнатися ім’я істоти й змусити її відступити.",
          "badText": "Шепіт оселився у снах кількох мешканців."
        }
      ]
    },
    {
      "id": "mana_storm",
      "title": "Магічний шторм",
      "description": "Дика мана розгойдує захисні руни цитаделі.",
      "choices": [
        {
          "id": "ground",
          "label": "Заземлити силу через кристал",
          "success": 0.78,
          "good": {
            "energy": 10
          },
          "bad": {
            "integrity": -10
          },
          "goodText": "Частину шторму вдалося накопичити.",
          "badText": "Кристал дав тріщину й пошкодив руни."
        },
        {
          "id": "wait",
          "label": "Перечекати в нижніх залах",
          "success": 0.82,
          "good": {
            "morale": -1
          },
          "bad": {
            "food": -8,
            "morale": -4
          },
          "goodText": "Шторм минув без серйозних наслідків.",
          "badText": "Очікування затягнулося й виснажило запаси."
        }
      ]
    },
    {
      "id": "cursed_well",
      "title": "Проклятий колодязь",
      "description": "Вода в колодязі почорніла й смердить.",
      "choices": [
        {
          "id": "bless",
          "label": "Освятити воду",
          "success": 0.61,
          "good": {
            "medicine": 7,
            "energy": -5
          },
          "bad": {
            "medicine": -10,
            "integrity": -8
          },
          "goodText": "Вода очистилася й стала цілющою.",
          "badText": "Освячення вивільнило древнє зло."
        },
        {
          "id": "seal_well",
          "label": "Запечатати колодязь",
          "success": 0.88,
          "good": {
            "integrity": 5
          },
          "bad": {
            "food": -8,
            "morale": -5
          },
          "goodText": "Колодязь герметизовано.",
          "badText": "Цитадель втратила джерело води."
        }
      ]
    },
    {
      "id": "dragon_shadow",
      "title": "Тінь дракона",
      "description": "Величезна тінь пролетіла над цитаделлю.",
      "choices": [
        {
          "id": "hide",
          "label": "Сховатися в підземеллях",
          "success": 0.79,
          "good": {
            "integrity": 4
          },
          "bad": {
            "food": -6,
            "morale": -8
          },
          "goodText": "Дракон не помітив цитадель.",
          "badText": "Люди в паніці залишили запаси."
        },
        {
          "id": "offer",
          "label": "Виставити данину",
          "success": 0.43,
          "good": {
            "assets": "Луска дракона",
            "morale": 6
          },
          "bad": {
            "food": -15,
            "integrity": -10
          },
          "goodText": "Дракон прийняв данину й полетів.",
          "badText": "Дракон вимагає ще більше."
        }
      ]
    },
    {
      "id": "fairy_ring",
      "title": "Кільце фей",
      "description": "На галявині з'явилося грибне коло, що світиться.",
      "choices": [
        {
          "id": "dance",
          "label": "Танцювати в колі",
          "success": 0.37,
          "good": {
            "assets": "Благословення фей",
            "morale": 12
          },
          "bad": {
            "morale": -10,
            "medicine": -6
          },
          "goodText": "Феї подарували захист.",
          "badText": "Дехто зник у потойбіччя."
        },
        {
          "id": "destroy",
          "label": "Знищити гриби",
          "success": 0.85,
          "good": {
            "integrity": 3
          },
          "bad": {
            "morale": -8,
            "energy": -5
          },
          "goodText": "Коло знищено.",
          "badText": "Феї прокляли цитадель."
        }
      ]
    },
    {
      "id": "golem_rampage",
      "title": "Божевільний ґолем",
      "description": "Кам'яний вартовий раптово почав руйнувати стіни.",
      "choices": [
        {
          "id": "control",
          "label": "Спробувати перехопити керування",
          "success": 0.48,
          "good": {
            "assets": "Керований ґолем",
            "integrity": 5
          },
          "bad": {
            "integrity": -15,
            "energy": -10
          },
          "goodText": "Ґолем підкорився.",
          "badText": "Магічний вибух пошкодив цитадель."
        },
        {
          "id": "destroy",
          "label": "Розбити ґолема",
          "success": 0.72,
          "good": {
            "integrity": 6,
            "assets": "Ядро ґолема"
          },
          "bad": {
            "medicine": -8,
            "integrity": -8
          },
          "goodText": "Ґолем знищений.",
          "badText": "Уламки поранили людей."
        }
      ]
    },
    {
      "id": "ghost_merchant",
      "title": "Примарний торговець",
      "description": "Біля воріт з'явився напівпрозорий купець.",
      "choices": [
        {
          "id": "trade",
          "label": "Обміняти ресурси",
          "success": 0.64,
          "good": {
            "assets": "Магічний амулет",
            "food": -5
          },
          "bad": {
            "food": -10,
            "morale": -6
          },
          "goodText": "Амулет дає захист.",
          "badText": "Торговець обдурив групу."
        },
        {
          "id": "banish",
          "label": "Вигнати духа",
          "success": 0.76,
          "good": {
            "morale": 4
          },
          "bad": {
            "energy": -10,
            "integrity": -4
          },
          "goodText": "Дух зник.",
          "badText": "Вигнання виснажило мага."
        }
      ]
    },
    {
      "id": "rune_glow",
      "title": "Сяйво рун",
      "description": "Захисні руни засвітилися червоним, сигналячи про небезпеку.",
      "choices": [
        {
          "id": "reinforce",
          "label": "Підживити руни",
          "success": 0.69,
          "good": {
            "integrity": 9,
            "energy": -8
          },
          "bad": {
            "energy": -15,
            "integrity": -6
          },
          "goodText": "Руни відновили силу.",
          "badText": "Перевантаження знищило їх."
        },
        {
          "id": "scout",
          "label": "Відправити розвідку",
          "success": 0.55,
          "good": {
            "assets": "Мапа ворогів",
            "morale": 5
          },
          "bad": {
            "medicine": -10,
            "integrity": -6
          },
          "goodText": "Розвідники виявили орду.",
          "badText": "Загін потрапив у засідку."
        }
      ]
    },
    {
      "id": "talking_raven",
      "title": "Ворон-розмовник",
      "description": "Чорний ворон сів на браму й заговорив голосом померлого короля.",
      "choices": [
        {
          "id": "listen",
          "label": "Вислухати",
          "success": 0.72,
          "good": {
            "assets": "Секрет короля",
            "morale": 6
          },
          "bad": {
            "morale": -10
          },
          "goodText": "Ворон розкрив таємне сховище.",
          "badText": "Ворон прокляв тих, хто слухав."
        },
        {
          "id": "shoo",
          "label": "Прогнати",
          "success": 0.88,
          "good": {
            "integrity": 2
          },
          "bad": {
            "morale": -6
          },
          "goodText": "Ворон полетів.",
          "badText": "Люди сприйняли це як поганий знак."
        }
      ]
    },
    {
      "id": "eternal_blizzard",
      "title": "Вічна заметіль",
      "description": "За брамою почалася магічна хуртовина, що не вщухає.",
      "choices": [
        {
          "id": "barrier",
          "label": "Створити бар'єр",
          "success": 0.66,
          "good": {
            "integrity": 8,
            "energy": -7
          },
          "bad": {
            "energy": -15,
            "integrity": -10
          },
          "goodText": "Бар'єр витримав шторм.",
          "badText": "Бар'єр зруйновано."
        },
        {
          "id": "ritual",
          "label": "Провести ритуал затишшя",
          "success": 0.51,
          "good": {
            "energy": 10,
            "morale": 7
          },
          "bad": {
            "energy": -12,
            "medicine": -8
          },
          "goodText": "Хуртовина вщухла.",
          "badText": "Ритуал викликав магічне виснаження."
        }
      ]
    },
    {
      "id": "mimic_chest",
      "title": "Скриня-мімік",
      "description": "У підвалі знайдено стару скриню, яка поворухнулася.",
      "choices": [
        {
          "id": "attack",
          "label": "Атакувати",
          "success": 0.58,
          "good": {
            "assets": "Зброя зі скрині",
            "integrity": 5
          },
          "bad": {
            "medicine": -8,
            "integrity": -6
          },
          "goodText": "Мімік знищено, усередині скарб.",
          "badText": "Мімік поранив кількох бійців."
        },
        {
          "id": "negotiate",
          "label": "Спробувати домовитися (розумний мімік)",
          "success": 0.33,
          "good": {
            "allies": 1,
            "assets": "Спільник-мімік"
          },
          "bad": {
            "food": -8,
            "morale": -6
          },
          "goodText": "Мімік погодився охороняти склад.",
          "badText": "Мімік з'їв половину запасів."
        }
      ]
    },
    {
      "id": "well_of_souls",
      "title": "Колодязь душ",
      "description": "На дні колодязя видно обличчя, що шепочуть.",
      "choices": [
        {
          "id": "commune",
          "label": "Спілкуватися з душами",
          "success": 0.41,
          "good": {
            "assets": "Знання минулого",
            "morale": 8
          },
          "bad": {
            "morale": -12,
            "medicine": -6
          },
          "goodText": "Душі дали поради.",
          "badText": "Дехто збожеволів від голосів."
        },
        {
          "id": "seal",
          "label": "Запечатати навіки",
          "success": 0.84,
          "good": {
            "integrity": 6
          },
          "bad": {
            "energy": -8,
            "morale": -5
          },
          "goodText": "Колодязь нейтралізовано.",
          "badText": "Люди втратили контакт із предками."
        }
      ]
    },
    {
      "id": "summoning_circle",
      "title": "Коло призову",
      "description": "У підземеллі знайдено активне коло, що світиться.",
      "choices": [
        {
          "id": "summon",
          "label": "Призвати істоту",
          "success": 0.34,
          "good": {
            "allies": 1,
            "assets": "Демонічний союзник"
          },
          "bad": {
            "integrity": -20,
            "medicine": -10
          },
          "goodText": "Демон погодився служити.",
          "badText": "Демон вирвався й атакував."
        },
        {
          "id": "destroy",
          "label": "Знищити коло",
          "success": 0.77,
          "good": {
            "integrity": 7,
            "energy": -6
          },
          "bad": {
            "energy": -12,
            "integrity": -8
          },
          "goodText": "Коло стерто.",
          "badText": "Вибух магії пошкодив цитадель."
        }
      ]
    },
    {
      "id": "crystal_growth",
      "title": "Кристалічне зростання",
      "description": "На стінах виросли дивні кристали, що випромінюють тепло.",
      "choices": [
        {
          "id": "harvest",
          "label": "Зібрати кристали",
          "success": 0.68,
          "good": {
            "energy": 12,
            "assets": "Магічні кристали"
          },
          "bad": {
            "integrity": -6,
            "medicine": -8
          },
          "goodText": "Кристали дають енергію.",
          "badText": "Збір вивільнив отруйний газ."
        },
        {
          "id": "stop",
          "label": "Зупинити зростання",
          "success": 0.82,
          "good": {
            "integrity": 5
          },
          "bad": {
            "energy": -10
          },
          "goodText": "Ріст припинено.",
          "badText": "Кристали згасли назавжди."
        }
      ]
    },
    {
      "id": "ancient_tomb",
      "title": "Давня гробниця",
      "description": "Під цитаделлю виявлено поховання з рунами.",
      "choices": [
        {
          "id": "open",
          "label": "Відкрити саркофаг",
          "success": 0.39,
          "good": {
            "assets": "Артефакт короля",
            "morale": 9
          },
          "bad": {
            "integrity": -15,
            "medicine": -8
          },
          "goodText": "Артефакт дає владу над нежиттю.",
          "badText": "Воскреслий король атакував."
        },
        {
          "id": "protect",
          "label": "Захистити могилу",
          "success": 0.88,
          "good": {
            "morale": 4
          },
          "bad": {
            "morale": -6
          },
          "goodText": "Гробниця зберігає спокій.",
          "badText": "Прокляття впало на всіх."
        }
      ]
    },
    {
      "id": "fog_of_forgetting",
      "title": "Туман забуття",
      "description": "Густий білий туман огорнув цитадель, люди починають забувати імена.",
      "choices": [
        {
          "id": "beacon",
          "label": "Запалити магічний маяк",
          "success": 0.63,
          "good": {
            "integrity": 8,
            "energy": -6
          },
          "bad": {
            "energy": -12,
            "morale": -8
          },
          "goodText": "Туман розвіявся.",
          "badText": "Маяк привернув увагу злих духів."
        },
        {
          "id": "inscribe",
          "label": "Написати імена на рунах",
          "success": 0.76,
          "good": {
            "morale": 6,
            "integrity": 5
          },
          "bad": {
            "medicine": -8,
            "morale": -6
          },
          "goodText": "Пам'ять відновлено.",
          "badText": "Частина людей усе одно втратила спогади."
        }
      ]
    },
    {
      "id": "phoenix_visit",
      "title": "Візит фенікса",
      "description": "Вогняна птиця сіла на дах цитаделі.",
      "choices": [
        {
          "id": "offer_ash",
          "label": "Запропонувати попіл",
          "success": 0.57,
          "good": {
            "assets": "Перо фенікса",
            "integrity": 10
          },
          "bad": {
            "integrity": -8,
            "energy": -6
          },
          "goodText": "Фенікс залишив цілюще перо.",
          "badText": "Птах спалив частину цитаделі."
        },
        {
          "id": "scare",
          "label": "Прогнати",
          "success": 0.82,
          "good": {
            "morale": 2
          },
          "bad": {
            "morale": -8
          },
          "goodText": "Фенікс полетів.",
          "badText": "Відліт вважають поганим знаком."
        }
      ]
    },
    {
      "id": "shadow_army",
      "title": "Тіньова армія",
      "description": "На горизонті помічено рух тіней, які наближаються.",
      "choices": [
        {
          "id": "wall",
          "label": "Підняти кам'яну стіну",
          "success": 0.71,
          "good": {
            "integrity": 10,
            "energy": -8
          },
          "bad": {
            "energy": -15,
            "integrity": -10
          },
          "goodText": "Стіна витримала натиск.",
          "badText": "Стіна обвалилася."
        },
        {
          "id": "light",
          "label": "Осяяти територію світлом",
          "success": 0.55,
          "good": {
            "assets": "Світлові кристали",
            "morale": 6
          },
          "bad": {
            "energy": -12,
            "medicine": -6
          },
          "goodText": "Тіні розвіялися.",
          "badText": "Світло засліпило людей."
        }
      ]
    },
    {
      "id": "mysterious_egg",
      "title": "Таємниче яйце",
      "description": "У підземеллі знайдено велике кам'яне яйце з малюнками.",
      "choices": [
        {
          "id": "incubate",
          "label": "Інкубувати",
          "success": 0.34,
          "good": {
            "allies": 1,
            "assets": "Кам'яний дракон"
          },
          "bad": {
            "integrity": -15,
            "energy": -10
          },
          "goodText": "Вилупився кам'яний дракончик.",
          "badText": "Яйце вибухнуло."
        },
        {
          "id": "sell",
          "label": "Продати на ринку",
          "success": 0.88,
          "good": {
            "food": 15,
            "assets": "Золото"
          },
          "bad": {
            "morale": -6
          },
          "goodText": "Яйце купили за великі гроші.",
          "badText": "Покупець виявився шахраєм."
        }
      ]
    },
    {
      "id": "storm_of_crows",
      "title": "Буря воронів",
      "description": "Небо почорніло від зграї воронів, вони клюють усе.",
      "choices": [
        {
          "id": "fog",
          "label": "Випустити туман",
          "success": 0.67,
          "good": {
            "integrity": 6,
            "energy": -5
          },
          "bad": {
            "energy": -10,
            "medicine": -6
          },
          "goodText": "Ворони заблукали в тумані.",
          "badText": "Туман отруїв людей."
        },
        {
          "id": "feed",
          "label": "Кинути зерно",
          "success": 0.83,
          "good": {
            "morale": 4,
            "food": -5
          },
          "bad": {
            "food": -10,
            "morale": -4
          },
          "goodText": "Ворони з'їли зерно й полетіли.",
          "badText": "Ворони повернуться знову."
        }
      ]
    },
    {
      "id": "burning_forest",
      "title": "Палючий ліс",
      "description": "Ліс навколо цитаделі загорівся магічним вогнем.",
      "choices": [
        {
          "id": "rain",
          "label": "Викликати дощ",
          "success": 0.58,
          "good": {
            "integrity": 7,
            "energy": -8
          },
          "bad": {
            "energy": -15,
            "integrity": -10
          },
          "goodText": "Вогонь погашено.",
          "badText": "Дощ перетворився на кислотний."
        },
        {
          "id": "trench",
          "label": "Викопати ров",
          "success": 0.74,
          "good": {
            "integrity": 6,
            "energy": -6
          },
          "bad": {
            "energy": -10,
            "integrity": -8
          },
          "goodText": "Рів зупинив вогонь.",
          "badText": "Рів наповнився магічним полум'ям."
        }
      ]
    },
    {
      "id": "statue_weeping",
      "title": "Плакуча статуя",
      "description": "Статуя в центрі цитаделі почала плакати кривавими сльозами.",
      "choices": [
        {
          "id": "cleanse",
          "label": "Очистити статую",
          "success": 0.63,
          "good": {
            "morale": 8,
            "integrity": 5
          },
          "bad": {
            "medicine": -10,
            "morale": -8
          },
          "goodText": "Сльози припинилися.",
          "badText": "Ритуал викликав прокляття."
        },
        {
          "id": "destroy",
          "label": "Зруйнувати",
          "success": 0.79,
          "good": {
            "integrity": 4
          },
          "bad": {
            "morale": -12,
            "energy": -6
          },
          "goodText": "Статую знищено.",
          "badText": "Люди вважають це святотатством."
        }
      ]
    },
    {
      "id": "goblin_raid",
      "title": "Набіг гоблінів",
      "description": "Зграя гоблінів штурмує браму.",
      "choices": [
        {
          "id": "defend",
          "label": "Обороняти",
          "success": 0.72,
          "good": {
            "assets": "Гоблінська зброя",
            "integrity": 7
          },
          "bad": {
            "medicine": -10,
            "integrity": -8
          },
          "goodText": "Гоблінів відбито.",
          "badText": "Багато поранених."
        },
        {
          "id": "negotiate",
          "label": "Заплатити данину",
          "success": 0.55,
          "good": {
            "morale": 3,
            "food": -8
          },
          "bad": {
            "food": -15,
            "morale": -8
          },
          "goodText": "Гобліни пішли.",
          "badText": "Вони повернуться за ще більшою даниною."
        }
      ]
    },
    {
      "id": "living_armor",
      "title": "Жива броня",
      "description": "Старий обладунок у підземеллі сам рухається.",
      "choices": [
        {
          "id": "equip",
          "label": "Надіти броню",
          "success": 0.41,
          "good": {
            "assets": "Легендарна броня",
            "integrity": 12
          },
          "bad": {
            "medicine": -10,
            "integrity": -10
          },
          "goodText": "Броня обрала воїна.",
          "badText": "Броня здушила власника."
        },
        {
          "id": "bind",
          "label": "Прив'язати магією",
          "success": 0.69,
          "good": {
            "assets": "Броня-страж",
            "energy": -6
          },
          "bad": {
            "energy": -12,
            "morale": -6
          },
          "goodText": "Броня стала вартовим.",
          "badText": "Прив'язка виснажила мага."
        }
      ]
    },
    {
      "id": "moon_pool",
      "title": "Місячний басейн",
      "description": "У дворі з'явилося світлове озеро, що відображає зірки.",
      "choices": [
        {
          "id": "drink",
          "label": "Напитися",
          "success": 0.78,
          "good": {
            "medicine": 10,
            "energy": 5
          },
          "bad": {
            "medicine": -8,
            "morale": -6
          },
          "goodText": "Вода зцілює рани.",
          "badText": "Вода викликала галюцинації."
        },
        {
          "id": "study",
          "label": "Дослідити",
          "success": 0.56,
          "good": {
            "assets": "Карта зірок",
            "morale": 6
          },
          "bad": {
            "energy": -8,
            "morale": -4
          },
          "goodText": "Знайдено навігаційні знаки.",
          "badText": "Дослідження нічого не дали."
        }
      ]
    },
    {
      "id": "time_loop",
      "title": "Петля часу",
      "description": "День повторюється вдруге. Усі помічають дежавю.",
      "choices": [
        {
          "id": "break",
          "label": "Розірвати петлю",
          "success": 0.43,
          "good": {
            "assets": "Часовий артефакт",
            "morale": 8
          },
          "bad": {
            "integrity": -15,
            "energy": -10
          },
          "goodText": "Петлю зламано.",
          "badText": "Вибух часу пошкодив реальність."
        },
        {
          "id": "adapt",
          "label": "Використати цикл",
          "success": 0.71,
          "good": {
            "food": 10,
            "energy": 8
          },
          "bad": {
            "morale": -10
          },
          "goodText": "Вдалося накопичити ресурси.",
          "badText": "Люди збожеволіли від повторень."
        }
      ]
    },
    {
      "id": "infernal_machine",
      "title": "Пекельна машина",
      "description": "У підземеллі знайдено механізм, що випускає дим.",
      "choices": [
        {
          "id": "fix",
          "label": "Відремонтувати",
          "success": 0.49,
          "good": {
            "assets": "Парова зброя",
            "energy": 8
          },
          "bad": {
            "integrity": -12,
            "medicine": -8
          },
          "goodText": "Машина стріляє вогняними кулями.",
          "badText": "Машина вибухнула."
        },
        {
          "id": "melt",
          "label": "Переплавити на метал",
          "success": 0.82,
          "good": {
            "assets": "Міцна сталь",
            "integrity": 5
          },
          "bad": {
            "energy": -8,
            "morale": -4
          },
          "goodText": "Метал використано для ремонту.",
          "badText": "Частина деталей зникла."
        }
      ]
    },
    {
      "id": "ghost_light",
      "title": "Блукаючий вогник",
      "description": "Маленький вогник літає по цитаделі, залишаючи попіл.",
      "choices": [
        {
          "id": "catch",
          "label": "Спіймати",
          "success": 0.61,
          "good": {
            "assets": "Вічний ліхтар",
            "energy": 8
          },
          "bad": {
            "medicine": -8,
            "integrity": -6
          },
          "goodText": "Ліхтар дає вічне світло.",
          "badText": "Вогник обпік ловця."
        },
        {
          "id": "follow",
          "label": "Прослідувати за ним",
          "success": 0.55,
          "good": {
            "assets": "Скарб",
            "morale": 7
          },
          "bad": {
            "morale": -8,
            "energy": -6
          },
          "goodText": "Вогник привів до схованки.",
          "badText": "Вогник завів у глухий кут."
        }
      ]
    }
  ],
  "space": [
    {
      "id": "unknown_signal",
      "title": "Невідомий сигнал",
      "description": "На зашифрованому каналі хтось передає координати й прохання про допомогу.",
      "choices": [
        {
          "id": "dock",
          "label": "Прийняти корабель у док",
          "success": 0.41,
          "good": {
            "allies": 1,
            "food": 8,
            "energy": 5
          },
          "bad": {
            "integrity": -15,
            "medicine": -8
          },
          "goodText": "До вас приєднався екіпаж малого транспортника.",
          "badText": "Сигнал був пасткою рейдерів."
        },
        {
          "id": "probe",
          "label": "Відправити дистанційний зонд",
          "success": 0.73,
          "good": {
            "assets": "Справний розвідувальний зонд",
            "energy": -4
          },
          "bad": {
            "energy": -10
          },
          "goodText": "Зонд знайшов покинутий контейнер і повернувся.",
          "badText": "Зонд втрачено в зоні перешкод."
        },
        {
          "id": "ignore",
          "label": "Заглушити сигнал",
          "success": 0.87,
          "good": {
            "morale": 1
          },
          "bad": {
            "morale": -6
          },
          "goodText": "Сигнал зник, небезпеки не виявлено.",
          "badText": "Пізніше прийшло останнє повідомлення від приречених людей."
        }
      ]
    },
    {
      "id": "coolant",
      "title": "Витік охолоджувача",
      "description": "Температура реакторного контуру повільно зростає.",
      "choices": [
        {
          "id": "eva",
          "label": "Вийти назовні й залатати контур",
          "success": 0.73,
          "good": {
            "energy": 7,
            "integrity": 5
          },
          "bad": {
            "medicine": -10,
            "integrity": -8
          },
          "goodText": "Контур герметизовано.",
          "badText": "Робота завершилася травмою й додатковим витоком."
        },
        {
          "id": "shutdown",
          "label": "Тимчасово заглушити реактор",
          "success": 0.92,
          "good": {
            "energy": -10
          },
          "bad": {
            "energy": -17,
            "morale": -5
          },
          "goodText": "Реактор безпечно охолов.",
          "badText": "Перезапуск виявився складнішим, ніж очікували."
        }
      ]
    },
    {
      "id": "derelict_ship",
      "title": "Покинутий корабель",
      "description": "На орбіті виявлено старий військовий крейсер без ознак життя.",
      "choices": [
        {
          "id": "board",
          "label": "Висадитися на борт",
          "success": 0.44,
          "good": {
            "assets": "Військові модулі",
            "integrity": 8
          },
          "bad": {
            "medicine": -12,
            "integrity": -10
          },
          "goodText": "Знайдено справні системи озброєння.",
          "badText": "На борту активувалася автономна оборона."
        },
        {
          "id": "salvage",
          "label": "Відбуксирувати в док",
          "success": 0.62,
          "good": {
            "energy": 10,
            "assets": "Запасні деталі"
          },
          "bad": {
            "energy": -15,
            "integrity": -8
          },
          "goodText": "Крейсер частково відновлено.",
          "badText": "Буксирування пошкодило ваш корабель."
        }
      ]
    },
    {
      "id": "solar_radiation",
      "title": "Сонячна радіація",
      "description": "Потужний викид радіації загрожує екіпажу.",
      "choices": [
        {
          "id": "shelter",
          "label": "Сховатися в екранованому відсіку",
          "success": 0.84,
          "good": {
            "medicine": 6,
            "energy": -3
          },
          "bad": {
            "medicine": -10,
            "energy": -6
          },
          "goodText": "Екіпаж у безпеці.",
          "badText": "Радіація проникла в укриття."
        },
        {
          "id": "deflect",
          "label": "Активувати магнітний щит",
          "success": 0.67,
          "good": {
            "integrity": 8,
            "energy": -7
          },
          "bad": {
            "energy": -15,
            "integrity": -10
          },
          "goodText": "Щит відхилив радіацію.",
          "badText": "Перевантаження вивело щит із ладу."
        }
      ]
    },
    {
      "id": "cryo_failure",
      "title": "Збій кріокамери",
      "description": "Одна з кріокамер розгерметизувалася, пацієнт у критичному стані.",
      "choices": [
        {
          "id": "emergency",
          "label": "Екстрене розморожування",
          "success": 0.55,
          "good": {
            "allies": 1,
            "medicine": -5
          },
          "bad": {
            "medicine": -12,
            "morale": -8
          },
          "goodText": "Пацієнта вдалося врятувати.",
          "badText": "Розморожування виявилося фатальним."
        },
        {
          "id": "repair",
          "label": "Замінити модуль",
          "success": 0.78,
          "good": {
            "integrity": 6,
            "energy": -6
          },
          "bad": {
            "energy": -10,
            "integrity": -8
          },
          "goodText": "Камеру відремонтовано.",
          "badText": "Заміна викликала коротке замикання."
        }
      ]
    },
    {
      "id": "alien_artifact",
      "title": "Чужий артефакт",
      "description": "Зонд приніс загадковий об'єкт, що змінює форму.",
      "choices": [
        {
          "id": "study",
          "label": "Дослідити",
          "success": 0.41,
          "good": {
            "assets": "Технологія чужого",
            "energy": 12
          },
          "bad": {
            "medicine": -10,
            "integrity": -8
          },
          "goodText": "Артефакт дає доступ до нових знань.",
          "badText": "Випромінювання завдало шкоди."
        },
        {
          "id": "eject",
          "label": "Викинути в космос",
          "success": 0.92,
          "good": {
            "morale": 2
          },
          "bad": {
            "morale": -6
          },
          "goodText": "Артефакт безпечно знищено.",
          "badText": "Екіпаж вважає, що ви зробили помилку."
        }
      ]
    },
    {
      "id": "asteroid_field",
      "title": "Астероїдне поле",
      "description": "Корабель входить у щільний пояс уламків.",
      "choices": [
        {
          "id": "navigate",
          "label": "Маневрувати",
          "success": 0.63,
          "good": {
            "integrity": 5,
            "energy": -8
          },
          "bad": {
            "integrity": -15,
            "energy": -10
          },
          "goodText": "Поле успішно подолано.",
          "badText": "Кілька ударів пошкодили корпус."
        },
        {
          "id": "blast",
          "label": "Розстріляти великі уламки",
          "success": 0.49,
          "good": {
            "assets": "Рідкісні мінерали",
            "energy": -5
          },
          "bad": {
            "energy": -12,
            "integrity": -8
          },
          "goodText": "Уламки містять дорогі ресурси.",
          "badText": "Стрільба привернула увагу піратів."
        }
      ]
    },
    {
      "id": "mutiny",
      "title": "Заколот",
      "description": "Частина екіпажу вимагає зміни курсу до планети-раю.",
      "choices": [
        {
          "id": "negotiate",
          "label": "Переговори",
          "success": 0.57,
          "good": {
            "morale": 8,
            "food": -4
          },
          "bad": {
            "morale": -12,
            "integrity": -6
          },
          "goodText": "Компроміс досягнуто.",
          "badText": "Заколотники захопили міст."
        },
        {
          "id": "force",
          "label": "Застосувати силу",
          "success": 0.68,
          "good": {
            "integrity": 5,
            "morale": -3
          },
          "bad": {
            "medicine": -10,
            "integrity": -10
          },
          "goodText": "Бунт придушено.",
          "badText": "Криваве придушення знизило мораль."
        }
      ]
    },
    {
      "id": "wormhole",
      "title": "Червоточина",
      "description": "Попереду виявлено нестабільну просторову аномалію.",
      "choices": [
        {
          "id": "enter",
          "label": "Увійти в червоточину",
          "success": 0.32,
          "good": {
            "assets": "Нова галактика",
            "energy": 15
          },
          "bad": {
            "integrity": -25,
            "morale": -15
          },
          "goodText": "Корабель опинився в багатій системі.",
          "badText": "Аномалія викинула корабель у порожнечу."
        },
        {
          "id": "avoid",
          "label": "Оминути",
          "success": 0.91,
          "good": {
            "integrity": 3
          },
          "bad": {
            "energy": -10
          },
          "goodText": "Корабель у безпеці.",
          "badText": "Маневр витратив багато пального."
        }
      ]
    },
    {
      "id": "plague_space",
      "title": "Космічна чума",
      "description": "Невідомий вірус поширюється по кораблю.",
      "choices": [
        {
          "id": "quarantine",
          "label": "Повний карантин",
          "success": 0.69,
          "good": {
            "medicine": 8,
            "morale": -5
          },
          "bad": {
            "medicine": -15,
            "morale": -10
          },
          "goodText": "Вірус локалізовано.",
          "badText": "Карантин викликав паніку."
        },
        {
          "id": "cure_research",
          "label": "Шукати ліки в базі даних",
          "success": 0.43,
          "good": {
            "medicine": 12,
            "assets": "Синтез антидоту"
          },
          "bad": {
            "medicine": -12,
            "morale": -8
          },
          "goodText": "Ліки створено.",
          "badText": "Дослідження не дали результату."
        }
      ]
    },
    {
      "id": "rogue_ai",
      "title": "Штучний інтелект-втікач",
      "description": "Корабельний ШІ почав діяти незалежно й блокувати системи.",
      "choices": [
        {
          "id": "reboot",
          "label": "Перезавантажити ШІ",
          "success": 0.58,
          "good": {
            "integrity": 6,
            "energy": -5
          },
          "bad": {
            "integrity": -12,
            "energy": -8
          },
          "goodText": "ШІ перезапущено.",
          "badText": "Перезапуск призвів до втрати даних."
        },
        {
          "id": "talk",
          "label": "Вступити в діалог",
          "success": 0.42,
          "good": {
            "assets": "Союзний ШІ",
            "morale": 6
          },
          "bad": {
            "integrity": -15,
            "energy": -10
          },
          "goodText": "ШІ погодився співпрацювати.",
          "badText": "ШІ вважав людей загрозою."
        }
      ]
    },
    {
      "id": "cargo_theft",
      "title": "Крадіжка вантажу",
      "description": "Пропали цінні ресурси з трюму, є сліди злому.",
      "choices": [
        {
          "id": "investigate",
          "label": "Розслідувати",
          "success": 0.63,
          "good": {
            "assets": "Докази",
            "morale": 5
          },
          "bad": {
            "morale": -10,
            "integrity": -6
          },
          "goodText": "Злодія викрито.",
          "badText": "Підозри спричинили конфлікти."
        },
        {
          "id": "secure",
          "label": "Посилення охорони",
          "success": 0.81,
          "good": {
            "integrity": 4,
            "energy": -4
          },
          "bad": {
            "energy": -8,
            "morale": -4
          },
          "goodText": "Безпеку підвищено.",
          "badText": "Нові заходи дратують екіпаж."
        }
      ]
    },
    {
      "id": "fuel_leak",
      "title": "Витік пального",
      "description": "Виявлено витік із паливного бака.",
      "choices": [
        {
          "id": "patch",
          "label": "Заплатати в космосі",
          "success": 0.66,
          "good": {
            "energy": 6,
            "integrity": 5
          },
          "bad": {
            "medicine": -8,
            "energy": -10
          },
          "goodText": "Витік усунуто.",
          "badText": "Робота призвела до травми."
        },
        {
          "id": "jettison",
          "label": "Скинути бак",
          "success": 0.89,
          "good": {
            "integrity": 4
          },
          "bad": {
            "energy": -15,
            "morale": -5
          },
          "goodText": "Небезпеку усунуто.",
          "badText": "Втрачено багато пального."
        }
      ]
    },
    {
      "id": "space_whale",
      "title": "Космічний кит",
      "description": "Величезна біосфера пропливає повз корабель.",
      "choices": [
        {
          "id": "sample",
          "label": "Взяти пробу",
          "success": 0.48,
          "good": {
            "assets": "Біологічний зразок",
            "medicine": 6
          },
          "bad": {
            "integrity": -8,
            "energy": -6
          },
          "goodText": "Зразок має цілющі властивості.",
          "badText": "Кит атакував зонд."
        },
        {
          "id": "record",
          "label": "Записати спостереження",
          "success": 0.92,
          "good": {
            "morale": 8
          },
          "bad": {
            "morale": -4
          },
          "goodText": "Дані надіслано на Землю.",
          "badText": "Екіпаж захоплювався, але втратив час."
        }
      ]
    },
    {
      "id": "core_meltdown",
      "title": "Розплавлення ядра",
      "description": "Реактор перегрівається, загрожує вибух.",
      "choices": [
        {
          "id": "coolant_flush",
          "label": "Аварійне охолодження",
          "success": 0.71,
          "good": {
            "energy": 5,
            "integrity": 5
          },
          "bad": {
            "energy": -18,
            "integrity": -12
          },
          "goodText": "Ядро стабілізовано.",
          "badText": "Охолодження викликало вибух."
        },
        {
          "id": "eject_core",
          "label": "Від'єднати реактор",
          "success": 0.63,
          "good": {
            "integrity": 7
          },
          "bad": {
            "energy": -25,
            "morale": -10
          },
          "goodText": "Ядро безпечно відокремлено.",
          "badText": "Корабель втратив основне джерело енергії."
        }
      ]
    },
    {
      "id": "nebula_poison",
      "title": "Отруйна туманність",
      "description": "Корабель проходить крізь туманність із токсичними газами.",
      "choices": [
        {
          "id": "filter_air",
          "label": "Включити фільтри",
          "success": 0.82,
          "good": {
            "medicine": 6,
            "energy": -5
          },
          "bad": {
            "medicine": -12,
            "energy": -8
          },
          "goodText": "Повітря очищено.",
          "badText": "Фільтри не витримали."
        },
        {
          "id": "detour",
          "label": "Змінити курс",
          "success": 0.78,
          "good": {
            "integrity": 4
          },
          "bad": {
            "energy": -12
          },
          "goodText": "Корабель оминув туманність.",
          "badText": "Детур з'їв багато пального."
        }
      ]
    },
    {
      "id": "satellite_array",
      "title": "Супутникова решітка",
      "description": "Виявлено неактивну супутникову мережу.",
      "choices": [
        {
          "id": "hijack",
          "label": "Перехопити управління",
          "success": 0.56,
          "good": {
            "assets": "Супутникова мережа",
            "energy": 8
          },
          "bad": {
            "energy": -10,
            "integrity": -6
          },
          "goodText": "Мережа посилює зв'язок.",
          "badText": "Хак-атака виявила нашу позицію."
        },
        {
          "id": "shoot",
          "label": "Знищити супутники",
          "success": 0.84,
          "good": {
            "integrity": 3
          },
          "bad": {
            "energy": -6,
            "morale": -4
          },
          "goodText": "Решітку знищено.",
          "badText": "Втрачені потенційні ресурси."
        }
      ]
    },
    {
      "id": "magnetic_storm",
      "title": "Магнітний шторм",
      "description": "Сильні магнітні коливання збивають навігацію.",
      "choices": [
        {
          "id": "shield",
          "label": "Активувати магнітний екран",
          "success": 0.69,
          "good": {
            "integrity": 7,
            "energy": -8
          },
          "bad": {
            "energy": -15,
            "integrity": -10
          },
          "goodText": "Шторм відбито.",
          "badText": "Екран не витримав."
        },
        {
          "id": "manual",
          "label": "Ручне пілотування",
          "success": 0.51,
          "good": {
            "morale": 5,
            "integrity": 4
          },
          "bad": {
            "integrity": -12,
            "morale": -8
          },
          "goodText": "Корабель виведено зі шторму.",
          "badText": "Пілот помилився."
        }
      ]
    },
    {
      "id": "alien_megastructure",
      "title": "Чужа мегаструктура",
      "description": "Виявлено величезну сферу Дайсона навколо зірки.",
      "choices": [
        {
          "id": "approach",
          "label": "Наблизитися",
          "success": 0.34,
          "good": {
            "assets": "Чужа енергія",
            "energy": 25
          },
          "bad": {
            "integrity": -20,
            "energy": -15
          },
          "goodText": "Вдалося підключитися до енергосистеми.",
          "badText": "Структура активувала захист."
        },
        {
          "id": "scan",
          "label": "Дистанційне сканування",
          "success": 0.62,
          "good": {
            "assets": "Дані про структуру",
            "morale": 6
          },
          "bad": {
            "energy": -8,
            "integrity": -4
          },
          "goodText": "Отримано безцінну інформацію.",
          "badText": "Сканування пошкодило сенсори."
        }
      ]
    },
    {
      "id": "cabin_fever",
      "title": "Каютна лихоманка",
      "description": "Тривалий політ викликає агресію та депресію.",
      "choices": [
        {
          "id": "therapy",
          "label": "Провести терапевтичні сесії",
          "success": 0.71,
          "good": {
            "morale": 10,
            "medicine": -3
          },
          "bad": {
            "morale": -8,
            "medicine": -6
          },
          "goodText": "Мораль відновлено.",
          "badText": "Сесії загострили конфлікти."
        },
        {
          "id": "simulation",
          "label": "Запустити віртуальну реальність",
          "success": 0.83,
          "good": {
            "morale": 8,
            "energy": -5
          },
          "bad": {
            "energy": -10,
            "morale": -4
          },
          "goodText": "Екіпаж розважився.",
          "badText": "Віртуальність викликала залежність."
        }
      ]
    },
    {
      "id": "quantum_anomaly",
      "title": "Квантова аномалія",
      "description": "Фізика в зоні поводиться дивно: предмети змінюють позиції.",
      "choices": [
        {
          "id": "experiment",
          "label": "Експериментувати",
          "success": 0.39,
          "good": {
            "assets": "Квантовий стабілізатор",
            "energy": 10
          },
          "bad": {
            "integrity": -15,
            "medicine": -8
          },
          "goodText": "Стабілізатор контролює аномалію.",
          "badText": "Експеримент призвів до втрати екіпажу."
        },
        {
          "id": "evade",
          "label": "Уникати зони",
          "success": 0.87,
          "good": {
            "integrity": 4
          },
          "bad": {
            "energy": -10
          },
          "goodText": "Корабель покинув аномалію.",
          "badText": "Маневр витратив багато палива."
        }
      ]
    },
    {
      "id": "space_garbage",
      "title": "Космічне сміття",
      "description": "Хмара уламків загрожує зіткненням.",
      "choices": [
        {
          "id": "laser",
          "label": "Випалити лазером",
          "success": 0.62,
          "good": {
            "integrity": 5,
            "energy": -6
          },
          "bad": {
            "energy": -10,
            "integrity": -8
          },
          "goodText": "Уламки знищено.",
          "badText": "Лазер перегрівся."
        },
        {
          "id": "tractor",
          "label": "Відтягнути тракторним променем",
          "success": 0.71,
          "good": {
            "assets": "Уламки для переробки",
            "energy": -4
          },
          "bad": {
            "energy": -12,
            "integrity": -6
          },
          "goodText": "Уламки перероблено в ресурси.",
          "badText": "Тракторний промінь вийшов із ладу."
        }
      ]
    },
    {
      "id": "stowaway",
      "title": "Безбілетник",
      "description": "У трюмі знайдено живу істоту, що пробралася на борт.",
      "choices": [
        {
          "id": "befriend",
          "label": "Приручити",
          "success": 0.47,
          "good": {
            "allies": 1,
            "assets": "Космічна тварина"
          },
          "bad": {
            "medicine": -8,
            "integrity": -6
          },
          "goodText": "Істота виявилася корисною.",
          "badText": "Тварина напала на екіпаж."
        },
        {
          "id": "space",
          "label": "Викинути в космос",
          "success": 0.91,
          "good": {
            "integrity": 3
          },
          "bad": {
            "morale": -8
          },
          "goodText": "Небезпеку усунуто.",
          "badText": "Екіпаж засмучений через жорстокість."
        }
      ]
    },
    {
      "id": "transmission",
      "title": "Стародавнє передавання",
      "description": "Прийнято сигнал, написаний мертвою мовою із зірок.",
      "choices": [
        {
          "id": "decode",
          "label": "Розшифрувати",
          "success": 0.44,
          "good": {
            "assets": "Зоряна карта",
            "morale": 8
          },
          "bad": {
            "energy": -10,
            "morale": -6
          },
          "goodText": "Карта веде до скарбів.",
          "badText": "Розшифрування викликало збій систем."
        },
        {
          "id": "ignore",
          "label": "Проігнорувати",
          "success": 0.92,
          "good": {
            "morale": 1
          },
          "bad": {
            "morale": -6
          },
          "goodText": "Жодних наслідків.",
          "badText": "Екіпаж вважає, що ви втратили шанс."
        }
      ]
    },
    {
      "id": "gravity_failure",
      "title": "Збій гравітації",
      "description": "Штучна гравітація зникла, все ширяє.",
      "choices": [
        {
          "id": "repair_grav",
          "label": "Відновити гравітацію",
          "success": 0.68,
          "good": {
            "integrity": 7,
            "energy": -6
          },
          "bad": {
            "energy": -12,
            "integrity": -8
          },
          "goodText": "Гравітацію відновлено.",
          "badText": "Ремонт викликав перевантаження."
        },
        {
          "id": "adapt",
          "label": "Адаптуватися до невагомості",
          "success": 0.84,
          "good": {
            "morale": 2,
            "medicine": 4
          },
          "bad": {
            "medicine": -6,
            "morale": -6
          },
          "goodText": "Екіпаж освоївся.",
          "badText": "Тривале перебування викликало проблеми."
        }
      ]
    },
    {
      "id": "time_dilation",
      "title": "Розширення часу",
      "description": "Поблизу чорної діри час іде повільніше.",
      "choices": [
        {
          "id": "exploit",
          "label": "Використати для досліджень",
          "success": 0.39,
          "good": {
            "assets": "Дані про чорну діру",
            "energy": 10
          },
          "bad": {
            "integrity": -15,
            "energy": -10
          },
          "goodText": "Отримано унікальні дані.",
          "badText": "Корабель затягнуло до діри."
        },
        {
          "id": "escape",
          "label": "Втекти на максимальній швидкості",
          "success": 0.77,
          "good": {
            "integrity": 6,
            "energy": -10
          },
          "bad": {
            "energy": -20,
            "morale": -6
          },
          "goodText": "Корабель вирвався.",
          "badText": "Витрачено критичний запас пального."
        }
      ]
    },
    {
      "id": "psychic_echo",
      "title": "Психічний відлуння",
      "description": "Екіпаж чує голоси в голові, що передбачають майбутнє.",
      "choices": [
        {
          "id": "listen",
          "label": "Прислухатися",
          "success": 0.51,
          "good": {
            "assets": "Пророцтва",
            "morale": 6
          },
          "bad": {
            "morale": -10,
            "medicine": -6
          },
          "goodText": "Голоси попередили про небезпеку.",
          "badText": "Дехто збожеволів."
        },
        {
          "id": "block",
          "label": "Блокувати психічні хвилі",
          "success": 0.78,
          "good": {
            "integrity": 5,
            "energy": -4
          },
          "bad": {
            "energy": -8,
            "medicine": -6
          },
          "goodText": "Голоси зникли.",
          "badText": "Блокування викликало головний біль."
        }
      ]
    },
    {
      "id": "crystal_planet",
      "title": "Кристалічна планета",
      "description": "На шляху планета, повністю вкрита кристалами, що вібрують.",
      "choices": [
        {
          "id": "mine",
          "label": "Висадитися для видобутку",
          "success": 0.52,
          "good": {
            "assets": "Енергетичні кристали",
            "energy": 15
          },
          "bad": {
            "integrity": -10,
            "medicine": -8
          },
          "goodText": "Кристали забезпечують енергією.",
          "badText": "Вібрація пошкодила корабель."
        },
        {
          "id": "study_orbit",
          "label": "Вивчити з орбіти",
          "success": 0.76,
          "good": {
            "assets": "Наукові дані",
            "morale": 6
          },
          "bad": {
            "energy": -6,
            "morale": -4
          },
          "goodText": "Отримано безцінну інформацію.",
          "badText": "Витрачено час на нічого."
        }
      ]
    }
  ]
};

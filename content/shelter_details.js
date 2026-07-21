"use strict";

// Детальні паспорти сховищ: площа, приміщення, стартовий провіант і базові ресурси.
module.exports = {
  "modern": {
    "Сховище цивільної оборони": {
      "areaM2": 840,
      "roomCount": 13,
      "rooms": [
        {
          "name": "Герметичний тамбур",
          "count": 1
        },
        {
          "name": "Житлова кімната",
          "count": 4
        },
        {
          "name": "Командний пункт",
          "count": 1
        },
        {
          "name": "Медичний відсік",
          "count": 1
        },
        {
          "name": "Кухня-їдальня",
          "count": 1
        },
        {
          "name": "Склад провіанту",
          "count": 2
        },
        {
          "name": "Санітарний вузол",
          "count": 2
        },
        {
          "name": "Генераторна",
          "count": 1
        }
      ],
      "provisions": [
        {
          "name": "Питна вода",
          "amount": 12000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Сухі пайки",
          "amount": 1100,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "М’ясні консерви",
          "amount": 480,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Крупи та макарони",
          "amount": 320,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Аптечки цивільного захисту",
          "amount": 18,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Антибіотики широкого спектра",
          "amount": 240,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 1800,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Гігієнічні набори",
          "amount": 90,
          "unit": "комплектів",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 70,
        "water": 78,
        "energy": 64,
        "integrity": 73,
        "medicine": 58,
        "morale": 61
      }
    },
    "Підземний науковий центр": {
      "areaM2": 3100,
      "roomCount": 22,
      "rooms": [
        {
          "name": "Лабораторія",
          "count": 5
        },
        {
          "name": "Житловий блок",
          "count": 6
        },
        {
          "name": "Карантинний бокс",
          "count": 2
        },
        {
          "name": "Операційна",
          "count": 1
        },
        {
          "name": "Серверна",
          "count": 1
        },
        {
          "name": "Теплиця",
          "count": 2
        },
        {
          "name": "Комора реагентів",
          "count": 2
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Опріснювальна",
          "count": 1
        },
        {
          "name": "Реакторна",
          "count": 1
        }
      ],
      "provisions": [
        {
          "name": "Очищена вода",
          "amount": 26000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Ліофілізовані раціони",
          "amount": 2400,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Білковий концентрат",
          "amount": 420,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Насіннєвий фонд",
          "amount": 86,
          "unit": "контейнерів",
          "category": "food"
        },
        {
          "name": "Лабораторні медикаменти",
          "amount": 640,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Стерильні хірургічні набори",
          "amount": 24,
          "unit": "комплекти",
          "category": "medicine"
        },
        {
          "name": "Реакторні паливні касети",
          "amount": 6,
          "unit": "шт.",
          "category": "energy"
        },
        {
          "name": "Фільтрувальні мембрани",
          "amount": 42,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 74,
        "water": 84,
        "energy": 82,
        "integrity": 69,
        "medicine": 82,
        "morale": 58
      }
    },
    "Бункер на горі": {
      "areaM2": 1850,
      "roomCount": 17,
      "rooms": [
        {
          "name": "Казарма",
          "count": 6
        },
        {
          "name": "Командний зал",
          "count": 1
        },
        {
          "name": "Лазарет",
          "count": 1
        },
        {
          "name": "Арсенал",
          "count": 2
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Холодний склад",
          "count": 2
        },
        {
          "name": "Цистерна",
          "count": 1
        },
        {
          "name": "Генераторна",
          "count": 1
        },
        {
          "name": "Спостережний пост",
          "count": 2
        }
      ],
      "provisions": [
        {
          "name": "Джерельна вода",
          "amount": 18000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Армійські раціони",
          "amount": 1900,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Сушене м’ясо",
          "amount": 260,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Борошно",
          "amount": 420,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Польові медичні сумки",
          "amount": 32,
          "unit": "шт.",
          "category": "medicine"
        },
        {
          "name": "Знеболювальні препарати",
          "amount": 380,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 4200,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Газові балони",
          "amount": 48,
          "unit": "шт.",
          "category": "energy"
        }
      ],
      "initialResources": {
        "food": 78,
        "water": 82,
        "energy": 76,
        "integrity": 86,
        "medicine": 62,
        "morale": 68
      }
    },
    "Торговельний центр (переобладнаний)": {
      "areaM2": 9800,
      "roomCount": 38,
      "rooms": [
        {
          "name": "Житловий сектор",
          "count": 14
        },
        {
          "name": "Кухонний блок",
          "count": 3
        },
        {
          "name": "Комора",
          "count": 8
        },
        {
          "name": "Медпункт",
          "count": 2
        },
        {
          "name": "Майстерня",
          "count": 2
        },
        {
          "name": "Санітарний блок",
          "count": 4
        },
        {
          "name": "Охоронний пост",
          "count": 3
        },
        {
          "name": "Дитяча кімната",
          "count": 2
        }
      ],
      "provisions": [
        {
          "name": "Бутильована вода",
          "amount": 22500,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Консервовані продукти",
          "amount": 2600,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Заморожені продукти",
          "amount": 1200,
          "unit": "кг",
          "category": "food",
          "note": "Потребують стабільного живлення"
        },
        {
          "name": "Сухі сніданки",
          "amount": 780,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Аптечні залишки",
          "amount": 520,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Перев’язувальні матеріали",
          "amount": 140,
          "unit": "наборів",
          "category": "medicine"
        },
        {
          "name": "Пальне для генераторів",
          "amount": 2600,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Побутова хімія",
          "amount": 310,
          "unit": "упаковок",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 86,
        "water": 72,
        "energy": 58,
        "integrity": 55,
        "medicine": 68,
        "morale": 72
      }
    },
    "Старий метрополітен": {
      "areaM2": 12500,
      "roomCount": 33,
      "rooms": [
        {
          "name": "Житловий вагон",
          "count": 10
        },
        {
          "name": "Станційний зал",
          "count": 2
        },
        {
          "name": "Складська ніша",
          "count": 8
        },
        {
          "name": "Медичний пункт",
          "count": 2
        },
        {
          "name": "Технічна камера",
          "count": 5
        },
        {
          "name": "Диспетчерська",
          "count": 1
        },
        {
          "name": "Санітарний блок",
          "count": 3
        },
        {
          "name": "Дренажна станція",
          "count": 2
        }
      ],
      "provisions": [
        {
          "name": "Вода у м’яких резервуарах",
          "amount": 16000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Сухі пайки",
          "amount": 1700,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Консервована квасоля",
          "amount": 920,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Галети",
          "amount": 540,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Медичні укладки",
          "amount": 20,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Дезінфектанти",
          "amount": 180,
          "unit": "л",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 2100,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Акумуляторні батареї",
          "amount": 72,
          "unit": "шт.",
          "category": "energy"
        }
      ],
      "initialResources": {
        "food": 73,
        "water": 69,
        "energy": 61,
        "integrity": 62,
        "medicine": 52,
        "morale": 57
      }
    },
    "Шкільне сховище": {
      "areaM2": 2400,
      "roomCount": 22,
      "rooms": [
        {
          "name": "Клас-житлова кімната",
          "count": 10
        },
        {
          "name": "Їдальня",
          "count": 1
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Медкабінет",
          "count": 1
        },
        {
          "name": "Спортзал",
          "count": 1
        },
        {
          "name": "Бібліотека",
          "count": 1
        },
        {
          "name": "Комора",
          "count": 3
        },
        {
          "name": "Санітарний вузол",
          "count": 4
        }
      ],
      "provisions": [
        {
          "name": "Питна вода",
          "amount": 9000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Крупи",
          "amount": 520,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Макаронні вироби",
          "amount": 380,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Овочеві консерви",
          "amount": 840,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Шкільні аптечки",
          "amount": 14,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Жарознижувальні засоби",
          "amount": 260,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Паливні брикети",
          "amount": 1700,
          "unit": "кг",
          "category": "energy"
        },
        {
          "name": "Ковдри",
          "amount": 180,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 75,
        "water": 60,
        "energy": 52,
        "integrity": 58,
        "medicine": 48,
        "morale": 74
      }
    },
    "Військова база під землею": {
      "areaM2": 6200,
      "roomCount": 36,
      "rooms": [
        {
          "name": "Казарма",
          "count": 12
        },
        {
          "name": "Командний центр",
          "count": 2
        },
        {
          "name": "Арсенал",
          "count": 4
        },
        {
          "name": "Лазарет",
          "count": 2
        },
        {
          "name": "Їдальня",
          "count": 2
        },
        {
          "name": "Склад провіанту",
          "count": 6
        },
        {
          "name": "Майстерня",
          "count": 3
        },
        {
          "name": "Шлюз",
          "count": 3
        },
        {
          "name": "Вузол зв’язку",
          "count": 2
        }
      ],
      "provisions": [
        {
          "name": "Питна вода",
          "amount": 42000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Бойові раціони",
          "amount": 5200,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Консервоване м’ясо",
          "amount": 1600,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Сухе молоко",
          "amount": 380,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Військові медичні комплекти",
          "amount": 64,
          "unit": "шт.",
          "category": "medicine"
        },
        {
          "name": "Антибіотики",
          "amount": 900,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 11000,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Запасні фільтри",
          "amount": 120,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 88,
        "water": 88,
        "energy": 86,
        "integrity": 91,
        "medicine": 78,
        "morale": 70
      }
    },
    "Лікарняний комплекс": {
      "areaM2": 5400,
      "roomCount": 41,
      "rooms": [
        {
          "name": "Палата",
          "count": 16
        },
        {
          "name": "Операційна",
          "count": 4
        },
        {
          "name": "Реанімація",
          "count": 2
        },
        {
          "name": "Аптека",
          "count": 2
        },
        {
          "name": "Лабораторія",
          "count": 2
        },
        {
          "name": "Карантинний бокс",
          "count": 4
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Склад",
          "count": 5
        },
        {
          "name": "Санітарний блок",
          "count": 5
        }
      ],
      "provisions": [
        {
          "name": "Стерильна вода",
          "amount": 19000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Лікарняні раціони",
          "amount": 2100,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Ентеральне харчування",
          "amount": 460,
          "unit": "пакетів",
          "category": "food"
        },
        {
          "name": "Антибіотики",
          "amount": 1800,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Знеболювальні",
          "amount": 2200,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Хірургічні набори",
          "amount": 80,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Кисневі балони",
          "amount": 96,
          "unit": "шт.",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 3600,
          "unit": "л",
          "category": "energy"
        }
      ],
      "initialResources": {
        "food": 68,
        "water": 76,
        "energy": 63,
        "integrity": 71,
        "medicine": 94,
        "morale": 64
      }
    },
    "Аграрне сховище": {
      "areaM2": 7600,
      "roomCount": 28,
      "rooms": [
        {
          "name": "Теплична секція",
          "count": 8
        },
        {
          "name": "Житлова кімната",
          "count": 8
        },
        {
          "name": "Насіннєве сховище",
          "count": 2
        },
        {
          "name": "Холодний склад",
          "count": 3
        },
        {
          "name": "Кухня",
          "count": 2
        },
        {
          "name": "Водний вузол",
          "count": 2
        },
        {
          "name": "Майстерня",
          "count": 2
        },
        {
          "name": "Ветеринарний блок",
          "count": 1
        }
      ],
      "provisions": [
        {
          "name": "Технічна й питна вода",
          "amount": 36000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Зерно",
          "amount": 3200,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Картопля",
          "amount": 2600,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Бобові",
          "amount": 1100,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Насіння овочів",
          "amount": 340,
          "unit": "пакетів",
          "category": "food"
        },
        {
          "name": "Ветеринарні препарати",
          "amount": 420,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Біодизель",
          "amount": 4800,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Мінеральні добрива",
          "amount": 2200,
          "unit": "кг",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 94,
        "water": 86,
        "energy": 66,
        "integrity": 64,
        "medicine": 46,
        "morale": 77
      }
    },
    "Промисловий бункер": {
      "areaM2": 4600,
      "roomCount": 25,
      "rooms": [
        {
          "name": "Житловий модуль",
          "count": 8
        },
        {
          "name": "Цех",
          "count": 4
        },
        {
          "name": "Майстерня",
          "count": 3
        },
        {
          "name": "Склад деталей",
          "count": 5
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Медпункт",
          "count": 1
        },
        {
          "name": "Генераторна",
          "count": 2
        },
        {
          "name": "Контрольна",
          "count": 1
        }
      ],
      "provisions": [
        {
          "name": "Питна вода",
          "amount": 15000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Робітничі пайки",
          "amount": 2200,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Тушковане м’ясо",
          "amount": 980,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Крупи",
          "amount": 760,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Промислові аптечки",
          "amount": 28,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Опікові набори",
          "amount": 90,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Мазут",
          "amount": 7200,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Запасні підшипники",
          "amount": 420,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 77,
        "water": 67,
        "energy": 90,
        "integrity": 82,
        "medicine": 55,
        "morale": 60
      }
    },
    "Гірський тунель": {
      "areaM2": 8800,
      "roomCount": 27,
      "rooms": [
        {
          "name": "Житлова галерея",
          "count": 10
        },
        {
          "name": "Транспортний ангар",
          "count": 2
        },
        {
          "name": "Склад",
          "count": 6
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Медичний пункт",
          "count": 1
        },
        {
          "name": "Водозбірна камера",
          "count": 2
        },
        {
          "name": "Ремонтна зона",
          "count": 3
        },
        {
          "name": "Вартова",
          "count": 2
        }
      ],
      "provisions": [
        {
          "name": "Джерельна вода",
          "amount": 30000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Сухі пайки",
          "amount": 2600,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Солонина",
          "amount": 430,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Сухофрукти",
          "amount": 290,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Польові аптечки",
          "amount": 24,
          "unit": "шт.",
          "category": "medicine"
        },
        {
          "name": "Протизастудні препарати",
          "amount": 360,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 5600,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Вибухові заряди для розчищення",
          "amount": 48,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 72,
        "water": 90,
        "energy": 73,
        "integrity": 88,
        "medicine": 50,
        "morale": 65
      }
    },
    "Підземний торговий центр": {
      "areaM2": 7200,
      "roomCount": 37,
      "rooms": [
        {
          "name": "Житловий сектор",
          "count": 12
        },
        {
          "name": "Продуктовий склад",
          "count": 7
        },
        {
          "name": "Кухня",
          "count": 3
        },
        {
          "name": "Медпункт",
          "count": 2
        },
        {
          "name": "Майстерня",
          "count": 2
        },
        {
          "name": "Охоронна кімната",
          "count": 2
        },
        {
          "name": "Санітарний блок",
          "count": 5
        },
        {
          "name": "Холодильна камера",
          "count": 4
        }
      ],
      "provisions": [
        {
          "name": "Бутильована вода",
          "amount": 28000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Консерви асорті",
          "amount": 3100,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Борошно",
          "amount": 1200,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Цукор",
          "amount": 640,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Аптечні препарати",
          "amount": 760,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Перев’язувальні матеріали",
          "amount": 180,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Пальне",
          "amount": 2400,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Одноразовий посуд",
          "amount": 6000,
          "unit": "комплектів",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 91,
        "water": 78,
        "energy": 57,
        "integrity": 59,
        "medicine": 72,
        "morale": 75
      }
    },
    "Бункер нафтової компанії": {
      "areaM2": 3900,
      "roomCount": 23,
      "rooms": [
        {
          "name": "Житловий блок",
          "count": 8
        },
        {
          "name": "Диспетчерська",
          "count": 2
        },
        {
          "name": "Майстерня",
          "count": 2
        },
        {
          "name": "Паливне сховище",
          "count": 3
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Медпункт",
          "count": 1
        },
        {
          "name": "Склад",
          "count": 4
        },
        {
          "name": "Шлюз",
          "count": 2
        }
      ],
      "provisions": [
        {
          "name": "Питна вода",
          "amount": 17000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Висококалорійні раціони",
          "amount": 2500,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Рибні консерви",
          "amount": 700,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Крупи",
          "amount": 500,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Аптечки нафтовиків",
          "amount": 22,
          "unit": "комплекти",
          "category": "medicine"
        },
        {
          "name": "Протиопікові засоби",
          "amount": 170,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 18000,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Мастильні матеріали",
          "amount": 2400,
          "unit": "л",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 80,
        "water": 72,
        "energy": 98,
        "integrity": 84,
        "medicine": 57,
        "morale": 63
      }
    },
    "Сховище університету": {
      "areaM2": 5800,
      "roomCount": 34,
      "rooms": [
        {
          "name": "Аудиторія-житловий блок",
          "count": 12
        },
        {
          "name": "Лабораторія",
          "count": 5
        },
        {
          "name": "Бібліотека",
          "count": 2
        },
        {
          "name": "Кухня",
          "count": 2
        },
        {
          "name": "Медпункт",
          "count": 1
        },
        {
          "name": "Склад",
          "count": 4
        },
        {
          "name": "Серверна",
          "count": 1
        },
        {
          "name": "Майстерня",
          "count": 2
        },
        {
          "name": "Санітарний блок",
          "count": 5
        }
      ],
      "provisions": [
        {
          "name": "Питна вода",
          "amount": 21000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Студентські сухі пайки",
          "amount": 2400,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Крупи та макарони",
          "amount": 950,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Консервовані овочі",
          "amount": 1200,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Навчальні медичні набори",
          "amount": 30,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Лабораторні реактиви",
          "amount": 260,
          "unit": "наборів",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 3100,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Папір і канцелярія",
          "amount": 480,
          "unit": "коробок",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 79,
        "water": 73,
        "energy": 65,
        "integrity": 67,
        "medicine": 61,
        "morale": 83
      }
    },
    "Монастирський бункер": {
      "areaM2": 1700,
      "roomCount": 21,
      "rooms": [
        {
          "name": "Келія",
          "count": 12
        },
        {
          "name": "Трапезна",
          "count": 1
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Комора",
          "count": 3
        },
        {
          "name": "Лазарет",
          "count": 1
        },
        {
          "name": "Каплиця",
          "count": 1
        },
        {
          "name": "Криниця",
          "count": 1
        },
        {
          "name": "Майстерня",
          "count": 1
        }
      ],
      "provisions": [
        {
          "name": "Колодязна вода",
          "amount": 14000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Зерно",
          "amount": 1100,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Сушені овочі",
          "amount": 430,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Мед",
          "amount": 260,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Трав’яні настоянки",
          "amount": 180,
          "unit": "флаконів",
          "category": "medicine"
        },
        {
          "name": "Перев’язувальна тканина",
          "amount": 120,
          "unit": "рулонів",
          "category": "medicine"
        },
        {
          "name": "Дрова",
          "amount": 6200,
          "unit": "кг",
          "category": "energy"
        },
        {
          "name": "Свічки",
          "amount": 900,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 76,
        "water": 87,
        "energy": 46,
        "integrity": 78,
        "medicine": 43,
        "morale": 88
      }
    },
    "Шахтний комплекс": {
      "areaM2": 14500,
      "roomCount": 38,
      "rooms": [
        {
          "name": "Житлова штольня",
          "count": 14
        },
        {
          "name": "Кухня",
          "count": 2
        },
        {
          "name": "Склад",
          "count": 8
        },
        {
          "name": "Медпункт",
          "count": 2
        },
        {
          "name": "Компресорна",
          "count": 2
        },
        {
          "name": "Майстерня",
          "count": 4
        },
        {
          "name": "Водозбірник",
          "count": 3
        },
        {
          "name": "Підйомна станція",
          "count": 2
        },
        {
          "name": "Диспетчерська",
          "count": 1
        }
      ],
      "provisions": [
        {
          "name": "Питна вода",
          "amount": 34000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Шахтарські пайки",
          "amount": 4100,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "М’ясні консерви",
          "amount": 1500,
          "unit": "банок",
          "category": "food"
        },
        {
          "name": "Крупи",
          "amount": 980,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Шахтні аптечки",
          "amount": 38,
          "unit": "комплектів",
          "category": "medicine"
        },
        {
          "name": "Кисневі саморятівники",
          "amount": 140,
          "unit": "шт.",
          "category": "medicine"
        },
        {
          "name": "Дизельне пальне",
          "amount": 8700,
          "unit": "л",
          "category": "energy"
        },
        {
          "name": "Кріпильний ліс",
          "amount": 160,
          "unit": "м³",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 83,
        "water": 81,
        "energy": 79,
        "integrity": 74,
        "medicine": 56,
        "morale": 59
      }
    }
  },
  "fantasy": {
    "Рунна цитадель": {
      "areaM2": 6800,
      "roomCount": 31,
      "rooms": [
        {
          "name": "Казарма",
          "count": 8
        },
        {
          "name": "Рунний зал",
          "count": 2
        },
        {
          "name": "Тронна зала",
          "count": 1
        },
        {
          "name": "Грибний сад",
          "count": 4
        },
        {
          "name": "Комора",
          "count": 5
        },
        {
          "name": "Лазарет",
          "count": 2
        },
        {
          "name": "Кузня",
          "count": 2
        },
        {
          "name": "Колодязна камера",
          "count": 1
        },
        {
          "name": "Вартова башта",
          "count": 4
        },
        {
          "name": "Крипта",
          "count": 2
        }
      ],
      "provisions": [
        {
          "name": "Джерельна вода",
          "amount": 180,
          "unit": "бочок",
          "category": "water"
        },
        {
          "name": "Зерно",
          "amount": 420,
          "unit": "мішків",
          "category": "food"
        },
        {
          "name": "Солонина",
          "amount": 190,
          "unit": "діжок",
          "category": "food"
        },
        {
          "name": "Сушені гриби",
          "amount": 260,
          "unit": "кошиків",
          "category": "food"
        },
        {
          "name": "Цілющі настоянки",
          "amount": 340,
          "unit": "флаконів",
          "category": "medicine"
        },
        {
          "name": "Рунні бинти",
          "amount": 120,
          "unit": "рулонів",
          "category": "medicine"
        },
        {
          "name": "Кристали мани",
          "amount": 48,
          "unit": "шт.",
          "category": "energy"
        },
        {
          "name": "Лампова олія",
          "amount": 90,
          "unit": "діжок",
          "category": "energy"
        }
      ],
      "initialResources": {
        "food": 82,
        "water": 79,
        "energy": 86,
        "integrity": 92,
        "medicine": 67,
        "morale": 72
      }
    },
    "Підземний монастир": {
      "areaM2": 3300,
      "roomCount": 32,
      "rooms": [
        {
          "name": "Келія",
          "count": 18
        },
        {
          "name": "Трапезна",
          "count": 1
        },
        {
          "name": "Скрипторій",
          "count": 2
        },
        {
          "name": "Каплиця",
          "count": 2
        },
        {
          "name": "Комора",
          "count": 4
        },
        {
          "name": "Лазарет",
          "count": 1
        },
        {
          "name": "Катакомби",
          "count": 3
        },
        {
          "name": "Джерельна печера",
          "count": 1
        }
      ],
      "provisions": [
        {
          "name": "Свята вода",
          "amount": 96,
          "unit": "бочок",
          "category": "water"
        },
        {
          "name": "Ячмінь",
          "amount": 260,
          "unit": "мішків",
          "category": "food"
        },
        {
          "name": "Сушені коренеплоди",
          "amount": 180,
          "unit": "кошиків",
          "category": "food"
        },
        {
          "name": "Сир",
          "amount": 110,
          "unit": "кругів",
          "category": "food"
        },
        {
          "name": "Монастирські еліксири",
          "amount": 170,
          "unit": "флаконів",
          "category": "medicine"
        },
        {
          "name": "Лікувальні трави",
          "amount": 75,
          "unit": "тюків",
          "category": "medicine"
        },
        {
          "name": "Свічки з бджолиного воску",
          "amount": 1400,
          "unit": "шт.",
          "category": "energy"
        },
        {
          "name": "Дрова",
          "amount": 240,
          "unit": "в’язок",
          "category": "energy"
        }
      ],
      "initialResources": {
        "food": 74,
        "water": 88,
        "energy": 54,
        "integrity": 80,
        "medicine": 61,
        "morale": 91
      }
    },
    "Башта чарівника": {
      "areaM2": 2100,
      "roomCount": 19,
      "rooms": [
        {
          "name": "Спальня",
          "count": 7
        },
        {
          "name": "Велика бібліотека",
          "count": 1
        },
        {
          "name": "Алхімічна лабораторія",
          "count": 2
        },
        {
          "name": "Зала порталів",
          "count": 1
        },
        {
          "name": "Кухня",
          "count": 1
        },
        {
          "name": "Комора",
          "count": 2
        },
        {
          "name": "Обсерваторія",
          "count": 1
        },
        {
          "name": "Вартова кімната",
          "count": 2
        },
        {
          "name": "Підземне сховище",
          "count": 2
        }
      ],
      "provisions": [
        {
          "name": "Зачарована вода",
          "amount": 60,
          "unit": "амфор",
          "category": "water"
        },
        {
          "name": "Самовідновні хлібини",
          "amount": 160,
          "unit": "шт.",
          "category": "food"
        },
        {
          "name": "Сушене м’ясо василіска",
          "amount": 80,
          "unit": "зв’язок",
          "category": "food"
        },
        {
          "name": "Мішки круп",
          "amount": 120,
          "unit": "шт.",
          "category": "food"
        },
        {
          "name": "Універсальні протиотрути",
          "amount": 90,
          "unit": "флаконів",
          "category": "medicine"
        },
        {
          "name": "Еліксири відновлення",
          "amount": 140,
          "unit": "флаконів",
          "category": "medicine"
        },
        {
          "name": "Кристали накопиченої мани",
          "amount": 72,
          "unit": "шт.",
          "category": "energy"
        },
        {
          "name": "Алхімічне вугілля",
          "amount": 55,
          "unit": "ящиків",
          "category": "energy"
        }
      ],
      "initialResources": {
        "food": 68,
        "water": 63,
        "energy": 96,
        "integrity": 70,
        "medicine": 86,
        "morale": 76
      }
    },
    "Печера гномів": {
      "areaM2": 9200,
      "roomCount": 46,
      "rooms": [
        {
          "name": "Спальна галерея",
          "count": 16
        },
        {
          "name": "Кузня",
          "count": 4
        },
        {
          "name": "Пивна зала",
          "count": 2
        },
        {
          "name": "Комора",
          "count": 8
        },
        {
          "name": "Кринична камера",
          "count": 2
        },
        {
          "name": "Лазарет",
          "count": 2
        },
        {
          "name": "Рудний склад",
          "count": 5
        },
        {
          "name": "Вартова",
          "count": 4
        },
        {
          "name": "Тунельний вузол",
          "count": 3
        }
      ],
      "provisions": [
        {
          "name": "Підземна вода",
          "amount": 240,
          "unit": "бочок",
          "category": "water"
        },
        {
          "name": "Житній сухар",
          "amount": 520,
          "unit": "мішків",
          "category": "food"
        },
        {
          "name": "Копчене м’ясо",
          "amount": 310,
          "unit": "діжок",
          "category": "food"
        },
        {
          "name": "Коренеплоди",
          "amount": 430,
          "unit": "кошиків",
          "category": "food"
        },
        {
          "name": "Гном’ячі тоніки",
          "amount": 240,
          "unit": "флаконів",
          "category": "medicine"
        },
        {
          "name": "Опікові мазі",
          "amount": 110,
          "unit": "банок",
          "category": "medicine"
        },
        {
          "name": "Коксівне вугілля",
          "amount": 380,
          "unit": "возів",
          "category": "energy"
        },
        {
          "name": "Лампова олія",
          "amount": 130,
          "unit": "діжок",
          "category": "energy"
        }
      ],
      "initialResources": {
        "food": 89,
        "water": 85,
        "energy": 88,
        "integrity": 95,
        "medicine": 64,
        "morale": 81
      }
    }
  },
  "space": {
    "Колоніальний ковчег": {
      "areaM2": 220000,
      "roomCount": 137,
      "rooms": [
        {
          "name": "Житлова каюта",
          "count": 64
        },
        {
          "name": "Кріосекція",
          "count": 12
        },
        {
          "name": "Гідропонний відсік",
          "count": 8
        },
        {
          "name": "Медичний модуль",
          "count": 4
        },
        {
          "name": "Машинне відділення",
          "count": 6
        },
        {
          "name": "Склад",
          "count": 18
        },
        {
          "name": "Командний місток",
          "count": 1
        },
        {
          "name": "Лабораторія",
          "count": 6
        },
        {
          "name": "Санітарний модуль",
          "count": 10
        },
        {
          "name": "Шлюз",
          "count": 8
        }
      ],
      "provisions": [
        {
          "name": "Регенерована вода",
          "amount": 420000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Ліофілізовані раціони",
          "amount": 68000,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Білкова паста",
          "amount": 19000,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Насіннєві капсули",
          "amount": 2400,
          "unit": "шт.",
          "category": "food"
        },
        {
          "name": "Медгель",
          "amount": 5200,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Хірургічні картриджі",
          "amount": 640,
          "unit": "шт.",
          "category": "medicine"
        },
        {
          "name": "Реакторні паливні стрижні",
          "amount": 96,
          "unit": "шт.",
          "category": "energy"
        },
        {
          "name": "Кисневі картриджі",
          "amount": 1800,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 91,
        "water": 92,
        "energy": 78,
        "integrity": 66,
        "medicine": 84,
        "morale": 62
      }
    },
    "Орбітальна станція": {
      "areaM2": 48000,
      "roomCount": 58,
      "rooms": [
        {
          "name": "Житлова каюта",
          "count": 24
        },
        {
          "name": "Лабораторія",
          "count": 6
        },
        {
          "name": "Склад",
          "count": 10
        },
        {
          "name": "Медвідсік",
          "count": 2
        },
        {
          "name": "Доковий шлюз",
          "count": 4
        },
        {
          "name": "Ферма водоростей",
          "count": 4
        },
        {
          "name": "Кухонний модуль",
          "count": 2
        },
        {
          "name": "Командний центр",
          "count": 1
        },
        {
          "name": "Технічний відсік",
          "count": 5
        }
      ],
      "provisions": [
        {
          "name": "Регенерована вода",
          "amount": 86000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Харчові брикети",
          "amount": 22000,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Водоростевий концентрат",
          "amount": 6400,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Заморожені овочі",
          "amount": 3100,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Медичні нанокапсули",
          "amount": 1800,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Перев’язувальний гель",
          "amount": 900,
          "unit": "картриджів",
          "category": "medicine"
        },
        {
          "name": "Акумуляторні блоки",
          "amount": 180,
          "unit": "шт.",
          "category": "energy"
        },
        {
          "name": "Кисневі мембрани",
          "amount": 420,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 78,
        "water": 87,
        "energy": 72,
        "integrity": 61,
        "medicine": 76,
        "morale": 67
      }
    },
    "Космічна база": {
      "areaM2": 76000,
      "roomCount": 78,
      "rooms": [
        {
          "name": "Казарма",
          "count": 32
        },
        {
          "name": "Командний модуль",
          "count": 2
        },
        {
          "name": "Ангар",
          "count": 4
        },
        {
          "name": "Арсенал",
          "count": 6
        },
        {
          "name": "Медблок",
          "count": 3
        },
        {
          "name": "Склад",
          "count": 14
        },
        {
          "name": "Реакторний відсік",
          "count": 3
        },
        {
          "name": "Кухня",
          "count": 3
        },
        {
          "name": "Шлюз",
          "count": 6
        },
        {
          "name": "Майстерня",
          "count": 5
        }
      ],
      "provisions": [
        {
          "name": "Регенерована вода",
          "amount": 150000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Військові космораціони",
          "amount": 38000,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Синтетичний білок",
          "amount": 9800,
          "unit": "кг",
          "category": "food"
        },
        {
          "name": "Вітамінні концентрати",
          "amount": 12000,
          "unit": "доз",
          "category": "food"
        },
        {
          "name": "Бойові медкомплекти",
          "amount": 720,
          "unit": "шт.",
          "category": "medicine"
        },
        {
          "name": "Медгель",
          "amount": 3400,
          "unit": "доз",
          "category": "medicine"
        },
        {
          "name": "Торієві паливні касети",
          "amount": 42,
          "unit": "шт.",
          "category": "energy"
        },
        {
          "name": "Кисневі балони",
          "amount": 760,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 86,
        "water": 84,
        "energy": 93,
        "integrity": 89,
        "medicine": 80,
        "morale": 71
      }
    },
    "Наукова станція": {
      "areaM2": 35000,
      "roomCount": 52,
      "rooms": [
        {
          "name": "Житлова каюта",
          "count": 18
        },
        {
          "name": "Лабораторія",
          "count": 10
        },
        {
          "name": "Обсерваторія",
          "count": 2
        },
        {
          "name": "Бібліотечний модуль",
          "count": 1
        },
        {
          "name": "Медвідсік",
          "count": 2
        },
        {
          "name": "Кухня",
          "count": 2
        },
        {
          "name": "Склад",
          "count": 8
        },
        {
          "name": "Серверна",
          "count": 2
        },
        {
          "name": "Технічний відсік",
          "count": 4
        },
        {
          "name": "Шлюз",
          "count": 3
        }
      ],
      "provisions": [
        {
          "name": "Регенерована вода",
          "amount": 72000,
          "unit": "л",
          "category": "water"
        },
        {
          "name": "Дослідницькі раціони",
          "amount": 18000,
          "unit": "порцій",
          "category": "food"
        },
        {
          "name": "Культура харчових дріжджів",
          "amount": 1200,
          "unit": "контейнерів",
          "category": "food"
        },
        {
          "name": "Заморожені зразки культур",
          "amount": 680,
          "unit": "контейнерів",
          "category": "food"
        },
        {
          "name": "Медичні синтезатори",
          "amount": 12,
          "unit": "шт.",
          "category": "medicine"
        },
        {
          "name": "Фармацевтичні прекурсори",
          "amount": 1500,
          "unit": "касет",
          "category": "medicine"
        },
        {
          "name": "Термоядерні паливні гранули",
          "amount": 800,
          "unit": "шт.",
          "category": "energy"
        },
        {
          "name": "Фільтри життєзабезпечення",
          "amount": 260,
          "unit": "шт.",
          "category": "utility"
        }
      ],
      "initialResources": {
        "food": 72,
        "water": 80,
        "energy": 85,
        "integrity": 74,
        "medicine": 92,
        "morale": 79
      }
    }
  }
};

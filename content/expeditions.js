"use strict";

module.exports = {
  "modern": [
    {
      "id": "m_pharmacy",
      "name": "Покинута аптека",
      "description": "У підсобних приміщеннях могли залишитися ліки, але частина будівлі обвалилася.",
      "tags": [
        "medicine",
        "survival",
        "investigation"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 13,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -4
      },
      "asset": {
        "name": "Фармацевтичний довідник",
        "description": "Допомагає ощадливіше використовувати медикаменти."
      }
    },
    {
      "id": "m_water",
      "name": "Міська водоочисна станція",
      "description": "На станції можуть бути фільтри, реагенти й запасні насоси.",
      "tags": [
        "water",
        "technical",
        "science"
      ],
      "difficulty": 4,
      "success": {
        "water": 16,
        "integrity": 2
      },
      "failure": {
        "water": -5,
        "medicine": -4
      }
    },
    {
      "id": "m_warehouse",
      "name": "Логістичний склад",
      "description": "Усередині багато запасів, але район контролюють невідомі люди.",
      "tags": [
        "defense",
        "social",
        "survival"
      ],
      "difficulty": 4,
      "success": {
        "food": 15,
        "energy": 5
      },
      "failure": {
        "food": -4,
        "morale": -7
      }
    },
    {
      "id": "m_tower",
      "name": "Радіовежа",
      "description": "Відновлення передавача може відкрити нові маршрути й контакти.",
      "tags": [
        "communication",
        "technical",
        "navigation"
      ],
      "difficulty": 3,
      "success": {
        "energy": -3,
        "morale": 10
      },
      "failure": {
        "energy": -7,
        "integrity": -4
      },
      "asset": {
        "name": "Карта радіоконтактів",
        "description": "Координати кількох можливих громад."
      }
    },
    {
      "id": "m_farm",
      "name": "Приміська теплиця",
      "description": "Автоматика зламана, але насіння та частина врожаю могли вціліти.",
      "tags": [
        "food",
        "biology",
        "repair"
      ],
      "difficulty": 2,
      "success": {
        "food": 12,
        "water": 3
      },
      "failure": {
        "water": -4,
        "morale": -3
      },
      "asset": {
        "name": "Колекція насіння",
        "description": "Різноманітні культури для майбутньої теплиці."
      }
    },
    {
      "id": "m_firestation",
      "name": "Пожежна частина",
      "description": "Тут можуть бути захисне спорядження, інструменти й цистерна води.",
      "tags": [
        "defense",
        "repair",
        "medicine"
      ],
      "difficulty": 3,
      "success": {
        "water": 8,
        "integrity": 7,
        "medicine": 3
      },
      "failure": {
        "medicine": -5,
        "morale": -4
      }
    },
    {
      "id": "m_school",
      "name": "Покинута школа",
      "description": "Будівля використовувалася як притулок, залишилися запаси та записки.",
      "tags": [
        "social",
        "survival",
        "investigation"
      ],
      "difficulty": 2,
      "success": {
        "food": 8,
        "medicine": 5,
        "morale": 4
      },
      "failure": {
        "morale": -5,
        "medicine": -3
      },
      "asset": {
        "name": "Щоденники вчителів",
        "description": "Містять інформацію про зниклі громади."
      }
    },
    {
      "id": "m_hospital_wing",
      "name": "Східне крило лікарні",
      "description": "Завалене крило з операційними та аптекою.",
      "tags": [
        "medicine",
        "investigation",
        "repair"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 18,
        "integrity": 3
      },
      "failure": {
        "medicine": -8,
        "integrity": -5
      },
      "asset": {
        "name": "Портативний УЗД-сканер",
        "description": "Дозволяє діагностувати внутрішні травми."
      }
    },
    {
      "id": "m_police_station",
      "name": "Поліцейська дільниця",
      "description": "У сейфах можуть бути зброя та боєприпаси, але сигналізація активна.",
      "tags": [
        "defense",
        "social",
        "investigation"
      ],
      "difficulty": 4,
      "success": {
        "integrity": 10,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -5
      },
      "asset": {
        "name": "Бронежилет",
        "description": "Зменшує ризик травм під час сутичок."
      }
    },
    {
      "id": "m_gas_station",
      "name": "Автозаправка",
      "description": "Підземні резервуари можуть містити паливо, але є ризик вибуху.",
      "tags": [
        "technical",
        "energy",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "energy": 14,
        "integrity": 2
      },
      "failure": {
        "energy": -10,
        "integrity": -6
      }
    },
    {
      "id": "m_power_plant",
      "name": "Теплоелектростанція",
      "description": "Можна відновити електропостачання, якщо знайти запчастини.",
      "tags": [
        "technical",
        "energy",
        "repair"
      ],
      "difficulty": 5,
      "success": {
        "energy": 22,
        "integrity": 8
      },
      "failure": {
        "energy": -12,
        "integrity": -10
      },
      "asset": {
        "name": "Генераторний модуль",
        "description": "Забезпечує 10% додаткової енергії."
      }
    },
    {
      "id": "m_library",
      "name": "Міська бібліотека",
      "description": "Архіви технічної літератури та посібників.",
      "tags": [
        "science",
        "investigation",
        "communication"
      ],
      "difficulty": 2,
      "success": {
        "morale": 8,
        "medicine": 4
      },
      "failure": {
        "morale": -3
      },
      "asset": {
        "name": "Енциклопедія виживання",
        "description": "Підвищує ефективність експедицій."
      }
    },
    {
      "id": "m_bank",
      "name": "Банківське сховище",
      "description": "Броньовані двері та вогнетривкі сейфи, але час підтискає.",
      "tags": [
        "defense",
        "investigation",
        "repair"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 12,
        "morale": 10,
        "medicine": 5
      },
      "failure": {
        "integrity": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Золоті зливки",
        "description": "Цінний ресурс для обміну."
      }
    },
    {
      "id": "m_construction_site",
      "name": "Будівельний майданчик",
      "description": "Важка техніка та будматеріали, але територія нестабільна.",
      "tags": [
        "repair",
        "defense",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 12,
        "energy": 5
      },
      "failure": {
        "integrity": -8,
        "medicine": -4
      },
      "asset": {
        "name": "Зварювальний апарат",
        "description": "Полегшує ремонт конструкцій."
      }
    },
    {
      "id": "m_mall",
      "name": "Торговий центр",
      "description": "Багато магазинів, але ймовірні засідки мародерів.",
      "tags": [
        "survival",
        "social",
        "food"
      ],
      "difficulty": 4,
      "success": {
        "food": 18,
        "water": 10,
        "medicine": 6
      },
      "failure": {
        "food": -8,
        "morale": -10
      }
    },
    {
      "id": "m_subway",
      "name": "Метрополітен",
      "description": "Тунелі можуть бути безпечними маршрутами, але є ризик обвалів.",
      "tags": [
        "navigation",
        "investigation",
        "water"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 6,
        "morale": 5,
        "medicine": 4
      },
      "failure": {
        "integrity": -10,
        "medicine": -6
      },
      "asset": {
        "name": "Мапа тунелів",
        "description": "Відкриває нові маршрути."
      }
    },
    {
      "id": "m_sewers",
      "name": "Колекторні тунелі",
      "description": "Неприємне місце, але можна знайти воду та вийти до різних районів.",
      "tags": [
        "water",
        "navigation",
        "medicine"
      ],
      "difficulty": 3,
      "success": {
        "water": 12,
        "medicine": 4
      },
      "failure": {
        "water": -5,
        "medicine": -6,
        "morale": -4
      }
    },
    {
      "id": "m_airport",
      "name": "Аеропорт",
      "description": "Злітна смуга, ангари та диспетчерська вишка.",
      "tags": [
        "navigation",
        "communication",
        "technical"
      ],
      "difficulty": 4,
      "success": {
        "energy": 8,
        "integrity": 9,
        "morale": 6
      },
      "failure": {
        "energy": -8,
        "integrity": -6
      },
      "asset": {
        "name": "Авіаційне паливо",
        "description": "Високоякісне джерело енергії."
      }
    },
    {
      "id": "m_dam",
      "name": "Гребля",
      "description": "Гідроелектростанція може дати чисту енергію, але доступ ускладнений.",
      "tags": [
        "energy",
        "water",
        "technical"
      ],
      "difficulty": 5,
      "success": {
        "energy": 20,
        "water": 15
      },
      "failure": {
        "integrity": -10,
        "energy": -8
      },
      "asset": {
        "name": "Турбіна",
        "description": "Підвищує виробництво енергії."
      }
    },
    {
      "id": "m_cave",
      "name": "Печера біля міста",
      "description": "Зазвичай використовувалася як склад, можуть бути старі запаси.",
      "tags": [
        "survival",
        "food",
        "water"
      ],
      "difficulty": 2,
      "success": {
        "food": 10,
        "water": 8
      },
      "failure": {
        "morale": -4,
        "medicine": -3
      }
    },
    {
      "id": "m_military_base",
      "name": "Військова база",
      "description": "Велика територія з ангарами, зброєю та медичним пунктом.",
      "tags": [
        "defense",
        "medicine",
        "energy"
      ],
      "difficulty": 6,
      "success": {
        "integrity": 18,
        "medicine": 14,
        "energy": 12
      },
      "failure": {
        "integrity": -15,
        "morale": -12
      },
      "asset": {
        "name": "Тактичний планшет",
        "description": "Карта з позначками безпечних зон."
      }
    },
    {
      "id": "m_laboratory",
      "name": "Наукова лабораторія",
      "description": "Хімікати, обладнання та дослідження.",
      "tags": [
        "science",
        "medicine",
        "investigation"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 14,
        "morale": 6
      },
      "failure": {
        "medicine": -8,
        "integrity": -6
      },
      "asset": {
        "name": "Набір реактивів",
        "description": "Дозволяє синтезувати ліки."
      }
    },
    {
      "id": "m_cemetery",
      "name": "Старий цвинтар",
      "description": "Тихе місце, але деякі споруди можуть бути укриттями.",
      "tags": [
        "survival",
        "investigation",
        "morale"
      ],
      "difficulty": 1,
      "success": {
        "morale": 6,
        "medicine": 2
      },
      "failure": {
        "morale": -4
      }
    },
    {
      "id": "m_observatory",
      "name": "Астрономічна обсерваторія",
      "description": "Телескопи та зв'язок для далеких перельотів.",
      "tags": [
        "communication",
        "science",
        "navigation"
      ],
      "difficulty": 3,
      "success": {
        "morale": 12,
        "integrity": 4
      },
      "failure": {
        "energy": -6,
        "morale": -5
      },
      "asset": {
        "name": "Навігаційний модуль",
        "description": "Покращує точність маршрутів."
      }
    },
    {
      "id": "m_brewery",
      "name": "Пивоварний завод",
      "description": "Запаси зерна, води та технологічне обладнання.",
      "tags": [
        "food",
        "water",
        "technical"
      ],
      "difficulty": 2,
      "success": {
        "food": 12,
        "water": 6
      },
      "failure": {
        "food": -4,
        "medicine": -4
      }
    },
    {
      "id": "m_stadium",
      "name": "Спортивний стадіон",
      "description": "Великі площі для розміщення людей, але зламана інфраструктура.",
      "tags": [
        "social",
        "survival",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "morale": 10,
        "food": 8,
        "water": 6
      },
      "failure": {
        "morale": -8,
        "medicine": -4
      }
    },
    {
      "id": "m_hotel",
      "name": "Покинутий готель",
      "description": "Кімнати можуть містити запаси, але деякі поверхи завалені.",
      "tags": [
        "survival",
        "food",
        "medicine"
      ],
      "difficulty": 2,
      "success": {
        "food": 10,
        "water": 6,
        "medicine": 4
      },
      "failure": {
        "medicine": -4,
        "morale": -5
      }
    },
    {
      "id": "m_sawmill",
      "name": "Лісопилка",
      "description": "Деревина та інструменти для будівництва, але техніка стара.",
      "tags": [
        "repair",
        "energy",
        "defense"
      ],
      "difficulty": 2,
      "success": {
        "integrity": 10,
        "energy": 4
      },
      "failure": {
        "integrity": -4,
        "medicine": -3
      },
      "asset": {
        "name": "Бензопила",
        "description": "Прискорює роботу з деревиною."
      }
    },
    {
      "id": "m_chemical_plant",
      "name": "Хімічний завод",
      "description": "Небезпечні речовини, але можна знайти гербіциди та добрива.",
      "tags": [
        "science",
        "food",
        "medicine"
      ],
      "difficulty": 5,
      "success": {
        "food": 12,
        "medicine": 10
      },
      "failure": {
        "medicine": -12,
        "integrity": -10
      },
      "asset": {
        "name": "Хіманалізатор",
        "description": "Дозволяє перевіряти продукти."
      }
    },
    {
      "id": "m_garage",
      "name": "Автомайстерня",
      "description": "Запчастини, інструменти та декілька справних двигунів.",
      "tags": [
        "repair",
        "technical",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "energy": 10,
        "integrity": 8
      },
      "failure": {
        "energy": -6,
        "medicine": -4
      },
      "asset": {
        "name": "Електродвигун",
        "description": "Покращує генерацію енергії."
      }
    },
    {
      "id": "m_park",
      "name": "Міський парк",
      "description": "Природа, джерела води та їстівні рослини.",
      "tags": [
        "food",
        "water",
        "biology"
      ],
      "difficulty": 1,
      "success": {
        "food": 8,
        "water": 8,
        "morale": 4
      },
      "failure": {
        "medicine": -3,
        "morale": -3
      }
    },
    {
      "id": "m_museum",
      "name": "Історичний музей",
      "description": "Артефакти, старі карти та наукові експонати.",
      "tags": [
        "investigation",
        "social",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "morale": 12,
        "medicine": 4
      },
      "failure": {
        "morale": -6
      },
      "asset": {
        "name": "Антикварний компас",
        "description": "Покращує навігацію."
      }
    },
    {
      "id": "m_harbor",
      "name": "Морський порт",
      "description": "Судна, контейнери та можливість доступу до моря.",
      "tags": [
        "water",
        "navigation",
        "food"
      ],
      "difficulty": 4,
      "success": {
        "water": 14,
        "food": 12,
        "energy": 6
      },
      "failure": {
        "water": -6,
        "medicine": -6
      },
      "asset": {
        "name": "Рибальське спорядження",
        "description": "Забезпечує доступ до рибних ресурсів."
      }
    },
    {
      "id": "m_silo",
      "name": "Зерносховище",
      "description": "Величезні запаси зерна, але частина зіпсована.",
      "tags": [
        "food",
        "survival",
        "repair"
      ],
      "difficulty": 2,
      "success": {
        "food": 18,
        "integrity": 4
      },
      "failure": {
        "food": -6,
        "medicine": -4
      }
    },
    {
      "id": "m_barracks",
      "name": "Казарми",
      "description": "Можна знайти військове спорядження та аптечку.",
      "tags": [
        "defense",
        "medicine",
        "survival"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 10,
        "medicine": 8
      },
      "failure": {
        "medicine": -6,
        "morale": -5
      },
      "asset": {
        "name": "Тактичний аптечка",
        "description": "Покращує лікування в польових умовах."
      }
    },
    {
      "id": "m_warehouse_district",
      "name": "Складський район",
      "description": "Безліч складів, але вони можуть бути зайняті іншими групами.",
      "tags": [
        "survival",
        "food",
        "defense"
      ],
      "difficulty": 4,
      "success": {
        "food": 16,
        "water": 10,
        "morale": 4
      },
      "failure": {
        "integrity": -8,
        "morale": -8
      }
    },
    {
      "id": "m_bridge",
      "name": "Підвісний міст",
      "description": "Конструкція ослаблена, але відкриває доступ до іншого берега.",
      "tags": [
        "navigation",
        "repair",
        "defense"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 8,
        "morale": 6
      },
      "failure": {
        "integrity": -10,
        "medicine": -4
      },
      "asset": {
        "name": "Сталеві троси",
        "description": "Корисні для будівництва."
      }
    },
    {
      "id": "m_castle_ruins",
      "name": "Руїни старого замку",
      "description": "Незвичне місце з кам'яними стінами та підземеллями.",
      "tags": [
        "investigation",
        "defense",
        "morale"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 10,
        "morale": 8
      },
      "failure": {
        "morale": -6,
        "medicine": -4
      },
      "asset": {
        "name": "Кам'яна кладка",
        "description": "Матеріал для зміцнення стін."
      }
    },
    {
      "id": "m_train_station",
      "name": "Вокзал",
      "description": "Платформи, поїзди та станційні будівлі.",
      "tags": [
        "navigation",
        "survival",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "energy": 8,
        "food": 8,
        "integrity": 4
      },
      "failure": {
        "energy": -6,
        "integrity": -6
      }
    },
    {
      "id": "m_prison",
      "name": "В'язниця",
      "description": "Високі стіни та камери, але всередині може бути зброя.",
      "tags": [
        "defense",
        "survival",
        "investigation"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 14,
        "medicine": 8
      },
      "failure": {
        "integrity": -12,
        "morale": -10
      },
      "asset": {
        "name": "Набір відмичок",
        "description": "Відкриває більшість замків."
      }
    },
    {
      "id": "m_factory",
      "name": "Завод",
      "description": "Величезний промисловий об'єкт з важким обладнанням.",
      "tags": [
        "repair",
        "energy",
        "technical"
      ],
      "difficulty": 4,
      "success": {
        "energy": 16,
        "integrity": 10
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Конвеєрний двигун",
        "description": "Підвищує продуктивність."
      }
    },
    {
      "id": "m_lake",
      "name": "Озеро",
      "description": "Чиста вода та риба, але взимку водойма замерзає.",
      "tags": [
        "water",
        "food",
        "survival"
      ],
      "difficulty": 2,
      "success": {
        "water": 12,
        "food": 8
      },
      "failure": {
        "water": -4,
        "medicine": -4
      }
    },
    {
      "id": "m_forest_cabin",
      "name": "Лісова хатинка",
      "description": "Схованка мисливця з припасами та зброєю.",
      "tags": [
        "survival",
        "food",
        "defense"
      ],
      "difficulty": 2,
      "success": {
        "food": 8,
        "medicine": 6,
        "morale": 4
      },
      "failure": {
        "morale": -4,
        "medicine": -3
      },
      "asset": {
        "name": "Мисливська рушниця",
        "description": "Підвищує ефективність захисту."
      }
    },
    {
      "id": "m_vineyard",
      "name": "Виноградник",
      "description": "Плантації та підвали з вином і консервацією.",
      "tags": [
        "food",
        "water",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "food": 10,
        "water": 5,
        "morale": 8
      },
      "failure": {
        "food": -4,
        "morale": -5
      }
    },
    {
      "id": "m_radio_telescope",
      "name": "Радіотелескоп",
      "description": "Може відновити зв'язок з іншими континентами.",
      "tags": [
        "communication",
        "science",
        "navigation"
      ],
      "difficulty": 4,
      "success": {
        "morale": 14,
        "energy": 6
      },
      "failure": {
        "energy": -8,
        "morale": -8
      },
      "asset": {
        "name": "Посилювач сигналу",
        "description": "Покращує далекозв'язок."
      }
    },
    {
      "id": "m_quarry",
      "name": "Кам'яний кар'єр",
      "description": "Будівельний камінь та інструменти.",
      "tags": [
        "repair",
        "defense",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 14,
        "energy": 4
      },
      "failure": {
        "integrity": -6,
        "medicine": -4
      },
      "asset": {
        "name": "Відбійний молоток",
        "description": "Прискорює видобуток каменю."
      }
    },
    {
      "id": "m_water_tower",
      "name": "Водонапірна вежа",
      "description": "Забезпечує водою цілий район, якщо відремонтувати насоси.",
      "tags": [
        "water",
        "technical",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "water": 14,
        "integrity": 6
      },
      "failure": {
        "water": -6,
        "energy": -6
      }
    },
    {
      "id": "m_greenhouse_complex",
      "name": "Комплекс теплиць",
      "description": "Декілька великих теплиць, автоматизація зламана.",
      "tags": [
        "food",
        "biology",
        "water"
      ],
      "difficulty": 3,
      "success": {
        "food": 16,
        "water": 8
      },
      "failure": {
        "food": -6,
        "medicine": -5
      },
      "asset": {
        "name": "Система крапельного поливу",
        "description": "Економить воду."
      }
    },
    {
      "id": "m_observatory_tower",
      "name": "Вежа спостереження",
      "description": "Чудовий огляд, можна виявити небезпеки та ресурси.",
      "tags": [
        "navigation",
        "defense",
        "communication"
      ],
      "difficulty": 2,
      "success": {
        "morale": 8,
        "integrity": 6
      },
      "failure": {
        "morale": -4,
        "integrity": -3
      },
      "asset": {
        "name": "Дальномір",
        "description": "Покращує планування маршрутів."
      }
    },
    {
      "id": "m_biogas_plant",
      "name": "Біогазова станція",
      "description": "Переробляє відходи в енергію, але потребує ремонту.",
      "tags": [
        "energy",
        "technical",
        "water"
      ],
      "difficulty": 4,
      "success": {
        "energy": 14,
        "water": 6
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Біореактор",
        "description": "Підвищує виробництво енергії."
      }
    },
    {
      "id": "m_clinic",
      "name": "Приватна клініка",
      "description": "Мала клініка з обладнанням та ліками.",
      "tags": [
        "medicine",
        "investigation",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 14,
        "integrity": 4
      },
      "failure": {
        "medicine": -8,
        "morale": -6
      },
      "asset": {
        "name": "Стоматологічне обладнання",
        "description": "Дозволяє лікувати зуби."
      }
    },
    {
      "id": "m_zoo",
      "name": "Зоопарк",
      "description": "Вольєри, тварини та корм, але частина тварин здичавіла.",
      "tags": [
        "biology",
        "food",
        "medicine"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 6,
        "food": 12,
        "morale": 4
      },
      "failure": {
        "medicine": -6,
        "integrity": -6
      },
      "asset": {
        "name": "Документація по біології",
        "description": "Допомагає вивчати тварин."
      }
    },
    {
      "id": "m_armory",
      "name": "Склад зброї",
      "description": "Охороняється автоматикою, але можна отримати доступ.",
      "tags": [
        "defense",
        "technical",
        "investigation"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 16,
        "morale": 8
      },
      "failure": {
        "integrity": -12,
        "medicine": -8
      },
      "asset": {
        "name": "Снайперська гвинтівка",
        "description": "Покращує захист."
      }
    },
    {
      "id": "m_mine_shaft",
      "name": "Шахта",
      "description": "Вугілля, метали, але є ризик обвалу.",
      "tags": [
        "energy",
        "repair",
        "defense"
      ],
      "difficulty": 4,
      "success": {
        "energy": 18,
        "integrity": 8
      },
      "failure": {
        "integrity": -12,
        "medicine": -8
      },
      "asset": {
        "name": "Шахтарський ліхтар",
        "description": "Освітлює темні зони."
      }
    },
    {
      "id": "m_dockyard",
      "name": "Судноверф",
      "description": "Можна знайти запчастини та паливо для транспорту.",
      "tags": [
        "water",
        "technical",
        "repair"
      ],
      "difficulty": 4,
      "success": {
        "water": 10,
        "energy": 10,
        "integrity": 6
      },
      "failure": {
        "energy": -8,
        "integrity": -8
      }
    },
    {
      "id": "m_research_center",
      "name": "Науковий центр",
      "description": "Лабораторії, бібліотеки та обладнання.",
      "tags": [
        "science",
        "medicine",
        "communication"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 12,
        "morale": 8,
        "integrity": 6
      },
      "failure": {
        "medicine": -8,
        "integrity": -8
      },
      "asset": {
        "name": "Сканер ДНК",
        "description": "Допомагає виявляти захворювання."
      }
    },
    {
      "id": "m_ski_resort",
      "name": "Гірськолижний курорт",
      "description": "Високо в горах, можна знайти їжу та одяг.",
      "tags": [
        "survival",
        "food",
        "water"
      ],
      "difficulty": 3,
      "success": {
        "food": 10,
        "water": 8,
        "morale": 6
      },
      "failure": {
        "medicine": -6,
        "morale": -6
      },
      "asset": {
        "name": "Термобілизна",
        "description": "Захищає від холоду."
      }
    },
    {
      "id": "m_bakery",
      "name": "Пекарня",
      "description": "Борошно, дріжджі та обладнання для випічки.",
      "tags": [
        "food",
        "water",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "food": 12,
        "morale": 8
      },
      "failure": {
        "food": -6,
        "medicine": -4
      }
    },
    {
      "id": "m_fuel_depot",
      "name": "Нафтобаза",
      "description": "Паливо є, але потрібно відкачувати з резервуарів.",
      "tags": [
        "energy",
        "technical",
        "repair"
      ],
      "difficulty": 4,
      "success": {
        "energy": 18,
        "integrity": 6
      },
      "failure": {
        "energy": -12,
        "integrity": -10
      },
      "asset": {
        "name": "Насосна станція",
        "description": "Полегшує видобуток палива."
      }
    },
    {
      "id": "m_wind_farm",
      "name": "Вітряна електростанція",
      "description": "Вітряки дають енергію, але деякі з них потребують ремонту.",
      "tags": [
        "energy",
        "technical",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "energy": 14,
        "integrity": 6
      },
      "failure": {
        "energy": -8,
        "integrity": -6
      }
    },
    {
      "id": "m_solar_farm",
      "name": "Сонячна електростанція",
      "description": "Панелі дають енергію, але накопичувачі вийшли з ладу.",
      "tags": [
        "energy",
        "technical",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "energy": 12,
        "integrity": 8
      },
      "failure": {
        "energy": -6,
        "integrity": -6
      },
      "asset": {
        "name": "Акумуляторна батарея",
        "description": "Забезпечує енергією вночі."
      }
    },
    {
      "id": "m_geothermal",
      "name": "Геотермальна станція",
      "description": "Стабільне джерело енергії, але доступ ускладнений.",
      "tags": [
        "energy",
        "water",
        "technical"
      ],
      "difficulty": 5,
      "success": {
        "energy": 20,
        "water": 8
      },
      "failure": {
        "integrity": -12,
        "energy": -10
      },
      "asset": {
        "name": "Теплообмінник",
        "description": "Підвищує ефективність."
      }
    },
    {
      "id": "m_botanical_garden",
      "name": "Ботанічний сад",
      "description": "Різноманітні рослини, лікувальні трави та дерева.",
      "tags": [
        "biology",
        "medicine",
        "food"
      ],
      "difficulty": 2,
      "success": {
        "medicine": 12,
        "food": 8
      },
      "failure": {
        "medicine": -4,
        "morale": -4
      },
      "asset": {
        "name": "Гербарій",
        "description": "Дозволяє ідентифікувати рослини."
      }
    },
    {
      "id": "m_castle",
      "name": "Середньовічний замок",
      "description": "Кам'яні стіни, підземелля та історичні артефакти.",
      "tags": [
        "defense",
        "investigation",
        "morale"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 12,
        "morale": 8
      },
      "failure": {
        "integrity": -6,
        "morale": -6
      },
      "asset": {
        "name": "Лицарський меч",
        "description": "Надійна зброя."
      }
    },
    {
      "id": "m_tunnel",
      "name": "Тунель через гору",
      "description": "Скорочує шлях, але може бути завалений.",
      "tags": [
        "navigation",
        "repair",
        "defense"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 8,
        "energy": 4
      },
      "failure": {
        "integrity": -10,
        "medicine": -6
      }
    },
    {
      "id": "m_lighthouse",
      "name": "Маяк",
      "description": "На узбережжі, можна використовувати як спостережний пункт.",
      "tags": [
        "navigation",
        "communication",
        "water"
      ],
      "difficulty": 2,
      "success": {
        "morale": 8,
        "water": 4
      },
      "failure": {
        "morale": -4,
        "integrity": -4
      }
    },
    {
      "id": "m_tannery",
      "name": "Шкіряний завод",
      "description": "Шкіра, дубильні речовини та обладнання.",
      "tags": [
        "survival",
        "repair",
        "defense"
      ],
      "difficulty": 2,
      "success": {
        "integrity": 8,
        "morale": 4
      },
      "failure": {
        "medicine": -4,
        "morale": -4
      },
      "asset": {
        "name": "Дубильна речовина",
        "description": "Покращує якість шкіри."
      }
    },
    {
      "id": "m_brewery_old",
      "name": "Стара броварня",
      "description": "Сировини може бути багато, але технологія стара.",
      "tags": [
        "food",
        "water",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "food": 10,
        "water": 4,
        "morale": 6
      },
      "failure": {
        "food": -4,
        "morale": -5
      }
    },
    {
      "id": "m_glassworks",
      "name": "Склодувний завод",
      "description": "Матеріали для виготовлення скла, вікон, посуду.",
      "tags": [
        "repair",
        "technical",
        "defense"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 10,
        "energy": 4
      },
      "failure": {
        "integrity": -6,
        "medicine": -4
      },
      "asset": {
        "name": "Склоріз",
        "description": "Дозволяє різати скло."
      }
    },
    {
      "id": "m_paper_mill",
      "name": "Паперовий комбінат",
      "description": "Папір, картон, записи та документація.",
      "tags": [
        "investigation",
        "communication",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "morale": 8,
        "medicine": 4
      },
      "failure": {
        "morale": -4
      },
      "asset": {
        "name": "Друкарське обладнання",
        "description": "Дозволяє друкувати документи."
      }
    },
    {
      "id": "m_textile_factory",
      "name": "Текстильна фабрика",
      "description": "Тканини, нитки, одяг, ковдри.",
      "tags": [
        "survival",
        "repair",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "morale": 10,
        "medicine": 4
      },
      "failure": {
        "morale": -4,
        "medicine": -3
      },
      "asset": {
        "name": "Швейна машина",
        "description": "Дозволяє шити одяг."
      }
    },
    {
      "id": "m_furniture_factory",
      "name": "Меблева фабрика",
      "description": "Дерево, інструменти та меблі.",
      "tags": [
        "repair",
        "survival",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "integrity": 8,
        "morale": 6
      },
      "failure": {
        "integrity": -4,
        "medicine": -3
      }
    },
    {
      "id": "m_electronics_store",
      "name": "Магазин електроніки",
      "description": "Комплектуючі, кабелі, батареї.",
      "tags": [
        "technical",
        "repair",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "energy": 8,
        "integrity": 6
      },
      "failure": {
        "energy": -6,
        "medicine": -4
      },
      "asset": {
        "name": "Набір мікросхем",
        "description": "Дозволяє ремонтувати електроніку."
      }
    },
    {
      "id": "m_toy_store",
      "name": "Магазин іграшок",
      "description": "Дивне місце з іграшками, які піднімають настрій.",
      "tags": [
        "morale",
        "social",
        "survival"
      ],
      "difficulty": 1,
      "success": {
        "morale": 10
      },
      "failure": {
        "morale": -3
      },
      "asset": {
        "name": "Настільні ігри",
        "description": "Підвищують мораль."
      }
    },
    {
      "id": "m_sports_shop",
      "name": "Спортивний магазин",
      "description": "Спорядження, одяг, велосипеди.",
      "tags": [
        "survival",
        "repair",
        "defense"
      ],
      "difficulty": 2,
      "success": {
        "morale": 8,
        "integrity": 4
      },
      "failure": {
        "morale": -4
      },
      "asset": {
        "name": "Туристичне спорядження",
        "description": "Полегшує експедиції."
      }
    },
    {
      "id": "m_jewelry_store",
      "name": "Ювелірний магазин",
      "description": "Золото, срібло, дорогоцінне каміння.",
      "tags": [
        "social",
        "defense",
        "morale"
      ],
      "difficulty": 3,
      "success": {
        "morale": 12,
        "integrity": 4
      },
      "failure": {
        "integrity": -6,
        "medicine": -4
      },
      "asset": {
        "name": "Золоті монети",
        "description": "Валюта для обміну."
      }
    },
    {
      "id": "m_paint_shop",
      "name": "Магазин фарб",
      "description": "Фарби, розчинники, інструменти.",
      "tags": [
        "repair",
        "survival",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "integrity": 6,
        "morale": 4
      },
      "failure": {
        "morale": -3
      }
    },
    {
      "id": "m_music_store",
      "name": "Магазин музики",
      "description": "Інструменти, записи, ноти.",
      "tags": [
        "morale",
        "social",
        "communication"
      ],
      "difficulty": 1,
      "success": {
        "morale": 12
      },
      "failure": {
        "morale": -4
      },
      "asset": {
        "name": "Гітара",
        "description": "Підвищує мораль."
      }
    },
    {
      "id": "m_camera_store",
      "name": "Фотомагазин",
      "description": "Камери, об'єктиви, оптика.",
      "tags": [
        "investigation",
        "communication",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "morale": 8,
        "integrity": 4
      },
      "failure": {
        "morale": -4
      },
      "asset": {
        "name": "Бінокль",
        "description": "Покращує огляд."
      }
    },
    {
      "id": "m_model_shop",
      "name": "Магазин моделей",
      "description": "Дрібні деталі, клей, інструменти.",
      "tags": [
        "repair",
        "technical",
        "morale"
      ],
      "difficulty": 1,
      "success": {
        "morale": 6,
        "integrity": 4
      },
      "failure": {
        "morale": -3
      }
    },
    {
      "id": "m_gun_store",
      "name": "Збройовий магазин",
      "description": "Зброя, боєприпаси, захисне спорядження.",
      "tags": [
        "defense",
        "survival",
        "technical"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 16,
        "medicine": 6
      },
      "failure": {
        "integrity": -12,
        "morale": -10
      },
      "asset": {
        "name": "Боєприпаси",
        "description": "Забезпечує захист."
      }
    },
    {
      "id": "m_survival_store",
      "name": "Магазин виживання",
      "description": "Рюкзаки, ножі, набори для виживання.",
      "tags": [
        "survival",
        "repair",
        "defense"
      ],
      "difficulty": 2,
      "success": {
        "integrity": 10,
        "medicine": 6
      },
      "failure": {
        "integrity": -4,
        "morale": -4
      },
      "asset": {
        "name": "Набір для виживання",
        "description": "Покращує шанси в експедиціях."
      }
    },
    {
      "id": "m_bookstore",
      "name": "Книгарня",
      "description": "Література на будь-яку тему: техніка, медицина, історія.",
      "tags": [
        "investigation",
        "science",
        "morale"
      ],
      "difficulty": 1,
      "success": {
        "morale": 8,
        "medicine": 4
      },
      "failure": {
        "morale": -3
      },
      "asset": {
        "name": "Технічний довідник",
        "description": "Підвищує ефективність ремонту."
      }
    }
  ],
  "fantasy": [
    {
      "id": "f_temple",
      "name": "Руїни храму",
      "description": "У криптах можуть лишитися ліки, реліквії або прокляття.",
      "tags": [
        "magic",
        "medicine",
        "investigation"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 13,
        "morale": 4
      },
      "failure": {
        "medicine": -4,
        "morale": -6
      },
      "asset": {
        "name": "Срібний оберіг",
        "description": "Послаблює темну магію поблизу фортеці."
      }
    },
    {
      "id": "f_forest",
      "name": "Відьомський ліс",
      "description": "Тут багато їстівних рослин, але стежки змінюються самі.",
      "tags": [
        "biology",
        "survival",
        "magic"
      ],
      "difficulty": 4,
      "success": {
        "food": 14,
        "medicine": 6
      },
      "failure": {
        "food": -3,
        "morale": -7
      }
    },
    {
      "id": "f_village",
      "name": "Покинуте село",
      "description": "У будинках можуть бути запаси й уцілілі мешканці.",
      "tags": [
        "social",
        "survival",
        "defense"
      ],
      "difficulty": 3,
      "success": {
        "food": 11,
        "water": 8,
        "morale": 3
      },
      "failure": {
        "integrity": -4,
        "morale": -6
      },
      "asset": {
        "name": "Врятований коваль",
        "description": "Допомагає підтримувати браму та інструменти."
      }
    },
    {
      "id": "f_dragon",
      "name": "Печера молодого дракона",
      "description": "Високий ризик, зате легенди говорять про метал і великі запаси.",
      "tags": [
        "defense",
        "biology",
        "social"
      ],
      "difficulty": 5,
      "success": {
        "food": 18,
        "integrity": 10,
        "morale": 8
      },
      "failure": {
        "medicine": -10,
        "morale": -10,
        "integrity": -5
      }
    },
    {
      "id": "f_mine",
      "name": "Затоплена гном’яча шахта",
      "description": "Старі механізми ще можна запустити, якщо знайти сухий прохід.",
      "tags": [
        "mining",
        "repair",
        "navigation"
      ],
      "difficulty": 4,
      "success": {
        "energy": 10,
        "integrity": 9
      },
      "failure": {
        "medicine": -5,
        "integrity": -5
      },
      "asset": {
        "name": "Ящик рунних деталей",
        "description": "Підходить для ремонту складних механізмів."
      }
    },
    {
      "id": "f_garden",
      "name": "Сад покинутого алхіміка",
      "description": "Рослини корисні, але деякі з них активно захищають грядки.",
      "tags": [
        "medicine",
        "biology",
        "magic"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 9,
        "food": 7
      },
      "failure": {
        "medicine": -4,
        "morale": -5
      }
    },
    {
      "id": "f_tower_mage",
      "name": "Вежа відлюдника-мага",
      "description": "У старій вежі можуть бути сувої, зілля та артефакти.",
      "tags": [
        "magic",
        "investigation",
        "medicine"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 12,
        "energy": 8,
        "morale": 6
      },
      "failure": {
        "energy": -8,
        "morale": -8
      },
      "asset": {
        "name": "Книга заклинань",
        "description": "Дає доступ до нових магічних можливостей."
      }
    },
    {
      "id": "f_swamp",
      "name": "Болото відьом",
      "description": "Кислотні випари, але багато рідкісних трав.",
      "tags": [
        "biology",
        "medicine",
        "magic"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 16,
        "water": -4
      },
      "failure": {
        "medicine": -8,
        "morale": -6
      },
      "asset": {
        "name": "Болотний корінь",
        "description": "Допомагає синтезувати зілля."
      }
    },
    {
      "id": "f_crypt",
      "name": "Крипта древніх королів",
      "description": "Сакофаги, золото та захист від нежиті.",
      "tags": [
        "defense",
        "investigation",
        "morale"
      ],
      "difficulty": 4,
      "success": {
        "integrity": 12,
        "morale": 10,
        "energy": 4
      },
      "failure": {
        "integrity": -10,
        "morale": -8
      },
      "asset": {
        "name": "Королівський меч",
        "description": "Зброя проти нежиті."
      }
    },
    {
      "id": "f_waterfall",
      "name": "Водоспад-джерело",
      "description": "Священне місце з цілющою водою.",
      "tags": [
        "water",
        "medicine",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "water": 14,
        "medicine": 6,
        "morale": 4
      },
      "failure": {
        "medicine": -4,
        "morale": -4
      },
      "asset": {
        "name": "Пляшка зі святою водою",
        "description": "Лікує хвороби."
      }
    },
    {
      "id": "f_giant_cavern",
      "name": "Печера велетня",
      "description": "Велетенські кістки, камені та можливі магічні предмети.",
      "tags": [
        "mining",
        "magic",
        "defense"
      ],
      "difficulty": 4,
      "success": {
        "energy": 12,
        "integrity": 10
      },
      "failure": {
        "integrity": -8,
        "morale": -6
      },
      "asset": {
        "name": "Кістка велетня",
        "description": "Матеріал для магічних артефактів."
      }
    },
    {
      "id": "f_enchanted_grove",
      "name": "Зачарований гай",
      "description": "Дерева світяться, повітря чисте, феї танцюють.",
      "tags": [
        "magic",
        "biology",
        "morale"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 10,
        "morale": 12,
        "food": 8
      },
      "failure": {
        "morale": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Гілка світла",
        "description": "Покращує захист від темної магії."
      }
    },
    {
      "id": "f_volcano",
      "name": "Драконья гора",
      "description": "Вулкан з лавою, але в печерах можуть бути копальні.",
      "tags": [
        "mining",
        "energy",
        "defense"
      ],
      "difficulty": 5,
      "success": {
        "energy": 18,
        "integrity": 8
      },
      "failure": {
        "integrity": -12,
        "medicine": -10
      },
      "asset": {
        "name": "Вогнестійкий щит",
        "description": "Захищає від вогню."
      }
    },
    {
      "id": "f_ice_cave",
      "name": "Крижана печера",
      "description": "Стіни з вічного льоду, що світяться синім сяйвом.",
      "tags": [
        "water",
        "medicine",
        "magic"
      ],
      "difficulty": 3,
      "success": {
        "water": 16,
        "medicine": 6
      },
      "failure": {
        "medicine": -6,
        "morale": -6
      },
      "asset": {
        "name": "Крижаний камінь",
        "description": "Охолоджує зілля."
      }
    },
    {
      "id": "f_dark_forest",
      "name": "Темний ліс",
      "description": "Моторошне місце з отруйними рослинами та небезпечними тваринами.",
      "tags": [
        "biology",
        "medicine",
        "survival"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 14,
        "food": 6
      },
      "failure": {
        "medicine": -10,
        "morale": -8
      },
      "asset": {
        "name": "Протиотрута",
        "description": "Допомагає при отруєнні."
      }
    },
    {
      "id": "f_abandoned_keep",
      "name": "Залишений форт",
      "description": "Кам'яні стіни, арсенал та підземелля.",
      "tags": [
        "defense",
        "survival",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 14,
        "energy": 6
      },
      "failure": {
        "integrity": -8,
        "morale": -6
      },
      "asset": {
        "name": "Арбалет",
        "description": "Надійна далекобійна зброя."
      }
    },
    {
      "id": "f_magical_lake",
      "name": "Магічне озеро",
      "description": "Озеро з водою, що виконує бажання, але небезпечне.",
      "tags": [
        "water",
        "magic",
        "morale"
      ],
      "difficulty": 4,
      "success": {
        "water": 18,
        "morale": 14,
        "medicine": 8
      },
      "failure": {
        "morale": -12,
        "integrity": -8
      },
      "asset": {
        "name": "Амулет бажань",
        "description": "Одноразове виконання бажання."
      }
    },
    {
      "id": "f_goblin_mine",
      "name": "Шахта гоблінів",
      "description": "Заповнена гоблінами, але там є залізо та золото.",
      "tags": [
        "mining",
        "defense",
        "social"
      ],
      "difficulty": 4,
      "success": {
        "integrity": 12,
        "energy": 10
      },
      "failure": {
        "medicine": -8,
        "morale": -6
      },
      "asset": {
        "name": "Гоблінська зброя",
        "description": "Легка, але міцна."
      }
    },
    {
      "id": "f_moon_temple",
      "name": "Храм Місяця",
      "description": "Жриці Місяця залишили артефакти та цілющі зілля.",
      "tags": [
        "magic",
        "medicine",
        "investigation"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 14,
        "morale": 10
      },
      "failure": {
        "morale": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Місячний камінь",
        "description": "Підсилює магію."
      }
    },
    {
      "id": "f_sun_citadel",
      "name": "Сонячна цитадель",
      "description": "Колись фортеця світла, зараз покинута.",
      "tags": [
        "defense",
        "energy",
        "repair"
      ],
      "difficulty": 4,
      "success": {
        "energy": 14,
        "integrity": 12
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Сонячний кристал",
        "description": "Забезпечує енергією."
      }
    },
    {
      "id": "f_shadow_abyss",
      "name": "Безодня тіней",
      "description": "Глибока ущелина, де живуть тіньові істоти.",
      "tags": [
        "magic",
        "defense",
        "medicine"
      ],
      "difficulty": 6,
      "success": {
        "integrity": 16,
        "energy": 10
      },
      "failure": {
        "integrity": -15,
        "morale": -12
      },
      "asset": {
        "name": "Тіньовий меч",
        "description": "Дуже потужна зброя."
      }
    },
    {
      "id": "f_necropolis",
      "name": "Некрополь",
      "description": "Місто мертвих з нежиттю та скарбами.",
      "tags": [
        "defense",
        "investigation",
        "magic"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 14,
        "medicine": 10,
        "morale": 6
      },
      "failure": {
        "integrity": -12,
        "morale": -10
      },
      "asset": {
        "name": "Посох некроманта",
        "description": "Контролює нежитть."
      }
    },
    {
      "id": "f_crystal_forest",
      "name": "Кристалічний ліс",
      "description": "Дерева з кристалів, що світяться та вібрують.",
      "tags": [
        "magic",
        "energy",
        "biology"
      ],
      "difficulty": 3,
      "success": {
        "energy": 12,
        "morale": 8
      },
      "failure": {
        "energy": -6,
        "medicine": -6
      },
      "asset": {
        "name": "Кристал сили",
        "description": "Покращує магічні здібності."
      }
    },
    {
      "id": "f_giant_spider",
      "name": "Лігво велетенського павука",
      "description": "Небезпечний, але павутина та отрута дуже цінні.",
      "tags": [
        "biology",
        "medicine",
        "defense"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 14,
        "integrity": 6
      },
      "failure": {
        "medicine": -10,
        "morale": -8
      },
      "asset": {
        "name": "Шовкова нитка",
        "description": "Міцний матеріал."
      }
    },
    {
      "id": "f_hermit_cave",
      "name": "Печера самітника",
      "description": "Старий мудрець залишив записи та зілля.",
      "tags": [
        "investigation",
        "medicine",
        "magic"
      ],
      "difficulty": 2,
      "success": {
        "medicine": 10,
        "morale": 8
      },
      "failure": {
        "morale": -4
      },
      "asset": {
        "name": "Щоденник самітника",
        "description": "Містить рецепти зіль."
      }
    },
    {
      "id": "f_fairy_circle",
      "name": "Коло фей",
      "description": "Чаклунське місце, де можна попросити допомоги.",
      "tags": [
        "magic",
        "morale",
        "social"
      ],
      "difficulty": 3,
      "success": {
        "morale": 14,
        "medicine": 6
      },
      "failure": {
        "morale": -10,
        "integrity": -6
      },
      "asset": {
        "name": "Благословення фей",
        "description": "Покращує врожай."
      }
    },
    {
      "id": "f_underdark",
      "name": "Підземелля",
      "description": "Темна, небезпечна зона, але сповнена рідкісних мінералів.",
      "tags": [
        "mining",
        "energy",
        "defense"
      ],
      "difficulty": 5,
      "success": {
        "energy": 18,
        "integrity": 10
      },
      "failure": {
        "integrity": -14,
        "medicine": -10
      },
      "asset": {
        "name": "Світляковий камінь",
        "description": "Освітлює підземелля."
      }
    },
    {
      "id": "f_mushroom_forest",
      "name": "Грибний ліс",
      "description": "Гігантські світні гриби, які можна їсти або використовувати в зіллях.",
      "tags": [
        "food",
        "medicine",
        "biology"
      ],
      "difficulty": 2,
      "success": {
        "food": 12,
        "medicine": 8
      },
      "failure": {
        "medicine": -6,
        "morale": -4
      },
      "asset": {
        "name": "Сушені гриби",
        "description": "Довго зберігаються."
      }
    },
    {
      "id": "f_wind_peak",
      "name": "Пік вітрів",
      "description": "Найвища точка, звідки видно всі землі.",
      "tags": [
        "navigation",
        "morale",
        "magic"
      ],
      "difficulty": 3,
      "success": {
        "morale": 12,
        "integrity": 6
      },
      "failure": {
        "morale": -6,
        "medicine": -6
      },
      "asset": {
        "name": "Карта вітрів",
        "description": "Допомагає планувати маршрути."
      }
    },
    {
      "id": "f_desert_temple",
      "name": "Храм у пустелі",
      "description": "Пісок та загадки, але всередині справжні скарби.",
      "tags": [
        "investigation",
        "magic",
        "water"
      ],
      "difficulty": 4,
      "success": {
        "water": 12,
        "integrity": 10,
        "morale": 8
      },
      "failure": {
        "water": -8,
        "morale": -8
      },
      "asset": {
        "name": "Сонячний амулет",
        "description": "Захищає від спеки."
      }
    },
    {
      "id": "f_shipwreck",
      "name": "Корабельна аварія",
      "description": "Старовинний корабель, викинутий на берег.",
      "tags": [
        "navigation",
        "survival",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "energy": 10,
        "integrity": 8
      },
      "failure": {
        "integrity": -6,
        "medicine": -6
      },
      "asset": {
        "name": "Навігаційний компас",
        "description": "Показує шлях."
      }
    },
    {
      "id": "f_harpy_nest",
      "name": "Гніздо гарпій",
      "description": "На скелях, багато пір'я, кісток і залишків жертв.",
      "tags": [
        "defense",
        "biology",
        "medicine"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 10,
        "integrity": 8
      },
      "failure": {
        "medicine": -8,
        "morale": -6
      },
      "asset": {
        "name": "Перо гарпії",
        "description": "Легке та міцне."
      }
    },
    {
      "id": "f_abandoned_inn",
      "name": "Закинутий трактир",
      "description": "Можна знайти їжу, напої та інформацію.",
      "tags": [
        "survival",
        "food",
        "social"
      ],
      "difficulty": 2,
      "success": {
        "food": 10,
        "morale": 8
      },
      "failure": {
        "morale": -4,
        "medicine": -4
      },
      "asset": {
        "name": "Карта регіону",
        "description": "Показує села."
      }
    },
    {
      "id": "f_poison_swamp",
      "name": "Отруйне болото",
      "description": "Небезпечне, але багате на рідкісні трави.",
      "tags": [
        "medicine",
        "biology",
        "survival"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 16,
        "food": 6
      },
      "failure": {
        "medicine": -10,
        "morale": -8
      },
      "asset": {
        "name": "Протиотруйний корінь",
        "description": "Знешкоджує більшість отрут."
      }
    },
    {
      "id": "f_royal_tomb",
      "name": "Королівська гробниця",
      "description": "Багато золота, але могутнє прокляття.",
      "tags": [
        "defense",
        "investigation",
        "magic"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 14,
        "morale": 12,
        "energy": 8
      },
      "failure": {
        "integrity": -15,
        "morale": -10
      },
      "asset": {
        "name": "Королівська корона",
        "description": "Покращує лідерські здібності."
      }
    },
    {
      "id": "f_wizard_lab",
      "name": "Лабораторія чарівника",
      "description": "Алхімічні столи, сувої та дивні інгредієнти.",
      "tags": [
        "magic",
        "medicine",
        "investigation"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 14,
        "energy": 6
      },
      "failure": {
        "energy": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Філософський камінь",
        "description": "Перетворює метали на золото."
      }
    },
    {
      "id": "f_ice_dragon",
      "name": "Лігво крижаного дракона",
      "description": "Дуже небезпечно, але там багато скарбів.",
      "tags": [
        "defense",
        "energy",
        "magic"
      ],
      "difficulty": 6,
      "success": {
        "energy": 20,
        "integrity": 14
      },
      "failure": {
        "integrity": -18,
        "morale": -15
      },
      "asset": {
        "name": "Крижаний амулет",
        "description": "Захищає від холоду."
      }
    },
    {
      "id": "f_golden_fields",
      "name": "Золоті поля",
      "description": "Пшениця, жито, квіти — все, що потрібно для їжі.",
      "tags": [
        "food",
        "water",
        "morale"
      ],
      "difficulty": 1,
      "success": {
        "food": 14,
        "morale": 6
      },
      "failure": {
        "food": -4,
        "morale": -3
      }
    },
    {
      "id": "f_whispering_cave",
      "name": "Печера шепотів",
      "description": "Голоси в стінах, які можуть попередити про небезпеку.",
      "tags": [
        "magic",
        "investigation",
        "navigation"
      ],
      "difficulty": 3,
      "success": {
        "morale": 12,
        "integrity": 6
      },
      "failure": {
        "morale": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Амулет голосів",
        "description": "Дозволяє чути шепоти."
      }
    },
    {
      "id": "f_bridge_ruins",
      "name": "Руїни мосту",
      "description": "Старий кам'яний міст, який можна відновити.",
      "tags": [
        "repair",
        "navigation",
        "defense"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 12,
        "energy": 4
      },
      "failure": {
        "integrity": -8,
        "medicine": -6
      }
    },
    {
      "id": "f_blood_moon",
      "name": "Місце кривавого місяця",
      "description": "Таємне місце для ритуалів, але дуже темне.",
      "tags": [
        "magic",
        "medicine",
        "morale"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 14,
        "energy": 8
      },
      "failure": {
        "morale": -12,
        "integrity": -10
      },
      "asset": {
        "name": "Кривавий камінь",
        "description": "Підсилює магію."
      }
    },
    {
      "id": "f_elemental_spring",
      "name": "Джерело стихій",
      "description": "Вода, вогонь, земля, повітря — всі чотири стихії.",
      "tags": [
        "energy",
        "water",
        "magic"
      ],
      "difficulty": 4,
      "success": {
        "energy": 14,
        "water": 12,
        "integrity": 6
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Стихійний камінь",
        "description": "Контролює стихії."
      }
    },
    {
      "id": "f_silver_mine",
      "name": "Срібна шахта",
      "description": "Багата на срібло, яке використовується проти вовкулаків.",
      "tags": [
        "mining",
        "defense",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "energy": 12,
        "integrity": 8
      },
      "failure": {
        "integrity": -6,
        "medicine": -6
      },
      "asset": {
        "name": "Срібний клинок",
        "description": "Зброя проти нежиті."
      }
    },
    {
      "id": "f_starlight_pond",
      "name": "Ставок зоряного світла",
      "description": "Вода світиться вночі, має лікувальні властивості.",
      "tags": [
        "water",
        "medicine",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "medicine": 10,
        "morale": 8
      },
      "failure": {
        "medicine": -4
      },
      "asset": {
        "name": "Зоряний еліксир",
        "description": "Лікує хвороби."
      }
    },
    {
      "id": "f_gryphon_nest",
      "name": "Гніздо грифона",
      "description": "На високій скелі, є яйця та скарби.",
      "tags": [
        "defense",
        "biology",
        "morale"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 14,
        "morale": 12
      },
      "failure": {
        "integrity": -12,
        "medicine": -10
      },
      "asset": {
        "name": "Яйце грифона",
        "description": "Можна виростити грифона."
      }
    },
    {
      "id": "f_dwarven_forge",
      "name": "Гномська кузня",
      "description": "Ковальське обладнання та багато металу.",
      "tags": [
        "repair",
        "energy",
        "defense"
      ],
      "difficulty": 3,
      "success": {
        "energy": 12,
        "integrity": 10
      },
      "failure": {
        "energy": -6,
        "medicine": -6
      },
      "asset": {
        "name": "Ковальський молот",
        "description": "Прискорює ремонт."
      }
    },
    {
      "id": "f_elven_ruins",
      "name": "Ельфійські руїни",
      "description": "Витончені будівлі з магічними залишками.",
      "tags": [
        "magic",
        "investigation",
        "morale"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 10,
        "morale": 10,
        "energy": 6
      },
      "failure": {
        "energy": -8,
        "morale": -8
      },
      "asset": {
        "name": "Ельфійський лук",
        "description": "Точна далекобійна зброя."
      }
    },
    {
      "id": "f_troll_bridge",
      "name": "Міст тролів",
      "description": "Потрібно домовитися з тролем або битися.",
      "tags": [
        "defense",
        "social",
        "navigation"
      ],
      "difficulty": 3,
      "success": {
        "integrity": 8,
        "morale": 6
      },
      "failure": {
        "medicine": -6,
        "morale": -6
      },
      "asset": {
        "name": "Амулет троля",
        "description": "Покращує соціальні навички."
      }
    },
    {
      "id": "f_ghost_tower",
      "name": "Вежа примар",
      "description": "Стародавня вежа, де живуть привиди.",
      "tags": [
        "magic",
        "investigation",
        "defense"
      ],
      "difficulty": 4,
      "success": {
        "morale": 12,
        "medicine": 8
      },
      "failure": {
        "morale": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Примарний плащ",
        "description": "Дозволяє стати невидимим."
      }
    },
    {
      "id": "f_lost_city",
      "name": "Загублене місто",
      "description": "Цивілізація зникла, але залишилися артефакти.",
      "tags": [
        "investigation",
        "magic",
        "survival"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 16,
        "energy": 12,
        "morale": 8
      },
      "failure": {
        "integrity": -12,
        "morale": -10
      },
      "asset": {
        "name": "Ключ міста",
        "description": "Відкриває стародавні двері."
      }
    },
    {
      "id": "f_plant_giant",
      "name": "Гігантська рослина",
      "description": "Рослина-хижак, але в ній багато цінних речовин.",
      "tags": [
        "biology",
        "medicine",
        "food"
      ],
      "difficulty": 4,
      "success": {
        "food": 12,
        "medicine": 10
      },
      "failure": {
        "medicine": -8,
        "integrity": -6
      },
      "asset": {
        "name": "Екстракт рослини",
        "description": "Покращує зілля."
      }
    },
    {
      "id": "f_sky_island",
      "name": "Острів у небі",
      "description": "Магічний острів, що пливе над землею.",
      "tags": [
        "magic",
        "energy",
        "navigation"
      ],
      "difficulty": 4,
      "success": {
        "energy": 16,
        "morale": 12
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Кристал польоту",
        "description": "Дозволяє літати."
      }
    },
    {
      "id": "f_underwater_city",
      "name": "Підводне місто",
      "description": "Місто на дні озера, доступне через портали.",
      "tags": [
        "water",
        "investigation",
        "magic"
      ],
      "difficulty": 5,
      "success": {
        "water": 18,
        "medicine": 12,
        "integrity": 8
      },
      "failure": {
        "water": -10,
        "morale": -10
      },
      "asset": {
        "name": "Акварельний камінь",
        "description": "Дозволяє дихати під водою."
      }
    },
    {
      "id": "f_sand_wraith",
      "name": "Піщаний привид",
      "description": "Істота з піску, яка охороняє оазу.",
      "tags": [
        "water",
        "defense",
        "magic"
      ],
      "difficulty": 4,
      "success": {
        "water": 14,
        "integrity": 8
      },
      "failure": {
        "integrity": -10,
        "medicine": -8
      },
      "asset": {
        "name": "Піщаний амулет",
        "description": "Захищає в пустелі."
      }
    },
    {
      "id": "f_echo_cave",
      "name": "Печера відлуння",
      "description": "Кожен звук багаторазово повторюється.",
      "tags": [
        "investigation",
        "magic",
        "navigation"
      ],
      "difficulty": 2,
      "success": {
        "morale": 8,
        "integrity": 4
      },
      "failure": {
        "morale": -4
      }
    },
    {
      "id": "f_vampire_castle",
      "name": "Замок вампіра",
      "description": "Моторошне місце зі скарбами, але дуже небезпечне.",
      "tags": [
        "defense",
        "medicine",
        "magic"
      ],
      "difficulty": 6,
      "success": {
        "integrity": 18,
        "medicine": 14
      },
      "failure": {
        "integrity": -15,
        "morale": -12
      },
      "asset": {
        "name": "Срібний хрест",
        "description": "Зброя проти вампірів."
      }
    },
    {
      "id": "f_werewolf_forest",
      "name": "Ліс вовкулаків",
      "description": "Нічні перегони, але вдень можна знайти цінні речі.",
      "tags": [
        "biology",
        "defense",
        "medicine"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 12,
        "integrity": 8
      },
      "failure": {
        "medicine": -10,
        "morale": -8
      },
      "asset": {
        "name": "Вовчий зуб",
        "description": "Амулет проти вовкулаків."
      }
    },
    {
      "id": "f_ancient_oak",
      "name": "Древній дуб",
      "description": "Величезне дерево з порталом до інших світів.",
      "tags": [
        "magic",
        "navigation",
        "morale"
      ],
      "difficulty": 3,
      "success": {
        "morale": 14,
        "energy": 8
      },
      "failure": {
        "energy": -8,
        "morale": -6
      },
      "asset": {
        "name": "Листок дуба",
        "description": "Дозволяє телепортуватися."
      }
    },
    {
      "id": "f_stone_circle",
      "name": "Кам'яне коло",
      "description": "Друїди використовували його для ритуалів.",
      "tags": [
        "magic",
        "medicine",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "energy": 12,
        "medicine": 8
      },
      "failure": {
        "energy": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Руна друїда",
        "description": "Покращує магію."
      }
    },
    {
      "id": "f_wisp_marsh",
      "name": "Болото вогників",
      "description": "Вогники збивають зі шляху, але є рідкісні трави.",
      "tags": [
        "biology",
        "medicine",
        "navigation"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 14,
        "food": 6
      },
      "failure": {
        "medicine": -8,
        "morale": -8
      },
      "asset": {
        "name": "Ліхтар вогників",
        "description": "Освітлює шлях."
      }
    },
    {
      "id": "f_golem_workshop",
      "name": "Майстерня ґолемів",
      "description": "Ґолеми стоять нерухомо, можна активувати.",
      "tags": [
        "magic",
        "repair",
        "defense"
      ],
      "difficulty": 4,
      "success": {
        "integrity": 14,
        "energy": 8
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Ґолем-страж",
        "description": "Захищає фортецю."
      }
    },
    {
      "id": "f_phoenix_nest",
      "name": "Гніздо фенікса",
      "description": "Птах вогню, який перероджується.",
      "tags": [
        "energy",
        "medicine",
        "magic"
      ],
      "difficulty": 5,
      "success": {
        "energy": 18,
        "medicine": 14
      },
      "failure": {
        "integrity": -12,
        "morale": -10
      },
      "asset": {
        "name": "Перо фенікса",
        "description": "Відновлює здоров'я."
      }
    },
    {
      "id": "f_demon_gate",
      "name": "Брама демонів",
      "description": "Демони намагаються прорватися, але їх можна стримувати.",
      "tags": [
        "defense",
        "magic",
        "morale"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 16,
        "morale": 10
      },
      "failure": {
        "integrity": -15,
        "morale": -12
      },
      "asset": {
        "name": "Демонічний клинок",
        "description": "Зброя проти демонів."
      }
    },
    {
      "id": "f_celestial_cove",
      "name": "Небесна бухта",
      "description": "Магічне місце з зірками на дні.",
      "tags": [
        "water",
        "magic",
        "morale"
      ],
      "difficulty": 2,
      "success": {
        "morale": 12,
        "water": 8
      },
      "failure": {
        "morale": -4
      },
      "asset": {
        "name": "Зірковий пісок",
        "description": "Використовується в ритуалах."
      }
    }
  ],
  "space": [
    {
      "id": "s_derelict",
      "name": "Покинутий вантажний корабель",
      "description": "Корпус нестабільний, але трюми можуть бути повними.",
      "tags": [
        "space",
        "repair",
        "navigation"
      ],
      "difficulty": 4,
      "success": {
        "food": 10,
        "energy": 10,
        "medicine": 4
      },
      "failure": {
        "integrity": -6,
        "medicine": -6
      },
      "asset": {
        "name": "Ремонтний маніпулятор",
        "description": "Полегшує зовнішні роботи на корпусі."
      }
    },
    {
      "id": "s_asteroid",
      "name": "Автоматична астероїдна шахта",
      "description": "Можливі паливо й метали, але система безпеки не відповідає.",
      "tags": [
        "mining",
        "technical",
        "digital"
      ],
      "difficulty": 4,
      "success": {
        "energy": 15,
        "integrity": 8
      },
      "failure": {
        "energy": -5,
        "medicine": -5
      }
    },
    {
      "id": "s_greenhouse",
      "name": "Віддалений тепличний модуль",
      "description": "Модуль може зберігати насіння, воду й живі культури.",
      "tags": [
        "food",
        "biology",
        "water"
      ],
      "difficulty": 3,
      "success": {
        "food": 16,
        "water": 9
      },
      "failure": {
        "food": -4,
        "medicine": -4
      },
      "asset": {
        "name": "Нова харчова культура",
        "description": "Швидкоросла рослина для гідропоніки."
      }
    },
    {
      "id": "s_signal",
      "name": "Джерело невідомого сигналу",
      "description": "Сигнал із темного боку супутника повторює імена членів екіпажу.",
      "tags": [
        "communication",
        "science",
        "defense"
      ],
      "difficulty": 5,
      "success": {
        "morale": 9,
        "energy": 6
      },
      "failure": {
        "morale": -12,
        "medicine": -4
      },
      "asset": {
        "name": "Фрагмент чужої технології",
        "description": "Незрозумілий пристрій із потужним джерелом енергії."
      }
    },
    {
      "id": "s_medlab",
      "name": "Покинута орбітальна клініка",
      "description": "Автодок пошкоджений, але запаси медичних матеріалів ще на місці.",
      "tags": [
        "medicine",
        "digital",
        "space"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 15,
        "morale": 3
      },
      "failure": {
        "medicine": -5,
        "energy": -4
      }
    },
    {
      "id": "s_relay",
      "name": "Навігаційний ретранслятор",
      "description": "Станція без живлення, зате її база даних може містити безпечні координати.",
      "tags": [
        "navigation",
        "technical",
        "communication"
      ],
      "difficulty": 3,
      "success": {
        "energy": -4,
        "morale": 8,
        "integrity": 4
      },
      "failure": {
        "energy": -8,
        "integrity": -3
      },
      "asset": {
        "name": "Зоряна карта",
        "description": "Позначає кілька придатних для колонізації систем."
      }
    },
    {
      "id": "s_abandoned_station",
      "name": "Покинута станція",
      "description": "Дослідницька станція з обладнанням та запасами.",
      "tags": [
        "space",
        "science",
        "medicine"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 12,
        "energy": 8,
        "integrity": 6
      },
      "failure": {
        "energy": -8,
        "integrity": -8
      },
      "asset": {
        "name": "Науковий сканер",
        "description": "Покращує дослідження."
      }
    },
    {
      "id": "s_mining_asteroid",
      "name": "Астероїд для видобутку",
      "description": "Багатий на рідкісні метали, але система безпеки активна.",
      "tags": [
        "mining",
        "energy",
        "technical"
      ],
      "difficulty": 4,
      "success": {
        "energy": 16,
        "integrity": 8
      },
      "failure": {
        "energy": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Бурильна установка",
        "description": "Прискорює видобуток."
      }
    },
    {
      "id": "s_cryo_ship",
      "name": "Кріокорабель",
      "description": "Сотні людей у кріосні, але системи виходять із ладу.",
      "tags": [
        "medicine",
        "space",
        "social"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 14,
        "morale": 10
      },
      "failure": {
        "medicine": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Кріомодуль",
        "description": "Дозволяє зберігати людей."
      }
    },
    {
      "id": "s_alien_derelict",
      "name": "Чужий покинутий корабель",
      "description": "Невідома технологія, небезпечне випромінювання.",
      "tags": [
        "space",
        "science",
        "defense"
      ],
      "difficulty": 6,
      "success": {
        "energy": 20,
        "integrity": 12
      },
      "failure": {
        "integrity": -18,
        "medicine": -12
      },
      "asset": {
        "name": "Чужий двигун",
        "description": "Забезпечує надшвидкість."
      }
    },
    {
      "id": "s_gas_giant",
      "name": "Дослідження газового гіганта",
      "description": "Атмосфера багата на ресурси, але шторми дуже небезпечні.",
      "tags": [
        "science",
        "energy",
        "navigation"
      ],
      "difficulty": 5,
      "success": {
        "energy": 18,
        "medicine": 6
      },
      "failure": {
        "energy": -12,
        "integrity": -10
      },
      "asset": {
        "name": "Атмосферний зонд",
        "description": "Збирає дані з планет."
      }
    },
    {
      "id": "s_ringworld",
      "name": "Кільцевий світ",
      "description": "Гігантська структура, яка може бути населеною.",
      "tags": [
        "investigation",
        "science",
        "social"
      ],
      "difficulty": 6,
      "success": {
        "morale": 16,
        "integrity": 14,
        "energy": 10
      },
      "failure": {
        "integrity": -15,
        "morale": -12
      },
      "asset": {
        "name": "Артефакт кільця",
        "description": "Дає доступ до передових технологій."
      }
    },
    {
      "id": "s_abandoned_colony",
      "name": "Покинута колонія",
      "description": "Місто на поверхні планети, залишене без пояснень.",
      "tags": [
        "survival",
        "investigation",
        "medicine"
      ],
      "difficulty": 4,
      "success": {
        "food": 12,
        "water": 10,
        "medicine": 6
      },
      "failure": {
        "medicine": -8,
        "morale": -8
      },
      "asset": {
        "name": "Колоніальний ключ",
        "description": "Відкриває склади."
      }
    },
    {
      "id": "s_orbital_factory",
      "name": "Орбітальна фабрика",
      "description": "Автоматизований завод, що виробляє запчастини.",
      "tags": [
        "repair",
        "energy",
        "technical"
      ],
      "difficulty": 4,
      "success": {
        "energy": 14,
        "integrity": 10
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Заводський модуль",
        "description": "Покращує ремонт."
      }
    },
    {
      "id": "s_pirate_hideout",
      "name": "Схованка піратів",
      "description": "Може бути зброя, паливо та координати інших укриттів.",
      "tags": [
        "defense",
        "navigation",
        "social"
      ],
      "difficulty": 4,
      "success": {
        "integrity": 12,
        "energy": 10,
        "morale": 6
      },
      "failure": {
        "integrity": -12,
        "medicine": -8
      },
      "asset": {
        "name": "Піратська карта",
        "description": "Показує безпечні маршрути."
      }
    },
    {
      "id": "s_water_asteroid",
      "name": "Астероїд із водою",
      "description": "Величезні поклади водяного льоду.",
      "tags": [
        "water",
        "mining",
        "survival"
      ],
      "difficulty": 3,
      "success": {
        "water": 20,
        "energy": 6
      },
      "failure": {
        "water": -8,
        "integrity": -6
      },
      "asset": {
        "name": "Бурова установка",
        "description": "Дозволяє видобувати лід."
      }
    },
    {
      "id": "s_research_base",
      "name": "Наукова база",
      "description": "Закинута база з обладнанням та зразками.",
      "tags": [
        "science",
        "medicine",
        "investigation"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 14,
        "morale": 8
      },
      "failure": {
        "medicine": -6,
        "integrity": -6
      },
      "asset": {
        "name": "Набір пробірок",
        "description": "Покращує дослідження."
      }
    },
    {
      "id": "s_derelict_dreadnought",
      "name": "Покинутий дредноут",
      "description": "Величезний бойовий корабель з озброєнням.",
      "tags": [
        "defense",
        "energy",
        "repair"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 18,
        "energy": 14
      },
      "failure": {
        "integrity": -15,
        "medicine": -10
      },
      "asset": {
        "name": "Плазма-гармата",
        "description": "Потужна зброя."
      }
    },
    {
      "id": "s_mining_station",
      "name": "Шахтарська станція",
      "description": "Станція на астероїді з буровим обладнанням.",
      "tags": [
        "mining",
        "energy",
        "repair"
      ],
      "difficulty": 4,
      "success": {
        "energy": 16,
        "integrity": 8
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Геолокатор",
        "description": "Знаходить ресурси."
      }
    },
    {
      "id": "s_cargo_freighter",
      "name": "Вантажний фрегат",
      "description": "Величезний вантаж із їжею, водою, ліками.",
      "tags": [
        "food",
        "water",
        "medicine"
      ],
      "difficulty": 3,
      "success": {
        "food": 18,
        "water": 12,
        "medicine": 6
      },
      "failure": {
        "food": -8,
        "integrity": -6
      }
    },
    {
      "id": "s_escape_pod",
      "name": "Рятувальна капсула",
      "description": "Може містити виживших або припаси.",
      "tags": [
        "survival",
        "medicine",
        "social"
      ],
      "difficulty": 2,
      "success": {
        "morale": 8,
        "medicine": 6,
        "food": 4
      },
      "failure": {
        "medicine": -4,
        "morale": -4
      }
    },
    {
      "id": "s_communication_relay",
      "name": "Ретранслятор зв'язку",
      "description": "Потужний передавач для зв'язку з Землею.",
      "tags": [
        "communication",
        "navigation",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "morale": 14,
        "energy": 4
      },
      "failure": {
        "energy": -8,
        "morale": -6
      },
      "asset": {
        "name": "Антена",
        "description": "Покращує зв'язок."
      }
    },
    {
      "id": "s_solar_sail",
      "name": "Сонячний вітрильник",
      "description": "Корабель на сонячних вітрилах, який можна відремонтувати.",
      "tags": [
        "navigation",
        "energy",
        "repair"
      ],
      "difficulty": 3,
      "success": {
        "energy": 12,
        "integrity": 6
      },
      "failure": {
        "energy": -8,
        "integrity": -6
      },
      "asset": {
        "name": "Вітрило",
        "description": "Забезпечує безпаливний рух."
      }
    },
    {
      "id": "s_asteroid_belt",
      "name": "Пояс астероїдів",
      "description": "Можна знайти рідкісні метали, але навігація складна.",
      "tags": [
        "mining",
        "navigation",
        "defense"
      ],
      "difficulty": 4,
      "success": {
        "energy": 16,
        "integrity": 6
      },
      "failure": {
        "integrity": -10,
        "medicine": -8
      },
      "asset": {
        "name": "Металодетектор",
        "description": "Знаходить цінні метали."
      }
    },
    {
      "id": "s_gas_mining",
      "name": "Видобуток газу",
      "description": "З газового гіганта можна видобувати паливо.",
      "tags": [
        "energy",
        "technical",
        "survival"
      ],
      "difficulty": 4,
      "success": {
        "energy": 18,
        "integrity": 4
      },
      "failure": {
        "energy": -12,
        "integrity": -10
      },
      "asset": {
        "name": "Газовий екстрактор",
        "description": "Видобуває паливо."
      }
    },
    {
      "id": "s_medical_cruiser",
      "name": "Медичний крейсер",
      "description": "Величезний шпитальний корабель з обладнанням.",
      "tags": [
        "medicine",
        "social",
        "space"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 18,
        "morale": 8
      },
      "failure": {
        "medicine": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Медичний модуль",
        "description": "Покращує лікування."
      }
    },
    {
      "id": "s_derelict_habitat",
      "name": "Покинутий кільцевий модуль",
      "description": "Житлова станція з численними приміщеннями.",
      "tags": [
        "survival",
        "food",
        "water"
      ],
      "difficulty": 3,
      "success": {
        "food": 12,
        "water": 10,
        "morale": 6
      },
      "failure": {
        "food": -6,
        "medicine": -6
      }
    },
    {
      "id": "s_alien_relay",
      "name": "Чужий ретранслятор",
      "description": "Інопланетний пристрій, який може дати доступ до їхньої мережі.",
      "tags": [
        "communication",
        "science",
        "defense"
      ],
      "difficulty": 5,
      "success": {
        "energy": 14,
        "integrity": 10
      },
      "failure": {
        "integrity": -12,
        "morale": -10
      },
      "asset": {
        "name": "Чужий передавач",
        "description": "Покращує зв'язок."
      }
    },
    {
      "id": "s_ice_planet",
      "name": "Льодяна планета",
      "description": "Величезні запаси води, але дуже холодно.",
      "tags": [
        "water",
        "survival",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "water": 20,
        "energy": 6
      },
      "failure": {
        "medicine": -8,
        "integrity": -6
      }
    },
    {
      "id": "s_desert_planet",
      "name": "Пустельна планета",
      "description": "Сонце, пісок, але є оази з водою.",
      "tags": [
        "water",
        "survival",
        "food"
      ],
      "difficulty": 3,
      "success": {
        "water": 12,
        "food": 8
      },
      "failure": {
        "water": -8,
        "medicine": -6
      }
    },
    {
      "id": "s_jungle_planet",
      "name": "Планета-джунглі",
      "description": "Багато їжі, але небезпечні тварини та рослини.",
      "tags": [
        "food",
        "biology",
        "medicine"
      ],
      "difficulty": 4,
      "success": {
        "food": 16,
        "medicine": 10
      },
      "failure": {
        "medicine": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Біологічний сканер",
        "description": "Виявляє небезпечні організми."
      }
    },
    {
      "id": "s_ocean_planet",
      "name": "Океанська планета",
      "description": "Вода, риба, але потрібен підводний транспорт.",
      "tags": [
        "water",
        "food",
        "navigation"
      ],
      "difficulty": 4,
      "success": {
        "water": 16,
        "food": 12
      },
      "failure": {
        "water": -8,
        "medicine": -8
      },
      "asset": {
        "name": "Підводний дрон",
        "description": "Досліджує океан."
      }
    },
    {
      "id": "s_volcanic_planet",
      "name": "Вулканічна планета",
      "description": "Лава, але багато енергії та металів.",
      "tags": [
        "energy",
        "mining",
        "defense"
      ],
      "difficulty": 5,
      "success": {
        "energy": 20,
        "integrity": 10
      },
      "failure": {
        "integrity": -14,
        "medicine": -10
      },
      "asset": {
        "name": "Термозахисний костюм",
        "description": "Захищає від тепла."
      }
    },
    {
      "id": "s_crystal_planet",
      "name": "Кристалічна планета",
      "description": "Вся планета вкрита кристалами, що світяться.",
      "tags": [
        "energy",
        "science",
        "magic"
      ],
      "difficulty": 4,
      "success": {
        "energy": 18,
        "morale": 8
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Енергокристал",
        "description": "Забезпечує енергією."
      }
    },
    {
      "id": "s_artificial_planet",
      "name": "Штучна планета",
      "description": "Побудована цивілізацією, повна таємниць.",
      "tags": [
        "investigation",
        "science",
        "defense"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 16,
        "energy": 14,
        "morale": 8
      },
      "failure": {
        "integrity": -15,
        "morale": -12
      },
      "asset": {
        "name": "Ключ штучної планети",
        "description": "Контролює системи."
      }
    },
    {
      "id": "s_asteroid_city",
      "name": "Астероїдне місто",
      "description": "Місто в астероїді, населене вижилими.",
      "tags": [
        "social",
        "survival",
        "food"
      ],
      "difficulty": 3,
      "success": {
        "food": 12,
        "water": 8,
        "morale": 6
      },
      "failure": {
        "morale": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Міський ідентифікатор",
        "description": "Дає доступ до ресурсів."
      }
    },
    {
      "id": "s_space_whale",
      "name": "Космічний кит",
      "description": "Останній представник виду, його тіло може містити рідкісні речовини.",
      "tags": [
        "biology",
        "medicine",
        "energy"
      ],
      "difficulty": 5,
      "success": {
        "medicine": 14,
        "energy": 10
      },
      "failure": {
        "medicine": -12,
        "morale": -10
      },
      "asset": {
        "name": "Жир кита",
        "description": "Цінний ресурс."
      }
    },
    {
      "id": "s_alien_dyson",
      "name": "Сфера Дайсона",
      "description": "Гігантська структура навколо зірки.",
      "tags": [
        "energy",
        "science",
        "investigation"
      ],
      "difficulty": 6,
      "success": {
        "energy": 25,
        "integrity": 16
      },
      "failure": {
        "integrity": -18,
        "energy": -15
      },
      "asset": {
        "name": "Дайсон-модуль",
        "description": "Нескінченна енергія."
      }
    },
    {
      "id": "s_abandoned_warship",
      "name": "Покинутий військовий корабель",
      "description": "Важкий крейсер з активованими системами оборони.",
      "tags": [
        "defense",
        "energy",
        "repair"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 16,
        "energy": 12
      },
      "failure": {
        "integrity": -14,
        "medicine": -10
      },
      "asset": {
        "name": "Військовий модуль",
        "description": "Покращує захист."
      }
    },
    {
      "id": "s_supply_depot",
      "name": "Складський модуль",
      "description": "Запаси їжі, води, медикаментів.",
      "tags": [
        "food",
        "water",
        "medicine"
      ],
      "difficulty": 2,
      "success": {
        "food": 14,
        "water": 10,
        "medicine": 6
      },
      "failure": {
        "food": -6,
        "integrity": -4
      }
    },
    {
      "id": "s_black_box",
      "name": "Чорний ящик",
      "description": "Збитий корабель, ящик містить дані про катастрофу.",
      "tags": [
        "investigation",
        "navigation",
        "defense"
      ],
      "difficulty": 3,
      "success": {
        "morale": 10,
        "integrity": 6
      },
      "failure": {
        "integrity": -6,
        "medicine": -6
      },
      "asset": {
        "name": "Дані польоту",
        "description": "Відкриває нові маршрути."
      }
    },
    {
      "id": "s_alien_tomb",
      "name": "Чужа гробниця",
      "description": "Інопланетне поховання з артефактами.",
      "tags": [
        "investigation",
        "science",
        "defense"
      ],
      "difficulty": 5,
      "success": {
        "medicine": 14,
        "energy": 12,
        "morale": 8
      },
      "failure": {
        "integrity": -15,
        "morale": -12
      },
      "asset": {
        "name": "Чужий артефакт",
        "description": "Невідома технологія."
      }
    },
    {
      "id": "s_solar_flare",
      "name": "Сонячний спалах",
      "description": "Можна отримати енергію, але потрібний захист.",
      "tags": [
        "energy",
        "technical",
        "survival"
      ],
      "difficulty": 4,
      "success": {
        "energy": 16,
        "integrity": 4
      },
      "failure": {
        "energy": -10,
        "integrity": -10
      },
      "asset": {
        "name": "Сонячний екран",
        "description": "Захищає від випромінювання."
      }
    },
    {
      "id": "s_derelict_ring",
      "name": "Покинуте кільце",
      "description": "Кільцева структура з невідомими механізмами.",
      "tags": [
        "science",
        "investigation",
        "energy"
      ],
      "difficulty": 5,
      "success": {
        "energy": 18,
        "integrity": 12
      },
      "failure": {
        "integrity": -15,
        "energy": -10
      },
      "asset": {
        "name": "Кільцевий ключ",
        "description": "Активує структуру."
      }
    },
    {
      "id": "s_asteroid_habitat",
      "name": "Астероїдний житловий модуль",
      "description": "Модуль, переобладнаний під житло.",
      "tags": [
        "survival",
        "food",
        "water"
      ],
      "difficulty": 3,
      "success": {
        "food": 10,
        "water": 8,
        "morale": 6
      },
      "failure": {
        "food": -6,
        "medicine": -6
      }
    },
    {
      "id": "s_medical_lab",
      "name": "Медична лабораторія",
      "description": "Дослідження вірусів, бактерій, генетики.",
      "tags": [
        "medicine",
        "science",
        "investigation"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 16,
        "integrity": 6
      },
      "failure": {
        "medicine": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Генетичний сканер",
        "description": "Дозволяє лікувати генетичні хвороби."
      }
    },
    {
      "id": "s_cargo_pod",
      "name": "Вантажна капсула",
      "description": "Капсула з ресурсами, дрейфує в космосі.",
      "tags": [
        "food",
        "water",
        "energy"
      ],
      "difficulty": 2,
      "success": {
        "food": 12,
        "water": 8,
        "energy": 4
      },
      "failure": {
        "energy": -6,
        "integrity": -4
      }
    },
    {
      "id": "s_signal_source",
      "name": "Джерело сигналу",
      "description": "Супутник, який постійно транслює сигнал.",
      "tags": [
        "communication",
        "navigation",
        "investigation"
      ],
      "difficulty": 3,
      "success": {
        "morale": 12,
        "energy": 6
      },
      "failure": {
        "energy": -6,
        "morale": -6
      },
      "asset": {
        "name": "Декодер сигналу",
        "description": "Розшифровує повідомлення."
      }
    },
    {
      "id": "s_alien_ruins",
      "name": "Чужі руїни",
      "description": "Інопланетна структура на поверхні планети.",
      "tags": [
        "investigation",
        "science",
        "defense"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 14,
        "energy": 12
      },
      "failure": {
        "integrity": -14,
        "medicine": -10
      },
      "asset": {
        "name": "Чужий артефакт",
        "description": "Дає доступ до технологій."
      }
    },
    {
      "id": "s_meteor_shower",
      "name": "Метеоритний дощ",
      "description": "Можна зібрати уламки, але небезпечно.",
      "tags": [
        "mining",
        "defense",
        "energy"
      ],
      "difficulty": 4,
      "success": {
        "energy": 14,
        "integrity": 6
      },
      "failure": {
        "integrity": -10,
        "medicine": -8
      },
      "asset": {
        "name": "Метеоритний метал",
        "description": "Надзвичайно міцний."
      }
    },
    {
      "id": "s_derelict_cruiser",
      "name": "Покинутий крейсер",
      "description": "Крейсер із зброєю та медичним блоком.",
      "tags": [
        "defense",
        "medicine",
        "energy"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 16,
        "medicine": 12,
        "energy": 8
      },
      "failure": {
        "integrity": -14,
        "morale": -10
      },
      "asset": {
        "name": "Крейсерський двигун",
        "description": "Покращує швидкість."
      }
    },
    {
      "id": "s_asteroid_base",
      "name": "База на астероїді",
      "description": "Піратська база, але можна захопити ресурси.",
      "tags": [
        "defense",
        "social",
        "energy"
      ],
      "difficulty": 4,
      "success": {
        "integrity": 12,
        "energy": 10,
        "morale": 6
      },
      "failure": {
        "integrity": -10,
        "medicine": -8
      },
      "asset": {
        "name": "База даних піратів",
        "description": "Координати схованок."
      }
    },
    {
      "id": "s_water_world",
      "name": "Водний світ",
      "description": "Планета, повністю вкрита океаном.",
      "tags": [
        "water",
        "food",
        "navigation"
      ],
      "difficulty": 3,
      "success": {
        "water": 18,
        "food": 8
      },
      "failure": {
        "water": -8,
        "medicine": -6
      }
    },
    {
      "id": "s_desert_asteroid",
      "name": "Пустельний астероїд",
      "description": "Випалена поверхня, але можна знайти воду.",
      "tags": [
        "water",
        "mining",
        "survival"
      ],
      "difficulty": 3,
      "success": {
        "water": 12,
        "energy": 8
      },
      "failure": {
        "water": -8,
        "integrity": -6
      }
    },
    {
      "id": "s_jungle_moon",
      "name": "Місяць-джунглі",
      "description": "Густа рослинність, багато їжі та ліків.",
      "tags": [
        "food",
        "medicine",
        "biology"
      ],
      "difficulty": 3,
      "success": {
        "food": 14,
        "medicine": 10
      },
      "failure": {
        "medicine": -8,
        "integrity": -6
      },
      "asset": {
        "name": "Тропічний зразок",
        "description": "Нові ліки."
      }
    },
    {
      "id": "s_ice_moon",
      "name": "Льодяний місяць",
      "description": "Під льодом є океан, можна знайти воду та життя.",
      "tags": [
        "water",
        "biology",
        "survival"
      ],
      "difficulty": 4,
      "success": {
        "water": 16,
        "medicine": 8
      },
      "failure": {
        "water": -8,
        "medicine": -6
      },
      "asset": {
        "name": "Бур",
        "description": "Пробурює лід."
      }
    },
    {
      "id": "s_volcanic_moon",
      "name": "Вулканічний місяць",
      "description": "Лава, але багато металів та енергії.",
      "tags": [
        "energy",
        "mining",
        "defense"
      ],
      "difficulty": 4,
      "success": {
        "energy": 16,
        "integrity": 8
      },
      "failure": {
        "integrity": -10,
        "medicine": -8
      },
      "asset": {
        "name": "Термодрон",
        "description": "Досліджує лавові печери."
      }
    },
    {
      "id": "s_crystal_moon",
      "name": "Кристалічний місяць",
      "description": "Поверхня вкрита кристалами, що вібрують.",
      "tags": [
        "energy",
        "science",
        "magic"
      ],
      "difficulty": 3,
      "success": {
        "energy": 14,
        "morale": 6
      },
      "failure": {
        "energy": -8,
        "integrity": -6
      },
      "asset": {
        "name": "Кристалічний резонатор",
        "description": "Підсилює енергію."
      }
    },
    {
      "id": "s_abandoned_freighter",
      "name": "Покинутий фрегат",
      "description": "Величезний вантаж, який потрібно перевірити.",
      "tags": [
        "food",
        "water",
        "medicine"
      ],
      "difficulty": 3,
      "success": {
        "food": 16,
        "water": 10,
        "medicine": 6
      },
      "failure": {
        "food": -8,
        "integrity": -6
      }
    },
    {
      "id": "s_pirate_cruiser",
      "name": "Піратський крейсер",
      "description": "Захоплений піратами, можна звільнити.",
      "tags": [
        "defense",
        "social",
        "morale"
      ],
      "difficulty": 5,
      "success": {
        "integrity": 14,
        "morale": 12,
        "energy": 8
      },
      "failure": {
        "integrity": -14,
        "medicine": -10
      },
      "asset": {
        "name": "Піратський код",
        "description": "Доступ до піратських баз."
      }
    },
    {
      "id": "s_medical_satellite",
      "name": "Медичний супутник",
      "description": "Орбітальний госпіталь з обладнанням.",
      "tags": [
        "medicine",
        "science",
        "space"
      ],
      "difficulty": 3,
      "success": {
        "medicine": 14,
        "morale": 6
      },
      "failure": {
        "medicine": -8,
        "integrity": -6
      },
      "asset": {
        "name": "Медичний модуль",
        "description": "Діагностика та лікування."
      }
    },
    {
      "id": "s_communication_center",
      "name": "Центр зв'язку",
      "description": "Космічний центр, що об'єднує всі реле.",
      "tags": [
        "communication",
        "navigation",
        "energy"
      ],
      "difficulty": 4,
      "success": {
        "morale": 16,
        "energy": 8
      },
      "failure": {
        "energy": -10,
        "morale": -8
      },
      "asset": {
        "name": "Глобальний передавач",
        "description": "Зв'язок по всій системі."
      }
    },
    {
      "id": "s_research_outpost",
      "name": "Дослідницький форпост",
      "description": "Науковий центр на віддаленій планеті.",
      "tags": [
        "science",
        "medicine",
        "investigation"
      ],
      "difficulty": 4,
      "success": {
        "medicine": 14,
        "integrity": 8
      },
      "failure": {
        "medicine": -8,
        "integrity": -8
      },
      "asset": {
        "name": "Лабораторне обладнання",
        "description": "Покращує дослідження."
      }
    },
    {
      "id": "s_alien_structure",
      "name": "Чужа структура",
      "description": "Гігантська споруда невідомого призначення.",
      "tags": [
        "investigation",
        "defense",
        "energy"
      ],
      "difficulty": 6,
      "success": {
        "energy": 22,
        "integrity": 14
      },
      "failure": {
        "integrity": -18,
        "morale": -12
      },
      "asset": {
        "name": "Чужий ключ",
        "description": "Активує структуру."
      }
    },
    {
      "id": "s_asteroid_mine",
      "name": "Астероїдна копальня",
      "description": "Автоматизована копальня з видобутку металів.",
      "tags": [
        "mining",
        "energy",
        "technical"
      ],
      "difficulty": 4,
      "success": {
        "energy": 18,
        "integrity": 6
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Копальня-дрон",
        "description": "Прискорює видобуток."
      }
    },
    {
      "id": "s_gas_giant_moon",
      "name": "Місяць газового гіганта",
      "description": "Можна видобувати газ і воду.",
      "tags": [
        "energy",
        "water",
        "survival"
      ],
      "difficulty": 3,
      "success": {
        "energy": 14,
        "water": 10
      },
      "failure": {
        "energy": -8,
        "integrity": -6
      }
    },
    {
      "id": "s_orbital_platform",
      "name": "Орбітальна платформа",
      "description": "Платформа зброї та захисту.",
      "tags": [
        "defense",
        "energy",
        "repair"
      ],
      "difficulty": 4,
      "success": {
        "integrity": 14,
        "energy": 8
      },
      "failure": {
        "integrity": -10,
        "medicine": -8
      },
      "asset": {
        "name": "Платформний модуль",
        "description": "Покращує захист."
      }
    },
    {
      "id": "s_refueling_station",
      "name": "Станція заправки",
      "description": "Паливна станція, яка ще працює.",
      "tags": [
        "energy",
        "technical",
        "navigation"
      ],
      "difficulty": 3,
      "success": {
        "energy": 16,
        "integrity": 4
      },
      "failure": {
        "energy": -10,
        "integrity": -6
      }
    },
    {
      "id": "s_alien_biosphere",
      "name": "Чужа біосфера",
      "description": "Інопланетний біом, що містить нові види.",
      "tags": [
        "biology",
        "medicine",
        "food"
      ],
      "difficulty": 5,
      "success": {
        "medicine": 16,
        "food": 12
      },
      "failure": {
        "medicine": -12,
        "integrity": -10
      },
      "asset": {
        "name": "Біологічний зразок",
        "description": "Дозволяє створювати ліки."
      }
    },
    {
      "id": "s_derelict_gate",
      "name": "Покинуті ворота",
      "description": "Міжзоряні ворота, які можна активувати.",
      "tags": [
        "navigation",
        "energy",
        "investigation"
      ],
      "difficulty": 6,
      "success": {
        "energy": 20,
        "morale": 16
      },
      "failure": {
        "integrity": -18,
        "energy": -15
      },
      "asset": {
        "name": "Ключ воріт",
        "description": "Активує міжзоряні подорожі."
      }
    },
    {
      "id": "s_abandoned_science",
      "name": "Покинутий науковий модуль",
      "description": "Модуль з експериментальними технологіями.",
      "tags": [
        "science",
        "energy",
        "repair"
      ],
      "difficulty": 4,
      "success": {
        "energy": 14,
        "integrity": 10
      },
      "failure": {
        "energy": -10,
        "integrity": -8
      },
      "asset": {
        "name": "Науковий пристрій",
        "description": "Покращує дослідження."
      }
    },
    {
      "id": "s_cargo_ring",
      "name": "Вантажне кільце",
      "description": "Кільцева структура з контейнерами.",
      "tags": [
        "food",
        "water",
        "medicine"
      ],
      "difficulty": 3,
      "success": {
        "food": 14,
        "water": 10,
        "medicine": 6
      },
      "failure": {
        "food": -8,
        "integrity": -6
      }
    },
    {
      "id": "s_pirate_freighter",
      "name": "Піратський фрегат",
      "description": "Фрегат, повний награбованих ресурсів.",
      "tags": [
        "defense",
        "social",
        "energy"
      ],
      "difficulty": 4,
      "success": {
        "energy": 16,
        "integrity": 10
      },
      "failure": {
        "integrity": -12,
        "medicine": -8
      },
      "asset": {
        "name": "Піратська мапа",
        "description": "Координати скарбів."
      }
    }
  ]
};

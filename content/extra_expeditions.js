"use strict";

// Експедиції нових сетингів.
module.exports = {
  "postapocalypse": [
    {
      "id": "pos_exp_1",
      "name": "Затоплена лікарня",
      "description": "Маршрут «Затоплена лікарня» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "survival",
        "repair"
      ],
      "difficulty": 2,
      "success": {
        "food": 4,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Затоплена лікарня",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_2",
      "name": "Розбитий паливний термінал",
      "description": "Маршрут «Розбитий паливний термінал» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "repair",
        "medicine"
      ],
      "difficulty": 3,
      "success": {
        "food": 6,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Розбитий паливний термінал",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_3",
      "name": "Станція дозиметричного контролю",
      "description": "Маршрут «Станція дозиметричного контролю» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "navigation"
      ],
      "difficulty": 4,
      "success": {
        "food": 8,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Станція дозиметричного контролю",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_4",
      "name": "Покинута ферма",
      "description": "Маршрут «Покинута ферма» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "navigation",
        "survival"
      ],
      "difficulty": 5,
      "success": {
        "food": 10,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Покинута ферма",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_5",
      "name": "Тунель контрабандистів",
      "description": "Маршрут «Тунель контрабандистів» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "survival",
        "repair"
      ],
      "difficulty": 6,
      "success": {
        "food": 4,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Тунель контрабандистів",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_6",
      "name": "Склад військового анклаву",
      "description": "Маршрут «Склад військового анклаву» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "repair",
        "medicine"
      ],
      "difficulty": 2,
      "success": {
        "food": 6,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Склад військового анклаву",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_7",
      "name": "Ринок кочівників",
      "description": "Маршрут «Ринок кочівників» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "navigation"
      ],
      "difficulty": 3,
      "success": {
        "food": 8,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Ринок кочівників",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_8",
      "name": "Водоочисна вежа",
      "description": "Маршрут «Водоочисна вежа» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "navigation",
        "survival"
      ],
      "difficulty": 4,
      "success": {
        "food": 10,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Водоочисна вежа",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_9",
      "name": "Лабораторія мутацій",
      "description": "Маршрут «Лабораторія мутацій» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "survival",
        "repair"
      ],
      "difficulty": 5,
      "success": {
        "food": 4,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Лабораторія мутацій",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_10",
      "name": "Радіовежа пустки",
      "description": "Маршрут «Радіовежа пустки» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "repair",
        "medicine"
      ],
      "difficulty": 6,
      "success": {
        "food": 6,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Радіовежа пустки",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_11",
      "name": "Сховище насіння",
      "description": "Маршрут «Сховище насіння» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "navigation"
      ],
      "difficulty": 2,
      "success": {
        "food": 8,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Сховище насіння",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "pos_exp_12",
      "name": "Міст через заражену ріку",
      "description": "Маршрут «Міст через заражену ріку» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "navigation",
        "survival"
      ],
      "difficulty": 3,
      "success": {
        "food": 10,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Міст через заражену ріку",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    }
  ],
  "cyberpunk": [
    {
      "id": "cyb_exp_1",
      "name": "Підпільна клініка",
      "description": "Маршрут «Підпільна клініка» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "technical",
        "hacking"
      ],
      "difficulty": 2,
      "success": {
        "food": 4,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Підпільна клініка",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_2",
      "name": "Вузол міської мережі",
      "description": "Маршрут «Вузол міської мережі» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "hacking",
        "medicine"
      ],
      "difficulty": 3,
      "success": {
        "food": 6,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Вузол міської мережі",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_3",
      "name": "Склад енергокомірок",
      "description": "Маршрут «Склад енергокомірок» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "energy"
      ],
      "difficulty": 4,
      "success": {
        "food": 8,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Склад енергокомірок",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_4",
      "name": "Покинутий дата-центр",
      "description": "Маршрут «Покинутий дата-центр» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "energy",
        "technical"
      ],
      "difficulty": 5,
      "success": {
        "food": 10,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Покинутий дата-центр",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_5",
      "name": "Вертикальна ферма",
      "description": "Маршрут «Вертикальна ферма» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "technical",
        "hacking"
      ],
      "difficulty": 6,
      "success": {
        "food": 4,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Вертикальна ферма",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_6",
      "name": "Лабораторія імплантів",
      "description": "Маршрут «Лабораторія імплантів» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "hacking",
        "medicine"
      ],
      "difficulty": 2,
      "success": {
        "food": 6,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Лабораторія імплантів",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_7",
      "name": "Станція дронів",
      "description": "Маршрут «Станція дронів» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "energy"
      ],
      "difficulty": 3,
      "success": {
        "food": 8,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Станція дронів",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_8",
      "name": "Корпоративний архів",
      "description": "Маршрут «Корпоративний архів» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "energy",
        "technical"
      ],
      "difficulty": 4,
      "success": {
        "food": 10,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Корпоративний архів",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_9",
      "name": "Чорний ринок біокоду",
      "description": "Маршрут «Чорний ринок біокоду» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "technical",
        "hacking"
      ],
      "difficulty": 5,
      "success": {
        "food": 4,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Чорний ринок біокоду",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_10",
      "name": "Маглевний тунель",
      "description": "Маршрут «Маглевний тунель» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "hacking",
        "medicine"
      ],
      "difficulty": 6,
      "success": {
        "food": 6,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Маглевний тунель",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_11",
      "name": "Сектор синтетичної їжі",
      "description": "Маршрут «Сектор синтетичної їжі» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "energy"
      ],
      "difficulty": 2,
      "success": {
        "food": 8,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Сектор синтетичної їжі",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "cyb_exp_12",
      "name": "Антена орбітального зв’язку",
      "description": "Маршрут «Антена орбітального зв’язку» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "energy",
        "technical"
      ],
      "difficulty": 3,
      "success": {
        "food": 10,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Антена орбітального зв’язку",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    }
  ],
  "horror": [
    {
      "id": "hor_exp_1",
      "name": "Замкнене крило санаторію",
      "description": "Маршрут «Замкнене крило санаторію» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "investigation",
        "social"
      ],
      "difficulty": 2,
      "success": {
        "food": 4,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Замкнене крило санаторію",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_2",
      "name": "Стара церква",
      "description": "Маршрут «Стара церква» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "social",
        "medicine"
      ],
      "difficulty": 3,
      "success": {
        "food": 6,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Стара церква",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_3",
      "name": "Лісова сторожка",
      "description": "Маршрут «Лісова сторожка» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "navigation"
      ],
      "difficulty": 4,
      "success": {
        "food": 8,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Лісова сторожка",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_4",
      "name": "Печера під кладовищем",
      "description": "Маршрут «Печера під кладовищем» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "navigation",
        "investigation"
      ],
      "difficulty": 5,
      "success": {
        "food": 10,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Печера під кладовищем",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_5",
      "name": "Покинута радіостанція",
      "description": "Маршрут «Покинута радіостанція» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "investigation",
        "social"
      ],
      "difficulty": 6,
      "success": {
        "food": 4,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Покинута радіостанція",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_6",
      "name": "Будинок на болоті",
      "description": "Маршрут «Будинок на болоті» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "social",
        "medicine"
      ],
      "difficulty": 2,
      "success": {
        "food": 6,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Будинок на болоті",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_7",
      "name": "Крипта монастиря",
      "description": "Маршрут «Крипта монастиря» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "navigation"
      ],
      "difficulty": 3,
      "success": {
        "food": 8,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Крипта монастиря",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_8",
      "name": "Тунель під маяком",
      "description": "Маршрут «Тунель під маяком» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "navigation",
        "investigation"
      ],
      "difficulty": 4,
      "success": {
        "food": 10,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Тунель під маяком",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_9",
      "name": "Зникле село",
      "description": "Маршрут «Зникле село» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "investigation",
        "social"
      ],
      "difficulty": 5,
      "success": {
        "food": 4,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Зникле село",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_10",
      "name": "Лабораторія сновидінь",
      "description": "Маршрут «Лабораторія сновидінь» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "social",
        "medicine"
      ],
      "difficulty": 6,
      "success": {
        "food": 6,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Лабораторія сновидінь",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_11",
      "name": "Дзеркальна галерея",
      "description": "Маршрут «Дзеркальна галерея» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "medicine",
        "navigation"
      ],
      "difficulty": 2,
      "success": {
        "food": 8,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Дзеркальна галерея",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "hor_exp_12",
      "name": "Полярний склад",
      "description": "Маршрут «Полярний склад» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "navigation",
        "investigation"
      ],
      "difficulty": 3,
      "success": {
        "food": 10,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Полярний склад",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    }
  ],
  "detective": [
    {
      "id": "det_exp_1",
      "name": "Кабінет жертви",
      "description": "Маршрут «Кабінет жертви» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "investigation",
        "social"
      ],
      "difficulty": 2,
      "success": {
        "food": 4,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Кабінет жертви",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_2",
      "name": "Технічний тунель",
      "description": "Маршрут «Технічний тунель» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "social",
        "science"
      ],
      "difficulty": 3,
      "success": {
        "food": 6,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Технічний тунель",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_3",
      "name": "Архів доступу",
      "description": "Маршрут «Архів доступу» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "science",
        "technical"
      ],
      "difficulty": 4,
      "success": {
        "food": 8,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Архів доступу",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_4",
      "name": "Покинутий вагон",
      "description": "Маршрут «Покинутий вагон» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "technical",
        "investigation"
      ],
      "difficulty": 5,
      "success": {
        "food": 10,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Покинутий вагон",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_5",
      "name": "Лабораторія токсикології",
      "description": "Маршрут «Лабораторія токсикології» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "investigation",
        "social"
      ],
      "difficulty": 6,
      "success": {
        "food": 4,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Лабораторія токсикології",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_6",
      "name": "Сейфова кімната",
      "description": "Маршрут «Сейфова кімната» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "social",
        "science"
      ],
      "difficulty": 2,
      "success": {
        "food": 6,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Сейфова кімната",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_7",
      "name": "Кімната відеоспостереження",
      "description": "Маршрут «Кімната відеоспостереження» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "science",
        "technical"
      ],
      "difficulty": 3,
      "success": {
        "food": 8,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Кімната відеоспостереження",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_8",
      "name": "Службова кухня",
      "description": "Маршрут «Службова кухня» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "technical",
        "investigation"
      ],
      "difficulty": 4,
      "success": {
        "food": 10,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Службова кухня",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_9",
      "name": "Приватний кабінет",
      "description": "Маршрут «Приватний кабінет» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "investigation",
        "social"
      ],
      "difficulty": 5,
      "success": {
        "food": 4,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -3,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Приватний кабінет",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_10",
      "name": "Зовнішня радіовежа",
      "description": "Маршрут «Зовнішня радіовежа» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "social",
        "science"
      ],
      "difficulty": 6,
      "success": {
        "food": 6,
        "medicine": 3,
        "morale": 2
      },
      "failure": {
        "medicine": -4,
        "morale": -3,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Зовнішня радіовежа",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_11",
      "name": "Склад конфіскату",
      "description": "Маршрут «Склад конфіскату» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "science",
        "technical"
      ],
      "difficulty": 2,
      "success": {
        "food": 8,
        "medicine": 5,
        "morale": 2
      },
      "failure": {
        "medicine": -5,
        "morale": -4,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Склад конфіскату",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    },
    {
      "id": "det_exp_12",
      "name": "Друге місце злочину",
      "description": "Маршрут «Друге місце злочину» може дати ресурси або ключову інформацію, але район має неперевірені ризики.",
      "tags": [
        "technical",
        "investigation"
      ],
      "difficulty": 3,
      "success": {
        "food": 10,
        "medicine": 7,
        "morale": 2
      },
      "failure": {
        "medicine": -6,
        "morale": -5,
        "integrity": -2
      },
      "asset": {
        "name": "Знахідка: Друге місце злочину",
        "description": "Рідкісний актив, який покращує шанси громади у фінальній симуляції."
      }
    }
  ]
};

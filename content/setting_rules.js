"use strict";

// Механічні відмінності нових сетингів.
module.exports = {
  "fantasy": {
    "name": "Магічне забруднення",
    "description": "Дика магія поступово виснажує стабільність укриття. Магічні, алхімічні й ритуальні компетенції значно посилюють тематичні операції.",
    "startEffects": { "morale": -2, "medicine": 2 },
    "roundEffects": { "integrity": -1 },
    "expeditionBonus": 0.01,
    "tagBonuses": { "magic": 0.09, "science": 0.03, "investigation": 0.02 },
    "eventLuckBonus": 0.02,
    "stressPerRound": 0
  },
  "space": {
    "name": "Кисень і нестабільна орбіта",
    "description": "Життєзабезпечення щораунду потребує енергії та води. Космічні, технічні й навігаційні компетенції сильніше впливають на зовнішні операції.",
    "startEffects": { "energy": 3, "water": 2 },
    "roundEffects": { "energy": -1, "water": -1 },
    "expeditionBonus": 0.02,
    "tagBonuses": { "space": 0.08, "technical": 0.04, "navigation": 0.03 },
    "eventLuckBonus": 0.01,
    "stressPerRound": 0
  },
  "postapocalypse": {
    "name": "Закони пустки",
    "description": "Експедиції трохи ефективніші завдяки досвіду виживання, але зношення сховища щораунду знижує цілісність.",
    "startEffects": {
      "food": -4,
      "water": -4
    },
    "roundEffects": {
      "integrity": -1
    },
    "expeditionBonus": 0.05,
    "tagBonuses": {
      "survival": 0.05,
      "navigation": 0.03
    },
    "stressPerRound": 0
  },
  "cyberpunk": {
    "name": "Залежність від мережі",
    "description": "Технічні й хакерські навички сильніші в операціях, проте системи щораунду споживають додаткову енергію.",
    "startEffects": {
      "energy": 4,
      "medicine": 3
    },
    "roundEffects": {
      "energy": -2
    },
    "expeditionBonus": 0.02,
    "tagBonuses": {
      "hacking": 0.08,
      "technical": 0.04
    },
    "eventLuckBonus": 0.02,
    "syntheticOrigins": [
      "Синтетична людина",
      "Цифрова особистість у біотілі"
    ]
  },
  "horror": {
    "name": "Наростання жаху",
    "description": "Кожен раунд підвищує стрес мешканців, а події сильніше тиснуть на мораль. Ритуальні та дослідницькі навички дають перевагу в експедиціях.",
    "startEffects": {
      "morale": -5
    },
    "roundEffects": {
      "morale": -2
    },
    "expeditionBonus": 0,
    "tagBonuses": {
      "investigation": 0.05,
      "social": 0.02
    },
    "stressPerRound": 1
  },
  "detective": {
    "name": "Ланцюг доказів",
    "description": "У групі є організатор злочину, але стартове досьє не видає його автоматично: слабкі алібі, мотиви та непрямі сліди можуть бути й у невинних. Щораунду відкривається багатозначний доказ, кожен проводить приватну перевірку, а приховані здібності дають змогу оприлюднювати, приховувати або перенаправляти підозру без запису в журналі.",
    "startEffects": {},
    "roundEffects": {
      "morale": -1
    },
    "expeditionBonus": 0.03,
    "tagBonuses": {
      "investigation": 0.08,
      "science": 0.03
    },
    "eventLuckBonus": 0.06,
    "stressPerRound": 0
  }
};

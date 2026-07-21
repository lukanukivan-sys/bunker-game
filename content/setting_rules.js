"use strict";

// Механічні відмінності нових сетингів.
module.exports = {
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

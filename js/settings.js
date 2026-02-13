// js/settings.js — Чтение/запись настроек приложения (localStorage)
(function attachSettings(global) {
  "use strict";

  var STORAGE_KEY = "fractionGame_settings";
  var TOPIC_CODES = [
    "simplify",
    "mixed",
    "common_denom",
    "add",
    "subtract",
    "multiply",
    "divide",
    "combined",
    "to_decimal",
    "from_decimal",
    "mixed_decimal"
  ];
  var ALLOWED_MULTIPLIERS = [0.5, 1, 1.5, 2];

  var TOPICS = [
    { code: "simplify", ru: "Сокращение дробей", de: "Brüche kürzen" },
    { code: "mixed", ru: "Выделение целой части", de: "Gemischte Zahlen" },
    { code: "common_denom", ru: "Приведение к общему знаменателю", de: "Gemeinsamer Nenner" },
    { code: "add", ru: "Сложение дробей", de: "Brüche addieren" },
    { code: "subtract", ru: "Вычитание дробей", de: "Brüche subtrahieren" },
    { code: "multiply", ru: "Умножение дробей", de: "Brüche multiplizieren" },
    { code: "divide", ru: "Деление дробей", de: "Brüche dividieren" },
    { code: "combined", ru: "Комбинированные примеры", de: "Kombinierte Aufgaben" },
    { code: "to_decimal", ru: "Дробь → десятичная", de: "Bruch → Dezimalzahl" },
    { code: "from_decimal", ru: "Десятичная → дробь", de: "Dezimalzahl → Bruch" },
    { code: "mixed_decimal", ru: "Комбинированные с десятичными", de: "Gemischte Dezimalaufgaben" }
  ];

  var TIMINGS = {
    simplify: [90, 90, 30, 20],
    mixed: [90, 90, 30, 20],
    common_denom: [90, 90, 45, 30],
    add: [90, 90, 45, 30],
    subtract: [90, 90, 45, 30],
    multiply: [90, 90, 40, 25],
    divide: [90, 90, 40, 25],
    combined: [90, 90, 60, 45],
    to_decimal: [90, 90, 30, 20],
    from_decimal: [90, 90, 30, 20],
    mixed_decimal: [90, 90, 60, 40]
  };

  function clampInt(value, min, max, fallback) {
    var num = Number(value);
    if (!Number.isFinite(num)) {
      return fallback;
    }
    var intValue = Math.round(num);
    if (intValue < min || intValue > max) {
      return fallback;
    }
    return intValue;
  }

  function getDefaults() {
    return {
      level: 2,
      topics: TOPIC_CODES.slice(),
      mapRegions: 22,
      playerStartRegions: 3,
      timerMultiplier: 1
    };
  }

  function sanitizeTopics(topics) {
    if (!Array.isArray(topics)) {
      return getDefaults().topics;
    }

    var unique = [];
    for (var i = 0; i < topics.length; i += 1) {
      var code = String(topics[i]);
      if (TOPIC_CODES.indexOf(code) !== -1 && unique.indexOf(code) === -1) {
        unique.push(code);
      }
    }

    return unique.length > 0 ? unique : getDefaults().topics;
  }

  function sanitizeMultiplier(value) {
    var num = Number(value);
    if (ALLOWED_MULTIPLIERS.indexOf(num) === -1) {
      return getDefaults().timerMultiplier;
    }
    return num;
  }

  function sanitizeSettings(settingsObj) {
    var defaults = getDefaults();
    var source = settingsObj && typeof settingsObj === "object" ? settingsObj : {};

    return {
      level: clampInt(source.level, 1, 4, defaults.level),
      topics: sanitizeTopics(source.topics),
      mapRegions: clampInt(source.mapRegions, 15, 35, defaults.mapRegions),
      playerStartRegions: clampInt(source.playerStartRegions, 2, 5, defaults.playerStartRegions),
      timerMultiplier: sanitizeMultiplier(source.timerMultiplier)
    };
  }

  function getStorage() {
    try {
      return global.localStorage;
    } catch (error) {
      return null;
    }
  }

  function load() {
    var storage = getStorage();
    if (!storage) {
      return getDefaults();
    }

    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (!raw) {
        return getDefaults();
      }
      var parsed = JSON.parse(raw);
      return sanitizeSettings(parsed);
    } catch (error) {
      return getDefaults();
    }
  }

  function save(settingsObj) {
    var normalized = sanitizeSettings(settingsObj);
    var storage = getStorage();
    if (!storage) {
      return normalized;
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      // localStorage может быть недоступен (например, приватный режим)
    }

    return normalized;
  }

  function reset() {
    return save(getDefaults());
  }

  function getTimerSeconds(topic, level) {
    var safeLevel = clampInt(level, 1, 4, getDefaults().level);
    var timingsForTopic = TIMINGS[topic];
    var base = Array.isArray(timingsForTopic) ? timingsForTopic[safeLevel - 1] : 90;
    var multiplier = load().timerMultiplier;
    return base * multiplier;
  }

  function isHardTimer(level) {
    var safeLevel = clampInt(level, 1, 4, getDefaults().level);
    return safeLevel >= 3;
  }

  global.Settings = {
    STORAGE_KEY: STORAGE_KEY,
    TOPICS: TOPICS,
    TIMINGS: TIMINGS,
    getDefaults: getDefaults,
    load: load,
    save: save,
    reset: reset,
    getTimerSeconds: getTimerSeconds,
    isHardTimer: isHardTimer
  };
})(window);

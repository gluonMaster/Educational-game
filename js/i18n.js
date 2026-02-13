// js/i18n.js — Локализация интерфейса (ru/de)
(function attachI18n(global) {
  "use strict";

  var STORAGE_KEY = "fractionGame_lang";
  var FALLBACK_LANG = "ru";
  var currentLang = FALLBACK_LANG;

  var translations = {
    ru: {
      title: "Покорение дробей",
      start_game: "Начать игру",
      rules_title: "Правила",
      rules_text: "Решай примеры с дробями и завоёвывай территории! Правильный ответ — захват области, неправильный — потеря.",
      correct: "Правильно!",
      incorrect: "Неверно. Правильный ответ:",
      time_up: "Время вышло!",
      your_territories: "Твои территории",
      total: "Всего",
      task_number: "Задача",
      streak: "Серия",
      new_game: "Новая игра",
      to_main: "На главную",
      victory_title: "Поздравляем! Материк покорён!",
      victory_subtitle: "\u041e\u0442\u043b\u0438\u0447\u043d\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430! \u0422\u0430\u043a \u0434\u0435\u0440\u0436\u0430\u0442\u044c.",
      defeat_title: "Материк потерян... Попробуй ещё раз!",
      defeat_subtitle: "\u041d\u0435 \u0441\u0434\u0430\u0432\u0430\u0439\u0441\u044f: \u043d\u043e\u0432\u0430\u044f \u0438\u0433\u0440\u0430 \u0438 \u043d\u043e\u0432\u0430\u044f \u043f\u043e\u043f\u044b\u0442\u043a\u0430.",
      stats_solved: "Решено задач",
      stats_correct: "Правильных",
      stats_incorrect: "Неправильных",
      stats_percent: "Процент правильных",
      stats_avg_time: "Среднее время",
      level_label: "Уровень сложности",
      topics_label: "Темы",
      seconds_short: "сек",
      explanation_label: "Пояснение:",
      continue_task: "Продолжить",
      task_simplify: "Сократите дробь:",
      task_mixed: "Выделите целую часть:",
      task_common_denom: "Приведите к общему знаменателю:",
      task_to_decimal: "Переведите в десятичную дробь:",
      task_from_decimal: "Переведите в обыкновенную дробь:",
      task_expression: "Вычислите:",
      task_placeholder: "Здесь появится условие задачи",
      answer_1: "Вариант 1",
      answer_2: "Вариант 2",
      answer_3: "Вариант 3",
      answer_4: "Вариант 4",
      answer_5: "Вариант 5",
      answer_6: "Вариант 6",
      feedback_placeholder: "Сообщение о результате",
      feedback_explanation_placeholder: "Пояснение решения",
      storage_private_warning: "Браузер в приватном режиме. Настройки и прогресс не будут сохранены.",
      restore_incomplete_game: "У вас есть незавершённая игра. Продолжить?",
      restore_yes: "Да",
      restore_no_new: "Нет, начать новую",
      critical_error: "Произошла критическая ошибка. Перезагрузите страницу."
    },
    de: {
      title: "Bruch-Eroberung",
      start_game: "Spiel starten",
      rules_title: "Regeln",
      rules_text: "Löse Bruchaufgaben und erobere Gebiete! Richtige Antwort — Gebiet erobern, falsche — Gebiet verlieren.",
      correct: "Richtig!",
      incorrect: "Falsch. Richtige Antwort:",
      time_up: "Zeit abgelaufen!",
      your_territories: "Deine Gebiete",
      total: "Gesamt",
      task_number: "Aufgabe",
      streak: "Serie",
      new_game: "Neues Spiel",
      to_main: "Zur Startseite",
      victory_title: "Gratulation! Der Kontinent ist erobert!",
      victory_subtitle: "Starke Leistung. Mach genauso weiter.",
      defeat_title: "Der Kontinent ist verloren... Versuch es nochmal!",
      defeat_subtitle: "Nicht aufgeben. Starte neu und erobere die Karte.",
      stats_solved: "Gelöste Aufgaben",
      stats_correct: "Richtige",
      stats_incorrect: "Falsche",
      stats_percent: "Richtig in Prozent",
      stats_avg_time: "Durchschnittliche Zeit",
      level_label: "Schwierigkeitsstufe",
      topics_label: "Themen",
      seconds_short: "Sek",
      explanation_label: "Erklärung:",
      continue_task: "Weiter",
      task_simplify: "Kürze den Bruch:",
      task_mixed: "Bilde die gemischte Zahl:",
      task_common_denom: "Bringe die Brüche auf einen gemeinsamen Nenner:",
      task_to_decimal: "Wandle in eine Dezimalzahl um:",
      task_from_decimal: "Wandle in einen Bruch um:",
      task_expression: "Berechnen Sie:",
      task_placeholder: "Hier erscheint die Aufgabe",
      answer_1: "Option 1",
      answer_2: "Option 2",
      answer_3: "Option 3",
      answer_4: "Option 4",
      answer_5: "Option 5",
      answer_6: "Option 6",
      feedback_placeholder: "Ergebnisnachricht",
      feedback_explanation_placeholder: "Lösungserklärung",
      storage_private_warning: "Browser im privaten Modus. Einstellungen und Fortschritt werden nicht gespeichert.",
      restore_incomplete_game: "Es gibt ein nicht abgeschlossenes Spiel. Fortsetzen?",
      restore_yes: "Ja",
      restore_no_new: "Nein, neues Spiel",
      critical_error: "Ein kritischer Fehler ist aufgetreten. Bitte laden Sie die Seite neu."
    }
  };

  function getStorage() {
    try {
      return global.localStorage;
    } catch (error) {
      return null;
    }
  }

  function normalizeLang(langCode) {
    return langCode === "de" ? "de" : "ru";
  }

  function updateDocumentLanguage() {
    if (global.document && global.document.documentElement) {
      global.document.documentElement.lang = currentLang;
    }
  }

  function updateTitle() {
    var titleElement = global.document ? global.document.querySelector("title") : null;
    if (titleElement) {
      titleElement.textContent = t("title");
    }
  }

  function updateLanguageButtons() {
    var ruButton = global.document ? global.document.getElementById("btn-lang-ru") : null;
    var deButton = global.document ? global.document.getElementById("btn-lang-de") : null;

    if (ruButton) {
      ruButton.setAttribute("aria-pressed", String(currentLang === "ru"));
      if (ruButton.classList) {
        ruButton.classList.toggle("is-active", currentLang === "ru");
        ruButton.classList.toggle("active", currentLang === "ru");
      }
    }
    if (deButton) {
      deButton.setAttribute("aria-pressed", String(currentLang === "de"));
      if (deButton.classList) {
        deButton.classList.toggle("is-active", currentLang === "de");
        deButton.classList.toggle("active", currentLang === "de");
      }
    }
  }

  function updateSettingsPreview() {
    if (!global.Settings || typeof global.Settings.load !== "function") {
      return;
    }

    var levelEl = global.document ? global.document.getElementById("start-difficulty") : null;
    var topicsEl = global.document ? global.document.getElementById("start-topics") : null;
    if (!levelEl || !topicsEl) {
      return;
    }

    var settings = global.Settings.load();
    var topicDescriptions = Array.isArray(global.Settings.TOPICS) ? global.Settings.TOPICS : [];
    var topicCodes = Array.isArray(settings.topics) ? settings.topics : [];
    var localizedNames = [];

    for (var i = 0; i < topicDescriptions.length; i += 1) {
      var topic = topicDescriptions[i];
      if (topicCodes.indexOf(topic.code) !== -1) {
        localizedNames.push(currentLang === "de" ? topic.de : topic.ru);
      }
    }

    levelEl.textContent = String(settings.level);
    topicsEl.textContent = localizedNames.length > 0 ? localizedNames.join(", ") : "—";
  }

  function applyTranslations() {
    if (!global.document) {
      return;
    }

    var elements = global.document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < elements.length; i += 1) {
      var element = elements[i];
      var key = element.getAttribute("data-i18n");
      element.textContent = t(key);
    }

    updateDocumentLanguage();
    updateLanguageButtons();
    updateTitle();
    updateSettingsPreview();
  }

  function t(key) {
    var langDict = translations[currentLang] || translations[FALLBACK_LANG];
    if (langDict && Object.prototype.hasOwnProperty.call(langDict, key)) {
      return langDict[key];
    }
    return key;
  }

  function getLang() {
    return currentLang;
  }

  function setLang(langCode) {
    currentLang = normalizeLang(langCode);

    var storage = getStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, currentLang);
      } catch (error) {
        // localStorage может быть недоступен
      }
    }

    applyTranslations();
    return currentLang;
  }

  function init() {
    var storage = getStorage();
    var saved = FALLBACK_LANG;

    if (storage) {
      try {
        saved = storage.getItem(STORAGE_KEY) || FALLBACK_LANG;
      } catch (error) {
        saved = FALLBACK_LANG;
      }
    }

    currentLang = normalizeLang(saved);
    applyTranslations();
    return currentLang;
  }

  global.I18n = {
    STORAGE_KEY: STORAGE_KEY,
    init: init,
    setLang: setLang,
    getLang: getLang,
    t: t,
    translations: translations
  };
})(window);

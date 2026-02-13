// js/app.js - Application entry point and module integration
(function attachApp(global) {
  "use strict";

  var STORAGE_TEST_KEY = "__fraction_game_storage_test__";
  var APP_TEXT_FALLBACKS = {
    storage_private_warning: "\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u0432 \u043f\u0440\u0438\u0432\u0430\u0442\u043d\u043e\u043c \u0440\u0435\u0436\u0438\u043c\u0435. \u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0438 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043d\u0435 \u0431\u0443\u0434\u0443\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b.",
    restore_incomplete_game: "\u0423 \u0432\u0430\u0441 \u0435\u0441\u0442\u044c \u043d\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u0430\u044f \u0438\u0433\u0440\u0430. \u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c?",
    restore_yes: "\u0414\u0430",
    restore_no_new: "\u041d\u0435\u0442, \u043d\u0430\u0447\u0430\u0442\u044c \u043d\u043e\u0432\u0443\u044e",
    critical_error: "\u041f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043a\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430. \u041f\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443."
  };

  var appState = {
    globalEventsBound: false,
    beforeUnloadBound: false,
    storageAvailable: true,
    actionCooldownUntil: {}
  };

  function getDocument() {
    return global.document || null;
  }

  function byId(id) {
    var doc = getDocument();
    if (!doc || typeof doc.getElementById !== "function") {
      return null;
    }
    return doc.getElementById(id);
  }

  function safeGetStorage() {
    try {
      return global.localStorage;
    } catch (error) {
      return null;
    }
  }

  function appText(key) {
    if (global.I18n && typeof global.I18n.t === "function") {
      var localized = global.I18n.t(key);
      if (typeof localized === "string" && localized.length > 0 && localized !== key) {
        return localized;
      }
    }
    return APP_TEXT_FALLBACKS[key] || key;
  }

  function showNonPersistentWarning() {
    var doc = getDocument();
    if (!doc || !doc.body) {
      return;
    }

    var text = appText("storage_private_warning");

    var existing = byId("app-storage-warning");
    if (existing) {
      existing.textContent = text;
      return;
    }

    var warning = doc.createElement("div");
    warning.id = "app-storage-warning";
    warning.setAttribute("role", "status");
    warning.textContent = text;
    warning.style.padding = "10px 14px";
    warning.style.background = "#fff3cd";
    warning.style.color = "#5f4b00";
    warning.style.border = "1px solid #ffe08a";
    warning.style.borderRadius = "8px";
    warning.style.maxWidth = "980px";
    warning.style.margin = "12px auto 0";

    doc.body.insertBefore(warning, doc.body.firstChild);
  }

  function showCriticalError(error) {
    if (global.console && typeof global.console.error === "function") {
      global.console.error(error);
    }

    var details = "";
    if (error && typeof error.message === "string" && error.message.length > 0) {
      details = " " + error.message;
    }
    var text = appText("critical_error");

    var doc = getDocument();
    if (!doc || !doc.body) {
      if (typeof global.alert === "function") {
        global.alert(text + details);
      }
      return;
    }

    var box = byId("app-critical-error");
    if (!box) {
      box = doc.createElement("div");
      box.id = "app-critical-error";
      box.style.maxWidth = "980px";
      box.style.margin = "16px auto";
      box.style.padding = "14px";
      box.style.border = "1px solid #d1242f";
      box.style.borderRadius = "10px";
      box.style.background = "#fde8ea";
      box.style.color = "#8b1019";
      doc.body.insertBefore(box, doc.body.firstChild);
    }

    box.textContent = text + details;
  }

  function checkLocalStorageAvailability() {
    var storage = safeGetStorage();
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(STORAGE_TEST_KEY, "ok");
      var value = storage.getItem(STORAGE_TEST_KEY);
      storage.removeItem(STORAGE_TEST_KEY);
      return value === "ok";
    } catch (error) {
      return false;
    }
  }

  function updateActiveLangButton(langCode) {
    var ru = byId("btn-lang-ru");
    var de = byId("btn-lang-de");
    var isRu = langCode === "ru";
    var isDe = langCode === "de";

    if (ru) {
      if (ru.classList) {
        ru.classList.toggle("is-active", isRu);
        ru.classList.toggle("active", isRu);
      }
      ru.setAttribute("aria-pressed", String(isRu));
    }
    if (de) {
      if (de.classList) {
        de.classList.toggle("is-active", isDe);
        de.classList.toggle("active", isDe);
      }
      de.setAttribute("aria-pressed", String(isDe));
    }
  }

  function refreshLanguageDependentUi() {
    if (global.UIController && typeof global.UIController.refreshLanguage === "function") {
      global.UIController.refreshLanguage();
      return;
    }

    if (global.UIController && typeof global.UIController.initStartScreen === "function") {
      global.UIController.initStartScreen();
    }
  }

  function setLanguage(langCode) {
    if (!global.I18n || typeof global.I18n.setLang !== "function") {
      return;
    }

    var applied = global.I18n.setLang(langCode);
    updateActiveLangButton(applied || langCode);
    refreshLanguageDependentUi();
    if (!appState.storageAvailable) {
      showNonPersistentWarning();
    }
  }

  function bindButtonOnce(buttonId, datasetFlag, handler) {
    var button = byId(buttonId);
    if (!button || typeof handler !== "function") {
      return;
    }

    if (button.dataset && button.dataset[datasetFlag] === "true") {
      return;
    }

    button.addEventListener("click", handler);
    if (button.dataset) {
      button.dataset[datasetFlag] = "true";
    }
  }

  function isPlaying() {
    if (!global.GameLogic || typeof global.GameLogic.getState !== "function") {
      return false;
    }

    var state = global.GameLogic.getState();
    return Boolean(state && state.status === "playing");
  }

  function isGameInputReady(index) {
    var gameScreen = byId("screen-game");
    if (!gameScreen || (gameScreen.classList && gameScreen.classList.contains("hidden"))) {
      return false;
    }

    if (!isPlaying()) {
      return false;
    }

    var doc = getDocument();
    if (!doc) {
      return false;
    }

    var selector = '#answers-grid .answer-btn[data-answer-index="' + String(index) + '"]';
    var button = doc.querySelector(selector);
    if (!button) {
      var byPos = doc.querySelectorAll("#answers-grid .answer-btn");
      button = byPos[index] || null;
    }

    return Boolean(button && !button.disabled);
  }

  function mapKeyToAnswerIndex(event) {
    if (!event) {
      return -1;
    }

    var key = String(event.key || "");
    if (/^[1-6]$/.test(key)) {
      return Number(key) - 1;
    }

    var code = String(event.code || "");
    if (/^Numpad[1-6]$/.test(code)) {
      return Number(code.replace("Numpad", "")) - 1;
    }

    return -1;
  }

  function runAction(action) {
    if (typeof action !== "function") {
      return;
    }

    try {
      var output = action();
      if (output && typeof output.then === "function") {
        output.catch(function onRejected(error) {
          showCriticalError(error);
        });
      }
    } catch (error) {
      showCriticalError(error);
    }
  }

  function runActionWithCooldown(lockKey, buttonId, cooldownMs, action) {
    var key = String(lockKey || "default");
    var waitMs = Math.max(0, Number(cooldownMs) || 0);
    var nowMs = Date.now();
    var blockedUntil = Number(appState.actionCooldownUntil[key]) || 0;

    if (blockedUntil > nowMs) {
      return;
    }

    appState.actionCooldownUntil[key] = nowMs + waitMs;

    var button = byId(buttonId);
    if (button) {
      button.disabled = true;
    }

    function unlockButtonLater() {
      if (!button) {
        return;
      }
      global.setTimeout(function enableButtonAgain() {
        button.disabled = false;
      }, waitMs > 0 ? waitMs : 0);
    }

    try {
      var output = action();
      if (output && typeof output.then === "function") {
        output
          .catch(function onRejected(error) {
            showCriticalError(error);
          })
          .finally(unlockButtonLater);
        return;
      }
      unlockButtonLater();
    } catch (error) {
      unlockButtonLater();
      showCriticalError(error);
    }
  }

  function handleAnswerHotkeys(event) {
    if (!event || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    var target = event.target;
    if (target && target.tagName && /INPUT|TEXTAREA|SELECT/.test(String(target.tagName))) {
      return;
    }

    var index = mapKeyToAnswerIndex(event);
    if (index < 0 || index > 5) {
      return;
    }

    if (!isGameInputReady(index)) {
      return;
    }

    event.preventDefault();
    if (global.GameLogic && typeof global.GameLogic.submitAnswer === "function") {
      runAction(function submitByKey() {
        return global.GameLogic.submitAnswer(index);
      });
    }
  }

  function bindBeforeUnload() {
    if (appState.beforeUnloadBound) {
      return;
    }

    global.addEventListener("beforeunload", function onBeforeUnload() {
      if (isPlaying() && global.GameLogic && typeof global.GameLogic.saveState === "function") {
        global.GameLogic.saveState();
      }
    });

    appState.beforeUnloadBound = true;
  }

  function getGameStorageKey() {
    if (global.GameLogic && typeof global.GameLogic.STORAGE_KEY === "string") {
      return global.GameLogic.STORAGE_KEY;
    }
    return "fractionGame_currentGame";
  }

  function removeSavedGame() {
    var storage = safeGetStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(getGameStorageKey());
    } catch (error) {
      // ignore
    }
  }

  function getSavedGameStatus() {
    var storage = safeGetStorage();
    if (!storage) {
      return null;
    }

    try {
      var raw = storage.getItem(getGameStorageKey());
      if (!raw) {
        return null;
      }

      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return "";
      }

      return typeof parsed.status === "string" ? parsed.status : "";
    } catch (error) {
      return "__invalid__";
    }
  }

  function showRestorePrompt() {
    var doc = getDocument();
    if (!doc || !doc.body || typeof doc.createElement !== "function") {
      if (typeof global.confirm === "function") {
        return Promise.resolve(global.confirm(appText("restore_incomplete_game")));
      }
      return Promise.resolve(false);
    }

    return new Promise(function waitUserChoice(resolve) {
      var overlay = doc.createElement("div");
      overlay.id = "restore-game-overlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.42)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = "9999";
      overlay.style.padding = "16px";

      var modal = doc.createElement("div");
      modal.style.width = "min(560px, 100%)";
      modal.style.background = "#ffffff";
      modal.style.borderRadius = "12px";
      modal.style.border = "1px solid #ced8e3";
      modal.style.boxShadow = "0 20px 45px rgba(20, 38, 58, 0.2)";
      modal.style.padding = "18px";

      var message = doc.createElement("p");
      message.textContent = appText("restore_incomplete_game");
      message.style.fontSize = "18px";
      message.style.margin = "0 0 14px";

      var actions = doc.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "10px";
      actions.style.flexWrap = "wrap";

      var yesButton = doc.createElement("button");
      yesButton.type = "button";
      yesButton.textContent = appText("restore_yes");
      yesButton.className = "btn btn-primary";

      var noButton = doc.createElement("button");
      noButton.type = "button";
      noButton.textContent = appText("restore_no_new");
      noButton.className = "btn btn-secondary";

      function finish(value) {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        resolve(Boolean(value));
      }

      yesButton.addEventListener("click", function onYes() {
        finish(true);
      });

      noButton.addEventListener("click", function onNo() {
        finish(false);
      });

      actions.appendChild(yesButton);
      actions.appendChild(noButton);
      modal.appendChild(message);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      doc.body.appendChild(overlay);
    });
  }

  function bindGlobalEvents() {
    if (appState.globalEventsBound) {
      return;
    }

    bindButtonOnce("btn-lang-ru", "appLangBound", function onRuLang() {
      setLanguage("ru");
    });
    bindButtonOnce("btn-lang-de", "appLangBound", function onDeLang() {
      setLanguage("de");
    });

    bindButtonOnce("btn-start-game", "appGameBound", function onStartGame() {
      if (global.GameLogic && typeof global.GameLogic.startGame === "function") {
        runActionWithCooldown("start-game", "btn-start-game", 450, function startGame() {
          return global.GameLogic.startGame();
        });
      }
    });

    bindButtonOnce("btn-new-game", "appGameBound", function onNewGame() {
      if (global.GameLogic && typeof global.GameLogic.newGame === "function") {
        runActionWithCooldown("new-game", "btn-new-game", 250, function newGame() {
          return global.GameLogic.newGame();
        });
      }
    });

    bindButtonOnce("btn-back-home", "appGameBound", function onToMain() {
      if (global.GameLogic && typeof global.GameLogic.toMainMenu === "function") {
        runActionWithCooldown("to-main-menu", "btn-back-home", 250, function toMainMenu() {
          return global.GameLogic.toMainMenu();
        });
      }
    });

    var doc = getDocument();
    if (doc && typeof doc.addEventListener === "function") {
      doc.addEventListener("keydown", handleAnswerHotkeys);
    }

    bindBeforeUnload();
    appState.globalEventsBound = true;
  }

  async function maybeRestoreSavedGame() {
    var savedStatus = getSavedGameStatus();
    if (!savedStatus) {
      return false;
    }

    if (savedStatus !== "playing") {
      removeSavedGame();
      return false;
    }

    var shouldRestore = await showRestorePrompt();
    if (!shouldRestore) {
      removeSavedGame();
      return false;
    }

    if (!global.GameLogic || typeof global.GameLogic.restoreState !== "function") {
      removeSavedGame();
      return false;
    }

    var restored = false;
    try {
      restored = global.GameLogic.restoreState();
    } catch (error) {
      restored = false;
      showCriticalError(error);
    }

    if (!restored) {
      removeSavedGame();
    }

    return restored;
  }

  async function init() {
    try {
      appState.storageAvailable = checkLocalStorageAvailability();
      if (!appState.storageAvailable) {
        showNonPersistentWarning();
      }

      if (global.I18n && typeof global.I18n.init === "function") {
        var lang = global.I18n.init();
        updateActiveLangButton(lang || "ru");
      }

      if (global.Settings && typeof global.Settings.load === "function") {
        global.Settings.load();
      }

      if (global.UIController && typeof global.UIController.initStartScreen === "function") {
        global.UIController.initStartScreen();
      }

      if (global.UIController && typeof global.UIController.showScreen === "function") {
        global.UIController.showScreen("start");
      }

      bindGlobalEvents();
      await maybeRestoreSavedGame();
    } catch (error) {
      showCriticalError(error);
    }
  }

  global.App = {
    init: init,
    bindGlobalEvents: bindGlobalEvents
  };
})(typeof window !== "undefined" ? window : globalThis);

document.addEventListener("DOMContentLoaded", function onReady() {
  window.App.init();
});

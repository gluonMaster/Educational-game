// js/game-logic.js - Core game state and turn processing
(function attachGameLogic(global) {
  "use strict";

  var STORAGE_KEY = "fractionGame_currentGame";
  var NEXT_TASK_DELAY_CORRECT_MS = 1500;
  var NEXT_TASK_DELAY_INCORRECT_MS = 3000;
  var MAP_GENERATION_MAX_ATTEMPTS = 3;

  function createInitialState() {
    return {
      status: "idle",
      regions: [],
      mapData: null,
      currentTask: null,
      taskNumber: 0,
      streak: 0,
      stats: {
        total: 0,
        correct: 0,
        incorrect: 0,
        totalTime: 0,
        times: []
      },
      settings: null,
      taskStartTime: 0
    };
  }

  var gameState = createInitialState();

  var runtime = {
    isSubmitting: false,
    awaitingContinue: false,
    nextTaskTimeoutId: null
  };

  function now() {
    return Date.now();
  }

  function deepClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

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

  function safeT(key, fallback) {
    if (global.I18n && typeof global.I18n.t === "function") {
      return global.I18n.t(key);
    }
    return fallback || key;
  }

  function getLang() {
    if (global.I18n && typeof global.I18n.getLang === "function") {
      return global.I18n.getLang();
    }
    return "ru";
  }

  function normalizeSettings(settings) {
    var source = settings && typeof settings === "object" ? settings : {};

    var level = Number(source.level);
    if (!Number.isInteger(level) || level < 1 || level > 4) {
      level = 2;
    }

    var topics = Array.isArray(source.topics) ? source.topics.slice() : [];
    topics = topics.filter(function filterTopic(topic) {
      return typeof topic === "string" && topic.length > 0;
    });

    if (topics.length === 0) {
      topics = [
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
    }

    var mapRegions = Number(source.mapRegions);
    if (!Number.isInteger(mapRegions) || mapRegions < 15 || mapRegions > 35) {
      mapRegions = 22;
    }

    var playerStartRegions = Number(source.playerStartRegions);
    if (!Number.isInteger(playerStartRegions) || playerStartRegions < 2 || playerStartRegions > 5) {
      playerStartRegions = 3;
    }

    var timerMultiplier = Number(source.timerMultiplier);
    if (!Number.isFinite(timerMultiplier)) {
      timerMultiplier = 1;
    }

    return {
      level: level,
      topics: topics,
      mapRegions: mapRegions,
      playerStartRegions: playerStartRegions,
      timerMultiplier: timerMultiplier
    };
  }

  function getSettingsSnapshot() {
    if (global.Settings && typeof global.Settings.load === "function") {
      return normalizeSettings(global.Settings.load());
    }
    return normalizeSettings(null);
  }

  function getStorage() {
    try {
      return global.localStorage;
    } catch (error) {
      return null;
    }
  }

  function normalizeOperatorSymbol(symbol) {
    if (symbol === "+") {
      return "+";
    }
    if (symbol === "-" || symbol === "−" || symbol === "в€’") {
      return "−";
    }
    if (symbol === "*" || symbol === "×" || symbol === "Г—") {
      return "×";
    }
    if (symbol === "/" || symbol === "÷" || symbol === "Г·") {
      return "÷";
    }
    return symbol;
  }

  function formatDecimal(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) {
      return "?";
    }

    var text = String(num);
    if (text.indexOf("e") !== -1 || text.indexOf("E") !== -1) {
      text = num.toFixed(6);
    }

    text = text.replace(/\.?0+$/, "");
    if (text === "-0") {
      return "0";
    }
    return text.replace(".", ",");
  }

  function formatFraction(value) {
    if (!value || typeof value !== "object") {
      return "?";
    }

    var num = Number(value.num);
    var den = Number(value.den);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return "?";
    }

    return String(Math.trunc(num)) + "/" + String(Math.trunc(den));
  }

  function formatMixed(value) {
    if (!value || typeof value !== "object") {
      return "?";
    }

    if (!Object.prototype.hasOwnProperty.call(value, "whole")) {
      return formatFraction(value);
    }

    var whole = Number(value.whole);
    var num = Number(value.num);
    var den = Number(value.den);

    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return "?";
    }

    if (Math.trunc(num) === 0) {
      return String(Math.trunc(whole));
    }

    return String(Math.trunc(whole)) + " " + String(Math.abs(Math.trunc(num))) + "/" + String(Math.trunc(den));
  }

  function formatOperand(value) {
    if (value && typeof value === "object") {
      if (Object.prototype.hasOwnProperty.call(value, "decimal")) {
        if (Object.prototype.hasOwnProperty.call(value, "display") && typeof value.display === "string") {
          return value.display;
        }
        return formatDecimal(value.decimal);
      }
      if (Object.prototype.hasOwnProperty.call(value, "whole")) {
        return formatMixed(value);
      }
      if (Object.prototype.hasOwnProperty.call(value, "num") && Object.prototype.hasOwnProperty.call(value, "den")) {
        return formatFraction(value);
      }
    }

    if (typeof value === "number") {
      return formatDecimal(value);
    }

    return "?";
  }

  function buildExpressionText(question) {
    if (!question || typeof question !== "object") {
      return "";
    }

    var operands = Array.isArray(question.operands) ? question.operands : [];
    if (operands.length === 0) {
      return "";
    }

    var expression = "";

    if (typeof question.expression === "string" && question.expression.length > 0) {
      expression = question.expression;
    } else if (typeof question.operator === "string") {
      expression = "{0} " + normalizeOperatorSymbol(question.operator) + " {1}";
    } else if (Array.isArray(question.operators) && question.operators.length > 0) {
      expression = "{0}";
      for (var i = 0; i < question.operators.length; i += 1) {
        expression += " " + normalizeOperatorSymbol(question.operators[i]) + " {" + String(i + 1) + "}";
      }
    }

    if (!expression) {
      return operands.map(formatOperand).join(" ");
    }

    expression = expression
      .split("в€’").join("−")
      .split("Г—").join("×")
      .split("Г·").join("÷");

    return expression.replace(/\{(\d+)\}/g, function replacePlaceholder(match, rawIndex) {
      var index = Number(rawIndex);
      if (!Number.isInteger(index) || !operands[index]) {
        return match;
      }
      return formatOperand(operands[index]);
    });
  }

  function formatQuestion(task) {
    if (!task || typeof task !== "object") {
      return "";
    }

    var topic = task.topic;
    var question = task.question || {};
    var lang = getLang();
    var isGerman = lang === "de";

    if (topic === "simplify") {
      return (isGerman ? "Kürze den Bruch: " : "Сократите дробь: ") + formatFraction(question);
    }

    if (topic === "mixed") {
      return (isGerman ? "Wandle in gemischte Zahl um: " : "Выделите целую часть: ") + formatFraction(question);
    }

    if (topic === "common_denom") {
      var fractions = Array.isArray(question.fractions) ? question.fractions : [];
      var left = fractions[0] ? formatFraction(fractions[0]) : "?";
      var right = fractions[1] ? formatFraction(fractions[1]) : "?";
      return (isGerman ? "Bringe die Brüche auf einen gemeinsamen Nenner: " : "Приведите к общему знаменателю: ") + left + " , " + right;
    }

    if (topic === "to_decimal") {
      return (isGerman ? "Wandle in Dezimalzahl um: " : "Переведите в десятичную дробь: ") + formatFraction(question);
    }

    if (topic === "from_decimal") {
      return (isGerman ? "Wandle in Bruch um: " : "Переведите в обыкновенную дробь: ") + formatOperand(question);
    }

    var expressionText = buildExpressionText(question);
    if (expressionText) {
      return expressionText;
    }

    return "";
  }

  function formatAnswer(task, answerValue) {
    if (!task || typeof task !== "object") {
      return formatOperand(answerValue);
    }

    if (task.answerType === "common_denom") {
      if (typeof answerValue === "number") {
        return String(Math.trunc(answerValue));
      }
      if (answerValue && typeof answerValue === "object" && Number.isFinite(answerValue.commonDen)) {
        return String(Math.trunc(answerValue.commonDen));
      }
      if (task.correctAnswer && Number.isFinite(task.correctAnswer.commonDen)) {
        return String(Math.trunc(task.correctAnswer.commonDen));
      }
      return "?";
    }

    if (task.answerType === "decimal") {
      if (answerValue && typeof answerValue === "object") {
        if (typeof answerValue.display === "string" && answerValue.display.length > 0) {
          return answerValue.display;
        }
        if (Number.isFinite(answerValue.decimal)) {
          return formatDecimal(answerValue.decimal);
        }
      }
      return "?";
    }

    if (answerValue && typeof answerValue === "object" && Object.prototype.hasOwnProperty.call(answerValue, "whole")) {
      return formatMixed(answerValue);
    }

    return formatOperand(answerValue);
  }

  function getTaskExplanation(task) {
    if (!task || !task.explanation || typeof task.explanation !== "object") {
      return "";
    }

    var lang = getLang();
    if (lang === "de" && typeof task.explanation.de === "string") {
      return task.explanation.de;
    }
    if (typeof task.explanation.ru === "string") {
      return task.explanation.ru;
    }
    if (typeof task.explanation.de === "string") {
      return task.explanation.de;
    }

    return "";
  }

  function hideFeedback() {
    var container = byId("feedback");
    if (container && container.classList) {
      container.classList.add("hidden");
    }

    var messageEl = byId("feedback-message");
    if (messageEl) {
      messageEl.textContent = "";
    }

    var explanationEl = byId("feedback-explanation");
    if (explanationEl) {
      explanationEl.textContent = "";
    }
  }

  function showFeedback(message, explanation, isError) {
    var container = byId("feedback");
    var messageEl = byId("feedback-message");
    var explanationEl = byId("feedback-explanation");

    if (!container) {
      return;
    }

    if (messageEl) {
      messageEl.textContent = message || "";
      messageEl.style.color = isError ? "var(--color-incorrect, #d1242f)" : "var(--color-correct, #2ea043)";
    }

    if (explanationEl) {
      explanationEl.textContent = explanation || "";
    }

    if (container.classList) {
      container.classList.remove("hidden");
    }
  }

  function setAnswersDisabled(disabled) {
    var doc = getDocument();
    if (!doc || typeof doc.querySelectorAll !== "function") {
      return;
    }

    var buttons = doc.querySelectorAll("#answers-grid .answer-btn");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].disabled = Boolean(disabled);
    }
  }

  function updateTaskMeta() {
    var taskNumberEl = byId("task-number-value");
    var streakEl = byId("streak-value");

    if (taskNumberEl) {
      taskNumberEl.textContent = String(gameState.taskNumber);
    }
    if (streakEl) {
      streakEl.textContent = String(gameState.streak);
    }
  }

  function renderTask(task) {
    if (global.UIController && typeof global.UIController.showTask === "function") {
      global.UIController.showTask(task);
      return;
    }

    var questionEl = byId("task-question");
    if (questionEl) {
      questionEl.textContent = formatQuestion(task);
    }

    var doc = getDocument();
    if (!doc || typeof doc.querySelectorAll !== "function") {
      return;
    }

    var buttons = doc.querySelectorAll("#answers-grid .answer-btn");
    var options = Array.isArray(task && task.options) ? task.options : [];

    for (var i = 0; i < buttons.length; i += 1) {
      var option = options[i];
      buttons[i].textContent = option !== undefined ? formatAnswer(task, option) : "";
      buttons[i].setAttribute("data-answer-index", String(i));
    }
  }

  function showScreen(name) {
    if (global.UIController && typeof global.UIController.showScreen === "function") {
      global.UIController.showScreen(name);
      return;
    }

    var startScreen = byId("screen-start");
    var gameScreen = byId("screen-game");
    var resultScreen = byId("screen-result");

    if (startScreen && startScreen.classList) {
      startScreen.classList.toggle("hidden", name !== "start");
    }
    if (gameScreen && gameScreen.classList) {
      gameScreen.classList.toggle("hidden", name !== "game");
    }
    if (resultScreen && resultScreen.classList) {
      resultScreen.classList.toggle("hidden", name !== "result");
    }
  }

  function clearRuntimeTimers() {
    if (runtime.nextTaskTimeoutId !== null) {
      global.clearTimeout(runtime.nextTaskTimeoutId);
      runtime.nextTaskTimeoutId = null;
    }
    runtime.awaitingContinue = false;
    stopTaskTimer();
  }

  function hasManualContinueControl() {
    return Boolean(byId("btn-continue-task"));
  }

  function shouldUseHardTimer(level) {
    if (global.Settings && typeof global.Settings.isHardTimer === "function") {
      return Boolean(global.Settings.isHardTimer(level));
    }
    return Number(level) >= 3;
  }

  function getTimerSeconds(topic, level) {
    if (global.Settings && typeof global.Settings.getTimerSeconds === "function") {
      return Number(global.Settings.getTimerSeconds(topic, level)) || 90;
    }
    return 90;
  }

  function startTaskTimer(topic) {
    var level = gameState.settings ? gameState.settings.level : 2;
    var durationSeconds = Math.max(1, getTimerSeconds(topic, level));
    var hardTimer = shouldUseHardTimer(level);

    if (global.Timer && typeof global.Timer.start === "function") {
      global.Timer.start(durationSeconds, hardTimer, onTimeUp);
      return;
    }

    var barFill = byId("timer-bar-fill") || byId("timer-bar");
    var timerText = byId("timer-text");

    if (barFill && barFill.style) {
      barFill.style.width = hardTimer ? "100%" : "0%";
    }

    if (timerText) {
      timerText.textContent = hardTimer ? String(Math.ceil(durationSeconds)) : "0";
    }
  }

  function stopTaskTimer() {
    if (global.Timer && typeof global.Timer.stop === "function") {
      return global.Timer.stop();
    }

    return Math.max(0, now() - gameState.taskStartTime);
  }

  function getConfiguredTopics() {
    var topics = gameState.settings && Array.isArray(gameState.settings.topics)
      ? gameState.settings.topics
      : [];

    if (topics.length === 0) {
      return ["add"];
    }

    return topics.slice();
  }

  function chooseRandomTopic() {
    var topics = getConfiguredTopics();

    var index = Math.floor(Math.random() * topics.length);
    return topics[index];
  }

  function shuffleCopy(values) {
    var copy = Array.isArray(values) ? values.slice() : [];
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var swapIndex = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[swapIndex];
      copy[swapIndex] = temp;
    }
    return copy;
  }

  function buildTopicAttempts(preferredTopic) {
    var topics = getConfiguredTopics();
    var list = [];

    if (typeof preferredTopic === "string" && preferredTopic.length > 0) {
      list.push(preferredTopic);
    }

    var shuffled = shuffleCopy(topics);
    for (var i = 0; i < shuffled.length; i += 1) {
      if (list.indexOf(shuffled[i]) === -1) {
        list.push(shuffled[i]);
      }
    }

    if (list.length === 0) {
      list.push("add");
    }

    return list;
  }

  function generateMapWithRetries(settings) {
    var lastError = null;

    for (var attempt = 0; attempt < MAP_GENERATION_MAX_ATTEMPTS; attempt += 1) {
      try {
        var mapData = global.MapGenerator.generate(settings.mapRegions, settings.playerStartRegions);
        if (mapData && Array.isArray(mapData.regions) && mapData.regions.length > 0) {
          return mapData;
        }
        lastError = new Error("Generated map is empty");
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error("Map generation failed");
  }

  function generateTaskWithFallback(level, preferredTopic) {
    var topicsToTry = buildTopicAttempts(preferredTopic);
    var lastError = null;

    for (var i = 0; i < topicsToTry.length; i += 1) {
      var topic = topicsToTry[i];
      try {
        var task = global.MathEngine.generateTask(topic, level);
        if (task && typeof task === "object") {
          return {
            topic: topic,
            task: task
          };
        }
        lastError = new Error("Empty task for topic: " + topic);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error("Task generation failed");
  }

  function regionHasNeighborWithOwner(region, owner, regionsById) {
    if (!region || !Array.isArray(region.neighbors)) {
      return false;
    }

    for (var i = 0; i < region.neighbors.length; i += 1) {
      var neighbor = regionsById[region.neighbors[i]];
      if (neighbor && neighbor.owner === owner) {
        return true;
      }
    }

    return false;
  }

  function buildRegionsById(regions) {
    var byId = {};
    if (!Array.isArray(regions)) {
      return byId;
    }

    for (var i = 0; i < regions.length; i += 1) {
      if (regions[i]) {
        byId[regions[i].id] = regions[i];
      }
    }

    return byId;
  }

  function chooseRandomRegion(regions) {
    if (!Array.isArray(regions) || regions.length === 0) {
      return null;
    }
    return regions[Math.floor(Math.random() * regions.length)] || null;
  }

  function pickTargetRegionForCapture(newOwner) {
    var regions = gameState.regions;
    if (!Array.isArray(regions) || regions.length === 0 || !global.MapGenerator) {
      return null;
    }

    var regionsById = buildRegionsById(regions);

    if (newOwner === "player") {
      var borderComputer = typeof global.MapGenerator.getBorderRegions === "function"
        ? global.MapGenerator.getBorderRegions(regions, "computer")
        : [];

      var candidatesComputer = borderComputer.filter(function filterBorder(region) {
        return regionHasNeighborWithOwner(region, "player", regionsById);
      });

      if (candidatesComputer.length === 0) {
        candidatesComputer = regions.filter(function fallbackComputer(region) {
          return region && region.owner === "computer" && regionHasNeighborWithOwner(region, "player", regionsById);
        });
      }

      return chooseRandomRegion(candidatesComputer);
    }

    var borderPlayer = typeof global.MapGenerator.getBorderRegions === "function"
      ? global.MapGenerator.getBorderRegions(regions, "player")
      : [];

    var candidatesPlayer = borderPlayer.filter(function filterPlayerBorder(region) {
      return regionHasNeighborWithOwner(region, "computer", regionsById);
    });

    if (candidatesPlayer.length === 0) {
      candidatesPlayer = regions.filter(function fallbackPlayer(region) {
        return region && region.owner === "player" && regionHasNeighborWithOwner(region, "computer", regionsById);
      });
    }

    return chooseRandomRegion(candidatesPlayer);
  }

  function countRegionsByOwner(owner) {
    if (!Array.isArray(gameState.regions)) {
      return 0;
    }

    if (global.MapGenerator) {
      if (owner === "player" && typeof global.MapGenerator.getPlayerRegions === "function") {
        return global.MapGenerator.getPlayerRegions(gameState.regions).length;
      }
      if (owner === "computer" && typeof global.MapGenerator.getComputerRegions === "function") {
        return global.MapGenerator.getComputerRegions(gameState.regions).length;
      }
    }

    var count = 0;
    for (var i = 0; i < gameState.regions.length; i += 1) {
      if (gameState.regions[i] && gameState.regions[i].owner === owner) {
        count += 1;
      }
    }
    return count;
  }

  function updateScoreBoard() {
    var total = Array.isArray(gameState.regions) ? gameState.regions.length : 0;
    var player = countRegionsByOwner("player");

    if (global.MapRenderer && typeof global.MapRenderer.updateScore === "function") {
      global.MapRenderer.updateScore(player, total);
    }

    if (global.UIController && typeof global.UIController.updateMapScore === "function") {
      global.UIController.updateMapScore(player, total);
      return;
    }

    if (global.MapRenderer && typeof global.MapRenderer.updateScore === "function") {
      return;
    }

    var playerEl = byId("player-territories");
    var totalEl = byId("total-territories");

    if (playerEl) {
      playerEl.textContent = String(player);
    }
    if (totalEl) {
      totalEl.textContent = String(total);
    }
  }

  function saveState() {
    var storage = getStorage();
    if (!storage) {
      return null;
    }

    var payload = {
      status: gameState.status,
      regions: deepClone(gameState.regions) || [],
      stats: deepClone(gameState.stats) || {
        total: 0,
        correct: 0,
        incorrect: 0,
        totalTime: 0,
        times: []
      },
      taskNumber: gameState.taskNumber,
      streak: gameState.streak,
      settings: deepClone(gameState.settings) || getSettingsSnapshot(),
      mapMeta: gameState.mapData
        ? {
            width: gameState.mapData.width,
            height: gameState.mapData.height,
            hexRadius: gameState.mapData.hexRadius
          }
        : null
    };

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return payload;
    } catch (error) {
      return null;
    }
  }

  function clearSavedState() {
    var storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(STORAGE_KEY);
    } catch (error) {
      // ignore storage errors
    }
  }

  function loadSavedState() {
    var storage = getStorage();
    if (!storage) {
      return null;
    }

    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function updateResultScreen(result) {
    if (global.UIController && typeof global.UIController.showResult === "function") {
      global.UIController.showResult(result, gameState.stats);
      return;
    }

    var titleEl = byId("result-title");
    if (titleEl) {
      titleEl.textContent = result === "won"
        ? safeT("victory_title", "Victory")
        : safeT("defeat_title", "Defeat");
    }

    var solvedEl = byId("stat-solved");
    var correctEl = byId("stat-correct");
    var incorrectEl = byId("stat-incorrect");
    var percentEl = byId("stat-percent");
    var avgTimeEl = byId("stat-avg-time");

    if (solvedEl) {
      solvedEl.textContent = String(gameState.stats.total);
    }
    if (correctEl) {
      correctEl.textContent = String(gameState.stats.correct);
    }
    if (incorrectEl) {
      incorrectEl.textContent = String(gameState.stats.incorrect);
    }
    if (percentEl) {
      percentEl.textContent = String(gameState.stats.percent || 0) + "%";
    }
    if (avgTimeEl) {
      avgTimeEl.textContent = String(gameState.stats.avgTime || 0) + " " + safeT("seconds_short", "sec");
    }
  }

  function scheduleNextTask(delayMs) {
    if (runtime.nextTaskTimeoutId !== null) {
      global.clearTimeout(runtime.nextTaskTimeoutId);
      runtime.nextTaskTimeoutId = null;
    }

    runtime.awaitingContinue = false;

    runtime.nextTaskTimeoutId = global.setTimeout(function delayedNextTask() {
      runtime.nextTaskTimeoutId = null;
      if (gameState.status === "playing") {
        nextTask();
      }
    }, delayMs);
  }

  function checkGameResultAndFinishIfNeeded() {
    var playerCount = countRegionsByOwner("player");
    var computerCount = countRegionsByOwner("computer");

    if (computerCount <= 0) {
      endGame("won");
      return true;
    }

    if (playerCount <= 0) {
      endGame("lost");
      return true;
    }

    return false;
  }

  function stopConfettiIfRunning() {
    if (global.Confetti && typeof global.Confetti.stop === "function") {
      try {
        global.Confetti.stop();
      } catch (error) {
        // ignore optional confetti errors
      }
    }
  }

  function applyCapture(regionId, newOwner) {
    return new Promise(function runCapture(resolve) {
      var updated = false;

      if (global.MapGenerator && typeof global.MapGenerator.captureRegion === "function") {
        updated = global.MapGenerator.captureRegion(gameState.regions, regionId, newOwner);
      } else {
        for (var i = 0; i < gameState.regions.length; i += 1) {
          if (gameState.regions[i] && gameState.regions[i].id === regionId) {
            gameState.regions[i].owner = newOwner;
            updated = true;
            break;
          }
        }
      }

      if (!updated) {
        resolve(false);
        return;
      }

      if (global.MapRenderer && typeof global.MapRenderer.animateCapture === "function") {
        global.MapRenderer.animateCapture(regionId, newOwner)
          .then(function () {
            resolve(true);
          })
          .catch(function () {
            resolve(true);
          });
        return;
      }

      if (global.MapRenderer && typeof global.MapRenderer.updateRegionOwner === "function") {
        global.MapRenderer.updateRegionOwner(regionId, newOwner);
      }

      resolve(true);
    });
  }

  function setStatsForAnswer(answerDurationMs, isCorrect) {
    gameState.stats.totalTime += answerDurationMs;
    gameState.stats.times.push(answerDurationMs);

    if (isCorrect) {
      gameState.stats.correct += 1;
      gameState.streak += 1;
    } else {
      gameState.stats.incorrect += 1;
      gameState.streak = 0;
    }

    gameState.stats.total = gameState.stats.correct + gameState.stats.incorrect;
    updateTaskMeta();
  }

  function submitAnswerInternal(selectedIndex, options) {
    var opts = options && typeof options === "object" ? options : {};

    if (gameState.status !== "playing" || !gameState.currentTask || runtime.isSubmitting || runtime.awaitingContinue) {
      return Promise.resolve(false);
    }

    runtime.isSubmitting = true;
    setAnswersDisabled(true);
    var stoppedElapsedMs = stopTaskTimer();
    var answerDurationMs = Number.isFinite(stoppedElapsedMs)
      ? Math.max(0, stoppedElapsedMs)
      : Math.max(0, now() - gameState.taskStartTime);
    var timedOut = Boolean(opts.timedOut);
    var isCorrect = !timedOut && Number(selectedIndex) === Number(gameState.currentTask.correctIndex);

    setStatsForAnswer(answerDurationMs, isCorrect);

    if (global.UIController && typeof global.UIController.showFeedback === "function") {
      if (timedOut && typeof global.UIController.showTimeUpFeedback === "function") {
        global.UIController.showTimeUpFeedback(gameState.currentTask);
      } else {
        global.UIController.showFeedback(isCorrect, gameState.currentTask, Number(selectedIndex));
      }
    } else {
      var message;
      if (timedOut) {
        message = safeT("time_up", "Time up");
      } else if (isCorrect) {
        message = safeT("correct", "Correct");
      } else {
        message = safeT("incorrect", "Incorrect") + " " + formatAnswer(gameState.currentTask, gameState.currentTask.correctAnswer);
      }

      showFeedback(message, getTaskExplanation(gameState.currentTask), !isCorrect || timedOut);
    }

    var newOwner = isCorrect ? "player" : "computer";
    var target = pickTargetRegionForCapture(newOwner);

    var capturePromise = target ? applyCapture(target.id, newOwner) : Promise.resolve(false);

    return capturePromise.then(function afterCapture() {
      if (isCorrect && global.MapRenderer && typeof global.MapRenderer.pulsePlayerRegions === "function") {
        global.MapRenderer.pulsePlayerRegions();
      }

      updateScoreBoard();

      if (checkGameResultAndFinishIfNeeded()) {
        runtime.isSubmitting = false;
        runtime.awaitingContinue = false;
        saveState();
        return isCorrect;
      }

      saveState();

      if (isCorrect) {
        scheduleNextTask(NEXT_TASK_DELAY_CORRECT_MS);
      } else if (hasManualContinueControl()) {
        runtime.awaitingContinue = true;
      } else {
        scheduleNextTask(NEXT_TASK_DELAY_INCORRECT_MS);
      }

      runtime.isSubmitting = false;
      return isCorrect;
    }).catch(function onSubmitFailure(error) {
      if (global.console && typeof global.console.error === "function") {
        global.console.error(error);
      }

      saveState();

      if (isCorrect) {
        scheduleNextTask(NEXT_TASK_DELAY_CORRECT_MS);
      } else if (hasManualContinueControl()) {
        runtime.awaitingContinue = true;
      } else {
        scheduleNextTask(NEXT_TASK_DELAY_INCORRECT_MS);
      }

      runtime.isSubmitting = false;
      return isCorrect;
    });
  }

  function startGame() {
    clearRuntimeTimers();
    runtime.isSubmitting = false;
    runtime.awaitingContinue = false;
    stopConfettiIfRunning();

    if (!global.MapGenerator || typeof global.MapGenerator.generate !== "function") {
      throw new Error("MapGenerator.generate is not available");
    }
    if (!global.MathEngine || typeof global.MathEngine.generateTask !== "function") {
      throw new Error("MathEngine.generateTask is not available");
    }

    var settings = getSettingsSnapshot();
    var mapData = generateMapWithRetries(settings);

    gameState = createInitialState();
    gameState.status = "playing";
    gameState.settings = settings;
    gameState.mapData = mapData;
    gameState.regions = Array.isArray(mapData && mapData.regions) ? mapData.regions : [];

    var svg = byId("game-map");
    if (global.MapRenderer && typeof global.MapRenderer.render === "function") {
      global.MapRenderer.render(mapData, svg);
    }

    updateScoreBoard();
    hideFeedback();
    updateTaskMeta();
    showScreen("game");
    saveState();

    return nextTask();
  }

  function nextTask() {
    if (gameState.status !== "playing") {
      return null;
    }

    if (!global.MathEngine || typeof global.MathEngine.generateTask !== "function") {
      throw new Error("MathEngine.generateTask is not available");
    }

    if (runtime.nextTaskTimeoutId !== null) {
      global.clearTimeout(runtime.nextTaskTimeoutId);
      runtime.nextTaskTimeoutId = null;
    }

    runtime.awaitingContinue = false;

    hideFeedback();
    setAnswersDisabled(false);

    var level = gameState.settings ? gameState.settings.level : 2;
    var preferredTopic = chooseRandomTopic();
    var generated = generateTaskWithFallback(level, preferredTopic);
    var topic = generated.topic;
    var task = generated.task;

    gameState.currentTask = task;
    gameState.taskNumber += 1;
    gameState.taskStartTime = now();

    renderTask(task);
    updateTaskMeta();
    startTaskTimer(topic);

    return task;
  }

  function submitAnswer(selectedIndex) {
    return submitAnswerInternal(selectedIndex, { timedOut: false });
  }

  function continueAfterFeedback() {
    if (gameState.status !== "playing" || runtime.isSubmitting || !runtime.awaitingContinue) {
      return false;
    }

    runtime.awaitingContinue = false;
    return Boolean(nextTask());
  }

  function onTimeUp() {
    if (gameState.status !== "playing" || runtime.isSubmitting || runtime.awaitingContinue) {
      return;
    }

    submitAnswerInternal(-1, { timedOut: true });
  }

  function endGame(result) {
    var finalResult = result === "won" ? "won" : "lost";

    clearRuntimeTimers();
    runtime.isSubmitting = false;
    runtime.awaitingContinue = false;

    gameState.status = finalResult;
    gameState.currentTask = null;

    var total = gameState.stats.correct + gameState.stats.incorrect;
    gameState.stats.total = total;
    gameState.stats.percent = total > 0
      ? Math.round((gameState.stats.correct / total) * 100)
      : 0;
    gameState.stats.avgTime = total > 0
      ? Math.round(gameState.stats.totalTime / total / 1000)
      : 0;

    updateResultScreen(finalResult);
    showScreen("result");
    saveState();
    stopConfettiIfRunning();

    if (finalResult === "won" && global.Confetti && typeof global.Confetti.start === "function") {
      try {
        global.Confetti.start(byId("confetti-canvas"));
      } catch (error) {
        // confetti is optional for this prompt
      }
    }
  }

  function newGame() {
    clearSavedState();
    return startGame();
  }

  function toMainMenu() {
    clearRuntimeTimers();
    runtime.isSubmitting = false;
    runtime.awaitingContinue = false;
    stopConfettiIfRunning();

    gameState = createInitialState();
    hideFeedback();
    setAnswersDisabled(false);
    showScreen("start");
    clearSavedState();
  }

  function restoreState() {
    var saved = loadSavedState();
    if (!saved || saved.status !== "playing") {
      return false;
    }

    if (!Array.isArray(saved.regions) || saved.regions.length === 0) {
      return false;
    }

    gameState = createInitialState();
    gameState.status = "playing";
    runtime.awaitingContinue = false;
    stopConfettiIfRunning();
    gameState.settings = normalizeSettings(saved.settings || getSettingsSnapshot());
    gameState.regions = deepClone(saved.regions) || [];
    gameState.taskNumber = Number.isInteger(saved.taskNumber) && saved.taskNumber >= 0 ? saved.taskNumber : 0;
    gameState.streak = Number.isInteger(saved.streak) && saved.streak >= 0 ? saved.streak : 0;

    var stats = saved.stats && typeof saved.stats === "object" ? saved.stats : {};
    gameState.stats = {
      total: Number.isInteger(stats.total) && stats.total >= 0 ? stats.total : 0,
      correct: Number.isInteger(stats.correct) && stats.correct >= 0 ? stats.correct : 0,
      incorrect: Number.isInteger(stats.incorrect) && stats.incorrect >= 0 ? stats.incorrect : 0,
      totalTime: Number.isFinite(stats.totalTime) && stats.totalTime >= 0 ? stats.totalTime : 0,
      times: Array.isArray(stats.times) ? stats.times.filter(function validTime(value) {
        return Number.isFinite(value) && value >= 0;
      }) : []
    };

    var meta = saved.mapMeta && typeof saved.mapMeta === "object" ? saved.mapMeta : {};
    var width = Number(meta.width);
    var height = Number(meta.height);
    var hexRadius = Number(meta.hexRadius);

    gameState.mapData = {
      regions: gameState.regions,
      width: Number.isFinite(width) && width > 0 ? width : 800,
      height: Number.isFinite(height) && height > 0 ? height : 400,
      hexRadius: Number.isFinite(hexRadius) && hexRadius > 0 ? hexRadius : 40
    };

    var svg = byId("game-map");
    if (global.MapRenderer && typeof global.MapRenderer.render === "function") {
      global.MapRenderer.render(gameState.mapData, svg);
    }

    updateScoreBoard();
    updateTaskMeta();
    hideFeedback();
    showScreen("game");

    nextTask();
    return true;
  }

  function getState() {
    return deepClone(gameState);
  }

  global.GameLogic = {
    STORAGE_KEY: STORAGE_KEY,
    startGame: startGame,
    nextTask: nextTask,
    submitAnswer: submitAnswer,
    continueAfterFeedback: continueAfterFeedback,
    onTimeUp: onTimeUp,
    endGame: endGame,
    newGame: newGame,
    toMainMenu: toMainMenu,
    saveState: saveState,
    restoreState: restoreState,
    getState: getState
  };
})(typeof window !== "undefined" ? window : globalThis);

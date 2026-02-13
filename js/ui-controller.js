// js/ui-controller.js - Fraction rendering and UI orchestration.
(function attachUIController(global) {
  "use strict";

  var DEFAULT_SIZE = "medium";
  var SCREEN_FADE_MS = 300;
  var TASK_FLASH_MS = 520;
  var CONFETTI_MIN_PARTICLES = 150;
  var CONFETTI_MAX_PARTICLES = 200;
  var CONFETTI_DURATION_MS = 4600;
  var SIZE_CLASS_MAP = {
    large: "math-size-large",
    medium: "math-size-medium",
    small: "math-size-small"
  };

  var uiState = {
    currentTask: null,
    feedback: null,
    activeScreenId: null,
    screenSwitchTimerId: null
  };

  var confettiState = {
    running: false,
    canvas: null,
    ctx: null,
    particles: [],
    rafId: null,
    startedAtMs: 0,
    stopTimerId: null
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeSize(size) {
    return Object.prototype.hasOwnProperty.call(SIZE_CLASS_MAP, size) ? size : DEFAULT_SIZE;
  }

  function getSizeClass(size) {
    return SIZE_CLASS_MAP[normalizeSize(size)];
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

  function normalizeOperator(value) {
    var op = String(value || "").trim();
    if (op === "+") {
      return "+";
    }
    if (op === "-" || op === "−" || op === "в€’" || op === "РІв‚¬вЂ™") {
      return "−";
    }
    if (op === "*" || op === "×" || op === "Г—" || op === "Р“вЂ”") {
      return "×";
    }
    if (op === "/" || op === "÷" || op === "Г·" || op === "Р“В·") {
      return "÷";
    }
    return op;
  }

  function toDisplayNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return null;
    }
    return Math.trunc(number);
  }

  function normalizeSignAndFraction(num, den) {
    var safeNum = toDisplayNumber(num);
    var safeDen = toDisplayNumber(den);

    if (!Number.isFinite(safeNum) || !Number.isFinite(safeDen) || safeDen === 0) {
      return null;
    }

    var sign = safeNum < 0 ? -1 : 1;
    if (safeDen < 0) {
      sign *= -1;
    }

    return {
      sign: sign,
      num: Math.abs(safeNum),
      den: Math.abs(safeDen)
    };
  }

  function formatDecimalString(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "?";
    }

    var text = String(numeric);
    if (text.indexOf("e") !== -1 || text.indexOf("E") !== -1) {
      text = numeric.toFixed(6);
    }
    text = text.replace(/\.?0+$/, "");
    if (text === "-0") {
      text = "0";
    }
    return text;
  }

  function normalizeDecimalText(decimalObj) {
    if (!decimalObj || typeof decimalObj !== "object") {
      return "?";
    }

    var source;
    if (typeof decimalObj.display === "string" && decimalObj.display.length > 0) {
      source = decimalObj.display;
    } else {
      source = formatDecimalString(decimalObj.decimal);
    }

    return source
      .split(".").join(",")
      .replace(/-/g, "−");
  }

  function renderInteger(value, size) {
    var safeInt = toDisplayNumber(value);
    var text = Number.isFinite(safeInt) ? String(safeInt).replace(/-/g, "−") : "?";
    return "<span class=\"integer-number " + getSizeClass(size) + "\">" + escapeHtml(text) + "</span>";
  }

  function renderSimpleFraction(num, den, size) {
    var normalized = normalizeSignAndFraction(num, den);
    if (!normalized) {
      return renderInteger("?", size);
    }

    if (normalized.den === 1) {
      var integerValue = normalized.sign < 0 ? -normalized.num : normalized.num;
      return renderInteger(integerValue, size);
    }

    if (normalized.num === 0) {
      return renderInteger(0, size);
    }

    var classes = "fraction fraction-size-" + normalizeSize(size);
    var signHtml = "";

    if (normalized.sign < 0) {
      classes += " fraction-negative";
      signHtml = "<span class=\"fraction-sign\">−</span>";
    }

    return ""
      + "<span class=\"" + classes + "\">"
      + signHtml
      + "<span class=\"fraction-num\">" + escapeHtml(normalized.num) + "</span>"
      + "<span class=\"fraction-den\">" + escapeHtml(normalized.den) + "</span>"
      + "</span>";
  }

  function renderMixedNumber(mixedObj, size) {
    if (!mixedObj || typeof mixedObj !== "object") {
      return renderInteger("?", size);
    }

    var whole = toDisplayNumber(mixedObj.whole);
    var num = toDisplayNumber(mixedObj.num);
    var den = toDisplayNumber(mixedObj.den);

    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return renderInteger("?", size);
    }

    var absNum = Math.abs(num);
    var absDen = Math.abs(den);

    if (absNum === 0 || absDen === 1) {
      return renderInteger(whole, size);
    }

    var isNegative = whole < 0 || num < 0;
    var absWhole = Math.abs(whole);

    if (absWhole === 0) {
      return renderSimpleFraction(isNegative ? -absNum : absNum, absDen, size);
    }

    var wholeText = (isNegative ? "−" : "") + String(absWhole);
    return ""
      + "<span class=\"mixed-number " + getSizeClass(size) + "\">"
      + "<span class=\"mixed-whole\">" + escapeHtml(wholeText) + "</span>"
      + renderSimpleFraction(absNum, absDen, size)
      + "</span>";
  }

  function renderDecimal(decimalObj, size) {
    return "<span class=\"decimal-number " + getSizeClass(size) + "\">"
      + escapeHtml(normalizeDecimalText(decimalObj))
      + "</span>";
  }

  function renderUnknown(size) {
    return "<span class=\"decimal-number " + getSizeClass(size) + "\">?</span>";
  }

  function renderFraction(value, size) {
    var normalizedSize = normalizeSize(size);

    if (value === null || value === undefined) {
      return renderUnknown(normalizedSize);
    }

    if (typeof value === "number") {
      return renderInteger(value, normalizedSize);
    }

    if (value && typeof value === "object") {
      if (Object.prototype.hasOwnProperty.call(value, "decimal")) {
        return renderDecimal(value, normalizedSize);
      }

      if (Object.prototype.hasOwnProperty.call(value, "whole")) {
        return renderMixedNumber(value, normalizedSize);
      }

      if (Object.prototype.hasOwnProperty.call(value, "num") && Object.prototype.hasOwnProperty.call(value, "den")) {
        return renderSimpleFraction(value.num, value.den, normalizedSize);
      }

      if (Object.prototype.hasOwnProperty.call(value, "commonDen")) {
        return renderInteger(value.commonDen, normalizedSize);
      }
    }

    return renderUnknown(normalizedSize);
  }

  function normalizeExpressionTemplate(template) {
    return String(template || "")
      .split("РІв‚¬вЂ™").join("−")
      .split("Р“вЂ”").join("×")
      .split("Р“В·").join("÷");
  }

  function renderExpressionTokens(expressionTemplate, operands, size, level) {
    if (typeof expressionTemplate !== "string" || expressionTemplate.length === 0) {
      return "";
    }

    var normalizedTemplate = normalizeExpressionTemplate(expressionTemplate);
    var tokens = [];
    var i = 0;

    while (i < normalizedTemplate.length) {
      var char = normalizedTemplate[i];

      if (/\s/.test(char)) {
        i += 1;
        continue;
      }

      if (char === "{") {
        var closeIndex = normalizedTemplate.indexOf("}", i);
        if (closeIndex !== -1) {
          var rawIndex = normalizedTemplate.slice(i + 1, closeIndex);
          var index = Number(rawIndex);
          if (Number.isInteger(index) && operands[index] !== undefined) {
            tokens.push(renderFraction(operands[index], size));
            i = closeIndex + 1;
            continue;
          }
        }

        tokens.push("<span class=\"expr-text\">{</span>");
        i += 1;
        continue;
      }

      if (char === "(" || char === ")") {
        var parenClasses = "expr-paren";
        if (Number(level) >= 3) {
          parenClasses += " expr-paren-strong";
        }
        tokens.push("<span class=\"" + parenClasses + "\">" + escapeHtml(char) + "</span>");
        i += 1;
        continue;
      }

      if (char === "+" || char === "-" || char === "−" || char === "*" || char === "×" || char === "/" || char === "÷") {
        tokens.push("<span class=\"expr-op\">" + escapeHtml(normalizeOperator(char)) + "</span>");
        i += 1;
        continue;
      }

      if (char === "=" || char === "?") {
        tokens.push("<span class=\"expr-op\">" + escapeHtml(char) + "</span>");
        i += 1;
        continue;
      }

      var start = i;
      while (
        i < normalizedTemplate.length
        && !/\s/.test(normalizedTemplate[i])
        && normalizedTemplate[i] !== "{"
        && normalizedTemplate[i] !== "("
        && normalizedTemplate[i] !== ")"
      ) {
        i += 1;
      }
      var rawText = normalizedTemplate.slice(start, i);
      if (rawText.length > 0) {
        tokens.push("<span class=\"expr-text\">" + escapeHtml(rawText) + "</span>");
      }
    }

    return "<span class=\"math-expression " + getSizeClass(size) + "\">" + tokens.join("") + "</span>";
  }

  function buildExpressionTemplate(question) {
    if (!question || typeof question !== "object") {
      return "";
    }

    if (typeof question.expression === "string" && question.expression.length > 0) {
      return question.expression;
    }

    if (Array.isArray(question.operators) && question.operators.length > 0) {
      var expr = "{0}";
      for (var i = 0; i < question.operators.length; i += 1) {
        expr += " " + normalizeOperator(question.operators[i]) + " {" + String(i + 1) + "}";
      }
      return expr;
    }

    if (typeof question.operator === "string") {
      return "{0} " + normalizeOperator(question.operator) + " {1}";
    }

    return "";
  }

  function withTaskPrefix(prefixKey, fallback, bodyHtml) {
    var prefix = safeT(prefixKey, fallback);
    return ""
      + "<span class=\"task-line\">"
      + "<span class=\"task-prefix\">" + escapeHtml(prefix) + "</span>"
      + bodyHtml
      + "</span>";
  }

  function renderExpression(task, size) {
    var safeTask = task && typeof task === "object" ? task : {};
    var question = safeTask.question && typeof safeTask.question === "object" ? safeTask.question : {};
    var normalizedSize = normalizeSize(size);
    var topic = typeof safeTask.topic === "string" ? safeTask.topic : "";

    if (topic === "simplify") {
      return withTaskPrefix(
        "task_simplify",
        "Simplify:",
        renderFraction(question, normalizedSize)
      );
    }

    if (topic === "mixed") {
      return withTaskPrefix(
        "task_mixed",
        "Convert to mixed number:",
        renderFraction(question, normalizedSize)
      );
    }

    if (topic === "common_denom") {
      var fractions = Array.isArray(question.fractions) ? question.fractions : [];
      var left = renderFraction(fractions[0], normalizedSize);
      var right = renderFraction(fractions[1], normalizedSize);
      var joiner = getLang() === "de" ? " und " : " и ";

      return withTaskPrefix(
        "task_common_denom",
        "Bring to common denominator:",
        "<span class=\"math-expression " + getSizeClass(normalizedSize) + "\">"
          + left
          + "<span class=\"expr-text\">" + escapeHtml(joiner) + "</span>"
          + right
          + "</span>"
      );
    }

    if (topic === "to_decimal") {
      return withTaskPrefix(
        "task_to_decimal",
        "Convert to decimal:",
        renderFraction(question, normalizedSize)
      );
    }

    if (topic === "from_decimal") {
      return withTaskPrefix(
        "task_from_decimal",
        "Convert to common fraction:",
        renderFraction(question, normalizedSize)
      );
    }

    var operands = Array.isArray(question.operands) ? question.operands : [];
    var template = buildExpressionTemplate(question);
    var expressionHtml = renderExpressionTokens(template, operands, normalizedSize, safeTask.level);

    if (!expressionHtml) {
      expressionHtml = renderFraction(question, normalizedSize);
    } else {
      expressionHtml = ""
        + expressionHtml
        + "<span class=\"math-expression " + getSizeClass(normalizedSize) + "\">"
        + "<span class=\"expr-op\">=</span>"
        + "<span class=\"expr-op\">?</span>"
        + "</span>";
    }

    return withTaskPrefix(
      "task_expression",
      "Calculate:",
      expressionHtml
    );
  }

  function renderAnswer(answerObj, size) {
    if (Number.isFinite(Number(answerObj)) && typeof answerObj !== "object") {
      return renderInteger(answerObj, size);
    }
    return renderFraction(answerObj, size);
  }

  function getScreenNodes() {
    return {
      start: byId("screen-start"),
      game: byId("screen-game"),
      result: byId("screen-result")
    };
  }

  function getVisibleScreenId(nodes) {
    var map = nodes || getScreenNodes();
    var keys = Object.keys(map);

    for (var i = 0; i < keys.length; i += 1) {
      var screenId = keys[i];
      var node = map[screenId];
      if (node && node.classList && !node.classList.contains("hidden")) {
        return screenId;
      }
    }

    return null;
  }

  function showScreen(screenId) {
    var screens = getScreenNodes();
    var target = String(screenId || "start");
    var targetNode = screens[target] || screens.start;
    if (!targetNode || !targetNode.classList) {
      return;
    }

    if (uiState.screenSwitchTimerId !== null) {
      global.clearTimeout(uiState.screenSwitchTimerId);
      uiState.screenSwitchTimerId = null;
    }

    var currentId = uiState.activeScreenId || getVisibleScreenId(screens);
    var currentNode = currentId ? screens[currentId] : null;

    if (!currentNode || currentNode === targetNode) {
      var allKeys = Object.keys(screens);
      for (var i = 0; i < allKeys.length; i += 1) {
        var screenKey = allKeys[i];
        var screenNode = screens[screenKey];
        if (!screenNode || !screenNode.classList || screenNode === targetNode) {
          continue;
        }
        screenNode.classList.remove("active");
        screenNode.classList.add("hidden");
      }

      targetNode.classList.remove("hidden");
      targetNode.classList.add("active");
      uiState.activeScreenId = target;
      return;
    }

    currentNode.classList.remove("active");
    uiState.screenSwitchTimerId = global.setTimeout(function finishSwitch() {
      uiState.screenSwitchTimerId = null;
      currentNode.classList.add("hidden");
      targetNode.classList.remove("hidden");
      targetNode.classList.remove("active");

      global.requestAnimationFrame(function activateScreen() {
        targetNode.classList.add("active");
      });

      uiState.activeScreenId = target;
    }, SCREEN_FADE_MS);
  }

  function updateStartScreenInfo() {
    if (!global.Settings || typeof global.Settings.load !== "function") {
      return;
    }

    var levelEl = byId("start-difficulty");
    var topicsEl = byId("start-topics");
    if (!levelEl || !topicsEl) {
      return;
    }

    var settings = global.Settings.load();
    var level = Number(settings && settings.level);
    if (!Number.isInteger(level)) {
      level = 2;
    }

    var topicNames = [];
    var topics = Array.isArray(global.Settings.TOPICS) ? global.Settings.TOPICS : [];
    var selected = Array.isArray(settings && settings.topics) ? settings.topics : [];
    var lang = getLang();

    for (var i = 0; i < topics.length; i += 1) {
      var topic = topics[i];
      if (!topic || selected.indexOf(topic.code) === -1) {
        continue;
      }
      topicNames.push(lang === "de" ? topic.de : topic.ru);
    }

    levelEl.textContent = String(level);
    topicsEl.textContent = topicNames.length > 0 ? topicNames.join(", ") : "—";
  }

  function getAnswerButtons() {
    var doc = getDocument();
    if (!doc || typeof doc.querySelectorAll !== "function") {
      return [];
    }

    var list = doc.querySelectorAll("#answers-grid .answer-btn");
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      out.push(list[i]);
    }
    return out;
  }

  function clearAnswerVisualState(button) {
    if (!button || !button.classList) {
      return;
    }

    button.classList.remove("answer-correct", "answer-incorrect", "is-correct", "is-incorrect", "disabled");
  }

  function lockAnswers(lock) {
    var buttons = getAnswerButtons();
    var disabled = Boolean(lock);

    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].disabled = disabled;
      if (buttons[i].classList) {
        buttons[i].classList.toggle("disabled", disabled);
      }
    }
  }

  function submitAnswerFromUi(index) {
    if (!Number.isInteger(index) || index < 0 || index > 5) {
      return;
    }

    if (!global.GameLogic || typeof global.GameLogic.submitAnswer !== "function") {
      return;
    }

    global.GameLogic.submitAnswer(index);
  }

  function getContinueButton() {
    return byId("btn-continue-task");
  }

  function setFeedbackContinueLayout(enabled) {
    var container = byId("feedback");
    if (!container || !container.classList) {
      return;
    }
    container.classList.toggle("feedback-with-continue", Boolean(enabled));
  }

  function continueAfterFeedbackFromUi() {
    if (!global.GameLogic || typeof global.GameLogic.continueAfterFeedback !== "function") {
      return;
    }

    global.GameLogic.continueAfterFeedback();
  }

  function bindContinueButton() {
    var button = getContinueButton();
    if (!button || !button.dataset) {
      return;
    }

    if (button.dataset.uiContinueBound === "true") {
      return;
    }

    button.addEventListener("click", function onContinueClick() {
      if (button.disabled) {
        return;
      }

      continueAfterFeedbackFromUi();
    });

    button.dataset.uiContinueBound = "true";
  }

  function hideContinueButton() {
    var button = getContinueButton();
    if (!button || !button.classList) {
      return;
    }

    setFeedbackContinueLayout(false);
    button.classList.add("hidden");
    button.disabled = true;
  }

  function showContinueButton() {
    var button = getContinueButton();
    if (!button || !button.classList) {
      return;
    }

    bindContinueButton();
    setFeedbackContinueLayout(true);
    button.classList.remove("hidden");
    button.disabled = false;

    global.requestAnimationFrame(function focusContinueButton() {
      if (typeof button.focus === "function") {
        button.focus();
      }
    });
  }

  function bindAnswerButtons() {
    var buttons = getAnswerButtons();
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      if (!button.dataset) {
        continue;
      }
      if (button.dataset.uiAnswerBound === "true") {
        continue;
      }
      if (button.dataset.gameLogicBound === "true") {
        button.dataset.uiAnswerBound = "skip";
        continue;
      }

      button.addEventListener("click", function onAnswerClick(event) {
        var current = event.currentTarget;
        if (!current || current.disabled) {
          return;
        }
        if (current.dataset && current.dataset.gameLogicBound === "true") {
          return;
        }

        var raw = current.getAttribute("data-index");
        if (!raw) {
          raw = current.getAttribute("data-answer-index");
        }
        var index = Number(raw);
        if (!Number.isInteger(index)) {
          return;
        }
        submitAnswerFromUi(index);
      });

      button.dataset.uiAnswerBound = "true";
    }
  }

  function hideFeedbackBlock() {
    var container = byId("feedback");
    var messageEl = byId("feedback-message");
    var explanationEl = byId("feedback-explanation");

    if (container && container.classList) {
      container.classList.add("hidden");
      container.classList.remove("feedback-correct", "feedback-incorrect");
    }

    if (messageEl) {
      messageEl.textContent = "";
      messageEl.style.color = "";
    }

    if (explanationEl) {
      explanationEl.textContent = "";
      if (explanationEl.classList) {
        explanationEl.classList.remove("explanation");
      }
    }

    hideContinueButton();
  }

  function getTaskState() {
    if (global.GameLogic && typeof global.GameLogic.getState === "function") {
      return global.GameLogic.getState();
    }
    return null;
  }

  function updateTaskMeta() {
    var state = getTaskState() || {};

    var taskValueEl = byId("task-number-value");
    var streakValueEl = byId("streak-value");
    var taskNumber = Number(state.taskNumber);
    var streak = Number(state.streak);

    if (!Number.isFinite(taskNumber)) {
      taskNumber = 0;
    }
    if (!Number.isFinite(streak)) {
      streak = 0;
    }

    if (taskValueEl) {
      taskValueEl.textContent = String(Math.max(0, Math.trunc(taskNumber)));
    } else {
      var taskEl = byId("task-number");
      if (taskEl) {
        taskEl.textContent = safeT("task_number", "Task") + ": " + String(Math.max(0, Math.trunc(taskNumber)));
      }
    }

    if (streakValueEl) {
      streakValueEl.textContent = String(Math.max(0, Math.trunc(streak)));
    } else {
      var streakEl = byId("streak");
      if (streakEl) {
        streakEl.textContent = safeT("streak", "Streak") + ": " + String(Math.max(0, Math.trunc(streak)));
      }
    }
  }

  function renderTaskQuestion(task) {
    var questionEl = byId("task-question");
    if (!questionEl) {
      return;
    }
    questionEl.innerHTML = renderExpression(task, "large");
  }

  function animateTaskContainerEntry() {
    var taskContainer = byId("task-container");
    if (!taskContainer || !taskContainer.classList) {
      return;
    }

    var gameScreen = byId("screen-game");
    var delayMs = gameScreen && gameScreen.classList && gameScreen.classList.contains("hidden")
      ? SCREEN_FADE_MS
      : 0;

    taskContainer.classList.remove("flash-correct");
    taskContainer.classList.add("task-entering");
    global.setTimeout(function revealTaskContainer() {
      global.requestAnimationFrame(function onFirstFrame() {
        global.requestAnimationFrame(function onSecondFrame() {
          taskContainer.classList.remove("task-entering");
        });
      });
    }, delayMs);
  }

  function animateAnswerButtonAppearance(button, index) {
    if (!button || !button.classList) {
      return;
    }

    var gameScreen = byId("screen-game");
    var delayStartMs = gameScreen && gameScreen.classList && gameScreen.classList.contains("hidden")
      ? SCREEN_FADE_MS
      : 0;

    button.classList.remove("answer-enter");
    button.style.animationDelay = String((index + 1) * 0.05) + "s";
    global.setTimeout(function startAnimation() {
      void button.offsetWidth;
      button.classList.add("answer-enter");
    }, delayStartMs);
  }

  function showTask(task) {
    uiState.currentTask = task && typeof task === "object" ? task : null;
    uiState.feedback = null;
    animateTaskContainerEntry();

    renderTaskQuestion(uiState.currentTask);

    var buttons = getAnswerButtons();
    var options = Array.isArray(task && task.options) ? task.options : [];

    for (var i = 0; i < buttons.length; i += 1) {
      var option = options[i];
      buttons[i].innerHTML = option !== undefined ? renderAnswer(option, "medium") : "";
      buttons[i].setAttribute("data-index", String(i));
      buttons[i].setAttribute("data-answer-index", String(i));
      clearAnswerVisualState(buttons[i]);
      buttons[i].disabled = false;
      animateAnswerButtonAppearance(buttons[i], i);
    }

    bindAnswerButtons();
    bindContinueButton();
    updateTaskMeta();
    hideFeedbackBlock();
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

  function highlightAnswers(task, selectedIndex, isCorrect, timedOut) {
    var buttons = getAnswerButtons();
    var correctIndex = Number(task && task.correctIndex);

    for (var i = 0; i < buttons.length; i += 1) {
      clearAnswerVisualState(buttons[i]);
      buttons[i].disabled = true;
      if (buttons[i].classList) {
        buttons[i].classList.add("disabled");
      }
    }

    if (!Number.isInteger(correctIndex) || !buttons[correctIndex]) {
      return;
    }

    if (isCorrect) {
      buttons[correctIndex].classList.add("answer-correct");
      return;
    }

    buttons[correctIndex].classList.add("answer-correct");

    if (!timedOut && Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < buttons.length && selectedIndex !== correctIndex) {
      buttons[selectedIndex].classList.add("answer-incorrect");
    }
  }

  function setFeedbackContent(mode, task) {
    var container = byId("feedback");
    var messageEl = byId("feedback-message");
    var explanationEl = byId("feedback-explanation");
    if (!container) {
      return;
    }

    var correctAnswerHtml = renderAnswer(task ? task.correctAnswer : null, "small");
    var messageHtml = "";
    var isCorrect = mode === "correct";
    var isTimedOut = mode === "timeup";

    if (isCorrect) {
      messageHtml = escapeHtml(safeT("correct", "Correct"));
    } else if (isTimedOut) {
      messageHtml = escapeHtml(safeT("time_up", "Time up")) + " " + correctAnswerHtml;
    } else {
      messageHtml = escapeHtml(safeT("incorrect", "Incorrect. Correct answer:")) + " " + correctAnswerHtml;
    }

    if (messageEl) {
      messageEl.innerHTML = messageHtml;
    }

    var explanation = (!isCorrect) ? getTaskExplanation(task) : "";
    if (explanationEl) {
      explanationEl.textContent = explanation;
      if (explanationEl.classList) {
        explanationEl.classList.toggle("explanation", explanation.length > 0);
      }
    }

    if (container.classList) {
      container.classList.remove("hidden", "feedback-correct", "feedback-incorrect");
      container.classList.add(isCorrect ? "feedback-correct" : "feedback-incorrect");
    }
  }

  function triggerCorrectFlash() {
    var taskContainer = byId("task-container");
    if (!taskContainer || !taskContainer.classList) {
      return;
    }

    taskContainer.classList.remove("flash-correct");
    void taskContainer.offsetWidth;
    taskContainer.classList.add("flash-correct");

    global.setTimeout(function removeFlash() {
      if (taskContainer.classList) {
        taskContainer.classList.remove("flash-correct");
      }
    }, TASK_FLASH_MS);
  }

  function showFeedbackInternal(mode, task, selectedIndex) {
    var safeTask = task && typeof task === "object" ? task : uiState.currentTask;
    if (!safeTask) {
      return;
    }

    var isCorrect = mode === "correct";
    var timedOut = mode === "timeup";

    lockAnswers(true);
    highlightAnswers(safeTask, selectedIndex, isCorrect, timedOut);
    setFeedbackContent(mode, safeTask);
    if (isCorrect) {
      triggerCorrectFlash();
      hideContinueButton();
    } else {
      showContinueButton();
    }

    uiState.feedback = {
      mode: mode,
      task: safeTask,
      selectedIndex: Number.isInteger(selectedIndex) ? selectedIndex : -1
    };
  }

  function showFeedback(isCorrect, task, selectedIndex) {
    showFeedbackInternal(isCorrect ? "correct" : "incorrect", task, Number(selectedIndex));
  }

  function showTimeUpFeedback(task) {
    showFeedbackInternal("timeup", task, -1);
  }

  function showResult(result, stats) {
    hideContinueButton();

    var state = stats && typeof stats === "object" ? stats : {};
    var isWin = result === "won";
    var resultScreen = byId("screen-result");
    if (resultScreen && resultScreen.classList) {
      resultScreen.classList.toggle("result-win", isWin);
      resultScreen.classList.toggle("result-lost", !isWin);
    }

    var titleEl = byId("result-title");
    if (titleEl) {
      titleEl.textContent = isWin
        ? safeT("victory_title", "Victory")
        : safeT("defeat_title", "Defeat");
      titleEl.style.color = isWin ? "var(--color-correct, #2ea043)" : "var(--color-incorrect, #d1242f)";
    }

    var subtitleEl = byId("result-subtitle");
    if (subtitleEl) {
      subtitleEl.textContent = isWin
        ? safeT("victory_subtitle", "Excellent work. Keep this streak going.")
        : safeT("defeat_subtitle", "Nothing is lost. Start a new game and conquer the map.");
    }

    var solvedEl = byId("stat-solved");
    var correctEl = byId("stat-correct");
    var incorrectEl = byId("stat-incorrect");
    var percentEl = byId("stat-percent");
    var avgTimeEl = byId("stat-avg-time");

    if (solvedEl) {
      solvedEl.textContent = String(Math.max(0, Math.trunc(Number(state.total) || 0)));
    }
    if (correctEl) {
      correctEl.textContent = String(Math.max(0, Math.trunc(Number(state.correct) || 0)));
    }
    if (incorrectEl) {
      incorrectEl.textContent = String(Math.max(0, Math.trunc(Number(state.incorrect) || 0)));
    }
    if (percentEl) {
      percentEl.textContent = String(Math.max(0, Math.trunc(Number(state.percent) || 0))) + "%";
    }
    if (avgTimeEl) {
      avgTimeEl.textContent = String(Math.max(0, Math.trunc(Number(state.avgTime) || 0)))
        + " "
        + safeT("seconds_short", "sec");
    }

    showScreen("result");
  }

  function updateMapScore(playerCount, totalCount) {
    var player = Math.max(0, Math.trunc(Number(playerCount) || 0));
    var total = Math.max(0, Math.trunc(Number(totalCount) || 0));

    var playerEl = byId("player-territories");
    var totalEl = byId("total-territories");
    if (playerEl) {
      playerEl.textContent = String(player);
    }
    if (totalEl) {
      totalEl.textContent = String(total);
    }

    var scoreDisplay = byId("score-display");
    var text = safeT("your_territories", "Your territories") + ": " + String(player)
      + " / " + safeT("total", "Total") + ": " + String(total);

    if (scoreDisplay) {
      var yourLabel = scoreDisplay.querySelector("[data-i18n='your_territories']");
      var totalLabel = scoreDisplay.querySelector("[data-i18n='total']");
      if (yourLabel) {
        yourLabel.textContent = safeT("your_territories", "Your territories");
      }
      if (totalLabel) {
        totalLabel.textContent = safeT("total", "Total");
      }

      if (!playerEl || !totalEl) {
        scoreDisplay.textContent = text;
      }
      return;
    }

    if (!playerEl || !totalEl) {
      var scoreBar = byId("score-bar");
      if (scoreBar) {
        scoreBar.textContent = text;
      }
    }
  }

  function refreshLanguageDependentUi() {
    updateStartScreenInfo();
    updateTaskMeta();

    if (uiState.currentTask) {
      renderTaskQuestion(uiState.currentTask);
    }

    if (uiState.feedback && uiState.feedback.task) {
      setFeedbackContent(uiState.feedback.mode, uiState.feedback.task);
    }

    var player = Number((byId("player-territories") || {}).textContent);
    var total = Number((byId("total-territories") || {}).textContent);
    if (Number.isFinite(player) && Number.isFinite(total)) {
      updateMapScore(player, total);
    }

    var state = getTaskState();
    if (state && (state.status === "won" || state.status === "lost")) {
      showResult(state.status, state.stats || {});
    }
  }

  function initStartScreen() {
    updateStartScreenInfo();
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomColor() {
    var palette = ["#ef4444", "#1f6feb", "#16a34a", "#f59e0b", "#8b5cf6", "#f97316"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function getConfettiCanvas(canvasElement) {
    if (canvasElement && typeof canvasElement.getContext === "function") {
      return canvasElement;
    }
    return byId("confetti-canvas");
  }

  function resizeConfettiCanvas() {
    if (!confettiState.canvas || !confettiState.ctx) {
      return;
    }

    var dpr = Math.max(1, Number(global.devicePixelRatio) || 1);
    var width = Math.max(1, Math.round(global.innerWidth || confettiState.canvas.clientWidth || 1280));
    var height = Math.max(1, Math.round(global.innerHeight || confettiState.canvas.clientHeight || 720));

    confettiState.viewportWidth = width;
    confettiState.viewportHeight = height;
    confettiState.dpr = dpr;

    confettiState.canvas.width = Math.round(width * dpr);
    confettiState.canvas.height = Math.round(height * dpr);
    confettiState.ctx.setTransform(1, 0, 0, 1, 0, 0);
    confettiState.ctx.scale(dpr, dpr);
  }

  function createParticle() {
    return {
      x: Math.random() * confettiState.viewportWidth,
      y: randomBetween(-confettiState.viewportHeight * 0.4, -20),
      vx: randomBetween(-4, 4),
      vy: randomBetween(-15, -5),
      gravity: randomBetween(0.22, 0.36),
      color: randomColor(),
      width: randomBetween(4, 12),
      height: randomBetween(2, 7),
      rotation: randomBetween(0, Math.PI * 2),
      rotationSpeed: randomBetween(-0.22, 0.22),
      waveOffset: randomBetween(0, Math.PI * 2),
      alpha: randomBetween(0.85, 1)
    };
  }

  function fillParticles() {
    var count = Math.floor(randomBetween(CONFETTI_MIN_PARTICLES, CONFETTI_MAX_PARTICLES + 1));
    confettiState.particles = [];

    for (var i = 0; i < count; i += 1) {
      confettiState.particles.push(createParticle());
    }
  }

  function drawParticles(elapsedMs) {
    var ctx = confettiState.ctx;
    if (!ctx) {
      return;
    }

    var fadeStart = CONFETTI_DURATION_MS - 1100;
    var fadeFactor = 1;
    if (elapsedMs > fadeStart) {
      fadeFactor = Math.max(0, 1 - ((elapsedMs - fadeStart) / Math.max(1, CONFETTI_DURATION_MS - fadeStart)));
    }

    ctx.clearRect(0, 0, confettiState.viewportWidth, confettiState.viewportHeight);

    var next = [];
    for (var i = 0; i < confettiState.particles.length; i += 1) {
      var p = confettiState.particles[i];
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.x += p.vx + Math.sin((elapsedMs / 300) + p.waveOffset) * 1.1;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      var isOut = p.y > confettiState.viewportHeight + 40 || p.x < -60 || p.x > confettiState.viewportWidth + 60;
      if (!isOut) {
        next.push(p);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.alpha * fadeFactor);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.restore();
    }

    confettiState.particles = next;
  }

  function stopConfetti() {
    confettiState.running = false;

    if (confettiState.rafId !== null) {
      global.cancelAnimationFrame(confettiState.rafId);
      confettiState.rafId = null;
    }

    if (confettiState.stopTimerId !== null) {
      global.clearTimeout(confettiState.stopTimerId);
      confettiState.stopTimerId = null;
    }

    if (confettiState.resizeHandler) {
      global.removeEventListener("resize", confettiState.resizeHandler);
      confettiState.resizeHandler = null;
    }

    if (confettiState.ctx) {
      confettiState.ctx.clearRect(0, 0, confettiState.viewportWidth || 0, confettiState.viewportHeight || 0);
    }

    confettiState.canvas = null;
    confettiState.ctx = null;
    confettiState.particles = [];
  }

  function confettiFrame(timestamp) {
    if (!confettiState.running || !confettiState.ctx) {
      return;
    }

    var elapsed = Math.max(0, timestamp - confettiState.startedAtMs);
    drawParticles(elapsed);

    if (elapsed >= CONFETTI_DURATION_MS && confettiState.particles.length === 0) {
      stopConfetti();
      return;
    }

    confettiState.rafId = global.requestAnimationFrame(confettiFrame);
  }

  function startConfetti(canvasElement) {
    stopConfetti();

    var canvas = getConfettiCanvas(canvasElement);
    if (!canvas) {
      return false;
    }

    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return false;
    }

    confettiState.canvas = canvas;
    confettiState.ctx = ctx;
    confettiState.running = true;
    confettiState.resizeHandler = resizeConfettiCanvas;
    global.addEventListener("resize", confettiState.resizeHandler);

    resizeConfettiCanvas();
    fillParticles();

    confettiState.startedAtMs = global.performance && typeof global.performance.now === "function"
      ? global.performance.now()
      : Date.now();
    confettiState.rafId = global.requestAnimationFrame(confettiFrame);
    confettiState.stopTimerId = global.setTimeout(function autoStopConfetti() {
      stopConfetti();
    }, CONFETTI_DURATION_MS + 300);

    return true;
  }

  var existing = global.UIController && typeof global.UIController === "object"
    ? global.UIController
    : {};

  existing.renderFraction = renderFraction;
  existing.renderExpression = renderExpression;
  existing.renderAnswer = renderAnswer;
  existing.showScreen = showScreen;
  existing.initStartScreen = initStartScreen;
  existing.showTask = showTask;
  existing.showFeedback = showFeedback;
  existing.showTimeUpFeedback = showTimeUpFeedback;
  existing.showResult = showResult;
  existing.updateMapScore = updateMapScore;
  existing.refreshLanguage = refreshLanguageDependentUi;

  global.UIController = existing;
  global.Confetti = {
    start: startConfetti,
    stop: stopConfetti
  };
})(typeof window !== "undefined" ? window : globalThis);

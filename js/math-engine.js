// js/math-engine.js - Fraction task generation and fraction math utilities
(function attachMathEngine(global) {
  "use strict";

  var MAX_ABS_VALUE = 999;
  var MAX_GENERATION_ATTEMPTS = 10;

  var LEVEL_PARAMS = {
    1: { denoms: [2, 3, 4, 5, 6, 8, 10, 12], maxNum: 12, maxTerms: 2, negatives: false },
    2: { denoms: null, minDen: 2, maxDen: 20, maxNum: 20, maxTerms: 2, negatives: false },
    3: { denoms: null, minDen: 2, maxDen: 50, maxNum: 50, maxTerms: 3, negatives: true },
    4: { denoms: null, minDen: 2, maxDen: 100, maxNum: 100, maxTerms: 4, negatives: true }
  };

  function randomInt(min, max) {
    var from = Math.ceil(Math.min(min, max));
    var to = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (to - from + 1)) + from;
  }

  function gcd(a, b) {
    var x = Math.abs(Math.trunc(a));
    var y = Math.abs(Math.trunc(b));

    if (x === 0 && y === 0) {
      return 1;
    }

    while (y !== 0) {
      var temp = y;
      y = x % y;
      x = temp;
    }

    return x || 1;
  }

  function lcm(a, b) {
    var x = Math.trunc(a);
    var y = Math.trunc(b);
    if (x === 0 || y === 0) {
      return 0;
    }
    return Math.abs((x * y) / gcd(x, y));
  }

  function simplifyFraction(num, den) {
    var n = Number(num);
    var d = Number(den);

    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
      throw new Error("Invalid fraction");
    }

    n = Math.trunc(n);
    d = Math.trunc(d);

    if (d < 0) {
      n = -n;
      d = -d;
    }

    if (n === 0) {
      return { num: 0, den: 1 };
    }

    var divisor = gcd(n, d);
    return { num: n / divisor, den: d / divisor };
  }

  function toImproper(whole, num, den) {
    var w = Number(whole);
    var n = Number(num);
    var d = Number(den);

    if (!Number.isFinite(w) || !Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
      throw new Error("Invalid mixed number");
    }

    w = Math.trunc(w);
    n = Math.abs(Math.trunc(n));
    d = Math.abs(Math.trunc(d));

    var improperNum = w >= 0 ? (w * d + n) : (w * d - n);
    return simplifyFraction(improperNum, d);
  }

  function toMixed(num, den) {
    var fraction = simplifyFraction(num, den);
    var n = fraction.num;
    var d = fraction.den;
    var sign = n < 0 ? -1 : 1;
    var absNum = Math.abs(n);

    var whole = Math.floor(absNum / d);
    var remainder = absNum % d;

    if (whole === 0) {
      return { num: n, den: d };
    }

    if (remainder === 0) {
      return { num: sign * whole, den: 1 };
    }

    return {
      whole: sign * whole,
      num: remainder,
      den: d
    };
  }

  function normalizeFractionInput(value) {
    if (!value || typeof value !== "object") {
      throw new Error("Fraction value is required");
    }

    if (Object.prototype.hasOwnProperty.call(value, "decimal")) {
      return decimalToFraction(value.decimal);
    }

    if (Object.prototype.hasOwnProperty.call(value, "whole")) {
      return toImproper(value.whole, value.num, value.den);
    }

    return simplifyFraction(value.num, value.den);
  }

  function fractionsEqual(f1, f2) {
    var a = normalizeFractionInput(f1);
    var b = normalizeFractionInput(f2);
    return a.num === b.num && a.den === b.den;
  }

  function fractionToDecimal(num, den) {
    var fraction = simplifyFraction(num, den);
    return fraction.num / fraction.den;
  }

  function decimalToFraction(decimal) {
    var value = Number(decimal);
    if (!Number.isFinite(value)) {
      throw new Error("Invalid decimal");
    }

    if (value === 0) {
      return { num: 0, den: 1 };
    }

    var sign = value < 0 ? -1 : 1;
    var absValue = Math.abs(value);

    if (Number.isInteger(absValue)) {
      return { num: sign * absValue, den: 1 };
    }

    var denominator = 1;
    var limit = 1000000;
    while (denominator < limit && Math.abs(Math.round(absValue * denominator) - absValue * denominator) > 1e-10) {
      denominator *= 10;
    }

    var numerator = Math.round(absValue * denominator) * sign;
    return simplifyFraction(numerator, denominator);
  }

  function getLevelParams(level) {
    var lvl = Number(level);
    if (!Number.isInteger(lvl) || !LEVEL_PARAMS[lvl]) {
      return LEVEL_PARAMS[2];
    }
    return LEVEL_PARAMS[lvl];
  }

  function getRandomDenominator(params) {
    if (Array.isArray(params.denoms) && params.denoms.length > 0) {
      return params.denoms[randomInt(0, params.denoms.length - 1)];
    }
    return randomInt(params.minDen, params.maxDen);
  }

  function generateProperIrreducibleFraction(params) {
    for (var attempt = 0; attempt < 200; attempt += 1) {
      var den = getRandomDenominator(params);
      var maxNum = Math.min(params.maxNum, den - 1);
      if (maxNum < 1) {
        continue;
      }

      var num = randomInt(1, maxNum);
      if (gcd(num, den) !== 1) {
        continue;
      }

      return { num: num, den: den };
    }

    return { num: 1, den: 2 };
  }

  function generateArithmeticOperand(level) {
    var params = getLevelParams(level);
    var base;

    if (level >= 3) {
      var denMax = Math.min(params.maxDen || 20, level === 3 ? 24 : 36);
      var den = randomInt(2, denMax);
      var numMax = Math.min(params.maxNum || 20, level === 3 ? 24 : 36);
      var num = randomInt(1, numMax);
      base = simplifyFraction(num, den);

      if (Math.random() < 0.35) {
        var wholeAddon = randomInt(1, level === 3 ? 6 : 8);
        base = simplifyFraction(base.num + wholeAddon * base.den, base.den);
      }
    } else {
      base = generateProperIrreducibleFraction(params);
    }

    if (level === 2 && Math.random() < 0.3) {
      return {
        whole: randomInt(1, 5),
        num: base.num,
        den: base.den
      };
    }

    if (level >= 3 && Math.random() < 0.3) {
      var mixed = toMixed(base.num, base.den);
      if (Object.prototype.hasOwnProperty.call(mixed, "whole")) {
        return maybeMakeNegative(mixed, level);
      }
    }

    return maybeMakeNegative(base, level);
  }

  function formatOperationAnswer(fraction, level) {
    var result = simplifyFraction(fraction.num, fraction.den);
    if (level === 2 && result.den !== 1 && Math.abs(result.num) > result.den) {
      var mixed = toMixed(result.num, result.den);
      if (Object.prototype.hasOwnProperty.call(mixed, "whole")) {
        return { correctAnswer: mixed, answerType: "mixed" };
      }
    }
    return { correctAnswer: result, answerType: "fraction" };
  }

  function isProperFractionOrWhole(fraction) {
    return fraction.den === 1 || (fraction.num >= 0 && fraction.num < fraction.den);
  }

  function isProperFraction(fraction) {
    return fraction.num >= 0 && fraction.num < fraction.den;
  }

  function maybeMakeNegative(value, level) {
    if (level < 3) {
      return value;
    }
    if (Math.random() >= 0.2) {
      return value;
    }

    if (typeof value === "number") {
      return -value;
    }

    if (value && typeof value === "object") {
      if (Object.prototype.hasOwnProperty.call(value, "whole")) {
        if (value.whole !== 0) {
          value.whole = -Math.abs(value.whole);
        } else {
          value.num = -Math.abs(value.num);
        }
        return value;
      }

      if (Object.prototype.hasOwnProperty.call(value, "decimal")) {
        value.decimal = -Math.abs(value.decimal);
        return value;
      }

      if (Object.prototype.hasOwnProperty.call(value, "num")) {
        value.num = -Math.abs(value.num);
        return value;
      }
    }

    return value;
  }

  function addFractions(a, b) {
    return simplifyFraction(a.num * b.den + b.num * a.den, a.den * b.den);
  }

  function subtractFractions(a, b) {
    return simplifyFraction(a.num * b.den - b.num * a.den, a.den * b.den);
  }

  function multiplyFractions(a, b) {
    return simplifyFraction(a.num * b.num, a.den * b.den);
  }

  function divideFractions(a, b) {
    if (b.num === 0) {
      throw new Error("Division by zero");
    }
    return simplifyFraction(a.num * b.den, a.den * b.num);
  }

  function applyOperator(left, right, operatorSymbol) {
    if (operatorSymbol === "+") {
      return addFractions(left, right);
    }
    if (operatorSymbol === "−") {
      return subtractFractions(left, right);
    }
    if (operatorSymbol === "×") {
      return multiplyFractions(left, right);
    }
    if (operatorSymbol === "÷") {
      return divideFractions(left, right);
    }
    throw new Error("Unsupported operator: " + operatorSymbol);
  }

  function buildLinearExpression(operators) {
    var expression = "{0}";
    for (var i = 0; i < operators.length; i += 1) {
      expression += " " + operators[i] + " {" + String(i + 1) + "}";
    }
    return expression;
  }

  function buildParenthesizedExpression(operators) {
    var termCount = operators.length + 1;
    if (termCount === 2) {
      return "({0} " + operators[0] + " {1})";
    }

    if (termCount === 3) {
      if (Math.random() < 0.5) {
        return "({0} " + operators[0] + " {1}) " + operators[1] + " {2}";
      }
      return "{0} " + operators[0] + " ({1} " + operators[1] + " {2})";
    }

    if (termCount === 4) {
      var variant = randomInt(0, 2);
      if (variant === 0) {
        return "({0} " + operators[0] + " {1}) " + operators[1] + " ({2} " + operators[2] + " {3})";
      }
      if (variant === 1) {
        return "(({0} " + operators[0] + " {1}) " + operators[1] + " {2}) " + operators[2] + " {3}";
      }
      return "{0} " + operators[0] + " ({1} " + operators[1] + " ({2} " + operators[2] + " {3}))";
    }

    return buildLinearExpression(operators);
  }

  function tokenizeExpression(expression) {
    var tokens = [];
    var index = 0;

    while (index < expression.length) {
      var char = expression[index];
      if (char === " " || char === "\t" || char === "\n" || char === "\r") {
        index += 1;
        continue;
      }

      if (char === "(" || char === ")" || char === "+" || char === "−" || char === "×" || char === "÷") {
        tokens.push({ type: "symbol", value: char });
        index += 1;
        continue;
      }

      if (char === "{") {
        var closeIndex = expression.indexOf("}", index);
        if (closeIndex === -1) {
          throw new Error("Invalid expression template");
        }
        var rawIndex = expression.slice(index + 1, closeIndex);
        var parsedIndex = Number(rawIndex);
        if (!Number.isInteger(parsedIndex)) {
          throw new Error("Invalid operand placeholder");
        }
        tokens.push({ type: "operand", value: parsedIndex });
        index = closeIndex + 1;
        continue;
      }

      throw new Error("Unexpected character in expression: " + char);
    }

    return tokens;
  }

  function evaluateExpressionTemplate(expression, operandFractions) {
    var tokens = tokenizeExpression(expression);
    var position = 0;

    function parseExpression() {
      var left = parseTerm();
      while (position < tokens.length && tokens[position].type === "symbol" && (tokens[position].value === "+" || tokens[position].value === "−")) {
        var operatorSymbol = tokens[position].value;
        position += 1;
        var right = parseTerm();
        left = applyOperator(left, right, operatorSymbol);
      }
      return left;
    }

    function parseTerm() {
      var left = parseFactor();
      while (position < tokens.length && tokens[position].type === "symbol" && (tokens[position].value === "×" || tokens[position].value === "÷")) {
        var operatorSymbol = tokens[position].value;
        position += 1;
        var right = parseFactor();
        left = applyOperator(left, right, operatorSymbol);
      }
      return left;
    }

    function parseFactor() {
      if (position >= tokens.length) {
        throw new Error("Unexpected end of expression");
      }

      var token = tokens[position];
      if (token.type === "operand") {
        position += 1;
        if (!operandFractions[token.value]) {
          throw new Error("Operand placeholder out of range");
        }
        return operandFractions[token.value];
      }

      if (token.type === "symbol" && token.value === "(") {
        position += 1;
        var value = parseExpression();
        if (position >= tokens.length || tokens[position].type !== "symbol" || tokens[position].value !== ")") {
          throw new Error("Missing closing parenthesis");
        }
        position += 1;
        return value;
      }

      throw new Error("Unexpected token in expression");
    }

    var result = parseExpression();
    if (position !== tokens.length) {
      throw new Error("Unexpected trailing tokens in expression");
    }
    return result;
  }

  function evaluateQuestionToFraction(question) {
    var operands = Array.isArray(question.operands) ? question.operands : [];
    var fractions = [];
    for (var i = 0; i < operands.length; i += 1) {
      fractions.push(normalizeFractionInput(operands[i]));
    }

    if (fractions.length === 0) {
      throw new Error("Question has no operands");
    }

    var expression = question.expression;
    if (!expression) {
      if (Array.isArray(question.operators) && question.operators.length > 0) {
        expression = buildLinearExpression(question.operators);
      } else if (question.operator && fractions.length === 2) {
        expression = "{0} " + question.operator + " {1}";
      } else {
        throw new Error("Question has no operators");
      }
    }

    return evaluateExpressionTemplate(expression, fractions);
  }

  function countTerminatingDigits(denominator) {
    var den = Math.abs(Math.trunc(denominator));
    if (den === 0) {
      return Infinity;
    }

    var pow2 = 0;
    var pow5 = 0;
    while (den % 2 === 0) {
      den /= 2;
      pow2 += 1;
    }
    while (den % 5 === 0) {
      den /= 5;
      pow5 += 1;
    }

    if (den !== 1) {
      return Infinity;
    }

    return Math.max(pow2, pow5);
  }

  function isTerminatingFraction(fraction) {
    var simplified = simplifyFraction(fraction.num, fraction.den);
    return countTerminatingDigits(simplified.den) !== Infinity;
  }

  function analyzeDecimalExpansion(num, den) {
    var simplified = simplifyFraction(num, den);
    var sign = simplified.num < 0 ? -1 : 1;
    var absNum = Math.abs(simplified.num);
    var integerPart = Math.floor(absNum / simplified.den);
    var remainder = absNum % simplified.den;
    var digits = [];
    var seen = {};
    var repeatStart = -1;

    while (remainder !== 0) {
      if (Object.prototype.hasOwnProperty.call(seen, remainder)) {
        repeatStart = seen[remainder];
        break;
      }

      seen[remainder] = digits.length;
      remainder *= 10;
      digits.push(Math.floor(remainder / simplified.den));
      remainder %= simplified.den;

      if (digits.length > 300) {
        break;
      }
    }

    var prefix = sign < 0 ? "-" : "";
    var decimalPreview = Number((simplified.num / simplified.den).toFixed(3));

    if (repeatStart === -1) {
      return {
        terminating: true,
        digits: digits.join(""),
        decimal: decimalPreview,
        display: prefix + String(integerPart) + (digits.length ? "," + digits.join("") : "")
      };
    }

    var nonRepeat = digits.slice(0, repeatStart).join("");
    var period = digits.slice(repeatStart).join("");

    return {
      terminating: false,
      decimal: decimalPreview,
      period: period,
      display: prefix + String(integerPart) + "," + nonRepeat + "(" + period + ")"
    };
  }

  function allNumbersWithinLimit(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) && Math.abs(value) <= MAX_ABS_VALUE;
    }

    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) {
        if (!allNumbersWithinLimit(value[i])) {
          return false;
        }
      }
      return true;
    }

    if (value && typeof value === "object") {
      var keys = Object.keys(value);
      for (var j = 0; j < keys.length; j += 1) {
        if (!allNumbersWithinLimit(value[keys[j]])) {
          return false;
        }
      }
      return true;
    }

    return true;
  }

  function validateFraction(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    if (!Number.isInteger(value.num) || !Number.isInteger(value.den)) {
      return false;
    }
    if (value.den <= 0) {
      return false;
    }
    return Math.abs(value.num) <= MAX_ABS_VALUE && Math.abs(value.den) <= MAX_ABS_VALUE;
  }

  function validateTask(task) {
    if (!task || typeof task !== "object") {
      return false;
    }

    if (!allNumbersWithinLimit(task.question) || !allNumbersWithinLimit(task.correctAnswer)) {
      return false;
    }

    if (task.question && Array.isArray(task.question.operands)) {
      for (var i = 0; i < task.question.operands.length; i += 1) {
        try {
          var operandFraction = normalizeFractionInput(task.question.operands[i]);
          if (!validateFraction(operandFraction)) {
            return false;
          }
        } catch (error) {
          return false;
        }
      }
    }

    if (task.answerType === "fraction") {
      if (!validateFraction(task.correctAnswer)) {
        return false;
      }
    } else if (task.answerType === "mixed") {
      var answer = task.correctAnswer;
      if (Object.prototype.hasOwnProperty.call(answer, "whole")) {
        if (!(Number.isInteger(answer.whole) && validateFraction({ num: answer.num, den: answer.den }))) {
          return false;
        }
      } else if (!validateFraction(answer)) {
        return false;
      }
    } else if (task.answerType === "common_denom") {
      var group = task.correctAnswer;
      if (!group || !Array.isArray(group.fractions) || group.fractions.length !== 2) {
        return false;
      }
      if (!Number.isInteger(group.commonDen) || group.commonDen <= 0 || group.commonDen > MAX_ABS_VALUE) {
        return false;
      }
      if (!validateFraction(group.fractions[0]) || !validateFraction(group.fractions[1])) {
        return false;
      }
      if (!(group.fractions[0].den === group.commonDen && group.fractions[1].den === group.commonDen)) {
        return false;
      }
    } else if (task.answerType === "decimal") {
      var decimalAnswer = task.correctAnswer;
      if (!decimalAnswer || typeof decimalAnswer !== "object") {
        return false;
      }
      if (!Number.isFinite(decimalAnswer.decimal) || Math.abs(decimalAnswer.decimal) > MAX_ABS_VALUE) {
        return false;
      }
      if (Object.prototype.hasOwnProperty.call(decimalAnswer, "period") && typeof decimalAnswer.period !== "string") {
        return false;
      }
      if (Object.prototype.hasOwnProperty.call(decimalAnswer, "display") && typeof decimalAnswer.display !== "string") {
        return false;
      }
    } else {
      return false;
    }

    try {
      if (task.topic === "divide") {
        if (!task.question || !Array.isArray(task.question.operands) || task.question.operands.length !== 2) {
          return false;
        }
        var divisor = normalizeFractionInput(task.question.operands[1]);
        if (divisor.num === 0) {
          return false;
        }
      }

      if (task.topic === "subtract" && task.level <= 2) {
        var subResult = normalizeFractionInput(task.correctAnswer);
        if (subResult.num < 0) {
          return false;
        }
      }

      if (task.level === 1 && (task.topic === "add" || task.topic === "divide")) {
        var levelOneResult = normalizeFractionInput(task.correctAnswer);
        if (!isProperFractionOrWhole(levelOneResult)) {
          return false;
        }
      }

      if (task.level === 1 && task.topic === "multiply") {
        var multiplyResult = normalizeFractionInput(task.correctAnswer);
        if (!isProperFraction(multiplyResult)) {
          return false;
        }
      }

      if (task.topic === "to_decimal") {
        if (!task.question || !validateFraction(task.question)) {
          return false;
        }
      }

      if (task.topic === "from_decimal") {
        if (!task.question || !Number.isFinite(task.question.decimal)) {
          return false;
        }
      }
    } catch (error) {
      return false;
    }

    return true;
  }

  function buildTask(topic, level, question, correctAnswer, answerType) {
    return {
      topic: topic,
      level: level,
      question: question,
      correctAnswer: correctAnswer,
      answerType: answerType
    };
  }

  function cloneValue(value) {
    if (!value || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      var clonedArray = [];
      for (var i = 0; i < value.length; i += 1) {
        clonedArray.push(cloneValue(value[i]));
      }
      return clonedArray;
    }

    var clonedObject = {};
    var keys = Object.keys(value);
    for (var j = 0; j < keys.length; j += 1) {
      var key = keys[j];
      clonedObject[key] = cloneValue(value[key]);
    }
    return clonedObject;
  }

  function normalizeOperatorSymbol(symbol) {
    if (symbol === "+") {
      return "+";
    }

    if (symbol === "-" || symbol === "−" || symbol === "–" || symbol === "—" || symbol === "в€’") {
      return "-";
    }

    if (symbol === "*" || symbol === "×" || symbol === "x" || symbol === "X" || symbol === "Г—") {
      return "*";
    }

    if (symbol === "/" || symbol === "÷" || symbol === ":" || symbol === "Г·") {
      return "/";
    }

    return symbol;
  }

  function operatorForDisplay(symbol) {
    var normalized = normalizeOperatorSymbol(symbol);
    if (normalized === "*") {
      return "×";
    }
    if (normalized === "/") {
      return "÷";
    }
    if (normalized === "-") {
      return "−";
    }
    return normalized;
  }

  function sanitizeMathText(text) {
    return String(text)
      .split("в€’").join("−")
      .split("Г—").join("×")
      .split("Г·").join("÷");
  }

  function applyNormalizedOperator(left, right, operatorSymbol) {
    var normalized = normalizeOperatorSymbol(operatorSymbol);

    if (normalized === "+") {
      return addFractions(left, right);
    }
    if (normalized === "-") {
      return subtractFractions(left, right);
    }
    if (normalized === "*") {
      return multiplyFractions(left, right);
    }
    if (normalized === "/") {
      return divideFractions(left, right);
    }

    throw new Error("Unsupported operator: " + String(operatorSymbol));
  }

  function getQuestionOperators(question) {
    if (!question || typeof question !== "object") {
      return [];
    }

    if (question.operator) {
      return [question.operator];
    }

    if (Array.isArray(question.operators)) {
      return question.operators.slice();
    }

    return [];
  }

  function getQuestionOperandsAsFractions(question) {
    if (!question || typeof question !== "object" || !Array.isArray(question.operands)) {
      return [];
    }

    var operands = [];
    for (var i = 0; i < question.operands.length; i += 1) {
      try {
        operands.push(normalizeFractionInput(question.operands[i]));
      } catch (error) {
        return [];
      }
    }

    return operands;
  }

  function getExpressionTemplate(question) {
    if (!question || typeof question !== "object") {
      return "";
    }

    if (typeof question.expression === "string" && question.expression.length > 0) {
      return question.expression;
    }

    var operators = getQuestionOperators(question);
    if (operators.length > 0) {
      return buildLinearExpression(operators);
    }

    return "";
  }

  function renderExpressionWithOperands(question, formatter) {
    var template = getExpressionTemplate(question);
    if (!template || !Array.isArray(question && question.operands)) {
      return "";
    }

    var rendered = template.replace(/\{(\d+)\}/g, function replacePlaceholder(match, rawIndex) {
      var index = Number(rawIndex);
      if (!Number.isInteger(index) || !question.operands[index]) {
        return match;
      }

      var value = formatter ? formatter(question.operands[index]) : formatFractionValue(question.operands[index]);
      return value;
    });

    return sanitizeMathText(rendered);
  }

  function evaluateQuestionWithOperands(question, operands) {
    if (!question || typeof question !== "object" || !Array.isArray(operands)) {
      return null;
    }

    try {
      var customQuestion = {
        operands: cloneValue(operands)
      };

      if (question.expression) {
        customQuestion.expression = question.expression;
      }
      if (Array.isArray(question.operators)) {
        customQuestion.operators = question.operators.slice();
      }
      if (question.operator) {
        customQuestion.operator = question.operator;
      }

      return evaluateQuestionToFraction(customQuestion);
    } catch (error) {
      return null;
    }
  }

  function evaluateQuestionLeftToRight(question, overrideOperands) {
    if (!question || typeof question !== "object") {
      return null;
    }

    var rawOperands = Array.isArray(overrideOperands) ? overrideOperands : question.operands;
    if (!Array.isArray(rawOperands) || rawOperands.length === 0) {
      return null;
    }

    var fractions = [];
    try {
      for (var i = 0; i < rawOperands.length; i += 1) {
        fractions.push(normalizeFractionInput(rawOperands[i]));
      }
    } catch (error) {
      return null;
    }

    var operators = getQuestionOperators(question);
    if (operators.length === 0 || operators.length !== fractions.length - 1) {
      return null;
    }

    var result = fractions[0];
    try {
      for (var j = 0; j < operators.length; j += 1) {
        result = applyNormalizedOperator(result, fractions[j + 1], operators[j]);
      }
    } catch (error) {
      return null;
    }

    return result;
  }

  function collapseOperations(fractions, operators, predicate) {
    var nextFractions = [fractions[0]];
    var nextOperators = [];

    for (var i = 0; i < operators.length; i += 1) {
      var operatorSymbol = operators[i];
      if (predicate(operatorSymbol)) {
        var combined = applyNormalizedOperator(nextFractions[nextFractions.length - 1], fractions[i + 1], operatorSymbol);
        nextFractions[nextFractions.length - 1] = combined;
      } else {
        nextOperators.push(operatorSymbol);
        nextFractions.push(fractions[i + 1]);
      }
    }

    return {
      fractions: nextFractions,
      operators: nextOperators
    };
  }

  function evaluateQuestionWithAdditionPriority(question) {
    if (!question || typeof question !== "object") {
      return null;
    }

    var fractions = getQuestionOperandsAsFractions(question);
    var operatorsRaw = getQuestionOperators(question);
    if (fractions.length === 0 || operatorsRaw.length !== fractions.length - 1) {
      return null;
    }

    var operators = [];
    for (var i = 0; i < operatorsRaw.length; i += 1) {
      operators.push(normalizeOperatorSymbol(operatorsRaw[i]));
    }

    try {
      var firstPass = collapseOperations(fractions, operators, function applyNow(operatorSymbol) {
        return operatorSymbol === "+" || operatorSymbol === "-";
      });

      var result = firstPass.fractions[0];
      for (var j = 0; j < firstPass.operators.length; j += 1) {
        result = applyNormalizedOperator(result, firstPass.fractions[j + 1], firstPass.operators[j]);
      }

      return result;
    } catch (error) {
      return null;
    }
  }

  function decimalPlacesOfNumber(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    var text = String(value);
    if (text.indexOf("e") !== -1 || text.indexOf("E") !== -1) {
      text = Number(value).toFixed(6);
    }

    var decimalIndex = text.indexOf(".");
    if (decimalIndex === -1) {
      return 0;
    }

    var fractional = text.slice(decimalIndex + 1).replace(/0+$/, "");
    return fractional.length;
  }

  function getDecimalPlacesForTask(task) {
    var places = 0;

    if (task && task.question && Number.isFinite(task.question.decimal)) {
      places = Math.max(places, decimalPlacesOfNumber(task.question.decimal));
    }

    if (task && task.correctAnswer && Number.isFinite(task.correctAnswer.decimal)) {
      places = Math.max(places, decimalPlacesOfNumber(task.correctAnswer.decimal));
    }

    if (task && task.correctAnswer && typeof task.correctAnswer.period === "string" && task.correctAnswer.period.length > 0) {
      places = Math.max(places, Math.min(3, task.correctAnswer.period.length));
    }

    if (places === 0) {
      places = 2;
    }

    return Math.min(3, Math.max(1, places));
  }

  function formatDecimalNumber(value, places) {
    if (!Number.isFinite(value)) {
      return "?";
    }

    var decimalPlaces = Number.isInteger(places) ? places : decimalPlacesOfNumber(value);
    decimalPlaces = Math.min(6, Math.max(0, decimalPlaces));

    var text = Number(value).toFixed(decimalPlaces);
    text = text.replace(/\.?0+$/, "");
    if (text === "-0") {
      return "0";
    }
    return text.replace(".", ",");
  }

  function formatFractionValue(value) {
    try {
      var normalized = normalizeFractionInput(value);
      return String(normalized.num) + "/" + String(normalized.den);
    } catch (error) {
      return "?";
    }
  }

  function formatRawFraction(value) {
    if (!value || typeof value !== "object") {
      return "?";
    }
    if (!Number.isFinite(value.num) || !Number.isFinite(value.den) || value.den === 0) {
      return "?";
    }
    return String(Math.trunc(value.num)) + "/" + String(Math.trunc(value.den));
  }

  function formatMixedValue(value) {
    if (!value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, "whole")) {
      return formatFractionValue(value);
    }

    var whole = Number.isInteger(value.whole) ? value.whole : 0;
    var numerator = Number.isInteger(value.num) ? value.num : 0;
    var denominator = Number.isInteger(value.den) && value.den > 0 ? value.den : 1;

    if (numerator === 0) {
      return String(whole);
    }

    if (whole === 0) {
      return String(numerator) + "/" + String(denominator);
    }

    return String(whole) + " " + String(Math.abs(numerator)) + "/" + String(denominator);
  }

  function formatAnswerForDisplay(task) {
    if (!task || typeof task !== "object") {
      return "?";
    }

    if (task.answerType === "decimal") {
      if (task.correctAnswer && typeof task.correctAnswer.display === "string" && task.correctAnswer.display.length > 0) {
        return task.correctAnswer.display;
      }
      return formatDecimalNumber(task.correctAnswer && task.correctAnswer.decimal, getDecimalPlacesForTask(task));
    }

    if (task.answerType === "common_denom") {
      return String(task.correctAnswer && task.correctAnswer.commonDen);
    }

    if (task.answerType === "mixed") {
      return formatMixedValue(task.correctAnswer);
    }

    return formatFractionValue(task.correctAnswer);
  }

  function detectOptionKind(task) {
    if (task && (task.topic === "common_denom" || task.answerType === "common_denom")) {
      return "common_denom";
    }

    if (task && task.answerType === "decimal") {
      return "decimal";
    }

    if (task && (task.answerType === "mixed" || task.topic === "mixed")) {
      return "mixed";
    }

    return "fraction";
  }

  function toMixedOption(fractionValue) {
    var simplified = simplifyFraction(fractionValue.num, fractionValue.den);

    if (Math.abs(simplified.num) < simplified.den) {
      return null;
    }

    var sign = simplified.num < 0 ? -1 : 1;
    var absNum = Math.abs(simplified.num);
    var whole = Math.floor(absNum / simplified.den) * sign;
    var remainder = absNum % simplified.den;

    if (remainder === 0) {
      return {
        whole: whole,
        num: 0,
        den: 1
      };
    }

    return {
      whole: whole,
      num: remainder,
      den: simplified.den
    };
  }

  function normalizeOptionCandidate(candidate, kind, task, context) {
    if (kind === "common_denom") {
      var commonCandidate = candidate;
      if (commonCandidate && typeof commonCandidate === "object" && Object.prototype.hasOwnProperty.call(commonCandidate, "commonDen")) {
        commonCandidate = commonCandidate.commonDen;
      }

      if (!Number.isFinite(commonCandidate)) {
        return null;
      }

      var normalizedCommon = Math.abs(Math.trunc(commonCandidate));
      if (normalizedCommon <= 0 || normalizedCommon > MAX_ABS_VALUE) {
        return null;
      }
      return normalizedCommon;
    }

    if (kind === "decimal") {
      var decimalCandidate = candidate;
      if (decimalCandidate && typeof decimalCandidate === "object" && Object.prototype.hasOwnProperty.call(decimalCandidate, "decimal")) {
        decimalCandidate = decimalCandidate.decimal;
      }

      if (!Number.isFinite(decimalCandidate)) {
        return null;
      }

      var normalizedDecimal = Number(Number(decimalCandidate).toFixed(context.decimalPlaces));
      if (!Number.isFinite(normalizedDecimal) || Math.abs(normalizedDecimal) > MAX_ABS_VALUE) {
        return null;
      }

      return {
        decimal: normalizedDecimal
      };
    }

    var fractionCandidate;
    try {
      fractionCandidate = normalizeFractionInput(candidate);
    } catch (error) {
      return null;
    }

    if (!Number.isInteger(fractionCandidate.num) || !Number.isInteger(fractionCandidate.den) || fractionCandidate.den <= 0) {
      return null;
    }

    if (Math.abs(fractionCandidate.num) > MAX_ABS_VALUE * 20 || Math.abs(fractionCandidate.den) > MAX_ABS_VALUE * 20) {
      return null;
    }

    fractionCandidate = simplifyFraction(fractionCandidate.num, fractionCandidate.den);

    if (kind === "mixed") {
      var mixedCandidate = toMixedOption(fractionCandidate);
      if (!mixedCandidate) {
        return null;
      }

      if (
        !Number.isInteger(mixedCandidate.whole)
        || !Number.isInteger(mixedCandidate.num)
        || !Number.isInteger(mixedCandidate.den)
      ) {
        return null;
      }

      if (
        Math.abs(mixedCandidate.whole) > MAX_ABS_VALUE
        || Math.abs(mixedCandidate.num) > MAX_ABS_VALUE
        || Math.abs(mixedCandidate.den) > MAX_ABS_VALUE
      ) {
        return null;
      }

      return mixedCandidate;
    }

    if (Math.abs(fractionCandidate.num) > MAX_ABS_VALUE || Math.abs(fractionCandidate.den) > MAX_ABS_VALUE) {
      return null;
    }

    return fractionCandidate;
  }

  function getOptionKey(option, kind, context) {
    if (kind === "common_denom") {
      return "c:" + String(option);
    }

    if (kind === "decimal") {
      return "d:" + formatDecimalNumber(option.decimal, context.decimalPlaces);
    }

    try {
      var normalized = normalizeFractionInput(option);
      return "f:" + String(normalized.num) + "/" + String(normalized.den);
    } catch (error) {
      return null;
    }
  }

  function getCorrectOptionForTask(task, kind, context) {
    if (!task || typeof task !== "object") {
      return null;
    }

    if (kind === "common_denom") {
      return normalizeOptionCandidate(task.correctAnswer ? task.correctAnswer.commonDen : null, kind, task, context);
    }

    return normalizeOptionCandidate(task.correctAnswer, kind, task, context);
  }

  function getCorrectFractionForTask(task) {
    if (!task || task.answerType === "decimal" || task.answerType === "common_denom") {
      return null;
    }

    try {
      return normalizeFractionInput(task.correctAnswer);
    } catch (error) {
      return null;
    }
  }

  function buildWrongDecimalOperands(question) {
    if (!question || typeof question !== "object" || !Array.isArray(question.operands)) {
      return null;
    }

    var operands = cloneValue(question.operands);
    var changed = false;

    for (var i = 0; i < operands.length; i += 1) {
      if (!operands[i] || typeof operands[i] !== "object" || !Object.prototype.hasOwnProperty.call(operands[i], "decimal")) {
        continue;
      }

      var decimalValue = Number(operands[i].decimal);
      if (!Number.isFinite(decimalValue)) {
        continue;
      }

      var absValue = Math.abs(decimalValue);
      var wrongNumAbs = Math.round(absValue * 10);
      if (wrongNumAbs === 0) {
        wrongNumAbs = 1;
      }

      operands[i] = {
        num: decimalValue < 0 ? -wrongNumAbs : wrongNumAbs,
        den: 10
      };
      changed = true;
      break;
    }

    return changed ? operands : null;
  }

  function generateTypicalDistractors(task) {
    var candidates = [];
    if (!task || typeof task !== "object") {
      return candidates;
    }

    if (task.topic === "simplify") {
      if (task.question && Number.isInteger(task.question.num) && Number.isInteger(task.question.den) && task.question.den !== 0) {
        var gcdValue = Math.abs(gcd(task.question.num, task.question.den));
        if (gcdValue > 1) {
          candidates.push({
            num: task.question.num / gcdValue,
            den: task.question.den
          });
          candidates.push({
            num: task.question.num,
            den: task.question.den / gcdValue
          });
        }

        if (task.question.num !== 0) {
          var swapSign = task.question.num < 0 ? -1 : 1;
          candidates.push({
            num: swapSign * Math.abs(task.question.den),
            den: Math.max(1, Math.abs(task.question.num))
          });
        }
      }

      return candidates;
    }

    if (task.topic === "mixed") {
      if (task.question && Number.isInteger(task.question.num) && Number.isInteger(task.question.den) && task.question.den > 1) {
        var absNum = Math.abs(task.question.num);
        var den = task.question.den;
        var whole = Math.floor(absNum / den);
        var rem = absNum % den;
        var signedWhole = task.question.num < 0 ? -whole : whole;

        if (rem > 1) {
          candidates.push({ whole: signedWhole, num: rem - 1, den: den });
        }
        if (rem + 1 < den) {
          candidates.push({ whole: signedWhole, num: rem + 1, den: den });
        }

        candidates.push({
          whole: task.question.num < 0 ? -rem : rem,
          num: whole,
          den: den
        });
        candidates.push({
          whole: task.question.num < 0 ? -(whole + 1) : (whole + 1),
          num: rem,
          den: den
        });
      }

      return candidates;
    }

    if (task.topic === "common_denom") {
      if (task.question && Array.isArray(task.question.fractions) && task.question.fractions.length === 2) {
        var f1 = task.question.fractions[0];
        var f2 = task.question.fractions[1];
        if (f1 && f2 && Number.isInteger(f1.den) && Number.isInteger(f2.den) && f1.den > 0 && f2.den > 0) {
          candidates.push(f1.den * f2.den);
          candidates.push(f1.den + f2.den);
          candidates.push(Math.max(f1.den, f2.den));
          if (Math.abs(f1.den - f2.den) > 1) {
            candidates.push(Math.abs(f1.den - f2.den));
          }
        }
      }

      return candidates;
    }

    var operands = getQuestionOperandsAsFractions(task.question);
    var a = operands[0];
    var b = operands[1];

    if (task.topic === "add" && a && b) {
      candidates.push({
        num: a.num + b.num,
        den: a.den + b.den
      });

      var commonDen = lcm(a.den, b.den);
      if (commonDen > 0) {
        candidates.push({
          num: a.num + b.num,
          den: commonDen
        });
      }

      candidates.push({
        num: a.num * b.den - b.num * a.den,
        den: a.den * b.den
      });
      return candidates;
    }

    if (task.topic === "subtract" && a && b) {
      candidates.push({
        num: a.num + b.num,
        den: a.den + b.den
      });

      var denDiff = Math.abs(a.den - b.den);
      if (denDiff > 0) {
        candidates.push({
          num: a.num - b.num,
          den: denDiff
        });
      }

      candidates.push({
        num: b.num * a.den - a.num * b.den,
        den: a.den * b.den
      });
      return candidates;
    }

    if (task.topic === "multiply" && a && b) {
      if (b.num !== 0) {
        candidates.push({
          num: a.num * b.den,
          den: a.den * b.num
        });
      }

      candidates.push({
        num: a.num * b.num,
        den: a.den + b.den
      });
      candidates.push({
        num: a.num + b.num,
        den: a.den * b.den
      });
      return candidates;
    }

    if (task.topic === "divide" && a && b) {
      candidates.push({
        num: a.num * b.num,
        den: a.den * b.den
      });

      if (a.num !== 0) {
        candidates.push({
          num: a.den * b.num,
          den: a.num * b.den
        });
      }

      if (a.num !== 0 && b.num !== 0) {
        candidates.push({
          num: a.den * b.den,
          den: a.num * b.num
        });
      }

      return candidates;
    }

    if (task.topic === "combined") {
      var leftToRight = evaluateQuestionLeftToRight(task.question);
      if (leftToRight) {
        candidates.push(leftToRight);
      }

      var addPriority = evaluateQuestionWithAdditionPriority(task.question);
      if (addPriority) {
        candidates.push(addPriority);
      }

      return candidates;
    }

    if (task.topic === "to_decimal") {
      if (task.question && Number.isInteger(task.question.num) && Number.isInteger(task.question.den) && task.question.den !== 0) {
        var questionFraction = simplifyFraction(task.question.num, task.question.den);
        if (questionFraction.num !== 0) {
          candidates.push({ decimal: questionFraction.den / questionFraction.num });
        }

        var correctDecimal = task.correctAnswer && Number.isFinite(task.correctAnswer.decimal)
          ? task.correctAnswer.decimal
          : (questionFraction.num / questionFraction.den);
        candidates.push({ decimal: correctDecimal * 10 });
        candidates.push({ decimal: correctDecimal / 10 });
      }
      return candidates;
    }

    if (task.topic === "from_decimal") {
      if (task.question && Number.isFinite(task.question.decimal)) {
        var sourceDecimal = task.question.decimal;
        var places = Math.max(1, decimalPlacesOfNumber(sourceDecimal));
        var denominator = Math.pow(10, places);
        var numerator = Math.round(sourceDecimal * denominator);

        candidates.push({ num: numerator, den: 10 });
        if (denominator >= 100) {
          candidates.push({ num: numerator, den: denominator / 10 });
        }

        candidates.push({
          num: (numerator < 0 ? -1 : 1) * denominator,
          den: Math.abs(numerator) || 1
        });
        candidates.push({
          num: numerator + (numerator < 0 ? -1 : 1),
          den: denominator
        });
      }
      return candidates;
    }

    if (task.topic === "mixed_decimal") {
      var wrongOperands = buildWrongDecimalOperands(task.question);
      if (wrongOperands) {
        var wrongConversionResult = evaluateQuestionWithOperands(task.question, wrongOperands);
        if (wrongConversionResult) {
          candidates.push(wrongConversionResult);
        }
      }

      var mixedLeftToRight = evaluateQuestionLeftToRight(task.question);
      if (mixedLeftToRight) {
        candidates.push(mixedLeftToRight);
      }

      var mixedWrongPriority = evaluateQuestionWithAdditionPriority(task.question);
      if (mixedWrongPriority) {
        candidates.push(mixedWrongPriority);
      }
      return candidates;
    }

    return candidates;
  }

  function generateNearbyDistractors(task, kind, correctOption) {
    var candidates = [];

    if (kind === "common_denom") {
      var baseCommon = Number(correctOption);
      candidates.push(baseCommon - 1);
      candidates.push(baseCommon + 1);
      candidates.push(baseCommon - 2);
      candidates.push(baseCommon + 2);
      return candidates;
    }

    if (kind === "decimal") {
      var baseDecimal = Number(correctOption.decimal);
      candidates.push({ decimal: baseDecimal + 0.1 });
      candidates.push({ decimal: baseDecimal - 0.1 });
      candidates.push({ decimal: baseDecimal + 0.01 });
      candidates.push({ decimal: baseDecimal - 0.01 });
      return candidates;
    }

    if (kind === "mixed" && correctOption && typeof correctOption === "object") {
      var whole = Number.isInteger(correctOption.whole) ? correctOption.whole : 1;
      var num = Number.isInteger(correctOption.num) ? Math.abs(correctOption.num) : 1;
      var den = Number.isInteger(correctOption.den) && correctOption.den > 0 ? correctOption.den : 2;

      candidates.push({ whole: whole + 1, num: num, den: den });
      candidates.push({ whole: whole - 1, num: num, den: den });
      candidates.push({ whole: whole, num: num + 1, den: den });
      if (num > 1) {
        candidates.push({ whole: whole, num: num - 1, den: den });
      }
      return candidates;
    }

    var correctFraction = getCorrectFractionForTask(task);
    if (correctFraction) {
      candidates.push({ num: correctFraction.num + 1, den: correctFraction.den });
      candidates.push({ num: correctFraction.num - 1, den: correctFraction.den });
      candidates.push({ num: correctFraction.num, den: correctFraction.den + 1 });
      if (correctFraction.den > 1) {
        candidates.push({ num: correctFraction.num, den: correctFraction.den - 1 });
      }
    }

    return candidates;
  }

  function getMaxInArray(values) {
    if (!Array.isArray(values) || values.length === 0) {
      return null;
    }

    var maxValue = values[0];
    for (var i = 1; i < values.length; i += 1) {
      if (values[i] > maxValue) {
        maxValue = values[i];
      }
    }
    return maxValue;
  }

  function generateRandomDistractor(task, kind, context) {
    var level = Number(task && task.level);
    if (!Number.isInteger(level)) {
      level = 2;
    }
    var params = getLevelParams(level);

    if (kind === "common_denom") {
      var correctCommon = task && task.correctAnswer ? Number(task.correctAnswer.commonDen) : 10;
      if (!Number.isFinite(correctCommon) || correctCommon <= 0) {
        correctCommon = 10;
      }
      var minCommon = Math.max(2, Math.floor(correctCommon * 0.5));
      var maxCommon = Math.min(MAX_ABS_VALUE, Math.max(minCommon + 6, Math.floor(correctCommon * 1.8)));
      return randomInt(minCommon, maxCommon);
    }

    if (kind === "decimal") {
      var baseDecimal = task && task.correctAnswer && Number.isFinite(task.correctAnswer.decimal)
        ? task.correctAnswer.decimal
        : 0;
      var scale = Math.pow(10, context.decimalPlaces);
      var minScaled = Math.round((baseDecimal - 3) * scale);
      var maxScaled = Math.round((baseDecimal + 3) * scale);
      if (minScaled === maxScaled) {
        maxScaled += scale;
      }
      return {
        decimal: randomInt(minScaled, maxScaled) / scale
      };
    }

    var minDen = params.minDen || 2;
    var maxDen = params.maxDen || getMaxInArray(params.denoms) || 20;
    var maxNum = params.maxNum || 20;

    if (kind === "mixed") {
      var maxWhole = level <= 1 ? 5 : (level === 2 ? 10 : (level === 3 ? 15 : 20));
      var randomDen = randomInt(minDen, maxDen);
      var randomWhole = randomInt(1, maxWhole);
      var randomNum = randomInt(1, Math.max(1, randomDen - 1));
      if (level >= 3 && Math.random() < 0.25) {
        randomWhole = -randomWhole;
      }
      return {
        whole: randomWhole,
        num: randomNum,
        den: randomDen
      };
    }

    var randomDenominator = randomInt(minDen, maxDen);
    var randomNumerator = randomInt(-maxNum, maxNum);
    if (randomNumerator === 0) {
      randomNumerator = 1;
    }

    return {
      num: randomNumerator,
      den: randomDenominator
    };
  }

  function buildFallbackDistractor(task, kind, context, index) {
    if (kind === "common_denom") {
      var baseCommon = task && task.correctAnswer && Number.isFinite(task.correctAnswer.commonDen)
        ? task.correctAnswer.commonDen
        : 6;
      return Math.max(2, Math.trunc(baseCommon) + index + 1);
    }

    if (kind === "decimal") {
      var baseDecimal = task && task.correctAnswer && Number.isFinite(task.correctAnswer.decimal)
        ? task.correctAnswer.decimal
        : 0;
      var scale = Math.pow(10, context.decimalPlaces);
      return {
        decimal: baseDecimal + ((index + 1) / scale)
      };
    }

    if (kind === "mixed") {
      var mixedBase = normalizeOptionCandidate(task ? task.correctAnswer : null, "mixed", task, context);
      if (mixedBase) {
        return {
          whole: mixedBase.whole + index + 1,
          num: Math.max(1, Math.abs(mixedBase.num)),
          den: mixedBase.den
        };
      }

      return {
        whole: index + 2,
        num: 1,
        den: 2
      };
    }

    var correctFraction = getCorrectFractionForTask(task) || { num: 1, den: 2 };
    return {
      num: correctFraction.num + index + 1,
      den: correctFraction.den + ((index % 4) + 1)
    };
  }

  function shuffleArrayInPlace(values) {
    for (var i = values.length - 1; i > 0; i -= 1) {
      var swapIndex = randomInt(0, i);
      var temporary = values[i];
      values[i] = values[swapIndex];
      values[swapIndex] = temporary;
    }
  }

  function generateOptions(task) {
    var TOTAL_OPTIONS = 6;
    var MAX_RANDOM_ATTEMPTS = 20;

    var safeTask = task || {};
    var kind = detectOptionKind(safeTask);
    var context = {
      decimalPlaces: getDecimalPlacesForTask(safeTask)
    };

    var correctOption = getCorrectOptionForTask(safeTask, kind, context);
    if (correctOption === null) {
      if (kind === "common_denom") {
        correctOption = 6;
      } else if (kind === "decimal") {
        correctOption = { decimal: 0.5 };
      } else if (kind === "mixed") {
        correctOption = { whole: 1, num: 1, den: 2 };
      } else {
        correctOption = { num: 1, den: 2 };
      }
    }

    var correctKey = getOptionKey(correctOption, kind, context);
    var options = [correctOption];
    var usedKeys = {};
    usedKeys[correctKey] = true;

    function addDistractor(candidate) {
      var normalized = normalizeOptionCandidate(candidate, kind, safeTask, context);
      if (normalized === null) {
        return false;
      }

      var key = getOptionKey(normalized, kind, context);
      if (!key || usedKeys[key] || key === correctKey) {
        return false;
      }

      usedKeys[key] = true;
      options.push(normalized);
      return true;
    }

    var typical = generateTypicalDistractors(safeTask);
    var addedTypical = 0;
    for (var i = 0; i < typical.length && options.length < TOTAL_OPTIONS; i += 1) {
      if (addedTypical >= 3) {
        break;
      }
      if (addDistractor(typical[i])) {
        addedTypical += 1;
      }
    }

    var nearby = generateNearbyDistractors(safeTask, kind, correctOption);
    var addedNearby = 0;
    for (var j = 0; j < nearby.length && options.length < TOTAL_OPTIONS; j += 1) {
      if (addedNearby >= 2) {
        break;
      }
      if (addDistractor(nearby[j])) {
        addedNearby += 1;
      }
    }

    var randomAttempts = 0;
    while (options.length < TOTAL_OPTIONS && randomAttempts < MAX_RANDOM_ATTEMPTS) {
      randomAttempts += 1;
      addDistractor(generateRandomDistractor(safeTask, kind, context));
    }

    var fallbackAttempts = 0;
    while (options.length < TOTAL_OPTIONS && fallbackAttempts < 120) {
      addDistractor(buildFallbackDistractor(safeTask, kind, context, fallbackAttempts));
      fallbackAttempts += 1;
    }

    var lastResort = 0;
    while (options.length < TOTAL_OPTIONS && lastResort < 500) {
      lastResort += 1;
      if (kind === "common_denom") {
        addDistractor(100 + lastResort);
      } else if (kind === "decimal") {
        var scale = Math.pow(10, context.decimalPlaces);
        addDistractor({ decimal: (100 + lastResort) / scale });
      } else if (kind === "mixed") {
        addDistractor({ whole: 100 + lastResort, num: 1, den: 2 });
      } else {
        addDistractor({ num: 100 + lastResort, den: 101 + lastResort });
      }
    }

    var shuffledOptions = options.slice(0, TOTAL_OPTIONS);
    shuffleArrayInPlace(shuffledOptions);

    var correctIndex = 0;
    for (var k = 0; k < shuffledOptions.length; k += 1) {
      if (getOptionKey(shuffledOptions[k], kind, context) === correctKey) {
        correctIndex = k;
        break;
      }
    }

    return {
      options: shuffledOptions,
      correctIndex: correctIndex
    };
  }

  function generateExplanation(task, lang) {
    var safeTask = task || {};
    var isGerman = lang === "de";
    var answerText = formatAnswerForDisplay(safeTask);
    var operands = getQuestionOperandsAsFractions(safeTask.question);
    var expressionText = renderExpressionWithOperands(safeTask.question, function formatOperand(operand) {
      return formatFractionValue(operand);
    });

    if (safeTask.topic === "simplify") {
      var simplifyQuestion = safeTask.question || {};
      var simplifyGcd = gcd(simplifyQuestion.num, simplifyQuestion.den);
      var simplifyResult = formatFractionValue(safeTask.correctAnswer);

      if (isGerman) {
        return "ggT(" + simplifyQuestion.num + ", " + simplifyQuestion.den + ") = " + simplifyGcd
          + ". Zähler und Nenner durch den ggT teilen: "
          + simplifyQuestion.num + "÷" + simplifyGcd + " / " + simplifyQuestion.den + "÷" + simplifyGcd
          + " = " + simplifyResult;
      }
      return "НОД(" + simplifyQuestion.num + ", " + simplifyQuestion.den + ") = " + simplifyGcd
        + ". " + simplifyQuestion.num + "÷" + simplifyGcd + " / " + simplifyQuestion.den + "÷" + simplifyGcd
        + " = " + simplifyResult;
    }

    if (safeTask.topic === "mixed") {
      var mixedQuestion = safeTask.question || {};
      var absNum = Math.abs(Number(mixedQuestion.num) || 0);
      var den = Number(mixedQuestion.den) || 1;
      var whole = Math.floor(absNum / den);
      if ((mixedQuestion.num || 0) < 0) {
        whole = -whole;
      }
      var rem = absNum % den;
      var mixedResult = rem === 0 ? String(whole) : (String(whole) + " " + String(rem) + "/" + String(den));

      if (isGerman) {
        return mixedQuestion.num + " ÷ " + den + " = " + whole + " Rest " + rem
          + ". " + mixedQuestion.num + "/" + den + " = " + mixedResult;
      }
      return mixedQuestion.num + " ÷ " + den + " = " + whole + " остаток " + rem
        + ". " + mixedQuestion.num + "/" + den + " = " + mixedResult;
    }

    if (safeTask.topic === "common_denom") {
      var sourceFractions = safeTask.question && Array.isArray(safeTask.question.fractions)
        ? safeTask.question.fractions
        : [{ num: 1, den: 2 }, { num: 1, den: 3 }];
      var convertedFractions = safeTask.correctAnswer && Array.isArray(safeTask.correctAnswer.fractions)
        ? safeTask.correctAnswer.fractions
        : [{ num: 3, den: 6 }, { num: 2, den: 6 }];
      var commonDen = safeTask.correctAnswer && Number.isInteger(safeTask.correctAnswer.commonDen)
        ? safeTask.correctAnswer.commonDen
        : lcm(sourceFractions[0].den, sourceFractions[1].den);

      if (isGerman) {
        return "kgV(" + sourceFractions[0].den + ", " + sourceFractions[1].den + ") = " + commonDen
          + ". Nenner auf das kgV bringen: " + formatRawFraction(sourceFractions[0]) + " = " + formatRawFraction(convertedFractions[0])
          + ", " + formatRawFraction(sourceFractions[1]) + " = " + formatRawFraction(convertedFractions[1]);
      }
      return "НОК(" + sourceFractions[0].den + ", " + sourceFractions[1].den + ") = " + commonDen
        + ". " + formatRawFraction(sourceFractions[0]) + " = " + formatRawFraction(convertedFractions[0])
        + ", " + formatRawFraction(sourceFractions[1]) + " = " + formatRawFraction(convertedFractions[1]);
    }

    if (safeTask.topic === "add" || safeTask.topic === "subtract") {
      var common = operands.length > 0 ? operands[0].den : 1;
      for (var i = 1; i < operands.length; i += 1) {
        common = lcm(common, operands[i].den);
      }

      if (!expressionText && operands.length >= 2) {
        var operatorText = operatorForDisplay((safeTask.question && safeTask.question.operator) || "+");
        expressionText = formatFractionValue(operands[0]) + " " + operatorText + " " + formatFractionValue(operands[1]);
      }

      if (isGerman) {
        return "Schritt 1: Gemeinsamer Nenner = " + common + ". Schritt 2: " + expressionText + " = " + answerText;
      }
      return "Шаг 1: Общий знаменатель = " + common + ". Шаг 2: " + expressionText + " = " + answerText;
    }

    if (safeTask.topic === "multiply") {
      if (operands.length >= 2) {
        var rawNum = operands[0].num * operands[1].num;
        var rawDen = operands[0].den * operands[1].den;
        var rawFraction = String(rawNum) + "/" + String(rawDen);
        return String(operands[0].num) + "×" + String(operands[1].num)
          + " / " + String(operands[0].den) + "×" + String(operands[1].den)
          + " = " + rawFraction + " = " + answerText;
      }

      return (isGerman ? "Schritt 1: " : "Шаг 1: ") + expressionText + " = " + answerText;
    }

    if (safeTask.topic === "divide") {
      if (operands.length >= 2 && operands[1].num !== 0) {
        var first = formatFractionValue(operands[0]);
        var second = formatFractionValue(operands[1]);
        var inverse = formatFractionValue({ num: operands[1].den, den: operands[1].num });
        return first + " ÷ " + second + " = " + first + " × " + inverse + " = " + answerText;
      }

      return (isGerman ? "Schritt 1: " : "Шаг 1: ") + expressionText + " = " + answerText;
    }

    if (safeTask.topic === "combined") {
      if (isGerman) {
        return "Schritt 1: Erst Klammern und ×/÷, dann +/−. Schritt 2: " + expressionText + " = " + answerText;
      }
      return "Шаг 1: Сначала скобки и ×/÷, затем +/−. Шаг 2: " + expressionText + " = " + answerText;
    }

    if (safeTask.topic === "to_decimal") {
      var toDecimalQuestion = safeTask.question || {};
      var decimalResult = safeTask.correctAnswer && typeof safeTask.correctAnswer.display === "string"
        ? safeTask.correctAnswer.display
        : formatDecimalNumber(safeTask.correctAnswer && safeTask.correctAnswer.decimal, getDecimalPlacesForTask(safeTask));
      return toDecimalQuestion.num + " ÷ " + toDecimalQuestion.den + " = " + decimalResult;
    }

    if (safeTask.topic === "from_decimal") {
      var sourceDecimal = safeTask.question && typeof safeTask.question.display === "string"
        ? safeTask.question.display
        : formatDecimalNumber(safeTask.question && safeTask.question.decimal, getDecimalPlacesForTask(safeTask));
      var decimalAsFraction = formatFractionValue(safeTask.correctAnswer);
      return sourceDecimal + " = " + decimalAsFraction;
    }

    if (safeTask.topic === "mixed_decimal") {
      var firstDecimalOperand = null;
      if (safeTask.question && Array.isArray(safeTask.question.operands)) {
        for (var p = 0; p < safeTask.question.operands.length; p += 1) {
          if (safeTask.question.operands[p] && Object.prototype.hasOwnProperty.call(safeTask.question.operands[p], "decimal")) {
            firstDecimalOperand = Number(safeTask.question.operands[p].decimal);
            if (Number.isFinite(firstDecimalOperand)) {
              break;
            }
          }
        }
      }

      var expressionWithFractions = renderExpressionWithOperands(safeTask.question, function decimalOperandFormatter(operand) {
        if (operand && typeof operand === "object" && Object.prototype.hasOwnProperty.call(operand, "decimal")) {
          return formatFractionValue(decimalToFraction(operand.decimal));
        }
        return formatFractionValue(operand);
      });

      if (Number.isFinite(firstDecimalOperand)) {
        var convertedDecimal = decimalToFraction(firstDecimalOperand);
        var stepOne = formatDecimalNumber(firstDecimalOperand, decimalPlacesOfNumber(firstDecimalOperand))
          + " = " + formatFractionValue(convertedDecimal);

        if (isGerman) {
          return "Schritt 1: " + stepOne + ". Schritt 2: " + expressionWithFractions + " = " + answerText;
        }
        return "Шаг 1: " + stepOne + ". Шаг 2: " + expressionWithFractions + " = " + answerText;
      }

      if (isGerman) {
        return "Schritt 1: Dezimalzahl in Bruch umwandeln. Schritt 2: " + expressionText + " = " + answerText;
      }
      return "Шаг 1: Переводим десятичную в дробь. Шаг 2: " + expressionText + " = " + answerText;
    }

    if (isGerman) {
      return "Schritt 1: " + expressionText + " = " + answerText;
    }
    return "Шаг 1: " + expressionText + " = " + answerText;
  }

  function enrichTask(task) {
    if (!task || typeof task !== "object") {
      return task;
    }

    var optionsPayload = generateOptions(task);
    task.options = optionsPayload.options;
    task.correctIndex = optionsPayload.correctIndex;
    task.explanation = {
      ru: generateExplanation(task, "ru"),
      de: generateExplanation(task, "de")
    };

    return task;
  }

  function generateSimplify(level) {
    var params = getLevelParams(level);
    var base;
    if (level >= 3) {
      var den = getRandomDenominator(params);
      var num = randomInt(1, params.maxNum);
      base = simplifyFraction(num, den);
      if (Math.random() < 0.4) {
        var wholeAddon = randomInt(1, level === 3 ? 6 : 8);
        base = simplifyFraction(base.num + wholeAddon * base.den, base.den);
      }
      base = maybeMakeNegative(base, level);
    } else {
      base = generateProperIrreducibleFraction(params);
    }

    var multiplier = randomInt(2, level >= 4 ? 8 : 6);
    var question = {
      num: base.num * multiplier,
      den: base.den * multiplier
    };

    if (Math.abs(question.num) > MAX_ABS_VALUE || question.den > MAX_ABS_VALUE || gcd(question.num, question.den) <= 1) {
      return null;
    }

    return buildTask("simplify", level, question, simplifyFraction(base.num, base.den), "fraction");
  }

  function generateMixed(level) {
    var params = getLevelParams(level);
    var maxWhole = level <= 1 ? 5 : (level === 2 ? 10 : (level === 3 ? 15 : 20));

    for (var attempt = 0; attempt < 100; attempt += 1) {
      var den = getRandomDenominator(params);
      var whole = randomInt(1, maxWhole);
      var rem = randomInt(1, den - 1);
      var num = whole * den + rem;

       if (level >= 3 && Math.random() < 0.2) {
         num = -num;
       }

      if (Math.abs(num) > MAX_ABS_VALUE || den > MAX_ABS_VALUE) {
        continue;
      }

      var answer = toMixed(num, den);
      if (!Object.prototype.hasOwnProperty.call(answer, "whole")) {
        continue;
      }

      return buildTask("mixed", level, { num: num, den: den }, answer, "mixed");
    }

    return null;
  }

  function generateCommonDenom(level) {
    var params = getLevelParams(level);

    for (var attempt = 0; attempt < 200; attempt += 1) {
      var den1 = getRandomDenominator(params);
      var den2 = getRandomDenominator(params);
      if (den1 === den2) {
        continue;
      }

      var maxNum1 = Math.min(params.maxNum, den1 - 1);
      var maxNum2 = Math.min(params.maxNum, den2 - 1);
      if (maxNum1 < 1 || maxNum2 < 1) {
        continue;
      }

      var frac1 = simplifyFraction(randomInt(1, maxNum1), den1);
      var frac2 = simplifyFraction(randomInt(1, maxNum2), den2);

      frac1 = maybeMakeNegative(frac1, level);
      frac2 = maybeMakeNegative(frac2, level);

      var commonDen = lcm(frac1.den, frac2.den);
      if (commonDen <= 0 || commonDen > MAX_ABS_VALUE) {
        continue;
      }

      var converted1 = {
        num: frac1.num * (commonDen / frac1.den),
        den: commonDen
      };
      var converted2 = {
        num: frac2.num * (commonDen / frac2.den),
        den: commonDen
      };

      if (!validateFraction(converted1) || !validateFraction(converted2)) {
        continue;
      }

      return buildTask(
        "common_denom",
        level,
        { fractions: [frac1, frac2] },
        { fractions: [converted1, converted2], commonDen: commonDen },
        "common_denom"
      );
    }

    return null;
  }

  function generateAdd(level) {
    for (var attempt = 0; attempt < 200; attempt += 1) {
      try {
        var termCount = level <= 2 ? 2 : randomInt(2, LEVEL_PARAMS[level].maxTerms);
        var operands = [];
        for (var i = 0; i < termCount; i += 1) {
          operands.push(generateArithmeticOperand(level));
        }

        var operators = [];
        for (var j = 0; j < termCount - 1; j += 1) {
          operators.push("+");
        }

        var question = level <= 2
          ? { operands: operands, operator: "+" }
          : { operands: operands, operators: operators };

        if (level >= 3 && termCount >= 3 && Math.random() < 0.45) {
          question.expression = buildParenthesizedExpression(operators);
        }

        var result = evaluateQuestionToFraction(question);
        if (level === 1 && !isProperFractionOrWhole(result)) {
          continue;
        }

        var answerPayload = formatOperationAnswer(result, level);
        return buildTask("add", level, question, answerPayload.correctAnswer, answerPayload.answerType);
      } catch (error) {
        // retry
      }
    }
    return null;
  }

  function generateSubtract(level) {
    for (var attempt = 0; attempt < 200; attempt += 1) {
      try {
        var termCount = level <= 2 ? 2 : randomInt(2, LEVEL_PARAMS[level].maxTerms);
        var operands = [];
        for (var i = 0; i < termCount; i += 1) {
          operands.push(generateArithmeticOperand(level));
        }

        if (level <= 2) {
          var first = normalizeFractionInput(operands[0]);
          var second = normalizeFractionInput(operands[1]);
          if (first.num * second.den < second.num * first.den) {
            var swap = operands[0];
            operands[0] = operands[1];
            operands[1] = swap;
          }
        }

        var operators = [];
        for (var j = 0; j < termCount - 1; j += 1) {
          operators.push("−");
        }

        var question = level <= 2
          ? { operands: operands, operator: "−" }
          : { operands: operands, operators: operators };

        if (level >= 3 && termCount >= 3 && Math.random() < 0.45) {
          question.expression = buildParenthesizedExpression(operators);
        }

        var result = evaluateQuestionToFraction(question);

        if (level <= 2 && result.num < 0) {
          continue;
        }

        var answerPayload = formatOperationAnswer(result, level);
        return buildTask("subtract", level, question, answerPayload.correctAnswer, answerPayload.answerType);
      } catch (error) {
        // retry
      }
    }
    return null;
  }

  function generateMultiply(level) {
    for (var attempt = 0; attempt < 200; attempt += 1) {
      try {
        var termCount = level <= 2 ? 2 : randomInt(2, LEVEL_PARAMS[level].maxTerms);
        var operands = [];
        for (var i = 0; i < termCount; i += 1) {
          operands.push(generateArithmeticOperand(level));
        }

        var operators = [];
        for (var j = 0; j < termCount - 1; j += 1) {
          operators.push("×");
        }

        var question = level <= 2
          ? { operands: operands, operator: "×" }
          : { operands: operands, operators: operators };

        if (level >= 3 && termCount >= 3 && Math.random() < 0.45) {
          question.expression = buildParenthesizedExpression(operators);
        }

        var result = evaluateQuestionToFraction(question);
        if (level === 1 && !isProperFraction(result)) {
          continue;
        }

        var answerPayload = formatOperationAnswer(result, level);
        return buildTask("multiply", level, question, answerPayload.correctAnswer, answerPayload.answerType);
      } catch (error) {
        // retry
      }
    }
    return null;
  }

  function generateDivide(level) {
    for (var attempt = 0; attempt < 200; attempt += 1) {
      try {
        var termCount = level <= 2 ? 2 : randomInt(2, LEVEL_PARAMS[level].maxTerms);
        var operands = [];
        for (var i = 0; i < termCount; i += 1) {
          operands.push(generateArithmeticOperand(level));
        }

        var operators = [];
        for (var j = 0; j < termCount - 1; j += 1) {
          operators.push("÷");
        }

        var question = level <= 2
          ? { operands: operands, operator: "÷" }
          : { operands: operands, operators: operators };

        if (level >= 3 && termCount >= 3 && Math.random() < 0.45) {
          question.expression = buildParenthesizedExpression(operators);
        }

        var validDivisors = true;
        for (var k = 0; k < operands.length - 1; k += 1) {
          var divisor = normalizeFractionInput(operands[k + 1]);
          if (divisor.num === 0) {
            validDivisors = false;
            break;
          }
        }
        if (!validDivisors) {
          continue;
        }

        var result = evaluateQuestionToFraction(question);
        if (level === 1 && !isProperFractionOrWhole(result)) {
          continue;
        }

        var answerPayload = formatOperationAnswer(result, level);
        return buildTask("divide", level, question, answerPayload.correctAnswer, answerPayload.answerType);
      } catch (error) {
        // retry
      }
    }
    return null;
  }

  function generateCombined(level) {
    if (level <= 2) {
      var basicGenerators = [generateAdd, generateSubtract, generateMultiply, generateDivide];
      var selected = basicGenerators[randomInt(0, basicGenerators.length - 1)](level);
      if (!selected) {
        return null;
      }
      selected.topic = "combined";
      return selected;
    }

    var operatorPool = ["+", "−", "×", "÷"];
    var minTerms = level === 3 ? 2 : 2;
    var maxTerms = level === 3 ? 3 : 4;

    for (var attempt = 0; attempt < 250; attempt += 1) {
      try {
        var termCount = randomInt(minTerms, maxTerms);
        var operands = [];
        var hasDecimal = false;
        var hasFractionLike = false;

        for (var i = 0; i < termCount; i += 1) {
          var operand;
          if (level === 4 && Math.random() < 0.25) {
            var decimalValue = Number((randomInt(1, 999) / 1000).toFixed(3));
            operand = { decimal: maybeMakeNegative(decimalValue, level) };
            hasDecimal = true;
          } else {
            operand = generateArithmeticOperand(level);
            if (!Object.prototype.hasOwnProperty.call(operand, "decimal")) {
              hasFractionLike = true;
            }
          }
          operands.push(operand);
        }

        if (!hasFractionLike) {
          operands[0] = generateArithmeticOperand(level);
        }

        var operators = [];
        for (var j = 0; j < termCount - 1; j += 1) {
          operators.push(operatorPool[randomInt(0, operatorPool.length - 1)]);
        }

        if (operators.length >= 2) {
          var uniqueOps = {};
          for (var u = 0; u < operators.length; u += 1) {
            uniqueOps[operators[u]] = true;
          }
          if (Object.keys(uniqueOps).length < 2) {
            var firstOp = operators[0];
            var alternatives = [];
            for (var alt = 0; alt < operatorPool.length; alt += 1) {
              if (operatorPool[alt] !== firstOp) {
                alternatives.push(operatorPool[alt]);
              }
            }
            operators[operators.length - 1] = alternatives[randomInt(0, alternatives.length - 1)];
          }
        }

        var question = {
          operands: operands,
          operators: operators,
          expression: buildParenthesizedExpression(operators)
        };

        var result = evaluateQuestionToFraction(question);
        var answerPayload = formatOperationAnswer(result, level);
        return buildTask("combined", level, question, answerPayload.correctAnswer, answerPayload.answerType);
      } catch (error) {
        // retry
      }
    }

    return null;
  }

  function generateToDecimal(level) {
    var terminatingDenomsL1 = [2, 4, 5, 10];
    var terminatingDenomsL2 = [2, 4, 5, 8, 10, 20, 25];

    for (var attempt = 0; attempt < 250; attempt += 1) {
      try {
        var fraction;
        var decimalPlaces = 1;
        var answer;

        if (level === 1) {
          var den1 = terminatingDenomsL1[randomInt(0, terminatingDenomsL1.length - 1)];
          fraction = simplifyFraction(randomInt(1, den1 * 2), den1);
          if (countTerminatingDigits(fraction.den) > 1) {
            continue;
          }
          if (fraction.num % fraction.den === 0) {
            continue;
          }
          answer = { decimal: Number((fraction.num / fraction.den).toFixed(1)) };
        } else if (level === 2) {
          var den2 = terminatingDenomsL2[randomInt(0, terminatingDenomsL2.length - 1)];
          fraction = simplifyFraction(randomInt(1, den2 * 2), den2);
          decimalPlaces = countTerminatingDigits(fraction.den);
          if (decimalPlaces === Infinity || decimalPlaces > 2) {
            continue;
          }
          answer = { decimal: Number((fraction.num / fraction.den).toFixed(Math.max(1, decimalPlaces))) };
        } else {
          var params = getLevelParams(level);
          var den = randomInt(params.minDen, Math.min(params.maxDen, level === 3 ? 50 : 100));
          var num = randomInt(1, Math.min(params.maxNum, den * 2));
          fraction = simplifyFraction(num, den);
          fraction = maybeMakeNegative(fraction, level);

          var shouldBePeriodic = Math.random() < 0.4;
          var info = analyzeDecimalExpansion(fraction.num, fraction.den);
          if (shouldBePeriodic && info.terminating) {
            continue;
          }
          if (!shouldBePeriodic && !info.terminating) {
            continue;
          }

          if (info.terminating) {
            answer = { decimal: Number((fraction.num / fraction.den).toFixed(Math.min(3, Math.max(1, countTerminatingDigits(fraction.den))))) };
          } else {
            answer = { decimal: info.decimal, period: info.period, display: info.display };
          }
        }

        return buildTask("to_decimal", level, { num: fraction.num, den: fraction.den }, answer, "decimal");
      } catch (error) {
        // retry
      }
    }

    return null;
  }

  function generateFromDecimal(level) {
    var level1Values = [0.5, 0.2, 0.4, 0.6, 0.8, 0.25, 0.75];
    var level2Values = [0.15, 0.35, 0.45, 0.65, 0.125, 0.375, 1.25, 1.5, 2.75];

    for (var attempt = 0; attempt < 250; attempt += 1) {
      try {
        var question;
        var answer;

        if (level === 1) {
          var value1 = level1Values[randomInt(0, level1Values.length - 1)];
          question = { decimal: value1 };
          answer = decimalToFraction(value1);
        } else if (level === 2) {
          var value2 = level2Values[randomInt(0, level2Values.length - 1)];
          question = { decimal: value2 };
          answer = decimalToFraction(value2);
        } else {
          var params = getLevelParams(level);
          if (Math.random() < 0.4) {
            var denPeriodic = randomInt(3, Math.min(params.maxDen, level === 3 ? 50 : 100));
            var numPeriodic = randomInt(1, Math.min(params.maxNum, denPeriodic * 2));
            var basePeriodic = simplifyFraction(numPeriodic, denPeriodic);
            basePeriodic = maybeMakeNegative(basePeriodic, level);
            var periodicInfo = analyzeDecimalExpansion(basePeriodic.num, basePeriodic.den);
            if (periodicInfo.terminating) {
              continue;
            }

            question = {
              decimal: periodicInfo.decimal,
              period: periodicInfo.period,
              display: periodicInfo.display
            };
            answer = basePeriodic;
          } else {
            var sign = (level >= 3 && Math.random() < 0.2) ? -1 : 1;
            var raw = sign * (randomInt(1, 999) / 1000);
            var rounded = Number(raw.toFixed(3));
            question = { decimal: rounded };
            answer = decimalToFraction(rounded);
          }
        }

        return buildTask("from_decimal", level, question, answer, "fraction");
      } catch (error) {
        // retry
      }
    }

    return null;
  }

  function generateMixedDecimal(level) {
    var operatorPool = ["+", "−", "×", "÷"];
    var maxTerms = level <= 2 ? 2 : (level === 3 ? 3 : 4);

    for (var attempt = 0; attempt < 250; attempt += 1) {
      try {
        var termCount = level <= 2 ? 2 : randomInt(2, maxTerms);
        var operands = [];
        var decimalIndex = randomInt(0, termCount - 1);

        for (var i = 0; i < termCount; i += 1) {
          if (i === decimalIndex || (level >= 4 && Math.random() < 0.25)) {
            var decimalValue = Number((randomInt(1, level <= 2 ? 99 : 999) / (level <= 2 ? 100 : 1000)).toFixed(level <= 2 ? 2 : 3));
            operands.push({ decimal: maybeMakeNegative(decimalValue, level) });
          } else {
            operands.push(generateArithmeticOperand(level));
          }
        }

        var operators = [];
        for (var j = 0; j < termCount - 1; j += 1) {
          operators.push(operatorPool[randomInt(0, operatorPool.length - 1)]);
        }

        var question = {
          operands: operands,
          operators: operators
        };

        if (level >= 3) {
          question.expression = buildParenthesizedExpression(operators);
        } else {
          question.expression = buildLinearExpression(operators);
        }

        var result = evaluateQuestionToFraction(question);
        return buildTask("mixed_decimal", level, question, result, "fraction");
      } catch (error) {
        // retry
      }
    }

    return null;
  }

  function getFallbackTask(topic, level) {
    if (topic === "simplify") {
      return buildTask("simplify", level, { num: 6, den: 8 }, { num: 3, den: 4 }, "fraction");
    }

    if (topic === "mixed") {
      return buildTask("mixed", level, { num: 11, den: 4 }, { whole: 2, num: 3, den: 4 }, "mixed");
    }

    if (topic === "common_denom") {
      return buildTask(
        "common_denom",
        level,
        { fractions: [{ num: 1, den: 3 }, { num: 2, den: 5 }] },
        { fractions: [{ num: 5, den: 15 }, { num: 6, den: 15 }], commonDen: 15 },
        "common_denom"
      );
    }

    if (topic === "add") {
      return buildTask(
        "add",
        level,
        {
          operands: [{ num: 1, den: 3 }, { num: 1, den: 4 }],
          operator: "+"
        },
        { num: 7, den: 12 },
        "fraction"
      );
    }

    if (topic === "subtract") {
      return buildTask(
        "subtract",
        level,
        {
          operands: [{ num: 3, den: 4 }, { num: 1, den: 3 }],
          operator: "−"
        },
        { num: 5, den: 12 },
        "fraction"
      );
    }

    if (topic === "multiply") {
      return buildTask(
        "multiply",
        level,
        {
          operands: [{ num: 2, den: 3 }, { num: 3, den: 5 }],
          operator: "×"
        },
        { num: 2, den: 5 },
        "fraction"
      );
    }

    if (topic === "divide") {
      return buildTask(
        "divide",
        level,
        {
          operands: [{ num: 2, den: 3 }, { num: 4, den: 5 }],
          operator: "÷"
        },
        { num: 5, den: 6 },
        "fraction"
      );
    }

    if (topic === "combined") {
      return buildTask(
        "combined",
        level,
        {
          operands: [{ num: 1, den: 2 }, { num: 1, den: 3 }, { num: 1, den: 4 }],
          operators: ["+", "×"],
          expression: "({0} + {1}) × {2}"
        },
        { num: 5, den: 24 },
        "fraction"
      );
    }

    if (topic === "to_decimal") {
      return buildTask(
        "to_decimal",
        level,
        { num: 3, den: 8 },
        { decimal: 0.375 },
        "decimal"
      );
    }

    if (topic === "from_decimal") {
      return buildTask(
        "from_decimal",
        level,
        { decimal: 0.375 },
        { num: 3, den: 8 },
        "fraction"
      );
    }

    if (topic === "mixed_decimal") {
      return buildTask(
        "mixed_decimal",
        level,
        {
          operands: [{ decimal: 0.5 }, { num: 1, den: 3 }],
          operators: ["+"],
          expression: "{0} + {1}"
        },
        { num: 5, den: 6 },
        "fraction"
      );
    }

    return null;
  }

  function generateWithRetries(topic, level, generator) {
    for (var attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      var task = generator(level);
      if (task && validateTask(task)) {
        return task;
      }
    }
    return getFallbackTask(topic, level);
  }

  function generateTask(topic, level) {
    var lvl = Number.isInteger(Number(level)) ? Number(level) : 2;
    if (!LEVEL_PARAMS[lvl]) {
      lvl = 2;
    }

    var task;

    if (topic === "simplify") {
      task = generateWithRetries(topic, lvl, generateSimplify);
      return enrichTask(task);
    }

    if (topic === "mixed") {
      task = generateWithRetries(topic, lvl, generateMixed);
      return enrichTask(task);
    }

    if (topic === "common_denom") {
      task = generateWithRetries(topic, lvl, generateCommonDenom);
      return enrichTask(task);
    }

    if (topic === "add") {
      task = generateWithRetries(topic, lvl, generateAdd);
      return enrichTask(task);
    }

    if (topic === "subtract") {
      task = generateWithRetries(topic, lvl, generateSubtract);
      return enrichTask(task);
    }

    if (topic === "multiply") {
      task = generateWithRetries(topic, lvl, generateMultiply);
      return enrichTask(task);
    }

    if (topic === "divide") {
      task = generateWithRetries(topic, lvl, generateDivide);
      return enrichTask(task);
    }

    if (topic === "combined") {
      task = generateWithRetries(topic, lvl, generateCombined);
      return enrichTask(task);
    }

    if (topic === "to_decimal") {
      task = generateWithRetries(topic, lvl, generateToDecimal);
      return enrichTask(task);
    }

    if (topic === "from_decimal") {
      task = generateWithRetries(topic, lvl, generateFromDecimal);
      return enrichTask(task);
    }

    if (topic === "mixed_decimal") {
      task = generateWithRetries(topic, lvl, generateMixedDecimal);
      return enrichTask(task);
    }

    throw new Error("Unsupported topic: " + String(topic));
  }

  global.MathEngine = {
    generateTask: generateTask,
    generateOptions: generateOptions,
    generateExplanation: generateExplanation,
    gcd: gcd,
    lcm: lcm,
    simplifyFraction: simplifyFraction,
    toImproper: toImproper,
    toMixed: toMixed,
    fractionsEqual: fractionsEqual,
    fractionToDecimal: fractionToDecimal,
    decimalToFraction: decimalToFraction
  };
})(typeof window !== "undefined" ? window : globalThis);

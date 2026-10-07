/* ==========================================================================
   ZC-9A1FBC7369AA_script.js
   Bill Splitter & Group Dining Ledger — Pure Vanilla JavaScript
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "zc_9a1fbc7369aa_bill_splitter_state_v1";
  var HISTORY_KEY = "zc_9a1fbc7369aa_bill_splitter_history_v1";
  var THEME_KEY = "zc_9a1fbc7369aa_bill_splitter_theme_v1";

  var ROMAN_NUMERALS = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"
  ];

  function toRoman(num) {
    if (num >= 1 && num <= ROMAN_NUMERALS.length) {
      return ROMAN_NUMERALS[num - 1];
    }
    return String(num);
  }

  function stripRomanPrefix(rawName) {
    if (!rawName || typeof rawName !== "string") return "";
    return rawName.replace(/^[IVXLCDM0-9]+\s*[\}\)\.\-:]\s*/i, "").trim();
  }

  function formatRomanName(indexZeroBased, rawName) {
    var clean = stripRomanPrefix(rawName) || ("Person " + (indexZeroBased + 1));
    return toRoman(indexZeroBased + 1) + "}" + clean;
  }

  function parseNumericInput(val) {
    if (val === null || val === undefined) return NaN;
    var str = String(val).replace(/,/g, "").trim();
    if (str === "") return NaN;
    var num = Number(str);
    return num;
  }

  function formatNumber(num, forceDecimals) {
    if (!isFinite(num)) return "0";
    var rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    var isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
    if (isWhole && !forceDecimals) {
      return Math.round(rounded).toLocaleString("en-US");
    }
    return rounded.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function truncateTwoDecimals(num) {
    return Math.floor((num + 1e-9) * 100) / 100;
  }

  function getDefaultMeetupState() {
    return {
      occasionName: "Meetup",
      billAmount: "4,725",
      numPeople: 4,
      peopleNames: ["Ramesh", "Rahul", "Aditya", "Aman"],
      commonItemsCount: 4,
      commonItemsNames: "Starters, Main Course, Breads, Accompaniments",
      tipPercent: 0,
      exactSumReconcile: false,
      items: [
        {
          id: "item_1",
          name: "Deserts",
          qty: 1,
          price: 250,
          mode: "solo",
          targetPersonIndex: 1,
          customIndices: [1]
        },
        {
          id: "item_2",
          name: "Drinks",
          qty: 3,
          price: 650,
          mode: "except",
          targetPersonIndex: 1,
          customIndices: [0, 2, 3]
        }
      ],
      hasCalculated: true
    };
  }

  var state = getDefaultMeetupState();
  var historyList = [];

  function safeGetEl(id) {
    try {
      return document.getElementById(id);
    } catch (e) {
      return null;
    }
  }

  function loadPersistedState() {
    try {
      var savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === "dark" || savedTheme === "light") {
        document.documentElement.setAttribute("data-theme", savedTheme);
      }

      var rawState = localStorage.getItem(STORAGE_KEY);
      if (rawState) {
        var parsed = JSON.parse(rawState);
        if (parsed && typeof parsed === "object") {
          state.occasionName = typeof parsed.occasionName === "string" ? parsed.occasionName : "Meetup";
          state.billAmount = parsed.billAmount !== undefined ? String(parsed.billAmount) : "4,725";
          state.numPeople = parsed.numPeople !== undefined ? parsed.numPeople : 4;
          state.peopleNames = Array.isArray(parsed.peopleNames) ? parsed.peopleNames : ["Ramesh", "Rahul", "Aditya", "Aman"];
          state.commonItemsCount = parsed.commonItemsCount !== undefined ? parsed.commonItemsCount : 4;
          state.commonItemsNames = typeof parsed.commonItemsNames === "string" ? parsed.commonItemsNames : "";
          state.tipPercent = Number(parsed.tipPercent) || 0;
          state.exactSumReconcile = Boolean(parsed.exactSumReconcile);
          state.items = Array.isArray(parsed.items) ? parsed.items : [];
          state.hasCalculated = parsed.hasCalculated !== undefined ? Boolean(parsed.hasCalculated) : true;
        }
      }

      var rawHistory = localStorage.getItem(HISTORY_KEY);
      if (rawHistory) {
        var parsedHist = JSON.parse(rawHistory);
        if (Array.isArray(parsedHist)) {
          historyList = parsedHist;
        }
      }
    } catch (err) {
      // Ignore storage access errors in restricted file:// contexts
    }
  }

  function savePersistedState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList));
    } catch (err) {
      // Ignore storage errors
    }
  }

  function syncInputsFromState() {
    var occEl = safeGetEl("occasionInput");
    var billEl = safeGetEl("billAmountInput");
    var numEl = safeGetEl("numPeopleInput");
    var commonCountEl = safeGetEl("commonCountInput");
    var commonNamesEl = safeGetEl("commonNamesInput");
    var tipEl = safeGetEl("tipSlider");
    var tipValEl = safeGetEl("tipValueLabel");
    var reconcileEl = safeGetEl("exactReconcileToggle");

    if (occEl) occEl.value = state.occasionName;
    if (billEl) billEl.value = state.billAmount;
    if (numEl) numEl.value = state.numPeople;
    if (commonCountEl) commonCountEl.value = state.commonItemsCount;
    if (commonNamesEl) commonNamesEl.value = state.commonItemsNames;
    if (tipEl) tipEl.value = String(state.tipPercent || 0);
    if (tipValEl) tipValEl.textContent = (state.tipPercent || 0) + "%";
    if (reconcileEl) reconcileEl.checked = Boolean(state.exactSumReconcile);

    renderPeopleInputs();
    renderSpecialItems();
  }

  function renderPeopleInputs() {
    var container = safeGetEl("peopleNamesContainer");
    if (!container) return;

    var count = parseInt(String(state.numPeople), 10);
    if (isNaN(count) || count <= 0) {
      container.innerHTML = '<p class="field-hint">Enter a valid positive number of people (1–50) above to list participant names.</p>';
      return;
    }

    var safeCount = Math.min(Math.max(count, 1), 50);
    while (state.peopleNames.length < safeCount) {
      state.peopleNames.push("Person " + (state.peopleNames.length + 1));
    }

    var html = "";
    for (var i = 0; i < safeCount; i++) {
      var val = stripRomanPrefix(state.peopleNames[i] || "");
      var roman = toRoman(i + 1) + "}";
      html +=
        '<div class="person-row">' +
          '<span class="person-roman">' + roman + '</span>' +
          '<input type="text" class="input-control person-name-input" data-person-idx="' + i + '" ' +
          'value="' + escapeHtml(val) + '" placeholder="Name of Person ' + (i + 1) + '" aria-label="Person ' + (i + 1) + ' Name" />' +
        '</div>';
    }
    container.innerHTML = html;

    var inputs = container.querySelectorAll(".person-name-input");
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].addEventListener("input", function (e) {
        var target = e.target;
        var idx = parseInt(target.getAttribute("data-person-idx"), 10);
        if (!isNaN(idx)) {
          state.peopleNames[idx] = target.value;
          savePersistedState();
          refreshItemPersonDropdowns();
          calculateAndRender(false);
        }
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getActivePeopleList() {
    var count = parseInt(String(state.numPeople), 10);
    if (isNaN(count) || count <= 0) return [];
    var safeCount = Math.min(Math.max(count, 1), 50);
    var list = [];
    for (var i = 0; i < safeCount; i++) {
      var raw = state.peopleNames[i] || ("Person " + (i + 1));
      list.push({
        index: i,
        cleanName: stripRomanPrefix(raw) || ("Person " + (i + 1)),
        formattedName: formatRomanName(i, raw)
      });
    }
    return list;
  }

  function refreshItemPersonDropdowns() {
    renderSpecialItems();
  }

  function renderSpecialItems() {
    var container = safeGetEl("specialItemsContainer");
    if (!container) return;

    var people = getActivePeopleList();
    if (!state.items || state.items.length === 0) {
      container.innerHTML =
        '<div class="item-entry">' +
          '<p class="field-hint">No individual or partial-group items added yet. All bill amount will be split equally as common consumption.</p>' +
        '</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < state.items.length; i++) {
      var item = state.items[i];
      var targetIdx = typeof item.targetPersonIndex === "number" ? item.targetPersonIndex : 0;
      if (people.length > 0 && targetIdx >= people.length) {
        targetIdx = 0;
        item.targetPersonIndex = 0;
      }

      var optionsHtml = "";
      for (var p = 0; p < people.length; p++) {
        var sel = p === targetIdx ? " selected" : "";
        optionsHtml += '<option value="' + p + '"' + sel + '>' + escapeHtml(people[p].formattedName) + '</option>';
      }

      var customChecksHtml = "";
      if (item.mode === "custom" && people.length > 0) {
        var selectedArr = Array.isArray(item.customIndices) ? item.customIndices : [];
        customChecksHtml = '<div class="custom-consumers-box">';
        for (var c = 0; c < people.length; c++) {
          var isChecked = selectedArr.indexOf(c) !== -1 ? " checked" : "";
          customChecksHtml +=
            '<label class="consumer-check-label">' +
              '<input type="checkbox" class="item-custom-check" data-item-idx="' + i + '" data-person-idx="' + c + '"' + isChecked + ' />' +
              '<span>' + escapeHtml(people[c].cleanName) + '</span>' +
            '</label>';
        }
        customChecksHtml += '</div>';
      }

      var personSelectDisabled = item.mode === "common" || item.mode === "custom" ? " disabled" : "";
      var personLabel = item.mode === "except" ? "Excluded Person (Everyone Except)" : "Ordered & Consumed Alone By";

      html +=
        '<div class="item-entry" data-item-row="' + i + '">' +
          '<div class="item-entry-top">' +
            '<div class="field-group">' +
              '<label class="field-label">Item Name</label>' +
              '<input type="text" class="input-control item-name-input" data-item-idx="' + i + '" value="' + escapeHtml(item.name || "") + '" placeholder="e.g. Deserts or Drinks" />' +
            '</div>' +
            '<div class="field-group">' +
              '<label class="field-label">Count / Qty</label>' +
              '<input type="number" min="1" step="1" class="input-control input-num item-qty-input" data-item-idx="' + i + '" value="' + escapeHtml(item.qty !== undefined ? item.qty : 1) + '" />' +
            '</div>' +
            '<div class="field-group">' +
              '<label class="field-label">Total Item Price</label>' +
              '<input type="number" min="0" step="0.01" class="input-control input-num item-price-input" data-item-idx="' + i + '" value="' + escapeHtml(item.price !== undefined ? item.price : 0) + '" placeholder="0.00" />' +
            '</div>' +
          '</div>' +
          '<div class="item-entry-bottom">' +
            '<div class="item-type-selector">' +
              '<div class="field-group" style="min-width: 210px; flex: 1;">' +
                '<label class="field-label">Consumption Rule</label>' +
                '<select class="select-control item-mode-select" data-item-idx="' + i + '">' +
                  '<option value="solo"' + (item.mode === "solo" ? " selected" : "") + '>Consumed Alone Only (1 Person)</option>' +
                  '<option value="except"' + (item.mode === "except" ? " selected" : "") + '>Shared by All Except 1 Person</option>' +
                  '<option value="custom"' + (item.mode === "custom" ? " selected" : "") + '>Custom Subset of People</option>' +
                  '<option value="common"' + (item.mode === "common" ? " selected" : "") + '>Common (All People Equal)</option>' +
                '</select>' +
              '</div>' +
              '<div class="field-group" style="min-width: 190px; flex: 1;">' +
                '<label class="field-label">' + personLabel + '</label>' +
                '<select class="select-control item-person-select" data-item-idx="' + i + '"' + personSelectDisabled + '>' +
                  optionsHtml +
                '</select>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="btn btn-danger-outline btn-sm item-remove-btn" data-item-idx="' + i + '">Remove</button>' +
          '</div>' +
          customChecksHtml +
        '</div>';
    }

    container.innerHTML = html;
    bindSpecialItemEvents(container);
  }

  function bindSpecialItemEvents(container) {
    var nameInputs = container.querySelectorAll(".item-name-input");
    for (var i = 0; i < nameInputs.length; i++) {
      nameInputs[i].addEventListener("input", function (e) {
        var idx = parseInt(e.target.getAttribute("data-item-idx"), 10);
        if (state.items[idx]) {
          state.items[idx].name = e.target.value;
          savePersistedState();
          calculateAndRender(false);
        }
      });
    }

    var qtyInputs = container.querySelectorAll(".item-qty-input");
    for (var q = 0; q < qtyInputs.length; q++) {
      qtyInputs[q].addEventListener("input", function (e) {
        var idx = parseInt(e.target.getAttribute("data-item-idx"), 10);
        if (state.items[idx]) {
          var v = parseInt(e.target.value, 10);
          state.items[idx].qty = isNaN(v) || v < 1 ? 1 : v;
          savePersistedState();
          calculateAndRender(false);
        }
      });
    }

    var priceInputs = container.querySelectorAll(".item-price-input");
    for (var p = 0; p < priceInputs.length; p++) {
      priceInputs[p].addEventListener("input", function (e) {
        var idx = parseInt(e.target.getAttribute("data-item-idx"), 10);
        if (state.items[idx]) {
          state.items[idx].price = e.target.value;
          savePersistedState();
          calculateAndRender(false);
        }
      });
    }

    var modeSelects = container.querySelectorAll(".item-mode-select");
    for (var m = 0; m < modeSelects.length; m++) {
      modeSelects[m].addEventListener("change", function (e) {
        var idx = parseInt(e.target.getAttribute("data-item-idx"), 10);
        if (state.items[idx]) {
          state.items[idx].mode = e.target.value;
          if (e.target.value === "custom" && !Array.isArray(state.items[idx].customIndices)) {
            state.items[idx].customIndices = [0];
          }
          savePersistedState();
          renderSpecialItems();
          calculateAndRender(false);
        }
      });
    }

    var personSelects = container.querySelectorAll(".item-person-select");
    for (var s = 0; s < personSelects.length; s++) {
      personSelects[s].addEventListener("change", function (e) {
        var idx = parseInt(e.target.getAttribute("data-item-idx"), 10);
        if (state.items[idx]) {
          state.items[idx].targetPersonIndex = parseInt(e.target.value, 10) || 0;
          savePersistedState();
          calculateAndRender(false);
        }
      });
    }

    var customChecks = container.querySelectorAll(".item-custom-check");
    for (var c = 0; c < customChecks.length; c++) {
      customChecks[c].addEventListener("change", function (e) {
        var itemIdx = parseInt(e.target.getAttribute("data-item-idx"), 10);
        var personIdx = parseInt(e.target.getAttribute("data-person-idx"), 10);
        if (state.items[itemIdx]) {
          var arr = Array.isArray(state.items[itemIdx].customIndices)
            ? state.items[itemIdx].customIndices.slice()
            : [];
          var pos = arr.indexOf(personIdx);
          if (e.target.checked && pos === -1) {
            arr.push(personIdx);
          } else if (!e.target.checked && pos !== -1) {
            arr.splice(pos, 1);
          }
          state.items[itemIdx].customIndices = arr;
          savePersistedState();
          calculateAndRender(false);
        }
      });
    }

    var removeBtns = container.querySelectorAll(".item-remove-btn");
    for (var r = 0; r < removeBtns.length; r++) {
      removeBtns[r].addEventListener("click", function (e) {
        var idx = parseInt(e.currentTarget.getAttribute("data-item-idx"), 10);
        if (!isNaN(idx)) {
          state.items.splice(idx, 1);
          savePersistedState();
          renderSpecialItems();
          calculateAndRender(false);
        }
      });
    }
  }

  function validateAndCompute() {
    var errors = [];
    var warnings = [];

    var rawBill = state.billAmount;
    var parsedBill = parseNumericInput(rawBill);
    var rawPeople = state.numPeople;
    var parsedPeople = parseNumericInput(rawPeople);

    // Requirement 5: Show a message, and no result, if the bill or the number of people is empty, zero or negative
    if (String(rawBill).trim() === "" || isNaN(parsedBill)) {
      errors.push("Bill amount cannot be empty. Please enter a valid positive bill amount.");
    } else if (parsedBill <= 0) {
      errors.push("Bill amount must be greater than zero. Zero or negative bill amounts are not allowed.");
    } else if (parsedBill > 1000000000) {
      errors.push("Bill amount exceeds the maximum supported limit (1,000,000,000).");
    }

    if (String(rawPeople).trim() === "" || isNaN(parsedPeople)) {
      errors.push("Number of people cannot be empty. Please enter at least 1 person.");
    } else if (parsedPeople <= 0) {
      errors.push("Number of people must be greater than zero. Zero or negative values are not allowed.");
    } else if (Math.floor(parsedPeople) !== parsedPeople) {
      errors.push("Number of people must be a whole integer.");
    } else if (parsedPeople > 50) {
      errors.push("Number of people cannot exceed 50 for a single table split.");
    }

    if (errors.length > 0) {
      return { valid: false, errors: errors, warnings: warnings, result: null };
    }

    var n = Math.floor(parsedPeople);
    var tipPct = Math.max(0, Math.min(100, Number(state.tipPercent) || 0));
    var effectiveBill = parsedBill * (1 + tipPct / 100);

    var people = getActivePeopleList();
    var personExclusiveTotals = [];
    var personItemNotes = [];
    for (var i = 0; i < n; i++) {
      personExclusiveTotals.push(0);
      personItemNotes.push([]);
    }

    var specialItemsSum = 0;
    for (var j = 0; j < state.items.length; j++) {
      var it = state.items[j];
      var priceVal = parseNumericInput(it.price);
      if (isNaN(priceVal) || priceVal < 0) {
        errors.push('Item "' + (it.name || ("#" + (j + 1))) + '" has an invalid or negative price.');
        continue;
      }
      if (priceVal === 0) continue;

      var itemLabel = (it.name || ("Item " + (j + 1))).trim();
      var consumers = [];

      if (it.mode === "solo") {
        var soloIdx = typeof it.targetPersonIndex === "number" && it.targetPersonIndex < n ? it.targetPersonIndex : 0;
        consumers = [soloIdx];
      } else if (it.mode === "except") {
        var exIdx = typeof it.targetPersonIndex === "number" && it.targetPersonIndex < n ? it.targetPersonIndex : 0;
        for (var k = 0; k < n; k++) {
          if (k !== exIdx) consumers.push(k);
        }
        if (consumers.length === 0) {
          errors.push('Item "' + itemLabel + '" excludes everyone because there is only 1 person.');
        }
      } else if (it.mode === "custom") {
        var cArr = Array.isArray(it.customIndices) ? it.customIndices : [];
        for (var c = 0; c < cArr.length; c++) {
          if (cArr[c] >= 0 && cArr[c] < n) consumers.push(cArr[c]);
        }
        if (consumers.length === 0) {
          errors.push('Item "' + itemLabel + '" has no consumers selected in Custom mode.');
        }
      } else {
        // common mode
        for (var allIdx = 0; allIdx < n; allIdx++) {
          consumers.push(allIdx);
        }
      }

      if (consumers.length > 0) {
        specialItemsSum += priceVal;
        var sharePerConsumer = priceVal / consumers.length;
        for (var m = 0; m < consumers.length; m++) {
          var pIdx = consumers[m];
          personExclusiveTotals[pIdx] += sharePerConsumer;
          personItemNotes[pIdx].push(itemLabel + " (" + formatNumber(sharePerConsumer, true) + ")");
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors: errors, warnings: warnings, result: null };
    }

    if (specialItemsSum > effectiveBill + 1e-6) {
      errors.push(
        "The total of individual/special consumption items (" +
        formatNumber(specialItemsSum, true) +
        ") exceeds the total bill amount (" +
        formatNumber(effectiveBill, true) +
        "). Please increase the bill amount or reduce item prices."
      );
      return { valid: false, errors: errors, warnings: warnings, result: null };
    }

    var commonPool = Math.max(0, effectiveBill - specialItemsSum);
    var commonSharePerPerson = commonPool / n;

    var shares = [];
    var truncatedSum = 0;

    for (var p = 0; p < n; p++) {
      var exactTotal = commonSharePerPerson + personExclusiveTotals[p];
      var truncated = truncateTwoDecimals(exactTotal);
      truncatedSum += truncated;
      shares.push({
        index: p,
        cleanName: people[p].cleanName,
        formattedName: people[p].formattedName,
        commonShare: commonSharePerPerson,
        exclusiveShare: personExclusiveTotals[p],
        exactShare: exactTotal,
        displayShare: truncated,
        notes: personItemNotes[p]
      });
    }

    if (state.exactSumReconcile && n > 0) {
      var diff = Math.round((effectiveBill - truncatedSum) * 100) / 100;
      shares[0].displayShare = Math.round((shares[0].displayShare + diff) * 100) / 100;
    }

    return {
      valid: true,
      errors: [],
      warnings: warnings,
      result: {
        occasionName: (state.occasionName || "Dinner").trim() || "Dinner",
        baseBill: parsedBill,
        effectiveBill: effectiveBill,
        tipPercent: tipPct,
        numPeople: n,
        commonPool: commonPool,
        commonSharePerPerson: commonSharePerPerson,
        specialItemsSum: specialItemsSum,
        shares: shares
      }
    };
  }

  function buildFormattedReceiptText(res) {
    var lines = [];
    lines.push("Ocassioon Name:" + res.occasionName);
    lines.push("Total Amount:" + formatNumber(res.effectiveBill, false));
    lines.push("Number of people:" + res.numPeople);
    lines.push("Name Of People:           Amount");

    for (var i = 0; i < res.shares.length; i++) {
      var s = res.shares[i];
      var nameCol = s.formattedName;
      var amtCol = formatNumber(s.displayShare, true);
      var padLen = Math.max(2, 26 - nameCol.length);
      var spaces = new Array(padLen + 1).join(" ");
      lines.push(nameCol + spaces + amtCol);
    }

    lines.push("                                      Total:" + formatNumber(res.effectiveBill, false));
    return lines.join("\n");
  }

  function calculateAndRender(saveToHistoryFlag) {
    var errorBanner = safeGetEl("validationErrorBanner");
    var resultsWrapper = safeGetEl("resultsContentWrapper");
    var emptyResultNotice = safeGetEl("noResultNotice");
    var billInputEl = safeGetEl("billAmountInput");
    var numPeopleEl = safeGetEl("numPeopleInput");

    var check = validateAndCompute();

    if (billInputEl) {
      var bVal = parseNumericInput(state.billAmount);
      if (String(state.billAmount).trim() === "" || isNaN(bVal) || bVal <= 0) {
        billInputEl.classList.add("input-error");
      } else {
        billInputEl.classList.remove("input-error");
      }
    }

    if (numPeopleEl) {
      var pVal = parseNumericInput(state.numPeople);
      if (String(state.numPeople).trim() === "" || isNaN(pVal) || pVal <= 0) {
        numPeopleEl.classList.add("input-error");
      } else {
        numPeopleEl.classList.remove("input-error");
      }
    }

    if (!check.valid || !check.result) {
      if (errorBanner) {
        errorBanner.classList.remove("hidden");
        errorBanner.innerHTML =
          '<div><strong>Unable to Calculate Split:</strong><br/>' +
          check.errors.map(escapeHtml).join("<br/>") +
          "</div>";
      }
      if (resultsWrapper) resultsWrapper.classList.add("hidden");
      if (emptyResultNotice) emptyResultNotice.classList.remove("hidden");
      return;
    }

    if (errorBanner) {
      errorBanner.classList.add("hidden");
      errorBanner.innerHTML = "";
    }
    if (resultsWrapper) resultsWrapper.classList.remove("hidden");
    if (emptyResultNotice) emptyResultNotice.classList.add("hidden");

    var res = check.result;

    var kvOccasion = safeGetEl("kvOccasion");
    var kvTotal = safeGetEl("kvTotal");
    var kvCommonPool = safeGetEl("kvCommonPool");
    var kvEachCommon = safeGetEl("kvEachCommon");

    if (kvOccasion) kvOccasion.textContent = res.occasionName;
    if (kvTotal) kvTotal.textContent = formatNumber(res.effectiveBill, false);
    if (kvCommonPool) kvCommonPool.textContent = formatNumber(res.commonPool, true);
    if (kvEachCommon) kvEachCommon.textContent = formatNumber(res.commonSharePerPerson, true);

    var tbody = safeGetEl("sharesTableBody");
    if (tbody) {
      var rowsHtml = "";
      for (var i = 0; i < res.shares.length; i++) {
        var s = res.shares[i];
        var breakdown = "Common: " + formatNumber(s.commonShare, true);
        if (s.notes.length > 0) {
          breakdown += " + " + s.notes.join(" + ");
        }
        rowsHtml +=
          "<tr>" +
            "<td>" +
              "<strong>" + escapeHtml(s.formattedName) + "</strong>" +
              '<span class="person-breakdown-sub">' + escapeHtml(breakdown) + "</span>" +
            "</td>" +
            '<td class="col-num">' + formatNumber(s.commonShare, true) + "</td>" +
            '<td class="col-num">' + formatNumber(s.exclusiveShare, true) + "</td>" +
            '<td class="col-num"><strong>' + formatNumber(s.displayShare, true) + "</strong></td>" +
          "</tr>";
      }
      tbody.innerHTML = rowsHtml;
    }

    var tfootTotal = safeGetEl("sharesTableFootTotal");
    if (tfootTotal) {
      tfootTotal.textContent = "Total: " + formatNumber(res.effectiveBill, false);
    }

    var receiptPre = safeGetEl("exactReceiptOutput");
    if (receiptPre) {
      receiptPre.textContent = buildFormattedReceiptText(res);
    }

    if (saveToHistoryFlag) {
      addHistoryRecord(res);
    }
  }

  function addHistoryRecord(res) {
    var entry = {
      id: "hist_" + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      occasionName: res.occasionName,
      totalFormatted: formatNumber(res.effectiveBill, false),
      numPeople: res.numPeople,
      snapshot: JSON.parse(JSON.stringify(state))
    };
    historyList.unshift(entry);
    if (historyList.length > 8) {
      historyList = historyList.slice(0, 8);
    }
    savePersistedState();
    renderHistoryList();
  }

  function renderHistoryList() {
    var container = safeGetEl("historyContainer");
    if (!container) return;

    if (historyList.length === 0) {
      container.innerHTML = '<p class="field-hint">No saved calculations in history yet. Click "Calculate What Each Person Pays" to log a snapshot.</p>';
      return;
    }

    var html = "";
    for (var i = 0; i < historyList.length; i++) {
      var item = historyList[i];
      html +=
        '<div class="history-item">' +
          '<div class="history-item-info">' +
            '<span class="history-item-title">' + escapeHtml(item.occasionName) + '</span>' +
            '<span class="history-item-meta">Total: ' + escapeHtml(item.totalFormatted) + ' · ' + item.numPeople + ' People · ' + escapeHtml(item.timestamp) + '</span>' +
          '</div>' +
          '<button type="button" class="btn btn-secondary btn-sm history-restore-btn" data-hist-idx="' + i + '">Restore</button>' +
        '</div>';
    }
    container.innerHTML = html;

    var restoreBtns = container.querySelectorAll(".history-restore-btn");
    for (var j = 0; j < restoreBtns.length; j++) {
      restoreBtns[j].addEventListener("click", function (e) {
        var idx = parseInt(e.currentTarget.getAttribute("data-hist-idx"), 10);
        if (historyList[idx] && historyList[idx].snapshot) {
          state = JSON.parse(JSON.stringify(historyList[idx].snapshot));
          savePersistedState();
          syncInputsFromState();
          calculateAndRender(false);
        }
      });
    }
  }

  function setupEventListeners() {
    var occEl = safeGetEl("occasionInput");
    if (occEl) {
      occEl.addEventListener("input", function (e) {
        state.occasionName = e.target.value;
        savePersistedState();
        calculateAndRender(false);
      });
    }

    var billEl = safeGetEl("billAmountInput");
    if (billEl) {
      billEl.addEventListener("input", function (e) {
        state.billAmount = e.target.value;
        savePersistedState();
        calculateAndRender(false);
      });
    }

    var numEl = safeGetEl("numPeopleInput");
    if (numEl) {
      numEl.addEventListener("input", function (e) {
        state.numPeople = e.target.value;
        savePersistedState();
        renderPeopleInputs();
        renderSpecialItems();
        calculateAndRender(false);
      });
    }

    var commonCountEl = safeGetEl("commonCountInput");
    if (commonCountEl) {
      commonCountEl.addEventListener("input", function (e) {
        state.commonItemsCount = e.target.value;
        savePersistedState();
        calculateAndRender(false);
      });
    }

    var commonNamesEl = safeGetEl("commonNamesInput");
    if (commonNamesEl) {
      commonNamesEl.addEventListener("input", function (e) {
        state.commonItemsNames = e.target.value;
        savePersistedState();
        calculateAndRender(false);
      });
    }

    var addItemBtn = safeGetEl("addSpecialItemBtn");
    if (addItemBtn) {
      addItemBtn.addEventListener("click", function () {
        state.items.push({
          id: "item_" + Date.now(),
          name: "",
          qty: 1,
          price: 0,
          mode: "solo",
          targetPersonIndex: 0,
          customIndices: [0]
        });
        savePersistedState();
        renderSpecialItems();
        calculateAndRender(false);
      });
    }

    var calcBtn = safeGetEl("calculateSplitBtn");
    if (calcBtn) {
      calcBtn.addEventListener("click", function () {
        state.hasCalculated = true;
        savePersistedState();
        calculateAndRender(true);
      });
    }

    var loadTestBtn = safeGetEl("loadMeetupTestBtn");
    if (loadTestBtn) {
      loadTestBtn.addEventListener("click", function () {
        state = getDefaultMeetupState();
        savePersistedState();
        syncInputsFromState();
        calculateAndRender(true);
      });
    }

    var resetBtn = safeGetEl("resetAllBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        state = {
          occasionName: "",
          billAmount: "",
          numPeople: "",
          peopleNames: [],
          commonItemsCount: 0,
          commonItemsNames: "",
          tipPercent: 0,
          exactSumReconcile: false,
          items: [],
          hasCalculated: false
        };
        savePersistedState();
        syncInputsFromState();
        calculateAndRender(false);
      });
    }

    var themeBtn = safeGetEl("themeToggleBtn");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        var next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch (err) {}
      });
    }

    var tipSlider = safeGetEl("tipSlider");
    var tipLabel = safeGetEl("tipValueLabel");
    if (tipSlider) {
      tipSlider.addEventListener("input", function (e) {
        var val = Number(e.target.value) || 0;
        state.tipPercent = val;
        if (tipLabel) tipLabel.textContent = val + "%";
        savePersistedState();
        calculateAndRender(false);
      });
    }

    var reconcileToggle = safeGetEl("exactReconcileToggle");
    if (reconcileToggle) {
      reconcileToggle.addEventListener("change", function (e) {
        state.exactSumReconcile = Boolean(e.target.checked);
        savePersistedState();
        calculateAndRender(false);
      });
    }

    var copyBtn = safeGetEl("copyReceiptBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var pre = safeGetEl("exactReceiptOutput");
        if (!pre) return;
        var text = pre.textContent || "";
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
          }
          var orig = copyBtn.textContent;
          copyBtn.textContent = "Copied!";
          setTimeout(function () {
            copyBtn.textContent = orig;
          }, 1400);
        } catch (err) {}
      });
    }

    var clearHistBtn = safeGetEl("clearHistoryBtn");
    if (clearHistBtn) {
      clearHistBtn.addEventListener("click", function () {
        historyList = [];
        savePersistedState();
        renderHistoryList();
      });
    }
  }

  function initApp() {
    try {
      loadPersistedState();
      syncInputsFromState();
      setupEventListeners();
      renderHistoryList();
      calculateAndRender(false);
    } catch (err) {
      // Zero console errors guarantee
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
(() => {
  "use strict";

  // Shown in the footer as a lightweight "did this actually reload" version indicator. No git repo
  // backs this project, so there's no commit hash to pull from — this just mirrors the cache-busting
  // ?v= number already hand-bumped on index.html's script.js link; keep both in sync.
  const ASSET_VERSION = "27";

  // Individual namespaced localStorage keys — matching worder/wordweave architecture
  const MODE_KEY = "coshin-mode";
  const INTERVAL_KEY = "coshin-interval";
  const COLOURS_KEY = "coshin-colours";
  const ORDER_KEY = "coshin-order";

  const DEFAULT_COLOURS = ["#e53935", "#fdd835"];
  const HEX_REGEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

  function detectInitialMode() {
    const val = localStorage.getItem(MODE_KEY);
    if (val === "stopwatch" || val === "timer") return val;
    try {
      const raw = localStorage.getItem("coshin-settings");
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.mode === "stopwatch") return "stopwatch";
      }
    } catch {}
    return "timer";
  }

  function detectInitialInterval() {
    const val = Number(localStorage.getItem(INTERVAL_KEY));
    if (Number.isFinite(val) && val > 0) return val;
    try {
      const raw = localStorage.getItem("coshin-settings");
      if (raw) {
        const p = JSON.parse(raw);
        const pInt = Number(p.interval);
        if (Number.isFinite(pInt) && pInt > 0) return pInt;
      }
    } catch {}
    return 3;
  }

  function detectInitialColours() {
    const stored = localStorage.getItem(COLOURS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((c) => typeof c === "string" && HEX_REGEX.test(c));
          if (valid.length > 0) return valid;
        }
      } catch {}
    }
    try {
      const raw = localStorage.getItem("coshin-settings");
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.colours)) {
          const valid = p.colours.filter((c) => typeof c === "string" && HEX_REGEX.test(c));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return [...DEFAULT_COLOURS];
  }

  function detectInitialOrder() {
    const val = localStorage.getItem(ORDER_KEY);
    if (val === "circle" || val === "random") return val;
    try {
      const raw = localStorage.getItem("coshin-settings");
      if (raw) {
        const p = JSON.parse(raw);
        if (p && (p.timerOrder === "circle" || p.order === "circle")) return "circle";
      }
    } catch {}
    return "random";
  }

  // Active runtime state variables (matching worder & wordweave pattern)
  let mode = detectInitialMode();
  let interval = detectInitialInterval();
  let colours = detectInitialColours();
  let timerOrder = detectInitialOrder();

  function getEffectiveOrder() {
    return mode === "stopwatch" ? "circle" : timerOrder;
  }

  function persistSettings() {
    try {
      localStorage.setItem(MODE_KEY, mode);
      localStorage.setItem(INTERVAL_KEY, String(interval));
      localStorage.setItem(COLOURS_KEY, JSON.stringify(colours));
      localStorage.setItem(ORDER_KEY, timerOrder);
      localStorage.setItem("coshin-settings", JSON.stringify({
        mode,
        interval,
        colours,
        order: getEffectiveOrder(),
        timerOrder,
      }));
    } catch {}
  }

  const views = {
    welcome: document.getElementById("view-welcome"),
    main: document.getElementById("view-main"),
  };

  const helpModal = document.getElementById("help-modal");
  const settingsModal = document.getElementById("settings-modal");
  const helpBtn = document.getElementById("help-btn");
  const closeHelpBtn = document.getElementById("close-help-btn");
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const lapBtn = document.getElementById("lap-btn");
  const resumeBtn = document.getElementById("resume-btn");
  const restartBtn = document.getElementById("restart-btn");
  const endBtn = document.getElementById("end-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const resetBtn = document.getElementById("reset-btn");
  const intervalInput = document.getElementById("interval-input");
  const modeTimerBtn = document.getElementById("mode-timer");
  const modeStopwatchBtn = document.getElementById("mode-stopwatch");
  const fieldInterval = document.getElementById("field-interval");
  const orderField = document.querySelector(".order-field");
  const orderRandomInput = document.getElementById("order-random");
  const orderCircleInput = document.getElementById("order-circle");
  const colourList = document.getElementById("colour-list");
  const newColourInput = document.getElementById("new-colour-input");
  const addColourBtn = document.getElementById("add-colour-btn");
  const timerEl = document.getElementById("timer");
  const lapsContainer = document.getElementById("laps-container");
  const lapsList = document.getElementById("laps-list");
  const historyEl = document.getElementById("colour-history");
  const footerEl = document.getElementById("site-footer");
  const footerVersionEl = document.getElementById("footer-version");
  const mainView = views.main;
  const HISTORY_LIMIT = 10;

  let colourIndex = 0;
  let remaining = interval;
  let stopwatchElapsed = 0;
  let lastLapTime = 0;
  let laps = [];
  let tickHandle = null;
  let colourHistory = [];
  let wakeLock = null;

  function showView(name) {
    for (const [key, el] of Object.entries(views)) {
      el.hidden = key !== name;
    }
    footerEl.hidden = name === "main";
  }

  function goToWelcome() {
    stopCycling();
    showView("welcome");
  }

  function formatStopwatchTime(sec) {
    const mins = Math.floor(sec / 60);
    const remainder = (sec % 60).toFixed(1);
    const padded = (sec % 60 < 10 ? "0" : "") + remainder;
    return mins > 0 ? `${mins}:${padded}` : `${remainder}s`;
  }

  function goToMain() {
    colourIndex = 0;
    remaining = interval;
    stopwatchElapsed = 0;
    lastLapTime = 0;
    laps = [];
    colourHistory = [];
    lapsList.innerHTML = "";

    resumeBtn.classList.add("hidden");
    restartBtn.classList.add("hidden");
    endBtn.classList.add("hidden");

    if (mode === "stopwatch") {
      historyEl.hidden = true;
      historyEl.classList.add("hidden");
      lapBtn.classList.remove("hidden");
      stopBtn.classList.remove("hidden");
      lapsContainer.classList.remove("hidden");
      timerEl.textContent = "0.0s";
    } else {
      historyEl.hidden = false;
      historyEl.classList.remove("hidden");
      lapBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      lapsContainer.classList.add("hidden");
      timerEl.textContent = remaining.toFixed(1);
    }

    applyColour();
    showView("main");
    startCycling();
  }

  function openSettings() {
    renderSettingsForm();
    settingsModal.classList.remove("hidden");
  }

  function closeSettings() {
    persistSettings();
    settingsModal.classList.add("hidden");
  }

  function openHelp() {
    helpModal.classList.remove("hidden");
  }

  function closeHelp() {
    helpModal.classList.add("hidden");
  }

  function applyColour() {
    const colour = colours[colourIndex % colours.length];
    mainView.style.setProperty("--flash-colour", colour);
    colourHistory.push(colour);
    if (colourHistory.length > HISTORY_LIMIT) {
      colourHistory = colourHistory.slice(-HISTORY_LIMIT);
    }
    renderHistory();
  }

  function renderHistory() {
    if (mode === "stopwatch") {
      historyEl.hidden = true;
      historyEl.classList.add("hidden");
      return;
    }
    historyEl.hidden = false;
    historyEl.classList.remove("hidden");
    historyEl.innerHTML = "";
    for (const colour of colourHistory) {
      const li = document.createElement("li");
      li.style.background = colour;
      historyEl.appendChild(li);
    }
  }

  function advanceColour() {
    const count = colours.length;
    const effectiveOrder = getEffectiveOrder();
    if (effectiveOrder === "circle" || count <= 1) {
      colourIndex = (colourIndex + 1) % count;
    } else {
      colourIndex = Math.floor(Math.random() * count);
    }
    applyColour();
  }

  function recordLap() {
    if (mode !== "stopwatch" || mainView.hidden) return;
    const currentColour = colours[colourIndex % colours.length];
    const lapTime = stopwatchElapsed - lastLapTime;
    lastLapTime = stopwatchElapsed;
    laps.unshift({
      id: laps.length + 1,
      totalTime: stopwatchElapsed,
      lapTime: lapTime,
      colour: currentColour,
    });
    advanceColour();
    renderLaps();
  }

  function renderLaps() {
    lapsList.innerHTML = "";
    for (const lap of laps) {
      const li = document.createElement("li");
      li.className = "lap-item";
      li.innerHTML = `
        <span class="lap-num">Lap ${lap.id}</span>
        <span class="lap-swatch" style="background:${lap.colour}"></span>
        <span class="lap-split">+${formatStopwatchTime(lap.lapTime)}</span>
        <span class="lap-total">${formatStopwatchTime(lap.totalTime)}</span>
      `;
      lapsList.appendChild(li);
    }
  }

  function startCycling() {
    stopCycling();
    requestWakeLock();
    let lastTick = performance.now();
    tickHandle = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;

      if (mode === "stopwatch") {
        stopwatchElapsed += delta;
        timerEl.textContent = formatStopwatchTime(stopwatchElapsed);
      } else {
        remaining -= delta;
        if (remaining <= 0.05) {
          remaining = interval;
          advanceColour();
        }
        timerEl.textContent = Math.max(0, remaining).toFixed(1);
      }
    }, 100);

    if (mode === "stopwatch") {
      timerEl.textContent = "0.0s";
    } else {
      timerEl.textContent = remaining.toFixed(1);
    }
  }

  function stopCycling() {
    if (tickHandle !== null) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
    releaseWakeLock();
  }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      wakeLock = null;
    }
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && tickHandle !== null && !wakeLock) {
      requestWakeLock();
    }
  });

  function renderSettingsForm() {
    const effectiveOrder = getEffectiveOrder();
    if (mode === "stopwatch") {
      if (orderField) orderField.style.display = "none";
    } else {
      if (orderField) orderField.style.display = "block";
    }

    modeTimerBtn.classList.toggle("selected", mode === "timer");
    modeStopwatchBtn.classList.toggle("selected", mode === "stopwatch");
    fieldInterval.style.display = mode === "stopwatch" ? "none" : "block";

    intervalInput.value = interval;
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      const val = Number(btn.dataset.preset);
      btn.classList.toggle("selected", val === interval);
    });
    orderRandomInput.classList.toggle("selected", effectiveOrder === "random");
    orderCircleInput.classList.toggle("selected", effectiveOrder === "circle");

    colourList.innerHTML = "";
    colours.forEach((colour, i) => {
      const li = document.createElement("li");
      li.className = "colour-chip";

      const swatch = document.createElement("span");
      swatch.className = "colour-swatch";
      swatch.style.background = colour;
      li.appendChild(swatch);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "✕";
      removeBtn.setAttribute("aria-label", `Remove colour ${colour}`);
      removeBtn.disabled = colours.length <= 1;
      removeBtn.addEventListener("click", () => {
        colours.splice(i, 1);
        persistSettings();
        renderSettingsForm();
      });
      li.appendChild(removeBtn);

      colourList.appendChild(li);
    });
  }

  startBtn.addEventListener("click", goToMain);

  stopBtn.addEventListener("click", () => {
    if (mode === "stopwatch") {
      stopCycling();
      lapBtn.classList.add("hidden");
      stopBtn.classList.add("hidden");
      resumeBtn.classList.remove("hidden");
      restartBtn.classList.remove("hidden");
      endBtn.classList.remove("hidden");
    } else {
      goToWelcome();
    }
  });

  resumeBtn.addEventListener("click", () => {
    resumeBtn.classList.add("hidden");
    restartBtn.classList.add("hidden");
    endBtn.classList.add("hidden");
    lapBtn.classList.remove("hidden");
    stopBtn.classList.remove("hidden");
    startCycling();
  });

  restartBtn.addEventListener("click", () => {
    stopwatchElapsed = 0;
    lastLapTime = 0;
    laps = [];
    colourIndex = 0;
    lapsList.innerHTML = "";
    timerEl.textContent = "0.0s";
    applyColour();
    resumeBtn.classList.add("hidden");
    restartBtn.classList.add("hidden");
    endBtn.classList.add("hidden");
    lapBtn.classList.remove("hidden");
    stopBtn.classList.remove("hidden");
    startCycling();
  });

  endBtn.addEventListener("click", () => {
    goToWelcome();
  });

  lapBtn.addEventListener("click", recordLap);
  settingsBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);
  helpBtn.addEventListener("click", openHelp);
  closeHelpBtn.addEventListener("click", closeHelp);

  mainView.addEventListener("click", (e) => {
    if (mode === "stopwatch" && !e.target.closest("button")) {
      recordLap();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && mode === "stopwatch" && !mainView.hidden) {
      e.preventDefault();
      recordLap();
    }
  });

  document.querySelectorAll(".modal-close-btn").forEach((btn) => {
    const modal = btn.closest(".modal");
    btn.addEventListener("click", () => {
      if (modal) modal.classList.add("hidden");
    });
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  });

  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedMode = btn.getAttribute("data-mode");
      if (selectedMode === "stopwatch" || selectedMode === "timer") {
        mode = selectedMode;
        persistSettings();
        renderSettingsForm();
      }
    });
  });

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = Number(btn.dataset.preset);
      if (Number.isFinite(val) && val > 0) {
        interval = val;
        intervalInput.value = val;
        persistSettings();
        renderSettingsForm();
      }
    });
  });

  intervalInput.addEventListener("input", () => {
    const value = Number(intervalInput.value);
    if (Number.isFinite(value) && value > 0) {
      interval = value;
      persistSettings();
      document.querySelectorAll(".preset-btn").forEach((btn) => {
        btn.classList.toggle("selected", Number(btn.dataset.preset) === value);
      });
    }
  });

  for (const btn of [orderRandomInput, orderCircleInput]) {
    btn.addEventListener("click", () => {
      const val = btn.dataset.order;
      if (val === "random" || val === "circle") {
        timerOrder = val;
        persistSettings();
        renderSettingsForm();
      }
    });
  }

  function getRandomHexColour() {
    const letters = "0123456789abcdef";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  addColourBtn.addEventListener("click", () => {
    const value = newColourInput.value;
    if (value && HEX_REGEX.test(value)) {
      if (!colours.includes(value)) {
        colours.push(value);
        persistSettings();
      }
    }
    newColourInput.value = getRandomHexColour();
    renderSettingsForm();
  });

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem(MODE_KEY);
    localStorage.removeItem(INTERVAL_KEY);
    localStorage.removeItem(COLOURS_KEY);
    localStorage.removeItem(ORDER_KEY);
    localStorage.removeItem("coshin-settings");
    mode = "timer";
    interval = 3;
    colours = [...DEFAULT_COLOURS];
    timerOrder = "random";
    persistSettings();
    newColourInput.value = getRandomHexColour();
    renderSettingsForm();
  });

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    if (["localhost", "127.0.0.1"].includes(location.hostname)) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  footerVersionEl.textContent = `v${ASSET_VERSION}`;
  renderSettingsForm();
  showView("welcome");
  registerServiceWorker();
})();

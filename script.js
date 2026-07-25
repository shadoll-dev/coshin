(() => {
  "use strict";

  // Shown in the footer as a lightweight "did this actually reload" version indicator. No git repo
  // backs this project, so there's no commit hash to pull from — this just mirrors the cache-busting
  // ?v= number already hand-bumped on index.html's script.js link; keep both in sync.
  const ASSET_VERSION = "1";

  const STORAGE_KEY = "coshin-settings";
  const DEFAULT_SETTINGS = {
    interval: 3,
    colours: ["#e53935", "#fdd835"],
    order: "random",
  };

  const views = {
    welcome: document.getElementById("view-welcome"),
    main: document.getElementById("view-main"),
    settings: document.getElementById("view-settings"),
  };

  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const resetBtn = document.getElementById("reset-btn");
  const intervalInput = document.getElementById("interval-input");
  const orderRandomInput = document.getElementById("order-random");
  const orderCircleInput = document.getElementById("order-circle");
  const colourList = document.getElementById("colour-list");
  const newColourInput = document.getElementById("new-colour-input");
  const addColourBtn = document.getElementById("add-colour-btn");
  const timerEl = document.getElementById("timer");
  const historyEl = document.getElementById("colour-history");
  const footerEl = document.getElementById("site-footer");
  const footerVersionEl = document.getElementById("footer-version");
  const mainView = views.main;
  const HISTORY_LIMIT = 10;

  let settings = loadSettings();
  let previousView = "welcome";
  let colourIndex = 0;
  let remaining = settings.interval;
  let tickHandle = null;
  let colourHistory = [];

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_SETTINGS);
      const parsed = JSON.parse(raw);
      const colours = Array.isArray(parsed.colours) && parsed.colours.length > 0
        ? parsed.colours
        : DEFAULT_SETTINGS.colours;
      const interval = Number(parsed.interval);
      const order = parsed.order === "circle" ? "circle" : DEFAULT_SETTINGS.order;
      return {
        interval: Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_SETTINGS.interval,
        colours,
        order,
      };
    } catch {
      return structuredClone(DEFAULT_SETTINGS);
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

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

  function goToMain() {
    colourIndex = 0;
    remaining = settings.interval;
    colourHistory = [];
    applyColour();
    showView("main");
    startCycling();
  }

  function openSettings() {
    previousView = mainView.hidden ? "welcome" : "main";
    stopCycling();
    renderSettingsForm();
    showView("settings");
  }

  function closeSettings() {
    if (previousView === "main") {
      goToMain();
    } else {
      showView("welcome");
    }
  }

  function applyColour() {
    const colour = settings.colours[colourIndex % settings.colours.length];
    mainView.style.setProperty("--flash-colour", colour);
    colourHistory.push(colour);
    if (colourHistory.length > HISTORY_LIMIT) {
      colourHistory = colourHistory.slice(-HISTORY_LIMIT);
    }
    renderHistory();
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    for (const colour of colourHistory) {
      const li = document.createElement("li");
      li.style.background = colour;
      historyEl.appendChild(li);
    }
  }

  function advanceColour() {
    const count = settings.colours.length;
    if (settings.order === "circle" || count <= 1) {
      colourIndex = (colourIndex + 1) % count;
    } else {
      colourIndex = Math.floor(Math.random() * count);
    }
    applyColour();
  }

  function startCycling() {
    stopCycling();
    tickHandle = setInterval(() => {
      remaining -= 0.1;
      if (remaining <= 0.05) {
        remaining = settings.interval;
        advanceColour();
      }
      timerEl.textContent = remaining.toFixed(1);
    }, 100);
    timerEl.textContent = remaining.toFixed(1);
  }

  function stopCycling() {
    if (tickHandle !== null) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function renderSettingsForm() {
    intervalInput.value = settings.interval;
    orderRandomInput.checked = settings.order === "random";
    orderCircleInput.checked = settings.order === "circle";
    colourList.innerHTML = "";
    settings.colours.forEach((colour, i) => {
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
      removeBtn.disabled = settings.colours.length <= 1;
      removeBtn.addEventListener("click", () => {
        settings.colours.splice(i, 1);
        saveSettings();
        renderSettingsForm();
      });
      li.appendChild(removeBtn);

      colourList.appendChild(li);
    });
  }

  startBtn.addEventListener("click", goToMain);
  stopBtn.addEventListener("click", goToWelcome);
  settingsBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);

  intervalInput.addEventListener("change", () => {
    const value = Number(intervalInput.value);
    settings.interval = Number.isFinite(value) && value > 0 ? value : DEFAULT_SETTINGS.interval;
    intervalInput.value = settings.interval;
    saveSettings();
  });

  for (const input of [orderRandomInput, orderCircleInput]) {
    input.addEventListener("change", () => {
      settings.order = orderCircleInput.checked ? "circle" : "random";
      saveSettings();
    });
  }

  addColourBtn.addEventListener("click", () => {
    const value = newColourInput.value;
    if (settings.colours.includes(value)) return;
    settings.colours.push(value);
    saveSettings();
    renderSettingsForm();
  });

  resetBtn.addEventListener("click", () => {
    settings = structuredClone(DEFAULT_SETTINGS);
    saveSettings();
    renderSettingsForm();
  });

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    // Local dev must always reflect whatever's currently on disk. sw.js's CACHE_NAME only changes
    // on a real deploy (the __CACHE_VERSION__ placeholder is substituted by CI, never locally), so
    // a service worker registered here would serve one fixed snapshot forever, silently ignoring
    // every subsequent edit and every ?v=N cache-bust. Actively unregister here too (not just skip
    // future registration) so a *previously* registered local SW self-heals on the next load instead
    // of requiring a manual DevTools "Unregister".
    if (["localhost", "127.0.0.1"].includes(location.hostname)) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });

    // A new SW takes control after skipWaiting()/clients.claim() once the previous
    // page's assets are all replaced — reload once so the page picks up the update.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  footerVersionEl.textContent = `v${ASSET_VERSION}`;
  showView("welcome");
  registerServiceWorker();
})();

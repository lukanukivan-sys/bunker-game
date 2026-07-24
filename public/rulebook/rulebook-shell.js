(function exposeRulebookShell(root, factory) {
  "use strict";
  const dependencies = {
    config: root?.SkhovyshcheRulebookConfig || (typeof module === "object" && module.exports ? require("./rulebook-config") : null),
    loader: root?.SkhovyshcheRulebookLoader || (typeof module === "object" && module.exports ? require("./rulebook-loader") : null),
    model: root?.SkhovyshcheRulebookModel || (typeof module === "object" && module.exports ? require("./rulebook-model") : null),
    layout: root?.SkhovyshcheRulebookLayout || (typeof module === "object" && module.exports ? require("./page-layout") : null),
    pageTurn: root?.SkhovyshcheRulebookPageTurn || (typeof module === "object" && module.exports ? require("./page-turn") : null),
    renderer: root?.SkhovyshcheRulebookRenderer || (typeof module === "object" && module.exports ? require("./rulebook-renderer") : null),
    search: root?.SkhovyshcheRulebookSearch || (typeof module === "object" && module.exports ? require("./rulebook-search") : null),
    library: root?.SkhovyshcheRulebookLibrary || (typeof module === "object" && module.exports ? require("./rulebook-library") : null),
    audio: root?.SkhovyshcheRulebookAudio || (typeof module === "object" && module.exports ? require("./rulebook-audio") : null),
    feedback: root?.SkhovyshcheRulebookFeedback || (typeof module === "object" && module.exports ? require("./rulebook-feedback") : null)
  };
  const api = factory(root, dependencies);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebook = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookShellApi(root, deps) {
  "use strict";

  function requiredDependency(name) {
    if (!deps[name]) throw new Error(`Модуль довідника «${name}» недоступний`);
    return deps[name];
  }

  function createRulebookShell(options = {}) {
    const documentRef = options.document || root?.document;
    const windowRef = options.window || root;
    if (!documentRef || !windowRef) throw new Error("Для оболонки довідника потрібен DOM");

    const config = requiredDependency("config");
    const loader = requiredDependency("loader");
    const modelApi = requiredDependency("model");
    const layoutApi = requiredDependency("layout");
    const turnApi = requiredDependency("pageTurn");
    const renderer = requiredDependency("renderer");
    const searchApi = requiredDependency("search");
    const libraryApi = requiredDependency("library");
    const audioApi = requiredDependency("audio");
    const feedbackApi = requiredDependency("feedback");

    const elements = {
      backdrop: documentRef.getElementById("rulebookBackdrop"),
      dialog: documentRef.getElementById("rulebookDialog"),
      close: documentRef.getElementById("rulebookClose"),
      skipToPage: documentRef.getElementById("rulebookSkipToPage"),
      previous: documentRef.getElementById("rulebookPrevious"),
      next: documentRef.getElementById("rulebookNext"),
      viewport: documentRef.getElementById("rulebookViewport"),
      left: documentRef.getElementById("rulebookLeftPage"),
      right: documentRef.getElementById("rulebookRightPage"),
      spine: documentRef.getElementById("rulebookSpine"),
      turnLayer: documentRef.getElementById("rulebookTurnLayer"),
      title: documentRef.getElementById("rulebookCurrentTitle"),
      counter: documentRef.getElementById("rulebookPageCounter"),
      live: documentRef.getElementById("rulebookLiveRegion"),
      loading: documentRef.getElementById("rulebookLoading"),
      previousEdge: documentRef.getElementById("rulebookPreviousEdge"),
      nextEdge: documentRef.getElementById("rulebookNextEdge"),
      contentsButton: documentRef.getElementById("rulebookContentsButton"),
      filterButton: documentRef.getElementById("rulebookFilterButton"),
      searchButton: documentRef.getElementById("rulebookSearchButton"),
      bookmarkButton: documentRef.getElementById("rulebookBookmarkButton"),
      libraryButton: documentRef.getElementById("rulebookLibraryButton"),
      settingsButton: documentRef.getElementById("rulebookSettingsButton"),
      soundButton: documentRef.getElementById("rulebookSoundButton"),
      drawer: documentRef.getElementById("rulebookDrawer"),
      drawerTitle: documentRef.getElementById("rulebookDrawerTitle"),
      drawerContent: documentRef.getElementById("rulebookDrawerContent"),
      drawerClose: documentRef.getElementById("rulebookDrawerClose"),
      drawerScrim: documentRef.getElementById("rulebookDrawerScrim")
    };
    for (const [name, element] of Object.entries(elements)) {
      if (!element) throw new Error(`Відсутній елемент оболонки довідника: ${name}`);
    }

    const state = {
      bundle: null,
      model: null,
      layout: null,
      searchIndex: null,
      library: null,
      audio: audioApi.createRulebookAudio({ storage: windowRef.localStorage || null, AudioCtor: windowRef.Audio }),
      feedback: feedbackApi.createRulebookFeedback({ storage: windowRef.localStorage || null }),
      renderCache: new Map(),
      reading: { textScale: 1, lineHeight: "comfortable", contrast: "normal", motion: "full", showHints: true },
      currentPageId: config.DEFAULTS.pageId,
      motionMode: config.DEFAULTS.motion,
      open: false,
      turning: false,
      opener: null,
      touchStart: null,
      readyPromise: null,
      resizeTimer: null,
      searchTimer: null,
      drawerMode: null,
      searchQuery: "",
      filters: { audience: "all", mode: "all" },
      lastRecordedPageId: null
    };

    const READING_STORAGE_KEY = "skhovyshche.rulebook.reading.v1";

    function dispatch(name, detail = {}) {
      const eventName = config.EVENTS[name] || name;
      documentRef.dispatchEvent(new windowRef.CustomEvent(eventName, { detail }));
    }

    function safeStorageGet(key) {
      try { return windowRef.localStorage?.getItem(key) || null; } catch { return null; }
    }

    function safeStorageSet(key, value) {
      try { windowRef.localStorage?.setItem(key, value); } catch {}
    }

    function prefersReducedMotion() {
      return Boolean(windowRef.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    }

    function normalizeReadingSettings(value, ux = state.bundle?.ux) {
      const options = Array.isArray(ux?.reading?.textScaleOptions) ? ux.reading.textScaleOptions.map(Number) : [0.9, 1, 1.125, 1.25, 1.5];
      const requestedScale = Number(value?.textScale);
      const textScale = options.includes(requestedScale) ? requestedScale : Number(ux?.reading?.defaultTextScale || 1);
      const lineHeight = ["compact", "comfortable", "relaxed"].includes(value?.lineHeight) ? value.lineHeight : "comfortable";
      const contrast = value?.contrast === "high" ? "high" : "normal";
      const motion = ["full", "simple", "none"].includes(value?.motion) ? value.motion : (ux?.motion?.defaultMode || "full");
      return { textScale, lineHeight, contrast, motion, showHints: value?.showHints !== false };
    }

    function saveReadingSettings() {
      safeStorageSet(READING_STORAGE_KEY, JSON.stringify(state.reading));
    }

    function applyReadingSettings({ rerender = false } = {}) {
      state.motionMode = layoutApi.resolveMotionMode(state.bundle?.ux, {
        userSetting: state.reading.motion,
        prefersReducedMotion: prefersReducedMotion()
      });
      elements.dialog.style.setProperty("--rulebook-user-text-scale", String(state.reading.textScale));
      elements.dialog.dataset.lineHeight = state.reading.lineHeight;
      elements.dialog.dataset.contrast = state.reading.contrast;
      elements.dialog.dataset.showHints = state.reading.showHints ? "true" : "false";
      elements.dialog.dataset.motion = state.motionMode;
      if (rerender && state.model) render();
    }

    function renderedPage(page) {
      if (!page) return { title: "Сторінка", html: "" };
      if (!state.renderCache.has(page.id)) state.renderCache.set(page.id, renderer.renderPage(state.model, page));
      return state.renderCache.get(page.id);
    }

    function ensureSearchIndex() {
      if (!state.searchIndex && state.model) state.searchIndex = searchApi.createSearchIndex(state.model);
      return state.searchIndex;
    }

    function announce(message) {
      elements.live.textContent = "";
      windowRef.requestAnimationFrame(() => { elements.live.textContent = String(message || ""); });
    }

    async function ensureReady() {
      if (state.model) return state.model;
      if (!state.readyPromise) {
        elements.loading.classList.remove("hidden");
        state.readyPromise = loader.loadRulebookData({ url: options.dataUrl || config.DEFAULTS.dataUrl })
          .then((bundle) => {
            state.bundle = bundle;
            state.model = modelApi.createBookModel(bundle);
            state.feedback.setVersion(bundle.rulebookVersion);
            state.searchIndex = null;
            state.library = libraryApi.createRulebookLibrary(state.model, {
              storage: windowRef.localStorage || null,
              historyDepth: bundle.ux?.navigation?.historyDepth || 30
            });
            const remembered = bundle.ux?.navigation?.rememberLastPage
              ? safeStorageGet(bundle.ux.navigation.storageKey)
              : null;
            if (remembered && state.model.getPage(remembered)) state.currentPageId = remembered;
            try {
              const savedFilters = JSON.parse(safeStorageGet("skhovyshche.rulebook.filters.v1") || "null");
              if (savedFilters && typeof savedFilters === "object") {
                state.filters.audience = ["all", "player", "host", "technical"].includes(savedFilters.audience) ? savedFilters.audience : "all";
                state.filters.mode = ["all", "classic", "survival", "factions", "detective", "advanced"].includes(savedFilters.mode) ? savedFilters.mode : "all";
              }
            } catch {}
            try {
              const savedReading = JSON.parse(safeStorageGet(READING_STORAGE_KEY) || "null");
              state.reading = normalizeReadingSettings(savedReading || { motion: options.motionMode || config.DEFAULTS.motion }, bundle.ux);
            } catch {
              state.reading = normalizeReadingSettings({ motion: options.motionMode || config.DEFAULTS.motion }, bundle.ux);
            }
            applyReadingSettings();
            updateAudioButton();
            return state.model;
          })
          .catch((error) => {
            dispatch("loadError", { message: error.message });
            renderFatalError(error);
            throw error;
          })
          .finally(() => elements.loading.classList.add("hidden"));
      }
      return state.readyPromise;
    }

    function selectCurrentLayout() {
      const width = Math.max(0, Number(elements.dialog.clientWidth || windowRef.innerWidth || 0));
      const nextLayout = layoutApi.selectLayout(width, state.bundle.ux, state.reading.textScale);
      const changed = state.layout?.id !== nextLayout.id;
      state.layout = nextLayout;
      elements.dialog.dataset.layout = nextLayout.id;
      elements.dialog.dataset.motion = state.motionMode;
      elements.spine.classList.toggle("hidden", !nextLayout.showSpine);
      if (changed) dispatch("layoutChange", { layout: nextLayout.id });
      return nextLayout;
    }

    function pageMatchesFilters(page) {
      if (!page) return false;
      const audience = state.filters.audience;
      const mode = state.filters.mode;
      const pageAudience = Array.isArray(page.audience) ? page.audience : [page.audience || "all"];
      const pageModes = Array.isArray(page.modes) ? page.modes : [page.modes || "all"];
      const audienceMatch = audience === "all" || pageAudience.includes("all") || pageAudience.includes(audience);
      const modeMatch = mode === "all" || pageModes.includes("all") || pageModes.includes(mode);
      return audienceMatch && modeMatch;
    }

    function filterSummary() {
      const audienceLabels = { all: "усі читачі", player: "гравець", host: "ведучий", technical: "технічний супровід" };
      const modeLabels = { all: "усі режими", classic: "класичний", survival: "виживання", factions: "фракції", detective: "детектив", advanced: "розширений" };
      return `${audienceLabels[state.filters.audience] || state.filters.audience} · ${modeLabels[state.filters.mode] || state.filters.mode}`;
    }

    function buildPage(pageNumber, slot) {
      const page = state.model.getPage(pageNumber);
      const rendered = renderedPage(page);
      const matches = pageMatchesFilters(page);
      slot.dataset.pageId = page.id;
      slot.dataset.pageNumber = String(page.number);
      slot.dataset.template = page.template;
      slot.dataset.status = page.status;
      slot.dataset.filterMatch = matches ? "true" : "false";
      slot.setAttribute("aria-label", `Сторінка ${page.number + 1}: ${rendered.title}`);
      slot.setAttribute("role", "document");
      slot.tabIndex = 0;
      slot.innerHTML = rendered.html;
      if (!matches && !["cover", "back-cover"].includes(page.template)) {
        const note = documentRef.createElement("div");
        note.className = "rulebook-filter-note";
        note.textContent = `Ця сторінка не входить у поточний фільтр: ${filterSummary()}.`;
        slot.prepend(note);
      }
      for (const image of slot.querySelectorAll("img")) {
        if (!image.complete) image.addEventListener("load", () => fitPageToFrame(slot, state.layout), { once: true });
      }
      return { page, rendered };
    }

    const PAGE_FIT_LEVELS = Object.freeze(["normal", "compact", "dense", "tight"]);

    function pageOverflows(slot) {
      if (!slot || slot.classList.contains("hidden")) return false;
      return slot.scrollHeight > slot.clientHeight + 2;
    }

    function fitPageToFrame(slot, layout = state.layout) {
      if (!slot) return "normal";
      slot.removeAttribute("data-fit-overflow");
      slot.dataset.fit = "normal";
      const template = slot.dataset.template;
      if (["cover", "back-cover"].includes(template)) return "normal";
      if (layout?.id === "single-page-scroll") {
        slot.dataset.fit = "scroll";
        return "scroll";
      }
      for (const level of PAGE_FIT_LEVELS) {
        slot.dataset.fit = level;
        void slot.offsetHeight;
        if (!pageOverflows(slot)) return level;
      }
      slot.dataset.fitOverflow = "true";
      return "tight";
    }

    function fitVisiblePages(layout = state.layout) {
      const levels = [fitPageToFrame(elements.left, layout)];
      if (!elements.right.classList.contains("hidden")) levels.push(fitPageToFrame(elements.right, layout));
      elements.viewport.dataset.pageFit = levels.join("+");
      return levels;
    }

    function currentPage() {
      return state.model?.getPage(state.currentPageId) || null;
    }

    function updateBookmarkButton() {
      const bookmarked = Boolean(state.library && state.library.isBookmarked(state.currentPageId));
      elements.bookmarkButton.setAttribute("aria-pressed", bookmarked ? "true" : "false");
      elements.bookmarkButton.classList.toggle("is-active", bookmarked);
      elements.bookmarkButton.querySelector("[data-rulebook-icon]").textContent = bookmarked ? "★" : "☆";
      elements.bookmarkButton.setAttribute("aria-label", bookmarked ? "Видалити сторінку із закладок" : "Додати сторінку в закладки");
      elements.bookmarkButton.title = bookmarked ? "Видалити із закладок" : "Додати в закладки";
    }

    function updateAudioButton() {
      const settings = state.audio.getSettings();
      elements.soundButton.setAttribute("aria-pressed", settings.enabled ? "true" : "false");
      elements.soundButton.classList.toggle("is-active", settings.enabled);
      const icon = elements.soundButton.querySelector("[data-rulebook-icon]");
      if (icon) icon.textContent = settings.enabled ? "🔊" : "🔇";
      elements.soundButton.setAttribute("aria-label", settings.enabled ? "Налаштувати звуки відкриття книги; звук увімкнено" : "Налаштувати звуки відкриття книги; звук вимкнено");
    }

    function updateDrawerButtons() {
      const pairs = [
        [elements.contentsButton, "contents"],
        [elements.filterButton, "filters"],
        [elements.searchButton, "search"],
        [elements.libraryButton, "library"],
        [elements.settingsButton, "settings"],
        [elements.soundButton, "audio"]
      ];
      for (const [button, mode] of pairs) {
        const active = state.drawerMode === mode;
        button.setAttribute("aria-expanded", active ? "true" : "false");
        button.classList.toggle("is-active", active || (mode === "audio" && state.audio.getSettings().enabled));
      }
    }

    function recordCurrentPage() {
      if (!state.library || state.lastRecordedPageId === state.currentPageId) return;
      state.library.recordVisit(state.currentPageId);
      state.feedback.recordPageVisit(state.currentPageId);
      state.lastRecordedPageId = state.currentPageId;
    }

    function render() {
      if (!state.model) return;
      const layout = selectCurrentLayout();
      const current = state.model.getPage(state.currentPageId) || state.model.pages[0];
      state.currentPageId = current.id;
      const visible = layoutApi.visiblePageNumbers(state.model, current.number, layout);
      const first = buildPage(visible[0], elements.left);
      if (visible.length > 1) {
        buildPage(visible[1], elements.right);
        elements.right.classList.remove("hidden");
      } else {
        elements.right.innerHTML = "";
        elements.right.classList.add("hidden");
      }
      elements.left.classList.toggle("rulebook-page-single", visible.length === 1);
      elements.left.toggleAttribute("aria-current", true);
      elements.right.toggleAttribute("aria-current", false);
      elements.viewport.dataset.visiblePages = String(visible.length);
      fitVisiblePages(layout);
      elements.title.textContent = first.rendered.title;
      const start = visible[0] + 1;
      const end = visible.at(-1) + 1;
      elements.counter.textContent = visible.length > 1
        ? `${start}–${end} / ${state.model.pageCount}`
        : `${start} / ${state.model.pageCount}`;
      elements.previous.disabled = visible[0] <= 0;
      elements.next.disabled = visible.at(-1) >= state.model.pageCount - 1;
      elements.previousEdge.disabled = elements.previous.disabled;
      elements.nextEdge.disabled = elements.next.disabled;
      const storageKey = state.bundle.ux?.navigation?.storageKey;
      if (storageKey) safeStorageSet(storageKey, state.currentPageId);
      recordCurrentPage();
      updateBookmarkButton();
      if (state.drawerMode) renderDrawerContent(state.drawerMode);
      if (state.bundle.ux?.focus?.announcePageChanges) announce(`${first.rendered.title}. ${elements.counter.textContent}`);
      dispatch("pageChange", { pageId: state.currentPageId, visiblePages: visible, title: first.rendered.title });
    }

    function renderFatalError(error) {
      elements.left.innerHTML = `<div class="rulebook-error"><h2>Довідник недоступний</h2><p>${renderer.escapeHtml(error?.message || "Невідома помилка")}</p></div>`;
      elements.right.classList.add("hidden");
      elements.previous.disabled = true;
      elements.next.disabled = true;
      elements.previousEdge.disabled = true;
      elements.nextEdge.disabled = true;
      elements.title.textContent = "Помилка завантаження";
      elements.counter.textContent = "—";
    }

    function focusableElements() {
      return [...elements.dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.classList.contains("hidden") && !element.closest('[aria-hidden="true"]'));
    }

    function trapFocus(event) {
      if (event.key !== "Tab" || !state.open || !state.bundle?.ux?.focus?.trapInsideBook) return;
      const focusable = focusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && documentRef.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && documentRef.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function clearNode(node) {
      while (node.firstChild) node.removeChild(node.firstChild);
    }

    function makeElement(tag, className, text) {
      const element = documentRef.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }

    function pageButton(page, className = "rulebook-drawer-page") {
      const button = makeElement("button", className);
      button.type = "button";
      button.dataset.rulebookGo = page.id;
      button.dataset.pageId = page.id;
      button.classList.toggle("is-current", page.id === state.currentPageId);
      button.classList.toggle("is-filtered-out", !pageMatchesFilters(page));
      if (page.id === state.currentPageId) button.setAttribute("aria-current", "page");
      const copy = makeElement("span", "rulebook-drawer-page-copy");
      copy.append(makeElement("b", "", renderer.pageTitle(state.model, page)));
      copy.append(makeElement("small", "", `Сторінка ${page.number + 1}`));
      button.append(copy);
      return button;
    }

    function renderContentsDrawer() {
      elements.drawerTitle.textContent = "Зміст";
      const fragment = documentRef.createDocumentFragment();
      const intro = makeElement("div", "rulebook-drawer-intro");
      intro.append(makeElement("p", "", "Оберіть розділ або конкретну сторінку. Поточне місце позначено бурштиновим маркером."));
      fragment.append(intro);
      const cover = state.model.getPage("front-cover");
      if (cover) fragment.append(pageButton(cover));
      const parts = [...(state.model.manifest.parts || [])].sort((a, b) => Number(a.order) - Number(b.order));
      for (const part of parts) {
        const section = makeElement("section", "rulebook-contents-part");
        section.append(makeElement("h4", "", part.title));
        const chapters = state.model.chapters
          .filter((chapter) => chapter.part === part.id)
          .sort((a, b) => Number(a.order) - Number(b.order));
        for (const chapter of chapters) {
          const group = makeElement("div", "rulebook-contents-chapter");
          group.append(makeElement("h5", "", chapter.metadata?.title || chapter.id));
          const pages = state.model.pages.filter((page) => page.chapterId === chapter.id && pageMatchesFilters(page));
          if (!pages.length) continue;
          for (const page of pages) group.append(pageButton(page));
          section.append(group);
        }
        fragment.append(section);
      }
      elements.drawerContent.append(fragment);
    }


    function renderFiltersDrawer() {
      elements.drawerTitle.textContent = "Фільтри довідника";
      const intro = makeElement("p", "rulebook-filter-copy", "Фільтри скорочують зміст і пошук, але не змінюють нумерацію сторінок. Контекстне посилання з гри завжди відкриває потрібне правило.");
      const form = makeElement("form", "rulebook-filter-form");
      const audience = makeElement("fieldset", "rulebook-filter-group");
      audience.append(makeElement("legend", "", "Для кого"));
      for (const [value, label] of [["all", "Усі"], ["player", "Гравець"], ["host", "Ведучий"], ["technical", "Технічне"]]) {
        const item = makeElement("label", "rulebook-filter-option");
        const input = makeElement("input");
        input.type = "radio"; input.name = "rulebookAudience"; input.value = value; input.checked = state.filters.audience === value;
        const copy = makeElement("span"); copy.append(makeElement("b", "", label));
        item.append(input, copy); audience.append(item);
      }
      const mode = makeElement("fieldset", "rulebook-filter-group");
      mode.append(makeElement("legend", "", "Режим партії"));
      for (const [value, label] of [["all", "Усі режими"], ["classic", "Класичний"], ["survival", "Виживання"], ["factions", "Фракції"], ["detective", "Детектив"], ["advanced", "Розширений"]]) {
        const item = makeElement("label", "rulebook-filter-option");
        const input = makeElement("input");
        input.type = "radio"; input.name = "rulebookMode"; input.value = value; input.checked = state.filters.mode === value;
        const copy = makeElement("span"); copy.append(makeElement("b", "", label));
        item.append(input, copy); mode.append(item);
      }
      const status = makeElement("div", "rulebook-filter-status");
      status.append(makeElement("span", "", "Активний фільтр"), makeElement("strong", "", filterSummary()));
      const reset = makeElement("button", "rulebook-secondary-action", "Показувати все");
      reset.type = "button"; reset.dataset.rulebookFilterReset = "true";
      form.append(audience, mode, status, reset);
      elements.drawerContent.append(intro, form);
    }

    function appendHighlightedText(container, value, query) {
      const text = String(value || "");
      const tokens = [...new Set(searchApi.tokenize(query))].sort((a, b) => b.length - a.length);
      if (!tokens.length) { container.textContent = text; return; }
      const pattern = new RegExp(`(${tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|")})`, "giu");
      let lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        if (match.index > lastIndex) container.append(documentRef.createTextNode(text.slice(lastIndex, match.index)));
        const mark = makeElement("mark", "", match[0]);
        container.append(mark);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) container.append(documentRef.createTextNode(text.slice(lastIndex)));
    }

    function renderSearchResults(container, query) {
      clearNode(container);
      const results = ensureSearchIndex().search(query, { limit: 24, pageFilter: pageMatchesFilters });
      state.feedback.recordSearch(query, results.length);
      const status = makeElement("p", "rulebook-search-status", results.length ? `Знайдено: ${results.length}` : "Нічого не знайдено");
      container.append(status);
      if (!results.length) {
        const hint = makeElement("p", "rulebook-empty-state", "Спробуйте назву фази, режиму, дії або термін на кшталт «нічия», «медицина» чи «відновлення сеансу».");
        container.append(hint);
        return;
      }
      const list = makeElement("div", "rulebook-search-results");
      for (const result of results) {
        const button = makeElement("button", "rulebook-search-result");
        button.type = "button";
        button.dataset.rulebookGo = result.pageId;
        const header = makeElement("span", "rulebook-search-result-head");
        const title = makeElement("b");
        appendHighlightedText(title, result.title, query);
        header.append(title, makeElement("small", "", `${result.chapterTitle} · с. ${result.pageNumber + 1}`));
        const snippet = makeElement("span", "rulebook-search-snippet");
        appendHighlightedText(snippet, result.snippet, query);
        button.append(header, snippet);
        list.append(button);
      }
      container.append(list);
    }

    function renderSearchDrawer() {
      elements.drawerTitle.textContent = "Пошук у правилах";
      const form = makeElement("form", "rulebook-search-form");
      form.setAttribute("role", "search");
      const input = makeElement("input", "rulebook-search-input");
      input.id = "rulebookSearchInput";
      input.type = "search";
      input.placeholder = "Наприклад: нічия, лікування, recovery…";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.value = state.searchQuery;
      input.setAttribute("aria-label", "Пошук у довіднику");
      const clear = makeElement("button", "rulebook-search-clear", "Очистити");
      clear.type = "button";
      clear.dataset.rulebookSearchClear = "true";
      form.append(input, clear);
      const suggestions = makeElement("div", "rulebook-search-suggestions");
      for (const query of ["Швидкий старт", "голосування", "нічия", "медицина", "детектив", "відновлення сеансу"]) {
        const button = makeElement("button", "", query);
        button.type = "button";
        button.dataset.rulebookSearchQuery = query;
        suggestions.append(button);
      }
      const results = makeElement("div", "rulebook-search-output");
      results.id = "rulebookSearchResults";
      elements.drawerContent.append(form, suggestions, results);
      if (state.searchQuery.trim().length >= 2) renderSearchResults(results, state.searchQuery);
      else results.append(makeElement("p", "rulebook-empty-state", "Введіть щонайменше два символи або скористайтеся готовим запитом."));
      windowRef.requestAnimationFrame(() => input.focus());
    }

    function renderLibraryList(title, entries, kind) {
      const section = makeElement("section", "rulebook-library-section");
      const heading = makeElement("div", "rulebook-library-heading");
      heading.append(makeElement("h4", "", title), makeElement("span", "", String(entries.length)));
      section.append(heading);
      if (!entries.length) {
        section.append(makeElement("p", "rulebook-empty-state", kind === "bookmarks" ? "Закладок поки немає." : "Історія читання порожня."));
        return section;
      }
      const list = makeElement("div", "rulebook-library-list");
      for (const entry of entries) {
        const row = makeElement("div", "rulebook-library-row");
        row.append(pageButton(entry.page, "rulebook-library-page"));
        if (kind === "bookmarks") {
          const remove = makeElement("button", "rulebook-library-remove", "×");
          remove.type = "button";
          remove.dataset.rulebookRemoveBookmark = entry.pageId;
          remove.setAttribute("aria-label", `Видалити закладку «${renderer.pageTitle(state.model, entry.page)}»`);
          row.append(remove);
        }
        list.append(row);
      }
      section.append(list);
      return section;
    }

    function renderLibraryDrawer() {
      elements.drawerTitle.textContent = "Закладки та історія";
      const bookmarks = state.library.listBookmarks();
      const history = state.library.listHistory();
      elements.drawerContent.append(renderLibraryList("Закладки", bookmarks, "bookmarks"));
      const historySection = renderLibraryList("Недавні сторінки", history, "history");
      if (history.length) {
        const clear = makeElement("button", "rulebook-secondary-action", "Очистити історію");
        clear.type = "button";
        clear.dataset.rulebookClearHistory = "true";
        historySection.append(clear);
      }
      elements.drawerContent.append(historySection);
    }

    function renderReadingSettingsDrawer() {
      elements.drawerTitle.textContent = "Налаштування читання";
      const intro = makeElement("p", "rulebook-filter-copy", "Зміни застосовуються лише до довідника й зберігаються на цьому пристрої.");
      const form = makeElement("form", "rulebook-reading-form");

      const scale = makeElement("fieldset", "rulebook-filter-group");
      scale.append(makeElement("legend", "", "Розмір тексту"));
      for (const [value, label] of [[0.9, "Малий"], [1, "Звичайний"], [1.125, "Великий"], [1.25, "Дуже великий"], [1.5, "Максимальний"]]) {
        const item = makeElement("label", "rulebook-filter-option");
        const input = makeElement("input");
        input.type = "radio"; input.name = "rulebookTextScale"; input.value = String(value); input.checked = Number(state.reading.textScale) === value;
        item.append(input, makeElement("span", "", label));
        scale.append(item);
      }

      const lineHeight = makeElement("fieldset", "rulebook-filter-group");
      lineHeight.append(makeElement("legend", "", "Міжрядковий інтервал"));
      for (const [value, label] of [["compact", "Компактний"], ["comfortable", "Комфортний"], ["relaxed", "Збільшений"]]) {
        const item = makeElement("label", "rulebook-filter-option");
        const input = makeElement("input");
        input.type = "radio"; input.name = "rulebookLineHeight"; input.value = value; input.checked = state.reading.lineHeight === value;
        item.append(input, makeElement("span", "", label));
        lineHeight.append(item);
      }

      const motion = makeElement("fieldset", "rulebook-filter-group");
      motion.append(makeElement("legend", "", "Перегортання"));
      for (const [value, label] of [["full", "Повна анімація"], ["simple", "Спрощена"], ["none", "Без анімації"]]) {
        const item = makeElement("label", "rulebook-filter-option");
        const input = makeElement("input");
        input.type = "radio"; input.name = "rulebookMotion"; input.value = value; input.checked = state.reading.motion === value;
        item.append(input, makeElement("span", "", label));
        motion.append(item);
      }

      const toggles = makeElement("fieldset", "rulebook-filter-group");
      toggles.append(makeElement("legend", "", "Додатково"));
      const contrast = makeElement("label", "rulebook-switch-option");
      const contrastInput = makeElement("input");
      contrastInput.type = "checkbox"; contrastInput.id = "rulebookHighContrast"; contrastInput.checked = state.reading.contrast === "high";
      contrast.append(contrastInput, makeElement("span", "", "Підвищений контраст паперу й тексту"));
      const hints = makeElement("label", "rulebook-switch-option");
      const hintsInput = makeElement("input");
      hintsInput.type = "checkbox"; hintsInput.id = "rulebookShowHints"; hintsInput.checked = state.reading.showHints;
      hints.append(hintsInput, makeElement("span", "", "Показувати службові підказки навігації"));
      toggles.append(contrast, hints);

      const review = makeElement("fieldset", "rulebook-filter-group rulebook-review-settings");
      review.append(makeElement("legend", "", "Тестовий звіт"));
      review.append(makeElement("p", "rulebook-setting-note", "Діагностика вимкнена за замовчуванням, зберігається лише в цьому браузері й нічого не надсилає мережею."));
      const reviewToggle = makeElement("label", "rulebook-switch-option");
      const reviewInput = makeElement("input");
      reviewInput.type = "checkbox";
      reviewInput.id = "rulebookReviewEnabled";
      reviewInput.checked = state.feedback.isEnabled();
      reviewToggle.append(reviewInput, makeElement("span", "", "Збирати локальні відомості про сторінки та пошук"));
      const reviewState = state.feedback.getReport();
      const reviewSummary = makeElement("p", "rulebook-setting-note", `Відкриттів: ${reviewState.counters.opens} · переходів: ${reviewState.counters.pageTurns + reviewState.counters.directJumps} · пошуків без результату: ${reviewState.counters.searchesWithoutResults}`);
      const reviewActions = makeElement("div", "rulebook-review-actions");
      const exportButton = makeElement("button", "rulebook-secondary-action", "Експортувати звіт");
      exportButton.type = "button";
      exportButton.dataset.rulebookReviewExport = "true";
      const clearButton = makeElement("button", "rulebook-secondary-action", "Очистити звіт");
      clearButton.type = "button";
      clearButton.dataset.rulebookReviewClear = "true";
      reviewActions.append(exportButton, clearButton);
      review.append(reviewToggle, reviewSummary, reviewActions);

      const reset = makeElement("button", "rulebook-secondary-action", "Повернути стандартні налаштування");
      reset.type = "button"; reset.dataset.rulebookReadingReset = "true";
      form.append(scale, lineHeight, motion, toggles, review, reset);
      elements.drawerContent.append(intro, form);
    }

    function renderAudioDrawer() {
      elements.drawerTitle.textContent = "Звук книги";
      const settings = state.audio.getSettings();
      const panel = makeElement("section", "rulebook-audio-panel");
      panel.append(makeElement("p", "", "Перегортання сторінок завжди беззвучне. За бажанням можна ввімкнути лише тихі звуки відкриття та закриття книги."));
      const toggleLabel = makeElement("label", "rulebook-audio-toggle");
      const checkbox = makeElement("input");
      checkbox.id = "rulebookAudioEnabled";
      checkbox.type = "checkbox";
      checkbox.checked = settings.enabled;
      const toggleCopy = makeElement("span");
      toggleCopy.append(makeElement("b", "", "Звуки відкриття й закриття"), makeElement("small", "", settings.enabled ? "Увімкнено" : "Вимкнено"));
      toggleLabel.append(checkbox, toggleCopy);
      const volumeLabel = makeElement("label", "rulebook-volume-control");
      const volumeHead = makeElement("span", "rulebook-volume-head");
      volumeHead.append(makeElement("b", "", "Гучність"), makeElement("output", "", `${Math.round(settings.volume * 100)}%`));
      const range = makeElement("input");
      range.id = "rulebookVolume";
      range.type = "range";
      range.min = "0";
      range.max = "100";
      range.step = "1";
      range.value = String(Math.round(settings.volume * 100));
      range.disabled = !settings.enabled;
      volumeLabel.append(volumeHead, range);
      panel.append(toggleLabel, volumeLabel);
      elements.drawerContent.append(panel);
    }

    function renderDrawerContent(mode) {
      clearNode(elements.drawerContent);
      if (mode === "contents") renderContentsDrawer();
      else if (mode === "filters") renderFiltersDrawer();
      else if (mode === "search") renderSearchDrawer();
      else if (mode === "library") renderLibraryDrawer();
      else if (mode === "settings") renderReadingSettingsDrawer();
      else if (mode === "audio") renderAudioDrawer();
    }

    function openDrawer(mode) {
      if (!state.model) return false;
      if (state.drawerMode === mode) return closeDrawer();
      state.drawerMode = mode;
      elements.drawer.classList.add("is-open");
      elements.drawer.setAttribute("aria-hidden", "false");
      elements.drawerScrim.classList.remove("hidden");
      elements.drawerScrim.setAttribute("aria-hidden", "false");
      renderDrawerContent(mode);
      updateDrawerButtons();
      windowRef.requestAnimationFrame(() => {
        const target = elements.drawer.querySelector("input, button:not([disabled])");
        target?.focus?.();
      });
      dispatch("drawerOpen", { mode });
      return true;
    }

    function closeDrawer({ restoreFocus = true } = {}) {
      if (!state.drawerMode) return false;
      const previousMode = state.drawerMode;
      state.drawerMode = null;
      elements.drawer.classList.remove("is-open");
      elements.drawer.setAttribute("aria-hidden", "true");
      elements.drawerScrim.classList.add("hidden");
      elements.drawerScrim.setAttribute("aria-hidden", "true");
      updateDrawerButtons();
      if (restoreFocus) {
        const button = previousMode === "contents" ? elements.contentsButton
          : previousMode === "filters" ? elements.filterButton
          : previousMode === "search" ? elements.searchButton
            : previousMode === "library" ? elements.libraryButton
              : elements.soundButton;
        button.focus();
      }
      return true;
    }

    async function open(pageId) {
      state.opener = documentRef.activeElement;
      state.open = true;
      elements.backdrop.classList.remove("hidden");
      elements.backdrop.setAttribute("aria-hidden", "false");
      elements.dialog.setAttribute("aria-hidden", "false");
      documentRef.body.classList.add("rulebook-open");
      try {
        await ensureReady();
        const requested = pageId && state.model.getPage(pageId) ? pageId : state.currentPageId;
        state.currentPageId = requested;
        render();
        state.audio.play("open");
        state.feedback.recordOpen();
      } catch (error) {
        state.feedback.recordError(`load:${error?.message || "unknown"}`);
      }
      windowRef.requestAnimationFrame(() => elements.close.focus());
      dispatch("open", { pageId: state.currentPageId });
    }

    function close() {
      if (!state.open) return;
      closeDrawer({ restoreFocus: false });
      state.audio.play("close");
      state.feedback.recordClose();
      state.open = false;
      elements.backdrop.classList.add("hidden");
      elements.backdrop.setAttribute("aria-hidden", "true");
      elements.dialog.setAttribute("aria-hidden", "true");
      documentRef.body.classList.remove("rulebook-open");
      elements.turnLayer.replaceChildren();
      if (state.bundle?.ux?.focus?.restoreOpener !== false && state.opener?.focus) state.opener.focus();
      dispatch("close", { pageId: state.currentPageId });
    }

    const TURN_PRESENTATION_ATTRIBUTES = Object.freeze([
      "data-template",
      "data-status",
      "data-page-id",
      "data-page-number",
      "data-filter-match",
      "data-fit",
      "data-fit-overflow"
    ]);

    function applyPageIdentity(node, page) {
      node.dataset.pageId = page.id;
      node.dataset.pageNumber = String(page.number);
      node.dataset.template = page.template || "standard";
      node.dataset.status = page.status || "canonical";
      node.dataset.filterMatch = pageMatchesFilters(page) ? "true" : "false";
    }

    function copyPagePresentation(source, target) {
      for (const name of TURN_PRESENTATION_ATTRIBUTES) {
        if (source?.hasAttribute?.(name)) target.setAttribute(name, source.getAttribute(name));
        else target.removeAttribute(name);
      }
    }

    function measurePagePresentation(page, referenceSlot) {
      const probe = documentRef.createElement("article");
      probe.className = "rulebook-page rulebook-transition-probe";
      applyPageIdentity(probe, page);
      probe.innerHTML = renderedPage(page).html;
      const bounds = referenceSlot.getBoundingClientRect();
      Object.assign(probe.style, {
        position: "absolute",
        left: "-100000px",
        top: "0",
        width: `${Math.max(1, bounds.width || referenceSlot.clientWidth)}px`,
        height: `${Math.max(1, bounds.height || referenceSlot.clientHeight)}px`,
        visibility: "hidden",
        pointerEvents: "none",
        contain: "layout style paint"
      });
      elements.viewport.appendChild(probe);
      fitPageToFrame(probe, state.layout);
      const attributes = {};
      for (const name of TURN_PRESENTATION_ATTRIBUTES) {
        if (probe.hasAttribute(name)) attributes[name] = probe.getAttribute(name);
      }
      probe.remove();
      return attributes;
    }

    function makeTurnSnapshot(page, className, referenceSlot, sourceSlot = null) {
      const node = documentRef.createElement("article");
      node.className = className;
      node.innerHTML = renderedPage(page).html;
      applyPageIdentity(node, page);
      if (sourceSlot) {
        copyPagePresentation(sourceSlot, node);
      } else {
        const measured = measurePagePresentation(page, referenceSlot);
        for (const [name, value] of Object.entries(measured)) node.setAttribute(name, value);
      }
      node.setAttribute("aria-hidden", "true");
      return node;
    }

    function makeTurnLayers(plan, duration) {
      const isSingle = plan.sheetSide === "single";
      const sourceSlot = plan.sheetSide === "right" ? elements.right : elements.left;
      const holdSlot = plan.direction === "forward" ? elements.left : elements.right;
      const backPageNumber = isSingle
        ? plan.after[0]
        : (plan.direction === "forward" ? plan.after[0] : plan.after.at(-1));
      const revealPageNumber = isSingle
        ? plan.after[0]
        : (plan.direction === "forward" ? plan.after.at(-1) : plan.after[0]);
      const sourcePage = state.model.getPage(plan.sourcePageNumber);
      const backPage = state.model.getPage(backPageNumber);
      const revealPage = state.model.getPage(revealPageNumber);

      const sheet = documentRef.createElement("article");
      sheet.className = `rulebook-turn-sheet rulebook-turn-${plan.direction} rulebook-turn-${plan.sheetSide}`;
      sheet.dataset.frontTemplate = sourcePage?.template || sourceSlot.dataset.template || "standard";
      sheet.dataset.backTemplate = backPage?.template || "standard";
      sheet.style.setProperty("--rulebook-active-turn-duration", `${duration}ms`);
      sheet.setAttribute("aria-hidden", "true");

      const front = makeTurnSnapshot(
        sourcePage,
        "rulebook-turn-face rulebook-turn-face-front",
        sourceSlot,
        sourceSlot
      );
      const back = makeTurnSnapshot(
        backPage,
        "rulebook-turn-face rulebook-turn-face-back",
        sourceSlot
      );
      sheet.append(front, back);

      const reveal = makeTurnSnapshot(
        revealPage,
        `rulebook-turn-reveal rulebook-turn-reveal-${plan.sheetSide === "single" ? "single" : plan.sheetSide}`,
        sourceSlot
      );
      reveal.style.setProperty("--rulebook-active-turn-duration", `${duration}ms`);

      let hold = null;
      if (!isSingle) {
        const holdPage = state.model.getPage(Number(holdSlot.dataset.pageNumber));
        hold = makeTurnSnapshot(
          holdPage,
          `rulebook-turn-hold rulebook-turn-hold-${plan.direction === "forward" ? "left" : "right"}`,
          holdSlot,
          holdSlot
        );
        hold.style.setProperty("--rulebook-active-turn-duration", `${duration}ms`);
      }
      return { sheet, hold, reveal };
    }

    function waitForTurn(sheet, duration) {
      return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          windowRef.clearTimeout(timer);
          sheet.removeEventListener("animationend", finish);
          resolve();
        };
        const timer = windowRef.setTimeout(finish, duration + 140);
        sheet.addEventListener("animationend", finish, { once: true });
      });
    }

    async function nextAnimationFrame() {
      await new Promise((resolve) => windowRef.requestAnimationFrame(resolve));
    }

    async function turn(direction) {
      if (!state.model || state.turning) return false;
      const layout = selectCurrentLayout();
      const plan = turnApi.createTurnPlan(state.model, state.currentPageId, direction, layout);
      if (!plan.moved) return false;

      const duration = turnApi.animationDuration(state.bundle.ux, state.motionMode);
      if (duration <= 0) {
        state.currentPageId = plan.target.id;
        state.feedback.recordPageTurn();
        render();
        return true;
      }

      state.turning = true;
      elements.dialog.classList.add("is-turning");
      const layers = makeTurnLayers(plan, duration);
      elements.turnLayer.append(layers.reveal);
      if (layers.hold) elements.turnLayer.append(layers.hold);
      elements.turnLayer.append(layers.sheet);

      try {
        await nextAnimationFrame();
        await nextAnimationFrame();
        layers.sheet.classList.add("is-active");
        layers.hold?.classList.add("is-active");
        layers.reveal.classList.add("is-active");
        await waitForTurn(layers.sheet, duration);

        // Stable pages are updated only after the moving sheet has completed.
        // This prevents a target page from flashing through the turning layer.
        state.currentPageId = plan.target.id;
        state.feedback.recordPageTurn();
        render();
        await nextAnimationFrame();
      } finally {
        elements.turnLayer.replaceChildren();
        elements.dialog.classList.remove("is-turning");
        state.turning = false;
      }
      return true;
    }

    function goTo(pageId) {
      if (!state.model) return false;
      const page = state.model.getPage(pageId);
      if (!page) return false;
      state.currentPageId = page.id;
      state.feedback.recordDirectJump();
      closeDrawer({ restoreFocus: false });
      render();
      elements.dialog.focus();
      return true;
    }

    function toggleCurrentBookmark() {
      if (!state.library || !state.model.getPage(state.currentPageId)) return false;
      const bookmarked = state.library.toggleBookmark(state.currentPageId);
      updateBookmarkButton();
      if (state.drawerMode === "library") renderDrawerContent("library");
      announce(bookmarked ? "Сторінку додано в закладки" : "Сторінку видалено із закладок");
      dispatch("bookmarkChange", { pageId: state.currentPageId, bookmarked });
      return bookmarked;
    }

    function isEditableTarget(target) {
      return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
    }

    function handleKeyboard(event) {
      if (!state.open) return;
      trapFocus(event);
      if (event.defaultPrevented) return;
      const key = event.key;
      if ((event.ctrlKey || event.metaKey) && key.toLocaleLowerCase("uk-UA") === "f") {
        event.preventDefault();
        openDrawer("search");
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        if (state.drawerMode) closeDrawer();
        else close();
        return;
      }
      if (state.drawerMode || isEditableTarget(event.target)) return;
      if (key === "ArrowRight" || key === "PageDown") {
        event.preventDefault();
        turn("forward");
      } else if (key === "ArrowLeft" || key === "PageUp") {
        event.preventDefault();
        turn("backward");
      } else if (key === "Home") {
        event.preventDefault();
        goTo(state.model.pages[0].id);
      } else if (key === "End") {
        event.preventDefault();
        goTo(state.model.pages.at(-1).id);
      }
    }

    function handleTouchStart(event) {
      const touch = event.changedTouches?.[0];
      if (!touch || state.drawerMode) return;
      state.touchStart = { x: touch.clientX, y: touch.clientY, at: Date.now() };
    }

    function handleTouchEnd(event) {
      const touch = event.changedTouches?.[0];
      const start = state.touchStart;
      state.touchStart = null;
      if (!touch || !start || !state.bundle || state.drawerMode) return;
      const gestures = state.bundle.ux?.gestures || {};
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const duration = Date.now() - start.at;
      if (duration > Number(gestures.maximumSwipeDurationMs || 700)) return;
      if (Math.abs(dx) < Number(gestures.minimumSwipeDistancePx || 44)) return;
      if (Math.abs(dx) < Math.abs(dy) * Number(gestures.axisLockRatio || 1.35)) return;
      turn(dx < 0 ? "forward" : "backward");
    }


    function handleInteractiveExample(event) {
      const actionButton = event.target.closest("[data-rulebook-example-action]");
      if (!actionButton) return false;
      const example = actionButton.closest("[data-rulebook-example]");
      if (!example) return false;
      const action = actionButton.dataset.rulebookExampleAction;
      const output = example.querySelector("[data-rulebook-example-output]");
      if (action === "phase") {
        const descriptions = [
          "Відкрийте дозволені характеристики й підтвердьте вибір.",
          "Порівняйте відкриті дані та сформулюйте аргументи.",
          "Ознайомтеся з проблемою й доступними рішеннями.",
          "Проголосуйте або виконайте дію, визначену режимом.",
          "Сервер застосовує результат і готує наступний цикл."
        ];
        const index = Math.max(0, Math.min(descriptions.length - 1, Number(actionButton.dataset.phaseIndex || 0)));
        example.querySelectorAll("[data-rulebook-example-action='phase']").forEach((button) => button.classList.toggle("is-active", button === actionButton));
        if (output) output.textContent = descriptions[index];
        return true;
      }
      if (action === "vote") {
        const counts = [...example.querySelectorAll("[data-vote-count]")];
        const total = counts.reduce((sum, node) => sum + Number(node.textContent || 0), 0);
        if (total >= 5) return true;
        const target = example.querySelector(`[data-vote-count="${actionButton.dataset.candidate}"]`);
        if (target) target.textContent = String(Number(target.textContent || 0) + 1);
        const updated = counts.map((node) => ({ candidate: node.dataset.voteCount, count: Number(node.textContent || 0) }));
        const updatedTotal = updated.reduce((sum, item) => sum + item.count, 0);
        if (updatedTotal < 5) {
          if (output) output.textContent = `Подано ${updatedTotal} із 5 голосів.`;
        } else {
          const max = Math.max(...updated.map((item) => item.count));
          const leaders = updated.filter((item) => item.count === max).map((item) => item.candidate);
          if (output) output.textContent = leaders.length > 1
            ? `Нічия між кандидатами ${leaders.join(" і ")}. Застосуйте правило нічиєї цієї партії.`
            : `Лідирує кандидат ${leaders[0]}: ${max} голоси.`;
        }
        return true;
      }
      if (action === "reset-vote") {
        example.querySelectorAll("[data-vote-count]").forEach((node) => { node.textContent = "0"; });
        if (output) output.textContent = "Подано 0 із 5 голосів.";
        return true;
      }
      if (action === "recovery-next" || action === "recovery-reset") {
        const steps = [...example.querySelectorAll(".rulebook-recovery-demo li")];
        let index = action === "recovery-reset" ? 0 : Math.min(steps.length - 1, Number(example.dataset.step || 0) + 1);
        example.dataset.step = String(index);
        steps.forEach((step, stepIndex) => step.classList.toggle("is-active", stepIndex === index));
        if (output) output.textContent = `Крок ${index + 1} із ${steps.length}.`;
        return true;
      }
      return false;
    }

    function exportLocalReview() {
      const source = state.feedback.serialize(true);
      const blob = new windowRef.Blob([source], { type: "application/json;charset=utf-8" });
      const url = windowRef.URL.createObjectURL(blob);
      const link = documentRef.createElement("a");
      link.href = url;
      link.download = `skhovyshche-rulebook-review-${state.bundle?.rulebookVersion || "unknown"}.json`;
      link.hidden = true;
      documentRef.body.append(link);
      link.click();
      link.remove();
      windowRef.setTimeout(() => windowRef.URL.revokeObjectURL(url), 0);
    }

    function handleDrawerClick(event) {
      const target = event.target.closest("[data-rulebook-go]");
      if (target) { goTo(target.dataset.rulebookGo); return; }
      const queryButton = event.target.closest("[data-rulebook-search-query]");
      if (queryButton) {
        state.searchQuery = queryButton.dataset.rulebookSearchQuery || "";
        renderDrawerContent("search");
        return;
      }
      if (event.target.closest("[data-rulebook-search-clear]")) {
        state.searchQuery = "";
        renderDrawerContent("search");
        return;
      }
      const remove = event.target.closest("[data-rulebook-remove-bookmark]");
      if (remove) {
        state.library.removeBookmark(remove.dataset.rulebookRemoveBookmark);
        updateBookmarkButton();
        renderDrawerContent("library");
        announce("Закладку видалено");
        return;
      }
      if (event.target.closest("[data-rulebook-clear-history]")) {
        state.library.clearHistory();
        renderDrawerContent("library");
        announce("Історію читання очищено");
        return;
      }
      if (event.target.closest("[data-rulebook-filter-reset]")) {
        state.filters = { audience: "all", mode: "all" };
        safeStorageSet("skhovyshche.rulebook.filters.v1", JSON.stringify(state.filters));
        render();
        renderDrawerContent("filters");
        announce("Фільтри довідника скинуто");
        return;
      }
      if (event.target.closest("[data-rulebook-reading-reset]")) {
        state.reading = normalizeReadingSettings({}, state.bundle?.ux);
        saveReadingSettings();
        applyReadingSettings({ rerender: true });
        renderDrawerContent("settings");
        announce("Налаштування читання повернуто до стандартних");
        return;
      }
      if (event.target.closest("[data-rulebook-review-export]")) {
        exportLocalReview();
        announce("Локальний тестовий звіт підготовлено");
        return;
      }
      if (event.target.closest("[data-rulebook-review-clear]")) {
        state.feedback.clear();
        renderDrawerContent("settings");
        announce("Локальний тестовий звіт очищено");
        return;
      }
    }

    function handleDrawerInput(event) {
      if (event.target.id === "rulebookSearchInput") {
        state.searchQuery = event.target.value;
        windowRef.clearTimeout(state.searchTimer);
        state.searchTimer = windowRef.setTimeout(() => {
          const output = documentRef.getElementById("rulebookSearchResults");
          if (output) {
            if (state.searchQuery.trim().length >= 2) renderSearchResults(output, state.searchQuery);
            else { clearNode(output); output.append(makeElement("p", "rulebook-empty-state", "Введіть щонайменше два символи або скористайтеся готовим запитом.")); }
          }
        }, 110);
      } else if (event.target.id === "rulebookVolume") {
        const volume = state.audio.setVolume(Number(event.target.value) / 100);
        const output = event.target.closest("label")?.querySelector("output");
        if (output) output.textContent = `${Math.round(volume * 100)}%`;
        updateAudioButton();
        dispatch("audioChange", state.audio.getSettings());
      }
    }

    function handleDrawerChange(event) {
      if (["rulebookTextScale", "rulebookLineHeight", "rulebookMotion"].includes(event.target.name) || ["rulebookHighContrast", "rulebookShowHints"].includes(event.target.id)) {
        if (event.target.name === "rulebookTextScale") state.reading.textScale = Number(event.target.value);
        if (event.target.name === "rulebookLineHeight") state.reading.lineHeight = event.target.value;
        if (event.target.name === "rulebookMotion") state.reading.motion = event.target.value;
        if (event.target.id === "rulebookHighContrast") state.reading.contrast = event.target.checked ? "high" : "normal";
        if (event.target.id === "rulebookShowHints") state.reading.showHints = event.target.checked;
        state.reading = normalizeReadingSettings(state.reading, state.bundle?.ux);
        saveReadingSettings();
        applyReadingSettings({ rerender: true });
        renderDrawerContent("settings");
        announce("Налаштування читання оновлено");
        return;
      }
      if (event.target.name === "rulebookAudience" || event.target.name === "rulebookMode") {
        if (event.target.name === "rulebookAudience") state.filters.audience = event.target.value;
        else state.filters.mode = event.target.value;
        safeStorageSet("skhovyshche.rulebook.filters.v1", JSON.stringify(state.filters));
        render();
        renderDrawerContent("filters");
        announce(`Фільтр змінено: ${filterSummary()}`);
        dispatch("filterChange", { ...state.filters });
        return;
      }
      if (event.target.id === "rulebookReviewEnabled") {
        state.feedback.setEnabled(event.target.checked);
        renderDrawerContent("settings");
        announce(event.target.checked ? "Локальну діагностику довідника увімкнено" : "Локальну діагностику довідника вимкнено");
        dispatch("feedbackChange", { enabled: state.feedback.isEnabled() });
        return;
      }
      if (event.target.id !== "rulebookAudioEnabled") return;
      state.audio.setEnabled(event.target.checked);
      updateAudioButton();
      renderDrawerContent("audio");
      announce(event.target.checked ? "Звуки відкриття книги увімкнено" : "Звуки книги вимкнено");
      dispatch("audioChange", state.audio.getSettings());
    }

    function bind() {
      documentRef.addEventListener("click", (event) => {
        const opener = event.target.closest?.("[data-rulebook-open]");
        if (opener && !opener.closest("#rulebookDialog")) open(opener.dataset.rulebookOpen || null);
      });
      elements.close.addEventListener("click", close);
      elements.skipToPage.addEventListener("click", () => elements.left.focus());
      elements.previous.addEventListener("click", () => turn("backward"));
      elements.next.addEventListener("click", () => turn("forward"));
      elements.previousEdge.addEventListener("click", () => turn("backward"));
      elements.nextEdge.addEventListener("click", () => turn("forward"));
      elements.contentsButton.addEventListener("click", () => openDrawer("contents"));
      elements.filterButton.addEventListener("click", () => openDrawer("filters"));
      elements.searchButton.addEventListener("click", () => openDrawer("search"));
      elements.bookmarkButton.addEventListener("click", toggleCurrentBookmark);
      elements.libraryButton.addEventListener("click", () => openDrawer("library"));
      elements.settingsButton.addEventListener("click", () => openDrawer("settings"));
      elements.soundButton.addEventListener("click", () => openDrawer("audio"));
      elements.drawerClose.addEventListener("click", () => closeDrawer());
      elements.drawerScrim.addEventListener("click", () => closeDrawer());
      elements.backdrop.addEventListener("click", (event) => { if (event.target === elements.backdrop) close(); });
      elements.dialog.addEventListener("click", (event) => {
        if (handleInteractiveExample(event)) return;
        const next = event.target.closest("[data-rulebook-next]");
        if (next) turn("forward");
        const target = event.target.closest("[data-rulebook-go]");
        if (target && !target.closest("#rulebookDrawer")) goTo(target.dataset.rulebookGo);
      });
      elements.drawer.addEventListener("click", handleDrawerClick);
      elements.drawer.addEventListener("input", handleDrawerInput);
      elements.drawer.addEventListener("change", handleDrawerChange);
      elements.viewport.addEventListener("touchstart", handleTouchStart, { passive: true });
      elements.viewport.addEventListener("touchend", handleTouchEnd, { passive: true });
      documentRef.addEventListener("keydown", handleKeyboard);
      windowRef.addEventListener("resize", () => {
        if (!state.open || !state.model) return;
        windowRef.clearTimeout(state.resizeTimer);
        state.resizeTimer = windowRef.setTimeout(render, 100);
      });
    }

    bind();
    updateAudioButton();
    updateDrawerButtons();

    return Object.freeze({
      close,
      closeDrawer,
      ensureReady,
      getState: () => ({
        currentPageId: state.currentPageId,
        drawerMode: state.drawerMode,
        layoutId: state.layout?.id || null,
        motionMode: state.motionMode,
        open: state.open,
        pageCount: state.model?.pageCount || 0,
        searchQuery: state.searchQuery,
        filters: { ...state.filters },
        turning: state.turning,
        audio: state.audio.getSettings(),
        reading: { ...state.reading },
        searchReady: Boolean(state.searchIndex),
        feedback: state.feedback.getReport(),
        pageFit: elements.viewport.dataset.pageFit || "normal"
      }),
      goTo,
      open,
      openDrawer,
      render,
      toggleCurrentBookmark,
      turn
    });
  }

  function initializeRulebookShell(options = {}) {
    if (!root?.document) return null;
    const shell = createRulebookShell(options);
    root.skhovyshcheRulebook = shell;
    return shell;
  }

  if (root?.document) {
    const start = () => initializeRulebookShell();
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }

  return Object.freeze({ createRulebookShell, initializeRulebookShell });
});

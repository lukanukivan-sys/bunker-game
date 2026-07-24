(function exposeRulebookFeedback(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookFeedback = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookFeedbackApi() {
  "use strict";

  const SCHEMA = "rulebook-local-review-v1";
  const DEFAULT_STORAGE_KEY = "skhovyshche.rulebook.review.v1";
  const MAX_FAILED_QUERIES = 20;
  const MAX_ERRORS = 20;

  function emptyReport(version = "unknown", now = Date.now()) {
    return {
      schema: SCHEMA,
      version: String(version || "unknown"),
      enabled: false,
      startedAt: null,
      updatedAt: Number(now || Date.now()),
      counters: {
        opens: 0,
        closes: 0,
        pageTurns: 0,
        directJumps: 0,
        searches: 0,
        searchesWithoutResults: 0
      },
      pageVisits: {},
      failedQueries: [],
      errors: []
    };
  }

  function safeRead(storage, key, fallback) {
    try {
      const raw = storage?.getItem?.(key);
      if (!raw) return fallback;
      const value = JSON.parse(raw);
      return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function safeWrite(storage, key, value) {
    try {
      storage?.setItem?.(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function sanitizeQuery(value) {
    return String(value || "")
      .replace(/https?:\/\/\S+/giu, "[посилання]")
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu, "[email]")
      .replace(/\b[A-Z0-9_-]{20,}\b/gu, "[секрет]")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 80);
  }

  function normalizeReport(value, version, now) {
    const base = emptyReport(version, now);
    if (!value || value.schema !== SCHEMA) return base;
    const counters = { ...base.counters };
    for (const key of Object.keys(counters)) counters[key] = Math.max(0, Number(value.counters?.[key] || 0));
    const pageVisits = {};
    for (const [pageId, count] of Object.entries(value.pageVisits || {})) {
      if (/^[a-z0-9][a-z0-9-]{0,79}$/u.test(pageId)) pageVisits[pageId] = Math.max(0, Number(count || 0));
    }
    return {
      ...base,
      version: String(version || value.version || "unknown"),
      enabled: value.enabled === true,
      startedAt: Number.isFinite(Number(value.startedAt)) ? Number(value.startedAt) : null,
      updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : Number(now),
      counters,
      pageVisits,
      failedQueries: Array.isArray(value.failedQueries)
        ? value.failedQueries.map(sanitizeQuery).filter(Boolean).slice(0, MAX_FAILED_QUERIES)
        : [],
      errors: Array.isArray(value.errors)
        ? value.errors.map((item) => String(item || "").slice(0, 120)).filter(Boolean).slice(0, MAX_ERRORS)
        : []
    };
  }

  function createRulebookFeedback(options = {}) {
    const storage = options.storage || null;
    const key = options.storageKey || DEFAULT_STORAGE_KEY;
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    let report = normalizeReport(safeRead(storage, key, null), options.version || "unknown", now());

    function persist() {
      report.updatedAt = now();
      safeWrite(storage, key, report);
    }

    function mutate(callback) {
      if (!report.enabled) return false;
      callback(report);
      persist();
      return true;
    }

    function setEnabled(enabled) {
      report.enabled = Boolean(enabled);
      if (report.enabled && !report.startedAt) report.startedAt = now();
      persist();
      return report.enabled;
    }

    function setVersion(version) {
      report.version = String(version || "unknown");
      persist();
      return report.version;
    }

    function recordCounter(name) {
      return mutate((draft) => {
        if (Object.hasOwn(draft.counters, name)) draft.counters[name] += 1;
      });
    }

    function recordPageVisit(pageId) {
      const safePageId = String(pageId || "");
      if (!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(safePageId)) return false;
      return mutate((draft) => {
        draft.pageVisits[safePageId] = Number(draft.pageVisits[safePageId] || 0) + 1;
      });
    }

    function recordSearch(query, resultCount) {
      return mutate((draft) => {
        draft.counters.searches += 1;
        if (Number(resultCount || 0) > 0) return;
        draft.counters.searchesWithoutResults += 1;
        const safe = sanitizeQuery(query);
        if (safe && !draft.failedQueries.includes(safe)) draft.failedQueries.unshift(safe);
        draft.failedQueries = draft.failedQueries.slice(0, MAX_FAILED_QUERIES);
      });
    }

    function recordError(code) {
      return mutate((draft) => {
        const safe = String(code || "unknown").replace(/\s+/gu, " ").trim().slice(0, 120);
        if (safe) draft.errors.unshift(safe);
        draft.errors = draft.errors.slice(0, MAX_ERRORS);
      });
    }

    function clear() {
      const enabled = report.enabled;
      const version = report.version;
      report = emptyReport(version, now());
      report.enabled = enabled;
      if (enabled) report.startedAt = now();
      persist();
      return getReport();
    }

    function getReport() {
      return JSON.parse(JSON.stringify(report));
    }

    function serialize(pretty = true) {
      return JSON.stringify(getReport(), null, pretty ? 2 : 0);
    }

    return Object.freeze({
      clear,
      getReport,
      isEnabled: () => report.enabled,
      recordClose: () => recordCounter("closes"),
      recordDirectJump: () => recordCounter("directJumps"),
      recordError,
      recordOpen: () => recordCounter("opens"),
      recordPageTurn: () => recordCounter("pageTurns"),
      recordPageVisit,
      recordSearch,
      serialize,
      setEnabled,
      setVersion
    });
  }

  return Object.freeze({
    DEFAULT_STORAGE_KEY,
    SCHEMA,
    createRulebookFeedback,
    emptyReport,
    normalizeReport,
    sanitizeQuery
  });
});

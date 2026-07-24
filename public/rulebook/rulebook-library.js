(function exposeRulebookLibrary(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookLibrary = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookLibraryApi() {
  "use strict";

  const DEFAULT_KEYS = Object.freeze({
    bookmarks: "skhovyshche.rulebook.bookmarks",
    history: "skhovyshche.rulebook.history"
  });

  function safeRead(storage, key, fallback = []) {
    try {
      const raw = storage?.getItem?.(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
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

  function createRulebookLibrary(model, options = {}) {
    if (!model) throw new Error("Для закладок потрібна модель книги");
    const storage = options.storage || null;
    const keys = { ...DEFAULT_KEYS, ...(options.keys || {}) };
    const historyDepth = Math.min(100, Math.max(1, Number(options.historyDepth || 30)));
    const now = typeof options.now === "function" ? options.now : () => Date.now();

    const validPageId = (pageId) => typeof pageId === "string" && Boolean(model.getPage(pageId));
    let bookmarks = safeRead(storage, keys.bookmarks)
      .filter((entry) => entry && validPageId(entry.pageId))
      .map((entry) => ({ pageId: entry.pageId, addedAt: Number(entry.addedAt || 0) }))
      .filter((entry, index, array) => array.findIndex((candidate) => candidate.pageId === entry.pageId) === index);
    let history = safeRead(storage, keys.history)
      .filter((entry) => entry && validPageId(entry.pageId))
      .map((entry) => ({ pageId: entry.pageId, visitedAt: Number(entry.visitedAt || 0) }))
      .filter((entry, index, array) => array.findIndex((candidate) => candidate.pageId === entry.pageId) === index)
      .slice(0, historyDepth);

    function persistBookmarks() { safeWrite(storage, keys.bookmarks, bookmarks); }
    function persistHistory() { safeWrite(storage, keys.history, history); }

    function isBookmarked(pageId) {
      return bookmarks.some((entry) => entry.pageId === pageId);
    }

    function addBookmark(pageId) {
      if (!validPageId(pageId)) return false;
      if (isBookmarked(pageId)) return true;
      bookmarks = [{ pageId, addedAt: now() }, ...bookmarks];
      persistBookmarks();
      return true;
    }

    function removeBookmark(pageId) {
      const before = bookmarks.length;
      bookmarks = bookmarks.filter((entry) => entry.pageId !== pageId);
      if (bookmarks.length !== before) persistBookmarks();
      return bookmarks.length !== before;
    }

    function toggleBookmark(pageId) {
      if (isBookmarked(pageId)) {
        removeBookmark(pageId);
        return false;
      }
      return addBookmark(pageId);
    }

    function recordVisit(pageId) {
      if (!validPageId(pageId)) return false;
      history = [{ pageId, visitedAt: now() }, ...history.filter((entry) => entry.pageId !== pageId)].slice(0, historyDepth);
      persistHistory();
      return true;
    }

    function clearHistory() {
      history = [];
      persistHistory();
    }

    function hydrate(entries) {
      return entries.map((entry) => ({ ...entry, page: model.getPage(entry.pageId) })).filter((entry) => entry.page);
    }

    return Object.freeze({
      addBookmark,
      clearHistory,
      isBookmarked,
      listBookmarks: () => hydrate(bookmarks),
      listHistory: () => hydrate(history),
      recordVisit,
      removeBookmark,
      toggleBookmark
    });
  }

  return Object.freeze({ DEFAULT_KEYS, createRulebookLibrary, safeRead, safeWrite });
});

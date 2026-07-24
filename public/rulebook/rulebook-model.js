(function exposeRulebookModel(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookModelApi() {
  "use strict";

  function invariant(condition, message) {
    if (!condition) throw new Error(message);
  }

  function normalizePageNumber(value, pageCount) {
    invariant(Number.isInteger(pageCount) && pageCount > 0, "pageCount має бути додатним цілим числом");
    const number = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
    return Math.min(pageCount - 1, Math.max(0, number));
  }

  function buildUniqueIndex(items, keyName, label) {
    const index = new Map();
    for (const item of items || []) {
      const key = item?.[keyName];
      invariant(key !== undefined && key !== null && key !== "", `${label}: відсутній ${keyName}`);
      invariant(!index.has(key), `${label}: дубль ${String(key)}`);
      index.set(key, item);
    }
    return index;
  }

  function createBookModel(bundle) {
    invariant(bundle && typeof bundle === "object", "Потрібен runtime bundle довідника");
    const manifest = bundle.manifest;
    const bookMap = bundle.bookMap;
    invariant(manifest && bookMap, "Runtime bundle не містить manifest або bookMap");
    invariant(Array.isArray(bookMap.pages) && bookMap.pages.length > 0, "Карта книги не містить сторінок");

    const pages = [...bookMap.pages].sort((a, b) => a.number - b.number);
    const pageById = buildUniqueIndex(pages, "id", "Сторінка");
    const pageByNumber = buildUniqueIndex(pages, "number", "Номер сторінки");
    const spreadById = buildUniqueIndex(bookMap.spreads || [], "id", "Розворот");
    const spreadByPageNumber = new Map();

    for (const spread of bookMap.spreads || []) {
      invariant(pageByNumber.has(spread.left), `Розворот ${spread.id}: невідома ліва сторінка ${spread.left}`);
      invariant(pageByNumber.has(spread.right), `Розворот ${spread.id}: невідома права сторінка ${spread.right}`);
      invariant(!spreadByPageNumber.has(spread.left), `Сторінка ${spread.left} входить у кілька розворотів`);
      invariant(!spreadByPageNumber.has(spread.right), `Сторінка ${spread.right} входить у кілька розворотів`);
      spreadByPageNumber.set(spread.left, spread);
      spreadByPageNumber.set(spread.right, spread);
    }

    const chapters = bundle.chapters || [];
    const chapterById = buildUniqueIndex(chapters, "id", "Розділ");

    function getPage(target) {
      if (typeof target === "string") return pageById.get(target) || null;
      if (Number.isInteger(target)) return pageByNumber.get(normalizePageNumber(target, pages.length)) || null;
      return null;
    }

    function getSpread(target) {
      if (typeof target === "string" && spreadById.has(target)) return spreadById.get(target);
      const page = getPage(target);
      return page ? spreadByPageNumber.get(page.number) || null : null;
    }

    function resolveAnchor(chapterId, anchor) {
      if (!chapterId || !anchor) return null;
      return pages.find((page) => page.chapterId === chapterId && page.anchor === anchor) || null;
    }

    function getAdjacentPage(target, direction) {
      const page = getPage(target);
      invariant(page, `Невідома сторінка: ${String(target)}`);
      const delta = direction === "backward" || direction === -1 ? -1 : 1;
      return pageByNumber.get(normalizePageNumber(page.number + delta, pages.length)) || page;
    }

    return Object.freeze({
      manifest,
      bookMap,
      contentDigest: bundle.contentDigest,
      ux: bundle.ux,
      designTokens: bundle.designTokens,
      terminology: bundle.terminology,
      unstableRules: bundle.unstableRules,
      versionHistory: bundle.versionHistory,
      ruleChanges: bundle.ruleChanges,
      chapters,
      pages,
      pageCount: pages.length,
      pageById,
      pageByNumber,
      chapterById,
      spreadById,
      spreadByPageNumber,
      getPage,
      getSpread,
      resolveAnchor,
      getAdjacentPage
    });
  }

  return Object.freeze({ createBookModel, normalizePageNumber });
});

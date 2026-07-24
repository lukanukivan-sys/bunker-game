(function exposeRulebookPageTurn(root, factory) {
  "use strict";
  const layoutApi = root?.SkhovyshcheRulebookLayout || (typeof module === "object" && module.exports ? require("./page-layout") : null);
  const api = factory(layoutApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookPageTurn = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPageTurnApi(layoutApi) {
  "use strict";

  function normalizeDirection(direction) {
    return direction === "backward" || direction === -1 ? "backward" : "forward";
  }

  function createTurnPlan(model, currentTarget, direction, layout) {
    if (!layoutApi) throw new Error("Модуль page-layout недоступний");
    const normalizedDirection = normalizeDirection(direction);
    const current = model.getPage(currentTarget);
    if (!current) throw new Error(`Невідома поточна сторінка: ${String(currentTarget)}`);
    const target = layoutApi.turnTarget(model, current.number, normalizedDirection, layout);
    const before = layoutApi.visiblePageNumbers(model, current.number, layout);
    const after = layoutApi.visiblePageNumbers(model, target.number, layout);
    const moved = target.number !== current.number;
    const sourcePageNumber = Number(layout?.visiblePages) === 2
      ? (normalizedDirection === "forward" ? before.at(-1) : before[0])
      : before[0];
    return Object.freeze({
      direction: normalizedDirection,
      current,
      target,
      before,
      after,
      moved,
      sourcePageNumber,
      sheetSide: Number(layout?.visiblePages) === 2
        ? (normalizedDirection === "forward" ? "right" : "left")
        : "single"
    });
  }

  function animationDuration(uxConfig, motionMode) {
    if (motionMode === "none") return 0;
    const full = Math.max(0, Number(uxConfig?.motion?.durationMs || 460));
    if (motionMode === "simple") return Math.max(0, Number(uxConfig?.motion?.reducedDurationMs || Math.min(160, full)));
    return full;
  }

  return Object.freeze({ animationDuration, createTurnPlan, normalizeDirection });
});

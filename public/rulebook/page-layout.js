(function exposeRulebookLayout(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookLayout = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookLayoutApi() {
  "use strict";

  function selectLayout(width, uxConfig, textScale = 1) {
    const layouts = uxConfig?.layouts;
    if (!layouts) throw new Error("UX-конфігурація не містить layouts");
    const numericWidth = Math.max(0, Number(width) || 0);
    const numericScale = Math.max(0.5, Number(textScale) || 1);
    const scrollFallbackScale = Number(uxConfig?.reading?.scrollFallbackScale || 1.25);

    if (numericScale >= scrollFallbackScale) return { ...layouts.mobile, id: "single-page-scroll", forcedByTextScale: true };
    if (numericWidth >= Number(layouts.desktop.minWidth)) return { ...layouts.desktop };
    if (numericWidth >= Number(layouts.tablet.minWidth)) return { ...layouts.tablet };
    return { ...layouts.mobile };
  }

  function visiblePageNumbers(model, target, layout) {
    const page = model.getPage(target);
    if (!page) throw new Error(`Невідома сторінка: ${String(target)}`);
    if (Number(layout.visiblePages) === 1) return [page.number];
    const spread = model.getSpread(page.number);
    return spread ? [spread.left, spread.right] : [page.number];
  }

  function turnTarget(model, target, direction, layout) {
    const page = model.getPage(target);
    if (!page) throw new Error(`Невідома сторінка: ${String(target)}`);
    const forward = direction !== "backward" && direction !== -1;
    const step = Math.max(1, Number(layout?.turnStep || 1));
    const base = Number(layout?.visiblePages) === 2
      ? (model.getSpread(page.number)?.left ?? page.number)
      : page.number;
    const candidate = base + (forward ? step : -step);
    return model.getPage(Math.min(model.pageCount - 1, Math.max(0, candidate)));
  }

  function resolveMotionMode(uxConfig, options = {}) {
    const requested = options.userSetting || uxConfig?.motion?.defaultMode || "full";
    const allowed = new Set(uxConfig?.motion?.modes || ["full", "simple", "none"]);
    if (options.prefersReducedMotion && uxConfig?.motion?.respectReducedMotion !== false) return "none";
    return allowed.has(requested) ? requested : "full";
  }

  return Object.freeze({ selectLayout, visiblePageNumbers, turnTarget, resolveMotionMode });
});

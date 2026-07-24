(function exposeRulebookConfig(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookConfig() {
  "use strict";

  const SCHEMAS = Object.freeze({
    manifest: "rulebook-manifest-v1",
    bookMap: "rulebook-book-map-v1",
    ux: "rulebook-ux-v1",
    designTokens: "rulebook-design-tokens-v1",
    runtime: "rulebook-runtime-v1"
  });

  const DEFAULTS = Object.freeze({
    dataUrl: "/rulebook/data/rulebook-data.json",
    pageId: "front-cover",
    audience: "player",
    mode: "all",
    motion: "full",
    textScale: 1
  });

  const EVENTS = Object.freeze({
    open: "rulebook:open",
    close: "rulebook:close",
    pageChange: "rulebook:page-change",
    layoutChange: "rulebook:layout-change",
    loadError: "rulebook:load-error",
    drawerOpen: "rulebook:drawer-open",
    bookmarkChange: "rulebook:bookmark-change",
    audioChange: "rulebook:audio-change",
    filterChange: "rulebook:filter-change",
    feedbackChange: "rulebook:feedback-change"
  });

  return Object.freeze({ SCHEMAS, DEFAULTS, EVENTS });
});

(function exposeRulebookLoader(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookLoader = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookLoaderApi(root) {
  "use strict";

  const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

  function isAllowedRulebookUrl(value, baseHref = root?.location?.href || "https://rulebook.local/") {
    const raw = String(value || "");
    if (!raw || raw.includes("\\") || /%2f|%5c|%00/iu.test(raw)) return false;
    try {
      const base = new URL(baseHref);
      const resolved = new URL(raw, base);
      if (resolved.origin !== base.origin) return false;
      const pathname = decodeURIComponent(resolved.pathname);
      if (!pathname.startsWith("/rulebook/") || pathname.includes("..") || pathname.includes("\u0000")) return false;
      return true;
    } catch {
      return false;
    }
  }

  function rejectDangerousKeys(value, path = "bundle") {
    if (!value || typeof value !== "object") return;
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) throw new Error(`Небезпечне поле у довіднику: ${path}.${key}`);
      rejectDangerousKeys(value[key], `${path}.${key}`);
    }
  }

  function validateRulebookBundle(bundle) {
    if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) throw new Error("Runtime bundle довідника має бути об’єктом");
    rejectDangerousKeys(bundle);
    if (bundle.schema !== "rulebook-runtime-v1") throw new Error("Несумісна схема runtime bundle довідника");
    if (!bundle.manifest || !bundle.bookMap || !Array.isArray(bundle.bookMap.pages)) throw new Error("Runtime bundle не містить карти книги");
    if (!Array.isArray(bundle.chapters) || !bundle.chapters.length) throw new Error("Runtime bundle не містить розділів");
    if (!/^[a-f0-9]{64}$/u.test(String(bundle.contentDigest || ""))) throw new Error("Runtime bundle не містить коректного SHA-256 digest");
    if (bundle.rulebookVersion !== bundle.manifest.rulebookVersion) throw new Error("Версія runtime bundle не збігається з manifest");
    if (bundle.productVersion !== bundle.manifest.productVersion) throw new Error("Версія продукту у runtime bundle не збігається з manifest");
    return bundle;
  }

  function fallbackBundle(options = {}) {
    return options.fallbackBundle || root?.SkhovyshcheRulebookFallback || null;
  }

  async function loadRulebookData(options = {}) {
    const url = options.url || "/rulebook/data/rulebook-data.json";
    const fetchImpl = options.fetchImpl || root?.fetch;
    if (!isAllowedRulebookUrl(url, options.baseHref)) throw new Error("Довідник дозволено завантажувати лише з локального шляху /rulebook/");

    let networkError = null;
    if (typeof fetchImpl === "function") {
      try {
        const response = await fetchImpl(url, {
          method: "GET",
          credentials: "same-origin",
          cache: options.cache || "no-cache",
          headers: { Accept: "application/json" },
          redirect: "error"
        });
        if (!response?.ok) throw new Error(`HTTP ${response?.status || "—"}`);
        return validateRulebookBundle(await response.json());
      } catch (error) {
        networkError = error;
      }
    } else {
      networkError = new Error("Fetch API недоступний");
    }

    const fallback = fallbackBundle(options);
    if (fallback) return validateRulebookBundle(fallback);
    throw new Error(`Не вдалося завантажити довідник і локальний fallback недоступний: ${networkError?.message || "невідома помилка"}`);
  }

  return Object.freeze({
    isAllowedRulebookUrl,
    loadRulebookData,
    rejectDangerousKeys,
    validateRulebookBundle
  });
});

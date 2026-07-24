(function exposeRulebookSearch(root, factory) {
  "use strict";
  const renderer = root?.SkhovyshcheRulebookRenderer || (typeof module === "object" && module.exports ? require("./rulebook-renderer") : null);
  const api = factory(renderer);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookSearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookSearchApi(renderer) {
  "use strict";

  const STOP_WORDS = new Set([
    "і", "й", "та", "або", "але", "а", "в", "у", "на", "до", "з", "із", "зі", "за", "для", "про", "під", "над", "між",
    "це", "цей", "ця", "ці", "того", "який", "яка", "які", "як", "що", "чи", "не", "може", "має", "бути"
  ]);

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("uk-UA")
      .replace(/[’`´]/gu, "'")
      .replace(/[^\p{L}\p{N}']+/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
  }

  function tokenize(value) {
    return normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
  }

  function markdownToText(markdown) {
    return String(markdown || "")
      .replace(/^---[\s\S]*?\n---\s*/u, "")
      .replace(/<a\s+id=["'][^"']+["']\s*><\/a>/giu, " ")
      .replace(/```[\s\S]*?```/gu, " ")
      .replace(/`([^`]+)`/gu, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/gu, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
      .replace(/^#{1,6}\s+/gmu, "")
      .replace(/^>\s?/gmu, "")
      .replace(/^[-*+]\s+/gmu, "")
      .replace(/^\d+[.)]\s+/gmu, "")
      .replace(/[|*_~]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
  }

  function getTerminologyGroups(model) {
    const terms = Array.isArray(model?.terminology) ? model.terminology : model?.terminology?.terms;
    return (terms || []).map((entry) => {
      const variants = [entry.term, ...(entry.aliases || [])].filter(Boolean);
      return {
        id: entry.id,
        term: entry.term,
        definition: entry.definition || "",
        variants,
        normalizedVariants: variants.map(normalizeText).filter(Boolean),
        tokens: new Set(variants.flatMap(tokenize))
      };
    });
  }

  function buildSnippet(text, queryTokens, maxLength = 170) {
    const source = String(text || "").replace(/\s+/gu, " ").trim();
    if (!source) return "";
    const normalizedSource = normalizeText(source);
    let normalizedIndex = -1;
    for (const token of queryTokens) {
      const index = normalizedSource.indexOf(token);
      if (index >= 0 && (normalizedIndex < 0 || index < normalizedIndex)) normalizedIndex = index;
    }
    if (source.length <= maxLength) return source;
    const approximate = normalizedIndex < 0 ? 0 : Math.max(0, normalizedIndex - Math.floor(maxLength * 0.32));
    const start = Math.min(Math.max(0, approximate), Math.max(0, source.length - maxLength));
    const end = Math.min(source.length, start + maxLength);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < source.length ? "…" : "";
    return `${prefix}${source.slice(start, end).trim()}${suffix}`;
  }

  function createSearchIndex(model) {
    if (!model || !renderer) throw new Error("Для пошуку потрібні модель книги та renderer");
    const terminology = getTerminologyGroups(model);
    const entries = model.pages.map((page) => {
      const chapter = page.chapterId ? model.chapterById.get(page.chapterId) : null;
      const section = chapter ? renderer.extractSection(chapter.markdown, page.anchor) : "";
      const body = markdownToText(section);
      const title = renderer.pageTitle(model, page);
      const chapterTitle = chapter?.metadata?.title || "Довідник";
      const keywords = (chapter?.metadata?.keywords || []).join(" ");
      const audience = Array.isArray(page.audience) ? page.audience.join(" ") : String(page.audience || "");
      const modes = (page.modes || []).join(" ");
      const titleNorm = normalizeText(title);
      const chapterNorm = normalizeText(chapterTitle);
      const keywordNorm = normalizeText(keywords);
      const bodyNorm = normalizeText(body);
      const metadataNorm = normalizeText(`${audience} ${modes} ${page.status || ""}`);
      const relatedTerms = terminology.filter((group) => group.normalizedVariants.some((variant) => bodyNorm.includes(variant) || titleNorm.includes(variant)));
      const terminologyNorm = normalizeText(relatedTerms.map((group) => `${group.term} ${group.definition} ${group.variants.join(" ")}`).join(" "));
      return Object.freeze({
        page,
        title,
        chapterTitle,
        body,
        titleNorm,
        chapterNorm,
        keywordNorm,
        bodyNorm,
        metadataNorm,
        terminologyNorm
      });
    });

    function expandQuery(query) {
      const normalized = normalizeText(query);
      const expanded = new Set(tokenize(normalized));
      for (const group of terminology) {
        if (group.normalizedVariants.some((variant) => normalized.includes(variant))) {
          for (const token of group.tokens) expanded.add(token);
          for (const token of tokenize(group.definition)) expanded.add(token);
        }
      }
      return { normalized, tokens: [...expanded] };
    }

    function search(query, options = {}) {
      const { normalized, tokens } = expandQuery(query);
      const limit = Math.min(50, Math.max(1, Number(options.limit || 20)));
      if (normalized.length < 2 || !tokens.length) return [];
      const results = [];
      for (const entry of entries) {
        if (typeof options.pageFilter === "function" && !options.pageFilter(entry.page)) continue;
        let score = 0;
        if (entry.titleNorm === normalized) score += 220;
        else if (entry.titleNorm.includes(normalized)) score += 120;
        if (entry.chapterNorm.includes(normalized)) score += 60;
        if (entry.keywordNorm.includes(normalized)) score += 90;
        if (entry.bodyNorm.includes(normalized)) score += 55;
        if (entry.terminologyNorm.includes(normalized)) score += 45;
        let matchedTokens = 0;
        for (const token of tokens) {
          let matched = false;
          if (entry.titleNorm.includes(token)) { score += 32; matched = true; }
          if (entry.chapterNorm.includes(token)) { score += 14; matched = true; }
          if (entry.keywordNorm.includes(token)) { score += 24; matched = true; }
          if (entry.bodyNorm.includes(token)) { score += 7; matched = true; }
          if (entry.terminologyNorm.includes(token)) { score += 5; matched = true; }
          if (entry.metadataNorm.includes(token)) { score += 3; matched = true; }
          if (matched) matchedTokens += 1;
        }
        if (!score || matchedTokens === 0) continue;
        score += Math.round((matchedTokens / tokens.length) * 30);
        results.push(Object.freeze({
          pageId: entry.page.id,
          pageNumber: entry.page.number,
          title: entry.title,
          chapterTitle: entry.chapterTitle,
          snippet: buildSnippet(entry.body || entry.chapterTitle, tokens),
          status: entry.page.status,
          audience: entry.page.audience,
          modes: entry.page.modes || [],
          score
        }));
      }
      return results
        .sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber)
        .slice(0, limit);
    }

    return Object.freeze({ entries, search, expandQuery, terminology });
  }

  return Object.freeze({ buildSnippet, createSearchIndex, markdownToText, normalizeText, tokenize });
});

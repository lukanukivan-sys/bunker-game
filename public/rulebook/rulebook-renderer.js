(function exposeRulebookRenderer(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookRenderer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookRendererApi() {
  "use strict";

  const STATUS_LABELS = Object.freeze({
    canonical: "Канонічне правило",
    provisional: "Уточнюється",
    reference: "Довідка",
    technical: "Технічне"
  });

  const AUDIENCE_LABELS = Object.freeze({
    all: "Для всіх",
    player: "Гравцеві",
    host: "Ведучому",
    technical: "Технічне"
  });

  const MODE_LABELS = Object.freeze({
    all: "Усі режими",
    classic: "Класичний",
    survival: "Виживання",
    factions: "Фракції",
    detective: "Детектив",
    advanced: "Розширений"
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  }

  function stripFrontMatter(markdown) {
    const source = String(markdown || "").replace(/^\uFEFF/u, "");
    if (!source.startsWith("---")) return source;
    const end = source.indexOf("\n---", 3);
    if (end < 0) return source;
    return source.slice(end + 4).replace(/^\s+/u, "");
  }

  function extractSection(markdown, anchor) {
    const source = stripFrontMatter(markdown);
    if (!anchor) return source.trim();
    const marker = new RegExp(`<a\\s+id=["']${escapeRegExp(anchor)}["']\\s*><\\/a>`, "iu");
    const match = marker.exec(source);
    if (!match) return "";
    const after = source.slice(match.index + match[0].length);
    const next = /<a\s+id=["'][^"']+["']\s*><\/a>/iu.exec(after);
    return (next ? after.slice(0, next.index) : after).trim();
  }

  function inlineMarkdown(value) {
    const codeSlots = [];
    let text = String(value || "").replace(/`([^`]+)`/gu, (_, code) => {
      const token = `\u0000CODE${codeSlots.length}\u0000`;
      codeSlots.push(`<code>${escapeHtml(code)}</code>`);
      return token;
    });
    text = escapeHtml(text);
    text = text.replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>");
    text = text.replace(/\*([^*]+)\*/gu, "<em>$1</em>");
    text = text.replace(/«([^»]+)»/gu, "<q>$1</q>");
    text = text.replace(/\u0000CODE(\d+)\u0000/gu, (_, index) => codeSlots[Number(index)] || "");
    return text;
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n?/gu, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let listType = null;
    let listItems = [];
    let quote = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html.push(`<p>${inlineMarkdown(paragraph.join(" ").trim())}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (!listType || !listItems.length) return;
      html.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${listType}>`);
      listType = null;
      listItems = [];
    };
    const flushQuote = () => {
      if (!quote.length) return;
      html.push(`<aside class="rulebook-callout">${quote.map((item) => `<p>${inlineMarkdown(item)}</p>`).join("")}</aside>`);
      quote = [];
    };
    const flushAll = () => {
      flushParagraph();
      flushList();
      flushQuote();
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line.trim()) {
        flushAll();
        continue;
      }
      const heading = /^(#{1,4})\s+(.+)$/u.exec(line);
      if (heading) {
        flushAll();
        const level = Math.min(4, Math.max(2, heading[1].length + 1));
        html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }
      const unordered = /^[-*]\s+(.+)$/u.exec(line);
      if (unordered) {
        flushParagraph();
        flushQuote();
        if (listType && listType !== "ul") flushList();
        listType = "ul";
        listItems.push(unordered[1]);
        continue;
      }
      const ordered = /^\d+[.)]\s+(.+)$/u.exec(line);
      if (ordered) {
        flushParagraph();
        flushQuote();
        if (listType && listType !== "ol") flushList();
        listType = "ol";
        listItems.push(ordered[1]);
        continue;
      }
      const quoted = /^>\s?(.*)$/u.exec(line);
      if (quoted) {
        flushParagraph();
        flushList();
        quote.push(quoted[1]);
        continue;
      }
      if (/^---+$/u.test(line)) {
        flushAll();
        html.push("<hr/>");
        continue;
      }
      flushList();
      flushQuote();
      paragraph.push(line.trim());
    }
    flushAll();
    return html.join("");
  }

  function findChapter(model, page) {
    return page?.chapterId ? model.chapterById.get(page.chapterId) || null : null;
  }

  function pageTitle(model, page) {
    if (!page) return "Сторінка";
    if (page.template === "cover") return model.manifest.title || "СХОВИЩЕ";
    if (page.template === "back-cover") return "Кінець довідника";
    const chapter = findChapter(model, page);
    const section = chapter ? extractSection(chapter.markdown, page.anchor) : "";
    const heading = /^#{1,4}\s+(.+)$/mu.exec(section);
    return heading?.[1]?.trim() || chapter?.metadata?.title || page.id;
  }

  function renderCover(model, page, isBack = false) {
    if (isBack) {
      return `
        <div class="rulebook-cover-copy rulebook-back-cover-copy">
          <span class="rulebook-cover-mark">⌁</span>
          <p class="rulebook-cover-kicker">Система формування групи виживання</p>
          <h2>КІНЕЦЬ ПРОТОКОЛУ</h2>
          <p>Поверніться до гри або відкрийте потрібний розділ через зміст.</p>
          <button class="rulebook-inline-action" data-rulebook-go="front-cover" type="button">До обкладинки</button>
        </div>`;
    }
    return `
      <div class="rulebook-cover-copy">
        <span class="rulebook-cover-mark">⌁</span>
        <p class="rulebook-cover-kicker">Аварійний статут підземного комплексу</p>
        <h2>${escapeHtml(model.manifest.title || "СХОВИЩЕ")}</h2>
        <p>${escapeHtml(model.manifest.subtitle || "Довідник правил і ведення партії")}</p>
        <div class="rulebook-cover-edition">Версія правил ${escapeHtml(model.manifest.rulebookVersion || model.manifest.productVersion || "1.2.11")}</div>
        <button class="rulebook-inline-action" data-rulebook-next type="button">Відкрити книгу</button>
      </div>`;
  }


  const TEMPLATE_ACCENTS = Object.freeze({
    warning: ["!", "Аварійне правило"],
    decision: ["◎", "Рішення ради"],
    dashboard: ["▣", "Системний стан"],
    procedure: ["→", "Послідовність дій"],
    comparison: ["⇄", "Порівняння"],
    matrix: ["⌘", "Матриця сумісності"],
    report: ["◇", "Підсумковий звіт"],
    troubleshooting: ["⚙", "Діагностика"],
    glossary: ["A–Я", "Термінологія"],
    faq: ["?", "Поширені питання"],
    table: ["≡", "Швидка таблиця"],
    settings: ["◫", "Налаштування читання"],
    changelog: ["∆", "Зміни правил"],
    edition: ["§", "Відомості про редакцію"]
  });

  function renderTemplateAccent(page) {
    const accent = TEMPLATE_ACCENTS[page?.template];
    if (!accent) return "";
    return `<div class="rulebook-template-accent" aria-hidden="true"><span>${escapeHtml(accent[0])}</span><b>${escapeHtml(accent[1])}</b></div>`;
  }

  function renderInteractiveExample(page) {
    if (!page) return "";
    if (page.id === "round-cycle") {
      const phases = [
        ["Розкриття", "Відкрийте дозволені характеристики й підтвердьте вибір."],
        ["Обговорення", "Порівняйте відкриті дані та сформулюйте аргументи."],
        ["Криза", "Ознайомтеся з проблемою й доступними рішеннями."],
        ["Рішення", "Проголосуйте або виконайте дію, визначену режимом."],
        ["Наслідки", "Сервер застосовує результат і готує наступний цикл."]
      ];
      return `<section class="rulebook-interactive-example" data-rulebook-example="phase-cycle"><header><span>Інтерактивний приклад</span><h4>Пройдіть цикл раунду</h4></header><div class="rulebook-example-tabs">${phases.map((item, index) => `<button type="button" data-rulebook-example-action="phase" data-phase-index="${index}" class="${index === 0 ? "is-active" : ""}">${index + 1}. ${escapeHtml(item[0])}</button>`).join("")}</div><p class="rulebook-example-output" data-rulebook-example-output>${escapeHtml(phases[0][1])}</p></section>`;
    }
    if (page.id === "voting") {
      return `<section class="rulebook-interactive-example" data-rulebook-example="voting"><header><span>Навчальна симуляція</span><h4>П’ять умовних голосів</h4></header><p>Натискайте кандидатів, щоб подати послідовні голоси. Приклад не змінює партію.</p><div class="rulebook-vote-demo"><button type="button" data-rulebook-example-action="vote" data-candidate="А">Кандидат А <b data-vote-count="А">0</b></button><button type="button" data-rulebook-example-action="vote" data-candidate="Б">Кандидат Б <b data-vote-count="Б">0</b></button><button type="button" data-rulebook-example-action="vote" data-candidate="В">Кандидат В <b data-vote-count="В">0</b></button></div><p class="rulebook-example-output" data-rulebook-example-output>Подано 0 із 5 голосів.</p><button class="rulebook-example-reset" type="button" data-rulebook-example-action="reset-vote">Скинути приклад</button></section>`;
    }
    if (page.id === "session-recovery") {
      return `<section class="rulebook-interactive-example" data-rulebook-example="recovery"><header><span>Безпечний сценарій</span><h4>Відновлення крок за кроком</h4></header><ol class="rulebook-recovery-demo"><li class="is-active">Введіть код кімнати та персональний код.</li><li>Якщо коду немає — створіть запит для ведучого.</li><li>Ведучий підтверджує правильного персонажа.</li><li>Новий сеанс видається одноразово й більше не показується.</li></ol><p class="rulebook-example-output" data-rulebook-example-output>Крок 1 із 4.</p><div class="rulebook-example-actions"><button type="button" data-rulebook-example-action="recovery-next">Наступний крок</button><button type="button" data-rulebook-example-action="recovery-reset">Спочатку</button></div></section>`;
    }
    return "";
  }

  const PAGE_VISUALS = Object.freeze({
    "title-page": ["bunker-overview.svg", "Схема підземного комплексу", "Командний зал, житловий модуль, медичний відсік і системи життєзабезпечення."],
    "quick-overview": ["round-cycle.svg", "Основний цикл партії", "Послідовність фаз від розкриття до наслідків."],
    "round-cycle": ["round-cycle.svg", "Цикл раунду", "П'ять послідовних фаз раунду."],
    "voting": ["voting.svg", "Рішення ради", "Подання голосів, підрахунок і застосування результату."],
    "resources": ["resources.svg", "Панель ресурсів", "Окремі шкали води, енергії, медицини й моралі."],
    "session-recovery": ["recovery.svg", "Відновлення сеансу", "Запит, перевірка ведучого й одноразове отримання нового сеансу."]
  });

  function safeVisualFilename(value) {
    const filename = String(value || "");
    return /^[a-z0-9][a-z0-9-]*\.svg$/u.test(filename) ? filename : null;
  }

  function renderPageVisual(page) {
    const visual = PAGE_VISUALS[page?.id];
    if (!visual) return "";
    const [requestedFile, caption, alt] = visual;
    const file = safeVisualFilename(requestedFile);
    if (!file) return "";
    const pageClass = String(page?.id || "").replace(/[^a-z0-9-]/gu, "");
    return `<figure class="rulebook-page-visual rulebook-page-visual-${escapeHtml(pageClass)}"><img src="/rulebook/assets/visuals/${escapeHtml(file)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
  }

  function renderRuleChanges(model) {
    const entries = Array.isArray(model?.ruleChanges?.entries) ? model.ruleChanges.entries : [];
    if (!entries.length) return '<p class="rulebook-empty-state">Для цієї редакції немає окремих гравецьких змін.</p>';
    return `<div class="rulebook-changelog-list">${entries.map((entry) => {
      const pages = (entry.pages || []).map((pageId) => {
        const page = model.getPage(pageId);
        if (!page) return "";
        return `<button type="button" data-rulebook-go="${escapeHtml(page.id)}">${escapeHtml(pageTitle(model, page))}</button>`;
      }).filter(Boolean).join("");
      return `<article class="rulebook-changelog-entry" data-change-type="${escapeHtml(entry.type || "rule")}"><header><time datetime="${escapeHtml(entry.date || "")}">${escapeHtml(entry.date || "")}</time><span>${escapeHtml(entry.type === "interface" ? "Інтерфейс" : "Правило")}</span></header><h3>${escapeHtml(entry.title || "Зміна")}</h3><p>${escapeHtml(entry.summary || "")}</p>${pages ? `<div class="rulebook-changelog-links">${pages}</div>` : ""}</article>`;
    }).join("")}</div>`;
  }

  function renderEditionMetadata(model) {
    const current = model?.versionHistory?.current || {};
    const digest = String(model?.contentDigest || "");
    const rows = [
      ["Продукт", current.productVersion || model?.manifest?.productVersion],
      ["Довідник", current.rulebookVersion || model?.manifest?.rulebookVersion],
      ["Маніфест", current.manifestSchema || model?.manifest?.schema],
      ["Runtime", current.runtimeSchema || "rulebook-runtime-v1"],
      ["Карта книги", current.bookMapSchema || model?.bookMap?.schema],
      ["Мова", current.locale || model?.manifest?.locale],
      ["Оновлено", current.updatedAt || "—"],
      ["Digest", digest ? `${digest.slice(0, 12)}…${digest.slice(-8)}` : "—"]
    ];
    return `<dl class="rulebook-edition-grid">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "—")}</dd></div>`).join("")}</dl>`;
  }

  function renderPage(model, page) {
    if (!page) return { title: "Порожня сторінка", html: "" };
    if (page.template === "cover") return { title: pageTitle(model, page), html: renderCover(model, page, false) };
    if (page.template === "back-cover") return { title: pageTitle(model, page), html: renderCover(model, page, true) };

    const chapter = findChapter(model, page);
    const section = chapter ? extractSection(chapter.markdown, page.anchor) : "";
    const status = STATUS_LABELS[page.status] || page.status;
    const audience = AUDIENCE_LABELS[page.audience] || page.audience;
    const modes = (page.modes || ["all"]).map((mode) => MODE_LABELS[mode] || mode);
    const title = pageTitle(model, page);
    let body = section ? renderMarkdown(section) : `<p>Вміст сторінки «${escapeHtml(title)}» готується.</p>`;
    if (page.id === "rule-changes") body += renderRuleChanges(model);
    if (page.id === "edition-version") body += renderEditionMetadata(model);
    const accent = renderTemplateAccent(page);
    const visual = renderPageVisual(page);
    const interactive = renderInteractiveExample(page);
    const chapterTitle = chapter?.metadata?.shortTitle || chapter?.metadata?.title || "Довідник";

    return {
      title,
      html: `
        <header class="rulebook-page-header">
          <p class="rulebook-page-kicker">${escapeHtml(chapterTitle)}</p>
          <div class="rulebook-page-meta">
            <span class="rulebook-status rulebook-status-${escapeHtml(page.status)}">${escapeHtml(status)}</span>
            <span>${escapeHtml(audience)}</span>
          </div>
        </header>
        <div class="rulebook-page-body rulebook-template-${escapeHtml(page.template)}">${accent}${visual}${body}${interactive}</div>
        <footer class="rulebook-page-footer">
          <span>${escapeHtml(modes.join(" · "))}</span>
          <b>${Number(page.number) + 1}</b>
        </footer>`
    };
  }

  return Object.freeze({
    AUDIENCE_LABELS,
    MODE_LABELS,
    STATUS_LABELS,
    escapeHtml,
    extractSection,
    inlineMarkdown,
    pageTitle,
    renderInteractiveExample,
    renderMarkdown,
    renderRuleChanges,
    renderEditionMetadata,
    renderPage,
    renderPageVisual,
    safeVisualFilename,
    renderTemplateAccent,
    stripFrontMatter
  });
});

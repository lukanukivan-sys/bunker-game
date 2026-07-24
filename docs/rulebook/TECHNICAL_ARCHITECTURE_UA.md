# Технічна архітектура довідника

## Потік даних

```text
канонічні Markdown/JSON у docs/rulebook
→ scripts/rulebook_build_runtime.js
→ public/rulebook/data/rulebook-data.json
→ rulebook-loader.js
→ rulebook-model.js
→ page-layout.js
→ майбутні renderer і page-turn
```

## Межі модулів

- `rulebook-config.js` — ідентифікатори схем, шляхи, події й безпечні значення за замовчуванням;
- `rulebook-loader.js` — тільки завантаження runtime bundle;
- `rulebook-model.js` — індекси сторінок і розворотів, перевірка цілісності, пошук цільової сторінки;
- `page-layout.js` — вибір desktop/tablet/mobile, видимі сторінки та ціль переходу;
- `rulebook-tokens.css` — дизайн-токени без прив’язки до DOM оболонки;
- renderer, анімація, звук, пошук і закладки додаються окремими пакетами.

## Runtime bundle

Збірка містить:

- manifest;
- book map;
- UX-конфігурацію;
- дизайн-токени;
- термінологію;
- реєстр нестабільних правил;
- усі розділи з метаданими, Markdown-текстом і anchor-посиланнями;
- контрольний `contentDigest` SHA-256.

Збірка детермінована: однакові джерела дають однаковий digest. Довідник не виконує HTML або JavaScript із Markdown.

## Безпека

Loader приймає лише локальний URL bundle. Майбутній renderer повинен використовувати allowlist компонентів і екранувати сирий HTML. Стан довідника не містить кімнатних токенів.

## Відмовостійкість

Якщо bundle не завантажився, гра продовжує працювати. Довідник показує локальний стан помилки, дозволяє повторити завантаження й закритися. Жодна помилка книги не повинна змінювати стан кімнати.

## Версії

Окремо контролюються:

- `productVersion`;
- `rulebookVersion`;
- schema manifest/book-map/UX/tokens/runtime bundle.

Несумісна схема має завершувати завантаження зрозумілою помилкою до створення UI.

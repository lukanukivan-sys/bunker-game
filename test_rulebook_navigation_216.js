"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createBookModel } = require("./public/rulebook/rulebook-model");
const { createSearchIndex } = require("./public/rulebook/rulebook-search");
const { createRulebookLibrary } = require("./public/rulebook/rulebook-library");
const { createRulebookAudio } = require("./public/rulebook/rulebook-audio");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook.css"), "utf8");
const tokens = fs.readFileSync(path.join(root, "public", "rulebook", "rulebook-tokens.css"), "utf8");
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const bundle = JSON.parse(fs.readFileSync(path.join(root, "public", "rulebook", "data", "rulebook-data.json"), "utf8"));
const model = createBookModel(bundle);

for (const id of [
  "rulebookContentsButton",
  "rulebookSearchButton",
  "rulebookBookmarkButton",
  "rulebookLibraryButton",
  "rulebookSoundButton",
  "rulebookDrawer",
  "rulebookDrawerTitle",
  "rulebookDrawerContent",
  "rulebookDrawerClose",
  "rulebookDrawerScrim"
]) assert(html.includes(`id="${id}"`), `Відсутній інтерактивний елемент ${id}`);

for (const script of ["rulebook-search.js", "rulebook-library.js", "rulebook-audio.js"]) {
  assert(html.includes(script), `Не підключено ${script}`);
}

const scriptOrder = [
  "rulebook-renderer.js",
  "rulebook-search.js",
  "rulebook-library.js",
  "rulebook-audio.js",
  "page-turn.js",
  "rulebook-shell.js"
].map((name) => html.indexOf(name));
assert(scriptOrder.every((position) => position >= 0), "Не всі скрипти етапів 12–15 підключено");
assert(scriptOrder.every((position, index) => index === 0 || position > scriptOrder[index - 1]), "Нові скрипти підключено в неправильному порядку");

const search = createSearchIndex(model);
assert.equal(search.search("нічия", { limit: 1 })[0]?.pageId, "voting", "Пошук не знаходить правило нічиєї");
assert.equal(search.search("картка персонажа", { limit: 1 })[0]?.pageId, "dossier", "Пошук не використовує термінологічні синоніми");
assert.equal(search.search("відновлення сеансу", { limit: 1 })[0]?.pageId, "session-recovery", "Пошук не знаходить recovery-розділ");
assert.deepEqual(search.search("я", { limit: 10 }), [], "Пошук не повинен запускатися для одного символу");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const storage = new MemoryStorage();
let now = 1_000;
const library = createRulebookLibrary(model, { storage, historyDepth: 3, now: () => ++now });
assert.equal(library.toggleBookmark("voting"), true);
assert.equal(library.isBookmarked("voting"), true);
assert.equal(library.listBookmarks()[0].page.id, "voting");
assert.equal(library.toggleBookmark("voting"), false);
assert.equal(library.isBookmarked("voting"), false);
for (const pageId of ["dossier", "voting", "medicine", "dossier"]) library.recordVisit(pageId);
assert.deepEqual(library.listHistory().map((entry) => entry.pageId), ["dossier", "medicine", "voting"], "Історія не дедуплікується або не дотримується ліміту");
const restored = createRulebookLibrary(model, { storage, historyDepth: 3 });
assert.deepEqual(restored.listHistory().map((entry) => entry.pageId), ["dossier", "medicine", "voting"], "Історія не відновлюється з localStorage");
restored.clearHistory();
assert.equal(restored.listHistory().length, 0);

class FakeAudio {
  constructor(src) { this.src = src; this.volume = 1; this.currentTime = 0; this.paused = true; this.playCount = 0; }
  pause() { this.paused = true; }
  play() { this.paused = false; this.playCount += 1; return Promise.resolve(); }
  removeAttribute() {}
  load() {}
}

const audioStorage = new MemoryStorage();
const audio = createRulebookAudio({ AudioCtor: FakeAudio, storage: audioStorage });
assert.deepEqual(audio.getSettings(), { enabled: false, volume: 0.28 });
assert.equal(audio.setVolume(0.5), 0.5);
assert.equal(audio.setEnabled(true), true);
assert.equal(audio.toggleEnabled(), false);
assert.deepEqual(audio.getSettings(), { enabled: false, volume: 0.5 });

for (const marker of [
  "@keyframes rulebook-turn-forward",
  "@keyframes rulebook-turn-backward",
  "@keyframes rulebook-page-shadow",
  ".rulebook-turn-face-back",
  ".rulebook-drawer.is-open",
  ".rulebook-search-results",
  ".rulebook-audio-panel"
]) assert(css.includes(marker), `У CSS відсутній маркер ${marker}`);
assert(tokens.includes("--rulebook-motion-page-turn: 680ms"), "Перегортання не сповільнено до 680 мс");
assert.equal(bundle.ux.motion.durationMs, 680);
assert.equal(bundle.ux.audio.enabledByDefault, false);
assert.equal(bundle.ux.audio.pageTurnSound, false);
assert.deepEqual(bundle.ux.audio.cues, ["open", "close"]);
assert.equal(bundle.ux.search.minimumQueryLength, 2);
assert.equal(bundle.ux.library.historyDepth, 30);
assert(serverSource.includes('".wav": "audio/wav"'), "Сервер не повертає коректний MIME для звуків книги");

for (const filename of ["book-open.wav", "book-close.wav"]) {
  const file = fs.readFileSync(path.join(root, "public", "rulebook", "assets", filename));
  assert(file.length > 20_000, `${filename} підозріло малий`);
  assert.equal(file.subarray(0, 4).toString("ascii"), "RIFF", `${filename} не є WAV/RIFF`);
  assert.equal(file.subarray(8, 12).toString("ascii"), "WAVE", `${filename} не є WAV/WAVE`);
}
for (const filename of ["page-turn-forward.wav", "page-turn-backward.wav"]) {
  assert.equal(fs.existsSync(path.join(root, "public", "rulebook", "assets", filename)), false, `${filename} має бути вилучений`);
}

console.log("1.2.11: плавне беззвучне перегортання, опційні звуки відкриття, зміст, пошук, закладки та історію довідника перевірено.");

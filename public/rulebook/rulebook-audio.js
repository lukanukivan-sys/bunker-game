(function exposeRulebookAudio(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SkhovyshcheRulebookAudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRulebookAudioApi(root) {
  "use strict";

  const SETTINGS_KEY = "skhovyshche.rulebook.audio";
  const DEFAULT_SETTINGS = Object.freeze({ enabled: false, volume: 0.28 });
  const DEFAULT_CUES = Object.freeze({
    open: { src: "/rulebook/assets/book-open.wav", gain: 0.72 },
    close: { src: "/rulebook/assets/book-close.wav", gain: 0.68 }
  });

  function clampVolume(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_SETTINGS.volume;
    return Math.min(1, Math.max(0, number));
  }

  function readSettings(storage, key = SETTINGS_KEY) {
    try {
      const parsed = JSON.parse(storage?.getItem?.(key) || "null");
      if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
      return {
        enabled: parsed.enabled !== false,
        volume: clampVolume(parsed.volume)
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function createRulebookAudio(options = {}) {
    const AudioCtor = options.AudioCtor || root?.Audio;
    const storage = options.storage || root?.localStorage || null;
    const settingsKey = options.settingsKey || SETTINGS_KEY;
    const cues = { ...DEFAULT_CUES, ...(options.cues || {}) };
    let settings = readSettings(storage, settingsKey);
    const tracks = new Map();

    function persist() {
      try { storage?.setItem?.(settingsKey, JSON.stringify(settings)); } catch {}
    }

    function getTrack(name) {
      const cue = cues[name];
      if (!cue || !AudioCtor) return null;
      if (!tracks.has(name)) {
        const audio = new AudioCtor(cue.src);
        audio.preload = "auto";
        tracks.set(name, audio);
      }
      return tracks.get(name);
    }

    function play(name) {
      if (!settings.enabled || settings.volume <= 0) return Promise.resolve(false);
      const cue = cues[name];
      const audio = getTrack(name);
      if (!cue || !audio) return Promise.resolve(false);
      try {
        audio.pause?.();
        audio.currentTime = 0;
        audio.volume = clampVolume(settings.volume * Number(cue.gain || 1));
        const result = audio.play?.();
        return result && typeof result.then === "function"
          ? result.then(() => true).catch(() => false)
          : Promise.resolve(true);
      } catch {
        return Promise.resolve(false);
      }
    }

    function setEnabled(value) {
      settings = { ...settings, enabled: Boolean(value) };
      if (!settings.enabled) {
        for (const audio of tracks.values()) {
          try { audio.pause?.(); audio.currentTime = 0; } catch {}
        }
      }
      persist();
      return settings.enabled;
    }

    function setVolume(value) {
      settings = { ...settings, volume: clampVolume(value) };
      for (const [name, audio] of tracks) {
        const cue = cues[name];
        try { audio.volume = clampVolume(settings.volume * Number(cue?.gain || 1)); } catch {}
      }
      persist();
      return settings.volume;
    }

    function destroy() {
      for (const audio of tracks.values()) {
        try { audio.pause?.(); audio.removeAttribute?.("src"); audio.load?.(); } catch {}
      }
      tracks.clear();
    }

    return Object.freeze({
      destroy,
      getSettings: () => ({ ...settings }),
      play,
      setEnabled,
      setVolume,
      toggleEnabled: () => setEnabled(!settings.enabled)
    });
  }

  return Object.freeze({ DEFAULT_CUES, DEFAULT_SETTINGS, SETTINGS_KEY, clampVolume, createRulebookAudio, readSettings });
});

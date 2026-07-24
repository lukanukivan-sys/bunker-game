"use strict";

// Node's built-in fetch may retain keep-alive sockets on Windows after a test has
// already stopped its child server. Test requests do not benefit from pooling,
// so force connection closure for deterministic process shutdown.
//
// Older regression files encoded room credentials in query parameters. The
// production API no longer accepts secrets in URLs, therefore this compatibility
// adapter promotes those legacy test parameters to headers before a request is
// sent. The server still receives and validates the same header-only contract as
// the browser client.
if (typeof globalThis.fetch === "function" && !globalThis.__shelterFetchPatched) {
  const nativeFetch = globalThis.fetch.bind(globalThis);

  Object.defineProperty(globalThis, "__shelterNativeFetch", {
    value: nativeFetch,
    configurable: false,
    enumerable: false,
    writable: false
  });

  globalThis.fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (!headers.has("connection")) headers.set("connection", "close");

    let nextInput = input;
    try {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      let changed = false;

      const playerId = url.searchParams.get("playerId");
      const playerToken = url.searchParams.get("token");
      const recoveryRequestToken = url.searchParams.get("requestToken");

      if (playerId && !headers.has("x-player-id")) headers.set("x-player-id", playerId);
      if (playerToken && !headers.has("x-player-token")) headers.set("x-player-token", playerToken);
      if (recoveryRequestToken && !headers.has("x-recovery-request-token")) {
        headers.set("x-recovery-request-token", recoveryRequestToken);
      }

      for (const key of ["playerId", "token", "requestToken"]) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }

      if (changed) {
        nextInput = input instanceof Request
          ? new Request(url, input)
          : url.toString();
      }
    } catch {
      // Relative or non-URL inputs are passed through unchanged.
    }

    return nativeFetch(nextInput, { ...init, headers });
  };
  globalThis.__shelterFetchPatched = true;
}

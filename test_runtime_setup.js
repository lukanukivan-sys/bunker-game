"use strict";

// Node's built-in fetch may retain keep-alive sockets on Windows after a test has
// already stopped its child server. Test requests do not benefit from pooling,
// so force connection closure for deterministic process shutdown.
if (typeof globalThis.fetch === "function" && !globalThis.__shelterFetchPatched) {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (!headers.has("connection")) headers.set("connection", "close");
    return nativeFetch(input, { ...init, headers });
  };
  globalThis.__shelterFetchPatched = true;
}

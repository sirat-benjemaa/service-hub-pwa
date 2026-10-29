/* One worker for the whole app. Only explicitly allowed public pages are cached. */
const CACHE = "servicehub-offline-v3";
const PREFIX = "servicehub-offline-";
const SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Save production scripts/styles before announcing offline readiness.
    const html = await (await cache.match("/")).text();
    const assets = [...html.matchAll(/(?:src|href)="([^" ]+)"/g)]
      .map((match) => new URL(match[1].replaceAll("&amp;", "&"), self.location.origin))
      .filter((url) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/"))
      .map((url) => url.href);
    await cache.addAll([...new Set(assets)]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys())
      .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.status >= 500) throw new Error("Server unavailable");
        // Keep the versioned shell and its assets together until the next worker update.
        return response;
      } catch {
        const cache = await caches.open(CACHE);
        return (url.pathname === "/" ? await cache.match("/") : null)
          || await cache.match("/offline.html")
          || new Response("ServiceHub est hors ligne.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || SHELL.slice(1).includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
  // API, RSC requests, private profiles, and mutations are never cached.
});

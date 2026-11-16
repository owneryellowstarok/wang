// Yellow Star - Mr. Wang log - offline cache
// Bump this version any time index.html changes.
const PREFIX = "yellowstar-wang-";
const CACHE = PREFIX + "v3";

const LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"
];
const PRECACHE = ["./", "./index.html"].concat(LIBS);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(PRECACHE.map(url =>
        fetch(new Request(url, { mode: url.startsWith("http") ? "no-cors" : "same-origin" }))
          .then(resp => cache.put(url, resp))
          .catch(err => console.warn("precache miss", url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

// Only clean up this app's own old caches (Jana's walk form shares the site).
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const isLib = LIBS.indexOf(req.url) !== -1;

  if (isLib) {
    // Libraries never change: cache first.
    event.respondWith(
      caches.open(CACHE).then(c => c.match(req)).then(cached => cached || fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }))
    );
    return;
  }

  // Page: network first so updates show right away, cache when offline.
  event.respondWith(
    fetch(req).then(resp => {
      if (resp && resp.status === 200) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return resp;
    }).catch(() => caches.open(CACHE).then(c => c.match(req).then(m => m || c.match("./index.html"))))
  );
});

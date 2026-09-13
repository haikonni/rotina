/* Rotina - service worker */
const VERSAO = "1.2.0";
const CACHE = "rotina-" + VERSAO;
const NUCLEO = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];
const FONTES = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(NUCLEO)));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n.startsWith("rotina-") && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", e => {
  if (e.data === "ATUALIZAR_AGORA") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try { return await fetch(req); }
      catch (err) { return (await caches.match("./index.html")) || Response.error(); }
    })());
    return;
  }

  const mesmaOrigem = new URL(req.url).origin === location.origin;
  if (!mesmaOrigem && !FONTES.test(req.url)) return;

  e.respondWith((async () => {
    const guardado = await caches.match(req, {ignoreSearch: mesmaOrigem});
    if (guardado) return guardado;
    try {
      const resp = await fetch(req);
      if (resp && (resp.ok || resp.type === "opaque")) {
        const c = await caches.open(CACHE);
        c.put(req, resp.clone());
      }
      return resp;
    } catch (err) {
      return guardado || Response.error();
    }
  })());
});
// Service worker mínimo: cachea los archivos estáticos propios de la app
// (JS, CSS, iconos) para que cargue más rápido en visitas repetidas y algo
// funcione sin conexión. Las llamadas a Supabase (datos, login) NUNCA se
// cachean: siempre van directas a la red, para no servir datos viejos.
const CACHE_NAME = "travel-mapping-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cacheamos peticiones GET del propio dominio (nuestros archivos).
  // Todo lo demás (Supabase, APIs externas, geocoding...) va directo a la red.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      // Si ya lo teníamos en caché, lo servimos al instante y actualizamos
      // en segundo plano; si no, esperamos a la red.
      return cached || networkFetch;
    })
  );
});

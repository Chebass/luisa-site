/* No caching of authenticated responses, client data, or action-token URLs. */
const CACHE = "luisa-offline-shell-v1";
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/offline.html", "/offline.js"]))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (["/offline.html", "/offline.js"].includes(url.pathname)) {
    event.respondWith(
      caches
        .match(event.request)
        .then((cached) => cached || fetch(event.request)),
    );
    return;
  }
  if (
    event.request.mode === "navigate" &&
    /^\/(inicio|calendario|clientes|disponibilidad|ajustes|notificaciones|mas)(\/|$)/.test(
      url.pathname,
    )
  )
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  let data = {
    title: "Novedades en tu agenda",
    body: "Abre tu espacio de bienestar.",
  };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "luisa-agenda",
      data: { url: "/notificaciones" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(
          (c) => new URL(c.url).origin === self.location.origin,
        );
        if (existing) {
          existing.navigate("/notificaciones");
          return existing.focus();
        }
        return self.clients.openWindow("/notificaciones");
      }),
  );
});

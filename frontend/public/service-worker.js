const CACHE_NAME = "glr-attendance-pwa-v1"

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/maskable-icon.svg"
]

const API_PREFIXES = [
  "/auth",
  "/dashboard/admin-stats",
  "/employees/",
  "/attendance/",
  "/face",
  "/locations",
  "/export",
  "/company",
  "/leave/"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") {
    event.respondWith(fetch(request))
    return
  }

  const url = new URL(request.url)
  const isSameOrigin = url.origin === self.location.origin
  const isApiRequest = isSameOrigin && API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))

  if (isApiRequest) {
    event.respondWith(fetch(request))
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("/index.html"))
    )
    return
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => cached || fetch(request).then((response) => {
        if (!isSameOrigin || !response || response.status !== 200) {
          return response
        }

        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
        return response
      }))
  )
})

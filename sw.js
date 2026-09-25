const CACHE_NAME = 'gasoprice-v2';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon.svg'
];

// Instalación: pre-cachear recursos críticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .catch(err => console.error('Error al pre-cachear:', err))
    );
    self.skipWaiting();
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// Fetch: SOLO interceptar recursos del mismo origen (NO las llamadas API)
self.addEventListener('fetch', event => {
    // Ignorar peticiones que no sean GET
    if (event.request.method !== 'GET') return;

    // ⚠️ CRÍTICO: NO interceptar peticiones cross-origin (API del Worker, CDNs, etc.)
    // Esto evita el "Failed to fetch" al llamar al Cloudflare Worker
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) {
        return; // Dejar que el navegador haga el fetch normalmente
    }

    // Solo cachear recursos del mismo origen (HTML, CSS, JS, imágenes locales)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                })
            )
    );
});

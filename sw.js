const CACHE_NAME = 'gasoprice-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon.svg',
    'https://cdn.tailwindcss.com'
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

// Fetch: Network First con fallback a Cache
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

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

const CACHE_VERSION = 2;
const CACHE_NAME = `beatline-static-v${CACHE_VERSION}`;
/**
 * Liste blanche des chemins à mettre en cache
 * Cette route policy empêche l'injection de contenus externes et de réponses non prévues.
 * Extend selon besoins (assets additionnels, fonts locales, images, shaders, etc.).
 */
const CACHE_FILES = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/core/GameManager.js',
    '/js/core/ScoreManager.js',
    '/js/core/NoteFactory.js',
    '/js/core/ProceduralGenerator.js',
    '/js/scenes/MenuScene.js',
    '/js/tests/unitTests.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(CACHE_FILES))
        .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
        .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Politique de route : conserver en local uniquement les requêtes de même origine
    if (url.origin !== self.location.origin) {
        return;
    }

    // Interdire cache de données sensibles ou POST etc.
    if (event.request.cache === 'no-store' || event.request.cache === 'reload') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            // Limited to whitelisted assets
            const path = url.pathname;
            if (!CACHE_FILES.includes(path) && path !== '/') {
                return fetch(event.request);
            }

            return fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') return response;
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    return response;
                });
        }).catch(() => {
            if (event.request.destination === 'document') {
                return caches.match('/index.html');
            }
        })
    );
});

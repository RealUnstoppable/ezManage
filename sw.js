const CACHE_NAME = 'ezmanage-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './easy-ai.html',
    './manifest.json',
    './ManagerPro.jpg',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js',
    'https://unpkg.com/brain.js@2.0.0-beta.23/dist/browser.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');

                return Promise.allSettled(
                    ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('Failed to cache:', url, err)))
                );
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {

    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {

                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                }).catch(() => {

                });

                return cachedResponse || fetchPromise;
            })
        );
    }
});

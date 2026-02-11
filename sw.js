
const CACHE_NAME = 'ghi-nuoc-v3.0';
const ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@18.3.1',
  'https://esm.sh/react-dom@18.3.1',
  'https://esm.sh/lucide-react@0.460.0?external=react,react-dom',
  'https://cdn-icons-png.flaticon.com/512/3105/3105807.png'
];

// Cai dat SW va cache tai nguyen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Xoa cache cu khi co version moi
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Chien luoc Cache First, Network Second
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        // Khong cache cac yeu cau API ben ngoai (VietQR, Google Sheet) de dam bao du lieu moi
        if (!event.request.url.includes('script.google.com') && !event.request.url.includes('vietqr.io')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});

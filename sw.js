// Bump this version when shipping new application assets.
const CACHE_NAME = 'ada-mesaisi-v21';
const BASE = new URL('./', self.location.href);
const INDEX_URL = new URL('index.html', BASE).href;
const PUBLIC_DATA_URL = new URL('vardiyalar.json', BASE).href;
const CORE_ASSETS = [
  './', 'index.html', 'app.js?v=21', 'style.css?v=21', 'pwa.mjs?v=17',
  'motion.mjs?v=8', 'stats.mjs?v=14', 'vault.js?v=16', 'panel-crypto.mjs?v=16',
  'manifest.webmanifest', 'mercedes-kibris.jpg', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/logo-128.png',
  'icons/favicon-64.png'
].map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('ada-mesaisi-v') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkWithFallback(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      await cache.put(cacheKey, response.clone()).catch(() => {});
      return response;
    }
    const cached = await cache.match(cacheKey);
    return cached || response;
  } catch {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    throw new Error('Bu içerik çevrimdışı kullanım için henüz kaydedilmedi.');
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const relativePath = url.pathname.slice(BASE.pathname.length);
  // Authentication and the encrypted driver feed always use their original network request.
  if (relativePath === 'panel.enc.json' || relativePath.startsWith('api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkWithFallback(request, INDEX_URL));
  } else if (url.pathname === new URL(PUBLIC_DATA_URL).pathname) {
    event.respondWith(networkWithFallback(request, PUBLIC_DATA_URL));
  } else if (CORE_ASSETS.some(asset => new URL(asset).pathname === url.pathname)) {
    event.respondWith(networkWithFallback(request, request));
  }
});

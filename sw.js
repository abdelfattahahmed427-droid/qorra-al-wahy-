// Minimal service worker. Its only real job here is to satisfy Chrome's
// installability requirement (manifest + https + a service worker with a fetch
// handler) so Android shows the "Install app" prompt. It caches just the small
// app-shell files (this page, the manifest, the icons) so the app still opens if
// you're briefly offline; everything else (the Quran API, ayah audio, fonts) is
// left alone and always goes straight to the network like normal, so tasmi'
// results and recitation audio are always current, never served stale.
const CACHE_NAME = 'qorra-al-wahy-shell-v2';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // only handle our own small app-shell files; let every other request
  // (API calls, audio streaming, fonts) pass straight through untouched.
  const isShellFile = url.origin === self.location.origin &&
    SHELL_FILES.some(f => url.pathname.endsWith(f.replace('./', '/')) || url.pathname === '/');
  if(!isShellFile) return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

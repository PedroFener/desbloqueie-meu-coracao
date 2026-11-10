/* Service worker: deixa o jogo jogável offline depois da primeira visita.
   Ao lançar uma atualização, mude CACHE para invalidar os arquivos antigos. */
const CACHE = 'dmc-v1.0.1';
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/utils.js',
  './js/save.js',
  './js/audio.js',
  './js/input.js',
  './js/sprites.js',
  './js/particles.js',
  './js/player.js',
  './js/dialogue.js',
  './js/levels.js',
  './js/scene-base.js',
  './js/levels/level1.js',
  './js/levels/level2.js',
  './js/levels/level3.js',
  './js/levels/level4.js',
  './js/levels/level5.js',
  './js/ui.js',
  './js/main.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (pega atualizações), cache como reserva offline
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

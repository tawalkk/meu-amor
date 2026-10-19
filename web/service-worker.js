const CACHE_NAME = 'nosso-amor-v21';
const APP_FILES = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/styles.css', './assets/css/modern.css', './assets/css/social.css', './assets/css/couple.css', './assets/css/auth.css', './assets/css/chat.css', './assets/css/shared-features.css',
  './assets/js/script.js', './assets/js/couple-config.js', './assets/js/couple-interactions.js', './assets/js/shared-features.js', './assets/js/site-auth.js',
  './assets/images/app-icon.svg', './assets/images/icon_appandsite.png', './assets/images/icon_appandsite-192.png', './assets/images/icon_appandsite-512.png', './assets/images/Hello.png', './assets/images/pinke_pie.png', './assets/images/rivalidade.png',
  './assets/images/WhatsApp Image 2026-09-20 at 20.42.50.jpeg',
  './assets/images/WhatsApp Image 2026-09-20 at 20.42.51.jpeg',
  './assets/images/WhatsApp Image 2026-09-20 at 20s.42.50.jpeg',
  './assets/images/WhatsApp Image 2026-10-04 at 12.18.10.jpeg',
  './assets/images/WhatsApp Image 2026-10-09 at 19.39.15.jpeg',
  './assets/images/WhatsApp Image 2026-10-12 at 20.12.01.jpeg',
  './assets/images/WhatsApp Image 2026-10-16 at 15.13.24.jpeg',
  './assets/audio/Vietsub  Last Night On Earth - Green Day  Lyrics Video - Vietsub Mỗi Ngày (youtube).mp3',
  './pages/carta.html', './pages/chuva.html', './pages/conversa.html', './pages/historia.html', './pages/login.html', './pages/momentos.html', './pages/playlist.html', './pages/teste-relogio.html',
  './pages/espaco.html', './pages/linha-do-tempo.html', './pages/cartinhas.html', './pages/diario.html', './pages/planos.html', './pages/desejos.html', './pages/recadinhos.html', './pages/perguntas.html', './pages/calendario.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match('./index.html'))));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const appWindow = clients.find((client) => new URL(client.url).origin === self.location.origin);
    return appWindow ? appWindow.focus() : self.clients.openWindow('./index.html');
  }));
});

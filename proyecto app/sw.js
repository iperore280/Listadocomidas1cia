// PWA básico: se puede ampliar con caché si quieres
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate', e=>clients.claim());

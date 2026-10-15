/* Service worker Pemutar Video.
   Naikkan angka VERSION tiap kali lo ganti isi index.html supaya cache lama dibuang. */
const VERSION = 'pemutar-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
// Hanya host library/font milik aplikasi yang di-cache. Video & iframe embed TIDAK disentuh.
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Tampilkan cache dulu (cepat & bisa offline), sambil diam-diam ambil versi terbaru.
function staleWhileRevalidate(req) {
    return caches.open(VERSION).then((cache) =>
        cache.match(req).then((cached) => {
            const fresh = fetch(req).then((res) => {
                if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
                return res;
            }).catch(() => cached);
            return cached || fresh;
        })
    );
}

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    if (req.mode === 'navigate') {            // buka halaman: online dulu, offline pakai cache
        e.respondWith(
            fetch(req).then((res) => {
                const copy = res.clone();
                caches.open(VERSION).then((c) => c.put('./index.html', copy));
                return res;
            }).catch(() => caches.match('./index.html'))
        );
        return;
    }
    if (url.origin === self.location.origin || CDN_HOSTS.includes(url.hostname)) {
        e.respondWith(staleWhileRevalidate(req));
    }
});

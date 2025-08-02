// --- Service Worker untuk Annur Islamic ---

const STATIC_CACHE_NAME = 'annur-islamic-static-v11'; // Versi dinaikkan
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v11';

// Aset WAJIB yang harus ada agar aplikasi bisa berjalan offline
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './logo-annur.jpg',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'
];

// Aset audio tambahan. Jika ini gagal di-cache, aplikasi tetap bisa berjalan.
const AUDIO_ASSETS = [
    'https://raw.githubusercontent.com/AnnurIslamic/Mp3/main/notifikasi.mp3',
    'https://raw.githubusercontent.com/AnnurIslamic/Mp3/main/adzansubuh.mp3',
    'https://raw.githubusercontent.com/AnnurIslamic/Mp3/main/mishary.mp3',
    'https://raw.githubusercontent.com/AnnurIslamic/Mp3/main/adzankota.mp3'
];

const DYNAMIC_HOSTS = [
    'api.aladhan.com',
    'api.quran.gading.dev',
    'api.alquran.cloud',
    'nominatim.openstreetmap.org',
    'fonts.gstatic.com',
    'raw.githubusercontent.com',
    'cdn.alquran.cloud'
];

// Event 'install': Menyimpan aset ke cache statis.
self.addEventListener('install', event => {
    console.log('[SW] Sedang menginstall Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[SW] Pre-caching aset inti...');
            // Cache aset inti. Jika ini gagal, instalasi akan diulang.
            cache.addAll(CORE_ASSETS);

            // Cache aset audio secara terpisah.
            console.log('[SW] Pre-caching audio tambahan...');
            for (const audioUrl of AUDIO_ASSETS) {
                // Gunakan cache.add() satu per satu.
                // .catch() akan mencegah error jika satu file audio gagal dimuat.
                cache.add(audioUrl).catch(error => {
                    console.warn(`[SW] Gagal pre-cache ${audioUrl}:`, error);
                });
            }
        })
    );
});

// Event 'activate': Membersihkan cache lama.
self.addEventListener('activate', event => {
    console.log('[SW] Service Worker sedang diaktifkan...');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[SW] Menghapus cache lama:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// Event 'fetch': Menangani semua permintaan jaringan.
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Strategi untuk API dan sumber daya dinamis (Network First)
if (DYNAMIC_HOSTS.includes(requestUrl.hostname) || event.request.url.endsWith('.mp3')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(event.request.url, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    return caches.match(event.request.url);
                })
        );
    } 
    // Strategi untuk aset inti (Cache First)
    else {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});


// Event 'notificationclick': Menangani klik pada notifikasi.
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.endsWith('./') || client.url.includes('index.html')) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./');
            }
        })
    );
});

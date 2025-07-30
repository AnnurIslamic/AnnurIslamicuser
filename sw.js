// --- Service Worker untuk Annur Islamic ---

// Versi cache dinaikkan untuk memicu pembaruan otomatis saat file ini berubah.
const STATIC_CACHE_NAME = 'annur-islamic-static-v8';
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v8';

// Aset inti aplikasi (App Shell) yang akan di-cache saat instalasi.
const APP_SHELL_ASSETS = [
    '/AnnurIslamic/',
    '/AnnurIslamic/index.html',
    '/AnnurIslamic/manifest.json',
    '/AnnurIslamic/logo-annur.jpg'
    // Catatan: CSS dan JS utama ada di dalam HTML, jadi tidak perlu ditambahkan di sini.
];

// Daftar host API dan sumber daya eksternal yang akan di-cache secara dinamis.
const DYNAMIC_HOSTS = [
    'api.aladhan.com',           // Untuk jadwal sholat
    'api.quran.gading.dev',      // Untuk teks dan metadata Al-Qur'an
    'api.alquran.cloud',         // Untuk audio Murottal per ayat
    'nominatim.openstreetmap.org', // Untuk mendapatkan nama kota dari koordinat
    'fonts.gstatic.com',         // Untuk file font
    'fonts.googleapis.com',      // Untuk CSS font
    'raw.githubusercontent.com'  // Untuk file audio Adzan & notifikasi
];

// Event 'install': Menyimpan App Shell ke dalam cache statis.
self.addEventListener('install', event => {
    console.log('[SW] Sedang menginstall Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[SW] Pre-caching App Shell...');
            return cache.addAll(APP_SHELL_ASSETS);
        })
    );
});

// Event 'activate': Membersihkan cache lama.
self.addEventListener('activate', event => {
    console.log('[SW] Service Worker sedang diaktifkan...');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                // Hapus semua cache yang tidak sesuai dengan versi saat ini
                if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[SW] Menghapus cache lama:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    // Memastikan Service Worker baru mengambil kontrol halaman segera.
    return self.clients.claim();
});

// Event 'fetch': Menangani semua permintaan jaringan.
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Cek apakah permintaan ditujukan ke salah satu host API atau sumber daya dinamis.
    if (DYNAMIC_HOSTS.includes(requestUrl.hostname)) {
        // Strategi: Network First, then Cache (Coba ambil dari jaringan dulu)
        // Cocok untuk data yang bisa berubah seperti jadwal sholat atau data API lainnya.
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return fetch(event.request).then(networkResponse => {
                    // Jika berhasil, simpan respons ke cache dinamis dan kirim ke aplikasi.
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // Jika gagal (offline), coba ambil dari cache.
                    return cache.match(event.request);
                });
            })
        );
    } else {
        // Strategi: Cache First, then Network (Coba ambil dari cache dulu)
        // Cocok untuk App Shell yang jarang berubah.
        event.respondWith(
            caches.match(event.request).then(response => {
                // Jika ada di cache, langsung kembalikan.
                // Jika tidak, coba ambil dari jaringan.
                return response || fetch(event.request);
            })
        );
    }
});

// Event 'notificationclick': Menangani klik pada notifikasi.
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/AnnurIslamic/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/AnnurIslamic/');
            }
        })
    );
});

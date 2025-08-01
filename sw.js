// --- Service Worker untuk Annur Islamic ---

// Versi cache dinaikkan untuk memicu pembaruan otomatis saat file ini berubah.
const STATIC_CACHE_NAME = 'annur-islamic-static-v9'; // Versi dinaikkan
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v9'; // Versi dinaikkan

// Aset inti aplikasi (App Shell) yang akan di-cache saat instalasi.
const APP_SHELL_ASSETS = [
    // BARU: Path disesuaikan agar lebih universal
    './',
    './index.html',
    './manifest.json',
    './logo-annur.jpg',
    // BARU: Menambahkan file audio utama ke cache statis agar lebih cepat diakses
    'https://raw.githubusercontent.com/AnnurIslamic/Mp3/main/notifikasi.mp3',
    'https://raw.githubusercontent.com/AnnurIslamic/Mp3/main/adzansubuh.mp3',
    'https://raw.githubusercontent.com/AnnurIslamic/Mp3/main/mishary.mp3',
    'https://raw.githubusercontent.com/AnnurIslamic/Mp3/main/adzankota.mp3'
];

// Daftar host API dan sumber daya eksternal yang akan di-cache secara dinamis.
const DYNAMIC_HOSTS = [
    'api.aladhan.com',           // Untuk jadwal sholat
    'api.quran.gading.dev',      // Untuk teks dan metadata Al-Qur'an
    'api.alquran.cloud',         // Untuk audio Murottal per ayat
    'nominatim.openstreetmap.org', // Untuk mendapatkan nama kota dari koordinat
    'fonts.gstatic.com',         // Untuk file font
    'fonts.googleapis.com',      // Untuk CSS font
    'raw.githubusercontent.com'  // Untuk file audio (jika ada yang tidak di-cache di awal)
];

// Event 'install': Menyimpan App Shell ke dalam cache statis.
self.addEventListener('install', event => {
    console.log('[SW] Sedang menginstall Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[SW] Pre-caching App Shell & Audio Utama...');
            // Menggunakan addAll untuk menyimpan semua aset inti
            return cache.addAll(APP_SHELL_ASSETS);
        }).catch(error => {
            console.error('[SW] Gagal melakukan pre-cache:', error);
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
        // Strategi: Cache First (Coba ambil dari cache dulu)
        // Cocok untuk App Shell yang sudah disimpan.
        event.respondWith(
            caches.match(event.request).then(response => {
                // Jika ada di cache, langsung kembalikan.
                // Jika tidak, baru coba ambil dari jaringan.
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
            // Jika aplikasi sudah terbuka, fokus ke jendela yang sudah ada.
            for (const client of clientList) {
                if (client.url.endsWith('index.html') || client.url.endsWith('/')) {
                    return client.focus();
                }
            }
            // Jika aplikasi belum terbuka, buka jendela baru.
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});

// Service worker: giúp ứng dụng mở nhanh và vẫn hiện giao diện khi mất mạng.
// Không bao giờ lưu đệm /api (câu trả lời và giọng đọc luôn lấy từ server).
const CACHE = 'ttkc-v1';
const SHELL = ['/', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;

  // Trang: ưu tiên mạng (luôn mới), mất mạng thì dùng bản đã lưu
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  // Tệp tĩnh (js, css, font, ảnh): lấy từ đệm trước, chưa có thì tải rồi lưu
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});

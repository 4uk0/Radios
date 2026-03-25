const CACHE = 'radios-v6';
const ASSETS = [
  '/Radios/',
  '/Radios/index.html',
  '/Radios/manifest.json',
  '/Radios/icon-192.png',
  '/Radios/icon-512.png'
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
// Radio streams always go to network (never cache audio)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache radio streams or Supabase API calls
  if (
    url.hostname.includes('radio-browser') ||
    url.hostname.includes('supabase') ||
    e.request.url.includes('/json/stations')
  ) {
    return; // let browser handle normally
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Cache new valid responses
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      });
    }).catch(() => caches.match('/Radios/index.html'))
  );
});

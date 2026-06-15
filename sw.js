const CACHE = 'radios-v11';
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
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// Activate — clean old caches + take control of all tabs instantly
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => {
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

// Tell all open tabs to reload when new SW activates
self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
  });
});

// Fetch — network first for HTML (always fresh), cache for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache radio streams or Supabase API calls
  if (
    url.hostname.includes('radio-browser') ||
    url.hostname.includes('supabase') ||
    e.request.url.includes('/json/stations')
  ) {
    return;
  }

  // Network first for HTML — always get latest version
  if (e.request.url.includes('index.html') || e.request.url.endsWith('/Radios/') || e.request.url.endsWith('/Radios')) {
    e.respondWith(
      fetch(e.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache first for other assets (icons, manifest)
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      });
    }).catch(() => caches.match('/Radios/index.html'))
  );
});

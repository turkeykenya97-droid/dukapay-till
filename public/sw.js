const CACHE_NAME = 'dukapos-v1';
const OFFLINE_URL = '/offline.html';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/styles.css',
];

// API routes that should NOT be cached (real-time data)
const NETWORK_ONLY_PATTERNS = [
  '/_serverFn/', // TanStack Start server functions
  '/api/public/webhooks/', // SmartPay webhooks
];

// Routes that should use network-first strategy (try network, fall back to cache)
const NETWORK_FIRST_PATTERNS = [
  '/_serverFn/',
  '/api/',
];

/**
 * Check if a URL should be cached
 */
function shouldCache(url) {
  // Never cache external APIs or webhooks
  if (NETWORK_ONLY_PATTERNS.some(pattern => url.includes(pattern))) {
    return false;
  }
  // Cache static assets and HTML pages
  return !url.includes('?') || url.includes('.') || url === '/';
}

/**
 * Check if a URL should use network-first strategy
 */
function isNetworkFirstRoute(url) {
  return NETWORK_FIRST_PATTERNS.some(pattern => url.includes(pattern));
}

/**
 * Install event: cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets on install');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some static assets failed to cache:', err);
        // Continue even if some assets fail
        return Promise.resolve();
      });
    })
  );
  // Force this service worker to become the active SW immediately
  self.skipWaiting();
});

/**
 * Activate event: clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

/**
 * Fetch event: implement caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (different origin)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first strategy for API routes: try network, fall back to offline
  if (isNetworkFirstRoute(url.pathname)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Network-first strategy: try network, fall back to cache or offline page
 */
async function networkFirstStrategy(request) {
  try {
    // Try to fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses for offline use
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, checking cache:', request.url);
    
    // Fall back to cached response
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If this is a navigation request and we have no cache, show offline page
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL) || createOfflineResponse();
    }

    // Return offline error response
    return createOfflineResponse();
  }
}

/**
 * Cache-first strategy: use cache, fall back to network
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok && shouldCache(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Fetch failed for:', request.url);
    
    // If this is a navigation request, show offline page
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL) || createOfflineResponse();
    }

    // Return offline error response
    return createOfflineResponse();
  }
}

/**
 * Create a simple offline error response
 */
function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>DukaPOS - Offline</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 2rem; background: #f5f5f5; }
        .container { max-width: 400px; margin: 50vh auto 0; transform: translateY(-50%); }
        h1 { color: #16a34a; margin: 0; }
        p { color: #666; }
        button { background: #16a34a; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; }
        button:hover { background: #15803d; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>You're Offline</h1>
        <p>Please check your internet connection to process M-Pesa payments.</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    </body>
    </html>
    `,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

/**
 * Handle messages from clients (e.g., cache updates)
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

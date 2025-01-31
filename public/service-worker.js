// Timestamp will be replaced during build
const CACHE_NAME = 'abook-cache-{TIMESTAMP}';

const PRECACHE_FILES = [
	'/',  // Cache the root index.html
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(PRECACHE_FILES);
		})
	);
});

// Function to check if a request should be cached
function shouldCache(request) {
	const url = new URL(request.url);

	// Ignore non-origin requests
	if (url.origin !== location.origin) return false;
	// Only cache GET requests
	if (request.method !== 'GET') return false;
	// Ignore blob URLs
	if (url.protocol === 'blob:') return false;
	// Ignore browser extensions
	if (url.protocol === 'chrome-extension:') return false;

	return true;
}

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
});

self.addEventListener('fetch', (event) => {
	if (!shouldCache(event.request)) return;

	event.respondWith(
		caches.open(CACHE_NAME).then(cache => {
			return fetch(event.request).then((response) => {
				if (response && response.status === 200) cache.put(event.request, response.clone());
				return response;
			}).catch(() => {
				return cache.match(event.request);
			});
		})
	);
});
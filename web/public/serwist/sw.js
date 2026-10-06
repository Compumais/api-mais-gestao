// Descarta caches ao assumir a página. A troca de controle recarrega o app.
self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) =>
				Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))),
			)
			.then(() => self.clients.claim()),
	);
});

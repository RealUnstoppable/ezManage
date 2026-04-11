self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("app").then(cache => {
      return cache.addAll(["/"]);
    })
  );
});
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
}
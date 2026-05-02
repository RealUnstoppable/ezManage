## 2024-05-24 - [Firestore Transaction N+1 Queries]
**Learning:** Sequential reads (`await transaction.get()`) inside loops in Firestore transactions create N+1 query performance bottlenecks and can inadvertently violate the strict "read-before-write" SDK constraints if writes (like initializing order docs) are placed before the loop.
**Action:** Always pre-fetch all required documents concurrently at the start of the transaction using `Promise.all` before executing any write operations (`set`, `update`, `delete`).

## 2024-05-25 - [Throttling mousemove Events]
**Learning:** High-frequency events like `mousemove` can cause layout thrashing and drop frame rates if DOM measurements (like `getBoundingClientRect()`) and style updates are calculated directly in the callback.
**Action:** Throttle these calculations using `window.requestAnimationFrame()` to sync with the display refresh rate and ensure smooth 60fps animations.

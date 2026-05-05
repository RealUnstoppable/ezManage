## 2024-05-24 - [Firestore Transaction N+1 Queries]
**Learning:** Sequential reads (`await transaction.get()`) inside loops in Firestore transactions create N+1 query performance bottlenecks and can inadvertently violate the strict "read-before-write" SDK constraints if writes (like initializing order docs) are placed before the loop.
**Action:** Always pre-fetch all required documents concurrently at the start of the transaction using `Promise.all` before executing any write operations (`set`, `update`, `delete`).
## 2024-05-24 - [Bento Card Mousemove Optimization]
**Learning:** High-frequency mouse events like `mousemove` that trigger DOM measurements (`getBoundingClientRect`) and style updates (`transform`) cause significant layout thrashing. Wrapping this logic in `requestAnimationFrame` effectively throttles execution to sync with the display refresh rate.
**Action:** Consistently use `requestAnimationFrame` when updating styles continuously based on high-frequency DOM events (like mouse or scroll events) to ensure smooth animations.

## 2026-05-05 - [Admin Dashboard Concurrent Data Fetching]
**Learning:** Sequential `await getDocs()` calls in a single function create an N+1 latency bottleneck where each independent database query blocks the next, significantly degrading initial page load times for data-heavy pages like the admin dashboard.
**Action:** When fetching independent data collections on page load, group the queries into an array of Promises and execute them concurrently using `Promise.all()` or `Promise.allSettled()` to minimize total blocking time.

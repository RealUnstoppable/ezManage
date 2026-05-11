## 2024-05-24 - [Firestore Transaction N+1 Queries]
**Learning:** Sequential reads (`await transaction.get()`) inside loops in Firestore transactions create N+1 query performance bottlenecks and can inadvertently violate the strict "read-before-write" SDK constraints if writes (like initializing order docs) are placed before the loop.
**Action:** Always pre-fetch all required documents concurrently at the start of the transaction using `Promise.all` before executing any write operations (`set`, `update`, `delete`).
## 2024-05-24 - [Bento Card Mousemove Optimization]
**Learning:** High-frequency mouse events like `mousemove` that trigger DOM measurements (`getBoundingClientRect`) and style updates (`transform`) cause significant layout thrashing. Wrapping this logic in `requestAnimationFrame` effectively throttles execution to sync with the display refresh rate.
**Action:** Consistently use `requestAnimationFrame` when updating styles continuously based on high-frequency DOM events (like mouse or scroll events) to ensure smooth animations.
## 2024-05-11 - Dashboard Data Fetching Optimization
**Learning:** Sequential Firestore queries (`getDocs` with `await` inside separate `try/catch` blocks) create a severe N+1 latency bottleneck during initial page load, especially on data-heavy dashboards like `admin.html`.
**Action:** When fetching independent data from multiple collections (e.g., users, carts, orders, etc.), execute them concurrently using `Promise.allSettled()`. This guarantees all data requests run in parallel while still preventing a single failed query from halting the successful retrieval of others.

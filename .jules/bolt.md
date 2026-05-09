## 2024-05-24 - [Firestore Transaction N+1 Queries]
**Learning:** Sequential reads (`await transaction.get()`) inside loops in Firestore transactions create N+1 query performance bottlenecks and can inadvertently violate the strict "read-before-write" SDK constraints if writes (like initializing order docs) are placed before the loop.
**Action:** Always pre-fetch all required documents concurrently at the start of the transaction using `Promise.all` before executing any write operations (`set`, `update`, `delete`).
## 2024-05-24 - [Bento Card Mousemove Optimization]
**Learning:** High-frequency mouse events like `mousemove` that trigger DOM measurements (`getBoundingClientRect`) and style updates (`transform`) cause significant layout thrashing. Wrapping this logic in `requestAnimationFrame` effectively throttles execution to sync with the display refresh rate.
**Action:** Consistently use `requestAnimationFrame` when updating styles continuously based on high-frequency DOM events (like mouse or scroll events) to ensure smooth animations.
## 2024-05-24 - [Concurrent Firestore Queries]
**Learning:** Sequentially awaiting multiple independent Firestore `getDocs()` queries (like fetching users, carts, orders, etc., individually) during dashboard load creates a significant N+1 latency bottleneck.
**Action:** When multiple independent collections must be fetched on page load, aggregate the query promises into an array and execute them concurrently using `Promise.allSettled()`. This pattern effectively eliminates the bottleneck while isolating failures so that one faulty query doesn't block the rendering of the rest of the dashboard.

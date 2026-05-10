## 2024-05-24 - [Firestore Transaction N+1 Queries]
**Learning:** Sequential reads (`await transaction.get()`) inside loops in Firestore transactions create N+1 query performance bottlenecks and can inadvertently violate the strict "read-before-write" SDK constraints if writes (like initializing order docs) are placed before the loop.
**Action:** Always pre-fetch all required documents concurrently at the start of the transaction using `Promise.all` before executing any write operations (`set`, `update`, `delete`).
## 2024-05-24 - [Bento Card Mousemove Optimization]
**Learning:** High-frequency mouse events like `mousemove` that trigger DOM measurements (`getBoundingClientRect`) and style updates (`transform`) cause significant layout thrashing. Wrapping this logic in `requestAnimationFrame` effectively throttles execution to sync with the display refresh rate.
**Action:** Consistently use `requestAnimationFrame` when updating styles continuously based on high-frequency DOM events (like mouse or scroll events) to ensure smooth animations.
## 2024-05-24 - [Draft Sync Debounce Optimization]
**Learning:** High-frequency input events (`oninput`) that trigger expensive operations like extensive DOM querying (e.g., parsing a complex form to build a state object) and synchronous `localStorage` writes can block the main UI thread, causing typing jank and layout thrashing.
**Action:** Always debounce functions tied to high-frequency text input events using `setTimeout` (e.g., 500ms) to batch processing and ensure smooth typing performance.

## 2024-05-24 - [Firestore Transaction N+1 Queries]
**Learning:** Sequential reads (`await transaction.get()`) inside loops in Firestore transactions create N+1 query performance bottlenecks and can inadvertently violate the strict "read-before-write" SDK constraints if writes (like initializing order docs) are placed before the loop.
**Action:** Always pre-fetch all required documents concurrently at the start of the transaction using `Promise.all` before executing any write operations (`set`, `update`, `delete`).
## 2024-05-24 - [Bento Card Mousemove Optimization]
**Learning:** High-frequency mouse events like `mousemove` that trigger DOM measurements (`getBoundingClientRect`) and style updates (`transform`) cause significant layout thrashing. Wrapping this logic in `requestAnimationFrame` effectively throttles execution to sync with the display refresh rate.
**Action:** Consistently use `requestAnimationFrame` when updating styles continuously based on high-frequency DOM events (like mouse or scroll events) to ensure smooth animations.
## 2024-05-24 - [Synchronous LocalStorage Writes in Input Handlers]
**Learning:** Performing extensive DOM querying (`document.querySelectorAll`, `Array.forEach`) combined with synchronous writes (`localStorage.setItem`) directly inside high-frequency event listeners (like `oninput` for every keystroke) blocks the main UI thread and leads to severe typing latency/jank, particularly on low-end devices.
**Action:** Always wrap expensive state-gathering and storage operations tied to input events inside a debounce wrapper (e.g., `setTimeout` for ~500ms) to ensure execution only occurs after the user has paused interacting.

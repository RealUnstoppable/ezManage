## 2024-05-24 - [Firestore Transaction N+1 Queries]
**Learning:** Sequential reads (`await transaction.get()`) inside loops in Firestore transactions create N+1 query performance bottlenecks and can inadvertently violate the strict "read-before-write" SDK constraints if writes (like initializing order docs) are placed before the loop.
**Action:** Always pre-fetch all required documents concurrently at the start of the transaction using `Promise.all` before executing any write operations (`set`, `update`, `delete`).
## 2024-05-24 - [Bento Card Mousemove Optimization]
**Learning:** High-frequency mouse events like `mousemove` that trigger DOM measurements (`getBoundingClientRect`) and style updates (`transform`) cause significant layout thrashing. Wrapping this logic in `requestAnimationFrame` effectively throttles execution to sync with the display refresh rate.
**Action:** Consistently use `requestAnimationFrame` when updating styles continuously based on high-frequency DOM events (like mouse or scroll events) to ensure smooth animations.
## 2025-02-28 - [Dashboard N+1 Fetch Bottleneck]
**Learning:** In dashboards loading multiple independent data sources (like Firebase collections), sequential `await` calls compound latency (N+1 delay).
**Action:** Always fetch independent datasets concurrently using `Promise.allSettled()` to restrict total load time to the duration of the slowest query, preserving isolated error handling per resource.
## 2025-02-28 - [DOM Rendering in Loops]
**Learning:** Using `innerHTML +=` inside loops (e.g., `forEach`) causes significant O(n²) performance degradation because the browser re-serializes, re-parses, and re-renders the DOM node on every iteration. Additionally, creating temporary DOM elements (`document.createElement`) purely for text sanitization in high-frequency rendering paths introduces redundant memory allocations and garbage collection overhead.
**Action:** Always accumulate HTML strings using `Array.map().join('')` or string concatenation and apply them to the DOM exactly once. For high-frequency text sanitization, prefer regex-based string replacements over creating intermediate DOM nodes.

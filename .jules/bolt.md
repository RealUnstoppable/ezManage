## 2024-05-24 - [Firestore Transaction N+1 Queries]
**Learning:** Sequential reads (`await transaction.get()`) inside loops in Firestore transactions create N+1 query performance bottlenecks and can inadvertently violate the strict "read-before-write" SDK constraints if writes (like initializing order docs) are placed before the loop.
**Action:** Always pre-fetch all required documents concurrently at the start of the transaction using `Promise.all` before executing any write operations (`set`, `update`, `delete`).
## 2024-05-24 - [Bento Card Mousemove Optimization]
**Learning:** High-frequency mouse events like `mousemove` that trigger DOM measurements (`getBoundingClientRect`) and style updates (`transform`) cause significant layout thrashing. Wrapping this logic in `requestAnimationFrame` effectively throttles execution to sync with the display refresh rate.
**Action:** Consistently use `requestAnimationFrame` when updating styles continuously based on high-frequency DOM events (like mouse or scroll events) to ensure smooth animations.
## 2025-02-28 - [Dashboard N+1 Fetch Bottleneck]
**Learning:** In dashboards loading multiple independent data sources (like Firebase collections), sequential `await` calls compound latency (N+1 delay).
**Action:** Always fetch independent datasets concurrently using `Promise.allSettled()` to restrict total load time to the duration of the slowest query, preserving isolated error handling per resource.
## 2026-05-13 - [Search Input Debouncing]
**Learning:** High-frequency input events (like `oninput`) that trigger expensive DOM manipulations (like rendering history lists) cause the main UI thread to block, leading to typing jank.
**Action:** Use a debounce function with `setTimeout` to delay the execution of the render function until the user stops typing, ensuring smooth UI performance.
## 2025-02-18 - Optimistic UI State Management
**Learning:** Sequential full-list fetch and render operations after local write actions block the main thread and create perceived UI lag for the user. When using Firebase, `.get()` calls to collections can be expensive.
**Action:** Implemented Optimistic UI rendering. Immediately constructed and prepended visual elements into the DOM during `submitShiftNote` and removed them manually inside `catch` blocks if the network request fails, fully bypassing the need for a redundant `fetchShiftNotes()` re-render cycle.
## 2024-05-24 - [DOM Insertions Bottleneck]
**Learning:** Sequential calls to `.appendChild()` inside loops cause expensive layout thrashing and repaint cycles on the main thread, leading to perceived UI jank during rendering.
**Action:** Always batch DOM insertions using a `DocumentFragment` (`document.createDocumentFragment()`) before appending the entire batch to the live DOM in a single operation.
## 2025-05-19 - [O(n²) DOM Updates Avoidance]
**Learning:** Performing string concatenations via `innerHTML += ...` within iterative loops causes O(n²) performance degradation by forcing the browser to continually re-serialize, parse, and render the entire container.
**Action:** Replace `html +=` inside loops with array accumulation using `.map().join('')` before setting `.innerHTML` once at the end of the data fetch block.

## 2024-05-24 - [DOM Append Bottleneck in Admin Dashboard]
**Learning:** Sequential `appendChild` calls within loops (e.g., rendering table rows in `admin.html` and `harmonytunes.js`) create performance bottlenecks by causing repetitive DOM layout recalculations.
**Action:** Replace sequential `appendChild` inside loops with a single `innerHTML` assignment using array `.map().join('')` for faster, batched string insertions. When event listeners need to be attached programmatically to each node, use a `DocumentFragment` to batch the DOM insertions instead.
## 2026-05-13 - [DOM Insertions Bottleneck]
**Learning:** Sequential calls to `appendChild()` inside loops cause expensive layout thrashing and repaint cycles on the main thread, leading to perceived UI jank during rendering.
**Action:** Always batch DOM insertions using a `DocumentFragment` (`document.createDocumentFragment()`) before appending the entire batch to the live DOM in a single operation.
## 2026-06-13 - Prevent test suite regressions from messy test rewrites\n**Learning:** When fixing test suite failures (e.g., ESM syntax errors or failing mocks), aggressively overwriting the entire test file or deleting unrelated unit tests to force a passing state can cause regressions.\n**Action:** Modifications must be strictly scoped to the underlying configuration or syntax issue to preserve existing test coverage.

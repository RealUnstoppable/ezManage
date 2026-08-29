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
## 2026-05-26 - [Firebase Singleton Initialization]
**Learning:** Initializing Firebase using `initializeApp` directly without checking if an app instance already exists can cause token mismatches and crashes during hot-module reloading or consecutive imports. Furthermore, `initializeFirestore` will throw an error if Firestore is already initialized on an existing app instance.
**Action:** Always wrap initialization logic as a singleton: `const app = !getApps().length ? initializeApp(config) : getApp()`. Wrap `initializeFirestore` in a `try/catch` and fallback to `getFirestore(app)` if it throws.
## 2026-05-13 - [DOM Insertions Bottleneck]
**Learning:** Sequential calls to `appendChild()` inside loops cause expensive layout thrashing and repaint cycles on the main thread, leading to perceived UI jank during rendering.
**Action:** Always batch DOM insertions using a `DocumentFragment` (`document.createDocumentFragment()`) before appending the entire batch to the live DOM in a single operation.
## 2026-05-13 - [Interval Layout Thrashing]
**Learning:** Frequent interval updates (like `setInterval(fn, 1000)`) that write to the DOM (`element.textContent = value`) force the browser to recalculate layout and repaint, even if the new text value is identical to the old one, leading to unnecessary battery drain and layout thrashing.
**Action:** Always cache the current state locally within the closure or class and wrap the DOM assignment in a strict equality check (`if (newValue !== lastValue)`) so the browser only repaints when the actual visible content changes.
## 2024-05-24 - [Interval DOM Property Updates]
**Learning:** In polling loops (e.g., `setInterval`), repeatedly setting a DOM property like `textContent` with an identical value can still trigger layout thrashing and function evaluations.
**Action:** Always cache the calculated state (e.g., `lastGreeting`) before applying changes, and wrap the DOM assignments in an `if (newState !== lastState)` condition.

## 2026-06-03 - [O(n²) DOM Updates in Dashboard Metrics Avoidance]
**Learning:** In dashboards loading and iterating through snapshot data (like `fetchGlobalMetrics`), using `appendChild` inside a loop causes layout thrashing and repaint cycles on the main thread.
**Action:** Replace sequential `appendChild` inside loops with array accumulation using `.map().join('')` before setting `.innerHTML` once.
## 2024-05-27 - Batch DOM insertions with DocumentFragment
**Learning:** In vanilla JS loops where elements are individually appended to the DOM (e.g. \`tbody.appendChild(tr)\`), layout thrashing can occur causing performance issues, specifically for lists with many items.
**Action:** Always batch DOM insertions using a \`DocumentFragment\` when appending multiple elements in a loop.
## 2026-06-25 - [Repeated Firebase DB Docs Fetch]
**Learning:** Functions invoked via callbacks from listeners that span multiple files (e.g., \`auth.onAuthStateChanged\`) will fire simultaneously. Without a caching layer, they execute redundant concurrent network fetch queries (like \`db.collection('users').doc(uid).get()\`), causing latency and blocking operations.
**Action:** Always wrap independent multi-listener fetched resources with a generic memoization layer using a \`Map\` cache to immediately resolve redundant Promise requests.
## 2024-07-22 - [Timeupdate DOM Thrashing]
**Learning:** High-frequency media player events like `timeupdate` (firing multiple times per second) cause severe layout thrashing if they unconditionally update the DOM's `textContent`, even when the rendered integer seconds or formatted time string haven't actually changed.
**Action:** Always cache the integer seconds (or formatted time string) outside the event handler scope. Only evaluate the expensive format functions and update the DOM when the actual integer second value changes.

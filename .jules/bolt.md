## 2024-05-18 - Incremental DOM updates for Snapshot Listeners
**Learning:** Replacing entire DOM fragments via `.innerHTML = ''` on every real-time Firestore snapshot triggers significant O(N) layout thrashing and forces clients to constantly re-render unmodified data.
**Action:** Always utilize `snapshot.docChanges()` combined with `DocumentFragment` or incremental `insertBefore`/`replaceChild` updates in vanilla JS to process only the 'added', 'modified', and 'removed' differences. Remember to update database indexes (e.g., `firestore.indexes.json`) when switching from client-side sorting to server-side `orderBy`.
## 2026-10-17 - Optimize DOM Appending with DocumentFragment
**Learning:** In Vanilla JS components handling arrays (like js/inventory.js), using unbatched `appendChild()` within a loop causes layout thrashing and O(n^2) reflow bottlenecks.
**Action:** Always use `DocumentFragment` or batched array string building (`array.map().join('')`) to batch DOM insertions.

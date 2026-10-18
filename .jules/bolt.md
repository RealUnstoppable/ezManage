## 2024-05-18 - Incremental DOM updates for Snapshot Listeners
**Learning:** Replacing entire DOM fragments via `.innerHTML = ''` on every real-time Firestore snapshot triggers significant O(N) layout thrashing and forces clients to constantly re-render unmodified data.
**Action:** Always utilize `snapshot.docChanges()` combined with `DocumentFragment` or incremental `insertBefore`/`replaceChild` updates in vanilla JS to process only the 'added', 'modified', and 'removed' differences. Remember to update database indexes (e.g., `firestore.indexes.json`) when switching from client-side sorting to server-side `orderBy`.
## 2024-10-24 - Layout Thrashing with Sequential appendChild
**Learning:** Sequential `appendChild` calls inside an array loop (e.g., in `renderLocalInventory`) trigger O(N^2) reflow bottlenecks and severe layout thrashing for data-heavy arrays.
**Action:** Strictly use `DocumentFragment` to batch DOM node insertions before appending them to the live DOM container.

## 2024-05-18 - Incremental DOM updates for Snapshot Listeners
**Learning:** Replacing entire DOM fragments via `.innerHTML = ''` on every real-time Firestore snapshot triggers significant O(N) layout thrashing and forces clients to constantly re-render unmodified data.
**Action:** Always utilize `snapshot.docChanges()` combined with `DocumentFragment` or incremental `insertBefore`/`replaceChild` updates in vanilla JS to process only the 'added', 'modified', and 'removed' differences. Remember to update database indexes (e.g., `firestore.indexes.json`) when switching from client-side sorting to server-side `orderBy`.

## 2024-05-19 - Debouncing expensive event listeners
**Learning:** Binding expensive render functions directly to the `input` event on search fields causes excessive DOM layout thrashing and computation.
**Action:** Always wrap the event handler or the render logic in a `debounce` function.

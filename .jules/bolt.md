## 2024-05-18 - Incremental DOM updates for Snapshot Listeners
**Learning:** Replacing entire DOM fragments via \`.innerHTML = ''\` on every real-time Firestore snapshot triggers significant O(N) layout thrashing and forces clients to constantly re-render unmodified data.
**Action:** Always utilize \`snapshot.docChanges()\` combined with \`DocumentFragment\` or incremental \`insertBefore\`/\`replaceChild\` updates in vanilla JS to process only the 'added', 'modified', and 'removed' differences. Remember to update database indexes (e.g., \`firestore.indexes.json\`) when switching from client-side sorting to server-side \`orderBy\`.

## 2025-10-09 - String Concatenation vs Array Joins in Loops
**Learning:** Using \`+=\` string concatenation inside loops iterating over large datasets (like Firestore snapshots) creates O(n²) string copying behavior, which can cause measurable lag in vanilla JS applications.
**Action:** When building large HTML strings dynamically inside loops, push the string fragments into an array (e.g., \`htmlParts.push(\`...\`)\`) and then use \`.join('')\` at the end to assign to \`.innerHTML\`.

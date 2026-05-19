## 2025-02-18 - Optimistic UI State Management
**Learning:** Sequential full-list fetch and render operations after local write actions block the main thread and create perceived UI lag for the user. When using Firebase, `.get()` calls to collections can be expensive.
**Action:** Implemented Optimistic UI rendering. Immediately constructed and prepended visual elements into the DOM during `submitShiftNote` and removed them manually inside `catch` blocks if the network request fails, fully bypassing the need for a redundant `fetchShiftNotes()` re-render cycle.

## 2025-05-18 - Firebase Vanilla Setup
**Learning:** For ezManage app initialization of Firebase, singleton checking is required, specifically inside `index.html` where scripts may execute twice if not wrapped correctly. There are no React components in this project to fix.
**Action:** Replaced inline duplicate initialization with singleton `!window.firebase.apps.length ? window.firebase.initializeApp(...) : window.firebase.app()`.

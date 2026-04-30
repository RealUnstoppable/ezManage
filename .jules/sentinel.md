## 2024-04-29 - Cross-Site Scripting (XSS) in Admin Dashboard
**Vulnerability:** XSS via unescaped user input (username, email, feature request messages) interpolated directly into `innerHTML` in `admin.html`.
**Learning:** The prompt memory states that `admin.html` uses a custom `escapeHTML` utility function, but it's not actually defined or used in the file! User input like `user.username`, `user.email`, and `req.message` is inserted directly into the DOM, making the admin dashboard vulnerable to stored XSS. An attacker could craft a malicious feature request or username to execute scripts in the admin's browser.
**Prevention:** Implement an `escapeHTML` utility function and use it to sanitize all user-controlled data before string interpolation into `innerHTML`, or use `textContent` when possible.
## 2026-04-30 - Insecure Public Write Access in Firestore
**Vulnerability:** The `/product_stats/{productId}` collection in `firestore.rules` allowed unauthenticated public writes, enabling anyone to modify product order statistics.
**Learning:** Firestore collections meant for tracking global statistics must be protected against unauthorized modifications from the client. Even if the client needs to update it (e.g., when placing an order), rules must restrict who can update it and what fields they can change.
**Prevention:** Always restrict `create` and `update` access to authenticated users (`request.auth != null`) and use `hasOnly()` combined with type checking to ensure only intended fields (like `orderedCount`) can be modified.

## 2024-04-29 - Cross-Site Scripting (XSS) in Admin Dashboard
**Vulnerability:** XSS via unescaped user input (username, email, feature request messages) interpolated directly into `innerHTML` in `admin.html`.
**Learning:** The prompt memory states that `admin.html` uses a custom `escapeHTML` utility function, but it's not actually defined or used in the file! User input like `user.username`, `user.email`, and `req.message` is inserted directly into the DOM, making the admin dashboard vulnerable to stored XSS. An attacker could craft a malicious feature request or username to execute scripts in the admin's browser.
**Prevention:** Implement an `escapeHTML` utility function and use it to sanitize all user-controlled data before string interpolation into `innerHTML`, or use `textContent` when possible.
## 2026-04-30 - Insecure Public Write Access in Firestore
**Vulnerability:** The `/product_stats/{productId}` collection in `firestore.rules` allowed unauthenticated public writes, enabling anyone to modify product order statistics.
**Learning:** Firestore collections meant for tracking global statistics must be protected against unauthorized modifications from the client. Even if the client needs to update it (e.g., when placing an order), rules must restrict who can update it and what fields they can change.
**Prevention:** Always restrict `create` and `update` access to authenticated users (`request.auth != null`) and use `hasOnly()` combined with type checking to ensure only intended fields (like `orderedCount`) can be modified.
## 2026-05-01 - Avoid Scope Creep in Targeted Security Fixes
**Vulnerability:** N/A (Process issue)
**Learning:** When operating as Sentinel under strict constraints (fix *one* issue, under 50 lines), do not run blanket auto-formatters (e.g., `npm run lint -- --fix`) or attempt to fix multiple disconnected vulnerabilities simultaneously. This violates the role's instructions and introduces unrelated code changes, causing PR rejection.
**Prevention:** Strictly limit code edits to the single identified vulnerability. Only run linters or formatters on the specific lines modified, or disable auto-fixing if it modifies unrelated code.
## 2026-05-03 - Insecure Public Write Access to Global Collections
**Vulnerability:** The `/site_stats/{docId}` and `/newsletterSubscribers/{email}` collections in `firestore.rules` allowed unauthenticated public writes (`allow write: if true;`). This enabled any visitor to modify or delete global site statistics and the entire newsletter subscriber list.
**Learning:** `allow write` in Firestore includes `create`, `update`, and `delete`. Using `allow write: if true` for a public submission form (like a newsletter) inadvertently grants full deletion and modification rights to unauthenticated users.
**Prevention:** Always use specific verbs (`create`, `update`, `delete`) instead of `write` when configuring rules for public-facing data. Restrict `delete` and broad `update` operations to administrators or the data owner.
## 2026-05-05 - Insecure Access Controls on Unused Collections (IDOR)
**Vulnerability:** The `/invites/{inviteId}` collection in `firestore.rules` allowed overly permissive access (`allow read, write: if request.auth != null;`), creating an Insecure Direct Object Reference (IDOR) vulnerability where any authenticated user could read or modify any invite.
**Learning:** Even if a collection is not actively used in the current frontend codebase, overly permissive rules on backend data structures can expose the database to unauthorized scraping or data manipulation if the endpoints exist.
**Prevention:** Always restrict access to data structures using the Principle of Least Privilege, enforcing strict bounds (like `isAdmin()`) when explicit document ownership mappings are unknown.

## 2026-05-05 - Cross-Site Scripting (XSS) via Unsanitized Interpolation
**Vulnerability:** In `easy-ai.html`, object keys (`name`) derived from dynamic predictions were interpolated directly into the DOM via `div.innerHTML = \`<div ...>${name}</div>\``.
**Learning:** Even when data isn't directly sourced from user input (e.g., dynamically inferred object keys), interpolating variables directly into `innerHTML` without escaping can create XSS vectors if upstream dependencies or user configurations define those keys.
**Prevention:** Always use a utility function (like `escapeHTML`) to sanitize dynamically generated variables before using them in `innerHTML`, or prefer using safer DOM manipulation methods like `.textContent`.

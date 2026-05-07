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
## 2026-05-15 - Privilege Escalation via User Creation
**Vulnerability:** The `users` collection rules in `firestore.rules` restricted sensitive fields (`plan`, `subscription`) during document updates, but failed to restrict them during initial document creation.
**Learning:** Firestore rules must consistently enforce schema and field restrictions across both `create` and `update` operations. Attackers can bypass update restrictions by injecting unauthorized fields (like premium plans) during the initial creation request.
**Prevention:** Always mirror restricted field validations for both `create` and `update` rules, or use a shared validation function to ensure consistency.

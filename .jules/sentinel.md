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

## 2026-05-04 - Mass Assignment Vulnerability in User Creation
**Vulnerability:** The `/users/{userId}` `allow create` rule in `firestore.rules` prevented injection of `isBanned` and `membershipLevel` keys but failed to prevent injection of `plan` and `subscription` keys. This allowed an unauthenticated attacker creating a new user document to elevate their privileges to a paid tier immediately.
**Learning:** Security controls on document creation must mirror the strictness of document updates. When using `request.resource.data.keys().hasAny()`, it is critical to perform an exhaustive review of all sensitive fields present in the schema to ensure no privileged attributes can be injected via mass assignment.
**Prevention:** Ensure that the forbidden key lists in `hasAny()` for `create` rules are synchronized with the `hasAny()` lists for `update` rules, comprehensively covering all fields related to roles, billing, and system flags.
## 2026-05-16 - Explicit String Casting in escapeHTML Utilities
**Vulnerability:** A custom `escapeHTML` utility function in `admin.html` allowed array injection attacks by checking `if (typeof str !== 'string') return str;`. A malicious array of strings passed this check but was implicitly serialized into unsafe HTML strings by JavaScript, leading to Stored XSS. In `panel-ai-admin.html`, user inputs were not wrapped in an escape utility.
**Learning:** The `typeof` check is insufficient to prevent XSS. It's critical to explicitly coerce inputs into strings (`String(str)`) prior to running regex replacement chains to ensure all primitive values and implicitly serialized objects are securely encoded.
**Prevention:** Use a regex-based replacement chain alongside strict string coercion (`String(str)`), while properly handling edge cases like the number `0` (`if (!str && str !== 0) return '';`), across all custom escaping utility functions.

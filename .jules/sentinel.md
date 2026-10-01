## 2024-05-18 - Fix Hardcoded Plaintext Password Storage
**Vulnerability:** Shift group passwords were being stored in plaintext in the Firestore database (`groupDoc.data().password`) and directly compared with plaintext payloads during authentication (`request_join`). This is a critical security vulnerability as any database leak exposes all group passwords.
**Learning:** When adding hashing algorithms to legacy codebases, using a simple heuristic like `.includes(":")` to determine if a stored string is a hash vs a legacy plaintext password is too broad and can inadvertently lock out users who used colons in their valid passwords.
**Prevention:** Always use a distinct, cryptographic signature prefix (like `$scrypt$`) when creating hashes so they can be unambiguously identified when implementing fallback/upgrade logic (`storedPassword.startsWith("$scrypt$")`).
## 2026-10-01 - Standardize Cloud Function Auth
**Vulnerability:** Inconsistent authentication handling and missing strict input validation in manageShiftMarketplace.
**Learning:** Cloud functions must use the centralized getAuthAndPayload helper to ensure Gen 2 compatibility and robust, consistent auth checks, and rely on checkRequiredFields to prevent silent data corruption or IDOR from missing fields.
**Prevention:** Always leverage centralized authentication and validation utilities (getAuthAndPayload, checkRequiredFields) for every new cloud function added to the backend.

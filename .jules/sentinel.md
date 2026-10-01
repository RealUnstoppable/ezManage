## 2024-05-18 - Fix Hardcoded Plaintext Password Storage
**Vulnerability:** Shift group passwords were being stored in plaintext in the Firestore database (`groupDoc.data().password`) and directly compared with plaintext payloads during authentication (`request_join`). This is a critical security vulnerability as any database leak exposes all group passwords.
**Learning:** When adding hashing algorithms to legacy codebases, using a simple heuristic like `.includes(":")` to determine if a stored string is a hash vs a legacy plaintext password is too broad and can inadvertently lock out users who used colons in their valid passwords.
**Prevention:** Always use a distinct, cryptographic signature prefix (like `$scrypt$`) when creating hashes so they can be unambiguously identified when implementing fallback/upgrade logic (`storedPassword.startsWith("$scrypt$")`).

## 2026-09-23 - Fix Hardcoded Fallback Secrets
**Vulnerability:** Stripe secret keys (\`STRIPE_SECRET\`, \`STRIPE_WEBHOOK_SECRET\`) were hardcoded with fallback placeholders like \`"sk_test_placeholder"\` in \`backend/index.js\` and \`server.js\`.
**Learning:** Hardcoding fallback placeholder secrets (especially those starting with prefixes like \`sk_\` or \`whsec_\`) triggers secret scanners, misleads the runtime into attempting invalid authentication calls, and hides misconfigurations. Applications should fail securely and explicitly when critical environment variables are missing.
**Prevention:** Never use the `|| "placeholder"` pattern for sensitive keys. Explicitly validate environment variables at startup and throw or log a critical error if they are undefined.

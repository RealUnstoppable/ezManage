# Firebase Domain Whitelist Instructions

If you are experiencing CORS errors (`auth/network-request-failed` or `firestore/unavailable`), ensure the domain `ezmanage.realunstoppable.store` is properly whitelisted in your Firebase Console.

## Authentication Whitelisting
1. Go to the Firebase Console (console.firebase.google.com).
2. Select your project.
3. In the left navigation pane, click on **Authentication**.
4. Navigate to the **Settings** tab.
5. In the **Authorized domains** section, click **Add domain**.
6. Enter `ezmanage.realunstoppable.store` and click **Add**.

## Firestore Network / CORS Notes
Firestore generally manages CORS out-of-the-box for SDK requests, but long-polling fallback relies on network access.
Ensure that your network allows access to the Firestore endpoints.

If you are using experimental Long Polling (`experimentalForceLongPolling: true`) and still facing CORS issues when communicating with Firestore REST APIs/Cloud Functions:
1. Verify the `cors` package is correctly applied in your Cloud Functions.
2. If using App Check, ensure the domain is registered in the App Check settings.
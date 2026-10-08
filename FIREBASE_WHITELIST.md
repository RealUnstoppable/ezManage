# Authorized Domains Setup for Firebase

To whitelist the production domain `ezmanage.realunstoppable.store` in the Firebase Console:

## Authentication Whitelisting
1. Go to the Firebase Console (console.firebase.google.com).
2. Select your project (`dts-hub-website`).
3. In the left navigation pane, click on **Authentication**.
4. Navigate to the **Settings** tab.
5. In the **Authorized domains** section, click **Add domain**.
6. Enter `ezmanage.realunstoppable.store` and click **Add**.

## Firestore
Note: Firestore CORS restrictions are generally handled automatically based on your initialized domains, but you must ensure your `firestore.rules` are correctly deployed so that the production domain clients can make authenticated requests.

If you are using experimental Long Polling (`experimentalForceLongPolling: true`) and still facing CORS issues when communicating with Firestore REST APIs/Cloud Functions:
1. Verify the `cors` package is correctly applied in your Cloud Functions.
2. If using App Check, ensure the domain is registered in the App Check settings.
## Firestore Rule & Database Whitelisting Note
1. Note: Firestore rules are handled via the `firestore.rules` file deployment.
2. Ensure you have properly deployed your `firestore.rules` using the Firebase CLI `firebase deploy --only firestore:rules` to allow authorized read/write access.

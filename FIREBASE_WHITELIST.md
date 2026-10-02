# Authorized Domains Setup for Firebase

To whitelist the production domain `ezmanage.realunstoppable.store` in the Firebase Console:

## Authentication
1. Go to **Authentication** -> **Settings** -> **Authorized domains**
2. Click **Add domain**
3. Enter `ezmanage.realunstoppable.store` and click Add.

## Firestore
Note: Firestore CORS restrictions are generally handled automatically based on your initialized domains, but you must ensure your `firestore.rules` are correctly deployed so that the production domain clients can make authenticated requests.

If using third-party APIs that require origin whitelisting in your Cloud Functions, make sure to add `https://ezmanage.realunstoppable.store` to their respective allowed origins lists.

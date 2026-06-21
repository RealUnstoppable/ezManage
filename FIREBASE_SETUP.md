# Firebase Setup & Authorized Domains Configuration

To properly resolve the `auth/network-request-failed` and CORS errors relating to authentication, ensure that your application domains are whitelisted.

## Whitelisting in Firebase Console

1. Navigate to the **Firebase Console**.
2. Select your project (`dts-hub-website` or equivalent).
3. Go to **Authentication** in the left-hand menu.
4. Go to the **Settings** tab.
5. Click on **Authorized domains**.
6. Add the following domain to the list of authorized domains:
   - `ezmanage.realunstoppable.store`
7. By doing this, Firebase Auth will accept authentication requests coming from this origin.

## Firestore CORS Configuration (If Necessary)

If you are using experimental Long Polling (`experimentalForceLongPolling: true`) and still facing CORS issues when communicating with Firestore REST APIs/Cloud Functions:
1. Ensure your Google Cloud Project has the correct CORS settings for any external functions or storage buckets.
2. In most standard setups using the Firebase Web SDK, Firestore connects via WebSockets or Long Polling seamlessly, provided the Authorized domains for Auth are correctly configured.

# Firebase Configuration Instructions

To resolve Authentication and Firestore connection issues ("auth/network-request-failed" and "firestore/unavailable") when accessing ezManage via the production domain (`ezmanage.realunstoppable.store`), you must whitelist the domain in your Firebase project.

## 1. Whitelist Domain for Firebase Authentication
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project (`dts-hub-website`).
3. In the left sidebar, navigate to **Authentication** > **Settings** (or the **Settings** tab within Authentication).
4. Scroll down to the **Authorized domains** section.
5. Click **Add domain**.
6. Enter `ezmanage.realunstoppable.store` and click **Add**.

## 2. Whitelist Domain/Origin (If using App Check / API Key Restrictions)
If your Google Cloud API key has HTTP referrer restrictions:
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select the API key used in `firebaseConfig` (e.g., `Browser key (auto created by Firebase)`).
3. Under **Application restrictions**, if set to `HTTP referrers (web sites)`, add `*ezmanage.realunstoppable.store/*` to the list.
4. Click **Save**.

These configurations will ensure your app successfully connects and authenticates on the production domain.
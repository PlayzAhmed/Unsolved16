# Firebase setup

1. Create a Firebase project and register a **Web app**. Copy its public configuration into `.env.local` using `.env.example`.
2. In **Authentication**, enable Email/Password. Configure an authorized domain for each deployed site and enable email-enumeration protection and a strong password policy.
3. Create a service account with only the Firebase Admin SDK credentials needed by this app. Put its project ID, client email, and private key in the server-only `FIREBASE_*` variables. Never prefix these with `NEXT_PUBLIC_`.
4. Create the Firestore database, then deploy the checked-in rules:

```bash
firebase deploy --only firestore:rules
```

The client only uses Firebase Authentication. Calculator history and PDFs go through protected Next.js routes, which verify Firebase ID tokens and derive the owner from the verified token. PDFs are archived as base64 inside the owner's Firestore report document (small files, free tier); `GET /api/reports/:reportId` requires the owning account's token. A Storage bucket is optional and not required by the app.

## Accounts and guest mode

- The sign-in / sign-up modal lives in `src/components/auth-dialog.tsx` and is opened from the navbar account control and the landing-page account card. There is no separate login route.
- On every sign-in, the app upserts a profile document at `users/{uid}` through `POST /api/profile` (Admin SDK, server-only). No client writes are allowed by `firestore.rules`.
- The dashboard saves each calculation to `users/{uid}/calculations`. The `/history` page lists the latest 50 and links each one to its green report; it is reachable from the bottom navigation, the account menu, and the dashboard's "عرض الكل" link.
- Guest mode is local-only: `localStorage` key `energytwin:guest`. Guests can run the calculator and download a locally generated PDF, but nothing is stored in Firebase. Guest reports receive a local report ID only. The report screen, dashboard, and history page show a prompt to create an account.
- Every signed-in report gets a unique `ET-YYYY-XXXXXXXXXXXX` ID and is registered in `users/{uid}/reports` as soon as the report page opens. The ID is shown on the report before download; the generated PDF is attached to the same Firestore record when the user downloads it.
- Guests who sign in later start with an empty account; guest calculations are not migrated.
- If `NEXT_PUBLIC_FIREBASE_*` is missing, the web SDK reports the app as unconfigured and the auth dialog disables email/password while still offering guest mode. Server routes also need the `FIREBASE_*` Admin credentials.
- PDF reports are archived in `users/{uid}/reports/{reportId}` as base64 (up to ~650KB), so no paid Storage bucket is needed. Larger reports fall back to a local PDF download and show a notice; calculation history still saves in Firestore.

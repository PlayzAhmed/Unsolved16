# Firebase setup

1. Create a Firebase project and register a **Web app**. Copy its public configuration into `.env.local` using `.env.example`.
2. In **Authentication**, enable Email/Password. Configure an authorized domain for each deployed site and enable email-enumeration protection and a strong password policy.
3. Create a service account with only the Firebase Admin SDK credentials needed by this app. Put its project ID, client email, and private key in the server-only `FIREBASE_*` variables. Never prefix these with `NEXT_PUBLIC_`.
4. Create the Firestore database and Storage bucket, then deploy the checked-in rules:

```bash
firebase deploy --only firestore:rules,storage
```

The client only uses Firebase Authentication. Calculator history and PDFs go through protected Next.js routes, which verify Firebase ID tokens and derive the owner from the verified token. PDFs are private in Storage; `GET /api/reports/:reportId` requires the owning account's token.

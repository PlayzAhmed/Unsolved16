'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.appId
);

let app: FirebaseApp | undefined;

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  app ??= getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  return firebaseApp ? getAuth(firebaseApp) : null;
}

export async function createAccount(email: string, password: string, displayName?: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase is not configured.');
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase is not configured.');
  return (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
}

export async function signOutUser() {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
}

export type { User };

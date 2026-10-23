'use client';

import { getFirebaseAuth } from '@/lib/firebase/client';

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error('Sign in is required to save this data.');
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

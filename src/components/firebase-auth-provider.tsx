'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';

interface FirebaseAuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue>({ user: null, loading: false, configured: false });

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onIdTokenChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  return <FirebaseAuthContext.Provider value={{ user, loading, configured: isFirebaseConfigured }}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuth() {
  return useContext(FirebaseAuthContext);
}

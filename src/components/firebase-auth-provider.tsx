'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import {
  AUTH_PROFILE_UPDATED_EVENT,
  getFirebaseAuth,
  isFirebaseConfigured,
  signOutUser,
} from '@/lib/firebase/client';
import { authenticatedFetch } from '@/lib/firebase/api-client';

const GUEST_STORAGE_KEY = 'energytwin:guest';
const GUEST_CHANGE_EVENT = 'energytwin:guest-change';

interface FirebaseAuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  continueAsGuest: () => Promise<void>;
  leaveGuestMode: () => void;
  signOutAccount: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue>({
  user: null,
  loading: true,
  configured: false,
  isGuest: false,
  isAuthenticated: false,
  continueAsGuest: async () => undefined,
  leaveGuestMode: () => undefined,
  signOutAccount: async () => undefined,
});

function readGuestFlag(): boolean {
  try {
    return window.localStorage.getItem(GUEST_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribeGuestFlag(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(GUEST_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(GUEST_CHANGE_EVENT, onChange);
  };
}

function writeGuestFlag(value: boolean) {
  try {
    if (value) {
      window.localStorage.setItem(GUEST_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(GUEST_STORAGE_KEY);
    }
  } catch {
    // Private browsing can block storage; the in-memory state still works.
  }
  window.dispatchEvent(new Event(GUEST_CHANGE_EVENT));
}

async function syncProfile(user: User) {
  if (!isFirebaseConfigured) return;
  const response = await authenticatedFetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: user.displayName ?? '',
      email: user.email ?? '',
    }),
  });
  if (!response.ok) {
    throw new Error(`Profile sync failed: ${response.status}`);
  }
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authRevision, refreshAuthView] = useReducer((value: number) => value + 1, 0);
  const isGuest = useSyncExternalStore(subscribeGuestFlag, readGuestFlag, () => false);
  const profileSyncedFor = useRef<string | null>(null);
  const loading = isFirebaseConfigured && !authChecked;

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();
    if (!auth) return;

    return onIdTokenChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthChecked(true);
      if (nextUser) writeGuestFlag(false);
    });
  }, []);

  // Firebase updates the current user object in place after updateProfile, so
  // force a render when a freshly-created account receives its display name.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const handleProfileUpdated = () => {
      setUser(getFirebaseAuth()?.currentUser ?? null);
      refreshAuthView();
    };
    window.addEventListener(AUTH_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => window.removeEventListener(AUTH_PROFILE_UPDATED_EVENT, handleProfileUpdated);
  }, [refreshAuthView]);

  // Persist the account profile (users/{uid}) after every fresh sign-in.
  useEffect(() => {
    if (!user) {
      profileSyncedFor.current = null;
      return;
    }
    const profileKey = `${user.uid}:${user.displayName ?? ''}`;
    if (profileSyncedFor.current === profileKey) return;
    profileSyncedFor.current = profileKey;
    void syncProfile(user).catch((error: unknown) => {
      console.error('Unable to save the account profile:', error);
      profileSyncedFor.current = null;
    });
  }, [user, authRevision]);

  const continueAsGuest = useCallback(async () => {
    try {
      if (getFirebaseAuth()?.currentUser) await signOutUser();
    } catch (error) {
      console.error('Unable to switch to guest mode:', error);
    }
    writeGuestFlag(true);
  }, []);

  const leaveGuestMode = useCallback(() => {
    writeGuestFlag(false);
  }, []);

  const signOutAccount = useCallback(async () => {
    try {
      await signOutUser();
    } finally {
      writeGuestFlag(false);
      setUser(null);
    }
  }, []);

  return (
    <FirebaseAuthContext.Provider
      value={{
        user,
        loading,
        configured: isFirebaseConfigured,
        isGuest,
        isAuthenticated: Boolean(user) || isGuest,
        continueAsGuest,
        leaveGuestMode,
        signOutAccount,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  return useContext(FirebaseAuthContext);
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthDialog, type AuthMode } from '@/components/auth-dialog';

interface AuthDialogContextValue {
  openAuthDialog: (mode?: AuthMode) => void;
  closeAuthDialog: () => void;
}

const AuthDialogContext = createContext<AuthDialogContextValue>({
  openAuthDialog: () => undefined,
  closeAuthDialog: () => undefined,
});

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');

  const openAuthDialog = useCallback((nextMode: AuthMode = 'signin') => {
    setMode(nextMode);
    setOpen(true);
  }, []);
  const closeAuthDialog = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openAuthDialog, closeAuthDialog }),
    [openAuthDialog, closeAuthDialog]
  );

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      {open && <AuthDialog initialMode={mode} onClose={closeAuthDialog} />}
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  return useContext(AuthDialogContext);
}

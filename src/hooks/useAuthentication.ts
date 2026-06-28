import { useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';

export function useAuthentication() {
  const { currentUser, isAuthenticated, isLoggingIn, login, logout } =
    useAuthContext();
  const { addToast } = useToastContext();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      try {
        await login(email, password);
        addToast('Willkommen zurück!', 'success');
      } catch {
        addToast(
          'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.',
          'error'
        );
      }
    },
    [login, addToast]
  );

  const handleLogout = useCallback(() => {
    logout();
    addToast('Abgemeldet.', 'info');
  }, [logout, addToast]);

  const checkRole = useCallback(
    (
      required: 'user' | 'admin' | 'superuser',
      targetName?: string
    ): boolean => {
      if (!currentUser) {
        addToast('Bitte zuerst anmelden!', 'warning');
        return false;
      }
      if (currentUser.is_superuser) return true;
      if (required === 'superuser') {
        addToast('Keine Berechtigung (Superuser erforderlich).', 'error');
        return false;
      }
      if (required === 'admin' && !currentUser.is_admin) {
        addToast('Keine Berechtigung (Admin erforderlich).', 'error');
        return false;
      }
      if (
        targetName &&
        targetName !== currentUser.name &&
        !currentUser.is_admin
      ) {
        addToast('Keine Berechtigung für diesen Nutzer.', 'error');
        return false;
      }
      return true;
    },
    [currentUser, addToast]
  );

  const isSuperuser = currentUser?.is_superuser ?? false;
  const isAdmin = (currentUser?.is_admin ?? false) || isSuperuser;

  return {
    currentUser,
    isAuthenticated,
    isLoggingIn,
    isSuperuser,
    isAdmin,
    handleLogin,
    handleLogout,
    checkRole,
  };
}

export type UseAuthenticationResult = ReturnType<typeof useAuthentication>;

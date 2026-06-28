import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authService } from '../services/authService';
import type { AuthUser } from '../types';

interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, onLoginError }: {
  children: ReactNode;
  onLoginError?: (msg: string) => void;
}) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    authService.getCurrentUser()
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    return authService.onChange(user => setCurrentUser(user));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoggingIn(true);
      try {
        const user = await authService.login(email, password);
        setCurrentUser(user);
      } catch {
        onLoginError?.('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.');
        throw new Error('Login failed');
      } finally {
        setIsLoggingIn(false);
      }
    },
    [onLoginError]
  );

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoggingIn,
        login,
        logout,
        setCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider');
  return ctx;
}

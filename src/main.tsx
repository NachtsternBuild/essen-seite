import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { useAuthContext } from './context/AuthContext';
import { GroupProvider } from './context/GroupContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

/**
 * GroupProvider needs the authenticated user from AuthContext,
 * so it lives inside AuthProvider as a bridge component.
 */
function GroupProviderBridge({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthContext();
  return <GroupProvider currentUser={currentUser}>{children}</GroupProvider>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <GroupProviderBridge>
            <App />
          </GroupProviderBridge>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);

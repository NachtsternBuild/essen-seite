import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuthContext } from './AuthContext';
import { roleService } from '../services/roleService';
import { resolvePermissions } from '../lib/permissions';
import type { Permission, Role } from '../types';

interface PermissionContextValue {
  /** Effective permissions for the current user. */
  permissions: Set<Permission>;
  /** All roles known to the system (empty until loaded / when offline). */
  roles: Role[];
  /** True while the roles list is being fetched. */
  isLoading: boolean;
  /** Predicate: does the current user hold this permission? */
  can: (permission: Permission) => boolean;
  /** Predicate: does the current user hold *any* of these permissions? */
  canAny: (...permissions: Permission[]) => boolean;
  /** Re-fetch the roles list (e.g. after editing roles in settings). */
  reloadRoles: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuthContext();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    if (!currentUser) {
      setRoles([]);
      return;
    }
    setIsLoading(true);
    try {
      // Best-effort: when the roles collection is missing or unreachable we fall
      // back to the legacy is_admin/is_superuser flags, so the app keeps working.
      // Superusers also seed any missing standard roles (they hold write access).
      const list = currentUser.is_superuser
        ? await roleService.ensureStandardRoles()
        : await roleService.getAll();
      setRoles(list);
    } catch {
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const permissions = useMemo(
    () => resolvePermissions(currentUser, roles),
    [currentUser, roles]
  );

  const can = useCallback(
    (permission: Permission) => permissions.has(permission),
    [permissions]
  );

  const canAny = useCallback(
    (...required: Permission[]) => required.some(p => permissions.has(p)),
    [permissions]
  );

  const value = useMemo<PermissionContextValue>(
    () => ({ permissions, roles, isLoading, can, canAny, reloadRoles: loadRoles }),
    [permissions, roles, isLoading, can, canAny, loadRoles]
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be inside PermissionProvider');
  return ctx;
}

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { groupService } from '../services/groupService';
import type { Group, AuthUser } from '../types';

interface GroupContextValue {
  activeGroup: Group | null;
  allGroups: Group[];
  isLoadingGroups: boolean;
  setActiveGroup: (group: Group | null) => void;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({
  children,
  currentUser,
}: {
  children: ReactNode;
  currentUser: AuthUser | null;
}) {
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const initializedRef = useRef(false);

  const refreshGroups = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingGroups(true);
    try {
      if (currentUser.is_superuser) {
        const groups = await groupService.getAll();
        setAllGroups(groups);
        // Only auto-select on first load
        if (!initializedRef.current && groups.length > 0) {
          setActiveGroup(groups[0]);
        }
      } else {
        // Find own group first (for activeGroup / meal plan context)
        const membership = await groupService.getUserMembership(currentUser.id);
        const ownGroup = membership?.expand?.group ?? null;
        let resolvedGroup = ownGroup;
        if (!resolvedGroup && currentUser.group_id) {
          try {
            resolvedGroup = await groupService.getById(currentUser.group_id);
          } catch {
            // group not found
          }
        }
        if (resolvedGroup) setActiveGroup(resolvedGroup);

        if (currentUser.is_admin) {
          // Admins see all groups so they can reassign users across groups
          const allActive = await groupService.getAll();
          setAllGroups(allActive);
        } else {
          setAllGroups(resolvedGroup ? [resolvedGroup] : []);
        }
      }
      initializedRef.current = true;
    } catch {
      // non-fatal
    } finally {
      setIsLoadingGroups(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      initializedRef.current = false;
      refreshGroups();
    } else {
      initializedRef.current = false;
      setActiveGroup(null);
      setAllGroups([]);
    }
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GroupContext.Provider
      value={{
        activeGroup,
        allGroups,
        isLoadingGroups,
        setActiveGroup,
        refreshGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext(): GroupContextValue {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroupContext must be inside GroupProvider');
  return ctx;
}

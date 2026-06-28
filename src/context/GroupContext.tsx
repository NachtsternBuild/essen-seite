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
        const membership = await groupService.getUserMembership(currentUser.id);
        if (membership?.expand?.group) {
          const g = membership.expand.group;
          setAllGroups([g]);
          setActiveGroup(g);
        } else if (currentUser.group_id) {
          try {
            const g = await groupService.getById(currentUser.group_id);
            setAllGroups([g]);
            setActiveGroup(g);
          } catch {
            // group not found
          }
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

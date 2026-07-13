import { useState, useEffect, useCallback } from 'react';
import { auditService } from '../services/auditService';
import type { AuditLog } from '../types';

/** Loads the global audit trail (superuser-only, enforced by PocketBase rules). */
export function useAuditLog(enabled: boolean) {
  const [entries, setEntries] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setEntries([]);
      return;
    }
    setIsLoading(true);
    try {
      setEntries(await auditService.list());
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { entries, isLoading, reload };
}

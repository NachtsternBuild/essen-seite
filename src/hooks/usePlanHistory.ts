import { useState, useEffect, useCallback } from 'react';
import { planHistoryService } from '../services/planHistoryService';
import type { PlanHistoryEntry } from '../types';

export function usePlanHistory(planId: string | null) {
  const [entries, setEntries] = useState<PlanHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!planId) {
      setEntries([]);
      return;
    }
    setIsLoading(true);
    try {
      setEntries(await planHistoryService.listForPlan(planId));
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { entries, isLoading, reload };
}

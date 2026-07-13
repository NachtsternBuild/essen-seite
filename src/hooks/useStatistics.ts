import { useState, useEffect, useCallback, useMemo } from 'react';
import { statisticsService } from '../services/statisticsService';
import { useToastContext } from '../context/ToastContext';
import type { Group, GroupComparisonRow, Statistics } from '../types';

/**
 * Loads statistics for a group, plus an optional cross-group comparison when
 * `comparisonGroups` is supplied (superuser only).
 */
export function useStatistics(
  groupId: string | null,
  comparisonGroups?: Pick<Group, 'id' | 'name'>[]
) {
  const { addToast } = useToastContext();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [comparison, setComparison] = useState<GroupComparisonRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stable key so the loader doesn't refire on array-identity changes alone.
  const comparisonKey = useMemo(
    () => (comparisonGroups ? comparisonGroups.map(g => g.id).join(',') : ''),
    [comparisonGroups]
  );

  const reload = useCallback(async () => {
    if (!groupId) {
      setStats(null);
      return;
    }
    setIsLoading(true);
    try {
      const [s, c] = await Promise.all([
        statisticsService.getForGroup(groupId),
        comparisonGroups && comparisonGroups.length > 0
          ? statisticsService.getGroupComparison(comparisonGroups)
          : Promise.resolve([] as GroupComparisonRow[]),
      ]);
      setStats(s);
      setComparison(c);
    } catch {
      addToast('Fehler beim Laden der Statistiken.', 'error');
    } finally {
      setIsLoading(false);
    }
    // comparisonGroups is tracked via the stable comparisonKey instead of by identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, comparisonKey, addToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stats, comparison, isLoading, reload };
}

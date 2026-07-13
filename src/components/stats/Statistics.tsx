import { useMemo } from 'react';
import { useStatistics } from '../../hooks/useStatistics';
import { statisticsService } from '../../services/statisticsService';
import { StatCard } from '../shared/StatCard';
import { BarList, type BarItem } from '../shared/BarList';
import { Spinner } from '../shared/Spinner';
import { EmptyState } from '../shared/EmptyState';
import { formatPrice, downloadFile } from '../../lib/utils';
import { DAYS_OF_WEEK } from '../../lib/pocketbase';
import type { Group } from '../../types';

interface StatisticsProps {
  groupId: string | null;
  groupName?: string;
  isSuperuser: boolean;
  comparisonGroups?: Pick<Group, 'id' | 'name'>[];
}

export function Statistics({ groupId, groupName, isSuperuser, comparisonGroups }: StatisticsProps) {
  const { stats, comparison, isLoading } = useStatistics(
    groupId,
    isSuperuser ? comparisonGroups : undefined
  );

  const dayItems = useMemo<BarItem[]>(
    () =>
      stats
        ? DAYS_OF_WEEK.map(day => ({ label: day, value: stats.ordersByDay[day] ?? 0 }))
        : [],
    [stats]
  );

  const mealItems = useMemo<BarItem[]>(
    () =>
      stats
        ? stats.popularMeals.slice(0, 8).map(m => ({
            label: `${m.number} · ${m.name}`,
            value: m.count,
            sub: `${formatPrice(m.revenue)} €`,
          }))
        : [],
    [stats]
  );

  const allergenItems = useMemo<BarItem[]>(
    () => (stats ? stats.allergens.map(a => ({ label: `${a.code} · ${a.label}`, value: a.count })) : []),
    [stats]
  );

  const trendItems = useMemo<BarItem[]>(
    () =>
      stats
        ? stats.trend.slice(-12).map(t => ({
            label: t.label,
            value: t.orders,
            sub: `${formatPrice(t.revenue)} €`,
          }))
        : [],
    [stats]
  );

  const comparisonItems = useMemo<BarItem[]>(
    () => comparison.map(c => ({ label: c.groupName, value: c.orders, sub: `${formatPrice(c.revenue)} €` })),
    [comparison]
  );

  if (!groupId) {
    return <EmptyState icon="📊" message="Keine Gruppe ausgewählt." />;
  }
  if (isLoading) {
    return <div className="card"><Spinner /></div>;
  }
  if (!stats || stats.totalOrders === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Noch keine Auswertung"
        message="Sobald Bestellungen vorliegen, erscheinen hier Statistiken."
      />
    );
  }

  const handleExport = (format: 'csv' | 'json') => {
    const safe = (groupName ?? 'gruppe').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    if (format === 'csv') {
      downloadFile(statisticsService.toCsv(stats), `statistik-${safe}.csv`, 'text/csv;charset=utf-8');
    } else {
      downloadFile(statisticsService.toJson(stats), `statistik-${safe}.json`, 'application/json');
    }
  };

  const dietTotal = stats.diet.total || 1;
  const pct = (n: number) => Math.round((n / dietTotal) * 100);

  return (
    <div className="stats-page">
      <div className="stats-page__toolbar">
        <span className="stats-page__scope">
          {groupName ? `Auswertung: ${groupName}` : 'Auswertung'}
        </span>
        <div className="stats-page__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => handleExport('csv')}>
            ⬇ CSV
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => handleExport('json')}>
            ⬇ JSON
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="stat-grid">
        <StatCard icon="🧾" label="Bestellungen" value={stats.totalOrders} accent />
        <StatCard icon="💶" label="Umsatz" value={`${formatPrice(stats.totalRevenue)} €`} />
        <StatCard icon="👥" label="Aktive Nutzer" value={stats.uniqueUsers} />
        <StatCard icon="📈" label="Ø pro Bestellung" value={`${formatPrice(stats.averagePerOrder)} €`} />
      </div>

      <div className="stats-columns">
        <section className="card">
          <h3 className="card__title">🍽 Beliebteste Menüs</h3>
          <BarList items={mealItems} />
        </section>

        <section className="card">
          <h3 className="card__title">📅 Bestellungen pro Tag</h3>
          <BarList items={dayItems} />
        </section>

        <section className="card">
          <h3 className="card__title">🥗 Ernährung</h3>
          <div className="diet-row">
            <StatCard icon="🌱" label="Vegetarisch" value={stats.diet.vegetarian} hint={`${pct(stats.diet.vegetarian)} %`} />
            <StatCard icon="🌿" label="Vegan" value={stats.diet.vegan} hint={`${pct(stats.diet.vegan)} %`} />
            <StatCard icon="🍖" label="Sonstige" value={stats.diet.other} hint={`${pct(stats.diet.other)} %`} />
          </div>
        </section>

        <section className="card">
          <h3 className="card__title">⚠️ Allergene</h3>
          <BarList items={allergenItems} emptyMessage="Keine Allergene erfasst." />
        </section>

        <section className="card stats-columns__wide">
          <h3 className="card__title">📈 Verlauf (Bestellungen pro Woche)</h3>
          <BarList items={trendItems} />
        </section>

        {isSuperuser && comparisonItems.length > 0 && (
          <section className="card stats-columns__wide">
            <h3 className="card__title">🏢 Gruppenvergleich</h3>
            <BarList items={comparisonItems} />
          </section>
        )}
      </div>
    </div>
  );
}

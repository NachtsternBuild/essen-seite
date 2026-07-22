import type { ReactNode } from 'react';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  hint?: ReactNode;
  accent?: boolean;
}

/** Compact KPI tile used across dashboards and the statistics view. */
export function StatCard({ icon, label, value, hint, accent }: StatCardProps) {
  return (
    <div className={`stat-card${accent ? ' stat-card--accent' : ''}`}>
      {icon && <div className="stat-card__icon" aria-hidden="true">{icon}</div>}
      <div className="stat-card__body">
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label" title={label}>{label}</div>
        {hint && <div className="stat-card__hint">{hint}</div>}
      </div>
    </div>
  );
}

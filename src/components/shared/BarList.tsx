export interface BarItem {
  label: string;
  value: number;
  /** Optional secondary text shown right-aligned (e.g. revenue). */
  sub?: string;
}

interface BarListProps {
  items: BarItem[];
  /** Override the bar scale maximum; defaults to the largest value. */
  max?: number;
  /** Formats the numeric value shown at the end of each row. */
  formatValue?: (v: number) => string;
  emptyMessage?: string;
}

/**
 * Dependency-free horizontal bar chart — a labelled list where each row's fill
 * width is proportional to its value. Keeps the bundle lean (no chart library).
 */
export function BarList({ items, max, formatValue, emptyMessage = 'Keine Daten.' }: BarListProps) {
  if (items.length === 0) {
    return <p className="bar-list__empty">{emptyMessage}</p>;
  }
  const scale = max ?? Math.max(...items.map(i => i.value), 1);

  return (
    <ul className="bar-list">
      {items.map((item, i) => {
        const pct = Math.round((item.value / scale) * 100);
        return (
          <li key={`${item.label}-${i}`} className="bar-list__row">
            <span className="bar-list__label" title={item.label}>{item.label}</span>
            <span className="bar-list__track">
              <span
                className="bar-list__fill"
                style={{ width: `${Math.max(pct, 2)}%` }}
                role="img"
                aria-label={`${item.label}: ${item.value}`}
              />
            </span>
            <span className="bar-list__value">
              {formatValue ? formatValue(item.value) : item.value}
              {item.sub && <span className="bar-list__sub"> · {item.sub}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

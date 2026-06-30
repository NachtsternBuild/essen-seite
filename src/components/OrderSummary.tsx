import { memo, useCallback } from 'react';
import type { AuthUser, OrdersByUser } from '../types';
import {
  exportTXT,
  exportCSV,
  exportPDF,
  exportJSON,
  exportKitchenPrint,
} from '../services/exportService';

// Adapter: OrdersByUser → WeekData-compatible for export functions
function buildWeekDataForExport(
  ordersByUser: OrdersByUser,
  allMeals: Record<string, unknown[]>
) {
  const orders: Record<string, Record<string, { number: string; name: string; price: number; edited: boolean }>> = {};
  Object.entries(ordersByUser).forEach(([person, dayMap]) => {
    orders[person] = {};
    Object.entries(dayMap).forEach(([day, o]) => {
      orders[person][day] = {
        number: o.meal_number,
        name: o.meal_name,
        price: o.meal_price,
        edited: o.edited,
      };
    });
  });
  return { orders, meals: allMeals as Record<string, Array<{ number: string; name: string; price: number }>> };
}

interface OrderSummaryProps {
  ordersByUser: OrdersByUser;
  allUsers: AuthUser[];
  currentUser: AuthUser | null;
  isArchive: boolean;
  allMeals?: Record<string, unknown[]>;
  label?: string;
  onDeleteUserOrders?: (userId: string, planId: string, userName: string) => void;
  planId?: string;
}

export const OrderSummary = memo(function OrderSummary({
  ordersByUser,
  allUsers,
  currentUser,
  isArchive,
  allMeals = {},
  label = 'Woche',
  onDeleteUserOrders,
  planId,
}: OrderSummaryProps) {
  const entries = Object.entries(ordersByUser);

  const grandTotal = entries
    .reduce(
      (sum, [, dayMap]) =>
        sum + Object.values(dayMap).reduce((s, o) => s + o.meal_price, 0),
      0
    )
    .toFixed(2);

  const grandCount = entries.reduce(
    (sum, [, dayMap]) => sum + Object.keys(dayMap).length,
    0
  );

  const weekData = buildWeekDataForExport(ordersByUser, allMeals);

  const handleExport = useCallback(
    async (format: string) => {
      switch (format) {
        case 'txt': exportTXT(weekData as never, label); break;
        case 'csv': exportCSV(weekData as never, label); break;
        case 'pdf': await exportPDF(weekData as never, label); break;
        case 'json': exportJSON(weekData as never, label); break;
        case 'kitchen': exportKitchenPrint(weekData as never, label); break;
      }
    },
    [weekData, label]
  );

  return (
    <div className="order-summary card">
      <div className="order-summary__header">
        <h3 className="order-summary__title">💰 Abrechnung</h3>
        <div className="order-summary__exports">
          <button className="btn btn--ghost btn--sm" onClick={() => handleExport('txt')} title="TXT exportieren">📄 TXT</button>
          <button className="btn btn--ghost btn--sm" onClick={() => handleExport('csv')} title="CSV exportieren">📊 CSV</button>
          <button className="btn btn--danger btn--sm" onClick={() => handleExport('pdf')} title="PDF exportieren">📋 PDF</button>
          <button className="btn btn--ghost btn--sm" onClick={() => handleExport('json')} title="JSON-Backup">💾 JSON</button>
          <button className="btn btn--ghost btn--sm" onClick={() => handleExport('kitchen')} title="Küchenzettel">🍳 Küche</button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="order-summary__empty">Noch keine Bestellungen vorhanden.</p>
      ) : (
        <div className="table-wrapper">
          <table className="summary-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Info</th>
                <th scope="col">Anzahl</th>
                <th scope="col">Summe</th>
                <th scope="col">Details</th>
                {!isArchive && <th scope="col" />}
              </tr>
            </thead>
            <tbody>
              {entries.map(([person, dayMap]) => {
                const hasEdited = Object.values(dayMap).some(o => o.edited);
                const userDetail = allUsers.find(u => u.name === person);
                const userTotal = Object.values(dayMap)
                  .reduce((s, o) => s + o.meal_price, 0)
                  .toFixed(2);
                const canDelete =
                  !isArchive &&
                  (person === currentUser?.name ||
                    currentUser?.is_admin ||
                    currentUser?.is_superuser);

                return (
                  <tr
                    key={person}
                    className={hasEdited ? 'summary-table__row--edited' : ''}
                  >
                    <td className="summary-table__name">
                      {person}
                      {hasEdited && (
                        <span className="summary-table__edited-tag">geändert</span>
                      )}
                    </td>
                    <td className="summary-table__info">
                      {userDetail?.info || '–'}
                    </td>
                    <td>{Object.keys(dayMap).length}×</td>
                    <td className="summary-table__total">
                      <strong>{userTotal} €</strong>
                    </td>
                    <td className="summary-table__details">
                      {Object.entries(dayMap)
                        .map(([d, o]) => `${d}: #${o.meal_number}`)
                        .join(', ')}
                    </td>
                    {!isArchive && (
                      <td>
                        {canDelete && onDeleteUserOrders && userDetail && planId && (
                          <button
                            className="btn btn--ghost btn--sm btn--danger-outline"
                            onClick={() =>
                              onDeleteUserOrders(userDetail.id, planId, person)
                            }
                          >
                            Bestellungen löschen
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="summary-table__footer">
                <td colSpan={2}>
                  <strong>GESAMTSUMME</strong>
                </td>
                <td>
                  <strong>{grandCount}×</strong>
                </td>
                <td>
                  <strong className="summary-table__grand-total">
                    {grandTotal} €
                  </strong>
                </td>
                <td />
                {!isArchive && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
});

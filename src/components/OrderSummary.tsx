import type { WeekData, AuthUser } from '../types';
import { calculateUserTotal } from '../lib/utils';

interface OrderSummaryProps {
  weekData: WeekData;
  allUsers: AuthUser[];
  currentUser: AuthUser | null;
  isArchive: boolean;
  onRemoveUser: (person: string) => void;
  onExportTXT: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function OrderSummary({
  weekData,
  allUsers,
  currentUser,
  isArchive,
  onRemoveUser,
  onExportTXT,
  onExportCSV,
  onExportPDF,
}: OrderSummaryProps) {
  const entries = Object.entries(weekData.orders);
  const grandTotal = entries
    .reduce((sum, [, o]) => sum + calculateUserTotal(o), 0)
    .toFixed(2);
  const grandCount = entries.reduce((sum, [, o]) => sum + Object.keys(o).length, 0);

  return (
    <div className="order-summary card">
      <div className="order-summary__header">
        <h3 className="order-summary__title">💰 Abrechnung</h3>
        <div className="order-summary__exports">
          <button className="btn btn--ghost btn--sm" onClick={onExportTXT}>📄 TXT</button>
          <button className="btn btn--ghost btn--sm" onClick={onExportCSV}>📊 CSV</button>
          <button className="btn btn--danger btn--sm" onClick={onExportPDF}>📋 PDF</button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="order-summary__empty">Noch keine Bestellungen vorhanden.</p>
      ) : (
        <table className="summary-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Info</th>
              <th>Anzahl</th>
              <th>Summe</th>
              {!isArchive && <th />}
            </tr>
          </thead>
          <tbody>
            {entries.map(([person, userOrders]) => {
              const hasEdited = Object.values(userOrders).some(m => m.edited);
              const userDetail = allUsers.find(u => u.name === person);
              const canDelete = !isArchive && (person === currentUser?.name || currentUser?.is_admin);

              return (
                <tr key={person} className={hasEdited ? 'summary-table__row--edited' : ''}>
                  <td className="summary-table__name">
                    {person}
                    {hasEdited && <span className="summary-table__edited-tag">geändert</span>}
                  </td>
                  <td className="summary-table__info">{userDetail?.info || '–'}</td>
                  <td>{Object.keys(userOrders).length}×</td>
                  <td className="summary-table__total">
                    <strong>{calculateUserTotal(userOrders).toFixed(2)} €</strong>
                  </td>
                  {!isArchive && (
                    <td>
                      {canDelete && (
                        <button
                          className="btn btn--ghost btn--sm btn--danger-outline"
                          onClick={() => onRemoveUser(person)}
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
              <td colSpan={2}><strong>GESAMTSUMME</strong></td>
              <td><strong>{grandCount}×</strong></td>
              <td>
                <strong className="summary-table__grand-total">{grandTotal} €</strong>
              </td>
              {!isArchive && <td />}
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

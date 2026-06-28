import type { WeekData } from '../types';
import { calculateUserTotal, parsePrice, downloadFile, downloadBlob } from '../lib/utils';

// ─── TXT ──────────────────────────────────────────────────────────────────────

export function exportTXT(weekData: WeekData, label: string): void {
  let txt = `ABRECHNUNG: ${label.toUpperCase()}\n${'='.repeat(40)}\n\n`;
  const entries = Object.entries(weekData.orders);

  entries.forEach(([person, orders]) => {
    txt += `${person.padEnd(20)} | ${Object.keys(orders).length} Essen | ${calculateUserTotal(orders).toFixed(2)} €\n`;
    Object.entries(orders).forEach(([day, meal]) => {
      txt += `  - ${day}: #${meal.number} – ${meal.name}\n`;
    });
    txt += `${'-'.repeat(40)}\n`;
  });

  const total = entries
    .reduce((s, [, o]) => s + calculateUserTotal(o), 0)
    .toFixed(2);
  txt += `\nGESAMTSUMME: ${total} €`;

  downloadFile(txt, `Abrechnung_${label}.txt`, 'text/plain;charset=utf-8;');
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(weekData: WeekData, label: string): void {
  let csv = 'Name;Anzahl;Summe;Details\n';
  const entries = Object.entries(weekData.orders);

  entries.forEach(([person, orders]) => {
    const details = Object.entries(orders)
      .map(([d, m]) => `${d}: #${m.number}`)
      .join(' | ');
    csv += `${person};${Object.keys(orders).length};${calculateUserTotal(orders).toFixed(2)} €;"${details}"\n`;
  });

  const total = entries
    .reduce((s, [, o]) => s + calculateUserTotal(o), 0)
    .toFixed(2);
  csv += `\nGESAMT;;${total} €;`;

  downloadFile(csv, `Abrechnung_${label}.csv`, 'text/csv;charset=utf-8;');
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function exportPDF(weekData: WeekData, label: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`Abrechnung: ${label.replace(/_/g, ' ')}`, 14, 20);
  doc.setFontSize(10);
  doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 14, 28);

  const entries = Object.entries(weekData.orders);
  const rows = entries.map(([person, orders]) => [
    person,
    `${Object.keys(orders).length}×`,
    `${calculateUserTotal(orders).toFixed(2)} €`,
    Object.entries(orders)
      .map(([d, m]) => `${d}: #${m.number} – ${m.name}`)
      .join(', '),
  ]);

  const total = entries
    .reduce((s, [, o]) => s + calculateUserTotal(o), 0)
    .toFixed(2);

  autoTable(doc, {
    startY: 35,
    head: [['Name', 'Anzahl', 'Summe', 'Details']],
    body: rows,
    foot: [['GESAMT', '', `${total} €`, '']],
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [217, 119, 6] },
  });

  doc.save(`Abrechnung_${label}.pdf`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export async function exportXLSX(weekData: WeekData, label: string): Promise<void> {
  const XLSX = await import('xlsx');

  const entries = Object.entries(weekData.orders);
  const wsData: (string | number)[][] = [
    ['Name', 'Anzahl', 'Summe (€)', 'Details'],
  ];

  entries.forEach(([person, orders]) => {
    wsData.push([
      person,
      Object.keys(orders).length,
      parseFloat(calculateUserTotal(orders).toFixed(2)),
      Object.entries(orders)
        .map(([d, m]) => `${d}: #${m.number} – ${m.name}`)
        .join('; '),
    ]);
  });

  const total = entries.reduce((s, [, o]) => s + calculateUserTotal(o), 0);
  wsData.push(['GESAMT', entries.reduce((s, [, o]) => s + Object.keys(o).length, 0), parseFloat(total.toFixed(2)), '']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Abrechnung');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Abrechnung_${label}.xlsx`
  );
}

// ─── JSON Backup ──────────────────────────────────────────────────────────────

export function exportJSON(weekData: WeekData, label: string): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    label,
    ...weekData,
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    `Backup_${label}.json`,
    'application/json'
  );
}

export function importJSON(json: string): WeekData {
  const parsed = JSON.parse(json);
  return {
    meals: parsed.meals ?? {},
    orders: parsed.orders ?? {},
  };
}

// ─── Kitchen Print ────────────────────────────────────────────────────────────

export function exportKitchenPrint(weekData: WeekData, label: string): void {
  let txt = `KÜCHENZETTEL: ${label}\n${'='.repeat(50)}\n\n`;

  const dayOrders: Record<string, Record<string, number>> = {};
  Object.values(weekData.orders).forEach(userOrders => {
    Object.entries(userOrders).forEach(([day, meal]) => {
      if (!dayOrders[day]) dayOrders[day] = {};
      dayOrders[day][meal.number] = (dayOrders[day][meal.number] ?? 0) + 1;
    });
  });

  Object.entries(dayOrders).forEach(([day, meals]) => {
    txt += `${day.toUpperCase()}\n`;
    Object.entries(meals)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([num, count]) => {
        const mealInfo = Object.values(weekData.meals[day] ?? []).find(
          m => m.number === num
        );
        txt += `  ${count}× Menü #${num}${mealInfo ? ` – ${mealInfo.name}` : ''}\n`;
      });
    txt += '\n';
  });

  downloadFile(txt, `Kueche_${label}.txt`, 'text/plain;charset=utf-8;');
}

// ─── Day summary ──────────────────────────────────────────────────────────────

export function exportDaySummary(weekData: WeekData, day: string): void {
  const dayOrders = Object.entries(weekData.orders)
    .filter(([, orders]) => orders[day])
    .map(([person, orders]) => ({ person, meal: orders[day] }));

  let txt = `TAGESAUSWERTUNG: ${day}\n${'='.repeat(40)}\n\n`;
  dayOrders.forEach(({ person, meal }) => {
    txt += `${person}: #${meal.number} – ${meal.name} (${parsePrice(meal.price).toFixed(2)} €)\n`;
  });

  const total = dayOrders.reduce((s, { meal }) => s + parsePrice(meal.price), 0);
  txt += `\nGesamt: ${dayOrders.length} Bestellungen | ${total.toFixed(2)} €`;

  downloadFile(txt, `Tag_${day}.txt`, 'text/plain;charset=utf-8;');
}

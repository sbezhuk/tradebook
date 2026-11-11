import type { Trade } from '../types';

export function exportTradesToCsv(trades: Trade[]): void {
  const headers = [
    'ID',
    'Symbol',
    'Market',
    'Direction',
    'Status',
    'Entry Date',
    'Exit Date',
    'Entry Price',
    'Exit Price',
    'Quantity',
    'Stop Loss',
    'Take Profit',
    'Fees',
    'PnL',
    'ROI %',
    'R-Multiple',
    'Tags',
    'Followed Rules',
  ];

  const rows = trades.map((t) => [
    t.id,
    t.symbol,
    t.market,
    t.direction,
    t.status,
    t.entry_date,
    t.exit_date ?? '',
    t.entry_price,
    t.exit_price ?? '',
    t.quantity,
    t.stop_loss ?? '',
    t.take_profit ?? '',
    t.fees,
    t.pnl,
    t.pnl_percentage,
    t.r_multiple ?? '',
    `"${(t.tags ?? '').replace(/"/g, '""')}"`,
    t.followed_rules ? 'Yes' : 'No',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `tradebook_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

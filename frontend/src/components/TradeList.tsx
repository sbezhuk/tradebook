import React, { useState } from 'react';
import type { Trade, MonthlySummaryItem } from '../types';
import {
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Edit3,
  Trash2,
  Image as ImageIcon,
  UploadCloud,
} from 'lucide-react';

interface TradeListProps {
  trades: Trade[];
  loading: boolean;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  availableMonths?: MonthlySummaryItem[];
  onSelectTrade: (trade: Trade) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: number) => void;
  onNewTrade: () => void;
  onOpenImport: () => void;
  onFilterChange: (filters: {
    symbol?: string;
    market?: string;
    direction?: string;
    status?: string;
    tag?: string;
    sort_by?: string;
  }) => void;
}

export const TradeList: React.FC<TradeListProps> = ({
  trades,
  loading,
  selectedMonth = '',
  onSelectMonth,
  availableMonths = [],
  onSelectTrade,
  onEditTrade,
  onDeleteTrade,
  onNewTrade,
  onOpenImport,
  onFilterChange,
}) => {
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const triggerFilter = (overrides: Record<string, string>) => {
    onFilterChange({
      market: selectedMarket,
      direction: selectedDirection,
      status: selectedStatus,
      sort_by: sortBy,
      ...overrides,
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-5">
      {/* Header + Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Журнал угод</h1>
          <p className="text-sm text-purple-200/50 mt-1">
            Всі відкриті та закриті позиції з детальним аналізом виконання.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSelectMonth && (
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="glass-input rounded-full px-3.5 py-1.5 text-xs text-[#e2ccff] font-medium cursor-pointer border border-[#c49bff]/25"
            >
              <option value="" className="bg-[#120827]">Всі місяці</option>
              {availableMonths.map((m) => (
                <option key={m.month} value={m.month} className="bg-[#120827]">
                  {m.label} ({m.trades_count})
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedMarket}
            onChange={(e) => {
              setSelectedMarket(e.target.value);
              triggerFilter({ market: e.target.value });
            }}
            className="glass-input rounded-full px-3.5 py-1.5 text-xs text-purple-100 cursor-pointer"
          >
            <option value="" className="bg-[#120827]">Всі ринки</option>
            <option value="CRYPTO" className="bg-[#120827]">Crypto</option>
            <option value="FOREX" className="bg-[#120827]">Forex</option>
            <option value="STOCKS" className="bg-[#120827]">Stocks</option>
            <option value="FUTURES" className="bg-[#120827]">Futures</option>
            <option value="COMMODITIES" className="bg-[#120827]">Commodities</option>
          </select>

          <select
            value={selectedDirection}
            onChange={(e) => {
              setSelectedDirection(e.target.value);
              triggerFilter({ direction: e.target.value });
            }}
            className="glass-input rounded-full px-3.5 py-1.5 text-xs text-purple-100 cursor-pointer"
          >
            <option value="" className="bg-[#120827]">Всі сторони</option>
            <option value="LONG" className="bg-[#120827]">Long</option>
            <option value="SHORT" className="bg-[#120827]">Short</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              triggerFilter({ status: e.target.value });
            }}
            className="glass-input rounded-full px-3.5 py-1.5 text-xs text-purple-100 cursor-pointer"
          >
            <option value="" className="bg-[#120827]">Всі статуси</option>
            <option value="CLOSED" className="bg-[#120827]">Закриті</option>
            <option value="OPEN" className="bg-[#120827]">Відкриті</option>
            <option value="CANCELLED" className="bg-[#120827]">Скасовані</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              triggerFilter({ sort_by: e.target.value });
            }}
            className="glass-input rounded-full px-3.5 py-1.5 text-xs text-purple-100 cursor-pointer"
          >
            <option value="date_desc" className="bg-[#120827]">Спочатку новіші</option>
            <option value="date_asc" className="bg-[#120827]">Спочатку старіші</option>
            <option value="pnl_desc" className="bg-[#120827]">За прибутком</option>
            <option value="pnl_asc" className="bg-[#120827]">За збитком</option>
          </select>

          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#c49bff]/15 hover:bg-[#c49bff]/25 border border-[#c49bff]/35 text-[#e2ccff] text-xs font-semibold transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#c49bff]" />
            <span>Імпорт Hyperliquid</span>
          </button>
        </div>
      </div>

      {/* Trades Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-purple-200/60">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c49bff] mb-3" />
            <p className="text-xs font-medium">Завантаження угод...</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-[#c49bff]">
              <Filter className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Угод не знайдено</h3>
            <p className="text-xs text-purple-200/50 mt-1 max-w-sm mx-auto">
              Створіть нову угоду або змініть параметри пошуку чи фільтрації.
            </p>
            <button
              onClick={onNewTrade}
              className="accent-pill mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold"
            >
              <span>Додати угоду</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-purple-200/50 font-medium">
                  <th className="py-3.5 px-5">Інструмент</th>
                  <th className="py-3.5 px-3">Сторона</th>
                  <th className="py-3.5 px-3">Статус</th>
                  <th className="py-3.5 px-3">Вхід / Вихід</th>
                  <th className="py-3.5 px-3">Об'єм</th>
                  <th className="py-3.5 px-3">SL / TP</th>
                  <th className="py-3.5 px-4 text-right">PnL / ROI</th>
                  <th className="py-3.5 px-3 text-center">R:R</th>
                  <th className="py-3.5 px-3">Теги</th>
                  <th className="py-3.5 px-4 text-center">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {trades.map((trade) => {
                  const isLong = trade.direction === 'LONG';
                  const isOpen = trade.status === 'OPEN';
                  const isWin = trade.pnl > 0;
                  const isLoss = trade.pnl < 0;

                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => onSelectTrade(trade)}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white text-sm group-hover:text-[#c49bff] transition-colors">
                            {trade.symbol}
                          </span>
                          {trade.chart_url && (
                            <ImageIcon className="w-3.5 h-3.5 text-[#c49bff]/70" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-purple-200/45 mt-0.5">
                          <span className="font-mono text-[10px] text-purple-200/60">
                            {trade.market}
                          </span>
                          <span>•</span>
                          <span>{formatDate(trade.entry_date)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isLong
                              ? 'bg-[#c49bff]/15 text-[#c49bff]'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{trade.direction}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                            isOpen
                              ? 'bg-amber-400/15 text-amber-300'
                              : 'bg-white/[0.05] text-purple-200/65'
                          }`}
                        >
                          {trade.status === 'OPEN' ? 'Відкрита' : trade.status === 'CLOSED' ? 'Закрита' : 'Скасована'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px]">
                        <div className="text-white font-medium">{trade.entry_price}</div>
                        <div className="text-purple-200/45">
                          {trade.exit_price ? trade.exit_price : '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-purple-100/80">
                        {trade.quantity}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px]">
                        <div className="text-rose-400/80">{trade.stop_loss ?? '—'}</div>
                        <div className="text-[#c49bff]/80">{trade.take_profit ?? '—'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isOpen ? (
                          <span className="text-amber-300 font-mono text-[11px]">в процесі</span>
                        ) : (
                          <div>
                            <div
                              className={`text-sm font-bold font-mono ${
                                isWin ? 'text-[#c49bff]' : isLoss ? 'text-rose-400' : 'text-purple-200'
                              }`}
                            >
                              {isWin ? '+' : ''}${trade.pnl.toFixed(2)}
                            </div>
                            <div className="text-[11px] font-mono text-purple-200/45">
                              {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {trade.r_multiple !== null && trade.r_multiple !== undefined ? (
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold ${
                              trade.r_multiple > 0
                                ? 'bg-[#c49bff]/15 text-[#c49bff]'
                                : trade.r_multiple < 0
                                ? 'bg-rose-500/15 text-rose-400'
                                : 'bg-white/[0.05] text-purple-200/60'
                            }`}
                          >
                            {trade.r_multiple > 0 ? `+${trade.r_multiple}R` : `${trade.r_multiple}R`}
                          </span>
                        ) : (
                          <span className="text-purple-200/30">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {trade.tags ? (
                            trade.tags.split(',').slice(0, 2).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full bg-white/[0.05] text-purple-200/75 text-[10px] truncate"
                              >
                                #{t.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-purple-200/30">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => onSelectTrade(trade)}
                            title="Деталі"
                            className="p-1.5 text-purple-200/50 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditTrade(trade)}
                            title="Редагувати"
                            className="p-1.5 text-purple-200/50 hover:text-[#c49bff] hover:bg-white/[0.06] rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Ви дійсно бажаєте видалити угоду ${trade.symbol}?`)) {
                                onDeleteTrade(trade.id);
                              }
                            }}
                            title="Видалити"
                            className="p-1.5 text-purple-200/50 hover:text-rose-400 hover:bg-white/[0.06] rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

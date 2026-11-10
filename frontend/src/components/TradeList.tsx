import React, { useState } from 'react';
import type { Trade } from '../types';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Image as ImageIcon
} from 'lucide-react';

interface TradeListProps {
  trades: Trade[];
  loading: boolean;
  onSelectTrade: (trade: Trade) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: number) => void;
  onNewTrade: () => void;
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
  onSelectTrade,
  onEditTrade,
  onDeleteTrade,
  onNewTrade,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      symbol: searchTerm,
      market: selectedMarket,
      direction: selectedDirection,
      status: selectedStatus,
      sort_by: sortBy,
    });
  };

  const handleMarketChange = (market: string) => {
    setSelectedMarket(market);
    onFilterChange({
      symbol: searchTerm,
      market,
      direction: selectedDirection,
      status: selectedStatus,
      sort_by: sortBy,
    });
  };

  const handleDirectionChange = (dir: string) => {
    setSelectedDirection(dir);
    onFilterChange({
      symbol: searchTerm,
      market: selectedMarket,
      direction: dir,
      status: selectedStatus,
      sort_by: sortBy,
    });
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    onFilterChange({
      symbol: searchTerm,
      market: selectedMarket,
      direction: selectedDirection,
      status,
      sort_by: sortBy,
    });
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    onFilterChange({
      symbol: searchTerm,
      market: selectedMarket,
      direction: selectedDirection,
      status: selectedStatus,
      sort_by: sort,
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          {/* Search Symbol */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Пошук за символом (BTC, EUR, AAPL)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Market Select */}
            <select
              value={selectedMarket}
              onChange={(e) => handleMarketChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Всі ринки</option>
              <option value="CRYPTO">Crypto</option>
              <option value="FOREX">Forex</option>
              <option value="STOCKS">Stocks</option>
              <option value="FUTURES">Futures</option>
              <option value="COMMODITIES">Commodities</option>
            </select>

            {/* Direction */}
            <select
              value={selectedDirection}
              onChange={(e) => handleDirectionChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Всі сторони</option>
              <option value="LONG">Long 🟢</option>
              <option value="SHORT">Short 🔴</option>
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Всі статуси</option>
              <option value="CLOSED">Закриті</option>
              <option value="OPEN">Відкриті</option>
              <option value="CANCELLED">Скасовані</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="date_desc">Дата: новіші спочатку</option>
              <option value="date_asc">Дата: старіші спочатку</option>
              <option value="pnl_desc">PnL: від прибуткових</option>
              <option value="pnl_asc">PnL: від збиткових</option>
            </select>

            <button
              type="submit"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Фільтрувати
            </button>
          </div>
        </form>
      </div>

      {/* Trades Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
            <p className="text-sm">Завантаження угод...</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Угод не знайдено</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              За вашими критеріями пошуку або фільтрації угод немає. Створіть нову угоду або скиньте фільтри.
            </p>
            <button
              onClick={onNewTrade}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              <span>Створити першу угоду</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                  <th className="py-3 px-4">Символ / Ринок</th>
                  <th className="py-3 px-3">Сторона</th>
                  <th className="py-3 px-3">Статус</th>
                  <th className="py-3 px-3">Вхід / Вихід</th>
                  <th className="py-3 px-3">Об'єм</th>
                  <th className="py-3 px-3">SL / TP</th>
                  <th className="py-3 px-4 text-right">PnL / ROI</th>
                  <th className="py-3 px-3 text-center">R:R</th>
                  <th className="py-3 px-3">Теги</th>
                  <th className="py-3 px-4 text-center">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trades.map((trade) => {
                  const isLong = trade.direction === 'LONG';
                  const isOpen = trade.status === 'OPEN';
                  const isWin = trade.pnl > 0;
                  const isLoss = trade.pnl < 0;

                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectTrade(trade)}
                    >
                      {/* Symbol & Market */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                            {trade.symbol}
                          </span>
                          {trade.chart_url && (
                            <span title="Є скріншот або графік">
                              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            {trade.market}
                          </span>
                          <span>{formatDate(trade.entry_date)}</span>
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isLong
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{trade.direction}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            isOpen
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                              : trade.status === 'CLOSED'
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {trade.status === 'OPEN' ? 'В процесі' : trade.status === 'CLOSED' ? 'Закрита' : 'Скасована'}
                        </span>
                      </td>

                      {/* Prices */}
                      <td className="py-3.5 px-3 font-mono">
                        <div className="text-slate-200">
                          Вхід: <span className="font-semibold text-white">{trade.entry_price}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {trade.exit_price ? `Вихід: ${trade.exit_price}` : '—'}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-3 font-mono text-slate-300">
                        {trade.quantity}
                      </td>

                      {/* SL / TP */}
                      <td className="py-3.5 px-3 font-mono text-[11px]">
                        <div className="text-rose-400/90">SL: {trade.stop_loss ?? '—'}</div>
                        <div className="text-emerald-400/90">TP: {trade.take_profit ?? '—'}</div>
                      </td>

                      {/* PnL & ROI */}
                      <td className="py-3.5 px-4 text-right">
                        {isOpen ? (
                          <span className="text-amber-400 font-mono italic">відкрита</span>
                        ) : (
                          <div>
                            <div
                              className={`text-sm font-bold font-mono ${
                                isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'
                              }`}
                            >
                              {isWin ? '+' : ''}${trade.pnl.toFixed(2)}
                            </div>
                            <div
                              className={`text-[11px] font-mono font-medium ${
                                isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-500'
                              }`}
                            >
                              {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </td>

                      {/* R:R Multiple */}
                      <td className="py-3.5 px-3 text-center">
                        {trade.r_multiple !== null && trade.r_multiple !== undefined ? (
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono font-semibold text-[11px] ${
                              trade.r_multiple > 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : trade.r_multiple < 0
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {trade.r_multiple > 0 ? `+${trade.r_multiple}R` : `${trade.r_multiple}R`}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {trade.tags ? (
                            trade.tags.split(',').slice(0, 2).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 text-[10px] font-medium truncate"
                              >
                                #{t.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => onSelectTrade(trade)}
                            title="Деталі"
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditTrade(trade)}
                            title="Редагувати"
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
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
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
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

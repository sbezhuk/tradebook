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
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="liquid-glass-card rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          {/* Search Symbol */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Пошук за символом (BTC, EUR, NVDA)..."
              className="liquid-glass-input w-full rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-purple-400/40"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Market Select */}
            <select
              value={selectedMarket}
              onChange={(e) => handleMarketChange(e.target.value)}
              className="liquid-glass-input rounded-xl px-3 py-2 text-xs text-purple-200 cursor-pointer"
            >
              <option value="" className="bg-[#120827] text-white">Всі ринки</option>
              <option value="CRYPTO" className="bg-[#120827] text-white">Crypto</option>
              <option value="FOREX" className="bg-[#120827] text-white">Forex</option>
              <option value="STOCKS" className="bg-[#120827] text-white">Stocks</option>
              <option value="FUTURES" className="bg-[#120827] text-white">Futures</option>
              <option value="COMMODITIES" className="bg-[#120827] text-white">Commodities</option>
            </select>

            {/* Direction */}
            <select
              value={selectedDirection}
              onChange={(e) => handleDirectionChange(e.target.value)}
              className="liquid-glass-input rounded-xl px-3 py-2 text-xs text-purple-200 cursor-pointer"
            >
              <option value="" className="bg-[#120827] text-white">Всі сторони</option>
              <option value="LONG" className="bg-[#120827] text-white">Long 🟢</option>
              <option value="SHORT" className="bg-[#120827] text-white">Short 🔴</option>
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="liquid-glass-input rounded-xl px-3 py-2 text-xs text-purple-200 cursor-pointer"
            >
              <option value="" className="bg-[#120827] text-white">Всі статуси</option>
              <option value="CLOSED" className="bg-[#120827] text-white">Закриті</option>
              <option value="OPEN" className="bg-[#120827] text-white">Відкриті</option>
              <option value="CANCELLED" className="bg-[#120827] text-white">Скасовані</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="liquid-glass-input rounded-xl px-3 py-2 text-xs text-purple-200 cursor-pointer"
            >
              <option value="date_desc" className="bg-[#120827] text-white">Дата: новіші спочатку</option>
              <option value="date_asc" className="bg-[#120827] text-white">Дата: старіші спочатку</option>
              <option value="pnl_desc" className="bg-[#120827] text-white">PnL: від прибуткових</option>
              <option value="pnl_asc" className="bg-[#120827] text-white">PnL: від збиткових</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-400/30 text-purple-200 text-xs font-semibold tracking-wide transition-all shadow-[0_2px_10px_rgba(147,51,234,0.15)]"
            >
              Фільтрувати
            </button>
          </div>
        </form>
      </div>

      {/* Trades Table */}
      <div className="liquid-glass-card rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(76,29,149,0.25)]">
        {loading ? (
          <div className="p-16 text-center text-purple-300">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-3" />
            <p className="text-xs font-medium">Завантаження угод...</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center mx-auto mb-4 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Угод не знайдено</h3>
            <p className="text-xs text-purple-300/60 mt-1.5 max-w-sm mx-auto">
              За вашими критеріями пошуку угод немає. Створіть нову угоду або скиньте фільтри.
            </p>
            <button
              onClick={onNewTrade}
              className="liquid-button mt-5 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold"
            >
              <span>Створити першу угоду</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-500/15 bg-purple-950/40 text-purple-300/70 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Символ / Ринок</th>
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
              <tbody className="divide-y divide-purple-500/10">
                {trades.map((trade) => {
                  const isLong = trade.direction === 'LONG';
                  const isOpen = trade.status === 'OPEN';
                  const isWin = trade.pnl > 0;
                  const isLoss = trade.pnl < 0;

                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-purple-900/25 transition-colors group cursor-pointer"
                      onClick={() => onSelectTrade(trade)}
                    >
                      {/* Symbol & Market */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-white text-sm group-hover:text-purple-300 transition-colors">
                            {trade.symbol}
                          </span>
                          {trade.chart_url && (
                            <span title="Є скріншот або графік">
                              <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-purple-300/60 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/20 text-purple-300 font-mono text-[10px]">
                            {trade.market}
                          </span>
                          <span>{formatDate(trade.entry_date)}</span>
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold backdrop-blur-md ${
                            isLong
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{trade.direction}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                            isOpen
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : trade.status === 'CLOSED'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/20'
                              : 'bg-zinc-900/60 text-zinc-400'
                          }`}
                        >
                          {trade.status === 'OPEN' ? 'В процесі' : trade.status === 'CLOSED' ? 'Закрита' : 'Скасована'}
                        </span>
                      </td>

                      {/* Prices */}
                      <td className="py-3.5 px-3 font-mono">
                        <div className="text-purple-200">
                          Вхід: <span className="font-bold text-white">{trade.entry_price}</span>
                        </div>
                        <div className="text-[11px] text-purple-300/60">
                          {trade.exit_price ? `Вихід: ${trade.exit_price}` : '—'}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-3 font-mono text-purple-200 font-semibold">
                        {trade.quantity}
                      </td>

                      {/* SL / TP */}
                      <td className="py-3.5 px-3 font-mono text-[11px]">
                        <div className="text-rose-400/90 font-medium">SL: {trade.stop_loss ?? '—'}</div>
                        <div className="text-emerald-400/90 font-medium">TP: {trade.take_profit ?? '—'}</div>
                      </td>

                      {/* PnL & ROI */}
                      <td className="py-3.5 px-4 text-right">
                        {isOpen ? (
                          <span className="text-amber-300 font-mono italic text-[11px]">відкрита</span>
                        ) : (
                          <div>
                            <div
                              className={`text-sm font-black font-mono drop-shadow-sm ${
                                isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-purple-200'
                              }`}
                            >
                              {isWin ? '+' : ''}${trade.pnl.toFixed(2)}
                            </div>
                            <div
                              className={`text-[11px] font-mono font-bold ${
                                isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-purple-400'
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
                            className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] ${
                              trade.r_multiple > 0
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : trade.r_multiple < 0
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-purple-950/60 text-purple-300'
                            }`}
                          >
                            {trade.r_multiple > 0 ? `+${trade.r_multiple}R` : `${trade.r_multiple}R`}
                          </span>
                        ) : (
                          <span className="text-purple-400/40">—</span>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {trade.tags ? (
                            trade.tags.split(',').slice(0, 2).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full bg-purple-900/40 border border-purple-400/20 text-purple-200 text-[10px] font-medium truncate backdrop-blur-sm"
                              >
                                #{t.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-purple-400/40">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onSelectTrade(trade)}
                            title="Деталі"
                            className="p-1.5 text-purple-300/70 hover:text-white hover:bg-purple-900/40 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditTrade(trade)}
                            title="Редагувати"
                            className="p-1.5 text-purple-300/70 hover:text-amber-300 hover:bg-purple-900/40 rounded-lg transition-colors"
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
                            className="p-1.5 text-purple-300/70 hover:text-rose-400 hover:bg-purple-900/40 rounded-lg transition-colors"
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

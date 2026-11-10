import React from 'react';
import type { Trade } from '../types';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Star, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  Tag as TagIcon,
  ExternalLink,
  Edit3,
  Trash2
} from 'lucide-react';

interface TradeDetailModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: number) => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !trade) return null;

  const isLong = trade.direction === 'LONG';
  const isOpenTrade = trade.status === 'OPEN';
  const isWin = trade.pnl > 0;
  const isLoss = trade.pnl < 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = () => {
    if (!trade.exit_date) return 'В процесі';
    const start = new Date(trade.entry_date).getTime();
    const end = new Date(trade.exit_date).getTime();
    const diffMs = end - start;
    if (diffMs <= 0) return '0 хв';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} дн. ${hours % 24} год.`;
    }
    return `${hours} год. ${mins} хв.`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090514]/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl liquid-glass-card rounded-3xl shadow-[0_20px_60px_rgba(76,29,149,0.45)] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/15 bg-purple-950/40">
          <div className="flex items-center space-x-3.5">
            <span
              className={`p-2.5 rounded-2xl flex items-center justify-center backdrop-blur-md ${
                isLong
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
              }`}
            >
              {isLong ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </span>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-black text-white tracking-tight">{trade.symbol}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/20 text-purple-300 font-mono">
                  {trade.market}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                    isOpenTrade 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                      : 'bg-purple-950/60 text-purple-300 border border-purple-500/20'
                  }`}
                >
                  {trade.status}
                </span>
              </div>
              <p className="text-xs text-purple-300/60 mt-0.5 font-medium">
                {trade.direction} позиція • {getDuration()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(trade)}
              className="p-2 text-purple-300/70 hover:text-amber-300 hover:bg-purple-900/40 rounded-xl transition-colors"
              title="Редагувати"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Видалити угоду ${trade.symbol}?`)) {
                  onDelete(trade.id);
                  onClose();
                }
              }}
              className="p-2 text-purple-300/70 hover:text-rose-400 hover:bg-purple-900/40 rounded-xl transition-colors"
              title="Видалити"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-purple-300/70 hover:text-white hover:bg-purple-900/40 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Financial Result Banner */}
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-[0_4px_25px_rgba(147,51,234,0.15)]">
            <div>
              <div className="text-xs text-purple-300/60 font-semibold mb-0.5">Результат угоди (Net PnL)</div>
              <div
                className={`text-3xl font-black font-mono drop-shadow-sm ${
                  isOpenTrade
                    ? 'text-amber-300'
                    : isWin
                    ? 'text-emerald-400'
                    : isLoss
                    ? 'text-rose-400'
                    : 'text-purple-200'
                }`}
              >
                {isOpenTrade ? 'Відкрита' : `${isWin ? '+' : ''}$${trade.pnl.toFixed(2)}`}
              </div>
            </div>

            {!isOpenTrade && (
              <div className="flex items-center space-x-6 text-sm font-mono">
                <div>
                  <div className="text-xs text-purple-300/60 font-semibold">ROI %</div>
                  <div className={`text-base font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                  </div>
                </div>

                {trade.r_multiple !== null && trade.r_multiple !== undefined && (
                  <div>
                    <div className="text-xs text-purple-300/60 font-semibold">R:R Multiple</div>
                    <div className="text-base font-black text-purple-300">
                      {trade.r_multiple > 0 ? `+${trade.r_multiple}R` : `${trade.r_multiple}R`}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-purple-300/60 font-semibold">Комісія</div>
                  <div className="text-base text-purple-200 font-bold">${trade.fees.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Execution Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-purple-950/30 border border-purple-500/15 rounded-2xl backdrop-blur-sm">
              <span className="text-[11px] text-purple-300/60 font-semibold block">Ціна входу</span>
              <span className="text-sm font-black text-white font-mono">{trade.entry_price}</span>
            </div>

            <div className="p-3 bg-purple-950/30 border border-purple-500/15 rounded-2xl backdrop-blur-sm">
              <span className="text-[11px] text-purple-300/60 font-semibold block">Ціна виходу</span>
              <span className="text-sm font-black text-white font-mono">
                {trade.exit_price ? trade.exit_price : '—'}
              </span>
            </div>

            <div className="p-3 bg-purple-950/30 border border-purple-500/15 rounded-2xl backdrop-blur-sm">
              <span className="text-[11px] text-purple-300/60 font-semibold block">Об'єм позиції</span>
              <span className="text-sm font-black text-purple-200 font-mono">{trade.quantity}</span>
            </div>

            <div className="p-3 bg-purple-950/30 border border-purple-500/15 rounded-2xl backdrop-blur-sm">
              <span className="text-[11px] text-purple-300/60 font-semibold block">SL / TP</span>
              <span className="text-xs font-mono font-bold block mt-0.5">
                <span className="text-rose-400">{trade.stop_loss ?? '—'}</span> / <span className="text-emerald-400">{trade.take_profit ?? '—'}</span>
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-3 bg-purple-950/30 border border-purple-500/15 rounded-2xl flex flex-col sm:flex-row justify-between text-xs text-purple-300/70 gap-2 font-medium">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>Відкрито: <strong className="text-white font-mono">{formatDate(trade.entry_date)}</strong></span>
            </div>
            {trade.exit_date && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Закрито: <strong className="text-white font-mono">{formatDate(trade.exit_date)}</strong></span>
              </div>
            )}
          </div>

          {/* Tags */}
          {trade.tags && (
            <div>
              <h4 className="text-xs font-bold text-purple-300/70 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <TagIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Теги та сетапи</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {trade.tags.split(',').map((t, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-purple-900/40 border border-purple-400/25 text-purple-200 text-xs font-bold backdrop-blur-sm"
                  >
                    #{t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Psychology & Discipline Box */}
          <div className="p-4 bg-purple-950/40 border border-purple-500/20 rounded-2xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">Психологія та дисципліна</span>
                <span className="text-[11px] text-purple-300/60 block">Оцінка виконання торгового плану</span>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= trade.discipline_rating
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : 'text-purple-900/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2.5 border-t border-purple-500/15 flex items-center space-x-2 text-xs">
              {trade.followed_rules ? (
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Правил торгової стратегії та ризик-менеджменту повністю дотримано.</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Увага: правила торгової стратегії або ризику було порушено!</span>
                </div>
              )}
            </div>
          </div>

          {/* Setup notes & Post trade notes */}
          <div className="space-y-4">
            {trade.setup_notes && (
              <div className="p-4 bg-purple-950/30 border border-purple-500/15 rounded-2xl backdrop-blur-sm">
                <h4 className="text-xs font-bold text-purple-300 mb-1.5">Сетап та причини входу:</h4>
                <p className="text-xs text-purple-100 whitespace-pre-wrap leading-relaxed">
                  {trade.setup_notes}
                </p>
              </div>
            )}

            {trade.post_trade_notes && (
              <div className="p-4 bg-purple-950/30 border border-purple-500/15 rounded-2xl backdrop-blur-sm">
                <h4 className="text-xs font-bold text-purple-300 mb-1.5">Ретроспектива та висновки:</h4>
                <p className="text-xs text-purple-100 whitespace-pre-wrap leading-relaxed">
                  {trade.post_trade_notes}
                </p>
              </div>
            )}
          </div>

          {/* Chart Screenshot */}
          {trade.chart_url && (
            <div>
              <h4 className="text-xs font-bold text-purple-300/70 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Графік / Скріншот угоди</span>
                <a
                  href={trade.chart_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 hover:underline flex items-center space-x-1"
                >
                  <span>Відкрити в повному розмірі</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </h4>
              <div className="rounded-2xl overflow-hidden border border-purple-500/20 bg-[#0c0618] max-h-96 flex items-center justify-center shadow-lg">
                <img
                  src={trade.chart_url}
                  alt={`Графік ${trade.symbol}`}
                  className="max-h-96 w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

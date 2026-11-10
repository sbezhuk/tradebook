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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <span
              className={`p-2 rounded-xl flex items-center justify-center ${
                isLong
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isLong ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{trade.symbol}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {trade.market}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    isOpenTrade ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {trade.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {trade.direction} позиція • {getDuration()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(trade)}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
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
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Видалити"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Financial Result Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Результат угоди (Net PnL)</div>
              <div
                className={`text-3xl font-extrabold font-mono ${
                  isOpenTrade
                    ? 'text-amber-400'
                    : isWin
                    ? 'text-emerald-400'
                    : isLoss
                    ? 'text-rose-400'
                    : 'text-slate-200'
                }`}
              >
                {isOpenTrade ? 'Відкрита' : `${isWin ? '+' : ''}$${trade.pnl.toFixed(2)}`}
              </div>
            </div>

            {!isOpenTrade && (
              <div className="flex items-center space-x-6 text-sm font-mono">
                <div>
                  <div className="text-xs text-slate-500">ROI %</div>
                  <div className={`text-base font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                  </div>
                </div>

                {trade.r_multiple !== null && trade.r_multiple !== undefined && (
                  <div>
                    <div className="text-xs text-slate-500">R:R Multiple</div>
                    <div className="text-base font-bold text-indigo-300">
                      {trade.r_multiple > 0 ? `+${trade.r_multiple}R` : `${trade.r_multiple}R`}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-slate-500">Комісія</div>
                  <div className="text-base text-slate-300">${trade.fees.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Execution Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Ціна входу</span>
              <span className="text-sm font-bold text-white font-mono">{trade.entry_price}</span>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Ціна виходу</span>
              <span className="text-sm font-bold text-white font-mono">
                {trade.exit_price ? trade.exit_price : '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Об'єм позиції</span>
              <span className="text-sm font-bold text-slate-200 font-mono">{trade.quantity}</span>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <span className="text-[11px] text-slate-500 block">SL / TP</span>
              <span className="text-xs font-mono block mt-0.5">
                <span className="text-rose-400">{trade.stop_loss ?? '—'}</span> / <span className="text-emerald-400">{trade.take_profit ?? '—'}</span>
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Відкрито: <strong className="text-white font-mono">{formatDate(trade.entry_date)}</strong></span>
            </div>
            {trade.exit_date && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Закрито: <strong className="text-white font-mono">{formatDate(trade.exit_date)}</strong></span>
              </div>
            )}
          </div>

          {/* Tags */}
          {trade.tags && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                <span>Теги та сетапи</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {trade.tags.split(',').map((t, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-medium"
                  >
                    #{t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Psychology & Discipline Box */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Психологія та дисципліна</span>
                <span className="text-[11px] text-slate-400 block">Оцінка виконання торгового плану</span>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= trade.discipline_rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-2 text-xs">
              {trade.followed_rules ? (
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Правил торгової стратегії та ризик-менеджменту повністю дотримано.</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Увага: правила торгової стратегії або ризику було порушено!</span>
                </div>
              )}
            </div>
          </div>

          {/* Setup notes & Post trade notes */}
          <div className="space-y-4">
            {trade.setup_notes && (
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Сетап та причини входу:</h4>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {trade.setup_notes}
                </p>
              </div>
            )}

            {trade.post_trade_notes && (
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Ретроспектива та висновки:</h4>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {trade.post_trade_notes}
                </p>
              </div>
            )}
          </div>

          {/* Chart Screenshot */}
          {trade.chart_url && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Графік / Скріншот угоди</span>
                <a
                  href={trade.chart_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <span>Відкрити в повному розмірі</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </h4>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-96 flex items-center justify-center">
                <img
                  src={trade.chart_url}
                  alt={`Графік ${trade.symbol}`}
                  className="max-h-96 w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).alt = 'Не вдалося завантажити зображення';
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

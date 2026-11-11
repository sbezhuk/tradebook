import React from 'react';
import type { Trade, TradingAccount } from '../types';
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
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface TradeDetailModalProps {
  trade: Trade | null;
  accounts?: TradingAccount[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (trade: Trade, closeMode?: boolean) => void;
  onDelete: (id: number) => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  accounts = [],
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !trade) return null;
  const account = trade.account_id ? accounts.find((a) => a.id === trade.account_id) : undefined;

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

  const formatSignedCurrency = (value: number) => {
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07040e]/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-popover rounded-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center space-x-3.5">
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isLong
                  ? 'bg-[#c49bff]/15 text-[#c49bff] border-[#c49bff]/25'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/25'
              }`}
            >
              {isLong ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </span>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">{trade.symbol}</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-purple-200/75 font-mono">
                  {trade.market}
                </span>
                <span
                  className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full ${
                    isOpenTrade
                      ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                      : 'bg-white/[0.05] text-purple-200/65 border border-white/[0.08]'
                  }`}
                >
                  {trade.status}
                </span>
              </div>
              <p className="text-xs text-purple-200/50 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                <span>
                  {trade.direction} позиція • {getDuration()}
                </span>
                {accounts.length > 1 && account && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-purple-100/80">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: account.color || '#c49bff' }}
                      />
                      <span>{account.name}</span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {isOpenTrade && (
              <button
                type="button"
                onClick={() => onEdit(trade, true)}
                className="accent-pill inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer mr-1"
                title="Вказати ціну виходу та закрити угоду"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Закрити угоду</span>
              </button>
            )}
            <button
              onClick={() => onEdit(trade)}
              className="p-2 text-purple-200/55 hover:text-[#c49bff] hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
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
              className="p-2 text-purple-200/55 hover:text-rose-400 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
              title="Видалити"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-purple-200/55 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Main Financial Result Banner */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-purple-200/55 font-medium mb-0.5">Результат угоди (Net PnL)</div>
              <div
                className={`text-3xl font-bold font-mono tracking-tight ${
                  isOpenTrade
                    ? 'text-amber-300'
                    : isWin
                    ? 'text-[#c49bff]'
                    : isLoss
                    ? 'text-rose-400'
                    : 'text-purple-200'
                }`}
              >
                {isOpenTrade ? 'Відкрита' : formatSignedCurrency(trade.pnl)}
              </div>
            </div>

            {!isOpenTrade && (
              <div className="flex items-center space-x-6 text-sm font-mono">
                <div>
                  <div className="text-xs text-purple-200/55 font-sans font-medium">ROI %</div>
                  <div
                    className={`text-base font-bold ${
                      isWin ? 'text-[#c49bff]' : isLoss ? 'text-rose-400' : 'text-purple-200'
                    }`}
                  >
                    {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                  </div>
                </div>

                {trade.r_multiple !== null && trade.r_multiple !== undefined && (
                  <div>
                    <div className="text-xs text-purple-200/55 font-sans font-medium">R:R Multiple</div>
                    <div className="text-base font-bold text-[#c49bff]">
                      {trade.r_multiple > 0 ? `+${trade.r_multiple}R` : `${trade.r_multiple}R`}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-purple-200/55 font-sans font-medium">Комісія</div>
                  <div className="text-base text-purple-100/85 font-semibold">${trade.fees.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Execution Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white/[0.025] border border-white/[0.06] rounded-2xl">
              <span className="text-[11px] text-purple-200/50 font-medium block mb-0.5">Ціна входу</span>
              <span className="text-sm font-bold text-white font-mono">{trade.entry_price}</span>
            </div>

            <div className="p-3.5 bg-white/[0.025] border border-white/[0.06] rounded-2xl">
              <span className="text-[11px] text-purple-200/50 font-medium block mb-0.5">Ціна виходу</span>
              <span className="text-sm font-bold text-white font-mono">
                {trade.exit_price ? trade.exit_price : '—'}
              </span>
            </div>

            <div className="p-3.5 bg-white/[0.025] border border-white/[0.06] rounded-2xl">
              <span className="text-[11px] text-purple-200/50 font-medium block mb-0.5">Об'єм позиції</span>
              <span className="text-sm font-bold text-purple-100/90 font-mono">{trade.quantity}</span>
            </div>

            <div className="p-3.5 bg-white/[0.025] border border-white/[0.06] rounded-2xl">
              <span className="text-[11px] text-purple-200/50 font-medium block mb-0.5">SL / TP</span>
              <span className="text-xs font-mono font-semibold block mt-1">
                <span className="text-rose-400/85">{trade.stop_loss ?? '—'}</span>
                <span className="text-purple-200/35 mx-1">/</span>
                <span className="text-[#c49bff]/85">{trade.take_profit ?? '—'}</span>
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-3.5 bg-white/[0.025] border border-white/[0.06] rounded-2xl flex flex-col sm:flex-row justify-between text-xs text-purple-200/65 gap-2 font-medium">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#c49bff]/75" />
              <span>Відкрито: <strong className="text-white font-mono font-semibold">{formatDate(trade.entry_date)}</strong></span>
            </div>
            {trade.exit_date && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#c49bff]/75" />
                <span>Закрито: <strong className="text-white font-mono font-semibold">{formatDate(trade.exit_date)}</strong></span>
              </div>
            )}
          </div>

          {/* Tags */}
          {trade.tags && (
            <div>
              <h4 className="text-[11px] font-semibold text-purple-200/55 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <TagIcon className="w-3.5 h-3.5 text-[#c49bff]/75" />
                <span>Теги та сетапи</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {trade.tags.split(',').map((t, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-[#c49bff]/15 border border-[#c49bff]/25 text-[#d8b4fe] text-xs font-semibold"
                  >
                    #{t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Psychology & Discipline Box */}
          <div className="p-4 bg-white/[0.025] border border-white/[0.06] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Психологія та дисципліна</span>
                <span className="text-[11px] text-purple-200/50 block">Оцінка виконання торгового плану</span>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= trade.discipline_rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2.5 border-t border-white/[0.06] flex items-center space-x-2 text-xs">
              {trade.followed_rules ? (
                <div className="flex items-center space-x-1.5 text-[#c49bff] font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Правил торгової стратегії та ризик-менеджменту повністю дотримано.</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-rose-400 font-semibold">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Увага: правила торгової стратегії або ризику було порушено!</span>
                </div>
              )}
            </div>
          </div>

          {/* Setup notes & Post trade notes */}
          {(trade.setup_notes || trade.post_trade_notes) && (
            <div className="space-y-3">
              {trade.setup_notes && (
                <div className="p-4 bg-white/[0.025] border border-white/[0.06] rounded-2xl">
                  <h4 className="text-xs font-semibold text-[#c49bff]/90 mb-1.5">Сетап та причини входу:</h4>
                  <p className="text-xs text-purple-100/80 whitespace-pre-wrap leading-relaxed">
                    {trade.setup_notes}
                  </p>
                </div>
              )}

              {trade.post_trade_notes && (
                <div className="p-4 bg-white/[0.025] border border-white/[0.06] rounded-2xl">
                  <h4 className="text-xs font-semibold text-[#c49bff]/90 mb-1.5">Ретроспектива та висновки:</h4>
                  <p className="text-xs text-purple-100/80 whitespace-pre-wrap leading-relaxed">
                    {trade.post_trade_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chart Screenshot */}
          {trade.chart_url && (
            <div>
              <h4 className="text-[11px] font-semibold text-purple-200/55 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Графік / Скріншот угоди</span>
                <a
                  href={trade.chart_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#c49bff] hover:underline flex items-center space-x-1 normal-case tracking-normal"
                >
                  <span>Відкрити в повному розмірі</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </h4>
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] max-h-96 flex items-center justify-center">
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

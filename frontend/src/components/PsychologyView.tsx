import React from 'react';
import type { Trade, SummaryStats } from '../types';
import { ShieldCheck, ShieldAlert, Star } from 'lucide-react';

interface PsychologyViewProps {
  trades: Trade[];
  stats: SummaryStats | null;
  onSelectTrade: (trade: Trade) => void;
}

export const PsychologyView: React.FC<PsychologyViewProps> = ({
  trades,
  stats,
  onSelectTrade,
}) => {
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const ruleFollowedTrades = closedTrades.filter((t) => t.followed_rules);
  const ruleBrokenTrades = closedTrades.filter((t) => !t.followed_rules);

  const followedPnl = ruleFollowedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const brokenPnl = ruleBrokenTrades.reduce((acc, t) => acc + t.pnl, 0);

  const avgStars =
    trades.length > 0
      ? (trades.reduce((acc, t) => acc + (t.discipline_rating || 5), 0) / trades.length).toFixed(1)
      : '5.0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Психологія та дисципліна</h1>
        <p className="text-sm text-purple-200/50 mt-1">
          Як дотримання торгового плану впливає на ваш результат і капітал.
        </p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-purple-200/60 mb-2">
            <span>Дотримання правил</span>
            <ShieldCheck className="w-4 h-4 text-[#c49bff]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.rule_discipline_rate ?? 100}%
          </div>
          <div className="text-[11px] text-purple-200/50 mt-1">
            Результат по системі:{' '}
            <span className={followedPnl >= 0 ? 'text-[#c49bff] font-semibold' : 'text-rose-400 font-semibold'}>
              {followedPnl >= 0 ? '+' : ''}${followedPnl.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-purple-200/60 mb-2">
            <span>Ціна порушень плану</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl font-bold font-mono ${brokenPnl < 0 ? 'text-rose-400' : 'text-white'}`}>
            {brokenPnl >= 0 ? '+' : ''}${brokenPnl.toFixed(2)}
          </div>
          <div className="text-[11px] text-purple-200/50 mt-1">
            Угод з порушенням: {ruleBrokenTrades.length}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-purple-200/60 mb-2">
            <span>Середня самооцінка</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{avgStars} / 5.0</div>
          <div className="text-[11px] text-purple-200/50 mt-1">
            На основі {trades.length} зафіксованих угод
          </div>
        </div>
      </div>

      {/* Retrospective Feed */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Останні висновки та нотатки по угодах</h2>
        <div className="space-y-3">
          {trades.filter((t) => t.post_trade_notes || t.setup_notes).length === 0 ? (
            <div className="py-10 text-center text-xs text-purple-200/40">
              Додавайте нотатки та висновки при створенні угод, щоб відстежувати свої інсайти.
            </div>
          ) : (
            trades
              .filter((t) => t.post_trade_notes || t.setup_notes)
              .map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTrade(t)}
                  className="p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-sm text-white">{t.symbol}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          t.followed_rules
                            ? 'bg-[#c49bff]/15 text-[#c49bff]'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {t.followed_rules ? 'За планом' : 'Порушення'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= t.discipline_rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`font-mono text-xs font-bold ${
                          t.pnl >= 0 ? 'text-white' : 'text-rose-400'
                        }`}
                      >
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {t.post_trade_notes && (
                    <p className="text-xs text-purple-100/75 leading-relaxed">{t.post_trade_notes}</p>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

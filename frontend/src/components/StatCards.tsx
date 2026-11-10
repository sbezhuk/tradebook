import React from 'react';
import type { SummaryStats } from '../types';
import { 
  DollarSign, 
  Percent, 
  Scale, 
  Award, 
  Flame, 
  ShieldCheck 
} from 'lucide-react';

interface StatCardsProps {
  stats: SummaryStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  const isPnlPositive = stats.total_pnl >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* Total PnL */}
      <div className="liquid-glass-card liquid-glass-interactive rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-purple-300/70 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Загальний PnL</span>
          <div className={`p-2 rounded-xl backdrop-blur-md border ${
            isPnlPositive 
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
              : 'bg-rose-500/15 text-rose-400 border-rose-400/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
          }`}>
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className={`text-2xl font-black font-mono tracking-tight drop-shadow-sm ${
            isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isPnlPositive ? '+' : ''}${stats.total_pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-purple-300/60 mt-1.5 flex items-center space-x-1.5 font-medium">
            <span>Середня угода:</span>
            <span className={stats.average_trade >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {stats.average_trade >= 0 ? '+' : ''}${stats.average_trade}
            </span>
          </div>
        </div>
      </div>

      {/* Win Rate */}
      <div className="liquid-glass-card liquid-glass-interactive rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-purple-300/70 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Вінрейт</span>
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black font-mono tracking-tight text-white drop-shadow-sm">
            {stats.win_rate}%
          </div>
          <div className="text-[11px] text-purple-300/60 mt-1.5 font-medium">
            <span className="text-emerald-400 font-bold">{stats.winning_trades} W</span>
            <span className="mx-1.5 opacity-50">/</span>
            <span className="text-rose-400 font-bold">{stats.losing_trades} L</span>
            {stats.breakeven_trades > 0 && (
              <>
                <span className="mx-1.5 opacity-50">/</span>
                <span className="text-purple-300 font-medium">{stats.breakeven_trades} BE</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profit Factor */}
      <div className="liquid-glass-card liquid-glass-interactive rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-purple-300/70 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Profit Factor</span>
          <div className="p-2 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-400/30 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black font-mono tracking-tight text-white drop-shadow-sm">
            {stats.profit_factor}
          </div>
          <div className="text-[11px] text-purple-300/60 mt-1.5 font-medium">
            {stats.profit_factor >= 2 ? '⚡ Відмінно' : stats.profit_factor >= 1.5 ? '✨ Добре' : 'Норма'}
          </div>
        </div>
      </div>

      {/* Average Win vs Average Loss */}
      <div className="liquid-glass-card liquid-glass-interactive rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-purple-300/70 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Сер. W / L</span>
          <div className="p-2 rounded-xl bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-400/30 shadow-[0_0_12px_rgba(217,70,239,0.3)]">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-base font-black font-mono text-emerald-400">
            +${stats.average_win}
          </div>
          <div className="text-xs font-bold font-mono text-rose-400 mt-1">
            ${stats.average_loss}
          </div>
        </div>
      </div>

      {/* Max Win / Loss Streaks */}
      <div className="liquid-glass-card liquid-glass-interactive rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-purple-300/70 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Серія перемог</span>
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black font-mono tracking-tight text-white drop-shadow-sm">
            {stats.max_consecutive_wins} <span className="text-xs font-normal text-purple-300/60">підряд</span>
          </div>
          <div className="text-[11px] text-purple-300/60 mt-1.5 font-medium">
            Макс. втрат: <span className="text-rose-400 font-bold">{stats.max_consecutive_losses}</span>
          </div>
        </div>
      </div>

      {/* Discipline */}
      <div className="liquid-glass-card liquid-glass-interactive rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-purple-300/70 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Дисципліна</span>
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black font-mono tracking-tight text-purple-300 drop-shadow-sm">
            {stats.rule_discipline_rate}%
          </div>
          <div className="text-[11px] text-purple-300/60 mt-1.5 font-medium">
            Слідування правилам
          </div>
        </div>
      </div>
    </div>
  );
};

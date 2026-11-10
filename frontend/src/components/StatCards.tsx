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
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Загальний PnL</span>
          <div className={`p-1.5 rounded-lg ${isPnlPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className={`text-2xl font-bold tracking-tight ${isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPnlPositive ? '+' : ''}${stats.total_pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <span>Середня угода:</span>
            <span className={stats.average_trade >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {stats.average_trade >= 0 ? '+' : ''}${stats.average_trade}
            </span>
          </div>
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Вінрейт</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-white">
            {stats.win_rate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="text-emerald-400 font-medium">{stats.winning_trades} W</span>
            <span className="mx-1">/</span>
            <span className="text-rose-400 font-medium">{stats.losing_trades} L</span>
            {stats.breakeven_trades > 0 && (
              <>
                <span className="mx-1">/</span>
                <span className="text-slate-400">{stats.breakeven_trades} BE</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profit Factor */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Profit Factor</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-white">
            {stats.profit_factor}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.profit_factor >= 2 ? '🔥 Відмінно' : stats.profit_factor >= 1.5 ? '👍 Добре' : 'Норма'}
          </div>
        </div>
      </div>

      {/* Average Win vs Average Loss */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Середній W / L</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-base font-bold text-emerald-400">
            +${stats.average_win}
          </div>
          <div className="text-xs font-semibold text-rose-400 mt-0.5">
            ${stats.average_loss}
          </div>
        </div>
      </div>

      {/* Max Win / Loss Streaks */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Серія перемог</span>
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-white">
            {stats.max_consecutive_wins} <span className="text-xs text-slate-500 font-normal">підряд</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Макс. втрат: <span className="text-rose-400 font-medium">{stats.max_consecutive_losses}</span>
          </div>
        </div>
      </div>

      {/* Discipline */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Дотримання правил</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-emerald-400">
            {stats.rule_discipline_rate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Дисципліна трейдингу
          </div>
        </div>
      </div>
    </div>
  );
};

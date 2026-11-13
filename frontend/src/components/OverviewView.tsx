import React from 'react';
import type { Trade, AnalyticsData } from '../types';
import { OverallCapitalStrip } from './OverallCapitalStrip';
import { ArrowUpRight, ArrowDownRight, ChevronRight, CalendarDays } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface OverviewViewProps {
  trades: Trade[];
  analytics: AnalyticsData | null;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  onOpenDeposits?: () => void;
  onOpenFunding?: () => void;
  onSelectTrade: (trade: Trade) => void;
  onGoToTrades: () => void;
  onGoToInsights: () => void;
  onGoToCalendar?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  trades,
  analytics,
  selectedMonth = '',
  onSelectMonth,
  onOpenDeposits,
  onOpenFunding,
  onSelectTrade,
  onGoToTrades,
  onGoToInsights,
  onGoToCalendar,
}) => {
  const stats = analytics?.summary;
  const equity = analytics?.equity_curve || [];
  const availableMonths = analytics?.available_months || [];
  const activeMonthObj = availableMonths.find((m) => m.month === selectedMonth);
  const periodLabel = activeMonthObj ? activeMonthObj.label : 'Весь час';

  const overallPnl = analytics?.overall_total_pnl ?? stats?.total_pnl ?? 0;
  const overallTrades = analytics?.overall_total_trades ?? stats?.total_trades ?? 0;
  const totalDeposits = analytics?.total_deposits ?? 0;
  const currentBalance = analytics?.current_balance ?? overallPnl;
  const overallGrowthPct = analytics?.overall_deposit_growth_pct ?? null;
  const periodGrowthPct = stats?.period_deposit_growth_pct ?? null;
  const periodCumDeposits = stats?.period_cumulative_deposits ?? 0;
  const isPeriodPos = (stats?.total_pnl ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">Огляд портфелю</h1>
          <p className="text-sm text-purple-200/50 mt-1">
            Звітний період: <span className="text-[#c49bff] font-medium">{periodLabel}</span> • статистика розраховується за вибраним місяцем.
          </p>
        </div>

        <OverallCapitalStrip
          overallPnl={overallPnl}
          overallTradePnl={analytics?.overall_trade_pnl}
          overallFundingPnl={analytics?.overall_funding_pnl}
          overallTrades={overallTrades}
          totalDeposits={totalDeposits}
          currentBalance={currentBalance}
          overallGrowthPct={overallGrowthPct}
          onOpenDeposits={onOpenDeposits}
          onOpenFunding={onOpenFunding}
        />
      </div>

      {/* Month Period Selector */}
      {availableMonths.length > 0 && onSelectMonth && (
        <div className="flex flex-wrap items-center gap-2">
          {availableMonths.map((m) => {
            const active = selectedMonth === m.month;
            return (
              <button
                key={m.month}
                type="button"
                onClick={() => onSelectMonth(m.month)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'accent-pill'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-purple-200/75 hover:text-white'
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`font-mono text-[11px] ${
                    active
                      ? 'text-white/90 dark:text-[#110820]/80 font-bold'
                      : m.total_pnl >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {m.total_pnl >= 0 ? '+' : '-'}${Math.abs(m.total_pnl).toFixed(2)}
                  {m.deposit_growth_pct !== null && (
                    <span className="opacity-85 ml-1">
                      ({m.deposit_growth_pct >= 0 ? '+' : ''}
                      {m.deposit_growth_pct.toFixed(1)}%)
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelectMonth('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedMonth === ''
                ? 'accent-pill'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-purple-200/75 hover:text-white'
            }`}
          >
            Весь час
          </button>
        </div>
      )}

      {/* 4 Sleek Glass Metric Cards for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <div className="text-xs text-purple-200/55 font-medium flex items-center justify-between gap-2">
            <span className="truncate">PnL ({periodLabel})</span>
            {periodGrowthPct !== null && (
              <span
                className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  periodGrowthPct >= 0
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {periodGrowthPct >= 0 ? '+' : ''}
                {periodGrowthPct.toFixed(2)}%
              </span>
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono mt-1.5 ${
              isPeriodPos ? 'text-[#c49bff]' : 'text-rose-400'
            }`}
          >
            {isPeriodPos ? '+' : '-'}${Math.abs(stats?.total_pnl ?? 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-purple-200/45 mt-1">
            {periodCumDeposits > 0 ? (
              <span>
                Від депозиту ${periodCumDeposits.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span>
                Середній трейд: {stats && stats.average_trade >= 0 ? '+' : '-'}$
                {Math.abs(stats?.average_trade ?? 0).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="text-xs text-purple-200/55 font-medium">Win Rate</div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">
            {stats?.win_rate ?? 0}%
          </div>
          <div className="text-[11px] text-purple-200/45 mt-1">
            {stats?.winning_trades ?? 0} прибуткових / {stats?.losing_trades ?? 0} збиткових
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="text-xs text-purple-200/55 font-medium">Profit Factor</div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">
            {stats?.profit_factor ?? 0}
          </div>
          <div className="text-[11px] text-purple-200/45 mt-1">
            Макс. серія перемог: {stats?.max_consecutive_wins ?? 0}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="text-xs text-purple-200/55 font-medium">Дисципліна плану</div>
          <div className="text-2xl font-bold font-mono text-[#c49bff] mt-1.5">
            {stats?.rule_discipline_rate ?? 100}%
          </div>
          <div className="text-[11px] text-purple-200/45 mt-1">
            Відкритих позицій зараз: {stats?.open_trades ?? 0}
          </div>
        </div>
      </div>

      {/* Mini Equity + Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Equity Preview */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Динаміка капіталу</h2>
              <p className="text-xs text-purple-200/45 mt-0.5">Крива прибутковості</p>
            </div>
            <button
              onClick={onGoToInsights}
              className="text-xs text-[#c49bff] hover:underline flex items-center space-x-1"
            >
              <span>Аналітика</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-48">
            {equity.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-purple-200/40">
                Немає даних для графіка
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equity}>
                  <defs>
                    <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c49bff" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#c49bff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    cursor={{ stroke: 'rgba(196, 155, 255, 0.35)', strokeWidth: 1 }}
                    labelFormatter={(_label, payload) => {
                      const point = payload?.[0]?.payload;
                      return point?.symbol ? `${point.symbol} • ${point.date}` : '';
                    }}
                    formatter={(val: any) => {
                      const num = Number(val);
                      const sign = num > 0 ? '+' : num < 0 ? '-' : '';
                      return [`${sign}$${Math.abs(num).toFixed(2)}`, 'Equity'];
                    }}
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg)',
                      borderColor: 'var(--tooltip-border)',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: 'var(--tooltip-text)',
                    }}
                    labelStyle={{ color: 'var(--tooltip-text)', fontWeight: 600, marginBottom: '2px' }}
                    itemStyle={{ color: '#c49bff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative_pnl"
                    stroke="#c49bff"
                    strokeWidth={2.5}
                    fill="url(#overviewGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Останні угоди</h2>
              <p className="text-xs text-purple-200/45 mt-0.5">Швидкий доступ до останніх позицій</p>
            </div>
            <div className="flex items-center gap-3">
              {onGoToCalendar && (
                <button
                  type="button"
                  onClick={onGoToCalendar}
                  className="text-xs text-purple-200/70 hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-[#c49bff]" />
                  <span>Календар PnL</span>
                </button>
              )}
              <button
                onClick={onGoToTrades}
                className="text-xs text-[#c49bff] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Весь журнал</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {trades.slice(0, 5).map((t) => {
              const isLong = t.direction === 'LONG';
              const isOpen = t.status === 'OPEN';
              const isWin = t.pnl > 0;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTrade(t)}
                  className="py-3 flex items-center justify-between hover:bg-white/[0.025] px-2 -mx-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isLong ? 'bg-[#c49bff]/15 text-[#c49bff]' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{t.symbol}</div>
                      <div className="text-[11px] text-purple-200/45">
                        {t.market} • {new Date(t.entry_date).toLocaleDateString('uk-UA')}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {isOpen ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 font-medium">
                        Відкрита
                      </span>
                    ) : (
                      <>
                        <div
                          className={`text-xs font-bold font-mono ${
                            isWin ? 'text-[#c49bff]' : t.pnl < 0 ? 'text-rose-400' : 'text-purple-200'
                          }`}
                        >
                          {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-purple-200/45 font-mono">
                          {isWin ? '+' : ''}{t.pnl_percentage.toFixed(2)}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {trades.length === 0 && (
              <div className="py-8 text-center text-xs text-purple-200/40">
                Поки що немає угод
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

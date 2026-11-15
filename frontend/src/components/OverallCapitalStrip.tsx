import React from 'react';
import { Wallet, Plus } from 'lucide-react';

interface OverallCapitalStripProps {
  overallPnl: number;
  overallTradePnl?: number;
  overallFundingPnl?: number;
  overallTrades: number;
  monthsCount?: number;
  totalDeposits: number;
  currentBalance: number;
  overallGrowthPct: number | null;
  onOpenDeposits?: (mode?: 'deposit' | 'withdraw') => void;
  onOpenFunding?: () => void;
}

const formatMoney = (val: number) => {
  const abs = Math.abs(val);
  if (abs > 0 && abs < 100) {
    return abs.toFixed(2);
  }
  return abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const OverallCapitalStrip: React.FC<OverallCapitalStripProps> = ({
  overallPnl,
  overallTradePnl,
  overallFundingPnl,
  overallTrades,
  monthsCount,
  totalDeposits,
  currentBalance,
  overallGrowthPct,
  onOpenDeposits,
  onOpenFunding,
}) => {
  const isOverallPositive = overallPnl >= 0;
  const hasFunding = overallFundingPnl !== undefined && Math.abs(overallFundingPnl) > 1e-4;

  return (
    <div className="glass-panel rounded-2xl border border-[#c49bff]/25 flex flex-col lg:flex-row lg:items-stretch divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] w-full xl:w-auto xl:shrink-0">
      {/* Left: All-Time Overall PnL */}
      <div className="flex-1 min-w-0 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-purple-200/55 font-semibold truncate">
            Загальний PnL (весь час)
          </div>
          <div className="text-[11px] text-purple-200/45 mt-0.5 truncate">
            {overallTrades} закритих угод
            {monthsCount !== undefined && monthsCount > 0 ? ` • ${monthsCount} міс.` : ''}
          </div>
          {hasFunding && (
            <div className="text-[10px] text-purple-200/60 mt-1 font-mono flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="whitespace-nowrap">
                торги: <strong className="text-purple-100 font-semibold">{overallTradePnl !== undefined && overallTradePnl >= 0 ? '+' : ''}${overallTradePnl !== undefined ? formatMoney(overallTradePnl) : '0.00'}</strong>
              </span>
              <span>•</span>
              {onOpenFunding ? (
                <button
                  type="button"
                  onClick={onOpenFunding}
                  title="Клікніть, щоб відкрити управління фандінгом"
                  className="hover:underline cursor-pointer inline-flex items-center gap-0.5 whitespace-nowrap"
                >
                  <span>фандінг:</span>
                  <strong className={overallFundingPnl! >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {overallFundingPnl! >= 0 ? '+' : '-'}${formatMoney(overallFundingPnl!)}
                  </strong>
                </button>
              ) : (
                <span className="whitespace-nowrap">
                  фандінг: <strong className={overallFundingPnl! >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{overallFundingPnl! >= 0 ? '+' : '-'}${formatMoney(overallFundingPnl!)}</strong>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div
            className={`text-xl font-bold font-mono tracking-tight leading-tight ${
              isOverallPositive ? 'text-[#c49bff]' : 'text-rose-400'
            }`}
          >
            {isOverallPositive ? '+' : '-'}${formatMoney(overallPnl)}
          </div>
          {overallGrowthPct !== null && (
            <div
              className={`text-[11px] font-mono font-bold mt-0.5 ${
                overallGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {overallGrowthPct >= 0 ? '+' : ''}
              {overallGrowthPct.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Right: Deposit & Current Balance + Action */}
      <div className="flex-1 min-w-0 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-purple-200/55 font-semibold flex items-center gap-1.5 truncate">
            <Wallet className="w-3.5 h-3.5 text-[#c49bff] shrink-0" />
            <span>Депозит і баланс</span>
          </div>
          <div className="text-[11px] text-purple-200/45 mt-0.5 truncate">
            депозит:{' '}
            <strong className="font-mono text-purple-100 font-semibold">
              ${formatMoney(totalDeposits)}
            </strong>
          </div>
          {onOpenDeposits && (
            <div className="mt-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenDeposits('deposit')}
                title="Поповнити або вивести депозит"
                className="px-2.5 py-0.5 rounded-lg bg-[#c49bff]/15 hover:bg-[#c49bff]/25 border border-[#c49bff]/30 text-[#c49bff] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Депозит</span>
              </button>
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-bold font-mono tracking-tight leading-tight text-white">
            {currentBalance < 0 ? '-' : ''}${formatMoney(currentBalance)}
          </div>
          <div className="text-[11px] font-mono text-purple-200/50 mt-0.5 whitespace-nowrap">
            поточний баланс
          </div>
        </div>
      </div>
    </div>
  );
};

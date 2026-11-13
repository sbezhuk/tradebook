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
  onOpenDeposits?: () => void;
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
      <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4 lg:min-w-[235px]">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-purple-200/55 font-semibold whitespace-nowrap">
            Загальний PnL (весь час)
          </div>
          <div className="text-[11px] text-purple-200/45 mt-0.5 whitespace-nowrap">
            {overallTrades} закритих угод
            {monthsCount !== undefined && monthsCount > 0 ? ` • ${monthsCount} міс.` : ''}
          </div>
          {hasFunding && (
            <div className="text-[10px] text-purple-200/60 mt-1 font-mono flex items-center gap-1.5 whitespace-nowrap">
              <span>торги: <strong className="text-purple-100 font-semibold">{overallTradePnl !== undefined && overallTradePnl >= 0 ? '+' : ''}${overallTradePnl !== undefined ? formatMoney(overallTradePnl) : '0.00'}</strong></span>
              <span>•</span>
              {onOpenFunding ? (
                <button
                  type="button"
                  onClick={onOpenFunding}
                  title="Клікніть, щоб відкрити управління фандінгом"
                  className="hover:underline cursor-pointer inline-flex items-center gap-0.5"
                >
                  <span>фандінг:</span>
                  <strong className={overallFundingPnl! >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {overallFundingPnl! >= 0 ? '+' : '-'}${formatMoney(overallFundingPnl!)}
                  </strong>
                </button>
              ) : (
                <span>фандінг: <strong className={overallFundingPnl! >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{overallFundingPnl! >= 0 ? '+' : '-'}${formatMoney(overallFundingPnl!)}</strong></span>
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
      <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3.5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-purple-200/55 font-semibold flex items-center gap-1.5 whitespace-nowrap">
            <Wallet className="w-3.5 h-3.5 text-[#c49bff] shrink-0" />
            <span>Депозит → Баланс</span>
          </div>
          <div className="text-xs sm:text-[13px] font-mono font-bold text-white mt-1 whitespace-nowrap">
            ${formatMoney(totalDeposits)}{' '}
            <span className="text-purple-200/45 font-normal">→</span>{' '}
            <span className="text-[#c49bff]">
              {currentBalance < 0 ? '-' : ''}${formatMoney(currentBalance)}
            </span>
          </div>
        </div>

        {onOpenDeposits && (
          <button
            type="button"
            onClick={onOpenDeposits}
            className="px-3 py-1.5 rounded-xl bg-[#c49bff]/15 hover:bg-[#c49bff]/25 border border-[#c49bff]/30 text-[#c49bff] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Депозит</span>
          </button>
        )}
      </div>
    </div>
  );
};

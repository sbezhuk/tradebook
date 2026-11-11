import React, { useRef, useState } from 'react';
import type { Trade, SummaryStats } from '../types';
import { ShieldCheck, ShieldAlert, Star, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PaginationBar } from './PaginationBar';

const PSYCHOLOGY_PAGE_SIZE_KEY = 'tradebook_psychology_page_size';
const ALLOWED_PSYCHOLOGY_PAGE_SIZES = [5, 10, 20, 50];

const getInitialPsychologyPageSize = (): number => {
  try {
    const saved = Number(localStorage.getItem(PSYCHOLOGY_PAGE_SIZE_KEY));
    if (ALLOWED_PSYCHOLOGY_PAGE_SIZES.includes(saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return 10;
};

interface PsychologyViewProps {
  trades: Trade[];
  stats: SummaryStats | null;
  onSelectTrade: (trade: Trade) => void;
}

const formatPnl = (value: number): string => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
};

export const PsychologyView: React.FC<PsychologyViewProps> = ({
  trades,
  stats,
  onSelectTrade,
}) => {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(getInitialPsychologyPageSize);
  const feedTopRef = useRef<HTMLDivElement>(null);

  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const ruleFollowedTrades = closedTrades.filter((t) => t.followed_rules);
  const ruleBrokenTrades = closedTrades.filter((t) => !t.followed_rules);

  const followedPnl = ruleFollowedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const brokenPnl = ruleBrokenTrades.reduce((acc, t) => acc + t.pnl, 0);

  const avgStars =
    trades.length > 0
      ? (trades.reduce((acc, t) => acc + (t.discipline_rating || 5), 0) / trades.length).toFixed(1)
      : '5.0';

  const tradesWithNotes = trades.filter((t) =>
    Boolean(t.post_trade_notes?.trim() || t.setup_notes?.trim())
  );
  const totalPages = Math.max(1, Math.ceil(tradesWithNotes.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedTradesWithNotes = tradesWithNotes.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
    try {
      localStorage.setItem(PSYCHOLOGY_PAGE_SIZE_KEY, String(size));
    } catch {
      // ignore storage errors
    }
  };

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
              {formatPnl(followedPnl)}
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-purple-200/60 mb-2">
            <span>Ціна порушень плану</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl font-bold font-mono ${brokenPnl < 0 ? 'text-rose-400' : 'text-white'}`}>
            {formatPnl(brokenPnl)}
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
      <div ref={feedTopRef} className="space-y-4 scroll-mt-6">
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Останні висновки та нотатки по угодах</h2>
            {tradesWithNotes.length > 0 && (
              <span className="text-xs font-mono text-purple-200/45">{tradesWithNotes.length}</span>
            )}
          </div>

          <div className="space-y-3">
            {tradesWithNotes.length === 0 ? (
              <div className="py-10 text-center text-xs text-purple-200/40">
                Додавайте нотатки та висновки при створенні угод, щоб відстежувати свої інсайти.
              </div>
            ) : (
              paginatedTradesWithNotes.map((t) => {
              const isLong = t.direction === 'LONG';
              const isOpen = t.status === 'OPEN';
              const rating = t.discipline_rating || 5;
              const setupNotes = t.setup_notes?.trim();
              const postTradeNotes = t.post_trade_notes?.trim();

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTrade(t)}
                  className="p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] cursor-pointer transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isLong ? 'bg-[#c49bff]/15 text-[#c49bff]' : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {isLong ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="font-bold text-sm text-white w-20 sm:w-24 truncate shrink-0">
                        {t.symbol}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center text-[10px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 min-w-[82px] ${
                          t.followed_rules
                            ? 'bg-[#c49bff]/15 text-[#c49bff]'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {t.followed_rules ? 'За планом' : 'Порушення'}
                      </span>
                      <span className="text-[11px] text-purple-200/45 font-mono hidden sm:inline shrink-0">
                        {new Date(t.entry_date).toLocaleDateString('uk-UA')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 ml-auto">
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        title={`Самооцінка: ${rating}/5`}
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="min-w-[84px] text-right shrink-0">
                        {isOpen ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 font-medium">
                            Відкрита
                          </span>
                        ) : (
                          <span
                            className={`font-mono tabular-nums text-xs font-bold ${
                              t.pnl > 0
                                ? 'text-[#c49bff]'
                                : t.pnl < 0
                                ? 'text-rose-400'
                                : 'text-purple-200'
                            }`}
                          >
                            {formatPnl(t.pnl)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(setupNotes || postTradeNotes) && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.05] space-y-1.5">
                      {setupNotes && (
                        <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                          <span className="w-[64px] shrink-0 text-[10px] uppercase tracking-wider font-semibold text-purple-300/60 mt-0.5">
                            Сетап
                          </span>
                          <p className="text-purple-100/75 whitespace-pre-wrap">{setupNotes}</p>
                        </div>
                      )}
                      {postTradeNotes && (
                        <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                          <span className="w-[64px] shrink-0 text-[10px] uppercase tracking-wider font-semibold text-[#c49bff]/80 mt-0.5">
                            Висновок
                          </span>
                          <p className="text-purple-100/85 whitespace-pre-wrap">{postTradeNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>

        <PaginationBar
          total={tradesWithNotes.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={ALLOWED_PSYCHOLOGY_PAGE_SIZES}
          ariaLabel="Пагінація нотаток психології"
          onAfterPageSelect={() => feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>
    </div>
  );
};

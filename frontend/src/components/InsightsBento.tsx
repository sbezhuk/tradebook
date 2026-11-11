import React, { useState, useMemo } from 'react';
import type { AnalyticsData, BreakdownItem, DailyActivityItem } from '../types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface InsightsBentoProps {
  analytics: AnalyticsData | null;
  loading: boolean;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  pageTitle?: string;
  pageSubtitle?: string;
  defaultSubTab?: 'bento' | 'months' | 'equity' | 'setups';
}

const BAR_COLORS = [
  '#c49bff', // luminous lavender (primary)
  '#9f7aea', // medium violet
  '#818cf8', // periwinkle indigo
  '#60a5fa', // soft sky
  '#f472b6', // orchid pink
  '#fbbf24', // warm gold
  '#34d399', // soft mint
  '#fb7185', // coral rose
];

export const InsightsBento: React.FC<InsightsBentoProps> = ({
  analytics,
  loading,
  selectedMonth = '',
  onSelectMonth,
  pageTitle = 'Аналітика',
  pageSubtitle = 'Скільки ви заробляєте, утримуєте та де ваша перевага на ринку.',
  defaultSubTab = 'bento',
}) => {
  const [subTab, setSubTab] = useState<'bento' | 'months' | 'equity' | 'setups'>(defaultSubTab);
  const [breakdownMode, setBreakdownMode] = useState<'market' | 'symbol' | 'tag'>('market');
  const [hoveredDay, setHoveredDay] = useState<DailyActivityItem | null>(null);

  const formatUsd = (val: number) => {
    const abs = Math.abs(val);
    if (abs > 0 && abs < 100) {
      return abs.toFixed(2);
    }
    return abs.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Build 12-week calendar grid ending at selectedMonth (or today for all-time)
  const calendarWeeks = useMemo(() => {
    const activityMap = new Map<string, DailyActivityItem>();
    if (analytics?.daily_activity) {
      analytics.daily_activity.forEach((item) => {
        activityMap.set(item.date, item);
      });
    }

    const today = new Date();
    let anchorDate = today;
    if (selectedMonth) {
      const [yStr, mStr] = selectedMonth.split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      if (y && m) {
        const monthEnd = new Date(y, m, 0);
        anchorDate = monthEnd < today ? monthEnd : today;
      }
    }

    // Align to Monday-Sunday rows
    const dayOfWeek = (anchorDate.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const endOfWeek = new Date(anchorDate);
    endOfWeek.setDate(anchorDate.getDate() + (6 - dayOfWeek));

    const totalDays = 12 * 7; // 12 weeks
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - totalDays + 1);

    const weeks: {
      label: string;
      days: { dateStr: string; data: DailyActivityItem | null; isFuture: boolean }[];
    }[] = [];

    for (let w = 0; w < 12; w++) {
      const weekDays = [];
      let weekLabel = '';
      for (let d = 0; d < 7; d++) {
        const curr = new Date(startDate);
        curr.setDate(startDate.getDate() + w * 7 + d);
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (d === 0) {
          weekLabel = curr.toLocaleDateString('uk-UA', { month: 'short', day: 'numeric' });
        }
        weekDays.push({
          dateStr,
          data: activityMap.get(dateStr) || null,
          isFuture: curr > today && !activityMap.has(dateStr),
        });
      }
      weeks.push({ label: weekLabel, days: weekDays });
    }
    return weeks;
  }, [analytics?.daily_activity, selectedMonth]);

  if (loading || !analytics) {
    return (
      <div className="p-16 text-center text-purple-200/60">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c49bff] mb-3" />
        <p className="text-xs font-medium">Завантаження аналітики...</p>
      </div>
    );
  }

  const {
    summary,
    equity_curve,
    by_market,
    by_direction,
    by_tag,
    by_symbol,
    by_day_of_week,
    available_months,
    overall_total_pnl,
    overall_total_trades,
  } = analytics;

  const activeMonthObj = available_months.find((m) => m.month === selectedMonth);
  const periodLabel = activeMonthObj ? activeMonthObj.label : 'Весь час';
  const isOverallPositive = overall_total_pnl >= 0;
  const isPeriodPositive = summary.total_pnl >= 0;

  const activeBreakdownList: BreakdownItem[] =
    breakdownMode === 'market'
      ? by_market
      : breakdownMode === 'symbol'
      ? by_symbol
      : by_tag;

  const maxAbsPnl = Math.max(
    ...activeBreakdownList.map((i) => Math.abs(i.total_pnl)),
    1
  );

  // SVG Donut ring metrics
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const winPct = Math.min(Math.max(summary.win_rate, 0), 100);
  const strokeDashoffset = ringCircumference - (winPct / 100) * ringCircumference;

  // Direction bar max
  const maxDirAbs = Math.max(
    ...by_direction.map((d) => Math.abs(d.total_pnl)),
    1
  );

  // Custom Equity Tooltip
  const CustomEquityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-panel p-3 rounded-2xl text-xs">
          <div className="text-purple-200/50 mb-1 font-mono text-[10px]">{data.date}</div>
          <div className="font-bold text-white mb-0.5">{data.symbol}</div>
          <div className="font-mono text-purple-200">
            Угода:{' '}
            <span className={data.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {data.pnl >= 0 ? '+' : ''}${data.pnl}
            </span>
          </div>
          <div className="font-mono text-purple-200 mt-1 pt-1 border-t border-white/[0.08]">
            Equity: <span className="text-[#c49bff] font-bold">${data.cumulative_pnl}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Title, Separate Overall Total PnL Card & Month Period Selector */}
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{pageTitle}</h1>
            <p className="text-sm text-purple-200/50 mt-1">
              {pageSubtitle} Звітний період:{' '}
              <span className="text-[#c49bff] font-semibold">{periodLabel}</span>
            </p>
          </div>

          {/* Separate All-Time Overall Total PnL Badge */}
          <div className="glass-panel rounded-2xl px-5 py-3.5 border border-[#c49bff]/25 flex items-center gap-5 self-start">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-purple-200/55 font-semibold">
                Загальний PnL (весь час)
              </div>
              <div className="text-[11px] text-purple-200/45 mt-0.5">
                {overall_total_trades} закритих угод • {available_months.length} міс.
              </div>
            </div>
            <div
              className={`text-2xl font-bold font-mono tracking-tight ${
                isOverallPositive ? 'text-[#c49bff]' : 'text-rose-400'
              }`}
            >
              {isOverallPositive ? '+' : '-'}${formatUsd(overall_total_pnl)}
            </div>
          </div>
        </div>

        {/* Reporting Month Pill Selector */}
        {available_months.length > 0 && onSelectMonth && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {available_months.map((m) => {
              const isActive = selectedMonth === m.month;
              return (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => onSelectMonth(m.month)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'accent-pill'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-purple-200/75 hover:text-white'
                  }`}
                >
                  <span>{m.label}</span>
                  <span
                    className={`font-mono text-[11px] ${
                      isActive
                        ? 'text-[#110820]/80 font-bold'
                        : m.total_pnl >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {m.total_pnl >= 0 ? '+' : '-'}${formatUsd(m.total_pnl)}
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

        <div className="flex items-center space-x-6 border-b border-white/[0.07] mt-5 overflow-x-auto">
          <button
            onClick={() => setSubTab('bento')}
            className={`pb-3 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
              subTab === 'bento'
                ? 'border-[#c49bff] text-white'
                : 'border-transparent text-purple-200/50 hover:text-purple-100'
            }`}
          >
            Загальний огляд
          </button>
          <button
            onClick={() => setSubTab('months')}
            className={`pb-3 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
              subTab === 'months'
                ? 'border-[#c49bff] text-white'
                : 'border-transparent text-purple-200/50 hover:text-purple-100'
            }`}
          >
            Помісячний звіт ({available_months.length})
          </button>
          <button
            onClick={() => setSubTab('equity')}
            className={`pb-3 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
              subTab === 'equity'
                ? 'border-[#c49bff] text-white'
                : 'border-transparent text-purple-200/50 hover:text-purple-100'
            }`}
          >
            Крива капіталу
          </button>
          <button
            onClick={() => setSubTab('setups')}
            className={`pb-3 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
              subTab === 'setups'
                ? 'border-[#c49bff] text-white'
                : 'border-transparent text-purple-200/50 hover:text-purple-100'
            }`}
          >
            Сетапи і дні тижня
          </button>
        </div>
      </div>

      {/* TAB 1: BENTO OVERVIEW (Matches Verdelo Screenshot Layout) */}
      {subTab === 'bento' && (
        <div className="space-y-5">
          {/* Monthly Reporting Period KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-4">
              <div className="text-[11px] text-purple-200/55 font-medium">
                PnL періоду ({periodLabel})
              </div>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  isPeriodPositive ? 'text-[#c49bff]' : 'text-rose-400'
                }`}
              >
                {isPeriodPositive ? '+' : '-'}${formatUsd(summary.total_pnl)}
              </div>
              <div className="text-[11px] text-purple-200/45 mt-1">
                Середня угода: {summary.average_trade >= 0 ? '+' : '-'}${formatUsd(summary.average_trade)}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <div className="text-[11px] text-purple-200/55 font-medium">Угод за період</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {summary.total_trades}
              </div>
              <div className="text-[11px] text-purple-200/45 mt-1">
                {summary.winning_trades} прибуткових • {summary.losing_trades} збиткових
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <div className="text-[11px] text-purple-200/55 font-medium">Вінрейт періоду</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {summary.win_rate}%
              </div>
              <div className="text-[11px] text-purple-200/45 mt-1">
                Найкраща: +${formatUsd(summary.best_trade)}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <div className="text-[11px] text-purple-200/55 font-medium">Profit Factor</div>
              <div className="text-xl font-bold font-mono text-[#c49bff] mt-1">
                {summary.profit_factor}
              </div>
              <div className="text-[11px] text-purple-200/45 mt-1">
                Дисципліна: {summary.rule_discipline_rate}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT WIDE CARD (7 cols) — By Category / Markets / Symbols */}
            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
                  <div>
                    <h2 className="text-sm font-semibold text-white">За категоріями та активами</h2>
                    <p className="text-xs text-purple-200/45 mt-0.5">
                      Чистий результат та частка прибутку за кожним напрямком
                    </p>
                  </div>

                  {/* Pill Segmented Control (Matches "This month | Last month | 3 months") */}
                  <div className="inline-flex items-center p-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] self-start">
                    <button
                      onClick={() => setBreakdownMode('market')}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        breakdownMode === 'market'
                          ? 'accent-pill'
                          : 'text-purple-200/55 hover:text-white'
                      }`}
                    >
                      Ринки
                    </button>
                    <button
                      onClick={() => setBreakdownMode('symbol')}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        breakdownMode === 'symbol'
                          ? 'accent-pill'
                          : 'text-purple-200/55 hover:text-white'
                      }`}
                    >
                      Активи
                    </button>
                    <button
                      onClick={() => setBreakdownMode('tag')}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        breakdownMode === 'tag'
                          ? 'accent-pill'
                          : 'text-purple-200/55 hover:text-white'
                      }`}
                    >
                      Теги
                    </button>
                  </div>
                </div>

                {/* Horizontal Sleek Bars */}
                {activeBreakdownList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-purple-200/40">
                    Ще немає закритих угод для відображення
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeBreakdownList.slice(0, 8).map((item, idx) => {
                      const widthPct = Math.max(
                        Math.round((Math.abs(item.total_pnl) / maxAbsPnl) * 100),
                        4
                      );
                      const isPositive = item.total_pnl >= 0;
                      const barColor = isPositive
                        ? BAR_COLORS[idx % BAR_COLORS.length]
                        : '#fb7185';

                      return (
                        <div key={item.name} className="flex items-center gap-4 group">
                          <div className="w-28 sm:w-32 shrink-0 flex items-center justify-between">
                            <span className="text-xs font-medium text-purple-100/85 truncate group-hover:text-white transition-colors">
                              {item.name}
                            </span>
                          </div>

                          {/* Thin dark track with colored pill fill */}
                          <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${widthPct}%`,
                                backgroundColor: barColor,
                                boxShadow: `0 0 12px ${barColor}55`,
                              }}
                            />
                          </div>

                          <div className="w-24 text-right font-mono text-xs font-semibold shrink-0">
                            <span className={isPositive ? 'text-white' : 'text-rose-400'}>
                              {isPositive ? '+' : '-'}${formatUsd(item.total_pnl)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-5 mt-5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-purple-200/45">
                <span>Всього закритих угод: {summary.total_trades}</span>
                <span>Середня угода: {summary.average_trade >= 0 ? '+' : ''}${summary.average_trade}</span>
              </div>
            </div>

            {/* RIGHT COLUMN (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* TOP RIGHT CARD — Donut Ring Chart (Matches "Needs and wants") */}
              <div className="glass-panel rounded-2xl p-6">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-white">Ефективність та Win Rate</h2>
                  <p className="text-xs text-purple-200/45 mt-0.5">
                    Співвідношення прибуткових і збиткових угод
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  {/* SVG Ring */}
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                      <circle
                        cx="56"
                        cy="56"
                        r={ringRadius}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="11"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r={ringRadius}
                        fill="transparent"
                        stroke="#c49bff"
                        strokeWidth="11"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-700"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(196, 155, 255, 0.45))' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-white leading-none">
                        {Math.round(summary.win_rate)}%
                      </span>
                      <span className="text-[10px] text-purple-200/50 mt-1">winrate</span>
                    </div>
                  </div>

                  {/* Legend & Insights */}
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#c49bff]" />
                        <span className="text-purple-100/80">Прибуток ({summary.winning_trades})</span>
                      </div>
                      <span className="font-mono font-semibold text-white">
                        +${formatUsd(summary.gross_profit)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-white/25" />
                        <span className="text-purple-100/60">Збитки ({summary.losing_trades})</span>
                      </div>
                      <span className="font-mono font-semibold text-purple-200/75">
                        -${formatUsd(summary.gross_loss)}
                      </span>
                    </div>

                    <p className="text-[11px] text-purple-200/45 pt-2 border-t border-white/[0.06] leading-relaxed">
                      Profit Factor: <strong className="text-purple-200">{summary.profit_factor}</strong> • Дисципліна: <strong className="text-purple-200">{summary.rule_discipline_rate}%</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* MIDDLE RIGHT CARD — Direction & Top Setup (Matches "Who spent it") */}
              <div className="glass-panel rounded-2xl p-6 flex-1">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-white">За напрямком та угодами</h2>
                  <p className="text-xs text-purple-200/45 mt-0.5">
                    Long / Short та найсильніший сетап
                  </p>
                </div>

                <div className="space-y-3.5">
                  {by_direction.map((item) => {
                    const widthPct = Math.max(
                      Math.round((Math.abs(item.total_pnl) / maxDirAbs) * 100),
                      6
                    );
                    const isPos = item.total_pnl >= 0;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <div className="w-20 text-xs font-medium text-purple-100/85 shrink-0">
                          {item.name}
                        </div>
                        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: isPos ? '#c49bff' : '#fb7185',
                              boxShadow: isPos ? '0 0 10px rgba(196,155,255,0.4)' : 'none',
                            }}
                          />
                        </div>
                        <div className="w-20 text-right font-mono text-xs font-semibold text-white shrink-0">
                          {isPos ? '+' : '-'}${formatUsd(item.total_pnl)}
                        </div>
                      </div>
                    );
                  })}

                  {by_tag[0] && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-20 text-xs font-medium text-purple-200/70 truncate shrink-0">
                        #{by_tag[0].name}
                      </div>
                      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#8b5cf6]"
                          style={{
                            width: `${Math.min(Math.max(by_tag[0].win_rate, 10), 100)}%`,
                          }}
                        />
                      </div>
                      <div className="w-20 text-right font-mono text-xs font-semibold text-purple-200 shrink-0">
                        {by_tag[0].total_pnl >= 0 ? '+' : '-'}${formatUsd(by_tag[0].total_pnl)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM FULL-WIDTH CARD — Daily Activity Heatmap (Matches "Spending by day") */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-white">Торгівля по днях</h2>
                <p className="text-xs text-purple-200/45 mt-0.5">
                  Останні 12 тижнів активності • наведення показує денний PnL
                </p>
              </div>

              <div className="h-6 flex items-center text-xs">
                {hoveredDay ? (
                  <div className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] font-mono text-[11px] flex items-center gap-2">
                    <span className="text-purple-200/70">{hoveredDay.date}:</span>
                    <span className={hoveredDay.total_pnl >= 0 ? 'text-[#c49bff] font-bold' : 'text-rose-400 font-bold'}>
                      {hoveredDay.total_pnl >= 0 ? '+' : ''}${hoveredDay.total_pnl}
                    </span>
                    <span className="text-purple-200/40">({hoveredDay.trades_count} угод)</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-[10px] text-purple-200/45">
                    <span>Збиток</span>
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-rose-500/50" />
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-white/[0.05]" />
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-[#7c3aed]/60" />
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-[#c49bff]" />
                    <span>Прибуток</span>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="min-w-[680px]">
                {/* Column Date Headers */}
                <div className="flex items-center mb-2 pl-9">
                  {calendarWeeks.map((week, i) => (
                    <div
                      key={i}
                      className="flex-1 text-[10px] text-purple-200/40 font-medium truncate pr-1"
                    >
                      {i % 2 === 0 ? week.label : ''}
                    </div>
                  ))}
                </div>

                {/* 7 Rows (Mon - Sun) */}
                <div className="space-y-1.5">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((dayLabel, dIdx) => (
                    <div key={dayLabel} className="flex items-center gap-1.5">
                      <div className="w-7 text-[10px] text-purple-200/40 font-medium shrink-0">
                        {dIdx % 2 === 0 ? dayLabel : ''}
                      </div>
                      <div className="flex-1 grid grid-cols-12 gap-1.5">
                        {calendarWeeks.map((week, wIdx) => {
                          const cell = week.days[dIdx];
                          const act = cell.data;
                          let cellStyle = 'bg-white/[0.035] border-white/[0.03]';
                          if (cell.isFuture) {
                            cellStyle = 'bg-transparent border-transparent opacity-20';
                          } else if (act) {
                            const maxWin = Math.max(
                              ...analytics.daily_activity.map((d) => d.total_pnl),
                              0.01
                            );
                            if (act.total_pnl > maxWin * 0.4) {
                              cellStyle = 'bg-[#c49bff] border-[#d8b4fe]/60 shadow-[0_0_10px_rgba(196,155,255,0.45)]';
                            } else if (act.total_pnl > 0) {
                              cellStyle = 'bg-[#8b5cf6]/80 border-[#a78bfa]/40';
                            } else if (act.total_pnl < 0) {
                              cellStyle = 'bg-rose-500/50 border-rose-400/35';
                            } else {
                              cellStyle = 'bg-purple-400/30 border-purple-300/20';
                            }
                          }

                          return (
                            <div
                              key={`${wIdx}-${dIdx}`}
                              onMouseEnter={() =>
                                setHoveredDay(
                                  act || { date: cell.dateStr, trades_count: 0, total_pnl: 0 }
                                )
                              }
                              onMouseLeave={() => setHoveredDay(null)}
                              className={`h-5 rounded-[5px] border transition-transform hover:scale-110 cursor-default ${cellStyle}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1.5: MONTHLY BREAKDOWN REPORT */}
      {subTab === 'months' && (
        <div className="space-y-5">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-white/[0.07] gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Порівняння звітних місяців</h3>
                <p className="text-xs text-purple-200/45 mt-0.5">
                  Кожен календарний місяць формує окремий звітний період. Натисніть на рядок, щоб відкрити аналітику місяця.
                </p>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-purple-200/55">Загальний PnL (весь час)</div>
                <div
                  className={`font-mono text-xl font-bold ${
                    isOverallPositive ? 'text-[#c49bff]' : 'text-rose-400'
                  }`}
                >
                  {isOverallPositive ? '+' : '-'}${formatUsd(overall_total_pnl)}
                </div>
              </div>
            </div>

            {available_months.length === 0 ? (
              <div className="py-12 text-center text-xs text-purple-200/45">
                Немає даних для помісячного звіту
              </div>
            ) : (
              <div className="space-y-6">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...available_months].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="label"
                        stroke="rgba(216,180,254,0.45)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="rgba(216,180,254,0.45)"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Місячний PnL']}
                        contentStyle={{
                          backgroundColor: '#140d22',
                          borderColor: 'rgba(196,155,255,0.25)',
                          borderRadius: '1rem',
                          fontSize: '12px',
                          color: '#fff',
                        }}
                      />
                      <Bar dataKey="total_pnl" radius={[8, 8, 0, 0]}>
                        {[...available_months].reverse().map((entry) => (
                          <Cell
                            key={entry.month}
                            fill={entry.total_pnl >= 0 ? '#c49bff' : '#fb7185'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-purple-200/45">
                        <th className="py-3 px-3">Період</th>
                        <th className="py-3 px-3 text-right">Угод</th>
                        <th className="py-3 px-3 text-right">W / L</th>
                        <th className="py-3 px-3 text-right">Win Rate</th>
                        <th className="py-3 px-3 text-right">Profit Factor</th>
                        <th className="py-3 px-3 text-right">PnL періоду</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {available_months.map((m) => {
                        const isSelected = selectedMonth === m.month;
                        const pos = m.total_pnl >= 0;
                        return (
                          <tr
                            key={m.month}
                            onClick={() => {
                              onSelectMonth?.(m.month);
                              setSubTab('bento');
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#c49bff]/10'
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <td className="py-3.5 px-3 font-semibold text-white flex items-center gap-2">
                              <span>{m.label}</span>
                              {isSelected && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c49bff]/20 text-[#d8b4fe] border border-[#c49bff]/30">
                                  Активний
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-purple-100/80">
                              {m.trades_count}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono">
                              <span className="text-emerald-400">{m.winning_trades}</span>
                              <span className="text-purple-200/40"> / </span>
                              <span className="text-rose-400">{m.losing_trades}</span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-white">
                              {m.win_rate}%
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-purple-200">
                              {m.profit_factor}
                            </td>
                            <td
                              className={`py-3.5 px-3 text-right font-mono font-bold ${
                                pos ? 'text-[#c49bff]' : 'text-rose-400'
                              }`}
                            >
                              {pos ? '+' : '-'}${formatUsd(m.total_pnl)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/[0.12] bg-white/[0.02]">
                        <td className="py-3.5 px-3 font-bold text-white">
                          Разом за весь час
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                          {overall_total_trades}
                        </td>
                        <td className="py-3.5 px-3 text-right text-purple-200/45" colSpan={3}>
                          Окремий підсумок усіх закритих періодів
                        </td>
                        <td
                          className={`py-3.5 px-3 text-right font-mono font-bold text-sm ${
                            isOverallPositive ? 'text-[#c49bff]' : 'text-rose-400'
                          }`}
                        >
                          {isOverallPositive ? '+' : '-'}${formatUsd(overall_total_pnl)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EQUITY CURVE */}
      {subTab === 'equity' && (
        <div className="space-y-5">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/[0.07] gap-2">
              <div>
                <h3 className="text-base font-bold text-white">Крива капіталу (Equity Curve)</h3>
                <p className="text-xs text-purple-200/45 mt-0.5">
                  Накопичувальний результат по всіх закритих позиціях
                </p>
              </div>
              <div className="font-mono text-xl font-bold text-[#c49bff]">
                {summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toFixed(2)}
              </div>
            </div>

            {equity_curve.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-purple-200/40 text-xs">
                Немає закритих угод для побудови графіка
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equity_curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="verdeloPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c49bff" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(216,180,254,0.4)"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) => val.split(' ')[0]}
                    />
                    <YAxis
                      stroke="rgba(216,180,254,0.4)"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip content={<CustomEquityTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cumulative_pnl"
                      stroke="#c49bff"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#verdeloPurpleGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SETUPS & DAYS OF WEEK */}
      {subTab === 'setups' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Ефективність за днями тижня</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={by_day_of_week}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="rgba(216,180,254,0.45)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(216,180,254,0.45)" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(val: any) => [`$${val}`, 'PnL']}
                    contentStyle={{
                      backgroundColor: '#140d22',
                      borderColor: 'rgba(196,155,255,0.25)',
                      borderRadius: '1rem',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="total_pnl" radius={[6, 6, 0, 0]}>
                    {by_day_of_week.map((entry, index) => (
                      <Cell key={`dow-${index}`} fill={entry.total_pnl >= 0 ? '#c49bff' : '#fb7185'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Результативність торгових сетапів</h3>
            <div className="divide-y divide-white/[0.06] text-xs max-h-64 overflow-y-auto pr-1">
              {by_tag.length === 0 ? (
                <div className="py-10 text-center text-purple-200/40">
                  Додайте теги до угод для аналізу сетапів
                </div>
              ) : (
                by_tag.map((item) => (
                  <div key={item.name} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2.5 py-1 rounded-full bg-[#c49bff]/15 border border-[#c49bff]/25 text-[#d8b4fe] font-semibold">
                        #{item.name}
                      </span>
                      <span className="text-purple-200/50 text-[11px]">
                        {item.trades_count} угод • {item.win_rate}% WR
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        item.total_pnl >= 0 ? 'text-white' : 'text-rose-400'
                      }`}
                    >
                      {item.total_pnl >= 0 ? '+' : ''}${item.total_pnl}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

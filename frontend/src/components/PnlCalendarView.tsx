import React, { useState, useMemo } from 'react';
import type { AnalyticsData, Trade, TradingAccount } from '../types';
import { OverallCapitalStrip } from './OverallCapitalStrip';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  Plus,
  Download,
  X,
  Sparkles,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PnlCalendarViewProps {
  analytics: AnalyticsData | null;
  trades: Trade[];
  selectedMonth: string; // 'YYYY-MM' or ''
  onSelectMonth: (month: string) => void;
  onSelectTrade: (trade: Trade) => void;
  onNewTrade?: () => void;
  onOpenDeposits?: () => void;
  onOpenFunding?: () => void;
  onExportCsv?: () => void;
  accounts?: TradingAccount[];
  activeAccountId?: number | null;
}

const MONTHS_NOMINATIVE = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
];

const MONTHS_GENITIVE = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
];

const WEEKDAY_NAMES_7 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const WEEKDAY_NAMES_5 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

const WEEKDAY_FULL_NAMES = [
  'Понеділок',
  'Вівторок',
  'Середа',
  'Четвер',
  "П'ятниця",
  'Субота',
  'Неділя',
];

const formatMoney = (val: number): string => {
  const abs = Math.abs(val);
  if (abs > 0 && abs < 100) {
    return abs.toFixed(2);
  }
  return abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatSignedMoney = (val: number): string => {
  const sign = val > 0 ? '+' : val < 0 ? '-' : '';
  return `${sign}$${formatMoney(val)}`;
};

export const PnlCalendarView: React.FC<PnlCalendarViewProps> = ({
  analytics,
  trades,
  selectedMonth,
  onSelectMonth,
  onSelectTrade,
  onNewTrade,
  onOpenDeposits,
  onOpenFunding,
  onExportCsv,
  accounts = [],
  activeAccountId = null,
}) => {
  // Determine current viewed year & month (1-12)
  const initialYearMonth = useMemo(() => {
    if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const [y, m] = selectedMonth.split('-').map(Number);
      return { year: y, month: m };
    }
    // If analytics has available months, pick the latest
    if (analytics?.available_months && analytics.available_months.length > 0) {
      const latest = analytics.available_months[0].month;
      const [y, m] = latest.split('-').map(Number);
      return { year: y, month: m };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  }, [selectedMonth, analytics?.available_months]);

  const [currentYear, setCurrentYear] = useState<number>(initialYearMonth.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialYearMonth.month);
  const [showWeekends, setShowWeekends] = useState<boolean>(true);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridScrollMode, setGridScrollMode] = useState<boolean>(false);

  // Synchronize when selectedMonth prop changes externally
  React.useEffect(() => {
    if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const [y, m] = selectedMonth.split('-').map(Number);
      setCurrentYear(y);
      setCurrentMonth(m);
    }
  }, [selectedMonth]);

  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const monthTitle = `${MONTHS_NOMINATIVE[currentMonth - 1]} ${currentYear}`;

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Navigation handlers
  const handlePrevMonth = () => {
    let nextY = currentYear;
    let nextM = currentMonth - 1;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setCurrentYear(nextY);
    setCurrentMonth(nextM);
    setSelectedDayDate(null);
    const key = `${nextY}-${String(nextM).padStart(2, '0')}`;
    onSelectMonth(key);
  };

  const handleNextMonth = () => {
    let nextY = currentYear;
    let nextM = currentMonth + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setCurrentYear(nextY);
    setCurrentMonth(nextM);
    setSelectedDayDate(null);
    const key = `${nextY}-${String(nextM).padStart(2, '0')}`;
    onSelectMonth(key);
  };

  const handleTodayMonth = () => {
    const now = new Date();
    const nextY = now.getFullYear();
    const nextM = now.getMonth() + 1;
    setCurrentYear(nextY);
    setCurrentMonth(nextM);
    setSelectedDayDate(todayStr);
    const key = `${nextY}-${String(nextM).padStart(2, '0')}`;
    onSelectMonth(key);
  };

  // Group trades by date (using exit_date or entry_date)
  const tradesByDay = useMemo(() => {
    const map = new Map<string, Trade[]>();
    trades.forEach((t) => {
      const dtStr = t.exit_date || t.entry_date;
      if (!dtStr) return;
      const dateKey = dtStr.slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(t);
    });
    return map;
  }, [trades]);

  // Aggregate daily activity map (from backend analytics + local trades fallback)
  const dailyStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        pnl: number;
        tradesCount: number;
        winsCount: number;
        lossesCount: number;
        breakevenCount: number;
        winRate: number;
        grossProfit: number;
        grossLoss: number;
        profitFactor: number;
        bestTrade: number;
        worstTrade: number;
        totalFees: number;
        volume: number;
      }
    >();

    // 1. Seed with analytics.daily_activity
    if (analytics?.daily_activity) {
      analytics.daily_activity.forEach((item) => {
        map.set(item.date, {
          date: item.date,
          pnl: item.total_pnl,
          tradesCount: item.trades_count,
          winsCount: item.winning_trades ?? 0,
          lossesCount: item.losing_trades ?? 0,
          breakevenCount: item.breakeven_trades ?? 0,
          winRate: item.win_rate ?? 0,
          grossProfit: item.gross_profit ?? 0,
          grossLoss: item.gross_loss ?? 0,
          profitFactor: item.profit_factor ?? 0,
          bestTrade: item.best_trade ?? 0,
          worstTrade: item.worst_trade ?? 0,
          totalFees: item.total_fees ?? 0,
          volume: item.volume ?? 0,
        });
      });
    }

    // 2. Compute or enhance from trades in memory
    tradesByDay.forEach((dayTrades, dateKey) => {
      const closed = dayTrades.filter((t) => t.status === 'CLOSED');
      if (closed.length === 0) return;

      const pnlSum = closed.reduce((acc, t) => acc + (t.pnl || 0), 0);
      const wins = closed.filter((t) => (t.pnl || 0) > 0);
      const losses = closed.filter((t) => (t.pnl || 0) < 0);
      const be = closed.filter((t) => (t.pnl || 0) === 0);
      const gp = wins.reduce((acc, t) => acc + t.pnl, 0);
      const gl = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
      const pf = gl > 0 ? gp / gl : gp > 0 ? gp : 0;
      const best = Math.max(...closed.map((t) => t.pnl || 0), 0);
      const worst = Math.min(...closed.map((t) => t.pnl || 0), 0);
      const fees = closed.reduce((acc, t) => acc + ((t.fees || 0) + (t.funding || 0)), 0);
      const volume = closed.reduce(
        (acc, t) => acc + (t.quantity || 0) * (t.entry_price || 0),
        0
      );

      map.set(dateKey, {
        date: dateKey,
        pnl: Math.round(pnlSum * 100) / 100,
        tradesCount: closed.length,
        winsCount: wins.length,
        lossesCount: losses.length,
        breakevenCount: be.length,
        winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 1000) / 10 : 0,
        grossProfit: Math.round(gp * 100) / 100,
        grossLoss: Math.round(gl * 100) / 100,
        profitFactor: Math.round(pf * 100) / 100,
        bestTrade: Math.round(best * 100) / 100,
        worstTrade: Math.round(worst * 100) / 100,
        totalFees: Math.round(fees * 100) / 100,
        volume: Math.round(volume * 100) / 100,
      });
    });

    return map;
  }, [analytics?.daily_activity, tradesByDay]);

  // Compute month overall KPI
  const monthKpis = useMemo(() => {
    let daysWithTrades = 0;
    let greenDays = 0;
    let redDays = 0;
    let totalPnl = 0;
    let totalTrades = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let breakevenTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let bestDay: { date: string; pnl: number } | null = null;
    let worstDay: { date: string; pnl: number } | null = null;

    for (const [dateKey, stats] of dailyStatsMap.entries()) {
      if (!dateKey.startsWith(currentMonthKey)) continue;
      if (stats.tradesCount > 0) {
        daysWithTrades += 1;
        totalPnl += stats.pnl;
        totalTrades += stats.tradesCount;
        winningTrades += stats.winsCount;
        losingTrades += stats.lossesCount;
        breakevenTrades += stats.breakevenCount;
        grossProfit += stats.grossProfit;
        grossLoss += stats.grossLoss;

        if (stats.pnl > 0) greenDays += 1;
        else if (stats.pnl < 0) redDays += 1;

        if (!bestDay || stats.pnl > (bestDay as { date: string; pnl: number }).pnl) {
          bestDay = { date: dateKey, pnl: stats.pnl };
        }
        if (!worstDay || stats.pnl < (worstDay as { date: string; pnl: number }).pnl) {
          worstDay = { date: dateKey, pnl: stats.pnl };
        }
      }
    }

    const dayWinRate = daysWithTrades > 0 ? (greenDays / daysWithTrades) * 100 : 0;
    const tradeWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
    const avgDayPnl = daysWithTrades > 0 ? totalPnl / daysWithTrades : 0;

    return {
      daysWithTrades,
      greenDays,
      redDays,
      dayWinRate: Math.round(dayWinRate * 10) / 10,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalTrades,
      winningTrades,
      losingTrades,
      breakevenTrades,
      tradeWinRate: Math.round(tradeWinRate * 10) / 10,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossLoss: Math.round(grossLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      avgDayPnl: Math.round(avgDayPnl * 100) / 100,
      bestDay: bestDay as { date: string; pnl: number } | null,
      worstDay: worstDay as { date: string; pnl: number } | null,
    };
  }, [dailyStatsMap, currentMonthKey]);

  // Build calendar matrix (Weeks -> Days)
  const calendarWeeks = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDayDate = new Date(currentYear, currentMonth - 1, 1);
    // JS getDay(): Sun=0, Mon=1, ..., Sat=6. Convert to Mon=0 .. Sun=6
    const firstDayWeekday = (firstDayDate.getDay() + 6) % 7;

    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    interface DayCell {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number; // 0=Mon .. 6=Sun
      stats: ReturnType<typeof dailyStatsMap.get> | null;
      trades: Trade[];
    }

    const allCells: DayCell[] = [];

    // 1. Previous month leading days
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      let prevY = currentYear;
      let prevM = currentMonth - 1;
      if (prevM < 1) {
        prevM = 12;
        prevY -= 1;
      }
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      const dayOfWeek = (new Date(prevY, prevM - 1, dNum).getDay() + 6) % 7;
      allCells.push({
        dateStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek,
        stats: dailyStatsMap.get(dateStr) || null,
        trades: tradesByDay.get(dateStr) || [],
      });
    }

    // 2. Current month days
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
        dNum
      ).padStart(2, '0')}`;
      const dayOfWeek = (new Date(currentYear, currentMonth - 1, dNum).getDay() + 6) % 7;
      allCells.push({
        dateStr,
        dayNumber: dNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        dayOfWeek,
        stats: dailyStatsMap.get(dateStr) || null,
        trades: tradesByDay.get(dateStr) || [],
      });
    }

    // 3. Next month trailing days to complete last week
    const remainder = allCells.length % 7;
    if (remainder > 0) {
      const fillCount = 7 - remainder;
      let nextY = currentYear;
      let nextM = currentMonth + 1;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      for (let dNum = 1; dNum <= fillCount; dNum++) {
        const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
        const dayOfWeek = (new Date(nextY, nextM - 1, dNum).getDay() + 6) % 7;
        allCells.push({
          dateStr,
          dayNumber: dNum,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          dayOfWeek,
          stats: dailyStatsMap.get(dateStr) || null,
          trades: tradesByDay.get(dateStr) || [],
        });
      }
    }

    // Group into 7-day weeks
    const weeks: {
      weekIndex: number;
      days: DayCell[];
      summary: {
        totalPnl: number;
        tradesCount: number;
        winsCount: number;
        lossesCount: number;
        winRate: number;
        daysTraded: number;
      };
    }[] = [];

    for (let w = 0; w < allCells.length / 7; w++) {
      let weekDays = allCells.slice(w * 7, (w + 1) * 7);

      let totalPnl = 0;
      let tradesCount = 0;
      let winsCount = 0;
      let lossesCount = 0;
      let daysTraded = 0;

      weekDays.forEach((cell) => {
        if (cell.stats && cell.stats.tradesCount > 0) {
          totalPnl += cell.stats.pnl;
          tradesCount += cell.stats.tradesCount;
          winsCount += cell.stats.winsCount;
          lossesCount += cell.stats.lossesCount;
          daysTraded += 1;
        }
      });

      const winRate = tradesCount > 0 ? Math.round((winsCount / tradesCount) * 1000) / 10 : 0;

      // Filter out weekends if showWeekends is false
      if (!showWeekends) {
        weekDays = weekDays.filter((d) => d.dayOfWeek < 5);
      }

      weeks.push({
        weekIndex: w + 1,
        days: weekDays,
        summary: {
          totalPnl: Math.round(totalPnl * 100) / 100,
          tradesCount,
          winsCount,
          lossesCount,
          winRate,
          daysTraded,
        },
      });
    }

    return weeks;
  }, [currentYear, currentMonth, todayStr, dailyStatsMap, tradesByDay, showWeekends]);

  // Selected day data
  const selectedDayTrades = useMemo(() => {
    if (!selectedDayDate) return [];
    return tradesByDay.get(selectedDayDate) || [];
  }, [selectedDayDate, tradesByDay]);

  const selectedDayStats = useMemo(() => {
    if (!selectedDayDate) return null;
    return dailyStatsMap.get(selectedDayDate) || null;
  }, [selectedDayDate, dailyStatsMap]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDayDate) return '';
    try {
      const [yStr, mStr, dStr] = selectedDayDate.split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      const d = Number(dStr);
      const dt = new Date(y, m - 1, d);
      const weekdayIdx = (dt.getDay() + 6) % 7;
      const weekdayName = WEEKDAY_FULL_NAMES[weekdayIdx];
      const monthGen = MONTHS_GENITIVE[m - 1];
      return `${weekdayName}, ${d} ${monthGen} ${y}`;
    } catch {
      return selectedDayDate;
    }
  }, [selectedDayDate]);

  // Cumulative PnL chart data for the current month
  const monthlyCumulativeCurve = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const list: { day: string; pnl: number; cumulative: number; trades: number }[] = [];
    let runningCumulative = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(
        2,
        '0'
      )}`;
      const stat = dailyStatsMap.get(dKey);
      const dayPnl = stat?.pnl ?? 0;
      runningCumulative += dayPnl;
      list.push({
        day: `${d} ${MONTHS_GENITIVE[currentMonth - 1].slice(0, 3)}`,
        pnl: dayPnl,
        cumulative: Math.round(runningCumulative * 100) / 100,
        trades: stat?.tradesCount ?? 0,
      });
    }
    return list;
  }, [currentYear, currentMonth, dailyStatsMap]);

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null;

  return (
    <div className="space-y-6">
      {/* 1. Header & Overall Capital Strip */}
      <div>
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white whitespace-nowrap">
                Календар PnL
              </h1>
              {activeAccount && (
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap"
                  style={{
                    backgroundColor: `${activeAccount.color}18`,
                    borderColor: `${activeAccount.color}45`,
                    color: activeAccount.color,
                  }}
                >
                  {activeAccount.name}
                </span>
              )}
            </div>
            <p className="text-sm text-purple-200/50 mt-1 max-w-2xl">
              Щоденний огляд результатів торгівлі, динаміка прибутків та статистика за тижнями.
            </p>
          </div>

          <OverallCapitalStrip
            overallPnl={analytics?.overall_total_pnl ?? 0}
            overallTradePnl={analytics?.overall_trade_pnl}
            overallFundingPnl={analytics?.overall_funding_pnl}
            overallTrades={analytics?.overall_total_trades ?? trades.length}
            monthsCount={analytics?.available_months.length}
            totalDeposits={analytics?.total_deposits ?? 0}
            currentBalance={analytics?.current_balance ?? 0}
            overallGrowthPct={analytics?.overall_deposit_growth_pct ?? null}
            onOpenDeposits={onOpenDeposits}
            onOpenFunding={onOpenFunding}
          />
        </div>

        {/* 2. Month Navigator Bar & Filter Bar */}
        <div className="mt-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 glass-panel p-3.5 sm:p-4 rounded-2xl border border-white/[0.08]">
          {/* Left: Previous / Current / Next Month Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Попередній місяць"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/80 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-3 sm:px-4 py-1.5 rounded-xl bg-[#c49bff]/10 border border-[#c49bff]/25 text-white font-bold text-sm sm:text-base lg:text-lg min-w-[140px] sm:min-w-[170px] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] whitespace-nowrap">
              {monthTitle}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Наступний місяць"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/80 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleTodayMonth}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-purple-200 hover:text-white transition-all cursor-pointer whitespace-nowrap"
            >
              Сьогодні
            </button>
          </div>

          {/* Center / Right: View Toggle, Fit Mode, Weekend Toggle, Export, New Trade */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: Grid vs List */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-[#c49bff]/25 text-white border border-[#c49bff]/40 shadow-sm'
                    : 'text-purple-200/60 hover:text-white'
                }`}
                title="Режим сітки календаря"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Сітка</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-[#c49bff]/25 text-white border border-[#c49bff]/40 shadow-sm'
                    : 'text-purple-200/60 hover:text-white'
                }`}
                title="Режим списку днів за тижнями"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Список</span>
              </button>
            </div>

            {/* In Grid mode: Screen Fit vs Scroll toggle on smaller screens */}
            {viewMode === 'grid' && (
              <button
                type="button"
                onClick={() => setGridScrollMode((v) => !v)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  gridScrollMode
                    ? 'bg-[#c49bff]/15 border-[#c49bff]/30 text-[#e9d5ff]'
                    : 'bg-white/[0.03] border-white/[0.06] text-purple-200/60 hover:text-purple-200'
                }`}
                title={
                  gridScrollMode
                    ? 'Перемкнути на авто-вміщення в екран без скролу'
                    : 'Перемкнути на широкий режим із горизонтальною прокруткою'
                }
              >
                {gridScrollMode ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">В екран</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Прокрутка</span>
                  </>
                )}
              </button>
            )}

            {/* Quick Available Months Pills */}
            {analytics?.available_months && analytics.available_months.length > 0 && (
              <div className="hidden 2xl:flex items-center gap-1.5 mr-1">
                {analytics.available_months.slice(0, 3).map((m) => {
                  const isActive = currentMonthKey === m.month;
                  return (
                    <button
                      key={m.month}
                      type="button"
                      onClick={() => {
                        const [y, mm] = m.month.split('-').map(Number);
                        setCurrentYear(y);
                        setCurrentMonth(mm);
                        setSelectedDayDate(null);
                        onSelectMonth(m.month);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        isActive
                          ? 'bg-[#c49bff]/20 text-[#e9d5ff] border border-[#c49bff]/40 font-semibold'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-purple-200/70 hover:text-white'
                      }`}
                    >
                      <span>{m.label.split(' ')[0]}</span>
                      <span
                        className={`font-mono text-[10px] ${
                          m.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.total_pnl >= 0 ? '+' : ''}${formatMoney(m.total_pnl)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Weekend Toggle */}
            <button
              type="button"
              onClick={() => setShowWeekends((v) => !v)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                showWeekends
                  ? 'bg-white/[0.06] border-white/[0.12] text-white'
                  : 'bg-white/[0.02] border-white/[0.05] text-purple-200/50 hover:text-purple-200'
              }`}
              title={showWeekends ? 'Приховати суботу та неділю' : 'Показати всі 7 днів тижня'}
            >
              <span>{showWeekends ? '7 днів' : '5 днів (Пн-Пт)'}</span>
            </button>

            {/* Export CSV */}
            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-purple-200/75 hover:text-white transition-all cursor-pointer"
                title="Експорт угод місяця в CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* New Trade */}
            {onNewTrade && (
              <button
                type="button"
                onClick={onNewTrade}
                className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-[#c49bff] hover:bg-[#d8b4fe] text-[#110820] shadow-[0_0_20px_rgba(196,155,255,0.35)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden xs:inline">Нова угода</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Monthly Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4">
          {/* Card 1: Month Net PnL */}
          <div className="glass-panel rounded-2xl p-3.5 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-purple-200/55 font-medium">
              <span className="truncate">PnL за місяць</span>
              {monthKpis.daysWithTrades > 0 && (
                <span
                  className={`text-[10px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${
                    monthKpis.totalPnl >= 0
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {monthKpis.totalPnl >= 0 ? '+' : ''}${formatMoney(monthKpis.totalPnl)}
                </span>
              )}
            </div>
            <div
              className={`text-xl xs:text-2xl sm:text-3xl font-bold font-mono tracking-tight mt-1 sm:mt-2 truncate ${
                monthKpis.totalPnl >= 0 ? 'text-[#c49bff]' : 'text-rose-400'
              }`}
            >
              {formatSignedMoney(monthKpis.totalPnl)}
            </div>
            <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-purple-200/50 flex items-center justify-between font-mono flex-wrap gap-x-2">
              <span>+${formatMoney(monthKpis.grossProfit)}</span>
              <span>-${formatMoney(monthKpis.grossLoss)}</span>
            </div>
          </div>

          {/* Card 2: Trading Days & Day Win Rate */}
          <div className="glass-panel rounded-2xl p-3.5 sm:p-5">
            <div className="text-xs text-purple-200/55 font-medium">Денний Win Rate</div>
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1 sm:mt-2 flex-wrap">
              <span className="text-xl xs:text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
                {monthKpis.dayWinRate}%
              </span>
              <span className="text-[10px] sm:text-xs text-purple-200/50">
                ({monthKpis.greenDays}/{monthKpis.daysWithTrades} дн.)
              </span>
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 sm:h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                <div
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{
                    width: `${
                      monthKpis.daysWithTrades > 0
                        ? (monthKpis.greenDays / monthKpis.daysWithTrades) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-rose-400 h-full transition-all duration-300"
                  style={{
                    width: `${
                      monthKpis.daysWithTrades > 0
                        ? (monthKpis.redDays / monthKpis.daysWithTrades) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-[9px] sm:text-[10px] text-purple-200/40 font-mono shrink-0">
                {monthKpis.greenDays}W / {monthKpis.redDays}L
              </span>
            </div>
          </div>

          {/* Card 3: Trades Count & Profit Factor */}
          <div className="glass-panel rounded-2xl p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-xs text-purple-200/55 font-medium">
              <span>Угоди</span>
              <span className="text-[10px] sm:text-[11px] font-mono text-purple-200/70">
                WR: <strong className="text-white">{monthKpis.tradeWinRate}%</strong>
              </span>
            </div>
            <div className="text-xl xs:text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mt-1 sm:mt-2">
              {monthKpis.totalTrades}{' '}
              <span className="text-xs font-normal text-purple-200/50">угод</span>
            </div>
            <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-purple-200/50 flex items-center justify-between font-mono flex-wrap gap-x-2">
              <span>
                PF: <strong className="text-[#c49bff] font-bold">{monthKpis.profitFactor}</strong>
              </span>
              <span>
                {monthKpis.winningTrades}W · {monthKpis.losingTrades}L
              </span>
            </div>
          </div>

          {/* Card 4: Best Day & Worst Day */}
          <div className="glass-panel rounded-2xl p-3.5 sm:p-5">
            <div className="text-xs text-purple-200/55 font-medium">Екстремуми дня</div>
            <div className="mt-1 sm:mt-2 space-y-1 text-[11px] sm:text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400/80 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Кращий:
                </span>
                <span className="font-bold text-emerald-400 truncate">
                  {monthKpis.bestDay ? `+$${formatMoney(monthKpis.bestDay.pnl)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rose-400/80 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Гірший:
                </span>
                <span className="font-bold text-rose-400 truncate">
                  {monthKpis.worstDay ? `-$${formatMoney(Math.abs(monthKpis.worstDay.pnl))}` : '—'}
                </span>
              </div>
              <div className="pt-0.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-[11px] text-purple-200/50">
                <span>Сер. PnL:</span>
                <span
                  className={`font-bold ${
                    monthKpis.avgDayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatSignedMoney(monthKpis.avgDayPnl)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Full Calendar Grid / List View */}
      {viewMode === 'grid' ? (
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-2.5 xs:p-3.5 sm:p-6 border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          <div className={gridScrollMode ? 'overflow-x-auto pb-2' : 'w-full'}>
            <div className={gridScrollMode ? 'min-w-[760px]' : 'w-full'}>
              {/* Weekday Column Headers */}
              <div
                className={`grid gap-1 xs:gap-1.5 sm:gap-2 lg:gap-2.5 mb-2 sm:mb-2.5 ${
                  showWeekends ? 'grid-cols-7 xl:grid-cols-8' : 'grid-cols-5 xl:grid-cols-6'
                }`}
              >
                {(showWeekends ? WEEKDAY_NAMES_7 : WEEKDAY_NAMES_5).map((wName, idx) => {
                  const isWeekend = idx >= 5;
                  return (
                    <div
                      key={wName}
                      className={`text-center py-1.5 sm:py-2 text-[10px] xs:text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg sm:rounded-xl bg-white/[0.02] border border-white/[0.04] ${
                        isWeekend ? 'text-purple-200/40' : 'text-purple-200/75'
                      }`}
                    >
                      {wName}
                    </div>
                  );
                })}
                {/* 8th Column Header: Weekly Summary (shown on xl+) */}
                <div className="hidden xl:block text-center py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-[#c49bff]/10 border border-[#c49bff]/25 text-[#d8b4fe]">
                  Підсумок
                </div>
              </div>

              {/* Calendar Weeks Rows */}
              <div className="space-y-2 sm:space-y-2.5">
                {calendarWeeks.map((week) => {
                  return (
                    <div key={week.weekIndex} className="space-y-1.5">
                      {/* Responsive Weekly Summary Banner (shown on mobile / tablet / small laptop < xl) */}
                      <div className="xl:hidden flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#c49bff]/[0.06] border border-[#c49bff]/20 text-[11px] font-mono select-none">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#d8b4fe] whitespace-nowrap">Тиждень {week.weekIndex}</span>
                          {week.summary.daysTraded > 0 && (
                            <span className="text-[10px] text-purple-200/85 font-semibold whitespace-nowrap px-2 py-0.5 rounded-md bg-white/[0.07] border border-white/[0.1]">
                              {week.summary.daysTraded}д
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold whitespace-nowrap ${
                              week.summary.totalPnl > 0
                                ? 'text-emerald-400'
                                : week.summary.totalPnl < 0
                                ? 'text-rose-400'
                                : 'text-purple-200/60'
                            }`}
                          >
                            {week.summary.tradesCount > 0
                              ? formatSignedMoney(week.summary.totalPnl)
                              : '—'}
                          </span>
                          {week.summary.tradesCount > 0 && (
                            <span className="text-[10px] text-purple-200/60 hidden xs:inline whitespace-nowrap">
                              {week.summary.tradesCount} угод • {Math.round(week.summary.winRate)}% WR
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Days Grid in Week */}
                      <div
                        className={`grid gap-1 xs:gap-1.5 sm:gap-2 lg:gap-2.5 ${
                          showWeekends ? 'grid-cols-7 xl:grid-cols-8' : 'grid-cols-5 xl:grid-cols-6'
                        }`}
                      >
                        {week.days.map((cell) => {
                          const hasTrades = cell.stats && cell.stats.tradesCount > 0;
                          const isSelected = selectedDayDate === cell.dateStr;
                          const pnl = cell.stats?.pnl ?? 0;
                          const isPositive = pnl > 0;
                          const isNegative = pnl < 0;

                          // Visual styling of day card
                          let dayCardStyle =
                            'bg-white/[0.02] border-white/[0.04] text-purple-200/70 hover:bg-white/[0.05] hover:border-white/[0.1]';

                          if (!cell.isCurrentMonth) {
                            dayCardStyle =
                              'bg-transparent border-white/[0.02] opacity-35 hover:opacity-70';
                          } else if (hasTrades) {
                            if (isPositive) {
                              dayCardStyle =
                                'bg-emerald-500/[0.09] dark:bg-emerald-500/[0.12] border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_4px_20px_rgba(16,185,129,0.12)] hover:scale-[1.01]';
                            } else if (isNegative) {
                              dayCardStyle =
                                'bg-rose-500/[0.09] dark:bg-rose-500/[0.12] border-rose-500/30 hover:border-rose-400/60 shadow-[0_4px_20px_rgba(244,63,94,0.12)] hover:scale-[1.01]';
                            } else {
                              dayCardStyle =
                                'bg-purple-500/[0.08] border-purple-400/25 hover:border-purple-300/50';
                            }
                          }

                          if (isSelected) {
                            dayCardStyle +=
                              ' ring-2 ring-[#c49bff] shadow-[0_0_25px_rgba(196,155,255,0.35)] !border-[#c49bff]';
                          }

                          return (
                            <div
                              key={cell.dateStr}
                              onClick={() => {
                                setSelectedDayDate(isSelected ? null : cell.dateStr);
                              }}
                              className={`min-h-[78px] sm:min-h-[92px] lg:min-h-[105px] h-full p-1.5 xs:p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative group select-none ${dayCardStyle}`}
                            >
                              {/* Top Row: Day Number & Trades Pill */}
                              <div className="h-5 sm:h-6 flex items-center justify-between gap-1 leading-none w-full">
                                <span
                                  className={`font-mono font-bold shrink-0 transition-transform ${
                                    cell.isToday
                                      ? 'w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-xs rounded-full bg-[#c49bff] text-[#110820] flex items-center justify-center font-extrabold shadow-[0_0_10px_rgba(196,155,255,0.5)]'
                                      : cell.isCurrentMonth
                                      ? 'text-[11px] sm:text-xs text-white/90 pl-0.5'
                                      : 'text-[10px] sm:text-xs text-purple-200/30 pl-0.5'
                                  }`}
                                >
                                  {cell.dayNumber}
                                </span>

                                {hasTrades && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {cell.trades.some((t) => t.chart_url) && (
                                      <ImageIcon className="hidden md:inline w-2.5 h-2.5 text-[#c49bff]/75" />
                                    )}
                                    <span
                                      className={`text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded font-semibold whitespace-nowrap leading-none ${
                                        isPositive
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : isNegative
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : 'bg-white/10 text-purple-200'
                                      }`}
                                    >
                                      {cell.stats!.tradesCount}
                                      <span className="hidden sm:inline"> у.</span>
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Middle: PnL Display & Win Rate */}
                              {hasTrades ? (
                                <div className="my-auto py-0.5 sm:py-1 text-center min-w-0 w-full">
                                  <div
                                    className={`font-mono font-bold tracking-tight leading-tight truncate w-full text-center text-xs xs:text-sm sm:text-base lg:text-lg ${
                                      isPositive
                                        ? 'text-emerald-400 font-extrabold drop-shadow-[0_2px_8px_rgba(52,211,153,0.3)]'
                                        : isNegative
                                        ? 'text-rose-400 font-extrabold drop-shadow-[0_2px_8px_rgba(251,113,133,0.3)]'
                                        : 'text-purple-200'
                                    }`}
                                    title={formatSignedMoney(pnl)}
                                  >
                                    {formatSignedMoney(pnl)}
                                  </div>

                                  <div className="text-[9px] sm:text-[10px] font-mono text-purple-200/70 mt-0.5 flex items-center justify-center gap-1 whitespace-nowrap truncate w-full">
                                    <span className="hidden md:inline">
                                      {cell.stats!.winsCount}W/{cell.stats!.lossesCount}L
                                    </span>
                                    <span className="hidden md:inline text-purple-200/40">•</span>
                                    <span
                                      className={`font-semibold ${
                                        cell.stats!.winRate >= 50
                                          ? 'text-emerald-300'
                                          : 'text-rose-300'
                                      }`}
                                    >
                                      {Math.round(cell.stats!.winRate)}%
                                      <span className="inline md:hidden"> WR</span>
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="my-auto text-center opacity-0 group-hover:opacity-40 transition-opacity">
                                  <span className="text-[9px] sm:text-[10px] text-purple-200/40 font-mono hidden sm:inline">
                                    Немає угод
                                  </span>
                                </div>
                              )}

                              {/* Bottom Row / Micro Pill */}
                              <div className="h-3.5 sm:h-4 flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-purple-200/40 w-full leading-none mt-auto">
                                {hasTrades && cell.stats?.bestTrade ? (
                                  <span
                                    className="hidden lg:inline truncate max-w-full"
                                    title={`Найкраща: +$${cell.stats.bestTrade}`}
                                  >
                                    max: +${formatMoney(cell.stats.bestTrade)}
                                  </span>
                                ) : (
                                  <span />
                                )}
                                {cell.trades.length > 0 &&
                                  cell.trades.some((t) => t.chart_url) && (
                                    <span className="md:hidden ml-auto">
                                      <ImageIcon className="w-2.5 h-2.5 text-[#c49bff]/75" />
                                    </span>
                                  )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Weekly Summary Column Card (shown only on xl+) */}
                        <div className="hidden xl:flex min-h-[78px] sm:min-h-[92px] lg:min-h-[105px] h-full p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#c49bff]/[0.05] border border-[#c49bff]/20 flex-col justify-between select-none">
                          <div className="h-5 sm:h-6 flex items-center justify-between gap-1.5 text-[11px] font-bold leading-none w-full">
                            <span className="text-[#d8b4fe]/90 whitespace-nowrap shrink-0">
                              Тижд. {week.weekIndex}
                            </span>
                            {week.summary.daysTraded > 0 && (
                              <span className="text-[10px] font-mono text-purple-200/85 font-semibold whitespace-nowrap px-2 py-0.5 rounded-md bg-white/[0.07] border border-white/[0.1] shadow-xs shrink-0">
                                {week.summary.daysTraded}д
                              </span>
                            )}
                          </div>

                          <div className="my-auto py-0.5 sm:py-1 text-center min-w-0 w-full">
                            <div
                              className={`text-sm sm:text-base lg:text-lg font-mono font-bold tracking-tight truncate leading-tight ${
                                week.summary.totalPnl > 0
                                  ? 'text-emerald-400'
                                  : week.summary.totalPnl < 0
                                  ? 'text-rose-400'
                                  : 'text-purple-200/60'
                              }`}
                            >
                              {week.summary.tradesCount > 0
                                ? formatSignedMoney(week.summary.totalPnl)
                                : '—'}
                            </div>

                            {week.summary.tradesCount > 0 && (
                              <div className="text-[10px] font-mono text-purple-200/70 mt-1 flex items-center justify-center gap-1.5 whitespace-nowrap truncate w-full">
                                <span>{week.summary.tradesCount} угод</span>
                                <span>•</span>
                                <span className={week.summary.winRate >= 50 ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                                  {Math.round(week.summary.winRate)}% WR
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="h-3.5 sm:h-4 flex items-center justify-center text-[9px] font-mono text-purple-200/45 whitespace-nowrap mt-auto">
                            {week.summary.tradesCount > 0 ? (
                              <span>{week.summary.winsCount}W · {week.summary.lossesCount}L</span>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Agenda / List View: Mobile-first & vertical breakdown by week and day */
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#c49bff]" />
              <h3 className="text-base font-bold text-white">
                Розклад торгівлі за тижнями ({monthTitle})
              </h3>
            </div>
            <div className="text-xs font-mono text-purple-200/60">
              Днів із торгами: <strong className="text-white">{monthKpis.daysWithTrades}</strong>
            </div>
          </div>

          <div className="space-y-4">
            {calendarWeeks.map((week) => {
              const weekTradedDays = week.days.filter(
                (d) => d.isCurrentMonth && d.stats && d.stats.tradesCount > 0
              );

              return (
                <div
                  key={week.weekIndex}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3 sm:p-4 space-y-3"
                >
                  {/* Week Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#c49bff]/15 text-[#e9d5ff] font-bold text-xs sm:text-sm border border-[#c49bff]/25">
                        Тиждень {week.weekIndex}
                      </span>
                      <span className="text-xs text-purple-200/50">
                        {week.summary.daysTraded}{' '}
                        {week.summary.daysTraded === 1 ? 'торговий день' : 'торгових дні'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
                      <span
                        className={`font-bold ${
                          week.summary.totalPnl > 0
                            ? 'text-emerald-400'
                            : week.summary.totalPnl < 0
                            ? 'text-rose-400'
                            : 'text-purple-200/60'
                        }`}
                      >
                        {week.summary.tradesCount > 0
                          ? formatSignedMoney(week.summary.totalPnl)
                          : '—'}
                      </span>
                      {week.summary.tradesCount > 0 && (
                        <span className="text-[11px] text-purple-200/50 hidden xs:inline">
                          ({week.summary.winsCount}W / {week.summary.lossesCount}L ·{' '}
                          {week.summary.winRate}% WR)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Days in Week */}
                  {weekTradedDays.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {weekTradedDays.map((cell) => {
                        const isSelected = selectedDayDate === cell.dateStr;
                        const pnl = cell.stats?.pnl ?? 0;
                        const isPositive = pnl > 0;
                        const isNegative = pnl < 0;

                        return (
                          <div
                            key={cell.dateStr}
                            onClick={() => setSelectedDayDate(isSelected ? null : cell.dateStr)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                              isSelected
                                ? 'bg-[#c49bff]/15 border-[#c49bff] ring-2 ring-[#c49bff]/50 shadow-[0_0_20px_rgba(196,155,255,0.2)]'
                                : isPositive
                                ? 'bg-emerald-500/[0.08] border-emerald-500/25 hover:border-emerald-500/50'
                                : isNegative
                                ? 'bg-rose-500/[0.08] border-rose-500/25 hover:border-rose-500/50'
                                : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">
                                  {cell.dayNumber}{' '}
                                  <span className="text-xs font-normal text-purple-200/60">
                                    {WEEKDAY_FULL_NAMES[cell.dayOfWeek]}
                                  </span>
                                </span>
                                {cell.isToday && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#c49bff] text-[#110820]">
                                    Сьогодні
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                                  isPositive
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : isNegative
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-white/10 text-purple-200'
                                }`}
                              >
                                {cell.stats!.tradesCount} угод
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between mt-1">
                              <div
                                className={`text-lg font-bold font-mono tracking-tight ${
                                  isPositive
                                    ? 'text-emerald-400'
                                    : isNegative
                                    ? 'text-rose-400'
                                    : 'text-purple-200'
                                }`}
                              >
                                {formatSignedMoney(pnl)}
                              </div>
                              <div className="text-xs font-mono text-purple-200/60">
                                {cell.stats!.winsCount}W / {cell.stats!.lossesCount}L ·{' '}
                                <strong
                                  className={
                                    cell.stats!.winRate >= 50
                                      ? 'text-emerald-300'
                                      : 'text-rose-300'
                                  }
                                >
                                  {cell.stats!.winRate}%
                                </strong>
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-purple-200/50">
                              <span>
                                {cell.stats?.bestTrade
                                  ? `Краща: +$${formatMoney(cell.stats.bestTrade)}`
                                  : '—'}
                              </span>
                              <span className="text-[#c49bff] hover:underline">
                                {isSelected ? 'Сховати деталі ▲' : 'Переглянути ▼'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-2.5 text-center text-xs text-purple-200/40 italic">
                      Немає активних угод на цьому тижні
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Interactive Day Details Inspector Drawer (Expanded when day is clicked) */}
      {selectedDayDate && (
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-[#c49bff]/30 shadow-[0_16px_48px_rgba(0,0,0,0.55)] space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#c49bff]/20 text-[#c49bff] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{formattedSelectedDate}</span>
                  {selectedDayDate === todayStr && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c49bff]/20 text-[#d8b4fe] border border-[#c49bff]/30">
                      Сьогодні
                    </span>
                  )}
                </h3>
                <p className="text-xs text-purple-200/55">
                  Закрито угод: {selectedDayTrades.length} • детальний розбір результатів дня.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNewTrade && (
                <button
                  type="button"
                  onClick={onNewTrade}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.09] text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Додати угоду</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDayDate(null)}
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-purple-200/70 hover:text-white transition-all cursor-pointer"
                title="Закрити деталі дня"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day Metrics Mini Banner */}
          {selectedDayStats && selectedDayStats.tradesCount > 0 ? (
            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-purple-200/50 uppercase font-semibold">
                  Денний PnL
                </div>
                <div
                  className={`text-lg font-bold font-mono mt-0.5 ${
                    selectedDayStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatSignedMoney(selectedDayStats.pnl)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-purple-200/50 uppercase font-semibold">Угод</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {selectedDayStats.tradesCount}{' '}
                  <span className="text-xs text-purple-200/50 font-normal">
                    ({selectedDayStats.winsCount}W / {selectedDayStats.lossesCount}L)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-purple-200/50 uppercase font-semibold">Win Rate</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {selectedDayStats.winRate}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-purple-200/50 uppercase font-semibold">
                  Profit Factor
                </div>
                <div className="text-lg font-bold font-mono text-[#c49bff] mt-0.5">
                  {selectedDayStats.profitFactor}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-purple-200/50 uppercase font-semibold">
                  Прибуток / Збиток
                </div>
                <div className="text-xs font-mono mt-1 text-purple-200">
                  <span className="text-emerald-400 font-bold">+${formatMoney(selectedDayStats.grossProfit)}</span>
                  <span className="text-purple-200/40"> / </span>
                  <span className="text-rose-400 font-bold">-${formatMoney(selectedDayStats.grossLoss)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-purple-200/50 uppercase font-semibold">
                  Комісії та фандінг
                </div>
                <div className="text-sm font-bold font-mono text-purple-200 mt-1">
                  -${formatMoney(selectedDayStats.totalFees)}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-purple-200/50 bg-white/[0.015] rounded-xl border border-white/[0.04]">
              На цю дату не зафіксовано закритих угод.
            </div>
          )}

          {/* List of Trades on this Day */}
          {selectedDayTrades.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-purple-200/60 px-1">
                Угоди дня ({selectedDayTrades.length})
              </div>

              <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.01]">
                {selectedDayTrades.map((trade) => {
                  const isLong = trade.direction === 'LONG';
                  const isPos = trade.pnl > 0;
                  const timeStr = trade.exit_date
                    ? new Date(trade.exit_date).toLocaleTimeString('uk-UA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : trade.entry_date
                    ? new Date(trade.entry_date).toLocaleTimeString('uk-UA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <div
                      key={trade.id}
                      onClick={() => onSelectTrade(trade)}
                      className="p-3.5 sm:p-4 hover:bg-white/[0.04] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                    >
                      {/* Left: Direction, Symbol, Time, Status */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg border shrink-0 ${
                            isLong
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {trade.direction}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm tracking-tight truncate">
                              {trade.symbol}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-purple-200/60 font-mono uppercase">
                              {trade.market}
                            </span>
                            {trade.chart_url && (
                              <span
                                className="text-[10px] text-[#c49bff] flex items-center gap-0.5"
                                title="Є скріншот графіку"
                              >
                                <ImageIcon className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-purple-200/50 font-mono mt-0.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            {timeStr && <span>{timeStr}</span>}
                            <span>•</span>
                            <span>
                              Вхід: ${formatMoney(trade.entry_price)}
                              {trade.exit_price ? ` → Вихід: $${formatMoney(trade.exit_price)}` : ''}
                            </span>
                            <span className="hidden xs:inline">•</span>
                            <span className="hidden xs:inline">К-ть: {trade.quantity}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Tags, Rules, PnL & Action */}
                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                        {/* Rules discipline */}
                        <div className="hidden sm:flex items-center gap-1.5 text-xs">
                          {trade.followed_rules ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Правила
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <XCircle className="w-3 h-3" /> Порушення
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {trade.tags && (
                          <div className="hidden lg:flex items-center gap-1">
                            {trade.tags
                              .split(',')
                              .slice(0, 2)
                              .map((tg) => (
                                <span
                                  key={tg}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-purple-200/70 border border-white/[0.05]"
                                >
                                  #{tg.trim()}
                                </span>
                              ))}
                          </div>
                        )}

                        {/* PnL & % */}
                        <div className="text-right font-mono min-w-[100px]">
                          <div
                            className={`text-base font-bold tracking-tight ${
                              isPos
                                ? 'text-emerald-400'
                                : trade.pnl < 0
                                ? 'text-rose-400'
                                : 'text-purple-200'
                            }`}
                          >
                            {formatSignedMoney(trade.pnl)}
                          </div>
                          <div
                            className={`text-[11px] ${
                              isPos
                                ? 'text-emerald-400/80'
                                : trade.pnl < 0
                                ? 'text-rose-400/80'
                                : 'text-purple-200/40'
                            }`}
                          >
                            {trade.pnl_percentage >= 0 ? '+' : ''}
                            {trade.pnl_percentage.toFixed(2)}%
                            {trade.r_multiple !== null && trade.r_multiple !== undefined && (
                              <span className="ml-1 text-purple-200/60 font-semibold">
                                ({trade.r_multiple >= 0 ? '+' : ''}
                                {trade.r_multiple.toFixed(1)}R)
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] group-hover:bg-[#c49bff]/20 group-hover:text-white text-purple-200/70 border border-white/[0.08] group-hover:border-[#c49bff]/30 transition-all shrink-0"
                        >
                          Деталі
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Cumulative Monthly Progression Mini Chart */}
      {monthlyCumulativeCurve.length > 0 && monthKpis.daysWithTrades > 0 && (
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c49bff]" />
                <span>Динаміка накопичувального PnL за {monthTitle}</span>
              </h3>
              <p className="text-xs text-purple-200/50 mt-0.5">
                Як зростав або змінювався капітал протягом календарного місяця.
              </p>
            </div>
            <div className="font-mono text-sm font-bold text-right">
              Кінцевий PnL:{' '}
              <span className={monthKpis.totalPnl >= 0 ? 'text-[#c49bff]' : 'text-rose-400'}>
                {formatSignedMoney(monthKpis.totalPnl)}
              </span>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCumulativeCurve}>
                <defs>
                  <linearGradient id="monthCalendarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c49bff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#c49bff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="day" stroke="var(--chart-axis)" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="var(--chart-axis)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="glass-popover p-3 rounded-xl text-xs font-mono">
                        <div className="text-purple-200/60 text-[10px]">{d.day}</div>
                        <div className="text-white mt-1">
                          День:{' '}
                          <span className={d.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {formatSignedMoney(d.pnl)}
                          </span>
                        </div>
                        <div className="text-purple-200 mt-0.5">
                          Накопичений PnL:{' '}
                          <span className="text-[#c49bff] font-bold">
                            {formatSignedMoney(d.cumulative)}
                          </span>
                        </div>
                        {d.trades > 0 && (
                          <div className="text-purple-200/50 text-[10px] mt-1 border-t border-white/[0.08] pt-1">
                            Угод за день: {d.trades}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#c49bff"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#monthCalendarGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

from typing import List, Dict, Optional
from datetime import datetime
from collections import defaultdict
from app.models.trade import Trade
from app.schemas.analytics import (
    AnalyticsResponse,
    SummaryStats,
    EquityPoint,
    BreakdownItem,
    DailyActivityItem,
    MonthlySummaryItem,
)

DAYS_MAP = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"]

MONTHS_UK = {
    1: "Січень",
    2: "Лютий",
    3: "Березень",
    4: "Квітень",
    5: "Травень",
    6: "Червень",
    7: "Липень",
    8: "Серпень",
    9: "Вересень",
    10: "Жовтень",
    11: "Листопад",
    12: "Грудень",
}


def _get_trade_time(t: Trade) -> datetime:
    return t.exit_date or t.entry_date or datetime.min


def _get_trade_month(t: Trade) -> Optional[str]:
    dt = t.exit_date or t.entry_date
    return dt.strftime("%Y-%m") if dt else None


def _format_month_label(month_key: str) -> str:
    try:
        year_str, month_str = month_key.split("-")
        month_num = int(month_str)
        return f"{MONTHS_UK.get(month_num, month_str)} {year_str}"
    except ValueError:
        return month_key


def _compute_profit_factor(gross_profit: float, gross_loss: float) -> float:
    if gross_loss > 0:
        return round(gross_profit / gross_loss, 2)
    return round(gross_profit, 2) if gross_profit > 0 else 0.0


def _empty_summary(open_trades_count: int = 0) -> SummaryStats:
    return SummaryStats(
        total_trades=0,
        winning_trades=0,
        losing_trades=0,
        breakeven_trades=0,
        open_trades=open_trades_count,
        win_rate=0.0,
        total_pnl=0.0,
        gross_profit=0.0,
        gross_loss=0.0,
        profit_factor=0.0,
        average_trade=0.0,
        average_win=0.0,
        average_loss=0.0,
        best_trade=0.0,
        worst_trade=0.0,
        max_consecutive_wins=0,
        max_consecutive_losses=0,
        rule_discipline_rate=100.0,
    )


def _build_available_months(trades: List[Trade]) -> List[MonthlySummaryItem]:
    month_closed_groups: Dict[str, List[Trade]] = defaultdict(list)
    all_months = set()

    for t in trades:
        m = _get_trade_month(t)
        if not m:
            continue
        all_months.add(m)
        if t.status == "CLOSED":
            month_closed_groups[m].append(t)

    items: List[MonthlySummaryItem] = []
    for month_key in sorted(all_months, reverse=True):
        tr_list = month_closed_groups.get(month_key, [])
        cnt = len(tr_list)
        wins = [t for t in tr_list if t.pnl > 0]
        losses = [t for t in tr_list if t.pnl < 0]
        total_pnl = round(sum(t.pnl for t in tr_list), 2)
        gross_profit = round(sum(t.pnl for t in wins), 2)
        gross_loss = round(abs(sum(t.pnl for t in losses)), 2)
        win_rate = round((len(wins) / cnt * 100), 2) if cnt > 0 else 0.0

        items.append(
            MonthlySummaryItem(
                month=month_key,
                label=_format_month_label(month_key),
                trades_count=cnt,
                winning_trades=len(wins),
                losing_trades=len(losses),
                win_rate=win_rate,
                total_pnl=total_pnl,
                profit_factor=_compute_profit_factor(gross_profit, gross_loss),
            )
        )
    return items


def compute_analytics(trades: List[Trade], month: Optional[str] = None) -> AnalyticsResponse:
    overall_closed = [t for t in trades if t.status == "CLOSED"]
    overall_total_pnl = round(sum(t.pnl for t in overall_closed), 2)
    overall_total_trades = len(overall_closed)
    available_months = _build_available_months(trades)

    period_trades = (
        [t for t in trades if _get_trade_month(t) == month]
        if month
        else trades
    )

    if not period_trades:
        return AnalyticsResponse(
            overall_total_pnl=overall_total_pnl,
            overall_total_trades=overall_total_trades,
            selected_month=month,
            available_months=available_months,
            summary=_empty_summary(),
            equity_curve=[],
            by_market=[],
            by_direction=[],
            by_tag=[],
            by_symbol=[],
            by_day_of_week=[],
            daily_activity=[],
        )

    open_trades = [t for t in period_trades if t.status == "OPEN"]
    closed_trades = [t for t in period_trades if t.status == "CLOSED"]
    closed_trades_sorted = sorted(closed_trades, key=_get_trade_time)

    winning = [t for t in closed_trades if t.pnl > 0]
    losing = [t for t in closed_trades if t.pnl < 0]
    breakeven = [t for t in closed_trades if t.pnl == 0]

    total_closed = len(closed_trades)
    win_rate = round((len(winning) / total_closed * 100), 2) if total_closed > 0 else 0.0

    total_pnl = round(sum(t.pnl for t in closed_trades), 2)
    gross_profit = round(sum(t.pnl for t in winning), 2)
    gross_loss = round(abs(sum(t.pnl for t in losing)), 2)

    profit_factor = _compute_profit_factor(gross_profit, gross_loss)

    avg_trade = round(total_pnl / total_closed, 2) if total_closed > 0 else 0.0
    avg_win = round(gross_profit / len(winning), 2) if winning else 0.0
    avg_loss = round(sum(t.pnl for t in losing) / len(losing), 2) if losing else 0.0

    best_trade = max((t.pnl for t in closed_trades), default=0.0)
    worst_trade = min((t.pnl for t in closed_trades), default=0.0)

    max_wins = 0
    max_losses = 0
    curr_wins = 0
    curr_losses = 0
    for t in closed_trades_sorted:
        if t.pnl > 0:
            curr_wins += 1
            curr_losses = 0
            if curr_wins > max_wins:
                max_wins = curr_wins
        elif t.pnl < 0:
            curr_losses += 1
            curr_wins = 0
            if curr_losses > max_losses:
                max_losses = curr_losses
        else:
            curr_wins = 0
            curr_losses = 0

    followed_rules_count = sum(1 for t in closed_trades if t.followed_rules)
    rule_discipline_rate = round((followed_rules_count / total_closed * 100), 2) if total_closed > 0 else 100.0

    summary = SummaryStats(
        total_trades=total_closed,
        winning_trades=len(winning),
        losing_trades=len(losing),
        breakeven_trades=len(breakeven),
        open_trades=len(open_trades),
        win_rate=win_rate,
        total_pnl=total_pnl,
        gross_profit=gross_profit,
        gross_loss=gross_loss,
        profit_factor=profit_factor,
        average_trade=avg_trade,
        average_win=avg_win,
        average_loss=avg_loss,
        best_trade=round(best_trade, 2),
        worst_trade=round(worst_trade, 2),
        max_consecutive_wins=max_wins,
        max_consecutive_losses=max_losses,
        rule_discipline_rate=rule_discipline_rate,
    )

    equity_curve: List[EquityPoint] = []
    cumulative = 0.0
    for t in closed_trades_sorted:
        cumulative = round(cumulative + t.pnl, 2)
        date_str = (t.exit_date or t.entry_date).strftime("%Y-%m-%d %H:%M")
        equity_curve.append(
            EquityPoint(
                date=date_str,
                trade_id=t.id,
                symbol=t.symbol,
                pnl=round(t.pnl, 2),
                cumulative_pnl=cumulative,
            )
        )

    def build_breakdown(groups: Dict[str, List[Trade]]) -> List[BreakdownItem]:
        res = []
        for name, tr_list in groups.items():
            wins = sum(1 for tr in tr_list if tr.pnl > 0)
            cnt = len(tr_list)
            wr = round((wins / cnt * 100), 2) if cnt > 0 else 0.0
            pnl_sum = round(sum(tr.pnl for tr in tr_list), 2)
            res.append(BreakdownItem(name=name, trades_count=cnt, win_rate=wr, total_pnl=pnl_sum))
        res.sort(key=lambda x: abs(x.total_pnl), reverse=True)
        return res

    market_groups = defaultdict(list)
    for t in closed_trades:
        market_groups[t.market or "Інше"].append(t)
    by_market = build_breakdown(market_groups)

    dir_groups = defaultdict(list)
    for t in closed_trades:
        dir_groups[t.direction].append(t)
    by_direction = build_breakdown(dir_groups)

    symbol_groups = defaultdict(list)
    for t in closed_trades:
        symbol_groups[t.symbol].append(t)
    by_symbol = build_breakdown(symbol_groups)

    tag_groups = defaultdict(list)
    for t in closed_trades:
        if t.tags:
            for tag in t.tags.split(","):
                clean_tag = tag.strip()
                if clean_tag:
                    tag_groups[clean_tag].append(t)
        else:
            tag_groups["Без тегу"].append(t)
    by_tag = build_breakdown(tag_groups)

    day_groups = defaultdict(list)
    for t in closed_trades:
        dt = t.entry_date or t.exit_date
        if dt:
            day_name = DAYS_MAP[dt.weekday()]
            day_groups[day_name].append(t)
    by_day_of_week = []
    for day in DAYS_MAP:
        if day in day_groups:
            tr_list = day_groups[day]
            wins = sum(1 for tr in tr_list if tr.pnl > 0)
            cnt = len(tr_list)
            wr = round((wins / cnt * 100), 2) if cnt > 0 else 0.0
            pnl_sum = round(sum(tr.pnl for tr in tr_list), 2)
            by_day_of_week.append(BreakdownItem(name=day, trades_count=cnt, win_rate=wr, total_pnl=pnl_sum))

    daily_map: Dict[str, List[Trade]] = defaultdict(list)
    for t in closed_trades:
        dt = t.exit_date or t.entry_date
        if dt:
            daily_map[dt.strftime("%Y-%m-%d")].append(t)

    daily_activity = [
        DailyActivityItem(
            date=date_str,
            trades_count=len(tr_list),
            total_pnl=round(sum(tr.pnl for tr in tr_list), 2),
        )
        for date_str, tr_list in sorted(daily_map.items())
    ]

    return AnalyticsResponse(
        overall_total_pnl=overall_total_pnl,
        overall_total_trades=overall_total_trades,
        selected_month=month,
        available_months=available_months,
        summary=summary,
        equity_curve=equity_curve,
        by_market=by_market,
        by_direction=by_direction,
        by_tag=by_tag,
        by_symbol=by_symbol,
        by_day_of_week=by_day_of_week,
        daily_activity=daily_activity,
    )

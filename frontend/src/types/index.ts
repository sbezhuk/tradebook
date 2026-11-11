export type MarketType = 'CRYPTO' | 'FOREX' | 'STOCKS' | 'FUTURES' | 'COMMODITIES' | 'OTHER';
export type DirectionType = 'LONG' | 'SHORT';
export type StatusType = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type AccountPlatform = 'HYPERLIQUID' | 'BINANCE' | 'BYBIT' | 'OKX' | 'PROP' | 'CUSTOM';
export type AccountType = 'PERSONAL' | 'FUTURES' | 'SPOT' | 'PROP' | 'DEMO';

export interface TradingAccount {
  id: number;
  user_id: number;
  name: string;
  platform: AccountPlatform | string;
  account_type: AccountType | string;
  currency: string;
  color: string;
  is_default: boolean;
  created_at: string;
  trades_count: number;
  open_trades: number;
  total_pnl: number;
  total_deposits: number;
  current_balance: number;
}

export interface AccountFormData {
  name: string;
  platform: string;
  account_type: string;
  currency?: string;
  color: string;
  is_default?: boolean;
}

export interface AccountListResponse {
  items: TradingAccount[];
  total: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Trade {
  id: number;
  user_id: number;
  account_id?: number | null;
  symbol: string;
  market: MarketType;
  direction: DirectionType;
  status: StatusType;
  entry_date: string;
  exit_date?: string | null;
  entry_price: number;
  exit_price?: number | null;
  quantity: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  fees: number;
  pnl: number;
  pnl_percentage: number;
  r_multiple?: number | null;
  tags?: string;
  setup_notes?: string | null;
  post_trade_notes?: string | null;
  discipline_rating: number;
  followed_rules: boolean;
  chart_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeFormData {
  account_id?: number | null;
  symbol: string;
  market: MarketType;
  direction: DirectionType;
  status: StatusType;
  entry_date: string;
  exit_date?: string | null;
  entry_price: number;
  exit_price?: number | null;
  quantity: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  fees: number;
  pnl?: number | null;
  tags?: string;
  setup_notes?: string | null;
  post_trade_notes?: string | null;
  discipline_rating: number;
  followed_rules: boolean;
  chart_url?: string | null;
}

export interface SummaryStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  open_trades: number;
  win_rate: number;
  total_pnl: number;
  gross_profit: number;
  gross_loss: number;
  profit_factor: number;
  average_trade: number;
  average_win: number;
  average_loss: number;
  best_trade: number;
  worst_trade: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
  rule_discipline_rate: number;
  period_deposits: number;
  period_cumulative_deposits: number;
  period_deposit_growth_pct: number | null;
}

export interface EquityPoint {
  date: string;
  trade_id: number;
  symbol: string;
  pnl: number;
  cumulative_pnl: number;
}

export interface BreakdownItem {
  name: string;
  trades_count: number;
  win_rate: number;
  total_pnl: number;
}

export interface DailyActivityItem {
  date: string;
  trades_count: number;
  total_pnl: number;
}

export interface MonthlySummaryItem {
  month: string;
  label: string;
  trades_count: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  profit_factor: number;
  deposits_amount: number;
  cumulative_deposits: number;
  deposit_growth_pct: number | null;
}

export interface AnalyticsData {
  overall_total_pnl: number;
  overall_total_trades: number;
  total_deposits: number;
  current_balance: number;
  overall_deposit_growth_pct: number | null;
  selected_month: string | null;
  available_months: MonthlySummaryItem[];
  summary: SummaryStats;
  equity_curve: EquityPoint[];
  by_market: BreakdownItem[];
  by_direction: BreakdownItem[];
  by_tag: BreakdownItem[];
  by_symbol: BreakdownItem[];
  by_day_of_week: BreakdownItem[];
  daily_activity: DailyActivityItem[];
}

export interface HyperliquidImportResponse {
  imported_count: number;
  skipped_duplicates: number;
  open_count: number;
  total_pnl: number;
  trades: Trade[];
}

export interface HyperliquidDepositImportResponse {
  imported_count: number;
  skipped_duplicates: number;
  total_amount: number;
  deposits: Deposit[];
}

export interface Deposit {
  id: number;
  user_id: number;
  account_id?: number | null;
  amount: number;
  deposit_date: string;
  note?: string | null;
  created_at: string;
}

export interface DepositFormData {
  account_id?: number | null;
  amount: number;
  deposit_date: string;
  note?: string | null;
}

export interface DepositListResponse {
  items: Deposit[];
  total_amount: number;
  count: number;
}

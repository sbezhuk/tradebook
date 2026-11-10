export type MarketType = 'CRYPTO' | 'FOREX' | 'STOCKS' | 'FUTURES' | 'COMMODITIES' | 'OTHER';
export type DirectionType = 'LONG' | 'SHORT';
export type StatusType = 'OPEN' | 'CLOSED' | 'CANCELLED';

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
  profit_factor: number;
  average_trade: number;
  average_win: number;
  average_loss: number;
  best_trade: number;
  worst_trade: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
  rule_discipline_rate: number;
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

export interface AnalyticsData {
  summary: SummaryStats;
  equity_curve: EquityPoint[];
  by_market: BreakdownItem[];
  by_direction: BreakdownItem[];
  by_tag: BreakdownItem[];
  by_day_of_week: BreakdownItem[];
}

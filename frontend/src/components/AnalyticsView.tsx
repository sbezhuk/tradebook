import React from 'react';
import type { AnalyticsData } from '../types';
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
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  Layers, 
  Calendar, 
  Tag as TagIcon, 
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface AnalyticsViewProps {
  analytics: AnalyticsData | null;
  loading: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analytics, loading }) => {
  if (loading || !analytics) {
    return (
      <div className="p-16 text-center text-purple-300">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-3" />
        <p className="text-xs font-medium">Завантаження аналітики трейдингу...</p>
      </div>
    );
  }

  const { summary, equity_curve, by_market, by_direction, by_tag, by_day_of_week } = analytics;

  // Custom Tooltip for Equity Curve
  const CustomEquityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="liquid-glass-card p-3 rounded-2xl shadow-[0_10px_30px_rgba(76,29,149,0.5)] text-xs border border-purple-400/30">
          <div className="text-purple-300/60 mb-1 font-mono text-[11px]">{data.date}</div>
          <div className="font-extrabold text-white mb-0.5">{data.symbol}</div>
          <div className="font-mono text-purple-200">
            PnL угоди: <span className={data.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {data.pnl >= 0 ? '+' : ''}${data.pnl}
            </span>
          </div>
          <div className="font-mono text-purple-200 mt-1 pt-1 border-t border-purple-500/20">
            Баланс / Equity: <span className="text-purple-300 font-black">${data.cumulative_pnl}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Equity Curve Chart */}
      <div className="liquid-glass-card rounded-3xl p-6 shadow-[0_12px_40px_rgba(76,29,149,0.25)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-purple-500/15 gap-2">
          <div>
            <h3 className="text-base font-black text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span>Крива прибутковості (Equity Curve)</span>
            </h3>
            <p className="text-xs text-purple-300/60 mt-0.5">
              Кумулятивний прибуток за всіма закритими угодами
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-purple-300/70 font-semibold">Підсумковий результат:</span>
            <span className={`text-xl font-black font-mono drop-shadow-sm ${
              summary.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toFixed(2)}
            </span>
          </div>
        </div>

        {equity_curve.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-purple-400/40 text-xs">
            Немає закритих угод для побудови графіка
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity_curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleLiquidGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.6} />
                    <stop offset="50%" stopColor="#9333ea" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#251249" />
                <XAxis 
                  dataKey="date" 
                  stroke="#8b5cf6" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(val) => val.split(' ')[0]} 
                />
                <YAxis 
                  stroke="#8b5cf6" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomEquityTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cumulative_pnl" 
                  stroke="#c084fc" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#purpleLiquidGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row: Market & Direction Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Market */}
        <div className="liquid-glass-card rounded-3xl p-6">
          <h3 className="text-sm font-black text-white flex items-center space-x-2 mb-4">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Результати за ринками</span>
          </h3>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_market}>
                <CartesianGrid strokeDasharray="3 3" stroke="#251249" />
                <XAxis dataKey="name" stroke="#8b5cf6" fontSize={11} tickLine={false} />
                <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${val}`, 'PnL']}
                  contentStyle={{ backgroundColor: '#130827', borderColor: 'rgba(168,85,247,0.3)', borderRadius: '1rem', fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="total_pnl" radius={[6, 6, 0, 0]}>
                  {by_market.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total_pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 divide-y divide-purple-500/10 text-xs">
            {by_market.map((item) => (
              <div key={item.name} className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-purple-200">{item.name}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-purple-300/60">{item.trades_count} угод • {item.win_rate}% WR</span>
                  <span className={`font-mono font-black ${item.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.total_pnl >= 0 ? '+' : ''}${item.total_pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Direction */}
        <div className="liquid-glass-card rounded-3xl p-6">
          <h3 className="text-sm font-black text-white flex items-center space-x-2 mb-4">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <span>Результати за напрямком (Long vs Short)</span>
          </h3>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_direction}>
                <CartesianGrid strokeDasharray="3 3" stroke="#251249" />
                <XAxis dataKey="name" stroke="#8b5cf6" fontSize={11} tickLine={false} />
                <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${val}`, 'PnL']}
                  contentStyle={{ backgroundColor: '#130827', borderColor: 'rgba(168,85,247,0.3)', borderRadius: '1rem', fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="total_pnl" radius={[6, 6, 0, 0]}>
                  {by_direction.map((entry, index) => (
                    <Cell key={`cell-dir-${index}`} fill={entry.total_pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 divide-y divide-purple-500/10 text-xs">
            {by_direction.map((item) => (
              <div key={item.name} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {item.name === 'LONG' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="font-bold text-purple-200">{item.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-purple-300/60">{item.trades_count} угод • {item.win_rate}% WR</span>
                  <span className={`font-mono font-black ${item.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.total_pnl >= 0 ? '+' : ''}${item.total_pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Day of Week & Strategy Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Day of Week */}
        <div className="liquid-glass-card rounded-3xl p-6">
          <h3 className="text-sm font-black text-white flex items-center space-x-2 mb-4">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Ефективність за днями тижня</span>
          </h3>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_day_of_week}>
                <CartesianGrid strokeDasharray="3 3" stroke="#251249" />
                <XAxis dataKey="name" stroke="#8b5cf6" fontSize={10} tickLine={false} />
                <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${val}`, 'PnL']}
                  contentStyle={{ backgroundColor: '#130827', borderColor: 'rgba(168,85,247,0.3)', borderRadius: '1rem', fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="total_pnl" radius={[6, 6, 0, 0]}>
                  {by_day_of_week.map((entry, index) => (
                    <Cell key={`cell-dow-${index}`} fill={entry.total_pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 divide-y divide-purple-500/10 text-xs">
            {by_day_of_week.map((item) => (
              <div key={item.name} className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-purple-200">{item.name}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-purple-300/60">{item.trades_count} угод ({item.win_rate}% WR)</span>
                  <span className={`font-mono font-black ${item.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.total_pnl >= 0 ? '+' : ''}${item.total_pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Strategy / Tag */}
        <div className="liquid-glass-card rounded-3xl p-6">
          <h3 className="text-sm font-black text-white flex items-center space-x-2 mb-4">
            <TagIcon className="w-4 h-4 text-fuchsia-400" />
            <span>Результативність торгових сетапів (Тегів)</span>
          </h3>

          <div className="divide-y divide-purple-500/10 text-xs max-h-80 overflow-y-auto">
            {by_tag.length === 0 ? (
              <div className="py-8 text-center text-purple-400/40">
                Додайте теги до угод, щоб бачити аналітику своїх сетапів
              </div>
            ) : (
              by_tag.map((item) => (
                <div key={item.name} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="px-3 py-1 rounded-full bg-purple-900/40 border border-purple-400/25 text-purple-200 font-bold text-xs backdrop-blur-sm">
                      #{item.name}
                    </span>
                    <span className="text-purple-300/60 text-[11px] ml-2">
                      {item.trades_count} угод • {item.win_rate}% Win Rate
                    </span>
                  </div>
                  <span className={`font-mono font-black text-sm ${item.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.total_pnl >= 0 ? '+' : ''}${item.total_pnl}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
      <div className="p-16 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
        <p className="text-sm">Завантаження аналітики трейдингу...</p>
      </div>
    );
  }

  const { summary, equity_curve, by_market, by_direction, by_tag, by_day_of_week } = analytics;

  // Custom Tooltip for Equity Curve
  const CustomEquityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs">
          <div className="text-slate-400 mb-1">{data.date}</div>
          <div className="font-bold text-white mb-0.5">{data.symbol}</div>
          <div className="font-mono text-slate-300">
            PnL угоди: <span className={data.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {data.pnl >= 0 ? '+' : ''}${data.pnl}
            </span>
          </div>
          <div className="font-mono text-slate-300 mt-1 pt-1 border-t border-slate-800">
            Баланс / Equity: <span className="text-indigo-400 font-bold">${data.cumulative_pnl}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Equity Curve Chart */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Крива прибутковості (Equity Curve)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Кумулятивний прибуток за всіма закритими угодами
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400">Підсумковий результат:</span>
            <span className={`text-lg font-bold font-mono ${summary.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toFixed(2)}
            </span>
          </div>
        </div>

        {equity_curve.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
            Немає закритих угод для побудови графіка
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity_curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(val) => val.split(' ')[0]} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomEquityTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cumulative_pnl" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#equityGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row: Market & Direction Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Market */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-4">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Результати за ринками</span>
          </h3>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_market}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${val}`, 'PnL']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                  {by_market.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total_pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 divide-y divide-slate-800 text-xs">
            {by_market.map((item) => (
              <div key={item.name} className="py-2 flex items-center justify-between">
                <span className="font-medium text-slate-300">{item.name}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400">{item.trades_count} угод • {item.win_rate}% WR</span>
                  <span className={`font-mono font-bold ${item.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.total_pnl >= 0 ? '+' : ''}${item.total_pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Direction */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-4">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <span>Результати за напрямком (Long vs Short)</span>
          </h3>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_direction}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${val}`, 'PnL']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                  {by_direction.map((entry, index) => (
                    <Cell key={`cell-dir-${index}`} fill={entry.total_pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 divide-y divide-slate-800 text-xs">
            {by_direction.map((item) => (
              <div key={item.name} className="py-2 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {item.name === 'LONG' ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span className="font-medium text-slate-200">{item.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400">{item.trades_count} угод • {item.win_rate}% WR</span>
                  <span className={`font-mono font-bold ${item.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-4">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Ефективність за днями тижня</span>
          </h3>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_day_of_week}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${val}`, 'PnL']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                  {by_day_of_week.map((entry, index) => (
                    <Cell key={`cell-dow-${index}`} fill={entry.total_pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 divide-y divide-slate-800 text-xs">
            {by_day_of_week.map((item) => (
              <div key={item.name} className="py-2 flex items-center justify-between">
                <span className="font-medium text-slate-300">{item.name}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400">{item.trades_count} угод ({item.win_rate}% WR)</span>
                  <span className={`font-mono font-bold ${item.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.total_pnl >= 0 ? '+' : ''}${item.total_pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Strategy / Tag */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-4">
            <TagIcon className="w-4 h-4 text-cyan-400" />
            <span>Результативність торгових сетапів (Тегів)</span>
          </h3>

          <div className="divide-y divide-slate-800 text-xs max-h-80 overflow-y-auto">
            {by_tag.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                Додайте теги до угод, щоб бачити аналітику своїх сетапів
              </div>
            ) : (
              by_tag.map((item) => (
                <div key={item.name} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-semibold text-xs">
                      #{item.name}
                    </span>
                    <span className="text-slate-400 text-[11px] ml-2">
                      {item.trades_count} угод • {item.win_rate}% Win Rate
                    </span>
                  </div>
                  <span className={`font-mono font-bold text-sm ${item.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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

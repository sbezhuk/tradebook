import React from 'react';
import { useAuth } from '../context/AuthContext';
import type { SummaryStats } from '../types';
import {
  LayoutGrid,
  ArrowLeftRight,
  BarChart2,
  Layers,
  ShieldCheck,
  Code2,
  LogOut,
  PanelLeft,
  TrendingUp,
} from 'lucide-react';

export type NavTab = 'overview' | 'trades' | 'insights' | 'setups' | 'psychology';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  stats?: SummaryStats | null;
  tagsCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  stats,
  tagsCount = 0,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'Огляд', icon: LayoutGrid },
    {
      id: 'trades',
      label: 'Журнал угод',
      icon: ArrowLeftRight,
      badge: stats?.open_trades ? stats.open_trades : undefined,
    },
    { id: 'insights', label: 'Аналітика', icon: BarChart2 },
    {
      id: 'setups',
      label: 'Сетапи і теги',
      icon: Layers,
      badge: tagsCount > 0 ? tagsCount : undefined,
    },
    { id: 'psychology', label: 'Психологія', icon: ShieldCheck },
  ];

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'TR';

  const isPnlPositive = (stats?.total_pnl ?? 0) >= 0;

  const handleNav = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile?.();
  };

  const sidebarContent = (
    <aside className="w-64 h-full glass-sidebar flex flex-col justify-between p-4 select-none">
      {/* Top section */}
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1.5 mb-7">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleNav('insights')}
          >
            <div className="w-9 h-9 rounded-xl bg-[#c49bff] text-[#110820] flex items-center justify-center shadow-[0_0_20px_rgba(196,155,255,0.35)]">
              <TrendingUp className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight tracking-tight">
                TradeBook
              </div>
              <div className="text-[11px] text-purple-200/50 leading-tight">
                Щоденник трейдера
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-purple-200/60 hover:text-white transition-colors"
            title="Згорнути панель"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                  active
                    ? 'accent-pill font-semibold'
                    : 'text-purple-100/65 hover:text-white hover:bg-white/[0.04] font-medium'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 ${
                      active ? 'text-[#110820]' : 'text-purple-200/55'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      active
                        ? 'bg-[#110820]/15 text-[#110820]'
                        : 'bg-[#c49bff]/15 text-[#c49bff]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-white/[0.06]">
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium text-purple-100/60 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center space-x-3">
                <Code2 className="w-4 h-4 text-purple-300/60" />
                <span>REST API (Swagger)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-purple-200/50 border border-white/[0.06]">
                v1
              </span>
            </a>
          </div>
        </nav>
      </div>

      {/* Bottom Summary Widget & User Profile */}
      <div className="space-y-3 pt-4">
        {/* Mini Glass Metric Box (like "Safe to spend today") */}
        <div className="glass-card-subtle rounded-2xl p-3.5">
          <div className="text-[11px] font-medium text-purple-200/55">
            Загальний баланс PnL
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 tracking-tight ${
              isPnlPositive ? 'text-[#c49bff]' : 'text-rose-400'
            }`}
          >
            {isPnlPositive ? '+' : ''}$
            {(stats?.total_pnl ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-purple-200/45 mt-1">
            {stats?.win_rate ?? 0}% winrate • {stats?.total_trades ?? 0} закритих угод
          </div>
        </div>

        {/* User Footer */}
        {user && (
          <div className="flex items-center justify-between px-1.5 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#c49bff]/15 border border-[#c49bff]/30 text-[#d8b4fe] font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user.username}
                </div>
                <div className="text-[10px] text-purple-200/45 truncate">
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Вийти"
              className="p-1.5 text-purple-200/50 hover:text-rose-400 hover:bg-white/[0.05] rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { SummaryStats, TradingAccount } from '../types';
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
  Wallet,
  UploadCloud,
  Briefcase,
  ChevronDown,
  Check,
  Settings2,
} from 'lucide-react';

export type NavTab = 'overview' | 'trades' | 'insights' | 'setups' | 'psychology' | 'import';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  stats?: SummaryStats | null;
  overallTotalPnl?: number;
  overallTotalTrades?: number;
  totalDeposits?: number;
  overallDepositGrowthPct?: number | null;
  onOpenDeposits?: () => void;
  accounts?: TradingAccount[];
  activeAccountId?: number | null;
  onSelectAccount?: (accountId: number | null) => void;
  onOpenAccounts?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  stats,
  overallTotalPnl,
  overallTotalTrades,
  totalDeposits = 0,
  overallDepositGrowthPct = null,
  onOpenDeposits,
  accounts = [],
  activeAccountId = null,
  onSelectAccount,
  onOpenAccounts,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [accountMenuOpen]);

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null;

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
    },
    { id: 'psychology', label: 'Психологія', icon: ShieldCheck },
    { id: 'import', label: 'Імпорт', icon: UploadCloud },
  ];

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'TR';

  const displayOverallPnl = overallTotalPnl ?? stats?.total_pnl ?? 0;
  const displayOverallTrades = overallTotalTrades ?? stats?.total_trades ?? 0;
  const isPnlPositive = displayOverallPnl >= 0;

  const handleNav = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile?.();
  };

  const renderSidebarContent = (isMobileDrawer: boolean) => {
    const isCollapsed = !isMobileDrawer && collapsed;

    return (
      <aside
        className={`h-full glass-sidebar flex flex-col justify-between select-none transition-all duration-200 ease-out ${
          isCollapsed ? 'w-[76px] px-3 py-5 items-center' : 'w-64 p-5'
        }`}
      >
        {/* Top section */}
        <div className={isCollapsed ? 'w-full flex flex-col items-center' : ''}>
          {/* Brand Header */}
          <div
            className={
              isCollapsed
                ? 'flex flex-col items-center gap-3 mb-6'
                : 'flex items-center justify-between px-1 mb-7'
            }
          >
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => handleNav('insights')}
              title={isCollapsed ? 'TradeBook' : undefined}
            >
              <div className="w-9 h-9 rounded-xl bg-[#c49bff] text-[#110820] flex items-center justify-center shadow-[0_0_20px_rgba(196,155,255,0.35)] shrink-0">
                <TrendingUp className="w-5 h-5 stroke-[2.4]" />
              </div>
              {!isCollapsed && (
                <div>
                  <div className="text-sm font-bold text-white leading-tight tracking-tight">
                    TradeBook
                  </div>
                  <div className="text-[11px] text-purple-200/50 leading-tight">
                    Щоденник трейдера
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => (isMobileDrawer ? onCloseMobile?.() : onToggleCollapse?.())}
              className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-purple-200/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
              title={isCollapsed ? 'Розгорнути панель' : 'Згорнути панель'}
              aria-label={isCollapsed ? 'Розгорнути панель' : 'Згорнути панель'}
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Account Switcher */}
          {accounts.length > 0 && onSelectAccount && (
            <div ref={switcherRef} className={`relative mb-5 ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={() => (onOpenAccounts ? onOpenAccounts() : setAccountMenuOpen((v) => !v))}
                  title={
                    activeAccount
                      ? `Акаунт: ${activeAccount.name}`
                      : 'Усі акаунти (натисніть для керування)'
                  }
                  className="w-11 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] flex items-center justify-center relative cursor-pointer transition-colors"
                >
                  <Briefcase className="w-4 h-4 text-[#c49bff]" />
                  <span
                    className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-[#0f0a1a]"
                    style={{ backgroundColor: activeAccount?.color || '#c49bff' }}
                  />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      accountMenuOpen
                        ? 'bg-[#c49bff]/12 border-[#c49bff]/45'
                        : 'bg-white/[0.035] hover:bg-white/[0.06] border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: activeAccount?.color || '#c49bff' }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {activeAccount ? activeAccount.name : 'Усі акаунти'}
                        </div>
                        <div className="text-[10px] text-purple-200/50 truncate">
                          {activeAccount
                            ? `${activeAccount.platform} • ${activeAccount.trades_count} угод`
                            : `${accounts.length} ${accounts.length === 1 ? 'акаунт' : accounts.length < 5 ? 'акаунти' : 'акаунтів'} разом`}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-purple-200/55 shrink-0 transition-transform ${
                        accountMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] glass-popover rounded-2xl p-1.5 z-50 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAccount(null);
                          setAccountMenuOpen(false);
                          onCloseMobile?.();
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          activeAccountId === null
                            ? 'bg-[#c49bff]/15 text-white'
                            : 'text-purple-100/80 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Briefcase className="w-3.5 h-3.5 text-[#c49bff] shrink-0" />
                          <span className="text-xs font-semibold truncate">Усі акаунти</span>
                        </div>
                        {activeAccountId === null && (
                          <Check className="w-3.5 h-3.5 text-[#c49bff] shrink-0" />
                        )}
                      </button>

                      <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1 border-t border-white/[0.06]">
                        {accounts.map((acc) => {
                          const selected = activeAccountId === acc.id;
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                onSelectAccount(acc.id);
                                setAccountMenuOpen(false);
                                onCloseMobile?.();
                              }}
                              className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-[#c49bff]/15 text-white'
                                  : 'text-purple-100/80 hover:bg-white/[0.06]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: acc.color || '#c49bff' }}
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium truncate">{acc.name}</div>
                                  <div className="text-[10px] font-mono text-purple-200/45 truncate">
                                    ${acc.current_balance.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              </div>
                              {selected && <Check className="w-3.5 h-3.5 text-[#c49bff] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {onOpenAccounts && (
                        <div className="pt-1 border-t border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onOpenAccounts();
                              onCloseMobile?.();
                            }}
                            className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-[#c49bff] hover:bg-[#c49bff]/10 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            <span>Керувати акаунтами</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <nav className={`space-y-1.5 ${isCollapsed ? 'w-full flex flex-col items-center' : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={`${
                    isCollapsed
                      ? 'w-11 h-11 flex items-center justify-center relative'
                      : 'w-full flex items-center justify-between px-3 py-2.5'
                  } rounded-xl text-[13px] transition-all duration-200 cursor-pointer ${
                    active
                      ? 'accent-pill font-semibold'
                      : 'text-purple-100/65 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-white dark:text-[#110820]' : 'text-purple-200/55'
                      }`}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {item.badge !== undefined &&
                    (isCollapsed ? (
                      <span
                        className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                          active
                            ? 'bg-white text-[#110820]'
                            : 'bg-[#c49bff] text-[#110820]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          active
                            ? 'bg-white/20 text-white dark:bg-[#110820]/15 dark:text-[#110820]'
                            : 'bg-[#c49bff]/15 text-[#c49bff]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ))}
                </button>
              );
            })}

            <div className={`pt-4 mt-4 border-t border-white/[0.06] ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                title={isCollapsed ? 'REST API (Swagger)' : undefined}
                aria-label="REST API (Swagger)"
                className={`${
                  isCollapsed
                    ? 'w-11 h-11 flex items-center justify-center'
                    : 'w-full flex items-center justify-between px-3 py-2.5'
                } rounded-xl text-[13px] font-medium text-purple-100/60 hover:text-white hover:bg-white/[0.04] transition-all`}
              >
                <div className="flex items-center space-x-3">
                  <Code2 className="w-4 h-4 text-purple-300/60 shrink-0" />
                  {!isCollapsed && <span>REST API (Swagger)</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-purple-200/50 border border-white/[0.06]">
                    v1
                  </span>
                )}
              </a>
            </div>
          </nav>
        </div>

        {/* Bottom Summary Widget & User Profile */}
        {isCollapsed ? (
          <div className="space-y-2.5 pt-4 flex flex-col items-center w-full">
            {onOpenDeposits && (
              <button
                type="button"
                onClick={onOpenDeposits}
                title="Депозит та поповнення"
                aria-label="Депозит та поповнення"
                className="w-11 h-11 rounded-xl bg-[#c49bff]/15 hover:bg-[#c49bff]/25 text-[#c49bff] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
              </button>
            )}

            {user && (
              <div className="pt-2.5 border-t border-white/[0.06] w-full flex flex-col items-center gap-2">
                <div
                  title={`${user.username} (${user.email})`}
                  className="w-9 h-9 rounded-full bg-[#c49bff]/15 border border-[#c49bff]/30 text-[#d8b4fe] font-bold text-xs flex items-center justify-center"
                >
                  {initials}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Вийти"
                  aria-label="Вийти"
                  className="p-2 text-purple-200/50 hover:text-rose-400 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-4">
            {/* Mini Glass Metric Box — Always shows overall all-time PnL & Deposit Growth separately from monthly period */}
            <div className="glass-card-subtle rounded-2xl p-3.5 space-y-2.5">
              <div>
                <div className="text-[11px] font-medium text-purple-200/55">
                  Загальний PnL (весь час)
                </div>
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <div
                    className={`text-xl font-bold font-mono tracking-tight ${
                      isPnlPositive ? 'text-[#c49bff]' : 'text-rose-400'
                    }`}
                  >
                    {isPnlPositive ? '+' : '-'}$
                    {Math.abs(displayOverallPnl).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  {overallDepositGrowthPct !== null && (
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        overallDepositGrowthPct >= 0
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {overallDepositGrowthPct >= 0 ? '+' : ''}
                      {overallDepositGrowthPct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-purple-200/45 mt-1">
                  {displayOverallTrades} закритих угод загалом
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-purple-200/50">Депозит</div>
                  <div className="text-xs font-mono font-semibold text-white truncate">
                    ${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                {onOpenDeposits && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDeposits();
                      onCloseMobile?.();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#c49bff]/15 hover:bg-[#c49bff]/25 text-[#c49bff] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Wallet className="w-3 h-3" />
                    <span>+ Внести</span>
                  </button>
                )}
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
                  className="p-1.5 text-purple-200/50 hover:text-rose-400 hover:bg-white/[0.05] rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">{renderSidebarContent(false)}</div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{renderSidebarContent(true)}</div>
        </div>
      )}
    </>
  );
};

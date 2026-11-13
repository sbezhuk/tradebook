import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';
import type { Trade } from '../types';
import type { NavTab } from './Sidebar';
import {
  Search,
  Plus,
  Bell,
  Menu,
  Code2,
  ExternalLink,
  LogOut,
  ShieldAlert,
  Clock,
  Check,
  Copy,
  Sun,
  Moon,
  Monitor,
  Wallet,
  Percent,
  X,
} from 'lucide-react';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewTrade: () => void;
  onOpenDeposits: () => void;
  onOpenFunding?: () => void;
  onOpenMobileMenu: () => void;
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onSelectTab: (tab: NavTab) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewTrade,
  onOpenDeposits,
  onOpenFunding,
  onOpenMobileMenu,
  trades,
  onSelectTrade,
  onSelectTab,
}) => {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [openMenu, setOpenMenu] = useState<'api' | 'notifications' | 'theme' | 'profile' | null>(null);
  const [copiedApi, setCopiedApi] = useState(false);

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const ruleAlerts = trades.filter((t) => t.status === 'CLOSED' && !t.followed_rules).slice(0, 3);
  const hasNotifications = openTrades.length > 0 || ruleAlerts.length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'TR';

  const handleCopyApiUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/api/v1`);
      setCopiedApi(true);
      setTimeout(() => setCopiedApi(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <header className="border-b border-white/[0.05] bg-[#0b0714]/50 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-10 py-2.5 sm:py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4">
      {/* Mobile Menu Trigger */}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Відкрити меню"
        className="order-1 md:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-purple-200/70 hover:text-white cursor-pointer shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search Bar (full-width second row on phones, inline on sm+) */}
      <div className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 sm:max-w-xl min-w-0">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-purple-200/45 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Пошук угод, символів, тегів..."
            className="glass-input w-full h-9 sm:h-10 rounded-full pl-10 sm:pl-11 pr-9 sm:pr-14 text-xs text-white placeholder-purple-200/40"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Очистити пошук"
              className="p-1 text-purple-200/50 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md bg-white/[0.06] text-purple-200/50 border border-white/[0.08] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* Right circular action controls */}
      <div ref={actionsRef} className="order-2 sm:order-3 relative flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto sm:ml-0">
        {/* 1. Add Trade (+) */}
        <button
          type="button"
          onClick={() => {
            setOpenMenu(null);
            onOpenNewTrade();
          }}
          title="Додати нову угоду"
          className="accent-pill w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* 1.5 Deposits (Wallet) */}
        <button
          type="button"
          onClick={() => {
            setOpenMenu(null);
            onOpenDeposits();
          }}
          title="Депозит та поповнення"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <Wallet className="w-4 h-4" />
        </button>

        {/* 1.6 Funding (Percent) */}
        {onOpenFunding && (
          <button
            type="button"
            onClick={() => {
              setOpenMenu(null);
              onOpenFunding();
            }}
            title="Фандінг (нарахування, списання та історія)"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Percent className="w-4 h-4" />
          </button>
        )}

        {/* 2. REST API Menu (</>) — hidden below lg since also accessible in Sidebar */}
        <button
          type="button"
          onClick={() => setOpenMenu((prev) => (prev === 'api' ? null : 'api'))}
          title="REST API та OpenAPI"
          className={`hidden lg:flex w-10 h-10 rounded-full border items-center justify-center transition-colors cursor-pointer ${
            openMenu === 'api'
              ? 'bg-[#c49bff]/20 border-[#c49bff]/50 text-[#c49bff]'
              : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-purple-200/70 hover:text-white'
          }`}
        >
          <Code2 className="w-4 h-4" />
        </button>

        {/* 3.5 Theme Switcher (Light / Dark / System) — hidden below lg since also inside Profile menu */}
        <button
          type="button"
          onClick={() => setOpenMenu((prev) => (prev === 'theme' ? null : 'theme'))}
          title="Змінити тему (Світла / Темна / Системна)"
          className={`hidden lg:flex w-10 h-10 rounded-full border items-center justify-center transition-colors cursor-pointer ${
            openMenu === 'theme'
              ? 'bg-[#c49bff]/20 border-[#c49bff]/50 text-[#c49bff]'
              : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-purple-200/70 hover:text-white'
          }`}
        >
          {theme === 'light' ? (
            <Sun className="w-4 h-4" />
          ) : theme === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Monitor className="w-4 h-4" />
          )}
        </button>

        {/* 4. Notifications & Open Trades (Bell) */}
        <button
          type="button"
          onClick={() => setOpenMenu((prev) => (prev === 'notifications' ? null : 'notifications'))}
          title="Сповіщення та відкриті позиції"
          className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
            openMenu === 'notifications'
              ? 'bg-[#c49bff]/20 border-[#c49bff]/50 text-[#c49bff]'
              : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-purple-200/70 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#c49bff] shadow-[0_0_8px_#c49bff]" />
          )}
        </button>

        {/* 5. User Avatar Menu */}
        <button
          type="button"
          onClick={() => setOpenMenu((prev) => (prev === 'profile' ? null : 'profile'))}
          title="Профіль користувача"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
            openMenu === 'profile'
              ? 'bg-[#c49bff] text-[#110820] border-[#c49bff]'
              : 'bg-[#c49bff]/15 hover:bg-[#c49bff]/25 border-[#c49bff]/35 text-[#e2ccff]'
          }`}
        >
          {initials}
        </button>

        {/* ==================== POPOVER: REST API ==================== */}
        {openMenu === 'api' && (
          <div className="absolute right-0 sm:right-20 top-13 w-60 max-w-[calc(100vw-2rem)] glass-popover rounded-2xl p-2 z-50">
            <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
              <div className="text-xs font-semibold text-white">REST API</div>
              <div className="text-[10px] text-purple-200/45">Документація та інтеграція</div>
            </div>

            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpenMenu(null)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-purple-100 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Code2 className="w-3.5 h-3.5 text-[#c49bff]" />
                <span>Swagger UI</span>
              </div>
              <ExternalLink className="w-3 h-3 text-purple-200/40" />
            </a>

            <a
              href="/openapi.json"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpenMenu(null)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-purple-100 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Code2 className="w-3.5 h-3.5 text-[#c49bff]" />
                <span>OpenAPI JSON схема</span>
              </div>
              <ExternalLink className="w-3 h-3 text-purple-200/40" />
            </a>

            <button
              type="button"
              onClick={handleCopyApiUrl}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-purple-100 hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                {copiedApi ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#c49bff]" />
                )}
                <span>{copiedApi ? 'Скопійовано!' : 'Копіювати API URL'}</span>
              </div>
            </button>
          </div>
        )}

        {/* ==================== POPOVER: NOTIFICATIONS ==================== */}
        {openMenu === 'notifications' && (
          <div className="absolute right-0 top-13 w-72 sm:w-80 max-w-[calc(100vw-2rem)] glass-popover rounded-2xl p-3 z-50">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white">Сповіщення та статус</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c49bff]/15 text-[#c49bff]">
                {openTrades.length} відкритих
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {openTrades.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setOpenMenu(null);
                    onSelectTrade(t);
                  }}
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {t.symbol} ({t.direction})
                      </div>
                      <div className="text-[10px] text-purple-200/50">
                        Відкрита позиція • вхід {t.entry_price}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-300 font-medium">Активна</span>
                </div>
              ))}

              {ruleAlerts.map((t) => (
                <div
                  key={`alert-${t.id}`}
                  onClick={() => {
                    setOpenMenu(null);
                    onSelectTrade(t);
                  }}
                  className="p-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 cursor-pointer transition-colors flex items-center space-x-2.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-rose-200">
                      Порушення правил: {t.symbol}
                    </div>
                    <div className="text-[10px] text-rose-300/60">
                      PnL: ${t.pnl.toFixed(2)} • Перегляньте нотатки
                    </div>
                  </div>
                </div>
              ))}

              {!hasNotifications && (
                <div className="py-6 text-center text-xs text-purple-200/45">
                  Немає відкритих позицій або попереджень
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== POPOVER: THEME ==================== */}
        {openMenu === 'theme' && (
          <div className="absolute right-0 sm:right-10 top-13 w-64 max-w-[calc(100vw-2rem)] glass-popover rounded-2xl p-2 z-50">
            <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
              <div className="text-xs font-semibold text-white">Тема оформлення</div>
              <div className="text-[10px] text-purple-200/45">
                Активна: {resolvedTheme === 'light' ? 'Світла' : 'Темна'}
                {theme === 'system' ? ' (авто)' : ''}
              </div>
            </div>

            {(
              [
                { id: 'light', label: 'Світла тема', desc: 'Повітряний фіолетовий glass', icon: Sun },
                { id: 'dark', label: 'Темна тема', desc: 'Глибокий нічний glass', icon: Moon },
                { id: 'system', label: 'Системний режим', desc: 'Як у налаштуваннях ОС', icon: Monitor },
              ] as {
                id: ThemeMode;
                label: string;
                desc: string;
                icon: React.FC<{ className?: string }>;
              }[]
            ).map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setOpenMenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#c49bff]/15 border border-[#c49bff]/30'
                      : 'hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        active ? 'text-[#c49bff]' : 'text-purple-200/60'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">{opt.label}</div>
                      <div className="text-[10px] text-purple-200/50">{opt.desc}</div>
                    </div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-[#c49bff] shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ==================== POPOVER: PROFILE ==================== */}
        {openMenu === 'profile' && user && (
          <div className="absolute right-0 top-13 w-64 max-w-[calc(100vw-2rem)] glass-popover rounded-2xl p-2 z-50">
            <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
              <div className="text-xs font-bold text-white">{user.username}</div>
              <div className="text-[11px] text-purple-200/50 truncate">{user.email}</div>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectTab('overview');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs text-purple-100/80 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Огляд портфелю
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectTab('trades');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs text-purple-100/80 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Журнал угод
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectTab('psychology');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs text-purple-100/80 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Психологія та правила
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectTab('import');
                setOpenMenu(null);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs text-purple-100/80 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Імпорт даних
            </button>

            {/* Theme Segmented Control inside Profile Menu */}
            <div className="mt-1 pt-2 px-1.5 pb-1.5 border-t border-white/[0.06]">
              <div className="text-[10px] uppercase tracking-wider text-purple-200/45 font-semibold px-1.5 mb-1.5">
                Тема
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                {(
                  [
                    { id: 'light', label: 'Світла', icon: Sun },
                    { id: 'dark', label: 'Темна', icon: Moon },
                    { id: 'system', label: 'Авто', icon: Monitor },
                  ] as { id: ThemeMode; label: string; icon: React.FC<{ className?: string }> }[]
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTheme(opt.id)}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        active
                          ? 'accent-pill'
                          : 'text-purple-200/65 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-1 pt-1 border-t border-white/[0.06] space-y-1">
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  logout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Вийти з акаунту</span>
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Trade } from '../types';
import type { NavTab } from './Sidebar';
import {
  Search,
  Plus,
  Send,
  Bell,
  Menu,
  Code2,
  Download,
  ExternalLink,
  LogOut,
  ShieldAlert,
  Clock,
  Check,
  Copy,
  UploadCloud,
} from 'lucide-react';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewTrade: () => void;
  onOpenImport: () => void;
  onOpenMobileMenu: () => void;
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onSelectTab: (tab: NavTab) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewTrade,
  onOpenImport,
  onOpenMobileMenu,
  trades,
  onSelectTrade,
  onSelectTab,
}) => {
  const { user, logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [openMenu, setOpenMenu] = useState<'export' | 'notifications' | 'profile' | null>(null);
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

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Symbol',
      'Market',
      'Direction',
      'Status',
      'Entry Date',
      'Exit Date',
      'Entry Price',
      'Exit Price',
      'Quantity',
      'Stop Loss',
      'Take Profit',
      'Fees',
      'PnL',
      'ROI %',
      'R-Multiple',
      'Tags',
      'Followed Rules',
    ];
    const rows = trades.map((t) => [
      t.id,
      t.symbol,
      t.market,
      t.direction,
      t.status,
      t.entry_date,
      t.exit_date ?? '',
      t.entry_price,
      t.exit_price ?? '',
      t.quantity,
      t.stop_loss ?? '',
      t.take_profit ?? '',
      t.fees,
      t.pnl,
      t.pnl_percentage,
      t.r_multiple ?? '',
      `"${(t.tags ?? '').replace(/"/g, '""')}"`,
      t.followed_rules ? 'Yes' : 'No',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tradebook_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

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
    <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 border-b border-white/[0.05] bg-[#0b0714]/50 backdrop-blur-xl sticky top-0 z-30">
      {/* Mobile Menu Trigger + Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-purple-200/70 hover:text-white cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-purple-200/45 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Пошук угод, символів, тегів..."
            className="glass-input w-full rounded-full pl-10 pr-14 py-2 text-xs text-white placeholder-purple-200/40"
          />
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-white/[0.06] text-purple-200/50 border border-white/[0.08] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right circular action controls */}
      <div ref={actionsRef} className="relative flex items-center space-x-2.5">
        {/* 1. Add Trade (+) */}
        <button
          type="button"
          onClick={() => {
            setOpenMenu(null);
            onOpenNewTrade();
          }}
          title="Додати нову угоду"
          className="accent-pill w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* 2. Export / Share Menu (Send icon) */}
        <button
          type="button"
          onClick={() => setOpenMenu((prev) => (prev === 'export' ? null : 'export'))}
          title="Експорт та API посилання"
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
            openMenu === 'export'
              ? 'bg-[#c49bff]/20 border-[#c49bff]/50 text-[#c49bff]'
              : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-purple-200/70 hover:text-white'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
        </button>

        {/* 3. Swagger REST API (</>) */}
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          title="Відкрити Swagger REST API"
          className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
        </a>

        {/* 4. Notifications & Open Trades (Bell) */}
        <button
          type="button"
          onClick={() => setOpenMenu((prev) => (prev === 'notifications' ? null : 'notifications'))}
          title="Сповіщення та відкриті позиції"
          className={`relative w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
            openMenu === 'notifications'
              ? 'bg-[#c49bff]/20 border-[#c49bff]/50 text-[#c49bff]'
              : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-purple-200/70 hover:text-white'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#c49bff] shadow-[0_0_8px_#c49bff]" />
          )}
        </button>

        {/* 5. User Avatar Menu */}
        <button
          type="button"
          onClick={() => setOpenMenu((prev) => (prev === 'profile' ? null : 'profile'))}
          title="Профіль користувача"
          className={`w-9 h-9 rounded-full border font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
            openMenu === 'profile'
              ? 'bg-[#c49bff] text-[#110820] border-[#c49bff]'
              : 'bg-[#c49bff]/15 hover:bg-[#c49bff]/25 border-[#c49bff]/35 text-[#e2ccff]'
          }`}
        >
          {initials}
        </button>

        {/* ==================== POPOVER: EXPORT & API ==================== */}
        {openMenu === 'export' && (
          <div className="absolute right-0 top-12 w-64 glass-panel rounded-2xl p-2 shadow-2xl z-40">
            <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
              <div className="text-xs font-semibold text-white">Імпорт / Експорт та API</div>
              <div className="text-[10px] text-purple-200/45">Hyperliquid CSV, звіт та інтеграція</div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                onOpenImport();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#c49bff] hover:bg-[#c49bff]/10 transition-colors text-left"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Імпорт з Hyperliquid (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-purple-100 hover:bg-white/[0.06] transition-colors text-left"
            >
              <Download className="w-3.5 h-3.5 text-[#c49bff]" />
              <span>Експортувати угоди (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyApiUrl}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-purple-100 hover:bg-white/[0.06] transition-colors text-left"
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
          </div>
        )}

        {/* ==================== POPOVER: NOTIFICATIONS ==================== */}
        {openMenu === 'notifications' && (
          <div className="absolute right-0 top-12 w-72 sm:w-80 glass-panel rounded-2xl p-3 shadow-2xl z-40">
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

        {/* ==================== POPOVER: PROFILE ==================== */}
        {openMenu === 'profile' && user && (
          <div className="absolute right-0 top-12 w-64 glass-panel rounded-2xl p-2 shadow-2xl z-40">
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

            <div className="mt-1 pt-1 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  logout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Вийти з акаунту</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

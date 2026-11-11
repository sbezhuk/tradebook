import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Send, Bell, Menu, Code2 } from 'lucide-react';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewTrade: () => void;
  onOpenMobileMenu: () => void;
  openTradesCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewTrade,
  onOpenMobileMenu,
  openTradesCount = 0,
}) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'TR';

  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 border-b border-white/[0.05] bg-[#0b0714]/50 backdrop-blur-xl sticky top-0 z-20">
      {/* Mobile Menu Trigger + Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-purple-200/70 hover:text-white"
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

      {/* Right circular action controls (matching Verdelo top bar) */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onOpenNewTrade}
          title="Додати нову угоду"
          className="accent-pill w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          title="Відкрити Swagger REST API"
          className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/70 hover:text-white flex items-center justify-center transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </a>

        <a
          href="/openapi.json"
          target="_blank"
          rel="noreferrer"
          title="OpenAPI JSON"
          className="hidden sm:flex w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/70 hover:text-white items-center justify-center transition-colors"
        >
          <Code2 className="w-3.5 h-3.5" />
        </a>

        <div
          className="relative w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] text-purple-200/70 flex items-center justify-center"
          title={
            openTradesCount > 0
              ? `У вас ${openTradesCount} відкритих позицій`
              : 'Немає активних сповіщень'
          }
        >
          <Bell className="w-3.5 h-3.5" />
          {openTradesCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#c49bff] shadow-[0_0_8px_#c49bff]" />
          )}
        </div>

        <div className="w-9 h-9 rounded-full bg-[#c49bff]/15 border border-[#c49bff]/35 text-[#e2ccff] font-bold text-xs flex items-center justify-center select-none">
          {initials}
        </div>
      </div>
    </header>
  );
};

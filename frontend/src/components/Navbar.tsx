import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  BarChart3, 
  BookOpen, 
  PlusCircle, 
  LogOut, 
  Code2
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'trades' | 'analytics';
  onSelectTab: (tab: 'trades' | 'analytics') => void;
  onOpenNewTrade: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenNewTrade }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-purple-500/15 bg-[#0e071e]/70 backdrop-blur-2xl shadow-[0_4px_30px_rgba(76,29,149,0.15)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <div 
              className="flex items-center space-x-3 cursor-pointer group" 
              onClick={() => onSelectTab('trades')}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 p-[1.5px] shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_25px_rgba(192,132,252,0.6)] transition-all duration-300">
                <div className="w-full h-full bg-[#120827] rounded-[14px] flex items-center justify-center backdrop-blur-sm">
                  <TrendingUp className="w-5 h-5 text-purple-300 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
                  TradeBook
                </span>
                <span className="ml-2.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                  Liquid
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1.5 p-1 rounded-2xl bg-purple-950/30 border border-purple-500/15 backdrop-blur-xl">
              <button
                onClick={() => onSelectTab('trades')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${
                  currentTab === 'trades'
                    ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-[0_4px_16px_rgba(147,51,234,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-purple-400/30'
                    : 'text-purple-300/70 hover:text-white hover:bg-purple-900/30'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Журнал угод</span>
              </button>

              <button
                onClick={() => onSelectTab('analytics')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${
                  currentTab === 'analytics'
                    ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-[0_4px_16px_rgba(147,51,234,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-purple-400/30'
                    : 'text-purple-300/70 hover:text-white hover:bg-purple-900/30'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Аналітика</span>
              </button>

              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-purple-300/70 hover:text-purple-200 hover:bg-purple-900/30 transition-colors"
                title="Swagger OpenAPI специфікація"
              >
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                <span>REST API</span>
              </a>
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenNewTrade}
              className="liquid-button flex items-center space-x-2 text-white font-semibold px-4 py-2 rounded-xl text-xs tracking-wide"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Додати угоду</span>
            </button>

            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-purple-500/20">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-purple-100">{user.username}</div>
                  <div className="text-[10px] text-purple-400/70 font-mono">{user.email}</div>
                </div>

                <button
                  onClick={logout}
                  title="Вийти"
                  className="p-2 text-purple-300/60 hover:text-rose-400 hover:bg-purple-950/50 rounded-xl border border-transparent hover:border-purple-500/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

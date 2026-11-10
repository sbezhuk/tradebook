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
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('trades')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  TradeBook
                </span>
                <span className="ml-2 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  MVP
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onSelectTab('trades')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'trades'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Журнал угод</span>
              </button>

              <button
                onClick={() => onSelectTab('analytics')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'analytics'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Аналітика</span>
              </button>

              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 transition-colors"
                title="OpenAPI / Swagger документація для мобільного клієнту"
              >
                <Code2 className="w-4 h-4" />
                <span>REST API</span>
              </a>
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenNewTrade}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Додати угоду</span>
            </button>

            {user && (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-200">{user.username}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>

                <button
                  onClick={logout}
                  title="Вийти"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
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

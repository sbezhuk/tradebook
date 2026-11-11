import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';
import { TrendingUp, Lock, Mail, User as UserIcon, ArrowRight, Sparkles, CheckCircle2, Sun, Moon, Monitor } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, register, loginDemo } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!email || !username || !password) {
          throw new Error('Будь ласка, заповніть усі поля');
        }
        await register(email, username, password);
      } else {
        if (!usernameOrEmail || !password) {
          throw new Error('Будь ласка, введіть логін або email та пароль');
        }
        await login(usernameOrEmail, password);
      }
    } catch (err: any) {
      setError(err.message || 'Помилка авторизації');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginDemo();
    } catch (err: any) {
      setError(err.message || 'Не вдалося увійти в демо-акаунт');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090611] p-4 relative overflow-hidden">
      {/* Top-right Theme Pill Switcher */}
      <div className="fixed top-4 right-4 z-20 inline-flex items-center p-1 rounded-full glass-panel gap-1">
        {(
          [
            { id: 'light', icon: Sun, label: 'Світла' },
            { id: 'dark', icon: Moon, label: 'Темна' },
            { id: 'system', icon: Monitor, label: 'Система' },
          ] as { id: ThemeMode; icon: React.FC<{ className?: string }>; label: string }[]
        ).map((item) => {
          const Icon = item.icon;
          const active = theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              title={item.label}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                active
                  ? 'accent-pill'
                  : 'text-purple-200/70 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtle Ambient Purple Glow */}
      <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-purple-700/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-700/12 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c49bff] text-[#110820] shadow-[0_0_30px_rgba(196,155,255,0.4)] mb-4">
            <TrendingUp className="w-7 h-7 stroke-[2.4]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">TradeBook</h1>
          <p className="mt-1.5 text-xs text-purple-200/50">
            Професійний щоденник трейдера з аналітикою
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-7 sm:p-8">
          {/* Quick Demo Button */}
          <button
            onClick={handleDemo}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-[#c49bff]/25 hover:border-[#c49bff]/50 rounded-2xl text-left transition-all group mb-6"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-[#c49bff]/15 text-[#c49bff]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-[#c49bff] transition-colors">
                  Демо-режим в 1 клік
                </div>
                <div className="text-[11px] text-purple-200/50">
                  Готові угоди для швидкого ознайомлення
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-200/50 group-hover:text-[#c49bff] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-white/[0.07]" />
            <span className="px-3 text-[11px] uppercase tracking-wider text-purple-200/40 font-medium">
              або власний акаунт
            </span>
            <div className="flex-1 border-t border-white/[0.07]" />
          </div>

          <div className="flex border-b border-white/[0.07] mb-5">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${
                !isRegister ? 'border-[#c49bff] text-white' : 'border-transparent text-purple-200/50 hover:text-white'
              }`}
            >
              Вхід
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${
                isRegister ? 'border-[#c49bff] text-white' : 'border-transparent text-purple-200/50 hover:text-white'
              }`}
            >
              Реєстрація
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-200/40 z-10 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-purple-200/35"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-purple-200/70 mb-1.5">
                {isRegister ? "Ім'я користувача" : "Логін або Email"}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-200/40 z-10 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={isRegister ? username : usernameOrEmail}
                  onChange={(e) => isRegister ? setUsername(e.target.value) : setUsernameOrEmail(e.target.value)}
                  placeholder={isRegister ? "trader_pro" : "trader"}
                  className="glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-purple-200/35"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-200/40 z-10 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-purple-200/35"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="accent-pill w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center"
            >
              {loading ? 'Зачекайте...' : isRegister ? 'Створити акаунт' : 'Увійти'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-center space-x-2 text-[11px] text-purple-200/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#c49bff]" />
            <span>JWT Auth • REST API OpenAPI 3.1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

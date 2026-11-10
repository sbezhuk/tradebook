import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Lock, Mail, User as UserIcon, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, register, loginDemo } = useAuth();
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-400 p-0.5 shadow-xl shadow-indigo-500/20 mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">TradeBook</h1>
          <p className="mt-2 text-sm text-slate-400">
            Професійний щоденник трейдера з аналітикою та готовим REST API
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Quick Demo Button */}
          <div className="mb-6">
            <button
              onClick={handleDemo}
              disabled={loading}
              className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-950/60 to-emerald-950/40 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-left transition-all group hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    Демо-режим в 1 клік
                  </div>
                  <div className="text-xs text-slate-400">
                    Готові угоди (Crypto, Forex, Stocks, Futures)
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-slate-800" />
            <span className="px-3 text-xs uppercase tracking-wider text-slate-500 font-medium">або свій акаунт</span>
            <div className="flex-1 border-t border-slate-800" />
          </div>

          {/* Form Tabs */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                !isRegister ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Вхід
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                isRegister ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Реєстрація
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {isRegister ? "Ім'я користувача" : "Логін або Email"}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={isRegister ? username : usernameOrEmail}
                  onChange={(e) => isRegister ? setUsername(e.target.value) : setUsernameOrEmail(e.target.value)}
                  placeholder={isRegister ? "trader_pro" : "trader або trader@example.com"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Зачекайте...' : (isRegister ? 'Створити акаунт' : 'Увійти')}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>JWT Bearer Auth • REST API OpenAPI 3.1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

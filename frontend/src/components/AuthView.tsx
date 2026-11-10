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
    <div className="min-h-screen flex items-center justify-center bg-[#090514] p-4 relative overflow-hidden">
      {/* Liquid Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-fuchsia-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 p-[2px] shadow-[0_0_35px_rgba(168,85,247,0.5)] mb-4">
            <div className="w-full h-full bg-[#120827] rounded-[22px] flex items-center justify-center backdrop-blur-md">
              <TrendingUp className="w-10 h-10 text-purple-300" />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
            TradeBook
          </h1>
          <p className="mt-2 text-xs text-purple-300/70 font-medium">
            Щоденник трейдера у стилі Liquid Glass з готовим REST API
          </p>
        </div>

        {/* Card */}
        <div className="liquid-glass-card rounded-3xl p-7 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(76,29,149,0.35)]">
          {/* Quick Demo Button */}
          <div className="mb-6">
            <button
              onClick={handleDemo}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/40 via-purple-950/50 to-indigo-950/40 border border-purple-400/30 hover:border-purple-300/60 rounded-2xl text-left transition-all duration-300 group shadow-[0_4px_20px_rgba(147,51,234,0.15)] hover:shadow-[0_8px_30px_rgba(168,85,247,0.35)]"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <Sparkles className="w-5 h-5 text-purple-300 animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                    Демо-режим в 1 клік
                  </div>
                  <div className="text-[11px] text-purple-300/60 mt-0.5">
                    Угоди з крипти, форексу, акцій та ф'ючерсів
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 group-hover:text-purple-200 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-purple-500/15" />
            <span className="px-3 text-[11px] uppercase tracking-wider text-purple-400/60 font-semibold">або особистий вхід</span>
            <div className="flex-1 border-t border-purple-500/15" />
          </div>

          {/* Form Tabs */}
          <div className="flex border-b border-purple-500/20 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                !isRegister ? 'border-purple-400 text-white shadow-[0_2px_10px_rgba(168,85,247,0.4)]' : 'border-transparent text-purple-400/60 hover:text-purple-200'
              }`}
            >
              Вхід
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                isRegister ? 'border-purple-400 text-white shadow-[0_2px_10px_rgba(168,85,247,0.4)]' : 'border-transparent text-purple-400/60 hover:text-purple-200'
              }`}
            >
              Реєстрація
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="liquid-glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-purple-400/40"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                {isRegister ? "Ім'я користувача" : "Логін або Email"}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
                <input
                  type="text"
                  required
                  value={isRegister ? username : usernameOrEmail}
                  onChange={(e) => isRegister ? setUsername(e.target.value) : setUsernameOrEmail(e.target.value)}
                  placeholder={isRegister ? "trader_pro" : "trader або trader@example.com"}
                  className="liquid-glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-purple-400/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="liquid-glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-purple-400/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="liquid-button w-full mt-3 py-3 px-4 text-white rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Зачекайте...' : (isRegister ? 'Створити акаунт' : 'Увійти')}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-purple-500/15 text-center">
            <div className="flex items-center justify-center space-x-2 text-[11px] text-purple-300/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span>JWT Bearer Security • Liquid Glass UI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

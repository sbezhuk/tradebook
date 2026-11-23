import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';
import {
  TrendingUp,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, verifyLoginOtp, sendRegisterOtp, registerWithOtp, resendOtp, loginDemo } = useAuth();
  const { theme, setTheme } = useTheme();

  // Mode: form or otp verification
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [isRegister, setIsRegister] = useState(false);

  // Form inputs
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP state
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState<number>(0);
  const [resending, setResending] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Refs for 6 OTP input boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first OTP input when switching to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Handle Form Submission (Login or Register request)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!email || !username || !password) {
          throw new Error('Будь ласка, заповніть усі поля');
        }
        if (password.length < 6) {
          throw new Error('Пароль має містити щонайменше 6 символів');
        }
        const res = await sendRegisterOtp(email, username, password);
        setEmailMasked(email);
        setOtpDigits(['', '', '', '', '', '']);
        setCooldown(res.cooldown_seconds || 60);
        setStep('otp');
      } else {
        if (!usernameOrEmail || !password) {
          throw new Error('Будь ласка, введіть логін або email та пароль');
        }
        const res = await login(usernameOrEmail, password);
        if ('otp_required' in res && res.otp_required) {
          setTempToken(res.temp_token);
          setEmailMasked(res.email_masked);
          setOtpDigits(['', '', '', '', '', '']);
          setCooldown(60);
          setStep('otp');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Помилка авторизації');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Digit Input Change
  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (!cleanVal) {
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Single digit input
    newDigits[index] = cleanVal.slice(-1);
    setOtpDigits(newDigits);

    // Auto focus next input
    if (index < 5 && cleanVal) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace and arrow navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      const fullCode = otpDigits.join('');
      if (fullCode.length === 6) {
        handleOtpSubmit();
      }
    }
  };

  // Handle Paste 6 digits
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);

    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  // Handle OTP Submission (Verification)
  const handleOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setError('Введіть повний 6-значний код підтвердження');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        await registerWithOtp(email, username, password, code);
      } else {
        if (!tempToken) {
          throw new Error('Сесія завершилась. Будь ласка, введіть логін знову.');
        }
        await verifyLoginOtp(tempToken, code);
      }
    } catch (err: any) {
      setError(err.message || 'Невірний або прострочений код');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP Code
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setInfoMessage(null);
    setResending(true);

    try {
      if (isRegister) {
        const res = await resendOtp({ email, purpose: 'registration' });
        setCooldown(res.cooldown_seconds || 60);
      } else {
        const res = await resendOtp({ tempToken: tempToken || undefined, purpose: 'login' });
        setCooldown(res.cooldown_seconds || 60);
      }
      setInfoMessage('Новий 6-значний код надіслано на вашу пошту');
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Не вдалося надіслати код повторно');
    } finally {
      setResending(false);
    }
  };

  // Handle Demo Mode
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

  // Reset to form step
  const handleBackToForm = () => {
    setStep('form');
    setError(null);
    setInfoMessage(null);
    setOtpDigits(['', '', '', '', '', '']);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden auth-bg">
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
                active ? 'accent-pill' : 'text-purple-200/70 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-md relative">
        {/* Brand Header */}
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
          {step === 'form' ? (
            <>
              {/* Quick Demo Button */}
              <button
                onClick={handleDemo}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-[#c49bff]/25 hover:border-[#c49bff]/50 rounded-2xl text-left transition-all group mb-6 cursor-pointer"
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

              {/* Tabs: Вхід / Реєстрація */}
              <div className="flex border-b border-white/[0.07] mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    !isRegister
                      ? 'border-[#c49bff] text-white'
                      : 'border-transparent text-purple-200/50 hover:text-white'
                  }`}
                >
                  Вхід
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    isRegister
                      ? 'border-[#c49bff] text-white'
                      : 'border-transparent text-purple-200/50 hover:text-white'
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

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-medium text-purple-200/70 mb-1.5">
                      Email для перевірки OTP
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-200/40 z-10 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@gmail.com"
                        className="glass-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-purple-200/35"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">
                    {isRegister ? "Ім'я користувача" : 'Логін або Email'}
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-200/40 z-10 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={isRegister ? username : usernameOrEmail}
                      onChange={(e) =>
                        isRegister ? setUsername(e.target.value) : setUsernameOrEmail(e.target.value)
                      }
                      placeholder={isRegister ? 'trader_pro' : 'trader або email'}
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
                  className="accent-pill w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {loading
                    ? 'Зачекайте...'
                    : isRegister
                    ? 'Отримати код на Email'
                    : 'Увійти'}
                </button>
              </form>
            </>
          ) : (
            /* OTP Verification Screen */
            <div>
              {/* Back button */}
              <button
                type="button"
                onClick={handleBackToForm}
                className="inline-flex items-center gap-1.5 text-xs text-purple-200/60 hover:text-white mb-5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isRegister ? 'Змінити дані реєстрації' : 'Назад до форми входу'}</span>
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#c49bff]/15 text-[#c49bff] border border-[#c49bff]/30 mb-3 shadow-[0_0_20px_rgba(196,155,255,0.2)]">
                  <KeyRound className="w-6 h-6 stroke-[2]" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {isRegister ? 'Підтвердження реєстрації' : 'Введіть код підтвердження'}
                </h2>
                <p className="mt-1.5 text-xs text-purple-200/60">
                  6-значний код відправлено на вашу електронну адресу
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-purple-200">
                  <Mail className="w-3.5 h-3.5 text-[#c49bff]" />
                  <span>{emailMasked}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs">
                  {infoMessage}
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                {/* 6 Digit Inputs */}
                <div className="flex justify-between items-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      className="w-11 sm:w-12 h-14 text-center text-2xl font-bold font-mono rounded-xl glass-input text-white focus:border-[#c49bff] focus:ring-2 focus:ring-[#c49bff]/40 transition-all"
                    />
                  ))}
                </div>

                {/* Resend OTP Section */}
                <div className="text-center">
                  {cooldown > 0 ? (
                    <span className="text-xs text-purple-200/40">
                      Надіслати код повторно через{' '}
                      <span className="font-mono font-semibold text-purple-200/80">{cooldown} с</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c49bff] hover:text-[#d7baff] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      <span>{resending ? 'Відправка...' : 'Надіслати код повторно'}</span>
                    </button>
                  )}
                </div>

                {/* Submit OTP button */}
                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length < 6}
                  className="accent-pill w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer disabled:opacity-40 transition-opacity"
                >
                  {loading
                    ? 'Перевірка...'
                    : isRegister
                    ? 'Завершити реєстрацію'
                    : 'Підтвердити та увійти'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <span className="text-[11px] text-purple-200/40 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#c49bff]" />
                  <span>Захист через Gmail SMTP & OTP</span>
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-center space-x-2 text-[11px] text-purple-200/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#c49bff]" />
            <span>Двоетапна автентифікація • Gmail SMTP • JWT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

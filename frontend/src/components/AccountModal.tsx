import React, { useState } from 'react';
import type { TradingAccount, AccountFormData } from '../types';
import { GlassSelect } from './GlassSelect';
import {
  Briefcase,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Star,
  ArrowRight,
} from 'lucide-react';

interface AccountModalProps {
  onClose: () => void;
  accounts: TradingAccount[];
  activeAccountId: number | null;
  onSelectAccount: (accountId: number | null) => void;
  onCreateAccount: (data: AccountFormData) => Promise<void>;
  onUpdateAccount: (id: number, data: Partial<AccountFormData>) => Promise<void>;
  onDeleteAccount: (id: number, deleteData: boolean) => Promise<void>;
}

const PLATFORM_OPTIONS = [
  { value: 'HYPERLIQUID', label: 'Hyperliquid (DEX)' },
  { value: 'BINANCE', label: 'Binance (CEX)' },
  { value: 'BYBIT', label: 'Bybit (CEX)' },
  { value: 'OKX', label: 'OKX (CEX)' },
  { value: 'PROP', label: 'Prop Firm' },
  { value: 'CUSTOM', label: 'Інша / Загальна' },
];

const TYPE_OPTIONS = [
  { value: 'PERSONAL', label: 'Основний' },
  { value: 'FUTURES', label: 'Фʼючерси' },
  { value: 'SPOT', label: 'Спот' },
  { value: 'PROP', label: 'Prop-рахунок' },
  { value: 'DEMO', label: 'Демо / Тест' },
];

const COLOR_PRESETS = [
  '#c49bff',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#fb7185',
];

const PLATFORM_LABELS: Record<string, string> = {
  HYPERLIQUID: 'Hyperliquid',
  BINANCE: 'Binance',
  BYBIT: 'Bybit',
  OKX: 'OKX',
  PROP: 'Prop Firm',
  CUSTOM: 'Загальний',
};

const TYPE_LABELS: Record<string, string> = {
  PERSONAL: 'Основний',
  FUTURES: 'Фʼючерси',
  SPOT: 'Спот',
  PROP: 'Prop',
  DEMO: 'Демо',
};

const formatMoney = (val: number) => {
  const abs = Math.abs(val);
  return abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const AccountModal: React.FC<AccountModalProps> = ({
  onClose,
  accounts,
  activeAccountId,
  onSelectAccount,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
}) => {
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('HYPERLIQUID');
  const [accountType, setAccountType] = useState('FUTURES');
  const [color, setColor] = useState('#c49bff');
  const [isDefault, setIsDefault] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingAccount(null);
    setName('');
    setPlatform('HYPERLIQUID');
    setAccountType('FUTURES');
    setColor('#c49bff');
    setIsDefault(false);
    setError(null);
  };

  const startEdit = (acc: TradingAccount) => {
    setEditingAccount(acc);
    setName(acc.name);
    setPlatform(acc.platform || 'CUSTOM');
    setAccountType(acc.account_type || 'PERSONAL');
    setColor(acc.color || '#c49bff');
    setIsDefault(acc.is_default);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Вкажіть назву акаунту');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: AccountFormData = {
        name: cleanName,
        platform,
        account_type: accountType,
        currency: 'USD',
        color,
        is_default: isDefault,
      };
      if (editingAccount) {
        await onUpdateAccount(editingAccount.id, payload);
      } else {
        await onCreateAccount(payload);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Не вдалося зберегти акаунт');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, deleteData: boolean) => {
    setDeletingId(id);
    setError(null);
    try {
      await onDeleteAccount(id, deleteData);
      if (editingAccount?.id === id) {
        resetForm();
      }
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'Не вдалося видалити акаунт');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07040e]/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl glass-popover rounded-3xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#c49bff]/15 border border-[#c49bff]/30 flex items-center justify-center text-[#c49bff] shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                Торгові акаунти та портфелі
              </h2>
              <p className="text-xs text-purple-200/55 truncate">
                Окремий облік угод, депозитів та статистики для кожної біржі чи стратегії
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="p-2 text-purple-200/50 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Create / Edit Account Form */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-5 glass-card-subtle rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white">
                    {editingAccount ? `Редагувати «${editingAccount.name}»` : 'Новий акаунт'}
                  </div>
                  {editingAccount && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-[11px] text-purple-200/60 hover:text-white cursor-pointer"
                    >
                      Скасувати
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-purple-200/65 mb-1.5">
                    Назва акаунту *
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Напр., Bybit Futures або Hyperliquid Main"
                    className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-purple-200/35"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-purple-200/65 mb-1.5">
                      Платформа
                    </label>
                    <GlassSelect
                      variant="field"
                      value={platform}
                      onChange={setPlatform}
                      options={PLATFORM_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-purple-200/65 mb-1.5">
                      Тип
                    </label>
                    <GlassSelect
                      variant="field"
                      value={accountType}
                      onChange={setAccountType}
                      options={TYPE_OPTIONS}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-purple-200/65 mb-2">
                    Колір індикатора
                  </label>
                  <div className="flex items-center gap-2">
                    {COLOR_PRESETS.map((c) => {
                      const active = color === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          aria-label={`Колір ${c}`}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                            active ? 'scale-110 ring-2 ring-white/80' : 'opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c }}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-[#110820] stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#c49bff] cursor-pointer"
                  />
                  <span className="text-xs text-purple-100/80">
                    Зробити акаунтом за замовчуванням
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="accent-pill w-full py-2.5 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {editingAccount ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>
                  {saving
                    ? 'Збереження...'
                    : editingAccount
                    ? 'Зберегти зміни'
                    : 'Створити акаунт'}
                </span>
              </button>
            </form>

            {/* Right: Accounts List */}
            <div className="lg:col-span-7 glass-card-subtle rounded-2xl flex flex-col overflow-hidden min-h-[300px] lg:h-[400px]">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white">Ваші акаунти</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-purple-200/70">
                    {accounts.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectAccount(null);
                    onClose();
                  }}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                    activeAccountId === null
                      ? 'accent-pill'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-purple-200/80'
                  }`}
                >
                  Усі акаунти разом
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05]">
                {accounts.map((acc) => {
                  const isActive = activeAccountId === acc.id;
                  const isConfirming = confirmDeleteId === acc.id;
                  const isPnlPos = acc.total_pnl >= 0;
                  const hasData = acc.trades_count > 0 || acc.total_deposits !== 0;

                  return (
                    <div
                      key={acc.id}
                      className={`px-4 py-3.5 space-y-2.5 transition-colors ${
                        isActive ? 'bg-[#c49bff]/[0.06]' : 'hover:bg-white/[0.025]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: acc.color || '#c49bff' }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-white truncate">
                                {acc.name}
                              </span>
                              {acc.is_default && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#c49bff]/15 text-[#c49bff]">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  Основний
                                </span>
                              )}
                              {isActive && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                                  Обрано
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-purple-200/50 mt-0.5">
                              {PLATFORM_LABELS[acc.platform] ?? acc.platform} •{' '}
                              {TYPE_LABELS[acc.account_type] ?? acc.account_type} •{' '}
                              {acc.trades_count} угод
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectAccount(acc.id);
                              onClose();
                            }}
                            title="Перемкнутися на цей акаунт"
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-[#c49bff]/20 text-[11px] font-semibold text-purple-100 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Відкрити</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => startEdit(acc)}
                            title="Редагувати акаунт"
                            className="p-1.5 rounded-lg text-purple-200/50 hover:text-[#c49bff] hover:bg-white/[0.06] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {accounts.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteId((prev) => (prev === acc.id ? null : acc.id))
                              }
                              title="Видалити акаунт"
                              className="p-1.5 rounded-lg text-purple-200/45 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Per-account compact metrics */}
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-white/[0.025] rounded-xl px-3 py-2 border border-white/[0.04]">
                        <div>
                          <span className="text-purple-200/45 font-sans block text-[10px]">Депозит</span>
                          <span className="text-white font-semibold tabular-nums">
                            ${formatMoney(acc.total_deposits)}
                          </span>
                        </div>
                        <div>
                          <span className="text-purple-200/45 font-sans block text-[10px]">PnL</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              isPnlPos ? 'text-[#c49bff]' : 'text-rose-400'
                            }`}
                          >
                            {isPnlPos ? '+' : '-'}${formatMoney(acc.total_pnl)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-200/45 font-sans block text-[10px]">Баланс</span>
                          <span className="text-white font-bold tabular-nums">
                            {acc.current_balance < 0 ? '-' : ''}${formatMoney(acc.current_balance)}
                          </span>
                        </div>
                      </div>

                      {/* Inline delete confirmation */}
                      {isConfirming && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-[11px] text-rose-200">
                            {hasData
                              ? 'Що зробити з угодами та депозитами цього акаунту?'
                              : 'Видалити цей порожній акаунт?'}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {hasData ? (
                              <>
                                <button
                                  type="button"
                                  disabled={deletingId === acc.id}
                                  onClick={() => handleDelete(acc.id, false)}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.1] hover:bg-white/[0.18] text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                                >
                                  Перенести в основний
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === acc.id}
                                  onClick={() => handleDelete(acc.id, true)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/85 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                                >
                                  Видалити з даними
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={deletingId === acc.id}
                                onClick={() => handleDelete(acc.id, false)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/85 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                Підтвердити
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-white/[0.05] text-purple-200/75 hover:text-white text-[11px] cursor-pointer"
                            >
                              Скасувати
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

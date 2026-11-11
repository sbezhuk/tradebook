import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import type { HyperliquidImportResponse, HyperliquidDepositImportResponse, TradingAccount } from '../types';
import { GlassSelect } from './GlassSelect';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowLeftRight,
  Wallet,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export type ImportPlatform = 'hyperliquid' | 'binance';
export type ImportMode = 'trades' | 'deposits';

interface ImportViewProps {
  mode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
  accounts?: TradingAccount[];
  activeAccountId?: number | null;
  onImportSuccess: (mode: ImportMode) => Promise<void>;
  onGoToTrades: () => void;
  onGoToInsights: () => void;
  onOpenDeposits: () => void;
}

const HYPERLIQUID_MODE_CONFIG: Record<
  ImportMode,
  {
    tabLabel: string;
    title: string;
    subtitle: string;
    csvExample: string;
    menuPath: string;
    instructionsBody: string;
    uploadingText: string;
    successSubtitle: string;
    addedLabel: string;
    summaryLabel: string;
  }
> = {
  trades: {
    tabLabel: 'Угоди',
    title: 'Імпорт угод з Hyperliquid',
    subtitle: 'Автоматичне групування ордерів у завершені угоди',
    csvExample: 'trade_history.csv',
    menuPath: 'Portfolio → Trade History → Export to CSV',
    instructionsBody:
      'Система автоматично зведе часткові входи/виходи (Open/Close) у готові угоди з точним PnL та комісіями, а дублікати будуть пропущені.',
    uploadingText: 'Аналіз ордерів та розрахунок PnL...',
    successSubtitle: 'Ваші угоди та аналітика автоматично оновлені.',
    addedLabel: 'Додано угод',
    summaryLabel: 'Сума PnL',
  },
  deposits: {
    tabLabel: 'Депозити та виведення',
    title: 'Імпорт депозитів з Hyperliquid',
    subtitle: 'Автоматичне завантаження історії поповнень і переказів',
    csvExample: 'deposits_and_withdrawals.csv',
    menuPath: 'Portfolio → Deposits and Withdrawals → Export to CSV',
    instructionsBody:
      'Система автоматично розпізнає поповнення, перекази та зняття з точними датами й сумами, а дублікати будуть пропущені.',
    uploadingText: 'Аналіз транзакцій депозиту...',
    successSubtitle: 'Ваш баланс та аналітика приросту депозиту автоматично оновлені.',
    addedLabel: 'Додано записів',
    summaryLabel: 'Сума депозиту',
  },
};

export const ImportView: React.FC<ImportViewProps> = ({
  mode,
  onModeChange,
  accounts = [],
  activeAccountId = null,
  onImportSuccess,
  onGoToTrades,
  onGoToInsights,
  onOpenDeposits,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<ImportPlatform>('hyperliquid');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    () =>
      activeAccountId ??
      accounts.find((a) => a.platform === 'HYPERLIQUID')?.id ??
      accounts.find((a) => a.is_default)?.id ??
      accounts[0]?.id ??
      null
  );
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeResult, setTradeResult] = useState<HyperliquidImportResponse | null>(null);
  const [depositResult, setDepositResult] = useState<HyperliquidDepositImportResponse | null>(null);

  const cfg = HYPERLIQUID_MODE_CONFIG[mode];
  const result = mode === 'trades' ? tradeResult : depositResult;
  const summaryValue =
    mode === 'trades' ? tradeResult?.total_pnl ?? 0 : depositResult?.total_amount ?? 0;

  const resetUploadState = () => {
    setError(null);
    setTradeResult(null);
    setDepositResult(null);
  };

  const handleSelectPlatform = (platform: ImportPlatform) => {
    setSelectedPlatform(platform);
    resetUploadState();
  };

  const handleSwitchMode = (nextMode: ImportMode) => {
    if (nextMode !== mode) {
      resetUploadState();
      onModeChange(nextMode);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(`Будь ласка, оберіть CSV файл (наприклад, ${cfg.csvExample} з Hyperliquid)`);
      return;
    }

    setUploading(true);
    setError(null);
    setTradeResult(null);
    setDepositResult(null);

    try {
      const resolvedTargetId =
        selectedAccountId ??
        activeAccountId ??
        accounts.find((a) => a.is_default)?.id ??
        accounts[0]?.id ??
        null;
      if (mode === 'trades') {
        const res = await api.importHyperliquidCsv(file, resolvedTargetId);
        setTradeResult(res);
      } else {
        const res = await api.importHyperliquidDepositsCsv(file, resolvedTargetId);
        setDepositResult(res);
      }
      await onImportSuccess(mode);
    } catch (err: any) {
      setError(err.message || 'Помилка під час імпорту файлу');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Імпорт даних</h1>
        <p className="text-sm text-purple-200/50 mt-1">
          Оберіть платформу, з якої хочете перенести угоди або історію поповнень.
        </p>
      </div>

      {/* Platform Selector */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">1. Оберіть платформу</h2>
            <p className="text-xs text-purple-200/50 mt-0.5">
              Кожна платформа має власний формат експорту та правила зведення угод.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Hyperliquid (Active) */}
          <button
            type="button"
            onClick={() => handleSelectPlatform('hyperliquid')}
            className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedPlatform === 'hyperliquid'
                ? 'bg-[#c49bff]/12 border-[#c49bff]/55 shadow-[0_0_24px_-8px_rgba(196,155,255,0.45)]'
                : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#c49bff]/15 border border-[#c49bff]/30 text-[#c49bff] font-bold text-xs flex items-center justify-center shrink-0">
                  HL
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Hyperliquid</div>
                  <div className="text-[11px] text-purple-200/55">DEX • Perps &amp; Ledger</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                Доступно
              </span>
            </div>
            <p className="text-[11px] text-purple-200/60 leading-relaxed">
              Імпорт історії угод (<span className="font-mono text-purple-100/90">trade_history.csv</span>) та депозитів/зняттів (<span className="font-mono text-purple-100/90">deposits_and_withdrawals.csv</span>).
            </p>
          </button>

          {/* Binance (Locked / Disabled) */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Імпорт з Binance наразі в розробці"
            className="text-left p-4 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] opacity-55 cursor-not-allowed select-none"
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                  BN
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Binance</span>
                    <Lock className="w-3.5 h-3.5 text-purple-200/50" />
                  </div>
                  <div className="text-[11px] text-purple-200/50">CEX • Spot &amp; Futures</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-purple-200/60 border border-white/[0.08] shrink-0">
                Скоро
              </span>
            </div>
            <p className="text-[11px] text-purple-200/50 leading-relaxed">
              Імпорт угод та транзакцій з Binance ще готується і буде доступний у наступному оновленні.
            </p>
          </button>
        </div>
      </div>

      {/* Selected Platform Workspace */}
      {selectedPlatform === 'hyperliquid' && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Header + Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#c49bff]/15 text-[#c49bff] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{cfg.title}</h2>
                <p className="text-xs text-purple-200/50">{cfg.subtitle}</p>
              </div>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleSwitchMode('trades')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'trades'
                    ? 'accent-pill'
                    : 'text-purple-200/65 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{HYPERLIQUID_MODE_CONFIG.trades.tabLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('deposits')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'deposits'
                    ? 'accent-pill'
                    : 'text-purple-200/65 hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{HYPERLIQUID_MODE_CONFIG.deposits.tabLabel}</span>
              </button>
            </div>
          </div>

          {/* Target Account & Instructions */}
          {accounts.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.025] border border-white/[0.07]">
              <div>
                <div className="text-xs font-semibold text-white">Акаунт призначення</div>
                <div className="text-[11px] text-purple-200/55 mt-0.5">
                  Усі імпортовані записи будуть привʼязані до вибраного портфелю.
                </div>
              </div>
              <div className="w-full sm:w-64 shrink-0">
                <GlassSelect
                  variant="field"
                  value={
                    selectedAccountId
                      ? String(selectedAccountId)
                      : activeAccountId
                      ? String(activeAccountId)
                      : accounts[0]
                      ? String(accounts[0].id)
                      : ''
                  }
                  onChange={(val) => setSelectedAccountId(val ? Number(val) : null)}
                  options={accounts.map((acc) => ({
                    value: String(acc.id),
                    label: `${acc.name} (${acc.platform})`,
                  }))}
                />
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-xs text-purple-200/70 space-y-1">
            <div className="font-semibold text-white">Як отримати файл у Hyperliquid:</div>
            <p className="text-xs text-purple-200/60 leading-relaxed">
              Перейдіть у <span className="text-[#c49bff] font-medium">{cfg.menuPath}</span>.{' '}
              {cfg.instructionsBody}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Zone or Result */}
          {!result ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!uploading) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                dragging
                  ? 'border-[#c49bff] bg-[#c49bff]/10'
                  : 'border-white/[0.12] hover:border-[#c49bff]/50 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />

              {uploading ? (
                <div className="space-y-3">
                  <div className="inline-block animate-spin rounded-full h-9 w-9 border-b-2 border-[#c49bff]" />
                  <p className="text-xs text-purple-100 font-medium">{cfg.uploadingText}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#c49bff]/15 text-[#c49bff] flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Натисніть або перетягніть <span className="font-mono text-[#c49bff]">{cfg.csvExample}</span> сюди
                  </div>
                  <div className="text-xs text-purple-200/45">
                    Підтримується стандартний експорт CSV з Hyperliquid
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#c49bff]/10 border border-[#c49bff]/30 flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-[#c49bff] shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">Імпорт успішно завершено!</div>
                  <div className="text-xs text-purple-200/70">{cfg.successSubtitle}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-xs text-purple-200/50">{cfg.addedLabel}</div>
                  <div className="text-2xl font-bold font-mono text-[#c49bff] mt-1">
                    {result.imported_count}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-xs text-purple-200/50">Дублікати</div>
                  <div className="text-2xl font-bold font-mono text-purple-200/80 mt-1">
                    {result.skipped_duplicates}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-xs text-purple-200/50">{cfg.summaryLabel}</div>
                  <div
                    className={`text-2xl font-bold font-mono mt-1 ${
                      summaryValue >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {summaryValue >= 0 ? '+' : '-'}${Math.abs(summaryValue).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={resetUploadState}
                  className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-purple-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Завантажити ще файл</span>
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  {mode === 'trades' ? (
                    <>
                      <button
                        type="button"
                        onClick={onGoToTrades}
                        className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Журнал угод</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={onGoToInsights}
                        className="accent-pill px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Відкрити аналітику</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenDeposits}
                      className="accent-pill px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Керувати депозитами</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

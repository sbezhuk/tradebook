import React, { useState, useEffect } from 'react';
import type { Trade, TradeFormData, MarketType, DirectionType, StatusType, TradingAccount } from '../types';
import { api } from '../api/client';
import { GlassSelect } from './GlassSelect';
import { GlassDateTimePicker } from './GlassDateTimePicker';
import {
  X,
  Upload,
  Star,
  ShieldCheck,
  ShieldAlert,
  Calculator,
  Clock,
  Tag as TagIcon,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TradeFormData, id?: number) => Promise<void>;
  editTrade?: Trade | null;
  initialCloseMode?: boolean;
  accounts?: TradingAccount[];
  activeAccountId?: number | null;
}

const QUICK_SYMBOLS: Record<MarketType, string[]> = {
  CRYPTO: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
  FOREX: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
  STOCKS: ['NVDA', 'AAPL', 'TSLA'],
  FUTURES: ['NQ1!', 'ES1!'],
  COMMODITIES: ['XAU/USD', 'WTI'],
  OTHER: [],
};

const QUICK_TAGS = ['Breakout', 'SupportBounce', 'TrendContinuation', 'FVG', 'LondonOpen', 'NYSession'];

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTrade,
  initialCloseMode = false,
  accounts = [],
  activeAccountId = null,
}) => {
  const isEditing = !!editTrade;

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const defaultAccountId =
    activeAccountId ?? accounts.find((a) => a.is_default)?.id ?? accounts[0]?.id ?? null;

  const [accountId, setAccountId] = useState<number | null>(defaultAccountId);
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<MarketType>('CRYPTO');
  const [direction, setDirection] = useState<DirectionType>('LONG');
  const [status, setStatus] = useState<StatusType>('OPEN');

  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');

  const [entryPrice, setEntryPrice] = useState<string>('');
  const [exitPrice, setExitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [fees, setFees] = useState<string>('0');
  const [funding, setFunding] = useState<string>('0');

  const [tags, setTags] = useState('');
  const [setupNotes, setSetupNotes] = useState('');
  const [postTradeNotes, setPostTradeNotes] = useState('');
  const [disciplineRating, setDisciplineRating] = useState(5);
  const [followedRules, setFollowedRules] = useState(true);
  const [chartUrl, setChartUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatForInput = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  useEffect(() => {
    setStep(1);
    setError(null);
    if (editTrade) {
      const nextStatus: StatusType =
        initialCloseMode && editTrade.status === 'OPEN' ? 'CLOSED' : editTrade.status;
      setAccountId(editTrade.account_id ?? defaultAccountId);
      setSymbol(editTrade.symbol);
      setMarket(editTrade.market);
      setDirection(editTrade.direction);
      setStatus(nextStatus);
      setEntryDate(formatForInput(editTrade.entry_date));
      setExitDate(
        editTrade.exit_date
          ? formatForInput(editTrade.exit_date)
          : nextStatus === 'CLOSED'
          ? formatForInput(new Date().toISOString())
          : ''
      );
      setEntryPrice(String(editTrade.entry_price));
      setExitPrice(
        editTrade.exit_price !== null && editTrade.exit_price !== undefined
          ? String(editTrade.exit_price)
          : ''
      );
      setQuantity(String(editTrade.quantity));
      setStopLoss(editTrade.stop_loss ? String(editTrade.stop_loss) : '');
      setTakeProfit(editTrade.take_profit ? String(editTrade.take_profit) : '');
      setFees(String(editTrade.fees || 0));
      setFunding(
        editTrade.funding !== undefined && editTrade.funding !== null
          ? String(editTrade.funding)
          : '0'
      );
      setTags(editTrade.tags || '');
      setSetupNotes(editTrade.setup_notes || '');
      setPostTradeNotes(editTrade.post_trade_notes || '');
      setDisciplineRating(editTrade.discipline_rating || 5);
      setFollowedRules(editTrade.followed_rules ?? true);
      setChartUrl(editTrade.chart_url || '');
    } else {
      setAccountId(defaultAccountId);
      setSymbol('');
      setMarket('CRYPTO');
      setDirection('LONG');
      setStatus('OPEN');
      const nowStr = formatForInput(new Date().toISOString());
      setEntryDate(nowStr);
      setExitDate('');
      setEntryPrice('');
      setExitPrice('');
      setQuantity('1');
      setStopLoss('');
      setTakeProfit('');
      setFees('0');
      setFunding('0');
      setTags('');
      setSetupNotes('');
      setPostTradeNotes('');
      setDisciplineRating(5);
      setFollowedRules(true);
      setChartUrl('');
    }
  }, [editTrade, initialCloseMode, isOpen, defaultAccountId]);

  const handleStatusChange = (nextStatus: StatusType) => {
    setStatus(nextStatus);
    if (nextStatus === 'CLOSED' && !exitDate) {
      setExitDate(formatForInput(new Date().toISOString()));
    }
    setError(null);
  };

  if (!isOpen) return null;

  // Live PnL preview
  const numEntry = parseFloat(entryPrice) || 0;
  const numExit = parseFloat(exitPrice) || 0;
  const numQty = parseFloat(quantity) || 0;
  const numFees = parseFloat(fees) || 0;
  const numFunding = parseFloat(funding) || 0;
  const numSL = parseFloat(stopLoss) || 0;

  let livePnl = 0;
  let liveRoi = 0;
  let liveRR: number | null = null;

  if (numEntry > 0 && numExit > 0 && numQty > 0 && status === 'CLOSED') {
    if (direction === 'LONG') {
      livePnl = (numExit - numEntry) * numQty - numFees + numFunding;
      liveRoi = ((numExit - numEntry) / numEntry) * 100;
      if (numSL > 0 && numSL < numEntry) {
        const risk = (numEntry - numSL) * numQty;
        if (risk > 0) liveRR = Number((livePnl / risk).toFixed(2));
      }
    } else {
      livePnl = (numEntry - numExit) * numQty - numFees + numFunding;
      liveRoi = ((numEntry - numExit) / numEntry) * 100;
      if (numSL > 0 && numSL > numEntry) {
        const risk = (numSL - numEntry) * numQty;
        if (risk > 0) liveRR = Number((livePnl / risk).toFixed(2));
      }
    }
  }

  const validateStep1 = () => {
    if (!symbol.trim()) {
      setError('Будь ласка, вкажіть символ або пару');
      return false;
    }
    if (!numEntry || numEntry <= 0) {
      setError('Вкажіть коректну ціну входу');
      return false;
    }
    if (!numQty || numQty <= 0) {
      setError('Вкажіть коректний об’єм / кількість');
      return false;
    }
    if (status === 'CLOSED' && (!numExit || numExit <= 0)) {
      setError('Для закритої угоди вкажіть ціну виходу (або змініть статус на «Відкрита»)');
      return false;
    }
    setError(null);
    return true;
  };

  const handleGoToStep = (target: 1 | 2 | 3) => {
    if (target > 1 && !validateStep1()) return;
    setError(null);
    setStep(target);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      setError(null);
      setStep(3);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadImage(file);
      setChartUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'Не вдалося завантажити зображення');
    } finally {
      setUploading(false);
    }
  };

  const toggleQuickTag = (tag: string) => {
    const current = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (current.includes(tag)) {
      setTags(current.filter((t) => t !== tag).join(', '));
    } else {
      setTags([...current, tag].join(', '));
    }
  };

  const handleSaveSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateStep1()) return;

    setSaving(true);
    setError(null);

    try {
      const payload: TradeFormData = {
        account_id: accountId,
        symbol: symbol.trim().toUpperCase(),
        market,
        direction,
        status,
        entry_date: entryDate ? new Date(entryDate).toISOString() : new Date().toISOString(),
        exit_date:
          status === 'CLOSED'
            ? (exitDate ? new Date(exitDate).toISOString() : new Date().toISOString())
            : null,
        entry_price: numEntry,
        exit_price: status === 'CLOSED' && numExit > 0 ? numExit : null,
        quantity: numQty,
        stop_loss: numSL > 0 ? numSL : null,
        take_profit: parseFloat(takeProfit) > 0 ? parseFloat(takeProfit) : null,
        fees: numFees,
        funding: numFunding,
        tags: tags.trim(),
        setup_notes: setupNotes.trim() || null,
        post_trade_notes: postTradeNotes.trim() || null,
        discipline_rating: disciplineRating,
        followed_rules: followedRules,
        chart_url: chartUrl.trim() || null,
      };

      await onSave(payload, editTrade?.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Не вдалося зберегти угоду');
    } finally {
      setSaving(false);
    }
  };

  const stepsInfo = [
    { num: 1 as const, label: 'Позиція та ціни' },
    { num: 2 as const, label: 'Ризик і час' },
    { num: 3 as const, label: 'Нотатки та графік' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07040e]/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl glass-popover rounded-3xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {isEditing ? `Редагувати ${editTrade.symbol}` : 'Нова угода'}
            </h2>
            <p className="text-[11px] text-purple-200/50 mt-0.5">
              Крок {step} з 3 — {stepsInfo[step - 1].label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-purple-200/50 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clickable Stepper Bar */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2">
          {stepsInfo.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => handleGoToStep(s.num)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#c49bff]/15 text-[#c49bff] border border-[#c49bff]/35'
                    : isDone
                    ? 'bg-white/[0.04] text-purple-100/80 border border-white/[0.08]'
                    : 'bg-white/[0.02] text-purple-200/45 border border-white/[0.05] hover:text-purple-200/80'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-[#c49bff] text-[#110820]'
                      : isDone
                      ? 'bg-[#c49bff]/30 text-[#c49bff]'
                      : 'bg-white/[0.07] text-purple-200/50'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
                </span>
                <span className="hidden sm:inline truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveSubmit} className="p-6 space-y-5">
          {/* ==================== STEP 1: CORE POSITION & PRICES ==================== */}
          {step === 1 && (
            <div className="space-y-4">
              {accounts.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">
                    Торговий акаунт
                  </label>
                  <GlassSelect
                    variant="field"
                    value={accountId ? String(accountId) : ''}
                    onChange={(val) => setAccountId(val ? Number(val) : null)}
                    options={accounts.map((acc) => ({
                      value: String(acc.id),
                      label: `${acc.name} (${acc.platform})`,
                    }))}
                  />
                </div>
              )}

              {/* Market, Direction, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Ринок</label>
                  <GlassSelect
                    variant="field"
                    value={market}
                    onChange={(val) => setMarket(val as MarketType)}
                    options={[
                      { value: 'CRYPTO', label: 'Crypto' },
                      { value: 'FOREX', label: 'Forex' },
                      { value: 'STOCKS', label: 'Stocks' },
                      { value: 'FUTURES', label: 'Futures' },
                      { value: 'COMMODITIES', label: 'Commodities' },
                      { value: 'OTHER', label: 'Інше' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Сторона</label>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setDirection('LONG')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        direction === 'LONG'
                          ? 'bg-[#c49bff] text-[#110820]'
                          : 'text-purple-200/55 hover:text-white'
                      }`}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SHORT')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        direction === 'SHORT'
                          ? 'bg-rose-500 text-white'
                          : 'text-purple-200/55 hover:text-white'
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Статус</label>
                  <GlassSelect
                    variant="field"
                    value={status}
                    onChange={(val) => handleStatusChange(val as StatusType)}
                    options={[
                      { value: 'OPEN', label: 'Відкрита (в процесі)' },
                      { value: 'CLOSED', label: 'Закрита' },
                      { value: 'CANCELLED', label: 'Скасована' },
                    ]}
                  />
                </div>
              </div>

              {/* Symbol + Quick Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-purple-200/70">Символ / Пара *</label>
                  <div className="flex items-center gap-1">
                    {QUICK_SYMBOLS[market]?.map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setSymbol(sym)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-[#c49bff]/20 text-purple-200/65 hover:text-[#c49bff] border border-white/[0.06] transition-colors"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="Напр. BTC/USDT, EUR/USD, NVDA"
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-purple-200/35 uppercase font-mono font-bold"
                />
              </div>

              {/* Quantity, Entry Price, Exit Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Об'єм позиції *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1.0"
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Ціна входу *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="65000"
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">
                    Ціна виходу {status === 'CLOSED' ? '*' : ''}
                  </label>
                  <input
                    type="number"
                    step="any"
                    disabled={status !== 'CLOSED'}
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    placeholder={
                      status === 'OPEN'
                        ? 'В процесі'
                        : status === 'CANCELLED'
                        ? 'Скасована'
                        : '68000'
                    }
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white font-mono disabled:opacity-40"
                  />
                </div>
              </div>

              {status === 'OPEN' && (
                <div className="p-3 rounded-2xl bg-[#c49bff]/10 border border-[#c49bff]/25 text-[11px] text-purple-100/85 flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-[#c49bff] shrink-0" />
                  <span>
                    Угода зберігається як активна (в процесі) — ціну та час виходу заповните при закритті.
                  </span>
                </div>
              )}

              {/* Live PnL Preview */}
              {numEntry > 0 && numExit > 0 && status === 'CLOSED' && (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-purple-200/65">
                    <Calculator className="w-4 h-4 text-[#c49bff]" />
                    <span>Попередній результат:</span>
                  </div>
                  <div className="flex items-center space-x-4 font-mono font-bold">
                    <span className={livePnl >= 0 ? 'text-[#c49bff]' : 'text-rose-400'}>
                      {livePnl >= 0 ? '+' : ''}${livePnl.toFixed(2)}
                    </span>
                    <span className={liveRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {liveRoi >= 0 ? '+' : ''}{liveRoi.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== STEP 2: RISK & TIMING ==================== */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-rose-400/90 mb-1.5">Stop Loss</label>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="64000"
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-rose-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#c49bff] mb-1.5">Take Profit</label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="70000"
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-purple-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Комісія ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="0.0"
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5 flex items-center justify-between">
                    <span>Фандінг ($)</span>
                    <span className="text-[10px] text-purple-200/40">+/-</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={funding}
                    onChange={(e) => setFunding(e.target.value)}
                    placeholder="0.0"
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* R:R live indicator */}
              {liveRR !== null && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between text-xs">
                  <span className="text-purple-200/60">Реалізований Risk / Reward (R-Multiple):</span>
                  <span className={`font-mono font-bold ${liveRR >= 0 ? 'text-[#c49bff]' : 'text-rose-400'}`}>
                    {liveRR > 0 ? `+${liveRR}R` : `${liveRR}R`}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label
                    htmlFor="trade-entry-date"
                    className="block text-xs font-medium text-purple-200/70 mb-1.5 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#c49bff]" />
                    <span>Час відкриття</span>
                  </label>
                  <GlassDateTimePicker
                    id="trade-entry-date"
                    value={entryDate}
                    onChange={setEntryDate}
                    placeholder="Оберіть дату та час"
                  />
                </div>

                <div>
                  <label
                    htmlFor="trade-exit-date"
                    className="block text-xs font-medium text-purple-200/70 mb-1.5 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#c49bff]" />
                    <span>Час закриття</span>
                  </label>
                  <GlassDateTimePicker
                    id="trade-exit-date"
                    disabled={status !== 'CLOSED'}
                    value={exitDate}
                    onChange={setExitDate}
                    allowClear
                    placeholder={status === 'CLOSED' ? 'Оберіть дату та час' : 'Лише для закритої угоди'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 3: NOTES, DISCIPLINE & CHART ==================== */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Tags with quick clickable chips */}
              <div>
                <label className="block text-xs font-medium text-purple-200/70 mb-1.5 flex items-center space-x-1.5">
                  <TagIcon className="w-3.5 h-3.5 text-[#c49bff]" />
                  <span>Теги / Сетапи</span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Breakout, SupportBounce, FVG..."
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white placeholder-purple-200/35"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_TAGS.map((qt) => {
                    const active = tags
                      .split(',')
                      .map((t) => t.trim())
                      .includes(qt);
                    return (
                      <button
                        key={qt}
                        type="button"
                        onClick={() => toggleQuickTag(qt)}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${
                          active
                            ? 'bg-[#c49bff] text-[#110820] border-[#c49bff] font-semibold'
                            : 'bg-white/[0.03] text-purple-200/60 border-white/[0.07] hover:text-white'
                        }`}
                      >
                        #{qt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Setup & Post-trade notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Причини входу (Сетап)</label>
                  <textarea
                    rows={3}
                    value={setupNotes}
                    onChange={(e) => setSetupNotes(e.target.value)}
                    placeholder="Рівень, об'єми, ліквідність..."
                    className="glass-input w-full rounded-xl p-2.5 text-xs text-white placeholder-purple-200/35"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-purple-200/70 mb-1.5">Ретроспектива та висновки</label>
                  <textarea
                    rows={3}
                    value={postTradeNotes}
                    onChange={(e) => setPostTradeNotes(e.target.value)}
                    placeholder="Помилки, емоції, уроки..."
                    className="glass-input w-full rounded-xl p-2.5 text-xs text-white placeholder-purple-200/35"
                  />
                </div>
              </div>

              {/* Discipline compact box */}
              <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followedRules}
                    onChange={(e) => setFollowedRules(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-[#c49bff] focus:ring-0 w-4 h-4"
                  />
                  <span className="text-xs text-purple-100/85 flex items-center gap-1.5">
                    {followedRules ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#c49bff]" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>Дотримався правил плану</span>
                  </span>
                </label>

                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDisciplineRating(star)}
                      className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= disciplineRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-white/15'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Screenshot / Chart URL */}
              <div>
                <label className="block text-xs font-medium text-purple-200/70 mb-1.5 flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#c49bff]" />
                  <span>Графік / Скріншот</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chartUrl}
                    onChange={(e) => setChartUrl(e.target.value)}
                    placeholder="Посилання на TradingView або файл"
                    className="glass-input flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-200/35"
                  />
                  <label className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-purple-100 rounded-xl text-xs font-medium cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? '...' : 'Файл'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                {chartUrl && (
                  <div className="mt-1.5 text-[11px] text-[#c49bff] truncate">
                    Прикріплено: {chartUrl}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== WIZARD FOOTER ==================== */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.07]">
            <div>
              {step === 1 ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-purple-200/75 text-xs font-medium transition-colors"
                >
                  Скасувати
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep((prev) => (prev === 3 ? 2 : 1));
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-purple-200/80 text-xs font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2.5">
              {step < 3 && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveSubmit()}
                    className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-100 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Збереження...' : 'Зберегти зараз'}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="accent-pill inline-flex items-center space-x-1.5 px-5 py-2 rounded-full text-xs font-bold"
                  >
                    <span>Далі</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {step === 3 && (
                <button
                  type="submit"
                  disabled={saving}
                  className="accent-pill px-5 py-2 rounded-full text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Збереження...' : isEditing ? 'Оновити угоду' : 'Зберегти угоду'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

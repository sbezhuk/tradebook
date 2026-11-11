import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

interface GlassDateTimePickerProps {
  id?: string;
  value: string; // Local YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
}

const UK_MONTHS = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
];

const UK_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad2 = (n: number) => String(n).padStart(2, '0');

const parseLocalValue = (val: string): Date | null => {
  if (!val) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(val);
  if (match) {
    const [, y, m, d, h, min] = match;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const fallback = new Date(val);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatLocalValue = (date: Date): string => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
};

const formatDisplayValue = (date: Date): string => {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}, ${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const GlassDateTimePicker: React.FC<GlassDateTimePickerProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'Оберіть дату та час',
  allowClear = false,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedHourRef = useRef<HTMLButtonElement>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement>(null);

  const selectedDate = useMemo(() => parseLocalValue(value), [value]);
  const initialView = selectedDate ?? new Date();
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 364,
  });

  // Sync displayed calendar month when value changes externally or picker opens
  useEffect(() => {
    if (open) {
      const target = selectedDate ?? new Date();
      setViewYear(target.getFullYear());
      setViewMonth(target.getMonth());
    }
  }, [open, selectedDate]);

  // Close if disabled turns true
  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
    }
  }, [disabled, open]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const desiredWidth = Math.min(364, window.innerWidth - margin * 2);
    const estimatedHeight = window.innerWidth < 640 ? 450 : 336;

    let left = rect.left;
    if (left + desiredWidth > window.innerWidth - margin) {
      left = window.innerWidth - desiredWidth - margin;
    }
    if (left < margin) left = margin;

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    let top = rect.bottom + 8;
    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      top = Math.max(margin, rect.top - estimatedHeight - 8);
    } else if (top + estimatedHeight > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - estimatedHeight - margin);
    }

    setCoords({ top, left, width: desiredWidth });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  // Scroll active hour/minute into view when opening
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      selectedHourRef.current?.scrollIntoView({ block: 'center' });
      selectedMinuteRef.current?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
    const startDate = new Date(viewYear, viewMonth, 1 - startWeekday);

    return Array.from({ length: 42 }, (_, idx) => {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + idx);
      return {
        date: d,
        inCurrentMonth: d.getMonth() === viewMonth,
      };
    });
  }, [viewYear, viewMonth]);

  const now = new Date();
  const activeHour = selectedDate ? selectedDate.getHours() : now.getHours();
  const activeMinute = selectedDate ? selectedDate.getMinutes() : now.getMinutes();

  const handleSelectDay = (day: Date) => {
    const base = selectedDate ?? new Date();
    const next = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      base.getHours(),
      base.getMinutes()
    );
    onChange(formatLocalValue(next));
    if (day.getMonth() !== viewMonth || day.getFullYear() !== viewYear) {
      setViewYear(day.getFullYear());
      setViewMonth(day.getMonth());
    }
  };

  const handleSelectHour = (hour: number) => {
    const base = selectedDate ?? new Date();
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      hour,
      base.getMinutes()
    );
    onChange(formatLocalValue(next));
  };

  const handleSelectMinute = (minute: number) => {
    const base = selectedDate ?? new Date();
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      base.getHours(),
      minute
    );
    onChange(formatLocalValue(next));
  };

  const handleSetNow = () => {
    const current = new Date();
    onChange(formatLocalValue(current));
    setViewYear(current.getFullYear());
    setViewMonth(current.getMonth());
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`glass-input w-full rounded-xl px-3 py-2.5 text-xs flex items-center justify-between gap-2 text-left transition-all select-none ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${open ? 'border-[#c49bff]/60 ring-2 ring-[#c49bff]/20' : ''}`}
      >
        <span className={`truncate font-medium ${selectedDate ? 'text-white' : 'text-purple-200 opacity-50'}`}>
          {selectedDate ? formatDisplayValue(selectedDate) : placeholder}
        </span>
        <Calendar
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            open ? 'text-[#c49bff]' : 'text-purple-200 opacity-65'
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className="fixed z-[120] glass-popover rounded-2xl p-3.5 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Calendar Grid */}
              <div className="flex-1 min-w-0">
                {/* Month / Year header */}
                <div className="flex items-center justify-between mb-2.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Попередній місяць"
                    className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-xs font-bold text-white tracking-tight">
                    {UK_MONTHS[viewMonth]} {viewYear}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Наступний місяць"
                    className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {UK_WEEKDAYS.map((wd) => (
                    <div
                      key={wd}
                      className="text-center text-[10px] font-semibold uppercase tracking-wider text-purple-200 opacity-60 py-1"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(({ date, inCurrentMonth }) => {
                    const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                    const today = isSameDay(date, now);
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => handleSelectDay(date)}
                        className={`h-7 w-full rounded-lg text-[11px] font-medium flex items-center justify-center transition-all cursor-pointer ${
                          selected
                            ? 'accent-pill font-bold'
                            : today
                            ? 'border border-[#c49bff]/55 text-[#c49bff] font-bold hover:bg-white/[0.08]'
                            : inCurrentMonth
                            ? 'text-purple-100 hover:text-white hover:bg-white/[0.08]'
                            : 'text-purple-200 opacity-35 hover:opacity-75 hover:bg-white/[0.06]'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 24h Time Columns */}
              <div className="sm:w-[116px] sm:border-l border-t sm:border-t-0 border-white/[0.08] pt-2.5 sm:pt-0 sm:pl-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-200 opacity-65 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#c49bff]" />
                    Час
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#c49bff]">
                    {pad2(activeHour)}:{pad2(activeMinute)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 h-[136px] sm:h-[196px]">
                  {/* Hours */}
                  <div className="overflow-y-auto pr-0.5 space-y-0.5">
                    {HOURS.map((h) => {
                      const isSel = h === activeHour;
                      return (
                        <button
                          key={h}
                          ref={isSel ? selectedHourRef : undefined}
                          type="button"
                          onClick={() => handleSelectHour(h)}
                          className={`w-full py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                            isSel
                              ? 'accent-pill font-bold'
                              : 'text-purple-100 hover:text-white hover:bg-white/[0.08]'
                          }`}
                        >
                          {pad2(h)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Minutes */}
                  <div className="overflow-y-auto pr-0.5 space-y-0.5">
                    {MINUTES.map((m) => {
                      const isSel = m === activeMinute;
                      return (
                        <button
                          key={m}
                          ref={isSel ? selectedMinuteRef : undefined}
                          type="button"
                          onClick={() => handleSelectMinute(m)}
                          className={`w-full py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                            isSel
                              ? 'accent-pill font-bold'
                              : 'text-purple-100 hover:text-white hover:bg-white/[0.08]'
                          }`}
                        >
                          {pad2(m)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetNow}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#c49bff] bg-[#c49bff]/12 hover:bg-[#c49bff]/20 border border-[#c49bff]/25 transition-colors cursor-pointer"
                >
                  Зараз
                </button>
                {allowClear && value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setOpen(false);
                    }}
                    className="p-1 rounded-lg text-purple-200 hover:text-rose-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
                    title="Очистити"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="accent-pill px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
              >
                Готово
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

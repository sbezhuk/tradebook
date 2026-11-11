import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface GlassSelectOption {
  value: string;
  label: string;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  variant?: 'pill' | 'field';
  highlight?: boolean;
  className?: string;
  menuAlign?: 'left' | 'right';
  menuDirection?: 'down' | 'up';
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  value,
  onChange,
  options,
  variant = 'pill',
  highlight = false,
  className = '',
  menuAlign = 'left',
  menuDirection = 'down',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const triggerBase =
    variant === 'pill'
      ? `glass-input h-9 px-3.5 rounded-full inline-flex items-center justify-between gap-2 text-xs font-medium whitespace-nowrap cursor-pointer select-none ${
          highlight ? 'border-[#c49bff]/45 text-[#e2ccff]' : 'text-purple-100'
        }`
      : `glass-input w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs font-medium cursor-pointer select-none text-white`;

  return (
    <div ref={containerRef} className={`relative ${variant === 'field' ? 'w-full' : 'inline-block'} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${triggerBase} ${open ? 'border-[#c49bff]/60 ring-2 ring-[#c49bff]/20' : ''}`}
      >
        <span className="truncate">{selectedOption?.label ?? ''}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 opacity-65 transition-transform duration-200 ${
            open ? 'rotate-180 opacity-100 text-[#c49bff]' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute min-w-full w-max max-w-[240px] glass-popover rounded-2xl p-1.5 z-50 max-h-64 overflow-y-auto ${
            menuDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${menuAlign === 'right' ? 'right-0' : 'left-0'}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#c49bff]/18 text-[#c49bff] font-semibold'
                    : 'text-purple-100/85 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-[#c49bff]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

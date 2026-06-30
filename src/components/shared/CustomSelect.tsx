import { useState, useRef, useEffect, type ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;       // shown in the closed trigger
  node?: ReactNode;    // optional richer rendering in the open dropdown
}

interface DropdownPos {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
  maxHeight: number;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

const MAX_HEIGHT = 260;
const GAP = 4;
const MARGIN = 8;

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Auswählen …',
  disabled = false,
  size = 'md',
  ariaLabel,
  className = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const openDropdown = () => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) { setOpen(true); return; }

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;

    // Prefer below; flip above only when below is tight AND above has more room
    const openAbove = spaceBelow < 120 && spaceAbove > spaceBelow;

    // Clamp left so the dropdown doesn't overflow the right edge
    const minWidth = rect.width;
    const left = Math.min(rect.left, vw - minWidth - MARGIN);

    setPos(
      openAbove
        ? {
            bottom: vh - rect.top + GAP,
            left: Math.max(MARGIN, left),
            minWidth,
            maxHeight: Math.min(MAX_HEIGHT, spaceAbove),
          }
        : {
            top: rect.bottom + GAP,
            left: Math.max(MARGIN, left),
            minWidth,
            maxHeight: Math.min(MAX_HEIGHT, spaceBelow),
          }
    );
    setOpen(true);
  };

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) close();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const sizeClass = size === 'sm' ? ' form-input--sm custom-select__trigger--sm' : '';

  return (
    <div className={`custom-select${className ? ' ' + className : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select__trigger form-input${sizeClass}`}
        onClick={open ? close : openDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="custom-select__label">
          {selected?.label ?? <span className="custom-select__placeholder">{placeholder}</span>}
        </span>
        <span className="custom-select__chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && pos && (
        <div
          ref={dropdownRef}
          className="custom-select__dropdown"
          role="listbox"
          aria-label={ariaLabel}
          style={{
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            minWidth: pos.minWidth,
            maxHeight: pos.maxHeight,
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`custom-select__option${opt.value === value ? ' custom-select__option--active' : ''}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); close(); }}
            >
              {opt.node ?? opt.label}
              {opt.value === value && (
                <span className="custom-select__check" aria-hidden="true">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

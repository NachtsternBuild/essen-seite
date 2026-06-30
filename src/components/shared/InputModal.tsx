import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';

interface InputModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  label: string;
  defaultValue?: string;
  type?: 'text' | 'password';
  placeholder?: string;
  confirmLabel?: string;
}

export function InputModal({
  open,
  onClose,
  onConfirm,
  title,
  label,
  defaultValue = '',
  type = 'text',
  placeholder = '',
  confirmLabel = 'Bestätigen',
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    if (!value.trim()) return;
    onConfirm(value.trim());
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="btn btn--primary"
            onClick={handleConfirm}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label" htmlFor="input-modal-field">
          {label}
        </label>
        <input
          id="input-modal-field"
          ref={inputRef}
          className="form-input"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          autoComplete={type === 'password' ? 'new-password' : 'off'}
        />
      </div>
    </Modal>
  );
}

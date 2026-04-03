import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const baseInput = 'w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150 disabled:bg-surface-secondary disabled:cursor-not-allowed';

export function Input({ label, error, hint, leftIcon, rightIcon, icon, iconRight, className = '', ...props }: InputProps) {
  const resolvedLeft = leftIcon || icon;
  const resolvedRight = rightIcon || iconRight;
  const id = props.id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-ink-secondary mb-1.5">{label}</label>}
      <div className="relative">
        {resolvedLeft && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">{resolvedLeft}</span>}
        <input
          id={id}
          {...props}
          className={`${baseInput} ${resolvedLeft ? 'pl-10' : ''} ${resolvedRight ? 'pr-10' : ''} ${error ? 'border-danger focus:ring-danger/20 focus:border-danger' : ''} ${className}`}
        />
        {resolvedRight && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted">{resolvedRight}</span>}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

interface SelectOption { value: string; label: string; }
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className = '', ...props }: SelectProps) {
  const id = props.id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-ink-secondary mb-1.5">{label}</label>}
      <select
        id={id}
        {...props}
        className={`${baseInput} appearance-none cursor-pointer ${error ? 'border-danger focus:ring-danger/20' : ''} ${className}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  const id = props.id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-ink-secondary mb-1.5">{label}</label>}
      <textarea
        id={id}
        {...props}
        className={`${baseInput} resize-none min-h-[100px] ${error ? 'border-danger focus:ring-danger/20' : ''} ${className}`}
      />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

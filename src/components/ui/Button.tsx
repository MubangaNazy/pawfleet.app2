import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-600 shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary: 'bg-surface-hover text-ink hover:bg-surface-border border border-surface-border active:scale-[0.98]',
  danger: 'bg-danger text-white hover:bg-danger-dark shadow-sm active:scale-[0.98]',
  ghost: 'text-ink-secondary hover:bg-surface-hover hover:text-ink active:scale-[0.98]',
  success: 'bg-success text-white hover:opacity-90 shadow-sm active:scale-[0.98]',
  outline: 'border border-primary text-primary hover:bg-primary-50 active:scale-[0.98]',
};

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', loading, icon, iconRight, fullWidth, children, disabled, className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

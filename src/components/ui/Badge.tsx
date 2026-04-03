import React from 'react';
import { WalkStatus, PaymentStatus, Role } from '../../types';

interface StatusBadgeProps { status: WalkStatus; }
interface PaymentBadgeProps { status: PaymentStatus; }
interface RoleBadgeProps { role: Role; }

const walkColors: Record<WalkStatus, string> = {
  pending: 'bg-warning-light text-warning-dark border-warning/30',
  assigned: 'bg-info-light text-info-dark border-info/30',
  active: 'bg-success-light text-success-dark border-success/30',
  completed: 'bg-primary-50 text-primary-700 border-primary/20',
  cancelled: 'bg-danger-light text-danger-dark border-danger/30',
};

const walkLabels: Record<WalkStatus, string> = {
  pending: 'Pending', assigned: 'Assigned', active: 'Active', completed: 'Completed', cancelled: 'Cancelled',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${walkColors[status]}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />}
      {walkLabels[status]}
    </span>
  );
}

export function PaymentBadge({ status }: PaymentBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status === 'paid' ? 'bg-success-light text-success-dark border-success/30' : 'bg-warning-light text-warning-dark border-warning/30'}`}>
      {status === 'paid' ? 'Paid' : 'Unpaid'}
    </span>
  );
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const colors: Record<Role, string> = {
    admin: 'bg-danger-light text-danger-dark border-danger/30',
    walker: 'bg-info-light text-info-dark border-info/30',
    owner: 'bg-primary-50 text-primary-700 border-primary/20',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[role]}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

// Keep backward compat export
export { StatusBadge as Badge };

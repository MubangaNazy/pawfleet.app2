import type { User, ServiceKey, ApprovalStatus } from '../types';

// Walkers, groomers and trainers share one provider account (role 'walker' in the database) so they
// all use the same jobs, chat and live tracking. What each person may actually do is decided by a
// separate admin approval per service (users.approvals). Approving walking never makes someone a
// groomer, and a grooming company approved only for grooming never receives walk requests.

export const SERVICE_LABEL: Record<ServiceKey, string> = {
  walking: 'Dog walking',
  grooming: 'Grooming',
  training: 'Training',
  breeder: 'Breeder / shelter',
};

export function approval(u: User | null | undefined, key: ServiceKey): ApprovalStatus | undefined {
  return u?.approvals?.[key];
}

const accountActive = (u: User) => !u.walkerStatus || u.walkerStatus === 'active';

/** Approved provider for a service, with an active account. */
export function isApproved(u: User | null | undefined, key: ServiceKey): boolean {
  if (!u) return false;
  if (key === 'breeder') return approval(u, 'breeder') === 'approved';
  return u.role === 'walker' && accountActive(u) && approval(u, key) === 'approved';
}

export const isWalker = (u: User | null | undefined) => isApproved(u, 'walking');
/** Approved for grooming and has set a grooming price, so owners can book them. */
export const isGroomer = (u: User | null | undefined) => isApproved(u, 'grooming') && u?.pricing?.grooming != null;
export const isTrainer = (u: User | null | undefined) => isApproved(u, 'training');
export const isBreeder = (u: User | null | undefined) => isApproved(u, 'breeder');

/** What to call a provider account in the app. */
export function providerTitle(u: User | null | undefined): string {
  if (!u) return 'Provider';
  const walk = approval(u, 'walking');
  const groom = approval(u, 'grooming');
  if (groom && !walk) return u.businessName ? 'Grooming business' : 'Groomer';
  if (walk && groom === 'approved') return 'Walker & groomer';
  return 'Walker';
}

/** Grooming-only provider (no walking at all), e.g. a grooming company. */
export const isGroomingOnly = (u: User | null | undefined) =>
  !!u && u.role === 'walker' && !!approval(u, 'grooming') && !approval(u, 'walking');

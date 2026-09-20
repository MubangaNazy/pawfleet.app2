import type { GroomArt } from '../components/ui/GroomIllustrations';

/** One list of grooming packages, used by both the Services page and the booking form so they never disagree. */
export interface GroomPackage {
  id: string;
  label: string;
  desc: string;
  price: number;
  minutes: number;
  includes: string[];
  art: GroomArt | null;
  icon: string;
  isVet: boolean;
  tag?: string;
}

export const GROOM_PACKAGES: GroomPackage[] = [
  {
    id: 'bath_brush', label: 'Bath & Brush', desc: 'Shampoo, blow-dry, brush-out',
    price: 249, minutes: 45, art: 'bath', icon: '🛁', isVet: false,
    includes: ['Warm bath with pet-safe shampoo', 'Blow-dry and full brush-out', 'Ear wipe and face clean'],
  },
  {
    id: 'full_groom', label: 'Full Groom', desc: 'Bath, trim, nail clip, ear clean',
    price: 399, minutes: 90, art: 'groom', icon: '💅', isVet: false, tag: 'Most popular',
    includes: ['Everything in Bath & Brush', 'Breed-appropriate haircut and trim', 'Nail clip and paw tidy', 'Deep ear clean'],
  },
  {
    id: 'nail_trim', label: 'Nail Trim Only', desc: 'Quick nail clip & file',
    price: 99, minutes: 15, art: 'nails', icon: '✂️', isVet: false,
    includes: ['Nail clip and file', 'Paw pad check', 'Quick and calm, no bath needed'],
  },
  {
    id: 'spa', label: 'Pamper Spa', desc: 'Full groom + teeth clean + paw massage',
    price: 599, minutes: 120, art: 'spa', icon: '✨', isVet: false, tag: 'Premium',
    includes: ['Everything in Full Groom', 'Teeth cleaning', 'Paw massage and balm', 'Coat conditioning treatment'],
  },
  {
    id: 'vet_groom', label: 'Vet Clinic Grooming', desc: 'Professional grooming at a partner vet clinic — includes a health check',
    price: 450, minutes: 90, art: null, icon: '🏥', isVet: true,
    includes: ['Grooming at a partner vet clinic', 'Health check included'],
  },
];

export type PlanId = 'monthly' | 'fortnightly';

export interface GroomPlan {
  id: PlanId;
  label: string;
  visits: string;
  discountPct: number;
  art: GroomArt;
  blurb: string;
}

/** Plan pricing is a discount on every visit. The first visit is booked now; later visits are rebooked at the plan price. */
export const GROOM_PLANS: GroomPlan[] = [
  { id: 'monthly', label: 'Monthly plan', visits: '1 groom every month', discountPct: 10, art: 'plan-monthly', blurb: 'Keeps most coats fresh and tangle-free.' },
  { id: 'fortnightly', label: 'Twice-a-month plan', visits: '2 grooms every month', discountPct: 15, art: 'plan-fortnightly', blurb: 'Best for long-haired breeds and show-ready coats.' },
];

export const planPrice = (price: number, plan: PlanId | '' | null | undefined): number => {
  const p = GROOM_PLANS.find(x => x.id === plan);
  return p ? Math.round(price * (1 - p.discountPct / 100)) : price;
};

export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m} min`);

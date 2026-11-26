// Care plans shown on the home screen (Services) and the plan pages.
//
// SAMPLE VALUES. Prices, visit counts and durations below are placeholders for the preview, not final
// pricing. When the plans system ships (plan_definitions table, see the launch plan), these move to the
// database so admins can change them without a new app build.

export type PlanId = 'dog-care' | 'grooming' | 'walking';

export interface PlanOption {
  label: string;
  price: number;          // ZMW
  per: string;            // "month", "visit", ...
  details: string[];
}

export interface PlanDef {
  id: PlanId;
  title: string;
  image: string;
  tagline: string;
  includes: string[];
  options: PlanOption[];
  /** Where "Book a session" goes today, before plan checkout exists. Null = not bookable yet. */
  bookPath: string | null;
  bookLabel: string;
}

export const SAMPLE_PRICING = true;

export const PLANS: PlanDef[] = [
  {
    id: 'dog-care',
    title: 'Dog Care Plan',
    image: '/images/plans/dog-care.webp',
    tagline: 'A trusted carer drops in at your home while you are at work or away.',
    includes: [
      'Feeding and fresh water',
      'Bathroom break and a short play',
      'Check-in photo and note after every visit',
      'Your care notes, emergency contact and home access shared only with the assigned carer',
    ],
    options: [
      { label: 'Recurring care', price: 900, per: 'month', details: ['12 visits a month', '30 minutes per visit', 'Choose your days'] },
      { label: 'Vacation & short-term', price: 120, per: 'visit', details: ['Pick start and end dates', '1 to 3 visits a day', 'See the trip total before you pay'] },
    ],
    bookPath: null,
    bookLabel: 'Launching soon',
  },
  {
    id: 'grooming',
    title: 'Grooming Plan',
    image: '/images/plans/grooming.webp',
    tagline: 'Regular grooms on a schedule that suits your dog’s coat.',
    includes: [
      'Bath, blow-dry and brush-out',
      'Nail trim and ear clean',
      'Choose your groomer and time',
      'Extras and size adjustments shown before you pay',
    ],
    options: [
      { label: 'Monthly', price: 359, per: 'month', details: ['1 full groom a month', 'About 90 minutes'] },
      { label: 'Fortnightly', price: 680, per: 'month', details: ['2 full grooms a month', 'About 90 minutes each'] },
    ],
    bookPath: '/owner/grooming',
    bookLabel: 'Book a groom',
  },
  {
    id: 'walking',
    title: 'Dog Walking Plan',
    image: '/images/plans/walking.webp',
    tagline: 'Regular walks with a vetted walker, tracked live on the map.',
    includes: [
      'Live GPS tracking of every walk',
      'Pickup photo and photo updates during the walk',
      'Chat with your walker',
      'Your leash and handling notes shared with the walker',
    ],
    options: [
      { label: '3 walks a week', price: 1500, per: 'month', details: ['12 walks a month', '30 minutes each'] },
      { label: 'Every weekday', price: 2400, per: 'month', details: ['20 walks a month', '30 minutes each'] },
    ],
    bookPath: '/owner/request',
    bookLabel: 'Book a walk',
  },
];

export const getPlan = (id: string | undefined) => PLANS.find(p => p.id === id);

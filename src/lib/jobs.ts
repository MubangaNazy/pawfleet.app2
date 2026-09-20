import type { User, Walk } from '../types';

/**
 * Not every open booking is a dog walk. Vet visits and training requests are handled by vets and trainers,
 * and grooming by groomers, so a walker should only see the open jobs they can actually take.
 */
export function canWalkerTakeOpenJob(walk: Pick<Walk, 'notes'>, walker?: Pick<User, 'pricing'> | null): boolean {
  const notes = walk.notes ?? '';
  if (/^VET BOOKING:/.test(notes)) return notes.includes('Walker transport requested'); // only the drive to the clinic
  if (/^TRAINING:/.test(notes)) return (walker?.pricing as any)?.trainerStatus === 'approved';
  return true;
}

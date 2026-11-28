import type { Walk } from '../types';

/**
 * A vet booking that belongs to this vet. The booking names the clinic as `walkerId`, but when a walker
 * accepts the transport job `walkerId` becomes the walker, so the clinic is also kept as a `VetId:` line.
 * Admins see every booking elsewhere; a vet only ever sees their own clinic's.
 */
export function isVetBookingFor(w: Walk, vetId: string | undefined): boolean {
  if (!vetId || !/^VET BOOKING:/.test(w.notes ?? '')) return false;
  return w.walkerId === vetId || (w.notes ?? '').includes(`VetId: ${vetId}`);
}

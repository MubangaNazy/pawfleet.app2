import type { User, Walk } from '../types';
import { isValidCoord, haversineKm, type LatLng } from './geo';

/**
 * Not every open booking is a dog walk. Vet visits and training requests are handled by vets and trainers,
 * and pure grooming jobs by groomers, so a walker should only see the open jobs they can actually take.
 */
export function canWalkerTakeOpenJob(walk: Pick<Walk, 'notes'>, walker?: Pick<User, 'pricing' | 'approvals'> | null): boolean {
  const notes = walk.notes ?? '';
  const ok = (k: 'walking' | 'grooming' | 'training') => walker?.approvals?.[k] === 'approved';
  if (/^VET BOOKING:/.test(notes)) return notes.includes('Walker transport requested') && ok('walking'); // only the drive to the clinic
  if (/^TRAINING:/.test(notes)) return ok('training');
  if (/^(HOME_|VET_)?GROOMING:/.test(notes)) return ok('grooming') && walker?.pricing?.grooming != null; // approved groomers only
  if (/Add-on: Grooming requested/.test(notes)) return ok('walking') && ok('grooming'); // walk + groom: needs both
  return ok('walking'); // plain walks: approved walkers only (a grooming company never gets these)
}

/** Straight-line distance from a walker's reference point to a job's pickup, in km. Null when either is unknown. */
export function openJobDistanceKm(job: { startLocation?: { lat?: number; lng?: number } }, walkerPos: LatLng | null): number | null {
  if (!walkerPos || !isValidCoord(job.startLocation?.lat, job.startLocation?.lng)) return null;
  return haversineKm(walkerPos, [job.startLocation!.lat!, job.startLocation!.lng!]);
}

/** Open jobs sorted nearest-first when a position is known; jobs with no pickup location sort last. */
export function sortByDistance<T extends { startLocation?: { lat?: number; lng?: number } }>(jobs: T[], walkerPos: LatLng | null): (T & { _distKm: number | null })[] {
  return jobs
    .map(j => ({ ...j, _distKm: openJobDistanceKm(j, walkerPos) }))
    .sort((a, b) => {
      if (a._distKm == null && b._distKm == null) return 0;
      if (a._distKm == null) return 1;
      if (b._distKm == null) return -1;
      return a._distKm - b._distKm;
    });
}

import { supabase } from './supabase';
import { uploadDataUrlToStorage } from './image';

export type AdoptionStatus = 'pending' | 'approved' | 'rejected' | 'adopted';

export interface AdoptionListing {
  id: string;
  listerId: string;
  name: string;
  animalType: 'dog' | 'other';
  breed: string;
  ageMonths: number | null;
  sex: 'male' | 'female' | 'unknown' | null;
  size: 'small' | 'medium' | 'large' | null;
  traits: string[];
  description: string;
  photoUrl: string;
  location: string;
  contactPhone: string;
  vaccinated: boolean;
  sterilised: boolean;
  adoptionFee: number | null;
  status: AdoptionStatus;
  rejectReason: string;
  createdAt: string;
}

export const TRAIT_OPTIONS = [
  'Friendly', 'Playful', 'Calm', 'Gentle', 'Loyal', 'Energetic', 'Good with kids',
  'Good with other dogs', 'House trained', 'Protective', 'Shy at first', 'Cuddly',
];

const fromRow = (r: any): AdoptionListing => ({
  id: r.id, listerId: r.lister_id, name: r.name, animalType: r.animal_type === 'other' ? 'other' : 'dog',
  breed: r.breed || '', ageMonths: r.age_months ?? null, sex: r.sex ?? null, size: r.size ?? null,
  traits: r.traits || [], description: r.description || '', photoUrl: r.photo_url || '',
  location: r.location || '', contactPhone: r.contact_phone || '', vaccinated: !!r.vaccinated,
  sterilised: !!r.sterilised, adoptionFee: r.adoption_fee == null ? null : Number(r.adoption_fee),
  status: r.status, rejectReason: r.reject_reason || '', createdAt: r.created_at,
});

export function ageLabel(months: number | null): string {
  if (months == null) return 'Age unknown';
  if (months < 1) return 'Under 1 month';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const y = Math.floor(months / 12);
  return `${y} yr${y === 1 ? '' : 's'}`;
}

export const missingTable = (msg?: string) => /adoption_listings|relation .* does not exist|schema cache/i.test(msg || '');

export async function fetchListings(): Promise<{ data: AdoptionListing[]; error?: string }> {
  const { data, error } = await supabase.from('adoption_listings').select('*').order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data || []).map(fromRow) };
}

export interface NewListing {
  name: string; animalType: 'dog' | 'other'; breed: string; ageMonths: number | null;
  sex: 'male' | 'female' | 'unknown'; size: 'small' | 'medium' | 'large';
  traits: string[]; description: string; photoDataUrl: string; location: string;
  contactPhone: string; vaccinated: boolean; sterilised: boolean; adoptionFee: number | null;
}

export async function createListing(listerId: string, l: NewListing): Promise<{ data?: AdoptionListing; error?: string }> {
  // Older Android WebViews have no crypto.randomUUID.
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
  let photoUrl = '';
  if (l.photoDataUrl) {
    photoUrl = (await uploadDataUrlToStorage('pet-images', `adopt/${id}.jpg`, l.photoDataUrl)) || '';
    if (!photoUrl) return { error: 'Could not upload the photo. Check your connection and try again.' };
  }
  const { data, error } = await supabase.from('adoption_listings').insert({
    id, lister_id: listerId, name: l.name.trim(), animal_type: l.animalType, breed: l.breed.trim() || null,
    age_months: l.ageMonths, sex: l.sex, size: l.size, traits: l.traits, description: l.description.trim() || null,
    photo_url: photoUrl || null, location: l.location.trim() || null, contact_phone: l.contactPhone.trim(),
    vaccinated: l.vaccinated, sterilised: l.sterilised, adoption_fee: l.adoptionFee, status: 'pending',
  }).select('*').single();
  if (error) return { error: missingTable(error.message) ? 'Adopt a Pet is still being set up. Please try again later.' : error.message };
  return { data: fromRow(data) };
}

export async function setListingStatus(id: string, status: AdoptionStatus, rejectReason?: string): Promise<string | null> {
  const { error } = await supabase.from('adoption_listings')
    .update({ status, reject_reason: rejectReason ?? null }).eq('id', id);
  return error ? error.message : null;
}

export async function deleteListing(id: string): Promise<string | null> {
  const { error } = await supabase.from('adoption_listings').delete().eq('id', id);
  return error ? error.message : null;
}

// Favourites stay on this phone (no account data needed for a heart).
const FAV_KEY = 'pawfleet_adopt_favs';
export function loadFavs(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}
export function saveFavs(ids: string[]) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch { /* private mode */ }
}

export const whatsappLink = (phone: string, petName: string) => {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) d = `260${d.slice(1)}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(`Hi, I saw ${petName} on PawFleet Adopt a Pet. Is ${petName} still looking for a home?`)}`;
};

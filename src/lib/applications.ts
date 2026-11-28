// What each provider type must tell PawFleet when applying, in one place: the sign-up screen, the in-app
// "apply" sheets and the admin review screens all read these definitions.
//
// The questions follow common responsible-breeding / shelter / grooming / training standards, adapted
// for Zambia: who they are (NRC or PACRA is collected separately), where the dogs live, a vet reference,
// health practice (vaccination, deworming, health card, minimum rehoming age of 8 weeks), and a pledge.
import { uploadDataUrlToStorage } from './image';
import type { ServiceKey } from '../types';

export type ApplyService = Extract<ServiceKey, 'breeder' | 'grooming' | 'training'>;
export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'multi' | 'yesno' | 'photo';
export type ApplicationValues = Record<string, string | number | boolean | string[] | undefined>;

/** isBusiness: shelter / rescue (breeder form) or grooming business (groomer form). */
export interface AppCtx { isBusiness: boolean }

export interface AppField {
  key: string;
  label: string | ((c: AppCtx) => string);
  type: FieldType;
  options?: string[];
  placeholder?: string;
  help?: string;
  required?: boolean | ((v: ApplicationValues, c: AppCtx) => boolean);
  showIf?: (v: ApplicationValues, c: AppCtx) => boolean;
  /** Extra check, returns an error message or null. */
  validate?: (v: ApplicationValues, c: AppCtx) => string | null;
}

export interface ApplicationForm {
  title: string;
  intro: string;
  fields: AppField[];
  pledge: string[];
}

const breeder = (_: ApplicationValues, c: AppCtx) => !c.isBusiness;
const shelter = (_: ApplicationValues, c: AppCtx) => c.isBusiness;

export const APPLICATION_FORMS: Record<ApplyService, ApplicationForm> = {
  breeder: {
    title: 'Breeder / shelter details',
    intro: 'Only checked breeders and shelters can list dogs. These answers help PawFleet check that dogs are bred and kept responsibly.',
    fields: [
      { key: 'breeds', label: 'Breeds you breed', type: 'text', placeholder: 'e.g. Boerboel, German Shepherd', required: breeder, showIf: breeder },
      { key: 'yearsExperience', label: c => (c.isBusiness ? 'Years the shelter has operated' : 'Years breeding dogs'), type: 'number', required: true },
      { key: 'breedingFemales', label: 'Breeding females you keep', type: 'number', required: breeder, showIf: breeder },
      { key: 'littersPerYear', label: 'Litters per year (all your dogs)', type: 'number', required: breeder, showIf: breeder },
      { key: 'dogsInCare', label: 'Dogs in your care right now', type: 'number', required: shelter, showIf: shelter },
      { key: 'premises', label: 'Where the dogs live', type: 'select', options: ['At my home', 'Dedicated kennels', 'Farm / plot', 'Shelter facility'], required: true },
      { key: 'registrationNo', label: c => (c.isBusiness ? 'NGO / society registration number' : 'Kennel club or breed society membership (if any)'), type: 'text', required: shelter },
      { key: 'councilLicence', label: 'Council dog licence or kennel permit number (if any)', type: 'text' },
      { key: 'vetName', label: 'Your vet (name and clinic)', type: 'text', placeholder: 'e.g. Dr Banda, Kabulonga Vet Clinic', required: true, help: 'PawFleet may call your vet as a reference.' },
      { key: 'vetPhone', label: "Vet's phone number", type: 'text', placeholder: '0977 000 000', required: true },
      { key: 'vaccinated', label: c => (c.isBusiness ? 'Are dogs vaccinated and dewormed before adoption?' : 'Are puppies vaccinated and dewormed before going home?'), type: 'yesno', required: true },
      { key: 'healthCard', label: 'Do you give a vaccination / health card with each dog?', type: 'yesno', required: true },
      { key: 'sterilised', label: 'Are adult dogs sterilised before adoption?', type: 'yesno', showIf: shelter },
      { key: 'microchip', label: 'Do you microchip?', type: 'yesno' },
      {
        key: 'rehomeAgeWeeks', label: 'Youngest age a puppy goes home (weeks)', type: 'number', required: breeder, showIf: breeder,
        validate: v => (Number(v.rehomeAgeWeeks) > 0 && Number(v.rehomeAgeWeeks) < 8 ? 'Puppies must stay with their mother until at least 8 weeks old.' : null),
      },
      { key: 'homeCheck', label: 'Do you check the new home before handing over a dog?', type: 'yesno' },
      { key: 'takeBack', label: "Will you take a dog back if the new home doesn't work out?", type: 'yesno', required: true },
      { key: 'premisesPhoto', label: 'Photo of where the dogs live', type: 'photo', required: true },
      { key: 'parentPhoto', label: 'Photo of one of your breeding dogs', type: 'photo', showIf: breeder },
    ],
    pledge: [
      'No puppy leaves its mother before 8 weeks old.',
      'I describe every dog honestly: age, health, breed. No "pure-bred" claims without papers.',
      'No female is bred every season; she gets at least a year to recover, as my vet advises.',
      'Dogs have clean shelter, shade, water, good food and vet care.',
      'PawFleet may visit or video-call to see where the dogs are kept.',
    ],
  },

  grooming: {
    title: 'Grooming details',
    intro: 'Tell us about your grooming experience. Approved groomers set their own price and get bookings from dog owners.',
    fields: [
      { key: 'yearsExperience', label: 'Years grooming dogs', type: 'number', required: true },
      { key: 'services', label: 'Services you offer', type: 'multi', options: ['Bath & dry', 'Haircut / styling', 'Nail trim', 'Ear cleaning', 'De-shedding', 'Tick & flea treatment', 'Teeth brushing'], required: true },
      { key: 'workMode', label: 'Where you groom', type: 'select', options: ['Home visits (I come to the dog)', 'At my salon / shop', 'Both'], required: true },
      { key: 'salonAddress', label: 'Salon / shop address', type: 'text', required: v => v.workMode !== 'Home visits (I come to the dog)' && !!v.workMode, showIf: v => !!v.workMode && v.workMode !== 'Home visits (I come to the dog)' },
      { key: 'ownEquipment', label: 'Do you have your own equipment (clippers, dryer, table)?', type: 'yesno', required: true },
      { key: 'largeDogs', label: 'Comfortable with large, strong dogs (e.g. Boerboel)?', type: 'yesno', required: true },
      { key: 'staff', label: 'How many groomers work with you?', type: 'number', showIf: (_, c) => c.isBusiness },
      { key: 'training', label: 'Grooming training or certificate (if any)', type: 'text' },
      { key: 'workPhoto', label: 'Photo of a dog you groomed', type: 'photo' },
    ],
    pledge: [
      'I handle every dog gently and never sedate a dog without a vet.',
      "I tell the owner straight away about any cut, skin problem, lump or tick I find.",
      'I clean my tools between dogs.',
      'I stop and call the owner if a dog is too stressed to continue.',
    ],
  },

  training: {
    title: 'Training details',
    intro: 'Tell us how you train. PawFleet only approves trainers who use humane, reward-based methods.',
    fields: [
      { key: 'yearsExperience', label: 'Years training dogs', type: 'number', required: true },
      { key: 'specialties', label: 'What you train', type: 'multi', options: ['Puppy basics', 'Obedience', 'Leash walking', 'Behaviour problems', 'Reactive / aggressive dogs', 'Guard / protection', 'Service / therapy'], required: true },
      { key: 'method', label: 'Your main method', type: 'select', options: ['Reward-based (treats, praise, play)', 'Balanced (rewards + gentle corrections)'], required: true },
      { key: 'where', label: 'Where you train', type: 'multi', options: ["At the owner's home", 'At my training ground', 'Parks / public places'], required: true },
      { key: 'certifications', label: 'Courses or certificates (if any)', type: 'text' },
      { key: 'referencePhone', label: 'Phone of a past client or employer we can call', type: 'text', required: true },
      { key: 'trainingPhoto', label: 'Photo of you training a dog', type: 'photo' },
    ],
    pledge: [
      'I never hit, kick, choke, hang or shock a dog, and never use prong or shock collars.',
      'I keep every session safe for the dog, the owner and the public.',
      'I am honest with owners about progress and what training can and cannot fix.',
    ],
  },
};

export const fieldLabel = (f: AppField, c: AppCtx) => (typeof f.label === 'function' ? f.label(c) : f.label);
export const fieldVisible = (f: AppField, v: ApplicationValues, c: AppCtx) => (f.showIf ? f.showIf(v, c) : true);
const fieldRequired = (f: AppField, v: ApplicationValues, c: AppCtx) => (typeof f.required === 'function' ? f.required(v, c) : !!f.required);

const isEmpty = (x: unknown) => x === undefined || x === null || x === '' || (Array.isArray(x) && x.length === 0);

/** First problem with the answers, or null when the application is complete. */
export function applicationProblem(service: ApplyService, v: ApplicationValues, c: AppCtx): string | null {
  const form = APPLICATION_FORMS[service];
  for (const f of form.fields) {
    if (!fieldVisible(f, v, c)) continue;
    if (fieldRequired(f, v, c) && isEmpty(v[f.key])) {
      return f.type === 'photo' ? `Add: ${fieldLabel(f, c)}.` : `Please answer: ${fieldLabel(f, c)}`;
    }
    const err = f.validate?.(v, c);
    if (err) return err;
  }
  if (!v.pledgeAccepted) return 'Please read and accept the PawFleet promise at the bottom.';
  return null;
}

/** Uploads any photo answers (still data: URLs) and returns the answers with links instead. Needs a login. */
export async function uploadApplicationPhotos(userId: string, service: ApplyService, v: ApplicationValues): Promise<ApplicationValues> {
  const out: ApplicationValues = { ...v };
  for (const f of APPLICATION_FORMS[service].fields) {
    const val = out[f.key];
    if (f.type === 'photo' && typeof val === 'string' && val.startsWith('data:')) {
      const url = await uploadDataUrlToStorage('avatars', `nrc/apply-${userId}-${service}-${f.key}.jpg`, val);
      out[f.key] = url || undefined;
    }
  }
  return out;
}

/** Answers ready to save: hidden fields dropped, timestamp added, any photo not uploaded removed. */
export function cleanApplication(service: ApplyService, v: ApplicationValues, c: AppCtx): ApplicationValues {
  const out: ApplicationValues = { submittedAt: new Date().toISOString(), pledgeAccepted: !!v.pledgeAccepted };
  if (service !== 'training') out.kind = c.isBusiness ? (service === 'breeder' ? 'shelter' : 'business') : (service === 'breeder' ? 'breeder' : 'individual');
  for (const f of APPLICATION_FORMS[service].fields) {
    if (!fieldVisible(f, v, c)) continue;
    const val = v[f.key];
    if (isEmpty(val)) continue;
    if (f.type === 'photo' && typeof val === 'string' && val.startsWith('data:')) continue;
    out[f.key] = val;
  }
  return out;
}

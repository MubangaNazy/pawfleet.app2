import { AppData } from '../types';
import { SEED_DATA } from './seed';

const KEY = 'pawfleet_v2';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { saveData(SEED_DATA); return SEED_DATA; }
    const parsed = JSON.parse(raw) as AppData;
    // Ensure walkerStats exists (migration)
    if (!parsed.walkerStats) parsed.walkerStats = SEED_DATA.walkerStats;
    // Ensure healthLogs on dogs
    parsed.dogs = parsed.dogs.map(d => ({ ...d, healthLogs: d.healthLogs || [] }));
    return parsed;
  } catch { saveData(SEED_DATA); return SEED_DATA; }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetToSeed(): void {
  localStorage.removeItem(KEY);
}

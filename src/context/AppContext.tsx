import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Dog, Walk, Payment, AppData, HealthLog, WalkerStats, WalkerBadge, BadgeId } from '../types';
import { loadData, saveData } from '../utils/storage';

interface AppContextType {
  currentUser: User | null;
  data: AppData;
  login: (id: string, pw: string) => User | null;
  logout: () => void;
  createWalk: (walk: Omit<Walk, 'id' | 'createdAt'>) => Walk;
  updateWalk: (id: string, updates: Partial<Walk>) => void;
  startWalk: (walkId: string, loc: { lat: number; lng: number }) => void;
  endWalk: (walkId: string, loc: { lat: number; lng: number }) => void;
  assignWalker: (walkId: string, walkerId: string) => void;
  cancelWalk: (walkId: string) => void;
  markPaymentPaid: (paymentId: string) => void;
  createDog: (dog: Omit<Dog, 'id'>) => Dog;
  updateDog: (id: string, updates: Partial<Dog>) => void;
  logHealth: (dogId: string, date: string, field: keyof Pick<HealthLog, 'water' | 'foodMorning' | 'foodEvening'>, value: boolean) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => User;
  getWalkerStats: (walkerId: string) => WalkerStats;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const BADGE_DEFS: Array<{ id: BadgeId; minWalks: number; label: string; description: string; color: string; icon: string }> = [
  { id: 'first_walk', minWalks: 1, label: 'First Steps', description: 'Completed your first walk!', color: '#10B981', icon: '🐾' },
  { id: 'five_walks', minWalks: 5, label: '5 Walks Done', description: 'Completed 5 walks', color: '#4776E6', icon: '⭐' },
  { id: 'ten_walks', minWalks: 10, label: '10 Walks Done', description: 'Completed 10 walks', color: '#8B5CF6', icon: '🏆' },
  { id: 'twenty_five_walks', minWalks: 25, label: 'Walk Master', description: 'Completed 25 walks', color: '#F59E0B', icon: '🥇' },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try { const s = sessionStorage.getItem('pawfleet_user'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [data, setData] = useState<AppData>(loadData);

  const sync = (newData: AppData) => { setData(newData); saveData(newData); };

  const login = (identifier: string, password: string): User | null => {
    const user = data.users.find(u => (u.phone === identifier || u.email === identifier) && u.password === password);
    if (user) { setCurrentUser(user); sessionStorage.setItem('pawfleet_user', JSON.stringify(user)); }
    return user || null;
  };

  const logout = () => { setCurrentUser(null); sessionStorage.removeItem('pawfleet_user'); };

  const createWalk = (walkData: Omit<Walk, 'id' | 'createdAt'>): Walk => {
    const walk: Walk = { ...walkData, id: `w${Date.now()}`, createdAt: new Date().toISOString() };
    sync({ ...data, walks: [...data.walks, walk] });
    return walk;
  };

  const updateWalk = (id: string, updates: Partial<Walk>) => {
    sync({ ...data, walks: data.walks.map(w => w.id === id ? { ...w, ...updates } : w) });
  };

  const startWalk = (walkId: string, loc: { lat: number; lng: number }) => {
    sync({
      ...data,
      walks: data.walks.map(w => w.id === walkId
        ? { ...w, status: 'active' as const, startTime: new Date().toISOString(), startLocation: loc }
        : w
      )
    });
  };

  const getWalkerStats = (walkerId: string): WalkerStats => {
    return data.walkerStats.find(s => s.walkerId === walkerId) || { walkerId, points: 0, streak: 0, badges: [] };
  };

  const updateWalkerStatsInData = (walkerId: string, updates: Partial<WalkerStats>, currentData: AppData): AppData => {
    const existing = currentData.walkerStats.find(s => s.walkerId === walkerId);
    const updated = existing ? { ...existing, ...updates } : { walkerId, points: 0, streak: 0, badges: [], ...updates };
    const newStats = existing
      ? currentData.walkerStats.map(s => s.walkerId === walkerId ? updated : s)
      : [...currentData.walkerStats, updated];
    return { ...currentData, walkerStats: newStats };
  };

  const awardBadgesAndPoints = (walkerId: string, currentData: AppData): AppData => {
    const completedCount = currentData.walks.filter(w => w.walkerId === walkerId && w.status === 'completed').length;
    const existing = currentData.walkerStats.find(s => s.walkerId === walkerId) || { walkerId, points: 0, streak: 0, badges: [], lastWalkDate: undefined };

    // Update streak
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = existing.streak;
    if (existing.lastWalkDate === yesterdayStr) newStreak += 1;
    else if (existing.lastWalkDate !== todayStr) newStreak = 1;

    // New badges earned
    const existingBadgeIds = existing.badges.map(b => b.id);
    const newBadges: WalkerBadge[] = [];
    for (const def of BADGE_DEFS) {
      if (completedCount >= def.minWalks && !existingBadgeIds.includes(def.id)) {
        newBadges.push({ id: def.id, label: def.label, description: def.description, earnedAt: new Date().toISOString(), color: def.color, icon: def.icon });
      }
    }

    return updateWalkerStatsInData(walkerId, {
      points: existing.points + 100,
      streak: newStreak,
      lastWalkDate: todayStr,
      badges: [...existing.badges, ...newBadges],
    }, currentData);
  };

  const endWalk = (walkId: string, loc: { lat: number; lng: number }) => {
    const walk = data.walks.find(w => w.id === walkId);
    if (!walk?.startTime) return;
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - new Date(walk.startTime).getTime()) / 60000);

    const walkUpdates: Partial<Walk> = { status: 'completed', endTime: endTime.toISOString(), endLocation: loc, duration };
    const updatedWalks = data.walks.map(w => w.id === walkId ? { ...w, ...walkUpdates } : w);

    let newData: AppData = { ...data, walks: updatedWalks };

    if (walk.walkerId) {
      const payment: Payment = { id: `pay${Date.now()}`, walkerId: walk.walkerId, walkId: walk.id, amount: walk.walkerEarning, status: 'unpaid', date: new Date().toISOString() };
      newData = { ...newData, payments: [...newData.payments, payment] };
      newData = awardBadgesAndPoints(walk.walkerId, newData);
    }
    sync(newData);
  };

  const assignWalker = (walkId: string, walkerId: string) => updateWalk(walkId, { walkerId, status: 'assigned' });
  const cancelWalk = (walkId: string) => updateWalk(walkId, { status: 'cancelled' });

  const markPaymentPaid = (paymentId: string) => {
    sync({ ...data, payments: data.payments.map(p => p.id === paymentId ? { ...p, status: 'paid' as const, paidAt: new Date().toISOString() } : p) });
  };

  const createDog = (dogData: Omit<Dog, 'id'>): Dog => {
    const dog: Dog = { ...dogData, id: `d${Date.now()}`, healthLogs: [] };
    sync({ ...data, dogs: [...data.dogs, dog] });
    return dog;
  };

  const updateDog = (id: string, updates: Partial<Dog>) => {
    sync({ ...data, dogs: data.dogs.map(d => d.id === id ? { ...d, ...updates } : d) });
  };

  const logHealth = (dogId: string, date: string, field: keyof Pick<HealthLog, 'water' | 'foodMorning' | 'foodEvening'>, value: boolean) => {
    const dogs = data.dogs.map(dog => {
      if (dog.id !== dogId) return dog;
      const logs = dog.healthLogs || [];
      const existing = logs.find(l => l.date === date);
      const updatedLogs = existing
        ? logs.map(l => l.date === date ? { ...l, [field]: value } : l)
        : [...logs, { date, water: false, foodMorning: false, foodEvening: false, [field]: value }];
      return { ...dog, healthLogs: updatedLogs };
    });
    sync({ ...data, dogs });
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): User => {
    const user: User = { ...userData, id: `u${Date.now()}`, createdAt: new Date().toISOString() };
    sync({ ...data, users: [...data.users, user] });
    return user;
  };

  const refreshData = () => setData(loadData());

  return (
    <AppContext.Provider value={{ currentUser, data, login, logout, createWalk, updateWalk, startWalk, endWalk, assignWalker, cancelWalk, markPaymentPaid, createDog, updateDog, logHealth, addUser, getWalkerStats, refreshData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

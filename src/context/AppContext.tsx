import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, Dog, Walk, Payment, WalkerStats, WalkerBadge, AppData, Role, BadgeId } from '../types';

// ── Type helpers ────────────────────────────────────────────
const toUser = (r: any): User => ({
  id: r.id, name: r.name, phone: r.phone, email: r.email,
  password: r.password, role: r.role as Role, createdAt: r.created_at,
});

const toDog = (r: any): Dog => ({
  id: r.id, name: r.name, breed: r.breed, age: r.age,
  ownerId: r.owner_id, imageUrl: r.image_url, notes: r.notes,
  healthLogs: (r.health_logs || []).map((hl: any) => ({
    date: hl.date, water: hl.water,
    foodMorning: hl.food_morning, foodEvening: hl.food_evening,
  })),
});

const toWalk = (r: any): Walk => ({
  id: r.id, dogId: r.dog_id, ownerId: r.owner_id, walkerId: r.walker_id,
  status: r.status, scheduledDate: r.scheduled_date,
  startTime: r.start_time, endTime: r.end_time,
  startLocation: r.start_lat != null ? { lat: r.start_lat, lng: r.start_lng, address: r.start_address } : undefined,
  endLocation: r.end_lat != null ? { lat: r.end_lat, lng: r.end_lng, address: r.end_address } : undefined,
  duration: r.duration, price: Number(r.price), walkerEarning: Number(r.walker_earning),
  notes: r.notes, createdAt: r.created_at,
});

const toPayment = (r: any): Payment => ({
  id: r.id, walkerId: r.walker_id, walkId: r.walk_id,
  amount: Number(r.amount), status: r.status, date: r.date, paidAt: r.paid_at,
});

const toWalkerStats = (r: any): WalkerStats => ({
  walkerId: r.walker_id, points: r.points, streak: r.streak,
  lastWalkDate: r.last_walk_date, badges: r.badges || [],
});

// ── Badge definitions ───────────────────────────────────────
const BADGES: Record<BadgeId, Omit<WalkerBadge, 'earnedAt'>> = {
  first_walk:        { id: 'first_walk',        label: 'First Walk',  description: 'Completed your first walk!',    color: '#10B981', icon: '🐾' },
  five_walks:        { id: 'five_walks',         label: '5 Walks',     description: 'Completed 5 walks!',            color: '#3B82F6', icon: '⭐' },
  ten_walks:         { id: 'ten_walks',          label: '10 Walks',    description: 'Completed 10 walks!',           color: '#8B5CF6', icon: '🏆' },
  twenty_five_walks: { id: 'twenty_five_walks',  label: '25 Walks',    description: 'Completed 25 walks!',           color: '#F59E0B', icon: '🌟' },
  top_walker:        { id: 'top_walker',         label: 'Top Walker',  description: 'Ranked top walker this month!', color: '#EF4444', icon: '👑' },
  consistent:        { id: 'consistent',         label: 'Consistent',  description: '7-day walk streak!',            color: '#06B6D4', icon: '🔥' },
};

// ── Context type ────────────────────────────────────────────
interface AppContextType {
  loading: boolean;
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
  logHealth: (dogId: string, date: string, field: 'water' | 'foodMorning' | 'foodEvening', value: boolean) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => User;
  getWalkerStats: (walkerId: string) => WalkerStats;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

// ── Provider ────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('pawfleet_user') || 'null'); } catch { return null; }
  });
  const [data, setData] = useState<AppData>({
    users: [], dogs: [], walks: [], payments: [], walkerStats: [],
  });

  // ── Load all data ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, d, w, p, s] = await Promise.all([
        supabase.from('users').select('*').order('created_at'),
        supabase.from('dogs').select('*, health_logs(*)').order('created_at'),
        supabase.from('walks').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('walker_stats').select('*'),
      ]);
      setData({
        users:       (u.data || []).map(toUser),
        dogs:        (d.data || []).map(toDog),
        walks:       (w.data || []).map(toWalk),
        payments:    (p.data || []).map(toPayment),
        walkerStats: (s.data || []).map(toWalkerStats),
      });
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Realtime subscriptions ───────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('pawfleet-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'walks' }, (p) =>
        setData(prev => ({ ...prev, walks: [toWalk(p.new), ...prev.walks] }))
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'walks' }, (p) =>
        setData(prev => ({ ...prev, walks: prev.walks.map(w => w.id === p.new.id ? toWalk(p.new) : w) }))
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        supabase.from('payments').select('*').order('created_at', { ascending: false })
          .then(({ data: rows }) => {
            if (rows) setData(prev => ({ ...prev, payments: rows.map(toPayment) }));
          });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Auth ─────────────────────────────────────────────────
  const login = (identifier: string, pw: string): User | null => {
    const user = data.users.find(u =>
      (u.phone === identifier || u.email === identifier) && u.password === pw
    ) || null;
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem('pawfleet_user', JSON.stringify(user));
    }
    return user;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('pawfleet_user');
  };

  // ── Walks ────────────────────────────────────────────────
  const createWalk = (walk: Omit<Walk, 'id' | 'createdAt'>): Walk => {
    const newWalk: Walk = { ...walk, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setData(prev => ({ ...prev, walks: [newWalk, ...prev.walks] }));
    supabase.from('walks').insert({
      id: newWalk.id, dog_id: walk.dogId, owner_id: walk.ownerId,
      walker_id: walk.walkerId || null, status: walk.status,
      scheduled_date: walk.scheduledDate, price: walk.price,
      walker_earning: walk.walkerEarning, notes: walk.notes || null,
    }).then(({ error }) => { if (error) console.error('createWalk:', error); });
    return newWalk;
  };

  const updateWalk = (id: string, updates: Partial<Walk>) => {
    setData(prev => ({ ...prev, walks: prev.walks.map(w => w.id === id ? { ...w, ...updates } : w) }));
    const db: Record<string, any> = {};
    if (updates.status !== undefined)    db.status = updates.status;
    if (updates.walkerId !== undefined)  db.walker_id = updates.walkerId;
    if (updates.startTime !== undefined) db.start_time = updates.startTime;
    if (updates.endTime !== undefined)   db.end_time = updates.endTime;
    if (updates.duration !== undefined)  db.duration = updates.duration;
    if (updates.notes !== undefined)     db.notes = updates.notes;
    if (updates.startLocation) {
      db.start_lat = updates.startLocation.lat;
      db.start_lng = updates.startLocation.lng;
      db.start_address = updates.startLocation.address ?? null;
    }
    if (updates.endLocation) {
      db.end_lat = updates.endLocation.lat;
      db.end_lng = updates.endLocation.lng;
      db.end_address = updates.endLocation.address ?? null;
    }
    supabase.from('walks').update(db).eq('id', id)
      .then(({ error }) => { if (error) console.error('updateWalk:', error); });
  };

  const startWalk = (walkId: string, loc: { lat: number; lng: number }) => {
    updateWalk(walkId, { status: 'active', startTime: new Date().toISOString(), startLocation: loc });
  };

  const endWalk = (walkId: string, loc: { lat: number; lng: number }) => {
    const walk = data.walks.find(w => w.id === walkId);
    if (!walk) return;
    const now = new Date().toISOString();
    const duration = walk.startTime
      ? Math.round((Date.now() - new Date(walk.startTime).getTime()) / 60000)
      : 45;
    updateWalk(walkId, { status: 'completed', endTime: now, endLocation: loc, duration });

    if (walk.walkerId) {
      // Payment
      const payment: Payment = {
        id: crypto.randomUUID(), walkerId: walk.walkerId, walkId,
        amount: walk.walkerEarning, status: 'unpaid', date: now,
      };
      setData(prev => ({ ...prev, payments: [payment, ...prev.payments] }));
      supabase.from('payments').insert({
        id: payment.id, walker_id: payment.walkerId, walk_id: payment.walkId,
        amount: payment.amount, status: payment.status, date: payment.date,
      }).then(({ error }) => { if (error) console.error('createPayment:', error); });

      // Walker stats + badges
      const existing = data.walkerStats.find(s => s.walkerId === walk.walkerId);
      const completedCount = data.walks.filter(w => w.walkerId === walk.walkerId && w.status === 'completed').length + 1;
      const newPoints = (existing?.points || 0) + 10;
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = existing?.lastWalkDate === yesterday ? (existing.streak || 0) + 1
        : existing?.lastWalkDate === today ? (existing.streak || 1) : 1;

      const currentBadges: WalkerBadge[] = existing?.badges || [];
      const newBadges = [...currentBadges];
      const award = (id: BadgeId) => { if (!newBadges.some(b => b.id === id)) newBadges.push({ ...BADGES[id], earnedAt: now }); };
      if (completedCount >= 1)  award('first_walk');
      if (completedCount >= 5)  award('five_walks');
      if (completedCount >= 10) award('ten_walks');
      if (completedCount >= 25) award('twenty_five_walks');
      if (newStreak >= 7)       award('consistent');

      const updated: WalkerStats = { walkerId: walk.walkerId, points: newPoints, streak: newStreak, lastWalkDate: today, badges: newBadges };
      setData(prev => ({
        ...prev,
        walkerStats: prev.walkerStats.some(s => s.walkerId === walk.walkerId)
          ? prev.walkerStats.map(s => s.walkerId === walk.walkerId ? updated : s)
          : [...prev.walkerStats, updated],
      }));
      supabase.from('walker_stats').upsert({
        walker_id: walk.walkerId, points: newPoints, streak: newStreak,
        last_walk_date: today, badges: newBadges, updated_at: now,
      }, { onConflict: 'walker_id' }).then(({ error }) => { if (error) console.error('walkerStats:', error); });
    }
  };

  const assignWalker = (walkId: string, walkerId: string) => updateWalk(walkId, { walkerId, status: 'assigned' });
  const cancelWalk = (walkId: string) => updateWalk(walkId, { status: 'cancelled' });

  // ── Payments ─────────────────────────────────────────────
  const markPaymentPaid = (paymentId: string) => {
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.id === paymentId ? { ...p, status: 'paid', paidAt: now } : p),
    }));
    supabase.from('payments').update({ status: 'paid', paid_at: now }).eq('id', paymentId)
      .then(({ error }) => { if (error) console.error('markPaymentPaid:', error); });
  };

  // ── Dogs ─────────────────────────────────────────────────
  const createDog = (dog: Omit<Dog, 'id'>): Dog => {
    const newDog: Dog = { ...dog, id: crypto.randomUUID(), healthLogs: [] };
    setData(prev => ({ ...prev, dogs: [...prev.dogs, newDog] }));
    supabase.from('dogs').insert({
      id: newDog.id, name: dog.name, breed: dog.breed ?? null, age: dog.age ?? null,
      owner_id: dog.ownerId, image_url: dog.imageUrl ?? null, notes: dog.notes ?? null,
    }).then(({ error }) => { if (error) console.error('createDog:', error); });
    return newDog;
  };

  const updateDog = (id: string, updates: Partial<Dog>) => {
    setData(prev => ({ ...prev, dogs: prev.dogs.map(d => d.id === id ? { ...d, ...updates } : d) }));
    const db: Record<string, any> = {};
    if (updates.name !== undefined)     db.name = updates.name;
    if (updates.breed !== undefined)    db.breed = updates.breed;
    if (updates.age !== undefined)      db.age = updates.age;
    if (updates.imageUrl !== undefined) db.image_url = updates.imageUrl;
    if (updates.notes !== undefined)    db.notes = updates.notes;
    supabase.from('dogs').update(db).eq('id', id)
      .then(({ error }) => { if (error) console.error('updateDog:', error); });
  };

  const logHealth = (dogId: string, date: string, field: 'water' | 'foodMorning' | 'foodEvening', value: boolean) => {
    setData(prev => ({
      ...prev,
      dogs: prev.dogs.map(d => {
        if (d.id !== dogId) return d;
        const logs = d.healthLogs || [];
        const existing = logs.find(l => l.date === date);
        return existing
          ? { ...d, healthLogs: logs.map(l => l.date === date ? { ...l, [field]: value } : l) }
          : { ...d, healthLogs: [...logs, { date, water: false, foodMorning: false, foodEvening: false, [field]: value }] };
      }),
    }));
    const dbField = field === 'foodMorning' ? 'food_morning' : field === 'foodEvening' ? 'food_evening' : 'water';
    supabase.from('health_logs')
      .upsert({ dog_id: dogId, date, [dbField]: value }, { onConflict: 'dog_id,date' })
      .then(({ error }) => { if (error) console.error('logHealth:', error); });
  };

  // ── Users ────────────────────────────────────────────────
  const addUser = (user: Omit<User, 'id' | 'createdAt'>): User => {
    const newUser: User = { ...user, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setData(prev => ({ ...prev, users: [...prev.users, newUser] }));
    supabase.from('users').insert({
      id: newUser.id, name: user.name, phone: user.phone,
      email: user.email ?? null, password: user.password, role: user.role,
    }).then(({ error }) => { if (error) console.error('addUser:', error); });
    if (user.role === 'walker') {
      const stats: WalkerStats = { walkerId: newUser.id, points: 0, streak: 0, badges: [] };
      setData(prev => ({ ...prev, walkerStats: [...prev.walkerStats, stats] }));
      supabase.from('walker_stats').insert({ walker_id: newUser.id })
        .then(({ error }) => { if (error) console.error('walkerStats insert:', error); });
    }
    return newUser;
  };

  const getWalkerStats = (walkerId: string): WalkerStats =>
    data.walkerStats.find(s => s.walkerId === walkerId) ||
    { walkerId, points: 0, streak: 0, badges: [] };

  const refreshData = () => { loadData(); };

  return (
    <AppContext.Provider value={{
      loading, currentUser, data, login, logout,
      createWalk, updateWalk, startWalk, endWalk,
      assignWalker, cancelWalk, markPaymentPaid,
      createDog, updateDog, logHealth,
      addUser, getWalkerStats, refreshData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

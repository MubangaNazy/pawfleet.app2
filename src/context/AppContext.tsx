import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, Dog, Walk, Payment, WalkerStats, WalkerBadge, AppData, Role, BadgeId, AppNotification } from '../types';
import { requestNotificationPermission, onForegroundMessage } from '../lib/firebase';
import { identifyUser, clearUser, trackEvent } from '../lib/monitoring';

// ── Type helpers ────────────────────────────────────────────
const toUser = (r: any): User => ({
  id: r.id, name: r.name, phone: r.phone, email: r.email,
  password: r.password, role: r.role as Role, createdAt: r.created_at,
  imageUrl: r.image_url ?? undefined,
  businessName: r.business_name ?? undefined,
  businessAddress: r.business_address ?? undefined,
  businessType: r.business_type ?? undefined,
  nrc: r.nrc ?? undefined,
  walkerStatus: r.walker_status ?? undefined,
  serviceLat: r.service_lat ?? undefined,
  serviceLng: r.service_lng ?? undefined,
  referralCode: r.referral_code ?? undefined,
  referredByAdminId: r.referred_by_admin_id ?? undefined,
  fcmToken: r.fcm_token ?? undefined,
  subscriptionPaidUntil: r.subscription_paid_until ?? undefined,
  trialEndsAt: r.trial_ends_at ?? undefined,
});

const toNotification = (r: any): AppNotification => ({
  id: r.id, userId: r.user_id, type: r.type,
  title: r.title, body: r.body, data: r.data ?? undefined,
  read: r.read ?? false, createdAt: r.created_at,
});

// Generate referral code for an admin from their UUID
function adminReferralCode(adminId: string): string {
  return 'PAW-' + adminId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

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
  startLocation: (r.start_lat != null || r.start_address != null)
    ? { lat: r.start_lat ?? undefined, lng: r.start_lng ?? undefined, address: r.start_address ?? undefined }
    : undefined,
  endLocation: r.end_lat != null ? { lat: r.end_lat, lng: r.end_lng, address: r.end_address } : undefined,
  duration: r.duration, price: Number(r.price), walkerEarning: Number(r.walker_earning),
  notes: r.notes, createdAt: r.created_at,
  rating: r.rating ?? undefined,
  ratingComment: r.rating_comment ?? undefined,
  routePoints: r.route_points
    ? (typeof r.route_points === 'string' ? JSON.parse(r.route_points) : r.route_points)
    : undefined,
});

const toPayment = (r: any): Payment => ({
  id: r.id, walkerId: r.walker_id, walkId: r.walk_id,
  amount: Number(r.amount), status: r.status, date: r.date, paidAt: r.paid_at,
  walkerConfirmed: r.walker_confirmed ?? false,
  paymentMethod: r.payment_method ?? undefined,
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
interface RegisterExtras {
  photoUrl?: string;
  nrc?: string;
  referralCode?: string;
}
interface AppContextType {
  loading: boolean;
  currentUser: User | null;
  data: AppData;
  login: (id: string, pw: string) => Promise<User | null>;
  register: (name: string, phone: string, email: string, password: string, role: 'owner' | 'walker', extras?: RegisterExtras) => Promise<{ success: boolean; error?: string; user?: User; pendingApproval?: boolean }>;
  activateSubscription: (userId: string, months?: number) => void;
  logout: () => void;
  createWalk: (walk: Omit<Walk, 'id' | 'createdAt'>) => Walk;
  updateWalk: (id: string, updates: Partial<Walk>) => void;
  startWalk: (walkId: string, loc: { lat: number; lng: number }) => void;
  endWalk: (walkId: string, loc: { lat: number; lng: number }, routePoints?: [number, number][]) => void;
  assignWalker: (walkId: string, walkerId: string) => void;
  cancelWalk: (walkId: string, reason?: string, cancelledBy?: 'owner' | 'walker') => void;
  markPaymentPaid: (paymentId: string, method?: 'cash' | 'mobile_money' | 'bank' | 'online') => void;
  confirmPaymentReceived: (paymentId: string) => void;
  createDog: (dog: Omit<Dog, 'id'>) => Dog;
  updateDog: (id: string, updates: Partial<Dog>) => void;
  logHealth: (dogId: string, date: string, field: 'water' | 'foodMorning' | 'foodEvening', value: boolean) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => User;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  getWalkerStats: (walkerId: string) => WalkerStats;
  refreshData: () => void;
  approveWalker: (walkerId: string) => void;
  rejectWalker: (walkerId: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  sendNotification: (userId: string, type: AppNotification['type'], title: string, body: string, data?: Record<string, string>) => void;
  getAdminReferralCode: (adminId: string) => string;
  addRating: (walkId: string, rating: number, comment?: string) => void;
  declineWalk: (walkId: string) => void;
  updateOrderStatus: (notifId: string, status: 'pending' | 'confirmed' | 'delivered') => void;
}

const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

// ── Notification sound (Web Audio API — no external files needed) ──
function playDogChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Playful 3-note ascending chime: C5 → E5 → G5
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch { /* AudioContext unavailable */ }
}

// Upbeat "ka-ching" for new shop orders
function playShopOrderSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Rising 4-note fanfare: F5 → A5 → C6 → E6
    const notes = [698.46, 880, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  } catch { /* AudioContext unavailable */ }
}

// ── Provider ────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('pawfleet_user') || 'null'); } catch { return null; }
  });
  const [data, setData] = useState<AppData>({
    users: [], dogs: [], walks: [], payments: [], walkerStats: [], notifications: [],
  });

  // Keep a ref so realtime callbacks can access current user without stale closure
  const currentUserRef = React.useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ── FCM push token registration ──────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    requestNotificationPermission().then(token => {
      if (!token) return;
      supabase.from('users').update({ fcm_token: token }).eq('id', currentUser.id).then(() => {});
    });
    // Show foreground notifications as a toast-style banner
    const unsub = onForegroundMessage(payload => {
      const { title = 'PawFleet', body = '' } = payload.notification || {};
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      }
    });
    return unsub;
  }, [currentUser?.id]);

  // ── Load all data ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchAll = Promise.all([
        supabase.from('users').select('*').order('created_at'),
        supabase.from('dogs').select('*, health_logs(*)').order('created_at'),
        supabase.from('walks').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('walker_stats').select('*'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      // 6-second timeout — if Supabase is slow/hanging, unblock the app anyway
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('load_timeout')), 6000)
      );
      const [u, d, w, p, s, n] = await Promise.race([fetchAll, timeout]);
      const rawDogs = (d.data || []).map(toDog);
      setData({
        users:         mergeUserImages((u.data || []).map(toUser)),
        dogs:          mergeDogImages(rawDogs),
        walks:         (w.data || []).map(toWalk),
        payments:      (p.data || []).map(toPayment),
        walkerStats:   (s.data || []).map(toWalkerStats),
        notifications: (n.data || []).map(toNotification),
      });
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Auth state change (handles email confirmation link clicks) ───
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser = session.user;
        // Load profile from database
        const { data: row } = await supabase.from('users').select('*').eq('id', authUser.id).maybeSingle();
        if (row) {
          const user = toUser(row);
          setCurrentUser(user);
          sessionStorage.setItem('pawfleet_user', JSON.stringify(user));
          setData(prev => ({
            ...prev,
            users: [...prev.users.filter(u => u.id !== user.id), user],
          }));
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        sessionStorage.removeItem('pawfleet_user');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (p) => {
        const notif = toNotification(p.new);
        // Play sound only for the logged-in user's own notifications
        if (notif.userId === currentUserRef.current?.id) {
          if (notif.type === 'shop_order') playShopOrderSound();
          else playDogChime();
        }
        setData(prev => ({ ...prev, notifications: [notif, ...prev.notifications] }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (p) =>
        setData(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === p.new.id ? toNotification(p.new) : n) }))
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (p) =>
        setData(prev => ({ ...prev, users: prev.users.map(u => u.id === p.new.id ? toUser(p.new) : u) }))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Notifications ────────────────────────────────────────
  const sendNotification = useCallback((
    userId: string,
    type: AppNotification['type'],
    title: string,
    body: string,
    data?: Record<string, string>
  ) => {
    const notif: AppNotification = {
      id: crypto.randomUUID(), userId, type, title, body,
      data, read: false, createdAt: new Date().toISOString(),
    };
    // Play chime for the currently logged-in user's own notifications
    if (userId === currentUserRef.current?.id) playDogChime();
    setData(prev => {
      // Look up FCM token for the target user and fire push (background-safe)
      const target = prev.users.find(u => u.id === userId);
      if (target?.fcmToken) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token: target.fcmToken, title, body, data: data ?? {} }),
        }).catch(() => {});
      }
      return { ...prev, notifications: [notif, ...prev.notifications] };
    });
    supabase.from('notifications').insert({
      id: notif.id, user_id: userId, type, title, body,
      data: data ?? null, read: false,
    }).then(({ error }) => { if (error) console.warn('sendNotification (table may not exist):', error); });
  }, []);

  const markNotificationRead = (notifId: string) => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === notifId ? { ...n, read: true } : n),
    }));
    supabase.from('notifications').update({ read: true }).eq('id', notifId)
      .then(({ error }) => { if (error) console.warn('markRead:', error); });
  };

  const markAllNotificationsRead = () => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
    // Bulk update handled lazily by the UI
  };

  const updateOrderStatus = (notifId: string, status: 'pending' | 'confirmed' | 'delivered') => {
    const notif = data.notifications.find(n => n.id === notifId);
    if (!notif) return;
    const newData = { ...(notif.data || {}), deliveryStatus: status };
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === notifId ? { ...n, data: newData } : n),
    }));
    supabase.from('notifications').update({ data: newData }).eq('id', notifId)
      .then(({ error }) => { if (error) console.error('updateOrderStatus:', error); });
  };

  const getAdminReferralCode = (adminId: string) => adminReferralCode(adminId);

  // ── Auth ─────────────────────────────────────────────────
  // Hardcoded demo users — fully offline, no DB/Auth queries needed
  const DEMO_USERS: Record<string, User> = {
    'admin@pawfleet.zm': {
      id: '11111111-1111-1111-1111-111111111111', name: 'Chanda Mulenga',
      phone: '0977000001', email: 'admin@pawfleet.zm', password: '', role: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
    },
    'walker1@pawfleet.zm': {
      id: '22222222-2222-2222-2222-222222222222', name: 'Bwalya Mutale',
      phone: '0977000002', email: 'walker1@pawfleet.zm', password: '', role: 'walker',
      createdAt: '2024-01-01T00:00:00Z',
    },
    'owner1@pawfleet.zm': {
      id: '44444444-4444-4444-4444-444444444444', name: 'Mwila Phiri',
      phone: '0977000004', email: 'owner1@pawfleet.zm', password: '', role: 'owner',
      createdAt: '2024-01-01T00:00:00Z',
    },
    'shopowner@pawfleet.zm': {
      id: 'a1b2c3d4-0006-0006-0006-a1b2c3d40006', name: 'Demo Shop Owner',
      phone: '0977000006', email: 'shopowner@pawfleet.zm', password: '', role: 'shopowner',
      createdAt: '2024-01-01T00:00:00Z',
    },
    'vet@pawfleet.zm': {
      id: 'b2c3d4e5-0007-0007-0007-b2c3d4e50007', name: 'Lusaka Vet Clinic',
      phone: '0977000007', email: 'vet@pawfleet.zm', password: '', role: 'vet',
      createdAt: '2024-01-01T00:00:00Z',
    },
  };
  const DEMO_CREDS: Record<string, string> = {
    'admin@pawfleet.zm': 'admin123', '0977000001': 'admin123',
    'walker1@pawfleet.zm': 'walker123', '0977000002': 'walker123',
    'owner1@pawfleet.zm': 'owner123', '0977000004': 'owner123',
    'shopowner@pawfleet.zm': 'shop123', '0977000006': 'shop123',
    'vet@pawfleet.zm': 'vet123', '0977000007': 'vet123',
  };
  const PHONE_TO_EMAIL: Record<string, string> = {
    '0977000001': 'admin@pawfleet.zm', '0977000002': 'walker1@pawfleet.zm',
    '0977000004': 'owner1@pawfleet.zm', '0977000006': 'shopowner@pawfleet.zm',
    '0977000007': 'vet@pawfleet.zm',
  };

  const login = async (identifier: string, pw: string): Promise<User | null> => {
    // 1. Demo account bypass — fully hardcoded, no network calls needed
    const email = PHONE_TO_EMAIL[identifier] ?? identifier;
    if (DEMO_CREDS[identifier] === pw || DEMO_CREDS[email] === pw) {
      const user = DEMO_USERS[email] ?? null;
      if (user) {
        setCurrentUser(user);
        sessionStorage.setItem('pawfleet_user', JSON.stringify(user));
        identifyUser(user.id, user.name, user.role);
        trackEvent('login', { method: 'demo', role: user.role });
        return user;
      }
    }

    // 2. Try Supabase Auth (real registered accounts)
    try {
      const { data: authData } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (authData?.user) {
        let user = data.users.find(u => u.id === authData.user.id);
        if (!user) {
          const { data: row } = await supabase.from('users').select('*').eq('id', authData.user.id).maybeSingle();
          if (row) {
            user = toUser(row);
            setData(prev => ({ ...prev, users: [...prev.users.filter(u => u.id !== row.id), user!] }));
          }
        }
        if (user) {
          setCurrentUser(user);
          sessionStorage.setItem('pawfleet_user', JSON.stringify(user));
          identifyUser(user.id, user.name, user.role);
          trackEvent('login', { method: 'supabase', role: user.role });
          return user;
        }
      }
    } catch { /* Supabase Auth unavailable */ }

    return null;
  };

  // Upload a base64 data-URL photo to Supabase Storage and return its public URL.
  // Falls back to localStorage if the upload fails (e.g. bucket not created yet).
  const uploadProfilePhoto = async (userId: string, dataUrl: string): Promise<string> => {
    try {
      const res  = await fetch(dataUrl);
      const blob = await res.blob();
      const ext  = blob.type.split('/')[1] || 'jpg';
      const path = `${userId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: blob.type });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        return urlData.publicUrl;
      }
    } catch { /* fall through to localStorage */ }
    // Fallback: store base64 locally so at least this device sees the photo
    try {
      const imgs = JSON.parse(localStorage.getItem('pawfleet_user_images') || '{}');
      imgs[userId] = dataUrl;
      localStorage.setItem('pawfleet_user_images', JSON.stringify(imgs));
    } catch { /* ignore */ }
    return dataUrl;
  };

  const register = async (
    name: string, phone: string, email: string, password: string,
    role: 'owner' | 'walker', extras?: RegisterExtras
  ): Promise<{ success: boolean; error?: string; user?: User; pendingApproval?: boolean }> => {

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone, role } },
    });
    if (authError) return { success: false, error: authError.message };
    if (!authData.user) return { success: false, error: 'Registration failed. Please try again.' };

    const userId = authData.user.id;
    const now = new Date().toISOString();
    const walkerStatus: 'pending_approval' | undefined = role === 'walker' ? 'pending_approval' : undefined;

    // Upload photo to Supabase Storage (so it's visible to everyone, not just this device)
    let publicImageUrl: string | undefined;
    if (extras?.photoUrl) {
      publicImageUrl = await uploadProfilePhoto(userId, extras.photoUrl);
    }

    const newUser: User = {
      id: userId, name, phone, email, password: '', role, createdAt: now,
      imageUrl: publicImageUrl,
      nrc: extras?.nrc,
      walkerStatus,
    };

    await supabase.from('users').upsert({
      id: userId, name, phone, email: email || null, password: '', role,
      image_url: publicImageUrl ?? null,
      nrc: extras?.nrc ?? null,
      walker_status: walkerStatus ?? null,
    }, { onConflict: 'id' }).then(({ error }) => { if (error) console.error('register insert:', error); });

    if (role === 'walker') {
      await supabase.from('walker_stats').upsert({ walker_id: userId }, { onConflict: 'walker_id' })
        .then(({ error }) => { if (error) console.error('walkerStats register:', error); });
      setData(prev => ({ ...prev, walkerStats: [...prev.walkerStats, { walkerId: userId, points: 0, streak: 0, badges: [] }] }));
    }

    setData(prev => ({ ...prev, users: [...prev.users.filter(u => u.id !== userId), newUser] }));

    // Notify admins of new walker application
    if (role === 'walker') {
      data.users.filter(u => u.role === 'admin').forEach(admin => {
        sendNotification(admin.id, 'walker_signup',
          'New Walker Application 🦮',
          `${name} has applied to join as a walker. Review and approve their application.`,
          { walkerId: userId }
        );
      });
      return { success: true, pendingApproval: true };
    }

    if (authData.session) {
      setCurrentUser(newUser);
      sessionStorage.setItem('pawfleet_user', JSON.stringify(newUser));
      return { success: true, user: newUser };
    }
    return { success: true };
  };

  const logout = () => {
    supabase.auth.signOut().catch(() => {});
    clearUser();
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
      start_lat: walk.startLocation?.lat ?? null,
      start_lng: walk.startLocation?.lng ?? null,
      start_address: walk.startLocation?.address ?? null,
    }).then(({ error }) => { if (error) console.error('createWalk:', error); });

    // Notify walkers and admins of new walk booking
    const dog = data.dogs.find(d => d.id === walk.dogId);
    const owner = data.users.find(u => u.id === walk.ownerId);

    const isGroomingJob = walk.notes?.startsWith('GROOMING:');
    const isGroomingAddon = walk.notes?.includes('Add-on: Grooming');

    let notifyTitle: string;
    let notifyMsg: string;
    if (isGroomingJob && !walk.walkerId) {
      notifyTitle = 'New Grooming Job 🛁';
      notifyMsg = `${owner?.name || 'An owner'} needs a groomer for ${dog?.name || 'their dog'}. Full grooming session. K${walk.walkerEarning} earning.`;
    } else if (isGroomingAddon) {
      notifyTitle = 'New Walk + Grooming 🐾✂️';
      notifyMsg = `${owner?.name || 'An owner'} has booked a Walk + Grooming add-on for ${dog?.name || 'their dog'}. K${walk.walkerEarning} earning.`;
    } else {
      notifyTitle = 'New Walk Available 🐾';
      notifyMsg = `${owner?.name || 'An owner'} needs a walker for ${dog?.name || 'their dog'}. K${walk.walkerEarning} earning.`;
    }

    data.users.filter(u => u.role === 'walker' && u.walkerStatus === 'active').forEach(w => {
      sendNotification(w.id, 'walk_booked', notifyTitle, notifyMsg, { walkId: newWalk.id });
    });
    data.users.filter(u => u.role === 'admin').forEach(admin => {
      sendNotification(admin.id, 'walk_booked', 'New Walk Booked', notifyMsg, { walkId: newWalk.id });
    });
    if (walk.walkerId) {
      const assignedTitle = isGroomingJob || isGroomingAddon
        ? 'Grooming Session Assigned to You 🛁'
        : 'Walk Assigned to You';
      const assignedMsg = isGroomingJob
        ? `You have been assigned a grooming session for ${dog?.name || 'a dog'}. K${walk.walkerEarning} earning.`
        : isGroomingAddon
        ? `You have been assigned a Walk + Grooming add-on for ${dog?.name || 'a dog'}. K${walk.walkerEarning} earning.`
        : `You have been assigned to walk ${dog?.name || 'a dog'}. K${walk.walkerEarning} earning.`;
      sendNotification(walk.walkerId, 'walk_accepted', assignedTitle, assignedMsg, { walkId: newWalk.id });
    }
    trackEvent('walk_booked', { dogId: walk.dogId, duration: walk.duration, price: walk.price });
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
      db.start_lat = updates.startLocation.lat ?? null;
      db.start_lng = updates.startLocation.lng ?? null;
      db.start_address = updates.startLocation.address ?? null;
    }
    if (updates.endLocation) {
      db.end_lat = updates.endLocation.lat;
      db.end_lng = updates.endLocation.lng;
      db.end_address = updates.endLocation.address ?? null;
    }
    if (updates.routePoints !== undefined) db.route_points = JSON.stringify(updates.routePoints);
    supabase.from('walks').update(db).eq('id', id)
      .then(({ error }) => { if (error) console.error('updateWalk:', error); });
  };

  const startWalk = (walkId: string, loc: { lat: number; lng: number }) => {
    updateWalk(walkId, { status: 'active', startTime: new Date().toISOString(), startLocation: loc });
    const walk = data.walks.find(w => w.id === walkId);
    const dog = walk ? data.dogs.find(d => d.id === walk.dogId) : null;
    if (walk?.ownerId) {
      sendNotification(walk.ownerId, 'walk_started',
        'Walk Started 🐾',
        `Your walker has started walking ${dog?.name || 'your dog'}. Track live on the map.`,
        { walkId }
      );
    }
    // Notify admins too
    data.users.filter(u => u.role === 'admin').forEach(admin => {
      sendNotification(admin.id, 'walk_started',
        'Walk in Progress',
        `${dog?.name || 'A dog'}'s walk has started.`,
        { walkId }
      );
    });
  };

  const endWalk = (walkId: string, loc: { lat: number; lng: number }, routePoints?: [number, number][]) => {
    const walk = data.walks.find(w => w.id === walkId);
    if (!walk) return;
    const now = new Date().toISOString();
    const duration = walk.startTime
      ? Math.round((Date.now() - new Date(walk.startTime).getTime()) / 60000)
      : 45;
    updateWalk(walkId, { status: 'completed', endTime: now, endLocation: loc, duration, ...(routePoints ? { routePoints } : {}) });

    // Notify owner: walk ended, please confirm payment and rate
    if (walk.ownerId) {
      const walkerUser = data.users.find(u => u.id === walk.walkerId);
      sendNotification(
        walk.ownerId,
        'walk_completed',
        'Walk Complete — Please Confirm 🐾',
        `${walkerUser?.name || 'Your walker'} has finished the walk. Please confirm payment and leave a rating.`,
        { walkId }
      );
    }

    if (walk.walkerId) {
      // Payment
      const payment: Payment = {
        id: crypto.randomUUID(), walkerId: walk.walkerId, walkId,
        amount: walk.walkerEarning, status: 'held', date: now,
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

  const assignWalker = (walkId: string, walkerId: string) => {
    updateWalk(walkId, { walkerId, status: 'assigned' });
    const walk = data.walks.find(w => w.id === walkId);
    const dog = walk ? data.dogs.find(d => d.id === walk.dogId) : null;
    // Notify walker
    sendNotification(walkerId, 'walk_accepted',
      'Walk Accepted ✅',
      `You have been assigned to walk ${dog?.name || 'a dog'}. Check your schedule.`,
      { walkId }
    );
    // Notify owner
    if (walk?.ownerId) {
      const walker = data.users.find(u => u.id === walkerId);
      sendNotification(walk.ownerId, 'walk_accepted',
        'Walker Assigned 🐾',
        `${walker?.name || 'A walker'} has been assigned to walk ${dog?.name || 'your dog'}.`,
        { walkId, walkerId }
      );
    }
  };
  const cancelWalk = (walkId: string, reason?: string, cancelledBy?: 'owner' | 'walker') => {
    const walk = data.walks.find(w => w.id === walkId);
    const reasonLabels: Record<string, string> = {
      not_home: 'Owner not home',
      dog_ill: 'Dog is ill or injured',
      emergency: 'Personal emergency',
      aggressive: 'Dog too aggressive',
      weather: 'Bad weather conditions',
      timeout: 'No response from walker',
      other: 'Other reason',
    };
    const cancelNote = reason ? `CANCEL_REASON: ${reasonLabels[reason] || reason}` : null;
    const updatedNotes = [cancelNote, walk?.notes].filter(Boolean).join('\n') || undefined;
    updateWalk(walkId, { status: 'cancelled', ...(updatedNotes ? { notes: updatedNotes } : {}) });
    // Notify the other party based on who cancelled
    const byWalker = cancelledBy === 'walker' || (!cancelledBy && reason && reason !== 'timeout');
    if (byWalker) {
      // Walker cancelled → notify owner
      if (walk?.ownerId) {
        sendNotification(walk.ownerId, 'walk_cancelled',
          '⚠️ Walk Cancelled by Walker',
          `Your walker cancelled: ${reasonLabels[reason || ''] || reason || 'reason not given'}. Tap to rebook anytime.`,
          { walkId }
        );
      }
    } else {
      // Owner cancelled → notify walker
      if (walk?.walkerId) {
        sendNotification(walk.walkerId, 'walk_cancelled',
          '⚠️ Walk Cancelled by Owner',
          'The owner has cancelled this booking.',
          { walkId }
        );
      }
    }
  };

  // Walker declines an assigned walk — returns it to pending for other walkers
  const declineWalk = (walkId: string) => {
    const walk = data.walks.find(w => w.id === walkId);
    const decliningWalkerId = walk?.walkerId;
    setData(prev => ({
      ...prev,
      walks: prev.walks.map(w => w.id === walkId ? { ...w, status: 'pending' as const, walkerId: undefined } : w),
    }));
    supabase.from('walks').update({ status: 'pending', walker_id: null }).eq('id', walkId)
      .then(({ error }) => { if (error) console.error('declineWalk:', error); });
    // Notify owner that walker declined
    if (walk?.ownerId) {
      sendNotification(walk.ownerId, 'walk_booked',
        'Walker Declined Walk',
        'Your walker was unable to take the walk. It\'s back in the pool — another walker will accept soon.',
        { walkId }
      );
    }
    // Notify other active walkers about the re-opened walk
    data.users
      .filter(u => u.role === 'walker' && u.walkerStatus === 'active' && u.id !== decliningWalkerId)
      .forEach(w => {
        sendNotification(
          w.id,
          'walk_booked',
          'Walk Re-opened 🐾',
          'A walk has been re-opened — be the first to accept!',
          { walkId }
        );
      });
  };

  // Owner rates a completed walk
  const addRating = (walkId: string, rating: number, comment?: string) => {
    setData(prev => ({
      ...prev,
      walks: prev.walks.map(w => w.id === walkId ? { ...w, rating, ratingComment: comment } : w),
    }));
    supabase.from('walks').update({ rating, rating_comment: comment ?? null }).eq('id', walkId)
      .then(({ error }) => { if (error) console.warn('addRating (column may need SQL migration):', error); });
    // Notify walker
    const walk = data.walks.find(w => w.id === walkId);
    if (walk?.walkerId) {
      const stars = '⭐'.repeat(rating);
      sendNotification(walk.walkerId, 'walk_completed',
        `You got a ${rating}-star review! ${stars}`,
        comment ? `"${comment}"` : 'Keep up the great work!',
        { walkId }
      );
    }
  };

  // ── Payments ─────────────────────────────────────────────
  const markPaymentPaid = (paymentId: string, method: 'cash' | 'mobile_money' | 'bank' | 'online' = 'cash') => {
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.id === paymentId
        ? { ...p, status: 'paid' as const, paidAt: now, paymentMethod: method }
        : p),
    }));
    supabase.from('payments').update({ status: 'paid', paid_at: now, payment_method: method }).eq('id', paymentId)
      .then(({ error }) => { if (error) console.error('markPaymentPaid:', error); });
  };

  const confirmPaymentReceived = (paymentId: string) => {
    setData(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.id === paymentId ? { ...p, walkerConfirmed: true } : p),
    }));
    supabase.from('payments').update({ walker_confirmed: true }).eq('id', paymentId)
      .then(({ error }) => { if (error) console.warn('confirmPaymentReceived (column may not exist yet):', error); });
  };

  // ── User images (localStorage fallback for legacy/offline users) ────
  const USER_IMAGES_KEY = 'pawfleet_user_images';
  const mergeUserImages = (users: User[]): User[] => {
    try {
      const imgs = JSON.parse(localStorage.getItem(USER_IMAGES_KEY) || '{}');
      return users.map(u => (!u.imageUrl && imgs[u.id]) ? { ...u, imageUrl: imgs[u.id] } : u);
    } catch { return users; }
  };

  // ── Dogs ─────────────────────────────────────────────────
  // Dog images are stored in localStorage (base64 too large for Supabase text column)
  const DOG_IMAGES_KEY = 'pawfleet_dog_images';
  const getDogImages = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(DOG_IMAGES_KEY) || '{}'); } catch { return {}; }
  };
  const saveDogImage = (dogId: string, imageUrl: string) => {
    const imgs = getDogImages();
    imgs[dogId] = imageUrl;
    localStorage.setItem(DOG_IMAGES_KEY, JSON.stringify(imgs));
  };
  const mergeDogImages = (dogs: Dog[]): Dog[] => {
    const imgs = getDogImages();
    return dogs.map(d => imgs[d.id] ? { ...d, imageUrl: imgs[d.id] } : d);
  };

  const createDog = (dog: Omit<Dog, 'id'>): Dog => {
    const newDog: Dog = { ...dog, id: crypto.randomUUID(), healthLogs: [] };
    // Save image to localStorage so it persists across refreshes without Supabase size limits
    if (dog.imageUrl) saveDogImage(newDog.id, dog.imageUrl);
    setData(prev => ({ ...prev, dogs: [...prev.dogs, newDog] }));
    // Store metadata only (no image_url) in Supabase
    supabase.from('dogs').insert({
      id: newDog.id, name: dog.name, breed: dog.breed ?? null, age: dog.age ?? null,
      owner_id: dog.ownerId, notes: dog.notes ?? null,
    }).then(({ error }) => { if (error) console.error('createDog:', error); });
    return newDog;
  };

  const updateDog = (id: string, updates: Partial<Dog>) => {
    // Save image to localStorage if updated
    if (updates.imageUrl) saveDogImage(id, updates.imageUrl);
    setData(prev => ({ ...prev, dogs: prev.dogs.map(d => d.id === id ? { ...d, ...updates } : d) }));
    const db: Record<string, any> = {};
    if (updates.name !== undefined)  db.name = updates.name;
    if (updates.breed !== undefined) db.breed = updates.breed;
    if (updates.age !== undefined)   db.age = updates.age;
    if (updates.notes !== undefined) db.notes = updates.notes;
    if (Object.keys(db).length > 0) {
      supabase.from('dogs').update(db).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateDog:', error); });
    }
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
      email: user.email ?? null, password: '', role: user.role,
      image_url: user.imageUrl ?? null,
      walker_status: user.walkerStatus ?? null,
      nrc: user.nrc ?? null,
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

  const updateUser = async (userId: string, updates: Partial<User>) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...updates } : u),
    }));
    if (currentUser?.id === userId) {
      const updated = { ...currentUser, ...updates };
      setCurrentUser(updated);
      sessionStorage.setItem('pawfleet_user', JSON.stringify(updated));
    }
    const dbFields: Record<string, any> = {};
    if (updates.name !== undefined)     dbFields.name     = updates.name;
    if (updates.phone !== undefined)    dbFields.phone    = updates.phone;
    if (updates.email !== undefined)    dbFields.email    = updates.email;
    if (updates.imageUrl !== undefined)             dbFields.image_url             = updates.imageUrl;
    if (updates.businessName !== undefined)          dbFields.business_name          = updates.businessName;
    if (updates.businessAddress !== undefined)       dbFields.business_address       = updates.businessAddress;
    if (updates.businessType !== undefined)          dbFields.business_type          = updates.businessType;
    if (updates.subscriptionPaidUntil !== undefined) dbFields.subscription_paid_until = updates.subscriptionPaidUntil;
    if (updates.trialEndsAt !== undefined)           dbFields.trial_ends_at          = updates.trialEndsAt;
    if ((updates as any).serviceLat !== undefined)   dbFields.service_lat             = (updates as any).serviceLat;
    if ((updates as any).serviceLng !== undefined)   dbFields.service_lng             = (updates as any).serviceLng;
    if (Object.keys(dbFields).length > 0) {
      supabase.from('users').update(dbFields).eq('id', userId)
        .then(({ error }) => { if (error) console.error('updateUser:', error); });
    }
  };

  const refreshData = () => { loadData(); };

  const activateSubscription = (userId: string, months = 1) => {
    const user = data.users.find(u => u.id === userId);
    const base = user?.subscriptionPaidUntil && new Date(user.subscriptionPaidUntil) > new Date()
      ? new Date(user.subscriptionPaidUntil)
      : new Date();
    base.setMonth(base.getMonth() + months);
    const until = base.toISOString();
    updateUser(userId, { subscriptionPaidUntil: until });
  };

  const approveWalker = (walkerId: string) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === walkerId ? { ...u, walkerStatus: 'active' as const } : u),
    }));
    supabase.from('users').update({ walker_status: 'active' }).eq('id', walkerId)
      .then(({ error }) => { if (error) console.error('approveWalker:', error); });
    sendNotification(walkerId, 'walker_approved',
      'Application Approved! 🎉',
      'Congratulations! Your walker application has been approved. You can now start accepting walks.',
    );
  };

  const rejectWalker = (walkerId: string) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === walkerId ? { ...u, walkerStatus: 'suspended' as const } : u),
    }));
    supabase.from('users').update({ walker_status: 'suspended' }).eq('id', walkerId)
      .then(({ error }) => { if (error) console.error('rejectWalker:', error); });
    sendNotification(walkerId, 'walker_rejected',
      'Application Not Approved',
      'Unfortunately your walker application was not approved at this time. Contact admin for more information.',
    );
  };

  return (
    <AppContext.Provider value={{
      loading, currentUser, data, login, register, logout,
      createWalk, updateWalk, startWalk, endWalk,
      assignWalker, cancelWalk, markPaymentPaid, confirmPaymentReceived,
      createDog, updateDog, logHealth,
      addUser, updateUser, getWalkerStats, refreshData,
      activateSubscription,
      approveWalker, rejectWalker,
      markNotificationRead, markAllNotificationsRead, sendNotification,
      getAdminReferralCode, addRating, declineWalk, updateOrderStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}
// deploy trigger Wed Jun 10 22:48:19 SAST 2026

export type Role = 'admin' | 'walker' | 'owner' | 'shopowner';
export type WalkStatus = 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type WalkerStatus = 'pending_approval' | 'active' | 'suspended';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: Role;
  createdAt: string;
  imageUrl?: string;
  nrc?: string;                        // National Registration Card (walkers)
  walkerStatus?: WalkerStatus;         // Walker application status
  referredByAdminId?: string;          // Which admin's referral code was used
  referralCode?: string;               // Admin's own referral code (admins only)
}

export interface AppNotification {
  id: string;
  userId: string;          // recipient
  type: 'walk_booked' | 'walk_accepted' | 'walk_started' | 'walk_completed' | 'payment_marked' | 'walker_signup' | 'shop_promo' | 'walker_approved' | 'walker_rejected';
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export interface HealthLog {
  date: string; // YYYY-MM-DD
  water: boolean;
  foodMorning: boolean;
  foodEvening: boolean;
}

export interface Dog {
  id: string;
  name: string;
  breed?: string;
  age?: number;
  ownerId: string;
  imageUrl?: string; // base64 data URL
  notes?: string;
  healthLogs?: HealthLog[];
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Walk {
  id: string;
  dogId: string;
  ownerId: string;
  walkerId?: string;
  status: WalkStatus;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  startLocation?: GeoLocation;
  endLocation?: GeoLocation;
  duration?: number;
  price: number;
  walkerEarning: number;
  ownerCost?: number;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'mobile_money';

export interface Payment {
  id: string;
  walkerId: string;
  walkId: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  paidAt?: string;
  walkerConfirmed?: boolean;
  paymentMethod?: PaymentMethod;
}

export type BadgeId = 'first_walk' | 'five_walks' | 'ten_walks' | 'twenty_five_walks' | 'top_walker' | 'consistent';

export interface WalkerBadge {
  id: BadgeId;
  label: string;
  description: string;
  earnedAt: string;
  color: string;
  icon: string;
}

export interface WalkerStats {
  walkerId: string;
  points: number;
  streak: number;
  lastWalkDate?: string;
  badges: WalkerBadge[];
}

// ── Shop Owner types ─────────────────────────────────────────

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  productImg: string;
  quantity: number;
  unitPrice: number;
  total: number;
  buyerId: string;
  buyerName: string;
  shopOwnerId: string;
  purchasedAt: string;
  status: 'pending' | 'confirmed' | 'delivered';
}

export interface ShopNotification {
  id: string;
  shopOwnerId: string;
  type: 'purchase';
  purchase: Purchase;
  read: boolean;
  createdAt: string;
}

// ── Owner gamification ───────────────────────────────────────

export interface OwnerAchievement {
  id: string;
  label: string;
  icon: string;
  description: string;
  earnedAt: string;
}

export interface AppData {
  users: User[];
  dogs: Dog[];
  walks: Walk[];
  payments: Payment[];
  walkerStats: WalkerStats[];
  notifications: AppNotification[];
}

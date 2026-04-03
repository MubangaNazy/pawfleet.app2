export type Role = 'admin' | 'walker' | 'owner';
export type WalkStatus = 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: Role;
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
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  walkerId: string;
  walkId: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  paidAt?: string;
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

export interface AppData {
  users: User[];
  dogs: Dog[];
  walks: Walk[];
  payments: Payment[];
  walkerStats: WalkerStats[];
}

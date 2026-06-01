import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Purchase, ShopNotification } from '../types';

export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  badge: string | null;
  img: string;
  category: 'treats' | 'accessories' | 'meals' | 'hygiene';
  description?: string;
  shopOwnerId?: string; // undefined = PawFleet default products
}

const DEFAULT_PRODUCTS: ShopProduct[] = [
  { id: 'tr1', name: 'Star Biscuits',  price: 120, badge: 'Bestseller', img: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400&q=80', category: 'treats', description: 'Oven-baked star shaped biscuits, 250g' },
  { id: 'tr2', name: 'Chicken Chews',  price: 180, badge: 'New',        img: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400&q=80', category: 'treats', description: 'Air-dried chicken strips, 200g' },
  { id: 'tr3', name: 'Peanut Bites',   price: 90,  badge: null,         img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80', category: 'treats', description: 'Peanut butter training treats, 150g' },
  { id: 'tr4', name: 'Salmon Sticks',  price: 140, badge: null,         img: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&q=80', category: 'treats', description: 'Omega-rich salmon sticks, 180g' },
  { id: 'ac1', name: 'Dog Harness',    price: 380, badge: 'Popular',    img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80', category: 'accessories', description: 'No-pull adjustable harness, S/M/L' },
  { id: 'ac2', name: 'Water Bottle',   price: 220, badge: 'New',        img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80', category: 'accessories', description: 'Leak-proof travel water bottle, 750ml' },
  { id: 'ac3', name: 'Retract Leash',  price: 290, badge: null,         img: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&q=80', category: 'accessories', description: '5m retractable leash with brake' },
  { id: 'ac4', name: 'Poop Bags',      price: 45,  badge: 'Bestseller', img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80', category: 'accessories', description: 'Biodegradable poop bags, 100 pack' },
];

interface CartItem { product: ShopProduct; qty: number; }

interface ShopContextType {
  products: ShopProduct[];
  purchases: Purchase[];
  notifications: ShopNotification[];
  addProduct: (p: Omit<ShopProduct, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Omit<ShopProduct, 'id'>>) => void;
  removeProduct: (id: string) => void;
  createPurchase: (items: CartItem[], buyerId: string, buyerName: string) => Purchase[];
  markNotificationRead: (id: string) => void;
  unreadCount: (shopOwnerId: string) => number;
}

const ShopContext = createContext<ShopContextType | null>(null);
export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
};

const STORAGE_KEY     = 'pawfleet_shop_products';
const PURCHASES_KEY   = 'pawfleet_purchases';
const NOTIF_KEY       = 'pawfleet_shop_notifs';

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<ShopProduct[]>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : DEFAULT_PRODUCTS; }
    catch { return DEFAULT_PRODUCTS; }
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    try { const s = localStorage.getItem(PURCHASES_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [notifications, setNotifications] = useState<ShopNotification[]>(() => {
    try { const s = localStorage.getItem(NOTIF_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications)); }, [notifications]);

  const addProduct = (p: Omit<ShopProduct, 'id'>) => {
    setProducts(prev => [...prev, { ...p, id: `prod_${Date.now()}` }]);
  };
  const updateProduct = (id: string, updates: Partial<Omit<ShopProduct, 'id'>>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };
  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const createPurchase = (items: CartItem[], buyerId: string, buyerName: string): Purchase[] => {
    const now = new Date().toISOString();
    const newPurchases: Purchase[] = items.map(({ product, qty }) => ({
      id: `pur_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      productId: product.id,
      productName: product.name,
      productImg: product.img,
      quantity: qty,
      unitPrice: product.price,
      total: product.price * qty,
      buyerId,
      buyerName,
      shopOwnerId: product.shopOwnerId || 'pawfleet',
      purchasedAt: now,
      status: 'pending',
    }));
    setPurchases(prev => [...prev, ...newPurchases]);

    // Create notifications for shop owners
    const newNotifs: ShopNotification[] = newPurchases
      .filter(p => p.shopOwnerId !== 'pawfleet')
      .map(purchase => ({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        shopOwnerId: purchase.shopOwnerId,
        type: 'purchase' as const,
        purchase,
        read: false,
        createdAt: now,
      }));
    if (newNotifs.length > 0) setNotifications(prev => [...prev, ...newNotifs]);

    return newPurchases;
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = (shopOwnerId: string) =>
    notifications.filter(n => n.shopOwnerId === shopOwnerId && !n.read).length;

  return (
    <ShopContext.Provider value={{
      products, purchases, notifications,
      addProduct, updateProduct, removeProduct,
      createPurchase, markNotificationRead, unreadCount,
    }}>
      {children}
    </ShopContext.Provider>
  );
}

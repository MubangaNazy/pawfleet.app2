import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Purchase, ShopNotification } from '../types';

export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  badge: string | null;
  img: string;
  category: 'treats' | 'accessories' | 'meals' | 'hygiene';
  description?: string;
  brand?: string;
  specs?: string;
  shopOwnerId?: string;
}

// Default products — always visible to everyone, never deleted
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
  createPurchase: (items: CartItem[], buyerId: string, buyerName: string, deliveryAddress?: string, paymentMethod?: string) => Purchase[];
  markNotificationRead: (id: string) => void;
  unreadCount: (shopOwnerId: string) => number;
}

const ShopContext = createContext<ShopContextType | null>(null);
export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
};

const PURCHASES_KEY = 'pawfleet_purchases';
const NOTIF_KEY     = 'pawfleet_shop_notifs';

function toProduct(r: any): ShopProduct {
  return {
    id: r.id, name: r.name, price: Number(r.price),
    badge: r.badge ?? null, img: r.img, category: r.category,
    description: r.description ?? undefined,
    brand: r.brand ?? undefined,
    specs: r.specs ?? undefined,
    shopOwnerId: r.shop_owner_id ?? undefined,
  };
}

function toPurchase(r: any): Purchase {
  return {
    id: r.id, productId: r.product_id, productName: r.product_name,
    productImg: r.product_img, quantity: r.quantity,
    unitPrice: Number(r.unit_price), total: Number(r.total),
    buyerId: r.buyer_id, buyerName: r.buyer_name,
    shopOwnerId: r.shop_owner_id ?? 'pawfleet',
    purchasedAt: r.purchased_at, status: r.status ?? 'pending',
  };
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [customProducts, setCustomProducts] = useState<ShopProduct[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [notifications, setNotifications] = useState<ShopNotification[]>(() => {
    try { const s = localStorage.getItem(NOTIF_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications)); }, [notifications]);

  // Load products and orders from Supabase on mount
  useEffect(() => {
    supabase.from('shop_products').select('*').order('created_at').then(({ data, error }) => {
      if (!error && data) setCustomProducts(data.map(toProduct));
    });
    supabase.from('shop_orders').select('*').order('purchased_at', { ascending: false }).then(({ data, error }) => {
      if (!error && data) setPurchases(data.map(toPurchase));
    });
    // Realtime: new orders come in live
    const channel = supabase.channel('shop_orders_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shop_orders' }, p => {
        setPurchases(prev => [toPurchase(p.new), ...prev]);
        // Add a local notification for the shop owner
        const purchase = toPurchase(p.new);
        if (purchase.shopOwnerId !== 'pawfleet') {
          setNotifications(prev => [...prev, {
            id: `notif_${Date.now()}`, shopOwnerId: purchase.shopOwnerId,
            type: 'purchase', purchase, read: false, createdAt: new Date().toISOString(),
          }]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shop_orders' }, p => {
        setPurchases(prev => prev.map(pur => pur.id === p.new.id ? toPurchase(p.new) : pur));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // All products: defaults + shop-owner-added (from Supabase)
  const products = [...DEFAULT_PRODUCTS, ...customProducts];

  const addProduct = (p: Omit<ShopProduct, 'id'>) => {
    const id = `prod_${Date.now()}`;
    const newProd: ShopProduct = { ...p, id };
    setCustomProducts(prev => [...prev, newProd]);
    supabase.from('shop_products').insert({
      id, name: p.name, price: p.price, badge: p.badge ?? null,
      img: p.img, category: p.category, description: p.description ?? null,
      brand: p.brand ?? null, specs: p.specs ?? null,
      shop_owner_id: p.shopOwnerId ?? null,
    }).then(({ error }) => { if (error) console.error('addProduct:', error); });
  };

  const updateProduct = (id: string, updates: Partial<Omit<ShopProduct, 'id'>>) => {
    // Only custom products can be edited
    setCustomProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const db: Record<string, any> = {};
    if (updates.name !== undefined)        db.name = updates.name;
    if (updates.price !== undefined)       db.price = updates.price;
    if (updates.badge !== undefined)       db.badge = updates.badge;
    if (updates.img !== undefined)         db.img = updates.img;
    if (updates.category !== undefined)    db.category = updates.category;
    if (updates.description !== undefined) db.description = updates.description;
    if (updates.brand !== undefined)       db.brand = updates.brand;
    if (updates.specs !== undefined)       db.specs = updates.specs;
    supabase.from('shop_products').update(db).eq('id', id)
      .then(({ error }) => { if (error) console.error('updateProduct:', error); });
  };

  const removeProduct = (id: string) => {
    setCustomProducts(prev => prev.filter(p => p.id !== id));
    supabase.from('shop_products').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('removeProduct:', error); });
  };

  const createPurchase = (items: CartItem[], buyerId: string, buyerName: string, deliveryAddress?: string, paymentMethod?: string): Purchase[] => {
    const now = new Date().toISOString();
    const newPurchases: Purchase[] = items.map(({ product, qty }) => ({
      id: `pur_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      productId: product.id, productName: product.name, productImg: product.img,
      quantity: qty, unitPrice: product.price, total: product.price * qty,
      buyerId, buyerName, shopOwnerId: product.shopOwnerId || 'pawfleet',
      purchasedAt: now, status: 'pending',
    }));

    // Persist each order to Supabase (realtime will update the shop owner's screen)
    newPurchases.forEach(p => {
      supabase.from('shop_orders').insert({
        id: p.id, product_id: p.productId, product_name: p.productName,
        product_img: p.productImg, quantity: p.quantity,
        unit_price: p.unitPrice, total: p.total,
        buyer_id: p.buyerId, buyer_name: p.buyerName,
        shop_owner_id: p.shopOwnerId === 'pawfleet' ? null : p.shopOwnerId,
        purchased_at: p.purchasedAt, status: p.status,
        delivery_address: deliveryAddress ?? null,
        payment_method: paymentMethod ?? null,
      }).then(({ error }) => { if (error) console.error('createPurchase insert:', error); });
    });

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

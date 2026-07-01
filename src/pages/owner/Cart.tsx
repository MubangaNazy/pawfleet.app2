import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Minus, Plus, Trash2, CheckCircle, Package, Truck, MapPin, Loader2, CreditCard } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useShop } from '../../context/ShopContext';
import PaymentModal from '../../components/ui/PaymentModal';
import { useApp } from '../../context/AppContext';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const json = await res.json();
    return json.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function Cart() {
  const { items, updateQty, removeItem, clearCart, total, count } = useCart();
  const { currentUser, sendNotification } = useApp();
  const { products, createPurchase } = useShop();
  const navigate = useNavigate();

  const [ordered, setOrdered] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [payMethod, setPayMethod] = useState<'online' | 'pod'>('online');
  const [showPayment, setShowPayment] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const addressInputRef = useRef<HTMLInputElement>(null);

  const handleUseMyLocation = async () => {
    setGpsLoading(true);
    setGpsError('');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, enableHighAccuracy: true });
      });
      const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      setAddress(addr);
      addressInputRef.current?.focus();
    } catch {
      setGpsError('Could not get location. Please type your address.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!address.trim()) return;
    if (payMethod === 'pod') {
      confirmOrder('pay_on_delivery');
    } else {
      setShowPayment(true);
    }
  };

  const confirmOrder = (method: string) => {
    if (currentUser) {
      const purchaseItems = items.flatMap(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        return product ? [{ product, qty: cartItem.qty }] : [];
      });
      if (purchaseItems.length > 0) {
        createPurchase(purchaseItems, currentUser.id, currentUser.name, address, method);

        // Group by shop owner and send Supabase-backed notifications
        const byOwner: Record<string, typeof purchaseItems> = {};
        purchaseItems.forEach(pi => {
          const ownerId = pi.product.shopOwnerId || 'pawfleet';
          if (ownerId !== 'pawfleet') {
            if (!byOwner[ownerId]) byOwner[ownerId] = [];
            byOwner[ownerId].push(pi);
          }
        });
        Object.entries(byOwner).forEach(([ownerId, shopItems]) => {
          const itemSummary = shopItems.map(si => `${si.product.name} ×${si.qty}`).join(', ');
          const earned = shopItems.reduce((s, si) => s + si.product.price * si.qty, 0);
          const qty = shopItems.reduce((s, si) => s + si.qty, 0);
          sendNotification(
            ownerId,
            'shop_order',
            `New Order! 🎉 K${earned} earned`,
            `${currentUser.name} ordered: ${itemSummary}. Deliver to: ${address}`,
            {
              buyerId: currentUser.id,
              buyerName: currentUser.name,
              earned: String(earned),
              address,
              itemSummary,
              phone: phone || currentUser.phone || '',
              paymentMethod: method,
              payOnDelivery: method === 'pay_on_delivery' || payMethod === 'pod' ? 'true' : 'false',
              totalQty: String(qty),
              deliveryStatus: 'pending',
            }
          );
        });
      }
    }
    // Send receipt email for online payments
    if (method !== 'pay_on_delivery' && currentUser?.email) {
      fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: currentUser.email,
          name: currentUser.name,
          amount: total,
          description: `Shop order (${items.reduce((s, i) => s + i.qty, 0)} items)`,
          reference: method,
          operator: method,
        }),
      }).catch(() => {});
    }
    clearCart();
    setShowPayment(false);
    setOrdered(true);
  };

  if (ordered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 p-6 text-center max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-ink mb-2">Order Placed!</h2>
          <p className="text-ink-secondary text-sm leading-relaxed">
            Your order has been received. We'll prepare it and deliver to your address.
          </p>
        </div>
        <div className="w-full bg-primary-50 rounded-2xl p-4 space-y-2">
          {[
            { icon: Package, label: 'Order Received',     done: true  },
            { icon: Package, label: 'Preparing your order', done: false },
            { icon: Truck,   label: 'Out for delivery',   done: false },
          ].map(({ icon: Icon, label, done }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? 'bg-primary text-white' : 'bg-white border-2 border-surface-border'}`}>
                {done && <Icon className="w-3 h-3" />}
              </div>
              <span className={`text-sm ${done ? 'text-primary font-semibold' : 'text-ink-muted'}`}>{label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/owner/shop')}
          className="w-full py-4 bg-primary text-white rounded-2xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 p-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-surface-secondary flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-ink-muted" />
        </div>
        <div>
          <p className="text-lg font-bold text-ink mb-1">Your cart is empty</p>
          <p className="text-ink-secondary text-sm">Browse our fresh dog food and accessories</p>
        </div>
        <button
          onClick={() => navigate('/owner/shop')}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Browse Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-40 lg:pb-12">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-ink">Your Cart</h1>
          <p className="text-xs text-ink-muted">{count} item{count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Items */}
        {items.map(item => (
          <div key={item.id} className="bg-white border border-surface-border rounded-2xl p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-surface-secondary flex items-center justify-center text-3xl shrink-0">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{item.name}</p>
              <p className="text-xs text-ink-muted">{item.subtitle}</p>
              <p className="text-sm font-bold text-primary mt-1">
                ZMW {(item.price * item.qty).toLocaleString()}
                <span className="text-xs font-normal text-ink-muted ml-1">(ZMW {item.price.toLocaleString()} each)</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.id, item.qty - 1)}
                  className="w-7 h-7 rounded-lg bg-surface-secondary text-ink flex items-center justify-center hover:bg-surface-hover">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)}
                  className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Delivery Details */}
        <div className="bg-white border border-surface-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-ink">Delivery Details</p>

          {/* Address */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-ink-muted">Delivery Address *</label>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
              >
                {gpsLoading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <MapPin className="w-3 h-3" />}
                {gpsLoading ? 'Getting location…' : 'Use my location'}
              </button>
            </div>
            {gpsError && <p className="text-[11px] text-danger mb-1">{gpsError}</p>}
            <input
              ref={addressInputRef}
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Plot 12, Kabulonga, Lusaka"
              className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs text-ink-muted mb-1 block">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={currentUser?.phone || '+260 97 000 0000'}
              className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {/* Payment method selection */}
          <div>
            <p className="text-xs font-bold text-ink-muted mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod('online')}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all text-center ${
                  payMethod === 'online'
                    ? 'border-primary bg-primary/5'
                    : 'border-surface-border hover:border-primary/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${payMethod === 'online' ? 'bg-primary' : 'bg-surface-secondary'}`}>
                  <CreditCard className={`w-5 h-5 ${payMethod === 'online' ? 'text-white' : 'text-ink-muted'}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${payMethod === 'online' ? 'text-primary' : 'text-ink'}`}>Pay Online</p>
                  <p className="text-[10px] text-ink-muted leading-tight">Mobile Money / Card</p>
                </div>
                {payMethod === 'online' && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('pod')}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all text-center ${
                  payMethod === 'pod'
                    ? 'border-amber-500 bg-amber-50/60'
                    : 'border-surface-border hover:border-amber-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${payMethod === 'pod' ? 'bg-amber-500' : 'bg-surface-secondary'}`}>
                  <Truck className={`w-5 h-5 ${payMethod === 'pod' ? 'text-white' : 'text-ink-muted'}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${payMethod === 'pod' ? 'text-amber-700' : 'text-ink'}`}>Pay on Delivery</p>
                  <p className="text-[10px] text-ink-muted leading-tight">Cash when it arrives</p>
                </div>
                {payMethod === 'pod' && <CheckCircle className="w-3.5 h-3.5 text-amber-500" />}
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white border border-surface-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-ink">Order Summary</p>
          <div className="space-y-2 text-sm">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-ink-secondary">
                <span>{item.name} × {item.qty}</span>
                <span>ZMW {(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-ink-secondary border-t border-surface-border pt-3">
            <span>Delivery</span>
            <span className="text-primary font-semibold">Free</span>
          </div>
          <div className="flex justify-between text-sm text-ink-secondary border-t border-surface-border pt-3">
            <span>Payment</span>
            <span className={`font-semibold ${payMethod === 'pod' ? 'text-amber-600' : 'text-primary'}`}>
              {payMethod === 'pod' ? '🚚 Pay on Delivery' : '📱 Pay Online'}
            </span>
          </div>
          <div className="flex justify-between font-bold text-ink border-t border-surface-border pt-3">
            <span>Total</span>
            <span className="text-xl">ZMW {total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Sticky checkout */}
      <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 z-20">
        <button
          onClick={handleCheckout}
          disabled={!address.trim()}
          className="w-full max-w-2xl mx-auto flex items-center justify-between rounded-2xl px-5 py-4 shadow-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', display: 'flex' }}
        >
          <span className="font-semibold">
            {payMethod === 'pod' ? 'Place Order — Pay on Delivery' : 'Place Order & Pay Online'}
          </span>
          <span className="font-bold">ZMW {total.toLocaleString()} →</span>
        </button>
      </div>

      {showPayment && (
        <PaymentModal
          amount={total}
          description={`Shop order (${count} item${count !== 1 ? 's' : ''})`}
          customerName={currentUser?.name || ''}
          customerPhone={phone || currentUser?.phone}
          onConfirm={confirmOrder}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

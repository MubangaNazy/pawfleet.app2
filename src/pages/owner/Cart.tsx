import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Minus, Plus, Trash2, CheckCircle, Package, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function Cart() {
  const { items, updateQty, removeItem, clearCart, total, count } = useCart();
  const navigate = useNavigate();
  const [ordered, setOrdered] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const handleCheckout = () => {
    if (!address.trim()) return;
    clearCart();
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
            Your order has been received. We'll prepare it fresh and deliver to your address.
          </p>
        </div>
        <div className="w-full bg-primary-50 rounded-2xl p-4 space-y-2">
          {[
            { icon: Package, label: 'Order Received', done: true },
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
    <div className="max-w-2xl mx-auto pb-36 lg:pb-12">
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
                <span className="text-xs font-normal text-ink-muted ml-1">
                  (ZMW {item.price.toLocaleString()} each)
                </span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  className="w-7 h-7 rounded-lg bg-surface-secondary text-ink flex items-center justify-center hover:bg-surface-hover"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                <button
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Delivery address */}
        <div className="bg-white border border-surface-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-ink">Delivery Details</p>
          <div>
            <label className="text-xs text-ink-muted mb-1 block">Delivery Address *</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Plot 12, Kabulonga, Lusaka"
              className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted mb-1 block">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+260 97 000 0000"
              className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Order summary */}
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
          className="w-full max-w-2xl mx-auto flex items-center justify-between bg-primary text-white rounded-2xl px-5 py-4 shadow-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="font-semibold">Place Order</span>
          <span className="font-bold">ZMW {total.toLocaleString()} →</span>
        </button>
      </div>
    </div>
  );
}

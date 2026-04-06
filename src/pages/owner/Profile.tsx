import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Mail, Dog, LogOut, ChevronRight,
  Edit2, CheckCircle, Shield, Bell, HelpCircle, Star,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';

export default function Profile() {
  const { currentUser, data, logout } = useApp();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const myWalks = data.walks.filter(w => w.ownerId === currentUser?.id);
  const completedWalks = myWalks.filter(w => w.status === 'completed');

  const initials = currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      group: 'Account',
      items: [
        { icon: User,    label: 'Personal Info',       sublabel: currentUser?.name },
        { icon: Phone,   label: 'Phone Number',         sublabel: currentUser?.phone },
        { icon: Mail,    label: 'Email Address',         sublabel: currentUser?.email || 'Not set' },
      ],
    },
    {
      group: 'Preferences',
      items: [
        { icon: Bell,    label: 'Notifications',        sublabel: 'Walk updates, reminders' },
        { icon: Shield,  label: 'Privacy & Security',   sublabel: 'Password, permissions' },
      ],
    },
    {
      group: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & FAQ',        sublabel: 'Get answers quickly' },
        { icon: Star,       label: 'Rate PawFleet',     sublabel: 'Share your experience' },
      ],
    },
  ];

  return (
    <div className="max-w-xl mx-auto pb-28 lg:pb-8 px-4 pt-6 space-y-6">
      {/* Profile card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold text-white shadow-lg">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{currentUser?.name}</h1>
            <p className="text-white/80 text-sm">{currentUser?.phone}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                {currentUser?.role}
              </span>
              <CheckCircle className="w-3.5 h-3.5 text-white/80" />
              <span className="text-white/80 text-xs">Verified</span>
            </div>
          </div>
          <button className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors">
            <Edit2 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/20">
          {[
            { label: 'Total Walks', value: completedWalks.length },
            { label: 'My Dogs',     value: myDogs.length },
            { label: 'Member Since', value: currentUser?.createdAt ? format(new Date(currentUser.createdAt), 'MMM yy') : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-lg font-bold">{value}</p>
              <p className="text-white/70 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* My Dogs */}
      {myDogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink">My Dogs</h2>
            <button onClick={() => navigate('/owner/dogs')} className="text-xs text-primary font-medium">
              Manage →
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {myDogs.map(dog => (
              <button
                key={dog.id}
                onClick={() => navigate(`/owner/dogs/${dog.id}`)}
                className="shrink-0 bg-white border border-surface-border rounded-2xl p-3 text-center w-24 hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-secondary flex items-center justify-center mx-auto mb-2 overflow-hidden">
                  {dog.imageUrl
                    ? <img src={dog.imageUrl} alt={dog.name} className="w-12 h-12 object-cover" />
                    : <Dog className="w-6 h-6 text-ink-muted" />}
                </div>
                <p className="text-xs font-semibold text-ink truncate">{dog.name}</p>
                <p className="text-[10px] text-ink-muted truncate">{dog.breed || 'Mixed'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu groups */}
      {menuItems.map(group => (
        <div key={group.group}>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">{group.group}</p>
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
            {group.items.map(item => (
              <button
                key={item.label}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors text-left"
              >
                <div className="w-8 h-8 bg-surface-secondary rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-ink-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  {item.sublabel && (
                    <p className="text-xs text-ink-muted truncate">{item.sublabel}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
        {showLogoutConfirm ? (
          <div className="p-4 text-center">
            <p className="text-sm font-medium text-ink mb-1">Log out of PawFleet?</p>
            <p className="text-xs text-ink-muted mb-4">You'll need to sign in again to access your account.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-5 py-2 rounded-xl border border-surface-border text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                Log Out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left"
          >
            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500">Log Out</span>
          </button>
        )}
      </div>

      <p className="text-center text-xs text-ink-muted pb-2">PawFleet v1.0.0 · Made with 🐾 in Zambia</p>
    </div>
  );
}

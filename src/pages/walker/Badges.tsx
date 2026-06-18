import React, { useState, useEffect } from 'react';
import { isThisWeek, isThisMonth } from 'date-fns';
import { Trophy, Flame, Star, Lock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { BadgeId } from '../../types';

const ALL_BADGES: Array<{ id: BadgeId; label: string; description: string; icon: string; color: string; minWalks: number }> = [
  { id: 'first_walk',         label: 'First Steps',  description: 'Completed your first walk!', icon: '🐾', color: '#10B981', minWalks: 1 },
  { id: 'five_walks',         label: '5 Walks Done', description: 'Completed 5 walks',          icon: '⭐', color: '#4776E6', minWalks: 5 },
  { id: 'ten_walks',          label: '10 Walks Done',description: 'Completed 10 walks',         icon: '🏆', color: '#8B5CF6', minWalks: 10 },
  { id: 'twenty_five_walks',  label: 'Walk Master',  description: 'Completed 25 walks',         icon: '🥇', color: '#F59E0B', minWalks: 25 },
];

export const WALK_BADGE_DEFS = ALL_BADGES;

const LEVELS = [
  { name: 'Rookie',       minPts: 0,    maxPts: 200,      color: '#9CA3AF' },
  { name: 'Junior',       minPts: 200,  maxPts: 500,      color: '#10B981' },
  { name: 'Professional', minPts: 500,  maxPts: 1000,     color: '#4776E6' },
  { name: 'Expert',       minPts: 1000, maxPts: Infinity, color: '#F59E0B' },
];

export default function WalkerBadges() {
  const { data, currentUser, getWalkerStats, sendNotification } = useApp();
  const gamStats = getWalkerStats(currentUser?.id || '');

  const completedWalks = data.walks.filter(w => w.walkerId === currentUser?.id && w.status === 'completed');
  const thisWeek  = completedWalks.filter(w => w.endTime && isThisWeek(new Date(w.endTime))).length;
  const thisMonth = completedWalks.filter(w => w.endTime && isThisMonth(new Date(w.endTime))).length;

  // Auto-earn + claim state
  const claimKey = `pawfleet_walker_claimed_${currentUser?.id}`;
  const notifKey = `pawfleet_walker_badgenotif_${currentUser?.id}`;
  const [claimed, setClaimed] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(claimKey) || '[]')
  );

  useEffect(() => {
    if (!currentUser) return;
    const notified: string[] = JSON.parse(localStorage.getItem(notifKey) || '[]');
    const newlyEarned = ALL_BADGES.filter(b =>
      completedWalks.length >= b.minWalks && !notified.includes(b.id)
    );
    if (newlyEarned.length === 0) return;
    newlyEarned.forEach(b => {
      sendNotification(currentUser.id, 'achievement',
        `Badge Unlocked! ${b.icon}`, `You earned "${b.label}" — ${b.description}`, {
          achievementId: b.id, achievementIcon: b.icon,
          achievementLabel: b.label, achievementDescription: b.description,
        });
    });
    localStorage.setItem(notifKey, JSON.stringify([...notified, ...newlyEarned.map(b => b.id)]));
  }, [completedWalks.length]);

  const handleClaim = (badgeId: string) => {
    const next = [...claimed, badgeId];
    setClaimed(next);
    localStorage.setItem(claimKey, JSON.stringify(next));
  };

  // Level
  const levelArr = LEVELS.filter(l => gamStats.points >= l.minPts);
  const currentLevel = levelArr[levelArr.length - 1] || LEVELS[0];
  const nextLevel = LEVELS.find(l => gamStats.points < l.minPts);
  const levelProgress = nextLevel
    ? ((gamStats.points - currentLevel.minPts) / (currentLevel.maxPts - currentLevel.minPts)) * 100
    : 100;

  const earnedBadgeIds = gamStats.badges.map(b => b.id);

  const unclaimedEarned = ALL_BADGES.filter(b =>
    completedWalks.length >= b.minWalks && !claimed.includes(b.id)
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Achievements</h1>
        <p className="text-ink-secondary mt-1">Your progress and earned badges</p>
      </div>

      {/* Claim banner */}
      {unclaimedEarned.length > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', border: '1.5px solid #FDE68A' }}>
          <span className="text-2xl">🎁</span>
          <div className="flex-1">
            <p className="font-bold text-ink text-sm">
              {unclaimedEarned.length} badge{unclaimedEarned.length > 1 ? 's' : ''} ready to claim!
            </p>
            <p className="text-xs text-ink-muted">Scroll down and tap "Claim" to add them to your profile.</p>
          </div>
        </div>
      )}

      {/* Points Summary Card */}
      <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-ink">{gamStats.points}</span>
              <span className="text-ink-secondary">points</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-sm font-semibold text-white" style={{ background: currentLevel.color }}>
                {currentLevel.name}
              </span>
              {nextLevel && <span className="text-xs text-ink-muted">→ {nextLevel.name} at {nextLevel.minPts} pts</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-warning-light border border-warning/30">
            <Flame className="w-5 h-5 text-warning" />
            <div>
              <span className="text-lg font-bold text-warning-dark">{gamStats.streak}</span>
              <p className="text-xs text-warning-dark/70 leading-none">day streak</p>
            </div>
          </div>
        </div>
        {nextLevel && (
          <ProgressBar value={levelProgress} showLabel label={`Progress to ${nextLevel.name}`} />
        )}
        {!nextLevel && (
          <div className="flex items-center gap-2 p-3 bg-warning-light rounded-xl">
            <Trophy className="w-5 h-5 text-warning" />
            <span className="text-sm font-medium text-warning-dark">Maximum level achieved! You're an Expert!</span>
          </div>
        )}
      </div>

      {/* Walk Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-card text-center">
          <p className="text-3xl font-bold text-ink">{completedWalks.length}</p>
          <p className="text-sm text-ink-secondary mt-1">Total Walks</p>
        </div>
        <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-card text-center">
          <p className="text-3xl font-bold text-ink">{thisWeek}</p>
          <p className="text-sm text-ink-secondary mt-1">This Week</p>
        </div>
        <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-card text-center">
          <p className="text-3xl font-bold text-ink">{thisMonth}</p>
          <p className="text-sm text-ink-secondary mt-1">This Month</p>
        </div>
      </div>

      {/* Walk Achievement Badges (auto-earn + claim) */}
      <div className="bg-white border border-surface-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <h2 className="font-bold text-white">Walk Badges</h2>
          <p className="text-white/70 text-xs mt-0.5">
            {claimed.length} of {ALL_BADGES.length} claimed
          </p>
        </div>
        <div className="p-4 space-y-3">
          {ALL_BADGES.map(b => {
            const earned  = completedWalks.length >= b.minWalks;
            const isClaimed = claimed.includes(b.id);
            const needed  = b.minWalks - completedWalks.length;
            const pct     = Math.min(Math.round((completedWalks.length / b.minWalks) * 100), 100);

            return (
              <div key={b.id}
                className="flex items-center gap-3 p-4 rounded-2xl border transition-all"
                style={{
                  borderColor: isClaimed ? b.color + '60' : earned ? '#FDE68A' : '#E5E7EB',
                  background: isClaimed ? b.color + '0A' : earned ? '#FFFBEB' : 'white',
                  boxShadow: isClaimed ? `0 0 0 1px ${b.color}30` : 'none',
                }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{
                    background: earned ? b.color + '20' : '#F3F4F6',
                    border: `2px solid ${earned ? b.color + '40' : '#E5E7EB'}`,
                  }}>
                  {earned ? b.icon : <Lock className="w-6 h-6 text-ink-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${earned ? 'text-ink' : 'text-ink-muted'}`}>{b.label}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{b.description}</p>
                  {!earned && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-ink-muted">{completedWalks.length}/{b.minWalks} walks</span>
                        <span className="text-[10px] font-semibold text-ink-muted">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-surface-secondary">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: '#9CA3AF' }} />
                      </div>
                    </div>
                  )}
                  {earned && isClaimed && (
                    <p className="text-xs font-semibold mt-1" style={{ color: b.color }}>Claimed ✓</p>
                  )}
                  {earned && !isClaimed && (
                    <p className="text-xs text-amber-600 mt-0.5 font-medium">Ready to claim!</p>
                  )}
                </div>
                {isClaimed && (
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: b.color }} />
                )}
                {earned && !isClaimed && (
                  <button type="button" onClick={() => handleClaim(b.id)}
                    className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
                    Claim 🎁
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legacy gamification badges (from DB/admin) */}
      {earnedBadgeIds.length > 0 && (
        <div className="bg-white border border-surface-border rounded-2xl shadow-card">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-ink">Special Badges</h2>
            <p className="text-xs text-ink-muted mt-0.5">Awarded by PawFleet team</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_BADGES.filter(b => earnedBadgeIds.includes(b.id)).map(badgeDef => {
              const earnedBadge = gamStats.badges.find(b2 => b2.id === badgeDef.id);
              return (
                <div key={badgeDef.id}
                  className="flex items-center gap-4 p-4 rounded-2xl border bg-surface-secondary">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 badge-shine"
                    style={{ background: `${badgeDef.color}20`, border: `2px solid ${badgeDef.color}40` }}>
                    {badgeDef.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-ink">{badgeDef.label}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{badgeDef.description}</p>
                    {earnedBadge && (
                      <p className="text-xs text-success-dark mt-1">
                        Earned {new Date(earnedBadge.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Star className="w-4 h-4 shrink-0" style={{ color: badgeDef.color }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { isThisWeek, isThisMonth } from 'date-fns';
import { Trophy, Flame, Star, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { BadgeId } from '../../types';

const ALL_BADGES: Array<{ id: BadgeId; label: string; description: string; icon: string; color: string; minWalks: number }> = [
  { id: 'first_walk', label: 'First Steps', description: 'Completed your first walk!', icon: '🐾', color: '#10B981', minWalks: 1 },
  { id: 'five_walks', label: '5 Walks Done', description: 'Completed 5 walks', icon: '⭐', color: '#4776E6', minWalks: 5 },
  { id: 'ten_walks', label: '10 Walks Done', description: 'Completed 10 walks', icon: '🏆', color: '#8B5CF6', minWalks: 10 },
  { id: 'twenty_five_walks', label: 'Walk Master', description: 'Completed 25 walks', icon: '🥇', color: '#F59E0B', minWalks: 25 },
];

const LEVELS = [
  { name: 'Rookie', minPts: 0, maxPts: 200, color: '#9CA3AF' },
  { name: 'Junior', minPts: 200, maxPts: 500, color: '#10B981' },
  { name: 'Professional', minPts: 500, maxPts: 1000, color: '#4776E6' },
  { name: 'Expert', minPts: 1000, maxPts: Infinity, color: '#F59E0B' },
];

export default function WalkerBadges() {
  const { data, currentUser, getWalkerStats } = useApp();
  const gamStats = getWalkerStats(currentUser?.id || '');

  const completedWalks = data.walks.filter(w => w.walkerId === currentUser?.id && w.status === 'completed');
  const thisWeek = completedWalks.filter(w => w.endTime && isThisWeek(new Date(w.endTime))).length;
  const thisMonth = completedWalks.filter(w => w.endTime && isThisMonth(new Date(w.endTime))).length;

  // Level
  const levelArr = LEVELS.filter(l => gamStats.points >= l.minPts);
  const currentLevel = levelArr[levelArr.length - 1] || LEVELS[0];
  const nextLevel = LEVELS.find(l => gamStats.points < l.minPts);
  const levelProgress = nextLevel
    ? ((gamStats.points - currentLevel.minPts) / (currentLevel.maxPts - currentLevel.minPts)) * 100
    : 100;

  const earnedBadgeIds = gamStats.badges.map(b => b.id);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Achievements</h1>
        <p className="text-ink-secondary mt-1">Your progress and earned badges</p>
      </div>

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

      {/* Badges */}
      <div className="bg-white border border-surface-border rounded-2xl shadow-card">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-ink">Badges</h2>
          <p className="text-xs text-ink-muted mt-0.5">{gamStats.badges.length} of {ALL_BADGES.length} earned</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ALL_BADGES.map(badgeDef => {
            const isEarned = earnedBadgeIds.includes(badgeDef.id);
            const earnedBadge = gamStats.badges.find(b => b.id === badgeDef.id);
            const walksNeeded = badgeDef.minWalks - completedWalks.length;

            return (
              <div
                key={badgeDef.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isEarned ? 'bg-surface-secondary border-surface-border' : 'bg-white border-surface-border opacity-60'}`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 badge-shine ${isEarned ? 'shadow-sm' : 'grayscale'}`}
                  style={{ background: isEarned ? `${badgeDef.color}20` : '#F3F4F6', border: `2px solid ${isEarned ? badgeDef.color + '40' : '#E5E7EB'}` }}
                >
                  {isEarned ? badgeDef.icon : <Lock className="w-6 h-6 text-ink-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isEarned ? 'text-ink' : 'text-ink-muted'}`}>{badgeDef.label}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{badgeDef.description}</p>
                  {isEarned && earnedBadge ? (
                    <p className="text-xs text-success-dark mt-1">Earned {new Date(earnedBadge.earnedAt).toLocaleDateString()}</p>
                  ) : (
                    <p className="text-xs text-ink-muted mt-1">
                      {walksNeeded > 0 ? `${walksNeeded} more walk${walksNeeded > 1 ? 's' : ''} needed` : 'Almost there!'}
                    </p>
                  )}
                </div>
                {isEarned && (
                  <Star className="w-4 h-4 shrink-0" style={{ color: badgeDef.color }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

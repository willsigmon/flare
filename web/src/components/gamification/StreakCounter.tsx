'use client';

import { useState, useEffect } from 'react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakType: string;
}

interface StreakCounterProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function StreakCounter({ variant = 'compact', className = '' }: StreakCounterProps) {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStreak() {
      try {
        const res = await fetch('/api/gamification/streak');
        if (res.ok) {
          const data = await res.json();
          setStreak(data.streak);
        }
      } catch (error) {
        console.error('Error fetching streak:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStreak();
  }, []);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 w-20 bg-bg-tertiary rounded-full" />
      </div>
    );
  }

  if (!streak || streak.currentStreak === 0) {
    if (variant === 'compact') {
      return null; // Don't show if no streak
    }
    return (
      <div className={`text-center ${className}`}>
        <div className="text-text-muted text-sm">Start voting to build your streak!</div>
      </div>
    );
  }

  // Determine flame intensity based on streak length
  const getFlameColor = (days: number): string => {
    if (days >= 100) return 'text-purple-500';
    if (days >= 30) return 'text-red-500';
    if (days >= 7) return 'text-orange-500';
    return 'text-yellow-500';
  };

  const getFlameAnimation = (days: number): string => {
    if (days >= 30) return 'animate-bounce';
    if (days >= 7) return 'animate-pulse';
    return '';
  };

  // Check if streak is at risk (last activity was yesterday)
  const isAtRisk = (): boolean => {
    if (!streak.lastActivityDate) return false;
    const lastActivity = new Date(streak.lastActivityDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-secondary ${className}`}
        title={`${streak.currentStreak} day streak${isAtRisk() ? ' - Vote today to keep it!' : ''}`}
      >
        <span className={`${getFlameColor(streak.currentStreak)} ${getFlameAnimation(streak.currentStreak)}`}>
          🔥
        </span>
        <span className="font-bold text-text-primary tabular-nums">{streak.currentStreak}</span>
        {isAtRisk() && (
          <span className="text-yellow-500 text-xs">!</span>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-bg-secondary rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Voting Streak</h3>
        {isAtRisk() && (
          <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500">
            Vote today!
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Current streak */}
        <div className="text-center flex-1">
          <div className={`text-4xl mb-1 ${getFlameAnimation(streak.currentStreak)}`}>
            <span className={getFlameColor(streak.currentStreak)}>🔥</span>
          </div>
          <div className="text-3xl font-black text-text-primary">{streak.currentStreak}</div>
          <div className="text-xs text-text-secondary">day streak</div>
        </div>

        {/* Divider */}
        <div className="w-px h-16 bg-border" />

        {/* Longest streak */}
        <div className="text-center flex-1">
          <div className="text-4xl mb-1 opacity-50">🏆</div>
          <div className="text-3xl font-black text-text-secondary">{streak.longestStreak}</div>
          <div className="text-xs text-text-secondary">best</div>
        </div>
      </div>

      {/* Progress to next milestone */}
      <div className="mt-4">
        <StreakMilestones currentStreak={streak.currentStreak} />
      </div>
    </div>
  );
}

function StreakMilestones({ currentStreak }: { currentStreak: number }) {
  const milestones = [7, 30, 100, 365];
  const nextMilestone = milestones.find(m => m > currentStreak) || milestones[milestones.length - 1];
  const prevMilestone = milestones.filter(m => m <= currentStreak).pop() || 0;

  const progress = ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  return (
    <div>
      <div className="flex justify-between text-xs text-text-muted mb-1">
        <span>{prevMilestone > 0 ? `${prevMilestone} days` : 'Start'}</span>
        <span>{nextMilestone} days</span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <div className="text-xs text-text-secondary text-center mt-2">
        {nextMilestone - currentStreak} days until next milestone
      </div>
    </div>
  );
}

// Hook to fetch streak data
export function useStreak() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStreak() {
      try {
        const res = await fetch('/api/gamification/streak');
        if (res.ok) {
          const data = await res.json();
          setStreak(data.streak);
        }
      } catch (error) {
        console.error('Error fetching streak:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStreak();
  }, []);

  return { streak, loading };
}

export default StreakCounter;

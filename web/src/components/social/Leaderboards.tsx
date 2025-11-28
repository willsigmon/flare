'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  rank: number;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  score: number;
}

interface LeaderboardsProps {
  type?: 'contributors' | 'commenters';
  period?: 'week' | 'month' | 'all';
  limit?: number;
}

export function Leaderboards({ type = 'contributors', period = 'week', limit = 10 }: LeaderboardsProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState(type);
  const [activePeriod, setActivePeriod] = useState(period);

  useEffect(() => {
    loadLeaderboard();
  }, [activeType, activePeriod]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/social/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          period: activePeriod,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard((data.leaderboard || []).slice(0, limit));
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 2:
        return 'bg-gray-300/20 text-gray-400 border-gray-400/30';
      case 3:
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      default:
        return 'bg-bg-tertiary text-text-tertiary border-border';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return rank.toString();
    }
  };

  return (
    <div className="bg-bg-secondary rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-text-primary mb-3">Leaderboards</h3>

        {/* Type tabs */}
        <div className="flex gap-2 mb-3">
          {(['contributors', 'commenters'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                activeType === t
                  ? 'bg-accent-brand text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'
              }`}
            >
              {t === 'contributors' ? '🏆 Top Contributors' : '💬 Top Commenters'}
            </button>
          ))}
        </div>

        {/* Period tabs */}
        <div className="flex gap-2">
          {(['week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                activePeriod === p
                  ? 'text-accent-brand font-medium'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-accent-brand border-t-transparent rounded-full" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-text-secondary text-sm">No rankings yet</p>
            <p className="text-text-tertiary text-xs mt-1">
              Be the first to climb the leaderboard!
            </p>
          </div>
        ) : (
          leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className="px-6 py-3 flex items-center gap-4 hover:bg-bg-tertiary/50 transition-colors"
            >
              {/* Rank */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${getRankStyle(
                  entry.rank
                )}`}
              >
                {entry.rank <= 3 ? getRankIcon(entry.rank) : entry.rank}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-accent-brand flex items-center justify-center text-white font-medium flex-shrink-0">
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (entry.display_name || entry.username || '?').substring(0, 1).toUpperCase()
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {entry.display_name || entry.username || 'Anonymous'}
                </p>
                {entry.username && entry.display_name && (
                  <p className="text-xs text-text-tertiary truncate">@{entry.username}</p>
                )}
              </div>

              {/* Score */}
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">{entry.score.toLocaleString()}</p>
                <p className="text-xs text-text-tertiary">
                  {activeType === 'contributors' ? 'points' : 'comments'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border bg-bg-tertiary/30">
        <p className="text-xs text-text-tertiary text-center">
          {activeType === 'contributors'
            ? 'Points earned from upvotes on shared content'
            : 'Ranked by number of comments posted'}
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export type AchievementType =
  // Engagement milestones
  | 'first_vote'
  | 'century_club' // 100 votes
  | 'voting_veteran' // 1000 votes
  | 'mega_voter' // 10000 votes
  // Streaks
  | 'streak_7'
  | 'streak_30'
  | 'streak_100'
  | 'streak_365'
  // Taste
  | 'trend_spotter' // Voted early on trending content
  | 'early_bird' // First to vote
  | 'oracle' // Predicted top stories
  | 'tastemaker' // High correlation with community
  // Platform diversity
  | 'reddit_regular'
  | 'hn_hacker'
  | 'cross_platform'; // Engages across all platforms

export interface Achievement {
  id: string;
  type: AchievementType;
  achievedAt: Date;
  metadata?: Record<string, unknown>;
}

interface AchievementConfig {
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

const achievementConfigs: Record<AchievementType, AchievementConfig> = {
  // Engagement
  first_vote: {
    name: 'First Vote',
    description: 'Cast your first vote',
    icon: '🎯',
    color: '#10b981',
    rarity: 'common',
  },
  century_club: {
    name: 'Century Club',
    description: 'Cast 100 votes',
    icon: '💯',
    color: '#3b82f6',
    rarity: 'uncommon',
  },
  voting_veteran: {
    name: 'Voting Veteran',
    description: 'Cast 1,000 votes',
    icon: '🏆',
    color: '#8b5cf6',
    rarity: 'rare',
  },
  mega_voter: {
    name: 'Mega Voter',
    description: 'Cast 10,000 votes',
    icon: '👑',
    color: '#f59e0b',
    rarity: 'legendary',
  },

  // Streaks
  streak_7: {
    name: 'Week Warrior',
    description: '7-day voting streak',
    icon: '🔥',
    color: '#ef4444',
    rarity: 'common',
  },
  streak_30: {
    name: 'Monthly Master',
    description: '30-day voting streak',
    icon: '⚡',
    color: '#f97316',
    rarity: 'uncommon',
  },
  streak_100: {
    name: 'Century Streak',
    description: '100-day voting streak',
    icon: '💎',
    color: '#06b6d4',
    rarity: 'epic',
  },
  streak_365: {
    name: 'Year of Dedication',
    description: '365-day voting streak',
    icon: '🌟',
    color: '#eab308',
    rarity: 'legendary',
  },

  // Taste
  trend_spotter: {
    name: 'Trend Spotter',
    description: 'Voted early on 10 trending stories',
    icon: '🔮',
    color: '#a855f7',
    rarity: 'rare',
  },
  early_bird: {
    name: 'Early Bird',
    description: 'First to vote on a story',
    icon: '🐦',
    color: '#14b8a6',
    rarity: 'uncommon',
  },
  oracle: {
    name: 'Oracle',
    description: 'Predicted 5 top stories of the day',
    icon: '🧙',
    color: '#6366f1',
    rarity: 'epic',
  },
  tastemaker: {
    name: 'Tastemaker',
    description: 'Your votes align with top curators',
    icon: '✨',
    color: '#ec4899',
    rarity: 'rare',
  },

  // Platform
  reddit_regular: {
    name: 'Reddit Regular',
    description: 'Voted on 50 Reddit stories',
    icon: '🤖',
    color: '#ff4500',
    rarity: 'common',
  },
  hn_hacker: {
    name: 'HN Hacker',
    description: 'Voted on 50 Hacker News stories',
    icon: '🔶',
    color: '#ff6600',
    rarity: 'common',
  },
  cross_platform: {
    name: 'Cross-Platform Curator',
    description: 'Active on all platforms',
    icon: '🌐',
    color: '#0ea5e9',
    rarity: 'rare',
  },
};

const rarityColors = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500',
};

interface AchievementBadgeProps {
  type: AchievementType;
  achievedAt?: Date;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  locked?: boolean;
}

export function AchievementBadge({
  type,
  achievedAt,
  size = 'md',
  showTooltip = true,
  locked = false,
}: AchievementBadgeProps) {
  const config = achievementConfigs[type];
  const [showDetails, setShowDetails] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <div
        className={`
          ${sizeClasses[size]} rounded-full flex items-center justify-center
          ${locked ? 'bg-bg-tertiary grayscale opacity-50' : `bg-gradient-to-br ${rarityColors[config.rarity]}`}
          shadow-lg cursor-pointer transition-transform hover:scale-110
        `}
        style={!locked ? { boxShadow: `0 0 20px ${config.color}40` } : undefined}
      >
        <span className={locked ? 'opacity-30' : ''}>{config.icon}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && showDetails && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-bg-secondary border border-border rounded-lg shadow-xl p-3 w-48 text-center">
            <div className="font-bold text-text-primary">{config.name}</div>
            <div className="text-xs text-text-secondary mt-1">{config.description}</div>
            {achievedAt && (
              <div className="text-xs text-text-muted mt-2">
                Earned {new Date(achievedAt).toLocaleDateString()}
              </div>
            )}
            <div
              className={`text-xs font-medium mt-2 capitalize bg-gradient-to-r ${rarityColors[config.rarity]} bg-clip-text text-transparent`}
            >
              {config.rarity}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Achievement showcase grid
interface AchievementShowcaseProps {
  achievements: Achievement[];
  showLocked?: boolean;
}

export function AchievementShowcase({ achievements, showLocked = false }: AchievementShowcaseProps) {
  const achievedTypes = new Set(achievements.map(a => a.type));
  const allTypes = Object.keys(achievementConfigs) as AchievementType[];

  const displayAchievements = showLocked
    ? allTypes.map(type => ({
        type,
        achieved: achievedTypes.has(type),
        data: achievements.find(a => a.type === type),
      }))
    : achievements.map(a => ({ type: a.type, achieved: true, data: a }));

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
      {displayAchievements.map(({ type, achieved, data }) => (
        <AchievementBadge
          key={type}
          type={type}
          achievedAt={data?.achievedAt}
          locked={!achieved}
          size="md"
        />
      ))}
    </div>
  );
}

// Hook to fetch user achievements
export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await fetch('/api/gamification/achievements');
        if (res.ok) {
          const data = await res.json();
          setAchievements(data.achievements || []);
        }
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAchievements();
  }, []);

  return { achievements, loading };
}

export default AchievementBadge;

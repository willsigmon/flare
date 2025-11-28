'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface UserPreferences {
  platformScores: Record<string, number>;
  categoryScores: Record<string, number>;
  explorationEnabled: boolean;
  explorationPercentage: number;
}

interface PreferencesContextType {
  preferences: UserPreferences | null;
  stats: {
    totalInteractions: number;
    totalVotes: number;
    upvotes: number;
    downvotes: number;
  } | null;
  isLoading: boolean;
  isPersonalized: boolean;
  refresh: () => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  platformScores: {},
  categoryScores: {},
  explorationEnabled: true,
  explorationPercentage: 20,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [stats, setStats] = useState<PreferencesContextType['stats']>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPreferences = async () => {
    if (!user) {
      setPreferences(null);
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/preferences/stats');
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences);
        setStats(data.stats);
      } else {
        // Use defaults if fetch fails
        setPreferences(defaultPreferences);
        setStats(null);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setPreferences(defaultPreferences);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchPreferences();
  }, [user, authLoading]);

  // Feed is "personalized" when user has voted on at least 5 items
  const isPersonalized = !!stats && stats.totalVotes >= 5;

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        stats,
        isLoading,
        isPersonalized,
        refresh: fetchPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

// Hook to apply preference-based sorting to items
export function usePersonalizedSort<T extends { platform: string; category?: string; engagementCount?: number }>(
  items: T[]
): T[] {
  const { preferences, isPersonalized } = usePreferences();

  if (!isPersonalized || !preferences) {
    return items;
  }

  const { platformScores, categoryScores, explorationEnabled, explorationPercentage } = preferences;

  // Calculate personalized scores
  const scoredItems = items.map(item => {
    const platformBoost = platformScores[item.platform] || 0;
    const categoryBoost = item.category ? (categoryScores[item.category] || 0) : 0;
    const engagement = item.engagementCount || 0;

    // Score = engagement * (1 + platformBoost + categoryBoost)
    // platformBoost and categoryBoost range from -1 to 1
    const multiplier = 1 + platformBoost + categoryBoost;
    const score = engagement * Math.max(0.1, multiplier); // Ensure score doesn't go negative

    return { item, score };
  });

  // Sort by score (descending)
  scoredItems.sort((a, b) => b.score - a.score);

  // Apply exploration: randomly inject some items to break filter bubble
  if (explorationEnabled && explorationPercentage > 0) {
    const sorted = scoredItems.map(s => s.item);
    const numExplore = Math.floor(sorted.length * (explorationPercentage / 100));

    // Pick random indices to swap
    for (let i = 0; i < numExplore; i++) {
      const fromIdx = Math.floor(Math.random() * sorted.length);
      const toIdx = Math.floor(Math.random() * Math.min(20, sorted.length)); // Inject into top 20
      if (fromIdx !== toIdx && fromIdx > 20) {
        // Swap
        [sorted[fromIdx], sorted[toIdx]] = [sorted[toIdx], sorted[fromIdx]];
      }
    }

    return sorted;
  }

  return scoredItems.map(s => s.item);
}

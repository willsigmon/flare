'use client';

import { useState, useMemo } from 'react';
import { TrendingItem, Platform, platformConfig } from '@/lib/types';
import { SpotlightCard, Top10Card, CompactRow } from '@/components/cards';
import { PlatformIcon, FireIcon, platformColors, TrophyIcon } from '@/components/icons/PlatformIcons';
import { usePreferences, usePersonalizedSort } from '@/components/preferences/PreferencesProvider';
import { useAuth } from '@/components/auth/AuthProvider';

interface FilterableFeedProps {
  items: TrendingItem[];
}

// Time filter options
type TimeFilter = '24h' | 'week' | 'month' | 'all';
const timeFilters: { id: TimeFilter; label: string; hours: number | null }[] = [
  { id: '24h', label: '24h', hours: 24 },
  { id: 'week', label: 'Week', hours: 168 },
  { id: 'month', label: 'Month', hours: 720 },
  { id: 'all', label: 'All Time', hours: null },
];

// Platform filter configuration - MVP: Real APIs only
const platformFilters: { id: Platform | 'all'; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: '#f97316' },
  { id: 'reddit', label: 'Reddit', color: '#ff4500' },
  { id: 'hackernews', label: 'Hacker News', color: '#ff6600' },
  { id: 'google', label: 'Google', color: '#4285f4' },
];

// Fisher-Yates shuffle for discovery mode
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FilterableFeed({ items }: FilterableFeedProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [selectedTime, setSelectedTime] = useState<TimeFilter>('24h');
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const { user } = useAuth();
  const { isPersonalized, stats } = usePreferences();

  // Apply personalized sorting to items (disabled in discovery mode)
  const personalizedItems = usePersonalizedSort(items);

  // Filter items based on time
  const timeFilteredItems = useMemo(() => {
    const timeConfig = timeFilters.find(t => t.id === selectedTime);
    if (!timeConfig?.hours) return personalizedItems;

    const cutoffTime = Date.now() - (timeConfig.hours * 60 * 60 * 1000);
    return personalizedItems.filter(item => {
      const itemTime = item.timestamp ? new Date(item.timestamp).getTime() : Date.now();
      return itemTime >= cutoffTime;
    });
  }, [personalizedItems, selectedTime]);

  // Apply discovery mode (randomize order) or keep personalized
  const processedItems = useMemo(() => {
    if (discoveryMode) {
      return shuffleArray(timeFilteredItems);
    }
    return timeFilteredItems;
  }, [timeFilteredItems, discoveryMode]);

  // Filter items based on selected platform
  const filteredItems = selectedPlatform === 'all'
    ? processedItems
    : processedItems.filter(item => item.platform === selectedPlatform);

  // Show special Top 10 layout only when showing all platforms
  const showTop10Layout = selectedPlatform === 'all' && filteredItems.length >= 10;

  // Split items for display
  const spotlightItem = showTop10Layout ? filteredItems[0] : null;
  const top10Items = showTop10Layout ? filteredItems.slice(1, 10) : [];
  const restItems = showTop10Layout ? filteredItems.slice(10, 60) : filteredItems.slice(0, 50);

  return (
    <div className="space-y-4">
      {/* Unified Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Time Filters */}
        <div className="flex items-center bg-bg-secondary rounded-lg p-0.5">
          {timeFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedTime(filter.id)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-all
                ${selectedTime === filter.id
                  ? 'bg-bg-primary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-border hidden sm:block" />

        {/* Platform Filters */}
        <div className="flex items-center gap-1.5">
          {platformFilters.map((filter) => {
            const isSelected = selectedPlatform === filter.id;
            const itemCount = filter.id === 'all'
              ? items.length
              : items.filter(item => item.platform === filter.id).length;

            // Skip platforms with no items
            if (itemCount === 0 && filter.id !== 'all') return null;

            return (
              <button
                key={filter.id}
                onClick={() => setSelectedPlatform(filter.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all whitespace-nowrap
                  ${isSelected
                    ? 'text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }
                `}
                style={isSelected ? { backgroundColor: filter.color } : undefined}
              >
                {filter.id === 'all' ? (
                  <FireIcon size={14} />
                ) : (
                  <PlatformIcon platform={filter.id} size={14} />
                )}
                <span>{filter.label}</span>
                <span className={`tabular-nums ${isSelected ? 'text-white/70' : 'text-text-muted'}`}>
                  {itemCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Discovery Mode Toggle */}
        <button
          onClick={() => setDiscoveryMode(!discoveryMode)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${discoveryMode
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-bg-secondary text-text-tertiary hover:text-text-secondary'
            }
          `}
          title={discoveryMode ? 'Showing random content' : 'Enable discovery mode'}
        >
          <span className={discoveryMode ? 'animate-spin' : ''} style={{ animationDuration: '3s' }}>🎲</span>
          <span className="hidden sm:inline">Discovery</span>
        </button>

        {/* Personalization Indicator */}
        {user && !discoveryMode && isPersonalized && (
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <span className="text-accent-positive">✨</span>
            <span className="hidden sm:inline">Personalized</span>
          </div>
        )}
      </div>

      {/* ========== TOP 10 SPECIAL LAYOUT ========== */}
      {showTop10Layout && (
        <>
          {/* #1 Spotlight */}
          {spotlightItem && (
            <section>
              <SpotlightCard item={spotlightItem} />
            </section>
          )}

          {/* #2-10 Grid */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrophyIcon size={20} className="text-amber-500" />
              <h2 className="text-lg font-bold text-text-primary">Top 10 Trending</h2>
              <span className="text-xs text-text-tertiary ml-2">From Reddit, Hacker News & Google</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {top10Items.map((item, index) => (
                <Top10Card
                  key={item.id}
                  item={item}
                  rank={index + 2}
                />
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              More Stories
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
        </>
      )}

      {/* ========== STANDARD FEED (filtered or overflow) ========== */}
      {restItems.length > 0 && (
        <section className="bg-bg-secondary rounded-xl overflow-hidden">
          <div className="divide-y divide-border/30">
            {restItems.map((item, index) => (
              <CompactRow
                key={item.id}
                item={item}
                rank={showTop10Layout ? index + 11 : index + 1}
              />
            ))}
          </div>
        </section>
      )}

      {/* NOTE: Removed duplicate rendering block - restItems already handles filtered views */}

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <p>No stories found for this platform.</p>
        </div>
      )}

      {/* Load more */}
      {filteredItems.length > 60 && (
        <div className="text-center">
          <button className="px-6 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-bg-secondary rounded-lg hover:bg-bg-tertiary transition-colors">
            Load more stories
          </button>
        </div>
      )}
    </div>
  );
}

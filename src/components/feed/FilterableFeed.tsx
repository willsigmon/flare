'use client';

import { useState } from 'react';
import { TrendingItem, Platform, platformConfig } from '@/lib/types';
import { SpotlightCard, Top10Card, CompactRow } from '@/components/cards';
import { PlatformIcon, FireIcon, platformColors, TrophyIcon } from '@/components/icons/PlatformIcons';

interface FilterableFeedProps {
  items: TrendingItem[];
}

// Platform filter configuration
const platformFilters: { id: Platform | 'all'; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: '#f97316' },
  { id: 'reddit', label: 'Reddit', color: '#ff4500' },
  { id: 'hackernews', label: 'Hacker News', color: '#ff6600' },
  { id: 'twitter', label: 'X', color: '#1d9bf0' },
  { id: 'google', label: 'Google', color: '#4285f4' },
  { id: 'youtube', label: 'YouTube', color: '#ff0000' },
  { id: 'substack', label: 'Substack', color: '#ff6719' },
  { id: 'medium', label: 'Medium', color: '#000000' },
  { id: 'threads', label: 'Threads', color: '#a855f7' },
  { id: 'bluesky', label: 'Bluesky', color: '#0085ff' },
];

export function FilterableFeed({ items }: FilterableFeedProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');

  // Filter items based on selected platform
  const filteredItems = selectedPlatform === 'all'
    ? items
    : items.filter(item => item.platform === selectedPlatform);

  // Show special Top 10 layout only when showing all platforms
  const showTop10Layout = selectedPlatform === 'all' && filteredItems.length >= 10;

  // Split items for display
  const spotlightItem = showTop10Layout ? filteredItems[0] : null;
  const top10Items = showTop10Layout ? filteredItems.slice(1, 10) : [];
  const restItems = showTop10Layout ? filteredItems.slice(10, 60) : filteredItems.slice(0, 50);

  return (
    <div className="space-y-6">
      {/* Platform Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
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
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200 whitespace-nowrap
                ${isSelected
                  ? 'text-white shadow-lg scale-105'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }
              `}
              style={isSelected ? { backgroundColor: filter.color } : undefined}
            >
              {filter.id === 'all' ? (
                <FireIcon size={16} />
              ) : (
                <PlatformIcon platform={filter.id} size={16} />
              )}
              <span>{filter.label}</span>
              <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-text-muted'}`}>
                {itemCount}
              </span>
            </button>
          );
        })}
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
              <span className="text-xs text-text-tertiary ml-2">Weighted by platform authority</span>
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

      {/* When filtering by platform, show simpler layout */}
      {!showTop10Layout && selectedPlatform !== 'all' && filteredItems.length > 0 && (
        <section className="bg-bg-secondary rounded-xl overflow-hidden">
          <div className="divide-y divide-border/30">
            {filteredItems.slice(0, 50).map((item, index) => (
              <CompactRow
                key={item.id}
                item={item}
                rank={index + 1}
              />
            ))}
          </div>
        </section>
      )}

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

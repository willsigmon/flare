'use client';

import { useState, useEffect } from 'react';
import { TrendingItem, platformConfig, formatEngagement, timeAgo } from '@/lib/types';
import { fetchLocalTrends } from '@/lib/trending';

// Common city subreddits
const citySubreddits: Record<string, string[]> = {
  'New York': ['nyc', 'newyorkcity'],
  'Los Angeles': ['LosAngeles', 'LAlist'],
  'Chicago': ['chicago'],
  'Houston': ['houston'],
  'Phoenix': ['phoenix'],
  'San Francisco': ['sanfrancisco', 'bayarea'],
  'Seattle': ['Seattle', 'SeattleWA'],
  'Denver': ['Denver'],
  'Boston': ['boston'],
  'Austin': ['Austin'],
  'Portland': ['Portland'],
  'Miami': ['Miami'],
  'Atlanta': ['Atlanta'],
  'Dallas': ['Dallas'],
  'San Diego': ['sandiego'],
  'Minneapolis': ['Minneapolis', 'TwinCities'],
  'Raleigh': ['raleigh', 'triangle'],
  'Charlotte': ['Charlotte'],
  'Nashville': ['nashville'],
  'Detroit': ['Detroit'],
};

interface LocalSectionProps {
  isExpanded?: boolean;
}

export function LocalSection({ isExpanded = false }: LocalSectionProps) {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function getLocation() {
      try {
        if (!navigator.geolocation) {
          setError('Geolocation not supported');
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Reverse geocode
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`,
                { headers: { 'User-Agent': 'Flare/1.0' } }
              );

              if (response.ok) {
                const data = await response.json();
                const city = data.address.city || data.address.town || data.address.county;
                setLocationName(city || 'Your Area');

                // Find matching subreddits
                let subreddits: string[] = [];
                for (const [cityName, subs] of Object.entries(citySubreddits)) {
                  if (city?.toLowerCase().includes(cityName.toLowerCase()) ||
                      cityName.toLowerCase().includes(city?.toLowerCase() || '')) {
                    subreddits = subs;
                    break;
                  }
                }

                // Fallback to state if no city match
                if (subreddits.length === 0 && data.address.state) {
                  subreddits = [data.address.state.toLowerCase().replace(/\s+/g, '')];
                }

                if (subreddits.length > 0) {
                  const trends = await fetchLocalTrends(subreddits);
                  setItems(trends);
                }
              }
            } catch (e) {
              console.error('Geocoding error:', e);
            }
            setLoading(false);
          },
          (err) => {
            setError('Location access denied');
            setLoading(false);
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      } catch (e) {
        setError('Failed to get location');
        setLoading(false);
      }
    }

    getLocation();
  }, []);

  if (loading) {
    return (
      <section className="mb-8 px-4">
        <div className="glass rounded-2xl p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-500">Finding local trends...</span>
        </div>
      </section>
    );
  }

  if (error || items.length === 0) {
    return null; // Don't show if no local content
  }

  const config = platformConfig.local;

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${config.gradient}`}>
          📍
        </div>
        <div className="flex-grow">
          <h2 className="text-lg font-bold">Near You</h2>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>📌</span>
            <span>{locationName}</span>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400">
          Local
        </span>
      </div>

      {/* Content */}
      {isExpanded ? (
        <div className="px-4 space-y-3">
          {items.map((item) => (
            <LocalListCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-3 px-4 pb-2">
            {items.slice(0, 10).map((item) => (
              <LocalCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function LocalCard({ item }: { item: TrendingItem }) {
  const config = platformConfig.local;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-[280px] h-[180px] flex-shrink-0"
    >
      <div
        className="h-full p-4 glass rounded-2xl transition-all duration-200
                   hover:scale-[1.02] hover:shadow-lg flex flex-col"
        style={{
          borderColor: `${config.color}30`,
          boxShadow: `0 4px 12px ${config.color}15`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${config.color}20`,
              color: config.color,
            }}
          >
            #{item.rank}
          </span>

          {item.engagementCount && (
            <span className="text-xs text-gray-500">
              <span className="font-semibold">{formatEngagement(item.engagementCount)}</span>{' '}
              {item.engagementLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-teal-500 transition-colors">
          {item.title}
        </h3>

        {/* Subtitle */}
        {item.subtitle && (
          <p className="text-xs mb-2" style={{ color: platformConfig.reddit.color }}>
            💬 {item.subtitle}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-auto pt-2 text-xs text-gray-400">
          <span>📍</span>
          <span>{timeAgo(item.timestamp)}</span>
        </div>
      </div>
    </a>
  );
}

function LocalListCard({ item }: { item: TrendingItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block glass rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <span
          className="text-xl font-bold w-10 text-center"
          style={{ color: platformConfig.local.color }}
        >
          #{item.rank}
        </span>

        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            {item.subtitle && (
              <span style={{ color: platformConfig.reddit.color }}>💬 {item.subtitle}</span>
            )}
            {item.engagementCount && (
              <>
                <span>·</span>
                <span>{formatEngagement(item.engagementCount)} {item.engagementLabel}</span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo(item.timestamp)}</span>
          </div>
        </div>

        <span style={{ color: platformConfig.local.color }}>📍</span>
      </div>
    </a>
  );
}

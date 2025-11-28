'use client';

import { useState, useEffect } from 'react';
import { Platform, platformConfig } from '@/lib/types';
import { PlatformIcon, platformColors } from '@/components/icons/PlatformIcons';
import { decodeHtmlEntities } from '@/lib/utils';

// Only REAL platforms with actual API integrations
const platforms: { id: Platform; count: number }[] = [
  { id: 'reddit', count: 25 },
  { id: 'hackernews', count: 25 },
  { id: 'google', count: 15 },
];

// Live pulse indicator
function PulseIndicator() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
  );
}

// Animated stat with icon
function StatBox({ value, label }: { value: number; label: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="text-center">
      <div className="text-xl font-bold text-text-primary tabular-nums">
        {displayValue.toLocaleString()}
      </div>
      <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

// Collapsible source stats display
function SourcesOverview() {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalStories = platforms.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="glass rounded-2xl p-4 backdrop-blur-xl">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Active Sources
          </h3>
          <span className="text-[10px] font-bold text-accent-positive bg-accent-positive/15 px-2 py-0.5 rounded-full">
            {platforms.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <>
          <div className="space-y-1.5 mt-3">
            {platforms.map((platform) => {
              const config = platformConfig[platform.id];
              const color = platformColors[platform.id];

              return (
                <div key={platform.id} className="group flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <PlatformIcon platform={platform.id} size={12} className="opacity-80" />
                  </div>
                  <span className="flex-1 text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                    {config.name}
                  </span>
                  <span className="text-[10px] font-semibold text-text-tertiary tabular-nums">
                    {platform.count}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Total stories</span>
            <span className="text-sm font-bold text-text-primary">{totalStories}</span>
          </div>
        </>
      )}
    </div>
  );
}

function LiveStats() {
  const [stats, setStats] = useState({ stories: 0, hot: 0, sources: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/trending/stats');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Fallback values
        setStats({ stories: 60, hot: 10, sources: 3 });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="glass rounded-2xl p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-3">
        <PulseIndicator />
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Live Now
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {loading ? (
          <>
            <div className="text-center animate-pulse">
              <div className="h-6 w-12 mx-auto bg-bg-tertiary rounded mb-1" />
              <div className="h-3 w-10 mx-auto bg-bg-tertiary rounded" />
            </div>
            <div className="text-center animate-pulse">
              <div className="h-6 w-8 mx-auto bg-bg-tertiary rounded mb-1" />
              <div className="h-3 w-6 mx-auto bg-bg-tertiary rounded" />
            </div>
            <div className="text-center animate-pulse">
              <div className="h-6 w-6 mx-auto bg-bg-tertiary rounded mb-1" />
              <div className="h-3 w-12 mx-auto bg-bg-tertiary rounded" />
            </div>
          </>
        ) : (
          <>
            <StatBox value={stats.stories} label="Stories" />
            <StatBox value={stats.hot} label="Hot" />
            <StatBox value={stats.sources} label="Sources" />
          </>
        )}
      </div>
    </div>
  );
}

interface Topic {
  tag: string;
  count: string;
  hot: boolean;
}

function TrendingTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch('/api/trending/topics');
        const data = await res.json();
        setTopics(data.topics || []);
      } catch (error) {
        console.error('Error fetching topics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTopics();
  }, []);

  return (
    <div className="glass rounded-2xl p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Trending Topics
        </h3>
      </div>

      <div className="space-y-1">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-2">
              <div className="w-4 h-4 bg-bg-tertiary rounded animate-pulse" />
              <div className="flex-1 h-4 bg-bg-tertiary rounded animate-pulse" />
              <div className="w-8 h-3 bg-bg-tertiary rounded animate-pulse" />
            </div>
          ))
        ) : topics.length === 0 ? (
          <p className="text-xs text-text-tertiary px-2 py-2">No topics available</p>
        ) : (
          topics.map((topic, index) => (
            <button
              key={topic.tag}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-bg-tertiary/50 transition-colors group"
            >
              <span className="text-xs font-medium text-text-tertiary w-4">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {topic.hot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  )}
                  <span className="text-sm text-text-primary group-hover:text-accent-brand transition-colors truncate">
                    {decodeHtmlEntities(topic.tag)}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-text-tertiary">
                {topic.count}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function AIFeedCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Animated gradient border */}
      <div
        className="absolute inset-0 rounded-2xl opacity-50"
        style={{
          background: 'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #3b82f6, #f97316)',
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 6s ease infinite',
        }}
      />

      <div className="relative m-[1px] rounded-2xl bg-bg-primary p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Your AI Feed
            </h3>
            <p className="text-[10px] text-text-tertiary">Personalized for you</p>
          </div>
        </div>

        <p className="text-xs text-text-secondary mb-3 leading-relaxed">
          Sign in to unlock a feed that learns what you love.
        </p>

        <div className="space-y-1.5 mb-3">
          {['Learns from your votes', 'Surfaces hidden gems', 'Filters out noise'].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-[11px] text-text-tertiary">
              <svg className="w-3 h-3 text-accent-positive flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <button className="w-full py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white hover:opacity-90 transition-opacity">
          Sign In to Personalize
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <div className="space-y-3">
      <LiveStats />
      <TrendingTopics />
      <SourcesOverview />
      <AIFeedCard />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Platform, platformConfig } from '@/lib/types';
import { PlatformIcon, platformColors } from '@/components/icons/PlatformIcons';

// Platform stats display (read-only, no toggles)
const platforms: { id: Platform; count: number }[] = [
  { id: 'reddit', count: 25 },
  { id: 'hackernews', count: 25 },
  { id: 'youtube', count: 20 },
  { id: 'google', count: 15 },
  { id: 'twitter', count: 15 },
  { id: 'bluesky', count: 10 },
  { id: 'substack', count: 12 },
  { id: 'medium', count: 12 },
  { id: 'instagram', count: 10 },
  { id: 'tiktok', count: 10 },
  { id: 'threads', count: 8 },
  { id: 'facebook', count: 5 },
  { id: 'linkedin', count: 5 },
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

// Source stats display (read-only)
function SourcesOverview() {
  const totalStories = platforms.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="glass rounded-2xl p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Active Sources
        </h3>
        <span className="text-[10px] font-bold text-accent-positive bg-accent-positive/15 px-2 py-0.5 rounded-full">
          {platforms.length} Connected
        </span>
      </div>

      <div className="space-y-1.5">
        {platforms.map((platform) => {
          const config = platformConfig[platform.id];
          const color = platformColors[platform.id];
          const percentage = Math.round((platform.count / totalStories) * 100);

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
    </div>
  );
}

function LiveStats() {
  const [stats, setStats] = useState({ stories: 2847, hot: 42, readers: 12400 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        stories: prev.stories + Math.floor(Math.random() * 5),
        hot: 30 + Math.floor(Math.random() * 25),
        readers: prev.readers + Math.floor(Math.random() * 100 - 50),
      }));
    }, 4000);

    return () => clearInterval(interval);
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
        <StatBox value={stats.stories} label="Stories" />
        <StatBox value={stats.hot} label="Hot" />
        <StatBox value={stats.readers} label="Reading" />
      </div>
    </div>
  );
}

function TrendingTopics() {
  const topics = [
    { tag: 'Artificial Intelligence', count: '2.4K', hot: true },
    { tag: 'Tech News', count: '1.8K', hot: true },
    { tag: 'Politics', count: '1.2K', hot: false },
    { tag: 'Science', count: '890', hot: false },
    { tag: 'Gaming', count: '654', hot: false },
    { tag: 'Finance', count: '523', hot: false },
  ];

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
        {topics.map((topic, index) => (
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
                  {topic.tag}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-text-tertiary">
              {topic.count}
            </span>
          </button>
        ))}
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
      <SourcesOverview />
      <TrendingTopics />
      <AIFeedCard />
    </div>
  );
}

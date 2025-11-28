'use client';

import { TrendingItem, platformConfig } from '@/lib/types';
import { VoteButtons } from '@/components/voting/VoteButtons';
import { ShareButtons } from '@/components/social/ShareButtons';
import { PlatformIcon, CategoryIcon, Category, categoryColors } from '@/components/icons/PlatformIcons';
import { useStoryPreview } from '@/components/preview';

interface HeroCardProps {
  item: TrendingItem;
  rank?: number;
  size?: 'large' | 'medium';
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// Platform color mapping for vibrant gradients
const platformColors: Record<string, { from: string; to: string; accent: string }> = {
  reddit: { from: '#ff4500', to: '#ff6b35', accent: '#ff4500' },
  hackernews: { from: '#ff6600', to: '#ff8533', accent: '#ff6600' },
  twitter: { from: '#1d9bf0', to: '#0d8ddb', accent: '#1d9bf0' },
  google: { from: '#4285f4', to: '#5a9cf5', accent: '#4285f4' },
  youtube: { from: '#ff0000', to: '#cc0000', accent: '#ff0000' },
  threads: { from: '#a855f7', to: '#9333ea', accent: '#a855f7' },
  bluesky: { from: '#0085ff', to: '#0066cc', accent: '#0085ff' },
  instagram: { from: '#e4405f', to: '#f77737', accent: '#e4405f' },
  facebook: { from: '#1877f2', to: '#0d65d9', accent: '#1877f2' },
  linkedin: { from: '#0a66c2', to: '#004182', accent: '#0a66c2' },
  tiktok: { from: '#ff0050', to: '#00f2ea', accent: '#ff0050' },
  local: { from: '#10b981', to: '#059669', accent: '#10b981' },
};

// Category-based detection for visual theming
function detectCategory(title: string): Category {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('ai') || titleLower.includes('artificial') || titleLower.includes('gpt') || titleLower.includes('llm')) {
    return 'ai';
  }
  if (titleLower.includes('tech') || titleLower.includes('software') || titleLower.includes('code')) {
    return 'tech';
  }
  if (titleLower.includes('crypto') || titleLower.includes('bitcoin') || titleLower.includes('blockchain')) {
    return 'crypto';
  }
  if (titleLower.includes('game') || titleLower.includes('gaming') || titleLower.includes('playstation') || titleLower.includes('xbox')) {
    return 'gaming';
  }
  if (titleLower.includes('space') || titleLower.includes('nasa') || titleLower.includes('rocket') || titleLower.includes('mars')) {
    return 'space';
  }
  if (titleLower.includes('climate') || titleLower.includes('environment') || titleLower.includes('green')) {
    return 'climate';
  }
  if (titleLower.includes('politic') || titleLower.includes('election') || titleLower.includes('government') || titleLower.includes('congress')) {
    return 'politics';
  }
  if (titleLower.includes('money') || titleLower.includes('stock') || titleLower.includes('market') || titleLower.includes('invest')) {
    return 'finance';
  }
  if (titleLower.includes('science') || titleLower.includes('research') || titleLower.includes('study')) {
    return 'science';
  }
  if (titleLower.includes('health') || titleLower.includes('medical') || titleLower.includes('doctor')) {
    return 'health';
  }
  if (titleLower.includes('sport') || titleLower.includes('football') || titleLower.includes('basketball') || titleLower.includes('nfl')) {
    return 'sports';
  }
  if (titleLower.includes('movie') || titleLower.includes('film') || titleLower.includes('hollywood') || titleLower.includes('netflix')) {
    return 'entertainment';
  }
  if (titleLower.includes('music') || titleLower.includes('spotify') || titleLower.includes('album')) {
    return 'music';
  }

  return 'news';
}

export function HeroCard({ item, rank, size = 'large' }: HeroCardProps) {
  const { openPreview } = useStoryPreview();
  const config = platformConfig[item.platform];
  const colors = platformColors[item.platform] || platformColors.google;
  const category = detectCategory(item.title);
  const categoryColor = categoryColors[category];
  const hasImage = item.imageUrl && item.imageUrl.length > 0;

  const isLarge = size === 'large';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openPreview(item);
  };

  return (
    <article className="group relative rounded-2xl overflow-hidden card-hover cursor-pointer" onClick={handleClick}>
      {/* Background image (if available) */}
      {hasImage && (
        <div className="absolute inset-0">
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
        </div>
      )}

      {/* Gradient background (always shown, acts as fallback or overlay) */}
      <div
        className={`absolute inset-0 ${hasImage ? 'mix-blend-overlay opacity-70' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${colors.from}dd 0%, ${colors.to}99 50%, ${colors.from}66 100%)`,
        }}
      />

      {/* Category icon decoration (semi-transparent, large, positioned) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-10">
        <CategoryIcon category={category} size={120} className="text-white" />
      </div>

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Removed link overlay - entire card is now clickable for preview */}

      {/* Content */}
      <div className={`relative ${isLarge ? 'p-6' : 'p-5'} flex flex-col justify-between ${isLarge ? 'min-h-[220px]' : 'min-h-[180px]'} z-20 pointer-events-none`}>
        {/* Top: Rank badge + Platform */}
        <div className="flex items-start justify-between pointer-events-auto">
          {rank && (
            <div
              className={`flex items-center justify-center ${isLarge ? 'w-12 h-12' : 'w-10 h-10'} rounded-xl font-bold text-white shadow-lg`}
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}
            >
              <span className={isLarge ? 'text-xl' : 'text-lg'}>#{rank}</span>
            </div>
          )}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white/90 text-sm font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)' }}
          >
            <PlatformIcon platform={item.platform} size={16} className="opacity-90" />
            <span>{config?.name || item.platform}</span>
          </div>
        </div>

        {/* Bottom: Title and metadata */}
        <div>
          <h3 className={`${isLarge ? 'text-2xl' : 'text-xl'} font-bold text-white mb-3 line-clamp-2 drop-shadow-lg`}>
            {item.title}
          </h3>

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white/90 text-sm font-semibold"
                 style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)' }}>
              <span className="text-white font-bold">
                {formatNumber(item.engagementCount || 0)}
              </span>
              <span className="text-white/70">
                {item.engagementLabel || 'points'}
              </span>
            </div>
            <span className="text-white/80 text-sm font-medium drop-shadow">
              {formatTimeAgo(item.timestamp)}
            </span>
            {/* Small category indicator */}
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: `${categoryColor}30` }}
              title={`Category: ${category}`}
            >
              <CategoryIcon category={category} size={14} className="text-white/90" />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons - show on hover */}
      <div className={`absolute ${isLarge ? 'bottom-6 right-6' : 'bottom-5 right-5'} z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto`}>
        <ShareButtons
          url={item.url || `https://flare.app/story/${item.id}`}
          title={item.title}
          variant="overlay"
        />
        <VoteButtons itemId={item.id} variant="overlay" />
      </div>
    </article>
  );
}

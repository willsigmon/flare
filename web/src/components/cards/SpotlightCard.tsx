'use client';

import { TrendingItem, platformConfig } from '@/lib/types';
import { VoteButtons } from '@/components/voting/VoteButtons';
import { ShareButtons } from '@/components/social/ShareButtons';
import { PlatformIcon, CategoryIcon, Category, categoryColors, FireIcon, TrophyIcon } from '@/components/icons/PlatformIcons';
import { useStoryPreview } from '@/components/preview';
import { HeatBadge, getHoursOld } from '@/components/community';

interface SpotlightCardProps {
  item: TrendingItem;
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
  if (titleLower.includes('game') || titleLower.includes('gaming')) {
    return 'gaming';
  }
  if (titleLower.includes('space') || titleLower.includes('nasa') || titleLower.includes('rocket')) {
    return 'space';
  }
  if (titleLower.includes('climate') || titleLower.includes('environment')) {
    return 'climate';
  }
  if (titleLower.includes('politic') || titleLower.includes('election') || titleLower.includes('government')) {
    return 'politics';
  }
  if (titleLower.includes('money') || titleLower.includes('stock') || titleLower.includes('market')) {
    return 'finance';
  }
  if (titleLower.includes('science') || titleLower.includes('research')) {
    return 'science';
  }

  return 'news';
}

export function SpotlightCard({ item }: SpotlightCardProps) {
  const { openPreview } = useStoryPreview();
  const config = platformConfig[item.platform];
  const category = detectCategory(item.title);
  const categoryColor = categoryColors[category];
  const hasImage = item.imageUrl && item.imageUrl.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openPreview(item);
  };

  return (
    <article
      className="group relative w-full rounded-3xl overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      {/* Animated border glow */}
      <div
        className="absolute -inset-[2px] rounded-3xl opacity-75 blur-sm"
        style={{
          background: 'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #3b82f6, #f97316)',
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 4s ease infinite',
        }}
      />

      {/* Main card */}
      <div className="relative rounded-3xl overflow-hidden bg-bg-primary img-hover">
        {/* Background image */}
        {hasImage && (
          <div className="absolute inset-0">
            <img
              src={item.imageUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
          </div>
        )}

        {/* Fallback gradient if no image */}
        {!hasImage && (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}dd 0%, ${categoryColor}66 100%)`,
            }}
          />
        )}

        {/* Category icon decoration - only show on fallback gradient (no image) */}
        {!hasImage && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
            <CategoryIcon category={category} size={200} className="text-white" />
          </div>
        )}

        {/* Content */}
        <div className="relative p-6 md:p-8 min-h-[320px] md:min-h-[380px] flex flex-col justify-between">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            {/* #1 Badge */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center font-black text-3xl md:text-4xl text-white shadow-2xl rank-shine badge-hover"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
                  }}
                >
                  1
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
                  <TrophyIcon size={14} className="text-yellow-900" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-white/90 text-sm font-bold uppercase tracking-wider">
                  <FireIcon size={16} className="text-orange-400" />
                  <span>Top Story</span>
                </div>
                <div className="text-white/60 text-xs mt-0.5">
                  Top trending right now
                </div>
              </div>
            </div>

            {/* Platform badge */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
            >
              <PlatformIcon platform={item.platform} size={18} />
              <span>{config?.name}</span>
            </div>
          </div>

          {/* Title and description */}
          <div className="my-6">
            <h2 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-lg">
              {item.title}
            </h2>
            {item.description && (
              <p className="mt-3 text-base md:text-lg text-white/80 line-clamp-2 drop-shadow">
                {item.description}
              </p>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Stats */}
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold shadow-lg"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
              >
                <span className="text-xl">{formatNumber(item.engagementCount || 0)}</span>
                <span className="text-white/70 text-sm">{item.engagementLabel || 'points'}</span>
              </div>
              <span className="text-white/70 text-sm font-medium drop-shadow">
                {formatTimeAgo(item.timestamp)}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${categoryColor}40` }}
              >
                <CategoryIcon category={category} size={18} className="text-white" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              {/* Heat Badge */}
              <HeatBadge
                engagementCount={item.engagementCount || 0}
                hoursOld={getHoursOld(item.timestamp)}
                size="md"
                showLabel={true}
              />
              <ShareButtons
                url={item.url || `https://flare.app/story/${item.id}`}
                title={item.title}
                variant="overlay"
              />
              <VoteButtons
                itemId={item.id}
                variant="community"
                showFlareScore={true}
                platform={item.platform}
                category={category}
                title={item.title}
                url={item.url}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

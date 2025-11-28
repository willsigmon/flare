'use client';

import { TrendingItem, platformConfig } from '@/lib/types';
import { VoteButtons } from '@/components/voting/VoteButtons';
import { PlatformIcon, platformColors, CategoryIcon, Category, categoryColors } from '@/components/icons/PlatformIcons';
import { useStoryPreview } from '@/components/preview';
import { HeatBadge, getHoursOld } from '@/components/community';

interface Top10CardProps {
  item: TrendingItem;
  rank: number;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toString();
}

// Category-based detection for visual theming
function detectCategory(title: string): Category {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('ai') || titleLower.includes('artificial') || titleLower.includes('gpt')) return 'ai';
  if (titleLower.includes('tech') || titleLower.includes('software')) return 'tech';
  if (titleLower.includes('crypto') || titleLower.includes('bitcoin')) return 'crypto';
  if (titleLower.includes('game') || titleLower.includes('gaming')) return 'gaming';
  if (titleLower.includes('space') || titleLower.includes('nasa')) return 'space';
  if (titleLower.includes('climate')) return 'climate';
  if (titleLower.includes('politic') || titleLower.includes('election')) return 'politics';
  if (titleLower.includes('stock') || titleLower.includes('market')) return 'finance';
  if (titleLower.includes('science') || titleLower.includes('research')) return 'science';

  return 'news';
}

// Gradient colors based on rank
const rankGradients: Record<number, string> = {
  2: 'from-amber-500 to-yellow-600',
  3: 'from-gray-400 to-gray-500',
  4: 'from-orange-400 to-amber-500',
  5: 'from-blue-500 to-indigo-600',
  6: 'from-purple-500 to-pink-500',
  7: 'from-teal-500 to-cyan-500',
  8: 'from-rose-500 to-red-500',
  9: 'from-green-500 to-emerald-500',
  10: 'from-indigo-500 to-purple-500',
};

export function Top10Card({ item, rank }: Top10CardProps) {
  const { openPreview } = useStoryPreview();
  const config = platformConfig[item.platform];
  const color = platformColors[item.platform] || '#3b82f6';
  const category = detectCategory(item.title);
  const categoryColor = categoryColors[category];
  const hasImage = item.imageUrl && item.imageUrl.length > 0;
  const gradient = rankGradients[rank] || 'from-gray-500 to-gray-600';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openPreview(item);
  };

  return (
    <article
      className="group relative rounded-2xl overflow-hidden cursor-pointer card-hover spotlight-hover img-hover border-glow"
      onClick={handleClick}
    >
      {/* Background */}
      <div className="absolute inset-0">
        {hasImage ? (
          <>
            <img
              src={item.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />
          </>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient}`}
            style={{ opacity: 0.9 }}
          />
        )}
      </div>

      {/* Category icon decoration */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-10">
        <CategoryIcon category={category} size={80} className="text-white" />
      </div>

      {/* Content */}
      <div className="relative p-4 min-h-[160px] md:min-h-[180px] flex flex-col justify-between">
        {/* Top row - Rank + Platform */}
        <div className="flex items-start justify-between">
          {/* Rank badge */}
          <div
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-lg md:text-xl text-white shadow-lg rank-shine badge-hover`}
          >
            {rank}
          </div>

          {/* Platform */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white/90 text-xs font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          >
            <PlatformIcon platform={item.platform} size={14} />
            <span className="hidden sm:inline">{config?.name}</span>
          </div>
        </div>

        {/* Title */}
        <div className="mt-3">
          <h3 className="text-base md:text-lg font-bold text-white line-clamp-2 drop-shadow-md group-hover:text-white transition-colors title-hover">
            {item.title}
          </h3>
        </div>

        {/* Bottom row - Stats */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white font-semibold text-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
            >
              <span>{formatNumber(item.engagementCount || 0)}</span>
              <span className="text-white/60 text-xs hidden sm:inline">
                {item.engagementLabel || 'pts'}
              </span>
            </div>
            <HeatBadge
              engagementCount={item.engagementCount || 0}
              hoursOld={getHoursOld(item.timestamp)}
              size="sm"
              showLabel={false}
            />
            <span className="text-white/60 text-xs">
              {formatTimeAgo(item.timestamp)}
            </span>
          </div>

          {/* Vote buttons */}
          <div className="vote-reveal pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <VoteButtons
              itemId={item.id}
              variant="minimal"
              showFlareScore={true}
              platform={item.platform}
              category={category}
              title={item.title}
              url={item.url}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

'use client';

import { TrendingItem, platformConfig } from '@/lib/types';
import { VoteButtons } from '@/components/voting/VoteButtons';
import { PlatformIcon, platformColors } from '@/components/icons/PlatformIcons';
import { useStoryPreview } from '@/components/preview';
import { HeatBadge, getHoursOld } from '@/components/community';

interface CompactRowProps {
  item: TrendingItem;
  rank?: number;
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

// Extract comment count from subtitle
function extractCommentCount(subtitle?: string): string | null {
  if (!subtitle) return null;
  const match = subtitle.match(/(\d+)\s*comments?/i);
  return match ? match[1] : null;
}

export function CompactRow({ item, rank }: CompactRowProps) {
  const { openPreview } = useStoryPreview();
  const config = platformConfig[item.platform];
  const color = platformColors[item.platform] || '#3b82f6';
  const commentCount = extractCommentCount(item.subtitle);
  const hasImage = item.imageUrl && item.imageUrl.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openPreview(item);
  };

  return (
    <article className="group relative flex items-center gap-3 py-2.5 px-3 hover:bg-bg-tertiary/40 transition-colors rounded-lg mx-1 cursor-pointer" onClick={handleClick}>
      {/* Rank number */}
      {rank !== undefined && (
        <span className="w-6 text-sm font-semibold text-text-tertiary text-right flex-shrink-0 tabular-nums">
          {rank}
        </span>
      )}

      {/* Platform icon */}
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <PlatformIcon platform={item.platform} size={14} />
      </div>

      {/* Vote buttons */}
      <div className="flex-shrink-0 relative z-20">
        <VoteButtons
          itemId={item.id}
          variant="minimal"
          showFlareScore={true}
          platform={item.platform}
          title={item.title}
          url={item.url}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-accent-brand transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-tertiary">
          <span className="font-medium" style={{ color }}>
            {config?.name}
          </span>
          <span className="text-text-muted">·</span>
          <span className="font-semibold text-text-secondary">
            {formatNumber(item.engagementCount || 0)}
          </span>
          <HeatBadge
            engagementCount={item.engagementCount || 0}
            hoursOld={getHoursOld(item.timestamp)}
            size="sm"
            showLabel={false}
          />
          <span className="text-text-muted">·</span>
          <span>{formatTimeAgo(item.timestamp)}</span>
        </div>
      </div>

      {/* Thumbnail */}
      {hasImage && (
        <div className="flex-shrink-0 w-16 h-10 rounded-md overflow-hidden bg-bg-tertiary">
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Comment count */}
      {commentCount && (
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-text-tertiary px-2 py-1 rounded-md">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{commentCount}</span>
        </div>
      )}
    </article>
  );
}

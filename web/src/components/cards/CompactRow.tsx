'use client';

import { TrendingItem, platformConfig } from '@/lib/types';
import { VoteButtons } from '@/components/voting/VoteButtons';
import { PlatformIcon, platformColors } from '@/components/icons/PlatformIcons';
import { useStoryPreview } from '@/components/preview';
import { decodeHtmlEntities, formatNumber, formatTimeAgo } from '@/lib/utils';

interface CompactRowProps {
  item: TrendingItem;
  rank?: number;
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
  const title = decodeHtmlEntities(item.title);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openPreview(item);
  };

  return (
    <article
      className="group flex items-center gap-2 py-2 px-3 hover:bg-bg-tertiary/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      {/* Left section: Rank + Platform + Vote */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Rank number - fixed width for alignment */}
        {rank !== undefined && (
          <span className="w-5 text-xs font-medium text-text-tertiary text-right tabular-nums">
            {rank}
          </span>
        )}

        {/* Platform icon */}
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <PlatformIcon platform={item.platform} size={12} />
        </div>

        {/* Vote buttons - compact */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <VoteButtons
            itemId={item.id}
            variant="minimal"
            showFlareScore={false}
            platform={item.platform}
            title={title}
            url={item.url}
          />
        </div>
      </div>

      {/* Center: Title and meta */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-accent-brand transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-text-tertiary">
          <span className="font-medium" style={{ color }}>
            {config?.name}
          </span>
          <span className="text-text-muted">·</span>
          <span className="font-semibold text-text-secondary tabular-nums">
            {formatNumber(item.engagementCount || 0)}
          </span>
          <span className="text-text-muted">·</span>
          <span>{formatTimeAgo(item.timestamp, true)}</span>
        </div>
      </div>

      {/* Right section: Thumbnail + Comments */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Thumbnail */}
        {hasImage && (
          <div className="w-12 h-8 rounded overflow-hidden bg-bg-tertiary">
            <img
              src={item.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Comment count */}
        {commentCount && (
          <div className="flex items-center gap-1 text-xs text-text-tertiary min-w-[40px] justify-end">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="tabular-nums">{commentCount}</span>
          </div>
        )}
      </div>
    </article>
  );
}

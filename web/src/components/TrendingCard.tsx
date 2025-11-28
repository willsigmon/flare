'use client';

import { TrendingItem, platformConfig, formatEngagement, timeAgo } from '@/lib/types';
import { PlatformIcon } from '@/components/icons/PlatformIcons';

interface TrendingCardProps {
  item: TrendingItem;
}

export function TrendingCard({ item }: TrendingCardProps) {
  const config = platformConfig[item.platform];

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
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold">{formatEngagement(item.engagementCount)}</span>{' '}
              {item.engagementLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-blue-500 transition-colors">
          {item.title}
        </h3>

        {/* Subtitle */}
        {item.subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.subtitle}</p>
        )}

        {/* Description */}
        {item.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 flex-grow">
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-auto pt-2 text-xs text-gray-400">
          <PlatformIcon platform={item.platform} size={14} />
          <span>{timeAgo(item.timestamp)}</span>
        </div>
      </div>
    </a>
  );
}

export function TrendingSection({
  title,
  items,
  platform,
}: {
  title: string;
  items: TrendingItem[];
  platform: string;
}) {
  const config = platformConfig[platform as keyof typeof platformConfig];

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${config.gradient}`}
        >
          <PlatformIcon platform={platform as import('@/lib/types').Platform} size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-xs text-gray-500">{items.length} trending</p>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-3 px-4 pb-2">
          {items.slice(0, 10).map((item) => (
            <TrendingCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

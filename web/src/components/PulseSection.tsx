'use client';

import { useState } from 'react';
import { PulsePost, platformConfig, formatEngagement, timeAgo } from '@/lib/types';
import { PlatformIcon, MicrophoneIcon, CommentIcon, HeartIcon, ArrowUpIcon, CheckIcon } from '@/components/icons/PlatformIcons';

interface PulseSectionProps {
  posts: PulsePost[];
}

export function PulseSection({ posts }: PulseSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="mb-8">
      {/* Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4"
      >
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-3">
            {/* Animated icon */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center">
                <MicrophoneIcon size={20} className="text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 opacity-50 animate-pulse-ring" />
            </div>

            <div className="flex-grow text-left">
              <h2 className="font-bold gradient-text">The Pulse</h2>
              <p className="text-xs text-gray-500">See what people are saying</p>
            </div>

            {posts.length > 0 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700">
                {posts.length}
              </span>
            )}

            <span className="text-gray-400 text-sm">
              {isExpanded ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="mt-2 px-4">
          <div className="glass rounded-2xl divide-y divide-gray-200 dark:divide-gray-700">
            {posts.slice(0, 5).map((post) => (
              <PulsePostRow key={post.id} post={post} />
            ))}
            {posts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <CommentIcon size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No discussions yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PulsePostRow({ post }: { post: PulsePost }) {
  const config = platformConfig[post.platform];

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
          style={{
            backgroundColor: `${config.color}20`,
            color: config.color,
          }}
        >
          {post.authorName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-grow min-w-0">
          {/* Author info */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{post.authorName}</span>
            {post.isVerified && <CheckIcon size={12} className="text-blue-500" />}
            <span className="text-gray-400 text-xs">·</span>
            <span className="text-gray-500 text-xs">{post.authorHandle}</span>
            <span className="ml-auto" style={{ color: config.color }}>
              <PlatformIcon platform={post.platform} size={16} />
            </span>
          </div>

          {/* Content */}
          <p className="text-sm line-clamp-3 mb-2">{post.content}</p>

          {/* Footer */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              {post.engagementType === 'likes' ? (
                <HeartIcon size={12} className="text-red-500" />
              ) : (
                <ArrowUpIcon size={12} className="text-green-500" />
              )}
              {formatEngagement(post.engagementCount)}
            </span>
            {post.replyCount && (
              <span className="flex items-center gap-1">
                <CommentIcon size={12} />
                {post.replyCount}
              </span>
            )}
            <span className="ml-auto">{timeAgo(post.timestamp)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

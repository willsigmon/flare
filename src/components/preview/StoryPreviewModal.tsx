'use client';

import { useState, useEffect } from 'react';
import { useStoryPreview } from './StoryPreviewContext';
import { platformConfig, formatEngagement, timeAgo } from '@/lib/types';
import {
  PlatformIcon,
  platformColors,
  ExternalLinkIcon,
  CloseIcon,
  CommentIcon,
  FireIcon,
  CategoryIcon,
  Category,
  categoryColors,
} from '@/components/icons/PlatformIcons';
import { VoteButtons } from '@/components/voting/VoteButtons';
import { ShareButtons } from '@/components/social/ShareButtons';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  score: number;
  replies: Comment[];
  depth: number;
  platform: 'reddit' | 'hackernews';
}

type TabType = 'overview' | 'comments';

function detectCategory(title: string): Category {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('ai') || titleLower.includes('gpt') || titleLower.includes('llm')) return 'ai';
  if (titleLower.includes('tech') || titleLower.includes('software')) return 'tech';
  if (titleLower.includes('crypto') || titleLower.includes('bitcoin')) return 'crypto';
  if (titleLower.includes('game') || titleLower.includes('gaming')) return 'gaming';
  if (titleLower.includes('space') || titleLower.includes('nasa')) return 'space';
  return 'news';
}

function formatCommentTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function CommentThread({ comment, isLast = false }: { comment: Comment; isLast?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const platformColor = comment.platform === 'reddit' ? '#ff4500' : '#ff6600';

  // Clean up HTML entities and basic markdown
  const cleanContent = decodeHtmlEntities(comment.content)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  return (
    <div className={`${comment.depth > 0 ? 'ml-4 pl-4 border-l-2 border-border/50' : ''}`}>
      <div className="py-3">
        {/* Comment header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-text-muted hover:text-text-secondary text-xs"
          >
            [{collapsed ? '+' : '-'}]
          </button>
          <span className="font-semibold text-sm" style={{ color: platformColor }}>
            {comment.author}
          </span>
          {comment.score > 0 && (
            <span className="text-xs text-text-muted">
              {comment.score} points
            </span>
          )}
          <span className="text-xs text-text-muted">
            {formatCommentTime(comment.timestamp)}
          </span>
        </div>

        {/* Comment body */}
        {!collapsed && (
          <>
            <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {cleanContent}
            </div>

            {/* Nested replies */}
            {comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.map((reply, idx) => (
                  <CommentThread
                    key={reply.id}
                    comment={reply}
                    isLast={idx === comment.replies.length - 1}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {!isLast && comment.depth === 0 && <div className="border-b border-border/30" />}
    </div>
  );
}

function CommentsSection({ storyId, platform }: { storyId: string; platform: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComments() {
      // Only fetch for Reddit and HN
      if (platform !== 'reddit' && platform !== 'hackernews') {
        setLoading(false);
        setError('Comments not available for this platform');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/story/comments?platform=${platform}&id=${storyId}`
        );

        if (!response.ok) throw new Error('Failed to fetch comments');

        const data = await response.json();
        setComments(data.comments || []);
      } catch (err) {
        setError('Failed to load comments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [storyId, platform]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Loading comments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-text-muted">{error}</p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-text-muted">No comments yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {comments.map((comment, idx) => (
        <CommentThread
          key={comment.id}
          comment={comment}
          isLast={idx === comments.length - 1}
        />
      ))}
    </div>
  );
}

export function StoryPreviewModal() {
  const { previewItem, closePreview, isOpen } = useStoryPreview();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Reset tab when item changes
  useEffect(() => {
    if (previewItem) {
      setActiveTab('overview');
    }
  }, [previewItem]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, closePreview]);

  if (!isOpen || !previewItem) return null;

  const config = platformConfig[previewItem.platform];
  const color = platformColors[previewItem.platform] || '#3b82f6';
  const category = detectCategory(previewItem.title);
  const categoryColor = categoryColors[category];
  const hasImage = previewItem.imageUrl && previewItem.imageUrl.length > 0;

  // Extract story ID for comments
  const getStoryId = () => {
    if (previewItem.platform === 'reddit') {
      // Reddit URLs: reddit.com/r/subreddit/comments/{id}/...
      const match = previewItem.url?.match(/comments\/([a-z0-9]+)/i);
      return match?.[1] || previewItem.id;
    }
    return previewItem.id;
  };

  const supportsComments = previewItem.platform === 'reddit' || previewItem.platform === 'hackernews';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={closePreview}
      />

      {/* Modal */}
      <div className="relative z-10 w-full h-full md:w-[95vw] md:h-[95vh] md:max-w-5xl md:rounded-2xl bg-bg-primary shadow-2xl border border-border overflow-hidden flex flex-col">
        {/* Hero Header */}
        <div className="relative flex-shrink-0">
          {/* Background */}
          <div className="absolute inset-0 h-48">
            {hasImage ? (
              <>
                <img
                  src={previewItem.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent" />
              </>
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${categoryColor}40 0%, ${categoryColor}10 100%)`,
                }}
              />
            )}
          </div>

          {/* Header content */}
          <div className="relative px-6 pt-4 pb-6">
            {/* Top row - Close & Actions */}
            <div className="flex items-center justify-between mb-8">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <PlatformIcon platform={previewItem.platform} size={16} />
                <span>{config?.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-colors"
                >
                  <ExternalLinkIcon size={14} />
                  <span className="hidden sm:inline">Open Original</span>
                </a>
                <button
                  onClick={closePreview}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 backdrop-blur-sm rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight mb-4">
              {previewItem.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FireIcon size={18} className="text-orange-500" />
                <span className="font-bold text-text-primary">
                  {formatEngagement(previewItem.engagementCount || 0)}
                </span>
                <span className="text-text-secondary">
                  {previewItem.engagementLabel || 'points'}
                </span>
              </div>

              {previewItem.subtitle && (
                <>
                  <span className="text-text-muted">·</span>
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <CommentIcon size={16} />
                    <span>{previewItem.subtitle}</span>
                  </div>
                </>
              )}

              <span className="text-text-muted">·</span>
              <span className="text-text-secondary">{timeAgo(previewItem.timestamp)}</span>

              <div className="flex items-center gap-2 ml-auto">
                <VoteButtons itemId={previewItem.id} variant="compact" />
                <ShareButtons
                  url={previewItem.url || ''}
                  title={previewItem.title}
                  variant="compact"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-border bg-bg-secondary/50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'text-accent-brand border-accent-brand'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            Overview
          </button>
          {supportsComments && (
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'comments'
                  ? 'text-accent-brand border-accent-brand'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              <CommentIcon size={16} />
              <span>Comments</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-6 max-w-3xl">
              {/* Description */}
              {previewItem.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                    About this story
                  </h3>
                  <p className="text-text-primary leading-relaxed text-lg">
                    {previewItem.description}
                  </p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-bg-secondary rounded-xl p-4">
                  <div className="text-2xl font-bold text-text-primary">
                    {formatEngagement(previewItem.engagementCount || 0)}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {previewItem.engagementLabel || 'engagement'}
                  </div>
                </div>
                <div className="bg-bg-secondary rounded-xl p-4">
                  <div className="text-2xl font-bold text-text-primary">
                    #{previewItem.rank || '—'}
                  </div>
                  <div className="text-sm text-text-secondary">Trending rank</div>
                </div>
                <div className="bg-bg-secondary rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={previewItem.platform} size={24} />
                  </div>
                  <div className="text-sm text-text-secondary mt-1">{config?.name}</div>
                </div>
                <div className="bg-bg-secondary rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={category} size={24} style={{ color: categoryColor }} />
                  </div>
                  <div className="text-sm text-text-secondary mt-1 capitalize">{category}</div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-bg-secondary rounded-xl p-6 text-center">
                <p className="text-text-secondary mb-4">
                  Read the full story on {config?.name}
                </p>
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent-brand text-white font-medium rounded-lg hover:bg-accent-brand/90 transition-colors"
                >
                  <span>Open Original Article</span>
                  <ExternalLinkIcon size={16} />
                </a>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="p-6">
              <div className="max-w-3xl">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                  Discussion on {config?.name}
                </h3>
                <CommentsSection
                  storyId={getStoryId()}
                  platform={previewItem.platform}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

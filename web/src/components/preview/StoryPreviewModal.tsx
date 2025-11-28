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
import { detectMediaType, MediaInfo, getMediaTypeLabel } from '@/lib/mediaDetection';
import { ReaderView, ReaderSettingsPanel, useReaderSettings } from '@/components/reader';
import { YouTubePlayer } from '@/components/video';
import { AudioPlayer } from '@/components/audio';
import { HeatBadge, getHoursOld } from '@/components/community';

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

type TabType = 'overview' | 'read' | 'video' | 'audio' | 'comments' | 'settings';

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

  const cleanContent = decodeHtmlEntities(comment.content)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  return (
    <div className={`${comment.depth > 0 ? 'ml-4 pl-4 border-l-2 border-border/50' : ''}`}>
      <div className="py-3">
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
            <span className="text-xs text-text-muted">{comment.score} points</span>
          )}
          <span className="text-xs text-text-muted">{formatCommentTime(comment.timestamp)}</span>
        </div>

        {!collapsed && (
          <>
            <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {cleanContent}
            </div>
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
      if (platform !== 'reddit' && platform !== 'hackernews') {
        setLoading(false);
        setError('Comments not available for this platform');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/story/comments?platform=${platform}&id=${storyId}`);
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
        <CommentThread key={comment.id} comment={comment} isLast={idx === comments.length - 1} />
      ))}
    </div>
  );
}

// Tab icons
function ReadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AudioIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function StoryPreviewModal() {
  const { previewItem, closePreview, isOpen } = useStoryPreview();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mediaInfo, setMediaInfo] = useState<MediaInfo>({ type: 'article' });
  const [showReaderSettings, setShowReaderSettings] = useState(false);

  // Detect media type when item changes
  useEffect(() => {
    if (previewItem?.url) {
      const info = detectMediaType(previewItem.url);
      setMediaInfo(info);
      // Auto-select appropriate tab based on media type
      if (info.type === 'video' && info.videoId) {
        setActiveTab('video');
      } else if (info.type === 'audio') {
        setActiveTab('audio');
      } else {
        setActiveTab('overview');
      }
    } else {
      setActiveTab('overview');
      setMediaInfo({ type: 'article' });
    }
  }, [previewItem]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReaderSettings) {
          setShowReaderSettings(false);
        } else {
          closePreview();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, closePreview, showReaderSettings]);

  if (!isOpen || !previewItem) return null;

  const config = platformConfig[previewItem.platform];
  const color = platformColors[previewItem.platform] || '#3b82f6';
  const category = detectCategory(previewItem.title);
  const categoryColor = categoryColors[category];
  const hasImage = previewItem.imageUrl && previewItem.imageUrl.length > 0;

  const getStoryId = () => {
    if (previewItem.platform === 'reddit') {
      const match = previewItem.url?.match(/comments\/([a-z0-9]+)/i);
      return match?.[1] || previewItem.id;
    }
    return previewItem.id;
  };

  const supportsComments = previewItem.platform === 'reddit' || previewItem.platform === 'hackernews';
  const isVideo = mediaInfo.type === 'video' && mediaInfo.videoId;
  const isAudio = mediaInfo.type === 'audio';
  const isArticle = mediaInfo.type === 'article';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closePreview} />

      {/* Modal */}
      <div className="relative z-10 w-full h-full md:w-[95vw] md:h-[95vh] md:max-w-6xl md:rounded-2xl bg-bg-primary shadow-2xl border border-border overflow-hidden flex flex-col">
        {/* Hero Header */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 h-48">
            {hasImage ? (
              <>
                <img src={previewItem.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent" />
              </>
            ) : (
              <div
                className="w-full h-full"
                style={{ background: `linear-gradient(135deg, ${categoryColor}40 0%, ${categoryColor}10 100%)` }}
              />
            )}
          </div>

          <div className="relative px-6 pt-4 pb-6">
            {/* Top row */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <PlatformIcon platform={previewItem.platform} size={16} />
                  <span>{config?.name}</span>
                </div>
                {/* Media type badge */}
                <div className="px-2 py-1 rounded-full bg-bg-tertiary text-xs font-medium text-text-secondary">
                  {getMediaTypeLabel(mediaInfo.type)}
                </div>
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
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FireIcon size={18} className="text-orange-500" />
                <span className="font-bold text-text-primary">
                  {formatEngagement(previewItem.engagementCount || 0)}
                </span>
                <span className="text-text-secondary">{previewItem.engagementLabel || 'points'}</span>
              </div>

              <HeatBadge
                engagementCount={previewItem.engagementCount || 0}
                hoursOld={getHoursOld(previewItem.timestamp)}
                size="sm"
              />

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
                <VoteButtons
                  itemId={previewItem.id}
                  variant="compact"
                  showFlareScore={true}
                  platform={previewItem.platform}
                  category={category}
                  title={previewItem.title}
                  url={previewItem.url}
                />
                <ShareButtons url={previewItem.url || ''} title={previewItem.title} variant="compact" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-border bg-bg-secondary/50 flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-accent-brand border-accent-brand'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            Overview
          </button>

          {isArticle && (
            <button
              onClick={() => setActiveTab('read')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'read'
                  ? 'text-accent-brand border-accent-brand'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              <ReadIcon className="w-4 h-4" />
              <span>Read</span>
            </button>
          )}

          {isVideo && (
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'video'
                  ? 'text-accent-brand border-accent-brand'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              <VideoIcon className="w-4 h-4" />
              <span>Video</span>
            </button>
          )}

          {isAudio && (
            <button
              onClick={() => setActiveTab('audio')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'audio'
                  ? 'text-accent-brand border-accent-brand'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              <AudioIcon className="w-4 h-4" />
              <span>Audio</span>
            </button>
          )}

          {supportsComments && (
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'comments'
                  ? 'text-accent-brand border-accent-brand'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              <CommentIcon size={16} />
              <span>Comments</span>
            </button>
          )}

          {(activeTab === 'read' || isArticle) && (
            <button
              onClick={() => setShowReaderSettings(true)}
              className="px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 whitespace-nowrap ml-auto"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-6 max-w-3xl">
              {previewItem.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                    About this story
                  </h3>
                  <p className="text-text-primary leading-relaxed text-lg">{previewItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-bg-secondary rounded-xl p-4">
                  <div className="text-2xl font-bold text-text-primary">
                    {formatEngagement(previewItem.engagementCount || 0)}
                  </div>
                  <div className="text-sm text-text-secondary">{previewItem.engagementLabel || 'engagement'}</div>
                </div>
                <div className="bg-bg-secondary rounded-xl p-4">
                  <div className="text-2xl font-bold text-text-primary">#{previewItem.rank || '—'}</div>
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

              <div className="bg-bg-secondary rounded-xl p-6 text-center">
                <p className="text-text-secondary mb-4">
                  {isVideo
                    ? 'Watch the video below or on ' + config?.name
                    : isAudio
                    ? 'Listen to the audio below'
                    : 'Read the full story on ' + config?.name}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {isArticle && (
                    <button
                      onClick={() => setActiveTab('read')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-accent-brand text-white font-medium rounded-lg hover:bg-accent-brand/90 transition-colors"
                    >
                      <ReadIcon className="w-5 h-5" />
                      <span>Read Article</span>
                    </button>
                  )}
                  {isVideo && (
                    <button
                      onClick={() => setActiveTab('video')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <VideoIcon className="w-5 h-5" />
                      <span>Watch Video</span>
                    </button>
                  )}
                  <a
                    href={previewItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-bg-tertiary text-text-primary font-medium rounded-lg hover:bg-bg-tertiary/80 transition-colors"
                  >
                    <span>Open Original</span>
                    <ExternalLinkIcon size={16} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'read' && previewItem.url && (
            <ReaderView url={previewItem.url} title={previewItem.title} onClose={() => setActiveTab('overview')} />
          )}

          {activeTab === 'video' && isVideo && mediaInfo.videoId && (
            <div className="p-6">
              <YouTubePlayer
                videoId={mediaInfo.videoId}
                title={previewItem.title}
                onClose={() => setActiveTab('overview')}
              />
            </div>
          )}

          {activeTab === 'audio' && isAudio && (
            <div className="p-6 max-w-3xl mx-auto">
              <AudioPlayer
                src={mediaInfo.audioUrl || previewItem.url || ''}
                title={previewItem.title}
                artwork={previewItem.imageUrl}
                onClose={() => setActiveTab('overview')}
              />
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="p-6">
              <div className="max-w-3xl">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                  Discussion on {config?.name}
                </h3>
                <CommentsSection storyId={getStoryId()} platform={previewItem.platform} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reader Settings Panel */}
      <ReaderSettingsPanel isOpen={showReaderSettings} onClose={() => setShowReaderSettings(false)} />
    </div>
  );
}

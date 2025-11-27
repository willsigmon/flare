'use client';

import { useState, useEffect, useRef } from 'react';
import { useStoryPreview } from './StoryPreviewContext';
import { platformConfig, formatEngagement, timeAgo } from '@/lib/types';
import { PlatformIcon, platformColors, ExternalLinkIcon, CloseIcon, CommentIcon, ShareIcon } from '@/components/icons/PlatformIcons';
import { VoteButtons } from '@/components/voting/VoteButtons';
import { ShareButtons } from '@/components/social/ShareButtons';

export function StoryPreviewModal() {
  const { previewItem, closePreview, isOpen } = useStoryPreview();
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset state when item changes
  useEffect(() => {
    if (previewItem) {
      setIframeError(false);
      setIsLoading(true);
    }
  }, [previewItem]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreview();
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
  }, [isOpen, closePreview]);

  if (!isOpen || !previewItem) return null;

  const config = platformConfig[previewItem.platform];
  const color = platformColors[previewItem.platform] || '#3b82f6';

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIframeError(true);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closePreview}
      />

      {/* Modal - Full screen on mobile, large on desktop */}
      <div className="relative z-10 w-full h-full md:w-[90vw] md:h-[90vh] md:max-w-6xl md:rounded-2xl bg-bg-primary shadow-2xl border border-border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-secondary/50 flex-shrink-0">
          {/* Platform badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <PlatformIcon platform={previewItem.platform} size={16} />
            <span>{config?.name}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="font-semibold">
              {formatEngagement(previewItem.engagementCount || 0)}
            </span>
            <span className="text-text-muted">
              {previewItem.engagementLabel || 'points'}
            </span>
            <span className="text-text-muted">·</span>
            <span>{timeAgo(previewItem.timestamp)}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <VoteButtons itemId={previewItem.id} variant="compact" />
            <ShareButtons
              url={previewItem.url || `https://flare.app/story/${previewItem.id}`}
              title={previewItem.title}
              variant="compact"
            />
            <a
              href={previewItem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-tertiary/70 rounded-lg transition-colors"
            >
              <ExternalLinkIcon size={14} />
              <span className="hidden sm:inline">Open Original</span>
            </a>
            <button
              onClick={closePreview}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Title bar */}
        <div className="px-4 py-3 border-b border-border/50 bg-bg-primary flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary line-clamp-2">
            {previewItem.title}
          </h2>
          {previewItem.subtitle && (
            <p className="text-sm text-text-secondary mt-1">
              {previewItem.subtitle}
            </p>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading state */}
          {isLoading && !iframeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-accent-brand border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-text-secondary">Loading preview...</p>
              </div>
            </div>
          )}

          {/* Iframe or fallback content */}
          {!iframeError ? (
            <iframe
              ref={iframeRef}
              src={previewItem.url}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-popups"
              title={previewItem.title}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              {/* Fallback content when iframe is blocked */}
              <div className="p-6 max-w-3xl mx-auto">
                {/* Hero image */}
                {previewItem.imageUrl && (
                  <div className="rounded-xl overflow-hidden mb-6">
                    <img
                      src={previewItem.imageUrl}
                      alt=""
                      className="w-full h-auto max-h-[400px] object-cover"
                    />
                  </div>
                )}

                {/* Description */}
                {previewItem.description && (
                  <div className="mb-6">
                    <p className="text-text-primary leading-relaxed">
                      {previewItem.description}
                    </p>
                  </div>
                )}

                {/* Message about blocked content */}
                <div className="bg-bg-secondary rounded-xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
                    <ExternalLinkIcon size={24} className="text-text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Preview not available
                  </h3>
                  <p className="text-text-secondary mb-4">
                    This site doesn&apos;t allow embedding. Click below to view the full content.
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

                {/* Related actions */}
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-secondary rounded-lg transition-colors">
                    <CommentIcon size={16} />
                    <span>View Comments</span>
                  </button>
                  <ShareButtons
                    url={previewItem.url || `https://flare.app/story/${previewItem.id}`}
                    title={previewItem.title}
                    variant="default"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

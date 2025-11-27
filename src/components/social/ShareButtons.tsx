'use client';

import { useState } from 'react';
import { XIcon, RedditIcon, LinkIcon, CheckIcon, ShareIcon } from '@/components/icons/PlatformIcons';

interface ShareButtonsProps {
  url: string;
  title: string;
  variant?: 'default' | 'compact' | 'overlay';
}

export function ShareButtons({ url, title, variant = 'default' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled or error
      }
    }
  };

  const baseClasses = {
    default: 'p-2 rounded-lg transition-all duration-150',
    compact: 'p-1.5 rounded-md transition-all duration-150',
    overlay: 'p-2 rounded-full bg-bg-secondary/80 backdrop-blur transition-all duration-150',
  };

  // Simple single share button that opens menu
  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`${baseClasses[variant]} text-text-secondary hover:text-text-primary hover:bg-bg-tertiary`}
          title="Share"
          aria-label="Share"
        >
          <span className="text-base">↗</span>
        </button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            {/* Menu */}
            <div className="absolute right-0 bottom-full mb-2 z-50 bg-bg-secondary rounded-xl shadow-lg border border-border overflow-hidden min-w-[160px]">
              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <XIcon size={16} />
                <span className="text-sm">Twitter/X</span>
              </a>
              <a
                href={shareLinks.reddit}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <RedditIcon size={16} className="text-[#ff4500]" />
                <span className="text-sm">Reddit</span>
              </a>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleCopyLink();
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors w-full text-left"
              >
                {copied ? <CheckIcon size={16} className="text-green-500" /> : <LinkIcon size={16} />}
                <span className="text-sm">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleNativeShare();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors w-full text-left"
                >
                  <ShareIcon size={16} />
                  <span className="text-sm">More...</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Expanded buttons for overlay/default variant
  return (
    <div className="flex gap-2">
      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`${baseClasses[variant]} text-text-secondary hover:text-text-primary hover:bg-bg-tertiary`}
        title="Share on Twitter"
      >
        <XIcon size={18} />
      </a>
      <a
        href={shareLinks.reddit}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`${baseClasses[variant]} text-text-secondary hover:text-text-primary hover:bg-bg-tertiary`}
        title="Share on Reddit"
      >
        <RedditIcon size={18} className="text-[#ff4500]" />
      </a>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCopyLink();
        }}
        className={`${baseClasses[variant]} text-text-secondary hover:text-text-primary hover:bg-bg-tertiary`}
        title={copied ? 'Copied!' : 'Copy Link'}
      >
        {copied ? <CheckIcon size={18} className="text-green-500" /> : <LinkIcon size={18} />}
      </button>
    </div>
  );
}

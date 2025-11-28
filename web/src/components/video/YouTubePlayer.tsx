'use client';

import { useState, useRef, useEffect } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  onClose?: () => void;
}

// Extract YouTube video ID from various URL formats
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function YouTubePlayer({ videoId, title, onClose }: YouTubePlayerProps) {
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTheaterMode) {
          setIsTheaterMode(false);
        } else if (onClose) {
          onClose();
        }
      }
      if (e.key === 't' && e.ctrlKey) {
        e.preventDefault();
        setIsTheaterMode(!isTheaterMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTheaterMode, onClose]);

  // Picture-in-Picture (if supported)
  const togglePiP = async () => {
    if (!document.pictureInPictureEnabled) return;

    try {
      if (isPiP) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        // PiP requires a video element, not iframe
        // This is a limitation - would need YouTube Player API
        setIsPiP(true);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${isTheaterMode ? 'fixed inset-0 z-50 bg-black flex items-center justify-center' : ''}`}
    >
      {/* Theater mode backdrop */}
      {isTheaterMode && (
        <div className="absolute inset-0 bg-black" onClick={() => setIsTheaterMode(false)} />
      )}

      {/* Video container */}
      <div
        className={`relative ${
          isTheaterMode ? 'w-full max-w-[1600px] mx-auto' : 'w-full'
        }`}
      >
        {/* Controls bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 bg-gradient-to-b from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            {title && (
              <span className="text-white text-sm font-medium truncate max-w-xs">
                {title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={togglePiP}
              className="p-2 rounded hover:bg-white/20 text-white"
              title="Picture-in-Picture"
            >
              <PiPIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="p-2 rounded hover:bg-white/20 text-white"
              title="Theater Mode (Ctrl+T)"
            >
              <TheaterIcon className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded hover:bg-white/20 text-white"
                title="Close"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* YouTube iframe */}
        <div className={`relative ${isTheaterMode ? 'aspect-video' : 'aspect-video'}`}>
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
            title={title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full rounded-lg"
          />
        </div>

        {/* Video info bar */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          >
            <YouTubeIcon className="w-5 h-5 text-red-500" />
            <span>Watch on YouTube</span>
            <ExternalLinkIcon className="w-4 h-4" />
          </a>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-sm transition-colors"
              title="Like this video (requires YouTube login)"
            >
              <LikeIcon className="w-4 h-4" />
              <span>Like</span>
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-sm transition-colors"
              title="Save to Watch Later (requires YouTube login)"
            >
              <SaveIcon className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function PiPIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <rect x="12" y="9" width="8" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

function TheaterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function LikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

export default YouTubePlayer;

'use client';

import { useState, useEffect } from 'react';
import { useReaderSettings, fontFamilies, themeColors } from './ReaderSettings';

interface ReaderViewProps {
  url: string;
  title?: string;
  onClose?: () => void;
}

interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  datePublished?: string;
  siteName?: string;
  image?: string;
  wordCount: number;
  readingTime: number;
}

export function ReaderView({ url, title: initialTitle, onClose }: ReaderViewProps) {
  const { settings } = useReaderSettings();
  const [content, setContent] = useState<ExtractedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/content/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          throw new Error('Failed to extract content');
        }

        const data = await res.json();
        setContent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [url]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollTop = window.scrollY;
      const newProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, newProgress)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get theme colors
  const colors = settings.theme === 'auto' ? themeColors.auto : themeColors[settings.theme];

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-brand border-t-transparent rounded-full mx-auto mb-4" />
          <p style={{ color: colors.secondary }}>Loading article...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !content) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <ErrorIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
            Unable to load article
          </h2>
          <p className="mb-4" style={{ color: colors.secondary }}>
            {error || 'The article content could not be extracted.'}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-brand text-white rounded-lg hover:bg-accent-brand/90"
          >
            Open Original
            <ExternalLinkIcon className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-bg-tertiary z-50">
        <div
          className="h-full bg-accent-brand transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Article */}
      <article
        className="mx-auto px-4 py-8 md:py-12"
        style={{
          maxWidth: `${settings.maxWidth}px`,
          fontFamily: fontFamilies[settings.fontFamily],
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          color: colors.text,
        }}
      >
        {/* Header */}
        <header className="mb-8">
          {/* Site name */}
          {content.siteName && (
            <div className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
              {content.siteName}
            </div>
          )}

          {/* Title */}
          <h1
            className="font-bold mb-4"
            style={{
              fontSize: `${settings.fontSize * 1.75}px`,
              lineHeight: 1.2,
            }}
          >
            {content.title || initialTitle}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 flex-wrap" style={{ color: colors.secondary }}>
            {content.author && (
              <span className="font-medium">{content.author}</span>
            )}
            {content.datePublished && (
              <time dateTime={content.datePublished}>
                {new Date(content.datePublished).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
            <span>{content.readingTime} min read</span>
            <span>{content.wordCount.toLocaleString()} words</span>
          </div>

          {/* Featured image */}
          {content.image && (
            <div className="mt-6 -mx-4 md:mx-0">
              <img
                src={content.image}
                alt=""
                className="w-full rounded-lg md:rounded-xl"
              />
            </div>
          )}
        </header>

        {/* Content */}
        <div
          className="reader-content prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: content.content }}
          style={{
            '--prose-body': colors.text,
            '--prose-headings': colors.text,
            '--prose-links': 'var(--color-accent-brand)',
            '--prose-bold': colors.text,
            '--prose-quotes': colors.secondary,
            '--prose-quote-borders': 'var(--color-accent-brand)',
          } as React.CSSProperties}
        />

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t" style={{ borderColor: `${colors.secondary}30` }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm hover:underline"
              style={{ color: colors.secondary }}
            >
              View original article
              <ExternalLinkIcon className="w-4 h-4" />
            </a>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border transition-colors hover:bg-bg-secondary"
                style={{ borderColor: `${colors.secondary}40`, color: colors.secondary }}
              >
                Close Reader
              </button>
            )}
          </div>
        </footer>
      </article>
    </div>
  );
}

// Icons
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
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

export default ReaderView;

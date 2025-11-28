'use client';

import { useState, useEffect } from 'react';

interface FlareScoreBadgeProps {
  articleId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'inline' | 'detailed';
  showVoterCount?: boolean;
  className?: string;
}

interface FlareScoreData {
  articleId: string;
  upvotes: number;
  downvotes: number;
  score: number;
  voterCount: number;
}

function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`;
  if (score >= 1_000) return `${(score / 1_000).toFixed(1)}K`;
  return score.toString();
}

// Cache for flare scores to avoid redundant API calls
const scoreCache = new Map<string, { data: FlareScoreData; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute

export function FlareScoreBadge({
  articleId,
  size = 'md',
  variant = 'badge',
  showVoterCount = false,
  className = '',
}: FlareScoreBadgeProps) {
  const [score, setScore] = useState<FlareScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScore() {
      // Check cache first
      const cached = scoreCache.get(articleId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setScore(cached.data);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/community/flare-score/${encodeURIComponent(articleId)}`);
        if (res.ok) {
          const data = await res.json();
          const scoreData: FlareScoreData = {
            articleId,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            score: data.score || 0,
            voterCount: data.voterCount || 0,
          };
          scoreCache.set(articleId, { data: scoreData, timestamp: Date.now() });
          setScore(scoreData);
        }
      } catch (error) {
        console.error('Error fetching flare score:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchScore();
  }, [articleId]);

  if (loading || !score || score.voterCount === 0) {
    return null; // Don't show badge if no votes yet
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Inline variant - just the score with icon
  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${className}`}>
        <FlameIcon className={`${iconSizes[size]} ${score.score > 0 ? 'text-vote-positive' : 'text-text-muted'}`} />
        <span className={score.score > 0 ? 'text-vote-positive' : 'text-text-secondary'}>
          {formatScore(score.score)}
        </span>
      </span>
    );
  }

  // Detailed variant - full breakdown
  if (variant === 'detailed') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-1">
          <FlameIcon className={`${iconSizes[size]} text-vote-positive`} />
          <span className="font-bold text-vote-positive">{formatScore(score.score)}</span>
        </div>
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="flex items-center gap-0.5">
            <ArrowUpIcon className="w-3 h-3 text-vote-positive" />
            {score.upvotes}
          </span>
          <span className="flex items-center gap-0.5">
            <ArrowDownIcon className="w-3 h-3 text-vote-negative" />
            {score.downvotes}
          </span>
          {showVoterCount && (
            <span className="text-text-muted">
              ({score.voterCount} voter{score.voterCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      </div>
    );
  }

  // Badge variant (default) - compact pill
  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full font-semibold
        ${score.score > 0 ? 'bg-vote-positive/10 text-vote-positive' : 'bg-bg-tertiary text-text-secondary'}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <FlameIcon className={iconSizes[size]} />
      <span className="tabular-nums">{formatScore(score.score)}</span>
      {showVoterCount && (
        <span className="text-text-muted ml-0.5">
          ({score.voterCount})
        </span>
      )}
    </div>
  );
}

// Icons
function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.55 1.398-4.773 2.5-6.5C9 7.5 10 5.5 10 3c0 0 2 1.5 2 4.5 0 1.933-1 3-1 3s3-1.5 3-5c0 0 4 3.5 4 9.5 0 4.418-2.686 8-6 8zm0-4c-1.657 0-3-1.343-3-3 0-.766.33-1.455.85-2C10.5 13.5 11 13 11 12c0 0 1 .5 1 1.5 0 .5-.5 1-.5 1s1.5-.5 1.5-2c0 0 2 1.5 2 4 0 1.657-1.343 3-3 3z" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4l-8 8h5v8h6v-8h5l-8-8z" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 20l8-8h-5V4H9v8H4l8 8z" />
    </svg>
  );
}

// Hook for fetching multiple scores at once (batch)
export function useFlareScores(articleIds: string[]) {
  const [scores, setScores] = useState<Record<string, FlareScoreData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (articleIds.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchScores() {
      try {
        const res = await fetch('/api/community/flare-score/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleIds }),
        });

        if (res.ok) {
          const data = await res.json();
          setScores(data.scores || {});
        }
      } catch (error) {
        console.error('Error fetching flare scores:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, [articleIds.join(',')]);

  return { scores, loading };
}

export default FlareScoreBadge;

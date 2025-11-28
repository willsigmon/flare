'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

type VoteState = 'up' | 'down' | null;
type VoteValue = 1 | -1 | 0;

// ============================================
// Types
// ============================================
interface FlareScore {
  articleId: string;
  upvotes: number;
  downvotes: number;
  score: number;
  voterCount: number;
  userVote: number;
}

interface VoteButtonsProps {
  itemId: string;
  platform?: string;
  category?: string;
  title?: string;
  url?: string;
  variant?: 'default' | 'compact' | 'overlay' | 'minimal' | 'hero' | 'community';
  showFlareScore?: boolean;
  initialFlareScore?: FlareScore;
  onVote?: (vote: VoteState) => void;
}

interface VoteMetadata {
  platform?: string;
  category?: string;
  title?: string;
  url?: string;
}

// localStorage key for anonymous votes
const VOTES_STORAGE_KEY = 'flare_votes';

// ============================================
// Vote Context for global vote state management
// ============================================
interface VoteContextType {
  votes: Record<string, VoteValue>;
  flareScores: Record<string, FlareScore>;
  setVote: (articleId: string, vote: VoteValue, metadata?: VoteMetadata) => void;
  isLoading: boolean;
}

const VoteContext = createContext<VoteContextType | undefined>(undefined);

export function VoteProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [votes, setVotes] = useState<Record<string, VoteValue>>({});
  const [flareScores, setFlareScores] = useState<Record<string, FlareScore>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load votes on auth change
  useEffect(() => {
    if (authLoading) return;

    async function loadVotes() {
      setIsLoading(true);

      if (user) {
        // Authenticated: fetch from server
        try {
          const res = await fetch('/api/preferences/vote');
          const data = await res.json();
          setVotes(data.votes || {});
        } catch (error) {
          console.error('Error fetching votes:', error);
          // Fall back to localStorage
          setVotes(getLocalStorageVotes());
        }
      } else {
        // Anonymous: use localStorage
        setVotes(getLocalStorageVotes());
      }

      setIsLoading(false);
    }

    loadVotes();
  }, [user, authLoading]);

  // Sync localStorage votes to server on login
  useEffect(() => {
    if (!user || authLoading) return;

    const localVotes = getLocalStorageVotes();
    const localVoteCount = Object.keys(localVotes).length;

    if (localVoteCount > 0) {
      // Sync each local vote to server (fire and forget)
      Object.entries(localVotes).forEach(([articleId, vote]) => {
        fetch('/api/preferences/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId, vote }),
        }).catch(console.error);
      });

      // Clear localStorage after sync
      localStorage.removeItem(VOTES_STORAGE_KEY);
    }
  }, [user, authLoading]);

  const setVote = useCallback(async (articleId: string, vote: VoteValue, metadata?: VoteMetadata) => {
    const previousVote = votes[articleId] || 0;

    // Optimistic update for votes
    setVotes(prev => ({ ...prev, [articleId]: vote }));

    // Optimistic update for flare scores
    setFlareScores(prev => {
      const current = prev[articleId] || { articleId, upvotes: 0, downvotes: 0, score: 0, voterCount: 0, userVote: 0 };
      const newScore = { ...current };

      // Adjust based on vote change
      if (previousVote === 1) newScore.upvotes--;
      if (previousVote === -1) newScore.downvotes--;
      if (vote === 1) newScore.upvotes++;
      if (vote === -1) newScore.downvotes++;

      newScore.score = newScore.upvotes - newScore.downvotes;
      newScore.userVote = vote;

      if (previousVote === 0 && vote !== 0) newScore.voterCount++;
      if (previousVote !== 0 && vote === 0) newScore.voterCount--;

      return { ...prev, [articleId]: newScore };
    });

    if (user) {
      // Authenticated: save to server
      try {
        await fetch('/api/preferences/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId,
            vote,
            platform: metadata?.platform,
            category: metadata?.category,
            title: metadata?.title,
            url: metadata?.url,
          }),
        });
      } catch (error) {
        console.error('Error saving vote:', error);
        // Revert on error
        setVotes(prev => ({ ...prev, [articleId]: previousVote }));
      }
    } else {
      // Anonymous: save to localStorage
      saveLocalStorageVote(articleId, vote);
    }
  }, [user, votes]);

  return (
    <VoteContext.Provider value={{ votes, flareScores, setVote, isLoading }}>
      {children}
    </VoteContext.Provider>
  );
}

export function useVotes() {
  const context = useContext(VoteContext);
  if (context === undefined) {
    throw new Error('useVotes must be used within a VoteProvider');
  }
  return context;
}

// ============================================
// localStorage helpers
// ============================================
function getLocalStorageVotes(): Record<string, VoteValue> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(VOTES_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    const converted: Record<string, VoteValue> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (value === 'up' || value === 1) converted[key] = 1;
      else if (value === 'down' || value === -1) converted[key] = -1;
      else converted[key] = 0;
    });
    return converted;
  } catch {
    return {};
  }
}

function saveLocalStorageVote(articleId: string, vote: VoteValue) {
  if (typeof window === 'undefined') return;
  try {
    const votes = getLocalStorageVotes();
    if (vote === 0) {
      delete votes[articleId];
    } else {
      votes[articleId] = vote;
    }
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
  } catch {
    // Ignore storage errors
  }
}

// ============================================
// SVG Icons
// ============================================
function UpArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4l-8 8h5v8h6v-8h5l-8-8z" />
    </svg>
  );
}

function DownArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 20l8-8h-5V4H9v8H4l8 8z" />
    </svg>
  );
}

// ============================================
// Format helpers
// ============================================
function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// ============================================
// VoteButtons Component
// ============================================
export function VoteButtons({
  itemId,
  platform,
  category,
  title,
  url,
  variant = 'default',
  showFlareScore = false,
  initialFlareScore,
  onVote
}: VoteButtonsProps) {
  const { votes, flareScores, setVote } = useVotes();
  const [isAnimating, setIsAnimating] = useState<'up' | 'down' | null>(null);
  const [showGlow, setShowGlow] = useState(false);

  const currentVote = votes[itemId] || 0;
  const voteState: VoteState = currentVote === 1 ? 'up' : currentVote === -1 ? 'down' : null;

  // Get flare score (from context or initial prop)
  const flareScore = flareScores[itemId] || initialFlareScore;
  const displayScore = flareScore?.score || 0;

  const handleVote = (clickedVote: 'up' | 'down') => {
    // Toggle off if clicking same vote
    const newVoteState: VoteState = voteState === clickedVote ? null : clickedVote;
    const newVoteValue: VoteValue = newVoteState === 'up' ? 1 : newVoteState === 'down' ? -1 : 0;

    // Trigger animations
    setIsAnimating(clickedVote);
    if (newVoteState === 'up') {
      setShowGlow(true);
      setTimeout(() => setShowGlow(false), 400);
    }
    setTimeout(() => setIsAnimating(null), 300);

    // Update state
    setVote(itemId, newVoteValue, { platform, category, title, url });
    onVote?.(newVoteState);
  };

  // ============================================
  // Hero variant - Large Product Hunt style
  // ============================================
  if (variant === 'hero') {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('up');
          }}
          className={`
            vote-btn flex flex-col items-center justify-center
            w-14 h-14 rounded-xl font-bold
            ${voteState === 'up'
              ? 'voted-up bg-vote-positive text-white shadow-lg'
              : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-vote-positive'
            }
            ${isAnimating === 'up' ? 'animate-pop' : ''}
            ${showGlow && voteState === 'up' ? 'animate-glow' : ''}
          `}
          title="Upvote"
          aria-label="Upvote"
        >
          <UpArrowIcon className="w-6 h-6" />
          {showFlareScore && (
            <span className={`text-sm font-bold mt-0.5 vote-count ${isAnimating === 'up' ? 'animate-flip' : ''}`}>
              {formatCount(displayScore)}
            </span>
          )}
        </button>
        {showFlareScore && flareScore && (
          <span className="text-xs text-text-tertiary">
            {flareScore.voterCount} vote{flareScore.voterCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  // ============================================
  // Community variant - Prominent with count
  // ============================================
  if (variant === 'community') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('up');
          }}
          className={`
            vote-btn flex items-center gap-2 px-3 py-2 rounded-lg font-semibold
            ${voteState === 'up'
              ? 'voted-up bg-vote-positive text-white'
              : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-vote-positive border border-border'
            }
            ${isAnimating === 'up' ? 'animate-pop' : ''}
            ${showGlow && voteState === 'up' ? 'animate-glow' : ''}
          `}
          title="Upvote"
          aria-label="Upvote"
        >
          <UpArrowIcon className="w-5 h-5" />
          <span className={`vote-count ${isAnimating === 'up' ? 'animate-flip' : ''}`}>
            {formatCount(displayScore)}
          </span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('down');
          }}
          className={`
            vote-btn p-2 rounded-lg
            ${voteState === 'down'
              ? 'voted-down bg-vote-negative/20 text-vote-negative'
              : 'text-text-muted hover:text-vote-negative hover:bg-vote-negative/10'
            }
            ${isAnimating === 'down' ? 'animate-pop' : ''}
          `}
          title="Downvote"
          aria-label="Downvote"
        >
          <DownArrowIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // ============================================
  // Minimal variant - Vertical Reddit-style
  // ============================================
  if (variant === 'minimal') {
    return (
      <div className="flex flex-col items-center gap-0">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('up');
          }}
          className={`
            vote-btn p-1 rounded
            ${voteState === 'up'
              ? 'voted-up text-vote-positive'
              : 'text-text-muted hover:text-vote-positive'
            }
            ${isAnimating === 'up' ? 'animate-pop' : ''}
          `}
          title="Upvote"
          aria-label="Upvote"
        >
          <UpArrowIcon className="w-4 h-4" />
        </button>
        {showFlareScore && (
          <span className={`
            text-xs font-semibold tabular-nums
            ${voteState === 'up' ? 'text-vote-positive' : voteState === 'down' ? 'text-vote-negative' : 'text-text-secondary'}
            vote-count ${isAnimating ? 'animate-flip' : ''}
          `}>
            {formatCount(displayScore)}
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('down');
          }}
          className={`
            vote-btn p-1 rounded
            ${voteState === 'down'
              ? 'voted-down text-vote-negative'
              : 'text-text-muted hover:text-vote-negative'
            }
            ${isAnimating === 'down' ? 'animate-pop' : ''}
          `}
          title="Downvote"
          aria-label="Downvote"
        >
          <DownArrowIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ============================================
  // Compact variant - Horizontal small
  // ============================================
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('up');
          }}
          className={`
            vote-btn p-1.5 rounded-md
            ${voteState === 'up'
              ? 'voted-up bg-vote-positive/20 text-vote-positive'
              : 'text-text-muted hover:text-vote-positive hover:bg-vote-positive/10'
            }
            ${isAnimating === 'up' ? 'animate-pop' : ''}
          `}
          title="Upvote"
          aria-label="Upvote"
        >
          <UpArrowIcon className="w-4 h-4" />
        </button>
        {showFlareScore && (
          <span className={`
            text-xs font-semibold tabular-nums min-w-[20px] text-center
            ${voteState === 'up' ? 'text-vote-positive' : voteState === 'down' ? 'text-vote-negative' : 'text-text-secondary'}
          `}>
            {formatCount(displayScore)}
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('down');
          }}
          className={`
            vote-btn p-1.5 rounded-md
            ${voteState === 'down'
              ? 'voted-down bg-vote-negative/20 text-vote-negative'
              : 'text-text-muted hover:text-vote-negative hover:bg-vote-negative/10'
            }
            ${isAnimating === 'down' ? 'animate-pop' : ''}
          `}
          title="Downvote"
          aria-label="Downvote"
        >
          <DownArrowIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ============================================
  // Overlay variant - For card overlays
  // ============================================
  if (variant === 'overlay') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('up');
          }}
          className={`
            vote-btn p-2 rounded-full bg-black/40 backdrop-blur-sm
            ${voteState === 'up'
              ? 'voted-up text-vote-positive'
              : 'text-white/80 hover:text-vote-positive hover:bg-black/60'
            }
            ${isAnimating === 'up' ? 'animate-pop' : ''}
          `}
          title="Upvote"
          aria-label="Upvote"
        >
          <UpArrowIcon className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('down');
          }}
          className={`
            vote-btn p-2 rounded-full bg-black/40 backdrop-blur-sm
            ${voteState === 'down'
              ? 'voted-down text-vote-negative'
              : 'text-white/80 hover:text-vote-negative hover:bg-black/60'
            }
            ${isAnimating === 'down' ? 'animate-pop' : ''}
          `}
          title="Downvote"
          aria-label="Downvote"
        >
          <DownArrowIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // ============================================
  // Default variant - Standard horizontal
  // ============================================
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('up');
        }}
        className={`
          vote-btn p-2 rounded-lg
          ${voteState === 'up'
            ? 'voted-up bg-vote-positive/20 text-vote-positive'
            : 'text-text-muted hover:text-vote-positive hover:bg-vote-positive/10'
          }
          ${isAnimating === 'up' ? 'animate-pop' : ''}
          ${showGlow && voteState === 'up' ? 'animate-glow' : ''}
        `}
        title="Upvote"
        aria-label="Upvote"
      >
        <UpArrowIcon className="w-5 h-5" />
      </button>
      {showFlareScore && (
        <span className={`
          text-sm font-semibold tabular-nums min-w-[24px] text-center
          ${voteState === 'up' ? 'text-vote-positive' : voteState === 'down' ? 'text-vote-negative' : 'text-text-secondary'}
          vote-count ${isAnimating ? 'animate-flip' : ''}
        `}>
          {formatCount(displayScore)}
        </span>
      )}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('down');
        }}
        className={`
          vote-btn p-2 rounded-lg
          ${voteState === 'down'
            ? 'voted-down bg-vote-negative/20 text-vote-negative'
            : 'text-text-muted hover:text-vote-negative hover:bg-vote-negative/10'
          }
          ${isAnimating === 'down' ? 'animate-pop' : ''}
        `}
        title="Downvote"
        aria-label="Downvote"
      >
        <DownArrowIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// Hook for accessing vote state elsewhere (legacy compatibility)
export function useVote(itemId: string): VoteState {
  const { votes } = useVotes();
  const currentVote = votes[itemId] || 0;
  return currentVote === 1 ? 'up' : currentVote === -1 ? 'down' : null;
}

// Hook for getting flare score
export function useFlareScore(itemId: string): FlareScore | undefined {
  const { flareScores } = useVotes();
  return flareScores[itemId];
}

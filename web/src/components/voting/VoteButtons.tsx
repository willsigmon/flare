'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

type VoteState = 'up' | 'down' | null;
type VoteValue = 1 | -1 | 0;

interface VoteButtonsProps {
  itemId: string;
  platform?: string;
  category?: string;
  title?: string;
  url?: string;
  variant?: 'default' | 'compact' | 'overlay' | 'minimal';
  onVote?: (vote: VoteState) => void;
}

// localStorage key for anonymous votes
const VOTES_STORAGE_KEY = 'flare_votes';

// ============================================
// Vote Context for global vote state management
// ============================================
interface VoteContextType {
  votes: Record<string, VoteValue>;
  setVote: (articleId: string, vote: VoteValue, metadata?: VoteMetadata) => void;
  isLoading: boolean;
}

interface VoteMetadata {
  platform?: string;
  category?: string;
  title?: string;
  url?: string;
}

const VoteContext = createContext<VoteContextType | undefined>(undefined);

export function VoteProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [votes, setVotes] = useState<Record<string, VoteValue>>({});
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
    // Optimistic update
    setVotes(prev => ({ ...prev, [articleId]: vote }));

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
        // Revert on error (optional)
      }
    } else {
      // Anonymous: save to localStorage
      saveLocalStorageVote(articleId, vote);
    }
  }, [user]);

  return (
    <VoteContext.Provider value={{ votes, setVote, isLoading }}>
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
    // Convert 'up'/'down' to 1/-1 for consistency
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
// VoteButtons Component
// ============================================
export function VoteButtons({
  itemId,
  platform,
  category,
  title,
  url,
  variant = 'default',
  onVote
}: VoteButtonsProps) {
  const { votes, setVote } = useVotes();
  const [isAnimating, setIsAnimating] = useState<'up' | 'down' | null>(null);

  const currentVote = votes[itemId] || 0;
  const voteState: VoteState = currentVote === 1 ? 'up' : currentVote === -1 ? 'down' : null;

  const handleVote = (clickedVote: 'up' | 'down') => {
    // Toggle off if clicking same vote
    const newVoteState: VoteState = voteState === clickedVote ? null : clickedVote;
    const newVoteValue: VoteValue = newVoteState === 'up' ? 1 : newVoteState === 'down' ? -1 : 0;

    // Animate
    setIsAnimating(clickedVote);
    setTimeout(() => setIsAnimating(null), 200);

    // Update state
    setVote(itemId, newVoteValue, { platform, category, title, url });
    onVote?.(newVoteState);
  };

  const baseClasses = {
    default: 'p-2 rounded-lg transition-all duration-150',
    compact: 'p-1.5 rounded-md transition-all duration-150',
    overlay: 'p-2 rounded-full bg-bg-secondary/80 backdrop-blur transition-all duration-150',
    minimal: 'p-0.5 transition-all duration-150',
  };

  // IMPORTANT: Default state is NEUTRAL GRAY, only colored when voted
  const upClasses = voteState === 'up'
    ? 'bg-accent-positive/20 text-accent-positive'
    : 'text-text-muted hover:text-accent-positive hover:bg-accent-positive/10';

  const downClasses = voteState === 'down'
    ? 'bg-accent-negative/20 text-accent-negative'
    : 'text-text-muted hover:text-accent-negative hover:bg-accent-negative/10';

  // Minimal variant - vertical Reddit-style
  if (variant === 'minimal') {
    return (
      <div className="flex flex-col items-center gap-0">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('up');
          }}
          className={`${baseClasses.minimal} ${upClasses} ${isAnimating === 'up' ? 'scale-125' : ''} rounded`}
          title="More like this"
          aria-label="More like this"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3l-7 7h4v7h6v-7h4l-7-7z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote('down');
          }}
          className={`${baseClasses.minimal} ${downClasses} ${isAnimating === 'down' ? 'scale-125' : ''} rounded`}
          title="Less like this"
          aria-label="Less like this"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 17l7-7h-4V3H7v7H3l7 7z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex ${variant === 'compact' ? 'gap-1' : 'gap-2'}`}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('up');
        }}
        className={`${baseClasses[variant]} ${upClasses} ${isAnimating === 'up' ? 'scale-125' : ''}`}
        title="More like this"
        aria-label="More like this"
      >
        <span className={variant === 'compact' ? 'text-base' : 'text-lg'}>👍</span>
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('down');
        }}
        className={`${baseClasses[variant]} ${downClasses} ${isAnimating === 'down' ? 'scale-125' : ''}`}
        title="Less like this"
        aria-label="Less like this"
      >
        <span className={variant === 'compact' ? 'text-base' : 'text-lg'}>👎</span>
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

'use client';

import { useState, useEffect } from 'react';

type VoteState = 'up' | 'down' | null;

interface VoteButtonsProps {
  itemId: string;
  variant?: 'default' | 'compact' | 'overlay' | 'minimal';
  onVote?: (vote: VoteState) => void;
}

// localStorage key for votes
const VOTES_STORAGE_KEY = 'flare_votes';

function getStoredVotes(): Record<string, VoteState> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(VOTES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredVote(itemId: string, vote: VoteState) {
  if (typeof window === 'undefined') return;
  try {
    const votes = getStoredVotes();
    if (vote === null) {
      delete votes[itemId];
    } else {
      votes[itemId] = vote;
    }
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
  } catch {
    // Ignore storage errors
  }
}

export function VoteButtons({ itemId, variant = 'default', onVote }: VoteButtonsProps) {
  const [vote, setVote] = useState<VoteState>(null);
  const [isAnimating, setIsAnimating] = useState<'up' | 'down' | null>(null);

  // Load vote from localStorage on mount
  useEffect(() => {
    const votes = getStoredVotes();
    setVote(votes[itemId] || null);
  }, [itemId]);

  const handleVote = (newVote: 'up' | 'down') => {
    // Toggle off if clicking same vote
    const finalVote = vote === newVote ? null : newVote;

    // Animate
    setIsAnimating(newVote);
    setTimeout(() => setIsAnimating(null), 200);

    // Update state
    setVote(finalVote);
    setStoredVote(itemId, finalVote);
    onVote?.(finalVote);
  };

  const baseClasses = {
    default: 'p-2 rounded-lg transition-all duration-150',
    compact: 'p-1.5 rounded-md transition-all duration-150',
    overlay: 'p-2 rounded-full bg-bg-secondary/80 backdrop-blur transition-all duration-150',
    minimal: 'p-0.5 transition-all duration-150',
  };

  // IMPORTANT: Default state is NEUTRAL GRAY, only colored when voted
  const upClasses = vote === 'up'
    ? 'bg-accent-positive/20 text-accent-positive'
    : 'text-text-muted hover:text-accent-positive hover:bg-accent-positive/10';

  const downClasses = vote === 'down'
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

// Hook for accessing vote state elsewhere
export function useVote(itemId: string) {
  const [vote, setVote] = useState<VoteState>(null);

  useEffect(() => {
    const votes = getStoredVotes();
    setVote(votes[itemId] || null);
  }, [itemId]);

  return vote;
}

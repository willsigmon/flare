'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TrendingItem } from '@/lib/types';

interface StoryPreviewContextType {
  previewItem: TrendingItem | null;
  openPreview: (item: TrendingItem) => void;
  closePreview: () => void;
  isOpen: boolean;
}

const StoryPreviewContext = createContext<StoryPreviewContextType | undefined>(undefined);

export function StoryPreviewProvider({ children }: { children: ReactNode }) {
  const [previewItem, setPreviewItem] = useState<TrendingItem | null>(null);

  const openPreview = useCallback((item: TrendingItem) => {
    setPreviewItem(item);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewItem(null);
  }, []);

  return (
    <StoryPreviewContext.Provider
      value={{
        previewItem,
        openPreview,
        closePreview,
        isOpen: previewItem !== null,
      }}
    >
      {children}
    </StoryPreviewContext.Provider>
  );
}

export function useStoryPreview() {
  const context = useContext(StoryPreviewContext);
  if (context === undefined) {
    throw new Error('useStoryPreview must be used within a StoryPreviewProvider');
  }
  return context;
}

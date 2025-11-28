'use client';

import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { StoryPreviewProvider, StoryPreviewModal } from '@/components/preview';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <StoryPreviewProvider>
      <div className="min-h-screen bg-background">
        {/* Top Navbar */}
        <Navbar />

        {/* Main Content Area */}
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-6 pb-20 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
            {/* Main Content */}
            <main className="min-w-0">
              {children}
            </main>

            {/* Sidebar - Hidden on mobile/tablet, visible on desktop */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <Sidebar />
              </div>
            </aside>
          </div>
        </div>

        {/* Story Preview Modal */}
        <StoryPreviewModal />
      </div>
    </StoryPreviewProvider>
  );
}

import { Suspense } from 'react';
import { fetchAllTrends } from '@/lib/trending';
import { MainLayout } from '@/components/layout';
import { FilterableFeed } from '@/components/feed';

// Server component to fetch data
async function TrendingContent() {
  const sections = await fetchAllTrends();

  // Flatten and sort all items by engagement
  const allItems = sections
    .flatMap(s => s.items)
    .sort((a, b) => (b.engagementCount || 0) - (a.engagementCount || 0));

  return <FilterableFeed items={allItems} />;
}

// Modern loading skeleton with animations
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter chips skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-10 rounded-full bg-bg-secondary animate-pulse"
            style={{ width: `${60 + i * 15}px`, animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>

      {/* Featured skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="aspect-[16/10] rounded-2xl bg-gradient-to-br from-bg-secondary to-bg-tertiary animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

      {/* List skeleton */}
      <div className="bg-bg-secondary rounded-xl overflow-hidden">
        <div className="divide-y divide-border/30">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="py-3 px-4 flex items-center gap-3 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="w-8 h-5 bg-bg-tertiary rounded" />
              <div className="w-5 h-8 bg-bg-tertiary rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-bg-tertiary rounded w-3/4" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingSkeleton />}>
        <TrendingContent />
      </Suspense>
    </MainLayout>
  );
}

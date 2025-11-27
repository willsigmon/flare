'use client';

import { useAuth } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { ActivityFeed, Leaderboards } from '@/components/social';

export default function ActivityPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-accent-brand border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔔</div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">Sign in to see your activity</h1>
          <p className="text-text-secondary max-w-md mx-auto">
            Create an account to track interactions, see who's engaging with your content, and climb the leaderboards.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Activity</h1>
          <p className="text-text-secondary">Stay up to date with what's happening around you</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Feed - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ActivityFeed showFilters={true} limit={50} />
          </div>

          {/* Sidebar - Leaderboards */}
          <div className="space-y-6">
            <Leaderboards type="contributors" period="week" limit={10} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

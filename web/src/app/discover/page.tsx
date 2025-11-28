'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { useAuth } from '@/components/auth';
import {
  CategoryIcon,
  Category,
  categoryColors,
  FireIcon,
  NewsIcon,
  UserIcon,
  SparklesIcon,
} from '@/components/icons/PlatformIcons';

interface DiscoverCategory {
  id: Category;
  name: string;
  description: string;
}

interface TrendingTopic {
  id: string;
  name: string;
  postCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface FeaturedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  followers: number;
  isFollowing: boolean;
}

const categories: DiscoverCategory[] = [
  { id: 'tech', name: 'Technology', description: 'Latest tech news and innovations' },
  { id: 'space', name: 'Startups', description: 'Entrepreneurship and venture news' },
  { id: 'science', name: 'Science', description: 'Scientific discoveries and research' },
  { id: 'gaming', name: 'Gaming', description: 'Video games, esports, and more' },
  { id: 'entertainment', name: 'Entertainment', description: 'Movies, shows, and creative work' },
  { id: 'ai', name: 'AI & ML', description: 'Artificial intelligence and machine learning' },
  { id: 'finance', name: 'Finance', description: 'Markets, investing, and economics' },
  { id: 'crypto', name: 'Crypto & Web3', description: 'Blockchain, DeFi, and NFTs' },
];

export default function DiscoverPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [featuredUsers, setFeaturedUsers] = useState<FeaturedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated data - in real app, fetch from API
    setTrendingTopics([
      { id: '1', name: 'Claude AI', postCount: 342, trend: 'up' },
      { id: '2', name: 'React 19', postCount: 256, trend: 'up' },
      { id: '3', name: 'Apple Vision Pro', postCount: 189, trend: 'stable' },
      { id: '4', name: 'Rust', postCount: 167, trend: 'up' },
      { id: '5', name: 'GPT-5 Rumors', postCount: 134, trend: 'down' },
      { id: '6', name: 'SwiftUI', postCount: 112, trend: 'up' },
      { id: '7', name: 'Next.js 16', postCount: 98, trend: 'up' },
      { id: '8', name: 'Tailwind CSS', postCount: 87, trend: 'stable' },
    ]);

    setFeaturedUsers([
      { id: '1', username: 'techcrunch', display_name: 'TechCrunch', bio: 'Startup and technology news', followers: 12500, isFollowing: false },
      { id: '2', username: 'hackernews', display_name: 'Hacker News', bio: 'Y Combinator news aggregator', followers: 8900, isFollowing: true },
      { id: '3', username: 'producthunt', display_name: 'Product Hunt', bio: 'Discover new products daily', followers: 6700, isFollowing: false },
    ]);

    setIsLoading(false);
  }, []);

  const handleFollow = async (userId: string) => {
    if (!user) return;

    setFeaturedUsers(users =>
      users.map(u =>
        u.id === userId
          ? { ...u, isFollowing: !u.isFollowing, followers: u.isFollowing ? u.followers - 1 : u.followers + 1 }
          : u
      )
    );

    // TODO: Call API to follow/unfollow
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-accent-positive">↑</span>;
      case 'down':
        return <span className="text-accent-negative">↓</span>;
      default:
        return <span className="text-text-tertiary">→</span>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Discover</h1>
          <p className="text-text-secondary">Explore trending topics, categories, and people to follow</p>
        </div>

        {/* Trending Topics */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <FireIcon size={20} className="text-orange-500" />
            <span>Trending Now</span>
          </h2>
          <div className="bg-bg-secondary rounded-2xl p-6">
            <div className="flex flex-wrap gap-3">
              {trendingTopics.map((topic, index) => (
                <button
                  key={topic.id}
                  className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary rounded-full hover:bg-bg-tertiary/80 transition-colors group"
                >
                  <span className="text-xs text-text-tertiary font-medium">#{index + 1}</span>
                  <span className="text-sm font-medium text-text-primary group-hover:text-accent-brand transition-colors">
                    {topic.name}
                  </span>
                  <span className="text-xs text-text-tertiary">{topic.postCount}</span>
                  {getTrendIcon(topic.trend)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <NewsIcon size={20} className="text-text-secondary" />
            <span>Browse by Category</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => {
              const isSelected = selectedCategory === category.id;
              const color = categoryColors[category.id];
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                  className={`p-5 rounded-2xl text-left transition-all ${
                    isSelected
                      ? 'text-white ring-2 ring-offset-2 ring-offset-background'
                      : 'bg-bg-secondary hover:bg-bg-tertiary'
                  }`}
                  style={isSelected ? { backgroundColor: color, borderColor: color } : undefined}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      isSelected ? 'bg-white/20' : ''
                    }`}
                    style={!isSelected ? { backgroundColor: `${color}15` } : undefined}
                  >
                    <CategoryIcon
                      category={category.id}
                      size={24}
                      className={isSelected ? 'text-white' : ''}
                      style={!isSelected ? { color } : undefined}
                    />
                  </div>
                  <h3 className={`font-semibold mb-1 ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                    {category.name}
                  </h3>
                  <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-text-secondary'}`}>
                    {category.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Featured Users */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <UserIcon size={20} className="text-text-secondary" />
            <span>Who to Follow</span>
          </h2>
          <div className="bg-bg-secondary rounded-2xl divide-y divide-border">
            {featuredUsers.map((featuredUser) => (
              <div key={featuredUser.id} className="p-5 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-accent-brand flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {featuredUser.avatar_url ? (
                    <img src={featuredUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    featuredUser.display_name.substring(0, 1).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary">{featuredUser.display_name}</h3>
                  <p className="text-sm text-text-secondary">@{featuredUser.username}</p>
                  {featuredUser.bio && (
                    <p className="text-sm text-text-tertiary mt-1 truncate">{featuredUser.bio}</p>
                  )}
                </div>

                {/* Stats & Follow */}
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-text-primary">{featuredUser.followers.toLocaleString()}</p>
                    <p className="text-xs text-text-tertiary">followers</p>
                  </div>
                  <button
                    onClick={() => handleFollow(featuredUser.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      featuredUser.isFollowing
                        ? 'bg-bg-tertiary text-text-secondary hover:bg-accent-negative/10 hover:text-accent-negative'
                        : 'bg-accent-brand text-white hover:bg-accent-brand/90'
                    }`}
                  >
                    {featuredUser.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* For You Section */}
        {user && (
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <SparklesIcon size={20} className="text-amber-500" />
              <span>For You</span>
            </h2>
            <div className="bg-bg-secondary rounded-2xl p-6">
              <p className="text-text-secondary text-center py-8">
                Personalized recommendations based on your activity will appear here as you use Flare.
              </p>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}

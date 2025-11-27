export type Platform =
  | 'reddit'
  | 'twitter'
  | 'threads'
  | 'google'
  | 'hackernews'
  | 'youtube'
  | 'bluesky'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'substack'
  | 'medium'
  | 'local';

export interface TrendingItem {
  id: string;
  platform: Platform;
  title: string;
  originalTitle?: string; // Original title before enhancement (for vague/clickbait titles)
  subtitle?: string;
  description?: string;
  url?: string;
  rank: number;
  engagementCount?: number;
  engagementLabel?: string;
  timestamp: Date;
  category?: string;
  imageUrl?: string;
}

export interface TrendingSection {
  id: string;
  platform: Platform;
  title: string;
  items: TrendingItem[];
}

export interface PulsePost {
  id: string;
  platform: Platform;
  authorName: string;
  authorHandle: string;
  content: string;
  relatedTopic?: string;
  engagementCount: number;
  engagementType: 'likes' | 'upvotes' | 'points' | 'views';
  timestamp: Date;
  url?: string;
  isVerified: boolean;
  replyCount?: number;
}

export const platformConfig: Record<Platform, {
  name: string;
  icon: string;
  color: string;
  gradient: string;
}> = {
  reddit: {
    name: 'Reddit',
    icon: '💬',
    color: '#ff4500',
    gradient: 'from-orange-500 to-orange-600',
  },
  twitter: {
    name: 'X',
    icon: '𝕏',
    color: '#000000',
    gradient: 'from-gray-700 to-black',
  },
  threads: {
    name: 'Threads',
    icon: '@',
    color: '#000000',
    gradient: 'from-purple-500 to-pink-500',
  },
  google: {
    name: 'Google',
    icon: '🔍',
    color: '#4285f4',
    gradient: 'from-blue-500 to-blue-600',
  },
  hackernews: {
    name: 'Hacker News',
    icon: 'Y',
    color: '#ff6600',
    gradient: 'from-orange-500 to-orange-700',
  },
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    color: '#ff0000',
    gradient: 'from-red-500 to-red-600',
  },
  bluesky: {
    name: 'Bluesky',
    icon: '🦋',
    color: '#0085ff',
    gradient: 'from-sky-400 to-blue-500',
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    color: '#e4405f',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
  },
  facebook: {
    name: 'Facebook',
    icon: 'f',
    color: '#1877f2',
    gradient: 'from-blue-500 to-blue-600',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'in',
    color: '#0a66c2',
    gradient: 'from-blue-600 to-blue-700',
  },
  tiktok: {
    name: 'TikTok',
    icon: '♪',
    color: '#000000',
    gradient: 'from-pink-500 via-purple-500 to-cyan-400',
  },
  substack: {
    name: 'Substack',
    icon: 'S',
    color: '#ff6719',
    gradient: 'from-orange-500 to-orange-600',
  },
  medium: {
    name: 'Medium',
    icon: 'M',
    color: '#000000',
    gradient: 'from-gray-700 to-black',
  },
  local: {
    name: 'Local',
    icon: 'L',
    color: '#00a385',
    gradient: 'from-teal-500 to-teal-600',
  },
};

export function formatEngagement(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  } else if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

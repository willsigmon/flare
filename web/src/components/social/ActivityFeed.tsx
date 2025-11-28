'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth';
import Link from 'next/link';

interface ActivityEvent {
  id: string;
  event_type: string;
  created_at: string;
  article_id?: string;
  comment_id?: string;
  actor: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  articles?: {
    title: string;
    url: string;
    platform: string;
  };
}

interface ActivityFeedProps {
  limit?: number;
  showFilters?: boolean;
}

export function ActivityFeed({ limit = 50, showFilters = true }: ActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mentions' | 'follows' | 'likes' | 'comments'>('all');

  useEffect(() => {
    if (user) {
      loadActivities();
    } else {
      setIsLoading(false);
    }
  }, [user, filter]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/social/activity?type=${filter}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return '👤';
      case 'upvote':
      case 'like':
        return '👍';
      case 'mention':
        return '@';
      case 'comment':
      case 'reply':
        return '💬';
      default:
        return '🔔';
    }
  };

  const getEventText = (event: ActivityEvent) => {
    const actorName = event.actor?.display_name || event.actor?.username || 'Someone';

    switch (event.event_type) {
      case 'follow':
        return <><strong>{actorName}</strong> started following you</>;
      case 'upvote':
      case 'like':
        return (
          <>
            <strong>{actorName}</strong> liked your activity on{' '}
            {event.articles && <span className="text-accent-brand">{event.articles.title}</span>}
          </>
        );
      case 'mention':
        return (
          <>
            <strong>{actorName}</strong> mentioned you in a comment
          </>
        );
      case 'comment':
        return (
          <>
            <strong>{actorName}</strong> commented on{' '}
            {event.articles && <span className="text-accent-brand">{event.articles.title}</span>}
          </>
        );
      case 'reply':
        return (
          <>
            <strong>{actorName}</strong> replied to your comment
          </>
        );
      default:
        return <><strong>{actorName}</strong> interacted with your content</>;
    }
  };

  if (!user) {
    return (
      <div className="bg-bg-secondary rounded-2xl p-6">
        <p className="text-center text-text-secondary">
          Sign in to see your activity feed
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-text-primary">Activity</h3>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-border overflow-x-auto">
          <div className="flex gap-2">
            {(['all', 'mentions', 'follows', 'likes', 'comments'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === type
                    ? 'bg-accent-brand text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity list */}
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-accent-brand border-t-transparent rounded-full" />
          </div>
        ) : activities.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-text-secondary text-sm">No activity yet</p>
            <p className="text-text-tertiary text-xs mt-1">
              When people interact with your content, you'll see it here
            </p>
          </div>
        ) : (
          activities.map((event) => (
            <div key={event.id} className="px-6 py-4 hover:bg-bg-tertiary/50 transition-colors">
              <div className="flex items-start gap-3">
                {/* Actor avatar */}
                <div className="w-10 h-10 rounded-full bg-accent-brand/10 flex items-center justify-center flex-shrink-0">
                  {event.actor?.avatar_url ? (
                    <img
                      src={event.actor.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg">{getEventIcon(event.event_type)}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary leading-snug">
                    {getEventText(event)}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {formatTime(event.created_at)}
                  </p>
                </div>

                {/* Event type icon */}
                <span className="text-lg opacity-50">{getEventIcon(event.event_type)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {activities.length >= limit && (
        <div className="px-6 py-4 border-t border-border">
          <button className="w-full py-2 text-sm text-accent-brand hover:text-accent-brand/80 transition-colors">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

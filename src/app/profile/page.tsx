'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth';
import { MainLayout } from '@/components/layout';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  location: string;
  website: string;
  created_at: string;
}

interface UserStats {
  followers: number;
  following: number;
  votes: number;
  comments: number;
  shares: number;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeTab, setActiveTab] = useState<'votes' | 'comments' | 'shares'>('votes');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '', location: '', website: '' });

  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setProfile(data);
      setEditForm({
        display_name: data.display_name || '',
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || '',
      });
    }
  };

  const loadStats = async () => {
    if (!user) return;

    const [followersRes, followingRes, votesRes, commentsRes] = await Promise.all([
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('user_articles').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('vote', 0),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    setStats({
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
      votes: votesRes.count || 0,
      comments: commentsRes.count || 0,
      shares: 0,
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    await supabase.from('user_profiles').upsert({
      user_id: user.id,
      ...editForm,
      updated_at: new Date().toISOString(),
    });

    setIsEditing(false);
    loadProfile();
  };

  if (authLoading) {
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
          <h1 className="text-2xl font-bold text-text-primary mb-4">Sign in to view your profile</h1>
          <p className="text-text-secondary">Create an account to track your activity and preferences.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="bg-bg-secondary rounded-2xl p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-accent-brand flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.email?.substring(0, 2).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    placeholder="Display name"
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-brand outline-none"
                  />
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Bio (160 chars)"
                    maxLength={160}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-brand outline-none resize-none h-20"
                  />
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Location"
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-brand outline-none"
                  />
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="Website URL"
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-brand outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 rounded-lg bg-accent-brand text-white font-medium hover:bg-accent-brand/90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-text-primary">
                      {profile?.display_name || user.email?.split('@')[0]}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-lg bg-bg-tertiary text-sm font-medium hover:bg-bg-tertiary/80"
                    >
                      Edit Profile
                    </button>
                  </div>
                  {profile?.username && (
                    <p className="text-text-secondary">@{profile.username}</p>
                  )}
                  {profile?.bio && (
                    <p className="text-text-primary mt-2">{profile.bio}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary">
                    {profile?.location && (
                      <span className="flex items-center gap-1">📍 {profile.location}</span>
                    )}
                    {profile?.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent-brand hover:underline">
                        🔗 Website
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex gap-6 mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{stats.followers}</p>
                <p className="text-sm text-text-secondary">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{stats.following}</p>
                <p className="text-sm text-text-secondary">Following</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{stats.votes}</p>
                <p className="text-sm text-text-secondary">Votes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{stats.comments}</p>
                <p className="text-sm text-text-secondary">Comments</p>
              </div>
            </div>
          )}
        </div>

        {/* Activity Tabs */}
        <div>
          <div className="flex gap-2 mb-6">
            {(['votes', 'comments', 'shares'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                  ${activeTab === tab
                    ? 'bg-accent-brand text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-bg-secondary rounded-2xl p-6">
            <p className="text-text-secondary text-center py-8">
              Your {activeTab} will appear here
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

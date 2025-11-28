'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth';
import { MainLayout } from '@/components/layout';

interface Stats {
  totalInteractions: number;
  upvotes: number;
  downvotes: number;
  savedCount: number;
  readCount: number;
  totalTimeSpentMinutes: number;
}

interface Preferences {
  platformScores: Record<string, number>;
  categoryScores: Record<string, number>;
  recencyWeight: number;
  viralityWeight: number;
  explorationEnabled: boolean;
  explorationPercentage: number;
}

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'stats' | 'algorithm' | 'account'>('stats');

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const res = await fetch('/api/preferences/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;
    setIsSaving(true);

    try {
      await fetch('/api/preferences/stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recencyWeight: preferences.recencyWeight,
          viralityWeight: preferences.viralityWeight,
          explorationEnabled: preferences.explorationEnabled,
          explorationPercentage: preferences.explorationPercentage,
        }),
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPreferences = async () => {
    if (!confirm('Are you sure? This will reset all your learned preferences and cannot be undone.')) {
      return;
    }

    try {
      await fetch('/api/preferences/stats', { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  if (authLoading || isLoading) {
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
          <h1 className="text-2xl font-bold text-text-primary mb-4">Sign in to view settings</h1>
          <p className="text-text-secondary">Create an account to customize your experience.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Settings</h1>

        {/* Navigation */}
        <div className="flex gap-2 mb-8">
          {(['stats', 'algorithm', 'account'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                ${activeSection === section
                  ? 'bg-accent-brand text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                }`}
            >
              {section === 'stats' ? '📊 Your Stats' : section === 'algorithm' ? '🧠 Algorithm' : '👤 Account'}
            </button>
          ))}
        </div>

        {/* Stats Section */}
        {activeSection === 'stats' && stats && (
          <div className="space-y-6">
            <div className="bg-bg-secondary rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-6">Your Activity</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-bold text-accent-brand">{stats.totalInteractions}</p>
                  <p className="text-sm text-text-secondary">Total Interactions</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-accent-positive">{stats.upvotes}</p>
                  <p className="text-sm text-text-secondary">Upvotes</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-accent-negative">{stats.downvotes}</p>
                  <p className="text-sm text-text-secondary">Downvotes</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-text-primary">{stats.savedCount}</p>
                  <p className="text-sm text-text-secondary">Saved</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-text-primary">{stats.readCount}</p>
                  <p className="text-sm text-text-secondary">Read</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-text-primary">{stats.totalTimeSpentMinutes}</p>
                  <p className="text-sm text-text-secondary">Minutes Read</p>
                </div>
              </div>
            </div>

            {/* Platform Preferences */}
            {preferences && Object.keys(preferences.platformScores).length > 0 && (
              <div className="bg-bg-secondary rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-6">Platform Preferences</h2>
                <div className="space-y-4">
                  {Object.entries(preferences.platformScores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([platform, score]) => (
                      <div key={platform} className="flex items-center gap-4">
                        <span className="w-24 text-sm text-text-secondary capitalize">{platform}</span>
                        <div className="flex-1 h-3 bg-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              score >= 0 ? 'bg-accent-positive' : 'bg-accent-negative'
                            }`}
                            style={{
                              width: `${Math.abs(score) * 50 + 50}%`,
                              marginLeft: score < 0 ? `${50 - Math.abs(score) * 50}%` : '50%',
                            }}
                          />
                        </div>
                        <span className="w-12 text-sm text-text-secondary text-right">
                          {score > 0 ? '+' : ''}{(score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Category Preferences */}
            {preferences && Object.keys(preferences.categoryScores).length > 0 && (
              <div className="bg-bg-secondary rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-6">Topic Preferences</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preferences.categoryScores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, score]) => (
                      <span
                        key={category}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          score >= 0
                            ? 'bg-accent-positive/20 text-accent-positive'
                            : 'bg-accent-negative/20 text-accent-negative'
                        }`}
                      >
                        {category} {score > 0 ? '+' : ''}{(score * 100).toFixed(0)}%
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Algorithm Section */}
        {activeSection === 'algorithm' && preferences && (
          <div className="space-y-6">
            <div className="bg-bg-secondary rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">Algorithm Controls</h2>
              <p className="text-sm text-text-secondary mb-6">Customize how Flare personalizes your feed</p>

              {/* Exploration Toggle */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">Discovery Mode</p>
                    <p className="text-sm text-text-secondary">Mix in random content to prevent filter bubbles</p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, explorationEnabled: !preferences.explorationEnabled })}
                    className={`w-12 h-7 rounded-full transition-colors relative ${
                      preferences.explorationEnabled ? 'bg-accent-brand' : 'bg-bg-tertiary'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        preferences.explorationEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Exploration Percentage */}
                {preferences.explorationEnabled && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-text-secondary">Discovery Percentage</p>
                      <span className="text-sm font-medium text-text-primary">{preferences.explorationPercentage}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={preferences.explorationPercentage}
                      onChange={(e) => setPreferences({ ...preferences, explorationPercentage: parseInt(e.target.value) })}
                      className="w-full accent-accent-brand"
                    />
                    <div className="flex justify-between text-xs text-text-secondary mt-1">
                      <span>More personalized</span>
                      <span>More diverse</span>
                    </div>
                  </div>
                )}

                {/* Recency Weight */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-text-secondary">Recency Preference</p>
                    <span className="text-sm font-medium text-text-primary">{(preferences.recencyWeight * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={preferences.recencyWeight * 100}
                    onChange={(e) => setPreferences({ ...preferences, recencyWeight: parseInt(e.target.value) / 100 })}
                    className="w-full accent-accent-brand"
                  />
                  <div className="flex justify-between text-xs text-text-secondary mt-1">
                    <span>Timeless content</span>
                    <span>Breaking news</span>
                  </div>
                </div>

                {/* Virality Weight */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-text-secondary">Virality Preference</p>
                    <span className="text-sm font-medium text-text-primary">{(preferences.viralityWeight * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={preferences.viralityWeight * 100}
                    onChange={(e) => setPreferences({ ...preferences, viralityWeight: parseInt(e.target.value) / 100 })}
                    className="w-full accent-accent-brand"
                  />
                  <div className="flex justify-between text-xs text-text-secondary mt-1">
                    <span>Hidden gems</span>
                    <span>Viral content</span>
                  </div>
                </div>

                <button
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl bg-accent-brand text-white font-medium hover:bg-accent-brand/90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>

            {/* Reset */}
            <div className="bg-bg-secondary rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">Reset Algorithm</h2>
              <p className="text-sm text-text-secondary mb-4">
                Clear all learned preferences and start fresh. This cannot be undone.
              </p>
              <button
                onClick={handleResetPreferences}
                className="px-4 py-2 rounded-lg bg-accent-negative/10 text-accent-negative font-medium hover:bg-accent-negative/20"
              >
                Reset All Preferences
              </button>
            </div>
          </div>
        )}

        {/* Account Section */}
        {activeSection === 'account' && (
          <div className="space-y-6">
            <div className="bg-bg-secondary rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-6">Account Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-text-secondary">Email</p>
                  <p className="text-text-primary">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">User ID</p>
                  <p className="text-text-primary font-mono text-sm">{user.id}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Signed in via</p>
                  <p className="text-text-primary capitalize">{user.app_metadata?.provider || 'Email'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

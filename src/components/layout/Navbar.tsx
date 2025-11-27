'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth, LoginModal, UserMenu } from '@/components/auth';
import { FireIcon, SparklesIcon, ZapIcon, SettingsIcon } from '@/components/icons/PlatformIcons';

const navItems = [
  { label: 'Trending', href: '/', Icon: FireIcon },
  { label: 'Discover', href: '/discover', Icon: SparklesIcon },
  { label: 'Activity', href: '/activity', Icon: ZapIcon },
];

export function Navbar() {
  const [activeTab, setActiveTab] = useState('Trending');
  const [showLogin, setShowLogin] = useState(false);
  const { user, isLoading } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo with gradient */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <span
                  className="text-2xl font-black tracking-tight bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% 200%', animation: 'gradient-shift 3s ease infinite' }}
                >
                  Flare
                </span>
                {/* Subtle glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10" />
              </div>
            </Link>

            {/* Center Navigation - Desktop - Pill style */}
            <nav className="hidden md:flex items-center p-1 rounded-full bg-bg-secondary/50">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setActiveTab(item.label)}
                  className={`
                    relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium
                    transition-all duration-300 ease-out
                    ${activeTab === item.label
                      ? 'text-white'
                      : 'text-text-secondary hover:text-text-primary'
                    }
                  `}
                >
                  {/* Active indicator background */}
                  {activeTab === item.label && (
                    <div
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 -z-10"
                      style={{
                        boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)',
                      }}
                    />
                  )}
                  <span className={`transition-transform duration-300 ${activeTab === item.label ? 'scale-110' : ''}`}>
                    <item.Icon size={18} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Right Side - User Actions */}
            <div className="flex items-center gap-2">
              {/* Settings - Desktop */}
              <Link
                href="/settings"
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>

              {/* Auth State */}
              {isLoading ? (
                <div className="w-10 h-10 rounded-full bg-bg-secondary animate-pulse" />
              ) : user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="
                    flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold
                    bg-gradient-to-r from-orange-500 to-pink-500 text-white
                    hover:shadow-lg hover:shadow-orange-500/25
                    transition-all duration-300 ease-out
                    hover:scale-105 active:scale-95
                  "
                >
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - Floating pill style */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <div className="glass rounded-2xl p-2 shadow-2xl">
          <div className="flex justify-around">
            {[...navItems, { label: 'Settings', href: '/settings', Icon: SettingsIcon }].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setActiveTab(item.label)}
                className={`
                  flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300
                  ${activeTab === item.label
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white scale-105'
                    : 'text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                <span className={`transition-transform duration-300 ${activeTab === item.label ? 'scale-110' : ''}`}>
                  <item.Icon size={20} />
                </span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}

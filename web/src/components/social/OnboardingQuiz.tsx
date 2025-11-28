'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth';
import {
  PlatformIcon,
  CategoryIcon,
  TechIcon,
  RocketIcon,
  ScienceIcon,
  GamingIcon,
  ChartIcon,
  AIIcon,
  CryptoIcon,
  ZapIcon,
  BookIcon,
  CommentIcon,
  FireIcon,
  ClockIcon,
  NewsIcon,
  DiamondIcon,
  MovieIcon,
} from '@/components/icons/PlatformIcons';
import type { Platform } from '@/lib/types';

interface OnboardingQuizProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface QuizOption {
  id: string;
  label: string;
  value: string;
  iconType: 'platform' | 'category' | 'custom';
  iconKey?: Platform | string;
  color?: string;
}

interface QuizStep {
  id: string;
  question: string;
  description: string;
  options: QuizOption[];
  multiSelect?: boolean;
}

// Helper component to render the right icon
function OptionIcon({ option }: { option: QuizOption }) {
  if (option.iconType === 'platform' && option.iconKey) {
    return <PlatformIcon platform={option.iconKey as Platform} size={24} />;
  }

  // Map custom icon keys to components
  const iconMap: Record<string, React.ReactNode> = {
    tech: <TechIcon size={24} />,
    startups: <RocketIcon size={24} />,
    science: <ScienceIcon size={24} />,
    gaming: <GamingIcon size={24} />,
    finance: <ChartIcon size={24} />,
    design: <MovieIcon size={24} />,
    ai: <AIIcon size={24} />,
    crypto: <CryptoIcon size={24} />,
    breaking: <ZapIcon size={24} />,
    analysis: <ChartIcon size={24} />,
    tutorials: <BookIcon size={24} />,
    discussions: <CommentIcon size={24} />,
    realtime: <FireIcon size={24} />,
    hourly: <ClockIcon size={24} />,
    daily: <NewsIcon size={24} />,
    timeless: <DiamondIcon size={24} />,
  };

  return iconMap[option.iconKey || ''] || <NewsIcon size={24} />;
}

const quizSteps: QuizStep[] = [
  {
    id: 'platforms',
    question: 'Which platforms interest you?',
    description: 'Select all that apply - we\'ll prioritize content from these sources',
    options: [
      { id: 'reddit', label: 'Reddit', iconType: 'platform', iconKey: 'reddit', value: 'reddit' },
      { id: 'hackernews', label: 'Hacker News', iconType: 'platform', iconKey: 'hackernews', value: 'hackernews' },
      { id: 'twitter', label: 'Twitter/X', iconType: 'platform', iconKey: 'twitter', value: 'twitter' },
      { id: 'bluesky', label: 'Bluesky', iconType: 'platform', iconKey: 'bluesky', value: 'bluesky' },
      { id: 'youtube', label: 'YouTube', iconType: 'platform', iconKey: 'youtube', value: 'youtube' },
      { id: 'substack', label: 'Substack', iconType: 'platform', iconKey: 'substack', value: 'substack' },
      { id: 'medium', label: 'Medium', iconType: 'platform', iconKey: 'medium', value: 'medium' },
      { id: 'tiktok', label: 'TikTok', iconType: 'platform', iconKey: 'tiktok', value: 'tiktok' },
    ],
    multiSelect: true,
  },
  {
    id: 'topics',
    question: 'What topics are you into?',
    description: 'Pick your favorites - you can always adjust these later',
    options: [
      { id: 'tech', label: 'Technology', iconType: 'custom', iconKey: 'tech', value: 'technology' },
      { id: 'startups', label: 'Startups', iconType: 'custom', iconKey: 'startups', value: 'startups' },
      { id: 'science', label: 'Science', iconType: 'custom', iconKey: 'science', value: 'science' },
      { id: 'gaming', label: 'Gaming', iconType: 'custom', iconKey: 'gaming', value: 'gaming' },
      { id: 'finance', label: 'Finance', iconType: 'custom', iconKey: 'finance', value: 'finance' },
      { id: 'design', label: 'Design', iconType: 'custom', iconKey: 'design', value: 'design' },
      { id: 'ai', label: 'AI & ML', iconType: 'custom', iconKey: 'ai', value: 'ai' },
      { id: 'crypto', label: 'Crypto & Web3', iconType: 'custom', iconKey: 'crypto', value: 'crypto' },
    ],
    multiSelect: true,
  },
  {
    id: 'content_type',
    question: 'What kind of content do you prefer?',
    description: 'This helps us tune the algorithm to your taste',
    options: [
      { id: 'breaking', label: 'Breaking News', iconType: 'custom', iconKey: 'breaking', value: 'breaking' },
      { id: 'analysis', label: 'Deep Analysis', iconType: 'custom', iconKey: 'analysis', value: 'analysis' },
      { id: 'tutorials', label: 'Tutorials & How-tos', iconType: 'custom', iconKey: 'tutorials', value: 'tutorials' },
      { id: 'discussions', label: 'Discussions', iconType: 'custom', iconKey: 'discussions', value: 'discussions' },
    ],
    multiSelect: true,
  },
  {
    id: 'frequency',
    question: 'How often do you want fresh content?',
    description: 'Balance between breaking news and evergreen content',
    options: [
      { id: 'realtime', label: 'Real-time', iconType: 'custom', iconKey: 'realtime', value: 'high' },
      { id: 'hourly', label: 'Hourly digest', iconType: 'custom', iconKey: 'hourly', value: 'medium' },
      { id: 'daily', label: 'Daily highlights', iconType: 'custom', iconKey: 'daily', value: 'low' },
      { id: 'timeless', label: 'Timeless gems', iconType: 'custom', iconKey: 'timeless', value: 'timeless' },
    ],
    multiSelect: false,
  },
];

export function OnboardingQuiz({ isOpen, onClose, onComplete }: OnboardingQuizProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const step = quizSteps[currentStep];
  const stepSelections = selections[step.id] || [];

  const toggleSelection = (value: string) => {
    const current = selections[step.id] || [];
    let updated: string[];

    if (step.multiSelect) {
      updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
    } else {
      updated = [value];
    }

    setSelections({ ...selections, [step.id]: updated });
  };

  const canProceed = stepSelections.length > 0;
  const isLastStep = currentStep === quizSteps.length - 1;

  const handleNext = async () => {
    if (!canProceed) return;

    if (isLastStep) {
      await submitQuiz();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);

    try {
      // Transform selections into preference weights
      const preferences = {
        platforms: selections.platforms || [],
        topics: selections.topics || [],
        contentTypes: selections.content_type || [],
        recencyWeight: getRecencyWeight(selections.frequency?.[0]),
      };

      if (user) {
        await fetch('/api/preferences/stats', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        });
      } else {
        // Store in localStorage for anonymous users
        localStorage.setItem('flare_onboarding_preferences', JSON.stringify(preferences));
      }

      onComplete();
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRecencyWeight = (frequency?: string): number => {
    switch (frequency) {
      case 'high':
        return 0.9;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.3;
      case 'timeless':
        return 0.1;
      default:
        return 0.5;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-bg-secondary">
          <div
            className="h-full bg-accent-brand transition-all duration-300"
            style={{ width: `${((currentStep + 1) / quizSteps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-tertiary">
              Step {currentStep + 1} of {quizSteps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Skip for now
            </button>
          </div>
          <h2 className="text-xl font-bold text-text-primary">{step.question}</h2>
          <p className="text-sm text-text-secondary mt-1">{step.description}</p>
        </div>

        {/* Options */}
        <div className="px-6 pb-6">
          <div className={`grid gap-3 ${step.multiSelect ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {step.options.map((option) => {
              const isSelected = stepSelections.includes(option.value);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleSelection(option.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-accent-brand bg-accent-brand/10'
                      : 'border-border bg-bg-secondary hover:border-border-hover'
                  }`}
                >
                  <span className={isSelected ? 'text-accent-brand' : 'text-text-secondary'}>
                    <OptionIcon option={option} />
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? 'text-accent-brand' : 'text-text-primary'
                    }`}
                  >
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="ml-auto text-accent-brand">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-bg-secondary border-t border-border flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="px-6 py-2 text-sm font-medium bg-accent-brand text-white rounded-lg hover:bg-accent-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </span>
            ) : isLastStep ? (
              'Finish'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

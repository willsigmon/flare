'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

// Reader settings types
export interface ReaderSettings {
  fontFamily: 'system' | 'serif' | 'sans' | 'mono';
  fontSize: number; // 12-32
  lineHeight: number; // 1.0-3.0
  maxWidth: number; // 400-1200
  theme: 'light' | 'dark' | 'sepia' | 'oled' | 'auto';
  backgroundColor?: string;
  textColor?: string;
}

const defaultSettings: ReaderSettings = {
  fontFamily: 'system',
  fontSize: 18,
  lineHeight: 1.6,
  maxWidth: 680,
  theme: 'auto',
};

// Font family CSS values
export const fontFamilies: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", serif',
  sans: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
};

// Theme colors
export const themeColors: Record<string, { bg: string; text: string; secondary: string }> = {
  light: { bg: '#ffffff', text: '#1a1a1a', secondary: '#666666' },
  dark: { bg: '#1a1a1a', text: '#e5e5e5', secondary: '#999999' },
  sepia: { bg: '#f4ecd8', text: '#5c4b37', secondary: '#8b7355' },
  oled: { bg: '#000000', text: '#ffffff', secondary: '#888888' },
  auto: { bg: 'var(--bg-primary)', text: 'var(--text-primary)', secondary: 'var(--text-secondary)' },
};

// Context
interface ReaderSettingsContextType {
  settings: ReaderSettings;
  updateSettings: (updates: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const ReaderSettingsContext = createContext<ReaderSettingsContextType | undefined>(undefined);

// Storage key
const SETTINGS_KEY = 'flare_reader_settings';

export function ReaderSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);

      // Try localStorage first
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
          setSettings({ ...defaultSettings, ...JSON.parse(stored) });
        }
      } catch {
        // Ignore localStorage errors
      }

      // If logged in, fetch from server
      if (user) {
        try {
          const res = await fetch('/api/preferences/reader-settings');
          if (res.ok) {
            const data = await res.json();
            if (data.settings) {
              setSettings({ ...defaultSettings, ...data.settings });
            }
          }
        } catch (error) {
          console.error('Error loading reader settings:', error);
        }
      }

      setIsLoading(false);
    }

    loadSettings();
  }, [user]);

  const updateSettings = async (updates: Partial<ReaderSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    // Save to localStorage
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {
      // Ignore localStorage errors
    }

    // Save to server if logged in
    if (user) {
      try {
        await fetch('/api/preferences/reader-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: newSettings }),
        });
      } catch (error) {
        console.error('Error saving reader settings:', error);
      }
    }
  };

  const resetSettings = () => {
    updateSettings(defaultSettings);
  };

  return (
    <ReaderSettingsContext.Provider value={{ settings, updateSettings, resetSettings, isLoading }}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettings() {
  const context = useContext(ReaderSettingsContext);
  if (!context) {
    throw new Error('useReaderSettings must be used within ReaderSettingsProvider');
  }
  return context;
}

// Settings Panel Component
interface ReaderSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReaderSettingsPanel({ isOpen, onClose }: ReaderSettingsPanelProps) {
  const { settings, updateSettings, resetSettings } = useReaderSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-80 h-full bg-bg-primary border-l border-border overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-bg-primary z-10">
          <h2 className="text-lg font-semibold text-text-primary">Reading Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Font</label>
            <div className="grid grid-cols-2 gap-2">
              {(['system', 'serif', 'sans', 'mono'] as const).map((font) => (
                <button
                  key={font}
                  onClick={() => updateSettings({ fontFamily: font })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    settings.fontFamily === font
                      ? 'bg-accent-brand text-white'
                      : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                  }`}
                  style={{ fontFamily: fontFamilies[font] }}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="32"
              step="1"
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
              className="w-full accent-accent-brand"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>12px</span>
              <span>32px</span>
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Line Height: {settings.lineHeight.toFixed(1)}
            </label>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => updateSettings({ lineHeight: parseFloat(e.target.value) })}
              className="w-full accent-accent-brand"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Tight</span>
              <span>Spacious</span>
            </div>
          </div>

          {/* Max Width */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Width: {settings.maxWidth}px
            </label>
            <input
              type="range"
              min="400"
              max="1200"
              step="20"
              value={settings.maxWidth}
              onChange={(e) => updateSettings({ maxWidth: parseInt(e.target.value) })}
              className="w-full accent-accent-brand"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Narrow</span>
              <span>Wide</span>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Theme</label>
            <div className="grid grid-cols-5 gap-2">
              {(['auto', 'light', 'dark', 'sepia', 'oled'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    settings.theme === theme
                      ? 'border-accent-brand'
                      : 'border-transparent hover:border-border'
                  }`}
                  style={{
                    backgroundColor: theme === 'auto' ? 'var(--bg-secondary)' : themeColors[theme].bg,
                  }}
                  title={theme.charAt(0).toUpperCase() + theme.slice(1)}
                >
                  <div
                    className="w-full h-4 rounded"
                    style={{
                      backgroundColor: theme === 'auto' ? 'var(--text-primary)' : themeColors[theme].text,
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-xs text-text-muted mt-2 capitalize">
              {settings.theme}
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetSettings}
            className="w-full py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default ReaderSettingsPanel;

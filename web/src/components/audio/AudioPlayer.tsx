'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioPlayerProps {
  src: string;
  title: string;
  artist?: string;
  artwork?: string;
  onClose?: () => void;
}

export function AudioPlayer({ src, title, artist, artwork, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimerId, setSleepTimerId] = useState<NodeJS.Timeout | null>(null);

  // Format time as mm:ss or hh:mm:ss
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play/Pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Skip forward/back
  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  }, [duration]);

  // Seek
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * duration;
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Playback rate
  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Sleep timer
  const setSleep = (minutes: number | null) => {
    if (sleepTimerId) {
      clearTimeout(sleepTimerId);
      setSleepTimerId(null);
    }

    if (minutes === null) {
      setSleepTimer(null);
      return;
    }

    setSleepTimer(minutes);
    const id = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setSleepTimer(null);
      setSleepTimerId(null);
    }, minutes * 60 * 1000);
    setSleepTimerId(id);
  };

  // Event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          skip(-15);
          break;
        case 'ArrowRight':
          skip(15);
          break;
        case 'm':
          setIsMiniPlayer(!isMiniPlayer);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, isMiniPlayer]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Mini player
  if (isMiniPlayer) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-bg-primary border border-border rounded-xl shadow-2xl p-3 w-80">
        <audio ref={audioRef} src={src} preload="metadata" />

        <div className="flex items-center gap-3">
          {/* Artwork */}
          {artwork && (
            <img src={artwork} alt="" className="w-12 h-12 rounded-lg object-cover" />
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">{title}</div>
            {artist && <div className="text-xs text-text-secondary truncate">{artist}</div>}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button onClick={togglePlay} className="p-2 rounded-full hover:bg-bg-secondary">
              {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsMiniPlayer(false)} className="p-2 rounded-full hover:bg-bg-secondary">
              <ExpandIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div
          ref={progressRef}
          className="mt-2 h-1 bg-bg-tertiary rounded-full cursor-pointer"
          onClick={handleProgressClick}
        >
          <div className="h-full bg-accent-brand rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  // Full player
  return (
    <div className="bg-bg-primary rounded-xl p-6">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {artwork && (
            <img src={artwork} alt="" className="w-20 h-20 rounded-xl object-cover shadow-lg" />
          )}
          <div>
            <h3 className="text-lg font-bold text-text-primary">{title}</h3>
            {artist && <p className="text-text-secondary">{artist}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMiniPlayer(true)}
            className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary"
            title="Mini player"
          >
            <MinimizeIcon className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div
          ref={progressRef}
          className="h-2 bg-bg-tertiary rounded-full cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-accent-brand rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-accent-brand rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => skip(-15)}
          className="p-3 rounded-full hover:bg-bg-secondary text-text-secondary"
          title="Back 15s"
        >
          <Skip15BackIcon className="w-6 h-6" />
        </button>
        <button
          onClick={togglePlay}
          className="p-4 rounded-full bg-accent-brand text-white hover:bg-accent-brand/90 shadow-lg"
        >
          {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
        </button>
        <button
          onClick={() => skip(15)}
          className="p-3 rounded-full hover:bg-bg-secondary text-text-secondary"
          title="Forward 15s"
        >
          <Skip15ForwardIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Secondary controls */}
      <div className="flex items-center justify-between">
        {/* Volume */}
        <div className="flex items-center gap-2">
          <VolumeIcon className="w-5 h-5 text-text-secondary" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 accent-accent-brand"
          />
        </div>

        {/* Playback speed */}
        <button
          onClick={cyclePlaybackRate}
          className="px-3 py-1 rounded-full bg-bg-secondary text-text-secondary text-sm font-medium hover:bg-bg-tertiary"
        >
          {playbackRate}x
        </button>

        {/* Sleep timer */}
        <div className="relative group">
          <button className="p-2 rounded-full hover:bg-bg-secondary text-text-secondary">
            <TimerIcon className="w-5 h-5" />
            {sleepTimer && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-brand text-white text-[10px] rounded-full flex items-center justify-center">
                {sleepTimer}
              </span>
            )}
          </button>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="bg-bg-secondary border border-border rounded-lg shadow-xl p-2 space-y-1">
              {[null, 5, 15, 30, 60].map((mins) => (
                <button
                  key={mins ?? 'off'}
                  onClick={() => setSleep(mins)}
                  className={`block w-full px-3 py-1 text-sm rounded hover:bg-bg-tertiary text-left ${
                    sleepTimer === mins ? 'text-accent-brand' : 'text-text-secondary'
                  }`}
                >
                  {mins === null ? 'Off' : `${mins} min`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

function Skip15BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
      <text x="12" y="20" fontSize="6" fill="currentColor" textAnchor="middle">15</text>
    </svg>
  );
}

function Skip15ForwardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.934 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
      <text x="12" y="20" fontSize="6" fill="currentColor" textAnchor="middle">15</text>
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="13" r="8" />
      <path strokeLinecap="round" d="M12 9v4l2 2M9 1h6" />
    </svg>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default AudioPlayer;

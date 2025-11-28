'use client';

export type HeatLevel = 'cold' | 'warm' | 'hot' | 'fire' | 'viral';

interface HeatBadgeProps {
  engagementCount: number;
  hoursOld: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Calculate heat level based on engagement velocity (engagements per hour)
export function calculateHeatLevel(engagementCount: number, hoursOld: number): HeatLevel {
  const velocity = engagementCount / Math.max(hoursOld, 0.5);

  if (velocity >= 1000) return 'viral';
  if (velocity >= 500) return 'fire';
  if (velocity >= 200) return 'hot';
  if (velocity >= 50) return 'warm';
  return 'cold';
}

const heatConfig: Record<HeatLevel, {
  label: string;
  bgClass: string;
  textClass: string;
  icon: string;
  animate?: boolean;
}> = {
  cold: {
    label: 'Cold',
    bgClass: 'bg-slate-500/20',
    textClass: 'text-slate-400',
    icon: '❄️',
  },
  warm: {
    label: 'Warm',
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-500',
    icon: '☀️',
  },
  hot: {
    label: 'Hot',
    bgClass: 'bg-orange-500/20',
    textClass: 'text-orange-500',
    icon: '🔥',
  },
  fire: {
    label: 'On Fire',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-500',
    icon: '🔥',
    animate: true,
  },
  viral: {
    label: 'Viral',
    bgClass: 'bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20',
    textClass: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400',
    icon: '🚀',
    animate: true,
  },
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

export function HeatBadge({
  engagementCount,
  hoursOld,
  size = 'sm',
  showLabel = true,
  className = '',
}: HeatBadgeProps) {
  const heatLevel = calculateHeatLevel(engagementCount, hoursOld);
  const config = heatConfig[heatLevel];

  // Don't show badge for cold content
  if (heatLevel === 'cold') {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold
        ${config.bgClass}
        ${sizeClasses[size]}
        ${config.animate ? 'animate-heat-pulse' : ''}
        ${className}
      `}
    >
      <span className={config.animate ? 'animate-bounce' : ''}>
        {config.icon}
      </span>
      {showLabel && (
        <span className={config.textClass}>
          {config.label}
        </span>
      )}
    </span>
  );
}

// Utility to get hours old from a Date
export function getHoursOld(timestamp: Date | string): number {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = now.getTime() - then.getTime();
  return diff / (1000 * 60 * 60);
}

// Standalone hook for heat level
export function useHeatLevel(engagementCount: number, timestamp: Date | string): HeatLevel {
  const hoursOld = getHoursOld(timestamp);
  return calculateHeatLevel(engagementCount, hoursOld);
}

export default HeatBadge;

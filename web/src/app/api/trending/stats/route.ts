import { NextResponse } from 'next/server';
import { fetchUnifiedFeed } from '@/lib/trending';

// Cache stats for 5 minutes to prevent rapid fluctuations
export const revalidate = 300;

export interface FeedStats {
  stories: number;
  hot: number;
  sources: number;
}

// Get live stats from the feed
export async function GET() {
  try {
    const items = await fetchUnifiedFeed();

    // Count unique platforms (sources)
    const platforms = new Set(items.map(item => item.platform));

    // Count "hot" items (high engagement in the last 6 hours)
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const hotItems = items.filter(item => {
      const isRecent = new Date(item.timestamp).getTime() > sixHoursAgo;
      const isHighEngagement = (item.engagementCount || 0) > 10000;
      return isRecent && isHighEngagement;
    });

    const stats: FeedStats = {
      stories: items.length,
      hot: Math.min(hotItems.length, 20), // Cap at 20 for display
      sources: platforms.size,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching feed stats:', error);
    return NextResponse.json({
      stories: 0,
      hot: 0,
      sources: 0,
    });
  }
}

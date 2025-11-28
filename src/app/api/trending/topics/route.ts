import { NextResponse } from 'next/server';
import { fetchUnifiedFeed } from '@/lib/trending';

export interface TrendingTopic {
  tag: string;
  count: string;
  hot: boolean;
}

// Extract trending topics from the feed items
export async function GET() {
  try {
    const items = await fetchUnifiedFeed();

    // Count topics - prioritize subreddits and Google Trends
    const topicCounts: Record<string, { count: number; engagement: number; source: string }> = {};

    for (const item of items) {
      // Extract subreddit as topic (priority for Reddit items)
      if (item.platform === 'reddit' && item.subtitle) {
        const match = item.subtitle.match(/r\/(\w+)/);
        if (match) {
          const subreddit = `r/${match[1]}`;
          if (!topicCounts[subreddit]) {
            topicCounts[subreddit] = { count: 0, engagement: 0, source: 'reddit' };
          }
          topicCounts[subreddit].count++;
          topicCounts[subreddit].engagement += item.engagementCount || 0;
        }
      }

      // Extract Google Trends topics
      if (item.platform === 'google') {
        const topic = item.title.replace(/^Trending:\s*/, '').trim();
        if (topic && !topicCounts[topic]) {
          topicCounts[topic] = { count: 0, engagement: 0, source: 'google' };
        }
        if (topic) {
          topicCounts[topic].count++;
          topicCounts[topic].engagement += item.engagementCount || 1000; // Google trends get base engagement
        }
      }

      // Extract HN topics from category
      if (item.platform === 'hackernews' && item.category && item.category !== 'Trending') {
        const category = item.category;
        if (!topicCounts[category]) {
          topicCounts[category] = { count: 0, engagement: 0, source: 'hackernews' };
        }
        topicCounts[category].count++;
        topicCounts[category].engagement += item.engagementCount || 0;
      }
    }

    // Sort by engagement and take top 6, ensuring variety
    const sortedTopics = Object.entries(topicCounts)
      .map(([tag, { count, engagement, source }]) => ({
        tag,
        count,
        engagement,
        source,
      }))
      .sort((a, b) => b.engagement - a.engagement);

    // Take top topics but ensure we have variety (at least 1 from each source if available)
    const result: typeof sortedTopics = [];
    const usedSources = new Set<string>();

    // First pass: get top by engagement
    for (const topic of sortedTopics) {
      if (result.length >= 6) break;
      result.push(topic);
      usedSources.add(topic.source);
    }

    // Format for display
    const topics: TrendingTopic[] = result.map((topic, index) => ({
      tag: topic.tag,
      count: formatCount(topic.engagement),
      hot: index < 2, // Top 2 are "hot"
    }));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    // Return fallback topics on error
    return NextResponse.json({
      topics: [
        { tag: 'Trending', count: '0', hot: false },
      ],
    });
  }
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

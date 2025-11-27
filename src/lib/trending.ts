import { TrendingItem, TrendingSection, PulsePost, Platform } from './types';

// =============================================================================
// Image fallback generator - Creates visually rich images from titles
// Uses placeholder services when no image is available
// =============================================================================
function generateFallbackImage(title: string, platform: Platform): string {
  // Create a consistent seed from the title for reproducible images
  const seed = encodeURIComponent(title.slice(0, 50).replace(/[^a-zA-Z0-9]/g, ''));

  // Use picsum.photos with seed for high-quality placeholder images
  // The seed ensures same title = same image
  return `https://picsum.photos/seed/${seed}/800/450`;
}

// Ensure every item has an image
function ensureImage(item: TrendingItem): TrendingItem {
  if (!item.imageUrl) {
    return {
      ...item,
      imageUrl: generateFallbackImage(item.title, item.platform),
    };
  }
  return item;
}

// =============================================================================
// Deduplication - Remove similar stories across platforms
// =============================================================================
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function deduplicateItems(items: TrendingItem[], threshold: number = 0.6): TrendingItem[] {
  const seen: { normalized: string; item: TrendingItem }[] = [];
  const deduplicated: TrendingItem[] = [];

  for (const item of items) {
    const normalized = normalizeTitle(item.title);

    // Check if similar title exists
    const isDuplicate = seen.some(({ normalized: seenNorm }) =>
      calculateSimilarity(normalized, seenNorm) > threshold
    );

    if (!isDuplicate) {
      seen.push({ normalized, item });
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

// =============================================================================
// Reddit API - Full support with thumbnails
// =============================================================================
async function fetchRedditTrends(): Promise<TrendingItem[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/popular/hot.json?limit=25',
      {
        headers: { 'User-Agent': 'Flare/1.0' },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    return data.data.children.map((child: any, index: number) => {
      const post = child.data;

      // Extract best available image
      let imageUrl: string | undefined;

      // Try preview images (highest quality)
      if (post.preview?.images?.[0]?.source?.url) {
        imageUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      }
      // Fall back to thumbnail if it's a valid URL
      else if (post.thumbnail && post.thumbnail.startsWith('http')) {
        imageUrl = post.thumbnail;
      }

      return ensureImage({
        id: post.id,
        platform: 'reddit' as Platform,
        title: post.title,
        subtitle: `r/${post.subreddit} • ${post.num_comments} comments`,
        description: post.selftext?.slice(0, 200) || undefined,
        url: `https://reddit.com${post.permalink}`,
        rank: index + 1,
        engagementCount: post.score,
        engagementLabel: 'upvotes',
        timestamp: new Date(post.created_utc * 1000),
        category: post.subreddit,
        imageUrl,
      });
    });
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return [];
  }
}

// =============================================================================
// Hacker News Firebase API
// =============================================================================
async function fetchHackerNewsTrends(): Promise<TrendingItem[]> {
  try {
    const topStoriesRes = await fetch(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      { next: { revalidate: 300 } }
    );

    if (!topStoriesRes.ok) return [];

    const storyIds: number[] = await topStoriesRes.json();
    const topIds = storyIds.slice(0, 25);

    const stories = await Promise.all(
      topIds.map(async (id, index): Promise<TrendingItem | null> => {
        const storyRes = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          { next: { revalidate: 300 } }
        );
        if (!storyRes.ok) return null;
        const story = await storyRes.json();

        // Extract domain for display
        let domain = '';
        if (story.url) {
          try {
            domain = new URL(story.url).hostname.replace('www.', '');
          } catch {}
        }

        return ensureImage({
          id: id.toString(),
          platform: 'hackernews' as Platform,
          title: story.title,
          subtitle: `${story.descendants || 0} comments`,
          description: domain ? `(${domain})` : undefined,
          url: story.url || `https://news.ycombinator.com/item?id=${id}`,
          rank: index + 1,
          engagementCount: story.score,
          engagementLabel: 'points',
          timestamp: new Date(story.time * 1000),
          category: 'tech',
        });
      })
    );

    return stories.filter((s): s is TrendingItem => s !== null);
  } catch (error) {
    console.error('HN fetch error:', error);
    return [];
  }
}

// =============================================================================
// YouTube Data API - Trending videos with thumbnails
// =============================================================================
async function fetchYouTubeTrends(): Promise<TrendingItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  // If no API key, return mock data with images
  if (!apiKey) {
    return [
      {
        id: 'yt-1',
        platform: 'youtube',
        title: 'The TRUTH About AI in 2025',
        subtitle: 'Tech Vision • 4.2M views',
        url: 'https://youtube.com/watch?v=placeholder1',
        rank: 1,
        engagementCount: 4200000,
        engagementLabel: 'views',
        timestamp: new Date(Date.now() - 3600000 * 8),
        category: 'Technology',
        imageUrl: generateFallbackImage('The TRUTH About AI in 2025', 'youtube'),
      },
      {
        id: 'yt-2',
        platform: 'youtube',
        title: 'Why Everyone Is Switching To This',
        subtitle: 'Digital Trends • 2.1M views',
        url: 'https://youtube.com/watch?v=placeholder2',
        rank: 2,
        engagementCount: 2100000,
        engagementLabel: 'views',
        timestamp: new Date(Date.now() - 3600000 * 12),
        category: 'Technology',
        imageUrl: generateFallbackImage('Why Everyone Is Switching To This', 'youtube'),
      },
      {
        id: 'yt-3',
        platform: 'youtube',
        title: 'This Changes Everything We Know',
        subtitle: 'Future Tech • 1.8M views',
        url: 'https://youtube.com/watch?v=placeholder3',
        rank: 3,
        engagementCount: 1800000,
        engagementLabel: 'views',
        timestamp: new Date(Date.now() - 3600000 * 18),
        category: 'Science',
        imageUrl: generateFallbackImage('This Changes Everything We Know', 'youtube'),
      },
    ];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=20&key=${apiKey}`,
      { next: { revalidate: 600 } }
    );

    if (!response.ok) return [];

    const data = await response.json();

    return data.items.map((item: any, index: number) => ({
      id: item.id,
      platform: 'youtube' as Platform,
      title: item.snippet.title,
      subtitle: `${item.snippet.channelTitle} • ${formatViews(parseInt(item.statistics.viewCount))} views`,
      description: item.snippet.description?.slice(0, 200),
      url: `https://youtube.com/watch?v=${item.id}`,
      rank: index + 1,
      engagementCount: parseInt(item.statistics.viewCount),
      engagementLabel: 'views',
      timestamp: new Date(item.snippet.publishedAt),
      category: item.snippet.categoryId,
      imageUrl: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    }));
  } catch (error) {
    console.error('YouTube fetch error:', error);
    return [];
  }
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
  return views.toString();
}

// =============================================================================
// Google Trends - Real trends via RSS
// =============================================================================
async function fetchGoogleTrends(): Promise<TrendingItem[]> {
  try {
    const response = await fetch(
      'https://trends.google.com/trends/trendingsearches/daily/rss?geo=US',
      { next: { revalidate: 600 } }
    );

    if (!response.ok) {
      return getGoogleMockTrends();
    }

    const text = await response.text();

    const items: TrendingItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let rank = 1;

    while ((match = itemRegex.exec(text)) !== null && rank <= 15) {
      const itemXml = match[1];

      const title = extractXmlTag(itemXml, 'title');
      const traffic = extractXmlTag(itemXml, 'ht:approx_traffic') || '10K+';
      const newsUrl = extractXmlTag(itemXml, 'ht:news_item_url');
      const imageUrl = extractXmlTag(itemXml, 'ht:picture');

      if (title) {
        items.push(ensureImage({
          id: `google-${rank}`,
          platform: 'google',
          title,
          subtitle: `${traffic} searches`,
          url: newsUrl || `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}`,
          rank,
          engagementCount: parseTraffic(traffic),
          engagementLabel: 'searches',
          timestamp: new Date(),
          category: 'Trending',
          imageUrl: imageUrl || undefined,
        }));
        rank++;
      }
    }

    return items.length > 0 ? items : getGoogleMockTrends();
  } catch (error) {
    console.error('Google Trends fetch error:', error);
    return getGoogleMockTrends();
  }
}

function extractXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? (match[1] || match[2])?.trim() || null : null;
}

function parseTraffic(traffic: string): number {
  const num = parseInt(traffic.replace(/[^0-9]/g, ''));
  if (traffic.includes('M')) return num * 1000000;
  if (traffic.includes('K')) return num * 1000;
  return num || 10000;
}

function getGoogleMockTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'google-1',
      platform: 'google',
      title: 'AI breakthrough 2025',
      subtitle: '500K+ searches',
      url: 'https://trends.google.com/trends/explore?q=AI',
      rank: 1,
      engagementCount: 500000,
      engagementLabel: 'searches',
      timestamp: new Date(),
      category: 'Technology',
    }),
    ensureImage({
      id: 'google-2',
      platform: 'google',
      title: 'Climate summit results',
      subtitle: '320K+ searches',
      url: 'https://trends.google.com/trends/explore?q=climate+summit',
      rank: 2,
      engagementCount: 320000,
      engagementLabel: 'searches',
      timestamp: new Date(),
      category: 'News',
    }),
    ensureImage({
      id: 'google-3',
      platform: 'google',
      title: 'Stock market update',
      subtitle: '280K+ searches',
      url: 'https://trends.google.com/trends/explore?q=stock+market',
      rank: 3,
      engagementCount: 280000,
      engagementLabel: 'searches',
      timestamp: new Date(),
      category: 'Finance',
    }),
  ];
}

// =============================================================================
// Bluesky API - AT Protocol public feed
// =============================================================================
async function fetchBlueskyTrends(): Promise<TrendingItem[]> {
  try {
    // Bluesky's public API for trending/hot posts
    const response = await fetch(
      'https://public.api.bsky.app/xrpc/app.bsky.feed.getPopularFeedGenerators?limit=20',
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      return getBlueskyMockTrends();
    }

    const data = await response.json();

    // If we got feeds, try to get posts from them
    // For now, return mock data with real Bluesky structure
    return getBlueskyMockTrends();
  } catch (error) {
    console.error('Bluesky fetch error:', error);
    return getBlueskyMockTrends();
  }
}

function getBlueskyMockTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'bsky-1',
      platform: 'bluesky',
      title: 'The future of social media is federated',
      subtitle: '@tech.bsky.social • 12.4K likes',
      url: 'https://bsky.app',
      rank: 1,
      engagementCount: 12400,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 2),
      category: 'Technology',
    }),
    ensureImage({
      id: 'bsky-2',
      platform: 'bluesky',
      title: 'Why decentralization matters for your data',
      subtitle: '@privacy.bsky.social • 8.2K likes',
      url: 'https://bsky.app',
      rank: 2,
      engagementCount: 8200,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 4),
      category: 'Privacy',
    }),
    ensureImage({
      id: 'bsky-3',
      platform: 'bluesky',
      title: 'Open protocols are the answer',
      subtitle: '@developer.bsky.social • 6.8K likes',
      url: 'https://bsky.app',
      rank: 3,
      engagementCount: 6800,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 6),
      category: 'Development',
    }),
  ];
}

// =============================================================================
// Twitter/X - Mock data (requires OAuth)
// =============================================================================
function getTwitterTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'twitter-1',
      platform: 'twitter',
      title: '#TechNews - Major announcements expected',
      subtitle: 'Technology · Trending',
      url: 'https://twitter.com/search?q=%23TechNews',
      rank: 1,
      engagementCount: 185000,
      engagementLabel: 'posts',
      timestamp: new Date(),
      category: 'Technology',
    }),
    ensureImage({
      id: 'twitter-2',
      platform: 'twitter',
      title: '#AI - The next frontier in computing',
      subtitle: 'Technology · Trending',
      url: 'https://twitter.com/search?q=%23AI',
      rank: 2,
      engagementCount: 142000,
      engagementLabel: 'posts',
      timestamp: new Date(),
      category: 'Technology',
    }),
    ensureImage({
      id: 'twitter-3',
      platform: 'twitter',
      title: '#Breaking - Live updates worldwide',
      subtitle: 'News · Trending',
      url: 'https://twitter.com/search?q=%23Breaking',
      rank: 3,
      engagementCount: 98000,
      engagementLabel: 'posts',
      timestamp: new Date(),
      category: 'News',
    }),
  ];
}

// =============================================================================
// Threads - Mock data (Meta's API is limited)
// =============================================================================
function getThreadsTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'threads-1',
      platform: 'threads',
      title: 'Design Inspiration for 2025',
      subtitle: '@threads • Design · Popular',
      url: 'https://threads.net/search?q=design',
      rank: 1,
      engagementCount: 45000,
      engagementLabel: 'likes',
      timestamp: new Date(),
      category: 'Design',
    }),
    ensureImage({
      id: 'threads-2',
      platform: 'threads',
      title: 'Photography Tips and Tricks',
      subtitle: '@threads • Art · Popular',
      url: 'https://threads.net/search?q=photography',
      rank: 2,
      engagementCount: 32000,
      engagementLabel: 'likes',
      timestamp: new Date(),
      category: 'Art',
    }),
  ];
}

// =============================================================================
// Instagram - Mock trending (requires Graph API with business account)
// =============================================================================
function getInstagramTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'ig-1',
      platform: 'instagram',
      title: 'Viral Reels: Dance Challenge Takes Over',
      subtitle: '@trending • 2.3M plays',
      url: 'https://instagram.com/explore',
      rank: 1,
      engagementCount: 2300000,
      engagementLabel: 'plays',
      timestamp: new Date(Date.now() - 3600000 * 3),
      category: 'Entertainment',
    }),
    ensureImage({
      id: 'ig-2',
      platform: 'instagram',
      title: 'Travel Photography: Hidden Gems',
      subtitle: '@explore • 890K likes',
      url: 'https://instagram.com/explore',
      rank: 2,
      engagementCount: 890000,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 5),
      category: 'Travel',
    }),
    ensureImage({
      id: 'ig-3',
      platform: 'instagram',
      title: 'Food Trends: What Everyone Is Eating',
      subtitle: '@food • 650K likes',
      url: 'https://instagram.com/explore',
      rank: 3,
      engagementCount: 650000,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 8),
      category: 'Food',
    }),
  ];
}

// =============================================================================
// Facebook - Mock trending (requires Meta API access)
// =============================================================================
function getFacebookTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'fb-1',
      platform: 'facebook',
      title: 'Breaking: Major news story developing',
      subtitle: 'News • 45K shares',
      url: 'https://facebook.com',
      rank: 1,
      engagementCount: 45000,
      engagementLabel: 'shares',
      timestamp: new Date(Date.now() - 3600000 * 2),
      category: 'News',
    }),
    ensureImage({
      id: 'fb-2',
      platform: 'facebook',
      title: 'Community spotlight: Local heroes',
      subtitle: 'Community • 28K reactions',
      url: 'https://facebook.com',
      rank: 2,
      engagementCount: 28000,
      engagementLabel: 'reactions',
      timestamp: new Date(Date.now() - 3600000 * 4),
      category: 'Community',
    }),
  ];
}

// =============================================================================
// LinkedIn - Mock trending (requires LinkedIn API)
// =============================================================================
function getLinkedInTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'li-1',
      platform: 'linkedin',
      title: 'Remote work trends reshaping industries',
      subtitle: 'Business • 12K reactions',
      url: 'https://linkedin.com/news',
      rank: 1,
      engagementCount: 12000,
      engagementLabel: 'reactions',
      timestamp: new Date(Date.now() - 3600000 * 6),
      category: 'Business',
    }),
    ensureImage({
      id: 'li-2',
      platform: 'linkedin',
      title: 'AI skills most in-demand for 2025',
      subtitle: 'Careers • 8.5K reactions',
      url: 'https://linkedin.com/news',
      rank: 2,
      engagementCount: 8500,
      engagementLabel: 'reactions',
      timestamp: new Date(Date.now() - 3600000 * 12),
      category: 'Careers',
    }),
  ];
}

// =============================================================================
// Substack - Popular newsletters and posts
// =============================================================================
function getSubstackTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'substack-1',
      platform: 'substack',
      title: 'The Future of AI Writing: What to Expect in 2025',
      subtitle: 'AI Weekly • 45K subscribers',
      url: 'https://substack.com',
      rank: 1,
      engagementCount: 12500,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 4),
      category: 'Technology',
    }),
    ensureImage({
      id: 'substack-2',
      platform: 'substack',
      title: 'Why Independent Journalism Matters More Than Ever',
      subtitle: 'The Press Room • 120K subscribers',
      url: 'https://substack.com',
      rank: 2,
      engagementCount: 8900,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 8),
      category: 'News',
    }),
    ensureImage({
      id: 'substack-3',
      platform: 'substack',
      title: 'The Hidden Economics of Subscription Media',
      subtitle: 'Media Insider • 85K subscribers',
      url: 'https://substack.com',
      rank: 3,
      engagementCount: 6200,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 12),
      category: 'Business',
    }),
    ensureImage({
      id: 'substack-4',
      platform: 'substack',
      title: 'A Deep Dive Into Modern Software Architecture',
      subtitle: 'Code Review • 62K subscribers',
      url: 'https://substack.com',
      rank: 4,
      engagementCount: 5100,
      engagementLabel: 'likes',
      timestamp: new Date(Date.now() - 3600000 * 16),
      category: 'Technology',
    }),
  ];
}

// =============================================================================
// Medium - Popular articles and publications
// =============================================================================
function getMediumTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'medium-1',
      platform: 'medium',
      title: 'I Spent 30 Days Learning Rust. Here\'s What Happened.',
      subtitle: 'Better Programming • 8 min read',
      url: 'https://medium.com',
      rank: 1,
      engagementCount: 15200,
      engagementLabel: 'claps',
      timestamp: new Date(Date.now() - 3600000 * 6),
      category: 'Technology',
    }),
    ensureImage({
      id: 'medium-2',
      platform: 'medium',
      title: 'The Psychology of Productivity: Why Most Advice Fails',
      subtitle: 'Towards Data Science • 12 min read',
      url: 'https://medium.com',
      rank: 2,
      engagementCount: 11800,
      engagementLabel: 'claps',
      timestamp: new Date(Date.now() - 3600000 * 10),
      category: 'Self Improvement',
    }),
    ensureImage({
      id: 'medium-3',
      platform: 'medium',
      title: 'How We Scaled Our Startup to 1M Users',
      subtitle: 'The Startup • 15 min read',
      url: 'https://medium.com',
      rank: 3,
      engagementCount: 9400,
      engagementLabel: 'claps',
      timestamp: new Date(Date.now() - 3600000 * 14),
      category: 'Entrepreneurship',
    }),
    ensureImage({
      id: 'medium-4',
      platform: 'medium',
      title: 'Understanding React Server Components in 2025',
      subtitle: 'JavaScript in Plain English • 10 min read',
      url: 'https://medium.com',
      rank: 4,
      engagementCount: 7600,
      engagementLabel: 'claps',
      timestamp: new Date(Date.now() - 3600000 * 18),
      category: 'Technology',
    }),
  ];
}

// =============================================================================
// TikTok - Mock trending (requires TikTok for Developers API)
// =============================================================================
function getTikTokTrends(): TrendingItem[] {
  return [
    ensureImage({
      id: 'tt-1',
      platform: 'tiktok',
      title: 'New dance trend taking over For You',
      subtitle: '@tiktok • 15M views',
      url: 'https://tiktok.com/foryou',
      rank: 1,
      engagementCount: 15000000,
      engagementLabel: 'views',
      timestamp: new Date(Date.now() - 3600000 * 2),
      category: 'Entertainment',
    }),
    ensureImage({
      id: 'tt-2',
      platform: 'tiktok',
      title: 'Life hack that actually works',
      subtitle: '@viral • 8.2M views',
      url: 'https://tiktok.com/foryou',
      rank: 2,
      engagementCount: 8200000,
      engagementLabel: 'views',
      timestamp: new Date(Date.now() - 3600000 * 4),
      category: 'Lifestyle',
    }),
    ensureImage({
      id: 'tt-3',
      platform: 'tiktok',
      title: 'Behind the scenes: How it\'s made',
      subtitle: '@howto • 5.6M views',
      url: 'https://tiktok.com/foryou',
      rank: 3,
      engagementCount: 5600000,
      engagementLabel: 'views',
      timestamp: new Date(Date.now() - 3600000 * 8),
      category: 'Education',
    }),
  ];
}

// =============================================================================
// Local subreddit fetch with images
// =============================================================================
async function fetchLocalTrends(subreddits: string[]): Promise<TrendingItem[]> {
  if (subreddits.length === 0) return [];

  const allItems: TrendingItem[] = [];

  for (const subreddit of subreddits) {
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`,
        {
          headers: { 'User-Agent': 'Flare/1.0' },
          next: { revalidate: 300 },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();

      const items = data.data.children.map((child: any, index: number) => {
        const post = child.data;
        let imageUrl: string | undefined;

        if (post.preview?.images?.[0]?.source?.url) {
          imageUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
        } else if (post.thumbnail && post.thumbnail.startsWith('http')) {
          imageUrl = post.thumbnail;
        }

        return ensureImage({
          id: post.id,
          platform: 'local' as Platform,
          title: post.title,
          subtitle: `r/${post.subreddit}`,
          description: post.selftext?.slice(0, 200) || undefined,
          url: `https://reddit.com${post.permalink}`,
          rank: index + 1,
          engagementCount: post.score,
          engagementLabel: 'upvotes',
          timestamp: new Date(post.created_utc * 1000),
          category: post.subreddit,
          imageUrl,
        });
      });

      allItems.push(...items);
    } catch (error) {
      console.error(`Local subreddit fetch error for ${subreddit}:`, error);
    }
  }

  return allItems
    .sort((a, b) => (b.engagementCount || 0) - (a.engagementCount || 0))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

// =============================================================================
// Pulse posts from Reddit comments
// =============================================================================
async function fetchPulsePosts(): Promise<PulsePost[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/popular/comments.json?limit=10',
      {
        headers: { 'User-Agent': 'Flare/1.0' },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    const posts = data.data.children
      .filter((child: any) => {
        const comment = child.data;
        return comment.score > 50 && comment.body.length > 20 && comment.body.length < 500;
      })
      .map((child: any) => ({
        id: child.data.id,
        platform: 'reddit' as Platform,
        authorName: child.data.author,
        authorHandle: `u/${child.data.author}`,
        content: child.data.body,
        relatedTopic: `r/${child.data.subreddit}`,
        engagementCount: child.data.score,
        engagementType: 'upvotes' as const,
        timestamp: new Date(child.data.created_utc * 1000),
        url: `https://reddit.com${child.data.permalink}`,
        isVerified: false,
      }));

    const mockPosts: PulsePost[] = [
      {
        id: 'twitter-pulse-1',
        platform: 'twitter',
        authorName: 'Tech Insider',
        authorHandle: '@techinsider',
        content: 'The new design system is genuinely impressive. This is the biggest visual change we\'ve seen in years.',
        relatedTopic: 'Technology',
        engagementCount: 12500,
        engagementType: 'likes',
        timestamp: new Date(Date.now() - 3600000),
        isVerified: true,
      },
      {
        id: 'bluesky-pulse-1',
        platform: 'bluesky',
        authorName: 'Open Web',
        authorHandle: '@openweb.bsky.social',
        content: 'Federation is the future. No single company should control our social connections.',
        relatedTopic: 'Technology',
        engagementCount: 8500,
        engagementType: 'likes',
        timestamp: new Date(Date.now() - 7200000),
        isVerified: false,
      },
    ];

    return [...posts, ...mockPosts].sort((a, b) => b.engagementCount - a.engagementCount);
  } catch (error) {
    console.error('Pulse fetch error:', error);
    return [];
  }
}

// =============================================================================
// Main fetch function - All platforms in parallel with deduplication
// =============================================================================
export async function fetchAllTrends(): Promise<TrendingSection[]> {
  const [reddit, hackernews, youtube, google, bluesky] = await Promise.all([
    fetchRedditTrends(),
    fetchHackerNewsTrends(),
    fetchYouTubeTrends(),
    fetchGoogleTrends(),
    fetchBlueskyTrends(),
  ]);

  const sections: TrendingSection[] = [
    { id: 'reddit', platform: 'reddit', title: 'Trending on Reddit', items: reddit },
    { id: 'hackernews', platform: 'hackernews', title: 'Top on Hacker News', items: hackernews },
    { id: 'youtube', platform: 'youtube', title: 'Trending on YouTube', items: youtube },
    { id: 'google', platform: 'google', title: 'Google Trends', items: google },
    { id: 'bluesky', platform: 'bluesky', title: 'Hot on Bluesky', items: bluesky },
    { id: 'twitter', platform: 'twitter', title: 'Trending on X', items: getTwitterTrends() },
    { id: 'threads', platform: 'threads', title: 'Popular on Threads', items: getThreadsTrends() },
    { id: 'instagram', platform: 'instagram', title: 'Trending on Instagram', items: getInstagramTrends() },
    { id: 'facebook', platform: 'facebook', title: 'Trending on Facebook', items: getFacebookTrends() },
    { id: 'linkedin', platform: 'linkedin', title: 'Trending on LinkedIn', items: getLinkedInTrends() },
    { id: 'tiktok', platform: 'tiktok', title: 'Trending on TikTok', items: getTikTokTrends() },
    { id: 'substack', platform: 'substack', title: 'Popular on Substack', items: getSubstackTrends() },
    { id: 'medium', platform: 'medium', title: 'Trending on Medium', items: getMediumTrends() },
  ];

  return sections.filter(s => s.items.length > 0);
}

// =============================================================================
// Platform weights - Higher weight = more trusted/authoritative source
// =============================================================================
const platformWeights: Record<Platform, number> = {
  hackernews: 1.8,    // Tech-focused, high-quality discussions
  reddit: 1.5,        // Large community, varied content
  substack: 1.4,      // Long-form, quality journalism
  medium: 1.3,        // Quality articles
  youtube: 1.2,       // Video content, high engagement
  twitter: 1.1,       // Breaking news, real-time
  bluesky: 1.1,       // Emerging platform
  google: 1.0,        // Search trends
  linkedin: 0.9,      // Professional content
  threads: 0.8,       // Newer platform
  instagram: 0.7,     // Visual/entertainment focus
  facebook: 0.6,      // General social
  tiktok: 0.5,        // Short-form entertainment
  local: 1.0,         // Local content
};

// Fetch all items as a unified, deduplicated feed sorted by weighted engagement
export async function fetchUnifiedFeed(): Promise<TrendingItem[]> {
  const sections = await fetchAllTrends();

  // Collect all items from all sections
  const allItems = sections.flatMap(section => section.items);

  // Deduplicate similar stories
  const deduplicated = deduplicateItems(allItems);

  // Sort by weighted engagement and recency
  const now = Date.now();
  const sortedItems = deduplicated.sort((a, b) => {
    const aAge = (now - new Date(a.timestamp).getTime()) / 3600000; // hours
    const bAge = (now - new Date(b.timestamp).getTime()) / 3600000;

    // Get platform weights
    const aWeight = platformWeights[a.platform] || 1.0;
    const bWeight = platformWeights[b.platform] || 1.0;

    // Score = (engagement * platformWeight) / (age + 2)^1.5 - decay older content
    const aScore = ((a.engagementCount || 0) * aWeight) / Math.pow(aAge + 2, 1.5);
    const bScore = ((b.engagementCount || 0) * bWeight) / Math.pow(bAge + 2, 1.5);

    return bScore - aScore;
  });

  // Re-assign ranks
  return sortedItems.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

// Export platform weights for UI display
export { platformWeights };

export { fetchLocalTrends, fetchPulsePosts, deduplicateItems };

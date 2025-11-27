import { TrendingItem, TrendingSection, PulsePost, Platform } from './types';

// =============================================================================
// Title Enhancement - Make vague/clickbait titles more informative
// =============================================================================

// Patterns that indicate a vague or clickbait title
const vaguePatterns = [
  /^(this|these|that|those)\s+/i,
  /^(why|how|what)\s+(everyone|everybody|people|we|they|you)\s+(is|are|should)/i,
  /^(the\s+)?(truth|secret|reason|thing|way)\s+(about|behind|to)/i,
  /\.\.\.$/, // Trailing ellipsis
  /^#\w+\s*[-–—]\s*/, // Hashtag with separator
  /^(breaking|update|alert)[:!]?\s*/i,
  /you (won't|wont|will never|need to) (believe|know|see|hear)/i,
  /(everyone|they) (don't|doesn't|didn't) want you to (know|see)/i,
  /what (happened|happens) (next|when)/i,
  /(changed|changes) everything/i,
  /actually works/i,
  /taking over/i,
  /went viral/i,
  /blew up/i,
  /here's what/i,
];

// Words that indicate specificity (title is probably fine)
const specificityIndicators = [
  /\d{4}/, // Year (e.g., "2025")
  /\$[\d,]+/, // Dollar amounts
  /\d+%/, // Percentages
  /\b(v\d|version\s*\d)/i, // Version numbers
  /\b(gpt-?\d|claude|llama|gemini|openai|google|apple|microsoft|meta|amazon)/i, // Company/product names
  /\b(react|vue|angular|swift|rust|python|javascript|typescript)/i, // Tech names
  /\b(senate|congress|supreme court|president|governor)/i, // Political terms
  /\b(ceo|cto|founder)\s+of/i, // Leadership titles
];

// Check if title needs enhancement
function isTitleVague(title: string): boolean {
  // If title has specific indicators, it's probably fine
  if (specificityIndicators.some(pattern => pattern.test(title))) {
    return false;
  }

  // Check for vague patterns
  return vaguePatterns.some(pattern => pattern.test(title));
}

// Extract key context from description or subtitle
function extractContext(text: string): string | null {
  if (!text || text.length < 10) return null;

  // Clean up the text
  const cleaned = text
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/[^\w\s.,!?-]/g, ' ') // Remove special chars
    .trim();

  // Try to find a meaningful phrase (first sentence or clause)
  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 15 && firstSentence.length < 100) {
    return firstSentence;
  }

  // Fall back to first chunk
  const words = cleaned.split(/\s+/).slice(0, 8);
  if (words.length >= 3) {
    return words.join(' ');
  }

  return null;
}

// Enhance a vague title with context
function enhanceTitle(item: TrendingItem): string {
  const { title, description, subtitle, category, platform } = item;

  // If title isn't vague, return as-is
  if (!isTitleVague(title)) {
    return title;
  }

  // Try to extract context from available fields
  const descContext = extractContext(description || '');
  const subContext = extractContext(subtitle || '');

  // Clean the original title
  let cleanedTitle = title
    .replace(/^#\w+\s*[-–—]\s*/, '') // Remove hashtag prefix
    .replace(/^(breaking|update|alert)[:!]?\s*/i, '')
    .replace(/\.\.\.$/, '')
    .trim();

  // Strategy 1: Use description context if available and meaningful
  if (descContext && descContext.length > 20) {
    // If description is more specific, use it
    if (!isTitleVague(descContext)) {
      return descContext.length > 80 ? descContext.slice(0, 80) + '...' : descContext;
    }
  }

  // Strategy 2: Prepend category/topic if it adds clarity
  if (category && category !== 'Trending' && !cleanedTitle.toLowerCase().includes(category.toLowerCase())) {
    // Check if subtitle has useful context (like subreddit or publication name)
    if (subContext) {
      // Extract publication/subreddit name
      const pubMatch = subtitle?.match(/^([^•·\-]+)/);
      if (pubMatch && pubMatch[1].trim().length > 2) {
        const pub = pubMatch[1].trim();
        // Don't add generic prefixes
        if (!['News', 'Trending', '@trending', '@explore'].includes(pub)) {
          return `${pub}: ${cleanedTitle}`;
        }
      }
    }

    // Use category as prefix
    return `${category}: ${cleanedTitle}`;
  }

  // Strategy 3: Add platform context for very vague titles
  if (cleanedTitle.length < 40) {
    const platformNames: Record<Platform, string> = {
      reddit: 'Reddit',
      hackernews: 'HN',
      twitter: 'X',
      youtube: 'YouTube',
      google: 'Trending',
      bluesky: 'Bluesky',
      threads: 'Threads',
      instagram: 'Instagram',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      tiktok: 'TikTok',
      substack: 'Substack',
      medium: 'Medium',
      local: 'Local',
    };

    if (category && category !== 'Trending') {
      return `${category} ${platformNames[platform] || ''}: ${cleanedTitle}`;
    }
  }

  return cleanedTitle || title;
}

// Apply title enhancement to all items
function enhanceTitles(items: TrendingItem[]): TrendingItem[] {
  return items.map(item => ({
    ...item,
    title: enhanceTitle(item),
    originalTitle: item.title, // Preserve original for tooltip/fallback
  }));
}

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
        title: 'GPT-5 vs Claude 4: Which AI Model Wins in 2025?',
        subtitle: 'Tech Vision • 4.2M views',
        description: 'A comprehensive comparison of the latest AI models from OpenAI and Anthropic, testing coding, reasoning, and creative tasks.',
        url: 'https://youtube.com/watch?v=placeholder1',
        rank: 1,
        engagementCount: 4200000,
        engagementLabel: 'views',
        timestamp: new Date(Date.now() - 3600000 * 8),
        category: 'Technology',
        imageUrl: generateFallbackImage('GPT-5 vs Claude 4 AI Comparison', 'youtube'),
      },
      {
        id: 'yt-2',
        platform: 'youtube',
        title: 'iPhone 17 Pro Max Full Review: Apple Silicon M5 Changes Mobile Computing',
        subtitle: 'Digital Trends • 2.1M views',
        description: 'Apple brings desktop-class performance to mobile with the M5 chip in the new iPhone 17 Pro Max.',
        url: 'https://youtube.com/watch?v=placeholder2',
        rank: 2,
        engagementCount: 2100000,
        engagementLabel: 'views',
        timestamp: new Date(Date.now() - 3600000 * 12),
        category: 'Technology',
        imageUrl: generateFallbackImage('iPhone 17 Pro Max Review', 'youtube'),
      },
      {
        id: 'yt-3',
        platform: 'youtube',
        title: 'NASA Confirms Water Ice on Mars Equator - What This Means for Colonization',
        subtitle: 'Future Tech • 1.8M views',
        description: 'New satellite data reveals massive underground ice deposits near the Mars equator, revolutionizing colonization plans.',
        url: 'https://youtube.com/watch?v=placeholder3',
        rank: 3,
        engagementCount: 1800000,
        engagementLabel: 'views',
        timestamp: new Date(Date.now() - 3600000 * 18),
        category: 'Science',
        imageUrl: generateFallbackImage('NASA Mars Water Ice Discovery', 'youtube'),
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
      title: 'Google I/O 2025: Android 16, Gemini 2 Pro, and Pixel Fold 2 Announced',
      subtitle: 'Technology · Trending',
      description: 'Google unveils major updates including Android 16 with AI-first design, Gemini 2 Pro model, and the foldable Pixel Fold 2.',
      url: 'https://twitter.com/search?q=%23GoogleIO',
      rank: 1,
      engagementCount: 185000,
      engagementLabel: 'posts',
      timestamp: new Date(),
      category: 'Technology',
    }),
    ensureImage({
      id: 'twitter-2',
      platform: 'twitter',
      title: 'OpenAI Releases GPT-5 Turbo: 10x Faster, 50% Cheaper Than GPT-4',
      subtitle: 'Technology · Trending',
      description: 'Sam Altman announces GPT-5 Turbo with dramatically improved speed and cost efficiency.',
      url: 'https://twitter.com/search?q=%23GPT5',
      rank: 2,
      engagementCount: 142000,
      engagementLabel: 'posts',
      timestamp: new Date(),
      category: 'Technology',
    }),
    ensureImage({
      id: 'twitter-3',
      platform: 'twitter',
      title: 'EU Passes Landmark AI Regulation: What Companies Need to Know',
      subtitle: 'News · Trending',
      description: 'European Parliament approves comprehensive AI Act with strict requirements for high-risk systems.',
      url: 'https://twitter.com/search?q=%23AIAct',
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
      title: 'Apple Design Award 2025 Winners: 6 Apps That Set New UI Standards',
      subtitle: '@threads • Design · Popular',
      description: 'Apple announces this years Design Award winners at WWDC, highlighting innovations in accessibility and spatial design.',
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
      title: 'iPhone 17 ProRAW vs Sony A7V: Pro Photographer Side-by-Side Comparison',
      subtitle: '@threads • Art · Popular',
      description: 'Professional photographer tests the new iPhone 17 camera against a $2500 mirrorless camera in various conditions.',
      url: 'https://threads.net/search?q=photography',
      rank: 2,
      engagementCount: 32000,
      engagementLabel: 'likes',
      timestamp: new Date(),
      category: 'Photography',
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
      title: 'Zendaya MET Gala 2025 Look: Robot-Inspired Balenciaga Gown Goes Viral',
      subtitle: '@trending • 2.3M plays',
      description: 'Zendaya arrives at the MET Gala in a stunning robotic-themed Balenciaga creation.',
      url: 'https://instagram.com/explore',
      rank: 1,
      engagementCount: 2300000,
      engagementLabel: 'plays',
      timestamp: new Date(Date.now() - 3600000 * 3),
      category: 'Fashion',
    }),
    ensureImage({
      id: 'ig-2',
      platform: 'instagram',
      title: 'Faroe Islands Waterfall Hike: Photographer Captures New Angle of Múlafossur',
      subtitle: '@explore • 890K likes',
      description: 'Stunning new perspective of the famous Múlafossur waterfall shot with drone in golden hour.',
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
      title: 'Dubai Chocolate Bar Recipe: How to Make the Viral Pistachio Treat at Home',
      subtitle: '@food • 650K likes',
      description: 'Step-by-step guide to recreating the $30 Dubai chocolate bar with pistachio knafeh filling.',
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
      title: 'Hurricane Maria Category 5: Florida Keys Under Mandatory Evacuation',
      subtitle: 'News • 45K shares',
      description: 'Governor DeSantis declares state of emergency as Cat 5 hurricane approaches the Florida Keys.',
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
      title: 'Texas Teacher Raises $2.4M for Students Lunch Debt Across 47 Schools',
      subtitle: 'Community • 28K reactions',
      description: 'Elementary school teacher fundraising campaign erases lunch debt for over 15,000 students.',
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
      title: 'Microsoft Mandates 3 Days/Week In-Office: 50,000 Employees Affected',
      subtitle: 'Business • 12K reactions',
      description: 'Microsoft reverses remote work policy, requiring hybrid schedule starting Q2 2025.',
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
      title: 'LinkedIn 2025 Jobs Report: Prompt Engineers See 400% Salary Growth',
      subtitle: 'Careers • 8.5K reactions',
      description: 'Annual jobs report reveals AI-related roles dominating salary growth across all industries.',
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
      title: 'Kendrick Lamar "GNX" Dance Challenge Hits 500M Combined Views',
      subtitle: '@tiktok • 15M views',
      description: 'The viral dance to Kendrick new track continues to dominate TikTok across multiple creators.',
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
      title: 'Tesla FSD V13 Test: Creator Drives LA to San Francisco Hands-Free',
      subtitle: '@viral • 8.2M views',
      description: 'A Tesla owner documents their full 380-mile trip using Full Self-Driving version 13.',
      url: 'https://tiktok.com/foryou',
      rank: 2,
      engagementCount: 8200000,
      engagementLabel: 'views',
      timestamp: new Date(Date.now() - 3600000 * 4),
      category: 'Technology',
    }),
    ensureImage({
      id: 'tt-3',
      platform: 'tiktok',
      title: 'Factory Tour: How Nike Air Jordan 1s Are Made in 2025',
      subtitle: '@howto • 5.6M views',
      description: 'Exclusive behind-the-scenes look at Nike latest manufacturing facility producing Air Jordan 1 sneakers.',
      url: 'https://tiktok.com/foryou',
      rank: 3,
      engagementCount: 5600000,
      engagementLabel: 'views',
      timestamp: new Date(Date.now() - 3600000 * 8),
      category: 'Fashion',
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
  const rankedItems = sortedItems.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  // Enhance vague titles with contextual information
  return enhanceTitles(rankedItems);
}

// Export platform weights for UI display
export { platformWeights };

export { fetchLocalTrends, fetchPulsePosts, deduplicateItems };

import { NextResponse } from 'next/server';

interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  datePublished?: string;
  siteName?: string;
  image?: string;
  wordCount: number;
  readingTime: number;
}

// Simple content extraction using fetch + regex parsing
// For production, consider using @mozilla/readability or mercury-parser
async function extractContent(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FlareBot/1.0; +https://flare.app)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const html = await response.text();

  // Extract meta tags
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const title = ogTitleMatch?.[1] || titleMatch?.[1] || 'Untitled';

  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const excerpt = ogDescMatch?.[1] || descMatch?.[1] || '';

  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  const image = ogImageMatch?.[1];

  const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  const siteName = ogSiteMatch?.[1];

  const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
  const author = authorMatch?.[1];

  const dateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i);
  const datePublished = dateMatch?.[1];

  // Extract article content
  let content = '';

  // Try to find article tag first
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    content = articleMatch[1];
  } else {
    // Fall back to main content area
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      content = mainMatch[1];
    } else {
      // Try common content selectors
      const contentMatch = html.match(/<div[^>]*class=["'][^"']*(?:content|article|post|entry)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (contentMatch) {
        content = contentMatch[1];
      }
    }
  }

  // Clean HTML content
  content = cleanHtml(content);

  // Calculate reading stats
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200); // ~200 WPM

  return {
    title: decodeHtmlEntities(title.trim()),
    content,
    excerpt: decodeHtmlEntities(excerpt.trim()),
    author,
    datePublished,
    siteName,
    image,
    wordCount,
    readingTime,
  };
}

function cleanHtml(html: string): string {
  if (!html) return '';

  // Remove scripts, styles, and other non-content elements
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Convert common elements to semantic HTML
  clean = clean
    .replace(/<h1[^>]*>/gi, '<h1>')
    .replace(/<h2[^>]*>/gi, '<h2>')
    .replace(/<h3[^>]*>/gi, '<h3>')
    .replace(/<p[^>]*>/gi, '<p>')
    .replace(/<blockquote[^>]*>/gi, '<blockquote>')
    .replace(/<ul[^>]*>/gi, '<ul>')
    .replace(/<ol[^>]*>/gi, '<ol>')
    .replace(/<li[^>]*>/gi, '<li>')
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, '<a href="$1">')
    .replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '<img src="$1" alt="$2">')
    .replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '<img src="$1" alt="">');

  // Remove all other attributes from remaining tags
  clean = clean.replace(/<(\w+)\s+[^>]*>/g, '<$1>');

  // Remove empty paragraphs and divs
  clean = clean.replace(/<p>\s*<\/p>/gi, '');
  clean = clean.replace(/<div>\s*<\/div>/gi, '');

  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const content = await extractContent(url);

    return NextResponse.json(content);
  } catch (error) {
    console.error('Content extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract content' },
      { status: 500 }
    );
  }
}

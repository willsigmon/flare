import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
  guid?: string;
}

interface Article {
  source_url: string;
  external_id: string | null;
  url: string;
  title: string;
  author: string | null;
  raw_content: string | null;
  extracted_content: string | null;
  published_at: string | null;
  content_hash: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { feedUrl } = await req.json();

    if (!feedUrl) {
      return new Response(
        JSON.stringify({ error: "feedUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching RSS feed: ${feedUrl}`);

    // Fetch the RSS feed
    const feedResponse = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Flare/1.0 (RSS Aggregator)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!feedResponse.ok) {
      throw new Error(`Failed to fetch feed: ${feedResponse.status}`);
    }

    const xmlText = await feedResponse.text();

    // Parse RSS/Atom feed
    const items = parseRSSFeed(xmlText, feedUrl);
    console.log(`Parsed ${items.length} items from feed`);

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No items found in feed", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare articles for upsert
    const articles: Article[] = items.map((item) => ({
      source_url: feedUrl,
      external_id: item.guid || null,
      url: item.link,
      title: item.title,
      author: item.author || null,
      raw_content: item.description || null,
      extracted_content: cleanHTML(item.description || ""),
      published_at: item.pubDate ? parseDate(item.pubDate) : null,
      content_hash: hashString(item.title + item.link),
    }));

    // Upsert articles (insert or update on conflict)
    const { data, error } = await supabase
      .from("articles")
      .upsert(articles, { onConflict: "url", ignoreDuplicates: false })
      .select();

    if (error) {
      throw error;
    }

    console.log(`Upserted ${data?.length || 0} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        count: data?.length || 0,
        feedUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Simple RSS parser using regex (handles most RSS 2.0 and Atom feeds)
function parseRSSFeed(xml: string, feedUrl: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Detect feed type
  const isAtom = xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"");

  if (isAtom) {
    // Parse Atom feed
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];

      const title = extractTag(entry, "title");
      const link = extractAtomLink(entry);
      const content = extractTag(entry, "content") || extractTag(entry, "summary");
      const published = extractTag(entry, "published") || extractTag(entry, "updated");
      const author = extractTag(entry, "name"); // Inside <author> tag
      const id = extractTag(entry, "id");

      if (title && link) {
        items.push({
          title: decodeHTMLEntities(title),
          link,
          description: content,
          pubDate: published,
          author: author ? decodeHTMLEntities(author) : undefined,
          guid: id,
        });
      }
    }
  } else {
    // Parse RSS 2.0 feed
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1];

      const title = extractTag(item, "title");
      const link = extractTag(item, "link");
      const description = extractTag(item, "description") || extractTag(item, "content:encoded");
      const pubDate = extractTag(item, "pubDate");
      const author = extractTag(item, "author") || extractTag(item, "dc:creator");
      const guid = extractTag(item, "guid");

      if (title && link) {
        items.push({
          title: decodeHTMLEntities(title),
          link: decodeHTMLEntities(link),
          description,
          pubDate,
          author: author ? decodeHTMLEntities(author) : undefined,
          guid,
        });
      }
    }
  }

  return items;
}

// Extract content from XML tag
function extractTag(xml: string, tagName: string): string | undefined {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }

  // Handle regular content
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : undefined;
}

// Extract link from Atom entry (handles href attribute)
function extractAtomLink(entry: string): string | undefined {
  // Look for <link href="..." rel="alternate"> or just <link href="...">
  const linkRegex = /<link[^>]*href="([^"]*)"[^>]*>/i;
  const match = entry.match(linkRegex);
  return match ? match[1] : undefined;
}

// Decode HTML entities
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Strip HTML tags and clean up content
function cleanHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")  // Remove HTML tags
    .replace(/\s+/g, " ")       // Collapse whitespace
    .replace(/&nbsp;/g, " ")    // Replace nbsp
    .trim()
    .slice(0, 2000);            // Limit length
}

// Parse various date formats to ISO string
function parseDate(dateStr: string): string | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

// Simple string hash for deduplication
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

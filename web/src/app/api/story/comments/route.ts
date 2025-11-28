import { NextRequest, NextResponse } from 'next/server';

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  score: number;
  replies: Comment[];
  depth: number;
  platform: 'reddit' | 'hackernews';
}

// Fetch Reddit comments for a post
async function fetchRedditComments(postId: string): Promise<Comment[]> {
  try {
    // Reddit API returns [post, comments] array
    const response = await fetch(
      `https://www.reddit.com/comments/${postId}.json?limit=50&depth=3`,
      {
        headers: {
          'User-Agent': 'Flare/1.0',
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const commentsListing = data[1]?.data?.children || [];

    return parseRedditComments(commentsListing, 0);
  } catch (error) {
    console.error('Reddit comments fetch error:', error);
    return [];
  }
}

function parseRedditComments(children: any[], depth: number): Comment[] {
  const comments: Comment[] = [];

  for (const child of children) {
    if (child.kind !== 't1') continue; // Skip non-comment items

    const data = child.data;
    if (!data.body || data.body === '[deleted]' || data.body === '[removed]') continue;

    const comment: Comment = {
      id: data.id,
      author: data.author || '[deleted]',
      content: data.body,
      timestamp: new Date(data.created_utc * 1000),
      score: data.score || 0,
      depth,
      platform: 'reddit',
      replies: [],
    };

    // Parse nested replies
    if (data.replies?.data?.children) {
      comment.replies = parseRedditComments(data.replies.data.children, depth + 1);
    }

    comments.push(comment);
  }

  return comments;
}

// Fetch Hacker News comments for a story
async function fetchHNComments(storyId: string): Promise<Comment[]> {
  try {
    // First get the story to get comment IDs
    const storyResponse = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`,
      { next: { revalidate: 300 } }
    );

    if (!storyResponse.ok) return [];

    const story = await storyResponse.json();
    const commentIds = story.kids || [];

    // Fetch top-level comments (limit to 30)
    const topComments = await Promise.all(
      commentIds.slice(0, 30).map((id: number) => fetchHNComment(id, 0))
    );

    return topComments.filter((c): c is Comment => c !== null);
  } catch (error) {
    console.error('HN comments fetch error:', error);
    return [];
  }
}

async function fetchHNComment(id: number, depth: number): Promise<Comment | null> {
  try {
    const response = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.deleted || data.dead || !data.text) return null;

    const comment: Comment = {
      id: id.toString(),
      author: data.by || 'anonymous',
      content: data.text,
      timestamp: new Date(data.time * 1000),
      score: 0, // HN doesn't expose comment scores
      depth,
      platform: 'hackernews',
      replies: [],
    };

    // Fetch nested replies (limit depth to 2, limit to 5 per comment)
    if (data.kids && depth < 2) {
      const replies = await Promise.all(
        data.kids.slice(0, 5).map((kidId: number) => fetchHNComment(kidId, depth + 1))
      );
      comment.replies = replies.filter((c): c is Comment => c !== null);
    }

    return comment;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');
  const storyId = searchParams.get('id');

  if (!platform || !storyId) {
    return NextResponse.json({ error: 'Missing platform or id' }, { status: 400 });
  }

  let comments: Comment[] = [];

  if (platform === 'reddit') {
    comments = await fetchRedditComments(storyId);
  } else if (platform === 'hackernews') {
    comments = await fetchHNComments(storyId);
  } else {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
  }

  return NextResponse.json({ comments, count: comments.length });
}

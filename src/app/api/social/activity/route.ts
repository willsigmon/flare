import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET activity feed for current user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'all', 'mentions', 'follows', 'likes'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('activity_events')
      .select(`
        id,
        event_type,
        created_at,
        article_id,
        comment_id,
        actor:user_profiles!activity_events_user_id_fkey (
          username,
          display_name,
          avatar_url
        ),
        articles (
          title,
          url,
          platform
        )
      `)
      .eq('target_user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== 'all') {
      const typeMap: Record<string, string[]> = {
        mentions: ['mention'],
        follows: ['follow'],
        likes: ['upvote', 'like'],
        comments: ['comment', 'reply'],
      };
      if (typeMap[type]) {
        query = query.in('event_type', typeMap[type]);
      }
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Activity fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    return NextResponse.json({ activities: activities || [] });
  } catch (error) {
    console.error('Activity GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET leaderboards
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, period } = body; // type: 'contributors', 'commenters', 'rising'

    const supabase = await createClient();

    let startDate: Date | null = null;
    if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    }

    if (type === 'contributors') {
      // Top users by total upvotes received on their shares
      const { data, error } = await supabase.rpc('get_top_contributors', {
        start_date: startDate?.toISOString() || null,
        limit_count: 20,
      });

      if (error) {
        // Fallback if RPC doesn't exist
        const { data: users } = await supabase
          .from('user_profiles')
          .select('username, display_name, avatar_url')
          .limit(20);

        return NextResponse.json({
          leaderboard: users?.map((u, i) => ({ ...u, rank: i + 1, score: 0 })) || [],
        });
      }

      return NextResponse.json({ leaderboard: data || [] });
    }

    if (type === 'commenters') {
      // Top users by comment count
      const { data: comments } = await supabase
        .from('comments')
        .select('user_id')
        .gte('created_at', startDate?.toISOString() || '1970-01-01');

      // Count by user
      const counts: Record<string, number> = {};
      comments?.forEach(c => {
        counts[c.user_id] = (counts[c.user_id] || 0) + 1;
      });

      const topUserIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([id, count]) => ({ id, count }));

      if (topUserIds.length === 0) {
        return NextResponse.json({ leaderboard: [] });
      }

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', topUserIds.map(u => u.id));

      const leaderboard = topUserIds.map((u, i) => {
        const profile = profiles?.find(p => p.user_id === u.id);
        return {
          rank: i + 1,
          username: profile?.username,
          display_name: profile?.display_name,
          avatar_url: profile?.avatar_url,
          score: u.count,
        };
      });

      return NextResponse.json({ leaderboard });
    }

    return NextResponse.json({ leaderboard: [] });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

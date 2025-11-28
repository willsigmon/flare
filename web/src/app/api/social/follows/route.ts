import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET followers/following for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'followers' or 'following'

    if (!userId || !type) {
      return NextResponse.json({ error: 'userId and type required' }, { status: 400 });
    }

    const supabase = await createClient();

    if (type === 'followers') {
      const { data: followers, error } = await supabase
        .from('user_follows')
        .select(`
          follower_id,
          created_at,
          follower:user_profiles!user_follows_follower_id_fkey (
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', userId);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch followers' }, { status: 500 });
      }

      return NextResponse.json({ users: followers?.map(f => ({ ...f.follower, followedAt: f.created_at })) || [] });
    } else {
      const { data: following, error } = await supabase
        .from('user_follows')
        .select(`
          following_id,
          created_at,
          following:user_profiles!user_follows_following_id_fkey (
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', userId);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch following' }, { status: 500 });
      }

      return NextResponse.json({ users: following?.map(f => ({ ...f.following, followedAt: f.created_at })) || [] });
    }
  } catch (error) {
    console.error('Follows GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST follow a user
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: user.id,
        following_id: userId,
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already following' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
    }

    // Log activity
    await supabase.from('activity_events').insert({
      user_id: user.id,
      target_user_id: userId,
      event_type: 'follow',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Follow POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE unfollow a user
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unfollow DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

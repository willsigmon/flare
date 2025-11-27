import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get vote counts
    const { data: voteStats } = await supabase
      .from('user_articles')
      .select('vote')
      .eq('user_id', user.id)
      .not('vote', 'eq', 0);

    const upvotes = voteStats?.filter(v => v.vote === 1).length || 0;
    const downvotes = voteStats?.filter(v => v.vote === -1).length || 0;

    // Get saved count
    const { count: savedCount } = await supabase
      .from('user_articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_saved', true);

    // Get read count
    const { count: readCount } = await supabase
      .from('user_articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', true);

    // Get total time spent
    const { data: timeData } = await supabase
      .from('user_articles')
      .select('time_spent_sec')
      .eq('user_id', user.id)
      .not('time_spent_sec', 'is', null);

    const totalTimeSpent = timeData?.reduce((sum, r) => sum + (r.time_spent_sec || 0), 0) || 0;

    return NextResponse.json({
      preferences: {
        platformScores: prefs?.platform_scores || {},
        categoryScores: prefs?.category_scores || {},
        recencyWeight: prefs?.recency_weight || 0.5,
        viralityWeight: prefs?.virality_weight || 0.5,
        explorationEnabled: prefs?.exploration_enabled ?? true,
        explorationPercentage: prefs?.exploration_percentage || 10,
      },
      stats: {
        totalInteractions: prefs?.total_interactions || 0,
        upvotes,
        downvotes,
        savedCount: savedCount || 0,
        readCount: readCount || 0,
        totalTimeSpentMinutes: Math.round(totalTimeSpent / 60),
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      recencyWeight,
      viralityWeight,
      explorationEnabled,
      explorationPercentage,
    } = body;

    const updateData: Record<string, any> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (recencyWeight !== undefined) updateData.recency_weight = recencyWeight;
    if (viralityWeight !== undefined) updateData.virality_weight = viralityWeight;
    if (explorationEnabled !== undefined) updateData.exploration_enabled = explorationEnabled;
    if (explorationPercentage !== undefined) updateData.exploration_percentage = explorationPercentage;

    const { error } = await supabase
      .from('user_preferences')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) {
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user preferences
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id);

    // Reset user_articles (keep records but clear votes and signals)
    await supabase
      .from('user_articles')
      .update({
        vote: 0,
        is_saved: false,
        is_hidden: false,
        is_shared: false,
        time_spent_sec: null,
        scroll_depth: null,
      })
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

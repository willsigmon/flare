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

    // Get vote counts from web_article_votes table
    const { data: voteStats } = await supabase
      .from('web_article_votes')
      .select('vote')
      .eq('user_id', user.id)
      .not('vote', 'eq', 0);

    const upvotes = voteStats?.filter(v => v.vote === 1).length || 0;
    const downvotes = voteStats?.filter(v => v.vote === -1).length || 0;
    const totalVotes = upvotes + downvotes;

    return NextResponse.json({
      preferences: {
        platformScores: prefs?.platform_scores || {},
        categoryScores: prefs?.category_scores || {},
        recencyWeight: prefs?.recency_weight || 0.5,
        viralityWeight: prefs?.virality_weight || 0.5,
        explorationEnabled: prefs?.exploration_enabled ?? true,
        explorationPercentage: prefs?.exploration_percentage || 20,
      },
      stats: {
        totalInteractions: prefs?.total_interactions || 0,
        totalVotes,
        upvotes,
        downvotes,
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

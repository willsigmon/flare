import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: Fetch all votes for the current user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ votes: {} });
    }

    const { data: votes, error } = await supabase
      .from('web_article_votes')
      .select('article_id, vote')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching votes:', error);
      return NextResponse.json({ votes: {} });
    }

    // Convert to map: { articleId: vote }
    const voteMap: Record<string, number> = {};
    votes?.forEach(v => {
      voteMap[v.article_id] = v.vote;
    });

    return NextResponse.json({ votes: voteMap });
  } catch (error) {
    console.error('Get votes error:', error);
    return NextResponse.json({ votes: {} });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { articleId, vote, platform, category, title, url } = body;

    // Validate input
    if (!articleId || vote === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert vote in web_article_votes table
    const { error: voteError } = await supabase
      .from('web_article_votes')
      .upsert({
        user_id: user.id,
        article_id: articleId,
        platform,
        category,
        vote, // 1 for up, -1 for down, 0 for neutral
        title,
        url,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,article_id' });

    if (voteError) {
      console.error('Vote error:', voteError);
      return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 });
    }

    // Log activity event (fire and forget)
    supabase.from('activity_events').insert({
      user_id: user.id,
      event_type: vote === 1 ? 'upvote' : vote === -1 ? 'downvote' : 'unvote',
      article_id: articleId,
      metadata: { platform, category },
    }).then(({ error }) => {
      if (error) console.error('Activity event error:', error);
    });

    // Update user preferences (async, don't wait)
    updateUserPreferences(supabase, user.id, platform, category, vote);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to update user preferences based on vote
async function updateUserPreferences(
  supabase: any,
  userId: string,
  platform: string,
  category: string,
  vote: number
) {
  try {
    // Get current preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const platformScores = prefs?.platform_scores || {};
    const categoryScores = prefs?.category_scores || {};
    const learningRate = 0.1;

    // Update platform score
    if (platform) {
      const currentPlatformScore = platformScores[platform] || 0;
      platformScores[platform] = currentPlatformScore + (vote * learningRate);
      // Clamp to [-1, 1]
      platformScores[platform] = Math.max(-1, Math.min(1, platformScores[platform]));
    }

    // Update category score
    if (category) {
      const currentCategoryScore = categoryScores[category] || 0;
      categoryScores[category] = currentCategoryScore + (vote * learningRate);
      categoryScores[category] = Math.max(-1, Math.min(1, categoryScores[category]));
    }

    // Upsert preferences
    await supabase.from('user_preferences').upsert({
      user_id: userId,
      platform_scores: platformScores,
      category_scores: categoryScores,
      total_interactions: (prefs?.total_interactions || 0) + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (error) {
    console.error('Error updating preferences:', error);
  }
}

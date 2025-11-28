import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch the flare score
    const { data: scoreData, error } = await supabase
      .from('article_flare_scores')
      .select('*')
      .eq('article_id', articleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Error fetching flare score:', error);
      return NextResponse.json({ error: 'Failed to fetch score' }, { status: 500 });
    }

    // If user is logged in, get their vote
    let userVote = 0;
    if (user) {
      const { data: voteData } = await supabase
        .from('web_article_votes')
        .select('vote')
        .eq('article_id', articleId)
        .eq('user_id', user.id)
        .single();

      userVote = voteData?.vote || 0;
    }

    return NextResponse.json({
      articleId,
      upvotes: scoreData?.upvotes || 0,
      downvotes: scoreData?.downvotes || 0,
      score: scoreData?.score || 0,
      voterCount: scoreData?.voter_count || 0,
      userVote,
    });
  } catch (error) {
    console.error('Flare score API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

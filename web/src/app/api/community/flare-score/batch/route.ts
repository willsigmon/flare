import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articleIds } = body;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ scores: {} });
    }

    // Limit to prevent abuse
    const limitedIds = articleIds.slice(0, 100);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all flare scores for the given article IDs
    const { data: scoresData, error } = await supabase
      .from('article_flare_scores')
      .select('*')
      .in('article_id', limitedIds);

    if (error) {
      console.error('Error fetching flare scores:', error);
      return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
    }

    // If user is logged in, get their votes
    let userVotes: Record<string, number> = {};
    if (user) {
      const { data: votesData } = await supabase
        .from('web_article_votes')
        .select('article_id, vote')
        .in('article_id', limitedIds)
        .eq('user_id', user.id);

      votesData?.forEach(v => {
        userVotes[v.article_id] = v.vote;
      });
    }

    // Build response map
    const scores: Record<string, {
      articleId: string;
      upvotes: number;
      downvotes: number;
      score: number;
      voterCount: number;
      userVote: number;
    }> = {};

    scoresData?.forEach(scoreData => {
      scores[scoreData.article_id] = {
        articleId: scoreData.article_id,
        upvotes: scoreData.upvotes || 0,
        downvotes: scoreData.downvotes || 0,
        score: scoreData.score || 0,
        voterCount: scoreData.voter_count || 0,
        userVote: userVotes[scoreData.article_id] || 0,
      };
    });

    return NextResponse.json({ scores });
  } catch (error) {
    console.error('Batch flare score API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

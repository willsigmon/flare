import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET comments for an article
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        upvotes,
        downvotes,
        created_at,
        parent_id,
        user_id,
        user_profiles (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch comments error:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Build threaded structure
    const rootComments: any[] = [];
    const commentMap = new Map<string, any>();

    comments?.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments?.forEach(comment => {
      const mappedComment = commentMap.get(comment.id);
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id).replies.push(mappedComment);
      } else {
        rootComments.push(mappedComment);
      }
    });

    return NextResponse.json({ comments: rootComments });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST new comment
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { articleId, content, parentId } = body;

    if (!articleId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        article_id: articleId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      })
      .select(`
        id,
        content,
        upvotes,
        downvotes,
        created_at,
        parent_id,
        user_profiles (
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Create comment error:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Log activity
    await supabase.from('activity_events').insert({
      user_id: user.id,
      event_type: 'comment',
      article_id: articleId,
      comment_id: comment.id,
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT vote on comment
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { commentId, vote } = body; // vote: 1 or -1

    if (!commentId || ![-1, 0, 1].includes(vote)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get existing vote
    const { data: existingVote } = await supabase
      .from('comment_votes')
      .select('vote')
      .eq('user_id', user.id)
      .eq('comment_id', commentId)
      .single();

    const previousVote = existingVote?.vote || 0;

    if (vote === 0) {
      // Remove vote
      await supabase
        .from('comment_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('comment_id', commentId);
    } else {
      // Upsert vote
      await supabase
        .from('comment_votes')
        .upsert({
          user_id: user.id,
          comment_id: commentId,
          vote,
        }, { onConflict: 'user_id,comment_id' });
    }

    // Update comment counts
    const upvoteDelta = (vote === 1 ? 1 : 0) - (previousVote === 1 ? 1 : 0);
    const downvoteDelta = (vote === -1 ? 1 : 0) - (previousVote === -1 ? 1 : 0);

    if (upvoteDelta !== 0 || downvoteDelta !== 0) {
      const { data: comment } = await supabase
        .from('comments')
        .select('upvotes, downvotes')
        .eq('id', commentId)
        .single();

      await supabase
        .from('comments')
        .update({
          upvotes: (comment?.upvotes || 0) + upvoteDelta,
          downvotes: (comment?.downvotes || 0) + downvoteDelta,
        })
        .eq('id', commentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comment vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

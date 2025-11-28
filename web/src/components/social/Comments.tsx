'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  upvotes: number;
  downvotes: number;
  user_vote?: number;
  author: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  replies?: Comment[];
}

interface CommentsProps {
  articleId: string;
  articleTitle?: string;
}

export function Comments({ articleId, articleTitle }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sortBy, setSortBy] = useState<'best' | 'newest' | 'oldest'>('best');

  useEffect(() => {
    loadComments();
  }, [articleId, sortBy]);

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/social/comments?articleId=${articleId}&sort=${sortBy}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const content = parentId ? replyContent : newComment;
    if (!content.trim() || !user) return;

    try {
      const res = await fetch('/api/social/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          content: content.trim(),
          parentId,
        }),
      });

      if (res.ok) {
        if (parentId) {
          setReplyContent('');
          setReplyingTo(null);
        } else {
          setNewComment('');
        }
        loadComments();
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleVote = async (commentId: string, vote: 1 | -1) => {
    if (!user) return;

    try {
      await fetch('/api/social/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, vote }),
      });
      loadComments();
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const score = comment.upvotes - comment.downvotes;
    const maxDepth = 4;

    return (
      <div className={`${depth > 0 ? 'ml-6 pl-4 border-l-2 border-border' : ''}`}>
        <div className="py-3">
          {/* Author info */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-accent-brand flex items-center justify-center text-white text-xs font-medium">
              {comment.author?.avatar_url ? (
                <img src={comment.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                comment.author?.display_name?.substring(0, 1).toUpperCase() || '?'
              )}
            </div>
            <span className="text-sm font-medium text-text-primary">
              {comment.author?.display_name || comment.author?.username || 'Anonymous'}
            </span>
            <span className="text-xs text-text-tertiary">•</span>
            <span className="text-xs text-text-tertiary">{formatTime(comment.created_at)}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-text-primary leading-relaxed mb-2">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Voting */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVote(comment.id, 1)}
                className={`p-1 rounded hover:bg-bg-secondary transition-colors ${
                  comment.user_vote === 1 ? 'text-accent-positive' : 'text-text-tertiary'
                }`}
                disabled={!user}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3l-7 7h4v7h6v-7h4l-7-7z" />
                </svg>
              </button>
              <span className={`text-xs font-medium min-w-[20px] text-center ${
                score > 0 ? 'text-accent-positive' : score < 0 ? 'text-accent-negative' : 'text-text-tertiary'
              }`}>
                {score}
              </span>
              <button
                onClick={() => handleVote(comment.id, -1)}
                className={`p-1 rounded hover:bg-bg-secondary transition-colors ${
                  comment.user_vote === -1 ? 'text-accent-negative' : 'text-text-tertiary'
                }`}
                disabled={!user}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 17l7-7h-4V3H7v7H3l7 7z" />
                </svg>
              </button>
            </div>

            {/* Reply button */}
            {depth < maxDepth && user && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Reply
              </button>
            )}
          </div>

          {/* Reply form */}
          {replyingTo === comment.id && (
            <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg focus:border-accent-brand outline-none resize-none"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={!replyContent.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-accent-brand text-white rounded-lg hover:bg-accent-brand/90 disabled:opacity-50"
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-0">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-bg-secondary rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">
            Discussion {comments.length > 0 && `(${comments.length})`}
          </h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'best' | 'newest' | 'oldest')}
            className="text-sm bg-bg-tertiary border border-border rounded-lg px-2 py-1 text-text-secondary"
          >
            <option value="best">Best</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* New comment form */}
      <div className="px-6 py-4 border-b border-border">
        {user ? (
          <form onSubmit={(e) => handleSubmit(e)}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-accent-brand outline-none resize-none text-sm"
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-4 py-2 text-sm font-medium bg-accent-brand text-white rounded-lg hover:bg-accent-brand/90 disabled:opacity-50 transition-all"
              >
                Post Comment
              </button>
            </div>
          </form>
        ) : (
          <p className="text-center text-sm text-text-secondary py-4">
            Sign in to join the discussion
          </p>
        )}
      </div>

      {/* Comments list */}
      <div className="px-6 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-accent-brand border-t-transparent rounded-full" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm text-text-tertiary py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          <div className="divide-y divide-border">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

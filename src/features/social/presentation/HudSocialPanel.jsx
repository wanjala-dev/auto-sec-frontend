import React, { useCallback, useEffect, useState } from 'react';
import { FiSend, FiHeart, FiMessageCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../components/V2/HudCard';
import HudButton from '../../../components/V2/HudButton';
import HudText from '../../../components/V2/HudText';
import HexLoader from '../../../components/V2/HexLoader';
import RestrictedArea from '../../../components/V2/RestrictedArea';
import { workspaceFeedApi } from '../../../infrastructure/workspaceFeed/workspaceFeedApi';
import { useSeedContext } from '../../seed/presentation/SeedContext';
import { resolveStoredSummaryWorkspaceId } from '../../../domain/auth/storedSummarySelectors';
import { readViewerStoredUserSummary } from '../../auth/presentation/browserAuthSessionSupport';

const initials = (src) => {
  const s = (src || '?').toString().trim();
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  const two = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return (two || s[0] || '?').toUpperCase();
};

const authorOf = (p) =>
  p.author_name ||
  p.author?.name ||
  p.author?.display_name ||
  p.author?.username ||
  p.author_email ||
  (p.author_id ? `Operator ${String(p.author_id).slice(0, 6)}` : 'Operator');

const timeOf = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
};

/**
 * HudSocialPanel — the workspace operator feed (posts + like/comment counts) as
 * HUD panel content. Gated server-side by `feature.social_feed`; a 403 renders
 * the locked state. Reuses the V2 HUD components.
 */
export default function HudSocialPanel() {
  const { seed } = useSeedContext();
  const workspaceId =
    seed?.id ||
    seed?.pk ||
    resolveStoredSummaryWorkspaceId(readViewerStoredUserSummary()) ||
    null;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gated, setGated] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setGated(false);
    try {
      const res = await workspaceFeedApi.list(workspaceId, { limit: 30 });
      const data = res?.data?.data || res?.data || {};
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      if (e?.response?.status === 403) setGated(true);
      else setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(async () => {
    const body = draft.trim();
    if (!body || !workspaceId) return;
    setPosting(true);
    setDraft('');
    try {
      await workspaceFeedApi.create(workspaceId, {
        body,
        visibility: 'workspace'
      });
      await load();
    } catch (e) {
      toast.error(
        e?.response?.status === 403
          ? 'Feed is disabled for this workspace'
          : 'Unable to post',
        { icon: '⚠️' }
      );
    } finally {
      setPosting(false);
    }
  }, [draft, workspaceId, load]);

  if (!workspaceId) {
    return (
      <RestrictedArea
        variant="info"
        title="OPERATOR FEED"
        subtitle="NO WORKSPACE SELECTED"
      />
    );
  }

  if (gated) {
    return (
      <RestrictedArea
        variant="warning"
        title="OPERATOR FEED"
        subtitle="FEATURE LOCKED"
        message="The social feed is disabled for this workspace (feature.social_feed)."
      />
    );
  }

  return (
    <div className="mx-auto flex h-[60vh] w-full max-w-2xl flex-col">
      {/* Composer */}
      <HudCard
        chamfer={12}
        border="cyan"
        surface="bg-hud-surface/60"
        bodyClassName="p-3"
        className="mb-3"
      >
        <p className="mb-2 font-mono text-[9px] tracking-wider text-hud-dim">
          POST TO OPERATORS
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Share an update, IOC, or hand-off…"
          rows={2}
          className="w-full resize-none border border-hud-line/[0.08] bg-hud-surface/30 px-3 py-2 font-mono text-[12px] text-hud-text outline-none transition placeholder:text-hud-dim focus:border-hud-line/20"
        />
        <div className="mt-2 flex justify-end">
          <HudButton
            variant="primary"
            icon={<FiSend size={12} />}
            disabled={posting || !draft.trim()}
            onClick={submit}
          >
            {posting ? 'Posting…' : 'Post'}
          </HudButton>
        </div>
      </HudCard>

      {/* Feed */}
      <div className="flex-1 space-y-2 overflow-y-auto cc-scrollbar pr-1">
        {loading ? (
          <div className="flex justify-center py-10">
            <HexLoader size={52} />
          </div>
        ) : posts.length === 0 ? (
          <RestrictedArea
            variant="info"
            title="NO POSTS YET"
            subtitle="BE THE FIRST"
            message="Share the first update with your operators."
          />
        ) : (
          posts.map((p) => <FeedPostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}

/* ── One feed post — like toggle + expandable comments. ── */
function FeedPostCard({ post }) {
  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [busyLike, setBusyLike] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const toggleLike = useCallback(async () => {
    if (busyLike) return;
    setBusyLike(true);
    // optimistic
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await workspaceFeedApi.toggleLike(post.id);
      const d = res?.data?.data;
      if (d) {
        setLiked(!!d.liked);
        setLikeCount(d.like_count);
      }
    } catch {
      // rollback
      setLiked(liked);
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
      toast.error('Unable to update like', { icon: '⚠️' });
    } finally {
      setBusyLike(false);
    }
  }, [busyLike, liked, post.id]);

  const openComments = useCallback(async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await workspaceFeedApi.listComments(post.id);
        setComments(res?.data?.data || []);
      } catch {
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    }
  }, [showComments, comments.length, post.id]);

  const addComment = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setDraft('');
    try {
      const res = await workspaceFeedApi.addComment(post.id, body);
      const c = res?.data?.data;
      if (c) {
        setComments((prev) => [c, ...prev]);
        setCommentCount((n) => n + 1);
      }
    } catch {
      toast.error('Unable to comment', { icon: '⚠️' });
    } finally {
      setPosting(false);
    }
  }, [draft, post.id]);

  return (
    <HudCard
      chamfer={10}
      border="cyan"
      surface="bg-hud-surface/50"
      bodyClassName="p-3"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-hud-line/30 bg-hud-surface-2 font-mono text-[9px] font-bold text-hud-accent">
          {initials(authorOf(post))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[11px] text-hud-text">
            {authorOf(post)}
          </span>
          <span className="block font-mono text-[8px] text-hud-dim">
            {timeOf(post.created_on)}
            {post.edited_on ? ' · edited' : ''}
          </span>
        </span>
        {post.is_pinned && (
          <span className="border border-amber-500/30 bg-amber-500/[0.06] px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-wider text-amber-400">
            PINNED
          </span>
        )}
      </div>
      <HudText
        variant="bodySmall"
        color="light"
        className="leading-snug whitespace-pre-wrap"
      >
        {post.body}
      </HudText>
      <div className="mt-2 flex items-center gap-4">
        <button
          type="button"
          aria-label="Like post"
          onClick={toggleLike}
          disabled={busyLike}
          className={`flex items-center gap-1 font-mono text-[9px] transition ${
            liked ? 'text-rose-400' : 'text-hud-dim hover:text-hud-accent'
          }`}
        >
          <FiHeart size={11} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
        </button>
        <button
          type="button"
          aria-label="Toggle comments"
          onClick={openComments}
          className={`flex items-center gap-1 font-mono text-[9px] transition ${
            showComments ? 'text-hud-accent' : 'text-hud-dim hover:text-hud-accent'
          }`}
        >
          <FiMessageCircle size={11} /> {commentCount}
        </button>
      </div>

      {showComments && (
        <div className="mt-2 border-t border-hud-line/10 pt-2">
          <div className="mb-2 flex items-end gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addComment();
              }}
              placeholder="Reply…"
              className="flex-1 border border-hud-line/[0.08] bg-hud-surface/30 px-2 py-1 font-mono text-[11px] text-hud-text outline-none placeholder:text-hud-dim focus:border-hud-line/20"
            />
            <button
              type="button"
              onClick={addComment}
              disabled={posting || !draft.trim()}
              className="border border-hud-accent/30 bg-hud-accent/[0.06] px-2 py-1 font-mono text-[9px] text-hud-accent transition hover:bg-hud-accent/[0.12] disabled:opacity-40"
            >
              <FiSend size={11} />
            </button>
          </div>
          {loadingComments ? (
            <div className="flex justify-center py-3">
              <HexLoader size={28} />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-1 font-mono text-[9px] text-hud-dim">
              No replies yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-hud-line/25 bg-hud-surface-2 font-mono text-[7px] font-bold text-hud-accent">
                    {initials(c.author_name)}
                  </span>
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-hud-text">
                      {c.author_name || 'Operator'}
                    </span>{' '}
                    <span className="font-mono text-[7px] text-hud-dim">
                      {timeOf(c.created_on)}
                    </span>
                    <p className="font-mono text-[10px] text-hud-dim whitespace-pre-wrap">
                      {c.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </HudCard>
  );
}

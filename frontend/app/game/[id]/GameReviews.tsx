'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import LikeButton from '@/components/reviews/LikeButton';
import UserAvatar from '@/components/ui/UserAvatar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  overall: number;
  review_text: string;
  rated_at: string;
  username: string;
  avatarUrl: string | null;
  userId: string;
  hours_played: number | null;
  likeCount: number;
  commentCount: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatarUrl: string | null;
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ value, id: baseId, size = 'md' }: { value: number; id: string; size?: 'sm' | 'md' }) {
  const stars = value / 2;
  const sz    = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  return (
    <span className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(s => {
        const full = stars >= s;
        const half = !full && stars >= s - 0.5;
        const uid  = `star-${baseId}-${s}`;
        return (
          <svg key={s} className={sz} viewBox="0 0 24 24">
            {half && (
              <defs>
                <clipPath id={uid}>
                  <rect x="0" y="0" width="50%" height="100%" />
                </clipPath>
              </defs>
            )}
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={full || half ? '#4ade80' : 'none'}
              stroke={full || half ? 'none' : '#374151'}
              strokeWidth="1.5"
              strokeLinejoin="round"
              clipPath={half ? `url(#${uid})` : undefined}
            />
            {half && (
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round"
              />
            )}
          </svg>
        );
      })}
    </span>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────

function CommentsSection({ ratingId, initialCount, reviewOwnerId }: { ratingId: string; initialCount: number; reviewOwnerId: string }) {
  const { user } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [text,     setText]     = useState('');
  const [posting,  setPosting]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [count,    setCount]    = useState(initialCount);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function loadComments() {
    setLoading(true);
    const { data: cData } = await supabase
      .from('review_comments')
      .select('id, content, created_at, user_id')
      .eq('rating_id', ratingId)
      .order('created_at', { ascending: true });

    if (!cData) { setLoading(false); return; }

    const userIds = [...new Set(cData.map((c: { user_id: string }) => c.user_id))];
    const { data: users } = await supabase.from('users').select('id, username').in('id', userIds);
    const usersMap = new Map((users ?? []).map((u: { id: string; username: string }) => [u.id, u.username]));

    setComments(cData.map((c: { id: string; content: string; created_at: string; user_id: string }) => ({
      ...c,
      username: usersMap.get(c.user_id) ?? 'Usuario',
      avatarUrl: null,
    })));
    setLoading(false);
  }

  function toggle() {
    if (!open) loadComments();
    setOpen(v => !v);
  }

  async function submit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault();
    if (!user || !text.trim() || posting) return;
    setPosting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('review_comments')
      .insert({ rating_id: ratingId, user_id: user.id, content: text.trim() })
      .select('id, content, created_at, user_id')
      .single();

    if (insertError) {
      console.error('Comment insert error:', insertError);
      setError('No se pudo enviar. Intentá de nuevo.');
      setPosting(false);
      return;
    }

    if (data) {
      const { data: u } = await supabase.from('users').select('username').eq('id', user.id).maybeSingle();
      setComments(prev => [...prev, { ...data, username: u?.username ?? 'tú', avatarUrl: null }]);
      setCount(prev => prev + 1);
      setText('');
      // Notify review owner if it's not the commenter's own review
      if (user.id !== reviewOwnerId) {
        await supabase.from('notifications').insert({
          user_id:      reviewOwnerId,
          from_user_id: user.id,
          type:         'comment',
          entity_id:    ratingId,
        });
      }
    }
    setPosting(false);
  }

  async function deleteComment(id: string) {
    await supabase.from('review_comments').delete().eq('id', id);
    setComments(prev => prev.filter(c => c.id !== id));
    setCount(prev => Math.max(0, prev - 1));
  }

  function timeAgo(d: string) {
    const diff  = Date.now() - new Date(d).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 60)  return `hace ${mins}m`;
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${days}d`;
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {count > 0 ? `${count} comentario${count !== 1 ? 's' : ''}` : 'Comentar'}
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-l-2 border-border pl-4">
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2].map(i => <div key={i} className="h-6 rounded bg-surface" />)}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-600">Sé el primero en comentar.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex items-start gap-2 group/comment">
                <Link
                  href={`/user/${c.username}`}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface border border-border text-[10px] font-bold text-gray-400 hover:text-accent transition-colors"
                >
                  {c.username[0]?.toUpperCase()}
                </Link>
                <div className="flex-1 min-w-0 text-xs">
                  <Link href={`/user/${c.username}`} className="font-semibold text-gray-300 hover:text-accent transition-colors mr-1.5">
                    {c.username}
                  </Link>
                  <span className="text-gray-400">{c.content}</span>
                  <span className="text-[10px] text-gray-700 ml-1.5">{timeAgo(c.created_at)}</span>
                </div>
                {user?.id === c.user_id && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="opacity-0 group-hover/comment:opacity-100 text-[10px] text-gray-700 hover:text-red-400 transition-all flex-shrink-0"
                  >✕</button>
                )}
              </div>
            ))
          )}

          {user ? (
            <div className="flex items-start gap-2 mt-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent border border-accent/30">
                {user.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <textarea
                    value={text}
                    onChange={e => { setText(e.target.value); setError(null); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder="Añadí un comentario..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-accent/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => submit()}
                    className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors relative z-10 ${
                      !text.trim() || posting
                        ? 'bg-accent/40 cursor-not-allowed'
                        : 'bg-accent hover:bg-orange-500'
                    }`}
                  >
                    {posting ? '...' : 'Enviar'}
                  </button>
                </div>
                {error && <p className="text-[10px] text-red-400">{error}</p>}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600">
              <Link href="/login" className="text-accent hover:underline">Iniciá sesión</Link> para comentar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────

function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="border-b border-border/40 pb-7 last:border-0">
      <div className="flex items-start gap-4">

        {/* Avatar */}
        <Link href={`/user/${r.username}`} className="flex-shrink-0">
          <UserAvatar username={r.username} avatarUrl={r.avatarUrl} size="md" className="hover:ring-2 hover:ring-accent transition-all" />
        </Link>

        <div className="flex-1 min-w-0">
          {/* "Review by username  ★★★½" inline */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="text-sm text-gray-400">
              Reseña de{' '}
              <Link href={`/user/${r.username}`} className="font-bold text-white hover:text-accent transition-colors">
                {r.username}
              </Link>
            </p>
            <Stars value={r.overall} id={r.id} size="md" />
            {r.likeCount > 0 && (
              <span className="text-[11px] text-gray-600">· {r.likeCount} {r.likeCount === 1 ? 'like' : 'likes'}</span>
            )}
          </div>

          {/* Hours */}
          {r.hours_played && r.hours_played > 0 && (
            <p className="text-xs text-gray-600 mt-0.5">{r.hours_played}h jugadas</p>
          )}

          {/* Review text */}
          <p className="mt-3 text-sm leading-relaxed text-gray-300">{r.review_text}</p>

          {/* Actions: "♥ Like review  · 💬 X comentarios" */}
          <div className="flex items-center gap-6 mt-4 pt-1">
            <LikeButton ratingId={r.id} reviewOwnerId={r.userId} size="md" />
            <CommentsSection ratingId={r.id} initialCount={r.commentCount} reviewOwnerId={r.userId} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{title}</p>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

// ── Review column (one of the three boxes) ───────────────────────────────────

function ReviewColumn({ title, reviews, empty }: { title: string; reviews: Review[]; empty: string }) {
  return (
    <div>
      {/* Header with line */}
      <div className="flex items-center gap-3 mb-5 border-b border-border pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      </div>

      {reviews.length === 0 ? (
        <p className="text-xs text-gray-600 py-4 text-center">{empty}</p>
      ) : (
        <div className="space-y-6">
          {reviews.map(r => <ReviewCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GameReviews({ rawgId }: { rawgId: number }) {
  const { user } = useAuth();
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [friendIds,  setFriendIds]  = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (user) {
      supabase.from('follows').select('following_id').eq('follower_id', user.id)
        .then(({ data }) => {
          if (data) setFriendIds(new Set(data.map((f: { following_id: string }) => f.following_id)));
        });
    }
  }, [user]);

  useEffect(() => {
    async function load() {
      const { data: game } = await supabase
        .from('games').select('id')
        .or(`rawg_id.eq.${rawgId},steam_app_id.eq.${rawgId}`)
        .maybeSingle();

      if (!game) { setLoading(false); return; }

      const { data: ugs } = await supabase
        .from('user_games').select('id, hours_played, user_id').eq('game_id', game.id);

      if (!ugs || ugs.length === 0) { setLoading(false); return; }

      const ugIds = ugs.map((u: { id: string }) => u.id);
      const ugMap = new Map(ugs.map((u: { id: string; hours_played: number | null; user_id: string }) => [u.id, u]));

      const { data: ratings } = await supabase
        .from('ratings').select('id, overall, review_text, rated_at, user_game_id')
        .in('user_game_id', ugIds)
        .not('review_text', 'is', null).not('review_text', 'eq', '')
        .not('overall', 'is', null)
        .order('rated_at', { ascending: false })
        .limit(30);

      if (!ratings || ratings.length === 0) { setLoading(false); return; }

      const ratingIds = ratings.map((r: { id: string }) => r.id);

      const [likesRes, commentsRes, usersRes] = await Promise.all([
        supabase.from('review_likes').select('rating_id').in('rating_id', ratingIds),
        supabase.from('review_comments').select('rating_id').in('rating_id', ratingIds),
        supabase.from('users').select('id, username, avatar_url').in('id', [...new Set(ugs.map((u: { user_id: string }) => u.user_id))]),
      ]);

      const likeCounts    = new Map<string, number>();
      const commentCounts = new Map<string, number>();
      (likesRes.data ?? []).forEach((l: { rating_id: string }) =>
        likeCounts.set(l.rating_id, (likeCounts.get(l.rating_id) ?? 0) + 1));
      (commentsRes.data ?? []).forEach((c: { rating_id: string }) =>
        commentCounts.set(c.rating_id, (commentCounts.get(c.rating_id) ?? 0) + 1));

      const usersMap = new Map((usersRes.data ?? []).map((u: { id: string; username: string; avatar_url: string | null }) => [u.id, u]));

      setAllReviews(ratings.map((r: { id: string; overall: number; review_text: string; rated_at: string; user_game_id: string }) => {
        const ug   = ugMap.get(r.user_game_id) as { hours_played: number | null; user_id: string } | undefined;
        const uRow = usersMap.get(ug?.user_id ?? '');
        return {
          id:           r.id,
          overall:      r.overall,
          review_text:  r.review_text,
          rated_at:     r.rated_at,
          username:     uRow?.username ?? 'Usuario',
          avatarUrl:    uRow?.avatar_url ?? null,
          userId:       ug?.user_id ?? '',
          hours_played: ug?.hours_played ?? null,
          likeCount:    likeCounts.get(r.id) ?? 0,
          commentCount: commentCounts.get(r.id) ?? 0,
        };
      }));
      setLoading(false);
    }
    load();
  }, [rawgId]);

  if (loading) return (
    <div id="reviews" className="space-y-6 scroll-mt-20">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Reseñas de la comunidad</p>
      {[1, 2].map(i => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-surface" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-48 rounded bg-surface" />
            <div className="h-3 w-full rounded bg-surface" />
            <div className="h-3 w-3/4 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );

  // Always split into three independent groups
  const friendReviews  = allReviews.filter(r => friendIds.has(r.userId)).slice(0, 3);
  const popularReviews = [...allReviews]
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 3);
  const recentReviews  = [...allReviews]
    .sort((a, b) => new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime())
    .slice(0, 3);

  return (
    <div id="reviews" className="scroll-mt-20 space-y-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
        Reseñas de la comunidad
        {allReviews.length > 0 && <span className="ml-2 text-gray-700">({allReviews.length})</span>}
      </p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* Amigos */}
        <ReviewColumn
          title="De amigos"
          reviews={friendReviews}
          empty={!user ? 'Iniciá sesión para ver reseñas de amigos' : 'Nadie que seguís reseñó este juego'}
        />

        {/* Populares */}
        <ReviewColumn
          title="Más populares"
          reviews={popularReviews}
          empty="Todavía no hay reseñas"
        />

        {/* Recientes */}
        <ReviewColumn
          title="Más recientes"
          reviews={recentReviews}
          empty="Todavía no hay reseñas"
        />

      </div>
    </div>
  );
}

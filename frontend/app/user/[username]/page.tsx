'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import GameCoverImage from '@/components/games/GameCoverImage';
import FollowButton from '@/components/social/FollowButton';
import UserAvatar from '@/components/ui/UserAvatar';

interface UserProfile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
}

interface GameEntry {
  status: string;
  hours_played: number | null;
  updated_at: string;
  games: { id: string; name: string; rawg_id: number | null; steam_app_id: number; cover_url: string | null };
  ratings: Array<{ id: string; overall: number; review_text: string | null; rated_at: string }>;
}

function Stars({ value, ratingId }: { value: number; ratingId: string }) {
  const stars = value / 2;
  return (
    <span className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(s => {
        const full = stars >= s;
        const half = !full && stars >= s - 0.5;
        const uid  = `prof-${ratingId}-${s}`;
        return (
          <svg key={s} className="h-3.5 w-3.5" viewBox="0 0 24 24">
            {half && <defs><clipPath id={uid}><rect x="0" y="0" width="50%" height="100%" /></clipPath></defs>}
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={full ? '#4ade80' : 'none'} stroke={full ? 'none' : '#374151'} strokeWidth="1.5" strokeLinejoin="round" />
            {half && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#4ade80" clipPath={`url(#${uid})`} />}
            {half && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />}
          </svg>
        );
      })}
    </span>
  );
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();

  const [profile,         setProfile]         = useState<UserProfile | null>(null);
  const [games,           setGames]           = useState<GameEntry[]>([]);
  const [followerCount,   setFollowerCount]   = useState(0);
  const [followingCount,  setFollowingCount]  = useState(0);
  const [fetching,        setFetching]        = useState(true);
  const [notFound,        setNotFound]        = useState(false);
  const [modal,           setModal]           = useState<'followers' | 'following' | null>(null);
  const [modalUsers,      setModalUsers]      = useState<Array<{ id: string; username: string; avatar_url: string | null; bio: string | null }>>([]);
  const [modalLoading,    setModalLoading]    = useState(false);

  useEffect(() => {
    async function load() {
      const { data: u } = await supabase.from('users').select('id, username, bio, avatar_url').eq('username', username).maybeSingle();
      if (!u) { setNotFound(true); setFetching(false); return; }
      setProfile(u);

      const [gamesRes, followersRes, followingRes] = await Promise.all([
        supabase.from('user_games').select(`
          status, hours_played, updated_at,
          games!inner ( id, name, rawg_id, steam_app_id, cover_url ),
          ratings ( id, overall, review_text, rated_at )
        `).eq('user_id', u.id).neq('status', 'wishlist').order('updated_at', { ascending: false }).limit(40),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', u.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', u.id),
      ]);

      setGames((gamesRes.data ?? []) as unknown as GameEntry[]);
      setFollowerCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setFetching(false);
    }
    load();
  }, [username]);

  async function openModal(type: 'followers' | 'following') {
    if (!profile) return;
    setModal(type);
    setModalLoading(true);
    setModalUsers([]);
    if (type === 'followers') {
      const { data } = await supabase
        .from('follows')
        .select('users!follower_id ( id, username, avatar_url, bio )')
        .eq('following_id', profile.id)
        .limit(50);
      setModalUsers((data ?? []).map((r: { users: { id: string; username: string; avatar_url: string | null; bio: string | null } }) => r.users));
    } else {
      const { data } = await supabase
        .from('follows')
        .select('users!following_id ( id, username, avatar_url, bio )')
        .eq('follower_id', profile.id)
        .limit(50);
      setModalUsers((data ?? []).map((r: { users: { id: string; username: string; avatar_url: string | null; bio: string | null } }) => r.users));
    }
    setModalLoading(false);
  }

  if (fetching) return (
    <div className="py-10 space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-surface" />
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {Array.from({length: 16}).map((_,i) => <div key={i} className="aspect-[2/3] rounded bg-surface" />)}
      </div>
    </div>
  );

  if (notFound) return (
    <div className="py-20 text-center">
      <p className="text-4xl mb-3">👤</p>
      <p className="text-gray-400 font-semibold">Usuario no encontrado</p>
      <p className="text-sm text-gray-600 mt-1">@{username} no existe en Playlog</p>
    </div>
  );

  if (!profile) return null;

  const completed  = games.filter(g => g.status === 'completed');
  const thisYear   = games.filter(g => new Date(g.updated_at).getFullYear() === new Date().getFullYear());
  const withRating = games.filter(g => g.ratings?.[0]?.overall);
  const totalHours = games.reduce((sum, g) => sum + (g.hours_played ?? 0), 0);

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="space-y-0">

      {/* ── Banner de covers ── */}
      {games.length > 0 && (
        <div className="-mx-6 relative h-36 overflow-hidden flex gap-0.5">
          {games.slice(0, 12).map((entry, i) => (
            <div key={i} className="flex-1 min-w-0 relative overflow-hidden">
              <GameCoverImage
                steamAppId={entry.games.steam_app_id}
                coverUrl={entry.games.cover_url}
                name={entry.games.name}
                className="object-cover scale-125"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-bg" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/60 via-transparent to-bg/60" />
        </div>
      )}

      {/* ── Header ── */}
      <div className={`px-0 pb-6 ${games.length > 0 ? '-mt-14' : 'pt-8'}`}>
        <div className="flex items-end gap-5">
          <div className="h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-bg shadow-xl">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
              : <div className="h-full w-full flex items-center justify-center bg-accent/20 text-3xl font-black text-accent">{profile.username[0]?.toUpperCase()}</div>
            }
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-white drop-shadow-lg">{profile.username}</h1>

              {!isOwnProfile && (
                <FollowButton
                  targetUserId={profile.id}
                  onCountChange={d => setFollowerCount(prev => prev + d)}
                />
              )}
              {isOwnProfile && (
                <Link href="/profile" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-accent transition-colors border border-border rounded-lg px-3 py-1.5">
                  Editar perfil
                </Link>
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-gray-400 mt-1.5 max-w-md">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Stats — estilo Letterboxd */}
        <div className="mt-5 border-t border-b border-border/60 py-3 flex items-center justify-around">
          {[
            { label: 'Juegos',     value: games.length,   onClick: null                           },
            { label: 'Este año',   value: thisYear.length, onClick: null                           },
            { label: 'Siguiendo',  value: followingCount,  onClick: () => openModal('following')   },
            { label: 'Seguidores', value: followerCount,   onClick: () => openModal('followers')   },
          ].map((s, i) => (
            s.onClick
              ? <button key={i} onClick={s.onClick} className="flex flex-col items-center gap-0.5 px-2 hover:opacity-75 transition-opacity cursor-pointer" style={{ background: 'none', border: 'none' }}>
                  <span className="text-xl font-black text-white leading-none">{s.value}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-accent whitespace-nowrap">{s.label}</span>
                </button>
              : <div key={i} className="flex flex-col items-center gap-0.5 px-2">
                  <span className="text-xl font-black text-white leading-none">{s.value}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{s.label}</span>
                </div>
          ))}
        </div>
      </div>

      {/* ── Biblioteca ── */}
      {games.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-10">Este usuario no tiene juegos registrados</p>
      ) : (
        <div className="space-y-3 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Biblioteca · {games.length} juegos</p>
          <div className="grid grid-cols-5 gap-x-2 gap-y-4 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11">
            {games.map((entry, i) => {
              const gameId = entry.games.rawg_id ?? entry.games.steam_app_id;
              const rating = entry.ratings?.[0]?.overall;
              const statusColor: Record<string, string> = {
                completed: 'border-[#4ade80]/60',
                playing:   'border-accent/60',
                on_hold:   'border-yellow-600/60',
                abandoned: 'border-red-800/60',
              };
              return (
                <Link key={i} href={`/game/${gameId}`} className="group block">
                  <div className={`relative aspect-[2/3] overflow-hidden rounded-lg border transition-all group-hover:shadow-lg group-hover:shadow-black/50 ${statusColor[entry.status] ?? 'border-border/50'} group-hover:border-accent/70`}>
                    <GameCoverImage
                      steamAppId={entry.games.steam_app_id}
                      coverUrl={entry.games.cover_url}
                      name={entry.games.name}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {rating && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-1 pt-3 pb-0.5 text-center">
                        <span className="text-[9px] font-bold text-[#4ade80]">{(rating/2).toFixed(1)}★</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Reseñas ── */}
      {(() => {
        const reviews = games
          .filter(g => g.ratings?.[0]?.review_text)
          .sort((a, b) => new Date(b.ratings[0].rated_at).getTime() - new Date(a.ratings[0].rated_at).getTime());
        if (reviews.length === 0) return null;
        return (
          <div className="space-y-3 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Reseñas · {reviews.length}</p>
            <div className="divide-y divide-border/50">
              {reviews.map((entry, i) => {
                const gameId = entry.games.rawg_id ?? entry.games.steam_app_id;
                const r = entry.ratings[0];
                return (
                  <div key={i} className="flex gap-4 py-5">
                    {/* Cover miniatura */}
                    <Link href={`/game/${gameId}`} className="flex-shrink-0">
                      <div className="relative h-20 w-14 overflow-hidden rounded-lg border border-border/50 hover:border-accent/60 transition-colors">
                        <GameCoverImage
                          steamAppId={entry.games.steam_app_id}
                          coverUrl={entry.games.cover_url}
                          name={entry.games.name}
                          className="object-cover"
                        />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/game/${gameId}`} className="font-black text-white hover:text-accent transition-colors text-sm">
                          {entry.games.name}
                        </Link>
                        <Stars value={r.overall} ratingId={r.id} />
                      </div>
                      {entry.hours_played && entry.hours_played > 0 && (
                        <p className="text-[10px] text-gray-600 mt-0.5">{entry.hours_played}h jugadas</p>
                      )}
                      <Link href={`/game/${gameId}#reviews`} className="block mt-2 group/rev">
                        <p className="text-sm leading-relaxed text-gray-400 line-clamp-4 group-hover/rev:text-gray-300 transition-colors">
                          {r.review_text}
                        </p>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Modal seguidores/siguiendo ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">
                {modal === 'followers' ? 'Seguidores' : 'Siguiendo'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto max-h-96 divide-y divide-border/50">
              {modalLoading ? (
                <div className="py-8 text-center text-sm text-gray-500 animate-pulse">Cargando...</div>
              ) : modalUsers.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  {modal === 'followers' ? 'Sin seguidores aún' : 'No sigue a nadie aún'}
                </div>
              ) : modalUsers.map(u => (
                <Link
                  key={u.id}
                  href={`/user/${u.username}`}
                  onClick={() => setModal(null)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface/80 transition-colors"
                >
                  <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white">{u.username}</p>
                    {u.bio && <p className="text-xs text-gray-500 line-clamp-1">{u.bio}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import Link from 'next/link';
import FollowButton from './FollowButton';

interface UserEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Props {
  title: string;
  users: UserEntry[];
  loading: boolean;
  emptyText: string;
  onClose: () => void;
}

export default function UserListModal({ title, users, loading, emptyText, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md overflow-hidden"
        style={{
          background: '#1c2028',
          border: '1px solid #2c3440',
          borderRadius: '20px 20px 0 0',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar — solo mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#2c3440' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2c3440' }}>
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffffff' }}>
              {title}
            </h2>
            {!loading && (
              <p style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ width: 32, height: 32, borderRadius: 8, background: '#2c3440', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="space-y-1 p-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse rounded-xl p-3" style={{ background: '#14181c' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2c3440', flexShrink: 0 }} />
                  <div className="flex-1 space-y-2">
                    <div style={{ height: 12, width: '40%', borderRadius: 6, background: '#2c3440' }} />
                    <div style={{ height: 10, width: '60%', borderRadius: 6, background: '#2c3440' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-14 text-center">
              <p style={{ fontSize: 32, marginBottom: 10 }}>👾</p>
              <p style={{ fontSize: 14, color: '#6b7280' }}>{emptyText}</p>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {users.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl transition-colors hover:bg-white/5"
                  style={{ padding: '10px 12px' }}
                >
                  {/* Avatar */}
                  <Link href={`/user/${u.username}`} onClick={onClose} className="flex-shrink-0">
                    <div
                      style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid #2c3440', background: 'rgba(232,93,4,0.15)', flexShrink: 0 }}
                    >
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#e85d04' }}>
                            {u.username[0]?.toUpperCase()}
                          </div>
                      }
                    </div>
                  </Link>

                  {/* Info */}
                  <Link href={`/user/${u.username}`} onClick={onClose} className="flex-1 min-w-0">
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#ffffff', lineHeight: 1.3 }}>
                      {u.username}
                    </p>
                    {u.bio && (
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }} className="line-clamp-1">
                        {u.bio}
                      </p>
                    )}
                  </Link>

                  {/* Follow */}
                  <div className="flex-shrink-0">
                    <FollowButton targetUserId={u.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safe area mobile */}
        <div className="sm:hidden" style={{ height: 12 }} />
      </div>
    </div>
  );
}

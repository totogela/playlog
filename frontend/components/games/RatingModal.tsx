'use client';

import { useState } from 'react';
import type { GameStatus } from '@/lib/supabase';

interface Props {
  gameName: string;
  initialStatus?: GameStatus;
  initialData?: {
    overall: number; story: number; gameplay: number;
    difficulty: number; graphics: number; music: number;
    review_text: string; hours: number;
  };
  onSave: (data: {
    status: GameStatus; overall: number; story: number; gameplay: number;
    difficulty: number; graphics: number; music: number;
    review_text: string; hours: number;
  }) => Promise<void>;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: GameStatus; label: string; emoji: string }[] = [
  { value: 'playing',   label: 'Jugando',    emoji: '🎮' },
  { value: 'completed', label: 'Terminado',  emoji: '✅' },
  { value: 'abandoned', label: 'Abandonado', emoji: '💀' },
  { value: 'on_hold',   label: 'En pausa',   emoji: '⏸️' },
  { value: 'wishlist',  label: 'Wishlist',   emoji: '📋' },
];

const CATEGORIES = [
  { key: 'story',      label: 'Historia'   },
  { key: 'gameplay',   label: 'Gameplay'   },
  { key: 'difficulty', label: 'Dificultad' },
  { key: 'graphics',   label: 'Gráficos'  },
  { key: 'music',      label: 'Música'     },
] as const;

// Convierte valor 1-10 a estrellas 0.5-5
const toStars = (v: number) => v / 2;
// Convierte estrellas a valor 1-10
const fromStars = (s: number) => Math.round(s * 2);

function StarRating({
  value, onChange, size = 'md',
}: {
  value: number; // 0-10
  onChange: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState<number>(0); // en escala 0-10

  const stars = toStars(value);
  const hoveredStars = toStars(hovered);
  const display = hovered > 0 ? hoveredStars : stars;

  const sizeClass = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <div
      className="flex gap-0.5"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const full = display >= star;
        const half = !full && display >= star - 0.5;

        return (
          <div key={star} className="relative cursor-pointer" style={{ lineHeight: 0 }}>
            {/* Mitad izquierda → media estrella */}
            <div
              className="absolute left-0 top-0 h-full w-1/2 z-10"
              onMouseEnter={() => setHovered((star - 0.5) * 2)}
              onClick={() => onChange((star - 0.5) * 2)}
            />
            {/* Mitad derecha → estrella entera */}
            <div
              className="absolute right-0 top-0 h-full w-1/2 z-10"
              onMouseEnter={() => setHovered(star * 2)}
              onClick={() => onChange(star * 2)}
            />

            <svg className={`${sizeClass}`} viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`g-${star}-${value}-${hovered}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset={half ? '50%' : full ? '100%' : '0%'} stopColor="#f97316" />
                  <stop offset={half ? '50%' : full ? '100%' : '0%'} stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="none"
                stroke="#374151"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {(full || half) && (
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={full ? '#f97316' : `url(#g-${star}-${value}-${hovered})`}
                />
              )}
            </svg>
          </div>
        );
      })}

      {/* Valor numérico */}
      <span className="ml-2 self-center text-sm font-bold text-accent min-w-[2rem]">
        {display > 0 ? `${display % 1 === 0 ? display : display.toFixed(1)}★` : ''}
      </span>
    </div>
  );
}

export default function RatingModal({ gameName, initialStatus = 'playing', initialData, onSave, onClose }: Props) {
  const [status,     setStatus]     = useState<GameStatus>(initialStatus);
  const [overall,    setOverall]    = useState(initialData?.overall    ?? 0);
  const [story,      setStory]      = useState(initialData?.story      ?? 0);
  const [gameplay,   setGameplay]   = useState(initialData?.gameplay   ?? 0);
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? 0);
  const [graphics,   setGraphics]   = useState(initialData?.graphics   ?? 0);
  const [music,      setMusic]      = useState(initialData?.music      ?? 0);
  const [review,     setReview]     = useState(initialData?.review_text ?? '');
  const [hours,      setHours]      = useState(initialData?.hours      ?? 0);
  const [saving,     setSaving]     = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ status, overall, story, gameplay, difficulty, graphics, music, review_text: review, hours });
    } finally {
      setSaving(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-surface z-10">
          <div>
            <h2 className="font-bold text-white">Calificar juego</h2>
            <p className="text-sm text-gray-400 line-clamp-1">{gameName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Estado */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Estado</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    status === opt.value
                      ? 'bg-accent text-white'
                      : 'border border-border text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nota general */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Nota general</p>
            <StarRating value={overall} onChange={setOverall} size="lg" />
          </div>

          {/* Horas jugadas */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Horas jugadas</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                step={0.5}
                value={hours || ''}
                onChange={e => setHours(Number(e.target.value))}
                placeholder="0"
                className="w-28 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent"
              />
              <span className="text-sm text-gray-500">horas</span>
            </div>
          </div>

          {/* Por categoría */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Por categoría (opcional)</p>
            <div className="space-y-3">
              {[
                { label: 'Historia',   value: story,      set: setStory      },
                { label: 'Gameplay',   value: gameplay,   set: setGameplay   },
                { label: 'Dificultad', value: difficulty, set: setDifficulty },
                { label: 'Gráficos',  value: graphics,   set: setGraphics   },
                { label: 'Música',    value: music,      set: setMusic      },
              ].map(cat => (
                <div key={cat.label} className="flex items-center gap-4">
                  <span className="w-20 text-xs text-gray-400 shrink-0">{cat.label}</span>
                  <StarRating value={cat.value} onChange={cat.set} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Reseña */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Reseña (opcional)</p>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="¿Qué te pareció? ¿Lo recomendarías?"
              rows={3}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4 sticky bottom-0 bg-surface">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

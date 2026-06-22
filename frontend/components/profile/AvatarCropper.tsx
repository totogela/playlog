'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface Props {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onClose: () => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas is empty')), 'image/jpeg', 0.9);
  });
}

export default function AvatarCropper({ imageSrc, onCrop, onClose }: Props) {
  const [crop,   setCrop]   = useState({ x: 0, y: 0 });
  const [zoom,   setZoom]   = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  async function confirm() {
    if (!croppedArea) return;
    setLoading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedArea);
      onCrop(blob);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-white text-sm">Ajustar foto</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Área de crop */}
        <div className="relative w-full" style={{ height: 300 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Control de zoom */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-4">−</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-orange-500 h-1 cursor-pointer"
            />
            <span className="text-xs text-gray-500 w-4">+</span>
          </div>
          <p className="text-[10px] text-gray-600 text-center">Arrastrá para mover · deslizá para hacer zoom</p>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={confirm} disabled={loading}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50">
              {loading ? 'Procesando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

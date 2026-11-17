import React, { useEffect, useRef, useState } from 'react';
import { Camera, Link2, Trash2, Upload, X } from 'lucide-react';
import { OrgNode } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { PersonAvatar } from './PersonAvatar';

interface PhotoUploadModalProps {
  node: OrgNode | null;
  onClose: () => void;
  onSavePhoto: (nodeId: string, photoUrl: string | undefined) => void;
}

/**
 * Resizes and center-crops an uploaded image file to a 320x320 JPEG data URL
 * so multiple personnel photos fit comfortably in localStorage.
 */
function resizeImageToSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        reject(new Error('Format gambar tidak didukung atau berkas rusak.'));
      img.onload = () => {
        const targetSize = 320;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Kanvas tidak tersedia di peramban ini.'));
          return;
        }

        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(
          img,
          sx,
          sy,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize
        );

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  node,
  onClose,
  onSavePhoto,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!node) return;
    const current = node.photoUrl ?? '';
    setPreviewUrl(current);
    setUrlInput(current.startsWith('data:') ? '' : current);
    setErrorMsg('');
    setIsProcessing(false);
  }, [node]);

  if (!node) return null;

  const meta = DIVISION_META[node.division];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Pilih berkas gambar (JPG, PNG, atau WebP).');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    try {
      const dataUrl = await resizeImageToSquareDataUrl(file);
      setPreviewUrl(dataUrl);
      setUrlInput('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal memproses foto.'
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setPreviewUrl('');
      setErrorMsg('');
      return;
    }
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
      setErrorMsg('Masukkan tautan gambar yang valid (diawali http:// atau https://).');
      return;
    }
    setErrorMsg('');
    setPreviewUrl(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePhoto(node.id, previewUrl.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-modal-title"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-[#FAF9F6] border border-stone-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2
              id="photo-modal-title"
              className="font-display text-lg font-semibold text-stone-900"
            >
              Foto Profil Bagian
            </h2>
            <p className="text-xs text-stone-500 mt-0.5 truncate max-w-[300px]">
              {node.roleTitle} · {node.personName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal foto"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preview Block */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4">
            <PersonAvatar
              name={node.personName}
              photoUrl={previewUrl || undefined}
              meta={meta}
              size="lg"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-stone-900 truncate">
                {node.personName}
              </p>
              <p className="text-xs text-stone-500 truncate">
                {previewUrl
                  ? 'Foto siap ditampilkan pada bagan & direktori.'
                  : 'Belum ada foto terpasang (menampilkan inisial).'}
              </p>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl('');
                    setUrlInput('');
                    setErrorMsg('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800 pt-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Foto</span>
                </button>
              )}
            </div>
          </div>

          {/* Upload File Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="photo-file-input"
            />
            <label
              htmlFor="photo-file-input"
              className="w-full flex flex-col items-center justify-center gap-2 px-4 py-5 bg-white border border-dashed border-stone-300 hover:border-blue-900 hover:bg-blue-50/30 rounded-xl transition-colors cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-full bg-stone-100 text-blue-900 flex items-center justify-center">
                {isProcessing ? (
                  <Camera className="w-5 h-5" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {isProcessing
                    ? 'Memproses & menyesuaikan foto...'
                    : 'Unggah Foto dari Perangkat'}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Format JPG, PNG, atau WebP · otomatis dipotong proporsional 1:1
                </p>
              </div>
            </label>
          </div>

          {/* Optional External Image URL */}
          <div>
            <label
              htmlFor="photo-url-input"
              className="block text-xs font-medium text-stone-700 mb-1.5"
            >
              Atau Gunakan Tautan Foto (URL)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2
                  className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="photo-url-input"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3 py-2 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Pratinjau
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-red-700" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-950 disabled:opacity-50 rounded-lg cursor-pointer"
            >
              Simpan Foto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';

export const DEFAULT_PROVINCE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 136" fill="none">
  <path d="M60 6L108 24V66C108 98 86 120 60 130C34 120 12 98 12 66V24L60 6Z" fill="#1E3A8A" stroke="#D97706" stroke-width="5"/>
  <path d="M60 14L100 29V65C100 92 81 111 60 120C39 111 20 92 20 65V29L60 14Z" fill="#EFF6FF" stroke="#1E3A8A" stroke-width="2"/>
  <path d="M60 22L63.5 30.5L72.5 31L65.5 36.8L67.8 45.5L60 40.5L52.2 45.5L54.5 36.8L47.5 31L56.5 30.5L60 22Z" fill="#D97706"/>
  <path d="M55 82L57.5 48H62.5L65 82H55Z" fill="#1E3A8A"/>
  <rect x="48" y="81" width="24" height="6" rx="1.5" fill="#D97706"/>
  <path d="M30 89C38 84 46 84 54 89C62 94 70 94 78 89C82 86.5 86 85.5 90 86V94C84 96 76 98 68 95C60 92 52 92 44 95C38 97 33 96 30 94V89Z" fill="#0F766E"/>
  <path d="M32 50C26 62 28 78 40 94" stroke="#15803D" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M88 50C94 62 92 78 80 94" stroke="#D97706" stroke-width="3.2" stroke-linecap="round"/>
  <rect x="34" y="101" width="52" height="10" rx="3" fill="#1E3A8A"/>
  <path d="M40 106H80" stroke="#FDE68A" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export const DEFAULT_SCHOOL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 136" fill="none">
  <path d="M60 6L108 26V68C108 98 85 119 60 130C35 119 12 98 12 68V26L60 6Z" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="5"/>
  <path d="M60 13L101 30V68C101 93 81 112 60 121C39 112 19 93 19 68V30L60 13Z" fill="#FEF3C7" stroke="#B45309" stroke-width="2.2"/>
  <path d="M60 22C64 27 65 32 62 37C65 34 67 36 65 41C63 44 61 45 60 45C59 45 57 44 55 41C53 36 55 34 58 37C55 32 56 27 60 22Z" fill="#D97706"/>
  <rect x="57.5" y="45" width="5" height="12" rx="1.5" fill="#92400E"/>
  <path d="M30 62C39 58 50 59 58 65V95C50 90 39 89 30 92V62Z" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M90 62C81 58 70 59 62 65V95C70 90 81 89 90 92V62Z" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="60" y1="64" x2="60" y2="95" stroke="#1E3A8A" stroke-width="2.5"/>
  <line x1="36" y1="71" x2="52" y2="72" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
  <line x1="36" y1="79" x2="52" y2="80" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
  <line x1="68" y1="72" x2="84" y2="71" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
  <line x1="68" y1="80" x2="84" y2="79" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
  <path d="M34 102H86L81 112H39L34 102Z" fill="#1E3A8A"/>
</svg>`;

export function getDefaultLogoDataUri(type: 'province' | 'school'): string {
  const svg =
    type === 'province' ? DEFAULT_PROVINCE_LOGO_SVG : DEFAULT_SCHOOL_LOGO_SVG;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resizes an uploaded logo image preserving aspect ratio and transparent PNG alpha
 * so both provincial and school crests store cleanly in localStorage.
 */
export function resizeLogoToPngDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas logo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        reject(new Error('Format gambar logo tidak didukung atau rusak.'));
      img.onload = () => {
        const maxSide = 256;
        const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Kanvas tidak tersedia di peramban ini.'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

interface InstitutionLogoProps {
  type: 'province' | 'school';
  src?: string;
  alt: string;
  className?: string;
}

export const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  type,
  src,
  alt,
  className = 'w-14 h-16',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const fallbackUri = getDefaultLogoDataUri(type);
  const resolvedSrc = src && !imgError ? src : fallbackUri;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={`${className} object-contain select-none`}
    />
  );
};

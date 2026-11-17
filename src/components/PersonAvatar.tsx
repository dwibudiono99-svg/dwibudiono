import React, { useEffect, useState } from 'react';
import { DivisionMeta } from '../types/org';

interface PersonAvatarProps {
  name: string;
  photoUrl?: string;
  meta: DivisionMeta;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function getPersonInitials(name: string): string {
  const cleaned = name
    .replace(/^(Dr\.|Drs\.|Dra\.|Ir\.|H\.|Hj\.)\s*/gi, '')
    .split(',')[0]
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const SIZE_CLASSES: Record<NonNullable<PersonAvatarProps['size']>, string> = {
  xs: 'w-8 h-8 rounded-lg text-[11px]',
  sm: 'w-9 h-9 rounded-lg text-xs',
  md: 'w-11 h-11 rounded-xl text-sm',
  lg: 'w-16 h-16 rounded-xl text-lg',
};

export const PersonAvatar: React.FC<PersonAvatarProps> = ({
  name,
  photoUrl,
  meta,
  size = 'xs',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  const sizeClass = SIZE_CLASSES[size];

  if (photoUrl && !imgError) {
    return (
      <div
        className={`${sizeClass} border ${meta.borderClass} bg-stone-100 overflow-hidden shrink-0`}
      >
        <img
          src={photoUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} border ${meta.borderClass} ${meta.bgSubtleClass} ${meta.textClass} flex items-center justify-center font-display font-semibold shrink-0`}
    >
      {getPersonInitials(name)}
    </div>
  );
};

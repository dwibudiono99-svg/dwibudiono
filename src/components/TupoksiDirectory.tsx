import React from 'react';
import { ChevronRight, Camera } from 'lucide-react';
import { DivisionId, OrgNode } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { PersonAvatar } from './PersonAvatar';

interface TupoksiDirectoryProps {
  nodes: OrgNode[];
  onSelectNode: (nodeId: string) => void;
  onEditPhoto: (node: OrgNode) => void;
}

const DIVISION_ORDER: DivisionId[] = [
  'pimpinan',
  'komite',
  'tata_usaha',
  'kurikulum',
  'kesiswaan',
  'sarpras',
  'humas',
  'akademik',
];

export const TupoksiDirectory: React.FC<TupoksiDirectoryProps> = ({
  nodes,
  onSelectNode,
  onEditPhoto,
}) => {
  return (
    <section aria-label="Tupoksi dan Tata Kelola Unit" className="space-y-8">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-semibold text-stone-900">
          Pembagian Tugas Pokok & Fungsi Per Bidang
        </h2>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          Rincian mandat tata kelola, dasar hukum, serta uraian tugas masing-masing unit kerja di lingkungan sekolah sesuai standar pengelolaan pendidikan menengah.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {DIVISION_ORDER.map((divId, index) => {
          const meta = DIVISION_META[divId];
          const divNodes = nodes.filter((n) => n.division === divId);
          if (divNodes.length === 0) return null;

          return (
            <article
              key={divId}
              className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-baseline justify-between gap-4 border-b border-stone-100 pb-4">
                  <div>
                    <div className="text-xs font-medium text-stone-500">
                      <span className="font-mono-num">
                        {String(index + 1).padStart(2, '0')}.
                      </span>
                      <span className="mx-2" aria-hidden="true">·</span>
                      <span>{meta.legalBasis}</span>
                    </div>
                    <h3
                      className={`font-display text-xl font-semibold mt-1 ${meta.textClass}`}
                    >
                      {meta.label}
                    </h3>
                  </div>
                  <span className="text-xs font-mono-num text-stone-500 shrink-0">
                    {divNodes.length} Unit
                  </span>
                </div>

                <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                  {meta.description}
                </p>

                <div className="mt-5 divide-y divide-stone-100 border-t border-stone-100">
                  {divNodes.map((node) => (
                    <div key={node.id} className="py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onSelectNode(node.id)}
                          className="flex-1 min-w-0 text-left group flex items-start gap-3 cursor-pointer"
                        >
                          <PersonAvatar
                            name={node.personName}
                            photoUrl={node.photoUrl}
                            meta={meta}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-stone-900 group-hover:text-blue-900 transition-colors">
                              {node.roleTitle}
                            </div>
                            <div className="text-xs text-stone-500 mt-0.5">
                              <span>{node.personName}</span>
                              {node.nip && node.nip !== '-' && (
                                <>
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  <span className="font-mono-num">{node.nip}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPhoto(node);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-blue-900 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 shrink-0" />
                            <span>{node.photoUrl ? 'Ganti Foto' : 'Tambah Foto'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectNode(node.id)}
                            aria-label={`Lihat detail ${node.roleTitle}`}
                            className="p-1.5 text-stone-400 hover:text-blue-900 rounded-md transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {node.tupoksi.length > 0 && (
                        <ul className="mt-2.5 space-y-1 text-xs text-stone-600 pl-16 list-disc marker:text-stone-300">
                          {node.tupoksi.slice(0, 2).map((t, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {t}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

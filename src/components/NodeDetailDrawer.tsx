import React, { useState } from 'react';
import {
  X,
  Pencil,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { OrgNode } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { PersonAvatar } from './PersonAvatar';

interface NodeDetailDrawerProps {
  node: OrgNode | null;
  allNodes: OrgNode[];
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onEditNode: (node: OrgNode) => void;
  onEditPhoto: (node: OrgNode) => void;
  onAddSubordinate: (parentId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  allNodes,
  onClose,
  onSelectNode,
  onEditNode,
  onEditPhoto,
  onAddSubordinate,
  onDeleteNode,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!node) return null;

  const meta = DIVISION_META[node.division];
  const parentNode = node.parentId
    ? allNodes.find((n) => n.id === node.parentId) ?? null
    : null;
  const childrenNodes = allNodes.filter((n) => n.parentId === node.id);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/30 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside className="relative z-10 w-full max-w-lg bg-[#FAF9F6] border-l border-stone-200 h-full overflow-y-auto shadow-xl flex flex-col">
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-[13px] font-semibold tracking-wider uppercase text-stone-600">
            <span>{node.shortCode}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span className={meta.textClass}>{meta.label}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-8 flex-1">
          {/* Identity Block */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => onEditPhoto(node)}
              title={node.photoUrl ? 'Ganti foto profil' : 'Tambah foto profil'}
              className="relative group shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 cursor-pointer"
            >
              <PersonAvatar
                name={node.personName}
                photoUrl={node.photoUrl}
                meta={meta}
                size="lg"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-stone-300 shadow-sm flex items-center justify-center text-stone-700 group-hover:text-blue-900 group-hover:border-blue-900 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-stone-600 uppercase tracking-wider">
                {node.roleTitle}
              </p>
              <h2
                id="drawer-title"
                className="font-display text-2xl sm:text-[26px] font-semibold text-stone-900 mt-1 leading-snug"
              >
                {node.personName}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-stone-600">
                <span className="font-mono-num">
                  {node.nip && node.nip !== '-' ? `NIP ${node.nip}` : 'Non-NIP'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{node.status}</span>
                <span aria-hidden="true">·</span>
                <span>Pendidikan {node.education}</span>
                {node.unitHeadcount && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-medium text-stone-800">
                      {node.unitHeadcount.toLocaleString('id-ID')} Personel/Anggota
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => onEditPhoto(node)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{node.photoUrl ? 'Ganti Foto' : 'Tambah Foto'}</span>
            </button>
            <button
              type="button"
              onClick={() => onEditNode(node)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Ubah Data</span>
            </button>
            <button
              type="button"
              onClick={() => onAddSubordinate(node.id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-blue-900 text-white hover:bg-blue-950 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Sub-Unit</span>
            </button>
            {node.parentId !== null && (
              <div className="ml-auto">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteNode(node.id);
                        setConfirmDelete(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-red-700 text-white hover:bg-red-800 rounded-md cursor-pointer"
                    >
                      Konfirmasi Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Administrative Metadata Grid */}
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            <div className="px-4 py-3 grid grid-cols-3 gap-2 text-sm">
              <span className="text-stone-500">Pangkat / Jabatan</span>
              <span className="col-span-2 font-medium text-stone-900">
                {node.rank}
              </span>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-2 text-sm">
              <span className="text-stone-500">Hubungan Kerja</span>
              <span className="col-span-2 font-medium text-stone-900">
                {node.relationType === 'komando'
                  ? 'Garis Komando Langsung'
                  : 'Garis Koordinasi & Kemitraan'}
              </span>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-2 text-sm">
              <span className="text-stone-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                Lokasi Kerja
              </span>
              <span className="col-span-2 text-stone-800">{node.room}</span>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-2 text-sm">
              <span className="text-stone-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                Surel Dinas
              </span>
              <span className="col-span-2 text-stone-800 break-all">
                {node.email}
              </span>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-2 text-sm">
              <span className="text-stone-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                Ekstensi / Telp
              </span>
              <span className="col-span-2 font-mono-num text-stone-800">
                {node.phone}
              </span>
            </div>
          </div>

          {/* Tupoksi Section */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-stone-600 mb-3">
              Tugas Pokok & Fungsi (Tupoksi)
            </h3>
            {node.tupoksi.length > 0 ? (
              <ol className="space-y-2.5">
                {node.tupoksi.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-[15px] text-stone-700 leading-relaxed"
                  >
                    <span className="font-mono-num text-[13px] font-medium text-stone-500 mt-1 shrink-0">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[15px] text-stone-500 italic">
                Belum ada rincian tupoksi yang dicatat.
              </p>
            )}
          </div>

          {/* Hierarchy Links: Atasan & Bawahan */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            {parentNode && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Melapor / Berkoordinasi Kepada
                </h3>
                <button
                  type="button"
                  onClick={() => onSelectNode(parentNode.id)}
                  className="w-full text-left px-4 py-3 bg-white border border-stone-200 hover:border-blue-900/40 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-500 truncate">
                      {parentNode.roleTitle}
                    </p>
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {parentNode.personName}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-stone-400 shrink-0" />
                </button>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Unit / Pelaksana Di Bawah Koordinasi ({childrenNodes.length})
              </h3>
              {childrenNodes.length > 0 ? (
                <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
                  {childrenNodes.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => onSelectNode(child.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-stone-500 truncate">
                          {child.roleTitle}
                          {child.relationType === 'koordinasi' ? ' · Koordinasi' : ''}
                        </p>
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {child.personName}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-500">
                  Tidak memiliki sub-unit langsung di bawah jabatan ini.
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

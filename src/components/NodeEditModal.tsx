import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, Upload, X } from 'lucide-react';
import {
  DivisionId,
  EducationLevel,
  EmploymentStatus,
  OrgNode,
  RelationType,
  SchoolProfile,
} from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { PersonAvatar } from './PersonAvatar';

interface NodeEditModalProps {
  isOpen: boolean;
  editingNode: OrgNode | null;
  defaultParentId: string | null;
  allNodes: OrgNode[];
  onClose: () => void;
  onSave: (node: OrgNode, isNew: boolean) => void;
}

export const NodeEditModal: React.FC<NodeEditModalProps> = ({
  isOpen,
  editingNode,
  defaultParentId,
  allNodes,
  onClose,
  onSave,
}) => {
  const [roleTitle, setRoleTitle] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [personName, setPersonName] = useState('');
  const [nip, setNip] = useState('');
  const [rank, setRank] = useState('');
  const [education, setEducation] = useState<EducationLevel>('S1');
  const [status, setStatus] = useState<EmploymentStatus>('PNS');
  const [division, setDivision] = useState<DivisionId>('kurikulum');
  const [parentId, setParentId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<RelationType>('komando');
  const [room, setRoom] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tupoksiText, setTupoksiText] = useState('');
  const [unitHeadcount, setUnitHeadcount] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingNode) {
      setRoleTitle(editingNode.roleTitle);
      setShortCode(editingNode.shortCode);
      setPersonName(editingNode.personName);
      setNip(editingNode.nip);
      setRank(editingNode.rank);
      setEducation(editingNode.education);
      setStatus(editingNode.status);
      setDivision(editingNode.division);
      setParentId(editingNode.parentId);
      setRelationType(editingNode.relationType);
      setRoom(editingNode.room);
      setEmail(editingNode.email);
      setPhone(editingNode.phone);
      setTupoksiText(editingNode.tupoksi.join('\n'));
      setUnitHeadcount(
        editingNode.unitHeadcount ? String(editingNode.unitHeadcount) : ''
      );
      setPhotoUrl(editingNode.photoUrl ?? '');
      setPhotoError('');
    } else {
      const parent = allNodes.find((n) => n.id === defaultParentId);
      setRoleTitle('');
      setShortCode('');
      setPersonName('');
      setNip('-');
      setRank('Guru / Tenaga Kependidikan');
      setEducation('S1');
      setStatus('PNS');
      setDivision(parent ? parent.division : 'kurikulum');
      setParentId(defaultParentId ?? allNodes[0]?.id ?? null);
      setRelationType('komando');
      setRoom('Gedung Utama SMAN 9 Surabaya');
      setEmail('info@sman9surabaya.sch.id');
      setPhone('(031) 5341204');
      setTupoksiText('');
      setUnitHeadcount('');
      setPhotoUrl('');
      setPhotoError('');
    }
  }, [isOpen, editingNode, defaultParentId, allNodes]);

  if (!isOpen) return null;

  const handleModalPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Pilih berkas gambar (JPG, PNG, atau WebP).');
      return;
    }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        setPhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => setPhotoError('Format gambar tidak didukung.');
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim() || !personName.trim()) return;

    const parent = allNodes.find((n) => n.id === parentId);
    const derivedTier = editingNode
      ? editingNode.tier
      : parent
      ? (Math.min(4, parent.tier + 1) as 1 | 2 | 3 | 4)
      : 1;

    const parsedHeadcount = parseInt(unitHeadcount, 10);

    const node: OrgNode = {
      id: editingNode ? editingNode.id : `unit_${Date.now()}`,
      parentId: editingNode?.parentId === null ? null : parentId,
      relationType,
      roleTitle: roleTitle.trim(),
      shortCode:
        shortCode.trim().toUpperCase() ||
        roleTitle.trim().slice(0, 8).toUpperCase(),
      personName: personName.trim(),
      nip: nip.trim() || '-',
      rank: rank.trim() || '-',
      education,
      status,
      division,
      tier: derivedTier,
      room: room.trim() || '-',
      email: email.trim() || '-',
      phone: phone.trim() || '-',
      tupoksi: tupoksiText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      unitHeadcount:
        !Number.isNaN(parsedHeadcount) && parsedHeadcount > 0
          ? parsedHeadcount
          : undefined,
      photoUrl: photoUrl.trim() || undefined,
    };

    onSave(node, !editingNode);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="node-modal-title"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl bg-[#FAF9F6] border border-stone-200 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2
            id="node-modal-title"
            className="font-display text-lg font-semibold text-stone-900"
          >
            {editingNode ? 'Ubah Data Jabatan & Personel' : 'Tambah Jabatan / Sub-Unit'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Foto Pejabat / Bagian */}
          <div className="bg-white border border-stone-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <PersonAvatar
                name={personName || roleTitle || 'Unit'}
                photoUrl={photoUrl || undefined}
                meta={DIVISION_META[division]}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-stone-500" />
                  <span>Foto Pejabat / Bagian</span>
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                  {photoUrl ? 'Foto terpasang pada bagian ini.' : 'Opsional · unggah pas foto bagian.'}
                </p>
                {photoError && (
                  <p className="text-[11px] text-red-700 font-medium mt-0.5" role="alert">
                    {photoError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handleModalPhotoChange}
                className="hidden"
                id="edit-modal-photo-input"
              />
              <label
                htmlFor="edit-modal-photo-input"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{photoUrl ? 'Ganti Foto' : 'Tambah Foto'}</span>
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Nama Jabatan / Unit *
              </label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="cth. Koordinator Literasi Sekolah"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Kode Singkat
              </label>
              <input
                type="text"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                placeholder="cth. KOOR-GLS"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Nama Pejabat / Penanggung Jawab *
              </label>
              <input
                type="text"
                required
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Nama lengkap beserta gelar"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                NIP / NUPTK
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="19810319 200902 1 003 atau -"
                className="w-full px-3 py-2 text-sm font-mono-num bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Bidang / Divisi
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value as DivisionId)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                {Object.values(DIVISION_META).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Status Kepegawaian
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EmploymentStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="P3K PW">P3K PW</option>
                <option value="GTT">GTT</option>
                <option value="PTT">PTT</option>
                <option value="Mitra">Mitra / Komite</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Pendidikan Terakhir
              </label>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value as EducationLevel)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="S3">S3</option>
                <option value="S2">S2</option>
                <option value="S1">S1</option>
                <option value="D3">D3</option>
                <option value="SMA">SMA / Sederajat</option>
              </select>
            </div>
          </div>

          {(!editingNode || editingNode.parentId !== null) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Atasan Langsung / Induk Unit
                </label>
                <select
                  value={parentId ?? ''}
                  onChange={(e) => setParentId(e.target.value || null)}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  {allNodes
                    .filter((n) => n.id !== editingNode?.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.roleTitle} ({n.personName})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Jenis Garis Hubungan
                </label>
                <select
                  value={relationType}
                  onChange={(e) =>
                    setRelationType(e.target.value as RelationType)
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="komando">Garis Komando (Solid)</option>
                  <option value="koordinasi">Garis Koordinasi (Putus-putus)</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Pangkat / Golongan
              </label>
              <input
                type="text"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="cth. Pembina (IV/a)"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Ruang / Lokasi Kerja
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Jumlah Anggota Unit (Opsional)
              </label>
              <input
                type="number"
                min={0}
                value={unitHeadcount}
                onChange={(e) => setUnitHeadcount(e.target.value)}
                placeholder="cth. 12"
                className="w-full px-3 py-2 text-sm font-mono-num bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Surel Dinas
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Nomor Telepon / Ekstensi
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-num bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Tugas Pokok & Fungsi (1 baris per poin)
            </label>
            <textarea
              rows={4}
              value={tupoksiText}
              onChange={(e) => setTupoksiText(e.target.value)}
              placeholder="Tuliskan rincian tugas pokok dan fungsi..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-lg cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SchoolProfileModalProps {
  isOpen: boolean;
  profile: SchoolProfile;
  onClose: () => void;
  onSave: (profile: SchoolProfile) => void;
}

export const SchoolProfileModal: React.FC<SchoolProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<SchoolProfile>(profile);

  useEffect(() => {
    if (isOpen) setForm(profile);
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-modal-title"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-[#FAF9F6] border border-stone-200 rounded-2xl shadow-xl">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2
            id="school-modal-title"
            className="font-display text-lg font-semibold text-stone-900"
          >
            Identitas & SK Sekolah
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal identitas sekolah"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Nama Satuan Pendidikan
            </label>
            <input
              type="text"
              required
              value={form.schoolName}
              onChange={(e) =>
                setForm((p) => ({ ...p, schoolName: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                NPSN
              </label>
              <input
                type="text"
                value={form.npsn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, npsn: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm font-mono-num bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Tahun Ajaran
              </label>
              <input
                type="text"
                value={form.academicYear}
                onChange={(e) =>
                  setForm((p) => ({ ...p, academicYear: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm font-mono-num bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Nomor Surat Keputusan (SK)
            </label>
            <input
              type="text"
              value={form.decreeNumber}
              onChange={(e) =>
                setForm((p) => ({ ...p, decreeNumber: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm font-mono-num bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Alamat Sekolah
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Kota / Provinsi
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  setForm((p) => ({ ...p, city: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Akreditasi
              </label>
              <input
                type="text"
                value={form.accreditation}
                onChange={(e) =>
                  setForm((p) => ({ ...p, accreditation: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-lg cursor-pointer"
            >
              Simpan Identitas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

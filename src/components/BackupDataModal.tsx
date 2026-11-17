import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  History,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DivisionId,
  EducationLevel,
  EmploymentStatus,
  OrgNode,
  RelationType,
  SchoolProfile,
} from '../types/org';
import { exportDirectoryToCsv } from '../utils/exportOfficialReportPdf';

export interface LocalBackupSnapshot {
  id: string;
  createdAt: string;
  label: string;
  nodesCount: number;
  schoolName: string;
  nodes: OrgNode[];
  schoolProfile: SchoolProfile;
}

interface ParsedImportPreview {
  fileName: string;
  exportedAt?: string;
  schoolProfile?: SchoolProfile;
  nodes: OrgNode[];
  photoCount: number;
  hasLogos: boolean;
}

interface BackupDataModalProps {
  isOpen: boolean;
  nodes: OrgNode[];
  schoolProfile: SchoolProfile;
  snapshots: LocalBackupSnapshot[];
  onClose: () => void;
  onRestoreBackup: (
    importedNodes: OrgNode[],
    importedProfile?: SchoolProfile
  ) => void;
  onCreateSnapshot: (label: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

const VALID_DIVISIONS = new Set<DivisionId>([
  'pimpinan',
  'komite',
  'tata_usaha',
  'kurikulum',
  'kesiswaan',
  'sarpras',
  'humas',
  'akademik',
]);

const VALID_STATUSES = new Set<EmploymentStatus>([
  'PNS',
  'PPPK',
  'P3K PW',
  'GTT',
  'PTT',
  'Mitra',
]);

const VALID_EDUCATION = new Set<EducationLevel>([
  'S3',
  'S2',
  'S1',
  'D3',
  'SMA',
]);

function sanitizeImportedNodes(rawNodes: unknown): OrgNode[] | null {
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) return null;

  const normalized: OrgNode[] = [];
  for (const item of rawNodes) {
    if (!item || typeof item !== 'object') return null;
    const raw = item as Record<string, unknown>;
    if (
      typeof raw.id !== 'string' ||
      !raw.id.trim() ||
      typeof raw.roleTitle !== 'string' ||
      !raw.roleTitle.trim() ||
      typeof raw.personName !== 'string' ||
      !raw.personName.trim()
    ) {
      return null;
    }

    const division = VALID_DIVISIONS.has(raw.division as DivisionId)
      ? (raw.division as DivisionId)
      : 'kurikulum';
    const status = VALID_STATUSES.has(raw.status as EmploymentStatus)
      ? (raw.status as EmploymentStatus)
      : 'PNS';
    const education = VALID_EDUCATION.has(raw.education as EducationLevel)
      ? (raw.education as EducationLevel)
      : 'S1';
    const relationType: RelationType =
      raw.relationType === 'koordinasi' ? 'koordinasi' : 'komando';
    const rawTier = Number(raw.tier);
    const tier: 1 | 2 | 3 | 4 =
      rawTier === 1 || rawTier === 2 || rawTier === 3 || rawTier === 4
        ? rawTier
        : 2;

    normalized.push({
      id: raw.id.trim(),
      parentId:
        raw.parentId === null
          ? null
          : typeof raw.parentId === 'string' && raw.parentId.trim()
          ? raw.parentId.trim()
          : null,
      relationType,
      roleTitle: raw.roleTitle.trim(),
      shortCode:
        typeof raw.shortCode === 'string' && raw.shortCode.trim()
          ? raw.shortCode.trim()
          : raw.roleTitle.trim().slice(0, 8).toUpperCase(),
      personName: raw.personName.trim(),
      nip: typeof raw.nip === 'string' && raw.nip.trim() ? raw.nip.trim() : '-',
      rank:
        typeof raw.rank === 'string' && raw.rank.trim() ? raw.rank.trim() : '-',
      education,
      status,
      division,
      tier,
      room:
        typeof raw.room === 'string' && raw.room.trim() ? raw.room.trim() : '-',
      email:
        typeof raw.email === 'string' && raw.email.trim()
          ? raw.email.trim()
          : '-',
      phone:
        typeof raw.phone === 'string' && raw.phone.trim()
          ? raw.phone.trim()
          : '-',
      tupoksi: Array.isArray(raw.tupoksi)
        ? raw.tupoksi.filter((t): t is string => typeof t === 'string' && Boolean(t.trim()))
        : [],
      unitHeadcount:
        typeof raw.unitHeadcount === 'number' && raw.unitHeadcount > 0
          ? raw.unitHeadcount
          : undefined,
      photoUrl:
        typeof raw.photoUrl === 'string' && raw.photoUrl.trim()
          ? raw.photoUrl.trim()
          : undefined,
    });
  }

  return normalized;
}

function sanitizeImportedProfile(
  rawProfile: unknown
): SchoolProfile | undefined {
  if (!rawProfile || typeof rawProfile !== 'object') return undefined;
  const p = rawProfile as Record<string, unknown>;
  if (typeof p.schoolName !== 'string' || !p.schoolName.trim()) {
    return undefined;
  }
  return {
    schoolName: p.schoolName.trim(),
    provinceName:
      typeof p.provinceName === 'string' ? p.provinceName : undefined,
    provinceLogoUrl:
      typeof p.provinceLogoUrl === 'string' ? p.provinceLogoUrl : undefined,
    schoolLogoUrl:
      typeof p.schoolLogoUrl === 'string' ? p.schoolLogoUrl : undefined,
    npsn: typeof p.npsn === 'string' ? p.npsn : '-',
    address: typeof p.address === 'string' ? p.address : '-',
    city: typeof p.city === 'string' ? p.city : '-',
    academicYear:
      typeof p.academicYear === 'string' ? p.academicYear : '2026/2027',
    decreeNumber: typeof p.decreeNumber === 'string' ? p.decreeNumber : '-',
    accreditation:
      typeof p.accreditation === 'string' ? p.accreditation : 'Terakreditasi A',
    headmasterName:
      typeof p.headmasterName === 'string' ? p.headmasterName : '-',
    reportLetterNumber:
      typeof p.reportLetterNumber === 'string'
        ? p.reportLetterNumber
        : undefined,
    recipientTitle:
      typeof p.recipientTitle === 'string' ? p.recipientTitle : undefined,
    committeeChairName:
      typeof p.committeeChairName === 'string'
        ? p.committeeChairName
        : undefined,
  };
}

export const BackupDataModal: React.FC<BackupDataModalProps> = ({
  isOpen,
  nodes,
  schoolProfile,
  snapshots,
  onClose,
  onRestoreBackup,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] =
    useState<ParsedImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState('');

  if (!isOpen) return null;

  const photoCount = nodes.filter((n) => Boolean(n.photoUrl)).length;

  const handleDownloadJsonBackup = () => {
    const payload = {
      schemaVersion: 2,
      app: 'struktur-organisasi-sekolah',
      exportedAt: new Date().toISOString(),
      summary: {
        totalNodes: nodes.length,
        withPhotos: photoCount,
        hasProvinceLogo: Boolean(schoolProfile.provinceLogoUrl),
        hasSchoolLogo: Boolean(schoolProfile.schoolLogoUrl),
      },
      schoolProfile,
      nodes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `backup-struktur-${schoolProfile.npsn || 'sekolah'}-${dateStamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Berkas backup JSON lengkap berhasil diunduh.');
  };

  const handleParseBackupFile = (file?: File) => {
    if (!file) return;
    setImportError(null);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setImportError('Gagal membaca berkas backup yang dipilih.');
    };
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rawNodes = Array.isArray(parsed) ? parsed : parsed?.nodes;
        const cleanNodes = sanitizeImportedNodes(rawNodes);
        if (!cleanNodes) {
          setImportError(
            'Format JSON tidak valid. Pastikan berkas berasal dari Ekspor/Backup Struktur Organisasi Sekolah.'
          );
          setImportPreview(null);
          return;
        }
        const cleanProfile = Array.isArray(parsed)
          ? undefined
          : sanitizeImportedProfile(parsed?.schoolProfile);

        setImportPreview({
          fileName: file.name,
          exportedAt:
            typeof parsed?.exportedAt === 'string'
              ? parsed.exportedAt
              : undefined,
          schoolProfile: cleanProfile,
          nodes: cleanNodes,
          photoCount: cleanNodes.filter((n) => Boolean(n.photoUrl)).length,
          hasLogos: Boolean(
            cleanProfile?.provinceLogoUrl || cleanProfile?.schoolLogoUrl
          ),
        });
      } catch {
        setImportError(
          'Berkas JSON rusak atau tidak dapat diurai. Periksa kembali isi berkas backup.'
        );
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = (includeProfile: boolean) => {
    if (!importPreview) return;
    onCreateSnapshot('Otomatis sebelum impor backup');
    onRestoreBackup(
      importPreview.nodes,
      includeProfile ? importPreview.schoolProfile : undefined
    );
    setImportPreview(null);
    setStatusMessage(
      includeProfile && importPreview.schoolProfile
        ? `Berhasil memulihkan ${importPreview.nodes.length} unit jabatan beserta identitas & logo sekolah.`
        : `Berhasil mengimpor ${importPreview.nodes.length} unit jabatan ke struktur saat ini.`
    );
  };

  const handleSaveSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      snapshotLabel.trim() ||
      `Cadangan Manual (${new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })})`;
    onCreateSnapshot(label);
    setSnapshotLabel('');
    setStatusMessage(`Titik pemulihan "${label}" berhasil disimpan di peramban.`);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl bg-[#FAF9F6] border border-stone-200 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <DatabaseBackup className="w-5 h-5 text-blue-900" />
            <h2
              id="backup-modal-title"
              className="font-display text-lg font-semibold text-stone-900"
            >
              Ekspor, Impor &amp; Backup Data Sekolah
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal backup data"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Saat Ini */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                Total Unit
              </p>
              <p className="font-display text-xl font-semibold text-stone-900 mt-0.5 tabular-nums">
                {nodes.length}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                Foto Tersimpan
              </p>
              <p className="font-display text-xl font-semibold text-stone-900 mt-0.5 tabular-nums">
                {photoCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                Logo Kop
              </p>
              <p className="text-xs font-semibold text-blue-900 mt-1.5">
                {schoolProfile.provinceLogoUrl || schoolProfile.schoolLogoUrl
                  ? 'Kustom Terpasang'
                  : 'Standar Bawaan'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                Snapshot Lokal
              </p>
              <p className="font-display text-xl font-semibold text-stone-900 mt-0.5 tabular-nums">
                {snapshots.length}
              </p>
            </div>
          </div>

          {statusMessage && (
            <div
              role="status"
              className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {importError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-2.5 rounded-lg"
            >
              {importError}
            </div>
          )}

          {/* Bagian 1: Ekspor Backup */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              1. Ekspor / Unduh Cadangan Data
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadJsonBackup}
                className="text-left p-4 bg-blue-900 hover:bg-blue-950 text-white rounded-xl transition-colors flex items-start gap-3 cursor-pointer"
              >
                <Download className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">
                    Ekspor Backup Lengkap (.JSON)
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5 leading-relaxed">
                    Menyimpan seluruh struktur, NIP, tupoksi, foto pejabat, logo kop &amp; SK sekolah.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportDirectoryToCsv(nodes, schoolProfile);
                  setStatusMessage('Berkas tabel rekap CSV berhasil diunduh.');
                }}
                className="text-left p-4 bg-white border border-stone-300 hover:border-emerald-700 hover:bg-stone-50 text-stone-900 rounded-xl transition-colors flex items-start gap-3 cursor-pointer"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">
                    Ekspor Tabel Direktori (.CSV)
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                    Format Excel untuk arsip kepegawaian, pelaporan dinas, dan lampiran SK.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Bagian 2: Impor / Restore Backup */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              2. Impor / Pulihkan Dari Berkas Backup (.JSON)
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                handleParseBackupFile(e.target.files?.[0]);
                e.target.value = '';
              }}
              className="hidden"
              id="backup-json-import-input"
            />

            {!importPreview ? (
              <label
                htmlFor="backup-json-import-input"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleParseBackupFile(e.dataTransfer.files?.[0]);
                }}
                className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 hover:border-blue-900 bg-white rounded-xl p-6 text-center transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6 text-blue-900 mb-2" />
                <span className="text-sm font-semibold text-stone-900">
                  Pilih atau seret berkas backup (.json) ke sini
                </span>
                <span className="text-xs text-stone-500 mt-1">
                  Data akan diperiksa terlebih dahulu sebelum diterapkan ke aplikasi.
                </span>
              </label>
            ) : (
              <div className="bg-white border border-blue-900/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-900">
                      Pratinjau Berkas Backup Siap Pulih
                    </p>
                    <p className="text-sm font-semibold text-stone-900 mt-0.5">
                      {importPreview.fileName}
                    </p>
                    <p className="text-xs text-stone-600 mt-1">
                      {importPreview.schoolProfile?.schoolName ?? 'Tanpa profil sekolah'} ·{' '}
                      <strong>{importPreview.nodes.length} unit</strong> ·{' '}
                      {importPreview.photoCount} foto terpasang
                      {importPreview.hasLogos ? ' · Termasuk Logo Kop' : ''}
                    </p>
                    {importPreview.exportedAt && (
                      <p className="text-[11px] text-stone-500 font-mono-num mt-0.5">
                        Diekspor:{' '}
                        {new Date(importPreview.exportedAt).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="text-xs text-stone-500 hover:text-stone-900 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                  {importPreview.schoolProfile && (
                    <button
                      type="button"
                      onClick={() => handleConfirmRestore(true)}
                      className="px-3.5 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Pulihkan Seluruh Data &amp; Logo Kop
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConfirmRestore(false)}
                    className="px-3.5 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Impor Struktur Saja
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bagian 3: Riwayat Snapshot Lokal */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>3. Titik Pemulihan Lokal (Maks. 5 Cadangan)</span>
              </h3>
            </div>

            <form onSubmit={handleSaveSnapshot} className="flex flex-wrap gap-2">
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="Nama titik cadangan (cth. Sebelum Rapat SK Semester Genap)"
                className="flex-1 min-w-[200px] px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white rounded-lg whitespace-nowrap cursor-pointer"
              >
                Simpan Snapshot
              </button>
            </form>

            {snapshots.length > 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-900 truncate">
                        {snap.label}
                      </p>
                      <p className="text-[11px] text-stone-500 font-mono-num">
                        {new Date(snap.createdAt).toLocaleString('id-ID')} ·{' '}
                        {snap.nodesCount} unit · {snap.schoolName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreSnapshot(snap.id);
                          setStatusMessage(
                            `Berhasil memulihkan titik cadangan "${snap.label}".`
                          );
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Pulihkan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSnapshot(snap.id)}
                        aria-label={`Hapus snapshot ${snap.label}`}
                        className="p-1.5 text-stone-400 hover:text-red-700 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic">
                Belum ada snapshot lokal tersimpan. Klik &ldquo;Simpan Snapshot&rdquo; untuk membuat cadangan cepat di peramban.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

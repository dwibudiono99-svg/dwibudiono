import React, { useEffect, useMemo, useState } from 'react';
import {
  DatabaseBackup,
  FileCheck2,
  FileDown,
  Plus,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import { OrgNode, SchoolProfile, ViewTab } from './types/org';
import {
  DEFAULT_ORG_NODES,
  DEFAULT_SCHOOL_PROFILE,
} from './data/defaultOrgData';
import { TopBar } from './components/TopBar';
import { OrgChartCanvas } from './components/OrgChartCanvas';
import { DirectoryTable } from './components/DirectoryTable';
import { TupoksiDirectory } from './components/TupoksiDirectory';
import { StatsOverview } from './components/StatsOverview';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { NodeEditModal, SchoolProfileModal } from './components/NodeEditModal';
import { PhotoUploadModal } from './components/PhotoUploadModal';
import { InstitutionLogo } from './components/KopLogos';
import { OfficialReportModal } from './components/OfficialReportModal';
import {
  BackupDataModal,
  LocalBackupSnapshot,
} from './components/BackupDataModal';
import { PrintableOfficialReport } from './components/PrintableOfficialReport';
import { exportOrgChartToPdf } from './utils/exportOrgChartPdf';
import { OfficialReportOptions } from './utils/exportOfficialReportPdf';

const STORAGE_NODES_KEY = 'sman9_org_nodes_v5';
const LEGACY_NODES_KEYS = [
  'sman9_org_nodes_v4',
  'sman9_org_nodes_v3',
  'sman9_org_nodes_v2',
  'sman9_org_nodes_v1',
];
const STORAGE_PROFILE_KEY = 'sman9_school_profile_v1';
const STORAGE_BACKUPS_KEY = 'sman9_org_backups_v1';

function collectDescendantIds(rootId: string, nodes: OrgNode[]): Set<string> {
  const toDelete = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const node of nodes) {
      if (node.parentId && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
        toDelete.add(node.id);
        added = true;
      }
    }
  }
  return toDelete;
}

export function App() {
  const [nodes, setNodes] = useState<OrgNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_NODES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const photoById = new Map<string, string>();
      for (const legacyKey of LEGACY_NODES_KEYS) {
        const legacy = localStorage.getItem(legacyKey);
        if (!legacy) continue;
        const legacyParsed = JSON.parse(legacy);
        if (Array.isArray(legacyParsed)) {
          for (const item of legacyParsed) {
            if (
              item &&
              typeof item.id === 'string' &&
              typeof item.photoUrl === 'string' &&
              !photoById.has(item.id)
            ) {
              photoById.set(item.id, item.photoUrl);
            }
          }
        }
      }
      if (photoById.size > 0) {
        return DEFAULT_ORG_NODES.map((node) => ({
          ...node,
          photoUrl: photoById.get(node.id) ?? node.photoUrl,
        }));
      }
    } catch {
      // Fallback to default dataset
    }
    return DEFAULT_ORG_NODES;
  });

  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.schoolName === 'string') return parsed;
      }
    } catch {
      // Fallback to default profile
    }
    return DEFAULT_SCHOOL_PROFILE;
  });

  const [activeTab, setActiveTab] = useState<ViewTab>('bagan');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Modals
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [photoModalNode, setPhotoModalNode] = useState<OrgNode | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [snapshots, setSnapshots] = useState<LocalBackupSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BACKUPS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore malformed snapshots
    }
    return [];
  });

  const [officialPrintOptions, setOfficialPrintOptions] =
    useState<OfficialReportOptions>(() => ({
      letterNumber:
        schoolProfile.reportLetterNumber || '421.3/118/436.7.1.9/2026',
      recipientTitle:
        schoolProfile.recipientTitle ||
        'Kepala Dinas Pendidikan Provinsi Jawa Timur\nc.q. Kepala Cabang Dinas Pendidikan Wilayah Surabaya',
      reportDateIso: new Date().toISOString().slice(0, 10),
      committeeChairName:
        schoolProfile.committeeChairName || 'Ketua Komite Sekolah',
      subject: `Laporan Struktur Organisasi dan Pembagian Tugas Personel Tahun Ajaran ${schoolProfile.academicYear}`,
    }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NODES_KEY, JSON.stringify(nodes));
    } catch {
      // Ignore storage quota errors
    }
  }, [nodes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(schoolProfile));
    } catch {
      // Ignore storage quota errors
    }
    document.title = `Struktur Organisasi Sekolah — ${schoolProfile.schoolName}`;
  }, [schoolProfile]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const rootLeader = useMemo(
    () => nodes.find((n) => n.parentId === null) ?? nodes[0],
    [nodes]
  );

  const handleOpenAddSubordinate = (parentId: string) => {
    setEditingNode(null);
    setDefaultParentId(parentId);
    setNodeModalOpen(true);
  };

  const handleOpenEditNode = (node: OrgNode) => {
    setEditingNode(node);
    setDefaultParentId(node.parentId);
    setNodeModalOpen(true);
  };

  const handleSaveNode = (savedNode: OrgNode, isNew: boolean) => {
    setNodes((prev) => {
      if (isNew) {
        return [...prev, savedNode];
      }
      return prev.map((n) => (n.id === savedNode.id ? savedNode : n));
    });
    setNodeModalOpen(false);
    setSelectedNodeId(savedNode.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    const idsToRemove = collectDescendantIds(nodeId, nodes);
    setNodes((prev) => prev.filter((n) => !idsToRemove.has(n.id)));
    setSelectedNodeId(null);
  };

  const handleSavePhoto = (nodeId: string, photoUrl: string | undefined) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, photoUrl } : n))
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BACKUPS_KEY, JSON.stringify(snapshots));
    } catch {
      // Ignore storage quota errors
    }
  }, [snapshots]);

  const handleCreateSnapshot = (label: string) => {
    const newSnapshot: LocalBackupSnapshot = {
      id: `snap_${Date.now()}`,
      createdAt: new Date().toISOString(),
      label,
      nodesCount: nodes.length,
      schoolName: schoolProfile.schoolName,
      nodes,
      schoolProfile,
    };
    setSnapshots((prev) => [newSnapshot, ...prev].slice(0, 5));
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    const found = snapshots.find((s) => s.id === snapshotId);
    if (!found) return;
    setNodes(found.nodes);
    setSchoolProfile(found.schoolProfile);
    setSelectedNodeId(null);
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  };

  const handleRestoreBackup = (
    importedNodes: OrgNode[],
    importedProfile?: SchoolProfile
  ) => {
    setNodes(importedNodes);
    if (importedProfile) {
      setSchoolProfile(importedProfile);
    }
    setSelectedNodeId(null);
  };

  const handlePrintVisualChart = () => {
    setActiveTab('bagan');
    setTimeout(() => window.print(), 100);
  };

  const handlePrintOfficialReport = (options: OfficialReportOptions) => {
    setOfficialPrintOptions(options);
    document.body.classList.add('print-official-mode');

    const styleEl = document.createElement('style');
    styleEl.id = 'print-official-page-rule';
    styleEl.textContent = '@page { size: A4 portrait; margin: 14mm; }';
    document.head.appendChild(styleEl);

    const cleanup = () => {
      document.body.classList.remove('print-official-mode');
      document.getElementById('print-official-page-rule')?.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1200);
    }, 100);
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setPdfError(null);
    setIsExportingPdf(true);
    try {
      await exportOrgChartToPdf(nodes, schoolProfile);
    } catch {
      setPdfError('Gagal membuat dokumen PDF. Silakan coba kembali.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleResetDefault = () => {
    setNodes(DEFAULT_ORG_NODES);
    setSchoolProfile(DEFAULT_SCHOOL_PROFILE);
    setSelectedNodeId(null);
    setConfirmReset(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
      <TopBar
        schoolName={schoolProfile.schoolName}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onPrint={() => {
          setActiveTab('bagan');
          setTimeout(() => window.print(), 100);
        }}
      />

      <main className="print-chart-hide-on-official flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Kop Atas Resmi dengan Logo Provinsi (Kiri) & Logo Sekolah (Kanan) */}
        <section className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 sm:px-8 sm:py-5 shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              {/* Logo Provinsi (Kiri) */}
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                title="Klik untuk mengubah Logo Provinsi"
                aria-label="Ubah Logo Provinsi pada Kop Atas"
                className="group flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <InstitutionLogo
                  type="province"
                  src={schoolProfile.provinceLogoUrl}
                  alt="Logo Pemerintah Provinsi"
                  className="w-14 h-16 sm:w-16 sm:h-[72px]"
                />
                <span className="no-print text-[11px] font-medium text-stone-500 group-hover:text-blue-900 transition-colors">
                  Logo Provinsi
                </span>
              </button>

              {/* Teks Kop Tengah */}
              <div className="flex-1 text-center space-y-1.5 min-w-0">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-stone-700">
                  {schoolProfile.provinceName ||
                    'Pemerintah Provinsi Jawa Timur · Dinas Pendidikan'}
                </p>

                <div className="text-sm sm:text-base font-bold uppercase tracking-widest text-blue-900">
                  <span>{schoolProfile.schoolName}</span>
                  <span className="mx-2 text-stone-300" aria-hidden="true">·</span>
                  <span className="font-mono-num">NPSN {schoolProfile.npsn}</span>
                  <span className="mx-2 text-stone-300" aria-hidden="true">·</span>
                  <span>{schoolProfile.accreditation}</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-stone-900 text-balance leading-tight">
                  Struktur Organisasi Sekolah
                </h1>

                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm sm:text-[15px] text-stone-700">
                  <span>Tahun Ajaran {schoolProfile.academicYear}</span>
                  <span className="text-stone-300" aria-hidden="true">·</span>
                  <span className="font-mono-num">{schoolProfile.decreeNumber}</span>
                  <span className="text-stone-300" aria-hidden="true">·</span>
                  <span>{schoolProfile.address}, {schoolProfile.city}</span>
                </div>
              </div>

              {/* Logo Sekolah (Kanan) */}
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                title="Klik untuk mengubah Logo Sekolah"
                aria-label="Ubah Logo Sekolah pada Kop Atas"
                className="group flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <InstitutionLogo
                  type="school"
                  src={schoolProfile.schoolLogoUrl}
                  alt={`Logo ${schoolProfile.schoolName}`}
                  className="w-16 h-[72px] sm:w-[72px] sm:h-20"
                />
                <span className="no-print text-[11px] font-medium text-stone-500 group-hover:text-blue-900 transition-colors">
                  Logo Sekolah
                </span>
              </button>
            </div>
          </div>

          {/* Workspace Management Actions */}
          <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-4">
            <span className="text-sm text-stone-600 font-mono-num">
              {nodes.length} Unit & Pejabat Terdaftar
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
                <span>Identitas & Logo Kop</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleOpenAddSubordinate(rootLeader?.id ?? 'kepsek')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Unit</span>
              </button>

              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Cetak &amp; Pelaporan Dinas</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium bg-white border border-stone-200 hover:border-blue-900/40 hover:bg-stone-50 text-blue-900 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>{isExportingPdf ? 'Menyiapkan PDF...' : 'Ekspor PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setBackupModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <DatabaseBackup className="w-4 h-4" />
                <span>Backup &amp; Impor Data</span>
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Standar</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2 py-1">
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="px-2.5 py-1 text-[13px] font-medium bg-stone-900 text-white rounded-md hover:bg-stone-800 cursor-pointer"
                  >
                    Ya, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2 py-1 text-[13px] font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {pdfError && (
          <div
            role="alert"
            className="no-print bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-2.5 rounded-lg flex items-center justify-between"
          >
            <span>{pdfError}</span>
            <button
              type="button"
              onClick={() => setPdfError(null)}
              className="text-red-700 hover:underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Active View Content */}
        {activeTab === 'bagan' && (
          <OrgChartCanvas
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onAddSubordinate={handleOpenAddSubordinate}
            onEditPhoto={setPhotoModalNode}
          />
        )}

        {activeTab === 'direktori' && (
          <DirectoryTable
            nodes={nodes}
            onSelectNode={setSelectedNodeId}
            onAddNew={() =>
              handleOpenAddSubordinate(rootLeader?.id ?? 'kepsek')
            }
            onEditPhoto={setPhotoModalNode}
          />
        )}

        {activeTab === 'tupoksi' && (
          <TupoksiDirectory
            nodes={nodes}
            onSelectNode={setSelectedNodeId}
            onEditPhoto={setPhotoModalNode}
          />
        )}

        {activeTab === 'statistik' && <StatsOverview nodes={nodes} />}

        {/* Print-only Signature Footer */}
        <section className="hidden print-only pt-8">
          <div className="flex justify-end">
            <div className="text-sm text-stone-900 w-72">
              <p>Ditetapkan di Surabaya</p>
              <p className="mt-0.5">Kepala {schoolProfile.schoolName},</p>
              <div className="h-16" />
              <p className="font-semibold underline">
                {rootLeader?.personName ?? schoolProfile.headmasterName}
              </p>
              {rootLeader?.nip && rootLeader.nip !== '-' && (
                <p className="font-mono-num text-xs mt-0.5">
                  NIP {rootLeader.nip}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="no-print border-t border-stone-200 bg-white mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <span>
            {schoolProfile.schoolName} · {schoolProfile.address}, {schoolProfile.city}
          </span>
          <span className="font-mono-num">
            {schoolProfile.decreeNumber} · {nodes.length} Unit Terdaftar
          </span>
        </div>
      </footer>

      {/* Detail Inspector Drawer */}
      <NodeDetailDrawer
        node={selectedNode}
        allNodes={nodes}
        onClose={() => setSelectedNodeId(null)}
        onSelectNode={setSelectedNodeId}
        onEditNode={handleOpenEditNode}
        onEditPhoto={setPhotoModalNode}
        onAddSubordinate={handleOpenAddSubordinate}
        onDeleteNode={handleDeleteNode}
      />

      {/* Add / Edit Node Modal */}
      <NodeEditModal
        isOpen={nodeModalOpen}
        editingNode={editingNode}
        defaultParentId={defaultParentId}
        allNodes={nodes}
        onClose={() => setNodeModalOpen(false)}
        onSave={handleSaveNode}
      />

      {/* Add / Edit Unit Photo Modal */}
      <PhotoUploadModal
        node={photoModalNode}
        onClose={() => setPhotoModalNode(null)}
        onSavePhoto={handleSavePhoto}
      />

      {/* Edit School Profile Modal */}
      <SchoolProfileModal
        isOpen={profileModalOpen}
        profile={schoolProfile}
        onClose={() => setProfileModalOpen(false)}
        onSave={(updated) => {
          setSchoolProfile(updated);
          setProfileModalOpen(false);
        }}
      />

      {/* Official Dinas Reporting & Print Modal */}
      <OfficialReportModal
        isOpen={reportModalOpen}
        nodes={nodes}
        schoolProfile={schoolProfile}
        onClose={() => setReportModalOpen(false)}
        onUpdateProfile={setSchoolProfile}
        onPrintOfficialReport={handlePrintOfficialReport}
        onPrintChart={handlePrintVisualChart}
      />

      {/* Backup, Export & Import Data Modal */}
      <BackupDataModal
        isOpen={backupModalOpen}
        nodes={nodes}
        schoolProfile={schoolProfile}
        snapshots={snapshots}
        onClose={() => setBackupModalOpen(false)}
        onRestoreBackup={handleRestoreBackup}
        onCreateSnapshot={handleCreateSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
      />

      {/* Formal A4 Portrait Official Report View (Print Only) */}
      <PrintableOfficialReport
        nodes={nodes}
        schoolProfile={schoolProfile}
        options={officialPrintOptions}
      />
    </div>
  );
}

export default App;

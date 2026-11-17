import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, RotateCcw, Settings2, Plus } from 'lucide-react';
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
import { exportOrgChartToPdf } from './utils/exportOrgChartPdf';

const STORAGE_NODES_KEY = 'sman9_org_nodes_v1';
const STORAGE_PROFILE_KEY = 'sman9_school_profile_v1';

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
  const [confirmReset, setConfirmReset] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      schoolProfile,
      nodes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `struktur-organisasi-${schoolProfile.npsn || 'sekolah'}.json`;
    link.click();
    URL.revokeObjectURL(url);
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

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Institutional Header & Utility Strip */}
        <section className="border-b border-stone-200 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="text-xs font-medium uppercase tracking-widest text-stone-500">
              <span>{schoolProfile.schoolName}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono-num">NPSN {schoolProfile.npsn}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{schoolProfile.accreditation}</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 text-balance">
              Struktur Organisasi Sekolah
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-stone-600">
              <span>Tahun Ajaran {schoolProfile.academicYear}</span>
              <span className="text-stone-300" aria-hidden="true">·</span>
              <span className="font-mono-num">{schoolProfile.decreeNumber}</span>
              <span className="text-stone-300" aria-hidden="true">·</span>
              <span>{schoolProfile.address}, {schoolProfile.city}</span>
            </div>
          </div>

          {/* Workspace Management Actions */}
          <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Identitas Sekolah</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleOpenAddSubordinate(rootLeader?.id ?? 'kepsek')
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Unit</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-stone-200 hover:border-blue-900/40 hover:bg-stone-50 text-blue-900 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Menyiapkan PDF...' : 'Ekspor PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor JSON</span>
            </button>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Standar</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2 py-1">
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="px-2.5 py-1 text-xs font-medium bg-stone-900 text-white rounded-md hover:bg-stone-800 cursor-pointer"
                >
                  Ya, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}
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
    </div>
  );
}

export default App;

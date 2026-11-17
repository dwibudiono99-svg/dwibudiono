import React, { useMemo, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
} from 'lucide-react';
import { DivisionId, OrgNode } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';

interface OrgChartCanvasProps {
  nodes: OrgNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onAddSubordinate: (parentId: string) => void;
}

const FILTER_DIVISIONS: { id: DivisionId | 'all'; label: string }[] = [
  { id: 'all', label: 'Semua Bidang' },
  { id: 'pimpinan', label: 'Pimpinan' },
  { id: 'tata_usaha', label: 'Tata Usaha' },
  { id: 'kurikulum', label: 'Kurikulum' },
  { id: 'kesiswaan', label: 'Kesiswaan' },
  { id: 'sarpras', label: 'Sarpras' },
  { id: 'humas', label: 'Humas' },
];

function getInitials(name: string): string {
  const cleaned = name
    .replace(/^(Dr\.|Drs\.|Dra\.|Ir\.|H\.|Hj\.)\s*/gi, '')
    .split(',')[0]
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface NodeCardProps {
  node: OrgNode;
  isSelected: boolean;
  isDimmed: boolean;
  compact?: boolean;
  childCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelect: () => void;
  onAddChild: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({
  node,
  isSelected,
  isDimmed,
  compact = false,
  childCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  onSelect,
  onAddChild,
}) => {
  const meta = DIVISION_META[node.division];

  return (
    <div
      className={`group relative bg-white rounded-xl border transition-all duration-150 text-left ${
        isSelected
          ? 'border-blue-900 ring-2 ring-blue-900/15 shadow-sm'
          : 'border-stone-200 hover:border-stone-400 hover:shadow-sm'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'} ${
        compact ? 'w-[216px] p-3.5' : 'w-[244px] p-4'
      }`}
    >
      {/* Top Hairline Accent Bar (1.5px subtle, full-width top edge, no thick left bar) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-3 top-0 h-[2px] rounded-b-full opacity-80"
        style={{ backgroundColor: meta.accentHex }}
      />

      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 rounded-lg cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
              <span className={meta.textClass}>{node.shortCode}</span>
              <span className="text-stone-300" aria-hidden="true">·</span>
              <span className="text-stone-500 font-medium">{node.status}</span>
            </div>
            <p className="mt-1 text-[13px] font-semibold text-stone-900 leading-snug line-clamp-2">
              {node.roleTitle}
            </p>
          </div>
          <div
            className={`w-8 h-8 rounded-lg border ${meta.borderClass} ${meta.bgSubtleClass} ${meta.textClass} flex items-center justify-center text-[11px] font-display font-semibold shrink-0`}
          >
            {getInitials(node.personName)}
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-stone-100">
          <p className="text-xs font-medium text-stone-800 truncate">
            {node.personName}
          </p>
          <p className="mt-0.5 text-[11px] font-mono-num text-stone-500 truncate">
            {node.nip && node.nip !== '-' ? `NIP ${node.nip}` : node.rank}
          </p>
        </div>
      </button>

      {/* Bottom Interactive Utility Row (only when childCount > 0 or hover add) */}
      <div className="no-print mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px]">
        {childCount > 0 && onToggleCollapse ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-900 font-medium cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span className="tabular-nums">{childCount} Sub-Unit</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Sembunyikan</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-stone-400 truncate max-w-[140px]">
            {node.unitHeadcount
              ? `${node.unitHeadcount.toLocaleString('id-ID')} Anggota`
              : node.room.split('·')[0].trim()}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild();
          }}
          title={`Tambah unit di bawah ${node.roleTitle}`}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-0.5 text-blue-900 hover:text-blue-950 font-medium transition-opacity cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Unit</span>
        </button>
      </div>
    </div>
  );
};

interface SubTreeBranchProps {
  parentId: string;
  allNodes: OrgNode[];
  selectedNodeId: string | null;
  activeDivision: DivisionId | 'all';
  collapsedIds: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  onSelectNode: (id: string) => void;
  onAddSubordinate: (parentId: string) => void;
  depth?: number;
}

const SubTreeBranch: React.FC<SubTreeBranchProps> = ({
  parentId,
  allNodes,
  selectedNodeId,
  activeDivision,
  collapsedIds,
  onToggleCollapse,
  onSelectNode,
  onAddSubordinate,
  depth = 0,
}) => {
  const children = useMemo(
    () => allNodes.filter((n) => n.parentId === parentId),
    [allNodes, parentId]
  );

  if (children.length === 0 || collapsedIds[parentId]) return null;

  return (
    <div className="relative pl-5 mt-3 space-y-2.5">
      {/* Vertical backbone connector */}
      <div
        aria-hidden="true"
        className="absolute left-2.5 top-0 bottom-5 w-px bg-stone-300"
      />
      {children.map((child) => {
        const grandchildren = allNodes.filter((n) => n.parentId === child.id);
        const isDimmed =
          activeDivision !== 'all' &&
          child.division !== activeDivision &&
          !(activeDivision === 'kesiswaan' && child.id === 'peserta_didik') &&
          !(activeDivision === 'kurikulum' && child.id === 'dewan_guru');

        return (
          <div key={child.id} className="relative">
            {/* Horizontal branch connector */}
            <div
              aria-hidden="true"
              className={`absolute -left-2.5 top-8 w-2.5 h-px ${
                child.relationType === 'koordinasi'
                  ? 'border-t border-dashed border-stone-400'
                  : 'bg-stone-300'
              }`}
            />
            <NodeCard
              node={child}
              compact
              isSelected={selectedNodeId === child.id}
              isDimmed={isDimmed}
              childCount={grandchildren.length}
              isCollapsed={Boolean(collapsedIds[child.id])}
              onToggleCollapse={() => onToggleCollapse(child.id)}
              onSelect={() => onSelectNode(child.id)}
              onAddChild={() => onAddSubordinate(child.id)}
            />
            {depth < 3 && (
              <SubTreeBranch
                parentId={child.id}
                allNodes={allNodes}
                selectedNodeId={selectedNodeId}
                activeDivision={activeDivision}
                collapsedIds={collapsedIds}
                onToggleCollapse={onToggleCollapse}
                onSelectNode={onSelectNode}
                onAddSubordinate={onAddSubordinate}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const OrgChartCanvas: React.FC<OrgChartCanvasProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddSubordinate,
}) => {
  const [zoom, setZoom] = useState<number>(0.92);
  const [activeDivision, setActiveDivision] = useState<DivisionId | 'all'>('all');
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [showSubUnits, setShowSubUnits] = useState<boolean>(true);

  const rootNode = useMemo(
    () => nodes.find((n) => n.parentId === null) ?? nodes[0],
    [nodes]
  );

  // Komite Sekolah or Tier-1 coordination partner linked to root
  const komiteNodes = useMemo(
    () =>
      nodes.filter(
        (n) => n.parentId === rootNode?.id && n.tier === 1
      ),
    [nodes, rootNode]
  );

  // Tier 2 pillars: Tata Usaha + Wakil Kepala Sekolah
  const tier2Nodes = useMemo(
    () =>
      nodes.filter(
        (n) => n.parentId === rootNode?.id && n.tier >= 2
      ),
    [nodes, rootNode]
  );

  const handleToggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleAllSubUnits = () => {
    const next = !showSubUnits;
    setShowSubUnits(next);
    if (!next) {
      const collapsed: Record<string, boolean> = {};
      tier2Nodes.forEach((n) => {
        collapsed[n.id] = true;
      });
      setCollapsedIds(collapsed);
    } else {
      setCollapsedIds({});
    }
  };

  if (!rootNode) return null;

  return (
    <section aria-label="Bagan Hierarki Struktur Organisasi" className="space-y-4">
      {/* Workspace Filter & Zoom Toolbar */}
      <div className="no-print bg-white border border-stone-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Division Highlight Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {FILTER_DIVISIONS.map((div) => {
            const active = activeDivision === div.id;
            return (
              <button
                key={div.id}
                type="button"
                onClick={() => setActiveDivision(div.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-blue-900 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 hover:text-stone-900'
                }`}
              >
                {div.label}
              </button>
            );
          })}
        </div>

        {/* Canvas Controls: Expand/Collapse & Zoom */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleToggleAllSubUnits}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showSubUnits ? 'Ringkas Pimpinan' : 'Tampilkan Semua Unit'}</span>
          </button>

          <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.65, +(z - 0.08).toFixed(2)))}
              aria-label="Perkecil bagan"
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono-num text-stone-700 min-w-[46px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.2, +(z + 0.08).toFixed(2)))}
              aria-label="Perbesar bagan"
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(0.92)}
              aria-label="Reset zoom"
              title="Reset zoom"
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-xs text-stone-500">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="inline-block w-6 h-[1.5px] bg-stone-500" aria-hidden="true" />
            <span>Garis Komando / Instruksi Langsung</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-6 h-0 border-t-[1.5px] border-dashed border-stone-500"
              aria-hidden="true"
            />
            <span>Garis Koordinasi & Kemitraan</span>
          </div>
        </div>
        <p className="no-print text-stone-500">
          Klik salah satu kartu jabatan untuk melihat NIP, tupoksi, dan mengelola sub-unit.
        </p>
      </div>

      {/* Scrollable Org Chart Viewport */}
      <div className="print-reset-scroll bg-white border border-stone-200 rounded-2xl overflow-auto canvas-scroll p-6 sm:p-10 min-h-[620px]">
        <div
          className="origin-top-left transition-transform duration-150 ease-out inline-block min-w-full"
          style={{
            transform: `scale(${zoom})`,
            width: zoom < 1 ? `${100 / zoom}%` : '100%',
          }}
        >
          <div className="flex flex-col items-center min-w-[1160px] mx-auto">
            {/* TIER 1: Kepala Sekolah + Komite Sekolah (Garis Koordinasi) */}
            <div className="relative flex items-center justify-center">
              {/* Komite Sekolah positioned to the left of Kepala Sekolah on desktop */}
              {komiteNodes.length > 0 && (
                <div className="flex items-center mr-0">
                  <div className="flex flex-col gap-3">
                    {komiteNodes.map((komite) => (
                      <NodeCard
                        key={komite.id}
                        node={komite}
                        isSelected={selectedNodeId === komite.id}
                        isDimmed={
                          activeDivision !== 'all' &&
                          activeDivision !== 'komite' &&
                          activeDivision !== 'pimpinan'
                        }
                        onSelect={() => onSelectNode(komite.id)}
                        onAddChild={() => onAddSubordinate(komite.id)}
                      />
                    ))}
                  </div>
                  {/* Dashed horizontal coordination connector */}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                      Koordinasi
                    </span>
                    <div
                      aria-hidden="true"
                      className="w-12 border-t-2 border-dashed border-stone-400"
                    />
                  </div>
                </div>
              )}

              {/* Kepala Sekolah Root Card */}
              <div className="relative">
                <NodeCard
                  node={rootNode}
                  isSelected={selectedNodeId === rootNode.id}
                  isDimmed={
                    activeDivision !== 'all' && activeDivision !== 'pimpinan'
                  }
                  onSelect={() => onSelectNode(rootNode.id)}
                  onAddChild={() => onAddSubordinate(rootNode.id)}
                />
              </div>

              {/* Balance spacer on right so Kepala Sekolah stays visually centered when Komite is on left */}
              {komiteNodes.length > 0 && (
                <div className="w-[292px] hidden xl:block" aria-hidden="true" />
              )}
            </div>

            {/* Vertical Main Spine from Kepala Sekolah down to Tier 2 Bus */}
            {tier2Nodes.length > 0 && (
              <div className="w-px h-10 bg-stone-300" aria-hidden="true" />
            )}

            {/* TIER 2 BUS + COLUMNS */}
            {tier2Nodes.length > 0 && (
              <div className="flex items-start justify-center gap-5 relative">
                {tier2Nodes.map((pillar, index) => {
                  const isFirst = index === 0;
                  const isLast = index === tier2Nodes.length - 1;
                  const subCount = nodes.filter(
                    (n) => n.parentId === pillar.id
                  ).length;
                  const isDimmed =
                    activeDivision !== 'all' &&
                    pillar.division !== activeDivision;

                  return (
                    <div
                      key={pillar.id}
                      className="relative flex flex-col items-center"
                    >
                      {/* Horizontal Distribution Bus Segments */}
                      <div className="w-full h-6 relative" aria-hidden="true">
                        {/* Left half of bus bar */}
                        {!isFirst && (
                          <div className="absolute top-0 left-0 right-1/2 h-px bg-stone-300" />
                        )}
                        {/* Right half of bus bar */}
                        {!isLast && (
                          <div className="absolute top-0 left-1/2 right-0 h-px bg-stone-300" />
                        )}
                        {/* Vertical drop line into Tier 2 card */}
                        <div
                          className={`absolute top-0 left-1/2 -translate-x-1/2 h-6 w-px ${
                            pillar.relationType === 'koordinasi'
                              ? 'border-l border-dashed border-stone-400 bg-transparent'
                              : 'bg-stone-300'
                          }`}
                        />
                      </div>

                      {/* Tier 2 Card */}
                      <NodeCard
                        node={pillar}
                        compact
                        isSelected={selectedNodeId === pillar.id}
                        isDimmed={isDimmed}
                        childCount={subCount}
                        isCollapsed={Boolean(collapsedIds[pillar.id])}
                        onToggleCollapse={() => handleToggleCollapse(pillar.id)}
                        onSelect={() => onSelectNode(pillar.id)}
                        onAddChild={() => onAddSubordinate(pillar.id)}
                      />

                      {/* Tier 3 & 4 Sub-Units Cascade */}
                      <div className="w-full">
                        <SubTreeBranch
                          parentId={pillar.id}
                          allNodes={nodes}
                          selectedNodeId={selectedNodeId}
                          activeDivision={activeDivision}
                          collapsedIds={collapsedIds}
                          onToggleCollapse={handleToggleCollapse}
                          onSelectNode={onSelectNode}
                          onAddSubordinate={onAddSubordinate}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

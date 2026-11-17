import React, { useMemo, useState } from 'react';
import { Search, Plus, ArrowUpDown, ChevronRight, Camera } from 'lucide-react';
import { DivisionId, EmploymentStatus, OrgNode } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { PersonAvatar } from './PersonAvatar';

interface DirectoryTableProps {
  nodes: OrgNode[];
  onSelectNode: (nodeId: string) => void;
  onAddNew: () => void;
  onEditPhoto: (node: OrgNode) => void;
}

type SortKey = 'tier' | 'personName' | 'roleTitle' | 'division';

export const DirectoryTable: React.FC<DirectoryTableProps> = ({
  nodes,
  onSelectNode,
  onAddNew,
  onEditPhoto,
}) => {
  const [query, setQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<DivisionId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('tier');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes
      .filter((n) => {
        if (divisionFilter !== 'all' && n.division !== divisionFilter) return false;
        if (statusFilter !== 'all' && n.status !== statusFilter) return false;
        if (!q) return true;
        return (
          n.personName.toLowerCase().includes(q) ||
          n.roleTitle.toLowerCase().includes(q) ||
          n.nip.toLowerCase().includes(q) ||
          n.shortCode.toLowerCase().includes(q) ||
          n.room.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dir = sortAsc ? 1 : -1;
        if (sortKey === 'tier') {
          return (a.tier - b.tier) * dir;
        }
        return a[sortKey].localeCompare(b[sortKey], 'id') * dir;
      });
  }, [nodes, query, divisionFilter, statusFilter, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <section aria-label="Direktori Jabatan dan Personel" className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama pejabat, jabatan, NIP, atau ruang..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter bidang"
            value={divisionFilter}
            onChange={(e) =>
              setDivisionFilter(e.target.value as DivisionId | 'all')
            }
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="all">Semua Bidang ({nodes.length})</option>
            {Object.values(DIVISION_META).map((div) => (
              <option key={div.id} value={div.id}>
                {div.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter status kepegawaian"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as EmploymentStatus | 'all')
            }
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="all">Semua Status</option>
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="P3K PW">P3K PW</option>
            <option value="GTT">GTT</option>
            <option value="PTT">PTT</option>
            <option value="Mitra">Mitra / Komite</option>
          </select>

          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-blue-900 text-white hover:bg-blue-950 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Jabatan</span>
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1 text-xs text-stone-500">
        <span className="tabular-nums">
          Menampilkan <strong className="text-stone-800">{filtered.length}</strong> dari{' '}
          <strong className="text-stone-800">{nodes.length}</strong> unit jabatan
        </span>
        {(query || divisionFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setDivisionFilter('all');
              setStatusFilter('all');
            }}
            className="text-blue-900 hover:underline font-medium cursor-pointer"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('tier')}
                      className="inline-flex items-center gap-1 hover:text-stone-900 cursor-pointer"
                    >
                      <span>Tingkat</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('roleTitle')}
                      className="inline-flex items-center gap-1 hover:text-stone-900 cursor-pointer"
                    >
                      <span>Jabatan & Unit</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('personName')}
                      className="inline-flex items-center gap-1 hover:text-stone-900 cursor-pointer"
                    >
                      <span>Pejabat / Penanggung Jawab</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">NIP / Status</th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('division')}
                      className="inline-flex items-center gap-1 hover:text-stone-900 cursor-pointer"
                    >
                      <span>Bidang</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Lokasi Ruang</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filtered.map((node) => {
                  const meta = DIVISION_META[node.division];
                  return (
                    <tr
                      key={node.id}
                      onClick={() => onSelectNode(node.id)}
                      className="hover:bg-stone-50/90 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono-num text-xs text-stone-500 whitespace-nowrap">
                        L{node.tier}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">
                          {node.roleTitle}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          <span className="font-mono-num">{node.shortCode}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>
                            {node.relationType === 'komando'
                              ? 'Komando'
                              : 'Koordinasi'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <PersonAvatar
                            name={node.personName}
                            photoUrl={node.photoUrl}
                            meta={meta}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-stone-900">
                              {node.personName}
                            </div>
                            <div className="text-xs text-stone-500 mt-0.5">
                              {node.rank}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono-num text-xs text-stone-800">
                          {node.nip}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {node.status} · {node.education}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${meta.textClass}`}>
                          {meta.shortLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-600 max-w-[200px] truncate">
                        {node.room}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPhoto(node);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-blue-900 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 shrink-0" />
                            <span>{node.photoUrl ? 'Ganti Foto' : 'Tambah Foto'}</span>
                          </button>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-900">
                            <span>Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-6 text-center">
            <p className="font-display text-lg font-medium text-stone-900">
              Tidak ada jabatan atau personel yang cocok
            </p>
            <p className="text-sm text-stone-500 mt-1">
              Sesuaikan kata kunci pencarian atau hapus filter bidang yang aktif.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDivisionFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 px-4 py-2 text-xs font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 cursor-pointer"
            >
              Tampilkan Semua Data
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

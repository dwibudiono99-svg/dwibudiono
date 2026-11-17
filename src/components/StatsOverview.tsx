import React, { useMemo } from 'react';
import { DivisionId, EducationLevel, EmploymentStatus, OrgNode } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';

interface StatsOverviewProps {
  nodes: OrgNode[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ nodes }) => {
  const stats = useMemo(() => {
    const byDivision: Record<DivisionId, number> = {
      pimpinan: 0,
      komite: 0,
      tata_usaha: 0,
      kurikulum: 0,
      kesiswaan: 0,
      sarpras: 0,
      humas: 0,
      akademik: 0,
    };
    const byStatus: Record<EmploymentStatus, number> = {
      PNS: 0,
      PPPK: 0,
      'P3K PW': 0,
      GTT: 0,
      PTT: 0,
      Mitra: 0,
    };
    const byEducation: Record<EducationLevel, number> = {
      S3: 0,
      S2: 0,
      S1: 0,
      D3: 0,
      SMA: 0,
    };

    nodes.forEach((n) => {
      byDivision[n.division] = (byDivision[n.division] || 0) + 1;
      byStatus[n.status] = (byStatus[n.status] || 0) + 1;
      byEducation[n.education] = (byEducation[n.education] || 0) + 1;
    });

    const guruNode = nodes.find(
      (n) => n.id === 'guru_mapel' || n.id === 'dewan_guru'
    );
    const studentNode = nodes.find((n) => n.id === 'peserta_didik');
    const tuDivisionCount = nodes.filter(
      (n) => n.division === 'tata_usaha' && n.id !== 'koordinator_tu'
    ).length;
    const maxTier = Math.max(1, ...nodes.map((n) => n.tier));

    return {
      totalUnits: nodes.length,
      byDivision,
      byStatus,
      byEducation,
      totalTeachers: guruNode?.unitHeadcount ?? 58,
      totalTuStaff: tuDivisionCount,
      maxTier,
      totalStudents: studentNode?.unitHeadcount ?? 1080,
    };
  }, [nodes]);

  const maxDivCount = Math.max(1, ...Object.values(stats.byDivision));
  const maxStatusCount = Math.max(1, ...Object.values(stats.byStatus));

  return (
    <section aria-label="Statistik Sumber Daya Manusia" className="space-y-8">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-semibold text-stone-900">
          Komposisi Sumber Daya Manusia & Unit Organisasi
        </h2>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          Rekapitulasi distribusi unit struktural, status kepegawaian, serta kualifikasi pendidikan pimpinan dan koordinator di lingkungan sekolah.
        </p>
      </div>

      {/* Key Institutional Aggregates */}
      <div className="bg-white border border-stone-200 rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
        <div className="p-6">
          <div className="text-[13px] font-medium text-stone-600">
            Unit Jabatan Struktural
          </div>
          <div className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-stone-900 tabular-nums">
            {stats.totalUnits}
          </div>
          <div className="mt-1 text-[13px] text-stone-600">
            {stats.maxTier} tingkat hierarki tata kelola
          </div>
        </div>
        <div className="p-6">
          <div className="text-[13px] font-medium text-stone-600">
            Guru Mata Pelajaran
          </div>
          <div className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-stone-900 tabular-nums">
            {stats.totalTeachers}
          </div>
          <div className="mt-1 text-[13px] text-stone-600">
            Pendidik · {stats.totalTuStaff} personel layanan TU &amp; umum
          </div>
        </div>
        <div className="p-6">
          <div className="text-[13px] font-medium text-stone-600">
            Pejabat ASN (PNS, PPPK &amp; P3K PW)
          </div>
          <div className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-blue-900 tabular-nums">
            {stats.byStatus.PNS + stats.byStatus.PPPK + stats.byStatus['P3K PW']}
          </div>
          <div className="mt-1 text-[13px] text-stone-600 tabular-nums">
            {stats.byStatus.PNS} PNS · {stats.byStatus.PPPK} PPPK ·{' '}
            {stats.byStatus['P3K PW']} P3K PW
          </div>
        </div>
        <div className="p-6">
          <div className="text-[13px] font-medium text-stone-600">
            Peserta Didik Aktif
          </div>
          <div className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-stone-900 tabular-nums">
            {stats.totalStudents.toLocaleString('id-ID')}
          </div>
          <div className="mt-1 text-[13px] text-stone-600">
            Terbagi dalam 30 rombongan belajar
          </div>
        </div>
      </div>

      {/* Distribution Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Division */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-stone-900">
            Distribusi Unit Berdasarkan Bidang
          </h3>
          <p className="text-[13px] text-stone-600 mt-1">
            Jumlah posisi jabatan struktural dan unit pelaksana per bidang
          </p>

          <div className="mt-6 space-y-4">
            {Object.values(DIVISION_META).map((meta) => {
              const count = stats.byDivision[meta.id] || 0;
              const widthPct = Math.round((count / maxDivCount) * 100);
              return (
                <div key={meta.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-stone-800">
                      {meta.label}
                    </span>
                    <span className="font-mono-num text-stone-600">
                      {count} unit
                    </span>
                  </div>
                  <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: meta.accentHex,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown by Employment Status & Education */}
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-stone-900">
              Status Kepegawaian Pimpinan & Koordinator
            </h3>
            <div className="mt-5 space-y-3.5">
              {(
                [
                  { key: 'PNS', label: 'Pegawai Negeri Sipil (PNS)' },
                  { key: 'PPPK', label: 'Pegawai Pemerintah dengan Perjanjian Kerja (PPPK)' },
                  { key: 'P3K PW', label: 'PPPK Paruh Waktu (P3K PW)' },
                  { key: 'GTT', label: 'Guru Tidak Tetap (GTT)' },
                  { key: 'PTT', label: 'Pegawai Tidak Tetap / Teknis (PTT)' },
                  { key: 'Mitra', label: 'Mitra Eksternal / Komite / OSIS' },
                ] as { key: EmploymentStatus; label: string }[]
              ).map((item) => {
                const count = stats.byStatus[item.key] || 0;
                const widthPct = Math.round((count / maxStatusCount) * 100);
                return (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-stone-700">{item.label}</span>
                      <span className="font-mono-num font-medium text-stone-900">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-900 rounded-full transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-stone-900">
              Kualifikasi Pendidikan Pejabat Struktural
            </h3>
            <div className="mt-4 divide-y divide-stone-100 text-sm">
              {(
                [
                  { level: 'S3', label: 'Doktor (S3)' },
                  { level: 'S2', label: 'Magister / Pascasarjana (S2)' },
                  { level: 'S1', label: 'Sarjana / Diploma IV (S1)' },
                  { level: 'D3', label: 'Diploma III (D3)' },
                  { level: 'SMA', label: 'SMA / Sederajat (Organisasi Siswa)' },
                ] as { level: EducationLevel; label: string }[]
              ).map((row) => (
                <div
                  key={row.level}
                  className="py-2.5 flex items-center justify-between"
                >
                  <span className="text-stone-700 text-xs sm:text-sm">
                    {row.label}
                  </span>
                  <span className="font-mono-num text-xs sm:text-sm font-semibold text-stone-900">
                    {stats.byEducation[row.level] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

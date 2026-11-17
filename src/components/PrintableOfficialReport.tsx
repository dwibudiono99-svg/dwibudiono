import React from 'react';
import { EmploymentStatus, OrgNode, SchoolProfile } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { InstitutionLogo } from './KopLogos';
import {
  OfficialReportOptions,
  formatIndonesianDate,
} from '../utils/exportOfficialReportPdf';

interface PrintableOfficialReportProps {
  nodes: OrgNode[];
  schoolProfile: SchoolProfile;
  options: OfficialReportOptions;
}

export const PrintableOfficialReport: React.FC<PrintableOfficialReportProps> = ({
  nodes,
  schoolProfile,
  options,
}) => {
  const rootNode = nodes.find((n) => n.parentId === null) ?? nodes[0];
  const komiteNode = nodes.find((n) => n.division === 'komite');
  const headmasterName = rootNode?.personName || schoolProfile.headmasterName;
  const headmasterNip =
    rootNode?.nip && rootNode.nip !== '-' ? rootNode.nip : '-';
  const committeeName =
    options.committeeChairName.trim() ||
    komiteNode?.personName ||
    'Ketua Komite Sekolah';
  const cityOnly = schoolProfile.city.split(',')[0].trim() || 'Surabaya';
  const formattedDate = formatIndonesianDate(options.reportDateIso);

  const provinceParts = (
    schoolProfile.provinceName ||
    'Pemerintah Provinsi Jawa Timur · Dinas Pendidikan'
  )
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean);

  const provinceTopLine = (
    provinceParts[0] || 'PEMERINTAH PROVINSI JAWA TIMUR'
  ).toUpperCase();
  const dinasLine = (provinceParts[1] || 'DINAS PENDIDIKAN').toUpperCase();

  const statusCounts: Record<EmploymentStatus, number> = {
    PNS: 0,
    PPPK: 0,
    'P3K PW': 0,
    GTT: 0,
    PTT: 0,
    Mitra: 0,
  };
  nodes.forEach((n) => {
    statusCounts[n.status] = (statusCounts[n.status] || 0) + 1;
  });

  const guruNode = nodes.find(
    (n) => n.id === 'guru_mapel' || n.id === 'dewan_guru'
  );
  const studentNode = nodes.find((n) => n.id === 'peserta_didik');

  const sortedNodes = [...nodes].sort(
    (a, b) => a.tier - b.tier || a.division.localeCompare(b.division, 'id')
  );

  const recipientLines = (
    options.recipientTitle ||
    schoolProfile.recipientTitle ||
    'Kepala Dinas Pendidikan Provinsi'
  )
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="hidden print-official-only text-black bg-white font-serif leading-normal">
      {/* HALAMAN 1: SURAT PENGANTAR & REKAPITULASI KEDINASAN */}
      <div className="pb-6">
        {/* Kop Surat Dinas */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b-[3px] border-double border-black">
          <InstitutionLogo
            type="province"
            src={schoolProfile.provinceLogoUrl}
            alt="Logo Provinsi"
            className="w-16 h-[74px] shrink-0"
          />
          <div className="flex-1 text-center">
            <p className="text-[12pt] font-bold tracking-wide uppercase">
              {provinceTopLine}
            </p>
            <p className="text-[12pt] font-bold tracking-wide uppercase">
              {dinasLine}
            </p>
            <p className="text-[15pt] font-bold uppercase mt-0.5">
              {schoolProfile.schoolName}
            </p>
            <p className="text-[9.5pt] mt-0.5">
              {schoolProfile.address}, {schoolProfile.city} · NPSN{' '}
              {schoolProfile.npsn}
            </p>
            <p className="text-[9pt]">
              {schoolProfile.accreditation} · {schoolProfile.decreeNumber}
            </p>
          </div>
          <InstitutionLogo
            type="school"
            src={schoolProfile.schoolLogoUrl}
            alt={`Logo ${schoolProfile.schoolName}`}
            className="w-16 h-[74px] shrink-0"
          />
        </div>

        {/* Tanggal Surat */}
        <p className="text-right text-[10.5pt] mt-4">
          {cityOnly}, {formattedDate}
        </p>

        {/* Metadata Nomor Surat & Tujuan */}
        <div className="grid grid-cols-12 gap-6 mt-3 text-[10.5pt]">
          <div className="col-span-7">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-20 align-top py-0.5">Nomor</td>
                  <td className="w-4 align-top py-0.5">:</td>
                  <td className="align-top py-0.5 font-mono-num">
                    {options.letterNumber || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">Sifat</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="align-top py-0.5">Penting / Kedinasan</td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">Lampiran</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="align-top py-0.5">
                    1 (Satu) Berkas Daftar Pejabat &amp; Tupoksi
                  </td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">Hal</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="align-top py-0.5 font-bold">
                    {options.subject ||
                      `Laporan Struktur Organisasi Tahun Ajaran ${schoolProfile.academicYear}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="col-span-5">
            <p>Kepada Yth.</p>
            {recipientLines.map((line, i) => (
              <p key={i} className="font-bold">
                {line}
              </p>
            ))}
            <p className="mt-1">di</p>
            <p className="font-bold pl-4">Tempat</p>
          </div>
        </div>

        {/* Paragraf Pembuka */}
        <div className="mt-5 text-[10.5pt] space-y-2.5 text-justify">
          <p>Dengan hormat,</p>
          <p>
            Berdasarkan Surat Keputusan Kepala {schoolProfile.schoolName} Nomor{' '}
            {schoolProfile.decreeNumber} tentang Penetapan Susunan Organisasi dan
            Pembagian Tugas Pendidik serta Tenaga Kependidikan Tahun Ajaran{' '}
            {schoolProfile.academicYear}, bersama ini kami sampaikan laporan resmi
            struktur organisasi dan komposisi sumber daya manusia{' '}
            {schoolProfile.schoolName} (NPSN {schoolProfile.npsn}) sebagai bahan
            pelaporan kedinasan dan pembinaan satuan pendidikan.
          </p>
        </div>

        {/* Tabel I: Rekap Status Kepegawaian */}
        <div className="mt-4">
          <p className="text-[10.5pt] font-bold mb-1.5">
            I. Rekapitulasi Sumber Daya Manusia &amp; Status Kepegawaian
          </p>
          <table className="w-full border-collapse border border-black text-[9.5pt]">
            <thead>
              <tr className="bg-stone-100">
                <th className="border border-black px-2.5 py-1.5 text-left">
                  Kategori / Status Kepegawaian
                </th>
                <th className="border border-black px-2.5 py-1.5 text-left w-36">
                  Jumlah
                </th>
                <th className="border border-black px-2.5 py-1.5 text-left">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2.5 py-1">
                  Pegawai Negeri Sipil (PNS)
                </td>
                <td className="border border-black px-2.5 py-1">
                  {statusCounts.PNS} unit
                </td>
                <td className="border border-black px-2.5 py-1">
                  Pejabat struktural &amp; koordinator ASN PNS
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1">
                  Pegawai Pemerintah dengan Perjanjian Kerja (PPPK)
                </td>
                <td className="border border-black px-2.5 py-1">
                  {statusCounts.PPPK} unit
                </td>
                <td className="border border-black px-2.5 py-1">
                  ASN PPPK penuh waktu
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1">
                  PPPK Paruh Waktu (P3K PW)
                </td>
                <td className="border border-black px-2.5 py-1">
                  {statusCounts['P3K PW']} unit
                </td>
                <td className="border border-black px-2.5 py-1">
                  Tenaga kependidikan / layanan berstatus P3K PW
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1">
                  Guru Tidak Tetap / Pegawai Tidak Tetap (GTT / PTT)
                </td>
                <td className="border border-black px-2.5 py-1">
                  {statusCounts.GTT + statusCounts.PTT} unit
                </td>
                <td className="border border-black px-2.5 py-1">
                  {statusCounts.GTT} GTT · {statusCounts.PTT} PTT (TU,
                  Kebersihan, Keamanan)
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1">
                  Mitra / Komite / Organisasi Siswa
                </td>
                <td className="border border-black px-2.5 py-1">
                  {statusCounts.Mitra} unit
                </td>
                <td className="border border-black px-2.5 py-1">
                  Komite Sekolah &amp; Perwakilan Peserta Didik
                </td>
              </tr>
              <tr className="font-bold bg-stone-50">
                <td className="border border-black px-2.5 py-1">
                  Total Guru Mata Pelajaran &amp; Peserta Didik Aktif
                </td>
                <td className="border border-black px-2.5 py-1">
                  {guruNode?.unitHeadcount ?? 58} Guru /{' '}
                  {(studentNode?.unitHeadcount ?? 1080).toLocaleString('id-ID')}{' '}
                  Siswa
                </td>
                <td className="border border-black px-2.5 py-1">
                  Total {nodes.length} kotak unit jabatan dalam bagan
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabel II: Bidang & Dasar Hukum */}
        <div className="mt-4">
          <p className="text-[10.5pt] font-bold mb-1.5">
            II. Ringkasan Bidang Organisasi &amp; Dasar Hukum
          </p>
          <table className="w-full border-collapse border border-black text-[9.5pt]">
            <thead>
              <tr className="bg-stone-100">
                <th className="border border-black px-2.5 py-1.5 text-left">
                  Bidang Tata Kelola
                </th>
                <th className="border border-black px-2.5 py-1.5 text-left">
                  Dasar Hukum
                </th>
                <th className="border border-black px-2.5 py-1.5 text-center w-14">
                  Unit
                </th>
                <th className="border border-black px-2.5 py-1.5 text-left">
                  Penanggung Jawab Utama
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.values(DIVISION_META).map((meta) => {
                const divNodes = nodes.filter((n) => n.division === meta.id);
                if (divNodes.length === 0) return null;
                const leadNode =
                  divNodes.slice().sort((a, b) => a.tier - b.tier)[0] ??
                  divNodes[0];
                return (
                  <tr key={meta.id}>
                    <td className="border border-black px-2.5 py-1">
                      {meta.label}
                    </td>
                    <td className="border border-black px-2.5 py-1">
                      {meta.legalBasis}
                    </td>
                    <td className="border border-black px-2.5 py-1 text-center">
                      {divNodes.length}
                    </td>
                    <td className="border border-black px-2.5 py-1">
                      {leadNode.personName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[10.5pt] text-justify">
          Demikian laporan struktur organisasi sekolah ini kami sampaikan.
          Rincian daftar pejabat struktural, status kepegawaian, dan tugas
          pokok masing-masing unit terlampir pada Lampiran I dokumen ini. Atas
          perhatian dan pembinaannya kami ucapkan terima kasih.
        </p>

        {/* Blok Pengesahan */}
        <div className="grid grid-cols-2 gap-10 mt-6 text-[10pt]">
          <div>
            <p>Mengetahui,</p>
            <p>Ketua Komite Sekolah,</p>
            <div className="h-16" />
            <p className="font-bold underline">{committeeName}</p>
          </div>
          <div>
            <p>Ditetapkan di {cityOnly}</p>
            <p>Kepala {schoolProfile.schoolName},</p>
            <div className="h-16" />
            <p className="font-bold underline">{headmasterName}</p>
            <p className="text-[9.5pt]">NIP {headmasterNip}</p>
          </div>
        </div>

        <p className="mt-5 pt-2 border-t border-stone-300 text-[8.5pt] text-stone-700">
          Tautan Aplikasi Web:{' '}
          <span className="font-mono-num">
            {`${(
              schoolProfile.appWebUrl ||
              'https://ais-pre-kcxun5xqxzgbw5ptyepfru-302703941788.asia-southeast1.run.app'
            ).replace(/\/+$/, '')}/`}
          </span>
        </p>
      </div>

      {/* HALAMAN 2+: LAMPIRAN I DAFTAR PEJABAT & TUPOKSI */}
      <div className="print-page-break-before pt-2">
        <div className="flex items-center justify-between gap-4 pb-2 border-b-2 border-black mb-3">
          <InstitutionLogo
            type="province"
            src={schoolProfile.provinceLogoUrl}
            alt="Logo Provinsi"
            className="w-12 h-14 shrink-0"
          />
          <div className="flex-1 text-center">
            <p className="text-[10pt] font-bold uppercase">
              LAMPIRAN I SURAT KEPALA {schoolProfile.schoolName}
            </p>
            <p className="text-[9pt]">
              Nomor: {options.letterNumber || '-'} · Tanggal: {formattedDate}
            </p>
            <p className="text-[11pt] font-bold uppercase mt-0.5">
              SUSUNAN JABATAN, STATUS KEPEGAWAIAN, DAN TUGAS POKOK UNIT KERJA
            </p>
          </div>
          <InstitutionLogo
            type="school"
            src={schoolProfile.schoolLogoUrl}
            alt="Logo Sekolah"
            className="w-12 h-14 shrink-0"
          />
        </div>

        <table className="w-full border-collapse border border-black text-[8.8pt]">
          <thead>
            <tr className="bg-stone-100">
              <th className="border border-black px-2 py-1.5 text-center w-8">
                No
              </th>
              <th className="border border-black px-2 py-1.5 text-left">
                Jabatan &amp; Bidang
              </th>
              <th className="border border-black px-2 py-1.5 text-left">
                Pejabat &amp; NIP
              </th>
              <th className="border border-black px-2 py-1.5 text-left w-28">
                Status / Gol.
              </th>
              <th className="border border-black px-2 py-1.5 text-left">
                Tugas Pokok &amp; Fungsi Utama
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedNodes.map((node, idx) => {
              const meta = DIVISION_META[node.division];
              return (
                <tr key={node.id} className="break-inside-avoid">
                  <td className="border border-black px-2 py-1 text-center align-top">
                    {idx + 1}
                  </td>
                  <td className="border border-black px-2 py-1 align-top">
                    <div className="font-bold">{node.roleTitle}</div>
                    <div className="text-[8pt] text-stone-700">
                      {meta.shortLabel} · L{node.tier}
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1 align-top">
                    <div className="font-bold">{node.personName}</div>
                    <div className="text-[8pt]">
                      {node.nip && node.nip !== '-'
                        ? `NIP ${node.nip}`
                        : 'Non-NIP'}
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1 align-top">
                    <div>
                      {node.status} ({node.education})
                    </div>
                    <div className="text-[8pt]">{node.rank}</div>
                  </td>
                  <td className="border border-black px-2 py-1 align-top">
                    {node.tupoksi.length > 0
                      ? node.tupoksi.slice(0, 2).join('; ')
                      : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end mt-6 text-[10pt]">
          <div className="w-72">
            <p>Ditetapkan di {cityOnly}</p>
            <p>pada tanggal {formattedDate}</p>
            <p className="mt-1">Kepala {schoolProfile.schoolName},</p>
            <div className="h-16" />
            <p className="font-bold underline">{headmasterName}</p>
            <p className="text-[9pt]">NIP {headmasterNip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

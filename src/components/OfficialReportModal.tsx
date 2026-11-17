import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  Printer,
  X,
} from 'lucide-react';
import { OrgNode, SchoolProfile } from '../types/org';
import {
  OfficialReportOptions,
  exportDirectoryToCsv,
  exportOfficialReportToPdf,
} from '../utils/exportOfficialReportPdf';
import { exportOrgChartToPdf } from '../utils/exportOrgChartPdf';

interface OfficialReportModalProps {
  isOpen: boolean;
  nodes: OrgNode[];
  schoolProfile: SchoolProfile;
  onClose: () => void;
  onUpdateProfile: (updated: SchoolProfile) => void;
  onPrintOfficialReport: (options: OfficialReportOptions) => void;
  onPrintChart: () => void;
}

export const OfficialReportModal: React.FC<OfficialReportModalProps> = ({
  isOpen,
  nodes,
  schoolProfile,
  onClose,
  onUpdateProfile,
  onPrintOfficialReport,
  onPrintChart,
}) => {
  const komiteLead = nodes.find((n) => n.division === 'komite')?.personName;
  const todayIso = new Date().toISOString().slice(0, 10);

  const [letterNumber, setLetterNumber] = useState(
    schoolProfile.reportLetterNumber || '421.3/118/436.7.1.9/2026'
  );
  const [recipientTitle, setRecipientTitle] = useState(
    schoolProfile.recipientTitle ||
      'Kepala Dinas Pendidikan Provinsi Jawa Timur\nc.q. Kepala Cabang Dinas Pendidikan Wilayah Surabaya'
  );
  const [committeeChairName, setCommitteeChairName] = useState(
    schoolProfile.committeeChairName || komiteLead || 'Ketua Komite Sekolah'
  );
  const [reportDateIso, setReportDateIso] = useState(todayIso);
  const [subject, setSubject] = useState(
    `Laporan Struktur Organisasi dan Pembagian Tugas Personel Tahun Ajaran ${schoolProfile.academicYear}`
  );
  const [isExportingDinas, setIsExportingDinas] = useState(false);
  const [isExportingChart, setIsExportingChart] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLetterNumber(
      schoolProfile.reportLetterNumber || '421.3/118/436.7.1.9/2026'
    );
    setRecipientTitle(
      schoolProfile.recipientTitle ||
        'Kepala Dinas Pendidikan Provinsi Jawa Timur\nc.q. Kepala Cabang Dinas Pendidikan Wilayah Surabaya'
    );
    setCommitteeChairName(
      schoolProfile.committeeChairName || komiteLead || 'Ketua Komite Sekolah'
    );
    setSubject(
      `Laporan Struktur Organisasi dan Pembagian Tugas Personel Tahun Ajaran ${schoolProfile.academicYear}`
    );
    setErrorMsg(null);
  }, [isOpen, schoolProfile, komiteLead]);

  if (!isOpen) return null;

  const persistDraftMetadata = (): OfficialReportOptions => {
    const updatedProfile: SchoolProfile = {
      ...schoolProfile,
      reportLetterNumber: letterNumber.trim(),
      recipientTitle: recipientTitle.trim(),
      committeeChairName: committeeChairName.trim(),
    };
    onUpdateProfile(updatedProfile);
    return {
      letterNumber: letterNumber.trim(),
      recipientTitle: recipientTitle.trim(),
      reportDateIso,
      committeeChairName: committeeChairName.trim(),
      subject: subject.trim(),
    };
  };

  const handleDownloadDinasPdf = async () => {
    if (isExportingDinas) return;
    setErrorMsg(null);
    setIsExportingDinas(true);
    try {
      const opts = persistDraftMetadata();
      await exportOfficialReportToPdf(nodes, schoolProfile, opts);
    } catch {
      setErrorMsg('Gagal menyusun PDF Laporan Kedinasan. Silakan coba lagi.');
    } finally {
      setIsExportingDinas(false);
    }
  };

  const handleDownloadChartPdf = async () => {
    if (isExportingChart) return;
    setErrorMsg(null);
    setIsExportingChart(true);
    try {
      persistDraftMetadata();
      await exportOrgChartToPdf(nodes, schoolProfile);
    } catch {
      setErrorMsg('Gagal menyusun PDF Bagan Struktur. Silakan coba lagi.');
    } finally {
      setIsExportingChart(false);
    }
  };

  const handlePrintDinas = () => {
    const opts = persistDraftMetadata();
    onClose();
    onPrintOfficialReport(opts);
  };

  const handlePrintVisualChart = () => {
    persistDraftMetadata();
    onClose();
    onPrintChart();
  };

  const handleDownloadCsv = () => {
    persistDraftMetadata();
    exportDirectoryToCsv(nodes, schoolProfile);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="official-report-modal-title"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl bg-[#FAF9F6] border border-stone-200 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-blue-900" />
            <h2
              id="official-report-modal-title"
              className="font-display text-lg font-semibold text-stone-900"
            >
              Cetak & Pelaporan Sesuai Aturan Kedinasan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal pelaporan kedinasan"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-[13px] text-stone-600 leading-relaxed">
            Sesuaikan atribut Tata Naskah Dinas di bawah ini sebelum mencetak atau mengunduh berkas pelaporan resmi (dilengkapi Kop Surat berlogo Provinsi &amp; Sekolah, Nomor/Perihal Surat, Rekap SDM, Pengesahan Kepala Sekolah &amp; Komite, serta Lampiran I Daftar Pejabat &amp; Tupoksi).
          </p>

          {/* Form Tata Naskah Dinas */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Nomor Surat Laporan Kedinasan
                </label>
                <input
                  type="text"
                  value={letterNumber}
                  onChange={(e) => setLetterNumber(e.target.value)}
                  placeholder="cth. 421.3/118/436.7.1.9/2026"
                  className="w-full px-3 py-2 text-sm font-mono-num bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Tanggal Surat &amp; Pengesahan
                </label>
                <input
                  type="date"
                  value={reportDateIso}
                  onChange={(e) => setReportDateIso(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-num bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Perihal Surat
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Tujuan Instansi / Pejabat Penerima
                </label>
                <textarea
                  rows={2}
                  value={recipientTitle}
                  onChange={(e) => setRecipientTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Mengetahui (Ketua Komite Sekolah)
                </label>
                <input
                  type="text"
                  value={committeeChairName}
                  onChange={(e) => setCommitteeChairName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Penandatangan utama: {schoolProfile.headmasterName}
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-2.5 rounded-lg"
            >
              {errorMsg}
            </div>
          )}

          {/* Pilihan Output Cetak & Unduhan Pelaporan */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Pilih Format Berkas Pelaporan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Unduh PDF Laporan Kedinasan (A4) */}
              <button
                type="button"
                onClick={handleDownloadDinasPdf}
                disabled={isExportingDinas}
                className="text-left p-4 bg-blue-900 hover:bg-blue-950 text-white rounded-xl transition-colors flex items-start gap-3 disabled:opacity-60 cursor-pointer"
              >
                <FileDown className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">
                    {isExportingDinas
                      ? 'Menyusun PDF Kedinasan...'
                      : 'Unduh PDF Laporan Kedinasan (A4)'}
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5 leading-relaxed">
                    Surat Pengantar ber-Kop Dinas, Rekap SDM, Pengesahan &amp; Lampiran I Pejabat.
                  </p>
                </div>
              </button>

              {/* 2. Cetak Langsung Naskah Kedinasan (A4 Portrait) */}
              <button
                type="button"
                onClick={handlePrintDinas}
                className="text-left p-4 bg-white border border-stone-300 hover:border-blue-900 hover:bg-stone-50 text-stone-900 rounded-xl transition-colors flex items-start gap-3 cursor-pointer"
              >
                <Printer className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">
                    Cetak Naskah Dinas (Printer A4)
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                    Cetak langsung Surat Pengantar &amp; Lampiran I sesuai tata naskah resmi.
                  </p>
                </div>
              </button>

              {/* 3. Unduh PDF Bagan Struktur (A3 Landscape) */}
              <button
                type="button"
                onClick={handleDownloadChartPdf}
                disabled={isExportingChart}
                className="text-left p-4 bg-white border border-stone-300 hover:border-blue-900 hover:bg-stone-50 text-stone-900 rounded-xl transition-colors flex items-start gap-3 disabled:opacity-60 cursor-pointer"
              >
                <FileDown className="w-5 h-5 text-stone-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">
                    {isExportingChart
                      ? 'Menyiapkan PDF Bagan...'
                      : 'Unduh PDF Bagan Struktur (A3)'}
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                    Diagram hierarki vektor A3 Landscape beserta halaman lampiran direktori.
                  </p>
                </div>
              </button>

              {/* 4. Cetak Bagan Struktur Visual */}
              <button
                type="button"
                onClick={handlePrintVisualChart}
                className="text-left p-4 bg-white border border-stone-300 hover:border-blue-900 hover:bg-stone-50 text-stone-900 rounded-xl transition-colors flex items-start gap-3 cursor-pointer"
              >
                <Printer className="w-5 h-5 text-stone-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">
                    Cetak Bagan Struktur (Landscape)
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                    Cetak langsung visual bagan pohon organisasi beserta blok pengesahan.
                  </p>
                </div>
              </button>
            </div>

            {/* 5. Unduh Rekap Spreadsheet CSV */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="w-full text-left px-4 py-3 bg-white border border-stone-200 hover:border-emerald-700 hover:bg-emerald-50/40 text-stone-900 rounded-xl transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">
                    Unduh Rekap Data Pejabat &amp; Status Kepegawaian (.CSV / Excel)
                  </div>
                  <p className="text-xs text-stone-600">
                    Format tabel siap buka di Microsoft Excel untuk lampiran Dapodik atau pelaporan dinas.
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-800 whitespace-nowrap shrink-0">
                Unduh CSV
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

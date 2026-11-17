import { jsPDF } from 'jspdf';
import { EmploymentStatus, OrgNode, SchoolProfile } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { getDefaultLogoDataUri } from '../components/KopLogos';

export interface OfficialReportOptions {
  letterNumber: string;
  recipientTitle: string;
  reportDateIso: string; // YYYY-MM-DD
  committeeChairName: string;
  subject?: string;
}

interface LoadedLogo {
  dataUrl: string;
  width: number;
  height: number;
}

async function loadLogoPngDataUrl(src: string): Promise<LoadedLogo | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 3000);

    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      try {
        const natW = img.naturalWidth || img.width || 120;
        const natH = img.naturalHeight || img.height || 136;
        const maxSide = 240;
        const ratio = Math.min(2, maxSide / Math.max(natW, natH));
        const cw = Math.max(1, Math.round(natW * ratio));
        const ch = Math.max(1, Math.round(natH * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0, cw, ch);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: cw,
          height: ch,
        });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(null);
    };

    img.src = src;
  });
}

function drawFittedLogo(
  doc: jsPDF,
  logo: LoadedLogo | null,
  boxX: number,
  boxY: number,
  maxW: number,
  maxH: number
) {
  if (!logo) return;
  const scale = Math.min(maxW / logo.width, maxH / logo.height);
  const drawW = logo.width * scale;
  const drawH = logo.height * scale;
  const drawX = boxX + (maxW - drawW) / 2;
  const drawY = boxY + (maxH - drawH) / 2;
  try {
    doc.addImage(logo.dataUrl, 'PNG', drawX, drawY, drawW, drawH);
  } catch {
    // Ignore unsupported payload
  }
}

export function formatIndonesianDate(isoDate: string): string {
  const parsed = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fitTextToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && doc.getTextWidth(`${trimmed}…`) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}…`;
}

export async function exportOfficialReportToPdf(
  nodes: OrgNode[],
  schoolProfile: SchoolProfile,
  options: OfficialReportOptions
): Promise<void> {
  if (nodes.length === 0) return;

  const [provinceLogo, schoolLogo] = await Promise.all([
    loadLogoPngDataUrl(
      schoolProfile.provinceLogoUrl || getDefaultLogoDataUri('province')
    ),
    loadLogoPngDataUrl(
      schoolProfile.schoolLogoUrl || getDefaultLogoDataUri('school')
    ),
  ]);

  // A4 Portrait (210mm x 297mm) — standar baku Tata Naskah Dinas Pelaporan Sekolah
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageW = doc.internal.pageSize.getWidth(); // 210
  const pageH = doc.internal.pageSize.getHeight(); // 297
  const marginX = 18;
  const contentW = pageW - marginX * 2; // 174mm
  const centerX = pageW / 2;

  const rootNode = nodes.find((n) => n.parentId === null) ?? nodes[0];
  const komiteNode = nodes.find((n) => n.division === 'komite');
  const headmasterName = rootNode.personName || schoolProfile.headmasterName;
  const headmasterNip = rootNode.nip && rootNode.nip !== '-' ? rootNode.nip : '-';
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

  // --- HELPER: KOP SURAT RESMI DINAS ---
  const drawOfficialKop = () => {
    drawFittedLogo(doc, provinceLogo, marginX, 11, 18, 21);
    drawFittedLogo(doc, schoolLogo, pageW - marginX - 18, 11, 18, 21);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(28, 25, 23);
    doc.text(provinceTopLine, centerX, 15, { align: 'center' });

    doc.setFontSize(11.5);
    doc.text(dinasLine, centerX, 19.8, { align: 'center' });

    doc.setFontSize(14.5);
    doc.text(schoolProfile.schoolName.toUpperCase(), centerX, 25.2, {
      align: 'center',
    });

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(68, 64, 60);
    doc.text(
      `${schoolProfile.address}, ${schoolProfile.city}  ·  NPSN ${schoolProfile.npsn}`,
      centerX,
      29.8,
      { align: 'center' }
    );
    doc.setFontSize(8.5);
    doc.text(
      `${schoolProfile.accreditation}  ·  ${schoolProfile.decreeNumber}`,
      centerX,
      33.8,
      { align: 'center' }
    );

    // Double Kop Surat border (tebal atas, tipis bawah)
    doc.setDrawColor(28, 25, 23);
    doc.setLineWidth(0.85);
    doc.line(marginX, 36.2, pageW - marginX, 36.2);
    doc.setLineWidth(0.28);
    doc.line(marginX, 37.3, pageW - marginX, 37.3);
  };

  // ============================================================================
  // HALAMAN 1: SURAT PENGANTAR & REKAPITULASI LAPORAN KEDINASAN
  // ============================================================================
  drawOfficialKop();

  // Tanggal surat (kanan atas di bawah kop)
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`${cityOnly}, ${formattedDate}`, pageW - marginX, 45, {
    align: 'right',
  });

  // Blok Nomor / Sifat / Lampiran / Hal (kiri)
  let metaY = 51;
  const labelW = 24;
  const colonX = marginX + labelW;
  const valX = colonX + 3;
  const subjectText =
    options.subject?.trim() ||
    `Laporan Struktur Organisasi dan Pembagian Tugas Personel Tahun Ajaran ${schoolProfile.academicYear}`;

  const letterMeta: [string, string][] = [
    ['Nomor', options.letterNumber || schoolProfile.reportLetterNumber || '-'],
    ['Sifat', 'Penting / Kedinasan'],
    ['Lampiran', '1 (Satu) Berkas Daftar Pejabat & Tupoksi'],
    ['Hal', subjectText],
  ];

  letterMeta.forEach(([lbl, val]) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.text(lbl, marginX, metaY);
    doc.text(':', colonX, metaY);
    const wrappedVal = doc.splitTextToSize(val, 82) as string[];
    doc.setFont('times', lbl === 'Hal' ? 'bold' : 'normal');
    wrappedVal.forEach((lineStr, idx) => {
      doc.text(lineStr, valX, metaY + idx * 4.5);
    });
    metaY += Math.max(5.2, wrappedVal.length * 4.5 + 1);
  });

  // Blok Tujuan Surat (kanan)
  const recipientX = 122;
  let recY = 51;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text('Kepada Yth.', recipientX, recY);
  recY += 4.8;
  const recipientLines = (
    options.recipientTitle ||
    schoolProfile.recipientTitle ||
    'Kepala Dinas Pendidikan Provinsi'
  )
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  doc.setFont('times', 'bold');
  recipientLines.forEach((lineStr) => {
    const wrapped = doc.splitTextToSize(lineStr, pageW - marginX - recipientX) as string[];
    wrapped.forEach((wLine) => {
      doc.text(wLine, recipientX, recY);
      recY += 4.6;
    });
  });
  doc.setFont('times', 'normal');
  doc.text('di', recipientX, recY + 0.5);
  doc.setFont('times', 'bold');
  doc.text('Tempat', recipientX + 6, recY + 5.2);

  // Paragraf Pengantar Kedinasan
  let bodyY = Math.max(metaY, recY + 10) + 5;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('Dengan hormat,', marginX, bodyY);
  bodyY += 6;

  const introParagraph = `Berdasarkan Surat Keputusan Kepala ${schoolProfile.schoolName} Nomor ${schoolProfile.decreeNumber} tentang Penetapan Susunan Organisasi dan Pembagian Tugas Pendidik serta Tenaga Kependidikan Tahun Ajaran ${schoolProfile.academicYear}, bersama ini kami sampaikan laporan resmi struktur organisasi dan komposisi sumber daya manusia ${schoolProfile.schoolName} (NPSN ${schoolProfile.npsn}) sebagai bahan pelaporan kedinasan dan pembinaan satuan pendidikan.`;
  const introLines = doc.splitTextToSize(introParagraph, contentW) as string[];
  introLines.forEach((lineStr) => {
    doc.text(lineStr, marginX, bodyY);
    bodyY += 4.8;
  });

  // Hitung agregat kepegawaian
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

  // --- TABEL I: REKAPITULASI KOMPOSISI SDM ---
  bodyY += 4;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text(
    'I. Rekapitulasi Sumber Daya Manusia & Status Kepegawaian',
    marginX,
    bodyY
  );
  bodyY += 2.8;

  const sumCols = [74, 30, 70]; // total 174mm
  const sumHeaders = ['Kategori / Status Kepegawaian', 'Jumlah', 'Keterangan'];

  doc.setFillColor(245, 245, 244);
  doc.setDrawColor(120, 113, 108);
  doc.setLineWidth(0.25);
  doc.rect(marginX, bodyY, contentW, 7.2, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  let sx = marginX;
  sumHeaders.forEach((h, idx) => {
    doc.text(h, sx + 2.5, bodyY + 4.9);
    sx += sumCols[idx];
  });
  bodyY += 7.2;

  const summaryRows: [string, string, string][] = [
    [
      'Pegawai Negeri Sipil (PNS)',
      `${statusCounts.PNS} unit`,
      'Pejabat struktural & koordinator ASN PNS',
    ],
    [
      'Pegawai Pemerintah dengan Perjanjian Kerja (PPPK)',
      `${statusCounts.PPPK} unit`,
      'ASN PPPK penuh waktu',
    ],
    [
      'PPPK Paruh Waktu (P3K PW)',
      `${statusCounts['P3K PW']} unit`,
      'Tenaga kependidikan / layanan berstatus P3K PW',
    ],
    [
      'Guru Tidak Tetap / Pegawai Tidak Tetap (GTT / PTT)',
      `${statusCounts.GTT + statusCounts.PTT} unit`,
      `${statusCounts.GTT} GTT · ${statusCounts.PTT} PTT (TU, Kebersihan, Keamanan)`,
    ],
    [
      'Mitra / Komite / Organisasi Siswa',
      `${statusCounts.Mitra} unit`,
      'Komite Sekolah & Perwakilan Peserta Didik',
    ],
    [
      'Total Guru Mata Pelajaran & Peserta Didik Aktif',
      `${guruNode?.unitHeadcount ?? 58} Guru / ${(studentNode?.unitHeadcount ?? 1080).toLocaleString('id-ID')} Siswa`,
      `Total ${nodes.length} kotak unit jabatan dalam bagan`,
    ],
  ];

  summaryRows.forEach((row, idx) => {
    const isTotal = idx === summaryRows.length - 1;
    doc.setFillColor(isTotal ? 245 : 255, isTotal ? 245 : 255, isTotal ? 244 : 255);
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.2);
    doc.rect(marginX, bodyY, contentW, 6.6, 'FD');
    doc.setFont('times', isTotal ? 'bold' : 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(28, 25, 23);

    let cx = marginX;
    doc.text(fitTextToWidth(doc, row[0], sumCols[0] - 4), cx + 2.5, bodyY + 4.5);
    cx += sumCols[0];
    doc.text(fitTextToWidth(doc, row[1], sumCols[1] - 4), cx + 2.5, bodyY + 4.5);
    cx += sumCols[1];
    doc.text(fitTextToWidth(doc, row[2], sumCols[2] - 4), cx + 2.5, bodyY + 4.5);
    bodyY += 6.6;
  });

  // --- TABEL II: RINGKASAN BIDANG & DASAR HUKUM ---
  bodyY += 6.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text('II. Ringkasan Bidang Organisasi & Dasar Hukum', marginX, bodyY);
  bodyY += 2.8;

  const divCols = [52, 54, 18, 50]; // 174mm
  const divHeaders = ['Bidang Tata Kelola', 'Dasar Hukum', 'Unit', 'Penanggung Jawab Utama'];

  doc.setFillColor(245, 245, 244);
  doc.setDrawColor(120, 113, 108);
  doc.setLineWidth(0.25);
  doc.rect(marginX, bodyY, contentW, 7.2, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  let dx = marginX;
  divHeaders.forEach((h, idx) => {
    doc.text(h, dx + 2.5, bodyY + 4.9);
    dx += divCols[idx];
  });
  bodyY += 7.2;

  Object.values(DIVISION_META).forEach((meta) => {
    const divNodes = nodes.filter((n) => n.division === meta.id);
    if (divNodes.length === 0) return;
    const leadNode =
      divNodes.slice().sort((a, b) => a.tier - b.tier)[0] ?? divNodes[0];

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.2);
    doc.rect(marginX, bodyY, contentW, 6.4, 'FD');
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(28, 25, 23);

    let cx = marginX;
    doc.text(fitTextToWidth(doc, meta.label, divCols[0] - 4), cx + 2.5, bodyY + 4.4);
    cx += divCols[0];
    doc.text(fitTextToWidth(doc, meta.legalBasis, divCols[1] - 4), cx + 2.5, bodyY + 4.4);
    cx += divCols[1];
    doc.text(`${divNodes.length}`, cx + 2.5, bodyY + 4.4);
    cx += divCols[2];
    doc.text(
      fitTextToWidth(doc, leadNode.personName, divCols[3] - 4),
      cx + 2.5,
      bodyY + 4.4
    );
    bodyY += 6.4;
  });

  // Paragraf Penutup
  bodyY += 6.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  const closingLines = doc.splitTextToSize(
    'Demikian laporan struktur organisasi sekolah ini kami sampaikan. Rincian daftar pejabat struktural, status kepegawaian, dan tugas pokok masing-masing unit terlampir pada Lampiran I dokumen ini. Atas perhatian dan pembinaannya kami ucapkan terima kasih.',
    contentW
  ) as string[];
  closingLines.forEach((lineStr) => {
    doc.text(lineStr, marginX, bodyY);
    bodyY += 4.7;
  });

  // --- BLOK TANDA TANGAN PENGESAHAN ---
  const sigStartY = Math.max(bodyY + 6, 232);
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);

  // Kiri: Mengetahui Ketua Komite Sekolah
  doc.text('Mengetahui,', marginX, sigStartY);
  doc.text('Ketua Komite Sekolah,', marginX, sigStartY + 4.8);
  doc.setFont('times', 'bold');
  doc.text(committeeName, marginX, sigStartY + 24);
  const komW = doc.getTextWidth(committeeName);
  doc.setDrawColor(28, 25, 23);
  doc.setLineWidth(0.25);
  doc.line(marginX, sigStartY + 24.8, marginX + komW, sigStartY + 24.8);

  // Kanan: Kepala Sekolah
  const rightSigX = 124;
  doc.setFont('times', 'normal');
  doc.text(`Ditetapkan di ${cityOnly}`, rightSigX, sigStartY);
  doc.text(`Kepala ${schoolProfile.schoolName},`, rightSigX, sigStartY + 4.8);
  doc.setFont('times', 'bold');
  doc.text(headmasterName, rightSigX, sigStartY + 24);
  const hmW = doc.getTextWidth(headmasterName);
  doc.line(rightSigX, sigStartY + 24.8, rightSigX + hmW, sigStartY + 24.8);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text(`NIP ${headmasterNip}`, rightSigX, sigStartY + 29);

  // ============================================================================
  // HALAMAN 2+: LAMPIRAN I — DAFTAR PEJABAT STRUKTURAL & TUPOKSI
  // ============================================================================
  doc.addPage('a4', 'portrait');

  const drawAttachmentHeader = (isContinuation = false) => {
    drawFittedLogo(doc, provinceLogo, marginX, 10, 12.5, 14.5);
    drawFittedLogo(doc, schoolLogo, pageW - marginX - 12.5, 10, 12.5, 14.5);

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(68, 64, 60);
    doc.text(
      `LAMPIRAN I SURAT KEPALA ${schoolProfile.schoolName.toUpperCase()}${
        isContinuation ? ' (LANJUTAN)' : ''
      }`,
      centerX,
      14,
      { align: 'center' }
    );
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Nomor: ${options.letterNumber || schoolProfile.reportLetterNumber || '-'}   ·   Tanggal: ${formattedDate}`,
      centerX,
      18.5,
      { align: 'center' }
    );
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(28, 25, 23);
    doc.text(
      'SUSUNAN JABATAN, STATUS KEPEGAWAIAN, DAN TUGAS POKOK UNIT KERJA',
      centerX,
      23.5,
      { align: 'center' }
    );
    doc.setDrawColor(28, 25, 23);
    doc.setLineWidth(0.5);
    doc.line(marginX, 26.2, pageW - marginX, 26.2);
  };

  drawAttachmentHeader(false);

  const attCols = [8, 36, 42, 26, 62]; // total = 174mm
  const attHeaders = [
    'No',
    'Jabatan & Bidang',
    'Pejabat & NIP',
    'Status / Gol.',
    'Tugas Pokok & Fungsi',
  ];

  const drawAttachmentTableHeader = (yPos: number) => {
    doc.setFillColor(245, 245, 244);
    doc.setDrawColor(120, 113, 108);
    doc.setLineWidth(0.25);
    doc.rect(marginX, yPos, contentW, 7.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(28, 25, 23);
    let cx = marginX;
    attHeaders.forEach((h, idx) => {
      doc.text(h, cx + 2, yPos + 5);
      cx += attCols[idx];
    });
    return yPos + 7.5;
  };

  let curY = drawAttachmentTableHeader(29.5);
  const sortedNodes = [...nodes].sort(
    (a, b) => a.tier - b.tier || a.division.localeCompare(b.division, 'id')
  );

  sortedNodes.forEach((node, idx) => {
    const meta = DIVISION_META[node.division];
    const roleLines = doc.splitTextToSize(
      node.roleTitle,
      attCols[1] - 4
    ) as string[];
    const nameLines = doc.splitTextToSize(
      node.personName,
      attCols[2] - 4
    ) as string[];
    const statusLines = doc.splitTextToSize(
      `${node.status} (${node.education}) · ${node.rank}`,
      attCols[3] - 4
    ) as string[];
    const tupoksiStr =
      node.tupoksi.length > 0 ? node.tupoksi.slice(0, 2).join('; ') : '-';
    const tupoksiLines = doc.splitTextToSize(
      tupoksiStr,
      attCols[4] - 4
    ) as string[];

    const maxLines = Math.max(
      2,
      roleLines.length + 1,
      nameLines.length + 1,
      statusLines.length,
      tupoksiLines.length
    );
    const rowH = Math.max(10.5, maxLines * 3.8 + 3.5);

    if (curY + rowH > pageH - 22) {
      doc.addPage('a4', 'portrait');
      drawAttachmentHeader(true);
      curY = drawAttachmentTableHeader(29.5);
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.2);
    doc.rect(marginX, curY, contentW, rowH, 'FD');

    let cx = marginX;
    const textY = curY + 4.4;

    // No
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(68, 64, 60);
    doc.text(String(idx + 1), cx + 2, textY);
    cx += attCols[0];

    // Jabatan & Bidang
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    roleLines.forEach((l, li) => doc.text(l, cx + 2, textY + li * 3.6));
    doc.setFont('times', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(87, 83, 78);
    doc.text(
      fitTextToWidth(doc, `${meta.shortLabel} · L${node.tier}`, attCols[1] - 4),
      cx + 2,
      textY + roleLines.length * 3.6
    );
    cx += attCols[1];

    // Pejabat & NIP
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    nameLines.forEach((l, li) => doc.text(l, cx + 2, textY + li * 3.6));
    doc.setFont('times', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(87, 83, 78);
    doc.text(
      fitTextToWidth(
        doc,
        node.nip && node.nip !== '-' ? `NIP ${node.nip}` : 'Non-NIP',
        attCols[2] - 4
      ),
      cx + 2,
      textY + nameLines.length * 3.6
    );
    cx += attCols[2];

    // Status
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(41, 37, 36);
    statusLines.forEach((l, li) => doc.text(l, cx + 2, textY + li * 3.6));
    cx += attCols[3];

    // Tupoksi
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);
    tupoksiLines.forEach((l, li) => doc.text(l, cx + 2, textY + li * 3.6));

    curY += rowH;
  });

  // Pengesahan di bagian akhir Lampiran I
  if (curY + 38 > pageH - 18) {
    doc.addPage('a4', 'portrait');
    drawAttachmentHeader(true);
    curY = 32;
  } else {
    curY += 8;
  }

  const attSigX = 124;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(`Ditetapkan di ${cityOnly}`, attSigX, curY);
  doc.text(`pada tanggal ${formattedDate}`, attSigX, curY + 4.5);
  doc.text(`Kepala ${schoolProfile.schoolName},`, attSigX, curY + 9.5);
  doc.setFont('times', 'bold');
  doc.text(headmasterName, attSigX, curY + 27);
  const attHmW = doc.getTextWidth(headmasterName);
  doc.setDrawColor(28, 25, 23);
  doc.setLineWidth(0.25);
  doc.line(attSigX, curY + 27.8, attSigX + attHmW, curY + 27.8);
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`NIP ${headmasterNip}`, attSigX, curY + 32);

  // Penomoran halaman resmi pada semua halaman
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageH - 13, pageW - marginX, pageH - 13);
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `Laporan Kedinasan · ${schoolProfile.schoolName} (NPSN ${schoolProfile.npsn}) · ${schoolProfile.decreeNumber}`,
      marginX,
      pageH - 9
    );
    doc.setFont('times', 'normal');
    doc.text(`Hal. ${p} dari ${totalPages}`, pageW - marginX, pageH - 9, {
      align: 'right',
    });
  }

  const safeSlug = schoolProfile.schoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`laporan-kedinasan-${safeSlug || 'sekolah'}.pdf`);
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${safe}"`;
}

export function exportDirectoryToCsv(
  nodes: OrgNode[],
  schoolProfile: SchoolProfile
): void {
  const headers = [
    'No',
    'Kode Unit',
    'Tingkat',
    'Jabatan / Unit',
    'Pejabat / Penanggung Jawab',
    'NIP / NUPTK',
    'Pangkat / Golongan',
    'Pendidikan',
    'Status Kepegawaian',
    'Bidang',
    'Hubungan Kerja',
    'Lokasi Ruang',
    'Email Dinas',
    'Telepon',
    'Jumlah Anggota Unit',
    'Tugas Pokok & Fungsi',
  ];

  const sortedNodes = [...nodes].sort(
    (a, b) => a.tier - b.tier || a.division.localeCompare(b.division, 'id')
  );

  const rows = sortedNodes.map((node, idx) => {
    const meta = DIVISION_META[node.division];
    return [
      String(idx + 1),
      node.shortCode,
      `Tingkat ${node.tier}`,
      node.roleTitle,
      node.personName,
      node.nip,
      node.rank,
      node.education,
      node.status,
      meta.label,
      node.relationType === 'komando' ? 'Garis Komando' : 'Garis Koordinasi',
      node.room,
      node.email,
      node.phone,
      node.unitHeadcount ? String(node.unitHeadcount) : '',
      node.tupoksi.join(' | '),
    ]
      .map(escapeCsvCell)
      .join(';');
  });

  // UTF-8 BOM + sep=; hint so Excel in Indonesia separates columns cleanly
  const csvContent =
    '\uFEFFsep=;\n' +
    headers.map(escapeCsvCell).join(';') +
    '\n' +
    rows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeSlug = schoolProfile.schoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  link.download = `rekap-sdm-${safeSlug || 'sekolah'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

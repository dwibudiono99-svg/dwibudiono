import { jsPDF } from 'jspdf';
import { OrgNode, SchoolProfile } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { getPersonInitials } from '../components/PersonAvatar';

interface PlacedCard {
  node: OrgNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ConnectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed: boolean;
  label?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [30, 58, 138];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return [30, 58, 138];
  }
  return [r, g, b];
}

function tintWithWhite(
  rgb: [number, number, number],
  whiteRatio: number
): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * whiteRatio),
    Math.round(rgb[1] + (255 - rgb[1]) * whiteRatio),
    Math.round(rgb[2] + (255 - rgb[2]) * whiteRatio),
  ];
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

async function normalizeImageToJpegDataUrl(
  src: string
): Promise<string | null> {
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
        const size = 180;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
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

async function preloadNodePhotos(
  nodes: OrgNode[]
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    nodes
      .filter((n) => Boolean(n.photoUrl))
      .map(async (n) => {
        const dataUrl = await normalizeImageToJpegDataUrl(n.photoUrl!);
        return [n.id, dataUrl] as const;
      })
  );

  const map: Record<string, string> = {};
  for (const [id, url] of entries) {
    if (url) map[id] = url;
  }
  return map;
}

export async function exportOrgChartToPdf(
  nodes: OrgNode[],
  schoolProfile: SchoolProfile
): Promise<void> {
  if (nodes.length === 0) return;

  const photoMap = await preloadNodePhotos(nodes);

  // A3 Landscape (420mm x 297mm) gives crisp readability for full multi-pillar school trees
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
    compress: true,
  });

  const pageW = doc.internal.pageSize.getWidth(); // 420
  const pageH = doc.internal.pageSize.getHeight(); // 297
  const marginX = 14;

  // Background fill (subtle warm paper tone matching app)
  doc.setFillColor(250, 249, 246);
  doc.rect(0, 0, pageW, pageH, 'F');

  // --- INSTITUTIONAL HEADER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text(
    `${schoolProfile.schoolName.toUpperCase()}  ·  NPSN ${schoolProfile.npsn}  ·  ${schoolProfile.accreditation.toUpperCase()}`,
    marginX,
    13
  );

  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(28, 25, 23);
  doc.text('STRUKTUR ORGANISASI SEKOLAH', marginX, 21.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `Tahun Ajaran ${schoolProfile.academicYear}  ·  ${schoolProfile.decreeNumber}`,
    marginX,
    27
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `${schoolProfile.address}, ${schoolProfile.city}`,
    pageW - marginX,
    21.5,
    { align: 'right' }
  );
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text(`${nodes.length} Unit Jabatan Terdaftar`, pageW - marginX, 27, {
    align: 'right',
  });

  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.35);
  doc.line(marginX, 30.5, pageW - marginX, 30.5);

  // --- BUILD VIRTUAL HIERARCHY LAYOUT (in mm units) ---
  const rootNode = nodes.find((n) => n.parentId === null) ?? nodes[0];
  const komiteNodes = nodes.filter(
    (n) => n.parentId === rootNode.id && n.tier === 1
  );
  const tier2Nodes = nodes.filter(
    (n) => n.parentId === rootNode.id && n.tier >= 2
  );

  const cards: PlacedCard[] = [];
  const lines: ConnectorLine[] = [];

  const TOP_W = 60;
  const TOP_H = 24;
  const COL_W = 55;
  const COL_GAP = 6.5;
  const CARD_H = 22.5;
  const SUB_GAP_Y = 3.5;
  const INDENT_X = 5;

  const numCols = Math.max(1, tier2Nodes.length);
  const tier2TotalW = numCols * COL_W + (numCols - 1) * COL_GAP;
  const rootCenterX = tier2TotalW / 2;
  const rootX = rootCenterX - TOP_W / 2;
  const rootY = 0;

  cards.push({ node: rootNode, x: rootX, y: rootY, w: TOP_W, h: TOP_H });

  // Place Komite Sekolah to the left of Kepala Sekolah
  if (komiteNodes.length > 0) {
    const komiteGapX = 16;
    const komiteX = rootX - komiteGapX - TOP_W;
    komiteNodes.forEach((komite, idx) => {
      const ky = idx * (TOP_H + 4);
      cards.push({ node: komite, x: komiteX, y: ky, w: TOP_W, h: TOP_H });
      const connectY = idx === 0 ? TOP_H / 2 : ky + TOP_H / 2;
      lines.push({
        x1: komiteX + TOP_W,
        y1: connectY,
        x2: rootX,
        y2: idx === 0 ? TOP_H / 2 : connectY,
        dashed: true,
        label: idx === 0 ? 'Koordinasi' : undefined,
      });
    });
  }

  const tier1BottomY = Math.max(
    TOP_H,
    komiteNodes.length > 0 ? komiteNodes.length * (TOP_H + 4) - 4 : TOP_H
  );

  const busY = tier1BottomY + 7;
  const tier2Y = busY + 6;

  // Recursive sub-tree layout helper within a column
  const placeChildren = (
    parentId: string,
    colBaseX: number,
    startY: number,
    parentBottomY: number,
    depth: number
  ): number => {
    const children = nodes.filter((n) => n.parentId === parentId);
    if (children.length === 0) return startY;

    const childX = colBaseX + depth * INDENT_X;
    const childW = Math.max(38, COL_W - depth * INDENT_X);
    const backboneX = childX - 2.6;

    let currentY = startY;
    let lastChildCenterY = startY;

    children.forEach((child) => {
      const cy = currentY;
      cards.push({ node: child, x: childX, y: cy, w: childW, h: CARD_H });

      const midY = cy + CARD_H / 2;
      lastChildCenterY = midY;

      // Horizontal branch from backbone to card left edge
      lines.push({
        x1: backboneX,
        y1: midY,
        x2: childX,
        y2: midY,
        dashed: child.relationType === 'koordinasi',
      });

      currentY += CARD_H + SUB_GAP_Y;

      if (depth < 4) {
        currentY = placeChildren(
          child.id,
          colBaseX,
          currentY,
          cy + CARD_H,
          depth + 1
        );
      }
    });

    // Vertical backbone connecting parent bottom down to last direct child center
    lines.push({
      x1: backboneX,
      y1: parentBottomY,
      x2: backboneX,
      y2: lastChildCenterY,
      dashed: children.every((c) => c.relationType === 'koordinasi'),
    });

    return currentY;
  };

  if (tier2Nodes.length > 0) {
    // Spine from Kepala Sekolah down to bus
    lines.push({
      x1: rootCenterX,
      y1: TOP_H,
      x2: rootCenterX,
      y2: busY,
      dashed: false,
    });

    const firstColCenterX = COL_W / 2;
    const lastColCenterX = (numCols - 1) * (COL_W + COL_GAP) + COL_W / 2;

    if (numCols > 1) {
      lines.push({
        x1: firstColCenterX,
        y1: busY,
        x2: lastColCenterX,
        y2: busY,
        dashed: false,
      });
    }

    tier2Nodes.forEach((pillar, colIdx) => {
      const colX = colIdx * (COL_W + COL_GAP);
      const colCenterX = colX + COL_W / 2;

      // Vertical drop from bus to pillar top
      lines.push({
        x1: colCenterX,
        y1: busY,
        x2: colCenterX,
        y2: tier2Y,
        dashed: pillar.relationType === 'koordinasi',
      });

      cards.push({ node: pillar, x: colX, y: tier2Y, w: COL_W, h: CARD_H });

      placeChildren(
        pillar.id,
        colX,
        tier2Y + CARD_H + SUB_GAP_Y,
        tier2Y + CARD_H,
        1
      );
    });
  }

  // --- COMPUTE BOUNDING BOX & UNIFORM SCALE ---
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of cards) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + c.w);
    maxY = Math.max(maxY, c.y + c.h);
  }

  const contentW = Math.max(1, maxX - minX);
  const contentH = Math.max(1, maxY - minY);

  const areaTop = 35;
  const areaBottom = 262;
  const areaW = pageW - marginX * 2;
  const areaH = areaBottom - areaTop;

  const scale = Math.min(1.06, areaW / contentW, areaH / contentH);
  const offsetX = marginX + (areaW - contentW * scale) / 2 - minX * scale;
  const offsetY =
    areaTop + Math.min(4, (areaH - contentH * scale) / 2) - minY * scale;

  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;
  const ts = (v: number) => v * scale;

  // --- DRAW CONNECTOR LINES ---
  doc.setLineWidth(Math.max(0.2, 0.32 * scale));
  doc.setDrawColor(168, 162, 158);

  for (const line of lines) {
    if (line.dashed) {
      doc.setLineDashPattern([1.6 * scale, 1.2 * scale], 0);
    } else {
      doc.setLineDashPattern([], 0);
    }
    doc.line(tx(line.x1), ty(line.y1), tx(line.x2), ty(line.y2));

    if (line.label) {
      doc.setLineDashPattern([], 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.max(5.5, 6.2 * scale));
      doc.setTextColor(120, 113, 108);
      doc.text(
        line.label.toUpperCase(),
        tx((line.x1 + line.x2) / 2),
        ty(line.y1) - 1.5 * scale,
        { align: 'center' }
      );
    }
  }
  doc.setLineDashPattern([], 0);

  // --- DRAW NODE CARDS ---
  for (const card of cards) {
    const { node } = card;
    const meta = DIVISION_META[node.division];
    const accentRgb = hexToRgb(meta.accentHex);
    const softBgRgb = tintWithWhite(accentRgb, 0.9);

    const x = tx(card.x);
    const y = ty(card.y);
    const w = ts(card.w);
    const h = ts(card.h);
    const pad = ts(2.4);
    const radius = ts(1.8);

    // Card background & border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(Math.max(0.2, 0.28 * scale));
    doc.roundedRect(x, y, w, h, radius, radius, 'FD');

    // Top division accent bar
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.roundedRect(
      x + ts(2.5),
      y,
      w - ts(5),
      Math.max(0.5, ts(0.75)),
      ts(0.3),
      ts(0.3),
      'F'
    );

    // Avatar (photo or initials) at top-right
    const avatarSize = ts(6.8);
    const avatarX = x + w - pad - avatarSize;
    const avatarY = y + pad + ts(0.3);
    const photoDataUrl = photoMap[node.id];

    if (photoDataUrl) {
      try {
        doc.addImage(
          photoDataUrl,
          'JPEG',
          avatarX,
          avatarY,
          avatarSize,
          avatarSize
        );
        doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.setLineWidth(Math.max(0.15, 0.22 * scale));
        doc.rect(avatarX, avatarY, avatarSize, avatarSize, 'S');
      } catch {
        // Fallback to initials below
        doc.setFillColor(softBgRgb[0], softBgRgb[1], softBgRgb[2]);
        doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.roundedRect(
          avatarX,
          avatarY,
          avatarSize,
          avatarSize,
          ts(1),
          ts(1),
          'FD'
        );
        doc.setFont('times', 'bold');
        doc.setFontSize(Math.max(5.5, 6.8 * scale));
        doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.text(
          getPersonInitials(node.personName),
          avatarX + avatarSize / 2,
          avatarY + avatarSize * 0.65,
          { align: 'center' }
        );
      }
    } else {
      doc.setFillColor(softBgRgb[0], softBgRgb[1], softBgRgb[2]);
      doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      doc.setLineWidth(Math.max(0.15, 0.2 * scale));
      doc.roundedRect(
        avatarX,
        avatarY,
        avatarSize,
        avatarSize,
        ts(1),
        ts(1),
        'FD'
      );
      doc.setFont('times', 'bold');
      doc.setFontSize(Math.max(5.5, 6.8 * scale));
      doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      doc.text(
        getPersonInitials(node.personName),
        avatarX + avatarSize / 2,
        avatarY + avatarSize * 0.65,
        { align: 'center' }
      );
    }

    // Left text column width (avoid colliding with avatar)
    const textMaxW = w - pad * 2 - avatarSize - ts(1.8);

    // Code & Employment Status line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(5, 5.8 * scale));
    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    const codeText = `${node.shortCode} · ${node.status}`;
    doc.text(
      fitTextToWidth(doc, codeText, textMaxW),
      x + pad,
      y + pad + ts(2.2)
    );

    // Role Title (wrapped up to 2 lines)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, 7.2 * scale));
    doc.setTextColor(28, 25, 23);
    const wrappedRole = doc.splitTextToSize(node.roleTitle, textMaxW) as string[];
    const roleLines = wrappedRole.slice(0, 2);
    if (wrappedRole.length > 2) {
      roleLines[1] = fitTextToWidth(doc, `${roleLines[1]}…`, textMaxW);
    }
    const roleStartY = y + pad + ts(5.6);
    const lineStep = ts(3.1);
    roleLines.forEach((lineStr, idx) => {
      doc.text(lineStr, x + pad, roleStartY + idx * lineStep);
    });

    // Divider line above person identity
    const dividerY = y + h - ts(8.2);
    doc.setDrawColor(231, 229, 228);
    doc.setLineWidth(Math.max(0.12, 0.18 * scale));
    doc.line(x + pad, dividerY, x + w - pad, dividerY);

    // Person Name
    const innerFullW = w - pad * 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(5.5, 6.6 * scale));
    doc.setTextColor(41, 37, 36);
    doc.text(
      fitTextToWidth(doc, node.personName, innerFullW),
      x + pad,
      dividerY + ts(3.3)
    );

    // NIP / Rank
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(Math.max(4.8, 5.7 * scale));
    doc.setTextColor(120, 113, 108);
    const subMeta =
      node.nip && node.nip !== '-' ? `NIP ${node.nip}` : node.rank;
    doc.text(
      fitTextToWidth(doc, subMeta, innerFullW),
      x + pad,
      dividerY + ts(6.3)
    );
  }

  // --- FOOTER: LEGEND & RATIFICATION SIGNATURE ---
  const footerTopY = 266;
  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerTopY, pageW - marginX, footerTopY);

  // Legend (left)
  doc.setDrawColor(87, 83, 78);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([], 0);
  doc.line(marginX, footerTopY + 6, marginX + 10, footerTopY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text('Garis Komando / Instruksi Langsung', marginX + 12.5, footerTopY + 7);

  doc.setLineDashPattern([1.6, 1.2], 0);
  doc.line(marginX, footerTopY + 12, marginX + 10, footerTopY + 12);
  doc.setLineDashPattern([], 0);
  doc.text('Garis Koordinasi & Kemitraan', marginX + 12.5, footerTopY + 13);

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text(
    `Dokumen diekspor pada ${formattedDate} · ${schoolProfile.schoolName}`,
    marginX,
    footerTopY + 21
  );

  // Headmaster Ratification Signature (right)
  const sigX = pageW - marginX - 75;
  const cityOnly = schoolProfile.city.split(',')[0].trim() || 'Surabaya';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(41, 37, 36);
  doc.text(`Ditetapkan di ${cityOnly}`, sigX, footerTopY + 5.5);
  doc.text(`Kepala ${schoolProfile.schoolName},`, sigX, footerTopY + 10);

  const headmasterName = rootNode.personName || schoolProfile.headmasterName;
  doc.setFont('helvetica', 'bold');
  doc.text(headmasterName, sigX, footerTopY + 23.5);
  const nameW = doc.getTextWidth(headmasterName);
  doc.setDrawColor(41, 37, 36);
  doc.setLineWidth(0.25);
  doc.line(sigX, footerTopY + 24.3, sigX + nameW, footerTopY + 24.3);

  if (rootNode.nip && rootNode.nip !== '-') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(87, 83, 78);
    doc.text(`NIP ${rootNode.nip}`, sigX, footerTopY + 28);
  }

  // --- PAGE 2+: DIRECTORY & TUPOKSI SUMMARY ---
  doc.addPage('a3', 'landscape');
  doc.setFillColor(250, 249, 246);
  doc.rect(0, 0, pageW, pageH, 'F');

  const drawDirectoryHeader = (isContinuation = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `${schoolProfile.schoolName.toUpperCase()}  ·  LAMPIRAN DIREKTORI JABATAN & TUPOKSI${
        isContinuation ? ' (LANJUTAN)' : ''
      }`,
      marginX,
      14
    );
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(28, 25, 23);
    doc.text(
      'Daftar Pejabat Struktural, Status Kepegawaian & Tugas Pokok',
      marginX,
      21.5
    );
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.35);
    doc.line(marginX, 25, pageW - marginX, 25);
  };

  drawDirectoryHeader(false);

  const colWidths = [10, 16, 62, 68, 52, 48, 136]; // sum = 392mm (= pageW - 2*14)
  const headers = [
    'No',
    'Tingkat',
    'Jabatan & Bidang',
    'Pejabat / Penanggung Jawab',
    'NIP & Status',
    'Lokasi Ruang',
    'Tugas Pokok & Fungsi Utama',
  ];

  const drawTableHeader = (yPos: number) => {
    doc.setFillColor(245, 245, 244);
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.25);
    doc.rect(marginX, yPos, pageW - marginX * 2, 8.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);

    let cx = marginX;
    headers.forEach((h, i) => {
      doc.text(h, cx + 2.5, yPos + 5.6);
      cx += colWidths[i];
    });
    return yPos + 8.5;
  };

  let curY = drawTableHeader(29);
  const sortedNodes = [...nodes].sort(
    (a, b) => a.tier - b.tier || a.division.localeCompare(b.division, 'id')
  );

  sortedNodes.forEach((node, idx) => {
    const meta = DIVISION_META[node.division];
    const tupoksiSummary =
      node.tupoksi.length > 0
        ? node.tupoksi.slice(0, 2).join('; ')
        : '-';
    const titleLines = doc.splitTextToSize(
      node.roleTitle,
      colWidths[2] - 5
    ) as string[];
    const metaLine = `[${meta.shortLabel} · ${node.shortCode}]`;
    const nameLines = doc.splitTextToSize(
      node.personName,
      colWidths[3] - 5
    ) as string[];
    const rankLines = doc.splitTextToSize(
      node.rank,
      colWidths[3] - 5
    ) as string[];
    const tupoksiLines = doc.splitTextToSize(
      tupoksiSummary,
      colWidths[6] - 5
    ) as string[];

    const maxLines = Math.max(
      2,
      titleLines.length + 1,
      nameLines.length + rankLines.length,
      tupoksiLines.length
    );
    const rowH = Math.max(11, maxLines * 4 + 4);

    if (curY + rowH > pageH - 16) {
      doc.addPage('a3', 'landscape');
      doc.setFillColor(250, 249, 246);
      doc.rect(0, 0, pageW, pageH, 'F');
      drawDirectoryHeader(true);
      curY = drawTableHeader(29);
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(231, 229, 228);
    doc.setLineWidth(0.2);
    doc.rect(marginX, curY, pageW - marginX * 2, rowH, 'FD');

    let cx = marginX;
    const textY = curY + 5;

    // No
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(87, 83, 78);
    doc.text(String(idx + 1).padStart(2, '0'), cx + 2.5, textY);
    cx += colWidths[0];

    // Tier
    doc.text(`L${node.tier}`, cx + 2.5, textY);
    cx += colWidths[1];

    // Jabatan & Bidang
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(28, 25, 23);
    titleLines.forEach((lineStr, lIdx) => {
      doc.text(lineStr, cx + 2.5, textY + lIdx * 3.8);
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(metaLine, cx + 2.5, textY + titleLines.length * 3.8);
    cx += colWidths[2];

    // Pejabat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(28, 25, 23);
    nameLines.forEach((lineStr, lIdx) => {
      doc.text(lineStr, cx + 2.5, textY + lIdx * 3.8);
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(87, 83, 78);
    rankLines.forEach((lineStr, lIdx) => {
      doc.text(
        lineStr,
        cx + 2.5,
        textY + (nameLines.length + lIdx) * 3.8
      );
    });
    cx += colWidths[3];

    // NIP & Status
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(41, 37, 36);
    doc.text(fitTextToWidth(doc, node.nip, colWidths[4] - 5), cx + 2.5, textY);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(`${node.status} · ${node.education}`, cx + 2.5, textY + 4);
    cx += colWidths[4];

    // Ruang
    doc.setFontSize(7.5);
    doc.setTextColor(68, 64, 60);
    const roomLines = doc.splitTextToSize(node.room, colWidths[5] - 5) as string[];
    roomLines.slice(0, 2).forEach((lineStr, lIdx) => {
      doc.text(lineStr, cx + 2.5, textY + lIdx * 3.8);
    });
    cx += colWidths[5];

    // Tupoksi
    doc.setFontSize(7.5);
    doc.setTextColor(68, 64, 60);
    tupoksiLines.forEach((lineStr, lIdx) => {
      doc.text(lineStr, cx + 2.5, textY + lIdx * 3.8);
    });

    curY += rowH;
  });

  const safeSlug = schoolProfile.schoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`struktur-organisasi-${safeSlug || 'sekolah'}.pdf`);
}

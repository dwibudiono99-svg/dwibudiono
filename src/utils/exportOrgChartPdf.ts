import { jsPDF } from 'jspdf';
import { OrgNode, SchoolProfile } from '../types/org';
import { DIVISION_META } from '../data/defaultOrgData';
import { getPersonInitials } from '../components/PersonAvatar';
import { getDefaultLogoDataUri } from '../components/KopLogos';

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
    // Ignore unsupported image payload
  }
}

export async function exportOrgChartToPdf(
  nodes: OrgNode[],
  schoolProfile: SchoolProfile
): Promise<void> {
  if (nodes.length === 0) return;

  const [photoMap, provinceLogo, schoolLogo] = await Promise.all([
    preloadNodePhotos(nodes),
    loadLogoPngDataUrl(
      schoolProfile.provinceLogoUrl || getDefaultLogoDataUri('province')
    ),
    loadLogoPngDataUrl(
      schoolProfile.schoolLogoUrl || getDefaultLogoDataUri('school')
    ),
  ]);

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

  // --- INSTITUTIONAL KOP HEADER WITH PROVINCE (LEFT) & SCHOOL (RIGHT) LOGOS ---
  drawFittedLogo(doc, provinceLogo, marginX, 7.5, 19, 21);
  drawFittedLogo(doc, schoolLogo, pageW - marginX - 19, 7.5, 19, 21);

  const centerX = pageW / 2;
  const provinceLabel = (
    schoolProfile.provinceName ||
    'PEMERINTAH PROVINSI JAWA TIMUR · DINAS PENDIDIKAN'
  ).toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(87, 83, 78);
  doc.text(provinceLabel, centerX, 11.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text(
    `${schoolProfile.schoolName.toUpperCase()}  ·  NPSN ${schoolProfile.npsn}  ·  ${schoolProfile.accreditation.toUpperCase()}`,
    centerX,
    15.8,
    { align: 'center' }
  );

  doc.setFont('times', 'bold');
  doc.setFontSize(21.5);
  doc.setTextColor(28, 25, 23);
  doc.text('STRUKTUR ORGANISASI SEKOLAH', centerX, 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `Tahun Ajaran ${schoolProfile.academicYear}  ·  ${schoolProfile.decreeNumber}  ·  ${schoolProfile.address}, ${schoolProfile.city}`,
    centerX,
    28,
    { align: 'center' }
  );

  // Double Kop Surat separator lines
  doc.setDrawColor(68, 64, 60);
  doc.setLineWidth(0.65);
  doc.line(marginX, 30.8, pageW - marginX, 30.8);
  doc.setDrawColor(168, 162, 158);
  doc.setLineWidth(0.25);
  doc.line(marginX, 31.8, pageW - marginX, 31.8);

  // --- BUILD VIRTUAL HIERARCHY LAYOUT (in mm units) ---
  const rootNode = nodes.find((n) => n.parentId === null) ?? nodes[0];
  const komiteNodes = nodes.filter(
    (n) => n.parentId === rootNode.id && n.tier === 1
  );
  const tier2Nodes = nodes.filter(
    (n) => n.parentId === rootNode.id && n.tier === 2
  );
  const guruMapelNode =
    nodes.find(
      (n) => n.id === 'guru_mapel' && n.parentId === rootNode.id && n.tier >= 3
    ) ?? null;

  const cards: PlacedCard[] = [];
  const lines: ConnectorLine[] = [];

  const TOP_W = 58;
  const TOP_H = 21.5;
  const COL_W = 54;
  const COL_GAP = 5.5;
  const SUBCOL_GAP = 5;
  const CARD_H = 21;
  const SUB_GAP_Y = 2.0;
  const INDENT_X = 4.5;

  const countSubtreeSize = (nodeId: string, depth = 0): number => {
    if (depth > 4) return 1;
    const kids = nodes.filter((n) => n.parentId === nodeId);
    return (
      1 +
      kids.reduce((sum, kid) => sum + countSubtreeSize(kid.id, depth + 1), 0)
    );
  };

  // Columns with > 7 descendants (e.g. Koordinator TU with 13 units) split into 2 side-by-side sub-columns
  // so total height stays compact and A3 PDF scale increases dramatically for 60+ readability.
  const colMeta = tier2Nodes.map((pillar) => {
    const directKids = nodes.filter((n) => n.parentId === pillar.id);
    const totalDescendants = directKids.reduce(
      (sum, k) => sum + countSubtreeSize(k.id, 1),
      0
    );
    const isDouble = totalDescendants > 7 && directKids.length >= 2;
    return {
      pillar,
      directKids,
      isDouble,
      width: isDouble ? COL_W * 2 + SUBCOL_GAP : COL_W,
    };
  });

  let cursorX = 0;
  const colPositions = colMeta.map((cm) => {
    const x = cursorX;
    cursorX += cm.width + COL_GAP;
    return { ...cm, x, centerX: x + cm.width / 2 };
  });

  const tier2TotalW = Math.max(COL_W, cursorX - COL_GAP);
  const rootCenterX = tier2TotalW / 2;
  const rootX = rootCenterX - TOP_W / 2;
  const rootY = 0;

  cards.push({ node: rootNode, x: rootX, y: rootY, w: TOP_W, h: TOP_H });

  // Place Komite Sekolah to the left of Kepala Sekolah
  if (komiteNodes.length > 0) {
    const komiteGapX = 14;
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

  const busY = tier1BottomY + 5;
  const tier2Y = busY + 4.5;

  // Helper to lay out a list of sibling nodes vertically along a single backbone
  const placeBranchList = (
    branchNodes: OrgNode[],
    colBaseX: number,
    startY: number,
    parentBottomY: number,
    depth: number
  ): { nextY: number; lastCardBottomY: number; backboneX: number } => {
    if (branchNodes.length === 0) {
      return {
        nextY: startY,
        lastCardBottomY: parentBottomY,
        backboneX: colBaseX,
      };
    }

    const childX = colBaseX + depth * INDENT_X;
    const childW = Math.max(38, COL_W - depth * INDENT_X);
    const backboneX = childX - 2.4;

    let currentY = startY;
    let lastChildCenterY = startY;
    let lastCardBottomY = parentBottomY;

    branchNodes.forEach((child) => {
      const cy = currentY;
      cards.push({ node: child, x: childX, y: cy, w: childW, h: CARD_H });

      const midY = cy + CARD_H / 2;
      lastChildCenterY = midY;
      lastCardBottomY = cy + CARD_H;

      lines.push({
        x1: backboneX,
        y1: midY,
        x2: childX,
        y2: midY,
        dashed: child.relationType === 'koordinasi',
      });

      currentY += CARD_H + SUB_GAP_Y;

      if (depth < 4) {
        const subKids = nodes.filter((n) => n.parentId === child.id);
        if (subKids.length > 0) {
          const subResult = placeBranchList(
            subKids,
            colBaseX,
            currentY,
            cy + CARD_H,
            depth + 1
          );
          currentY = subResult.nextY;
          lastCardBottomY = Math.max(lastCardBottomY, subResult.lastCardBottomY);
        }
      }
    });

    lines.push({
      x1: backboneX,
      y1: parentBottomY,
      x2: backboneX,
      y2: lastChildCenterY,
      dashed: branchNodes.every((c) => c.relationType === 'koordinasi'),
    });

    return { nextY: currentY, lastCardBottomY, backboneX };
  };

  const colBottomYs: number[] = [];

  if (colPositions.length > 0) {
    lines.push({
      x1: rootCenterX,
      y1: TOP_H,
      x2: rootCenterX,
      y2: busY,
      dashed: false,
    });

    const firstColCenterX = colPositions[0].centerX;
    const lastColCenterX = colPositions[colPositions.length - 1].centerX;

    if (colPositions.length > 1) {
      lines.push({
        x1: firstColCenterX,
        y1: busY,
        x2: lastColCenterX,
        y2: busY,
        dashed: false,
      });
    }

    colPositions.forEach((colInfo) => {
      const { pillar, directKids, isDouble, x, centerX: colCenterX } = colInfo;

      lines.push({
        x1: colCenterX,
        y1: busY,
        x2: colCenterX,
        y2: tier2Y,
        dashed: pillar.relationType === 'koordinasi',
      });

      const pillarCardX = colCenterX - COL_W / 2;
      cards.push({
        node: pillar,
        x: pillarCardX,
        y: tier2Y,
        w: COL_W,
        h: CARD_H,
      });

      const pillarBottomY = tier2Y + CARD_H;

      if (!isDouble) {
        const res = placeBranchList(
          directKids,
          x,
          pillarBottomY + SUB_GAP_Y,
          pillarBottomY,
          1
        );
        colBottomYs.push(res.lastCardBottomY);
      } else {
        // Greedy 2-bucket partition by subtree weight (keep each direct child's sub-units intact)
        const leftKids: OrgNode[] = [];
        const rightKids: OrgNode[] = [];
        let leftWeight = 0;
        let rightWeight = 0;

        directKids.forEach((kid) => {
          const w = countSubtreeSize(kid.id, 1);
          if (leftWeight <= rightWeight) {
            leftKids.push(kid);
            leftWeight += w;
          } else {
            rightKids.push(kid);
            rightWeight += w;
          }
        });

        const subBusY = pillarBottomY + 2.8;
        const subStartY = subBusY + 2.5;
        const subDashed = directKids.every(
          (k) => k.relationType === 'koordinasi'
        );

        const leftBackboneX = x + INDENT_X - 2.4;
        const rightBaseX = x + COL_W + SUBCOL_GAP;
        const rightBackboneX = rightBaseX + INDENT_X - 2.4;

        // Vertical drop from pillar bottom to horizontal split bar
        lines.push({
          x1: colCenterX,
          y1: pillarBottomY,
          x2: colCenterX,
          y2: subBusY,
          dashed: subDashed,
        });
        lines.push({
          x1: leftBackboneX,
          y1: subBusY,
          x2: rightBackboneX,
          y2: subBusY,
          dashed: subDashed,
        });

        const leftRes = placeBranchList(leftKids, x, subStartY, subBusY, 1);
        const rightRes = placeBranchList(
          rightKids,
          rightBaseX,
          subStartY,
          subBusY,
          1
        );

        const subMaxBottom = Math.max(
          leftRes.lastCardBottomY,
          rightRes.lastCardBottomY
        );
        const mergeY = subMaxBottom + 2.5;
        const leftMidX = x + INDENT_X + (COL_W - INDENT_X) / 2;
        const rightMidX = rightBaseX + INDENT_X + (COL_W - INDENT_X) / 2;

        // Clean merge bracket back to colCenterX for the bottom command collector bar
        lines.push({
          x1: leftMidX,
          y1: leftRes.lastCardBottomY,
          x2: leftMidX,
          y2: mergeY,
          dashed: false,
        });
        lines.push({
          x1: rightMidX,
          y1: rightRes.lastCardBottomY,
          x2: rightMidX,
          y2: mergeY,
          dashed: false,
        });
        lines.push({
          x1: leftMidX,
          y1: mergeY,
          x2: rightMidX,
          y2: mergeY,
          dashed: false,
        });
        colBottomYs.push(mergeY);
      }
    });

    // Shared solid command collector bar below Koordinator TU & 4 Staff Waka -> Guru Mata Pelajaran
    if (guruMapelNode) {
      const maxColBottomY = Math.max(...colBottomYs);
      const coordBarY = maxColBottomY + 4.5;

      colPositions.forEach((colInfo, colIdx) => {
        lines.push({
          x1: colInfo.centerX,
          y1: colBottomYs[colIdx],
          x2: colInfo.centerX,
          y2: coordBarY,
          dashed: false,
        });
      });

      if (colPositions.length > 1) {
        lines.push({
          x1: firstColCenterX,
          y1: coordBarY,
          x2: lastColCenterX,
          y2: coordBarY,
          dashed: false,
        });
      }

      const guruY = coordBarY + 5;
      lines.push({
        x1: rootCenterX,
        y1: coordBarY,
        x2: rootCenterX,
        y2: guruY,
        dashed: false,
      });

      const guruX = rootCenterX - TOP_W / 2;
      cards.push({
        node: guruMapelNode,
        x: guruX,
        y: guruY,
        w: TOP_W,
        h: CARD_H,
      });

      // Solid command branch from Guru Mata Pelajaran -> Siswa / Peserta Didik
      const guruChildren = nodes.filter((n) => n.parentId === guruMapelNode.id);
      if (guruChildren.length > 0) {
        const childBusY = guruY + CARD_H + 4;
        lines.push({
          x1: rootCenterX,
          y1: guruY + CARD_H,
          x2: rootCenterX,
          y2: guruChildren.length === 1 ? guruY + CARD_H + 6 : childBusY,
          dashed: guruChildren.every((c) => c.relationType === 'koordinasi'),
        });

        const totalChildW =
          guruChildren.length * TOP_W + (guruChildren.length - 1) * COL_GAP;
        const startChildX = rootCenterX - totalChildW / 2;

        if (guruChildren.length > 1) {
          lines.push({
            x1: startChildX + TOP_W / 2,
            y1: childBusY,
            x2: startChildX + totalChildW - TOP_W / 2,
            y2: childBusY,
            dashed: false,
          });
        }

        guruChildren.forEach((child, idx) => {
          const cx = startChildX + idx * (TOP_W + COL_GAP);
          const cy = guruChildren.length === 1 ? guruY + CARD_H + 6 : childBusY + 4;
          if (guruChildren.length > 1) {
            lines.push({
              x1: cx + TOP_W / 2,
              y1: childBusY,
              x2: cx + TOP_W / 2,
              y2: cy,
              dashed: child.relationType === 'koordinasi',
            });
          }
          cards.push({ node: child, x: cx, y: cy, w: TOP_W, h: CARD_H });
        });
      }
    }
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

  const areaTop = 34;
  const areaBottom = 264;
  const areaW = pageW - marginX * 2;
  const areaH = areaBottom - areaTop;

  const scale = Math.min(1.08, areaW / contentW, areaH / contentH);
  const offsetX = marginX + (areaW - contentW * scale) / 2 - minX * scale;
  const offsetY =
    areaTop + Math.min(3, (areaH - contentH * scale) / 2) - minY * scale;

  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;
  const ts = (v: number) => v * scale;

  // --- DRAW CONNECTOR LINES ---
  doc.setLineWidth(Math.max(0.28, 0.42 * scale));
  doc.setDrawColor(120, 113, 108);

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
    const textMaxW = w - pad * 2 - avatarSize - ts(1.2);

    // Code & Employment Status line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(5.5, 7.2 * scale));
    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    const codeText = `${node.shortCode} · ${node.status}`;
    doc.text(
      fitTextToWidth(doc, codeText, textMaxW),
      x + pad,
      y + pad + ts(2.2)
    );

    // Role Title (wrapped up to 2 lines)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6.8, 9.0 * scale));
    doc.setTextColor(28, 25, 23);
    const wrappedRole = doc.splitTextToSize(node.roleTitle, textMaxW) as string[];
    const roleLines = wrappedRole.slice(0, 2);
    if (wrappedRole.length > 2) {
      roleLines[1] = fitTextToWidth(doc, `${roleLines[1]}…`, textMaxW);
    }
    const roleStartY = y + pad + ts(5.8);
    const lineStep = ts(3.4);
    roleLines.forEach((lineStr, idx) => {
      doc.text(lineStr, x + pad, roleStartY + idx * lineStep);
    });

    // Divider line above person identity
    const dividerY = y + h - ts(8.6);
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(Math.max(0.15, 0.22 * scale));
    doc.line(x + pad, dividerY, x + w - pad, dividerY);

    // Person Name
    const innerFullW = w - pad * 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6.2, 8.2 * scale));
    doc.setTextColor(28, 25, 23);
    doc.text(
      fitTextToWidth(doc, node.personName, innerFullW),
      x + pad,
      dividerY + ts(3.7)
    );

    // NIP / Rank
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(Math.max(5.2, 7.0 * scale));
    doc.setTextColor(87, 83, 78);
    const subMeta =
      node.nip && node.nip !== '-' ? `NIP ${node.nip}` : node.rank;
    doc.text(
      fitTextToWidth(doc, subMeta, innerFullW),
      x + pad,
      dividerY + ts(7.0)
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
  const resolvedAppUrl =
    (
      schoolProfile.appWebUrl ||
      'https://ais-pre-kcxun5xqxzgbw5ptyepfru-302703941788.asia-southeast1.run.app'
    ).replace(/\/+$/, '') + '/';

  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text(
    `Dokumen diekspor pada ${formattedDate} · ${schoolProfile.schoolName}`,
    marginX,
    footerTopY + 19.5
  );
  doc.setTextColor(30, 58, 138);
  doc.textWithLink(`Tautan Web: ${resolvedAppUrl}`, marginX, footerTopY + 24.5, {
    url: resolvedAppUrl,
  });

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
    drawFittedLogo(doc, provinceLogo, marginX, 8, 13.5, 15);
    drawFittedLogo(doc, schoolLogo, pageW - marginX - 13.5, 8, 13.5, 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(87, 83, 78);
    doc.text(
      `${provinceLabel}  ·  ${schoolProfile.schoolName.toUpperCase()}${
        isContinuation ? ' (LANJUTAN)' : ''
      }`,
      centerX,
      13.5,
      { align: 'center' }
    );
    doc.setFont('times', 'bold');
    doc.setFontSize(15.5);
    doc.setTextColor(28, 25, 23);
    doc.text(
      'Daftar Pejabat Struktural, Status Kepegawaian & Tugas Pokok',
      centerX,
      20.8,
      { align: 'center' }
    );
    doc.setDrawColor(68, 64, 60);
    doc.setLineWidth(0.5);
    doc.line(marginX, 24.5, pageW - marginX, 24.5);
    doc.setDrawColor(168, 162, 158);
    doc.setLineWidth(0.2);
    doc.line(marginX, 25.3, pageW - marginX, 25.3);
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

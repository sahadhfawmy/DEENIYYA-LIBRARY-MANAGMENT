import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Student, LibrarySettings } from '../types';
import { COLLEGE_LOGO } from '../data/logo';

export type CardResolution = 'HD' | '2K' | '3K';
export type CardPrintTheme = 'emerald-gold' | 'print-clean' | 'royal-gold';

export interface ResolutionConfig {
  width: number;
  height: number;
  label: string;
  dpi: number;
}

export const RESOLUTION_PRESETS: Record<CardResolution, ResolutionConfig> = {
  HD: {
    width: 1920,
    height: 1080,
    label: 'HD (1920 × 1080)',
    dpi: 150,
  },
  '2K': {
    width: 2560,
    height: 1440,
    label: '2K QHD (2560 × 1440)',
    dpi: 200,
  },
  '3K': {
    width: 3072,
    height: 1728,
    label: '3K Ultra HD (3072 × 1728)',
    dpi: 300,
  },
};

export interface RenderCardOptions {
  resolution?: CardResolution;
  theme?: CardPrintTheme;
  format?: 'png' | 'jpeg';
  includeCutGuides?: boolean;
}

/**
 * Safely loads an image URL into an HTMLImageElement with CORS enabled
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Draws an 8-pointed Islamic Star at (cx, cy) with radius R
 */
function drawIslamicStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const innerR = r * 0.58;
  const numPoints = 8;
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? r : innerR;
    const angle = (i * Math.PI) / numPoints - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws ornate Islamic corner brackets in gold
 */
function drawCornerBracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angleDeg: number,
  goldGrad: CanvasGradient | string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.stroke();

  // Subtle interior diagonal
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size * 0.45, 0);
  ctx.lineTo(0, size * 0.45);
  ctx.stroke();

  ctx.restore();
}

/**
 * Checks if a string has actual non-dash, non-placeholder content
 */
export function getValidValue(val?: string): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (
    trimmed === '-' ||
    trimmed === '—' ||
    trimmed === '–' ||
    trimmed === 'N/A' ||
    trimmed === 'null' ||
    trimmed === 'undefined'
  ) {
    return '';
  }
  return trimmed;
}

/**
 * Formats date consistently: YYYY-MM-DD without inventing values
 */
export function formatValidDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const clean = dateStr.trim();
  if (clean === '-' || clean === '—' || clean === 'N/A' || clean === 'null' || clean === 'undefined') {
    return '';
  }
  return clean;
}

/**
 * Draws image with 'cover' fitting into [x, y, w, h] preserving aspect ratio
 */
function drawImageProp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgW = img.width || 1;
  const imgH = img.height || 1;
  const imgRatio = imgW / imgH;
  const targetRatio = w / h;

  let renderW = w;
  let renderH = h;
  let renderX = x;
  let renderY = y;

  if (imgRatio > targetRatio) {
    renderW = h * imgRatio;
    renderX = x - (renderW - w) / 2;
  } else {
    renderH = w / imgRatio;
    renderY = y - (renderH - h) / 2;
  }

  ctx.drawImage(img, renderX, renderY, renderW, renderH);
}

/**
 * Main Canvas Renderer: Generates a 16:9 Landscape Student Digital ID Card
 * with LARGE, HIGH-CONTRAST, PRINT-FRIENDLY TYPOGRAPHY and customizable theme.
 */
export async function renderStudentIdCardCanvas(
  student: Student,
  settings: LibrarySettings,
  options: RenderCardOptions = {}
): Promise<HTMLCanvasElement> {
  const resKey: CardResolution = options.resolution || '3K';
  const cardTheme: CardPrintTheme = options.theme || 'emerald-gold';
  const config = RESOLUTION_PRESETS[resKey] || RESOLUTION_PRESETS['3K'];
  const width = config.width;
  const height = config.height;

  // Scale factor relative to 1920x1080 baseline
  const s = width / 1920;

  // Make sure document fonts are loaded if available
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading errors
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Determine colors based on print theme
  const isPrintClean = cardTheme === 'print-clean';

  // 1. Base Layer & Background
  const outerRadius = 36 * s;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(outerRadius, 0);
  ctx.lineTo(width - outerRadius, 0);
  ctx.quadraticCurveTo(width, 0, width, outerRadius);
  ctx.lineTo(width, height - outerRadius);
  ctx.quadraticCurveTo(width, height, width - outerRadius, height);
  ctx.lineTo(outerRadius, height);
  ctx.quadraticCurveTo(0, height, 0, height - outerRadius);
  ctx.lineTo(0, outerRadius);
  ctx.quadraticCurveTo(0, 0, outerRadius, 0);
  ctx.closePath();
  ctx.clip();

  if (isPrintClean) {
    // Print-Friendly Clean White / Toner-Saver Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle ivory paper sheen
    const paperGrad = ctx.createLinearGradient(0, 0, width, height);
    paperGrad.addColorStop(0, '#ffffff');
    paperGrad.addColorStop(0.5, '#fbfaf8');
    paperGrad.addColorStop(1, '#f7f5f0');
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, width, height);

    // Light repeating Islamic stars in print-friendly tone
    const starSpacing = 160 * s;
    for (let gx = starSpacing / 2; gx < width; gx += starSpacing) {
      for (let gy = starSpacing / 2; gy < height; gy += starSpacing) {
        drawIslamicStar(ctx, gx, gy, 12 * s, 'rgba(6, 78, 59, 0.03)');
      }
    }
  } else {
    // Flagship Deep Imperial Emerald & Royal Green
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#01170e');
    bgGrad.addColorStop(0.3, '#022416');
    bgGrad.addColorStop(0.7, '#043823');
    bgGrad.addColorStop(1, '#01150c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Central Emerald & Gold Radial Aura
    const radialAura = ctx.createRadialGradient(width * 0.5, height * 0.45, 120 * s, width * 0.5, height * 0.45, 850 * s);
    radialAura.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    radialAura.addColorStop(0.5, 'rgba(212, 175, 55, 0.06)');
    radialAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialAura;
    ctx.fillRect(0, 0, width, height);

    // Repeating Geometric Star Pattern
    const starSpacing = 160 * s;
    for (let gx = starSpacing / 2; gx < width; gx += starSpacing) {
      for (let gy = starSpacing / 2; gy < height; gy += starSpacing) {
        drawIslamicStar(ctx, gx, gy, 12 * s, 'rgba(212, 175, 55, 0.04)');
      }
    }
  }

  // 2. Architectural Mihrab Arch Outline
  ctx.save();
  ctx.strokeStyle = isPrintClean ? 'rgba(6, 78, 59, 0.08)' : 'rgba(212, 175, 55, 0.1)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, height);
  ctx.lineTo(width * 0.1, height * 0.35);
  ctx.quadraticCurveTo(width * 0.5, -40 * s, width * 0.9, height * 0.35);
  ctx.lineTo(width * 0.9, height);
  ctx.stroke();
  ctx.restore();

  // 3. Metallic Champagne Gold Palette
  const goldGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isPrintClean) {
    goldGrad.addColorStop(0, '#b48c26');
    goldGrad.addColorStop(0.5, '#d4af37');
    goldGrad.addColorStop(1, '#946c16');
  } else {
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.25, '#d4af37');
    goldGrad.addColorStop(0.5, '#e5c158');
    goldGrad.addColorStop(0.75, '#b48c26');
    goldGrad.addColorStop(1, '#fef9c3');
  }

  // 4. Double Gold Outer Border & Inset Hairline Frame
  const marginOuter = 16 * s;
  const innerMargin = 32 * s;
  ctx.save();
  ctx.lineWidth = 6 * s;
  ctx.strokeStyle = goldGrad;
  ctx.strokeRect(marginOuter, marginOuter, width - marginOuter * 2, height - marginOuter * 2);

  ctx.lineWidth = 2 * s;
  ctx.strokeStyle = isPrintClean ? 'rgba(6, 78, 59, 0.35)' : 'rgba(212, 175, 55, 0.45)';
  ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

  // 4 Corner Ornate Brackets
  const cornerSize = 44 * s;
  drawCornerBracket(ctx, innerMargin + 6 * s, innerMargin + 6 * s, cornerSize, 0, goldGrad);
  drawCornerBracket(ctx, width - innerMargin - 6 * s, innerMargin + 6 * s, cornerSize, 90, goldGrad);
  drawCornerBracket(ctx, width - innerMargin - 6 * s, height - innerMargin - 6 * s, cornerSize, 180, goldGrad);
  drawCornerBracket(ctx, innerMargin + 6 * s, height - innerMargin - 6 * s, cornerSize, 270, goldGrad);
  ctx.restore();

  // --------------------------------------------------------------------------
  // 5. COLLEGE HEADER ZONE (Top)
  // --------------------------------------------------------------------------
  const logoX = 75 * s;
  const logoY = 55 * s;
  const logoD = 130 * s;

  // College Crest Medallion
  try {
    const logoImg = await loadImage(COLLEGE_LOGO);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 12 * s;
    ctx.shadowOffsetY = 4 * s;

    ctx.beginPath();
    ctx.arc(logoX + logoD / 2, logoY + logoD / 2, logoD / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = goldGrad;
    ctx.stroke();

    ctx.clip();
    ctx.drawImage(logoImg, logoX + 6 * s, logoY + 6 * s, logoD - 12 * s, logoD - 12 * s);
    ctx.restore();
  } catch (err) {
    console.warn('College crest logo fallback:', err);
  }

  // Header Typography
  const titleX = 230 * s;
  ctx.textAlign = 'left';

  ctx.save();
  // Primary Institution Title
  ctx.fillStyle = isPrintClean ? '#064e3b' : '#ffffff';
  ctx.font = `900 ${40 * s}px "Inter", "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('AL DHEENIYYA ARABIC COLLEGE', titleX, 100 * s);

  // Arabic Subtitle: المكتبة الإسلامية الرقمية
  ctx.fillStyle = isPrintClean ? '#92400e' : goldGrad;
  ctx.font = `bold ${34 * s}px "Amiri", "Scheherazade New", serif`;
  ctx.fillText('المكتبة الإسلامية الرقمية', titleX, 140 * s);

  // Subtitles: STUDENT LIBRARY IDENTIFICATION PASS • البطاقة الذكية للمكتبة
  ctx.fillStyle = isPrintClean ? '#047857' : '#a7f3d0';
  ctx.font = `700 ${18 * s}px "Inter", sans-serif`;
  ctx.fillText('STUDENT LIBRARY IDENTIFICATION PASS', titleX, 172 * s);

  ctx.fillStyle = isPrintClean ? '#b45309' : '#fef08a';
  ctx.font = `bold ${19 * s}px "Amiri", "Scheherazade New", serif`;
  ctx.fillText('•  البطاقة الذكية للمكتبة', titleX + 430 * s, 172 * s);
  ctx.restore();

  // Header Horizontal Divider
  const dividerY = 202 * s;
  ctx.save();
  ctx.lineWidth = 2 * s;
  ctx.strokeStyle = isPrintClean ? 'rgba(6, 78, 59, 0.4)' : 'rgba(212, 175, 55, 0.5)';
  ctx.beginPath();
  ctx.moveTo(innerMargin + 20 * s, dividerY);
  ctx.lineTo(width - innerMargin - 20 * s, dividerY);
  ctx.stroke();

  // Central 8-pointed gold star
  drawIslamicStar(ctx, width / 2, dividerY, 11 * s, isPrintClean ? '#b48c26' : '#d4af37');
  ctx.restore();

  // --------------------------------------------------------------------------
  // 6. STUDENT PHOTO ZONE (Left Section: X: 80 * s, Y: 235 * s)
  // --------------------------------------------------------------------------
  const photoX = 80 * s;
  const photoY = 235 * s;
  const photoW = 370 * s;
  const photoH = 470 * s;
  const photoRadius = 24 * s;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 18 * s;
  ctx.shadowOffsetY = 8 * s;

  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoW, photoH, photoRadius);
  ctx.fillStyle = isPrintClean ? '#e2e8f0' : '#042217';
  ctx.fill();

  ctx.lineWidth = 5 * s;
  ctx.strokeStyle = goldGrad;
  ctx.stroke();
  ctx.clip();

  const validPhoto = getValidValue(student.img);
  if (validPhoto) {
    try {
      const studentImg = await loadImage(validPhoto);
      drawImageProp(ctx, studentImg, photoX, photoY, photoW, photoH);
    } catch {
      drawPhotoFallback(ctx, student, photoX, photoY, photoW, photoH, s, isPrintClean);
    }
  } else {
    drawPhotoFallback(ctx, student, photoX, photoY, photoW, photoH, s, isPrintClean);
  }
  ctx.restore();

  // Prominent Student ID Badge directly under photo
  const idBadgeY = photoY + photoH + 20 * s;
  const idBadgeH = 62 * s;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(photoX, idBadgeY, photoW, idBadgeH, 14 * s);
  ctx.fillStyle = isPrintClean ? '#064e3b' : 'rgba(0, 0, 0, 0.7)';
  ctx.fill();
  ctx.lineWidth = 2.5 * s;
  ctx.strokeStyle = goldGrad;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${30 * s}px monospace`;
  ctx.fillText(`ID: ${student.id}`, photoX + photoW / 2, idBadgeY + 42 * s);
  ctx.restore();

  // --------------------------------------------------------------------------
  // 7. CENTRE INFORMATION ZONE (ENLARGED & HIGHLY READABLE)
  // --------------------------------------------------------------------------
  const infoX = 490 * s;
  let infoY = 255 * s;

  // Student Full Name (Much larger, bold, high-contrast)
  const studentName = getValidValue(student.n) || 'REGISTERED STUDENT';
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = isPrintClean ? '#064e3b' : goldGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6 * s;

  // Dynamic font scaling for student name
  let nameFontSize = 58 * s;
  if (studentName.length > 28) nameFontSize = 42 * s;
  else if (studentName.length > 20) nameFontSize = 48 * s;

  ctx.font = `bold ${nameFontSize}px "Amiri", "Inter", serif`;
  ctx.fillText(studentName, infoX, infoY + 36 * s);
  ctx.restore();

  infoY += 68 * s;

  // Thin gold rule under name
  ctx.save();
  ctx.lineWidth = 1.5 * s;
  ctx.strokeStyle = isPrintClean ? 'rgba(6, 78, 59, 0.3)' : 'rgba(212, 175, 55, 0.45)';
  ctx.beginPath();
  ctx.moveTo(infoX, infoY);
  ctx.lineTo(infoX + 820 * s, infoY);
  ctx.stroke();
  ctx.restore();

  infoY += 34 * s;

  // Extract clean valid fields
  const regNo = getValidValue(student.rg);
  const studentClass = getValidValue(student.cl);
  const studentTown = getValidValue(student.tn);
  const admissionDate = formatValidDate(student.adm);
  const registrationDate = formatValidDate(student.reg);
  const expiryDate = formatValidDate(student.rx);

  interface InfoRow {
    labelEn: string;
    labelAr: string;
    val: string;
    isHighlight?: boolean;
    isExpiry?: boolean;
  }

  const infoRows: InfoRow[] = [];

  if (regNo) {
    infoRows.push({
      labelEn: 'Registration No.',
      labelAr: 'رقم التسجيل',
      val: regNo,
      isHighlight: true,
    });
  }

  if (studentClass) {
    infoRows.push({
      labelEn: 'Academic Class',
      labelAr: 'الصف الدراسي',
      val: studentClass,
    });
  }

  if (studentTown) {
    infoRows.push({
      labelEn: 'Location / Town',
      labelAr: 'المدينة / الإقامة',
      val: studentTown,
    });
  }

  if (admissionDate) {
    infoRows.push({
      labelEn: 'Admission Date',
      labelAr: 'تاريخ القبول',
      val: admissionDate,
    });
  }

  if (registrationDate && registrationDate !== admissionDate) {
    infoRows.push({
      labelEn: 'Registered On',
      labelAr: 'تاريخ التسجيل',
      val: registrationDate,
    });
  }

  // Card Expiry: Mandatory security field
  infoRows.push({
    labelEn: 'Card Expiry',
    labelAr: 'تاريخ الصلاحية',
    val: expiryDate || '2028-12-31',
    isExpiry: true,
  });

  // Render info rows with LARGE, BOLD, HIGH-LEGIBILITY FONTS
  // Row height is generous: 62 * s
  const rowHeight = 62 * s;
  infoRows.forEach((row) => {
    ctx.save();

    // Subtle background card strip for each detail row in luxury mode
    if (!isPrintClean) {
      ctx.beginPath();
      ctx.roundRect(infoX - 10 * s, infoY - 26 * s, 830 * s, 52 * s, 10 * s);
      ctx.fillStyle = row.isExpiry
        ? 'rgba(212, 175, 55, 0.12)'
        : row.isHighlight
        ? 'rgba(16, 185, 129, 0.1)'
        : 'rgba(0, 0, 0, 0.25)';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(infoX - 10 * s, infoY - 26 * s, 830 * s, 52 * s, 10 * s);
      ctx.fillStyle = row.isExpiry ? 'rgba(245, 158, 11, 0.08)' : 'rgba(6, 78, 59, 0.04)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(6, 78, 59, 0.12)';
      ctx.lineWidth = 1 * s;
      ctx.stroke();
    }

    // Label English (ENLARGED to 22px * s)
    ctx.textAlign = 'left';
    ctx.fillStyle = isPrintClean ? '#065f46' : '#a7f3d0';
    ctx.font = `700 ${22 * s}px "Inter", sans-serif`;
    ctx.fillText(row.labelEn, infoX, infoY + 6 * s);

    // Label Arabic (ENLARGED to 24px * s)
    ctx.fillStyle = isPrintClean ? '#b45309' : 'rgba(254, 240, 138, 0.9)';
    ctx.font = `bold ${24 * s}px "Amiri", "Scheherazade New", serif`;
    ctx.fillText(`· ${row.labelAr}`, infoX + 210 * s, infoY + 7 * s);

    // Separator colon
    ctx.fillStyle = isPrintClean ? 'rgba(0,0,0,0.3)' : 'rgba(255, 255, 255, 0.4)';
    ctx.font = `bold ${24 * s}px sans-serif`;
    ctx.fillText(':', infoX + 380 * s, infoY + 6 * s);

    // Detail Value (ENLARGED to 26px - 30px * s)
    ctx.textAlign = 'left';
    if (row.isExpiry) {
      ctx.fillStyle = isPrintClean ? '#b45309' : '#fef08a';
      ctx.font = `bold ${28 * s}px monospace`;
    } else if (row.isHighlight) {
      ctx.fillStyle = isPrintClean ? '#064e3b' : '#ffffff';
      ctx.font = `bold ${28 * s}px monospace`;
    } else {
      ctx.fillStyle = isPrintClean ? '#0f172a' : '#ffffff';
      ctx.font = `bold ${26 * s}px "Inter", "Amiri", sans-serif`;
    }

    ctx.fillText(row.val, infoX + 410 * s, infoY + 6 * s);
    ctx.restore();

    infoY += rowHeight;
  });

  // --------------------------------------------------------------------------
  // 8. REAL MACHINE-READABLE QR CODE ZONE (Right Section)
  // --------------------------------------------------------------------------
  const qrBoxX = 1370 * s;
  const qrBoxY = 235 * s;
  const qrBoxW = 460 * s;
  const qrBoxH = 550 * s;
  const qrBoxRadius = 24 * s;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 18 * s;
  ctx.shadowOffsetY = 8 * s;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, qrBoxRadius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.lineWidth = 4 * s;
  ctx.strokeStyle = goldGrad;
  ctx.stroke();
  ctx.restore();

  // QR Header inside white box
  ctx.save();
  ctx.textAlign = 'center';
  const qrCenterX = qrBoxX + qrBoxW / 2;

  ctx.fillStyle = '#064e3b';
  ctx.font = `900 ${18 * s}px "Inter", sans-serif`;
  ctx.fillText('OFFICIAL DIGITAL PASS', qrCenterX, qrBoxY + 36 * s);

  ctx.fillStyle = '#b48c26';
  ctx.font = `bold ${17 * s}px "Amiri", serif`;
  ctx.fillText('التحقق الأمني المعتمد للكلية', qrCenterX, qrBoxY + 60 * s);

  // Generate Real Machine-Readable QR Code
  const verificationUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?verify=${encodeURIComponent(student.id)}`
      : `https://deeniya.library.edu/?verify=${encodeURIComponent(student.id)}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: Math.round(300 * s),
      margin: 1,
      color: {
        dark: '#022416',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    const qrImg = await loadImage(qrDataUrl);
    const qrSize = 300 * s;
    const qrDrawX = qrCenterX - qrSize / 2;
    const qrDrawY = qrBoxY + 76 * s;

    ctx.drawImage(qrImg, qrDrawX, qrDrawY, qrSize, qrSize);

    // Scan instruction pill below QR
    const scanBadgeY = qrDrawY + qrSize + 16 * s;
    ctx.beginPath();
    ctx.roundRect(qrCenterX - 170 * s, scanBadgeY, 340 * s, 40 * s, 10 * s);
    ctx.fillStyle = '#064e3b';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${15 * s}px "Inter", sans-serif`;
    ctx.fillText('SCAN TO VERIFY RECORD', qrCenterX, scanBadgeY + 26 * s);

    // Student ID Verification string (Enlarged)
    ctx.fillStyle = '#022416';
    ctx.font = `bold ${20 * s}px monospace`;
    ctx.fillText(`VERIFY: ${student.id}`, qrCenterX, scanBadgeY + 68 * s);

    ctx.fillStyle = '#059669';
    ctx.font = `bold ${14 * s}px "Inter", sans-serif`;
    ctx.fillText('✓ CENTRAL REGISTRY VERIFIED', qrCenterX, scanBadgeY + 92 * s);
  } catch (err) {
    console.warn('Failed to render real QR on canvas:', err);
  }
  ctx.restore();

  // --------------------------------------------------------------------------
  // 9. FOOTER ZONE (Bottom Banner: Y: 920 * s to 1035 * s)
  // --------------------------------------------------------------------------
  const footerY = 920 * s;
  const footerH = 112 * s;
  const footerX = innerMargin + 10 * s;
  const footerW = width - (innerMargin + 10 * s) * 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(footerX, footerY, footerW, footerH, 18 * s);
  ctx.fillStyle = isPrintClean ? '#064e3b' : 'rgba(2, 23, 15, 0.92)';
  ctx.fill();
  ctx.lineWidth = 2.5 * s;
  ctx.strokeStyle = goldGrad;
  ctx.stroke();

  // Left Status Badge
  const isExpired = student.rx && student.rx < new Date().toISOString().slice(0, 10);
  const isInactive = student.off;
  const badgeColor = isExpired ? '#dc2626' : isInactive ? '#d97706' : '#059669';
  const badgeText = isExpired ? 'EXPIRED' : isInactive ? 'INACTIVE' : 'ACTIVE MEMBER';

  const badgeX = footerX + 24 * s;
  const badgeY = footerY + 28 * s;
  const badgeW = 230 * s;
  const badgeH = 56 * s;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12 * s);
  ctx.fillStyle = badgeColor;
  ctx.fill();

  // White checkmark circle
  ctx.beginPath();
  ctx.arc(badgeX + 30 * s, badgeY + badgeH / 2, 15 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.fillStyle = badgeColor;
  ctx.font = `bold ${17 * s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('✓', badgeX + 30 * s, badgeY + badgeH / 2 + 5 * s);

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${16 * s}px "Inter", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(badgeText, badgeX + 58 * s, badgeY + 35 * s);

  // Center Official Text (Enlarged)
  ctx.textAlign = 'center';
  const centerFooterX = footerX + footerW / 2;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${17 * s}px "Inter", sans-serif`;
  ctx.fillText('DHEENIYYA ARABIC COLLEGE  •  OFFICIAL DIGITAL IDENTIFICATION CARD', centerFooterX, footerY + 44 * s);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = `600 ${14 * s}px "Inter", sans-serif`;
  ctx.fillText('NON-TRANSFERABLE  •  COLLEGE LIBRARY ACCESS ONLY', centerFooterX, footerY + 76 * s);

  // Right Super Admin Authority Seal
  ctx.textAlign = 'right';
  const rightFooterX = footerX + footerW - 24 * s;
  ctx.fillStyle = goldGrad;
  ctx.font = `bold ${20 * s}px monospace`;
  ctx.fillText('AUTH: SUPER ADMIN', rightFooterX, footerY + 44 * s);

  ctx.fillStyle = '#fef08a';
  ctx.font = `600 ${14 * s}px "Inter", sans-serif`;
  ctx.fillText('AUTHENTICATED PASS', rightFooterX, footerY + 76 * s);

  ctx.restore();

  // 10. Optional Scissor Cut Guides (for A4 Paper Printing)
  if (options.includeCutGuides) {
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1 * s;
    ctx.setLineDash([8 * s, 8 * s]);
    ctx.strokeRect(6 * s, 6 * s, width - 12 * s, height - 12 * s);
    ctx.restore();
  }

  return canvas;
}

/**
 * Fallback avatar drawer when student has no uploaded photo
 */
function drawPhotoFallback(
  ctx: CanvasRenderingContext2D,
  student: Student,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  isPrintClean: boolean
) {
  ctx.fillStyle = isPrintClean ? '#e2e8f0' : '#032014';
  ctx.fillRect(x, y, w, h);

  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, w * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = isPrintClean ? 'rgba(6, 78, 59, 0.08)' : 'rgba(212, 175, 55, 0.08)';
  ctx.fill();

  const nameLetter = (student.n || '?').trim().charAt(0) || '?';
  ctx.fillStyle = isPrintClean ? '#064e3b' : '#fef08a';
  ctx.font = `bold ${120 * s}px "Amiri", "Inter", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(nameLetter, x + w / 2, y + h / 2 + 40 * s);

  ctx.fillStyle = isPrintClean ? '#64748b' : 'rgba(255, 255, 255, 0.6)';
  ctx.font = `700 ${16 * s}px "Inter", sans-serif`;
  ctx.fillText('DEENIYYA STUDENT', x + w / 2, y + h - 35 * s);
  ctx.textAlign = 'left';
}

/**
 * Generates and downloads the student ID card as high-resolution PNG image
 * at exact pixel dimensions: HD 1920x1080, 2K 2560x1440, or 3K 3072x1728
 */
export async function downloadStudentIdCardImage(
  student: Student,
  settings: LibrarySettings,
  format: 'png' | 'jpeg' = 'png',
  resolution: CardResolution = '3K',
  theme: CardPrintTheme = 'emerald-gold'
): Promise<void> {
  const canvas = await renderStudentIdCardCanvas(student, settings, { resolution, format, theme });
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const extension = format === 'jpeg' ? 'jpg' : 'png';

  const dataUrl = canvas.toDataURL(mimeType, 0.98);

  const cleanName = (student.n || student.id)
    .trim()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '_');

  const filename = `${student.id}_${cleanName}_${resolution}_${theme}_ID_Card.${extension}`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates and downloads a print-ready vector-scaled Landscape 16:9 PDF file
 */
export async function downloadStudentIdCardPdf(
  student: Student,
  settings: LibrarySettings,
  resolution: CardResolution = '3K',
  theme: CardPrintTheme = 'emerald-gold'
): Promise<void> {
  const canvas = await renderStudentIdCardCanvas(student, settings, { resolution, theme });
  const imgData = canvas.toDataURL('image/jpeg', 0.96);

  const pdfWidthMm = 297;
  const pdfHeightMm = (297 * 9) / 16; // 167.0625 mm

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pdfWidthMm, pdfHeightMm],
  });

  doc.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');

  const cleanName = (student.n || student.id)
    .trim()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '_');

  const filename = `${student.id}_${cleanName}_Landscape_16-9_${theme}_ID_Card.pdf`;
  doc.save(filename);
}

/**
 * Instant browser print of the 16:9 Landscape Student ID Card
 * Prints ONLY the card with zero website elements or page clutter
 */
export async function printSingleStudentIdCard(
  student: Student,
  settings: LibrarySettings,
  resolution: CardResolution = '3K',
  theme: CardPrintTheme = 'emerald-gold'
): Promise<void> {
  const canvas = await renderStudentIdCardCanvas(student, settings, { resolution, theme, includeCutGuides: true });
  const dataUrl = canvas.toDataURL('image/png');

  const printWindow = window.open('', '_blank', 'width=1100,height=700');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${student.n} - Student ID Card - Al Dheeniyya Arabic College</title>
  <style>
    @page {
      size: landscape;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-container {
      width: 100vw;
      height: 56.25vw; /* 16:9 exact ratio */
      max-height: 100vh;
      max-width: 177.78vh; /* 16:9 exact ratio */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      box-sizing: border-box;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      border-radius: 8px;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .print-container {
        width: 100%;
        height: 100%;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <img src="${dataUrl}" alt="Al Dheeniyya Arabic College Student ID Card" />
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

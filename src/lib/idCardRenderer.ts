import QRCode from 'qrcode';
import { Student, LibrarySettings } from '../types';
import { COLLEGE_LOGO } from '../data/logo';

/**
 * Standard CR80 Card Dimensions at 300 DPI:
 * 1012 px width x 638 px height (Aspect ratio ~1.586)
 */
export const CARD_WIDTH = 1012;
export const CARD_HEIGHT = 638;

export interface RenderCardOptions {
  theme?: 'royal-gold' | 'midnight-purple' | 'classic-ivory' | 'modern-dark';
  format?: 'png' | 'jpeg';
}

/**
 * Draws the high-resolution student ID card directly on an HTML5 canvas.
 * Returns the canvas element.
 */
export async function renderStudentIdCardCanvas(
  student: Student,
  settings: LibrarySettings,
  options: RenderCardOptions = {}
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Background Theme Palette
  let bgGradientStart = '#064e3b';
  let bgGradientEnd = '#022c22';
  let primaryGold = '#d4af37';
  let lightGold = '#fef08a';
  let textColor = '#ffffff';
  let subtextColor = '#a7f3d0';

  if (options.theme === 'royal-gold') {
    bgGradientStart = '#07162c';
    bgGradientEnd = '#020914';
    primaryGold = '#eab308';
    lightGold = '#fef9c3';
    subtextColor = '#cbd5e1';
  } else if (options.theme === 'midnight-purple') {
    bgGradientStart = '#2e1065';
    bgGradientEnd = '#0f051d';
    primaryGold = '#c084fc';
    lightGold = '#f3e8ff';
    subtextColor = '#e9d5ff';
  } else if (options.theme === 'classic-ivory') {
    bgGradientStart = '#1e293b';
    bgGradientEnd = '#0f172a';
    primaryGold = '#d97706';
    lightGold = '#fef3c7';
    subtextColor = '#94a3b8';
  }

  // 1. Draw Card Background with Rounded Corners
  const radius = 32;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(CARD_WIDTH - radius, 0);
  ctx.quadraticCurveTo(CARD_WIDTH, 0, CARD_WIDTH, radius);
  ctx.lineTo(CARD_WIDTH, CARD_HEIGHT - radius);
  ctx.quadraticCurveTo(CARD_WIDTH, CARD_HEIGHT, CARD_WIDTH - radius, CARD_HEIGHT);
  ctx.lineTo(radius, CARD_HEIGHT);
  ctx.quadraticCurveTo(0, CARD_HEIGHT, 0, CARD_HEIGHT - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();

  // Linear Gradient
  const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  grad.addColorStop(0, bgGradientStart);
  grad.addColorStop(1, bgGradientEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Decorative Islamic Geometric / Wave Arc in background
  ctx.beginPath();
  ctx.arc(CARD_WIDTH + 80, -40, 420, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-60, CARD_HEIGHT + 80, 380, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.04)';
  ctx.fill();

  // Outer Gold Border
  ctx.lineWidth = 6;
  ctx.strokeStyle = primaryGold;
  ctx.stroke();

  // Inner subtle border
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeRect(14, 14, CARD_WIDTH - 28, CARD_HEIGHT - 28);

  // 2. Load & Draw College Logo
  try {
    const logoImg = await loadImage(COLLEGE_LOGO);
    ctx.save();
    ctx.beginPath();
    ctx.arc(80, 80, 48, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = primaryGold;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(logoImg, 32, 32, 96, 96);
    ctx.restore();
  } catch (e) {
    console.warn('Failed to draw logo on canvas:', e);
  }

  // 3. Header Typography
  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.font = 'bold 26px "Inter", sans-serif';
  ctx.fillText((settings.name || 'AL DHEENIYYA ARABIC COLLEGE').toUpperCase(), 145, 65);

  ctx.fillStyle = primaryGold;
  ctx.font = 'bold 22px "Amiri", serif';
  ctx.fillText(settings.ar || 'المكتبة الإسلامية الرقمية · كلية الدينية العربية', 145, 96);

  ctx.fillStyle = subtextColor;
  ctx.font = '14px "Inter", sans-serif';
  ctx.fillText('STUDENT LIBRARY IDENTIFICATION PASS • البطاقة الذكية للمكتبة', 145, 120);

  // Header separator line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(35, 140);
  ctx.lineTo(CARD_WIDTH - 35, 140);
  ctx.stroke();

  // 4. Student Photo Box
  const photoX = 45;
  const photoY = 165;
  const photoW = 220;
  const photoH = 260;
  const photoRadius = 18;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(photoX + photoRadius, photoY);
  ctx.lineTo(photoX + photoW - photoRadius, photoY);
  ctx.quadraticCurveTo(photoX + photoW, photoY, photoX + photoW, photoY + photoRadius);
  ctx.lineTo(photoX + photoW, photoY + photoH - photoRadius);
  ctx.quadraticCurveTo(photoX + photoW, photoY + photoH, photoX + photoW - photoRadius, photoY + photoH);
  ctx.lineTo(photoX + photoRadius, photoY + photoH);
  ctx.quadraticCurveTo(photoX, photoY + photoH, photoX, photoY + photoH - photoRadius);
  ctx.lineTo(photoX, photoY + photoRadius);
  ctx.quadraticCurveTo(photoX, photoY, photoX + photoRadius, photoY);
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = primaryGold;
  ctx.stroke();
  ctx.clip();

  if (student.img) {
    try {
      const studentImg = await loadImage(student.img);
      ctx.drawImage(studentImg, photoX, photoY, photoW, photoH);
    } catch {
      drawPhotoPlaceholder(ctx, student, photoX, photoY, photoW, photoH);
    }
  } else {
    drawPhotoPlaceholder(ctx, student, photoX, photoY, photoW, photoH);
  }
  ctx.restore();

  // 5. Student Details Information Block
  const infoX = 300;
  let infoY = 185;

  // Student Full Name
  ctx.fillStyle = lightGold;
  ctx.font = 'bold 34px "Amiri", serif';
  ctx.fillText(student.n, infoX, infoY);

  // Student ID Badge
  infoY += 45;
  ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
  ctx.fillRect(infoX - 5, infoY - 26, 210, 36);
  ctx.strokeStyle = primaryGold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(infoX - 5, infoY - 26, 210, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`ID: ${student.id}`, infoX + 10, infoY);

  // Key Fields Grid
  infoY += 42;
  const fields = [
    { label: 'Registration No. · رقم التسجيل:', val: student.rg || student.id },
    { label: 'Academic Class · الصف:', val: student.cl || 'General Course' },
    { label: 'Town / Location · البلدة:', val: student.tn || '—' },
    { label: 'Admission Date · تاريخ القبول:', val: student.adm || student.reg || '—' },
    { label: 'Card Expiry · تاريخ الانتهاء:', val: student.rx || '2028-12-31' },
  ];

  fields.forEach((f) => {
    ctx.fillStyle = subtextColor;
    ctx.font = '15px "Inter", sans-serif';
    ctx.fillText(f.label, infoX, infoY);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Inter", "Amiri", sans-serif';
    ctx.fillText(f.val, infoX + 240, infoY);

    infoY += 30;
  });

  // 6. Draw High-Resolution QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(student.id, {
      width: 190,
      margin: 1,
      color: { dark: '#064e3b', light: '#ffffff' },
    });
    const qrImg = await loadImage(qrDataUrl);

    const qrX = CARD_WIDTH - 200;
    const qrY = 165;
    const qrSize = 155;

    // QR background box
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
    ctx.fill();
    ctx.strokeStyle = primaryGold;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Label under QR
    ctx.textAlign = 'center';
    ctx.fillStyle = subtextColor;
    ctx.font = '11px monospace';
    ctx.fillText('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 18);
    ctx.fillText(student.id, qrX + qrSize / 2, qrY + qrSize + 32);
    ctx.textAlign = 'left';
  } catch (e) {
    console.warn('Failed to draw QR code on ID card canvas:', e);
  }

  // 7. Security Microtext & Footer Bar
  const footerY = CARD_HEIGHT - 60;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(35, footerY);
  ctx.lineTo(CARD_WIDTH - 35, footerY);
  ctx.stroke();

  // Security Pill Badge
  ctx.fillStyle = student.rx && student.rx < new Date().toISOString().slice(0, 10) ? '#dc2626' : '#059669';
  ctx.beginPath();
  ctx.roundRect(45, footerY + 12, 130, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    student.rx && student.rx < new Date().toISOString().slice(0, 10) ? 'EXPIRED' : 'ACTIVE MEMBER',
    110,
    footerY + 29
  );
  ctx.textAlign = 'left';

  // Microtext Line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '11px monospace';
  ctx.fillText(
    'DEENIYYA ARABIC COLLEGE • OFFICIAL DIGITAL IDENTIFICATION CARD • NON-TRANSFERABLE',
    195,
    footerY + 29
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = primaryGold;
  ctx.font = 'bold 12px monospace';
  ctx.fillText('AUTH: SUPER ADMIN', CARD_WIDTH - 45, footerY + 29);
  ctx.textAlign = 'left';

  ctx.restore();
  return canvas;
}

/**
 * Fallback avatar drawer when student has no uploaded photo
 */
function drawPhotoPlaceholder(
  ctx: CanvasRenderingContext2D,
  student: Student,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 72px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((student.n || '?').trim().charAt(0), x + w / 2, y + h / 2 + 25);
  ctx.textAlign = 'left';
}

/**
 * Helper to safely load images for canvas drawing
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Downloads the student ID card as high-quality PNG or JPEG image.
 * Filename format: [Student_Name]_ID_Card.png
 */
export async function downloadStudentIdCardImage(
  student: Student,
  settings: LibrarySettings,
  format: 'png' | 'jpeg' = 'png',
  theme: RenderCardOptions['theme'] = 'royal-gold'
): Promise<void> {
  const canvas = await renderStudentIdCardCanvas(student, settings, { format, theme });
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const extension = format === 'jpeg' ? 'jpg' : 'png';

  const dataUrl = canvas.toDataURL(mimeType, 0.95);

  // Clean filename: remove special filesystem characters
  const cleanName = (student.n || student.id)
    .trim()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '_');

  const filename = `${student.id}_${cleanName}_ID_Card.${extension}`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Instant print of a single student ID card
 */
export async function printSingleStudentIdCard(
  student: Student,
  settings: LibrarySettings,
  theme: RenderCardOptions['theme'] = 'royal-gold'
): Promise<void> {
  const canvas = await renderStudentIdCardCanvas(student, settings, { theme });
  const dataUrl = canvas.toDataURL('image/png');

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    // If popups blocked, trigger standard window.print()
    window.print();
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${student.n} - Student ID Card</title>
  <style>
    @page { size: auto; margin: 10mm; }
    body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
    .card-wrap { text-align: center; }
    img { width: 85.6mm; height: 53.98mm; border-radius: 3.18mm; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .instructions { margin-top: 15px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <div class="card-wrap">
    <img src="${dataUrl}" alt="Student ID Card" />
    <div class="instructions">Al Dheeniyya Arabic College • Standard CR80 ID Card</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

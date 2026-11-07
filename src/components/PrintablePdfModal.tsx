import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  BookOpen,
  Users,
  Shield,
  Layers,
} from 'lucide-react';
import { Book, BookCopy, Student, LibrarySettings } from '../types';
import { COLLEGE_LOGO } from '../data/logo';

export type ReportType = 'catalog' | 'students';

interface PrintablePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportType;
  books?: Book[];
  copies?: BookCopy[];
  students?: Student[];
  settings: LibrarySettings;
  filterLabel?: string;
}

export const PrintablePdfModal: React.FC<PrintablePdfModalProps> = ({
  isOpen,
  onClose,
  reportType,
  books = [],
  copies = [],
  students = [],
  settings,
  filterLabel = 'All Records',
}) => {
  // Page / Item limit controls for very large catalogs (e.g. 5,869 books)
  // Generating a 6,000-row DOM for print can freeze browsers, so we allow choosing scope:
  // e.g. "First 100", "First 300", "First 500", "Full Collection"
  const [itemLimit, setItemLimit] = useState<number>(150);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const docRefNumber = `DAC-${reportType === 'catalog' ? 'CAT' : 'STU'}-${Date.now().toString(36).toUpperCase()}`;

  // Copies index map
  const copyCountMap = new Map<string, number>();
  copies.forEach((c) => {
    copyCountMap.set(c.b, (copyCountMap.get(c.b) || 0) + 1);
  });

  // Items to display
  const displayBooks = itemLimit === 0 ? books : books.slice(0, itemLimit);
  const displayStudents = itemLimit === 0 ? students : students.slice(0, itemLimit);

  // Trigger print-to-PDF
  const handlePrintToPdf = () => {
    window.print();
  };

  // Download standalone self-contained HTML document
  const handleDownloadStandaloneHtml = () => {
    const docElem = document.getElementById('printable-document');
    if (!docElem) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${settings.name} - ${reportType === 'catalog' ? 'Official Catalog Report' : 'Official Student Directory'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 12mm 10mm; }
    body { font-family: 'Inter', sans-serif; color: #111827; background: #fff; margin: 0; padding: 20px; }
    .font-arabic { font-family: 'Amiri', serif; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
    th { background: #064e3b; color: white; padding: 8px 6px; text-align: left; font-weight: 600; }
    td { border-bottom: 1px solid #e5e7eb; padding: 6px; vertical-align: top; }
    tr:nth-child(even) { background-color: #f9fafb; }
    .header { border-bottom: 2px solid #064e3b; padding-bottom: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .logo { width: 64px; height: 64px; border-radius: 50%; }
    .title-box { flex: 1; margin-left: 16px; }
    .college-name { font-size: 18px; font-weight: 800; color: #064e3b; text-transform: uppercase; margin: 0; }
    .ar-title { font-family: 'Amiri', serif; font-size: 16px; color: #047857; margin: 2px 0 0; }
    .meta-bar { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; border-radius: 8px; font-size: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; }
    .signature-area { margin-top: 40px; page-break-inside: avoid; display: flex; justify-content: space-between; text-align: center; font-size: 11px; }
    .sig-line { width: 180px; border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; }
  </style>
</head>
<body>
  ${docElem.innerHTML}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.name.replace(/\s+/g, '_')}_${reportType}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Top Toolbar (hidden on print) */}
        <div className="no-print p-4 bg-gradient-to-r from-emerald-950 to-emerald-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-800/80 rounded-xl border border-emerald-600/40">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center space-x-2">
                <span>Official PDF Document Preview</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-700 font-normal">
                  {reportType === 'catalog' ? 'Bibliographic Catalog' : 'Student Directory'}
                </span>
              </h2>
              <p className="text-[11px] text-emerald-200">
                {filterLabel} · Generated on {currentDate}
              </p>
            </div>
          </div>

          {/* Controls: Item limits & Print */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-xs bg-emerald-900/80 px-2.5 py-1 rounded-xl border border-emerald-700/60">
              <span className="text-[11px] text-emerald-300">Scope:</span>
              <select
                value={itemLimit}
                onChange={(e) => setItemLimit(parseInt(e.target.value, 10))}
                className="bg-transparent text-white font-semibold outline-none cursor-pointer"
              >
                <option value={50} className="text-slate-900">First 50 records</option>
                <option value={150} className="text-slate-900">First 150 records</option>
                <option value={300} className="text-slate-900">First 300 records</option>
                <option value={500} className="text-slate-900">First 500 records</option>
                <option value={0} className="text-slate-900">All ({reportType === 'catalog' ? books.length : students.length}) records</option>
              </select>
            </div>

            <button
              onClick={handleDownloadStandaloneHtml}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 text-emerald-100 hover:bg-emerald-800 text-xs font-semibold transition"
              title="Download standalone printable HTML file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download File</span>
            </button>

            <button
              onClick={handlePrintToPdf}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Scroll Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
          {/* Printable Document Paper Page */}
          <div
            id="printable-document"
            className="w-full max-w-4xl bg-white text-slate-900 p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 font-sans print:shadow-none print:border-none print:p-0"
          >
            {/* 1. Official Institutional Letterhead */}
            <div className="border-b-2 border-emerald-900 pb-4 mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={COLLEGE_LOGO}
                  alt="College Logo"
                  className="w-16 h-16 object-contain rounded-full border border-emerald-200 bg-white p-0.5 shrink-0"
                />
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-emerald-950 uppercase font-sans">
                    {settings.name}
                  </h1>
                  <div className="text-sm sm:text-base font-arabic font-bold text-emerald-800">
                    {settings.ar}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                    {settings.lib}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-slate-500 space-y-0.5 shrink-0">
                <div className="font-bold text-emerald-900 text-xs">OFFICIAL REPORT</div>
                <div>Ref: {docRefNumber}</div>
                <div>Date: {currentDate}</div>
                <div>Time: {currentTime}</div>
              </div>
            </div>

            {/* 2. Document Title & Summary Banner */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 mb-5 flex flex-wrap items-center justify-between text-xs text-emerald-900">
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-emerald-950 flex items-center space-x-2">
                  <span>
                    {reportType === 'catalog'
                      ? 'Bibliographic Catalog Register · سجل فهرس الكتب'
                      : 'Student Membership Directory · دليل الطلاب المسجلين'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700">
                  Filter Scope: <b>{filterLabel}</b> · Certified Institutional Record
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs font-semibold">
                <div>
                  Total Records: <b>{reportType === 'catalog' ? books.length : students.length}</b>
                </div>
                {reportType === 'catalog' && (
                  <div>
                    Physical Copies: <b>{copies.length}</b>
                  </div>
                )}
                {itemLimit > 0 && (
                  <div className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Displaying: {Math.min(itemLimit, reportType === 'catalog' ? books.length : students.length)}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Main Data Table */}
            {reportType === 'catalog' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-900 text-white font-semibold">
                      <th className="py-2.5 px-2 text-center w-8 text-[10px]">#</th>
                      <th className="py-2.5 px-3">Title · عنوان الكتاب</th>
                      <th className="py-2.5 px-3">Author · المؤلف</th>
                      <th className="py-2.5 px-2">Call No.</th>
                      <th className="py-2.5 px-2">Language</th>
                      <th className="py-2.5 px-2">Publisher & Year</th>
                      <th className="py-2.5 px-2 text-center">Copies</th>
                      <th className="py-2.5 px-2 text-center">Shelf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {displayBooks.map((b, idx) => {
                      const copyCount = copyCountMap.get(b.id) || 1;
                      return (
                        <tr
                          key={b.id}
                          className={`page-break-inside-avoid ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}
                        >
                          <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-arabic font-bold text-slate-900 text-xs" dir="auto">
                            {b.t}
                            {b.k && (
                              <div className="text-[9px] font-sans font-normal text-slate-500">
                                {b.k}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 font-arabic text-slate-700" dir="auto">
                            {b.a}
                          </td>
                          <td className="py-2 px-2 font-mono text-emerald-800 font-semibold text-[10px]">
                            {b.c || '—'}
                          </td>
                          <td className="py-2 px-2 text-slate-600">
                            {b.l || 'Arabic'}
                          </td>
                          <td className="py-2 px-2 text-slate-600 font-arabic text-[10px]">
                            {b.p ? `${b.p} ${b.y ? `(${b.y})` : ''}` : b.y || '—'}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-emerald-900">
                            {copyCount}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-500">
                            {b.sh || 'Main'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-900 text-white font-semibold">
                      <th className="py-2.5 px-2 text-center w-8 text-[10px]">#</th>
                      <th className="py-2.5 px-3">Student ID</th>
                      <th className="py-2.5 px-3">Full Name · الاسم الكامل</th>
                      <th className="py-2.5 px-2">Class / Year</th>
                      <th className="py-2.5 px-2">Contact Phone</th>
                      <th className="py-2.5 px-2">Town / Location</th>
                      <th className="py-2.5 px-2">Admission</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {displayStudents.map((s, idx) => (
                      <tr
                        key={s.id}
                        className={`page-break-inside-avoid ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}
                      >
                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-800 text-[10px]">
                          {s.id}
                        </td>
                        <td className="py-2 px-3 font-arabic font-bold text-slate-900 text-xs" dir="auto">
                          {s.n}
                          {s.rg && (
                            <span className="text-[9px] font-mono text-slate-400 ml-1">
                              (Reg: {s.rg})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-slate-700 font-medium">
                          {s.cl || 'General'}
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-600">
                          {s.ph || '—'}
                        </td>
                        <td className="py-2 px-2 font-arabic text-slate-600" dir="auto">
                          {s.tn || '—'}
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-500 text-[10px]">
                          {s.adm || s.reg || '—'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              s.arch
                                ? 'bg-slate-100 text-slate-600'
                                : s.off
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.arch ? 'Archived' : s.off ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Official Certification & Signatures Footer */}
            {includeSignatures && (
              <div className="mt-8 pt-4 border-t-2 border-emerald-900 text-xs page-break-inside-avoid">
                <div className="text-[10px] text-slate-500 italic mb-6 text-center">
                  Certified true record of the Library Archives of {settings.name}. Issued under administrative authority.
                </div>

                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div>
                    <div className="h-12 flex items-end justify-center font-arabic text-sm text-slate-600">
                      {settings.staff}
                    </div>
                    <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                      Librarian / Keeper of Records
                    </div>
                    <div className="text-[10px] text-slate-500 font-arabic">أمين المكتبة والوثائق</div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-700 flex items-center justify-center text-[9px] font-bold text-emerald-800 uppercase text-center p-1 font-mono">
                      OFFICIAL COLLEGE SEAL
                    </div>
                  </div>

                  <div>
                    <div className="h-12 flex items-end justify-center font-arabic text-sm text-slate-600">
                      Principal / Dean
                    </div>
                    <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                      College Principal
                    </div>
                    <div className="text-[10px] text-slate-500 font-arabic">عميد الكلية / المدير</div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-2">
                  <span>Document ID: {docRefNumber}</span>
                  <span>Al Dheeniyya Arabic College Digital Management System</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

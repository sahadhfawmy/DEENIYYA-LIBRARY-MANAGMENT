import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldAlert,
  Image as ImageIcon,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Student, LibrarySettings } from '../types';
import { COLLEGE_LOGO } from '../data/logo';
import {
  downloadStudentIdCardImage,
  printSingleStudentIdCard,
} from '../lib/idCardRenderer';

interface StudentIdCardTabProps {
  students: Student[];
  settings: LibrarySettings;
  isSuperAdmin: boolean;
  onOpenLogin: () => void;
}

export const StudentIdCardTab: React.FC<StudentIdCardTabProps> = ({
  students,
  settings,
  isSuperAdmin,
  onOpenLogin,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [sheetMode, setSheetMode] = useState<boolean>(false);
  const [cardTheme, setCardTheme] = useState<'royal-gold' | 'midnight-purple' | 'classic-ivory' | 'modern-dark'>('royal-gold');
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0]);
    }
  }, [students, selectedStudent]);

  // Generate QR code whenever selected student changes
  useEffect(() => {
    if (selectedStudent) {
      QRCode.toDataURL(
        selectedStudent.id,
        { width: 160, margin: 1, color: { dark: '#064e3b', light: '#ffffff' } },
        (err, url) => {
          if (!err && url) setQrCodeUrl(url);
        }
      );
    }
  }, [selectedStudent]);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 shadow-lg mt-8">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold">Restricted: ID Cards Generator</h3>
        <p className="text-xs text-slate-500">Student ID cards and barcodes can only be issued by the Super Admin.</p>
        <button onClick={onOpenLogin} className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-xs">
          Admin Login
        </button>
      </div>
    );
  }

  const activeStudents = students.filter((s) => !s.arch);
  const filteredList = activeStudents.filter((s) => {
    if (filterClass && s.cl !== filterClass) return false;
    if (searchStudent) {
      const q = searchStudent.toLowerCase();
      const match = `${s.id} ${s.n} ${s.cl || ''} ${s.tn || ''}`.toLowerCase();
      return match.includes(q);
    }
    return true;
  });

  const uniqueClasses = Array.from(new Set(activeStudents.map((s) => s.cl).filter(Boolean)));

  const handleDownloadPng = async (stu: Student) => {
    setDownloading(true);
    try {
      await downloadStudentIdCardImage(stu, settings, 'png', cardTheme);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadJpg = async (stu: Student) => {
    setDownloading(true);
    try {
      await downloadStudentIdCardImage(stu, settings, 'jpeg', cardTheme);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintCard = (stu: Student) => {
    printSingleStudentIdCard(stu, settings, cardTheme);
  };

  const handlePrintFullSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
            <CreditCard className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <span>Smart Student ID Cards Generator & Printing Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue, print, and export 300 DPI high-resolution identification cards with embedded QR codes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Card Theme Selector */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] text-slate-500">Style:</span>
            <select
              value={cardTheme}
              onChange={(e) => setCardTheme(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="royal-gold">Royal Gold Luxury</option>
              <option value="midnight-purple">Midnight Purple</option>
              <option value="classic-ivory">Classic Navy</option>
              <option value="modern-dark">Modern Emerald</option>
            </select>
          </div>

          <button
            onClick={() => setSheetMode(!sheetMode)}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              sheetMode
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{sheetMode ? 'Single Card View' : 'A4 Sheet Batch Mode'}</span>
          </button>

          {sheetMode && (
            <button
              onClick={handlePrintFullSheet}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Sheet</span>
            </button>
          )}
        </div>
      </div>

      {sheetMode ? (
        /* BATCH SHEET MODE (A4 Print Ready Grid) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1 text-xs text-slate-500">
            <div>
              Displaying <b>{filteredList.length}</b> cards for batch printing · Layout formatted for CR80 card printers and A4 card sheets.
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="">All Classes ({activeStudents.length})</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2 print:gap-4">
            {filteredList.map((stu) => (
              <div
                key={stu.id}
                className="relative w-full max-w-md mx-auto aspect-[1.586/1] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl p-4 shadow-lg border-2 border-emerald-500/40 flex flex-col justify-between overflow-hidden group"
              >
                {/* Header */}
                <div className="flex items-center space-x-3 border-b border-emerald-500/30 pb-2">
                  <img src={COLLEGE_LOGO} alt="" className="w-10 h-10 rounded-full bg-white p-0.5" />
                  <div className="leading-tight">
                    <div className="text-[11px] font-bold tracking-tight uppercase">{settings.name}</div>
                    <div className="text-[10px] font-arabic text-emerald-200 font-semibold">{settings.ar}</div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex items-center justify-between my-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-16 rounded-xl bg-emerald-800 border-2 border-emerald-400/40 overflow-hidden shrink-0 flex items-center justify-center">
                      {stu.img ? (
                        <img src={stu.img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-lg">{(stu.n || '?').charAt(0)}</span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-bold text-sm font-arabic line-clamp-1" dir="auto">{stu.n}</div>
                      <div className="font-mono text-emerald-300 font-bold">{stu.id}</div>
                      <div className="text-[10px] text-emerald-200">Class: {stu.cl || 'General'}</div>
                      <div className="text-[10px] text-slate-300 font-arabic">{stu.tn || '—'}</div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="w-16 h-16 bg-white p-1 rounded-xl shadow shrink-0 flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${stu.id}`}
                      alt="QR"
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Footer & Quick Actions */}
                <div className="pt-1.5 border-t border-emerald-500/30 flex items-center justify-between text-[9px] text-emerald-300 font-mono">
                  <span>EXP: {stu.rx || '2028-12-31'}</span>
                  <div className="no-print flex items-center space-x-1.5">
                    <button
                      onClick={() => handleDownloadPng(stu)}
                      className="px-2 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-sans text-[10px] transition"
                      title="Download PNG image"
                    >
                      PNG
                    </button>
                    <button
                      onClick={() => handleDownloadJpg(stu)}
                      className="px-2 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-sans text-[10px] transition"
                      title="Download JPG image"
                    >
                      JPG
                    </button>
                    <button
                      onClick={() => handlePrintCard(stu)}
                      className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-sans text-[10px] transition"
                      title="Print single card"
                    >
                      Print
                    </button>
                  </div>
                  <span className="print:inline hidden font-bold">DIGITAL PASS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* SINGLE CARD PREVIEW & HIGH-RES DOWNLOAD CENTER */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Student Selector */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Select Student ({activeStudents.length})
              </h3>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px]"
              >
                <option value="">All Classes</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full text-xs py-1.5 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1 text-xs">
              {filteredList.map((stu) => (
                <div
                  key={stu.id}
                  onClick={() => setSelectedStudent(stu)}
                  className={`p-2.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    selectedStudent?.id === stu.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-xs text-emerald-800 shrink-0">
                      {(stu.n || '?').charAt(0)}
                    </div>
                    <div>
                      <div className="font-arabic font-bold line-clamp-1" dir="auto">{stu.n}</div>
                      <div className="text-[10px] font-mono text-slate-400">{stu.id} · {stu.cl || 'General'}</div>
                    </div>
                  </div>
                  {selectedStudent?.id === stu.id && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Card Stage & Actions */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center p-6 sm:p-10 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            {selectedStudent ? (
              <div className="w-full max-w-lg space-y-6">
                {/* Visual CR80 Card Preview */}
                <div
                  className={`w-full aspect-[1.586/1] text-white rounded-3xl p-6 shadow-2xl border-2 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    cardTheme === 'royal-gold'
                      ? 'bg-gradient-to-br from-[#07162c] via-[#091e3d] to-[#020914] border-amber-500/40 shadow-amber-950/20'
                      : cardTheme === 'midnight-purple'
                      ? 'bg-gradient-to-br from-[#2e1065] via-[#1e0b36] to-[#0f051d] border-purple-500/40 shadow-purple-950/20'
                      : cardTheme === 'classic-ivory'
                      ? 'bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] border-amber-600/40 shadow-slate-950/20'
                      : 'bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#01140e] border-emerald-500/40 shadow-emerald-950/20'
                  }`}
                >
                  {/* Decorative background watermark */}
                  <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
                    <img src={COLLEGE_LOGO} alt="" className="w-72 h-72" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center space-x-3.5 border-b border-white/20 pb-3 relative z-10">
                    <img
                      src={COLLEGE_LOGO}
                      alt="Logo"
                      className="w-12 h-12 rounded-full bg-white p-0.5 shadow-md shrink-0"
                    />
                    <div className="leading-tight">
                      <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                        {settings.name}
                      </div>
                      <div className="text-xs font-arabic text-amber-200 font-bold">
                        {settings.ar} · {settings.lib}
                      </div>
                    </div>
                  </div>

                  {/* Student Details & QR */}
                  <div className="flex items-center justify-between my-2 relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 rounded-2xl bg-black/40 border-2 border-white/30 overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                        {selectedStudent.img ? (
                          <img src={selectedStudent.img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-bold">{(selectedStudent.n || '?').charAt(0)}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-base font-bold font-arabic leading-snug" dir="auto">
                          {selectedStudent.n}
                        </div>
                        <div className="font-mono text-xs font-bold text-amber-300">
                          {selectedStudent.id}
                        </div>
                        <div className="text-xs text-slate-200">
                          Class: <b>{selectedStudent.cl || 'General'}</b>
                        </div>
                        {selectedStudent.tn && (
                          <div className="text-[11px] text-amber-200 font-arabic">
                            {selectedStudent.tn}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-1.5 rounded-2xl shadow-lg shrink-0">
                      {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
                      ) : (
                        <div className="w-20 h-20 bg-slate-200 animate-pulse rounded-xl" />
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Bar */}
                  <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[10px] text-amber-200 font-mono relative z-10">
                    <span>REG: {selectedStudent.rg || selectedStudent.id}</span>
                    <span>EXP: {selectedStudent.rx || '2028-12-31'}</span>
                    <span className="font-sans font-bold text-emerald-400">OFFICIAL PASS</span>
                  </div>
                </div>

                {/* ACTION BUTTONS (Download PNG, Download JPG, Print) */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Export & Print Options</span>
                    <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                      File: {selectedStudent.n.replace(/\s+/g, '_')}_ID_Card
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Download High-Res PNG */}
                    <button
                      onClick={() => handleDownloadPng(selectedStudent)}
                      disabled={downloading}
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold shadow-md transition disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloading ? 'Rendering…' : 'Download PNG'}</span>
                    </button>

                    {/* Download JPG */}
                    <button
                      onClick={() => handleDownloadJpg(selectedStudent)}
                      disabled={downloading}
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold transition disabled:opacity-50"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Download JPG</span>
                    </button>

                    {/* Print Card */}
                    <button
                      onClick={() => handlePrintCard(selectedStudent)}
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-semibold transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print ID Card</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-slate-400">
                    High-resolution 300 DPI canvas output formatted to ISO/IEC 7810 ID-1 standard dimensions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs">No student selected. Select a student on the left.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

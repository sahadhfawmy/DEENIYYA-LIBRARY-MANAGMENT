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
  FileText,
  Sparkles,
  QrCode as QrCodeIcon,
  Check,
  Eye,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Student, LibrarySettings } from '../types';
import { COLLEGE_LOGO } from '../data/logo';
import {
  CardResolution,
  RESOLUTION_PRESETS,
  downloadStudentIdCardImage,
  downloadStudentIdCardPdf,
  printSingleStudentIdCard,
} from '../lib/idCardRenderer';
import { StudentVerificationModal } from './StudentVerificationModal';

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
  const [resolution, setResolution] = useState<CardResolution>('3K');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [sheetMode, setSheetMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);

  // Auto-select initial student
  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0]);
    }
  }, [students, selectedStudent]);

  // Generate real machine-readable QR Code whenever selected student changes
  useEffect(() => {
    if (selectedStudent) {
      const verifyUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/?verify=${encodeURIComponent(selectedStudent.id)}`
          : `https://deeniya.library.edu/?verify=${encodeURIComponent(selectedStudent.id)}`;

      QRCode.toDataURL(
        verifyUrl,
        {
          width: 320,
          margin: 1,
          color: { dark: '#022416', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        },
        (err, url) => {
          if (!err && url) setQrCodeDataUrl(url);
        }
      );
    }
  }, [selectedStudent]);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 shadow-lg mt-8">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Restricted: Student Digital ID Card Center
        </h3>
        <p className="text-xs text-slate-500">
          Official digital student identification passes and cryptographic barcode credentials can only be issued by an authorized Administrator.
        </p>
        <button
          onClick={onOpenLogin}
          className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-xs shadow-md transition hover:bg-emerald-700"
        >
          Admin Login · تسجيل الدخول
        </button>
      </div>
    );
  }

  const activeStudents = students.filter((s) => !s.arch);
  const filteredList = activeStudents.filter((s) => {
    if (filterClass && s.cl !== filterClass) return false;
    if (searchStudent) {
      const q = searchStudent.toLowerCase();
      const match = `${s.id} ${s.n} ${s.cl || ''} ${s.tn || ''} ${s.rg || ''}`.toLowerCase();
      return match.includes(q);
    }
    return true;
  });

  const uniqueClasses = Array.from(new Set(activeStudents.map((s) => s.cl).filter(Boolean)));

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleDownloadPng = async (stu: Student) => {
    setIsProcessing(true);
    try {
      await downloadStudentIdCardImage(stu, settings, 'png', resolution);
      showNotification(`Downloaded 16:9 Landscape PNG at ${RESOLUTION_PRESETS[resolution].label}!`);
    } catch (err) {
      console.error(err);
      alert('Error generating PNG card image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = async (stu: Student) => {
    setIsProcessing(true);
    try {
      await downloadStudentIdCardPdf(stu, settings, resolution);
      showNotification(`Downloaded Print-Ready 16:9 Landscape PDF (${RESOLUTION_PRESETS[resolution].label})!`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintCard = async (stu: Student) => {
    setIsProcessing(true);
    try {
      await printSingleStudentIdCard(stu, settings, resolution);
      showNotification('Sent 16:9 Landscape ID Card to Print Spooler!');
    } catch (err) {
      console.error(err);
      alert('Error opening print window.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to extract clean non-placeholder value (no dashes, no fake data)
  const getCleanVal = (val?: string) => {
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (
      trimmed === '-' ||
      trimmed === '—' ||
      trimmed === '–' ||
      trimmed === 'N/A' ||
      trimmed === 'null' ||
      trimmed === 'undefined'
    ) {
      return null;
    }
    return trimmed;
  };

  const isExpired = selectedStudent?.rx && selectedStudent.rx < new Date().toISOString().slice(0, 10);
  const isInactive = selectedStudent?.off;

  return (
    <div className="space-y-6">
      {/* Top Header & Command Toolbar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#01170e] via-[#032b1a] to-[#01140c] text-white border border-amber-400/30 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-900/80 border border-amber-400/30 text-amber-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Al Dheeniyya Arabic College · Digital Identification Pass Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight font-sans text-white">
            Landscape 16:9 Student ID Card Generator
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/90 font-arabic">
            إصدار وتوليد بطاقات الطلاب الذكية بنقاء فائق ثلاثي الأبعاد (HD · 2K · 3K Ultra HD)
          </p>
        </div>

        {/* Controls: Resolution Preset & Mode Switcher */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {/* Resolution Selector: HD (1920x1080), 2K (2560x1440), 3K (3072x1728) */}
          <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-black/40 border border-amber-400/30 backdrop-blur-md text-xs">
            <span className="text-[11px] font-bold text-amber-300 pl-2">Quality:</span>
            {(['HD', '2K', '3K'] as CardResolution[]).map((res) => (
              <button
                key={res}
                onClick={() => setResolution(res)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  resolution === res
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md ring-1 ring-amber-300/60'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title={RESOLUTION_PRESETS[res].label}
              >
                {res} {res === '3K' && '★'}
              </button>
            ))}
          </div>

          {/* Single vs Batch Switcher */}
          <button
            onClick={() => setSheetMode(!sheetMode)}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
              sheetMode
                ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/20'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{sheetMode ? 'Single View' : 'Batch Grid'}</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-900/90 border border-emerald-400 text-white text-xs font-semibold flex items-center space-x-2.5 shadow-lg animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {sheetMode ? (
        /* ---------------------------------------------------------------------- */
        /* BATCH SHEET MODE (A4 Batch Preview Grid)                                */
        /* ---------------------------------------------------------------------- */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1 text-xs text-slate-500">
            <div>
              Displaying <b>{filteredList.length}</b> student passes in 16:9 Landscape ratio · Ready for high-resolution export.
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
              >
                <option value="">All Academic Classes ({activeStudents.length})</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredList.map((stu) => (
              <div
                key={stu.id}
                className="w-full aspect-video rounded-3xl p-5 bg-gradient-to-br from-[#01170e] via-[#022416] to-[#043823] text-white border-2 border-amber-400/40 shadow-xl flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Header */}
                <div className="flex items-center space-x-3 border-b border-amber-400/30 pb-2">
                  <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-amber-400 shrink-0">
                    <img src={COLLEGE_LOGO} alt="" className="w-full h-full object-contain rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black tracking-tight text-white uppercase truncate">
                      AL DHEENIYYA ARABIC COLLEGE
                    </div>
                    <div className="text-[10px] text-amber-300 font-arabic truncate">
                      المكتبة الإسلامية الرقمية · STUDENT LIBRARY PASS
                    </div>
                  </div>
                </div>

                {/* Body (Photo, Details, QR) */}
                <div className="flex items-center justify-between my-2 gap-3">
                  <div className="w-20 h-24 rounded-xl bg-slate-900 border-2 border-amber-400 overflow-hidden shrink-0 flex items-center justify-center">
                    {stu.img ? (
                      <img src={stu.img} alt={stu.n} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-amber-200 font-arabic">{(stu.n || '?').charAt(0)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5 text-xs">
                    <div className="font-bold text-sm text-amber-200 font-arabic truncate" dir="auto">
                      {stu.n}
                    </div>
                    <div className="font-mono text-[11px] font-bold text-emerald-300">
                      ID: {stu.id}
                    </div>
                    {stu.cl && (
                      <div className="text-[10px] text-slate-200 truncate">
                        Class: <b>{stu.cl}</b>
                      </div>
                    )}
                    {stu.tn && (
                      <div className="text-[10px] text-amber-200/90 font-arabic truncate" dir="auto">
                        {stu.tn}
                      </div>
                    )}
                  </div>

                  {/* QR Box */}
                  <div className="w-20 h-24 bg-white rounded-xl p-1 border-2 border-amber-400/80 shadow shrink-0 flex flex-col items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/?verify=${stu.id}`
                          : stu.id
                      )}`}
                      alt="QR"
                      className="w-14 h-14"
                    />
                    <span className="text-[8px] font-bold text-emerald-950 font-mono mt-0.5">VERIFIED</span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-amber-400/30 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-emerald-300">EXP: {stu.rx || '2028-12-31'}</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleDownloadPng(stu)}
                      disabled={isProcessing}
                      className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold transition"
                    >
                      PNG ({resolution})
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(stu)}
                      disabled={isProcessing}
                      className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-semibold transition"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => handlePrintCard(stu)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
                    >
                      Print
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------------------------- */
        /* SINGLE CARD WORKFLOW & HIGH-RES 16:9 STUDIO PREVIEW                    */
        /* ---------------------------------------------------------------------- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Student Selector & Search (4 Columns) */}
          <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Select Student ({activeStudents.length})
              </h3>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-medium"
              >
                <option value="">All Classes</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name, ID, class, or town..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full text-xs py-2 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 text-xs">
              {filteredList.map((stu) => {
                const isSelected = selectedStudent?.id === stu.id;
                return (
                  <div
                    key={stu.id}
                    onClick={() => setSelectedStudent(stu)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-200 font-semibold shadow-sm ring-1 ring-emerald-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0 overflow-hidden">
                        {stu.img ? (
                          <img src={stu.img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (stu.n || '?').charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-arabic font-bold truncate" dir="auto">
                          {stu.n}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {stu.id} {stu.cl && `· ${stu.cl}`}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: 16:9 Landscape Card Stage & Actions (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-100 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800">
            {selectedStudent ? (
              <div className="w-full space-y-6">
                {/* Visual 16:9 Landscape Card Preview Container */}
                <div className="w-full max-w-3xl mx-auto shadow-2xl rounded-3xl overflow-hidden border-2 border-amber-400/50">
                  <div className="w-full aspect-video bg-gradient-to-br from-[#01170e] via-[#022416] to-[#043823] text-white p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden select-none">
                    {/* Background Islamic Watermark Motif */}
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
                      <img src={COLLEGE_LOGO} alt="" className="w-80 h-80" />
                    </div>

                    {/* Header Zone */}
                    <div className="flex items-center space-x-4 border-b border-amber-400/40 pb-3 relative z-10">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white p-1 border-2 border-amber-400 shadow-md shrink-0 flex items-center justify-center">
                        <img src={COLLEGE_LOGO} alt="Logo" className="w-full h-full object-contain rounded-full" />
                      </div>
                      <div className="leading-tight min-w-0">
                        <div className="text-xs sm:text-base font-black tracking-wide uppercase text-white font-sans truncate">
                          AL DHEENIYYA ARABIC COLLEGE
                        </div>
                        <div className="text-xs sm:text-sm font-arabic text-amber-300 font-bold truncate">
                          المكتبة الإسلامية الرقمية · STUDENT LIBRARY IDENTIFICATION PASS
                        </div>
                        <div className="text-[10px] text-emerald-200 font-arabic truncate">
                          البطاقة الذكية للمكتبة · DIGITAL STUDENT PASS
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Photo (Left), Information (Center), QR Code (Right) */}
                    <div className="flex items-center justify-between my-2 sm:my-3 gap-4 sm:gap-6 relative z-10 flex-1">
                      {/* Left: Student Photo */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-24 h-32 sm:w-32 sm:h-40 rounded-2xl bg-black/50 border-2 border-amber-400 overflow-hidden shadow-xl flex items-center justify-center">
                          {selectedStudent.img ? (
                            <img src={selectedStudent.img} alt={selectedStudent.n} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-bold font-arabic text-amber-200">
                              {(selectedStudent.n || '?').charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 px-2.5 py-0.5 rounded-lg bg-black/60 border border-amber-400/50 text-[10px] sm:text-xs font-mono font-bold text-white">
                          ID: {selectedStudent.id}
                        </div>
                      </div>

                      {/* Center: Real Student Details (NO dashes, NO fake values) */}
                      <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2 text-left">
                        <div className="text-base sm:text-2xl font-bold font-arabic text-amber-200 leading-tight truncate" dir="auto">
                          {selectedStudent.n}
                        </div>

                        <div className="space-y-1 text-[10px] sm:text-xs text-slate-200">
                          {getCleanVal(selectedStudent.rg) && (
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="text-emerald-300 font-semibold">Reg No. · رقم التسجيل:</span>
                              <span className="font-mono font-bold text-white">{selectedStudent.rg}</span>
                            </div>
                          )}

                          {getCleanVal(selectedStudent.cl) && (
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="text-emerald-300 font-semibold">Class · الصف الدراسي:</span>
                              <span className="font-bold text-white">{selectedStudent.cl}</span>
                            </div>
                          )}

                          {getCleanVal(selectedStudent.tn) && (
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="text-emerald-300 font-semibold">Location · البلدة:</span>
                              <span className="font-arabic font-bold text-white" dir="auto">{selectedStudent.tn}</span>
                            </div>
                          )}

                          {getCleanVal(selectedStudent.adm) && (
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="text-emerald-300 font-semibold">Admission · تاريخ القبول:</span>
                              <span className="font-mono text-white">{selectedStudent.adm}</span>
                            </div>
                          )}

                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="text-emerald-300 font-semibold">Card Expiry · الانتهاء:</span>
                            <span className="font-mono font-bold text-amber-300">
                              {getCleanVal(selectedStudent.rx) || '2028-12-31'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Real Machine-Readable QR Box */}
                      <div className="w-28 h-36 sm:w-36 sm:h-44 bg-white rounded-2xl p-2 border-2 border-amber-400 shadow-xl shrink-0 flex flex-col items-center justify-between text-center">
                        <div className="text-[9px] sm:text-[10px] font-black text-emerald-950 uppercase leading-none">
                          SCAN TO VERIFY
                        </div>
                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center my-0.5">
                          {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full bg-slate-200 animate-pulse rounded" />
                          )}
                        </div>
                        <div className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-800 leading-none">
                          {selectedStudent.id}
                        </div>
                        <div className="text-[7px] sm:text-[8px] text-emerald-700 font-bold uppercase leading-none">
                          CENTRAL PASS
                        </div>
                      </div>
                    </div>

                    {/* Footer Zone */}
                    <div className="pt-2 border-t border-amber-400/40 flex items-center justify-between text-[9px] sm:text-xs relative z-10">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px] ${
                            isExpired
                              ? 'bg-red-600 text-white'
                              : isInactive
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          ✓ {isExpired ? 'EXPIRED' : isInactive ? 'INACTIVE' : 'ACTIVE MEMBER'}
                        </span>
                        <span className="hidden sm:inline text-emerald-200 text-[10px]">
                          DHEENIYYA ARABIC COLLEGE • OFFICIAL DIGITAL ID
                        </span>
                      </div>

                      <div className="font-mono text-amber-300 font-bold text-[10px] sm:text-xs">
                        AUTH: SUPER ADMIN
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1-Click Action Bar */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        Export & Verification Controls
                      </span>
                      <span className="text-slate-400 block text-[11px]">
                        Target Format: <b>Landscape 16:9</b> · Resolution: <b>{RESOLUTION_PRESETS[resolution].label}</b>
                      </span>
                    </div>

                    <button
                      onClick={() => setVerifyModalOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-600 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs transition"
                      title="Test live QR scan verification dialog"
                    >
                      <QrCodeIcon className="w-3.5 h-3.5" />
                      <span>Test Scan & Verify</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Download High-Resolution PNG (HD, 2K, 3K) */}
                    <button
                      onClick={() => handleDownloadPng(selectedStudent)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 active:scale-98"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PNG ({resolution})</span>
                    </button>

                    {/* Download Print-Ready 16:9 Landscape PDF */}
                    <button
                      onClick={() => handleDownloadPdf(selectedStudent)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 active:scale-98"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download PDF (16:9)</span>
                    </button>

                    {/* Direct Print (Card Only, Zero Clutter) */}
                    <button
                      onClick={() => handlePrintCard(selectedStudent)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold shadow-md transition disabled:opacity-50 active:scale-98"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print ID Card</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-slate-400">
                    All downloads maintain exact 16:9 landscape aspect ratio at selected resolution (HD: 1920×1080 · 2K: 2560×1440 · 3K: 3072×1728).
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs py-12">
                No student selected. Please select a student record from the left panel.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verification Modal for Testing Scan / QR code */}
      <StudentVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        student={selectedStudent}
        settings={settings}
        verificationId={selectedStudent?.id}
      />
    </div>
  );
};

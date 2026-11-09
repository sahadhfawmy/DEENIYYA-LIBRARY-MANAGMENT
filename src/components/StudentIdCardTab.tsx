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
  Edit3,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Sun,
  Scissors,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Student, LibrarySettings } from '../types';
import { COLLEGE_LOGO } from '../data/logo';
import {
  CardResolution,
  CardPrintTheme,
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
  const [editableStudent, setEditableStudent] = useState<Student | null>(null);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [resolution, setResolution] = useState<CardResolution>('3K');
  const [cardTheme, setCardTheme] = useState<CardPrintTheme>('emerald-gold');
  const [includeCutGuides, setIncludeCutGuides] = useState<boolean>(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [sheetMode, setSheetMode] = useState<boolean>(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'preview' | 'edit'>('preview');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select initial student
  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      const initial = students[0];
      setSelectedStudent(initial);
      setEditableStudent({ ...initial });
      setIsModified(false);
    }
  }, [students, selectedStudent]);

  // When selected student changes, synchronize editableStudent
  const handleSelectStudent = (stu: Student) => {
    setSelectedStudent(stu);
    setEditableStudent({ ...stu });
    setIsModified(false);
  };

  // Generate real machine-readable QR Code whenever editableStudent id changes
  useEffect(() => {
    const studentToCode = editableStudent || selectedStudent;
    if (studentToCode) {
      const verifyUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/?verify=${encodeURIComponent(studentToCode.id)}`
          : `https://deeniya.library.edu/?verify=${encodeURIComponent(studentToCode.id)}`;

      QRCode.toDataURL(
        verifyUrl,
        {
          width: 360,
          margin: 1,
          color: { dark: '#022416', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        },
        (err, url) => {
          if (!err && url) setQrCodeDataUrl(url);
        }
      );
    }
  }, [editableStudent?.id, selectedStudent?.id]);

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

  // Live editing handlers
  const handleFieldChange = (field: keyof Student, value: any) => {
    if (!editableStudent) return;
    setEditableStudent((prev) => (prev ? { ...prev, [field]: value } : prev));
    setIsModified(true);
  };

  const handleResetToDatabase = () => {
    if (selectedStudent) {
      setEditableStudent({ ...selectedStudent });
      setIsModified(false);
      showNotification('Reset card details back to database values.');
    }
  };

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        handleFieldChange('img', base64);
        showNotification('Custom student photo applied to card!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Active student object to render (either live-edited or database record)
  const currentStudent: Student | null = editableStudent || selectedStudent;

  const handleDownloadPng = async (stu: Student) => {
    setIsProcessing(true);
    try {
      await downloadStudentIdCardImage(stu, settings, 'png', resolution, cardTheme);
      showNotification(
        `Downloaded 16:9 Landscape PNG (${cardTheme === 'print-clean' ? 'Print-Friendly Clean' : 'Flagship Emerald'}) at ${
          RESOLUTION_PRESETS[resolution].label
        }!`
      );
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
      await downloadStudentIdCardPdf(stu, settings, resolution, cardTheme);
      showNotification(
        `Downloaded 16:9 Landscape PDF (${cardTheme === 'print-clean' ? 'Print-Friendly Clean' : 'Flagship Emerald'})!`
      );
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
      await printSingleStudentIdCard(stu, settings, resolution, cardTheme);
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

  const isExpired = currentStudent?.rx && currentStudent.rx < new Date().toISOString().slice(0, 10);
  const isInactive = currentStudent?.off;
  const isPrintClean = cardTheme === 'print-clean';

  return (
    <div className="space-y-6">
      {/* Top Header & Command Toolbar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#01170e] via-[#032b1a] to-[#01140c] text-white border border-amber-400/30 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-900/80 border border-amber-400/30 text-amber-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Al Dheeniyya Arabic College · Digital Identification Pass Studio</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight font-sans text-white">
            16:9 Student ID Card Generator & Live Print Studio
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/90 font-arabic">
            خطوط عريضة واضحة • تعديل فوري مباشر • وضع الطباعة الاقتصادي وتوفير الحبر (HD · 2K · 3K)
          </p>
        </div>

        {/* Controls: Print Theme, Resolution Preset & Mode Switcher */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {/* Theme Selector: Flagship Emerald Gold vs Print-Friendly Clean */}
          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-black/40 border border-amber-400/30 backdrop-blur-md text-xs">
            <button
              onClick={() => setCardTheme('emerald-gold')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                cardTheme === 'emerald-gold'
                  ? 'bg-gradient-to-r from-emerald-800 to-emerald-700 text-amber-200 shadow-md ring-1 ring-amber-400/60'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Official Flagship Emerald & Gold Theme"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Flagship Emerald</span>
            </button>
            <button
              onClick={() => setCardTheme('print-clean')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                cardTheme === 'print-clean'
                  ? 'bg-white text-emerald-950 font-black shadow-md ring-1 ring-emerald-600'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Print-Friendly Clean White Paper Mode: Saves 85% toner/ink"
            >
              <Sun className="w-3 h-3 text-amber-500" />
              <span>Print-Friendly (Clean)</span>
            </button>
          </div>

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
            <span>{sheetMode ? 'Single Studio' : 'Batch Grid'}</span>
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
              Displaying <b>{filteredList.length}</b> student passes in 16:9 Landscape ratio · Active Theme: <b>{cardTheme === 'print-clean' ? 'Print-Friendly Clean' : 'Flagship Emerald'}</b>
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
                className={`w-full aspect-video rounded-3xl p-5 border-2 shadow-xl flex flex-col justify-between relative overflow-hidden group transition ${
                  isPrintClean
                    ? 'bg-white text-slate-900 border-emerald-700/60'
                    : 'bg-gradient-to-br from-[#01170e] via-[#022416] to-[#043823] text-white border-amber-400/40'
                }`}
              >
                {/* Header */}
                <div className={`flex items-center space-x-3 border-b pb-2 ${isPrintClean ? 'border-emerald-700/30' : 'border-amber-400/30'}`}>
                  <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-amber-400 shrink-0">
                    <img src={COLLEGE_LOGO} alt="" className="w-full h-full object-contain rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-black tracking-tight uppercase truncate ${isPrintClean ? 'text-emerald-950' : 'text-white'}`}>
                      AL DHEENIYYA ARABIC COLLEGE
                    </div>
                    <div className={`text-[10px] font-arabic truncate ${isPrintClean ? 'text-amber-700 font-bold' : 'text-amber-300'}`}>
                      المكتبة الإسلامية الرقمية · STUDENT LIBRARY PASS
                    </div>
                  </div>
                </div>

                {/* Body (Photo, Details, QR) */}
                <div className="flex items-center justify-between my-2 gap-3">
                  <div className={`w-20 h-24 rounded-xl border-2 overflow-hidden shrink-0 flex items-center justify-center ${isPrintClean ? 'bg-slate-100 border-emerald-800' : 'bg-slate-900 border-amber-400'}`}>
                    {stu.img ? (
                      <img src={stu.img} alt={stu.n} className="w-full h-full object-cover" />
                    ) : (
                      <span className={`text-xl font-bold font-arabic ${isPrintClean ? 'text-emerald-900' : 'text-amber-200'}`}>{(stu.n || '?').charAt(0)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1 text-xs">
                    <div className={`font-bold text-sm sm:text-base font-arabic truncate ${isPrintClean ? 'text-emerald-950' : 'text-amber-200'}`} dir="auto">
                      {stu.n}
                    </div>
                    <div className={`font-mono text-xs font-bold ${isPrintClean ? 'text-emerald-800' : 'text-emerald-300'}`}>
                      ID: {stu.id}
                    </div>
                    {stu.cl && (
                      <div className={`text-[11px] truncate ${isPrintClean ? 'text-slate-700' : 'text-slate-200'}`}>
                        Class: <b>{stu.cl}</b>
                      </div>
                    )}
                    {stu.tn && (
                      <div className={`text-[11px] font-arabic truncate ${isPrintClean ? 'text-amber-900 font-semibold' : 'text-amber-200/90'}`} dir="auto">
                        {stu.tn}
                      </div>
                    )}
                  </div>

                  {/* QR Box */}
                  <div className="w-20 h-24 bg-white rounded-xl p-1 border-2 border-emerald-700 shadow shrink-0 flex flex-col items-center justify-center">
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
                <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${isPrintClean ? 'border-emerald-700/30' : 'border-amber-400/30'}`}>
                  <span className={`font-mono font-bold ${isPrintClean ? 'text-emerald-800' : 'text-emerald-300'}`}>EXP: {stu.rx || '2028-12-31'}</span>
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
        /* SINGLE CARD STUDIO & LIVE EDITABLE WORKFLOW                           */
        /* ---------------------------------------------------------------------- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Student Selector (4 Columns) */}
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
                    onClick={() => handleSelectStudent(stu)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-200 font-semibold shadow-sm ring-1 ring-emerald-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0 overflow-hidden">
                        {stu.img ? (
                          <img src={stu.img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (stu.n || '?').charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-arabic font-bold truncate text-sm" dir="auto">
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

          {/* Right Column: 16:9 Landscape Card Stage & Live Editor (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            {currentStudent ? (
              <div className="space-y-6">
                {/* Studio View Tabs: Interactive 16:9 Card Preview vs Live Editable Form */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveEditorTab('preview')}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition ${
                        activeEditorTab === 'preview'
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>16:9 Visual Preview</span>
                    </button>

                    <button
                      onClick={() => setActiveEditorTab('edit')}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition relative ${
                        activeEditorTab === 'edit'
                          ? 'bg-amber-700 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Live Card Editor</span>
                      {isModified && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Reset to database button */}
                  {isModified && (
                    <button
                      onClick={handleResetToDatabase}
                      className="inline-flex items-center space-x-1.5 text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                      title="Reset all modified fields back to student database record"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to DB Values</span>
                    </button>
                  )}
                </div>

                {/* -------------------------------------------------------------- */}
                {/* VISUAL 16:9 LANDSCAPE CARD PREVIEW WITH ENLARGED DETAILS       */}
                {/* -------------------------------------------------------------- */}
                <div className="w-full shadow-2xl rounded-3xl overflow-hidden border-2 border-amber-400/50">
                  <div
                    className={`w-full aspect-video p-5 sm:p-7 md:p-8 flex flex-col justify-between relative overflow-hidden select-none transition-colors duration-300 ${
                      isPrintClean
                        ? 'bg-[#ffffff] text-slate-900 border-4 border-amber-500/80'
                        : 'bg-gradient-to-br from-[#01170e] via-[#022416] to-[#043823] text-white'
                    }`}
                  >
                    {/* Background Islamic Watermark Motif */}
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
                      <img src={COLLEGE_LOGO} alt="" className="w-80 h-80" />
                    </div>

                    {/* Header Zone */}
                    <div
                      className={`flex items-center space-x-4 border-b pb-3 relative z-10 ${
                        isPrintClean ? 'border-emerald-800/30' : 'border-amber-400/40'
                      }`}
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white p-1 border-2 border-amber-400 shadow-md shrink-0 flex items-center justify-center">
                        <img src={COLLEGE_LOGO} alt="Logo" className="w-full h-full object-contain rounded-full" />
                      </div>
                      <div className="leading-tight min-w-0 flex-1">
                        <div
                          className={`text-sm sm:text-lg md:text-xl font-black tracking-wide uppercase font-sans truncate ${
                            isPrintClean ? 'text-emerald-950' : 'text-white'
                          }`}
                        >
                          AL DHEENIYYA ARABIC COLLEGE
                        </div>
                        <div
                          className={`text-xs sm:text-base font-arabic font-bold truncate ${
                            isPrintClean ? 'text-amber-800' : 'text-amber-300'
                          }`}
                        >
                          المكتبة الإسلامية الرقمية · STUDENT LIBRARY IDENTIFICATION PASS
                        </div>
                        <div
                          className={`text-[10px] sm:text-xs font-arabic truncate ${
                            isPrintClean ? 'text-emerald-800 font-semibold' : 'text-emerald-200'
                          }`}
                        >
                          البطاقة الذكية للمكتبة · DIGITAL STUDENT PASS
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Photo (Left), Information (Center), QR Code (Right) */}
                    <div className="flex items-center justify-between my-2 sm:my-3 gap-4 sm:gap-6 relative z-10 flex-1">
                      {/* Left: Student Photo with Prominent ID Badge */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className={`w-24 h-32 sm:w-32 sm:h-44 md:w-36 md:h-48 rounded-2xl border-2 overflow-hidden shadow-xl flex items-center justify-center ${
                            isPrintClean ? 'bg-slate-100 border-emerald-800' : 'bg-black/50 border-amber-400'
                          }`}
                        >
                          {currentStudent.img ? (
                            <img src={currentStudent.img} alt={currentStudent.n} className="w-full h-full object-cover" />
                          ) : (
                            <span
                              className={`text-4xl font-bold font-arabic ${
                                isPrintClean ? 'text-emerald-900' : 'text-amber-200'
                              }`}
                            >
                              {(currentStudent.n || '?').charAt(0)}
                            </span>
                          )}
                        </div>

                        {/* Prominent Student ID Badge */}
                        <div
                          className={`mt-2 px-3 py-1 rounded-xl border text-xs sm:text-sm md:text-base font-mono font-bold tracking-wider shadow ${
                            isPrintClean
                              ? 'bg-emerald-900 border-amber-500 text-white'
                              : 'bg-black/80 border-amber-400 text-amber-200'
                          }`}
                        >
                          ID: {currentStudent.id}
                        </div>
                      </div>

                      {/* Center: ENLARGED Student Details (Bold, Large, High-Contrast) */}
                      <div className="flex-1 min-w-0 space-y-2 sm:space-y-2.5 text-left">
                        {/* Student Name: Extra Large Font */}
                        <div
                          className={`text-lg sm:text-2xl md:text-3xl font-black font-arabic leading-tight truncate ${
                            isPrintClean ? 'text-emerald-950' : 'text-amber-200'
                          }`}
                          dir="auto"
                        >
                          {currentStudent.n || 'REGISTERED STUDENT'}
                        </div>

                        {/* Gold accent line under name */}
                        <div
                          className={`h-0.5 w-full rounded ${
                            isPrintClean ? 'bg-amber-600/40' : 'bg-amber-400/50'
                          }`}
                        />

                        {/* Detail Rows with ENLARGED Font Size */}
                        <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm md:text-base">
                          {getCleanVal(currentStudent.rg) && (
                            <div
                              className={`flex items-center justify-between px-2.5 py-1 rounded-lg border ${
                                isPrintClean
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                  : 'bg-emerald-950/40 border-emerald-500/30 text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className={isPrintClean ? 'text-emerald-800 font-bold' : 'text-emerald-300 font-bold'}>
                                  Reg No. · رقم التسجيل:
                                </span>
                              </div>
                              <span className="font-mono font-bold text-xs sm:text-sm md:text-base">{currentStudent.rg}</span>
                            </div>
                          )}

                          {getCleanVal(currentStudent.cl) && (
                            <div
                              className={`flex items-center justify-between px-2.5 py-1 rounded-lg border ${
                                isPrintClean
                                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                                  : 'bg-black/30 border-white/10 text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className={isPrintClean ? 'text-emerald-800 font-bold' : 'text-emerald-300 font-bold'}>
                                  Class · الصف الدراسي:
                                </span>
                              </div>
                              <span className="font-bold text-xs sm:text-sm md:text-base">{currentStudent.cl}</span>
                            </div>
                          )}

                          {getCleanVal(currentStudent.tn) && (
                            <div
                              className={`flex items-center justify-between px-2.5 py-1 rounded-lg border ${
                                isPrintClean
                                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                                  : 'bg-black/30 border-white/10 text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className={isPrintClean ? 'text-emerald-800 font-bold' : 'text-emerald-300 font-bold'}>
                                  Town · البلدة:
                                </span>
                              </div>
                              <span className="font-arabic font-bold text-xs sm:text-sm md:text-base" dir="auto">
                                {currentStudent.tn}
                              </span>
                            </div>
                          )}

                          {getCleanVal(currentStudent.adm) && (
                            <div
                              className={`flex items-center justify-between px-2.5 py-1 rounded-lg border ${
                                isPrintClean
                                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                                  : 'bg-black/30 border-white/10 text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className={isPrintClean ? 'text-emerald-800 font-bold' : 'text-emerald-300 font-bold'}>
                                  Admission · القبول:
                                </span>
                              </div>
                              <span className="font-mono text-xs sm:text-sm md:text-base">{currentStudent.adm}</span>
                            </div>
                          )}

                          {/* Mandatory Expiry Field */}
                          <div
                            className={`flex items-center justify-between px-2.5 py-1 rounded-lg border ${
                              isPrintClean
                                ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                                : 'bg-amber-950/30 border-amber-400/40 text-amber-200'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className={isPrintClean ? 'text-amber-900 font-bold' : 'text-amber-300 font-bold'}>
                                Card Expiry · الصلاحية:
                              </span>
                            </div>
                            <span className="font-mono font-black text-xs sm:text-sm md:text-base">
                              {getCleanVal(currentStudent.rx) || '2028-12-31'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Real Machine-Readable QR Box */}
                      <div className="w-28 h-36 sm:w-36 sm:h-44 md:w-40 md:h-52 bg-white rounded-2xl p-2 border-2 border-amber-400 shadow-xl shrink-0 flex flex-col items-center justify-between text-center">
                        <div className="text-[9px] sm:text-[10px] md:text-xs font-black text-emerald-950 uppercase leading-none">
                          SCAN TO VERIFY
                        </div>
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center my-0.5">
                          {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full bg-slate-200 animate-pulse rounded" />
                          )}
                        </div>
                        <div className="text-[9px] sm:text-[10px] md:text-xs font-mono font-bold text-slate-900 leading-none">
                          {currentStudent.id}
                        </div>
                        <div className="text-[7px] sm:text-[8px] md:text-[9px] text-emerald-800 font-black uppercase leading-none">
                          OFFICIAL DIGITAL PASS
                        </div>
                      </div>
                    </div>

                    {/* Footer Zone */}
                    <div
                      className={`pt-2 border-t flex items-center justify-between text-[9px] sm:text-xs relative z-10 ${
                        isPrintClean ? 'border-emerald-800/30' : 'border-amber-400/40'
                      }`}
                    >
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
                        <span
                          className={`hidden sm:inline text-[10px] font-semibold ${
                            isPrintClean ? 'text-emerald-900' : 'text-emerald-200'
                          }`}
                        >
                          DHEENIYYA ARABIC COLLEGE • OFFICIAL DIGITAL ID
                        </span>
                      </div>

                      <div
                        className={`font-mono font-bold text-[10px] sm:text-xs ${
                          isPrintClean ? 'text-amber-800' : 'text-amber-300'
                        }`}
                      >
                        AUTH: SUPER ADMIN
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------------------------------------------------------------- */}
                {/* LIVE CARD EDITOR PANEL                                         */}
                {/* -------------------------------------------------------------- */}
                {activeEditorTab === 'edit' && (
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-500/40 shadow-lg space-y-4 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <Edit3 className="w-4 h-4 text-amber-600" />
                          <span>Live Card Editor & Print Customizer</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Edit student details on the fly before exporting or printing. Updates the card preview instantly!
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleCustomPhotoUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace Photo</span>
                        </button>
                        <button
                          onClick={handleResetToDatabase}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      {/* Full Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Full Name (Arabic / English)
                        </label>
                        <input
                          type="text"
                          value={currentStudent.n || ''}
                          onChange={(e) => handleFieldChange('n', e.target.value)}
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-arabic text-sm font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>

                      {/* Student ID */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Student ID
                        </label>
                        <input
                          type="text"
                          value={currentStudent.id || ''}
                          onChange={(e) => handleFieldChange('id', e.target.value)}
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>

                      {/* Registration Number */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Registration Number
                        </label>
                        <input
                          type="text"
                          value={currentStudent.rg || ''}
                          onChange={(e) => handleFieldChange('rg', e.target.value)}
                          placeholder="e.g. RG-2024-001"
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>

                      {/* Academic Class */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Academic Class
                        </label>
                        <input
                          type="text"
                          value={currentStudent.cl || ''}
                          onChange={(e) => handleFieldChange('cl', e.target.value)}
                          placeholder="e.g. Alim 1st Year"
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>

                      {/* Town / Location */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Town / City (Arabic)
                        </label>
                        <input
                          type="text"
                          value={currentStudent.tn || ''}
                          onChange={(e) => handleFieldChange('tn', e.target.value)}
                          placeholder="e.g. كولمبو"
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-arabic font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>

                      {/* Admission Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Admission Date
                        </label>
                        <input
                          type="date"
                          value={currentStudent.adm || ''}
                          onChange={(e) => handleFieldChange('adm', e.target.value)}
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>

                      {/* Card Expiry Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Card Expiry Date
                        </label>
                        <input
                          type="date"
                          value={currentStudent.rx || '2028-12-31'}
                          onChange={(e) => handleFieldChange('rx', e.target.value)}
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Membership Status
                        </label>
                        <select
                          value={currentStudent.off ? 'inactive' : 'active'}
                          onChange={(e) => handleFieldChange('off', e.target.value === 'inactive')}
                          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                        >
                          <option value="active">Active Member (نشط)</option>
                          <option value="inactive">Inactive / Suspended (غير نشط)</option>
                        </select>
                      </div>

                      {/* Cut Guides Option */}
                      <div className="flex items-center space-x-2 pt-5">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={includeCutGuides}
                            onChange={(e) => setIncludeCutGuides(e.target.checked)}
                            className="rounded text-emerald-800 focus:ring-emerald-600"
                          />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                            <Scissors className="w-3.5 h-3.5 text-slate-500" />
                            <span>Include Scissor Cut Guides</span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------- */}
                {/* 1-CLICK ACTION BAR (EXPORT & PRINT)                            */}
                {/* -------------------------------------------------------------- */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        Export & Verification Controls
                      </span>
                      <span className="text-slate-400 block text-[11px]">
                        Target Format: <b>Landscape 16:9</b> · Theme:{' '}
                        <b>{cardTheme === 'print-clean' ? 'Print-Friendly Clean' : 'Flagship Emerald'}</b> · Quality:{' '}
                        <b>{RESOLUTION_PRESETS[resolution].label}</b>
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
                      onClick={() => handleDownloadPng(currentStudent)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 active:scale-98"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PNG ({resolution})</span>
                    </button>

                    {/* Download Print-Ready 16:9 Landscape PDF */}
                    <button
                      onClick={() => handleDownloadPdf(currentStudent)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 active:scale-98"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download PDF (16:9)</span>
                    </button>

                    {/* Direct Print (Card Only, Zero Clutter) */}
                    <button
                      onClick={() => handlePrintCard(currentStudent)}
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
              <div className="text-slate-400 text-xs py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
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
        student={currentStudent}
        settings={settings}
        verificationId={currentStudent?.id}
      />
    </div>
  );
};

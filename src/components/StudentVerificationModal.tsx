import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  UserCheck,
  Calendar,
  Building,
  GraduationCap,
  MapPin,
  Lock,
} from 'lucide-react';
import { Student, LibrarySettings } from '../types';
import { COLLEGE_LOGO } from '../data/logo';

interface StudentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  settings: LibrarySettings;
  verificationId?: string;
}

export const StudentVerificationModal: React.FC<StudentVerificationModalProps> = ({
  isOpen,
  onClose,
  student,
  settings,
  verificationId,
}) => {
  if (!isOpen) return null;

  const isExpired = student?.rx && student.rx < new Date().toISOString().slice(0, 10);
  const isInactive = student?.off || student?.arch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-emerald-600/40 dark:border-amber-400/30 overflow-hidden flex flex-col">
        {/* Verification Top Header */}
        <div className="bg-gradient-to-r from-[#01170e] via-[#032919] to-[#01140c] text-white p-6 border-b border-amber-400/30 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-14 h-14 rounded-full bg-white p-1 border-2 border-amber-400/60 shadow-lg shrink-0 flex items-center justify-center">
              <img src={COLLEGE_LOGO} alt="College Crest" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Central Registry Verified Pass</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-sans">
                {settings.name || 'Al Dheeniyya Arabic College'}
              </h2>
              <p className="text-xs text-amber-200 font-arabic font-semibold">
                بوابة التحقق الرقمي لبطاقات الطلاب والمكتبة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition relative z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Status Banner */}
        <div
          className={`py-2.5 px-6 flex items-center justify-between text-xs font-bold text-white shadow-inner ${
            !student
              ? 'bg-amber-600'
              : isExpired
              ? 'bg-red-600'
              : isInactive
              ? 'bg-amber-700'
              : 'bg-emerald-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {!student
                ? `RECORD NOT FOUND: ${verificationId || ''}`
                : isExpired
                ? 'EXPIRED STUDENT PASS'
                : isInactive
                ? 'INACTIVE / ARCHIVED MEMBER'
                : 'OFFICIALLY VERIFIED ACTIVE STUDENT'}
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-90">
            {new Date().toLocaleDateString('en-GB')}
          </span>
        </div>

        {/* Body Record Details */}
        <div className="p-6 space-y-5 text-xs text-slate-700 dark:text-slate-200 overflow-y-auto max-h-[75vh]">
          {student ? (
            <>
              {/* Student Identity Lockup */}
              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-20 h-24 rounded-2xl bg-emerald-950 border-2 border-amber-400/50 overflow-hidden shadow-md flex items-center justify-center shrink-0">
                  {student.img ? (
                    <img src={student.img} alt={student.n} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-amber-200">
                      {(student.n || '?').charAt(0)}
                    </span>
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-arabic leading-snug truncate" dir="auto">
                    {student.n}
                  </h3>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-mono font-bold text-xs">
                    <span>ID: {student.id}</span>
                  </div>
                  {student.rg && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Reg No: <b>{student.rg}</b>
                    </p>
                  )}
                </div>
              </div>

              {/* Verified Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {student.cl && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center space-x-1">
                      <GraduationCap className="w-3 h-3 text-emerald-600" />
                      <span>Academic Class</span>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                      {student.cl}
                    </span>
                  </div>
                )}

                {student.tn && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>Town / Location</span>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block font-arabic" dir="auto">
                      {student.tn}
                    </span>
                  </div>
                )}

                {student.adm && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      <span>Admission Date</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                      {student.adm}
                    </span>
                  </div>
                )}

                {student.rx && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-amber-600" />
                      <span>Card Expiry Date</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                      {student.rx}
                    </span>
                  </div>
                )}
              </div>

              {/* Institutional Authority Stamp */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  <div className="flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cryptographic Central Authority</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                    AUTH: SUPER ADMIN
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300 leading-relaxed">
                  This identity pass is authenticated against the Al Dheeniyya Arabic College Centralized Cloud Database. It grants official access to library stacks, borrowing privileges, and student academic services.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-slate-500">
                No student record matches verification code <b>{verificationId}</b> in the college database.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition"
          >
            Close · إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

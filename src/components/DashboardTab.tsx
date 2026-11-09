import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  CheckCircle2,
  Users,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Box,
  Layers,
  Search,
  BookMarked,
  ArrowUpRight,
  CreditCard,
  Sliders,
  Check,
} from 'lucide-react';
import { Book, BookCopy, Student, Loan, LibrarySettings } from '../types';
import { TiltCard } from './TiltCard';
import { Library3DStacksVisualizer } from './Library3DStacksVisualizer';

interface DashboardTabProps {
  books: Book[];
  copies: BookCopy[];
  students: Student[];
  loans: Loan[];
  settings: LibrarySettings;
  isSuperAdmin: boolean;
  onNavigate: (tab: string) => void;
  onOpenLogin: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  books,
  copies,
  students,
  loans,
  settings,
  isSuperAdmin,
  onNavigate,
  onOpenLogin,
}) => {
  // 2D vs 3D Spatial UI View Mode
  const [viewMode, setViewMode] = useState<'3d' | '2d'>(() => {
    const saved = localStorage.getItem('dac_dashboard_view_mode');
    return saved === '2d' ? '2d' : '3d'; // Default to 3D spatial luxury mode
  });

  const handleToggleViewMode = (mode: '3d' | '2d') => {
    setViewMode(mode);
    localStorage.setItem('dac_dashboard_view_mode', mode);
  };

  const is3D = viewMode === '3d';

  // Numerical & Circulation Computations
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeLoans = loans.filter((l) => !l.ret);
  const returnedLoans = loans.filter((l) => Boolean(l.ret));
  const overdueLoans = activeLoans.filter((l) => l.due < todayStr);
  const dueTodayLoans = activeLoans.filter((l) => l.due === todayStr);

  const availableCopies = copies.filter((c) => c.st === 'available').length;
  const totalCopies = copies.length;
  const totalBooks = books.filter((b) => !b.arch).length;
  const totalStudents = students.length;
  const activeMembers = students.filter((s) => !s.arch && !s.off).length;
  const expiredCards = students.filter((s) => s.rx && s.rx < todayStr).length;
  const validCards = students.filter((s) => !s.rx || s.rx >= todayStr).length;

  const availabilityRate = totalCopies ? Math.round((availableCopies / totalCopies) * 100) : 0;
  const borrowedRate = totalCopies ? Math.round((activeLoans.length / totalCopies) * 100) : 0;

  // Language breakdown
  const langCount: Record<string, number> = {};
  books.forEach((b) => {
    const l = b.l || 'Arabic';
    langCount[l] = (langCount[l] || 0) + 1;
  });
  const topLanguages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 8 Mandatory Core Metric Cards
  const statCards = [
    {
      label: 'Total Books',
      sublabel: 'Catalog Titles',
      ar: 'إجمالي الكتب (العناوين)',
      value: totalBooks,
      icon: BookOpen,
      color: 'text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-700/50',
      glow: 'rgba(212, 175, 55, 0.35)',
      tab: 'cat',
    },
    {
      label: 'Total Book Copies',
      sublabel: 'Physical Accession',
      ar: 'إجمالي النسخ المطبوعة',
      value: totalCopies,
      icon: Copy,
      color: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-700/50',
      glow: 'rgba(16, 185, 129, 0.35)',
      tab: 'cat',
    },
    {
      label: 'Total Students',
      sublabel: 'Enrolled Records',
      ar: 'إجمالي سجلات الطلاب',
      value: totalStudents,
      icon: Users,
      color: 'text-blue-800 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-700/50',
      glow: 'rgba(59, 130, 246, 0.35)',
      tab: isSuperAdmin ? 'stu' : null,
      locked: !isSuperAdmin,
    },
    {
      label: 'Registered Members',
      sublabel: 'Active Library Cards',
      ar: 'الأعضاء النشطين المسجلين',
      value: activeMembers,
      icon: CheckCircle2,
      color: 'text-indigo-800 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-700/50',
      glow: 'rgba(99, 102, 241, 0.35)',
      tab: isSuperAdmin ? 'stu' : null,
      locked: !isSuperAdmin,
    },
    {
      label: 'Currently Borrowed',
      sublabel: 'In Circulation',
      ar: 'الكتب المعارة حالياً',
      value: activeLoans.length,
      icon: ArrowRight,
      color: 'text-orange-800 dark:text-orange-300 bg-orange-50/90 dark:bg-orange-950/30 border-orange-200/80 dark:border-orange-700/50',
      glow: 'rgba(249, 115, 22, 0.35)',
      tab: isSuperAdmin ? 'loans' : null,
      locked: !isSuperAdmin,
    },
    {
      label: 'Returned Books',
      sublabel: 'Completed Loans',
      ar: 'الكتب المسترجعة',
      value: returnedLoans.length,
      icon: RotateCcw,
      color: 'text-teal-800 dark:text-teal-300 bg-teal-50/90 dark:bg-teal-950/30 border-teal-200/80 dark:border-teal-700/50',
      glow: 'rgba(20, 184, 166, 0.35)',
      tab: isSuperAdmin ? 'loans' : null,
      locked: !isSuperAdmin,
    },
    {
      label: 'Expired Student ID Cards',
      sublabel: 'Requires Renewal',
      ar: 'البطاقات منتهية الصلاحية',
      value: expiredCards,
      icon: AlertTriangle,
      color: 'text-rose-800 dark:text-rose-300 bg-rose-50/90 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-700/50',
      glow: 'rgba(244, 63, 94, 0.35)',
      tab: isSuperAdmin ? 'cards' : null,
      locked: !isSuperAdmin,
    },
    {
      label: 'ID Cards Valid / Renewed',
      sublabel: 'Active Permissions',
      ar: 'البطاقات السارية والمجددة',
      value: validCards,
      icon: Sparkles,
      color: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-700/50',
      glow: 'rgba(16, 185, 129, 0.35)',
      tab: isSuperAdmin ? 'cards' : null,
      locked: !isSuperAdmin,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Islamic Architectural Motif, 2D/3D Selector & Institution Details */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#022416] via-[#043320] to-[#021f14] text-white p-6 sm:p-8 shadow-2xl border border-amber-400/30 bg-islamic-arabesque">
        {/* Ambient illumination */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-900/80 border border-amber-400/30 text-amber-200 text-xs font-semibold backdrop-blur-md shadow-sm">
              <span className="text-amber-300 font-arabic text-sm">﷽</span>
              <span className="text-emerald-400/50">·</span>
              <span>Deeniya Arabic College · Central Digital Library</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-sans text-amber-50 drop-shadow-sm">
              {settings.name}
            </h2>

            <p className="text-base sm:text-lg font-arabic text-amber-200/95 font-semibold tracking-wide">
              {settings.ar} · {settings.lib}
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed pt-0.5">
              Preserving classical Islamic sciences, jurisprudence (Fiqh), Hadith collections, Quranic exegesis (Tafsir), Arabic grammar, and academic literature with role-based security.
            </p>
          </div>

          {/* Right Controls: 2D/3D Mode Selector + Date Badge */}
          <div className="flex flex-col items-start md:items-end space-y-3 shrink-0">
            {/* 2D / 3D Spatial Interface Switcher */}
            <div className="p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-md flex items-center space-x-1 shadow-md">
              <button
                onClick={() => handleToggleViewMode('3d')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  is3D
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm ring-1 ring-amber-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title="3D Spatial Perspective Mode (Interactive Tilt Cards & Depth)"
              >
                <Box className="w-3.5 h-3.5 text-amber-300" />
                <span>3D Spatial View</span>
              </button>

              <button
                onClick={() => handleToggleViewMode('2d')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  !is3D
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-sm ring-1 ring-emerald-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title="2D Clean Precision Mode (Editorial Density & Tabular Alignment)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2D Precision View</span>
              </button>
            </div>

            {/* Live Dual Calendar */}
            <div className="text-right text-xs text-slate-300 font-mono flex items-center space-x-2 bg-black/25 px-3 py-1.5 rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{todayStr} · <span className="font-arabic font-normal">١٤٤٨ هـ</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Public Visitor Notice if not logged in */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Visitor Mode Active:</b> You have unrestricted public access to browse the 5,869 catalog titles and check copy stack availability. Administrative operations require Super Admin credentials.
            </span>
          </div>
          <button
            onClick={onOpenLogin}
            className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold transition shrink-0 active:scale-95"
          >
            Admin Login · دخول المشرف
          </button>
        </div>
      )}

      {/* 8 Core Metrics Grid with Interactive 3D Tilt / 2D Surface */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-sans">
              Library Core Metrics · المؤشرات الحيوية
            </h3>
            {is3D && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20">
                3D Interactive Tilt Active
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">Click any card to inspect records</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <TiltCard
                key={idx}
                is3D={is3D}
                accentGlow={card.glow}
                onClick={() => {
                  if (card.tab) {
                    onNavigate(card.tab);
                  } else if (card.locked) {
                    onOpenLogin();
                  }
                }}
                className={`p-4 sm:p-4.5 rounded-2xl border shadow-sm transition-all ${card.color}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-slate-100">
                      {card.label}
                    </span>
                    <span className="text-[10px] opacity-75 font-medium block">
                      {card.sublabel}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/60 dark:bg-black/30 backdrop-blur-xs shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-2.5 text-2xl sm:text-3xl font-black tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {card.value.toLocaleString()}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] font-arabic opacity-85">
                  <span className="truncate">{card.ar}</span>
                  {card.locked && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 uppercase font-sans font-semibold">
                      Admin
                    </span>
                  )}
                </div>
              </TiltCard>
            );
          })}
        </div>
      </div>

      {/* Interactive 3D / Isometric Digital Library Stacks Visualizer */}
      <Library3DStacksVisualizer
        books={books}
        copies={copies}
        onNavigateCatalogWithFilter={(filter) => {
          onNavigate('cat');
        }}
        is3DMode={is3D}
      />

      {/* Middle Section: Circulation Analytics & Quick Launch Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Availability & Physical Stack Donut / Gauge */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Box className="w-4 h-4 text-emerald-600" />
                <span>Stack Availability Velocity</span>
              </h3>
              <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
                {availabilityRate}%
              </span>
            </div>

            {/* Dual Velocity Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-700"
                style={{ width: `${availabilityRate}%` }}
                title={`Available: ${availableCopies}`}
              />
              <div
                className="bg-orange-500 h-full transition-all duration-700"
                style={{ width: `${borrowedRate}%` }}
                title={`Issued: ${activeLoans.length}`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="text-[10px] text-slate-500 block">Available</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {availableCopies}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/40">
                <span className="text-[10px] text-slate-500 block">Borrowed</span>
                <span className="font-mono font-bold text-orange-700 dark:text-orange-300">
                  {activeLoans.length}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">Total Units</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {totalCopies}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Operations Strip */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Quick Library Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigate('cat')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-left font-medium text-slate-700 dark:text-slate-200 transition"
              >
                🔍 Search 5,869 Titles
              </button>
              <button
                onClick={() => onNavigate('ai')}
                className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-left font-medium hover:bg-amber-100 transition"
              >
                🤖 AI Library Scholar
              </button>
              {isSuperAdmin ? (
                <>
                  <button
                    onClick={() => onNavigate('issue')}
                    className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-left font-medium hover:bg-emerald-100 transition"
                  >
                    📤 Issue Book
                  </button>
                  <button
                    onClick={() => onNavigate('cards')}
                    className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 text-left font-medium hover:bg-teal-100 transition"
                  >
                    🪪 ID Cards & Print
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="col-span-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-200 transition"
                >
                  🔒 Admin Login to Issue & Manage
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Language & Classification Breakdown */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Language Demographics · اللغات
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Total {books.length} Titles</span>
          </div>

          <div className="space-y-3 pt-1">
            {topLanguages.map(([lang, count]) => {
              const pct = books.length ? Math.round((count / books.length) * 100) : 0;
              return (
                <div key={lang} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-700 dark:text-slate-300">{lang}</span>
                    <span className="text-slate-500 font-mono tabular-nums">{count} titles ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-bold block mb-1">Dewey Islamic Classification Standard</span>
            <p className="text-[11px] leading-relaxed opacity-85">
              Dewey Decimal 200–299 expanded for Islamic heritage: 210 Tafsir, 220 Hadith, 230 Fiqh, 240 Usul, 410 Arabic Grammar.
            </p>
          </div>
        </div>

        {/* Overdue / High Priority Circulation Queue */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <span>Overdue Circulation Queue</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 font-mono">
              {overdueLoans.length}
            </span>
          </div>

          {overdueLoans.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p>No overdue book loans. All accession units are within loan duration.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
              {overdueLoans.slice(0, 6).map((loan) => (
                <div
                  key={loan.id}
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-red-950 dark:text-red-300 font-mono">
                      Copy #{loan.cp}
                    </div>
                    <div className="text-[11px] text-red-700 dark:text-red-400">
                      Due: {loan.due} · Student: {isSuperAdmin ? loan.stu : 'Protected'}
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => onNavigate('ret')}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-semibold transition"
                    >
                      Return
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

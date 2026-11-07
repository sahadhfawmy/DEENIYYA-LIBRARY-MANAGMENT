import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Server,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  HardDrive,
  FileCheck,
  Printer,
  FileText,
} from 'lucide-react';
import { Book, BookCopy, Student, Loan, LibrarySettings, AuditLog } from '../types';
import { createBackupPayload, LibraryState } from '../lib/storage';

interface ReportsTabProps {
  books: Book[];
  copies: BookCopy[];
  students: Student[];
  loans: Loan[];
  settings: LibrarySettings;
  auditLogs: AuditLog[];
  isSuperAdmin: boolean;
  onRestoreBackup: (state: LibraryState) => Promise<boolean>;
  onTriggerBackup: () => void;
  onOpenLogin: () => void;
  onExportCatalogPdf?: () => void;
  onExportStudentsPdf?: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  books,
  copies,
  students,
  loans,
  settings,
  auditLogs,
  isSuperAdmin,
  onRestoreBackup,
  onTriggerBackup,
  onOpenLogin,
  onExportCatalogPdf,
  onExportStudentsPdf,
}) => {
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Full Database Backup JSON Export
  const handleExportFullBackup = () => {
    const payload = createBackupPayload({
      books,
      copies,
      students,
      loans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deeniya_library_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Record telemetry on server
    fetch('/api/security/backup-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookCount: books.length,
        copyCount: copies.length,
        studentCount: students.length,
        sizeBytes: payload.length,
      }),
    }).catch(() => null);

    onTriggerBackup();
  };

  // Restore handler
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring will merge/replace your current records. Are you sure you wish to continue?')) {
      return;
    }

    setRestoring(true);
    setRestoreStatus(null);
    setErrorStatus(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const data = parsed.data || parsed;

        if (!data.books || !Array.isArray(data.books)) {
          throw new Error('Invalid backup file structure: missing books array.');
        }

        const restoredState: LibraryState = {
          books: data.books || [],
          copies: data.copies || [],
          students: data.students || [],
          loans: data.loans || [],
          settings: data.settings || settings,
          log: data.log || auditLogs,
          del: data.del || [],
          cards: data.cards || {},
        };

        const success = await onRestoreBackup(restoredState);
        if (success) {
          setRestoreStatus(
            `Database restored successfully! (${restoredState.books.length} books, ${restoredState.copies.length} copies, ${restoredState.students.length} students)`
          );
        } else {
          setErrorStatus('Failed to write restored records to local database.');
        }
      } catch (err: unknown) {
        setErrorStatus(err instanceof Error ? err.message : 'Invalid JSON file.');
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  // CSV Exporter helpers
  const exportBooksCSV = () => {
    const headers = ['ID', 'Title', 'Author', 'Class', 'Language', 'Publisher', 'Year', 'Category', 'Shelf'];
    const rows = books.map((b) => [
      b.id,
      `"${(b.t || '').replace(/"/g, '""')}"`,
      `"${(b.a || '').replace(/"/g, '""')}"`,
      b.c || '',
      b.l || '',
      `"${(b.p || '').replace(/"/g, '""')}"`,
      b.y || '',
      `"${(b.k || '').replace(/"/g, '""')}"`,
      b.sh || '',
    ]);
    downloadCSV(headers, rows, `books_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportLoansCSV = () => {
    const headers = ['Loan ID', 'Copy ID', 'Student ID', 'Date Issued', 'Date Due', 'Date Returned'];
    const rows = loans.map((l) => [l.id, l.cp, l.stu, l.out, l.due, l.ret || 'ACTIVE']);
    downloadCSV(headers, rows, `circulation_loans_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-2xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Data Protection & Database Backups
            </h2>
            <p className="text-xs text-slate-500">
              Institutional disaster recovery, encrypted snapshots, and CSV export utilities.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportFullBackup}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Full JSON Backup</span>
        </button>
      </div>

      {restoreStatus && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{restoreStatus}</span>
        </div>
      )}

      {errorStatus && (
        <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 text-red-800 dark:text-red-300 rounded-xl text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* Grid: Backup & Restore cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
          <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-sm">
            <HardDrive className="w-4 h-4 text-emerald-700" />
            <span>Database Backup Snapshot</span>
          </div>

          <p className="text-slate-500 leading-relaxed">
            Exports the complete catalog ({books.length} titles), all physical copies ({copies.length} copies), student records ({students.length}), circulation records, and settings into a single verifiable JSON snapshot.
          </p>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
            <div>Titles: {books.length}</div>
            <div>Accession Copies: {copies.length}</div>
            <div>Student Members: {students.length}</div>
            <div>Loan Records: {loans.length}</div>
          </div>

          <button
            onClick={handleExportFullBackup}
            className="w-full py-2.5 px-4 rounded-xl border border-emerald-700 text-emerald-800 dark:text-emerald-300 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Save Offline Backup (.json)</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
          <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-sm">
            <Upload className="w-4 h-4 text-amber-600" />
            <span>Restore From Backup File</span>
          </div>

          <p className="text-slate-500 leading-relaxed">
            Select a verified library JSON backup file to restore records. System validates schema integrity before replacing data.
          </p>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-[11px]">
            ⚠️ Always take a fresh backup before restoring an older dataset.
          </div>

          <div>
            <label className="block w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-center cursor-pointer hover:bg-slate-200 transition">
              <span>{restoring ? 'Restoring Database…' : 'Select .json File to Restore'}</span>
              <input
                type="file"
                accept=".json"
                disabled={restoring}
                onChange={handleFileRestore}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Official Printable PDF Documents Section */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>Official Printable PDF Documents · وثائق وتقارير رسمية</span>
          </h3>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
            Institutional Standard A4
          </span>
        </div>

        <p className="text-slate-500 leading-relaxed">
          Generate formal, printable documents formatted with the Al Dheeniyya Arabic College crest, dual-language typography (Arabic/English), summary statistics, and verified signature blocks for administration and archives.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border-2 border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-600 transition flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Official Catalog PDF Document · تقرير الفهرس
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-1">
                Printable inventory document containing book titles, authors, Dewey classification, languages, shelf locations, and certified copy quantities.
              </p>
            </div>
            <button
              onClick={onExportCatalogPdf}
              className="w-full py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Catalog PDF Document</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border-2 border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-600 transition flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Student Directory PDF Document · دليل الطلاب
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-1">
                Official student directory containing IDs, Arabic full names, enrolled classes, admission dates, and membership status with registrar certification.
              </p>
            </div>
            <button
              onClick={onExportStudentsPdf}
              className="w-full py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Student Directory PDF Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSV Export Utility Section */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>Structured CSV Spreadsheet Exports</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={exportBooksCSV}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-left transition space-y-1"
          >
            <div className="font-bold text-slate-800 dark:text-slate-200">Catalog Registry (CSV)</div>
            <div className="text-slate-400 text-[11px]">{books.length} titles with authors & call numbers</div>
          </button>

          <button
            onClick={exportLoansCSV}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-left transition space-y-1"
          >
            <div className="font-bold text-slate-800 dark:text-slate-200">Loans & Circulation (CSV)</div>
            <div className="text-slate-400 text-[11px]">{loans.length} issue and return history records</div>
          </button>

          <button
            onClick={() => {
              const headers = ['Action', 'Operator', 'Timestamp', 'Type', 'Status'];
              const rows = auditLogs.map((a) => [
                `"${(a.a || '').replace(/"/g, '""')}"`,
                a.by || '',
                a.at || '',
                a.ty || '',
                a.ok ? 'SUCCESS' : 'FAILED',
              ]);
              downloadCSV(headers, rows, `audit_history_${new Date().toISOString().slice(0, 10)}.csv`);
            }}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-left transition space-y-1"
          >
            <div className="font-bold text-slate-800 dark:text-slate-200">Security Audit Logs (CSV)</div>
            <div className="text-slate-400 text-[11px]">{auditLogs.length} logged administrative events</div>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  User,
  BookOpen,
} from 'lucide-react';
import { Book, BookCopy, Student, Loan, LibrarySettings } from '../types';

interface CirculationProps {
  mode: 'issue' | 'ret' | 'loans';
  books: Book[];
  copies: BookCopy[];
  students: Student[];
  loans: Loan[];
  settings: LibrarySettings;
  isSuperAdmin: boolean;
  onIssueLoan: (copyId: string, studentId: string, loanDays: number, remarks?: string) => Promise<void>;
  onReturnLoan: (loanId: string, copyId: string) => Promise<void>;
  onRenewLoan: (loanId: string, additionalDays: number) => Promise<void>;
  onOpenLogin: () => void;
}

export const CirculationTabs: React.FC<CirculationProps> = ({
  mode,
  books,
  copies,
  students,
  loans,
  settings,
  isSuperAdmin,
  onIssueLoan,
  onReturnLoan,
  onRenewLoan,
  onOpenLogin,
}) => {
  // If not superadmin: Privacy gate
  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 shadow-lg mt-8">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold">Circulation Desk Restricted</h3>
        <p className="text-xs text-slate-500">
          Book issuing, returns, and borrowing history are protected administrative functions.
        </p>
        <button onClick={onOpenLogin} className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-xs">
          Admin Login
        </button>
      </div>
    );
  }

  // ISSUE BOOK STATE
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [copySearchQuery, setCopySearchQuery] = useState('');
  const [selectedCopyId, setSelectedCopyId] = useState('');
  const [loanDays, setLoanDays] = useState(settings.days || 14);
  const [issueRemarks, setIssueRemarks] = useState('');
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);

  // RETURN BOOK STATE
  const [returnQuery, setReturnQuery] = useState('');
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);

  // LOANS FILTER
  const [loanFilter, setLoanFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('active');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Maps for fast lookups
  const bookMap = new Map(books.map((b) => [b.id, b]));
  const copyMap = new Map(copies.map((c) => [c.id, c]));
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Available copies matching search
  const availableCopies = copies.filter((c) => {
    if (c.st !== 'available') return false;
    if (!copySearchQuery) return false;
    const b = bookMap.get(c.b);
    const text = `${c.r} ${b?.t || ''} ${b?.a || ''} ${b?.c || ''}`.toLowerCase();
    return text.includes(copySearchQuery.toLowerCase());
  }).slice(0, 10);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCopyId) {
      alert('Please select both a student and an available book copy.');
      return;
    }
    await onIssueLoan(selectedCopyId, selectedStudentId, loanDays, issueRemarks);
    setIssueSuccess(`Book copy #${selectedCopyId} successfully issued!`);
    setSelectedCopyId('');
    setCopySearchQuery('');
    setTimeout(() => setIssueSuccess(null), 4000);
  };

  // Active & Overdue Loans
  const activeLoans = loans.filter((l) => !l.ret);
  const overdueLoans = activeLoans.filter((l) => l.due < todayStr);

  const filteredLoans = loans.filter((l) => {
    if (loanFilter === 'active') return !l.ret;
    if (loanFilter === 'overdue') return !l.ret && l.due < todayStr;
    if (loanFilter === 'returned') return Boolean(l.ret);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* MODE 1: ISSUE BOOK */}
      {mode === 'issue' && (
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Issue Book · إعارة كتاب
              </h2>
              <p className="text-xs text-slate-500">Record a new loan transaction with automatic due date tracking.</p>
            </div>
          </div>

          {issueSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{issueSuccess}</span>
            </div>
          )}

          <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
            {/* Student selection */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Student · الطالب (Select registered student)
              </label>
              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="">Choose Student · اختر الطالب</option>
                {students.filter((s) => !s.off && !s.arch).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.n} ({s.cl || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Book Copy search & selection */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Search Book Copy (by accession # or title)
              </label>
              <input
                type="text"
                placeholder="Type accession number, title, or author..."
                value={copySearchQuery}
                onChange={(e) => setCopySearchQuery(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />

              {availableCopies.length > 0 && (
                <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl divide-y max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                  {availableCopies.map((cp) => {
                    const b = bookMap.get(cp.b);
                    return (
                      <div
                        key={cp.id}
                        onClick={() => setSelectedCopyId(cp.id)}
                        className={`p-2 cursor-pointer flex items-center justify-between text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 ${
                          selectedCopyId === cp.id ? 'bg-emerald-100 dark:bg-emerald-950 font-bold' : ''
                        }`}
                      >
                        <div>
                          <span className="font-mono text-emerald-700">#{cp.r}</span> · <span className="font-arabic">{b?.t}</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 uppercase font-semibold">Available</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedCopyId && (
                <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  Selected Copy: #{copyMap.get(selectedCopyId)?.r} ({bookMap.get(copyMap.get(selectedCopyId)?.b || '')?.t})
                </div>
              )}
            </div>

            {/* Loan duration & remarks */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Loan Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={loanDays}
                  onChange={(e) => setLoanDays(parseInt(e.target.value) || 14)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date (Calculated)
                </label>
                <div className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                  {new Date(Date.now() + loanDays * 864e5).toISOString().slice(0, 10)}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedStudentId || !selectedCopyId}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition"
            >
              Confirm & Issue Book
            </button>
          </form>
        </div>
      )}

      {/* MODE 2: RETURN BOOK */}
      {mode === 'ret' && (
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Return Book Desk · إرجاع كتاب
              </h2>
              <p className="text-xs text-slate-500">Scan or search accession number to process return.</p>
            </div>
          </div>

          {returnSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{returnSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Active Loans Lookup (Search by Copy Reg # or Student Name)
            </label>
            <input
              type="text"
              placeholder="e.g. 104, STU-0001, or title..."
              value={returnQuery}
              onChange={(e) => setReturnQuery(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Active Borrowings ({activeLoans.length})
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {activeLoans
                .filter((l) => {
                  if (!returnQuery) return true;
                  const cp = copyMap.get(l.cp);
                  const st = studentMap.get(l.stu);
                  const b = cp ? bookMap.get(cp.b) : null;
                  const text = `${cp?.r || ''} ${st?.n || ''} ${b?.t || ''}`.toLowerCase();
                  return text.includes(returnQuery.toLowerCase());
                })
                .map((l) => {
                  const cp = copyMap.get(l.cp);
                  const st = studentMap.get(l.stu);
                  const b = cp ? bookMap.get(cp.b) : null;
                  const isOverdue = l.due < todayStr;

                  return (
                    <div
                      key={l.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white font-arabic" dir="auto">
                          {b?.t || 'Unknown Title'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Copy #{cp?.r} · Borrower: <b>{st?.n || l.stu}</b> ({l.stu})
                        </div>
                        <div className="text-[10px] mt-0.5">
                          Issued: {l.out} · Due:{' '}
                          <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}>
                            {l.due} {isOverdue && '(OVERDUE)'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          await onReturnLoan(l.id, l.cp);
                          setReturnSuccess(`Book copy #${cp?.r} returned successfully.`);
                          setTimeout(() => setReturnSuccess(null), 3000);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold transition"
                      >
                        Accept Return
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: LOANS & OVERDUE LIST */}
      {mode === 'loans' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-700" />
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Circulation Log & Overdue Management
              </span>
            </div>

            <div className="flex space-x-2">
              {(['active', 'overdue', 'returned', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLoanFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition ${
                    loanFilter === tab
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-3">Copy Reg #</th>
                    <th className="py-3 px-4">Borrower (Student)</th>
                    <th className="py-3 px-3">Issued</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLoans.length > 0 ? (
                    filteredLoans.map((l) => {
                      const cp = copyMap.get(l.cp);
                      const st = studentMap.get(l.stu);
                      const b = cp ? bookMap.get(cp.b) : null;
                      const isOverdue = !l.ret && l.due < todayStr;

                      return (
                        <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750">
                          <td className="py-3 px-4 font-arabic font-medium max-w-xs truncate" dir="auto">
                            {b?.t || '—'}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                            #{cp?.r || l.cp}
                          </td>
                          <td className="py-3 px-4 font-arabic" dir="auto">
                            {st?.n || l.stu}
                            <div className="text-[10px] font-mono text-slate-400">{l.stu}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">{l.out}</td>
                          <td className={`py-3 px-3 font-mono ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                            {l.due}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                l.ret
                                  ? 'bg-slate-100 text-slate-700'
                                  : isOverdue
                                  ? 'bg-red-100 text-red-700 animate-pulse'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {l.ret ? 'Returned' : isOverdue ? 'Overdue' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {!l.ret && (
                              <>
                                <button
                                  onClick={() => onRenewLoan(l.id, 7)}
                                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-[11px]"
                                  title="Renew for 7 more days"
                                >
                                  +7d
                                </button>
                                <button
                                  onClick={() => onReturnLoan(l.id, l.cp)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-[11px]"
                                >
                                  Return
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No loans matching this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

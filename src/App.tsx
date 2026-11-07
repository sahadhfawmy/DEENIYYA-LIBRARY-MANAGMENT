import React, { useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  Book,
  BookCopy,
  Student,
  Loan,
  LibrarySettings,
  AuditLog,
  AuthSession,
} from './types';
import {
  initializeLibraryData,
  persistLibraryState,
  LibraryState,
  DEFAULT_SETTINGS,
} from './lib/storage';
import {
  auth,
  onAuthStateChanged,
  signOut,
  testConnection,
} from './lib/firebase';
import { SUPER_ADMIN_EMAIL, sendSecurityTelemetry } from './lib/security';

import { Sparkles } from 'lucide-react';

// Components
import { Navbar } from './components/Navbar';
import { AdminLoginModal } from './components/AdminLoginModal';
import { DashboardTab } from './components/DashboardTab';
import { CatalogueTab } from './components/CatalogueTab';
import { AddBookTab } from './components/AddBookTab';
import { StudentsTab } from './components/StudentsTab';
import { StudentIdCardTab } from './components/StudentIdCardTab';
import { CirculationTabs } from './components/CirculationTabs';
import { ReportsTab } from './components/ReportsTab';
import { ActivityTab } from './components/ActivityTab';
import { SecurityDashboardTab } from './components/SecurityDashboardTab';
import { SettingsTab } from './components/SettingsTab';
import { ConfirmationModal } from './components/ConfirmationModal';
import { PrintablePdfModal, ReportType } from './components/PrintablePdfModal';
import { BookEditModal } from './components/BookEditModal';
import { GeminiChatbot } from './components/GeminiChatbot';
import { ScreenLockModal } from './components/ScreenLockModal';
import {
  LuxuryThemeId,
  getActiveThemeId,
  setActiveThemeId,
  getThemeMode,
  setThemeMode,
  applyThemeToDOM,
} from './lib/theme';

export default function App() {
  // Application Data State
  const [dataLoaded, setDataLoaded] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [settings, setSettings] = useState<LibrarySettings>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Navigation & UI State
  const [currentTab, setCurrentTab] = useState<string>('dash');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [activeThemeId, setActiveThemeIdState] = useState<LuxuryThemeId>(() => getActiveThemeId());
  const [themeMode, setThemeModeState] = useState<'dark' | 'light'>(() => getThemeMode());
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(() => {
    return localStorage.getItem('dac_screen_locked') === 'true';
  });

  // Auth Session State
  const [session, setSession] = useState<AuthSession>(() => {
    try {
      const saved = localStorage.getItem('dac_admin_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse error
    }
    return { role: 'PUBLIC', email: null };
  });

  // Reusable Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  // Printable PDF Modal State
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    reportType: ReportType;
    books?: Book[];
    students?: Student[];
    filterLabel?: string;
  }>({
    isOpen: false,
    reportType: 'catalog',
    books: [],
    students: [],
    filterLabel: 'All Records',
  });

  // 1. Initial Data Loading (5,869 books + 10,492 copies)
  useEffect(() => {
    async function loadData() {
      const state = await initializeLibraryData();
      setBooks(state.books);
      setCopies(state.copies);
      setStudents(state.students);
      setLoans(state.loans);
      setSettings(state.settings);
      setAuditLogs(state.log);
      setDataLoaded(true);
      testConnection().catch(() => null);
    }
    loadData();
  }, []);

  // 2. Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const email = firebaseUser.email.toLowerCase().trim();
        if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
          const newSession: AuthSession = {
            role: 'SUPER_ADMIN',
            email: SUPER_ADMIN_EMAIL,
            name: firebaseUser.displayName || 'Super Admin',
            uid: firebaseUser.uid,
            loginAt: new Date().toISOString(),
            expiresAt: Date.now() + 8 * 60 * 60 * 1000,
          };
          setSession(newSession);
          localStorage.setItem('dac_admin_session', JSON.stringify(newSession));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Luxury Theme & Dark Mode Synchronizer
  useEffect(() => {
    applyThemeToDOM(activeThemeId, themeMode);
  }, [activeThemeId, themeMode]);

  // 4. Inactivity Screen Auto-Lock Watcher
  useEffect(() => {
    if (session.role !== 'SUPER_ADMIN' || isScreenLocked) return;

    let timer: ReturnType<typeof setTimeout>;

    const resetInactivityTimer = () => {
      const mins = parseInt(localStorage.getItem('dac_auto_lock_minutes') || '15', 10);
      if (mins <= 0) return;

      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsScreenLocked(true);
        localStorage.setItem('dac_screen_locked', 'true');
      }, mins * 60 * 1000);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [session.role, isScreenLocked]);

  // Audit Log helper
  const addAuditLog = useCallback(
    async (action: string, type: string = 'general', relatedId?: string) => {
      const entry: AuditLog = {
        id: 'log-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        a: action,
        by: session.role === 'SUPER_ADMIN' ? session.email || settings.staff : 'Public Visitor',
        at: new Date().toISOString(),
        ty: type,
        rid: relatedId,
        ok: 1,
      };

      setAuditLogs((prev) => {
        const next = [entry, ...prev];
        persistLibraryState(['log'], {
          books,
          copies,
          students,
          loans,
          settings,
          log: next,
          del: [],
          cards: {},
        }).catch(() => null);
        return next;
      });

      sendSecurityTelemetry(action, session.role, 'low', { relatedId }).catch(() => null);
    },
    [session, settings, books, copies, students, loans]
  );

  // Authentication Handlers
  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    localStorage.setItem('dac_admin_session', JSON.stringify(newSession));
    addAuditLog(`Super Admin Login (${newSession.email})`, 'auth');
  };

  const handleLogout = async () => {
    await signOut(auth).catch(() => null);
    setSession({ role: 'PUBLIC', email: null });
    localStorage.removeItem('dac_admin_session');
    addAuditLog('Super Admin session closed', 'auth');
    setCurrentTab('dash');
  };

  // 4. CRUD Mutations with Security Checks & Data Preservation
  const handleSaveBook = async (newBook: Book, newCopies: BookCopy[]) => {
    if (settings.securityLockdown) {
      alert('System is under emergency lockdown. Record modifications are restricted.');
      return;
    }

    const nextBooks = [newBook, ...books];
    const nextCopies = [...copies, ...newCopies];

    setBooks(nextBooks);
    setCopies(nextCopies);

    await persistLibraryState(['books', 'copies'], {
      books: nextBooks,
      copies: nextCopies,
      students,
      loans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });

    addAuditLog(`Added book "${newBook.t}" (${newCopies.length} copies)`, 'book', newBook.id);
  };

  const handleUpdateBook = async (updatedBook: Book, updatedCopies: BookCopy[]) => {
    if (settings.securityLockdown) {
      alert('System is under emergency lockdown. Record modifications are restricted.');
      return;
    }

    const nextBooks = books.map((b) => (b.id === updatedBook.id ? updatedBook : b));
    const remainingCopies = copies.filter((c) => c.b !== updatedBook.id);
    const nextCopies = [...remainingCopies, ...updatedCopies];

    setBooks(nextBooks);
    setCopies(nextCopies);

    await persistLibraryState(['books', 'copies'], {
      books: nextBooks,
      copies: nextCopies,
      students,
      loans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });

    addAuditLog(`Updated book "${updatedBook.t}" (${updatedBook.id}) with ${updatedCopies.length} copies`, 'book', updatedBook.id);
  };

  const handleDeleteBook = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Book Record?',
      message: `Are you sure you want to delete "${book?.t || bookId}"? Associated copy records will be removed.`,
      action: async () => {
        const nextBooks = books.filter((b) => b.id !== bookId);
        const nextCopies = copies.filter((c) => c.b !== bookId);
        setBooks(nextBooks);
        setCopies(nextCopies);

        await persistLibraryState(['books', 'copies'], {
          books: nextBooks,
          copies: nextCopies,
          students,
          loans,
          settings,
          log: auditLogs,
          del: [],
          cards: {},
        });

        addAuditLog(`Deleted book "${book?.t}" (${bookId})`, 'book', bookId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleArchiveBook = async (bookId: string) => {
    const nextBooks = books.map((b) => (b.id === bookId ? { ...b, arch: !b.arch } : b));
    setBooks(nextBooks);
    await persistLibraryState(['books'], {
      books: nextBooks,
      copies,
      students,
      loans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });
    addAuditLog(`Toggled archive state for book ${bookId}`, 'book', bookId);
  };

  // Student CRUD
  const handleSaveStudent = async (student: Student, isNew: boolean) => {
    if (settings.securityLockdown) {
      alert('System is under emergency lockdown. Record modifications are restricted.');
      return;
    }

    let nextStudents: Student[];
    if (isNew) {
      nextStudents = [student, ...students];
    } else {
      nextStudents = students.map((s) => (s.id === student.id ? student : s));
    }

    setStudents(nextStudents);
    await persistLibraryState(['students'], {
      books,
      copies,
      students: nextStudents,
      loans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });

    addAuditLog(`${isNew ? 'Added' : 'Updated'} student record ${student.id} (${student.n})`, 'student', student.id);
  };

  const handleDeleteStudent = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Student Record?',
      message: `Permanently delete student ${student?.n} (${studentId})? This action cannot be undone.`,
      action: async () => {
        const nextStudents = students.filter((s) => s.id !== studentId);
        setStudents(nextStudents);
        await persistLibraryState(['students'], {
          books,
          copies,
          students: nextStudents,
          loans,
          settings,
          log: auditLogs,
          del: [],
          cards: {},
        });
        addAuditLog(`Deleted student ${studentId} (${student?.n})`, 'student', studentId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleArchiveStudent = async (studentId: string) => {
    const nextStudents = students.map((s) => (s.id === studentId ? { ...s, arch: !s.arch } : s));
    setStudents(nextStudents);
    await persistLibraryState(['students'], {
      books,
      copies,
      students: nextStudents,
      loans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });
    addAuditLog(`Toggled archive state for student ${studentId}`, 'student', studentId);
  };

  // Circulation Loans
  const handleIssueLoan = async (copyId: string, studentId: string, loanDays: number, remarks?: string) => {
    if (settings.securityLockdown) {
      alert('System is under emergency lockdown. Book issuance is restricted.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const dueDateStr = new Date(Date.now() + loanDays * 864e5).toISOString().slice(0, 10);
    const loanId = 'l-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const newLoan: Loan = {
      id: loanId,
      cp: copyId,
      stu: studentId,
      out: todayStr,
      due: dueDateStr,
      rm: remarks,
    };

    const nextLoans = [newLoan, ...loans];
    const nextCopies = copies.map((c) => (c.id === copyId ? { ...c, st: 'issued' as const } : c));

    setLoans(nextLoans);
    setCopies(nextCopies);

    await persistLibraryState(['loans', 'copies'], {
      books,
      copies: nextCopies,
      students,
      loans: nextLoans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });

    addAuditLog(`Issued copy #${copyId} to student ${studentId}`, 'loan', loanId);
  };

  const handleReturnLoan = async (loanId: string, copyId: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextLoans = loans.map((l) => (l.id === loanId ? { ...l, ret: todayStr } : l));
    const nextCopies = copies.map((c) => (c.id === copyId ? { ...c, st: 'available' as const } : c));

    setLoans(nextLoans);
    setCopies(nextCopies);

    await persistLibraryState(['loans', 'copies'], {
      books,
      copies: nextCopies,
      students,
      loans: nextLoans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });

    addAuditLog(`Returned copy #${copyId} (Loan ${loanId})`, 'loan', loanId);
  };

  const handleRenewLoan = async (loanId: string, additionalDays: number) => {
    const nextLoans = loans.map((l) => {
      if (l.id === loanId) {
        const currentDue = new Date(l.due);
        currentDue.setDate(currentDue.getDate() + additionalDays);
        return { ...l, due: currentDue.toISOString().slice(0, 10) };
      }
      return l;
    });

    setLoans(nextLoans);
    await persistLibraryState(['loans'], {
      books,
      copies,
      students,
      loans: nextLoans,
      settings,
      log: auditLogs,
      del: [],
      cards: {},
    });

    addAuditLog(`Renewed loan ${loanId} for ${additionalDays} days`, 'loan', loanId);
  };

  // Settings & Backups
  const handleSaveSettings = async (newSettings: Partial<LibrarySettings>) => {
    const merged: LibrarySettings = { ...settings, ...newSettings };
    setSettings(merged);
    await persistLibraryState(['settings'], {
      books,
      copies,
      students,
      loans,
      settings: merged,
      log: auditLogs,
      del: [],
      cards: {},
    });
    addAuditLog('Updated library settings & security preferences', 'settings');
  };

  const handleRestoreBackup = async (restoredState: LibraryState): Promise<boolean> => {
    setBooks(restoredState.books);
    setCopies(restoredState.copies);
    setStudents(restoredState.students);
    setLoans(restoredState.loans);
    setSettings(restoredState.settings);
    setAuditLogs(restoredState.log);

    const success = await persistLibraryState(
      ['books', 'copies', 'students', 'loans', 'settings', 'log'],
      restoredState
    );

    addAuditLog(`Full database restored (${restoredState.books.length} titles)`, 'backup');
    return success;
  };

  // Key stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeLoans = loans.filter((l) => !l.ret);
  const overdueCount = activeLoans.filter((l) => l.due < todayStr).length;
  const availableCopies = copies.filter((c) => c.st === 'available').length;

  // Loading Screen
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Deeniya Arabic College Library</h2>
          <p className="text-xs text-emerald-300 font-arabic">جارٍ تهيئة الفهرس الرقمي وقواعد البيانات المقفلة...</p>
          <p className="text-[11px] text-slate-400">Loading 5,869 titles & 10,492 accession copies securely</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = session.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        session={session}
        settings={settings}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        isDark={themeMode === 'dark'}
        onToggleTheme={() => {
          const next = themeMode === 'dark' ? 'light' : 'dark';
          setThemeMode(next);
          setThemeModeState(next);
        }}
        activeThemeId={activeThemeId}
        onSelectTheme={(t) => {
          setActiveThemeId(t);
          setActiveThemeIdState(t);
        }}
        stats={{
          titles: books.length,
          copies: copies.length,
          available: availableCopies,
          issued: activeLoans.length,
          students: students.length,
          overdue: overdueCount,
        }}
        onTriggerLockScreen={() => {
          setIsScreenLocked(true);
          localStorage.setItem('dac_screen_locked', 'true');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dash' && (
          <DashboardTab
            books={books}
            copies={copies}
            students={students}
            loans={loans}
            settings={settings}
            isSuperAdmin={isSuperAdmin}
            onNavigate={setCurrentTab}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'cat' && (
          <CatalogueTab
            books={books}
            copies={copies}
            isSuperAdmin={isSuperAdmin}
            onEditBook={(book) => setEditingBook(book)}
            onDeleteBook={handleDeleteBook}
            onArchiveBook={handleArchiveBook}
            onNavigateAdd={() => setCurrentTab('add')}
            onExportPdf={(filteredList, filterDesc) => {
              setPdfModal({
                isOpen: true,
                reportType: 'catalog',
                books: filteredList,
                filterLabel: filterDesc,
              });
            }}
          />
        )}

        {currentTab === 'ai' && (
          <GeminiChatbot
            books={books}
            settings={settings}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'add' && (
          <AddBookTab
            existingBooks={books}
            copiesCount={copies.length}
            isSuperAdmin={isSuperAdmin}
            onSaveBook={handleSaveBook}
            onNavigateCatalog={() => setCurrentTab('cat')}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'stu' && (
          <StudentsTab
            students={students}
            settings={settings}
            isSuperAdmin={isSuperAdmin}
            onSaveStudent={handleSaveStudent}
            onDeleteStudent={handleDeleteStudent}
            onArchiveStudent={handleArchiveStudent}
            onNavigateCards={() => setCurrentTab('cards')}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onExportPdf={(filteredList, filterDesc) => {
              setPdfModal({
                isOpen: true,
                reportType: 'students',
                students: filteredList,
                filterLabel: filterDesc,
              });
            }}
          />
        )}

        {currentTab === 'cards' && (
          <StudentIdCardTab
            students={students}
            settings={settings}
            isSuperAdmin={isSuperAdmin}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {(currentTab === 'issue' || currentTab === 'ret' || currentTab === 'loans') && (
          <CirculationTabs
            mode={currentTab}
            books={books}
            copies={copies}
            students={students}
            loans={loans}
            settings={settings}
            isSuperAdmin={isSuperAdmin}
            onIssueLoan={handleIssueLoan}
            onReturnLoan={handleReturnLoan}
            onRenewLoan={handleRenewLoan}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'rep' && (
          <ReportsTab
            books={books}
            copies={copies}
            students={students}
            loans={loans}
            settings={settings}
            auditLogs={auditLogs}
            isSuperAdmin={isSuperAdmin}
            onRestoreBackup={handleRestoreBackup}
            onTriggerBackup={() => addAuditLog('Created full database snapshot', 'backup')}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onExportCatalogPdf={() => {
              setPdfModal({
                isOpen: true,
                reportType: 'catalog',
                books: books,
                filterLabel: 'Full College Catalog Register',
              });
            }}
            onExportStudentsPdf={() => {
              setPdfModal({
                isOpen: true,
                reportType: 'students',
                students: students.filter((s) => !s.arch),
                filterLabel: 'Active Enrolled Students',
              });
            }}
          />
        )}

        {currentTab === 'act' && (
          <ActivityTab
            logs={auditLogs}
            isSuperAdmin={isSuperAdmin}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'security' && (
          <SecurityDashboardTab
            session={session}
            settings={settings}
            auditLogs={auditLogs}
            onUpdateSettings={handleSaveSettings}
            onTriggerBackup={() => {
              setCurrentTab('rep');
            }}
          />
        )}

        {currentTab === 'set' && (
          <SettingsTab
            settings={settings}
            isSuperAdmin={isSuperAdmin}
            onSaveSettings={handleSaveSettings}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            activeThemeId={activeThemeId}
            onSelectTheme={(t) => {
              setActiveThemeId(t);
              setActiveThemeIdState(t);
            }}
            onTriggerLockScreen={() => {
              setIsScreenLocked(true);
              localStorage.setItem('dac_screen_locked', 'true');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <b>{settings.name}</b> · {settings.ar}
          </div>
          <div className="text-[11px] text-slate-400">
            Enterprise Security System · Super Admin: <span className="font-mono">{SUPER_ADMIN_EMAIL}</span>
          </div>
        </div>
      </footer>

      {/* Screen Lock Privacy Modal */}
      <ScreenLockModal
        isLocked={isScreenLocked && session.role === 'SUPER_ADMIN'}
        onUnlock={() => {
          setIsScreenLocked(false);
          localStorage.setItem('dac_screen_locked', 'false');
        }}
        onLogout={() => {
          handleLogout();
          setIsScreenLocked(false);
          localStorage.setItem('dac_screen_locked', 'false');
        }}
        collegeName={settings.name}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Printable PDF Document Modal */}
      <PrintablePdfModal
        isOpen={pdfModal.isOpen}
        onClose={() => setPdfModal((prev) => ({ ...prev, isOpen: false }))}
        reportType={pdfModal.reportType}
        books={pdfModal.books || books}
        copies={copies}
        students={pdfModal.students || students}
        settings={settings}
        filterLabel={pdfModal.filterLabel}
      />

      {/* Book Editing & Accession Management Modal */}
      <BookEditModal
        isOpen={Boolean(editingBook)}
        book={editingBook}
        copies={copies}
        onClose={() => setEditingBook(null)}
        onSave={handleUpdateBook}
      />

      {/* Floating Gemini AI Scholar Chat Widget Button & Drawer */}
      {currentTab !== 'ai' && (
        <>
          {isChatWidgetOpen ? (
            <GeminiChatbot
              books={books}
              settings={settings}
              isFloating={true}
              isOpen={isChatWidgetOpen}
              onClose={() => setIsChatWidgetOpen(false)}
              onNavigateTab={setCurrentTab}
            />
          ) : (
            <button
              onClick={() => setIsChatWidgetOpen(true)}
              className="fixed bottom-5 right-5 z-40 flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-800 via-emerald-700 to-amber-700 hover:from-emerald-700 hover:to-amber-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-amber-400/30 group"
              title="Open Gemini AI Scholar Chat · اسأل المساعد الذكي"
            >
              <div className="relative">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></span>
              </div>
              <span className="text-xs font-bold font-sans tracking-wide">
                Ask AI Scholar · المساعد الذكي
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

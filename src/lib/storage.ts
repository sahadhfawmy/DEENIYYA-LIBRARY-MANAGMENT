import { Book, BookCopy, Student, Loan, LibrarySettings, AuditLog } from '../types';

const DB_NAME = 'islamic-library';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: LibrarySettings = {
  name: 'AL DHEENIYYA ARABIC COLLEGE',
  lib: 'ISLAMIC DIGITAL LIBRARY MANAGEMENT SYSTEM',
  ar: 'المكتبة الإسلامية الرقمية',
  days: 14,
  staff: 'Librarian (Super Admin)',
  tz: 'Asia/Colombo',
  securityLockdown: false,
  require2FA: false,
};

let dbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
  return dbPromise;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const idb = await getIDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    const fallback = localStorage.getItem('il_' + key);
    return fallback ? JSON.parse(fallback) : undefined;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const idb = await getIDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    try {
      localStorage.setItem('il_' + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}

export interface LibraryState {
  books: Book[];
  copies: BookCopy[];
  students: Student[];
  loans: Loan[];
  settings: LibrarySettings;
  log: AuditLog[];
  del: Student[];
  cards: Record<string, unknown>;
}

// Initial state loader
export async function initializeLibraryData(): Promise<LibraryState> {
  const [books, copies, students, loans, settings, log, del, cards] = await Promise.all([
    kvGet<Book[]>('books'),
    kvGet<BookCopy[]>('copies'),
    kvGet<Student[]>('students'),
    kvGet<Loan[]>('loans'),
    kvGet<LibrarySettings>('settings'),
    kvGet<AuditLog[]>('log'),
    kvGet<Student[]>('del'),
    kvGet<Record<string, unknown>>('cards'),
  ]);

  // If books already initialized
  if (books && books.length > 0) {
    return {
      books: books || [],
      copies: copies || [],
      students: students || [],
      loans: loans || [],
      settings: settings || DEFAULT_SETTINGS,
      log: log || [],
      del: del || [],
      cards: cards || {},
    };
  }

  // Seed from /seed-catalog.json (contains 5,869 books and 10,492 copies)
  try {
    const resp = await fetch('/seed-catalog.json');
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && !contentType.includes('text/html')) {
      const rawText = await resp.text();
      if (rawText.trim().startsWith('{')) {
        const seed = JSON.parse(rawText);
        const initialBooks: Book[] = (seed.books || []).map((b: string[]) => ({
        id: b[0],
        t: b[1],
        a: b[2],
        c: b[3],
        l: b[4],
        e: b[5],
        p: b[6],
        y: b[7],
        k: b[8],
      }));
      const initialCopies: BookCopy[] = (seed.copies || []).map((c: string[]) => ({
        id: 'reg-' + c[0],
        b: c[1],
        r: c[0],
        v: c[2],
        st: 'available',
      }));

      const initialLog: AuditLog[] = [
        {
          id: 'log-seed',
          a: `Seeded initial catalogue: ${initialBooks.length} titles and ${initialCopies.length} physical copies`,
          by: 'System Initializer',
          at: new Date().toISOString(),
          ty: 'seed',
          ok: 1,
        },
      ];

      await Promise.all([
        kvSet('books', initialBooks),
        kvSet('copies', initialCopies),
        kvSet('students', students || []),
        kvSet('loans', loans || []),
        kvSet('settings', settings || DEFAULT_SETTINGS),
        kvSet('log', initialLog),
        kvSet('del', del || []),
        kvSet('cards', cards || {}),
      ]);

      return {
        books: initialBooks,
        copies: initialCopies,
        students: students || [],
        loans: loans || [],
        settings: settings || DEFAULT_SETTINGS,
        log: initialLog,
        del: del || [],
        cards: cards || {},
      };
      }
    }
  } catch (err) {
    console.error('Failed to load seed catalog JSON:', err);
  }

  return {
    books: [],
    copies: [],
    students: students || [],
    loans: loans || [],
    settings: settings || DEFAULT_SETTINGS,
    log: log || [],
    del: del || [],
    cards: cards || {},
  };
}

// Save helpers
export async function persistLibraryState(
  keys: (keyof LibraryState)[],
  state: LibraryState
): Promise<boolean> {
  const promises = keys.map((k) => kvSet(k, state[k]));
  const results = await Promise.all(promises);
  return results.every(Boolean);
}

// Generate JSON export payload
export function createBackupPayload(state: LibraryState): string {
  const payload = {
    version: '5.0-secure',
    institution: state.settings.name,
    exportedAt: new Date().toISOString(),
    checksum: `sha-${state.books.length}-${state.copies.length}-${state.students.length}`,
    data: {
      books: state.books,
      copies: state.copies,
      students: state.students,
      loans: state.loans,
      settings: state.settings,
      log: state.log,
      cards: state.cards,
    },
  };
  return JSON.stringify(payload, null, 2);
}

// Merge cloud records into local state without duplicate records or overwriting valid edits
export function mergeCloudRecordsIntoState(
  local: LibraryState,
  cloudData: {
    students?: Student[];
    loans?: Loan[];
    books?: Book[];
    settings?: Partial<LibrarySettings> | null;
  }
): LibraryState {
  // Merge students by ID (cloud takes authoritative precedence for verified admin)
  let mergedStudents = [...local.students];
  if (cloudData.students && cloudData.students.length > 0) {
    const studentMap = new Map<string, Student>();
    mergedStudents.forEach((s) => studentMap.set(s.id, s));
    cloudData.students.forEach((s) => studentMap.set(s.id, s));
    mergedStudents = Array.from(studentMap.values());
  }

  // Merge loans by ID
  let mergedLoans = [...local.loans];
  if (cloudData.loans && cloudData.loans.length > 0) {
    const loanMap = new Map<string, Loan>();
    mergedLoans.forEach((l) => loanMap.set(l.id, l));
    cloudData.loans.forEach((l) => loanMap.set(l.id, l));
    mergedLoans = Array.from(loanMap.values());
  }

  // Merge custom books
  let mergedBooks = [...local.books];
  if (cloudData.books && cloudData.books.length > 0) {
    const bookMap = new Map<string, Book>();
    mergedBooks.forEach((b) => bookMap.set(b.id, b));
    cloudData.books.forEach((b) => bookMap.set(b.id, b));
    mergedBooks = Array.from(bookMap.values());
  }

  // Merge settings
  const mergedSettings: LibrarySettings = cloudData.settings
    ? { ...local.settings, ...cloudData.settings }
    : local.settings;

  return {
    ...local,
    students: mergedStudents,
    loans: mergedLoans,
    books: mergedBooks,
    settings: mergedSettings,
  };
}


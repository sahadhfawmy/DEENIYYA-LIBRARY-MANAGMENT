import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  onSnapshot,
  query,
  limit,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Student, Loan, Book, BookCopy, LibrarySettings, AdminRecord } from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enforce local session persistence for seamless cross-device & refresh resilience
setPersistence(auth, browserLocalPersistence).catch(() => null);

export const SUPER_ADMIN_EMAIL = 'dheeniyyalibrarymanagement@gmail.com';
export const OWNER_EMAILS = [
  'dheeniyyalibrarymanagement@gmail.com',
  'fawmysahadh90@gmail.com',
];

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return OWNER_EMAILS.some((owner) => owner.toLowerCase() === normalized);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Security Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connectivity verification on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system_settings', 'general'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice. Utilizing resilient local storage cache.');
    }
    return false;
  }
}

// --------------------------------------------------------------------------
// 1. FREE-COMPATIBLE FIREBASE AUTHENTICATION & AUTHORIZATION HELPERS
// --------------------------------------------------------------------------

export interface AdminVerificationResult {
  isAuthorized: boolean;
  role: 'SUPER_ADMIN' | 'ADMIN';
  name?: string;
  email: string;
}

/**
 * Authoritatively verifies whether an authenticated Firebase user has admin rights.
 * Checks against Owner email first, then queries the secure Firestore /admins/{uid} doc.
 */
export async function verifyUserAdminStatus(user: User): Promise<AdminVerificationResult> {
  const userEmail = (user.email || '').trim().toLowerCase();

  // 1. Website Owner check (Super Admin with full control)
  if (isOwnerEmail(userEmail)) {
    return {
      isAuthorized: true,
      role: 'SUPER_ADMIN',
      name: user.displayName || 'Website Owner',
      email: userEmail,
    };
  }

  // 2. Query Firestore /admins/{uid} document
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    if (adminSnap.exists()) {
      const data = adminSnap.data();
      const role = data.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
      return {
        isAuthorized: true,
        role,
        name: data.name || user.displayName || 'Authorized Administrator',
        email: data.email || userEmail,
      };
    }
  } catch (err) {
    console.warn('Could not read admin authorization document:', err);
  }

  return {
    isAuthorized: false,
    role: 'ADMIN',
    email: userEmail,
  };
}

/**
 * Sign in Admin using official free Firebase Email & Password provider.
 * Supports ANY authorized administrator's individual email/password account.
 */
export async function loginAdminWithPassword(
  email: string,
  pass: string
): Promise<{ user: User; role: 'SUPER_ADMIN' | 'ADMIN'; name?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
  const status = await verifyUserAdminStatus(credential.user);

  if (!status.isAuthorized) {
    await signOut(auth);
    throw new Error(
      `Access Denied: Account (${normalizedEmail}) is not authorized as an administrator. Only the website owner can grant administrator permissions.`
    );
  }

  if (isOwnerEmail(normalizedEmail)) {
    await ensureAdminRecordInCloud(credential.user.uid, normalizedEmail).catch(() => null);
  }

  return {
    user: credential.user,
    role: status.role,
    name: status.name,
  };
}

/**
 * Send free Firebase Password Reset email to any administrator account
 */
export async function sendAdminPasswordReset(email?: string): Promise<void> {
  const targetEmail = (email || SUPER_ADMIN_EMAIL).trim().toLowerCase();
  await sendPasswordResetEmail(auth, targetEmail);
}

/**
 * Send Email Verification link to the currently logged in Admin
 */
export async function sendVerificationToAdmin(): Promise<void> {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  } else {
    throw new Error('No active user session to send verification link.');
  }
}

/**
 * Register initial Firebase Auth admin credentials (Free Email/Password provider)
 * Used if the owner admin account has not yet been registered in Firebase console
 */
export async function registerInitialAdmin(email: string, pass: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isOwnerEmail(normalizedEmail)) {
    throw new Error(`Self-registration restricted: Only designated owner accounts (${SUPER_ADMIN_EMAIL}) can establish owner credentials.`);
  }

  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
  if (credential.user) {
    await sendEmailVerification(credential.user).catch(() => null);
    await ensureAdminRecordInCloud(credential.user.uid, normalizedEmail).catch(() => null);
  }
  return credential.user;
}

/**
 * Ensure the authenticated admin's UID exists in the /admins/{uid} collection
 */
export async function ensureAdminRecordInCloud(uid: string, email?: string): Promise<void> {
  const adminEmail = (email || SUPER_ADMIN_EMAIL).toLowerCase().trim();
  try {
    await setDoc(doc(db, 'admins', uid), {
      id: uid,
      role: 'SUPER_ADMIN',
      email: adminEmail,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Admin record cloud provisioning note:', error);
  }
}

// --------------------------------------------------------------------------
// OWNER-ONLY ADMINISTRATOR MANAGEMENT (Cloud Firestore /admins)
// --------------------------------------------------------------------------

/**
 * Fetch all registered administrator accounts from Firestore.
 * Firestore Security Rules strictly restrict this to `isOwner()`.
 */
export async function fetchAuthorizedAdmins(): Promise<AdminRecord[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, path));
    const list: AdminRecord[] = [];
    snap.forEach((d) => {
      list.push(d.data() as AdminRecord);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Authorize an administrator account in Firestore.
 * Strictly enforced by Firestore rules: only the Website Owner can write to /admins/{uid}.
 */
export async function grantAdminAuthorization(admin: {
  uid: string;
  email: string;
  role?: 'ADMIN' | 'SUPER_ADMIN';
  name?: string;
}): Promise<void> {
  const path = `admins/${admin.uid}`;
  try {
    const payload: Record<string, unknown> = {
      id: admin.uid,
      email: admin.email.toLowerCase().trim(),
      role: admin.role || 'ADMIN',
      authorizedBy: auth.currentUser?.email || SUPER_ADMIN_EMAIL,
      authorizedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (admin.name) payload.name = admin.name;

    await setDoc(doc(db, 'admins', admin.uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Revoke an administrator's privileges in Firestore.
 * Strictly enforced by Firestore rules: only the Website Owner can delete from /admins/{uid}.
 */
export async function revokeAdminAuthorization(adminUid: string): Promise<void> {
  const path = `admins/${adminUid}`;
  try {
    await deleteDoc(doc(db, 'admins', adminUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --------------------------------------------------------------------------
// 2. CENTRALIZED FIRESTORE CLOUD DATABASE OPERATIONS
// --------------------------------------------------------------------------

// --- STUDENTS ---
export async function saveStudentToCloud(student: Student): Promise<void> {
  const path = `students/${student.id}`;
  try {
    // Sanitize payload to match firestore.rules isValidStudent schema strictly
    const payload: Record<string, unknown> = {
      id: student.id,
      n: student.n,
    };
    if (student.cl) payload.cl = student.cl;
    if (student.ph) payload.ph = student.ph;
    if (student.g) payload.g = student.g;
    if (student.dob) payload.dob = student.dob;
    if (student.adm) payload.adm = student.adm;
    if (student.tn) payload.tn = student.tn;
    if (student.rg) payload.rg = student.rg;
    if (student.rx) payload.rx = student.rx;
    if (student.ad) payload.ad = student.ad;
    if (student.rm) payload.rm = student.rm;
    if (student.img && student.img.length < 500000) payload.img = student.img;
    if (student.reg) payload.reg = student.reg;
    if (typeof student.arch === 'boolean') payload.arch = student.arch;
    if (typeof student.off === 'boolean') payload.off = student.off;

    await setDoc(doc(db, 'students', student.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudentFromCloud(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchStudentsFromCloud(): Promise<Student[]> {
  const path = 'students';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Student[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Student);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// --- LOANS ---
export async function saveLoanToCloud(loan: Loan): Promise<void> {
  const path = `loans/${loan.id}`;
  try {
    const payload: Record<string, unknown> = {
      id: loan.id,
      cp: loan.cp,
      stu: loan.stu,
      out: loan.out,
      due: loan.due,
    };
    if (loan.ret) payload.ret = loan.ret;
    if (loan.rm) payload.rm = loan.rm;

    await setDoc(doc(db, 'loans', loan.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchLoansFromCloud(): Promise<Loan[]> {
  const path = 'loans';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Loan[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Loan);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// --- BOOKS & COPIES ---
export async function saveBookToCloud(book: Book): Promise<void> {
  const path = `books/${book.id}`;
  try {
    const payload: Record<string, unknown> = {
      id: book.id,
      t: book.t,
      a: book.a,
    };
    if (book.c) payload.c = book.c;
    if (book.l) payload.l = book.l;
    if (book.e) payload.e = book.e;
    if (book.p) payload.p = book.p;
    if (book.y) payload.y = book.y;
    if (book.k) payload.k = book.k;
    if (book.sh) payload.sh = book.sh;
    if (typeof book.arch === 'boolean') payload.arch = book.arch;

    await setDoc(doc(db, 'books', book.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBookFromCloud(bookId: string): Promise<void> {
  const path = `books/${bookId}`;
  try {
    await deleteDoc(doc(db, 'books', bookId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCopyStatusToCloud(copy: BookCopy): Promise<void> {
  const path = `copies/${copy.id}`;
  try {
    const payload: Record<string, unknown> = {
      id: copy.id,
      b: copy.b,
      r: copy.r,
      st: copy.st,
    };
    if (copy.v) payload.v = copy.v;

    await setDoc(doc(db, 'copies', copy.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchCustomBooksFromCloud(): Promise<Book[]> {
  const path = 'books';
  try {
    // Quota-friendly fetch: limits to latest 200 cloud modifications
    const q = query(collection(db, path), limit(200));
    const snap = await getDocs(q);
    const list: Book[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Book);
    });
    return list;
  } catch (error) {
    console.warn('Could not query custom books from cloud, falling back to local catalog:', error);
    return [];
  }
}

// --- SYSTEM SETTINGS ---
export async function saveSettingsToCloud(settings: LibrarySettings): Promise<void> {
  const path = 'system_settings/general';
  try {
    const payload: Record<string, unknown> = {
      name: settings.name,
      days: Number(settings.days) || 14,
    };
    if (settings.lib) payload.lib = settings.lib;
    if (settings.ar) payload.ar = settings.ar;
    if (settings.staff) payload.staff = settings.staff;
    if (settings.tz) payload.tz = settings.tz;

    await setDoc(doc(db, 'system_settings', 'general'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchSettingsFromCloud(): Promise<Partial<LibrarySettings> | null> {
  const path = 'system_settings/general';
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'general'));
    if (snap.exists()) {
      return snap.data() as Partial<LibrarySettings>;
    }
    return null;
  } catch (error) {
    console.warn('Settings fetch from cloud fallback:', error);
    return null;
  }
}

// --- REAL-TIME LISTENERS FOR CROSS-DEVICE SYNCHRONIZATION ---
// Attaches listeners ONLY when Admin is authenticated to protect Spark plan quotas
export function subscribeToCloudStudents(
  onStudentsUpdate: (students: Student[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'students';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const list: Student[] = [];
      snap.forEach((d) => list.push(d.data() as Student));
      onStudentsUpdate(list);
    },
    (error) => {
      console.warn('Cloud students snapshot notice:', error);
      onError?.(error);
    }
  );
}

export function subscribeToCloudLoans(
  onLoansUpdate: (loans: Loan[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'loans';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const list: Loan[] = [];
      snap.forEach((d) => list.push(d.data() as Loan));
      onLoansUpdate(list);
    },
    (error) => {
      console.warn('Cloud loans snapshot notice:', error);
      onError?.(error);
    }
  );
}

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };

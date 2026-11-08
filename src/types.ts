export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PUBLIC';

export interface AdminRecord {
  id: string; // Firebase Auth UID
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  name?: string;
  authorizedBy?: string;
  authorizedAt?: string;
  updatedAt?: string;
}


export interface Book {
  id: string;
  t: string;          // Title
  a: string;          // Author
  c?: string;         // Classification
  l?: string;         // Language
  e?: string;         // Edition
  p?: string;         // Publisher
  y?: string;         // Year
  k?: string;         // Category / Subject
  sh?: string;        // Shelf
  arch?: boolean;     // Archived
}

export interface BookCopy {
  id: string;
  b: string;          // Book ID
  r: string;          // Accession / Reg number
  v?: string;         // Volume / part
  st: 'available' | 'issued' | 'lost' | 'damaged';
}

export interface Student {
  id: string;
  n: string;          // Full name
  cl?: string;        // Class / year
  ph?: string;        // Phone
  g?: string;         // Guardian
  dob?: string;       // Date of birth
  adm?: string;       // Admission date
  tn?: string;        // Town / village
  rg?: string;        // Registration No
  rx?: string;        // Registration expiry
  ad?: string;        // Address
  rm?: string;        // Remarks
  img?: string;       // Photo Data URL
  reg?: string;       // Registered on
  arch?: boolean;     // Archived
  off?: boolean;      // Inactive
}

export interface Loan {
  id: string;
  cp: string;         // Copy ID
  stu: string;        // Student ID
  out: string;        // Date out (YYYY-MM-DD)
  due: string;        // Date due (YYYY-MM-DD)
  ret?: string;       // Date returned (YYYY-MM-DD)
  rm?: string;        // Remarks
}

export interface LibrarySettings {
  name: string;
  lib: string;
  ar: string;
  days: number;
  staff: string;
  tz: string;
  securityLockdown?: boolean;
  require2FA?: boolean;
}

export interface AuditLog {
  id: string;
  a: string;          // Action description
  by: string;         // Operator
  at: string;         // ISO timestamp
  ty?: string;        // Type: book, student, loan, auth, security
  rid?: string;       // Related ID
  ok?: number;        // 1=success, 0=failed
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ACCESS_DENIED' | 'BACKUP_CREATED' | 'MUTATION_LOG';
  ip: string;
  userAgent: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AuthSession {
  role: UserRole;
  email: string | null;
  name?: string;
  uid?: string;
  token?: string;
  twoFactorVerified?: boolean;
  loginAt?: string;
  expiresAt?: number;
}

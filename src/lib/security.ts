import DOMPurify from 'dompurify';
import { AuditLog, UserRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'dheeniyyalibrarymanagement@gmail.com';

// Arabic & text normalization for resilient Arabic / English catalog search
export const nz = (t: unknown): string => {
  return String(t ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0640\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
};

export const mt = (haystack: string, query: string): boolean => {
  const q = nz(query);
  if (!q) return true;
  const h = nz(haystack);
  return q.split(' ').every((w) => h.includes(w));
};

// Client-side XSS Sanitization
export const sanitizeInput = (text: string): string => {
  return DOMPurify.sanitize(text.trim());
};

// Brute Force Lockout Management
const LOCKOUT_KEY = 'dac_admin_lockout';
const ATTEMPTS_KEY = 'dac_admin_failed_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  remainingAttempts: number;
}

export function getLockoutStatus(): LockoutStatus {
  const lockedUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
  const now = Date.now();
  if (lockedUntil > now) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((lockedUntil - now) / 1000),
      remainingAttempts: 0,
    };
  }

  // If expired, clear lockout
  if (lockedUntil > 0) {
    localStorage.removeItem(LOCKOUT_KEY);
    localStorage.setItem(ATTEMPTS_KEY, '0');
  }

  const failedAttempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
  return {
    isLocked: false,
    remainingSeconds: 0,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - failedAttempts),
  };
}

export function recordFailedLoginAttempt(): LockoutStatus {
  const current = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(current));

  if (current >= MAX_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(LOCKOUT_KEY, String(lockedUntil));
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      remainingAttempts: 0,
    };
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    remainingAttempts: MAX_ATTEMPTS - current,
  };
}

export function resetLoginAttempts(): void {
  localStorage.removeItem(LOCKOUT_KEY);
  localStorage.setItem(ATTEMPTS_KEY, '0');
}

// Server security log dispatch
export async function sendSecurityTelemetry(
  action: string,
  role: UserRole,
  severity: 'low' | 'medium' | 'high' = 'low',
  meta?: unknown
): Promise<void> {
  try {
    await fetch('/api/security/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role, severity, meta }),
    });
  } catch {
    // Ignore network telemetry errors
  }
}

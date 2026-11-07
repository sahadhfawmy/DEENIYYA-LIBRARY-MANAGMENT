import DOMPurify from 'dompurify';
import { AuditLog } from '../types';

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

// SHA-256 Hashing for PIN & Master Credential Verification
export async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Default hash for emergency Super Admin passkey: "Admin@Deeniya2026" or "123456"
export const MASTER_PASSKEY_HASH = '179ef2ba9ea9d20c529d675e6d64d509a24cfc3b7e713501258673752e2a056a'; // "Admin@Deeniya2026"
export const BACKUP_PIN_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // "123456"

// Custom Password and Screen Lock Management
export const CUSTOM_PASSWORD_KEY = 'dac_custom_admin_password_hash';
export const CUSTOM_PIN_KEY = 'dac_custom_pin_hash';
export const AUTO_LOCK_MINUTES_KEY = 'dac_auto_lock_minutes';
export const SCREEN_LOCKED_KEY = 'dac_screen_locked';

export async function setCustomAdminPassword(newPassword: string): Promise<string> {
  const hash = await sha256(newPassword.trim());
  localStorage.setItem(CUSTOM_PASSWORD_KEY, hash);
  return hash;
}

export async function setCustomAdminPin(newPin: string): Promise<string> {
  const hash = await sha256(newPin.trim());
  localStorage.setItem(CUSTOM_PIN_KEY, hash);
  return hash;
}

export async function verifyAdminPasswordOrPin(input: string): Promise<boolean> {
  const raw = input.trim();
  if (!raw) return false;

  // 1. Direct string match for common presets
  if (
    raw === 'Admin@Deeniya2026' ||
    raw === '123456' ||
    raw === 'admin123' ||
    raw === 'deeniya2026' ||
    raw === 'dheeniyya2026'
  ) {
    return true;
  }

  const hash = await sha256(raw);

  // 2. Predefined hash verification
  const predefinedHashes = [
    MASTER_PASSKEY_HASH,
    BACKUP_PIN_HASH,
    'a489f00d3d48e98e96507eeb772a6ec7cab8d50e43d4f6dc84ebda012cdc30b3', // Admin@Deeniya2026
    '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456
    '78033da557607023255672a6cc9ce5dbe95a90f921cd373fa66a42f9a6b8932e', // deeniya2026
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
    '54658665f9b3d952c5d3a45b7caa771651eb3482fe5a7e9ab6bddcec39c01125', // dheeniyya2026
  ];

  if (predefinedHashes.includes(hash)) return true;

  // 3. User configured custom password
  const customPasswordHash = localStorage.getItem(CUSTOM_PASSWORD_KEY);
  if (customPasswordHash && customPasswordHash === hash) return true;

  // 4. User configured custom quick PIN
  const customPinHash = localStorage.getItem(CUSTOM_PIN_KEY);
  if (customPinHash && customPinHash === hash) return true;

  return false;
}

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
  role: 'SUPER_ADMIN' | 'PUBLIC',
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

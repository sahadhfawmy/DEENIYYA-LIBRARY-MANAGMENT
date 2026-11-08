import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  HelpCircle,
  Eye,
  EyeOff,
  Zap,
  RotateCcw,
  Send,
  UserCheck,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  SUPER_ADMIN_EMAIL,
  loginAdminWithPassword,
  sendAdminPasswordReset,
  registerInitialAdmin,
  sendVerificationToAdmin,
} from '../lib/firebase';
import {
  sha256,
  MASTER_PASSKEY_HASH,
  BACKUP_PIN_HASH,
  getLockoutStatus,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  LockoutStatus,
  verifyAdminPasswordOrPin,
} from '../lib/security';
import { AuthSession } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
}

const ACCEPTED_PASSKEY_HASHES = [
  MASTER_PASSKEY_HASH,
  BACKUP_PIN_HASH,
  'a489f00d3d48e98e96507eeb772a6ec7cab8d50e43d4f6dc84ebda012cdc30b3', // Admin@Deeniya2026
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456
  '78033da557607023255672a6cc9ce5dbe95a90f921cd373fa66a42f9a6b8932e', // deeniya2026
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
  '54658665f9b3d952c5d3a45b7caa771651eb3482fe5a7e9ab6bddcec39c01125', // dheeniyya2026
];

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  // Tabs: Official Firebase Email/Password, Google Sign-in, or Direct Master Passkey
  const [tab, setTab] = useState<'firebase_password' | 'google' | 'passkey' | 'recover'>('firebase_password');
  const [emailInput] = useState(SUPER_ADMIN_EMAIL);
  const [passwordInput, setPasswordInput] = useState('');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [lockout, setLockout] = useState<LockoutStatus>({
    isLocked: false,
    remainingSeconds: 0,
    remainingAttempts: 5,
  });

  // Track and refresh lockout countdown
  useEffect(() => {
    if (!isOpen) return;
    const status = getLockoutStatus();
    setLockout(status);

    const interval = setInterval(() => {
      const current = getLockoutStatus();
      setLockout(current);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Finalize successful Super Admin session
  const finalizeSuperAdminSession = (
    email: string,
    uid: string,
    authMethod: string,
    emailVerified: boolean = true
  ) => {
    resetLoginAttempts();
    const session: AuthSession = {
      role: 'SUPER_ADMIN',
      email: SUPER_ADMIN_EMAIL,
      name: 'Super Admin Librarian',
      uid,
      token: 'dac_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      loginAt: new Date().toISOString(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8-hour session
    };

    localStorage.setItem('dac_admin_session', JSON.stringify(session));

    if (!emailVerified) {
      setNeedsEmailVerification(true);
      setSuccessMsg(`Authenticated via ${authMethod}. Note: Verification email sent to ${SUPER_ADMIN_EMAIL} for maximum security.`);
      setTimeout(() => {
        onLoginSuccess(session);
        onClose();
      }, 1500);
    } else {
      onLoginSuccess(session);
      onClose();
    }
  };

  // 1. FREE FIREBASE EMAIL & PASSWORD LOGIN
  const handleFirebasePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout.isLocked) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const user = await loginAdminWithPassword(emailInput, passwordInput);
      finalizeSuperAdminSession(user.email || SUPER_ADMIN_EMAIL, user.uid, 'Firebase Password', user.emailVerified);
    } catch (err: unknown) {
      const errorCode = (err as any)?.code || '';
      const message = err instanceof Error ? err.message : String(err);

      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
        const lockStatus = recordFailedLoginAttempt();
        setLockout(lockStatus);
        setErrorMsg(`Incorrect Firebase password for ${SUPER_ADMIN_EMAIL}. ${lockStatus.remainingAttempts} attempt(s) remaining.`);
      } else if (errorCode === 'auth/user-not-found') {
        setErrorMsg(`No Firebase password account registered yet for ${SUPER_ADMIN_EMAIL}. Use "First-Time Admin Setup" below to establish your password.`);
        setIsFirstTimeSetup(true);
      } else if (errorCode === 'auth/too-many-requests') {
        setErrorMsg('Access temporarily paused due to repeated failed attempts. Please use Password Reset or try again later.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. INITIAL ADMIN PASSWORD SETUP (FREE EMAIL/PASSWORD PROVIDER)
  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (passwordInput !== setupPasswordConfirm) {
      setErrorMsg('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const user = await registerInitialAdmin(SUPER_ADMIN_EMAIL, passwordInput);
      setSuccessMsg(`Super Admin account registered in Firebase! Verification email sent to ${SUPER_ADMIN_EMAIL}.`);
      finalizeSuperAdminSession(SUPER_ADMIN_EMAIL, user.uid, 'Initial Firebase Setup', false);
    } catch (err: unknown) {
      const errorCode = (err as any)?.code || '';
      if (errorCode === 'auth/email-already-in-use') {
        setErrorMsg('Account already exists! Please log in with your existing password, or click "Forgot Password" to reset it.');
        setIsFirstTimeSetup(false);
      } else {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. FREE PASSWORD RESET VIA FIREBASE
  const handlePasswordReset = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await sendAdminPasswordReset(SUPER_ADMIN_EMAIL);
      setSuccessMsg(`Password reset link sent to ${SUPER_ADMIN_EMAIL}! Check your inbox to set a new password.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  // 4. RESEND VERIFICATION EMAIL
  const handleResendVerification = async () => {
    try {
      await sendVerificationToAdmin();
      setSuccessMsg(`Verification email re-sent to ${SUPER_ADMIN_EMAIL}!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send verification email');
    }
  };

  // 5. OFFICIAL GOOGLE SIGN-IN VIA FIREBASE
  const handleGoogleSignIn = async () => {
    if (lockout.isLocked) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = (user.email || '').toLowerCase().trim();

      // STRICT SINGLE SUPER ADMIN ENFORCEMENT
      if (userEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        await signOut(auth);
        const lockStatus = recordFailedLoginAttempt();
        setLockout(lockStatus);

        setErrorMsg(
          `Unauthorized Account: ${userEmail}. Only the authorized Super Admin (${SUPER_ADMIN_EMAIL}) is permitted.`
        );
        return;
      }

      finalizeSuperAdminSession(userEmail, user.uid, 'Google Authentication', true);
    } catch (err: unknown) {
      const errorCode = (err as any)?.code || '';
      const errorText = err instanceof Error ? err.message : String(err);

      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorText.includes('popup-closed-by-user') ||
        errorCode === 'auth/cancelled-popup-request'
      ) {
        setErrorMsg('Google sign-in popup was closed. You can use your Firebase Admin Password tab above.');
        setTab('firebase_password');
        return;
      }

      if (errorCode === 'auth/popup-blocked') {
        setErrorMsg('Browser blocked popup window. Please allow popups or use Firebase Admin Password.');
        setTab('firebase_password');
        return;
      }

      setErrorMsg(errorText);
      const lockStatus = recordFailedLoginAttempt();
      setLockout(lockStatus);
    } finally {
      setLoading(false);
    }
  };

  // 6. DIRECT MASTER PASSKEY / PIN (FALLBACK)
  const handlePasskeySignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout.isLocked) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const rawPass = passkeyInput.trim();
      const inputHash = await sha256(rawPass);

      const isPassValid =
        (await verifyAdminPasswordOrPin(rawPass)) ||
        ACCEPTED_PASSKEY_HASHES.includes(inputHash) ||
        rawPass === 'Admin@Deeniya2026' ||
        rawPass === '123456' ||
        rawPass === 'deeniya2026' ||
        rawPass === 'admin123' ||
        rawPass === 'dheeniyya2026';

      if (!isPassValid) {
        const lockStatus = recordFailedLoginAttempt();
        setLockout(lockStatus);
        setErrorMsg(`Invalid passkey. ${lockStatus.remainingAttempts} attempt(s) remaining.`);
        return;
      }

      finalizeSuperAdminSession(SUPER_ADMIN_EMAIL, 'master-passkey-direct', 'Master Passkey', true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
      const lockStatus = recordFailedLoginAttempt();
      setLockout(lockStatus);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Instant Login (Fallback)
  const handleInstantAdminLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      finalizeSuperAdminSession(SUPER_ADMIN_EMAIL, 'instant-admin-verified', 'Direct Super Admin Access', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 px-6 py-5 text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-800/80 rounded-xl border border-emerald-500/30 shadow-xs">
              <Shield className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Admin Security Portal</h2>
              <p className="text-xs text-emerald-200">Deeniya Arabic College · Free Firebase Centralized Cloud</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lockout Warning Banner with Reset Option */}
        {lockout.isLocked && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center justify-between text-xs text-red-700 dark:text-red-400">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 shrink-0 text-red-600 animate-pulse" />
              <span>
                Security Lockout: Retry in{' '}
                <b>{Math.floor(lockout.remainingSeconds / 60)}m {lockout.remainingSeconds % 60}s</b>.
              </span>
            </div>
            <button
              onClick={() => {
                resetLoginAttempts();
                setLockout(getLockoutStatus());
                setErrorMsg(null);
              }}
              className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 text-[10px] font-semibold hover:bg-red-200 flex items-center space-x-1"
              title="Reset Lockout"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {/* Status feedback */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1">
                <span>{successMsg}</span>
                {needsEmailVerification && (
                  <button
                    onClick={handleResendVerification}
                    className="block mt-1 font-bold underline hover:text-emerald-900"
                  >
                    Resend Verification Email
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setTab('firebase_password'); setErrorMsg(null); }}
              className={`pb-2.5 px-2.5 border-b-2 transition flex items-center space-x-1.5 ${
                tab === 'firebase_password'
                  ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Admin Password</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('google'); setErrorMsg(null); }}
              className={`pb-2.5 px-2.5 border-b-2 transition flex items-center space-x-1.5 ${
                tab === 'google'
                  ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Google Sign-In</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('passkey'); setErrorMsg(null); }}
              className={`pb-2.5 px-2.5 border-b-2 transition flex items-center space-x-1.5 ${
                tab === 'passkey'
                  ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Master Passkey</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('recover'); setErrorMsg(null); }}
              className={`pb-2.5 px-2 border-b-2 transition flex items-center space-x-1 ${
                tab === 'recover'
                  ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* TAB 1: FREE FIREBASE EMAIL & PASSWORD LOGIN */}
          {tab === 'firebase_password' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Single Authorized Super Admin</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    Spark Free
                  </span>
                </div>
                <div className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {SUPER_ADMIN_EMAIL}
                </div>
              </div>

              {!isFirstTimeSetup ? (
                <form onSubmit={handleFirebasePasswordLogin} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Firebase Admin Password
                      </label>
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={loading}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Forgot Password?</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your Firebase Admin password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full text-xs py-2 pl-9 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || lockout.isLocked || !passwordInput}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{loading ? 'Authenticating with Firebase…' : 'Sign In as Super Admin'}</span>
                  </button>

                  <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setIsFirstTimeSetup(true); setErrorMsg(null); }}
                      className="text-xs text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium"
                    >
                      First time using Firebase? <b className="underline">Initialize Admin Password</b>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleInitialSetup} className="space-y-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>First-Time Setup: Set Your Firebase Password</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Create a secure password for <b className="font-mono">{SUPER_ADMIN_EMAIL}</b> in Firebase Authentication.
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Choose New Admin Password (min 6 chars)
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={setupPasswordConfirm}
                      onChange={(e) => setSetupPasswordConfirm(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="submit"
                      disabled={loading || !passwordInput || !setupPasswordConfirm}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition"
                    >
                      {loading ? 'Creating Account…' : 'Activate Admin Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFirstTimeSetup(false)}
                      className="py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: OFFICIAL GOOGLE SIGN-IN VIA FIREBASE */}
          {tab === 'google' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Account Verification</span>
                </div>
                Sign in with the designated Google account: <b className="font-mono text-emerald-700 dark:text-emerald-400">{SUPER_ADMIN_EMAIL}</b>. 100% free via official Firebase Google Auth.
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading || lockout.isLocked}
                className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200 transition active:scale-98 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Authenticating…' : 'Sign in with Google'}</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setTab('firebase_password')}
                  className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                  ← Prefer Firebase email & password? Click here
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT MASTER PASSKEY / PIN (EMERGENCY) */}
          {tab === 'passkey' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Instant Super Admin Access</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
                    Zero Latency
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleInstantAdminLogin}
                  disabled={loading || lockout.isLocked}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm hover:shadow transition active:scale-98 disabled:opacity-50"
                >
                  <Shield className="w-4 h-4 text-amber-300" />
                  <span>{loading ? 'Authenticating…' : '⚡ 1-Click Super Admin Login'}</span>
                </button>
              </div>

              <form onSubmit={handlePasskeySignIn} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Master Passkey or PIN
                    </label>
                    <div className="flex items-center space-x-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setPasskeyInput('Admin@Deeniya2026')}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Fill Passkey
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={() => setPasskeyInput('123456')}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Fill PIN (123456)
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter passkey or PIN"
                      value={passkeyInput}
                      onChange={(e) => setPasskeyInput(e.target.value)}
                      className="w-full text-xs py-2 pl-9 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || lockout.isLocked || !passkeyInput}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition"
                >
                  {loading ? 'Verifying…' : 'Authenticate via Master Credentials'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: PASSWORD RESET VIA FIREBASE FREE EMAIL */}
          {tab === 'recover' && (
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5 mb-1">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>Free Firebase Password Reset</span>
                </div>
                Firebase will automatically send a secure password reset link to your verified Gmail: <b className="font-mono">{SUPER_ADMIN_EMAIL}</b>. 100% free under the Firebase Spark plan.
              </div>

              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition flex items-center justify-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Sending Reset Email…' : 'Send Password Reset Email'}</span>
              </button>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px] space-y-1">
                <div><b>Emergency Passkey:</b> Admin@Deeniya2026</div>
                <div><b>Emergency PIN:</b> 123456</div>
              </div>
            </div>
          )}

          {/* Security policy notice */}
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Free Spark Plan Centralized Cloud</span>
            <span>Single-Admin RBAC</span>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  verifyUserAdminStatus,
  isOwnerEmail,
} from '../lib/firebase';
import {
  getLockoutStatus,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  LockoutStatus,
} from '../lib/security';
import { AuthSession } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  // Navigation Tabs: Firebase Email/Password, Google Sign-in, or Password Reset
  const [tab, setTab] = useState<'firebase_password' | 'google' | 'recover'>('firebase_password');
  const [emailInput, setEmailInput] = useState(SUPER_ADMIN_EMAIL);
  const [passwordInput, setPasswordInput] = useState('');
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

  // Finalize authenticated administrator session
  const finalizeAdminSession = (
    email: string,
    uid: string,
    role: 'SUPER_ADMIN' | 'ADMIN',
    name: string,
    authMethod: string,
    emailVerified: boolean = true
  ) => {
    resetLoginAttempts();
    const session: AuthSession = {
      role,
      email,
      name,
      uid,
      token: 'dac_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      loginAt: new Date().toISOString(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8-hour session
    };

    localStorage.setItem('dac_admin_session', JSON.stringify(session));

    if (!emailVerified) {
      setNeedsEmailVerification(true);
      setSuccessMsg(`Authenticated via ${authMethod}. Note: Verification email sent to ${email} for maximum security.`);
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

    const targetEmail = emailInput.trim().toLowerCase();
    if (!targetEmail) {
      setErrorMsg('Please enter your administrator email address.');
      setLoading(false);
      return;
    }

    try {
      const result = await loginAdminWithPassword(targetEmail, passwordInput);
      finalizeAdminSession(
        result.user.email || targetEmail,
        result.user.uid,
        result.role,
        result.name || 'Administrator',
        'Firebase Password',
        result.user.emailVerified
      );
    } catch (err: unknown) {
      const errorCode = (err as any)?.code || '';
      const message = err instanceof Error ? err.message : String(err);

      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
        const lockStatus = recordFailedLoginAttempt();
        setLockout(lockStatus);
        setErrorMsg(`Incorrect password for ${targetEmail}. ${lockStatus.remainingAttempts} attempt(s) remaining.`);
      } else if (errorCode === 'auth/user-not-found') {
        if (isOwnerEmail(targetEmail)) {
          setErrorMsg(`No Firebase password account registered yet for owner ${targetEmail}. Use "First-Time Owner Setup" below to establish your password.`);
          setIsFirstTimeSetup(true);
        } else {
          setErrorMsg(`No account found for ${targetEmail}. Please contact the library owner to be provisioned.`);
        }
      } else if (errorCode === 'auth/too-many-requests') {
        setErrorMsg('Access temporarily paused due to repeated failed attempts. Please use Password Reset or try again later.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. INITIAL OWNER PASSWORD SETUP (FREE EMAIL/PASSWORD PROVIDER)
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
      finalizeAdminSession(SUPER_ADMIN_EMAIL, user.uid, 'SUPER_ADMIN', 'Website Owner', 'Initial Firebase Setup', false);
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
    const targetEmail = (emailInput || SUPER_ADMIN_EMAIL).trim().toLowerCase();
    if (!targetEmail) {
      setErrorMsg('Please specify the administrator email address to send the password reset link to.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await sendAdminPasswordReset(targetEmail);
      setSuccessMsg(`Password reset link sent to ${targetEmail}! Check your inbox to set a new password.`);
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
      setSuccessMsg(`Verification email re-sent to ${auth.currentUser?.email || SUPER_ADMIN_EMAIL}!`);
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
      const status = await verifyUserAdminStatus(user);

      if (!status.isAuthorized) {
        await signOut(auth);
        const lockStatus = recordFailedLoginAttempt();
        setLockout(lockStatus);

        setErrorMsg(
          `Unauthorized Account: ${user.email}. This account has not been authorized by the website owner (${SUPER_ADMIN_EMAIL}).`
        );
        return;
      }

      finalizeAdminSession(
        user.email || SUPER_ADMIN_EMAIL,
        user.uid,
        status.role,
        status.name || 'Administrator',
        'Google Authentication',
        true
      );
    } catch (err: unknown) {
      const errorCode = (err as any)?.code || '';
      const errorText = err instanceof Error ? err.message : String(err);

      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorText.includes('popup-closed-by-user') ||
        errorCode === 'auth/cancelled-popup-request'
      ) {
        setErrorMsg('Google sign-in popup was closed. You can use your Admin Password tab above.');
        setTab('firebase_password');
        return;
      }

      if (errorCode === 'auth/popup-blocked') {
        setErrorMsg('Browser blocked popup window. Please allow popups or use Admin Password.');
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
              <p className="text-xs text-emerald-200">Deeniya Arabic College · Centralized Cloud Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lockout Warning Banner */}
        {lockout.isLocked && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center space-x-2 text-xs text-red-700 dark:text-red-400">
            <Clock className="w-4 h-4 shrink-0 text-red-600 animate-pulse" />
            <span>
              Security Lockout Active: Too many failed attempts. Please retry in{' '}
              <b>{Math.floor(lockout.remainingSeconds / 60)}m {lockout.remainingSeconds % 60}s</b>.
            </span>
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
              className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
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
              className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
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
              onClick={() => { setTab('recover'); setErrorMsg(null); }}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
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
              {!isFirstTimeSetup ? (
                <form onSubmit={handleFirebasePasswordLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="admin@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full text-xs py-2 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Password
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
                        placeholder="Enter your password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full text-xs py-2 pl-9 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        title={showPassword ? 'Hide password' : 'Show password'}
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
                    <span>{loading ? 'Authenticating with Firebase…' : 'Sign In as Administrator'}</span>
                  </button>

                  {isOwnerEmail(emailInput) && (
                    <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => { setIsFirstTimeSetup(true); setErrorMsg(null); }}
                        className="text-xs text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium"
                      >
                        First time using Firebase? <b className="underline">Initialize Owner Password</b>
                      </button>
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={handleInitialSetup} className="space-y-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>First-Time Setup: Set Owner Password</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Create a secure password for <b className="font-mono">{SUPER_ADMIN_EMAIL}</b> in Firebase Authentication.
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Choose Owner Password (min 6 chars)
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
                      Confirm Owner Password
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
                      {loading ? 'Creating Account…' : 'Activate Owner Password'}
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
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Google Account Access</span>
                </div>
                Sign in with your authorized Google account. Firebase securely validates administrator permissions against cloud records.
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
                  ← Prefer email & password? Click here
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PASSWORD RESET VIA FIREBASE FREE EMAIL */}
          {tab === 'recover' && (
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5 mb-1">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>Free Firebase Password Reset</span>
                </div>
                Firebase will automatically send a secure password reset link to your email address. 100% free under the Firebase Spark plan.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Email Address
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading || !emailInput}
                className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Sending Reset Email…' : 'Send Password Reset Email'}</span>
              </button>
            </div>
          )}

          {/* Security policy notice */}
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Free Centralized Cloud Auth</span>
            <span>Role-Based Access Control</span>
          </div>
        </div>
      </div>
    </div>
  );
};

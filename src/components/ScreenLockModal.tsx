import React, { useState } from 'react';
import { COLLEGE_LOGO } from '../data/logo';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  LogOut,
  Delete,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { verifyAdminPasswordOrPin, SUPER_ADMIN_EMAIL } from '../lib/security';

interface ScreenLockModalProps {
  isLocked: boolean;
  onUnlock: () => void;
  onLogout: () => void;
  collegeName: string;
}

export const ScreenLockModal: React.FC<ScreenLockModalProps> = ({
  isLocked,
  onUnlock,
  onLogout,
  collegeName,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (!isLocked) return null;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleAttemptUnlock = async (valToVerify?: string) => {
    const candidate = valToVerify !== undefined ? valToVerify : inputVal;
    if (!candidate.trim()) {
      setErrorMsg('Please enter your password or PIN.');
      triggerShake();
      return;
    }

    setVerifying(true);
    setErrorMsg(null);

    try {
      const isValid = await verifyAdminPasswordOrPin(candidate);
      if (isValid) {
        setInputVal('');
        onUnlock();
      } else {
        setErrorMsg('Incorrect password or PIN. Please try again.');
        triggerShake();
      }
    } catch {
      setErrorMsg('Verification error. Please retry.');
      triggerShake();
    } finally {
      setVerifying(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (inputVal.length < 32) {
      const next = inputVal + digit;
      setInputVal(next);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    setInputVal((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div
        className={`relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 ${
          shake ? 'animate-shake translate-x-1' : ''
        }`}
      >
        {/* Top Decorative Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 px-6 pt-7 pb-6 text-center text-white relative">
          <div className="w-16 h-16 mx-auto rounded-full p-1 bg-gradient-to-b from-amber-300 via-emerald-200 to-emerald-400 shadow-lg border-2 border-amber-400/60 flex items-center justify-center mb-3">
            <img
              src={COLLEGE_LOGO}
              alt="Deeniya Arabic College"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase">
            {collegeName}
          </h2>
          <p className="text-xs text-emerald-200/90 font-arabic mt-0.5">
            المكتبة المركزية · قفل الشاشة للأمان
          </p>

          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-500/30 text-emerald-200 text-[11px] font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-300" />
            <span>Screen Locked · Session Protected</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center space-x-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
              Enter Administrator Password or PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="Password or PIN"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setErrorMsg(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAttemptUnlock();
                  }
                }}
                className="w-full text-center text-sm font-mono py-2.5 pl-10 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick PIN Keypad (0-9) for Fast Touch / Mouse Entry */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-mono font-bold text-sm text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-xs active:scale-95 transition"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-xs active:scale-95 transition flex items-center justify-center"
              title="Delete last digit"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-mono font-bold text-sm text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-xs active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleAttemptUnlock()}
              disabled={verifying}
              className="py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md active:scale-95 transition flex items-center justify-center space-x-1"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock</span>
            </button>
          </div>

          {/* Quick Presets / Emergency Unlock Helpers */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setInputVal('123456');
                handleAttemptUnlock('123456');
              }}
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
            >
              ⚡ Quick Unlock (123456)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputVal('Admin@Deeniya2026');
                handleAttemptUnlock('Admin@Deeniya2026');
              }}
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
            >
              Master Passkey
            </button>
          </div>

          {/* Logout / Switch to Public View */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center space-x-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch to Public Catalogue (Sign Out)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

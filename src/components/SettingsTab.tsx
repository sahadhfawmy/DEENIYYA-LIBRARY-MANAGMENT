import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Shield,
  CheckCircle2,
  ShieldAlert,
  Palette,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  Unlock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { LibrarySettings } from '../types';
import {
  SUPER_ADMIN_EMAIL,
  setCustomAdminPassword,
  setCustomAdminPin,
  AUTO_LOCK_MINUTES_KEY,
  CUSTOM_PASSWORD_KEY,
  CUSTOM_PIN_KEY,
} from '../lib/security';
import {
  LUXURY_THEMES,
  LuxuryThemeId,
  getActiveThemeId,
  setActiveThemeId,
} from '../lib/theme';

interface SettingsTabProps {
  settings: LibrarySettings;
  isSuperAdmin: boolean;
  onSaveSettings: (settings: LibrarySettings) => Promise<void>;
  onOpenLogin: () => void;
  activeThemeId?: LuxuryThemeId;
  onSelectTheme?: (theme: LuxuryThemeId) => void;
  onTriggerLockScreen?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  isSuperAdmin,
  onSaveSettings,
  onOpenLogin,
  activeThemeId,
  onSelectTheme,
  onTriggerLockScreen,
}) => {
  const [formData, setFormData] = useState<LibrarySettings>({ ...settings });
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState<LuxuryThemeId>(() => activeThemeId || getActiveThemeId());

  // Password & Lock Options State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [quickPin, setQuickPin] = useState(() => {
    return localStorage.getItem('dac_saved_pin_display') || '123456';
  });
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    return parseInt(localStorage.getItem(AUTO_LOCK_MINUTES_KEY) || '15', 10);
  });
  const [hasCustomPassword, setHasCustomPassword] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(CUSTOM_PASSWORD_KEY));
  });

  const handleSelectTheme = (themeId: LuxuryThemeId) => {
    setActiveTheme(themeId);
    setActiveThemeId(themeId);
    onSelectTheme?.(themeId);
    setSuccess(`Applied ${themeId.replace('-', ' ').toUpperCase()} theme!`);
    setTimeout(() => setSuccess(null), 2500);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg mt-8">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Settings Restricted</h3>
        <p className="text-xs text-slate-500">Institution settings and password configurations can only be accessed by the Super Admin.</p>
        <button onClick={onOpenLogin} className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md">
          Admin Login · تسجيل الدخول
        </button>
      </div>
    );
  }

  // Handle Password & PIN Update
  const handleUpdatePasswordAndPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccess(null);

    // Validate password if user entered one
    if (newPassword.trim()) {
      if (newPassword.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirmation do not match.');
        return;
      }
      await setCustomAdminPassword(newPassword.trim());
      setHasCustomPassword(true);
      setNewPassword('');
      setConfirmPassword('');
    }

    // Validate and update Quick PIN
    if (quickPin.trim()) {
      if (!/^\d{4,8}$/.test(quickPin.trim())) {
        setErrorMsg('Quick PIN must be 4 to 8 numeric digits.');
        return;
      }
      await setCustomAdminPin(quickPin.trim());
      localStorage.setItem('dac_saved_pin_display', quickPin.trim());
    }

    // Save auto-lock timer
    localStorage.setItem(AUTO_LOCK_MINUTES_KEY, String(autoLockMinutes));

    setSuccess('Password, PIN, and Screen Lock preferences updated successfully!');
    setTimeout(() => setSuccess(null), 3500);
  };

  // Reset to Default Password & PIN
  const handleResetToDefault = () => {
    localStorage.removeItem(CUSTOM_PASSWORD_KEY);
    localStorage.removeItem(CUSTOM_PIN_KEY);
    localStorage.removeItem('dac_saved_pin_display');
    setQuickPin('123456');
    setHasCustomPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setSuccess('Restored default college passkey (Admin@Deeniya2026) and PIN (123456).');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(formData);
      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 1. Institution Settings Card */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Library & Institution Settings · الإعدادات
            </h2>
            <p className="text-xs text-slate-500">Configure institution branding, borrowing duration, and administrator parameters.</p>
          </div>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-xl text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              College Name (English)
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Arabic Department Name · الاسم العربي
            </label>
            <input
              type="text"
              dir="rtl"
              value={formData.ar}
              onChange={(e) => setFormData({ ...formData, ar: e.target.value })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-arabic text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Library Subtitle
            </label>
            <input
              type="text"
              value={formData.lib}
              onChange={(e) => setFormData({ ...formData, lib: e.target.value })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Standard Loan Duration (Days)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 14 })}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Timezone
              </label>
              <input
                type="text"
                value={formData.tz}
                onChange={(e) => setFormData({ ...formData, tz: e.target.value })}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Administrator profile overview */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Designated Super Admin</span>
            </div>
            <div className="font-mono text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              {SUPER_ADMIN_EMAIL}
            </div>
            <p className="text-[10px] text-slate-400">
              Hardcoded and protected in Firestore Security Rules. Public visitors cannot override this role.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes…' : 'Save Institution Settings'}</span>
          </button>
        </form>
      </div>

      {/* 2. Security Lock & Password Option Card */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Lock & Password Options · قفل الشاشة وكلمات المرور
              </h2>
              <p className="text-xs text-slate-500">Manage administrator passwords, screen lock PINs, and desk privacy controls.</p>
            </div>
          </div>

          {/* Instant Screen Lock Trigger Button */}
          {onTriggerLockScreen && (
            <button
              type="button"
              onClick={onTriggerLockScreen}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm active:scale-95 transition"
              title="Lock system screen immediately"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Screen Now</span>
            </button>
          )}
        </div>

        <form onSubmit={handleUpdatePasswordAndPin} className="space-y-4 text-xs">
          {/* Quick PIN Configuration */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Quick Screen Lock PIN (4–8 Digits)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Used for instant screen unlock
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                maxLength={8}
                value={quickPin}
                onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold tracking-widest text-center text-sm"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Default is <span className="font-mono text-emerald-600 font-semibold">123456</span>. You can change this to any 4 to 8-digit PIN for rapid circulation desk unlocking.
            </p>
          </div>

          {/* Custom Master Password Change */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Change Administrator Passkey / Password
                </span>
              </div>
              {hasCustomPassword ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  Custom Password Active
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-semibold">
                  Default (Admin@Deeniya2026)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  New Password (min 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full py-2 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Auto-Lock Inactivity Timer */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <label className="font-bold text-slate-800 dark:text-slate-200">
                Inactivity Screen Auto-Lock Timeout
              </label>
            </div>
            <select
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(parseInt(e.target.value, 10))}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer font-medium"
            >
              <option value={0}>Disabled / Never auto-lock screen</option>
              <option value={5}>5 Minutes of Inactivity</option>
              <option value={15}>15 Minutes of Inactivity (Recommended)</option>
              <option value={30}>30 Minutes of Inactivity</option>
              <option value={60}>60 Minutes of Inactivity</option>
            </select>
            <p className="text-[10px] text-slate-400">
              When enabled, the system automatically locks the circulation screen if untouched for the selected duration.
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-md transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Lock & Password Preferences</span>
            </button>

            {hasCustomPassword && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition flex items-center space-x-1.5"
                title="Reset to default college password"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 3. Luxury Website Themes & Appearance Customization */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              Luxury Website Themes & Appearance · المظهر والثيمات
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold">
            4 Luxury Styles
          </span>
        </div>
        <p className="text-slate-500 text-[11px]">
          Choose from 4 handcrafted institution aesthetics. Saved automatically in system settings.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {LUXURY_THEMES.map((theme) => {
            const isActive = activeTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  isActive
                    ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {theme.name}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-arabic text-amber-700 dark:text-amber-400 font-medium">
                  {theme.arName}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  {theme.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

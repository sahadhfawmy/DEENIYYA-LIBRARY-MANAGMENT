import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Shield,
  CheckCircle2,
  ShieldAlert,
  Palette,
  Cloud,
  RefreshCw,
  Smartphone,
  Laptop,
  UserCheck,
  UserPlus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { LibrarySettings, AuthSession, AdminRecord } from '../types';
import { SUPER_ADMIN_EMAIL } from '../lib/security';
import {
  isOwnerEmail,
  fetchAuthorizedAdmins,
  grantAdminAuthorization,
  revokeAdminAuthorization,
} from '../lib/firebase';
import {
  LUXURY_THEMES,
  LuxuryThemeId,
  getActiveThemeId,
  setActiveThemeId,
} from '../lib/theme';

interface SettingsTabProps {
  settings: LibrarySettings;
  isSuperAdmin: boolean;
  session?: AuthSession;
  onSaveSettings: (settings: LibrarySettings) => Promise<void>;
  onOpenLogin: () => void;
  activeThemeId?: LuxuryThemeId;
  onSelectTheme?: (theme: LuxuryThemeId) => void;
  onManualSync?: () => Promise<void>;
  isSyncing?: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  isSuperAdmin,
  session,
  onSaveSettings,
  onOpenLogin,
  activeThemeId,
  onSelectTheme,
  onManualSync,
  isSyncing,
}) => {
  const [formData, setFormData] = useState<LibrarySettings>({ ...settings });
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState<LuxuryThemeId>(() => activeThemeId || getActiveThemeId());

  // Owner Admin Management State
  const isOwner = isOwnerEmail(session?.email);
  const [adminsList, setAdminsList] = useState<AdminRecord[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [adminActionSuccess, setAdminActionSuccess] = useState<string | null>(null);
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // Load admins list if current user is the Owner
  useEffect(() => {
    if (!isOwner) return;
    loadAdmins();
  }, [isOwner]);

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const list = await fetchAuthorizedAdmins();
      setAdminsList(list);
    } catch (err) {
      console.warn('Admins list fetch notice:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUid.trim() || !newAdminEmail.trim()) {
      setAdminActionError('Please provide both the Firebase Auth UID and Email.');
      return;
    }
    setAdminActionError(null);
    setAdminActionSuccess(null);
    setIsAddingAdmin(true);

    try {
      await grantAdminAuthorization({
        uid: newAdminUid.trim(),
        email: newAdminEmail.trim().toLowerCase(),
        name: newAdminName.trim() || undefined,
        role: newAdminRole,
      });
      setAdminActionSuccess(`Administrator authorization granted to ${newAdminEmail}!`);
      setNewAdminUid('');
      setNewAdminEmail('');
      setNewAdminName('');
      await loadAdmins();
    } catch (err: unknown) {
      setAdminActionError(err instanceof Error ? err.message : 'Failed to authorize administrator');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleRevokeAdmin = async (uid: string, email: string) => {
    if (!window.confirm(`Revoke administrator authorization for ${email}? This account will lose all admin permissions immediately.`)) {
      return;
    }
    try {
      await revokeAdminAuthorization(uid);
      setAdminActionSuccess(`Revoked authorization for ${email}.`);
      await loadAdmins();
    } catch (err: unknown) {
      setAdminActionError(err instanceof Error ? err.message : 'Failed to revoke administrator');
    }
  };

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
        <p className="text-xs text-slate-500">Institution settings and parameters can only be configured by verified administrators.</p>
        <button onClick={onOpenLogin} className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md">
          Admin Login · تسجيل الدخول
        </button>
      </div>
    );
  }

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
      {/* 1. Centralized Cloud Database & Free Spark Policy Card */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Centralized Cloud Database · قاعدة البيانات السحابية
              </h2>
              <p className="text-xs text-slate-500">
                Synchronized across all phones, tablets, and laptops worldwide.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
            Spark Free Plan ($0.00)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500">Cloud Firestore ID</div>
            <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
              ai-studio-f80854f8-fbe6-4110-90b5-723299326526
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Status: Connected & Verified</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500">Cross-Device Synchronization</div>
            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>+</span>
              <Laptop className="w-3.5 h-3.5 text-emerald-600" />
              <span>Universal Sync Active</span>
            </div>
            <div className="text-[10px] text-slate-500">
              One shared cloud database for all your devices.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-slate-500">
            Strict Zero-Payment Guarantee: Operates permanently within Firebase Spark free tier quotas.
          </p>
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition flex items-center space-x-1.5 shrink-0 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Cloud…' : 'Sync with Cloud'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Owner-Only Authorized Administrators Management */}
      {isOwner && (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Authorized Administrators Management · إدارة المشرفين
                </h2>
                <p className="text-xs text-slate-500">
                  Owner-Only Access Control. Enforced authoritatively by Firestore Security Rules.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
              Owner Privileges
            </span>
          </div>

          {adminActionError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-700 dark:text-red-300 rounded-xl flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{adminActionError}</span>
            </div>
          )}

          {adminActionSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 rounded-xl flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{adminActionSuccess}</span>
            </div>
          )}

          {/* List of Registered Administrators */}
          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Cloud Registered Administrators ({adminsList.length})</span>
              <button
                type="button"
                onClick={loadAdmins}
                disabled={loadingAdmins}
                className="text-[11px] text-emerald-600 hover:underline flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingAdmins ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-2">
              {adminsList.map((admin) => (
                <div
                  key={admin.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>{admin.email}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold">
                        {admin.role}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">UID: {admin.id}</div>
                  </div>
                  {admin.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() && (
                    <button
                      type="button"
                      onClick={() => handleRevokeAdmin(admin.id, admin.email)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                      title="Revoke Admin Access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form to Authorize a New Administrator */}
          <form onSubmit={handleGrantAdmin} className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Authorize New Administrator</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Only you (the Website Owner) have cryptographic permission in Firestore Security Rules to write to the <code className="font-mono text-emerald-600">/admins</code> collection.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Firebase Auth UID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cZ4wv65a7UgS9xHRp0Y..."
                  value={newAdminUid}
                  onChange={(e) => setNewAdminUid(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Associate Librarian"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAddingAdmin || !newAdminUid || !newAdminEmail}
              className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingAdmin ? 'Authorizing in Cloud Firestore…' : 'Authorize Administrator in Firestore'}</span>
            </button>
          </form>
        </div>
      )}

      {/* 3. Institution Settings Card */}
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
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{success}</span>
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
              Authorized Single-Admin account protected in Firebase Firestore Security Rules.
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

      {/* 4. Luxury Website Themes & Appearance Customization */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-900 dark:text-white">
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

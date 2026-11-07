import React, { useState } from 'react';
import { Settings, Save, Shield, CheckCircle2, ShieldAlert, Palette } from 'lucide-react';
import { LibrarySettings } from '../types';
import { SUPER_ADMIN_EMAIL } from '../lib/security';
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
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  isSuperAdmin,
  onSaveSettings,
  onOpenLogin,
  activeThemeId,
  onSelectTheme,
}) => {
  const [formData, setFormData] = useState<LibrarySettings>({ ...settings });
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState<LuxuryThemeId>(() => activeThemeId || getActiveThemeId());

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
        <p className="text-xs text-slate-500">Institution settings and parameters can only be configured by the verified Super Admin.</p>
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

      {/* 2. Luxury Website Themes & Appearance Customization */}
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

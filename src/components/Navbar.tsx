import React, { useState, useRef, useEffect } from 'react';
import { COLLEGE_LOGO } from '../data/logo';
import { AuthSession, LibrarySettings } from '../types';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  FileSpreadsheet,
  History,
  Settings,
  Lock,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  Search,
  Bot,
  ChevronLeft,
  ChevronRight,
  Palette,
  Box,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';

import { LuxuryThemeId } from '../lib/theme';
import { NavIcon3D, DimensionMode } from './NavIcon3D';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  session: AuthSession;
  settings: LibrarySettings;
  onOpenLogin: () => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  activeThemeId: LuxuryThemeId;
  onSelectTheme: (theme: LuxuryThemeId) => void;
  stats: {
    titles: number;
    copies: number;
    available: number;
    issued: number;
    students: number;
    overdue: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  session,
  settings,
  onOpenLogin,
  onLogout,
  isDark,
  onToggleTheme,
  activeThemeId,
  onSelectTheme,
  stats,
}) => {
  const isSuperAdmin = session.role === 'SUPER_ADMIN' || session.role === 'ADMIN';

  // 3D vs 2D UI Mode State (Persisted)
  const [dimension, setDimension] = useState<DimensionMode>(() => {
    return (localStorage.getItem('dac_ui_dimension') as DimensionMode) || '3d';
  });

  const toggleDimension = () => {
    const next = dimension === '3d' ? '2d' : '3d';
    setDimension(next);
    localStorage.setItem('dac_ui_dimension', next);
  };

  // Nav category filter: 'all' | 'general' | 'circulation' | 'admin'
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'general' | 'circulation' | 'admin'>('all');

  // Theme dropdown open state
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  // Close theme dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Horizontal scroll container reference
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categoryFilter]);

  const scrollNav = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  // 13 Navigation Items
  const navItems = [
    {
      id: 'dash',
      label: 'Dashboard',
      ar: 'لوحة التحكم',
      icon: LayoutDashboard,
      public: true,
      category: 'general',
      colorScheme: 'blue' as const,
    },
    {
      id: 'cat',
      label: 'Catalogue',
      ar: 'الفهرس والبحث',
      icon: Search,
      public: true,
      category: 'general',
      colorScheme: 'sky' as const,
    },
    {
      id: 'ai',
      label: 'AI Scholar Chat',
      ar: 'المساعد الذكي',
      icon: Bot,
      public: true,
      highlight: true,
      category: 'general',
      colorScheme: 'emerald' as const,
    },
    {
      id: 'add',
      label: 'Add Book',
      ar: 'إضافة كتاب',
      icon: BookOpen,
      public: false,
      category: 'circulation',
      colorScheme: 'teal' as const,
    },
    {
      id: 'stu',
      label: 'Students',
      ar: 'الطلاب',
      icon: Users,
      public: false,
      category: 'circulation',
      colorScheme: 'violet' as const,
    },
    {
      id: 'cards',
      label: 'ID Cards',
      ar: 'بطاقات الطلاب',
      icon: CreditCard,
      public: false,
      category: 'circulation',
      colorScheme: 'amber' as const,
    },
    {
      id: 'issue',
      label: 'Issue Book',
      ar: 'إعارة كتاب',
      icon: ArrowUpRight,
      public: false,
      category: 'circulation',
      colorScheme: 'indigo' as const,
    },
    {
      id: 'ret',
      label: 'Return Book',
      ar: 'إرجاع كتاب',
      icon: ArrowDownLeft,
      public: false,
      category: 'circulation',
      colorScheme: 'rose' as const,
    },
    {
      id: 'loans',
      label: 'Loans & Overdue',
      ar: 'المعار والمتأخر',
      icon: Clock,
      public: false,
      badge: stats.overdue,
      category: 'circulation',
      colorScheme: 'red' as const,
    },
    {
      id: 'rep',
      label: 'Reports & Backups',
      ar: 'التقارير والنسخ',
      icon: FileSpreadsheet,
      public: false,
      category: 'admin',
      colorScheme: 'teal' as const,
    },
    {
      id: 'act',
      label: 'Activity Logs',
      ar: 'سجل النشاط',
      icon: History,
      public: false,
      category: 'admin',
      colorScheme: 'slate' as const,
    },
    {
      id: 'security',
      label: 'Security Center',
      ar: 'مركز الأمان',
      icon: Shield,
      public: false,
      highlight: true,
      category: 'admin',
      colorScheme: 'emerald' as const,
    },
    {
      id: 'set',
      label: 'Settings',
      ar: 'الإعدادات',
      icon: Settings,
      public: false,
      category: 'admin',
      colorScheme: 'slate' as const,
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (categoryFilter === 'all') return true;
    return item.category === categoryFilter;
  });

  const themesList: { id: LuxuryThemeId; name: string; icon: string; dot: string }[] = [
    { id: 'emerald-gold', name: 'Emerald & Gold', icon: '🏛️', dot: 'bg-emerald-400' },
    { id: 'royal-gold', name: 'Royal Gold', icon: '👑', dot: 'bg-amber-400' },
    { id: 'midnight-purple', name: 'Midnight Purple', icon: '🔮', dot: 'bg-purple-500' },
    { id: 'classic-ivory', name: 'Classic Ivory', icon: '📜', dot: 'bg-amber-700' },
    { id: 'modern-dark', name: 'Modern Dark', icon: '💎', dot: 'bg-emerald-500' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-colors backdrop-blur-md ${
        dimension === '3d'
          ? 'bg-white/95 dark:bg-slate-900/95 border-b border-emerald-900/10 dark:border-emerald-500/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_-5px_rgba(0,0,0,0.5)]'
          : 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-none'
      }`}
    >
      {/* Top institution branding & command bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
        {/* Zone 1: Institutional Crest & Title Lockup */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
          {/* 3D / 2D Medallion for College Logo */}
          <div
            className={`relative shrink-0 flex items-center justify-center transition-transform duration-300 ${
              dimension === '3d'
                ? 'w-11 h-11 sm:w-12 sm:h-12 rounded-full p-1 bg-gradient-to-b from-amber-200 via-emerald-100 to-emerald-200 dark:from-amber-500/30 dark:via-emerald-900/40 dark:to-slate-800 shadow-[0_4px_12px_rgba(16,185,129,0.25)] border-2 border-amber-300/60 dark:border-amber-400/30 hover:scale-105'
                : 'w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <img
              src={COLLEGE_LOGO}
              alt="Deeniya Arabic College Crest"
              className="w-full h-full object-contain rounded-full drop-shadow-sm"
            />
            {dimension === '3d' && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
            )}
          </div>

          {/* College Typography */}
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight uppercase font-sans text-emerald-950 dark:text-emerald-100 truncate">
                {settings.name}
              </h1>
              {isSuperAdmin && (
                <span className="hidden xl:inline-flex items-center space-x-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 uppercase tracking-widest">
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs font-arabic font-medium text-emerald-800/90 dark:text-emerald-400 truncate">
              {settings.ar} · {settings.lib}
            </p>
          </div>
        </div>

        {/* Zone 2: Command Affordances & Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Dimension Mode Switcher: 3D Spatial vs 2D Minimalist */}
          <button
            onClick={toggleDimension}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
              dimension === '3d'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-[0_3px_10px_rgba(16,185,129,0.35)] border-t border-white/30 border-b border-emerald-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={dimension === '3d' ? 'Switch to 2D Flat Minimalist UI' : 'Switch to 3D Tactile Spatial UI'}
            aria-label="Toggle 3D or 2D UI Dimension"
          >
            {dimension === '3d' ? (
              <>
                <Box className="w-3.5 h-3.5 text-amber-300 drop-shadow-xs" />
                <span className="font-mono text-[11px]">3D UI</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="font-mono text-[11px]">2D UI</span>
              </>
            )}
          </button>

          {/* Luxury Theme Dropdown */}
          <div className="relative" ref={themeDropdownRef}>
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 ${
                dimension === '3d'
                  ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-amber-400/60'
                  : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
              title="Select Luxury Theme"
            >
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline capitalize text-[11px]">
                {themesList.find((t) => t.id === activeThemeId)?.name || 'Theme'}
              </span>
            </button>

            {themeDropdownOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 ${
                  dimension === '3d' ? 'shadow-[0_10px_30px_rgba(0,0,0,0.18)]' : 'shadow-md'
                }`}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Luxury Website Themes
                </div>
                {themesList.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTheme(t.id);
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition ${
                      activeThemeId === t.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{t.icon}</span>
                      <span>{t.name}</span>
                    </div>
                    {activeThemeId === t.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark / Light Mode Sphere Toggle */}
          <button
            onClick={onToggleTheme}
            className={`p-1.5 sm:p-2 rounded-lg transition active:scale-95 ${
              dimension === '3d'
                ? 'bg-gradient-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 hover:border-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title={isDark ? 'Switch to Light Mode · الوضع النهاري' : 'Switch to Dark / Night Mode · الوضع الليلي'}
            aria-label="Toggle Theme Mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:text-emerald-700" />
            )}
          </button>

          {/* Admin Authentication Gate */}
          {isSuperAdmin ? (
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <div className="hidden lg:block text-right">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
                  {session.email}
                </div>
                <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">
                  Super Admin Verified
                </div>
              </div>
              <button
                onClick={onLogout}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                  dimension === '3d'
                    ? 'bg-gradient-to-b from-red-50 to-red-100 dark:from-red-950/60 dark:to-red-900/40 text-red-700 dark:text-red-300 border-t border-red-200 dark:border-red-800/80 border-b-2 border-red-300 dark:border-red-950 shadow-sm hover:from-red-100 hover:to-red-200'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/60 hover:bg-red-100'
                }`}
                title="Log out of Super Admin session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                dimension === '3d'
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] border-t border-emerald-400/40 border-b-2 border-emerald-950 hover:brightness-110 active:translate-y-0.5 active:border-b-0'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-none'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Admin Login</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Bar with Category Filters & Scroll Chevrons */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Category Filter Pills */}
          <div className="hidden lg:flex items-center space-x-1 shrink-0 bg-slate-100 dark:bg-slate-800/70 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-[11px] font-medium">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2 py-1 rounded-md transition ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All (13)
            </button>
            <button
              onClick={() => setCategoryFilter('general')}
              className={`px-2 py-1 rounded-md transition ${
                categoryFilter === 'general'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setCategoryFilter('circulation')}
              className={`px-2 py-1 rounded-md transition ${
                categoryFilter === 'circulation'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Circulation
            </button>
            <button
              onClick={() => setCategoryFilter('admin')}
              className={`px-2 py-1 rounded-md transition ${
                categoryFilter === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Admin & Security
            </button>
          </div>

          {/* Left Scroll Chevron */}
          {canScrollLeft && (
            <button
              onClick={() => scrollNav('left')}
              className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 shrink-0"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Scrollable Nav Items Track */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex-1 flex space-x-1.5 sm:space-x-2 overflow-x-auto py-1 scrollbar-none items-center"
          >
            {filteredItems.map((item) => {
              const isSelected = currentTab === item.id;
              const isLocked = !isSuperAdmin && !item.public;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isLocked) {
                      onOpenLogin();
                    } else {
                      onSelectTab(item.id);
                    }
                  }}
                  className={`group relative flex items-center space-x-2 whitespace-nowrap px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium transition-all duration-200 shrink-0 ${
                    dimension === '3d'
                      ? isSelected
                        ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 text-white shadow-[0_5px_15px_rgba(16,185,129,0.4)] border-t border-emerald-400/40 border-b-2 border-emerald-950 font-bold scale-[1.02]'
                        : isLocked
                        ? 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        : item.highlight
                        ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/70 dark:from-emerald-950/40 dark:to-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs hover:shadow-sm hover:-translate-y-0.5'
                        : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-emerald-500/50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0.5'
                      : isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-none'
                      : isLocked
                      ? 'text-slate-400 dark:text-slate-600 hover:text-slate-600'
                      : item.highlight
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                  }`}
                >
                  {/* Custom 3D / 2D Icon Engine */}
                  <NavIcon3D
                    icon={item.icon}
                    dimension={dimension}
                    isSelected={isSelected}
                    isLocked={isLocked}
                    highlight={item.highlight}
                    badge={item.badge}
                    colorScheme={item.colorScheme}
                  />

                  {/* Label & Arabic text */}
                  <div className="flex flex-col text-left">
                    <span className="leading-tight">{item.label}</span>
                    <span
                      className={`text-[10px] font-arabic leading-none opacity-80 ${
                        isSelected ? 'text-emerald-100 dark:text-emerald-200' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.ar}
                    </span>
                  </div>

                  {/* Overdue counter badge with 3D glow */}
                  {Boolean(item.badge && item.badge > 0) && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        dimension === '3d'
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_2px_8px_rgba(239,68,68,0.5)] border-t border-rose-300 animate-pulse'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Lock symbol for protected admin tabs */}
                  {isLocked && (
                    <span title="Administrator access required">
                      <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 ml-0.5 opacity-80" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Chevron */}
          {canScrollRight && (
            <button
              onClick={() => scrollNav('right')}
              className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 shrink-0"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Emergency Lockdown Notice Bar if active */}
      {settings.securityLockdown && (
        <div className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 text-center flex items-center justify-center space-x-2 shadow-inner">
          <ShieldAlert className="w-4 h-4 animate-bounce" />
          <span>SECURITY LOCKDOWN ACTIVE: Database modifications are temporarily frozen by Super Admin.</span>
        </div>
      )}
    </header>
  );
};

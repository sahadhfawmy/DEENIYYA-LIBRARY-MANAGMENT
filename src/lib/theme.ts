export type LuxuryThemeId = 'royal-gold' | 'midnight-purple' | 'classic-ivory' | 'modern-dark';

export interface LuxuryTheme {
  id: LuxuryThemeId;
  name: string;
  arName: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  bgPreview: string;
  isDarkDefault: boolean;
}

export const LUXURY_THEMES: LuxuryTheme[] = [
  {
    id: 'royal-gold',
    name: 'Royal Gold Luxury',
    arName: 'الذهبي الملكي الفاخر',
    description: 'Deep midnight navy with champagne gold accents and subtle luxury glows.',
    primaryColor: '#d4af37',
    accentColor: '#07162c',
    bgPreview: 'from-[#07162c] to-[#020914]',
    isDarkDefault: true,
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    arName: 'الأرجواني الليلي الملكي',
    description: 'Deep royal obsidian and amethyst with lavender and violet illumination.',
    primaryColor: '#c084fc',
    accentColor: '#1e0b36',
    bgPreview: 'from-[#1e0b36] to-[#0b0416]',
    isDarkDefault: true,
  },
  {
    id: 'classic-ivory',
    name: 'Classic Ivory',
    arName: 'العاجي الأندلسي الكلاسيكي',
    description: 'Warm cream and ivory paper with dark navy typography and gold foil accents.',
    primaryColor: '#b45309',
    accentColor: '#fbf9f4',
    bgPreview: 'from-[#fbf9f4] to-[#f4ede1]',
    isDarkDefault: false,
  },
  {
    id: 'modern-dark',
    name: 'Modern Charcoal Dark',
    arName: 'الداكن العصري الأنيق',
    description: 'Clean charcoal and graphite interface with emerald and gold highlights.',
    primaryColor: '#10b981',
    accentColor: '#0f172a',
    bgPreview: 'from-[#0f172a] to-[#020617]',
    isDarkDefault: true,
  },
];

const THEME_STORAGE_KEY = 'dac_active_theme';
const MODE_STORAGE_KEY = 'dac_theme_mode'; // 'dark' | 'light'

export function getActiveThemeId(): LuxuryThemeId {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as LuxuryThemeId;
  if (saved && LUXURY_THEMES.some((t) => t.id === saved)) {
    return saved;
  }
  return 'royal-gold';
}

export function setActiveThemeId(themeId: LuxuryThemeId): void {
  localStorage.setItem(THEME_STORAGE_KEY, themeId);
  applyThemeToDOM(themeId, getThemeMode());
}

export function getThemeMode(): 'dark' | 'light' {
  const saved = localStorage.getItem(MODE_STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return 'dark'; // Default luxury dark
}

export function setThemeMode(mode: 'dark' | 'light'): void {
  localStorage.setItem(MODE_STORAGE_KEY, mode);
  applyThemeToDOM(getActiveThemeId(), mode);
}

export function toggleThemeMode(): 'dark' | 'light' {
  const current = getThemeMode();
  const next = current === 'dark' ? 'light' : 'dark';
  setThemeMode(next);
  return next;
}

export function applyThemeToDOM(themeId: LuxuryThemeId, mode: 'dark' | 'light'): void {
  const root = document.documentElement;

  // Set theme data-attribute
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-mode', mode);

  // Apply or remove dark class
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
